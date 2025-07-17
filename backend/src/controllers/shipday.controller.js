const ShipdayService = require('../services/shipday.service');
const Order = require('../models/Order');
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

      // Validación básica
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

      // Si solo tenemos driver_id, buscar el email
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

      // Nota: Shipday puede no tener un endpoint directo para esto
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

  // ==================== TRACKING ====================
  
async getOrderTracking(req, res) {
  try {
    const { id } = req.params;
    console.log('📍 Obteniendo tracking de orden:', id);
    
    // ==================== OBTENER DATOS DE LA ORDEN DESDE SHIPDAY ====================
    const order = await ShipdayService.getOrder(id);
    console.log('📦 Datos básicos de orden obtenidos:', {
      id: id,
      status: order.status,
      has_tracking_url: !!order.trackingUrl,
      has_driver: !!(order.carrierId || order.carrierName)
    });

    // ==================== OBTENER DATOS DETALLADOS DEL CONDUCTOR ====================
    let driverDetails = null;
    let driverRealTimeStatus = 'unknown';
    
    if (order.carrierId) {
      try {
        console.log('👨‍💼 Obteniendo datos del conductor:', order.carrierId);
        
        // Obtener información detallada del conductor
        driverDetails = await ShipdayService.getDriverDetails(order.carrierId);
        
        console.log('✅ Datos del conductor obtenidos:', {
          name: driverDetails?.name || 'N/A',
          status: driverDetails?.status || 'unknown',
          isActive: driverDetails?.isActive ?? false,
          isOnShift: driverDetails?.isOnShift ?? false,
          phone: driverDetails?.phoneNumber ? '✓' : '✗'
        });
        
        driverRealTimeStatus = driverDetails?.status || 'unknown';
        
      } catch (driverError) {
        console.log('⚠️ No se pudieron obtener datos detallados del conductor:', driverError.message);
        // Usar datos básicos disponibles en la orden
        driverRealTimeStatus = 'unknown';
      }
    }

    // ==================== DETERMINAR ESTADO INTELIGENTE DEL CONDUCTOR ====================
    let smartDriverStatus = driverRealTimeStatus;
    let isDriverConnected = false;

    if (smartDriverStatus === 'unknown' && order.status) {
      // Inferir estado basado en el estado de la orden
      switch (order.status.toLowerCase()) {
        case 'picked_up':
        case 'out_for_delivery':
        case 'in_transit':
          smartDriverStatus = 'driving';
          isDriverConnected = true;
          break;
        case 'delivered':
          smartDriverStatus = 'offline';
          isDriverConnected = false;
          break;
        case 'assigned':
        case 'ready_for_pickup':
          smartDriverStatus = 'online';
          isDriverConnected = true;
          break;
        default:
          smartDriverStatus = 'unknown';
          isDriverConnected = false;
      }
    } else {
      isDriverConnected = ['online', 'driving', 'available'].includes(smartDriverStatus);
    }

    // ==================== GENERAR TIMELINE DE EVENTOS ====================
    const timeline = generateShipdayTimeline(order, driverDetails);

    // ==================== CONSTRUIR RESPUESTA COMPLETA ====================
    const trackingData = {
      // Información básica de la orden
      order_number: order.orderNumber || id,
      customer_name: order.customerName || order.customer?.name || 'Cliente',
      current_status: order.status || 'unknown',
      
      // URLs de tracking
      tracking_url: order.trackingUrl || null,
      shipday_tracking_url: order.trackingUrl || null,
      has_tracking: !!order.trackingUrl,
      
      // ✅ INFORMACIÓN COMPLETA DEL CONDUCTOR
      driver: (order.carrierId || order.carrierName) ? {
        id: order.carrierId,
        name: driverDetails?.name || order.carrierName || 'Conductor Asignado',
        phone: driverDetails?.phoneNumber || order.carrierPhone || '',
        email: driverDetails?.email || order.carrierEmail || '',
        status: smartDriverStatus,
        isActive: driverDetails?.isActive ?? true,
        isOnShift: driverDetails?.isOnShift ?? false,
        isConnected: isDriverConnected,
        lastUpdated: new Date(),
        // Información adicional si está disponible
        rating: driverDetails?.rating || null,
        vehicle: driverDetails?.vehicle || null,
        location: driverDetails?.location || null
      } : null,
      
      // Información adicional del conductor para compatibilidad
      driver_info: (order.carrierId || order.carrierName) ? {
        id: order.carrierId,
        name: driverDetails?.name || order.carrierName,
        phone: driverDetails?.phoneNumber || order.carrierPhone,
        email: driverDetails?.email || order.carrierEmail,
        status: smartDriverStatus,
        isActive: driverDetails?.isActive ?? true,
        isOnShift: driverDetails?.isOnShift ?? false,
        lastUpdated: new Date()
      } : null,
      
      shipday_driver_id: order.carrierId,
      carrierId: order.carrierId,
      carrierName: driverDetails?.name || order.carrierName,
      carrierPhone: driverDetails?.phoneNumber || order.carrierPhone,
      carrierEmail: driverDetails?.email || order.carrierEmail,
      carrierStatus: smartDriverStatus,
      
      // Ubicaciones
      pickup_address: order.pickupAddress || order.pickup?.address || 'Dirección de recogida no especificada',
      delivery_address: order.deliveryAddress || order.delivery?.address || 'Dirección de entrega no especificada',
      delivery_location: order.delivery?.location ? {
        lat: order.delivery.location.latitude,
        lng: order.delivery.location.longitude,
        formatted_address: order.delivery.location.address
      } : null,
      
      // Fechas importantes
      order_date: order.orderDate || order.createdAt,
      delivery_date: order.deliveryDate || order.completedAt,
      estimated_delivery: order.expectedDeliveryTime || order.estimatedDelivery,
      
      // Estado en Shipday
      shipday_status: order.status,
      shipday_order_id: id,
      
      // Timeline de eventos
      timeline: timeline,
      
      // Información adicional
      notes: order.notes || order.specialInstructions || '',
      total_amount: order.totalAmount || order.orderValue || 0,
      shipping_cost: order.shippingCost || order.deliveryFee || 0,
      
      // Información de la empresa (si está disponible)
      company: order.restaurant ? {
        name: order.restaurant.name,
        phone: order.restaurant.phone
      } : null,
      
      // Prueba de entrega
      proof_of_delivery: order.proofOfDelivery || null,
      podUrls: order.proofOfDelivery?.photos || [],
      signatureUrl: order.proofOfDelivery?.signature || null
    };

    console.log('🚚 Tracking generado para #' + (order.orderNumber || id) + ':', {
      has_tracking_url: trackingData.has_tracking,
      tracking_url_source: trackingData.tracking_url ? 'shipday_api' : 'none',
      has_driver: !!trackingData.driver?.name,
      driver_status: trackingData.driver?.status || 'none',
      driver_connected: trackingData.driver?.isConnected || false,
      timeline_events: trackingData.timeline?.length || 0
    });

    res.json({
      success: true,
      tracking: trackingData,
      last_updated: new Date(),
      data_freshness: {
        shipday_data_updated: true,
        driver_data_updated: !!driverDetails,
        tracking_url_source: trackingData.tracking_url ? 'shipday_api' : 'none',
        driver_data_source: driverDetails ? 'shipday_api' : (order.carrierName ? 'basic' : 'none')
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo tracking:', error);
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
      
      // Implementar según documentación de Shipday
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

    // 1. Extraer el ID de la orden de Shipday
    const shipdayOrderId = webhookData.order?.id || webhookData.orderId;
    const eventType = webhookData.event || webhookData.eventType;

    if (!shipdayOrderId || !eventType) {
      console.warn('⚠️ Webhook ignorado: Payload no contiene order.id o event.');
      return res.status(400).json({ success: false, error: 'Payload inválido.' });
    }

    // 2. Buscar la orden en tu base de datos (con empresa poblada)
    const order = await Order.findOne({ shipday_order_id: shipdayOrderId.toString() })
      .populate('company_id', 'name email');

    if (!order) {
      console.warn(`⚠️ No se encontró una orden local para Shipday ID: ${shipdayOrderId}`);
      return res.status(200).json({ success: true, message: 'Orden no encontrada, pero webhook procesado.' });
    }

    console.log(`🔄 Procesando evento "${eventType}" para la orden #${order.order_number} de ${order.company_id?.name}`);
    let orderUpdated = false;

    // 🆕 ACTUALIZAR TRACKING URL CON PRIORIDAD ALTA
    const possibleTrackingUrls = [
      webhookData.trackingUrl,
      webhookData.order?.trackingUrl,
      webhookData.tracking_url,
      webhookData.order?.tracking_url
    ];

    const newTrackingUrl = possibleTrackingUrls.find(url => url && url.trim() !== '');
    
    if (newTrackingUrl && newTrackingUrl !== order.shipday_tracking_url) {
      console.log('🔄 Actualizando URL de tracking desde webhook:', newTrackingUrl);
      order.shipday_tracking_url = newTrackingUrl;
      orderUpdated = true;
    }

    // 🆕 ACTUALIZAR INFORMACIÓN DEL CONDUCTOR
    const carrierInfo = webhookData.carrier || webhookData.order?.carrier || webhookData.assignedCarrier;
    if (carrierInfo) {
      console.log('👨‍💼 Actualizando información del conductor:', carrierInfo);
      
      order.driver_info = {
        name: carrierInfo.name || order.driver_info?.name,
        phone: carrierInfo.phone || carrierInfo.phoneNumber || order.driver_info?.phone,
        email: carrierInfo.email || order.driver_info?.email,
        status: carrierInfo.status || order.driver_info?.status
      };
      
      // También actualizar el ID del conductor si no lo tenemos
      if (carrierInfo.id && !order.shipday_driver_id) {
        order.shipday_driver_id = carrierInfo.id.toString();
      }
      
      orderUpdated = true;
    }

    // 🆕 ACTUALIZAR UBICACIÓN DE ENTREGA
    const deliveryLocation = webhookData.delivery_details?.location || 
                           webhookData.order?.deliveryLocation ||
                           webhookData.proofOfDelivery?.location;
                           
    if (deliveryLocation) {
      console.log('📍 Actualizando ubicación de entrega:', deliveryLocation);
      order.delivery_location = {
        lat: deliveryLocation.lat || deliveryLocation.latitude,
        lng: deliveryLocation.lng || deliveryLocation.longitude,
        formatted_address: deliveryLocation.formatted_address || deliveryLocation.address || order.delivery_location?.formatted_address
      };
      orderUpdated = true;
    }

    // 🆕 ACTUALIZAR TIEMPOS DE SHIPDAY
    if (webhookData.order || webhookData.timestamps) {
      const timestamps = webhookData.timestamps || webhookData.order;
      const currentTimes = order.shipday_times || {};
      
      order.shipday_times = {
        placement_time: timestamps.placement_time ? new Date(timestamps.placement_time) : currentTimes.placement_time,
        assigned_time: timestamps.assigned_time || timestamps.assignedAt ? new Date(timestamps.assigned_time || timestamps.assignedAt) : currentTimes.assigned_time,
        pickup_time: timestamps.pickup_time || timestamps.pickedUpAt ? new Date(timestamps.pickup_time || timestamps.pickedUpAt) : currentTimes.pickup_time,
        delivery_time: timestamps.delivery_time || timestamps.deliveredAt ? new Date(timestamps.delivery_time || timestamps.deliveredAt) : currentTimes.delivery_time,
        expected_pickup_time: timestamps.expected_pickup_time ? new Date(timestamps.expected_pickup_time) : currentTimes.expected_pickup_time,
        expected_delivery_time: timestamps.expected_delivery_time ? new Date(timestamps.expected_delivery_time) : currentTimes.expected_delivery_time
      };
      orderUpdated = true;
    }

    // 3. Procesar eventos específicos y mapear a eventos de notificación
    let notificationEventType = null;

    switch (eventType) {
      
      // Caso: Se asigna un conductor
      case 'ORDER_ASSIGNED':
      case 'order_assigned':
        console.log('👨‍💼 Evento de asignación de conductor detectado.');
        if (order.status === 'pending') {
          order.status = 'processing';
          orderUpdated = true;
          notificationEventType = 'driver_assigned';
          console.log(`⚙️ Orden #${order.order_number} marcada como "procesando".`);
        }
        break;

      // Caso: Se recoge el pedido
      case 'ORDER_PICKED_UP':
      case 'order_picked_up':
        console.log('📦 Evento de recogida detectado.');
        if (order.status !== 'shipped') {
          order.status = 'shipped';
          orderUpdated = true;
          notificationEventType = 'picked_up';
          console.log(`🚚 Orden #${order.order_number} marcada como "enviado".`);
        }
        break;
        
      // Caso: Se sube la prueba de entrega
      case 'ORDER_POD_UPLOAD':
      case 'order_pod_upload':
      case 'proof_uploaded':
        console.log('📸 Evento de Prueba de Entrega detectado.');
        
        const podData = webhookData.proofOfDelivery || webhookData.pod || webhookData.order?.proofOfDelivery;
        
        if (podData) {
          order.proof_of_delivery = {
            photo_url: podData.photo_url || podData.photoUrl || podData.photos?.[0] || order.proof_of_delivery?.photo_url,
            signature_url: podData.signature_url || podData.signatureUrl || podData.signature || order.proof_of_delivery?.signature_url,
            notes: podData.notes || podData.deliveryNote || order.proof_of_delivery?.notes || '',
            location: {
              coordinates: [
                podData.location?.lng || podData.location?.longitude || 0,
                podData.location?.lat || podData.location?.latitude || 0
              ]
            }
          };
          
          // También guardar en campos adicionales para compatibilidad
          if (podData.photos) {
            order.podUrls = podData.photos;
          }
          if (podData.signatureUrl || podData.signature) {
            order.signatureUrl = podData.signatureUrl || podData.signature;
          }
          
          orderUpdated = true;
          notificationEventType = 'proof_uploaded';
          console.log('📝 Prueba de entrega guardada.');
        }
        break;

      // Caso: La orden se marca como completada
      case 'ORDER_COMPLETED':
      case 'ORDER_DELIVERED':
      case 'order_completed':
      case 'order_delivered':
        console.log('✅ Evento de Orden Completada/Entregada detectado.');
        if (order.status !== 'delivered') {
          order.status = 'delivered';
          order.delivery_date = webhookData.order?.delivery_time ? new Date(webhookData.order.delivery_time) : new Date();
          orderUpdated = true;
          notificationEventType = 'delivered';
          console.log(`📦 Orden #${order.order_number} marcada como "entregado".`);
        }
        break;
          
      default:
        console.log(`ℹ️  Evento "${eventType}" recibido, datos generales actualizados.`);
        if (orderUpdated) {
          notificationEventType = 'status_updated';
        }
        break;
    }

    // 4. Guardar los cambios en la base de datos si algo cambió
    if (orderUpdated) {
      order.updated_at = new Date();
      await order.save();
      console.log(`💾 Cambios guardados para la orden #${order.order_number}.`);
      
      // 🆕 LOG DE DEBUG PARA VER QUÉ SE GUARDÓ
      console.log('🔍 Datos actualizados en la orden:', {
        order_number: order.order_number,
        status: order.status,
        company: order.company_id?.name,
        shipday_tracking_url: order.shipday_tracking_url,
        has_driver_info: !!order.driver_info?.name,
        has_delivery_location: !!order.delivery_location,
        has_proof_of_delivery: !!order.proof_of_delivery,
        shipday_times_count: Object.keys(order.shipday_times || {}).length
      });

      // ⚡ ENVIAR NOTIFICACIONES DIRIGIDAS EN TIEMPO REAL
      if (global.wsService && notificationEventType) {
        console.log(`📡 Enviando notificaciones dirigidas para evento: ${notificationEventType}`);
        
        try {
          const notificationStats = global.wsService.notifyOrderUpdate(order, notificationEventType);
          console.log(`📊 Notificaciones enviadas:`, {
            company_users: notificationStats.company_notifications,
            admin_users: notificationStats.admin_notifications,
            company_name: order.company_id?.name,
            order_number: order.order_number,
            event_type: notificationEventType
          });
        } catch (notificationError) {
          console.error('❌ Error enviando notificaciones WebSocket:', notificationError);
        }
      } else if (!global.wsService) {
        console.warn('⚠️ WebSocket no disponible para notificaciones');
      }
    }

    // 5. Responder a Shipday para confirmar la recepción
    res.status(200).json({ 
      success: true, 
      message: 'Webhook procesado exitosamente.',
      order_updated: orderUpdated,
      order_number: order.order_number,
      company_name: order.company_id?.name,
      notification_sent: orderUpdated && !!global.wsService && !!notificationEventType,
      notification_type: notificationEventType
    });

  } catch (error) {
    console.error('❌ Error fatal procesando el webhook de Shipday:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
}


module.exports = new ShipdayController();