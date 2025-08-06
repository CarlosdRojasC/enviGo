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

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  let dateFrom = options.dateFrom ? 
    (typeof options.dateFrom === 'string' ? new Date(options.dateFrom) : options.dateFrom) : 
    thirtyDaysAgo;
  
  let dateTo = options.dateTo ? 
    (typeof options.dateTo === 'string' ? new Date(options.dateTo) : options.dateTo) : 
    now;

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
    const accessToken = await this.getAccessToken(channel);
    
    // 1. OBTENER LISTA DE PEDIDOS
    const apiUrl = `${this.API_BASE_URL}/orders/search`;
    const params = {
      seller: channel.settings.user_id,
      'order.date_created.from': dateFrom.toISOString(),
      'order.date_created.to': dateTo.toISOString(),
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

    // 2. PROCESAR CADA PEDIDO CON CONSULTA DE SHIPMENT
    const orderIds = response.data.results || [];
    let syncedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const basicOrder of orderIds) {
      try {
        console.log(`📦 [ML Sync] Obteniendo datos completos del pedido ${basicOrder.id}...`);
        
        // ✅ OBTENER DATOS COMPLETOS DEL PEDIDO
        const fullOrderResponse = await axios.get(`${this.API_BASE_URL}/orders/${basicOrder.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 15000
        });

        const fullOrder = fullOrderResponse.data;

        // ✅ VERIFICAR SI ES FLEX (AHORA CON CONSULTA DE SHIPMENT)
        const isFlex = await this.isFlexOrder(fullOrder, accessToken);
        
        if (!isFlex) {
          console.log(`⏭️ [ML Sync] Pedido ${fullOrder.id} omitido (no es Flex)`);
          skippedCount++;
          continue;
        }

        console.log(`✅ [ML Sync] Procesando pedido Flex ${fullOrder.id}`);

        const existingOrder = await Order.findOne({
          external_order_id: fullOrder.id.toString(),
          channel_id: channel._id
        });

        if (existingOrder) {
          // Actualizar pedido existente
          existingOrder.status = this.mapOrderStatus(fullOrder);
          existingOrder.raw_data = fullOrder;
          await existingOrder.save();
          console.log(`🔄 [ML Sync] Pedido ${fullOrder.id} actualizado`);
        } else {
          // Crear nuevo pedido
          await this.createOrderFromApiData(fullOrder, channel, accessToken);
          console.log(`➕ [ML Sync] Pedido ${fullOrder.id} creado`);
        }
        
        syncedCount++;
        
        // ✅ PAUSA PARA NO SATURAR LA API (2 requests por pedido ahora)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ [ML Sync] Error procesando pedido ${basicOrder.id}:`, error.message);
        errorCount++;
      }
    }

    // Actualizar última sincronización
    channel.last_sync_at = new Date();
    channel.sync_status = 'success';
    await channel.save();

    console.log(`✅ [ML Sync] Sincronización completada:`);
    console.log(`   - ${syncedCount} pedidos Flex sincronizados`);
    console.log(`   - ${skippedCount} pedidos omitidos (no Flex)`);
    console.log(`   - ${errorCount} errores`);
    console.log(`   - ${orderIds.length} pedidos totales evaluados`);

    return {
      success: true,
      syncedCount,
      errorCount,
      skippedCount,
      totalFound: orderIds.length
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

// ✅ TAMBIÉN MEJORAR LA FUNCIÓN isFlexOrder PARA MOSTRAR MÁS INFORMACIÓN
static async isFlexOrder(mlOrder, accessToken) {
  console.log(`🔍 [ML Debug] Analizando pedido ${mlOrder.id} para Flex:`);
  
  // ✅ MÉTODO 1: Verificar por tags del pedido (más rápido)
  if (mlOrder.tags && Array.isArray(mlOrder.tags)) {
    const flexTags = ['self_service', 'flex', 'self_service_in'];
    const hasFlexTag = mlOrder.tags.some(tag => 
      flexTags.includes(tag.toLowerCase())
    );
    
    if (hasFlexTag) {
      console.log(`✅ [ML Debug] Pedido ${mlOrder.id} es Flex (tags)`, mlOrder.tags);
      return true;
    }
  }

  // ✅ MÉTODO 2: Consultar el shipment (AHORA CON LOS CAMPOS CORRECTOS)
  if (mlOrder.shipping?.id) {
    try {
      const shipmentResponse = await axios.get(`${this.API_BASE_URL}/shipments/${mlOrder.shipping.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        timeout: 15000
      });

      const shipment = shipmentResponse.data;
      
      console.log(`🚛 [ML Debug] Shipment ${mlOrder.shipping.id} datos:`, {
        mode: shipment.mode,
        logistic_type: shipment.logistic_type,
        service_id: shipment.service_id,
        sender_types: shipment.sender_address?.types
      });

      // ✅ MÉTODO 2A: Verificar logistic_type = "self_service" (EL MÁS CONFIABLE)
      if (shipment.logistic_type === 'self_service') {
        console.log(`✅ [ML Debug] Pedido ${mlOrder.id} es Flex (logistic_type = self_service)`);
        return true;
      }

      // ✅ MÉTODO 2B: Verificar sender_address.types contiene "self_service_partner"
      if (shipment.sender_address?.types && Array.isArray(shipment.sender_address.types)) {
        const hasFlexType = shipment.sender_address.types.some(type => 
          type.includes('self_service_partner') || type.includes('self_service')
        );
        
        if (hasFlexType) {
          console.log(`✅ [ML Debug] Pedido ${mlOrder.id} es Flex (sender_address.types)`, shipment.sender_address.types);
          return true;
        }
      }

      // ✅ MÉTODO 2C: Verificar service_id específico de Flex (3826008 en tus casos)
      if (shipment.service_id === 3826008) {
        console.log(`✅ [ML Debug] Pedido ${mlOrder.id} es Flex (service_id = 3826008)`);
        return true;
      }

    } catch (error) {
      console.error(`❌ [ML Debug] Error consultando shipment ${mlOrder.shipping.id}:`, error.message);
      // Si hay error consultando shipment, continuar sin fallar
    }
  }

  console.log(`❌ [ML Debug] Pedido ${mlOrder.id} NO es Flex`);
  return false;
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
static async getShipmentDetails(shippingId, accessToken) {
  if (!shippingId) {
    console.log('❌ [ML Shipment] No hay shipping ID');
    return null;
  }

  try {
    console.log(`🚛 [ML Shipment] Consultando shipment ${shippingId}...`);
    
    const response = await axios.get(`${this.API_BASE_URL}/shipments/${shippingId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      timeout: 15000
    });

    const shipment = response.data;
    console.log(`✅ [ML Shipment] Datos del shipment ${shippingId}:`, {
      mode: shipment.mode,
      logistic_type: shipment.logistic_type,
      service_id: shipment.service_id,
      status: shipment.status,
      substatus: shipment.substatus,
      sender_types: shipment.sender_address?.types
    });

    return shipment;
  } catch (error) {
    console.error(`❌ [ML Shipment] Error obteniendo shipment ${shippingId}:`, error.response?.status, error.message);
    return null;
  }
}


static async processOrder(mlOrder, channel, accessToken = null) {
  console.log(`📦 [ML Process] Procesando pedido ${mlOrder.id}`);
  
  // Obtener accessToken si no se proporcionó
  if (!accessToken) {
    accessToken = await this.getValidAccessToken(channel);
  }
  
  // ✅ FILTRO: Solo procesar pedidos Flex
  const isFlex = await this.isFlexOrder(mlOrder, accessToken);
  if (!isFlex) {
    console.log(`⏭️ [ML Process] Pedido ${mlOrder.id} no es Flex, omitiendo...`);
    return null; // Retornar null para indicar que se omitió
  }

  console.log(`✅ [ML Process] Pedido ${mlOrder.id} ES FLEX, continuando procesamiento...`);
  
  // Verificar si el pedido ya existe
  const existingOrder = await Order.findOne({
    external_order_id: mlOrder.id.toString(),
    channel_id: channel._id
  });

  if (existingOrder) {
    console.log(`⏭️ [ML Process] Pedido ${mlOrder.id} ya existe, actualizando...`);
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
    status: this.mapOrderStatus(mlOrder),
    order_date: new Date(mlOrder.date_created),
    shipping_address: await this.extractShippingAddressSimple(mlOrder),
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
  static async extractShippingAddressSimple(mlOrder) {
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

  console.log(`📦 [ML Webhook] Procesando pedido ${mlOrder.id}`);

  // ✅ USAR LA NUEVA FUNCIÓN DE DETECCIÓN CON SHIPMENT
  const isFlex = await this.isFlexOrder(mlOrder, accessToken);
  
  if (!isFlex) {
    console.log(`⏭️ [ML Webhook] Pedido ${mlOrder.id} no es Flex, omitiendo...`);
    return true;
  }

  console.log(`✅ [ML Webhook] Pedido ${mlOrder.id} ES FLEX, procesando...`);

  const existingOrder = await Order.findOne({ 
    channel_id: channelId, 
    external_order_id: mlOrder.id.toString() 
  });

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
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'x-format-new': 'true'  // ← HEADER IMPORTANTE
      },
    });
    
    console.log('🔍 [ML Debug] Datos de shipment completos para teléfono:', {
      receiver_phone: shipping.receiver_phone,
      destination_phone: shipping.destination?.receiver_phone,
      destination_name: shipping.destination?.receiver_name
    });
    
    // ✅ USAR LA ESTRUCTURA CORRECTA: destination.shipping_address
    const addr = shipping.destination?.shipping_address || shipping.receiver_address;
    
    if (!addr) {
      return { address: 'Sin información de dirección' };
    }
    
    return {
      address: `${addr.street_name} ${addr.street_number}, ${addr.comment || ''}`.replace(/, $/, '').trim(),
      city: addr.city?.name || '',
      state: addr.state?.name || '',
      zip_code: addr.zip_code || '',
      phone: shipping.destination?.receiver_phone || shipping.receiver_phone || '', // ← CAMPO CORRECTO
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
      'handling': 'pending',         // Preparando - listo para recoger
      'ready_to_ship': 'pending',   // Listo para enviar
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
      'confirmed': 'pending',        // Confirmado - listo para procesar
      'payment_required': 'pending',          // Requiere pago
      'payment_in_process': 'pending',        // Pago en proceso
      'paid': 'pending',             // Pagado - listo para procesar
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

static async debugSingleShipmentForPostman(channelId, shipmentId) {
  const logs = []; // Array para capturar logs
  
  // Función helper para capturar logs
  const logCapture = (message) => {
    logs.push(message);
    console.log(message); // También mostrar en consola
  };
  
  logCapture(`🔍 [ML Debug] === ANALIZANDO SHIPMENT ESPECÍFICO ${shipmentId} ===`);
  
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Canal no encontrado');
    }

    const accessToken = await this.getAccessToken(channel);
    
    // HACER PETICIÓN SIN x-format-new PRIMERO
    logCapture(`📡 [ML Debug] Consultando shipment SIN x-format-new...`);
    const responseOld = await axios.get(`${this.API_BASE_URL}/shipments/${shipmentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      timeout: 15000
    });

    // HACER PETICIÓN CON x-format-new
    logCapture(`📡 [ML Debug] Consultando shipment CON x-format-new...`);
    const responseNew = await axios.get(`${this.API_BASE_URL}/shipments/${shipmentId}`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'x-format-new': 'true'
      },
      timeout: 15000
    });

    const shipmentOld = responseOld.data;
    const shipmentNew = responseNew.data;
    
    // ANÁLISIS COMPARATIVO
    const analysis = {
      shipment_id: shipmentId,
      
      // DATOS BÁSICOS
      basic_info: {
        id: shipmentNew.id,
        status: shipmentNew.status,
        substatus: shipmentNew.substatus,
        date_created: shipmentNew.date_created,
        last_updated: shipmentNew.last_updated,
        tracking_number: shipmentNew.tracking_number
      },
      
      // LOGÍSTICA (PARA DETECTAR FLEX)
      logistics_info: {
        mode: shipmentNew.mode,
        logistic_type: shipmentNew.logistic_type,
        service_id: shipmentNew.service_id,
        logistic_object: shipmentNew.logistic,
        sender_address_types: shipmentNew.sender_address?.types || shipmentNew.origin?.shipping_address?.types,
      },
      
      // INFORMACIÓN DE TELÉFONO (MÚLTIPLES FUENTES)
      phone_info: {
        receiver_phone_old: shipmentOld.receiver_phone,
        receiver_phone_new: shipmentNew.receiver_phone,
        destination_phone: shipmentNew.destination?.receiver_phone,
        origin_phone: shipmentNew.origin?.shipping_address?.phone,
        receiver_address_phone: shipmentNew.receiver_address?.receiver_phone
      },
      
      // DIRECCIONES (COMPARAR ESTRUCTURAS)
      address_info: {
        old_structure: {
          has_receiver_address: !!shipmentOld.receiver_address,
          receiver_address: shipmentOld.receiver_address
        },
        new_structure: {
          has_destination: !!shipmentNew.destination,
          destination_address: shipmentNew.destination?.shipping_address,
          destination_receiver: {
            name: shipmentNew.destination?.receiver_name,
            phone: shipmentNew.destination?.receiver_phone
          }
        }
      },
      
      // ANÁLISIS DE FLEX
      flex_analysis: {
        is_flex_by_logistic_type: shipmentNew.logistic_type === 'self_service',
        is_flex_by_sender_types: shipmentNew.sender_address?.types?.some(type => 
          type.includes('self_service')) || false,
        is_flex_by_service_id: shipmentNew.service_id === 3826008,
        is_me2: shipmentNew.mode === 'me2',
        flex_indicators: []
      },
      
      // DATOS COMPLETOS (PARA INSPECCIÓN)
      raw_data: {
        without_x_format_new: shipmentOld,
        with_x_format_new: shipmentNew
      }
    };
    
    // COMPLETAR ANÁLISIS DE FLEX
    if (analysis.flex_analysis.is_flex_by_logistic_type) {
      analysis.flex_analysis.flex_indicators.push('LOGISTIC_TYPE_SELF_SERVICE');
    }
    if (analysis.flex_analysis.is_flex_by_sender_types) {
      analysis.flex_analysis.flex_indicators.push('SENDER_ADDRESS_TYPES');
    }
    if (analysis.flex_analysis.is_flex_by_service_id) {
      analysis.flex_analysis.flex_indicators.push('SERVICE_ID_3826008');
    }
    
    analysis.flex_analysis.is_flex = analysis.flex_analysis.flex_indicators.length > 0;
    
    // LOGS DETALLADOS
    logCapture(`📦 [ML Debug] INFORMACIÓN BÁSICA:`);
    logCapture(`   - ID: ${analysis.basic_info.id}`);
    logCapture(`   - Status: ${analysis.basic_info.status} / ${analysis.basic_info.substatus}`);
    logCapture(`   - Tracking: ${analysis.basic_info.tracking_number || 'N/A'}`);
    
    logCapture(`🚛 [ML Debug] LOGÍSTICA:`);
    logCapture(`   - Mode: ${analysis.logistics_info.mode}`);
    logCapture(`   - Logistic Type: ${analysis.logistics_info.logistic_type}`);
    logCapture(`   - Service ID: ${analysis.logistics_info.service_id}`);
    logCapture(`   - Sender Types: ${JSON.stringify(analysis.logistics_info.sender_address_types)}`);
    
    logCapture(`📞 [ML Debug] TELÉFONOS:`);
    logCapture(`   - Receiver Phone (old): ${analysis.phone_info.receiver_phone_old || 'N/A'}`);
    logCapture(`   - Receiver Phone (new): ${analysis.phone_info.receiver_phone_new || 'N/A'}`);
    logCapture(`   - Destination Phone: ${analysis.phone_info.destination_phone || 'N/A'}`);
    logCapture(`   - Origin Phone: ${analysis.phone_info.origin_phone || 'N/A'}`);
    
    logCapture(`🎯 [ML Debug] ANÁLISIS FLEX:`);
    logCapture(`   - Es Flex: ${analysis.flex_analysis.is_flex ? '✅ SÍ' : '❌ NO'}`);
    logCapture(`   - Indicadores: ${analysis.flex_analysis.flex_indicators.join(', ') || 'Ninguno'}`);
    logCapture(`   - Logistic Type = self_service: ${analysis.flex_analysis.is_flex_by_logistic_type}`);
    logCapture(`   - Sender Types contiene self_service: ${analysis.flex_analysis.is_flex_by_sender_types}`);
    logCapture(`   - Service ID = 3826008: ${analysis.flex_analysis.is_flex_by_service_id}`);
    
    logCapture(`✅ [ML Debug] ANÁLISIS COMPLETADO`);
    
    return {
      success: true,
      shipment_id: shipmentId,
      analysis: analysis,
      logs: logs,
      summary: {
        is_flex: analysis.flex_analysis.is_flex,
        flex_indicators: analysis.flex_analysis.flex_indicators,
        has_phone: !!(analysis.phone_info.destination_phone || analysis.phone_info.receiver_phone_new),
        phone_found: analysis.phone_info.destination_phone || analysis.phone_info.receiver_phone_new || 'No encontrado',
        logistic_type: analysis.logistics_info.logistic_type,
        service_id: analysis.logistics_info.service_id
      }
    };
    
  } catch (error) {
    logCapture(`❌ [ML Debug] Error analizando shipment ${shipmentId}: ${error.message}`);
    
    return {
      success: false,
      shipment_id: shipmentId,
      error: error.message,
      logs: logs
    };
  }
}
}

module.exports = MercadoLibreService;