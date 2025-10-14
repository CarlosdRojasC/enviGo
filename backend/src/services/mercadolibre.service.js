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

  console.log(`🔄 [ML Initial Sync] Sincronización inicial para canal ${channel.channel_name}`);

  // ✅ SOLO 7 DÍAS ATRÁS PARA SINCRONIZACIÓN INICIAL
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  console.log('📅 [ML Initial Sync] Rango de fechas:', {
    dateFrom: sevenDaysAgo.toISOString(),
    dateTo: now.toISOString()
  });

  try {
    const accessToken = await this.getAccessToken(channel);
    
    // ✅ FILTRAR SOLO PEDIDOS PAGADOS
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
      params: params,
      timeout: 30000
    });

    const orderIds = response.data.results || [];
    let syncedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const basicOrder of orderIds) {
      try {
        console.log(`📦 [ML Initial Sync] Verificando pedido ${basicOrder.id}...`);
        
        const fullOrderResponse = await axios.get(`${this.API_BASE_URL}/orders/${basicOrder.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 15000
        });

        const fullOrder = fullOrderResponse.data;

        // ✅ VERIFICAR SI ES FLEX Y NO ESTÁ ENTREGADO
        const isFlex = await this.isFlexOrder(fullOrder, accessToken);
        const isNotDelivered = await this.isOrderNotDelivered(fullOrder, accessToken);

        // 🚨 NUEVO: Permitir pedidos con fecha futura aunque estén marcados como entregados
        let allowFutureOrder = false;
        const estimatedDateStr = fullOrder.shipping?.estimated_delivery_time?.date 
          || fullOrder.shipping?.date_first_printed;
        if (estimatedDateStr) {
          const deliveryDate = new Date(estimatedDateStr);
          if (deliveryDate > now) {
            console.log(`⏩ [ML Initial Sync] Pedido ${fullOrder.id} tiene fecha futura (${estimatedDateStr}), se incluirá aunque figure entregado.`);
            allowFutureOrder = true;
          }
        }

        if (!isFlex) {
          console.log(`⏭️ [ML Initial Sync] Pedido ${fullOrder.id} omitido (no es Flex)`);
          skippedCount++;
          continue;
        }

        if (!isNotDelivered && !allowFutureOrder) {
          console.log(`⏭️ [ML Initial Sync] Pedido ${fullOrder.id} omitido (ya entregado y sin fecha futura)`);
          skippedCount++;
          continue;
        }

        // ✅ NUEVO: Usar shipping.id como identificador único
        const shippingId = fullOrder.shipping?.id?.toString();
        if (!shippingId) {
          console.log(`⚠️ [ML Initial Sync] Pedido ${fullOrder.id} sin shipping.id, se omite`);
          skippedCount++;
          continue;
        }

        console.log(`✅ [ML Initial Sync] Procesando pedido con envío ${shippingId}`);

        const existingOrder = await Order.findOne({
          channel_id: channel._id,
          external_order_id: shippingId
        });

        if (!existingOrder) {
          await this.createOrderFromApiData(fullOrder, channel, accessToken, shippingId);
          console.log(`➕ [ML Initial Sync] Pedido con envío ${shippingId} creado`);
          syncedCount++;
        } else {
          console.log(`⏭️ [ML Initial Sync] Pedido con envío ${shippingId} ya existe`);
          skippedCount++;
        }
        
        // Pequeña pausa para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ [ML Initial Sync] Error procesando pedido ${basicOrder.id}:`, error.message);
        errorCount++;
      }
    }

    // ✅ MARCAR COMO INICIALIZADO
    channel.last_sync_at = new Date();
    channel.sync_status = 'success';
    channel.settings.initial_sync_completed = true;
    channel.markModified('settings');
    await channel.save();

    console.log(`✅ [ML Initial Sync] Sincronización inicial completada:`);
    console.log(`   - ${syncedCount} pedidos Flex válidos sincronizados`);
    console.log(`   - ${skippedCount} pedidos omitidos`);
    console.log(`   - ${errorCount} errores`);

    return {
      success: true,
      syncedCount,
      errorCount,
      skippedCount,
      totalFound: orderIds.length
    };

  } catch (error) {
    console.error('❌ [ML Initial Sync] Error en sincronización inicial:', error.message);
    
    channel.sync_status = 'error';
    channel.last_sync_at = new Date();
    await channel.save();
    
    throw error;
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
    // 1️⃣ Aceptamos solo los topics relevantes
    const acceptedTopics = ['orders', 'orders_v2', 'shipments'];
    if (!acceptedTopics.includes(webhookData.topic)) {
      console.log(`[ML Webhook] Notificación ignorada (Topic: ${webhookData.topic}).`);
      return true;
    }

    const channel = await Channel.findById(channelId);
    if (!channel) throw new Error(`[ML Webhook] Canal con ID ${channelId} no encontrado.`);

    const accessToken = await this.getAccessToken(channel);
    let orderId = null;
    let shippingId = null;

    // 2️⃣ Obtener order_id y shipping_id según el tipo de evento
    if (webhookData.topic.includes('orders')) {
      orderId = webhookData.resource.split('/').pop();
      console.log(`[ML Webhook] Notificación de pedido recibida para order_id: ${orderId}`);
    } else if (webhookData.topic === 'shipments') {
      shippingId = webhookData.resource.split('/').pop();
      console.log(`[ML Webhook] Notificación de envío ${shippingId} recibida. Buscando order_id...`);

      try {
        const shipmentResponse = await axios.get(`${this.API_BASE_URL}/shipments/${shippingId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        orderId = shipmentResponse.data.order_id;
        if (!orderId) {
          console.log(`[ML Webhook] No se encontró un order_id para el envío ${shippingId}. Se omite.`);
          return true;
        }
        console.log(`[ML Webhook] Envío ${shippingId} corresponde al pedido ${orderId}.`);
      } catch (shipmentError) {
        console.error(`[ML Webhook] Error obteniendo datos del envío ${shippingId}:`, shipmentError.message);
        return false;
      }
    }

    // 3️⃣ Obtener los detalles completos del pedido
    const orderResponse = await axios.get(`${this.API_BASE_URL}/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const mlOrder = orderResponse.data;

    // Si el webhook venía desde "orders", ahora obtenemos shipping.id desde el pedido
    if (!shippingId && mlOrder.shipping?.id) {
      shippingId = mlOrder.shipping.id.toString();
    }

    if (!shippingId) {
      console.log(`⚠️ [ML Webhook] Pedido ${mlOrder.id} sin shipping.id. Se omite.`);
      return true;
    }

    console.log(`📦 [ML Webhook] Procesando pedido ${mlOrder.id} (Envío ${shippingId})`);

    // 4️⃣ Verificar si es Flex
    const isFlex = await this.isFlexOrder(mlOrder, accessToken);
    if (!isFlex) {
      console.log(`⏭️ [ML Webhook] Pedido ${mlOrder.id} no es Flex, omitiendo...`);
      return true;
    }

    // 5️⃣ Actualizar estado según ML
    const currentStatus = this.mapOrderStatus(mlOrder);
    console.log(`🚚 [ML Webhook] Estado recibido desde ML: ${currentStatus}`);

    const existingOrder = await Order.findOne({
      channel_id: channelId,
      external_order_id: shippingId
    });

    if (existingOrder) {
      // 🔍 Mostrar el cambio de estado si aplica
      if (existingOrder.status !== currentStatus) {
        console.log(
          `🔁 [ML Webhook] Estado actualizado para envío ${shippingId}: ` +
          `${existingOrder.status || 'sin_estado'} ➡️ ${currentStatus}`
        );
      } else {
        console.log(
          `⚖️ [ML Webhook] Estado sin cambios (${currentStatus}) para envío ${shippingId}`
        );
      }

      existingOrder.status = currentStatus;
      existingOrder.raw_data = mlOrder;
      existingOrder.total_amount = mlOrder.total_amount || existingOrder.total_amount;
      await existingOrder.save();
      console.log(`💾 [ML Webhook] Pedido actualizado con estado '${currentStatus}' para envío ${shippingId}`);
    } else {
      await this.createOrderFromApiData(mlOrder, channel, accessToken, shippingId);
      console.log(`➕ [ML Webhook] Pedido nuevo creado con envío ${shippingId} (${currentStatus})`);
    }

    return true;

  } catch (error) {
    console.error(`❌ [ML Service] Error en processWebhook (${webhookData.topic}):`, error.message);
    return false;
  }
}


  /**
   * Helper para crear la orden en la base de datos
   */
static async createOrderFromApiData(fullOrder, channel, accessToken) {
  const shippingInfo = await this.getShippingInfo(fullOrder, accessToken);

  // 🆕 Identificadores claros
  const orderId = fullOrder.id?.toString();
  const packId = fullOrder.pack_id?.toString();
  const shippingId = fullOrder.shipping?.id?.toString();

  // ✅ El external_order_id será el order_id o pack_id (prioridad a order_id)
  const externalOrderId = orderId || packId;
  if (!externalOrderId) {
    console.warn(`⚠️ [ML Order] Pedido ${fullOrder.id} sin order_id ni pack_id, se omite.`);
    return null;
  }

  // 🧾 Datos de ítems y totales
  const items = (fullOrder.order_items || []).map(i => ({
    title: i.item.title,
    quantity: i.quantity,
    price: i.unit_price,
    subtotal: i.full_unit_price * i.quantity || (i.unit_price * i.quantity),
    currency: fullOrder.currency_id,
  }));
  const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0);

  // 🚀 Buscar o crear pedido
  let order = await Order.findOne({ channel_id: channel._id, external_order_id: externalOrderId });
  if (order) {
    console.log(`🔄 [ML Order] Actualizando pedido existente con order_id ${externalOrderId}`);
    order.total_amount = totalAmount;
    order.items = items;
    order.status = this.mapOrderStatus(fullOrder);
    order.raw_data = fullOrder;
    order.shipping_address = shippingInfo.address;
    order.shipping_city = shippingInfo.city;
    order.shipping_state = shippingInfo.state;
    order.shipping_zip = shippingInfo.zip_code;
    order.customer_phone = shippingInfo.phone;
    order.ml_shipping_id = shippingId; // 🆕 guardamos shipping_id para mostrarlo en la tabla
    await order.save();
    return order;
  }

  // 🆕 Crear pedido nuevo
  const newOrder = new Order({
    company_id: channel.company_id,
    channel_id: channel._id,
    external_order_id: externalOrderId, // 👈 será order_id o pack_id
    ml_shipping_id: shippingId,         // 👈 campo auxiliar visible
    order_number: shippingId || externalOrderId,
    customer_name: `${fullOrder.buyer.first_name} ${fullOrder.buyer.last_name}`.trim(),
    customer_email: fullOrder.buyer.email,
    customer_phone: shippingInfo.phone,
    customer_document: fullOrder.buyer.billing_info?.doc_number || '',
    shipping_address: shippingInfo.address,
    shipping_city: shippingInfo.city,
    shipping_state: shippingInfo.state,
    shipping_zip: shippingInfo.zip_code,
    total_amount: totalAmount,
    shipping_cost: fullOrder.shipping?.cost || 0,
    currency: fullOrder.currency_id,
    status: this.mapOrderStatus(fullOrder),
    order_date: new Date(fullOrder.date_created),
    items,
    raw_data: fullOrder,
    notes: `Comprador: ${fullOrder.buyer.nickname} | Envío ID: ${shippingId || 'N/A'} | Orden Original: ${fullOrder.id} | Pack: ${fullOrder.pack_id || 'N/A'}`,
  });

  await newOrder.save();
  console.log(`🆕 [ML Order] Pedido nuevo creado con order_id ${externalOrderId} (shipping ${shippingId})`);
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
  console.log('🟢 [ML Service] Iniciando getShippingLabel');
  console.log('➡️ Parámetros recibidos:', { externalOrderId, channelId });

  // 1️⃣ Buscar el canal
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error(`❌ Canal ${channelId} no encontrado en la base de datos`);
  }
  console.log('✅ Canal encontrado:', { name: channel.name, _id: channel._id });

  // 2️⃣ Obtener access token válido
  const accessToken = await this.getAccessToken(channel);
  console.log('🔑 Token obtenido OK');

  // 3️⃣ Consultar la orden (o pack)
  console.log(`📡 [ML Service] Consultando /orders/${externalOrderId}`);
  let orderResponse;
  try {
    orderResponse = await axios.get(
      `${this.API_BASE_URL}/orders/${externalOrderId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err) {
    console.error('❌ Error consultando orden en ML:', err.response?.data || err.message);
    throw new Error(`ML no reconoce la orden ${externalOrderId}: ${JSON.stringify(err.response?.data)}`);
  }

  const orderData = orderResponse.data;
  const shipmentId = orderData.shipping?.id;
  const packId = orderData.pack_id;
  const logisticType = orderData.shipping?.logistic_type;

  console.log('📦 [ML Service] Datos obtenidos de ML:', {
    id: orderData.id,
    status: orderData.status,
    packId,
    shipmentId,
    logisticType,
  });

  // 4️⃣ Detectar pedidos Flex (self_service)
  if (logisticType === 'self_service') {
    console.log('⚠️ [ML Service] Pedido Flex detectado. No hay etiqueta PDF disponible.');
    throw new Error('Pedido Flex: no tiene etiqueta PDF disponible');
  }

  // 5️⃣ Si tiene pack_id, pedir la etiqueta del pack
  if (packId) {
    console.log(`🟣 [ML Service] Orden pertenece a pack ${packId}. Solicitando etiqueta del pack...`);
    try {
      return await axios({
        method: 'GET',
        url: `${this.API_BASE_URL}/packs/${packId}/labels`,
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'stream',
      });
    } catch (err) {
      console.error(`❌ [ML Service] Error obteniendo etiqueta del pack ${packId}:`, err.response?.data || err.message);
      throw new Error(`ML no devolvió la etiqueta del pack ${packId}: ${JSON.stringify(err.response?.data)}`);
    }
  }

  // 6️⃣ Si no tiene pack_id, usar shipment
  if (!shipmentId) {
    throw new Error(`⚠️ No se encontró shipment para la orden ${externalOrderId}`);
  }

  console.log(`📦 [ML Service] Solicitando etiqueta del shipment ${shipmentId}`);
  try {
    return await axios({
      method: 'GET',
      url: `${this.API_BASE_URL}/shipments/${shipmentId}/labels`,
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'stream',
    });
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error(`❌ [ML Service] Error obteniendo etiqueta de shipment ${shipmentId}:`, msg);
    throw new Error(`ML no devolvió la etiqueta para shipment ${shipmentId}: ${JSON.stringify(msg)}`);
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