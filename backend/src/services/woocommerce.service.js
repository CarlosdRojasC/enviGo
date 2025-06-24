const axios = require('axios');
const pool = require('../config/database');

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
      
      // Verificar si ya existe un webhook para evitar duplicados
      const existingWebhooks = await axios.get(
        `${this.getApiUrl(channel)}/webhooks`,
        { headers: this.getAuthHeader(channel) }
      );
      
      const orderWebhook = existingWebhooks.data.find(
        webhook => webhook.topic === 'order.created' && webhook.delivery_url === webhookUrl
      );
      
      if (!orderWebhook) {
        // Crear webhook para nuevos pedidos
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
      
      // Webhook para actualizaciones de pedidos
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
  
  // Sincronizar pedidos
  static async syncOrders(channel, dateFrom, dateTo) {
    const client = await pool.connect();
    let ordersImported = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    
    try {
      await client.query('BEGIN');
      
      while (hasMore) {
        // Construir parámetros
        const params = new URLSearchParams({
          page: page,
          per_page: perPage,
          orderby: 'date',
          order: 'desc'
        });
        
        if (dateFrom) params.append('after', dateFrom);
        if (dateTo) params.append('before', dateTo);
        
        // Obtener pedidos
        const response = await axios.get(
          `${this.getApiUrl(channel)}/orders?${params}`,
          { headers: this.getAuthHeader(channel) }
        );
        
        const orders = response.data;
        
        if (orders.length === 0) {
          hasMore = false;
          break;
        }
        
        // Procesar cada pedido
        for (const wooOrder of orders) {
          try {
            // Verificar si el pedido ya existe
            const existingOrder = await client.query(
              'SELECT id FROM orders WHERE channel_id = $1 AND external_order_id = $2',
              [channel.id, wooOrder.id.toString()]
            );
            
            if (existingOrder.rows.length === 0) {
              // Crear nuevo pedido
              const orderResult = await client.query(
                `INSERT INTO orders (
                  company_id, channel_id, external_order_id, order_number,
                  customer_name, customer_email, customer_phone, customer_document,
                  shipping_address, shipping_city, shipping_state, shipping_zip,
                  total_amount, shipping_cost, currency,
                  status, order_date, raw_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING id`,
                [
                  channel.company_id,
                  channel.id,
                  wooOrder.id.toString(),
                  wooOrder.number,
                  this.getCustomerName(wooOrder),
                  wooOrder.billing.email,
                  wooOrder.billing.phone,
                  wooOrder.meta_data?.find(m => m.key === '_billing_rut')?.value || '',
                  this.getShippingAddress(wooOrder),
                  wooOrder.shipping.city || wooOrder.billing.city,
                  wooOrder.shipping.state || wooOrder.billing.state,
                  wooOrder.shipping.postcode || wooOrder.billing.postcode,
                  wooOrder.total,
                  wooOrder.shipping_total,
                  wooOrder.currency,
                  this.mapOrderStatus(wooOrder),
                  wooOrder.date_created,
                  JSON.stringify(wooOrder)
                ]
              );
              
              const orderId = orderResult.rows[0].id;
              
              // Insertar items del pedido
              for (const item of wooOrder.line_items) {
                await client.query(
                  `INSERT INTO order_items (
                    order_id, product_id, sku, name, variant,
                    quantity, unit_price, total_price
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [
                    orderId,
                    item.product_id?.toString(),
                    item.sku,
                    item.name,
                    item.variation_id ? `Variación ${item.variation_id}` : null,
                    item.quantity,
                    item.price,
                    item.total
                  ]
                );
              }
              
              ordersImported++;
            }
          } catch (orderError) {
            console.error(`Error importando pedido WooCommerce ${wooOrder.number}:`, orderError);
            // Continuar con el siguiente pedido
          }
        }
        
        // Si recibimos menos pedidos que el límite, no hay más páginas
        if (orders.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      await client.query('COMMIT');
      return ordersImported;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error sincronizando pedidos WooCommerce:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Procesar webhook
  static async processWebhook(channelId, data, headers) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar firma del webhook si está disponible
      const webhookSignature = headers['x-wc-webhook-signature'];
      if (webhookSignature) {
        // TODO: Verificar firma del webhook
      }
      
      // Obtener información del canal
      const channelResult = await client.query(
        'SELECT company_id FROM sales_channels WHERE id = $1',
        [channelId]
      );
      
      if (channelResult.rows.length === 0) {
        throw new Error('Canal no encontrado');
      }
      
      const channel = channelResult.rows[0];
      const wooOrder = data;
      
      // Verificar si el pedido ya existe
      const existingOrder = await client.query(
        'SELECT id, status FROM orders WHERE channel_id = $1 AND external_order_id = $2',
        [channelId, wooOrder.id.toString()]
      );
      
      if (existingOrder.rows.length > 0) {
        // Actualizar pedido existente
        await client.query(
          `UPDATE orders 
           SET status = $1, 
               total_amount = $2,
               updated_at = NOW(),
               raw_data = $3
           WHERE id = $4`,
          [
            this.mapOrderStatus(wooOrder),
            wooOrder.total,
            JSON.stringify(wooOrder),
            existingOrder.rows[0].id
          ]
        );
      } else {
        // Crear nuevo pedido (mismo código que en syncOrders)
        const orderResult = await client.query(
          `INSERT INTO orders (
            company_id, channel_id, external_order_id, order_number,
            customer_name, customer_email, customer_phone, customer_document,
            shipping_address, shipping_city, shipping_state, shipping_zip,
            total_amount, shipping_cost, currency,
            status, order_date, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING id`,
          [
            channel.company_id,
            channelId,
            wooOrder.id.toString(),
            wooOrder.number,
            this.getCustomerName(wooOrder),
            wooOrder.billing.email,
            wooOrder.billing.phone,
            wooOrder.meta_data?.find(m => m.key === '_billing_rut')?.value || '',
            this.getShippingAddress(wooOrder),
            wooOrder.shipping.city || wooOrder.billing.city,
            wooOrder.shipping.state || wooOrder.billing.state,
            wooOrder.shipping.postcode || wooOrder.billing.postcode,
            wooOrder.total,
            wooOrder.shipping_total,
            wooOrder.currency,
            this.mapOrderStatus(wooOrder),
            wooOrder.date_created,
            JSON.stringify(wooOrder)
          ]
        );
        
        const orderId = orderResult.rows[0].id;
        
        // Insertar items
        for (const item of wooOrder.line_items || []) {
          await client.query(
            `INSERT INTO order_items (
              order_id, product_id, sku, name, variant,
              quantity, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              orderId,
              item.product_id?.toString(),
              item.sku,
              item.name,
              item.variation_id ? `Variación ${item.variation_id}` : null,
              item.quantity,
              item.price,
              item.total
            ]
          );
        }
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error procesando webhook WooCommerce:', error);
      throw error;
    } finally {
      client.release();
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
        error: error.message
      };
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
}

module.exports = WooCommerceService;