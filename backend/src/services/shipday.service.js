// backend/src/services/shipday.service.js

const axios = require('axios');

const BASE_URL = 'https://api.shipday.com';
const API_KEY = process.env.SHIPDAY_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Basic ${API_KEY}`,
};

class ShipDayService {
  constructor() {
    if (!API_KEY) {
      console.warn('⚠️  SHIPDAY_API_KEY no está configurada en las variables de entorno');
    }
  }

  // ==================== DRIVERS ====================

  async createDriver(driverData) {
    const payload = {
      name: driverData.name,
      email: driverData.email,
      phoneNumber: driverData.phone,
      vehicleType: driverData.vehicle_type || 'car'
    };

    const res = await axios.post(`${BASE_URL}/carriers`, payload, { headers });
    return res.data;
  }

  async getDrivers() {
    const res = await axios.get(`${BASE_URL}/carriers`, { headers });
    return res.data;
  }

  async getDriver(email) {
    const res = await axios.get(`${BASE_URL}/carriers/${email}`, { headers });
    return res.data;
  }

  async updateDriver(email, updateData) {
    const payload = {
      name: updateData.name,
      email,
      phoneNumber: updateData.phone,
      vehicleType: updateData.vehicle_type,
      is_active: updateData.is_active
    };

    const res = await axios.put(`${BASE_URL}/carriers/${email}`, payload, { headers });
    return res.data;
  }

  async deleteDriver(email) {
    const res = await axios.delete(`${BASE_URL}/carriers/${email}`, { headers });
    return res.data;
  }

  // ==================== ORDERS ====================

  async createOrder(orderData) {
    const res = await axios.post(`${BASE_URL}/orders`, orderData, { headers });
    return res.data;
  }

  async getOrders() {
    const res = await axios.get(`${BASE_URL}/orders`, { headers });
    return res.data;
  }

  async getOrder(orderId) {
    const res = await axios.get(`${BASE_URL}/orders/${orderId}`, { headers });
    return res.data;
  }

  async assignOrder(orderId, email) {
    const payload = { orderId, email };
    const res = await axios.post(`${BASE_URL}/assignorder`, payload, { headers });
    return res.data;
  }

  // ==================== UTILITIES ====================

  async testConnection() {
    try {
      const result = await axios.get(`${BASE_URL}/orders?limit=1`, { headers });
      console.log('✅ Conexión con ShipDay exitosa');
      return !!result.data;
    } catch (error) {
      console.error('❌ Error de conexión con ShipDay:', error.message);
      return false;
    }
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(data?.message || `Error ${status}`);
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('Error desconocido');
    }
  }
}

module.exports = ShipDayService;
