const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const Company = require('../models/Company');
const mongoose = require('mongoose');
const crypto = require('crypto');

class WooCommerceService {
  static getApiUrl(channel) {
    return `${channel.store_url}/wp-json/wc/v3`;
  }
  
  static getAuthHeader(channel) {
    const credentials = `${channel.api_key}:${channel.api_secret}`;
    const encoded = Buffer.from(credentials).toString('base64');
    return {
      'Authorization': `Basic ${encoded}`,
      'Content-Type': 'application/json'
    };
  }

  // 🏘️ FUNCIÓN MEJORADA: Normalizar nombre de comuna
  static normalizeCommune(commune) {
    if (!commune) return '';
    
    // Limpiar espacios y caracteres especiales
    let normalized = commune.trim().replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, '');
    
    // Mapeo de variaciones comunes de las comunas que manejas
    const communeMap = {
      // Macul
      'macul': 'Macul',
      
      // San Miguel
      'san miguel': 'San Miguel',
      'sanmiguel': 'San Miguel',
      
      // Santiago Centro
      'santiago centro': 'Santiago Centro',
      'santiago': 'Santiago Centro',
      'centro': 'Santiago Centro',
      'stgo centro': 'Santiago Centro',
      'stgo': 'Santiago Centro',
      
      // La Florida
      'la florida': 'La Florida',
      'florida': 'La Florida',
      'laflorida': 'La Florida',
      
      // Peñalolén
      'penalolen': 'Peñalolén',
      'peñalolen': 'Peñalolén',
      'penalolén': 'Peñalolén',
      'peñalolén': 'Peñalolén',
      
      // Las Condes
      'las condes': 'Las Condes',
      'las conde': 'Las Condes',
      'conde': 'Las Condes',
      'condes': 'Las Condes',
      
      // Vitacura
      'vitacura': 'Vitacura',
      'vita': 'Vitacura',
      
      // Quinta Normal
      'quinta normal': 'Quinta Normal',
      'quintanormal': 'Quinta Normal',
      '5ta normal': 'Quinta Normal',
      
      // Independencia
      'independencia': 'Independencia',
      'indep': 'Independencia',
      
      // Recoleta
      'recoleta': 'Recoleta',
      
      // Huechuraba
      'huechuraba': 'Huechuraba',
      
      // Quilicura
      'quilicura': 'Quilicura',
      
      // Estación Central
      'estacion central': 'Estación Central',
      'estación central': 'Estación Central',
      'estacioncentral': 'Estación Central',
      
      // Ñuñoa
      'nunoa': 'Ñuñoa',
      'ñunoa': 'Ñuñoa',
      'noa': 'Ñuñoa',
      
      // La Reina
      'la reina': 'La Reina',
      'reina': 'La Reina',
      'lareina': 'La Reina',
      
      // San Joaquín
      'san joaquin': 'San Joaquín',
      'sanjoaquin': 'San Joaquín',
      'san joaquín': 'San Joaquín',
      
      // Pedro Aguirre Cerda
      'pedro aguirre cerda': 'Pedro Aguirre Cerda',
      'pedroaguirrecerda': 'Pedro Aguirre Cerda',
      'pac': 'Pedro Aguirre Cerda',
      
      // Cerrillos
      'cerrillos': 'Cerrillos',
      
      // Renca
      'renca': 'Renca',
      
      // La Granja
      'la granja': 'La Granja',
      'granja': 'La Granja',
      'lagranja': 'La Granja',
      
      // La Cisterna
      'la cisterna': 'La Cisterna',
      'cisterna': 'La Cisterna',
      'lacisterna': 'La Cisterna',
      
      // San Ramón
      'san ramon': 'San Ramón',
      'sanramon': 'San Ramón',
      'san ramón': 'San Ramón',
      
      // Cerro Navia
      'cerro navia': 'Cerro Navia',
      'cerronavia': 'Cerro Navia'
    };
    
