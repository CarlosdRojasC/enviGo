const axios = require('axios');
const pool = require('../config/database');

class ShopifyService {
  // Construir URL base de la API
  static getApiUrl(channel) {
    return `https://${channel.store_url.replace('https://', '').replace('http://', '')}/admin/api/${process.env.SHOPIFY_API_VERSION || '2024-01'}`;
  }
  
  // Construir headers de autenticación
  static getHeaders(channel) {
    return {
      'X-Shopify-Access-Token': channel.api_secret,
      'Content-Type': 'application/json'
    };
  }
  
  // Probar conexión
  static async testConnection(channel) {
    try {
      const response = await axios.get(
        `${this.getApiUrl(channel)}/shop.json`,
        { headers: this.getHeaders(channel) }
      );
      
      return {
        success: true,
        message: `Conectado exitosamente a ${response.data.shop.name}`,
        shop_info: {
          name: response.data.shop.name,
          email: response.data.shop.email,
          currency: response.data.shop.currency
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.errors || error.message
      };
    }
  }
  
  // Registrar webhook
  static async registerWebhook(channel) {
    try {
      const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/shopify/${channel.id}`;
      
      // Registrar webhook para nuevos pedidos
      await axios.post(
        `${this.getApiUrl(channel)}/webhooks.json`,
        {
          webhook: {
            topic: 'orders/create',
            address: webhookUrl,
            format: 'json'
          }
        },
        { headers: this.getHeaders(channel) }
      );
      
      // Registrar webhook para actualizaciones de pedidos
      await axios.post(
        `${this.getApiUrl(channel)}/webhooks.json`,
        {
          webhook: {
            topic: 'orders/updated',
            address: webhookUrl,
            format: 'json'
          }
        },
        { headers: this.getHeaders(channel) }
      );
      
      return true;
    } catch (error) {
      console.error('Error registrando webhook Shopify:', error);
      throw error;
    }
  }
  
  // Sincronizar pedidos
  static async syncOrders(channel, dateFrom, dateTo) {
    const client = await pool.connect();
    let ordersImported = 0;
    
    try {
      await client.query('BEGIN');
      
      // Construir parámetros de fecha
      const params = new URLSearchParams();
      if (dateFrom) params.append('created_at_min', dateFrom);
      if (dateTo) params.append('created_at_max', dateTo);
      params.append('status', 'any');
      params.append('limit', '250');
      
      // Obtener pedidos de Shopify
      const response = await axios.get(
        `${this.getApiUrl(channel)}/orders.json?${params}`,
        { headers: this.getHeaders(channel) }
      );
      
      const orders = response.data.orders;
      
      for (const shopifyOrder of orders) {
        try {
          // Verificar si el pedido ya existe
          const existingOrder = await client.query(
            'SELECT id FROM orders WHERE channel_id = $1 AND external_order_id = $2',
            [channel.id, shopifyOrder.id.toString()]
          );
          
          if (existingOrder.rows.length === 0) {
            // Crear nuevo pedido
            const orderResult = await client.query(
              `INSERT INTO orders (
                company_id, channel_id, external_order_id, order_number,
                customer_name, customer_email, customer_phone,
                shipping_address, shipping_city, shipping_state, shipping_zip,
                total_amount, shipping_cost, currency,
                status, order_date, raw_data
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
              RETURNING id`,
              [
                channel.company_id,
                channel.id,
                shopifyOrder.id.toString(),
                shopifyOrder.name,
                this.getCustomerName(shopifyOrder),
                shopifyOrder.email,
                shopifyOrder.phone || shopifyOrder.shipping_address?.phone,
                this.getShippingAddress(shopifyOrder),
                shopifyOrder.shipping_address?.city,
                shopifyOrder.shipping_address?.province,
                shopifyOrder.shipping_address?.zip,
                shopifyOrder.total_price,
                shopifyOrder.total_shipping_price_set?.shop_money?.amount || 0,
                shopifyOrder.currency,
                this.mapOrderStatus(shopifyOrder),
                shopifyOrder.created_at,
                JSON.stringify(shopifyOrder)
              ]
            );
            
            const orderId = orderResult.rows[0].id;
            
            // Insertar items del pedido
            for (const item of shopifyOrder.line_items) {
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
                  item.variant_title,
                  item.quantity,
                  item.price,
                  parseFloat(item.price) * item.quantity
                ]
              );
            }
            
            ordersImported++;
          }
        } catch (orderError) {
          console.error(`Error importando pedido ${shopifyOrder.name}:`, orderError);
          // Continuar con el siguiente pedido
        }
      }
      
      await client.query('COMMIT');
      return ordersImported;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error sincronizando pedidos Shopify:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Procesar webhook
  static async processWebhook(channelId, data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Obtener información del canal
      const channelResult = await client.query(
        'SELECT company_id FROM sales_channels WHERE id = $1',
        [channelId]
      );
      
      if (channelResult.rows.length === 0) {
        throw new Error('Canal no encontrado');
      }
      
      const channel = channelResult.rows[0];
      const shopifyOrder = data;
      
      // Verificar si el pedido ya existe
      const existingOrder = await client.query(
        'SELECT id, status FROM orders WHERE channel_id = $1 AND external_order_id = $2',
        [channelId, shopifyOrder.id.toString()]
      );
      
      if (existingOrder.rows.length > 0) {
        // Actualizar pedido existente
        await client.query(
          `UPDATE orders 
           SET status = $1, 
               updated_at = NOW(),
               raw_data = $2
           WHERE id = $3`,
          [
            this.mapOrderStatus(shopifyOrder),
            JSON.stringify(shopifyOrder),
            existingOrder.rows[0].id
          ]
        );
      } else {
        // Crear nuevo pedido (mismo código que en syncOrders)
        const orderResult = await client.query(
          `INSERT INTO orders (
            company_id, channel_id, external_order_id, order_number,
            customer_name, customer_email, customer_phone,
            shipping_address, shipping_city, shipping_state, shipping_zip,
            total_amount, shipping_cost, currency,
            status, order_date, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id`,
          [
            channel.company_id,
            channelId,
            shopifyOrder.id.toString(),
            shopifyOrder.name,
            this.getCustomerName(shopifyOrder),
            shopifyOrder.email,
            shopifyOrder.phone || shopifyOrder.shipping_address?.phone,
            this.getShippingAddress(shopifyOrder),
            shopifyOrder.shipping_address?.city,
            shopifyOrder.shipping_address?.province,
            shopifyOrder.shipping_address?.zip,
            shopifyOrder.total_price,
            shopifyOrder.total_shipping_price_set?.shop_money?.amount || 0,
            shopifyOrder.currency,
            this.mapOrderStatus(shopifyOrder),
            shopifyOrder.created_at,
            JSON.stringify(shopifyOrder)
          ]
        );
        
        const orderId = orderResult.rows[0].id;
        
        // Insertar items
        for (const item of shopifyOrder.line_items || []) {
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
              item.variant_title,
              item.quantity,
              item.price,
              parseFloat(item.price) * item.quantity
            ]
          );
        }
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error procesando webhook Shopify:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Helpers
  static getCustomerName(order) {
    if (order.customer) {
      return `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim();
    }
    if (order.shipping_address) {
      return order.shipping_address.name;
    }
    return 'Cliente';
  }
  
  static getShippingAddress(order) {
    if (!order.shipping_address) return '';
    const addr = order.shipping_address;
    return `${addr.address1 || ''} ${addr.address2 || ''}`.trim();
  }
  
  static mapOrderStatus(shopifyOrder) {
    if (shopifyOrder.cancelled_at) return 'cancelled';
    if (shopifyOrder.fulfillment_status === 'fulfilled') return 'delivered';
    if (shopifyOrder.fulfillment_status === 'partial') return 'processing';
    if (shopifyOrder.financial_status === 'paid') return 'processing';
    return 'pending';
  }
}

module.exports = ShopifyService;