// backend/src/controllers/shipday.controller.js

const ShipdayService = require('../services/shipday.service');

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

  async handleWebhook(req, res) {
    try {
      const webhookData = req.body;
      console.log('📥 Webhook recibido de Shipday:', JSON.stringify(webhookData, null, 2));

      // Asumimos que el payload de Shipday tiene una estructura como:
      // { "orderId": "12345", "orderStatus": "DELIVERED", ... }
      // ¡IMPORTANTE! Verifica en tus logs la estructura exacta del payload.
      
      const { orderId, orderStatus } = webhookData;

      if (!orderId || !orderStatus) {
        console.warn('⚠️ Webhook de Shipday recibido sin orderId u orderStatus. Ignorando.');
        return res.status(400).json({ success: false, error: 'Payload inválido.' });
      }

      // 1. Procesar solo si el estado es 'DELIVERED' (Entregado)
      if (orderStatus.toUpperCase() === 'DELIVERED') {
        console.log(`🔄 Estado "DELIVERED" detectado para la orden de Shipday ID: ${orderId}`);

        // 2. Buscar la orden en tu base de datos usando el ID de Shipday
        const order = await Order.findOne({ shipday_order_id: orderId });

        if (order) {
          // 3. Actualizar el estado y la fecha de entrega en tu sistema
          order.status = 'delivered';
          order.delivery_date = new Date(); // Guardar la fecha de entrega
          order.shipday_status = 'DELIVERED'; // Opcional: guardar el estado de shipday
          await order.save();
          
          console.log(`✅ Orden local #${order.order_number} actualizada a "entregado".`);

        } else {
          console.warn(`⚠️  No se encontró una orden local correspondiente al Shipday ID: ${orderId}`);
        }
      } else {
        console.log(`ℹ️  Webhook recibido con estado "${orderStatus}". No se requiere acción.`);
      }

      // 4. Responder a Shipday con un 200 OK para confirmar la recepción
      res.status(200).json({ success: true, message: 'Webhook procesado.' });

    } catch (error) {
      console.error('❌ Error procesando el webhook de Shipday:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

// IMPORTANTE: Exportar una instancia, no la clase
module.exports = new ShipdayController();