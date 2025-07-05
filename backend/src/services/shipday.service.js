// backend/src/services/shipday.service.js

const Shipday = require('shipday/integration');

class ShipDayService {
  constructor() {
    this.apiKey = process.env.SHIPDAY_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️  SHIPDAY_API_KEY no está configurada en las variables de entorno');
      return;
    }

    try {
      // Inicializar cliente de ShipDay con timeout de 10 segundos (según la documentación oficial)
      this.shipdayClient = new Shipday(this.apiKey, 10000);
      console.log('✅ ShipDay SDK inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando ShipDay SDK:', error);
      this.shipdayClient = null;
    }
  }

  // ==================== DRIVERS/CARRIERS ====================

  /**
   * Crear un nuevo conductor (carrier en ShipDay)
   * @param {Object} driverData - Datos del conductor
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async createDriver(driverData) {
    try {
      if (!this.shipdayClient) {
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

      // Usar el SDK oficial - el método puede ser addCarrier o insertCarrier
      let result;
      try {
        result = await this.shipdayClient.addCarrier(payload);
      } catch (error) {
        // Intentar métodos alternativos si el primero falla
        console.log('Intentando método alternativo...');
        try {
          result = await this.shipdayClient.insertCarrier(payload);
        } catch (error2) {
          try {
            result = await this.shipdayClient.carrier.add(payload);
          } catch (error3) {
            try {
              result = await this.shipdayClient.carrier.insert(payload);
            } catch (error4) {
              // Si ningún método funciona, lanzar el error original
              throw error;
            }
          }
        }
      }
      
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
      if (!this.shipdayClient) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      let result;
      try {
        result = await this.shipdayClient.getCarriers();
      } catch (error) {
        try {
          result = await this.shipdayClient.getAllCarriers();
        } catch (error2) {
          try {
            result = await this.shipdayClient.carrier.getAll();
          } catch (error3) {
            throw error;
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener un conductor por email
   * @param {string} email - Email del conductor
   * @returns {Promise<Object>} - Datos del conductor
   */
  async getDriver(email) {
    try {
      if (!this.shipdayClient) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      let result;
      try {
        result = await this.shipdayClient.getCarrier(email);
      } catch (error) {
        try {
          result = await this.shipdayClient.carrier.get(email);
        } catch (error2) {
          throw error;
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo conductor:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar un conductor
   * @param {string} email - Email del conductor
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Conductor actualizado
   */
  async updateDriver(email, updateData) {
    try {
      if (!this.shipdayClient) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      const payload = {
        email: email,
        name: updateData.name,
        phone: updateData.phone,
        company_name: updateData.company_name,
        driver_license: updateData.driver_license,
        vehicle_type: updateData.vehicle_type,
        vehicle_plate: updateData.vehicle_plate,
        is_active: updateData.is_active
      };

      let result;
      try {
        result = await this.shipdayClient.updateCarrier(payload);
      } catch (error) {
        try {
          result = await this.shipdayClient.carrier.update(payload);
        } catch (error2) {
          throw error;
        }
      }
      
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
      if (!this.shipdayClient) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      try {
        await this.shipdayClient.deleteCarrier(email);
      } catch (error) {
        try {
          await this.shipdayClient.carrier.delete(email);
        } catch (error2) {
          throw error;
        }
      }
      
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
      if (!this.shipdayClient) {
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
        expectedPickupTime: orderData.expectedPickupTime,
        expectedDeliveryTime: orderData.expectedDeliveryTime
      };

      console.log('📦 Creando orden en ShipDay:', payload);

      let result;
      try {
        result = await this.shipdayClient.addOrder(payload);
      } catch (error) {
        try {
          result = await this.shipdayClient.insertOrder(payload);
        } catch (error2) {
          try {
            result = await this.shipdayClient.order.add(payload);
          } catch (error3) {
            try {
              result = await this.shipdayClient.order.insert(payload);
            } catch (error4) {
              throw error;
            }
          }
        }
      }
      
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
      if (!this.shipdayClient) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      let result;
      try {
        result = await this.shipdayClient.getOrders(filters);
      } catch (error) {
        try {
          result = await this.shipdayClient.getAllOrders(filters);
        } catch (error2) {
          try {
            result = await this.shipdayClient.order.getAll(filters);
          } catch (error3) {
            throw error;
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener una orden por número
   * @param {string} orderNumber - Número de la orden
   * @returns {Promise<Object>} - Datos de la orden
   */
  async getOrder(orderNumber) {
    try {
      if (!this.shipdayClient) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      let result;
      try {
        result = await this.shipdayClient.getOrder(orderNumber);
      } catch (error) {
        try {
          result = await this.shipdayClient.order.get(orderNumber);
        } catch (error2) {
          throw error;
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo orden:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Asignar una orden a un conductor
   * @param {string} orderId - ID de la orden
   * @param {string} carrierEmail - Email del conductor
   * @returns {Promise<Object>} - Orden actualizada
   */
  async assignOrder(orderId, carrierEmail) {
    try {
      if (!this.shipdayClient) {
        throw new Error('ShipDay SDK no está inicializado. Verifica la API Key.');
      }

      let result;
      try {
        result = await this.shipdayClient.assignOrder(orderId, carrierEmail);
      } catch (error) {
        try {
          result = await this.shipdayClient.order.assign({
            orderId: orderId,
            carrierEmail: carrierEmail
          });
        } catch (error2) {
          throw error;
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error asignando orden:', error);
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
      if (!this.shipdayClient) {
        console.error('❌ ShipDay SDK no está inicializado');
        return false;
      }

      console.log('🔍 Probando conexión con ShipDay...');
      
      // Intentar obtener órdenes para verificar conectividad
      await this.getOrders({ limit: 1 });
      
      console.log('✅ Conexión con ShipDay exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión con ShipDay:', error.message);
      return false;
    }
  }

  /**
   * Explorar métodos disponibles del SDK (para debugging)
   * @returns {Array} - Lista de métodos disponibles
   */
  exploreSDKMethods() {
    if (!this.shipdayClient) {
      return [];
    }

    const methods = Object.getOwnPropertyNames(this.shipdayClient)
      .filter(name => typeof this.shipdayClient[name] === 'function')
      .filter(name => !name.startsWith('_'));

    console.log('🔍 Métodos disponibles en ShipDay SDK:', methods);
    return methods;
  }

  /**
   * Manejar errores del SDK
   * @param {Error} error - Error del SDK
   * @returns {Error} - Error personalizado
   */
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Error de validación: ${data.message || data.error || 'Datos inválidos'}`);
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
          return new Error(`Error ${status}: ${data.message || data.error || 'Error desconocido'}`);
      }
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('Error desconocido en ShipDay SDK');
    }
  }
}

module.exports = ShipDayService;