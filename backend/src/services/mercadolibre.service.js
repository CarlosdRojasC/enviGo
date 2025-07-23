const axios = require('axios');
const SalesChannel = require('../models/Channel');
const Order = require('../models/Order');

class MercadoLibreService {
  static API_BASE_URL = 'https://api.mercadolibre.com';

  /**
   * Obtiene y renueva el token de acceso si es necesario.
   */
  static async getAccessToken(channel) {
    const now = new Date().getTime();
    // Renovamos si el token tiene menos de 1 hora de vida.
    const expiresAt = new Date(channel.settings.updated_at || 0).getTime() + (channel.settings.expires_in || 0) * 1000;

    if (now > expiresAt - 3600 * 1000) {
      console.log(`[ML Service] Token para el canal "${channel.channel_name}" expirado o a punto de expirar. Renovando...`);
      try {
        const response = await axios.post(`${this.API_BASE_URL}/oauth/token`, {
          grant_type: 'refresh_token',
          client_id: process.env.MERCADOLIBRE_APP_ID,
          client_secret: process.env.MERCADOLIBRE_SECRET_KEY,
          refresh_token: channel.settings.refresh_token,
        });

        // Actualizar el canal con los nuevos tokens
        channel.api_key = response.data.access_token;
        Object.assign(channel.settings, {
          refresh_token: response.data.refresh_token,
          expires_in: response.data.expires_in,
          updated_at: new Date(),
        });
        channel.markModified('settings'); // Importante para que Mongoose guarde los cambios en el objeto
        await channel.save();
        
        return response.data.access_token;
      } catch (error) {
        console.error(`[ML Service] Error fatal renovando token: ${error.response?.data?.message || error.message}`);
        throw new Error('No se pudo renovar la autenticación con MercadoLibre.');
      }
    }
    return channel.api_key;
  }


  /**
     * Genera la URL de autorización de Mercado Libre a la que se debe redirigir al usuario.
     */
    static getAuthorizationUrl(channelId) {
        const redirectUri = `${process.env.FRONTEND_URL}/integrations/mercadolibre/callback`;

        const authUrl = new URL(`${this.API_BASE_URL}/authorization`);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', process.env.MERCADOLIBRE_APP_ID);
        authUrl.searchParams.append('redirect_uri', redirectUri);
        // Usamos el 'state' para pasar el ID del canal de forma segura.
        authUrl.searchParams.append('state', channelId);
        
        return authUrl.toString();
    }

    /**
     * Intercambia el código de autorización por un access_token y refresh_token.
     */
    static async exchangeCodeForTokens(code, channelId) {
        const channel = await Channel.findById(channelId);
        if (!channel) {
            throw new Error('Canal no encontrado durante el intercambio de código.');
        }

        const redirectUri = `${process.env.FRONTEND_URL}/integrations/mercadolibre/callback`;

        const { data } = await axios.post(`${this.API_BASE_URL}/oauth/token`, {
            grant_type: 'authorization_code',
            client_id: process.env.MERCADOLIBRE_APP_ID,
            client_secret: process.env.MERCADOLIBRE_SECRET_KEY,
            code: code,
            redirect_uri: redirectUri,
        });

        // Guardamos los tokens y la información del usuario en el canal
        channel.api_key = data.access_token; // El access_token se guarda aquí
        Object.assign(channel.settings, {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            user_id: data.user_id,
            updated_at: new Date(),
        });
        channel.markModified('settings'); // Muy importante para guardar objetos anidados
        await channel.save();

        return channel;
    }

  /**
   * Sincroniza los pedidos, importando únicamente los de tipo Flex.
   */
  static async syncOrders(channel, dateFrom, dateTo) {
    let ordersImported = 0;
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    const accessToken = await this.getAccessToken(channel);
    const userId = channel.settings?.user_id || 'me';

    while (hasMore) {
      const params = new URLSearchParams({
        seller: userId,
        offset,
        limit,
        sort: 'date_desc',
        'order.date_created.from': dateFrom.toISOString(),
        'order.date_created.to': dateTo.toISOString(),
      });

      const response = await axios.get(`${this.API_BASE_URL}/orders/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const orders = response.data.results;
      if (!orders || orders.length === 0) {
        hasMore = false;
        continue;
      }

      for (const mlOrder of orders) {
        try {
          const orderDetails = await axios.get(`${this.API_BASE_URL}/orders/${mlOrder.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          const fullOrder = orderDetails.data;

          // --- ✅ FILTRO PRINCIPAL PARA MERCADO LIBRE FLEX ---
          if (fullOrder.shipping?.logistics_type !== 'self_service') {
            console.log(`[ML Sync] Pedido #${fullOrder.id} ignorado (Logística: ${fullOrder.shipping?.logistics_type}).`);
            continue;
          }

          const existingOrder = await Order.findOne({ channel_id: channel._id, external_order_id: fullOrder.id.toString() });
          if (!existingOrder) {
            await this.createOrderFromApiData(fullOrder, channel, accessToken);
            ordersImported++;
          }
        } catch (orderError) {
          console.error(`[ML Sync] Error procesando pedido individual ${mlOrder.id}:`, orderError.message);
        }
      }
      offset += limit;
    }
    return ordersImported;
  }
  
