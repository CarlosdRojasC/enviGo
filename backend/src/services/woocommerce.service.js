const axios = require('axios');
// Se importan los modelos de Mongoose en lugar del 'pool' de PostgreSQL
const Order = require('../models/Order');
const Channel = require('../models/Channel');

class WooCommerceService {
  // Construir headers de autenticación
  static getAuthHeader(channel) {
    // WooCommerce usa autenticación básica con consumer key y secret
    const auth = Buffer.from(`${channel.api_key}:${channel.api_secret}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Obtener URL base de la API
  static getApiUrl(channel) {
    const baseUrl = channel.store_url.replace(/\/$/, ''); // Remover trailing slash
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
  
  // Registrar webhook (sin cambios en la lógica principal)
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
  
  // --- MÉTODO SYNCORDERS CORREGIDO CON MONGOOSE ---
  static async syncOrders(channel, dateFrom, dateTo) {
    let ordersImported = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    
    try {
      while (hasMore) {
        const params = new URLSearchParams({
          page: page,
          per_page: perPage,
          orderby: 'date',
          order: 'desc'
        });
        
        if (dateFrom) params.append('after', dateFrom);
        if (dateTo) params.append('before', dateTo);
        
        const response = await axios.get(
          `${this.getApiUrl(channel)}/orders?${params}`,
          { headers: this.getAuthHeader(channel) }
        );
        
        const orders = response.data;
        
        if (orders.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const wooOrder of orders) {
          try {
            // Reemplazar la consulta de PostgreSQL con Mongoose
            const existingOrder = await Order.findOne({ 
              channel_id: channel._id, 
              external_order_id: wooOrder.id.toString() 
            });
            
            if (!existingOrder) {
              // Reemplazar la inserción SQL con el método de Mongoose
              await Order.create({
                company_id: channel.company_id,
                channel_id: channel._id,
                external_order_id: wooOrder.id.toString(),
                order_number: wooOrder.number,
                customer_name: this.getCustomerName(wooOrder),
                customer_email: wooOrder.billing.email,
                customer_phone: wooOrder.billing.phone,
                customer_document: wooOrder.meta_data?.find(m => m.key === '_billing_rut')?.value || '',
                shipping_address: this.getShippingAddress(wooOrder),
                shipping_city: wooOrder.shipping.city || wooOrder.billing.city,
                shipping_state: wooOrder.shipping.state || wooOrder.billing.state,
                shipping_zip: wooOrder.shipping.postcode || wooOrder.billing.postcode,
                total_amount: wooOrder.total,
                shipping_cost: wooOrder.shipping_total,
                currency: wooOrder.currency,
                status: this.mapOrderStatus(wooOrder),
                order_date: wooOrder.date_created,
                raw_data: wooOrder
                // Nota: Los items del pedido (line_items) no se están guardando.
                // Si tu modelo Order lo permite, deberías mapearlos y guardarlos aquí.
              });
              
              ordersImported++;
            }
          } catch (orderError) {
            console.error(`Error importando pedido WooCommerce ${wooOrder.number}:`, orderError);
          }
        }
        
        if (orders.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      return ordersImported;
    } catch (error) {
      console.error('Error sincronizando pedidos WooCommerce:', error);
      throw error;
    }
  }
  
  // --- MÉTODO PROCESSWEBHOOK CORREGIDO CON MONGOOSE ---
  static async processWebhook(channelId, data, headers) {
    try {
      const channel = await Channel.findById(channelId);
      
      if (!channel) {
        throw new Error('Canal no encontrado');
      }
      
      const wooOrder = data;
      
      const existingOrder = await Order.findOne({ 
        channel_id: channelId, 
        external_order_id: wooOrder.id.toString() 
      });
      
      if (existingOrder) {
        existingOrder.status = this.mapOrderStatus(wooOrder);
        existingOrder.total_amount = wooOrder.total;
        existingOrder.raw_data = wooOrder;
        await existingOrder.save();
      } else {
        await Order.create({
            company_id: channel.company_id,
            channel_id: channelId,
            external_order_id: wooOrder.id.toString(),
            order_number: wooOrder.number,
            customer_name: this.getCustomerName(wooOrder),
            customer_email: wooOrder.billing.email,
            customer_phone: wooOrder.billing.phone,
            shipping_address: this.getShippingAddress(wooOrder),
            shipping_city: wooOrder.shipping.city || wooOrder.billing.city,
            total_amount: wooOrder.total,
            shipping_cost: wooOrder.shipping_total,
            status: this.mapOrderStatus(wooOrder),
            order_date: wooOrder.date_created,
            raw_data: wooOrder
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error procesando webhook WooCommerce:', error);
      throw error;
    }
  }
  
  // Actualizar estado de pedido en WooCommerce (sin cambios)
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
        error: error.message
      };
    }
  }
  
  // Helpers (sin cambios)
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
}

module.exports = WooCommerceService;