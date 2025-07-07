const axios = require('axios');
const pool = require('../config/database');

class MercadoLibreService {
  // URL base de la API de MercadoLibre
  static API_BASE_URL = 'https://api.mercadolibre.com';
  
  // Obtener token de acceso (debe ser renovado periódicamente)
  static async getAccessToken(channel) {
    try {
      // Si el channel tiene un refresh_token, usarlo para obtener un nuevo access_token
      if (channel.settings?.refresh_token) {
        const response = await axios.post(`${this.API_BASE_URL}/oauth/token`, {
          grant_type: 'refresh_token',
          client_id: process.env.MERCADOLIBRE_APP_ID,
          client_secret: process.env.MERCADOLIBRE_SECRET_KEY,
          refresh_token: channel.settings.refresh_token
        });
        
        // Actualizar tokens en la base de datos
        await pool.query(
          `UPDATE sales_channels 
           SET api_key = $1, 
               settings = jsonb_set(settings, '{refresh_token}', $2::jsonb),
               updated_at = NOW()
           WHERE id = $3`,
          [
            response.data.access_token,
            JSON.stringify(response.data.refresh_token),
            channel.id
          ]
        );
        
        return response.data.access_token;
      }
      
      // Si no hay refresh_token, usar el access_token existente
      return channel.api_key;
    } catch (error) {
      console.error('Error obteniendo access token:', error);
      throw new Error('Error de autenticación con MercadoLibre');
    }
  }
  