  /**
   * Procesa notificaciones (webhooks) y crea pedidos si son de tipo Flex.
   */
  static async processWebhook(channelId, webhookData) {
    if (webhookData.topic !== 'orders' && webhookData.topic !== 'orders_v2') {
      console.log(`[ML Webhook] Notificación ignorada (Topic: ${webhookData.topic}).`);
      return true;
    }

    const channel = await SalesChannel.findById(channelId);
    if (!channel) throw new Error(`[ML Webhook] Canal con ID ${channelId} no encontrado.`);

    const accessToken = await this.getAccessToken(channel);
    const orderId = webhookData.resource.split('/').pop();

    const orderResponse = await axios.get(`${this.API_BASE_URL}/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const mlOrder = orderResponse.data;

    // --- ✅ FILTRO PRINCIPAL PARA MERCADO LIBRE FLEX ---
    if (mlOrder.shipping?.logistics_type !== 'self_service') {
      console.log(`[ML Webhook] Pedido #${mlOrder.id} ignorado (Logística: ${mlOrder.shipping?.logistics_type}).`);
      return true; // Es importante devolver true para que ML no reintente
    }

    const existingOrder = await Order.findOne({ channel_id: channelId, external_order_id: mlOrder.id.toString() });

    if (existingOrder) {
      existingOrder.status = this.mapOrderStatus(mlOrder);
      existingOrder.raw_data = mlOrder;
      await existingOrder.save();
      console.log(`[ML Webhook] Pedido existente #${mlOrder.id} actualizado.`);
    } else {
      await this.createOrderFromApiData(mlOrder, channel, accessToken);
      console.log(`[ML Webhook] Nuevo pedido Flex #${mlOrder.id} creado.`);
    }
    return true;
  }

  /**
   * Helper para crear la orden en la base de datos a partir de los datos de la API.
   */
  static async createOrderFromApiData(fullOrder, channel, accessToken) {
    const shippingInfo = await this.getShippingInfo(fullOrder, accessToken);

    const newOrderData = {
      company_id: channel.company_id,
      channel_id: channel._id,
      external_order_id: fullOrder.id.toString(),
      order_number: fullOrder.id.toString(),
      customer_name: `${fullOrder.buyer.first_name} ${fullOrder.buyer.last_name}`.trim(),
      customer_email: fullOrder.buyer.email,
      customer_phone: shippingInfo.phone,
      customer_document: fullOrder.buyer.billing_info?.doc_number || '',
      shipping_address: shippingInfo.address,
      shipping_commune: shippingInfo.city,
      shipping_city: shippingInfo.city,
      shipping_state: shippingInfo.state,
      shipping_zip: shippingInfo.zip_code,
      total_amount: fullOrder.total_amount,
      shipping_cost: fullOrder.shipping?.cost || 0,
      currency: fullOrder.currency_id,
      status: this.mapOrderStatus(fullOrder),
      order_date: new Date(fullOrder.date_created),
      raw_data: fullOrder,
      notes: `Comprador: ${fullOrder.buyer.nickname}`,
    };
    
    const newOrder = await new Order(newOrderData).save();
  }

  /**
   * Obtiene la información de envío detallada.
   */
  static async getShippingInfo(order, accessToken) {
    if (!order.shipping?.id) return { address: 'Sin información de envío' };
    
    try {
      const { data: shipping } = await axios.get(`${this.API_BASE_URL}/shipments/${order.shipping.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const addr = shipping.receiver_address;
      return {
        address: `${addr.street_name} ${addr.street_number}, ${addr.comment || ''}`.replace(/, $/, '').trim(),
        city: addr.city.name,
        state: addr.state.name,
        zip_code: addr.zip_code,
        phone: addr.receiver_phone,
      };
    } catch (error) {
      console.error(`[ML Service] No se pudo obtener info de envío para ${order.id}:`, error.message);
      return { address: 'Error al obtener dirección' };
    }
  }

  /**
   * Mapea los estados de Mercado Libre a los estados de tu sistema.
   */
  static mapOrderStatus(mlOrder) {
    if (mlOrder.shipping?.status) {
      const statusMap = {
        'pending': 'pending', 'handling': 'processing', 'ready_to_ship': 'processing',
        'shipped': 'shipped', 'delivered': 'delivered', 'not_delivered': 'shipped',
        'cancelled': 'cancelled',
      };
      return statusMap[mlOrder.shipping.status] || 'pending';
    }
    return mlOrder.status === 'paid' ? 'processing' : 'pending';
  }
}

module.exports = MercadoLibreService;