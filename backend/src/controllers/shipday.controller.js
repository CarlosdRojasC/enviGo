// RUTA: backend/src/controllers/shipday.controller.js

const ShipdayService = require('../services/shipday.service');
const Order = require('../models/Order'); // ¡CORRECCIÓN: Modelo Order importado!

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
      console.log('👨‍💼 Creando conductor:', driverData);

      if (!driverData.name || !driverData.email || !driverData.phone) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: name, email, phone'
        });
      }

      const newDriver = await ShipdayService.createDriver(driverData);
      
      res.status(201).json({
        success: true,
        message: 'Conductor creado exitosamente',
        data: newDriver,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error creando conductor:', error);
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

    switch (eventType.toLowerCase()) {
      case 'order_assigned':
        console.log('👨‍💼 Evento: Conductor Asignado.');
        if (order.status === 'pending') {
          order.status = 'processing';
          notificationEventType = 'driver_assigned';
        }
        break;

      case 'order_picked_up':
        console.log('📦 Evento: Pedido Recogido.');
        order.status = 'shipped';
        notificationEventType = 'picked_up';
        break;

      // --- INICIO DE LA CORRECCIÓN CLAVE ---
      case 'order_pod_upload':
      case 'proof_uploaded':
        console.log('📸 Evento: Prueba de Entrega (POD) detectado.');

        // Extraer URLs de los campos correctos según la documentación
        const photoUrls = webhookData.podUrls || webhookData.order?.podUrls || [];
        const signatureUrl = webhookData.signatureUrl || webhookData.order?.signatureUrl;

        if (photoUrls.length > 0 || signatureUrl) {
          order.proof_of_delivery = {
            photo_url: photoUrls[0] || null, // Guardamos la primera foto del array
            signature_url: signatureUrl || null,
            notes: webhookData.delivery_note || webhookData.order?.delivery_note || '',
            // Puedes añadir la ubicación si viene en el POD
            location: webhookData.location ? {
              type: 'Point',
              coordinates: [webhookData.location.lng, webhookData.location.lat]
            } : order.proof_of_delivery?.location,
          };

          // Para compatibilidad con tu frontend, también llenamos estos campos
          order.podUrls = photoUrls;
          order.signatureUrl = signatureUrl;

          console.log('📝 Prueba de entrega mapeada correctamente.');
          notificationEventType = 'proof_uploaded';
        } else {
            console.warn('⚠️ Evento POD recibido, pero no se encontraron URLs de fotos o firma.');
        }
        break;
      // --- FIN DE LA CORRECCIÓN CLAVE ---

      case 'order_delivered':
      case 'order_completed':
        console.log('✅ Evento: Pedido Entregado.');
        order.status = 'delivered';
        order.delivery_date = webhookData.order?.delivery_time ? new Date(webhookData.order.delivery_time) : new Date();
        notificationEventType = 'delivered';
        break;

      default:
        console.log(`ℹ️ Evento "${eventType}" no mapeado para cambio de estado.`);
        break;
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
}

module.exports = new ShipdayController();