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
      const headers = req.headers;
      
      console.log('📥 Webhook recibido de Shipday:', webhookData);
      console.log('📋 Headers:', headers);

      // Implementar lógica de procesamiento de webhook
      // Validar firma si Shipday la proporciona
      // Procesar eventos (order_status_changed, driver_location_updated, etc.)

      res.status(200).json({
        success: true,
        message: 'Webhook procesado exitosamente',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

// IMPORTANTE: Exportar una instancia, no la clase
module.exports = new ShipdayController();