  // Probar conexión
  static async testConnection(channel) {
    try {
      const accessToken = await this.getAccessToken(channel);
      
      // Obtener información del usuario
      const response = await axios.get(
        `${this.API_BASE_URL}/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      return {
        success: true,
        message: `Conectado exitosamente a MercadoLibre`,
        store_info: {
          nickname: response.data.nickname,
          site_id: response.data.site_id,
          seller_reputation: response.data.seller_reputation?.level_id
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }
  
  // Registrar notificaciones (MercadoLibre usa un sistema diferente)
  static async registerWebhook(channel) {
    try {
      const accessToken = await this.getAccessToken(channel);
      const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/mercadolibre/${channel.id}`;
      
      // En MercadoLibre, las notificaciones se configuran a nivel de aplicación
      // No por cada usuario, así que este método solo verifica la configuración
      const response = await axios.get(
        `${this.API_BASE_URL}/applications/${process.env.MERCADOLIBRE_APP_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      console.log('Configuración de notificaciones:', response.data.notifications_url);
      
      // Actualizar la URL de notificaciones si es necesario
      if (response.data.notifications_url !== webhookUrl) {
        console.log('Nota: La URL de notificaciones debe configurarse en la consola de desarrolladores de MercadoLibre');
      }
      
      return true;
    } catch (error) {
      console.error('Error verificando notificaciones MercadoLibre:', error);
      throw error;
    }
  }
  
  // Sincronizar pedidos
  static async syncOrders(channel, dateFrom, dateTo) {
    const client = await pool.connect();
    let ordersImported = 0;
    let offset = 0;
    const limit = 50;
    let hasMore = true;
    
    try {
      await client.query('BEGIN');
      
      const accessToken = await this.getAccessToken(channel);
      const userId = channel.settings?.user_id || 'me';
      
      while (hasMore) {
        // Construir parámetros
        const params = new URLSearchParams({
          seller: userId,
          offset: offset,
          limit: limit,
          sort: 'date_desc'
        });
        
        // Filtros de fecha
        if (dateFrom) {
          params.append('order.date_created.from', dateFrom);
        }
        if (dateTo) {
          params.append('order.date_created.to', dateTo);
        }
        
        // Obtener pedidos
        const response = await axios.get(
          `${this.API_BASE_URL}/orders/search?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        const orders = response.data.results;
        
        if (!orders || orders.length === 0) {
          hasMore = false;
          break;
        }
        
        // Procesar cada pedido
        for (const mlOrder of orders) {
          try {
            // Obtener detalles completos del pedido
            const orderDetails = await axios.get(
              `${this.API_BASE_URL}/orders/${mlOrder.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );
            
            const fullOrder = orderDetails.data;
            
            // Verificar si el pedido ya existe
            const existingOrder = await client.query(
              'SELECT id FROM orders WHERE channel_id = $1 AND external_order_id = $2',
              [channel.id, fullOrder.id.toString()]
            );
            
            if (existingOrder.rows.length === 0) {
              // Obtener información del comprador
              const buyerInfo = await this.getBuyerInfo(fullOrder, accessToken);
              
              // Obtener información de envío
              const shippingInfo = await this.getShippingInfo(fullOrder, accessToken);
              
              // Crear nuevo pedido
              const orderResult = await client.query(
                `INSERT INTO orders (
                  company_id, channel_id, external_order_id, order_number,
                  customer_name, customer_email, customer_phone, customer_document,
                  shipping_address, shipping_city, shipping_state, shipping_zip,
                  total_amount, shipping_cost, currency,
                  status, order_date, raw_data, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING id`,
                [
                  channel.company_id,
                  channel.id,
                  fullOrder.id.toString(),
                  fullOrder.id.toString(),
                  buyerInfo.name,
                  buyerInfo.email,
                  buyerInfo.phone,
                  buyerInfo.document,
                  shippingInfo.address,
                  shippingInfo.city,
                  shippingInfo.state,
                  shippingInfo.zip_code,
                  fullOrder.total_amount,
                  fullOrder.shipping?.cost || 0,
                  fullOrder.currency_id,
                  this.mapOrderStatus(fullOrder),
                  fullOrder.date_created,
                  JSON.stringify(fullOrder),
                  fullOrder.comments ? `Nota del comprador: ${fullOrder.comments}` : null
                ]
              );
              
              const orderId = orderResult.rows[0].id;
              
              // Insertar items del pedido
              for (const item of fullOrder.order_items) {
                await client.query(
                  `INSERT INTO order_items (
                    order_id, product_id, sku, name, variant,
                    quantity, unit_price, total_price
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [
                    orderId,
                    item.item.id,
                    item.item.seller_sku,
                    item.item.title,
                    item.item.variation_attributes?.map(a => `${a.name}: ${a.value_name}`).join(', '),
                    item.quantity,
                    item.unit_price,
                    item.full_unit_price || (item.unit_price * item.quantity)
                  ]
                );
              }
              
              ordersImported++;
            }
          } catch (orderError) {
            console.error(`Error importando pedido ML ${mlOrder.id}:`, orderError);
            // Continuar con el siguiente pedido
          }
        }
        
        // Verificar si hay más páginas
        if (orders.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      
      await client.query('COMMIT');
      return ordersImported;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error sincronizando pedidos MercadoLibre:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Procesar notificación/webhook
  static async processWebhook(channelId, data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // MercadoLibre envía notificaciones, no el pedido completo
      if (data.topic !== 'orders' && data.topic !== 'orders_v2') {
        console.log('Notificación ignorada, topic:', data.topic);
        return true;
      }
      
      // Obtener información del canal
      const channelResult = await client.query(
        'SELECT * FROM sales_channels WHERE id = $1',
        [channelId]
      );
      
      if (channelResult.rows.length === 0) {
        throw new Error('Canal no encontrado');
      }
      
      const channel = channelResult.rows[0];
      const accessToken = await this.getAccessToken(channel);
      
      // Obtener el pedido completo desde la API
      const orderId = data.resource.split('/').pop();
      const orderResponse = await axios.get(
        `${this.API_BASE_URL}/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const mlOrder = orderResponse.data;
      
      // Verificar si el pedido ya existe
      const existingOrder = await client.query(
        'SELECT id, status FROM orders WHERE channel_id = $1 AND external_order_id = $2',
        [channelId, mlOrder.id.toString()]
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
            this.mapOrderStatus(mlOrder),
            JSON.stringify(mlOrder),
            existingOrder.rows[0].id
          ]
        );
      } else {
        // Crear nuevo pedido
        const buyerInfo = await this.getBuyerInfo(mlOrder, accessToken);
        const shippingInfo = await this.getShippingInfo(mlOrder, accessToken);
        
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
            mlOrder.id.toString(),
            mlOrder.id.toString(),
            buyerInfo.name,
            buyerInfo.email,
            buyerInfo.phone,
            buyerInfo.document,
            shippingInfo.address,
            shippingInfo.city,
            shippingInfo.state,
            shippingInfo.zip_code,
            mlOrder.total_amount,
            mlOrder.shipping?.cost || 0,
            mlOrder.currency_id,
            this.mapOrderStatus(mlOrder),
            mlOrder.date_created,
            JSON.stringify(mlOrder)
          ]
        );
        
        const newOrderId = orderResult.rows[0].id;
        
        // Insertar items
        for (const item of mlOrder.order_items || []) {
          await client.query(
            `INSERT INTO order_items (
              order_id, product_id, sku, name, variant,
              quantity, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              newOrderId,
              item.item.id,
              item.item.seller_sku,
              item.item.title,
              item.item.variation_attributes?.map(a => `${a.name}: ${a.value_name}`).join(', '),
              item.quantity,
              item.unit_price,
              item.full_unit_price || (item.unit_price * item.quantity)
            ]
          );
        }
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error procesando notificación MercadoLibre:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Obtener información del comprador
  static async getBuyerInfo(order, accessToken) {
    try {
      const buyerResponse = await axios.get(
        `${this.API_BASE_URL}/users/${order.buyer.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const buyer = buyerResponse.data;
      
      return {
        name: `${buyer.first_name} ${buyer.last_name}`.trim() || buyer.nickname,
        email: buyer.email,
        phone: buyer.phone?.area_code && buyer.phone?.number 
          ? `${buyer.phone.area_code}${buyer.phone.number}` 
          : '',
        document: buyer.identification?.number || ''
      };
    } catch (error) {
      console.error('Error obteniendo info del comprador:', error);
      return {
        name: order.buyer.nickname || 'Cliente ML',
        email: '',
        phone: '',
        document: ''
      };
    }
  }
  
  // Obtener información de envío
  static async getShippingInfo(order, accessToken) {
    try {
      if (!order.shipping?.id) {
        return {
          address: 'Retiro en tienda',
          city: '',
          state: '',
          zip_code: ''
        };
      }
      
      const shippingResponse = await axios.get(
        `${this.API_BASE_URL}/shipments/${order.shipping.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const shipping = shippingResponse.data;
      const address = shipping.receiver_address;
      
      return {
        address: `${address.street_name} ${address.street_number}`,
        city: address.city.name,
        state: address.state.name,
        zip_code: address.zip_code
      };
    } catch (error) {
      console.error('Error obteniendo info de envío:', error);
      
      // Intentar obtener dirección del pedido directamente
      if (order.shipping?.receiver_address) {
        const addr = order.shipping.receiver_address;
        return {
          address: `${addr.street_name || ''} ${addr.street_number || ''}`.trim(),
          city: addr.city?.name || '',
          state: addr.state?.name || '',
          zip_code: addr.zip_code || ''
        };
      }
      
      return {
        address: '',
        city: '',
        state: '',
        zip_code: ''
      };
    }
  }
  
  // Actualizar estado de envío en MercadoLibre
  static async updateShipmentStatus(channel, externalOrderId, newStatus) {
    try {
      const accessToken = await this.getAccessToken(channel);
      
      // Primero obtener el ID del envío
      const orderResponse = await axios.get(
        `${this.API_BASE_URL}/orders/${externalOrderId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const order = orderResponse.data;
      
      if (!order.shipping?.id) {
        return {
          success: false,
          error: 'El pedido no tiene información de envío'
        };
      }
      
      // Mapear estado a MercadoLibre
      let mlStatus;
      switch (newStatus) {
        case 'shipped':
          mlStatus = 'ready_to_ship';
          break;
        case 'delivered':
          mlStatus = 'delivered';
          break;
        case 'cancelled':
          mlStatus = 'cancelled';
          break;
        default:
          return {
            success: false,
            error: 'Estado no soportado para actualización en MercadoLibre'
          };
      }
      
      // Actualizar estado del envío
      const response = await axios.put(
        `${this.API_BASE_URL}/shipments/${order.shipping.id}`,
        {
          status: mlStatus
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        shipment: response.data
      };
    } catch (error) {
      console.error('Error actualizando estado en MercadoLibre:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  // Obtener etiqueta de envío
  static async getShippingLabel(channel, externalOrderId) {
    try {
      const accessToken = await this.getAccessToken(channel);
      
      // Obtener información del pedido
      const orderResponse = await axios.get(
        `${this.API_BASE_URL}/orders/${externalOrderId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const order = orderResponse.data;
      
      if (!order.shipping?.id) {
        throw new Error('El pedido no tiene información de envío');
      }
      
      // Obtener etiqueta
      const labelResponse = await axios.get(
        `${this.API_BASE_URL}/shipment_labels`,
        {
          params: {
            shipment_ids: order.shipping.id
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          responseType: 'arraybuffer'
        }
      );
      
      return {
        success: true,
        label: Buffer.from(labelResponse.data),
        contentType: labelResponse.headers['content-type']
      };
    } catch (error) {
      console.error('Error obteniendo etiqueta:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Mapear estado de MercadoLibre a nuestro sistema
  static mapOrderStatus(mlOrder) {
    // En MercadoLibre el estado principal está en el shipping
    if (mlOrder.shipping?.status) {
      const shippingStatus = mlOrder.shipping.status;
      
      const statusMap = {
        'pending': 'pending',
        'handling': 'processing',
        'ready_to_ship': 'processing',
        'shipped': 'shipped',
        'delivered': 'delivered',
        'not_delivered': 'shipped',
        'cancelled': 'cancelled'
      };
      
      return statusMap[shippingStatus] || 'pending';
    }
    
    // Si no hay shipping, usar el estado del pedido
    const orderStatus = mlOrder.status;
    
    if (orderStatus === 'cancelled') return 'cancelled';
    if (orderStatus === 'paid') return 'processing';
    
    return 'pending';
  }
  
  // Configurar OAuth para un nuevo canal
  static async getAuthorizationUrl(redirectUri) {
    const authUrl = new URL(`${this.API_BASE_URL}/authorization`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.MERCADOLIBRE_APP_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    
    return authUrl.toString();
  }
  
  // Intercambiar código por tokens
  static async exchangeCodeForTokens(code, redirectUri) {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: process.env.MERCADOLIBRE_APP_ID,
        client_secret: process.env.MERCADOLIBRE_SECRET_KEY,
        code: code,
        redirect_uri: redirectUri
      });
      
      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        user_id: response.data.user_id
      };
    } catch (error) {
      console.error('Error intercambiando código:', error);
      throw new Error('Error al autorizar con MercadoLibre');
    }
  }
  
  // Obtener categorías disponibles
  static async getCategories(channel, siteId = 'MLC') {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/sites/${siteId}/categories`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      throw error;
    }
  }
  
  // Buscar productos del vendedor
  static async getSellerProducts(channel) {
    try {
      const accessToken = await this.getAccessToken(channel);
      const userId = channel.settings?.user_id || 'me';
      
      const response = await axios.get(
        `${this.API_BASE_URL}/users/${userId}/items/search`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            status: 'active',
            limit: 100
          }
        }
      );
      
      return response.data.results;
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  }
  async processWebhook(channelId, webhookData) {
    try {
      const order = await this.createOrderFromWebhook(channelId, webhookData);
      
      // Auto-crear en Shipday
      if (process.env.AUTO_CREATE_SHIPDAY_ORDERS === 'true') {
        await this.autoCreateInShipday(order);
      }

      return order;
    } catch (error) {
      console.error('Error procesando webhook MercadoLibre:', error);
      throw error;
    }
  }

  async autoCreateInShipday(order) {
    try {
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

      console.log('✅ Orden MercadoLibre creada en Shipday:', shipdayOrder.orderId);
      
    } catch (error) {
      console.error('❌ Error creando orden MercadoLibre en Shipday:', error);
    }
  }
}

module.exports = MercadoLibreService;