const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const Company = require('../models/Company');

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
  
  // Probar conexión
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
  
  // Registrar webhook
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
  
  // MÉTODO SYNCORDERS CORREGIDO - RETORNA NÚMERO SIMPLE
  static async syncOrders(channel, dateFrom, dateTo) {
    let ordersImported = 0;
    let ordersRejected = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    let totalOrdersProcessed = 0;
    const allowedCommunes = channel.accepted_communes || [];
    const rejectionReasons = [];
    
    try {
      console.log(`🔄 Iniciando sincronización WooCommerce para canal ${channel._id}`);
      console.log(`📅 Rango de fechas: ${dateFrom || 'Sin límite'} - ${dateTo || 'Sin límite'}`);
      
      // Obtener información de la empresa para el costo de envío
      const company = await Company.findById(channel.company_id);
      if (!company) {
        throw new Error(`Empresa no encontrada para el canal: ${channel._id}`);
      }
      const fixedShippingCost = company.price_per_order || 0;
      
      while (hasMore) {
        console.log(`📄 Procesando página ${page}...`);
        
        const params = {
          page,
          per_page: perPage,
          orderby: 'date',
          order: 'desc',
          status: 'completed, processing'
        };
        
        if (dateFrom) params.after = new Date(dateFrom).toISOString();
        if (dateTo) params.before = new Date(dateTo).toISOString();
        
        const response = await axios.get(
          `${this.getApiUrl(channel)}/orders`,
          { 
            headers: this.getAuthHeader(channel),
            params 
          }
        );
        
        const orders = response.data;
        
        if (!orders || orders.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const wooOrder of orders) {
          totalOrdersProcessed++;
          
          // Verificar filtro de comunas
          const orderCommune = (wooOrder.shipping?.city || wooOrder.billing?.city || '').trim().toLowerCase();
          
          if (allowedCommunes.length > 0 && !allowedCommunes.map(c => c.toLowerCase()).includes(orderCommune)) {
            console.log(`📦 Pedido #${wooOrder.number} rechazado - Comuna "${orderCommune}" no permitida`);
            ordersRejected++;
            rejectionReasons.push({
              order_id: wooOrder.number,
              reason: `Comuna "${orderCommune}" no está en la lista permitida`
            });
            continue;
          }
          
          // Verificar si el pedido ya existe
          const existingOrder = await Order.findOne({
            channel_id: channel._id,
            external_order_id: wooOrder.id.toString()
          });
          
          if (existingOrder) {
            console.log(`⏭️ Pedido ${wooOrder.number} ya existe, actualizando...`);
            
            // Actualizar pedido existente
            existingOrder.status = this.mapOrderStatus(wooOrder);
            existingOrder.shipping_cost = fixedShippingCost;
            existingOrder.shipping_commune = wooOrder.shipping?.city || wooOrder.billing?.city;
            existingOrder.shipping_state = wooOrder.shipping?.state || wooOrder.billing?.state || 'Región Metropolitana';
            existingOrder.total_amount = parseFloat(wooOrder.total) || 0;
            existingOrder.raw_data = wooOrder;
            await existingOrder.save();
            continue;
          }
          
          // Crear nuevo pedido
          const orderData = {
            company_id: channel.company_id,
            channel_id: channel._id,
            external_order_id: wooOrder.id.toString(),
            order_number: wooOrder.number,
            customer_name: this.getCustomerName(wooOrder),
            customer_email: wooOrder.billing?.email,
            customer_phone: wooOrder.billing?.phone,
            customer_document: wooOrder.meta_data?.find(meta => meta.key === '_billing_document')?.value || '',
            shipping_address: this.getShippingAddress(wooOrder),
            shipping_commune: wooOrder.shipping?.city || wooOrder.billing?.city,
            shipping_state: wooOrder.shipping?.state || wooOrder.billing?.state || 'Región Metropolitana',
            shipping_zip: wooOrder.shipping?.postcode || wooOrder.billing?.postcode,
            shipping_cost: fixedShippingCost,
            total_amount: parseFloat(wooOrder.total) || 0,
            status: this.mapOrderStatus(wooOrder),
            order_date: new Date(wooOrder.date_created),
            notes: wooOrder.customer_note || '',
            raw_data: wooOrder
          };
          
          console.log(`✅ Creando pedido ${wooOrder.number} (Comuna: ${orderData.shipping_commune})`);
          
          await Order.create(orderData);
          ordersImported++;
          
          // Auto-crear en Shipday si está habilitado
          if (process.env.AUTO_CREATE_SHIPDAY_ORDERS === 'true') {
            try {
              const newOrder = await Order.findOne({ external_order_id: wooOrder.id.toString() });
              await this.autoCreateInShipday(newOrder);
            } catch (shipdayError) {
              console.warn(`⚠️ Error creando pedido en Shipday: ${shipdayError.message}`);
            }
          }
        }
        
        page++;
        hasMore = orders.length === perPage;
      }
      
      console.log(`🏁 Sincronización WooCommerce completada:`);
      console.log(`   📊 Total pedidos procesados: ${totalOrdersProcessed}`);
      console.log(`   ✅ Pedidos importados: ${ordersImported}`);
      console.log(`   ❌ Pedidos rechazados: ${ordersRejected}`);
      console.log(`   ⏭️ Pedidos ya existentes: ${totalOrdersProcessed - ordersImported - ordersRejected}`);
      
      // RETORNO SIMPLE PARA COMPATIBILIDAD CON SYNCLOG
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
  
  // MÉTODO PROCESSWEBHOOK CORREGIDO CON MAPEO DE COMUNA
  static async processWebhook(channelId, data, headers) {
    try {
      console.log(`🔔 Procesando webhook WooCommerce para canal ${channelId}`);
      
      const channel = await Channel.findById(channelId);
      if (!channel) throw new Error('Canal no encontrado');

      // LÓGICA DE FILTRADO AÑADIDA
      const allowedCommunes = channel.accepted_communes || [];
      const wooOrder = data;
      const orderCommune = (wooOrder.shipping?.city || wooOrder.billing?.city || '').trim().toLowerCase();
      
      // Si la lista de comunas permitidas no está vacía y la comuna del pedido no está en la lista, lo ignoramos.
      if (allowedCommunes.length > 0 && !allowedCommunes.map(c => c.toLowerCase()).includes(orderCommune)) {
        console.log(`📦 Pedido #${wooOrder.number} ignorado. La comuna "${orderCommune}" no está en la lista permitida para el canal "${channel.channel_name}".`);
        return true; // Devolvemos éxito para que WooCommerce no reintente.
      }
      
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
        existingOrder.shipping_commune = wooOrder.shipping?.city || wooOrder.billing?.city;
        existingOrder.shipping_state = wooOrder.shipping?.state || wooOrder.billing?.state || 'Región Metropolitana';
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
          customer_email: wooOrder.billing?.email,
          customer_phone: wooOrder.billing?.phone,
          shipping_address: this.getShippingAddress(wooOrder),
          shipping_commune: wooOrder.shipping?.city || wooOrder.billing?.city,
          shipping_state: wooOrder.shipping?.state || wooOrder.billing?.state || 'Región Metropolitana',
          shipping_zip: wooOrder.shipping?.postcode || wooOrder.billing?.postcode,
          shipping_cost: fixedShippingCost,
          total_amount: parseFloat(wooOrder.total) || 0,
          status: this.mapOrderStatus(wooOrder),
          order_date: new Date(wooOrder.date_created),
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
  
  // Actualizar estado de pedido en WooCommerce
  static async updateOrderStatus(channel, externalOrderId, newStatus) {
    try {
      const wooStatus = this.mapStatusToWooCommerce(newStatus);
      
      const response = await axios.put(
        `${this.getApiUrl(channel)}/orders/${externalOrderId}`,
        { status: wooStatus },
        { headers: this.getAuthHeader(channel) }
      );
      
      return {
        success: true,
        order: response.data
      };
    } catch (error) {
      console.error('Error actualizando estado en WooCommerce:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  // Métodos auxiliares
  static getCustomerName(order) {
    const billing = order.billing || {};
    return `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 
           billing.company ||
           'Cliente';
  }
  
  static getShippingAddress(order) {
    const addr = order.shipping?.address_1 ? order.shipping : order.billing;
    return `${addr.address_1 || ''} ${addr.address_2 || ''}`.trim();
  }
  
  static mapOrderStatus(wooOrder) {
    const statusMap = {
      'pending': 'pending', 
      'processing': 'pending', 
      'on-hold': 'pending',
      'completed': 'pending', 
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