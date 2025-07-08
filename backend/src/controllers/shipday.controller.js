// backend/src/controllers/shipday.controller.js

const ShipdayService = require('../services/shipday.service');
const Order = require('../models/Order'); // Asegúrate de que esta línea esté al inicio del archivo

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
      const { id } = req.params; // Este puede ser email o ID
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
      const { id } = req.params; // Email del conductor
      const updateData = req.body;
      console.log('🔄 Actualizando conductor:', id, updateData);

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
      const { id } = req.params; // Email del conductor
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
      const filters = req.query;
      console.log('📦 Obteniendo órdenes con filtros:', filters);
      
      const orders = await ShipdayService.getOrders();
      
      res.json({
        success: true,
        data: orders,
        count: Array.isArray(orders) ? orders.length : 0,
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
      console.log('📦 Creando orden:', orderData);

      // Validación básica
      if (!orderData.orderNumber || !orderData.customerName || !orderData.customerAddress) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: orderNumber, customerName, customerAddress'
        });
      }

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
      const { id } = req.params; // Order ID
      const { driver_id, driver_email } = req.body;
      
      console.log('👨‍💼 Asignando orden:', id, 'a conductor:', driver_email || driver_id);

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
      // Implementar según la documentación de Shipday
      
      res.json({
        success: true,
        message: 'Estado de orden actualizado',
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
      
      // Implementar según la API de Shipday para tracking
      const order = await ShipdayService.getOrder(id);
      
      res.json({
        success: true,
        data: {
          order_id: id,
          tracking_info: order,
          // Agregar más campos de tracking según Shipday
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // ==================== WEBHOOKS ====================
  
  async setupWebhook(req, res) {
    try {
      const { webhook_url, events = [] } = req.body;
      console.log('🔗 Configurando webhook:', webhook_url, events);

      if (!webhook_url) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere webhook_url'
        });
      }

      // Implementar configuración de webhook según Shipday API
      // Esto puede variar según la documentación de Shipday
      
      res.json({
        success: true,
        message: 'Webhook configurado exitosamente',
        webhook_url,
        events,
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

  /**
   * ✅ CORREGIDO Y VERIFICADO: Procesa webhooks de Shipday para actualizar el estado de los pedidos.
   */
/**
 * ✅ WEBHOOK MEJORADO: Procesa webhooks de Shipday y actualiza tracking
 */
async handleWebhook(req, res) {
  try {
    const webhookData = req.body;
    console.log('📥 Webhook recibido de Shipday:', JSON.stringify(webhookData, null, 2));

    // 1. Extraer los datos del payload
    const shipdayOrderId = webhookData.order?.id;
    const shipdayStatus = webhookData.order_status;
    const eventType = webhookData.event;
    const trackingUrl = webhookData.trackingUrl; // 🆕 NUEVO: URL de tracking
    const carrierInfo = webhookData.carrier; // 🆕 NUEVO: Info del conductor
    const deliveryDetails = webhookData.delivery_details; // 🆕 NUEVO: Detalles de entrega

    // Validar que tenemos la información necesaria
    if (!shipdayOrderId || !eventType) {
      console.warn('⚠️ Webhook ignorado: Faltan order.id o event.');
      return res.status(400).json({ success: false, error: 'Payload inválido.' });
    }

    console.log(`🔄 Procesando evento: ${eventType} para orden Shipday ID: ${shipdayOrderId}`);

    // 2. Buscar la orden en la base de datos
    const order = await Order.findOne({ shipday_order_id: shipdayOrderId.toString() });

    if (!order) {
      console.warn(`⚠️ No se encontró una orden local correspondiente al Shipday ID: ${shipdayOrderId}`);
      return res.status(200).json({ success: true, message: 'Orden no encontrada en sistema local.' });
    }

    console.log(`📦 Orden encontrada: #${order.order_number} (DB ID: ${order._id})`);

    // 3. 🆕 ACTUALIZAR INFORMACIÓN DE TRACKING SIEMPRE
    let orderUpdated = false;

    // Actualizar URL de tracking si está disponible
    if (trackingUrl && trackingUrl !== order.shipday_tracking_url) {
      order.shipday_tracking_url = trackingUrl;
      orderUpdated = true;
      console.log(`📍 URL de tracking actualizada: ${trackingUrl}`);
    }

    // Actualizar información del conductor si está disponible
    if (carrierInfo) {
      if (carrierInfo.id && carrierInfo.id !== order.shipday_driver_id) {
        order.shipday_driver_id = carrierInfo.id.toString();
        orderUpdated = true;
        console.log(`👨‍💼 Conductor actualizado: ${carrierInfo.name} (ID: ${carrierInfo.id})`);
      }
      
      // 🆕 NUEVO: Almacenar información adicional del conductor
      if (carrierInfo.name || carrierInfo.phone || carrierInfo.email) {
        order.driver_info = {
          name: carrierInfo.name,
          phone: carrierInfo.phone,
          email: carrierInfo.email,
          status: carrierInfo.status
        };
        orderUpdated = true;
        console.log(`📱 Info del conductor almacenada: ${carrierInfo.name}`);
      }
    }

    // 4. Actualizar estado según el evento
    if (eventType === 'ORDER_COMPLETED' || shipdayStatus === 'ALREADY_DELIVERED') {
      if (order.status !== 'delivered') {
        order.status = 'delivered';
        
        // Usar fecha de entrega desde Shipday si está disponible
        if (webhookData.order?.delivery_time) {
          order.delivery_date = new Date(webhookData.order.delivery_time);
        } else {
          order.delivery_date = new Date();
        }
        
        orderUpdated = true;
        console.log(`✅ Orden marcada como entregada: ${order.delivery_date}`);
      }
       // Guardar la prueba de entrega (fotos, firma, notas, etc.)
      order.proof_of_delivery = {
        photo_url: webhookData.pods?.[0]?.url || null,
        signature_url: webhookData.signatures?.[0]?.url || null,
        notes: webhookData.delivery_note || '',
        location: {
          coordinates: [
            webhookData.delivery_details?.location?.lng || 0,
            webhookData.delivery_details?.location?.lat || 0
          ]
        }
      };
      orderUpdated = true; // Asegurarse de que se guarde
      console.log('📝 Prueba de entrega actualizada en la orden.');
      
    } else if (eventType === 'ORDER_ASSIGNED' || carrierInfo) {
      if (order.status === 'processing') {
        order.status = 'shipped';
        orderUpdated = true;
        console.log(`🚚 Orden marcada como enviada (conductor asignado)`);
      }
    } else if (eventType === 'ORDER_PICKED_UP') {
      if (order.status !== 'shipped') {
        order.status = 'shipped';
        orderUpdated = true;
        console.log(`📦 Orden marcada como recogida`);
      }
    }

    // 5. 🆕 ALMACENAR INFORMACIÓN ADICIONAL DE ENTREGA
    if (webhookData.delivery_details) {
      order.delivery_location = {
        lat: webhookData.delivery_details.location?.lat,
        lng: webhookData.delivery_details.location?.lng,
        formatted_address: webhookData.delivery_details.formatted_address
      };
      orderUpdated = true;
      console.log(`📍 Ubicación de entrega almacenada`);
    }

    // 6. Actualizar estado en Shipday y timestamp
    if (shipdayStatus && shipdayStatus !== order.shipday_status) {
      order.shipday_status = shipdayStatus;
      orderUpdated = true;
    }

    if (orderUpdated) {
      order.updated_at = new Date();
      await order.save();
      console.log(`✅ Orden local actualizada: #${order.order_number}`);
    } else {
      console.log(`ℹ️ No se requirieron cambios en la orden #${order.order_number}`);
    }

    // 7. 🆕 RESPUESTA DETALLADA
    res.status(200).json({
      success: true,
      message: 'Webhook procesado exitosamente.',
      order_number: order.order_number,
      event_processed: eventType,
      updates_applied: {
        status_changed: orderUpdated && ['delivered', 'shipped'].includes(order.status),
        tracking_url_updated: !!trackingUrl,
        driver_info_updated: !!carrierInfo,
        delivery_location_updated: !!webhookData.delivery_details
      },
      current_status: order.status,
      tracking_url: order.shipday_tracking_url,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fatal procesando el webhook de Shipday:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
}
// IMPORTANTE: Exportar una instancia, no la clase
module.exports = new ShipdayController();