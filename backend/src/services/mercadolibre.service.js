const axios = require('axios');
const Order = require('../models/Order');
const Channel = require('../models/Channel');

class MercadoLibreService {
  static API_BASE_URL = 'https://api.mercadolibre.com';
  static AUTH_BASE_URL = 'https://auth.mercadolibre.com.ar';

  /**
   * Obtiene y renueva el token de acceso si es necesario.
   */
  static async getAccessToken(channel) {
    const now = new Date().getTime();
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

  static getAuthorizationUrl(channelId) {
    const redirectUri = `${process.env.BACKEND_URL}/api/webhooks/mercadolibre/callback`;
    
    const authUrl = new URL(`${this.AUTH_BASE_URL}/authorization`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.MERCADOLIBRE_APP_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', channelId);
    
    console.log(`🔐 [ML Service] URL de autorización generada: ${authUrl.toString()}`);
    return authUrl.toString();
  }

  static getAuthUrlForCountry(storeUrl, channelId) {
    const redirectUri = `${process.env.BACKEND_URL}/api/webhooks/mercadolibre/callback`;
    
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
    
    let authDomain = 'https://auth.mercadolibre.com.ar';
    
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

  static async exchangeCodeForTokens(code, channelId) {
    console.log('🔄 [ML Exchange] INICIANDO intercambio de tokens...');
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Canal no encontrado durante el intercambio de código.');
    }

    console.log('✅ [ML Exchange] Canal encontrado:', channel.channel_name);
    
    const redirectUri = `${process.env.BACKEND_URL}/api/webhooks/mercadolibre/callback`;
    
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
      
      const data = response.data;
      
      if (!data) {
        throw new Error('No se recibieron datos de MercadoLibre');
      }

      if (!channel.settings || channel.settings === null) {
        channel.settings = {};
      }

      channel.api_key = data.access_token;
      
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
        data: error.response?.data
      });
      
      throw new Error(`Error OAuth: ${error.response?.data?.message || error.message}`);
    }
  }

  static getAuthorizationUrlWithCountry(channelId, storeUrl) {
    if (storeUrl) {
      return this.getAuthUrlForCountry(storeUrl, channelId);
    } else {
      return this.getAuthorizationUrl(channelId);
    }
  }

  /**
   * ✅ SINCRONIZACIÓN INICIAL ÚNICAMENTE (solo para configuración inicial)
   * Solo trae pedidos NO ENTREGADOS de los últimos 7 días
   */
