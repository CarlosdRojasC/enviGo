const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');

class MercadoLibreService {
  static API_BASE_URL = 'https://api.mercadolibre.com';
  // ✅ NUEVO: URL base para autorización OAuth
  static AUTH_BASE_URL = 'https://auth.mercadolibre.com.ar'; // Cambiar según país si es necesario

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
        channel.markModified('settings');
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
   * ✅ CORREGIDO: Genera la URL de autorización con el dominio correcto
   */
static getAuthorizationUrl(channelId) {
  // ✅ DEBE apuntar al BACKEND (mismo que configuraste en MercadoLibre)
  const redirectUri = `${process.env.BACKEND_URL}/api/webhooks/mercadolibre/callback`;
  
  const authUrl = new URL(`${this.AUTH_BASE_URL}/authorization`);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.MERCADOLIBRE_APP_ID);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', channelId);
  
  console.log(`🔐 [ML Service] URL de autorización generada: ${authUrl.toString()}`);
  return authUrl.toString();
}

  /**
   * ✅ MEJORADO: Detecta el país automáticamente para usar el dominio correcto
   */
  static getAuthUrlForCountry(storeUrl, channelId) {
    const redirectUri = `${process.env.BACKEND_URL}/api/webhooks/mercadolibre/callback`;
    
    // Mapeo de dominios de tienda a dominios de auth
    const authDomains = {
      'mercadolibre.com.ar': 'https://auth.mercadolibre.com.ar',
      'mercadolibre.com.mx': 'https://auth.mercadolibre.com.mx', 
      'mercadolibre.cl': 'https://auth.mercadolibre.cl',
      'mercadolibre.com.co': 'https://auth.mercadolibre.com.co',
      'mercadolibre.com.pe': 'https://auth.mercadolibre.com.pe',
      'mercadolibre.com.uy': 'https://auth.mercadolibre.com.uy',
      'mercadolibre.com.ve': 'https://auth.mercadolibre.com.ve',
      'mercadolivre.com.br': 'https://auth.mercadolivre.com.br'
    };
    
    // Detectar el dominio correcto basado en la store_url
    let authDomain = 'https://auth.mercadolibre.com.ar'; // Default Argentina
    
    for (const [storeDomain, authUrl] of Object.entries(authDomains)) {
      if (storeUrl.includes(storeDomain)) {
        authDomain = authUrl;
        break;
      }
    }
    
    const authUrl = new URL(`${authDomain}/authorization`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.MERCADOLIBRE_APP_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', channelId);
    
    console.log(`🔐 [ML Service] URL de autorización (${authDomain}): ${authUrl.toString()}`);
    
    return authUrl.toString();
  }

  /**
   * Intercambia el código de autorización por un access_token y refresh_token.
   */
static async exchangeCodeForTokens(code, channelId) {
  console.log('🔄 [ML Exchange] INICIANDO intercambio de tokens...');
  
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error('Canal no encontrado durante el intercambio de código.');
  }

  console.log('✅ [ML Exchange] Canal encontrado:', channel.channel_name);
  console.log('🔍 [ML Exchange] Settings actuales:', channel.settings);

  const redirectUri = `${process.env.BACKEND_URL}/api/webhooks/mercadolibre/callback`;
  
  console.log('📤 [ML Exchange] Preparando petición a ML:', {
    redirectUri,
    codeLength: code.length,
    appId: process.env.MERCADOLIBRE_APP_ID,
    hasSecret: !!process.env.MERCADOLIBRE_SECRET_KEY
  });

  try {
    console.log('🌐 [ML Exchange] Enviando petición a MercadoLibre...');
    
    const response = await axios.post(`${this.API_BASE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: process.env.MERCADOLIBRE_APP_ID,
      client_secret: process.env.MERCADOLIBRE_SECRET_KEY,
      code: code,
      redirect_uri: redirectUri,
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('✅ [ML Exchange] Respuesta exitosa de MercadoLibre');
    console.log('📦 [ML Exchange] Response status:', response.status);
    console.log('📦 [ML Exchange] Response data:', response.data);

    const data = response.data;
    
    if (!data) {
      throw new Error('No se recibieron datos de MercadoLibre');
    }

    console.log('📦 [ML Exchange] Datos procesados:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      userId: data.user_id,
      expiresIn: data.expires_in
    });

    // ✅ INICIALIZAR settings si está undefined o null
    if (!channel.settings || channel.settings === null) {
      channel.settings = {};
      console.log('🔧 [ML Exchange] Inicializando settings vacío');
    }

    // Guardar tokens
    channel.api_key = data.access_token;
    
    // ✅ USAR SPREAD OPERATOR EN LUGAR DE Object.assign
    channel.settings = {
      ...channel.settings,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      user_id: data.user_id,
      updated_at: new Date(),
      oauth_configured: true
    };
    
    channel.sync_status = 'success';
    channel.markModified('settings');
    await channel.save();

    console.log(`✅ [ML Exchange] Canal ${channel.channel_name} configurado exitosamente`);
    return channel;
    
  } catch (error) {
    console.error('❌ [ML Exchange] ERROR DETALLADO:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      timeout: error.code === 'ECONNABORTED',
      axiosError: !!error.response,
      requestConfig: error.config ? {
        url: error.config.url,
        method: error.config.method,
        timeout: error.config.timeout
      } : null
    });
    
    throw new Error(`Error OAuth: ${error.response?.data?.message || error.message}`);
  }
}

  /**
   * ✅ NUEVO: Método actualizado que usa el país detectado
   */
  static getAuthorizationUrlWithCountry(channelId, storeUrl) {
    if (storeUrl) {
      return this.getAuthUrlForCountry(storeUrl, channelId);
    } else {
      return this.getAuthorizationUrl(channelId); // Fallback al método original
    }
  }
  /**
   * Sincroniza los pedidos, importando únicamente los de tipo Flex.
   */
static async syncOrders(channelId, options = {}) {
  console.log('🔄 Iniciando sincronización para canal:', channelId);
  
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error('Canal no encontrado');
  }

  console.log(`🔄 Iniciando sincronización para canal ${channel.channel_name}`);

  // ✅ ARREGLAR LA CREACIÓN DE FECHAS
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Usar las fechas de options si están disponibles, sino usar defaults
  let dateFrom, dateTo;
  
  if (options.dateFrom) {
    // Si viene como string, convertir a Date
    dateFrom = typeof options.dateFrom === 'string' ? new Date(options.dateFrom) : options.dateFrom;
  } else {
    dateFrom = thirtyDaysAgo;
  }
  
  if (options.dateTo) {
    // Si viene como string, convertir a Date
    dateTo = typeof options.dateTo === 'string' ? new Date(options.dateTo) : options.dateTo;
  } else {
    dateTo = now;
  }

  // ✅ VERIFICAR QUE SON DATES VÁLIDOS
  if (!(dateFrom instanceof Date) || isNaN(dateFrom.getTime())) {
    console.error('❌ dateFrom no es una fecha válida:', dateFrom);
    dateFrom = thirtyDaysAgo;
  }
  
  if (!(dateTo instanceof Date) || isNaN(dateTo.getTime())) {
    console.error('❌ dateTo no es una fecha válida:', dateTo);
    dateTo = now;
  }

  console.log('📅 [ML Sync] Rango de fechas:', {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString()
  });

  try {
    // Obtener access token
    const accessToken = await this.getValidAccessToken(channel);
    
    // Construir URL de la API de pedidos
    const apiUrl = `${this.API_BASE_URL}/orders/search`;
    const params = {
  seller: channel.settings.user_id,
  'order.date_created.from': dateFrom.toISOString(), // ✅ CON COMILLAS
  'order.date_created.to': dateTo.toISOString(),     // ✅ CON COMILLAS
  sort: 'date_desc',
  limit: 50
};

    console.log('🌐 [ML Sync] Consultando pedidos con params:', params);

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      params: params,
      timeout: 30000
    });

    console.log('✅ [ML Sync] Respuesta de ML:', {
      total: response.data.paging?.total || 0,
      results: response.data.results?.length || 0
    });

    // Procesar pedidos
    const orders = response.data.results || [];
    let syncedCount = 0;
    let errorCount = 0;

    for (const mlOrder of orders) {
      try {
        await this.processOrder(mlOrder, channel);
        syncedCount++;
      } catch (error) {
        console.error(`❌ [ML Sync] Error procesando pedido ${mlOrder.id}:`, error.message);
        errorCount++;
      }
    }

    // Actualizar última sincronización
    channel.last_sync_at = new Date();
    channel.sync_status = 'success';
    await channel.save();

    console.log(`✅ [ML Sync] Sincronización completada: ${syncedCount} pedidos sincronizados, ${errorCount} errores`);

    return {
      success: true,
      syncedCount,
      errorCount,
      totalFound: orders.length
    };

  } catch (error) {
    console.error('❌ [ML Sync] Error en sincronización:', error.message);
    
    // Actualizar estado de error
    channel.sync_status = 'error';
    channel.last_sync_at = new Date();
    await channel.save();
    
    throw error;
  }
}

static async processOrder(mlOrder, channel) {
  console.log(`📦 [ML Process] Procesando pedido ${mlOrder.id}`);
  
  // Verificar si el pedido ya existe
  const existingOrder = await Order.findOne({
    external_order_id: mlOrder.id.toString(),
    channel_id: channel._id
  });

  if (existingOrder) {
    console.log(`⏭️ [ML Process] Pedido ${mlOrder.id} ya existe, actualizando...`);
    // Actualizar estado si es necesario
    return existingOrder;
  }

  // Crear nuevo pedido
  const orderData = {
    company_id: channel.company_id,
    channel_id: channel._id,
    external_order_id: mlOrder.id.toString(),
    order_number: `ML-${mlOrder.id}`,
    customer_name: mlOrder.buyer?.nickname || 'Cliente ML',
    customer_email: mlOrder.buyer?.email || '',
    customer_phone: mlOrder.buyer?.phone || '',
    total_amount: mlOrder.total_amount || 0,
    shipping_cost: mlOrder.shipping?.cost || 0,
    status: this.mapMercadoLibreStatus(mlOrder.status),
    order_date: new Date(mlOrder.date_created),
    shipping_address: this.extractShippingAddress(mlOrder),
    items: mlOrder.order_items?.map(item => ({
      name: item.item?.title || 'Producto ML',
      quantity: item.quantity || 1,
      price: item.unit_price || 0
    })) || []
  };

  const newOrder = new Order(orderData);
  await newOrder.save();

  console.log(`✅ [ML Process] Pedido ${mlOrder.id} creado exitosamente`);
  return newOrder;
}
  
  /**
   * Procesa notificaciones (webhooks) y crea pedidos si son de tipo Flex.
   */
  static async processWebhook(channelId, webhookData) {
    if (webhookData.topic !== 'orders' && webhookData.topic !== 'orders_v2') {
      console.log(`[ML Webhook] Notificación ignorada (Topic: ${webhookData.topic}).`);
      return true;
    }

    const channel = await Channel.findById(channelId);
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