// backend/src/services/woocommerce.service.js
const axios = require('axios');
const Order = require('../models/Order');
const Company = require('../models/Company');

class WooCommerceService {
  constructor(channel) {
    this.channel = channel;
    this.apiUrl = this.getApiUrl(channel);
    this.authHeader = this.getAuthHeader(channel);
  }

  // ==================== CONFIGURACIÓN ====================
  
  getApiUrl(channel) {
    let baseUrl = channel.store_url;
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    return `${baseUrl}/wp-json/wc/v3`;
  }

  getAuthHeader(channel) {
    const credentials = Buffer.from(`${channel.api_key}:${channel.api_secret}`).toString('base64');
    return { Authorization: `Basic ${credentials}` };
  }

  // ==================== SINCRONIZACIÓN PRINCIPAL ====================
  
  async syncOrders(channel, dateFrom, dateTo) {
    let ordersImported = 0;
    let ordersRejected = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    let totalOrdersProcessed = 0;
    const rejectionReasons = [];
    
    try {
      console.log(`🔄 Iniciando sync WooCommerce para canal ${channel._id}`);
      
      // Obtener información de la empresa
      const company = await Company.findById(channel.company_id);
      if (!company) {
        throw new Error(`Empresa no encontrada para canal: ${channel._id}`);
      }
      
      const fixedShippingCost = company.price_per_order || 0;
      const allowedCommunes = channel.accepted_communes || [];
      
      // Construir parámetros de consulta
      const queryParams = this.buildQueryParams(dateFrom, dateTo);
      
      while (hasMore && page <= 50) { // Límite de seguridad
        console.log(`📄 Procesando página ${page}...`);
        
        const pageParams = { 
          ...queryParams, 
          page, 
          per_page: perPage 
        };
        
        const response = await this.makeApiRequest('/orders', pageParams);
        
        if (!response.data || response.data.length === 0) {
          console.log('📄 No hay más pedidos para procesar');
          break;
        }
        
        // Procesar pedidos de la página
        const pageResult = await this.processOrdersPage(
          response.data, 
          company, 
          allowedCommunes, 
          fixedShippingCost,
          rejectionReasons
        );
        
        ordersImported += pageResult.imported;
        ordersRejected += pageResult.rejected;
        totalOrdersProcessed += response.data.length;
        
        // Verificar si hay más páginas
        hasMore = response.data.length === perPage;
        page++;
        
        // Rate limiting - pausa entre páginas
        if (hasMore) {
          await this.delay(500); // 500ms entre páginas
        }
      }
      
      console.log(`✅ WooCommerce sync completado: ${ordersImported} importados, ${ordersRejected} rechazados`);
      
      return {
        ordersImported,
        ordersRejected,
        totalOrdersProcessed,
        rejectionReasons: this.summarizeRejections(rejectionReasons)
      };
      
    } catch (error) {
      console.error('❌ Error en syncOrders WooCommerce:', error.message);
      throw new Error(`WooCommerce sync failed: ${error.message}`);
    }
  }

  // ==================== PROCESAMIENTO DE PÁGINAS ====================
  
  async processOrdersPage(orders, company, allowedCommunes, fixedShippingCost, rejectionReasons) {
    let imported = 0;
    let rejected = 0;
    
    for (const orderData of orders) {
      try {
        // Verificar si el pedido ya existe
        const existingOrder = await Order.findOne({
          external_order_id: orderData.id.toString(),
          channel_id: this.channel._id
        });
        
        if (existingOrder) {
          continue; // Skip pedido existente
        }
        
        // Validar comuna si hay restricciones
        const commune = this.extractCommune(orderData);
        if (!this.isCommuneAllowed(commune, allowedCommunes)) {
          rejected++;
          rejectionReasons.push({
            orderId: orderData.id,
            reason: 'commune_not_allowed',
            commune
          });
          continue;
        }
        
        // Transformar y guardar pedido
        const transformedOrder = this.transformWooCommerceOrder(
          orderData, 
          this.channel, 
          company, 
          fixedShippingCost
        );
        
        await new Order(transformedOrder).save();
        imported++;
        
      } catch (error) {
        rejected++;
        rejectionReasons.push({
          orderId: orderData.id,
          reason: 'processing_error',
          error: error.message
        });
        console.error(`❌ Error procesando pedido ${orderData.id}:`, error.message);
      }
    }
    
    return { imported, rejected, processed: orders.length };
  }

  // ==================== TRANSFORMACIÓN DE DATOS ====================
  
