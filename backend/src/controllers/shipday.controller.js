// backend/src/controllers/shipday.controller.js

const ShipDayService = require('../services/shipday.service');
const { ERRORS } = require('../config/constants');

class ShipDayController {
  constructor() {
    this.shipdayService = new ShipDayService();
  }

  // ==================== DRIVERS ====================

  /**
   * Crear un nuevo conductor
   */
  async createDriver(req, res) {
    try {
      const { name, email, phone, company_name, driver_license, vehicle_type, vehicle_plate, is_active } = req.body;

      // Validaciones básicas
      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Nombre, email y teléfono son requeridos'
        });
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de email inválido'
        });
      }

      const driverData = {
        name,
        email,
        phone,
        company_name,
        driver_license,
        vehicle_type,
        vehicle_plate,
        is_active
      };

      const result = await this.shipdayService.createDriver(driverData);

      res.status(201).json({
        success: true,
        message: 'Conductor creado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error creando conductor:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
        details: error.message
      });
    }
  }

  /**
   * Obtener todos los conductores
   */
  async getDrivers(req, res) {
    try {
      const drivers = await this.shipdayService.getDrivers();

      res.json({
        success: true,
        data: drivers
      });

    } catch (error) {
      console.error('Error obteniendo conductores:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener un conductor por ID
   */
  async getDriver(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID del conductor es requerido'
        });
      }

      const driver = await this.shipdayService.getDriver(id);

      res.json({
        success: true,
        data: driver
      });

    } catch (error) {
      console.error('Error obteniendo conductor:', error);
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          error: 'Conductor no encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar un conductor
   */
  async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID del conductor es requerido'
        });
      }

      const result = await this.shipdayService.updateDriver(id, updateData);

      res.json({
        success: true,
        message: 'Conductor actualizado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error actualizando conductor:', error);
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          error: 'Conductor no encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar un conductor
   */
  async deleteDriver(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID del conductor es requerido'
        });
      }

      await this.shipdayService.deleteDriver(id);

      res.json({
        success: true,
        message: 'Conductor eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando conductor:', error);
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          error: 'Conductor no encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  // ==================== ORDERS ====================

  /**
   * Crear una nueva orden
   */
  async createOrder(req, res) {
    try {
      const orderData = req.body;

      // Validaciones básicas
      if (!orderData.orderNumber || !orderData.customerName || !orderData.customerAddress) {
        return res.status(400).json({
          success: false,
          error: 'Número de orden, nombre del cliente y dirección son requeridos'
        });
      }

      const result = await this.shipdayService.createOrder(orderData);

      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error creando orden:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener todas las órdenes
   */
  async getOrders(req, res) {
    try {
      const filters = req.query;
      const orders = await this.shipdayService.getOrders(filters);

      res.json({
        success: true,
        data: orders
      });

    } catch (error) {
      console.error('Error obteniendo órdenes:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener una orden por ID
   */
  async getOrder(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de la orden es requerido'
        });
      }

      const order = await this.shipdayService.getOrder(id);

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      console.error('Error obteniendo orden:', error);
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          error: 'Orden no encontrada'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignar una orden a un conductor
   */
  async assignOrder(req, res) {
    try {
      const { id } = req.params;
      const { driver_id } = req.body;

      if (!id || !driver_id) {
        return res.status(400).json({
          success: false,
          error: 'ID de la orden y ID del conductor son requeridos'
        });
      }

      const result = await this.shipdayService.assignOrder(id, driver_id);

      res.json({
        success: true,
        message: 'Orden asignada exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error asignando orden:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar estado de una orden
   */
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          error: 'ID de la orden y estado son requeridos'
        });
      }

      const validStatuses = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Estados válidos: ${validStatuses.join(', ')}`
        });
      }

      const result = await this.shipdayService.updateOrderStatus(id, status);

      res.json({
        success: true,
        message: 'Estado de orden actualizado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error actualizando estado de orden:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  // ==================== TRACKING ====================

  /**
   * Obtener tracking de una orden
   */
  async getOrderTracking(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de la orden es requerido'
        });
      }

      const tracking = await this.shipdayService.getOrderTracking(id);

      res.json({
        success: true,
        data: tracking
      });

    } catch (error) {
      console.error('Error obteniendo tracking:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  // ==================== WEBHOOKS ====================

  /**
   * Configurar webhook
   */
  async setupWebhook(req, res) {
    try {
      const { webhook_url, events } = req.body;

      if (!webhook_url) {
        return res.status(400).json({
          success: false,
          error: 'URL del webhook es requerida'
        });
      }

      const result = await this.shipdayService.setupWebhook(webhook_url, events);

      res.json({
        success: true,
        message: 'Webhook configurado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error configurando webhook:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Manejar webhook entrante de ShipDay
   */
  async handleWebhook(req, res) {
    try {
      const { event, order, timestamp } = req.body;

      console.log('📥 Webhook recibido de ShipDay:', {
        event,
        order_id: order?.id,
        timestamp
      });

      // Procesar diferentes tipos de eventos
      switch (event) {
        case 'ORDER_CREATED':
          console.log('🆕 Nueva orden creada:', order?.id);
          break;
        case 'ORDER_ASSIGNED':
          console.log('👨‍💼 Orden asignada:', order?.id);
          break;
        case 'ORDER_PICKED_UP':
          console.log('📦 Orden recogida:', order?.id);
          break;
        case 'ORDER_DELIVERED':
          console.log('✅ Orden entregada:', order?.id);
          break;
        case 'ORDER_CANCELLED':
          console.log('❌ Orden cancelada:', order?.id);
          break;
        default:
          console.log('❓ Evento desconocido:', event);
      }

      // Aquí puedes agregar lógica para actualizar tu base de datos
      // Por ejemplo, actualizar el estado de la orden en tu sistema

      res.json({
        success: true,
        message: 'Webhook procesado exitosamente'
      });

    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Error procesando webhook'
      });
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Probar conexión con ShipDay
   */
  async testConnection(req, res) {
    try {
      const isConnected = await this.shipdayService.testConnection();

      if (isConnected) {
        res.json({
          success: true,
          message: 'Conexión con ShipDay exitosa',
          api_key_configured: !!process.env.SHIPDAY_API_KEY
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'No se pudo conectar con ShipDay'
        });
      }

    } catch (error) {
      console.error('Error probando conexión:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error probando conexión'
      });
    }
  }
}

// ✅ IMPORTANTE: Crear instancia correctamente con binding
const shipdayController = new ShipDayController();

// Bind all methods to the instance to preserve 'this' context
Object.getOwnPropertyNames(ShipDayController.prototype).forEach(method => {
  if (method !== 'constructor' && typeof shipdayController[method] === 'function') {
    shipdayController[method] = shipdayController[method].bind(shipdayController);
  }
});

module.exports = shipdayController;