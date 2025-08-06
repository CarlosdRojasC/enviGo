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
const accessToken = await this.getAccessToken(channel);
    
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
        const result = await MercadoLibreService.processOrder(mlOrder, channel);
        if (result !== null) {
          syncedCount++;
        } else {
          console.log(`⏭️ [ML Sync] Pedido ${mlOrder.id} omitido (no es Flex)`);
          // No contar como error, solo como omitido
        }
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
static async getValidAccessToken(channel) {
  console.log('🔑 [ML Auth] Verificando access token...');
  
  if (!channel.settings?.access_token) {
    throw new Error('Canal no tiene access token configurado. Requiere reautorización.');
  }

  // ✅ USAR LA LÓGICA DE RENOVACIÓN QUE YA TIENES EN getAccessToken
  try {
    return await this.getAccessToken(channel);
  } catch (error) {
    console.error('❌ [ML Auth] Error obteniendo token válido:', error.message);
    throw new Error('Token de MercadoLibre expirado. Reautoriza el canal desde la página de canales.');
  }
}


static async processOrder(mlOrder, channel) {
  console.log(`📦 [ML Process] Procesando pedido ${mlOrder.id}`);
   // 🔍 DEBUG COMPLETO: Mostrar información clave para entender por qué no es detectado como Flex
  console.log(`🔍 [ML Debug] Datos de pedido ${mlOrder.id}:`, {
    logistic_type: mlOrder.shipping?.logistic_type,
    logistics_type: mlOrder.shipping?.logistics_type,
    shipping_mode: mlOrder.shipping?.mode,
    tags: mlOrder.tags,
    shipping_status: mlOrder.shipping?.status,
  });
  // ✅ FILTRO: Solo procesar pedidos Flex
  if (!MercadoLibreService.isFlexOrder(mlOrder)) {
    console.log(`⏭️ [ML Process] Pedido ${mlOrder.id} no es Flex, omitiendo...`);
    return null; // Retornar null para que no se cuente como error
  }
  
  console.log(`✅ [ML Process] Pedido ${mlOrder.id} es Flex, procesando...`);
  
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
    // ✅ CORRECCIÓN: Usar el método que SÍ existe
    status: MercadoLibreService.mapOrderStatus(mlOrder),
    order_date: new Date(mlOrder.date_created),
    // ✅ CORRECCIÓN: Extraer dirección directamente en lugar de usar método inexistente
    shipping_address: MercadoLibreService.extractShippingAddressSimple(mlOrder),
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

// ✅ AGREGAR este nuevo método estático simple:
static extractShippingAddressSimple(mlOrder) {
  if (!mlOrder.shipping) {
    return 'Sin información de envío';
  }
  
  // Si hay información de dirección en el shipping
  if (mlOrder.shipping.receiver_address) {
    const addr = mlOrder.shipping.receiver_address;
    let address = '';
    
    if (addr.street_name) address += addr.street_name;
    if (addr.street_number) address += ` ${addr.street_number}`;
    if (addr.comment) address += `, ${addr.comment}`;
    
    return address.trim() || 'Dirección no especificada';
  }
  
  return 'Información de envío no disponible';
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
    if (!MercadoLibreService.isFlexOrder(mlOrder)) {
      console.log(`[ML Webhook] Pedido #${mlOrder.id} ignorado (no es Flex).`);
      return true;
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
 * Verifica si un pedido es de tipo Flex
 * @param {Object} mlOrder - Pedido de MercadoLibre
 * @returns {boolean} - true si es Flex, false si no
 */
static isFlexOrder(mlOrder) {
  // Un pedido es Flex si:
  // 1. Tiene shipping y el shipping tiene logistic_type "flex" o "self_service"
  // 2. O tiene tags que incluyen "flex"
  // 3. O el shipping mode es "me2" (MercadoEnvios 2.0 que incluye Flex)
  
  if (mlOrder.shipping) {
    // Verificar logistic_type (puede ser "flex" o "self_service")
    if (mlOrder.shipping.logistic_type === 'flex' || 
        mlOrder.shipping.logistic_type === 'self_service' ||
        mlOrder.shipping.logistics_type === 'self_service') {
      return true;
    }
    
    // Verificar mode me2
    if (mlOrder.shipping.mode === 'me2') {
      return true;
    }
  }
  
  // Verificar tags
  if (mlOrder.tags && Array.isArray(mlOrder.tags)) {
    return mlOrder.tags.some(tag => 
      tag.toLowerCase().includes('flex') || 
      tag.toLowerCase().includes('me2') ||
      tag.toLowerCase().includes('self_service')
    );
  }
  
  return false;
}
  /**
   * Mapea los estados de Mercado Libre a los estados de tu sistema.
   */
static mapOrderStatus(mlOrder) {
  console.log(`🔍 [ML Status] Procesando order: ${mlOrder.id}, status: ${mlOrder.status}, shipping: ${JSON.stringify(mlOrder.shipping?.status)}`);
  
  // PRIORIDAD 1: Estados de shipping (para envíos Flex)
  if (mlOrder.shipping?.status) {
    const statusMap = {
      // Estados principales de MercadoLibre Flex según documentación
      'pending': 'pending',                   // Pendiente
      'handling': 'ready_for_pickup',         // Preparando - listo para recoger
      'ready_to_ship': 'ready_for_pickup',   // Listo para enviar
      'shipped': 'shipped',                   // Enviado (substatus puede ser null)
      'out_for_delivery': 'out_for_delivery', // En camino para entrega (substatus del shipped)
      'delivered': 'delivered',               // Entregado
      'not_delivered': 'cancelled',           // No entregado - cancelar
      'cancelled': 'cancelled',               // Cancelado
    };
    
    const mappedStatus = statusMap[mlOrder.shipping.status];
    if (mappedStatus) {
      console.log(`📦 [ML Status] Shipping status ${mlOrder.shipping.status} -> ${mappedStatus}`);
      return mappedStatus;
    }
  }
  
  // PRIORIDAD 2: Estados generales del pedido
  if (mlOrder.status) {
    const generalStatusMap = {
      'confirmed': 'ready_for_pickup',        // Confirmado - listo para procesar
      'payment_required': 'pending',          // Requiere pago
      'payment_in_process': 'pending',        // Pago en proceso
      'paid': 'ready_for_pickup',             // Pagado - listo para procesar
      'cancelled': 'cancelled',               // Cancelado
      'invalid': 'cancelled',                 // Inválido - cancelar
    };
    
    const mappedStatus = generalStatusMap[mlOrder.status];
    if (mappedStatus) {
      console.log(`📦 [ML Status] General status ${mlOrder.status} -> ${mappedStatus}`);
      return mappedStatus;
    }
  }
  
  // Fallback por defecto
  console.log(`⚠️ [ML Status] No se pudo mapear el status, usando 'pending' por defecto. Status: ${mlOrder.status}, Shipping: ${mlOrder.shipping?.status}`);
  return 'pending';
}
}

module.exports = MercadoLibreService;