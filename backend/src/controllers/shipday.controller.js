// RUTA: backend/src/controllers/shipday.controller.js

const ShipdayService = require('../services/shipday.service');
const Order = require('../models/Order'); // ¡CORRECCIÓN: Modelo Order importado!
const DriverHistoryService = require('../services/driverHistory.service');
const NotificationService = require('../services/notification.service');
const circuitController = require('./circuit.controller');
/**
 * Función auxiliar para generar un timeline de eventos basado en los datos de la orden de Shipday.
 * @param {object} orderData - El objeto de la orden de Shipday.
 * @param {object} driverDetails - Los detalles del conductor.
 * @returns {Array} - Un array de eventos del timeline.
 */
function generateShipdayTimeline(orderData, driverDetails) {
  const timeline = [];

  if (orderData.placementTime) {
    timeline.push({
      status: 'created',
      timestamp: new Date(orderData.placementTime),
      title: 'Pedido Creado',
      description: `Pedido #${orderData.orderNumber} fue creado en el sistema.`,
      icon: '📝'
    });
  }

  if (orderData.assignedTime) {
    const driverName = driverDetails?.name || orderData.carrierName || 'un conductor';
    timeline.push({
      status: 'assigned',
      timestamp: new Date(orderData.assignedTime),
      title: 'Conductor Asignado',
      description: `Se ha asignado a ${driverName}.`,
      icon: '👨‍💼'
    });
  }
  
  if (orderData.pickedupTime) {
    timeline.push({
      status: 'shipped',
      timestamp: new Date(orderData.pickedupTime),
      title: 'Pedido Recogido',
      description: 'El conductor ha recogido el pedido y está en camino.',
      icon: '🚚'
    });
  }

  if (orderData.deliveryTime || orderData.completedAt) {
    timeline.push({
      status: 'delivered',
      timestamp: new Date(orderData.deliveryTime || orderData.completedAt),
      title: 'Entregado',
      description: 'El pedido fue entregado exitosamente.',
      icon: '✅'
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}


class ShipdayController {
  
  // ==================== CONEXIÓN ====================
  async testConnection(req, res) {
    try {
      console.log('🔍 Probando conexión con Shipday...');
      const isConnected = await ShipdayService.testConnection();
      
      if (isConnected) {
        res.json({ 
          success: true, 
          message: 'Conexión exitosa con Shipday',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'No se pudo conectar con Shipday' 
        });
      }
    } catch (error) {
      console.error('❌ Error en test de conexión:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // ==================== DRIVERS ====================
  async getDrivers(req, res) {
    try {
      console.log('🔍 Solicitando lista de conductores...');
      const drivers = await ShipdayService.getDrivers();
      
      res.json({
        success: true,
        data: drivers,
        count: drivers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getDriver(req, res) {
    try {
      const { id } = req.params; // Este debería ser email en Shipday
      console.log('🔍 Obteniendo conductor:', id);
      
      const driver = await ShipdayService.getDriver(id);
      
      res.json({
        success: true,
        data: driver,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async createDriver(req, res) {
    try {
      const driverData = req.body;
      console.log('👨‍💼 Creando conductor desde shipday.controller.js:', driverData);

      if (!driverData.name || !driverData.email || !driverData.phone) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: name, email, phone'
        });
      }

      // --- PASO 1: Crear en plataformas externas en paralelo para más eficiencia ---
      const [shipdayDriver, circuitDriver] = await Promise.all([
        ShipdayService.createDriver(driverData),
        circuitController.createDriverInCircuit(driverData)
      ]);

      // Verificación crítica para Shipday
      if (!shipdayDriver || !shipdayDriver.id) {
        throw new Error('La creación en Shipday falló o no devolvió un ID. El proceso se detiene.');
      }
      console.log('✅ Conductor creado en Shipday.');

      // Verificación para Circuit (no crítica)
      if (circuitDriver && circuitDriver.id) {
        console.log(`✅ Conductor creado en Circuit con ID: ${circuitDriver.id}`);
      } else {
        console.warn('⚠️ No se pudo crear el conductor en Circuit.');
      }

      // --- PASO 2: Guardar todo en nuestro modelo 'Driver' ---
      const newDriverRecord = new Driver({
        full_name: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        company_id: driverData.company_id, // Asegúrate de que el frontend envíe esto si es necesario
        is_active: true,
        shipday_driver_id: shipdayDriver.id,
        circuit_driver_id: circuitDriver?.id, // Guarda el ID de Circuit si existe
      });

      await newDriverRecord.save();
      console.log('💾 Registro de Conductor guardado en la base de datos local.');

      // --- PASO 3: Enviar respuesta exitosa ---
      res.status(201).json({
        success: true,
        message: 'Conductor creado exitosamente en todos los sistemas.',
        data: newDriverRecord, // Devolvemos el registro de nuestra DB, que es el más completo
      });

    } catch (error) {
      console.error('❌ Error creando conductor:', error.message);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
  async updateDriver(req, res) {
    try {
      const { id } = req.params; // email del conductor
      const updateData = req.body;
      
      console.log('🔄 Actualizando conductor:', id);

      const updatedDriver = await ShipdayService.updateDriver(id, updateData);
      
      res.json({
        success: true,
        message: 'Conductor actualizado exitosamente',
        data: updatedDriver,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error actualizando conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async deleteDriver(req, res) {
    try {
      const { id } = req.params; // email del conductor
      console.log('🗑️ Eliminando conductor:', id);

      await ShipdayService.deleteDriver(id);
      
      res.json({
        success: true,
        message: 'Conductor eliminado exitosamente',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error eliminando conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // ==================== ORDERS ====================
  async getOrders(req, res) {
    try {
      console.log('📦 Solicitando lista de órdenes...');
      const orders = await ShipdayService.getOrders();
      
      res.json({
        success: true,
        data: orders,
        count: orders.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getOrder(req, res) {
    try {
      const { id } = req.params;
      console.log('📦 Obteniendo orden:', id);
      
      const order = await ShipdayService.getOrder(id);
      
      res.json({
        success: true,
        data: order,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo orden:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async createOrder(req, res) {
    try {
      const orderData = req.body;
      console.log('🚢 Creando orden:', orderData);

      const newOrder = await ShipdayService.createOrder(orderData);
      
      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        data: newOrder,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error creando orden:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async assignOrder(req, res) {
    try {
      const { id } = req.params;
      const { driver_email, driver_id } = req.body;
      
      console.log('🔗 Asignando orden:', id, 'a conductor:', driver_email || driver_id);

      if (!driver_email && !driver_id) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere driver_email o driver_id'
        });
      }

      let email = driver_email;
      if (!email && driver_id) {
        const drivers = await ShipdayService.getDrivers();
        const driver = drivers.find(d => d.id === driver_id || d.carrierId === driver_id);
        if (!driver) {
          return res.status(404).json({
            success: false,
            error: 'Conductor no encontrado'
          });
        }
        email = driver.email;
      }

      const result = await ShipdayService.assignOrder(id, email);
      
      res.json({
        success: true,
        message: 'Orden asignada exitosamente',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error asignando orden:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log('🔄 Actualizando estado de orden:', id, 'a:', status);

      res.json({
        success: true,
        message: 'Estado de orden actualizado (simulado)',
        order_id: id,
        new_status: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // ==================== TRACKING (LÓGICA CORREGIDA) ====================
  async getOrderTracking(req, res) {
    try {
      const { id } = req.params; // Aquí 'id' es el shipday_order_id
      console.log(`📍 Obteniendo tracking de orden Shipday: ${id}`);
      
      // 1. OBTENER DATOS DE LA ORDEN DESDE SHIPDAY
      const orderData = await ShipdayService.getOrder(id);
      
      // 2. OBTENER DATOS DEL CONDUCTOR (SI ESTÁ ASIGNADO)
      let driverDetails = null;
      let driverStatus = 'unknown';

      if (orderData.carrierId) {
        try {
          console.log(`👨‍💼 Buscando conductor con ID: ${orderData.carrierId}`);
          const allDrivers = await ShipdayService.getDrivers();
          driverDetails = allDrivers.find(d => d.id === orderData.carrierId);

          if (driverDetails) {
            console.log(`✅ Conductor encontrado: ${driverDetails.name}, Estado: ${driverDetails.status}`);
            driverStatus = driverDetails.status || 'unknown';
          } else {
            console.log(`⚠️ Conductor con ID ${orderData.carrierId} no encontrado en la lista.`);
          }
        } catch (driverError) {
          console.error('❌ Error obteniendo la lista de conductores:', driverError.message);
        }
      }

      // 3. GENERAR TIMELINE
      const timeline = generateShipdayTimeline(orderData, driverDetails);

      // 4. CONSTRUIR LA RESPUESTA COMPLETA
      const trackingResponse = {
        order_number: orderData.orderNumber || id,
        current_status: orderData.orderStatus || 'unknown',
        tracking_url: orderData.trackingUrl || null,
        
        driver: driverDetails ? {
          id: driverDetails.id,
          name: driverDetails.name,
          phone: driverDetails.phoneNumber,
          email: driverDetails.email,
          status: driverStatus, // <-- ESTADO REAL
          isActive: driverDetails.isActive,
          isOnShift: driverDetails.isOnShift,
          location: {
            lat: driverDetails.carrrierLocationLat,
            lng: driverDetails.carrrierLocationLng
          }
        } : null,

        delivery_address: orderData.deliveryAddress,
        pickup_address: orderData.pickupAddress,
        timeline,
        notes: orderData.deliveryInstruction,
        total_amount: orderData.total,
        shipping_cost: orderData.deliveryFee
      };

      console.log('✅ Tracking generado exitosamente para #' + trackingResponse.order_number);
      res.json({
        success: true,
        tracking: trackingResponse,
        last_updated: new Date()
      });

    } catch (error) {
      console.error('❌ Error fatal obteniendo tracking:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ==================== WEBHOOKS ====================
  async setupWebhook(req, res) {
    try {
      const { webhook_url, events } = req.body;
      
      console.log('🔗 Configurando webhook:', webhook_url);
      
      res.json({
        success: true,
        message: 'Webhook configurado (simulado)',
        webhook_url,
        events: events || ['order_created', 'order_assigned', 'order_delivered'],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error configurando webhook:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

async handleWebhook(req, res) {
  try {
    const webhookData = req.body;
    console.log('📥 Webhook recibido de Shipday:', JSON.stringify(webhookData, null, 2));

    const shipdayOrderId = webhookData.order?.id || webhookData.orderId;
    const eventType = webhookData.event || webhookData.eventType;

    if (!shipdayOrderId || !eventType) {
      console.warn('⚠️ Webhook ignorado: Payload no contiene order.id o event.');
      return res.status(400).json({ success: false, error: 'Payload inválido.' });
    }

    const order = await Order.findOne({ shipday_order_id: shipdayOrderId.toString() })
      .populate('company_id', 'name email');

    if (!order) {
      console.warn(`⚠️ No se encontró una orden local para Shipday ID: ${shipdayOrderId}`);
      return res.status(200).json({ success: true, message: 'Orden no encontrada, pero webhook procesado.' });
    }

    console.log(`🔄 Procesando evento "${eventType}" para la orden #${order.order_number}`);
    let orderUpdated = false;
    let notificationEventType = null;

    // --- MAPEO GENERAL DE DATOS (Tracking, Conductor, etc.) ---

    const newTrackingUrl = webhookData.trackingUrl || webhookData.order?.trackingUrl;
    if (newTrackingUrl && newTrackingUrl !== order.shipday_tracking_url) {
      order.shipday_tracking_url = newTrackingUrl;
      orderUpdated = true;
    }
    
      if (newTrackingUrl) {
        order.custom_tracking_url = NotificationService.extractShipdayIdAndBuildUrl(webhookData, order);
        orderUpdated = true;
        console.log(`🔗 URL personalizada guardada: ${order.custom_tracking_url}`);
      }

    const carrierInfo = webhookData.carrier || webhookData.order?.carrier;
    if (carrierInfo) {
      order.driver_info = {
        name: carrierInfo.name || order.driver_info?.name,
        phone: carrierInfo.phone || carrierInfo.phoneNumber || order.driver_info?.phone,
        email: carrierInfo.email || order.driver_info?.email,
        status: carrierInfo.status || order.driver_info?.status
      };
      if (carrierInfo.id) {
        order.shipday_driver_id = carrierInfo.id.toString();
      }
      orderUpdated = true;
    }

    // --- LÓGICA DE EVENTOS ESPECÍFICOS ---

 switch (eventType.toUpperCase()) {
  case 'order_assigned':
  case 'driver_assigned':
    console.log('👨‍💼 Evento: Conductor Asignado.');
    if (order.status === 'warehouse_received') {
      order.status = 'shipped';  // 🔧 DIRECTO A SHIPPED
      notificationEventType = 'driver_assigned';
      orderUpdated = true;
    }
    break;

  case 'order_picked_up':
  case 'picked_up':
    console.log('📦 Evento: Pedido Recogido.');
    order.status = 'shipped';  // 🔧 DIRECTO A SHIPPED
    notificationEventType = 'picked_up';
    orderUpdated = true;
    break;

case 'ORDER_ONTHEWAY':  // ✅ Este es el evento real de Shipday
case 'ORDER_READY_TO_DELIVER':  // Por compatibilidad
case 'READY_TO_DELIVER':        // Por si acaso viene sin el prefijo
  console.log('🚚 Evento: En Camino al Cliente - ENVIANDO EMAIL.');
  order.status = 'out_for_delivery';  
  orderUpdated = true;
  
  // 🚀 ENVIAR EMAIL AL CLIENTE
  if (order.customer_email) {
    try {
      await NotificationService.sendOutForDeliveryEmail(order, webhookData);
      console.log(`📧 Email "En Camino" enviado a: ${order.customer_email}`);
    } catch (emailError) {
      console.error('❌ Error enviando email:', emailError);
    }
  } else {
    console.log('⚠️ No hay email del cliente, no se envía notificación');
  }
  break;
 case 'order_delivered':
 case 'order_completed':
 case 'ORDER_POD_UPLOAD':
  console.log('✅ Evento: Pedido Entregado.');
  order.status = 'delivered';
  order.delivery_date = webhookData.order?.delivery_time ? new Date(webhookData.order.delivery_time) : new Date();
  notificationEventType = 'delivered';
  orderUpdated = true;

   console.log('📷 Procesando pruebas de entrega para proof_of_delivery...');

  // 1. BUSCAR FOTOS en la estructura real del webhook
  const photos = [];

  
  // Ubicación real según tu webhook: webhookData.order.podUrls
  if (webhookData.order?.podUrls && Array.isArray(webhookData.order.podUrls)) {
    photos.push(...webhookData.order.podUrls);
    console.log(`📸 Fotos encontradas en order.podUrls: ${webhookData.order.podUrls.length}`, webhookData.order.podUrls);
  }

  // 2. BUSCAR FIRMA en la estructura real del webhook  
  let signatureUrl = webhookData.order?.signatureUrl || null;
  if (signatureUrl) {
    console.log(`✍️ Firma encontrada:`, signatureUrl);
  }

  // 3. LIMPIAR Y VALIDAR FOTOS
  const validPhotos = photos.filter(url => url && typeof url === 'string' && url.trim() !== '');

  // 4. GUARDAR EN proof_of_delivery (estructura que busca tu frontend)
  if (validPhotos.length > 0 || signatureUrl) {
    
    order.proof_of_delivery = {
      photo_url: validPhotos[0] || null, // Primera foto como principal
      signature_url: signatureUrl,
      podUrls: validPhotos, // 🆕 Array completo de fotos
      timestamp: new Date(),
      notes: 'Entrega completada vía Shipday',
      delivered_by: order.driver_info?.name || 'Conductor',
      location: null // Puedes agregar ubicación si está disponible
    };
    
    console.log('📸 ✅ PRUEBAS DE ENTREGA GUARDADAS EN proof_of_delivery:', {
      evento: webhookData.event,
      order_number: order.order_number,
      fotos_count: validPhotos.length,
      fotos_guardadas: validPhotos,
      foto_principal: validPhotos[0] || null,
      tiene_firma: !!signatureUrl,
      firma_guardada: signatureUrl
    });
    
  } else {
    console.log('⚠️ No se encontraron pruebas de entrega en este webhook');
    console.log('🔍 Debug webhook estructura:', {
      tiene_order: !!webhookData.order,
      order_podUrls: webhookData.order?.podUrls,
      order_signatureUrl: webhookData.order?.signatureUrl
    });
  }
  // 🚀 ENVIAR EMAIL DE ENTREGA
  if (order.customer_email) {
    try {
      await NotificationService.sendDeliveredEmail(order, webhookData);
      console.log(`📧 Email "Entregado" enviado a: ${order.customer_email}`);
    } catch (emailError) {
      console.error('❌ Error enviando email de entrega:', emailError);
    }
  } else {
    console.log('⚠️ No hay email del cliente para notificación de entrega');
  }


  // NUEVO: Registrar entrega en historial de conductores
try {
  const carrierInfo = webhookData.carrier || webhookData.order?.carrier;
  if (carrierInfo) {
    await DriverHistoryService.recordDelivery(order, {
      driver_id: carrierInfo.id || carrierInfo.driver_id,
      driver_email: carrierInfo.email || 'sin-email@conductor.com',
      driver_name: carrierInfo.name || 'Conductor',
      payment_period: 'weekly' // ✅ Agregar payment_period requerido
    });
    
    console.log(`💰 Entrega registrada en historial: ${order.order_number} - $1700`);
  } else {
    console.warn('⚠️ No se encontró información del conductor en el webhook');
  }
} catch (historyError) {
  console.error('❌ Error registrando en historial:', historyError);
  // No fallar el webhook por esto, solo logear el error
}
  break;
  // ELIMINAR casos de assigned y out_for_delivery
}
    
    // Si cualquier evento resultó en una notificación, significa que hubo una actualización.
    if (notificationEventType) {
        orderUpdated = true;
    }

    if (orderUpdated) {
      order.updated_at = new Date();
      await order.save();
      console.log(`💾 Cambios guardados para la orden #${order.order_number}.`);

      if (global.wsService && notificationEventType) {
        console.log(`📡 Enviando notificación WebSocket: ${notificationEventType}`);
        global.wsService.notifyOrderUpdate(order, notificationEventType);
      }
    } else {
      console.log(`No se detectaron cambios guardables para el evento "${eventType}".`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook procesado exitosamente.',
      order_updated: orderUpdated
    });

  } catch (error) {
    console.error('❌ Error fatal procesando el webhook de Shipday:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
async notifyShopifyEnRoute(order) {
  try {
    // Buscar el canal de la orden
    const Channel = require('../models/Channel');
    const channel = await Channel.findById(order.channel_id);
    
    // Solo procesar si es de Shopify
    if (!channel || channel.channel_type !== 'shopify') {
      console.log('⚠️ Orden no es de Shopify, no se notifica');
      return;
    }
    
    const ShopifyService = require('../services/shopify.service');
    
    // Notificar a Shopify
    const result = await ShopifyService.notifyOrderEnRoute(
      channel, 
      order, 
      order.shipday_tracking_url
    );
    
    if (result.success) {
      console.log('✅ Shopify notificado exitosamente');
      
      // Guardar ID del fulfillment para referencia
      if (result.fulfillment_id) {
        order.shopify_fulfillment_id = result.fulfillment_id;
      }
    }
    
  } catch (error) {
    console.error('❌ Error notificando Shopify:', error);
    // No fallar el webhook por esto
  }
}
}

module.exports = new ShipdayController();