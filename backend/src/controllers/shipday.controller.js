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
    
    // ==================== PRIMERO: OBTENER ORDEN DE TU BASE DE DATOS ====================
    const localOrder = await Order.findById(id).populate('company_id');
    if (!localOrder) {
      console.log(`❌ Orden no encontrada en BD local: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    console.log('📋 Orden local encontrada:', {
      order_number: localOrder.order_number,
      status: localOrder.status,
      shipday_order_id: localOrder.shipday_order_id,
      has_shipday_order: !!localOrder.shipday_order_id
    });

    // ==================== VERIFICAR SI TIENE ORDEN EN SHIPDAY ====================
    if (!localOrder.shipday_order_id) {
      console.log('⚠️ Esta orden no tiene ID de Shipday');
      
      // Generar tracking básico sin datos de Shipday
      const basicTrackingData = {
        order_number: localOrder.order_number,
        customer_name: localOrder.customer_name,
        current_status: localOrder.status,
        tracking_url: null,
        shipday_tracking_url: null,
        has_tracking: false,
        driver: null,
        driver_info: null,
        pickup_address: localOrder.pickup_address || localOrder.company_id?.address || 'Dirección no especificada',
        delivery_address: localOrder.shipping_address,
        order_date: localOrder.order_date,
        delivery_date: localOrder.delivery_date,
        shipday_status: null,
        shipday_order_id: null,
        timeline: this.generateBasicTimeline(localOrder),
        notes: localOrder.notes || '',
        total_amount: localOrder.total_amount || 0,
        shipping_cost: localOrder.shipping_cost || 0,
        company: {
          name: localOrder.company_id?.name,
          phone: localOrder.company_id?.phone
        },
        proof_of_delivery: localOrder.proof_of_delivery,
        podUrls: localOrder.podUrls || [],
        signatureUrl: localOrder.signatureUrl
      };

      return res.json({
        success: true,
        tracking: basicTrackingData,
        last_updated: new Date(),
        data_freshness: {
          shipday_data_updated: false,
          driver_data_updated: false,
          tracking_url_source: 'none',
          driver_data_source: 'none'
        },
        timestamp: new Date().toISOString()
      });
    }

    // ==================== OBTENER DATOS DE SHIPDAY ====================
    let shipdayOrder = null;
    let driverDetails = null;
    let driverRealTimeStatus = 'unknown';
    
    try {
      console.log('📦 Obteniendo orden desde Shipday:', localOrder.shipday_order_id);
      shipdayOrder = await ShipdayService.getOrder(localOrder.shipday_order_id);
      
      console.log('📦 Datos básicos de Shipday obtenidos:', {
        shipday_id: localOrder.shipday_order_id,
        status: shipdayOrder?.status,
        has_tracking_url: !!shipdayOrder?.trackingUrl,
        has_driver: !!(shipdayOrder?.carrierId || shipdayOrder?.carrierName)
      });

      // ==================== OBTENER DATOS DEL CONDUCTOR ====================
      if (shipdayOrder?.carrierId) {
        try {
          console.log('👨‍💼 Obteniendo datos del conductor:', shipdayOrder.carrierId);
          driverDetails = await ShipdayService.getDriverDetails(shipdayOrder.carrierId);
          
          console.log('✅ Datos del conductor obtenidos:', {
            name: driverDetails?.name || 'N/A',
            status: driverDetails?.status || 'unknown',
            isActive: driverDetails?.isActive ?? false,
            phone: driverDetails?.phoneNumber ? '✓' : '✗'
          });
          
          driverRealTimeStatus = driverDetails?.status || 'unknown';
          
        } catch (driverError) {
          console.log('⚠️ No se pudieron obtener datos del conductor:', driverError.message);
        }
      }

    } catch (shipdayError) {
      console.log('⚠️ Error obteniendo datos de Shipday:', shipdayError.message);
      // Continuar con datos locales solamente
    }

    // ==================== DETERMINAR ESTADO INTELIGENTE DEL CONDUCTOR ====================
    let smartDriverStatus = driverRealTimeStatus;
    let isDriverConnected = false;

    if (smartDriverStatus === 'unknown' && (shipdayOrder?.status || localOrder.status)) {
      const orderStatus = (shipdayOrder?.status || localOrder.status).toLowerCase();
      switch (orderStatus) {
        case 'picked_up':
        case 'out_for_delivery':
        case 'in_transit':
        case 'shipped':
          smartDriverStatus = 'driving';
          isDriverConnected = true;
          break;
        case 'delivered':
          smartDriverStatus = 'offline';
          isDriverConnected = false;
          break;
        case 'assigned':
        case 'ready_for_pickup':
        case 'processing':
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

    // ==================== GENERAR TIMELINE ====================
    const timeline = this.generateShipdayTimeline(shipdayOrder || localOrder, driverDetails);

    // ==================== CONSTRUIR RESPUESTA COMPLETA ====================
    const trackingData = {
      order_number: localOrder.order_number,
      customer_name: localOrder.customer_name,
      current_status: localOrder.status,
      
      // URLs de tracking
      tracking_url: localOrder.shipday_tracking_url || shipdayOrder?.trackingUrl || null,
      shipday_tracking_url: localOrder.shipday_tracking_url || shipdayOrder?.trackingUrl || null,
      has_tracking: !!(localOrder.shipday_tracking_url || shipdayOrder?.trackingUrl),
      
      // Información del conductor
      driver: (shipdayOrder?.carrierId || shipdayOrder?.carrierName || localOrder.driver_info) ? {
        id: shipdayOrder?.carrierId || localOrder.shipday_driver_id,
        name: driverDetails?.name || shipdayOrder?.carrierName || localOrder.driver_info?.name || 'Conductor Asignado',
        phone: driverDetails?.phoneNumber || shipdayOrder?.carrierPhone || localOrder.driver_info?.phone || '',
        email: driverDetails?.email || shipdayOrder?.carrierEmail || localOrder.driver_info?.email || '',
        status: smartDriverStatus,
        isActive: driverDetails?.isActive ?? true,
        isOnShift: driverDetails?.isOnShift ?? false,
        isConnected: isDriverConnected,
        lastUpdated: new Date(),
        rating: driverDetails?.rating || null,
        vehicle: driverDetails?.vehicle || null,
        location: driverDetails?.location || null
      } : null,
      
      // Información adicional del conductor para compatibilidad
      driver_info: localOrder.driver_info || null,
      shipday_driver_id: localOrder.shipday_driver_id || shipdayOrder?.carrierId,
      carrierId: shipdayOrder?.carrierId || localOrder.shipday_driver_id,
      carrierName: driverDetails?.name || shipdayOrder?.carrierName || localOrder.driver_info?.name,
      carrierPhone: driverDetails?.phoneNumber || shipdayOrder?.carrierPhone || localOrder.driver_info?.phone,
      carrierStatus: smartDriverStatus,
      
      // Ubicaciones
      pickup_address: localOrder.pickup_address || localOrder.company_id?.address || 'Dirección no especificada',
      delivery_address: localOrder.shipping_address,
      delivery_location: localOrder.delivery_location,
      
      // Fechas importantes
      order_date: localOrder.order_date,
      delivery_date: localOrder.delivery_date,
      estimated_delivery: localOrder.estimated_delivery || shipdayOrder?.expectedDeliveryTime,
      
      // Estado en Shipday
      shipday_status: shipdayOrder?.status || localOrder.shipday_status,
      shipday_order_id: localOrder.shipday_order_id,
      
      // Timeline de eventos
      timeline: timeline,
      
      // Información adicional
      notes: localOrder.notes || shipdayOrder?.notes || shipdayOrder?.specialInstructions || '',
      total_amount: localOrder.total_amount || 0,
      shipping_cost: localOrder.shipping_cost || 0,
      
      // Información de la empresa
      company: {
        name: localOrder.company_id?.name,
        phone: localOrder.company_id?.phone
      },
      
      // Prueba de entrega
      proof_of_delivery: localOrder.proof_of_delivery || shipdayOrder?.proofOfDelivery,
      podUrls: localOrder.podUrls || shipdayOrder?.proofOfDelivery?.photos || [],
      signatureUrl: localOrder.signatureUrl || shipdayOrder?.proofOfDelivery?.signature
    };

    console.log('🚚 Tracking generado para #' + localOrder.order_number + ':', {
      has_tracking_url: trackingData.has_tracking,
      tracking_url_source: trackingData.tracking_url ? (shipdayOrder ? 'shipday_api' : 'database') : 'none',
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
        shipday_data_updated: !!shipdayOrder,
        driver_data_updated: !!driverDetails,
        tracking_url_source: trackingData.tracking_url ? (shipdayOrder ? 'shipday_api' : 'database') : 'none',
        driver_data_source: driverDetails ? 'shipday_api' : (localOrder.driver_info ? 'database' : 'none')
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
async refreshDriverStatus(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔄 [DRIVER-REFRESH] Refrescando conductor para orden Shipday: ${id}`);

      // Obtener datos frescos de la orden desde Shipday
      const order = await ShipdayService.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          error: 'Orden no encontrada en Shipday' 
        });
      }

      const driverId = order.carrierId;
      
      if (!driverId) {
        return res.status(404).json({ 
          success: false, 
          error: 'No hay conductor asignado a esta orden' 
        });
      }

      try {
        console.log('📡 [DRIVER-REFRESH] Obteniendo estado en tiempo real:', driverId);
        
        // Obtener estado actualizado del conductor
        const driverDetails = await ShipdayService.getDriverDetails(driverId);
        
        // Determinar estado inteligente
        let smartDriverStatus = driverDetails?.status || 'unknown';
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

        const refreshedDriver = {
          id: driverDetails?.id || driverId,
          name: driverDetails?.name || order.carrierName || 'Conductor',
          phone: driverDetails?.phoneNumber || order.carrierPhone || '',
          email: driverDetails?.email || order.carrierEmail || '',
          status: smartDriverStatus,
          isActive: driverDetails?.isActive ?? true,
          isOnShift: driverDetails?.isOnShift ?? false,
          isConnected: isDriverConnected,
          lastSeen: driverDetails?.lastSeen ? new Date(driverDetails.lastSeen) : null,
          location: driverDetails?.location || null,
          lastUpdated: new Date()
        };
        
        console.log('✅ [DRIVER-REFRESH] Conductor actualizado:', {
          name: refreshedDriver.name,
          status: refreshedDriver.status,
          isActive: refreshedDriver.isActive,
          isConnected: refreshedDriver.isConnected
        });

        res.json({
          success: true,
          driver: refreshedDriver,
          order_id: id,
          timestamp: new Date()
        });

      } catch (shipdayError) {
        console.error('❌ [DRIVER-REFRESH] Error desde Shipday:', shipdayError);
        
        // Fallback: devolver datos básicos de la orden
        const fallbackDriver = {
          id: order.carrierId,
          name: order.carrierName || 'Conductor',
          phone: order.carrierPhone || '',
          email: order.carrierEmail || '',
          status: 'unknown',
          isActive: true,
          isOnShift: false,
          isConnected: false,
          lastUpdated: new Date()
        };

        res.json({
          success: true,
          driver: fallbackDriver,
          order_id: id,
          fallback: true,
          timestamp: new Date(),
          note: 'Usando datos básicos - no se pudo conectar con Shipday para datos detallados'
        });
      }

    } catch (error) {
      console.error('❌ [DRIVER-REFRESH] Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor',
        message: error.message 
      });
    }
  }

  // ==================== MÉTODOS AUXILIARES DENTRO DE LA CLASE ====================
  

  generateBasicTimeline(localOrder) {
  const timeline = [];
  const currentTime = new Date();
  
  // Evento: Pedido creado
  timeline.push({
    status: 'completed',
    icon: '📦',
    title: 'Pedido Creado',
    description: `Pedido #${localOrder.order_number} registrado en el sistema`,
    timestamp: localOrder.order_date || localOrder.createdAt || currentTime
  });

  // Eventos basados en el estado local
  switch (localOrder.status?.toLowerCase()) {
    case 'processing':
      timeline.push({
        status: 'current',
        icon: '⚙️',
        title: 'Procesando',
        description: 'El pedido está siendo preparado',
        timestamp: localOrder.updated_at || currentTime
      });
      break;

    case 'ready_for_pickup':
      timeline.push({
        status: 'completed',
        icon: '⚙️',
        title: 'Procesando',
        description: 'El pedido fue preparado',
        timestamp: localOrder.updated_at || currentTime
      });
      
      timeline.push({
        status: 'current',
        icon: '📋',
        title: 'Listo para Retiro',
        description: 'El pedido está listo para ser retirado',
        timestamp: localOrder.updated_at || currentTime
      });
      break;

    case 'shipped':
      timeline.push({
        status: 'completed',
        icon: '⚙️',
        title: 'Procesando',
        description: 'El pedido fue preparado',
        timestamp: localOrder.updated_at || currentTime
      });
      
      timeline.push({
        status: 'completed',
        icon: '📋',
        title: 'Listo para Retiro',
        description: 'El pedido estuvo listo para retiro',
        timestamp: localOrder.updated_at || currentTime
      });
      
      timeline.push({
        status: 'current',
        icon: '🚚',
        title: 'En Tránsito',
        description: 'El pedido está en camino',
        timestamp: localOrder.updated_at || currentTime
      });
      break;

    case 'delivered':
      timeline.push({
        status: 'completed',
        icon: '⚙️',
        title: 'Procesando',
        description: 'El pedido fue preparado',
        timestamp: localOrder.updated_at || currentTime
      });
      
      timeline.push({
        status: 'completed',
        icon: '📋',
        title: 'Listo para Retiro',
        description: 'El pedido estuvo listo para retiro',
        timestamp: localOrder.updated_at || currentTime
      });
      
      timeline.push({
        status: 'completed',
        icon: '🚚',
        title: 'En Tránsito',
        description: 'El pedido estuvo en camino',
        timestamp: localOrder.updated_at || currentTime
      });
      
      timeline.push({
        status: 'completed',
        icon: '✅',
        title: 'Entregado',
        description: 'El pedido fue entregado exitosamente',
        timestamp: localOrder.delivery_date || localOrder.updated_at || currentTime
      });
      break;

    default:
      timeline.push({
        status: 'pending',
        icon: '⏳',
        title: 'Pendiente',
        description: 'El pedido está pendiente de procesamiento',
        timestamp: localOrder.updated_at || currentTime
      });
  }

  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}
  /**
   * Generar timeline de eventos basado en datos de Shipday
   * @param {Object} order - Datos de la orden desde Shipday
   * @param {Object} driverDetails - Detalles del conductor (opcional)
   * @returns {Array} Timeline de eventos
   */
 generateShipdayTimeline(order, driverDetails = null) {
    const timeline = [];
    const currentTime = new Date();
    
    timeline.push({
      status: 'completed',
      icon: '📦',
      title: 'Pedido Creado',
      description: `Pedido registrado en Shipday`,
      timestamp: order.createdAt || order.orderDate || order.created_at || currentTime
    });

    if (order.carrierId || order.carrierName || driverDetails) {
      const driverName = driverDetails?.name || order.carrierName || 'Conductor';
      const driverStatus = driverDetails?.status || 'asignado';
      
      timeline.push({
        status: ['delivered', 'completed'].includes(order.status) ? 'completed' : 'current',
        icon: '👨‍💼',
        title: 'Conductor Asignado',
        description: `${driverName} ha sido asignado${driverStatus !== 'asignado' ? ` - ${this.getDriverStatusText(driverStatus)}` : ''}`,
        timestamp: order.assignedAt || order.assigned_at || order.updatedAt || order.updated_at || currentTime
      });
    }

    const orderStatus = order.status?.toLowerCase();
    
    switch (orderStatus) {
      case 'ready_for_pickup':
      case 'assigned':
        timeline.push({
          status: 'current',
          icon: '📋',
          title: 'Listo para Retiro',
          description: 'El pedido está preparado y listo para ser retirado',
          timestamp: order.readyAt || order.ready_at || order.updatedAt || order.updated_at || currentTime
        });
        break;

      case 'picked_up':
      case 'out_for_delivery':
      case 'in_transit':
        timeline.push({
          status: 'completed',
          icon: '📋',
          title: 'Listo para Retiro',
          description: 'El pedido estaba preparado para retiro',
          timestamp: order.readyAt || order.ready_at || order.updatedAt || order.updated_at || currentTime
        });
        
        timeline.push({
          status: 'completed',
          icon: '📦',
          title: 'Recogido',
          description: 'El pedido ha sido recogido por el conductor',
          timestamp: order.pickedUpAt || order.picked_up_at || order.pickupTime || order.updatedAt || order.updated_at || currentTime
        });
        
        timeline.push({
          status: 'current',
          icon: '🚚',
          title: 'En Tránsito',
          description: 'El pedido está en camino a la dirección de entrega',
          timestamp: order.inTransitAt || order.in_transit_at || order.shippedAt || order.updatedAt || order.updated_at || currentTime
        });
        break;

      case 'delivered':
      case 'completed':
        timeline.push({
          status: 'completed',
          icon: '📋',
          title: 'Listo para Retiro',
          description: 'El pedido estaba preparado para retiro',
          timestamp: order.readyAt || order.ready_at || order.updatedAt || order.updated_at || currentTime
        });
        
        timeline.push({
          status: 'completed',
          icon: '📦',
          title: 'Recogido',
          description: 'El pedido fue recogido por el conductor',
          timestamp: order.pickedUpAt || order.picked_up_at || order.pickupTime || order.updatedAt || order.updated_at || currentTime
        });
        
        timeline.push({
          status: 'completed',
          icon: '🚚',
          title: 'En Tránsito',
          description: 'El pedido estuvo en camino',
          timestamp: order.inTransitAt || order.in_transit_at || order.shippedAt || order.updatedAt || order.updated_at || currentTime
        });
        
        timeline.push({
          status: 'completed',
          icon: '✅',
          title: 'Entregado',
          description: 'El pedido ha sido entregado exitosamente',
          timestamp: order.deliveredAt || order.delivered_at || order.completedAt || order.completed_at || order.deliveryDate || order.delivery_date || currentTime
        });
        
        if (order.proofOfDelivery || order.proof_of_delivery) {
          timeline.push({
            status: 'completed',
            icon: '📸',
            title: 'Prueba de Entrega',
            description: 'Prueba de entrega registrada',
            timestamp: order.proofOfDelivery?.timestamp || order.proof_of_delivery?.timestamp || order.deliveredAt || order.delivered_at || currentTime
          });
        }
        break;

      case 'cancelled':
      case 'canceled':
        timeline.push({
          status: 'cancelled',
          icon: '❌',
          title: 'Pedido Cancelado',
          description: order.cancellationReason || order.cancellation_reason || 'El pedido ha sido cancelado',
          timestamp: order.cancelledAt || order.cancelled_at || order.canceledAt || order.canceled_at || order.updatedAt || order.updated_at || currentTime
        });
        break;

      default:
        timeline.push({
          status: 'pending',
          icon: '⏳',
          title: 'Procesando',
          description: 'El pedido está siendo procesado',
          timestamp: order.updatedAt || order.updated_at || currentTime
        });
    }

    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getDriverStatusText(status) {
    const statusTexts = {
      'online': 'En línea',
      'offline': 'Desconectado',
      'busy': 'Ocupado',
      'driving': 'Conduciendo',
      'available': 'Disponible',
      'unknown': 'Estado desconocido'
    };
    return statusTexts[status] || status;
  }

}

module.exports = new ShipdayController();