// frontend/src/services/shipday.js

import { api } from './api'

export const shipdayService = {
  // ==================== CONEXIÓN ====================
  
  /**
   * Probar conexión con ShipDay
   */
  testConnection: () => {
    return api.get('/shipday/test-connection')
  },

  // ==================== DRIVERS ====================
  
  /**
   * Obtener todos los conductores
   */
  getDrivers: () => {
    return api.get('/shipday/drivers')
  },

  /**
   * Obtener un conductor específico
   */
  getDriver: (id) => {
    return api.get(`/shipday/drivers/${id}`)
  },

  /**
   * Crear nuevo conductor
   */
  createDriver: (driverData) => {
    console.log('🔍 Creando conductor con:', driverData)
    return api.post('/shipday/drivers', driverData)
  },

  /**
   * Actualizar conductor
   */
  updateDriver: (id, driverData) => {
    return api.put(`/shipday/drivers/${id}`, driverData)
  },

  /**
   * Eliminar conductor
   */
  deleteDriver: (id) => {
    return api.delete(`/shipday/drivers/${id}`)
  },

  // ==================== ORDERS ====================
  
  /**
   * Obtener todas las órdenes
   */
  getOrders: (filters = {}) => {
    const params = new URLSearchParams(filters).toString()
    return api.get(`/shipday/orders${params ? `?${params}` : ''}`)
  },

  /**
   * Obtener una orden específica
   */
  getOrder: (id) => {
    return api.get(`/shipday/orders/${id}`)
  },

  /**
   * Crear nueva orden
   */
  createOrder: (orderData) => {
    return api.post('/shipday/orders', orderData)
  },

  /**
   * Asignar orden a conductor
   */
  async assignOrder(orderId, driverId) {
    try {
      console.log(`🔗 Asignando orden: ${orderId} al conductor ID: ${driverId} usando el método recomendado...`);

      const headers = this.getHeaders();
      
      // Preparamos el payload con el ID del conductor
      const payload = {
        carrierId: parseInt(driverId, 10) // Shipday espera que el carrierId sea un número
      };

      // --- CAMBIO CLAVE: Usamos el endpoint recomendado por tu log de investigación ---
      const response = await axios.put(
        `${BASE_URL}/orders/${orderId}/assign`,
        payload, // Se envía el payload con el carrierId
        { headers }
      );
      
      console.log('✅ Orden asignada exitosamente con el método recomendado.');
      return response.data; // Esta respuesta debería contener el trackingLink

    } catch (error) {
      console.error('❌ Error asignando orden con el método recomendado:', error.message);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar estado de orden
   */
  updateOrderStatus: (orderId, status) => {
    return api.put(`/shipday/orders/${orderId}/status`, { status })
  },

  // ==================== TRACKING ====================
  
  /**
   * Obtener tracking de una orden
   */
  getOrderTracking: (orderId) => {
    return api.get(`/shipday/orders/${orderId}/tracking`)
  },

  // ==================== WEBHOOKS ====================
  
  /**
   * Configurar webhook
   */
  setupWebhook: (webhookUrl, events = []) => {
    return api.post('/shipday/webhooks/setup', {
      webhook_url: webhookUrl,
      events
    })
  },

  // ==================== UTILITIES ====================
  
  /**
   * Validar datos de conductor
   */
  validateDriver: (driverData) => {
    const errors = {}

    if (!driverData.name || driverData.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres'
    }

    if (!driverData.email) {
      errors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverData.email)) {
      errors.email = 'El formato del email es inválido'
    }

    if (!driverData.phone) {
      errors.phone = 'El teléfono es requerido'
    } else if (!/^[\d\s\-\+\(\)]{8,15}$/.test(driverData.phone)) {
      errors.phone = 'El formato del teléfono es inválido'
    }

    if (driverData.vehicle_type && !['car', 'motorcycle', 'bicycle', 'truck', 'van'].includes(driverData.vehicle_type)) {
      errors.vehicle_type = 'Tipo de vehículo inválido'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  /**
   * Validar datos de orden
   */
  validateOrder: (orderData) => {
    const errors = {}

    if (!orderData.orderNumber || orderData.orderNumber.trim().length < 3) {
      errors.orderNumber = 'El número de orden debe tener al menos 3 caracteres'
    }

    if (!orderData.customerName || orderData.customerName.trim().length < 2) {
      errors.customerName = 'El nombre del cliente debe tener al menos 2 caracteres'
    }

    if (!orderData.customerAddress || orderData.customerAddress.trim().length < 5) {
      errors.customerAddress = 'La dirección debe tener al menos 5 caracteres'
    }

    if (orderData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderData.customerEmail)) {
      errors.customerEmail = 'El formato del email es inválido'
    }

    if (orderData.customerPhone && !/^[\d\s\-\+\(\)]{8,15}$/.test(orderData.customerPhone)) {
      errors.customerPhone = 'El formato del teléfono es inválido'
    }

    if (orderData.total && (isNaN(orderData.total) || orderData.total < 0)) {
      errors.total = 'El total debe ser un número positivo'
    }

    if (orderData.paymentMethod && !['CASH', 'CARD', 'ONLINE', 'CREDIT_CARD', 'CARD_PHONE'].includes(orderData.paymentMethod)) {
      errors.paymentMethod = 'Método de pago inválido'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  /**
   * Formatear datos de conductor para la API
   */
  formatDriverData: (formData) => {
    return {
      name: formData.name?.trim(),
      email: formData.email?.trim().toLowerCase(),
      phone: formData.phone?.trim(),
      company_name: formData.company_name?.trim() || '',
      driver_license: formData.driver_license?.trim() || '',
      vehicle_type: formData.vehicle_type || 'car',
      vehicle_plate: formData.vehicle_plate?.trim() || '',
      is_active: formData.is_active !== undefined ? formData.is_active : true
    }
  },

  /**
   * Formatear datos de orden para la API
   */
  formatOrderData: (formData) => {
    return {
      orderNumber: formData.orderNumber?.trim(),
      customerName: formData.customerName?.trim(),
      customerAddress: formData.customerAddress?.trim(),
      customerEmail: formData.customerEmail?.trim() || '',
      customerPhone: formData.customerPhone?.trim() || '',
      restaurantName: formData.restaurantName?.trim() || '',
      restaurantAddress: formData.restaurantAddress?.trim() || '',
      restaurantPhone: formData.restaurantPhone?.trim() || '',
      deliveryInstruction: formData.deliveryInstruction?.trim() || '',
      deliveryFee: parseFloat(formData.deliveryFee) || 0,
      tax: parseFloat(formData.tax) || 0,
      discount: parseFloat(formData.discount) || 0,
      total: parseFloat(formData.total) || 0,
      paymentMethod: formData.paymentMethod || 'credit_card',
      orderItems: formData.orderItems || [],
      expectedPickupTime: formData.expectedPickupTime || null,
      expectedDeliveryTime: formData.expectedDeliveryTime || null
    }
  },

  /**
   * Obtener estados de orden disponibles
   */
  getOrderStatuses: () => {
    return [
      { value: 'PENDING', label: 'Pendiente', color: 'orange' },
      { value: 'ASSIGNED', label: 'Asignado', color: 'blue' },
      { value: 'PICKED_UP', label: 'Recogido', color: 'purple' },
      { value: 'DELIVERED', label: 'Entregado', color: 'green' },
      { value: 'CANCELLED', label: 'Cancelado', color: 'red' }
    ]
  },

  /**
   * Obtener tipos de vehículo disponibles
   */
  getVehicleTypes: () => {
    return [
      { value: 'car', label: 'Automóvil', icon: '🚗' },
      { value: 'motorcycle', label: 'Motocicleta', icon: '🏍️' },
      { value: 'bicycle', label: 'Bicicleta', icon: '🚴' },
      { value: 'truck', label: 'Camión', icon: '🚛' },
      { value: 'van', label: 'Furgoneta', icon: '🚐' }
    ]
  },

  /**
   * Obtener métodos de pago disponibles
   */
  getPaymentMethods: () => {
    return [
      { value: 'CASH', label: 'Efectivo', icon: '💵' },
      { value: 'CARD', label: 'Tarjeta', icon: '💳' },
      { value: 'ONLINE', label: 'Pago Online', icon: '🌐' },
      { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito', icon: '💳' },
      { value: 'CARD_PHONE', label: 'Pago por Teléfono', icon: '📱' }
    ]
  }
}

export default shipdayService