    const lowerNormalized = normalized.toLowerCase();
    return communeMap[lowerNormalized] || normalized;
  }

  // 🏘️ FUNCIÓN MEJORADA: Validar si comuna está permitida
  static isCommuneAllowed(orderCommune, allowedCommunes) {
    if (!allowedCommunes || allowedCommunes.length === 0) {
      return true; // Si no hay restricciones, permitir todas
    }
    
    if (!orderCommune || orderCommune.trim() === '') {
      return false; // Si no hay comuna en el pedido, rechazar
    }
    
    const normalizedOrderCommune = this.normalizeCommune(orderCommune).toLowerCase();
    
    return allowedCommunes.some(allowedCommune => 
      this.normalizeCommune(allowedCommune).toLowerCase() === normalizedOrderCommune
    );
  }

  // Validar webhook de WooCommerce
  static validateWebhook(data, signature, secret) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(data))
        .digest('base64');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('❌ Error validando webhook:', error);
      return false;
    }
  }

  // Registrar webhooks en WooCommerce
  static async registerWebhooks(channel) {
    try {
      console.log('🔗 Registrando webhooks de WooCommerce para canal:', channel.store_url);
      
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/woocommerce/${channel._id}`;
      
      // Verificar webhooks existentes
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
        console.log('✅ Webhook order.created registrado');
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
        console.log('✅ Webhook order.updated registrado');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error registrando webhook WooCommerce:', error);
      throw error;
    }
  }
  
  // Sincronizar pedidos con filtro de comunas mejorado
  static async syncOrders(channel, dateFrom, dateTo) {
    let ordersImported = 0;
    let ordersRejected = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    let totalOrdersProcessed = 0;
    
    try {
      console.log(`🔄 Iniciando sincronización WooCommerce para canal ${channel._id}`);
      console.log(`📅 Rango de fechas: ${dateFrom || 'Sin límite'} - ${dateTo || 'Sin límite'}`);
      
      // Obtener comunas permitidas
      const allowedCommunes = channel.accepted_communes || [];
      console.log(`📋 Comunas permitidas: ${allowedCommunes.length > 0 ? allowedCommunes.join(', ') : 'Todas'}`);
      
      // Obtener información de la empresa para pricing
      const company = await Company.findById(channel.company_id);
      const fixedShippingCost = company?.price_per_order || 0;
      
      while (hasMore && page <= 50) { // Límite de seguridad
        try {
          console.log(`📄 Procesando página ${page}...`);
          
          // Construir parámetros de consulta
          const params = {
            per_page: perPage,
            page: page,
            orderby: 'date',
            order: 'desc',
            status: 'any'
          };
          
          if (dateFrom) params.after = dateFrom;
          if (dateTo) params.before = dateTo;
          
          // Obtener pedidos de WooCommerce
          const response = await axios.get(
            `${this.getApiUrl(channel)}/orders`,
            {
              headers: this.getAuthHeader(channel),
              params: params
            }
          );
          
          const orders = response.data;
          totalOrdersProcessed += orders.length;
          
          console.log(`📦 Obtenidos ${orders.length} pedidos de la página ${page}`);
          
          if (orders.length === 0) {
            console.log('📄 No hay más pedidos, finalizando sincronización');
            hasMore = false;
            break;
          }
          
          // Procesar cada pedido
          for (const wooOrder of orders) {
            try {
              // 🏘️ LÓGICA DE FILTRADO MEJORADA
              const orderCommune = this.normalizeCommune(wooOrder.shipping.city || wooOrder.billing.city || '');
              
              if (!this.isCommuneAllowed(orderCommune, allowedCommunes)) {
                console.log(`🚫 Pedido #${wooOrder.number} rechazado durante sincronización. Comuna "${orderCommune}" no permitida.`);
                ordersRejected++;
                continue;
              }
              
              // Verificar si el pedido ya existe
              const existingOrder = await Order.findOne({ 
                channel_id: channel._id, 
                external_order_id: wooOrder.id.toString() 
              });
              
              if (!existingOrder) {
                // Crear nuevo pedido
                const orderData = {
                  company_id: channel.company_id,
                  channel_id: channel._id,
                  external_order_id: wooOrder.id.toString(),
                  order_number: wooOrder.number,
                  customer_name: this.getCustomerName(wooOrder),
                  customer_email: wooOrder.billing.email,
                  customer_phone: wooOrder.billing.phone,
                  shipping_address: this.getShippingAddress(wooOrder),
                  shipping_commune: orderCommune,
                  shipping_state: wooOrder.shipping.state || wooOrder.billing.state || 'Región Metropolitana',
                  shipping_zip: wooOrder.shipping.postcode || wooOrder.billing.postcode,
                  shipping_cost: fixedShippingCost,
                  total_amount: parseFloat(wooOrder.total) || 0,
                  status: this.mapOrderStatus(wooOrder),
                  order_date: wooOrder.date_created,
                  items: this.mapOrderItems(wooOrder.line_items),
                  items_count: wooOrder.line_items?.length || 0,
                  notes: wooOrder.customer_note || '',
                  raw_data: wooOrder
                };
                
                await Order.create(orderData);
                ordersImported++;
                console.log(`✅ Pedido #${wooOrder.number} importado - Comuna: ${orderCommune}`);
              } else {
                console.log(`⏭️ Pedido #${wooOrder.number} ya existe, omitiendo`);
              }
            } catch (orderError) {
              console.error(`❌ Error importando pedido WooCommerce #${wooOrder.number}:`, orderError);
            }
          }
          
          // Verificar si hay más páginas
          if (orders.length < perPage) {
            console.log(`📄 Página ${page} tiene ${orders.length} pedidos (menos que ${perPage}), finalizando`);
            hasMore = false;
          } else {
            page++;
            console.log(`➡️ Avanzando a página ${page}`);
            
            // Pausa para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (pageError) {
          console.error(`❌ Error procesando página ${page}:`, pageError);
          hasMore = false;
        }
      }
      
      console.log(`🏁 Sincronización completada:`);
      console.log(`   📊 Total pedidos procesados: ${totalOrdersProcessed}`);
      console.log(`   ✅ Pedidos importados: ${ordersImported}`);
      console.log(`   🚫 Pedidos rechazados por filtro de comuna: ${ordersRejected}`);
      console.log(`   ⏭️ Pedidos ya existentes: ${totalOrdersProcessed - ordersImported - ordersRejected}`);
      
      return {
        imported: ordersImported,
        rejected: ordersRejected,
        total: totalOrdersProcessed
      };
    } catch (error) {
      console.error('❌ Error sincronizando pedidos WooCommerce:', error);
      throw error;
    }
  }
  
  // Procesar webhook con filtro de comunas mejorado
  static async processWebhook(channelId, data, headers) {
    try {
      console.log(`🔔 Procesando webhook WooCommerce para canal ${channelId}`);
      
      const channel = await Channel.findById(channelId);
      if (!channel) throw new Error('Canal no encontrado');

      const wooOrder = data;
      
      // 🏘️ LÓGICA DE FILTRADO MEJORADA
      const allowedCommunes = channel.accepted_communes || [];
      const orderCommune = this.normalizeCommune(wooOrder.shipping.city || wooOrder.billing.city || '');
      
      if (!this.isCommuneAllowed(orderCommune, allowedCommunes)) {
        console.log(`🚫 Pedido #${wooOrder.number} rechazado por webhook. Comuna "${orderCommune}" no está permitida para el canal "${channel.channel_name}".`);
        console.log(`📋 Comunas permitidas: ${allowedCommunes.join(', ')}`);
        return { success: true, message: 'Pedido rechazado por filtro de comuna' };
      }
      
      console.log(`✅ Pedido #${wooOrder.number} aceptado por webhook. Comuna "${orderCommune}" está permitida.`);
      
      // Obtener información de la empresa para pricing
      const company = await Company.findById(channel.company_id);
      if (!company) throw new Error(`Empresa no encontrada para el canal: ${channelId}`);
      
      const fixedShippingCost = company.price_per_order || 0;
      
      // Buscar pedido existente
      const existingOrder = await Order.findOne({ 
        channel_id: channelId, 
        external_order_id: wooOrder.id.toString() 
      });
      
      if (existingOrder) {
        console.log(`🔄 Actualizando pedido existente #${wooOrder.number}`);
        
        // Actualizar pedido existente
        const updates = {
          status: this.mapOrderStatus(wooOrder),
          shipping_cost: fixedShippingCost,
          shipping_commune: orderCommune,
          shipping_state: wooOrder.shipping.state || wooOrder.billing.state || 'Región Metropolitana',
          total_amount: parseFloat(wooOrder.total) || 0,
          items: this.mapOrderItems(wooOrder.line_items),
          items_count: wooOrder.line_items?.length || 0,
          notes: wooOrder.customer_note || '',
          raw_data: wooOrder,
          updated_at: new Date()
        };
        
        // Solo actualizar delivery_date si se marca como entregado
        if (updates.status === 'delivered' && !existingOrder.delivery_date) {
          updates.delivery_date = new Date();
        }
        
        await Order.findByIdAndUpdate(existingOrder._id, updates);
        console.log(`✅ Pedido #${wooOrder.number} actualizado - Comuna: ${orderCommune}`);
      } else {
        console.log(`🆕 Creando nuevo pedido #${wooOrder.number} desde webhook`);
        
        // Crear nuevo pedido
        const orderData = {
          company_id: channel.company_id,
          channel_id: channelId,
          external_order_id: wooOrder.id.toString(),
          order_number: wooOrder.number,
          customer_name: this.getCustomerName(wooOrder),
          customer_email: wooOrder.billing.email,
          customer_phone: wooOrder.billing.phone,
          shipping_address: this.getShippingAddress(wooOrder),
          shipping_commune: orderCommune,
          shipping_state: wooOrder.shipping.state || wooOrder.billing.state || 'Región Metropolitana',
          shipping_zip: wooOrder.shipping.postcode || wooOrder.billing.postcode,
          shipping_cost: fixedShippingCost,
          total_amount: parseFloat(wooOrder.total) || 0,
          status: this.mapOrderStatus(wooOrder),
          order_date: wooOrder.date_created,
          items: this.mapOrderItems(wooOrder.line_items),
          items_count: wooOrder.line_items?.length || 0,
          notes: wooOrder.customer_note || '',
          raw_data: wooOrder
        };
        
        const newOrder = await Order.create(orderData);
        console.log(`✅ Pedido #${wooOrder.number} creado - Comuna: ${orderCommune}`);
        
        // Auto-crear en Shipday si está habilitado
        if (channel.auto_create_shipday && newOrder.status === 'processing') {
          try {
            await this.autoCreateInShipday(newOrder);
          } catch (shipdayError) {
            console.error('⚠️ Error auto-creando en Shipday:', shipdayError);
          }
        }
      }
      
      return { success: true, message: 'Webhook procesado correctamente' };
    } catch (error) {
      console.error('❌ Error procesando webhook WooCommerce:', error);
      throw error;
    }
  }

  // Mapear items del pedido
  static mapOrderItems(lineItems) {
    if (!lineItems || lineItems.length === 0) return [];
    
    return lineItems.map(item => ({
      product_id: item.product_id?.toString(),
      sku: item.sku,
      name: item.name,
      variant: item.variation_id ? `Variación ${item.variation_id}` : null,
      quantity: item.quantity,
      unit_price: parseFloat(item.price) || 0,
      total_price: parseFloat(item.total) || 0,
      image_url: item.image?.src || null
    }));
  }

  // Validar configuración del canal
  static async validateChannel(channel) {
    try {
      console.log('🔍 Validando configuración del canal WooCommerce...');
      
      // Probar conexión con la API
      const response = await axios.get(
        `${this.getApiUrl(channel)}/system_status`,
        { headers: this.getAuthHeader(channel) }
      );
      
      const systemStatus = response.data;
      
      console.log('✅ Conexión exitosa con WooCommerce');
      
      return {
        valid: true,
        version: systemStatus.version,
        environment: systemStatus.environment,
        database_version: systemStatus.database_version
      };
    } catch (error) {
      console.error('❌ Error validando canal WooCommerce:', error);
      
      let errorMessage = 'Error de conexión';
      if (error.response?.status === 401) {
        errorMessage = 'Credenciales inválidas';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permisos insuficientes';
      } else if (error.response?.status === 404) {
        errorMessage = 'Endpoint no encontrado';
      }
      
      return {
        valid: false,
        error: errorMessage,
        details: error.response?.data || error.message
      };
    }
  }

  // Obtener información de la tienda
  static async getShopInfo(channel) {
    try {
      const response = await axios.get(
        `${this.getApiUrl(channel)}/settings/general`,
        { headers: this.getAuthHeader(channel) }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo información de la tienda:', error);
      throw error;
    }
  }

  // Obtener pedidos recientes
  static async getRecentOrders(channel, limit = 10) {
    try {
      const response = await axios.get(
        `${this.getApiUrl(channel)}/orders?per_page=${limit}&orderby=date&order=desc`,
        { headers: this.getAuthHeader(channel) }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo pedidos recientes:', error);
      throw error;
    }
  }
  
  // Helpers
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

  // Auto-crear en Shipday
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
      throw error;
    }
  }
}

module.exports = WooCommerceService;