  transformWooCommerceOrder(orderData, channel, company, fixedShippingCost) {
    const shippingAddress = orderData.shipping || orderData.billing;
    
    return {
      external_order_id: orderData.id.toString(),
      channel_id: channel._id,
      company_id: company._id,
      
      // Información del cliente
      customer_name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim(),
      customer_email: orderData.billing?.email || '',
      customer_phone: this.cleanPhone(shippingAddress.phone || orderData.billing?.phone),
      
      // Dirección de entrega
      delivery_address: this.buildDeliveryAddress(shippingAddress),
      delivery_commune: this.extractCommune(orderData),
      delivery_city: shippingAddress.city || '',
      delivery_region: shippingAddress.state || '',
      
      // Información del pedido
      total_amount: parseFloat(orderData.total || 0),
      shipping_cost: fixedShippingCost,
      items_description: this.buildItemsDescription(orderData.line_items || []),
      
      // Fechas
      order_date: new Date(orderData.date_created),
      
      // Estados
      status: 'pending',
      channel_status: orderData.status,
      
      // Metadatos
      metadata: {
        woocommerce_order_number: orderData.number,
        payment_method: orderData.payment_method_title,
        currency: orderData.currency,
        total_items: orderData.line_items?.length || 0
      }
    };
  }

  // ==================== UTILIDADES ====================
  
  buildQueryParams(dateFrom, dateTo) {
    const params = {
      status: 'processing,completed', // Solo pedidos relevantes
      orderby: 'date',
      order: 'desc'
    };
    
    if (dateFrom) {
      params.after = new Date(dateFrom).toISOString();
    }
    
    if (dateTo) {
      params.before = new Date(dateTo).toISOString();
    }
    
    return params;
  }

  buildDeliveryAddress(shippingAddress) {
    const parts = [
      shippingAddress.address_1,
      shippingAddress.address_2
    ].filter(Boolean);
    
    return parts.join(', ') || 'Dirección no especificada';
  }

  buildItemsDescription(lineItems) {
    if (!lineItems || lineItems.length === 0) {
      return 'Sin items';
    }
    
    return lineItems
      .map(item => `${item.name} (x${item.quantity})`)
      .join(', ');
  }

  extractCommune(orderData) {
    const shipping = orderData.shipping || orderData.billing;
    return shipping?.city || 
           shipping?.state || 
           'Desconocida';
  }

  isCommuneAllowed(commune, allowedCommunes) {
    if (!allowedCommunes || allowedCommunes.length === 0) {
      return true; // Sin restricciones
    }
    
    const normalizedCommune = commune.toLowerCase().trim();
    return allowedCommunes.some(allowed => 
      allowed.toLowerCase().trim() === normalizedCommune
    );
  }

  cleanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '');
  }

  summarizeRejections(rejectionReasons) {
    const summary = {};
    rejectionReasons.forEach(rejection => {
      summary[rejection.reason] = (summary[rejection.reason] || 0) + 1;
    });
    return summary;
  }

  // ==================== API REQUESTS ====================
  
  async makeApiRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.apiUrl}${endpoint}`, {
        headers: this.authHeader,
        params,
        timeout: 30000
      });
      
      // WooCommerce puede devolver 200 con errores
      if (response.data && response.data.code && response.data.message) {
        throw new Error(`WooCommerce API Error: ${response.data.message}`);
      }
      
      return response;
      
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        if (status === 401) {
          throw new Error('WooCommerce: Credenciales inválidas');
        } else if (status === 404) {
          throw new Error('WooCommerce: Endpoint no encontrado - verificar URL');
        } else if (status === 429) {
          throw new Error('WooCommerce: Rate limit excedido');
        }
        
        throw new Error(`WooCommerce API Error (${status}): ${message}`);
      }
      
      throw new Error(`WooCommerce connection error: ${error.message}`);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== WEBHOOKS ====================
  
  async registerWebhook() {
    try {
      const webhookUrl = `${process.env.API_BASE_URL}/webhook/woocommerce/${this.channel._id}`;
      
      // Verificar webhooks existentes
      const existingResponse = await this.makeApiRequest('/webhooks');
      const existingWebhooks = existingResponse.data || [];
      
      // Verificar si ya existe webhook para órdenes creadas
      const createWebhook = existingWebhooks.find(
        webhook => webhook.topic === 'order.created' && webhook.delivery_url === webhookUrl
      );
      
      if (!createWebhook) {
        await this.makeApiRequest('/webhooks', {}, 'POST', {
          name: 'enviGo - Nuevos Pedidos',
          topic: 'order.created',
          delivery_url: webhookUrl,
          secret: this.channel.webhook_secret || process.env.WOOCOMMERCE_WEBHOOK_SECRET
        });
        console.log('✅ Webhook WooCommerce registrado');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error registrando webhook WooCommerce:', error.message);
      throw error;
    }
  }
  async syncChannelById(channelId) {
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error(`Canal con ID ${channelId} no encontrado`);
  }
  
  return await this.syncChannel(channel);
}
}

module.exports = WooCommerceService;