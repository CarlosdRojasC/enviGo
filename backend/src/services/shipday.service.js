// backend/src/services/shipday.service.js

const Shipday = require('shipday/integration');

class ShipDayService {
  constructor() {
    this.apiKey = process.env.SHIPDAY_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️  SHIPDAY_API_KEY no está configurada en las variables de entorno');
      return;
    }

    // Inicializar cliente de ShipDay con timeout de 10 segundos
    this.client = new Shipday(this.apiKey, 10000);
    
    console.log('✅ ShipDay SDK inicializado correctamente');
  }

  // ==================== DRIVERS ====================

  /**
   * Crear un nuevo conductor
   * @param {Object} driverData - Datos del conductor
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async createDriver(driverData) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const payload = {
        name: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        company_name: driverData.company_name || '',
        driver_license: driverData.driver_license || '',
        vehicle_type: driverData.vehicle_type || 'car',
        vehicle_plate: driverData.vehicle_plate || '',
        is_active: driverData.is_active !== undefined ? driverData.is_active : true
      };

      console.log('🚚 Creando conductor en ShipDay:', payload);

      const result = await this.client.driver.insert(payload);
      
      console.log('✅ Conductor creado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creando conductor:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener todos los conductores
   * @returns {Promise<Array>} - Lista de conductores
   */
  async getDrivers() {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const result = await this.client.driver.getAll();
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener un conductor por email (ShipDay usa email como ID único)
   * @param {string} email - Email del conductor
   * @returns {Promise<Object>} - Datos del conductor
   */
  async getDriver(email) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const result = await this.client.driver.get(email);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo conductor:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar un conductor
   * @param {string} email - Email del conductor (ID único)
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Conductor actualizado
   */
  async updateDriver(email, updateData) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const payload = {
        email: email, // ShipDay usa email como identificador único
        name: updateData.name,
        phone: updateData.phone,
        company_name: updateData.company_name,
        driver_license: updateData.driver_license,
        vehicle_type: updateData.vehicle_type,
        vehicle_plate: updateData.vehicle_plate,
        is_active: updateData.is_active
      };

      const result = await this.client.driver.update(payload);
      return result;
    } catch (error) {
      console.error('❌ Error actualizando conductor:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Eliminar un conductor
   * @param {string} email - Email del conductor
   * @returns {Promise<Boolean>} - True si fue eliminado
   */
  async deleteDriver(email) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      await this.client.driver.delete(email);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando conductor:', error);
      throw this.handleError(error);
    }
  }

  // ==================== ORDERS ====================

  /**
   * Crear una nueva orden
   * @param {Object} orderData - Datos de la orden
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async createOrder(orderData) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const payload = {
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        customerEmail: orderData.customerEmail || '',
        customerPhone: orderData.customerPhone || '',
        restaurantName: orderData.restaurantName || '',
        restaurantAddress: orderData.restaurantAddress || '',
        restaurantPhone: orderData.restaurantPhone || '',
        deliveryInstruction: orderData.deliveryInstruction || '',
        deliveryFee: orderData.deliveryFee || 0,
        tips: orderData.tips || 0,
        tax: orderData.tax || 0,
        discount: orderData.discount || 0,
        total: orderData.total || 0,
        paymentMethod: orderData.paymentMethod || 'CASH',
        orderItems: orderData.orderItems || [],
        // Fechas programadas
        expectedPickupTime: orderData.expectedPickupTime,
        expectedDeliveryTime: orderData.expectedDeliveryTime
      };

      console.log('📦 Creando orden en ShipDay:', payload);

      const result = await this.client.order.insert(payload);
      
      console.log('✅ Orden creada exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creando orden:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener todas las órdenes
   * @param {Object} filters - Filtros para las órdenes
   * @returns {Promise<Array>} - Lista de órdenes
   */
  async getOrders(filters = {}) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      // El SDK de ShipDay maneja los filtros automáticamente
      const result = await this.client.order.getAll(filters);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener una orden por ID
   * @param {string} orderId - ID de la orden
   * @returns {Promise<Object>} - Datos de la orden
   */
  async getOrder(orderId) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const result = await this.client.order.get(orderId);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo orden:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Asignar una orden a un conductor
   * @param {string} orderId - ID de la orden
   * @param {string} driverEmail - Email del conductor
   * @returns {Promise<Object>} - Orden actualizada
   */
  async assignOrder(orderId, driverEmail) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const result = await this.client.order.assign({
        orderId: orderId,
        driverEmail: driverEmail
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error asignando orden:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar estado de una orden
   * @param {string} orderId - ID de la orden
   * @param {string} status - Nuevo estado
   * @returns {Promise<Object>} - Orden actualizada
   */
  async updateOrderStatus(orderId, status) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const result = await this.client.order.updateStatus({
        orderId: orderId,
        status: status
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error actualizando estado de orden:', error);
      throw this.handleError(error);
    }
  }

  // ==================== TRACKING ====================

  /**
   * Obtener tracking de una orden
   * @param {string} orderId - ID de la orden
   * @returns {Promise<Object>} - Información de tracking
   */
  async getOrderTracking(orderId) {
    try {
      if (!this.client) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const result = await this.client.order.getTracking(orderId);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo tracking:', error);
      throw this.handleError(error);
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Verificar conectividad con ShipDay
   * @returns {Promise<Boolean>} - True si la conexión es exitosa
   */
  async testConnection() {
    try {
      if (!this.client) {
        console.error('❌ ShipDay SDK no está inicializado');
        return false;
      }

      console.log('🔍 Probando conexión con ShipDay...');
      
      // Intentar obtener órdenes para verificar conectividad
      await this.client.order.getAll({ limit: 1 });
      
      console.log('✅ Conexión con ShipDay exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión con ShipDay:', error.message);
      return false;
    }
  }

  /**
   * Manejar errores del SDK
   * @param {Error} error - Error del SDK
   * @returns {Error} - Error personalizado
   */
  handleError(error) {
    // El SDK de ShipDay ya maneja los errores de HTTP
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Error de validación: ${data.message || 'Datos inválidos'}`);
        case 401:
          return new Error('API Key inválida o no autorizada');
        case 403:
          return new Error('Acceso denegado. Verifica permisos de la API Key');
        case 404:
          return new Error('Recurso no encontrado');
        case 429:
          return new Error('Límite de requests excedido. Intenta más tarde');
        case 500:
          return new Error('Error interno del servidor de ShipDay');
        default:
          return new Error(`Error ${status}: ${data.message || 'Error desconocido'}`);
      }
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('Error desconocido en ShipDay SDK');
    }
  }
}

module.exports = ShipDayService;