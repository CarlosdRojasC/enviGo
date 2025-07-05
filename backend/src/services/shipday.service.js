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
      this.shipdayClient = new Shipday(this.apiKey, 10000); // Timeout 10s
      console.log('Métodos disponibles en shipdayClient:', Object.keys(this.shipdayClient));
console.log('Contenido del shipdayClient:', this.shipdayClient);
      this.carrierModule = this.shipdayClient.getCarriersModule();
      this.orderModule = this.shipdayClient.getOrdersModule();
      console.log('✅ ShipDay SDK y módulos cargados correctamente');
    } catch (error) {
      console.error('❌ Error inicializando ShipDay SDK:', error);
      this.shipdayClient = null;
    }
  }

  // ==================== DRIVERS ====================

  async createDriver(driverData) {
    if (!this.carrierModule) throw new Error('Módulo de carrier no inicializado');

    const payload = {
      name: driverData.name,
      email: driverData.email,
      phone: driverData.phone,
      vehicle_type: driverData.vehicle_type || 'car',
      vehicle_plate: driverData.vehicle_plate || '',
      is_active: driverData.is_active !== undefined ? driverData.is_active : true
    };

    try {
      const result = await this.carrierModule.insert(payload);
      return result;
    } catch (error) {
      console.error('❌ Error creando conductor:', error);
      throw this.handleError(error);
    }
  }

  async getDrivers() {
    if (!this.carrierModule) throw new Error('Módulo de carrier no inicializado');
    return await this.carrierModule.getAll();
  }

  async getDriver(email) {
    if (!this.carrierModule) throw new Error('Módulo de carrier no inicializado');
    return await this.carrierModule.get(email);
  }

  async updateDriver(email, updateData) {
    if (!this.carrierModule) throw new Error('Módulo de carrier no inicializado');

    const payload = {
      email: email,
      name: updateData.name,
      phone: updateData.phone,
      vehicle_type: updateData.vehicle_type,
      vehicle_plate: updateData.vehicle_plate,
      is_active: updateData.is_active
    };

    return await this.carrierModule.update(payload);
  }

  async deleteDriver(email) {
    if (!this.carrierModule) throw new Error('Módulo de carrier no inicializado');
    return await this.carrierModule.delete(email);
  }

  // ==================== ORDERS ====================

  async createOrder(orderData) {
    if (!this.orderModule) throw new Error('Módulo de orden no inicializado');

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

    const result = await this.orderModule.insert(payload);
    return result;
  }

  async getOrders(filters = {}) {
    if (!this.orderModule) throw new Error('Módulo de orden no inicializado');
    return await this.orderModule.getAll(filters);
  }

  async getOrder(orderNumber) {
    if (!this.orderModule) throw new Error('Módulo de orden no inicializado');
    return await this.orderModule.get(orderNumber);
  }

  async assignOrder(orderId, carrierEmail) {
    if (!this.orderModule) throw new Error('Módulo de orden no inicializado');

    return await this.orderModule.assign({
      orderId,
      carrierEmail
    });
  }

  // ==================== UTILITIES ====================

  async testConnection() {
    if (!this.orderModule) return false;
    try {
      await this.getOrders({ limit: 1 });
      console.log('✅ Conexión con ShipDay exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión con ShipDay:', error.message);
      return false;
    }
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400: return new Error(`Datos inválidos: ${data.message || data.error}`);
        case 401: return new Error('API Key inválida');
        case 403: return new Error('Acceso denegado');
        case 404: return new Error('Recurso no encontrado');
        case 429: return new Error('Límite de requests excedido');
        case 500: return new Error('Error interno del servidor');
        default: return new Error(`Error ${status}: ${data.message || data.error}`);
      }
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('Error desconocido');
    }
  }
}

module.exports = ShipDayService;
