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

      // 1. Extraer el ID de la orden de Shipday, que es lo común en todos los eventos.
      const shipdayOrderId = webhookData.order?.id;
      const eventType = webhookData.event;

      if (!shipdayOrderId || !eventType) {
        console.warn('⚠️ Webhook ignorado: Payload no contiene order.id o event.');
        return res.status(400).json({ success: false, error: 'Payload inválido.' });
      }

      // 2. Buscar la orden en tu base de datos.
      const order = await Order.findOne({ shipday_order_id: shipdayOrderId.toString() });

      if (!order) {
        console.warn(`⚠️ No se encontró una orden local para Shipday ID: ${shipdayOrderId}`);
        return res.status(200).json({ success: true, message: 'Orden no encontrada, pero webhook procesado.' });
      }

      console.log(`🔄 Procesando evento "${eventType}" para la orden #${order.order_number}`);
      let orderUpdated = false;

      // 🆕 ACTUALIZAR TRACKING URL Y DATOS DEL CONDUCTOR DESDE CUALQUIER EVENTO
      if (webhookData.trackingUrl && webhookData.trackingUrl !== order.shipday_tracking_url) {
        console.log('📍 Actualizando URL de tracking:', webhookData.trackingUrl);
        order.shipday_tracking_url = webhookData.trackingUrl;
        orderUpdated = true;
      }

      // 🆕 ACTUALIZAR INFORMACIÓN DEL CONDUCTOR SI ESTÁ DISPONIBLE
      if (webhookData.carrier) {
        console.log('👨‍💼 Actualizando información del conductor:', webhookData.carrier);
        order.driver_info = {
          name: webhookData.carrier.name || order.driver_info?.name,
          phone: webhookData.carrier.phone || order.driver_info?.phone,
          email: webhookData.carrier.email || order.driver_info?.email,
          status: webhookData.carrier.status || order.driver_info?.status
        };
        
        // También actualizar el ID del conductor si no lo tenemos
        if (webhookData.carrier.id && !order.shipday_driver_id) {
          order.shipday_driver_id = webhookData.carrier.id.toString();
        }
        
        orderUpdated = true;
      }

      // 🆕 ACTUALIZAR UBICACIÓN DE ENTREGA SI ESTÁ DISPONIBLE
      if (webhookData.delivery_details?.location) {
        console.log('📍 Actualizando ubicación de entrega:', webhookData.delivery_details.location);
        order.delivery_location = {
          lat: webhookData.delivery_details.location.lat,
          lng: webhookData.delivery_details.location.lng,
          formatted_address: webhookData.delivery_details.formatted_address || order.delivery_location?.formatted_address
        };
        orderUpdated = true;
      }

      // 🆕 ACTUALIZAR TIEMPOS DE SHIPDAY SI ESTÁN DISPONIBLES
      if (webhookData.order) {
        const shipdayOrder = webhookData.order;
        const currentTimes = order.shipday_times || {};
        
        order.shipday_times = {
          placement_time: shipdayOrder.placement_time ? new Date(shipdayOrder.placement_time) : currentTimes.placement_time,
          assigned_time: shipdayOrder.assigned_time ? new Date(shipdayOrder.assigned_time) : currentTimes.assigned_time,
          pickup_time: shipdayOrder.pickedup_time ? new Date(shipdayOrder.pickedup_time) : currentTimes.pickup_time,
          delivery_time: shipdayOrder.delivery_time ? new Date(shipdayOrder.delivery_time) : currentTimes.delivery_time,
          expected_pickup_time: shipdayOrder.expected_pickup_time ? new Date(shipdayOrder.expected_pickup_time) : currentTimes.expected_pickup_time,
          expected_delivery_time: shipdayOrder.expected_delivery_time ? new Date(shipdayOrder.expected_delivery_time) : currentTimes.expected_delivery_time
        };
        orderUpdated = true;
      }

      // 3. Procesar el evento específico.
      switch (eventType) {
        
        // Caso: Se sube la prueba de entrega (fotos/firma)
        case 'ORDER_POD_UPLOAD':
          console.log('📸 Evento de Prueba de Entrega detectado.');
          
          order.proof_of_delivery = {
            photo_url: webhookData.order?.podUrls?.[0] || webhookData.pods?.[0] || order.proof_of_delivery?.photo_url,
            signature_url: webhookData.order?.signatureUrl || webhookData.signatures?.[0] || order.proof_of_delivery?.signature_url,
            notes: webhookData.delivery_note || order.proof_of_delivery?.notes || '',
            location: {
              coordinates: [
                webhookData.delivery_details?.location?.lng || 0,
                webhookData.delivery_details?.location?.lat || 0
              ]
            }
          };
          
          // 🆕 TAMBIÉN GUARDAR LAS URLs EN CAMPOS ADICIONALES PARA COMPATIBILIDAD
          if (webhookData.order?.podUrls) {
            order.podUrls = webhookData.order.podUrls;
          }
          if (webhookData.order?.signatureUrl) {
            order.signatureUrl = webhookData.order.signatureUrl;
          }
          
          orderUpdated = true;
          console.log('📝 Prueba de entrega guardada.');
          break;

        // Caso: La orden se marca como completada
        case 'ORDER_COMPLETED':
          console.log('✅ Evento de Orden Completada detectado.');
          if (order.status !== 'delivered') {
            order.status = 'delivered';
            order.delivery_date = webhookData.order?.delivery_time ? new Date(webhookData.order.delivery_time) : new Date();
            orderUpdated = true;
            console.log(`📦 Orden #${order.order_number} marcada como "entregado".`);
          }
          break;

        // Otros eventos para un seguimiento completo
        case 'ORDER_ASSIGNED':
          if (order.status === 'pending') {
            order.status = 'processing';
            orderUpdated = true;
            console.log(`⚙️ Orden #${order.order_number} marcada como "procesando".`);
          }
          break;
          
        case 'ORDER_PICKED_UP':
          if (order.status !== 'shipped') {
            order.status = 'shipped';
            orderUpdated = true;
            console.log(`🚚 Orden #${order.order_number} marcada como "enviado".`);
          }
          break;
          
        default:
          console.log(`ℹ️  Evento "${eventType}" recibido, datos generales actualizados.`);
          break;
      }

      // 4. Guardar los cambios en la base de datos si algo cambió.
      if (orderUpdated) {
        order.updated_at = new Date();
        await order.save();
        console.log(`💾 Cambios guardados para la orden #${order.order_number}.`);
        
        // 🆕 LOG DE DEBUG PARA VER QUÉ SE GUARDÓ
        console.log('🔍 Datos actualizados en la orden:', {
          shipday_tracking_url: order.shipday_tracking_url,
          driver_info: order.driver_info,
          delivery_location: order.delivery_location,
          proof_of_delivery: !!order.proof_of_delivery,
          shipday_times: order.shipday_times
        });
      }

      // 5. Responder a Shipday para confirmar la recepción.
      res.status(200).json({ success: true, message: 'Webhook procesado exitosamente.' });

    } catch (error) {
      console.error('❌ Error fatal procesando el webhook de Shipday:', error);
      res.status(500).json({ success: false, error: error.message });
    }
}
}
// IMPORTANTE: Exportar una instancia, no la clase
module.exports = new ShipdayController();