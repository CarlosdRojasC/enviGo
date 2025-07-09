const axios = require('axios');
// Se importan los modelos de Mongoose necesarios
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const Company = require('../models/Company'); // <-- Modelo de empresa para el costo de envío

class WooCommerceService {
  // Construir headers de autenticación
  static getAuthHeader(channel) {
    const auth = Buffer.from(`${channel.api_key}:${channel.api_secret}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Obtener URL base de la API
  static getApiUrl(channel) {
    const baseUrl = channel.store_url.replace(/\/$/, '');
    return `${baseUrl}/wp-json/wc/v3`;
  }
  
  // Probar conexión (sin cambios)
  static async testConnection(channel) {
    try {
      const response = await axios.get(
        `${this.getApiUrl(channel)}/system_status`,
        { headers: this.getAuthHeader(channel) }
      );
      
      return {
        success: true,
        message: `Conectado exitosamente a WooCommerce`,
        store_info: {
          environment: response.data.environment,
          version: response.data.database.wc_database_version,
          currency: response.data.settings.currency
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }
  
  // Registrar webhook (sin cambios)
  static async registerWebhook(channel) {
    try {
      const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/woocommerce/${channel.id}`;
      
      const existingWebhooks = await axios.get(
        `${this.getApiUrl(channel)}/webhooks`,
        { headers: this.getAuthHeader(channel) }
      );
      
      const orderWebhook = existingWebhooks.data.find(
        webhook => webhook.topic === 'order.created' && webhook.delivery_url === webhookUrl
      );
      
      if (!orderWebhook) {
        await axios.post(
          `${this.getApiUrl(channel)}/webhooks`,
          {
            name: 'Sistema Última Milla - Nuevos Pedidos',
            topic: 'order.created',
            delivery_url: webhookUrl,
            secret: channel.webhook_secret || process.env.WOOCOMMERCE_WEBHOOK_SECRET
          },
          { headers: this.getAuthHeader(channel) }
        );
      }
      
      const updateWebhook = existingWebhooks.data.find(
        webhook => webhook.topic === 'order.updated' && webhook.delivery_url === webhookUrl
      );
      
      if (!updateWebhook) {
        await axios.post(
          `${this.getApiUrl(channel)}/webhooks`,
          {
            name: 'Sistema Última Milla - Actualizaciones',
            topic: 'order.updated',
            delivery_url: webhookUrl,
            secret: channel.webhook_secret || process.env.WOOCOMMERCE_WEBHOOK_SECRET
          },
          { headers: this.getAuthHeader(channel) }
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error registrando webhook WooCommerce:', error);
      throw error;
    }
  }
  
  // --- MÉTODO SYNCORDERS CORREGIDO CON LOGGING Y MAPEO DE COMUNA ---
  static async syncOrders(channel, dateFrom, dateTo) {
    let ordersImported = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    let totalOrdersProcessed = 0;
    const allowedCommunes = channel.accepted_communes || []
    
    try {
      console.log(`🔄 Iniciando sincronización WooCommerce para canal ${channel._id}`);
      console.log(`📅 Rango de fechas: ${dateFrom || 'Sin límite'} - ${dateTo || 'Sin límite'}`);
      
      const company = await Company.findById(channel.company_id);
      if (!company) {
        throw new Error(`No se encontró la empresa con ID: ${channel.company_id}`);
      }
      const fixedShippingCost = company.price_per_order || 0;
      console.log(`💰 Costo de envío fijo de la empresa: $${fixedShippingCost}`);

      while (hasMore) {
        console.log(`📄 Procesando página ${page} (${perPage} pedidos por página)...`);
        
        const params = new URLSearchParams({
          page: page, 
          per_page: perPage, 
          orderby: 'date', 
          order: 'desc'
        });
        
        if (dateFrom) params.append('after', dateFrom);
        if (dateTo) params.append('before', dateTo);
        
        console.log(`🌐 URL de consulta: ${this.getApiUrl(channel)}/orders?${params}`);
        
        const response = await axios.get(
          `${this.getApiUrl(channel)}/orders?${params}`,
          { headers: this.getAuthHeader(channel) }
        );
        
        const orders = response.data;
        console.log(`📦 Recibidos ${orders.length} pedidos en página ${page}`);
        
        if (orders.length === 0) {
          console.log('🛑 No hay más pedidos, finalizando sincronización');
          hasMore = false;
          break;
        }
        
        for (const wooOrder of orders) {
          totalOrdersProcessed++;
          try {
             const orderCommune = (wooOrder.shipping.city || wooOrder.billing.city || '').trim().toLowerCase();
          if (allowedCommunes.length > 0 && !allowedCommunes.map(c => c.toLowerCase()).includes(orderCommune)) {
            console.log(`📦 Pedido #${wooOrder.number} ignorado en sincronización. Comuna "${orderCommune}" no permitida.`);
            continue; // Salta al siguiente pedido
          }
            const existingOrder = await Order.findOne({ 
              channel_id: channel._id, 
              external_order_id: wooOrder.id.toString() 
            });
            
            if (!existingOrder) {
              // 🇨🇱 MAPEO CORRECTO PARA CHILE
              const orderData = {
                company_id: channel.company_id,
                channel_id: channel._id,
                external_order_id: wooOrder.id.toString(),
                order_number: wooOrder.number,
                customer_name: this.getCustomerName(wooOrder),
                customer_email: wooOrder.billing.email,
                customer_phone: wooOrder.billing.phone,
                shipping_address: this.getShippingAddress(wooOrder),
                // ✅ CAMBIO PRINCIPAL: WooCommerce shipping.city → Comuna chilena
                shipping_commune: wooOrder.shipping.city || wooOrder.billing.city,
                // ✅ NUEVO: Región por defecto para Chile
                shipping_state: wooOrder.shipping.state || wooOrder.billing.state || 'Región Metropolitana',
                shipping_zip: wooOrder.shipping.postcode || wooOrder.billing.postcode,
                shipping_cost: fixedShippingCost,
                // ✅ AGREGAR: Total del pedido
                total_amount: parseFloat(wooOrder.total) || 0,
                status: this.mapOrderStatus(wooOrder),
                order_date: wooOrder.date_created,
                notes: wooOrder.customer_note || '',
                raw_data: wooOrder
              };
              
              console.log(`✅ Creando pedido ${wooOrder.number} - Comuna: ${orderData.shipping_commune}`);
              
              await Order.create(orderData);
              ordersImported++;
            } else {
              console.log(`⏭️ Pedido ${wooOrder.number} ya existe, omitiendo`);
            }
          } catch (orderError) {
            console.error(`❌ Error importando pedido WooCommerce ${wooOrder.number}:`, orderError);
          }
        }
        
        // ✅ CONDICIÓN MEJORADA para continuar paginación
        if (orders.length < perPage) {
          console.log(`📄 Página ${page} tiene ${orders.length} pedidos (menos que ${perPage}), finalizando`);
          hasMore = false;
        } else {
          page++;
          console.log(`➡️ Avanzando a página ${page}`);
          
          // ✅ PROTECCIÓN: Evitar bucle infinito
          if (page > 50) {
            console.log('⚠️ Límite de seguridad alcanzado (50 páginas), finalizando');
            hasMore = false;
          }
        }
      }
      
      console.log(`🏁 Sincronización completada:`);
      console.log(`   📊 Total pedidos procesados: ${totalOrdersProcessed}`);
      console.log(`   ✅ Pedidos importados: ${ordersImported}`);
      console.log(`   ⏭️ Pedidos ya existentes: ${totalOrdersProcessed - ordersImported}`);
      
      return ordersImported;
    } catch (error) {
      console.error('❌ Error sincronizando pedidos WooCommerce:', error);
      console.error('🔍 Detalles del error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }
  
  // --- MÉTODO PROCESSWEBHOOK CORREGIDO CON MAPEO DE COMUNA ---
  static async processWebhook(channelId, data, headers) {
    try {
      console.log(`🔔 Procesando webhook WooCommerce para canal ${channelId}`);
      
      const channel = await Channel.findById(channelId);
      if (!channel) throw new Error('Canal no encontrado');

// ---  LÓGICA DE FILTRADO AÑADIDA ---
      const allowedCommunes = channel.accepted_communes || [];
      const wooOrder = data;
      const orderCommune = (wooOrder.shipping.city || wooOrder.billing.city || '').trim().toLowerCase();
      // Si la lista de comunas permitidas no está vacía y la comuna del pedido no está en la lista, lo ignoramos.
      if (allowedCommunes.length > 0 && !allowedCommunes.map(c => c.toLowerCase()).includes(orderCommune)) {
        console.log(`📦 Pedido #${wooOrder.number} ignorado. La comuna "${orderCommune}" no está en la lista permitida para el canal "${channel.channel_name}".`);
        return true; // Devolvemos éxito para que WooCommerce no reintente.
      }
      // --- FIN DE LA LÓGICA DE FILTRADO ---
      const company = await Company.findById(channel.company_id);
      if (!company) throw new Error(`Empresa no encontrada para el canal: ${channelId}`);
      const fixedShippingCost = company.price_per_order || 0;
      
      
      const existingOrder = await Order.findOne({ 
        channel_id: channelId, 
        external_order_id: wooOrder.id.toString() 
      });
      
      if (existingOrder) {
        console.log(`🔄 Actualizando pedido existente ${wooOrder.number}`);
        existingOrder.status = this.mapOrderStatus(wooOrder);
        existingOrder.shipping_cost = fixedShippingCost;
        // ✅ CAMBIO: Actualizar comuna desde WooCommerce
        existingOrder.shipping_commune = wooOrder.shipping.city || wooOrder.billing.city;
        existingOrder.shipping_state = wooOrder.shipping.state || wooOrder.billing.state || 'Región Metropolitana';
        existingOrder.total_amount = parseFloat(wooOrder.total) || 0;
        existingOrder.raw_data = wooOrder;
        await existingOrder.save();
      } else {
        console.log(`✅ Creando nuevo pedido ${wooOrder.number} desde webhook`);
        
        const orderData = {
          company_id: channel.company_id,
          channel_id: channelId,
          external_order_id: wooOrder.id.toString(),
          order_number: wooOrder.number,
          customer_name: this.getCustomerName(wooOrder),
          customer_email: wooOrder.billing.email,
          customer_phone: wooOrder.billing.phone,
          shipping_address: this.getShippingAddress(wooOrder),
          // ✅ CAMBIO PRINCIPAL: WooCommerce city → Comuna chilena
          shipping_commune: wooOrder.shipping.city || wooOrder.billing.city,
          shipping_state: wooOrder.shipping.state || wooOrder.billing.state || 'Región Metropolitana',
          shipping_zip: wooOrder.shipping.postcode || wooOrder.billing.postcode,
          shipping_cost: fixedShippingCost,
          total_amount: parseFloat(wooOrder.total) || 0,
          status: this.mapOrderStatus(wooOrder),
          order_date: wooOrder.date_created,
          notes: wooOrder.customer_note || '',
          raw_data: wooOrder
        };
        
        console.log(`📍 Comuna del pedido: ${orderData.shipping_commune}`);
        
        const newOrder = await Order.create(orderData);
        
        // Auto-crear en Shipday si está habilitado
        if (process.env.AUTO_CREATE_SHIPDAY_ORDERS === 'true') {
          await this.autoCreateInShipday(newOrder);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error procesando webhook WooCommerce:', error);
      throw error;
    }
  }
  
  static getCustomerName(order) {
    const billing = order.billing;
    return `${billing.first_name} ${billing.last_name}`.trim() || 
           order.billing.company ||
           'Cliente';
  }
  
  static getShippingAddress(order) {
    const addr = order.shipping.address_1 ? order.shipping : order.billing;
    return `${addr.address_1} ${addr.address_2 || ''}`.trim();
  }
  
  static mapOrderStatus(wooOrder) {
    const statusMap = {
      'pending': 'pending', 
      'processing': 'processing', 
      'on-hold': 'pending',
      'completed': 'delivered', 
      'cancelled': 'cancelled', 
      'refunded': 'cancelled',
      'failed': 'cancelled', 
      'shipped': 'shipped'
    };
    return statusMap[wooOrder.status] || 'pending';
  }
  
  static mapStatusToWooCommerce(status) {
    const statusMap = {
      'pending': 'pending', 
      'processing': 'processing', 
      'shipped': 'shipped',
      'delivered': 'completed', 
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }

  static async autoCreateInShipday(order) {
    try {
      const ShipdayService = require('./shipday.service');
      
      const shipdayData = {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerAddress: order.shipping_address,
        customerEmail: order.customer_email || '',
        customerPhoneNumber: order.customer_phone || '',
        deliveryInstruction: order.notes || 'Sin instrucciones especiales',
      };

      const shipdayOrder = await ShipdayService.createOrder(shipdayData);
      
      order.shipday_order_id = shipdayOrder.orderId;
      order.status = 'processing';
      await order.save();

      console.log('✅ Orden WooCommerce creada en Shipday:', shipdayOrder.orderId);
      
    } catch (error) {
      console.error('❌ Error creando orden WooCommerce en Shipday:', error);
    }
  }
}

module.exports = WooCommerceService;