static async syncInitialOrders(channelId) {
  console.log('🔄 [ML Initial Sync] Iniciando sincronización inicial para canal:', channelId);
  
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error('Canal no encontrado');
  }

  console.log(`🔄 [ML Initial Sync] Canal: ${channel.channel_name}`);

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  console.log('📅 [ML Initial Sync] Rango de fechas:', {
    dateFrom: sevenDaysAgo.toISOString(),
    dateTo: now.toISOString()
  });

  try {
    const accessToken = await this.getAccessToken(channel);

    const apiUrl = `${this.API_BASE_URL}/orders/search`;
    const params = {
      seller: channel.settings.user_id,
      'order.date_created.from': sevenDaysAgo.toISOString(),
      'order.date_created.to': now.toISOString(),
      sort: 'date_desc',
      limit: 50
    };

    console.log('🌐 [ML Initial Sync] Consultando pedidos con params:', params);

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      params,
      timeout: 30000
    });

    const orders = response.data.results || [];
    console.log(`📦 [ML Initial Sync] ${orders.length} pedidos encontrados.`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const basicOrder of orders) {
      try {
        console.log(`\n🔍 [ML Initial Sync] ===> Analizando pedido ${basicOrder.id}`);

        const { data: fullOrder } = await axios.get(
          `${this.API_BASE_URL}/orders/${basicOrder.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 }
        );

        const shippingId = fullOrder.shipping?.id?.toString();
        const orderId = fullOrder.id?.toString();
        const packId = fullOrder.pack_id?.toString();

        if (!shippingId) {
          console.log(`⚠️ Pedido ${orderId} sin shipping_id, se omite`);
          skippedCount++;
          continue;
        }

        console.log(`🚚 [ML Initial Sync] Pedido ${orderId} con shipping_id ${shippingId}`);

        // Validar FLEX
        const isFlex = await this.isFlexOrder(fullOrder, accessToken);
        if (!isFlex) {
          console.log(`⏭️ Pedido ${orderId} no es FLEX (omitido)`);
          skippedCount++;
          continue;
        }

        // Validar que no esté entregado
        const isNotDelivered = await this.isOrderNotDelivered(fullOrder, accessToken);
        if (!isNotDelivered) {
          console.log(`📦 Pedido ${orderId} omitido: shipment entregado o cancelado.`);
          skippedCount++;
          continue;
        }

        // Validar duplicados
        const existingOrder = await Order.findOne({
          channel_id: channel._id,
          $or: [
            { ml_shipping_id: shippingId },
            { external_order_id: shippingId }
          ]
        });

        if (existingOrder) {
          console.log(`🔁 Pedido duplicado encontrado (shipping_id: ${shippingId}), se omite.`);
          skippedCount++;
          continue;
        }

        // Verificar si tiene fecha futura (opcional)
        const estimatedDate = fullOrder.shipping?.estimated_delivery_time?.date;
        if (estimatedDate) {
          console.log(`🕒 Fecha estimada de entrega: ${estimatedDate}`);
        }

        // Crear pedido
        await this.createOrderFromApiData(fullOrder, channel, accessToken);
        console.log(`✅ Pedido ${orderId} (envío ${shippingId}) sincronizado correctamente.`);
        syncedCount++;

        await new Promise(res => setTimeout(res, 500)); // evitar rate limit

      } catch (err) {
        console.error(`❌ Error procesando pedido ${basicOrder.id}:`, err.message);
        errorCount++;
      }
    }

    // Guardar estado final
    channel.last_sync_at = new Date();
    channel.sync_status = 'success';
    channel.settings.initial_sync_completed = true;
    channel.markModified('settings');
    await channel.save();

    console.log('\n✅ [ML Initial Sync] Resumen final:');
    console.log(`🟢 Sincronizados: ${syncedCount}`);
    console.log(`🟡 Omitidos: ${skippedCount}`);
    console.log(`🔴 Errores: ${errorCount}`);
    console.log('---------------------------------------------');

    return {
      success: true,
      syncedCount,
      skippedCount,
      errorCount,
      totalFound: orders.length
    };

  } catch (err) {
    console.error('❌ [ML Initial Sync] Error general:', err.message);
    channel.sync_status = 'error';
    channel.last_sync_at = new Date();
    await channel.save();
    throw err;
  }
}



  /**
   * ✅ NUEVO: Verifica si un pedido NO ha sido entregado
   */
  static async isOrderNotDelivered(mlOrder, accessToken) {
    console.log(`🔍 [ML Delivery Check] Verificando estado de entrega del pedido ${mlOrder.id}`);
    
    // ✅ VERIFICACIÓN 1: Estado general del pedido
    if (mlOrder.status === 'cancelled' || mlOrder.status === 'invalid') {
      console.log(`❌ [ML Delivery Check] Pedido ${mlOrder.id} cancelado/inválido`);
      return false;
    }

    // ✅ VERIFICACIÓN 2: Estado del shipping
    if (mlOrder.shipping?.status) {
      const deliveredStatuses = ['delivered', 'not_delivered', 'cancelled', 'undefined'];
      
      if (deliveredStatuses.includes(mlOrder.shipping.status)) {
        console.log(`❌ [ML Delivery Check] Pedido ${mlOrder.id} ya finalizado (${mlOrder.shipping.status})`);
        return false;
      }
    }

    // ✅ VERIFICACIÓN 3: Consultar shipment para detalles adicionales
    if (mlOrder.shipping?.id) {
      try {
        const shipmentResponse = await axios.get(`${this.API_BASE_URL}/shipments/${mlOrder.shipping.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 15000
        });

        const shipment = shipmentResponse.data;
        
        // Estados que indican que el pedido ya fue completado
        const completedStatuses = ['delivered', 'not_delivered', 'cancelled'];
        
        if (completedStatuses.includes(shipment.status)) {
          console.log(`❌ [ML Delivery Check] Shipment ${mlOrder.shipping.id} completado (${shipment.status})`);
          return false;
        }

      } catch (error) {
        console.error(`⚠️ [ML Delivery Check] Error consultando shipment ${mlOrder.shipping.id}:`, error.message);
        // Si hay error consultando, asumimos que no está entregado para no perder pedidos
      }
    }

    console.log(`✅ [ML Delivery Check] Pedido ${mlOrder.id} NO entregado`);
    return true;
  }

  /**
   * ✅ FUNCIÓN DE DETECCIÓN FLEX MEJORADA
   */
  static async isFlexOrder(mlOrder, accessToken) {
    console.log(`🔍 [ML Flex Check] Analizando pedido ${mlOrder.id} para Flex:`);
    
    // MÉTODO 1: Verificar por tags del pedido
    if (mlOrder.tags && Array.isArray(mlOrder.tags)) {
      const flexTags = ['self_service', 'flex', 'self_service_in'];
      const hasFlexTag = mlOrder.tags.some(tag => 
        flexTags.includes(tag.toLowerCase())
      );
      
      if (hasFlexTag) {
        console.log(`✅ [ML Flex Check] Pedido ${mlOrder.id} es Flex (tags)`, mlOrder.tags);
        return true;
      }
    }

    // MÉTODO 2: Consultar el shipment
    if (mlOrder.shipping?.id) {
      try {
        const shipmentResponse = await axios.get(`${this.API_BASE_URL}/shipments/${mlOrder.shipping.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 15000
        });

        const shipment = shipmentResponse.data;
        
        // Verificar logistic_type = "self_service"
        if (shipment.logistic_type === 'self_service') {
          console.log(`✅ [ML Flex Check] Pedido ${mlOrder.id} es Flex (logistic_type = self_service)`);
          return true;
        }

        // Verificar sender_address.types
        if (shipment.sender_address?.types && Array.isArray(shipment.sender_address.types)) {
          const hasFlexType = shipment.sender_address.types.some(type => 
            type.includes('self_service_partner') || type.includes('self_service')
          );
          
          if (hasFlexType) {
            console.log(`✅ [ML Flex Check] Pedido ${mlOrder.id} es Flex (sender_address.types)`, shipment.sender_address.types);
            return true;
          }
        }

        // Verificar service_id específico de Flex
        if (shipment.service_id === 3826008) {
          console.log(`✅ [ML Flex Check] Pedido ${mlOrder.id} es Flex (service_id = 3826008)`);
          return true;
        }

      } catch (error) {
        console.error(`❌ [ML Flex Check] Error consultando shipment ${mlOrder.shipping.id}:`, error.message);
      }
    }

    console.log(`❌ [ML Flex Check] Pedido ${mlOrder.id} NO es Flex`);
    return false;
  }

  static async getValidAccessToken(channel) {
    console.log('🔑 [ML Auth] Verificando access token...');
    
    if (!channel.settings?.access_token) {
      throw new Error('Canal no tiene access token configurado. Requiere reautorización.');
    }

    try {
      return await this.getAccessToken(channel);
    } catch (error) {
      console.error('❌ [ML Auth] Error obteniendo token válido:', error.message);
      throw new Error('Token de MercadoLibre expirado. Reautoriza el canal desde la página de canales.');
    }
  }

  /**
   * ✅ WEBHOOK OPTIMIZADO - SOLO PROCESA PEDIDOS FLEX, NO TRAE LOS YA ENTREGADOS
   */
static async processWebhook(channelId, webhookData) {
  try {
    const acceptedTopics = ['orders', 'orders_v2', 'shipments'];
    if (!acceptedTopics.includes(webhookData.topic)) {
      console.log(`[ML Webhook] Ignorado topic=${webhookData.topic}`);
      return true;
    }

    const channel = await Channel.findById(channelId);
    if (!channel) throw new Error(`[ML Webhook] Canal ${channelId} no encontrado.`);

    const accessToken = await this.getAccessToken(channel);

    let orderId = null;
    let shippingId = null;

    if (webhookData.topic.includes('orders')) {
      orderId = webhookData.resource.split('/').pop();
    } else if (webhookData.topic === 'shipments') {
      shippingId = webhookData.resource.split('/').pop();
      const { data: shipmentData } = await axios.get(`${this.API_BASE_URL}/shipments/${shippingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      orderId = shipmentData.order_id;
    }

    if (!orderId) {
      console.log(`[ML Webhook] No se encontró order_id válido en el evento. Omitido.`);
      return true;
    }

    const { data: mlOrder } = await axios.get(`${this.API_BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log(`📬 [ML Webhook] Pedido recibido desde ML (order_id=${orderId})`);
    console.dir(mlOrder, { depth: null, colors: true });

    // ⚙️ Solo procesar FLEX
    const isFlex = await this.isFlexOrder(mlOrder, accessToken);
    if (!isFlex) {
      console.log(`[ML Webhook] Pedido ${orderId} no es FLEX. Omitido.`);
      return true;
    }

    // ✅ Crear o actualizar pedido con los nuevos campos
    await this.createOrderFromApiData(mlOrder, channel, accessToken);

    console.log(`✅ [ML Webhook] Pedido procesado correctamente (order=${orderId}).`);
    return true;

  } catch (error) {
    console.error(`❌ [ML Webhook] Error:`, error.message);
    return false;
  }
}





  /**
   * Helper para crear la orden en la base de datos
   */
static _mergeItems(existingItems = [], incomingItems = []) {
  const map = new Map();

  const add = (arr) => {
    for (const it of arr) {
      const key = `${it.title}@@${it.price}`;
      const prev = map.get(key) || { ...it, quantity: 0, subtotal: 0 };
      const qty = (prev.quantity || 0) + (it.quantity || 0);
      const subtotal = (it.price || 0) * qty;
      map.set(key, { ...it, quantity: qty, subtotal });
    }
  };

  add(existingItems);
  add(incomingItems);

  return Array.from(map.values());
}

static async createOrderFromApiData(fullOrder, channel, accessToken) {
  const orderId = fullOrder.id?.toString();
  const packId = fullOrder.pack_id?.toString();
  const shippingId = fullOrder.shipping?.id?.toString();

  // 🔑 Estructura requerida
  const externalOrderId = shippingId;
  const orderNumber = packId || orderId;

  if (!shippingId) {
    console.warn(`⚠️ [ML Order] Pedido ${orderId} sin shipping_id, se omite.`);
    return null;
  }

  console.log(`📦 [ML Order] Creando/actualizando pedido (shipping=${shippingId}, pack=${packId || 'N/A'}, order=${orderId})`);
  console.log('🧾 [ML DEBUG] fullOrder completo desde Mercado Libre:');
  console.dir(fullOrder, { depth: null, colors: true });

  const incomingItems = (fullOrder.order_items || []).map(i => ({
    title: i.item.title,
    quantity: i.quantity,
    price: i.unit_price,
    subtotal: (i.unit_price || 0) * (i.quantity || 0),
    currency: fullOrder.currency_id,
  }));

  const totalAmount = incomingItems.reduce((sum, it) => sum + (it.subtotal || 0), 0);
  const shippingCost = fullOrder.shipping?.cost || 0;
  const status = this.mapOrderStatus(fullOrder);

  // 🔍 Buscar si ya existe por shipping_id
  let order = await Order.findOne({
    channel_id: channel._id,
    external_order_id: externalOrderId
  });

  if (order) {
    console.log(`🔁 [ML Order] Pedido existente encontrado (shipping=${shippingId}), actualizando datos`);
    order.items = incomingItems;
    order.total_amount = totalAmount;
    order.shipping_cost = shippingCost;
    order.status = status;
    order.raw_data = [...(order.raw_data || []), fullOrder];
    order.updated_at = new Date();
    await order.save();

    console.log(`💾 [ML Order] Pedido actualizado. Total: ${totalAmount} | Envío: ${shippingCost}`);
    return order;
  }

  // 📦 Crear nuevo pedido
  const shippingInfo = await this.getShippingInfo(fullOrder, accessToken);

  const newOrder = new Order({
    company_id: channel.company_id,
    channel_id: channel._id,
    external_order_id: externalOrderId, // 👈 shipping_id
    order_number: orderNumber,          // 👈 pack_id o order_id
    ml_shipping_id: shippingId,
    customer_name: `${fullOrder.buyer.first_name} ${fullOrder.buyer.last_name}`.trim(),
    customer_email: fullOrder.buyer.email,
    customer_phone: shippingInfo.phone,
    customer_document: fullOrder.buyer.billing_info?.doc_number || '',
    shipping_address: shippingInfo.address,
    shipping_commune: shippingInfo.city,
    shipping_city: shippingInfo.city,
    shipping_state: shippingInfo.state,
    shipping_zip: shippingInfo.zip_code,
    total_amount: totalAmount,
    shipping_cost: shippingCost,
    currency: fullOrder.currency_id,
    status,
    order_date: new Date(fullOrder.date_created),
    items: incomingItems,
    raw_data: [fullOrder],
    notes: `Pedido Mercado Libre | pack=${packId || 'N/A'} | order=${orderId} | shipping=${shippingId}`
  });

  await newOrder.save();
  console.log(`✅ [ML Order] Pedido creado con éxito. external_order_id=${externalOrderId}, order_number=${orderNumber}`);
  console.log(`💰 Total: ${totalAmount} | Envío: ${shippingCost}`);
  return newOrder;
}








  /**
   * Obtiene la información de envío detallada
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
static async getShippingLabel(externalOrderId, channelId) {
  console.log('🟢 [ML Service] getShippingLabel iniciando', { externalOrderId, channelId });
  
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error(`Canal ${channelId} no encontrado`);
  }
  
  const accessToken = await this.getAccessToken(channel);
  
  // 1️⃣ Consultar orden / pack
  let orderResponse;
  try {
    orderResponse = await axios.get(
      `${this.API_BASE_URL}/orders/${externalOrderId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err) {
    console.error('❌ Error consultando orden en ML:', err.response?.data || err.message);
    throw new Error(`ML no reconoce la orden ${externalOrderId}`);
  }
  
  const orderData = orderResponse.data;
  const packId = orderData.pack_id;
  const shipmentId = orderData.shipping?.id;
  
  // 2️⃣ Si pack_id existe, preferir etiqueta de pack (si aplica)
  if (packId) {
    console.log(`📦 Orden es parte de pack ${packId}, solicitando etiqueta de pack`);
    try {
      return await axios({
        method: 'GET',
        url: `${this.API_BASE_URL}/packs/${packId}/labels`,
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'stream'
      });
    } catch (err) {
      console.error('⚠️ Error con etiqueta de pack:', err.response?.data || err.message);
      console.log('🔄 Intentando con etiqueta de shipment individual...');
      // No hacer throw aquí, continuar con el shipment individual
    }
  }
  
  // 3️⃣ Validar que shipment_id exista
  if (!shipmentId) {
    throw new Error(`No se encontró shipment para la orden ${externalOrderId}`);
  }
  
  console.log(`📦 [ML Service] Solicitando etiqueta del shipment ${shipmentId}`);
  
  // 4️⃣ Consultar el shipment con x-format-new para verificar estado / logística
  let shipmentInfo;
  try {
    shipmentInfo = await axios.get(
      `${this.API_BASE_URL}/shipments/${shipmentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-format-new': 'true'
        }
      }
    );
  } catch (err) {
    console.error('❌ Error consultando shipment:', err.response?.data || err.message);
    throw new Error(`No se pudo consultar shipment ${shipmentId}`);
  }
  
  const s = shipmentInfo.data;
  const { status, substatus, logistic } = s;
  
  // 🔍 CORRECCIÓN: Validar que logistic existe
  if (!logistic) {
    console.error('❌ El shipment no tiene información de logística:', s);
    throw new Error(`Shipment ${shipmentId} no tiene información de logística`);
  }
  
  const logisticMode = logistic.mode;
  const logisticType = logistic.type;
  
  console.log('🔍 Datos shipment:', { 
    shipmentId,
    status, 
    substatus, 
    logisticMode,
    logisticType 
  });
  
  // 5️⃣ Validaciones de ME2: modo y tipo
  if (logisticMode !== 'me2') {
    throw new Error(
      `Modo logístico inválido para obtener etiqueta: "${logisticMode}". Se requiere "me2"`
    );
  }
  
  // Tipos que permiten imprimir etiqueta
  const tiposConEtiqueta = ['drop_off', 'xd_drop_off', 'cross_docking', 'self_service'];
  
  if (logisticType === 'fulfillment') {
    throw new Error(
      `Envío en modalidad fulfillment: Mercado Libre imprime la etiqueta, no está disponible para el vendedor`
    );
  }
  
  if (!tiposConEtiqueta.includes(logisticType)) {
    throw new Error(
      `Tipo logístico "${logisticType}" no permite imprimir etiquetas. ` +
      `Tipos válidos: ${tiposConEtiqueta.join(', ')}`
    );
  }
  
  // 6️⃣ Verificar estado imprimible
  // CORRECCIÓN: También permitir substatus 'printed' (para reimpresión)
  const substatusValidos = ['ready_to_print', 'printed'];
  
  if (status !== 'ready_to_ship') {
    throw new Error(
      `El envío no está listo para imprimir. ` +
      `Estado actual: "${status}" (se requiere "ready_to_ship")`
    );
  }
  
  if (!substatusValidos.includes(substatus)) {
    throw new Error(
      `El envío no está listo para imprimir. ` +
      `Subestado actual: "${substatus}" (se requiere: ${substatusValidos.join(' o ')})`
    );
  }
  
  // 7️⃣ Llamar al endpoint plural de etiquetas
  try {
    const url = `${this.API_BASE_URL}/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`;
    console.log('📡 Solicitando label vía shipment_labels:', url);
    
    const labelResponse = await axios({
      method: 'GET',
      url,
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'stream' // ✅ Correcto: stream para manejar el PDF
    });
    
    console.log(`✅ [ML Service] Etiqueta obtenida exitosamente para shipment ${shipmentId}`);
    console.log(`📋 Tipo de logística: ${logisticType}`);
    
    return labelResponse;
    
  } catch (err) {
    // 🔍 CORRECCIÓN: Mejor manejo de errores
    const errorMsg = err.response?.data || err.message;
    console.error('❌ Error obteniendo etiqueta PDF:', errorMsg);
    
    // Si el error viene de la API de ML, intentar parsearlo
    if (err.response?.status === 400) {
      throw new Error(
        `Mercado Libre rechazó la solicitud de etiqueta para shipment ${shipmentId}. ` +
        `Verifica que el estado sea correcto (status: ${status}, substatus: ${substatus})`
      );
    } else if (err.response?.status === 404) {
      throw new Error(
        `No se encontró la etiqueta para shipment ${shipmentId}. ` +
        `Puede que el envío no esté disponible o haya sido cancelado.`
      );
    }
    
    throw new Error(
      `No se pudo descargar la etiqueta PDF para shipment ${shipmentId}: ${errorMsg}`
    );
  }
}


  static async extractShippingAddressSimple(mlOrder) {
    if (!mlOrder.shipping) {
      return 'Sin información de envío';
    }
    
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
   * Mapea los estados de Mercado Libre a los estados del sistema
   */
static mapOrderStatus(mlOrder) {
  console.log(`🔍 [ML Status] Procesando order: ${mlOrder.id}, status: ${mlOrder.status}, shipping: ${mlOrder.shipping?.status}`);

  // 🚚 Prioridad al estado de shipping (envío)
  if (mlOrder.shipping?.status) {
    const statusMap = {
      'pending': 'pending',              // ✅ pedido creado pero no despachado
      'handling': 'ready_for_pickup',    // ✅ preparando envío
      'ready_to_ship': 'ready_for_pickup', // ✅ listo para despacho
      'shipped': 'shipped',              // ✅ despachado
      'in_transit': 'shipped',           // ✅ en camino
      'out_for_delivery': 'out_for_delivery', // ✅ en reparto
      'delivered': 'delivered',          // ✅ completado
      'not_delivered': 'cancelled',      // ✅ intento de entrega fallido
      'cancelled': 'cancelled'           // ✅ cancelado
    };

    const mappedStatus = statusMap[mlOrder.shipping.status];
    if (mappedStatus) {
      console.log(`📦 [ML Status] Shipping status ${mlOrder.shipping.status} -> ${mappedStatus}`);
      return mappedStatus;
    }
  }

  // 🧾 Si no hay estado de envío, usamos el estado de la orden
  if (mlOrder.status) {
    const generalStatusMap = {
      'confirmed': 'pending',     // ✅
      'payment_required': 'pending', // ✅
      'payment_in_process': 'pending', // ✅
      'paid': 'pending',          // ✅
      'cancelled': 'cancelled',   // ✅
      'invalid': 'cancelled',     // ✅
      'delivered': 'delivered'    // ✅
    };

    const mappedStatus = generalStatusMap[mlOrder.status];
    if (mappedStatus) {
      console.log(`📦 [ML Status] General status ${mlOrder.status} -> ${mappedStatus}`);
      return mappedStatus;
    }
  }

  console.log(`⚠️ [ML Status] No se pudo mapear el status, usando 'pending' por defecto`);
  return 'pending'; // ✅ En inglés
}

  static async syncOrders(channelId, options = {}) {
  console.log('⚠️ [ML Service] syncOrders llamado - redirigiendo a syncInitialOrders');
  
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error('Canal no encontrado');
  }

  // Si ya se hizo la sync inicial, no hacer nada
  if (channel.settings?.initial_sync_completed) {
    console.log('⏭️ [ML Service] Canal ya inicializado, no se requiere sync');
    return {
      success: true,
      message: 'Canal ya sincronizado. Nuevos pedidos llegan por webhook.',
      syncedCount: 0,
      errorCount: 0,
      skippedCount: 0,
      totalFound: 0
    };
  }

  // Si no se ha hecho, ejecutar sync inicial
  console.log('🔄 [ML Service] Ejecutando sincronización inicial...');
  return await this.syncInitialOrders(channelId);
}
}

module.exports = MercadoLibreService;