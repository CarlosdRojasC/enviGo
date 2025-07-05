// backend/src/services/shipday.service.js

const axios = require('axios');

class ShipDayService {
  constructor() {
    this.baseURL = 'https://api.shipday.com';
    this.apiKey = process.env.SHIPDAY_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️  SHIPDAY_API_KEY no está configurada en las variables de entorno');
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.apiKey}`
      },
      timeout: 30000
    });

    // Interceptor para logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📡 ShipDay API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ ShipDay API Response: ${response.status} - ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ ShipDay API Error: ${error.response?.status} - ${error.config?.url}`);
        console.error('Error details:', error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // ==================== DRIVERS ====================

  /**
   * Crear un nuevo conductor
   * @param {Object} driverData - Datos del conductor
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async createDriver(driverData) {
    try {
      const payload = {
        name: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        // Campos adicionales según la API de ShipDay
        company_name: driverData.company_name || '',
        driver_license: driverData.driver_license || '',
        vehicle_type: driverData.vehicle_type || 'car',
        vehicle_plate: driverData.vehicle_plate || '',
        is_active: driverData.is_active !== undefined ? driverData.is_active : true
      };

      console.log('🚚 Creando conductor en ShipDay:', payload);

      const response = await this.client.post('/drivers', payload);
      
      console.log('✅ Conductor creado exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando conductor:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener todos los conductores
   * @returns {Promise<Array>} - Lista de conductores
   */
  async getDrivers() {
    try {
      const response = await this.client.get('/drivers');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener un conductor por ID
   * @param {string} driverId - ID del conductor
   * @returns {Promise<Object>} - Datos del conductor
   */
  async getDriver(driverId) {
    try {
      const response = await this.client.get(`/drivers/${driverId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo conductor:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar un conductor
   * @param {string} driverId - ID del conductor
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Conductor actualizado
   */
  async updateDriver(driverId, updateData) {
    try {
      const payload = {
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
        company_name: updateData.company_name,
        driver_license: updateData.driver_license,
        vehicle_type: updateData.vehicle_type,
        vehicle_plate: updateData.vehicle_plate,
        is_active: updateData.is_active
      };

      const response = await this.client.put(`/drivers/${driverId}`, payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando conductor:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Eliminar un conductor
   * @param {string} driverId - ID del conductor
   * @returns {Promise<Boolean>} - True si fue eliminado
   */
  async deleteDriver(driverId) {
    try {
      await this.client.delete(`/drivers/${driverId}`);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando conductor:', error.response?.data || error.message);
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
      const payload = {
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
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

      const response = await this.client.post('/orders', payload);
      
      console.log('✅ Orden creada exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando orden:', error.response?.data || error.message);
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
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);
      if (filters.driver_id) params.append('driver_id', filters.driver_id);
      
      const response = await this.client.get(`/orders?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error.response?.data || error.message);
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
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo orden:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Asignar una orden a un conductor
   * @param {string} orderId - ID de la orden
   * @param {string} driverId - ID del conductor
   * @returns {Promise<Object>} - Orden actualizada
   */
  async assignOrder(orderId, driverId) {
    try {
      const payload = {
        driver_id: driverId
      };

      const response = await this.client.put(`/orders/${orderId}/assign`, payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error asignando orden:', error.response?.data || error.message);
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
      const payload = {
        status: status
      };

      const response = await this.client.put(`/orders/${orderId}/status`, payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando estado de orden:', error.response?.data || error.message);
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
      const response = await this.client.get(`/orders/${orderId}/tracking`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo tracking:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // ==================== WEBHOOKS ====================

  /**
   * Configurar webhook para recibir actualizaciones
   * @param {string} webhookUrl - URL del webhook
   * @param {Array} events - Eventos a suscribir
   * @returns {Promise<Object>} - Configuración del webhook
   */
  async setupWebhook(webhookUrl, events = []) {
    try {
      const payload = {
        url: webhookUrl,
        events: events.length > 0 ? events : [
          'ORDER_CREATED',
          'ORDER_ASSIGNED',
          'ORDER_PICKED_UP',
          'ORDER_DELIVERED',
          'ORDER_CANCELLED'
        ]
      };

      const response = await this.client.post('/webhooks', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error configurando webhook:', error.response?.data || error.message);
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
      console.log('🔍 Probando conexión con ShipDay...');
      
      // Intentar obtener órdenes para verificar conectividad
      await this.client.get('/orders');
      
      console.log('✅ Conexión con ShipDay exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión con ShipDay:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Manejar errores de la API
   * @param {Error} error - Error de Axios
   * @returns {Error} - Error personalizado
   */
  handleError(error) {
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
    } else if (error.request) {
      return new Error('Error de conexión con ShipDay. Verifica tu internet');
    } else {
      return new Error(`Error de configuración: ${error.message}`);
    }
  }
}

module.exports = ShipDayService;