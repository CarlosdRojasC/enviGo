const axios = require('axios');

const BASE_URL = 'https://api.shipday.com';
const API_KEY = process.env.SHIPDAY_API_KEY;

class ShipDayService {
  constructor() {
    if (!API_KEY) {
      console.warn('⚠️ SHIPDAY_API_KEY no está configurada en las variables de entorno');
    } else {
      console.log('✅ ShipDay API Key configurada:', `${API_KEY.substring(0, 10)}...`);
    }
  }

  // Método simple para obtener headers
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${API_KEY}`
    };
  }

  // Manejo de errores simplificado
  handleError(error) {
    if (error.response) {
      console.error('❌ Error respuesta Shipday:', {
        status: error.response.status,
        data: error.response.data
      });
      return new Error(`Shipday API Error: ${error.response.status} - ${error.response.data?.message || 'Error desconocido'}`);
    } else if (error.request) {
      console.error('❌ Sin respuesta de Shipday:', error.message);
      return new Error('No se pudo conectar con Shipday API');
    } else {
      console.error('❌ Error configurando request:', error.message);
      return new Error(`Error de configuración: ${error.message}`);
    }
  }

  // ==================== DRIVERS ====================

  async getDrivers() {
    try {
      console.log('👥 Obteniendo conductores de Shipday...');
      
      const headers = this.getHeaders();
      const response = await axios.get(`${BASE_URL}/carriers`, { headers });
      
      console.log(`✅ ${response.data.length} conductores obtenidos`);
      return response.data || [];
      
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error.message);
      throw this.handleError(error);
    }
  }

  async getDriver(email) {
    try {
      console.log('👤 Obteniendo conductor:', email);
      
      const headers = this.getHeaders();
      const response = await axios.get(`${BASE_URL}/carriers/${email}`, { headers });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo conductor:', error.message);
      throw this.handleError(error);
    }
  }

  async createDriver(driverData) {
    try {
      console.log('👨‍💼 Creando conductor:', driverData);

      const payload = {
        name: driverData.name,
        email: driverData.email,
        phoneNumber: driverData.phone || driverData.phoneNumber,
        isActive: true
      };

      const headers = this.getHeaders();
      const response = await axios.post(`${BASE_URL}/carriers`, payload, { headers });
      
      console.log('✅ Conductor creado exitosamente');
      return response.data;

    } catch (error) {
      console.error('❌ Error creando conductor:', error.message);
      throw this.handleError(error);
    }
  }

  async updateDriver(email, updateData) {
    try {
      console.log('🔄 Actualizando conductor:', email);

      const payload = {
        name: updateData.name,
        email: email,
        phoneNumber: updateData.phone || updateData.phoneNumber,
        isActive: updateData.isActive !== undefined ? updateData.isActive : true
      };

      const headers = this.getHeaders();
      const response = await axios.put(`${BASE_URL}/carriers/${email}`, payload, { headers });
      
      console.log('✅ Conductor actualizado exitosamente');
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando conductor:', error.message);
      throw this.handleError(error);
    }
  }

  async deleteDriver(email) {
    try {
      console.log('🗑️ Eliminando conductor:', email);

      const headers = this.getHeaders();
      const response = await axios.delete(`${BASE_URL}/carriers/${email}`, { headers });
      
      console.log('✅ Conductor eliminado exitosamente');
      return response.data;
    } catch (error) {
      console.error('❌ Error eliminando conductor:', error.message);
      throw this.handleError(error);
    }
  }

  // ==================== ORDERS ====================

  async getOrders() {
    try {
      console.log('📦 Obteniendo órdenes de Shipday...');
      
      const headers = this.getHeaders();
      const response = await axios.get(`${BASE_URL}/orders`, { headers });
      
      console.log(`✅ ${response.data.length} órdenes obtenidas`);
      return response.data || [];
      
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error.message);
      throw this.handleError(error);
    }
  }

async getOrder(orderId) {
    try {
        const allOrders = await this.getOrders();
        const order = allOrders.find(o => o.orderId == orderId);

        // ✅ INICIO DE LA CORRECCIÓN
        // Si encontramos la orden y tiene datos "crudos" de la API...
        if (order && order._raw) {
            // ... nos aseguramos de que las 'podUrls' y la firma se copien
            // al nivel superior del objeto, que es donde el controlador las busca.
            order.podUrls = order._raw.podUrls || [];
            order.signatureUrl = order._raw.signatures?.[0]?.url || null;
        }
        // ✅ FIN DE LA CORRECCIÓN

        return order;
    } catch (error) {
        console.error(`Error obteniendo la orden ${orderId} de Shipday:`, error);
        return null;
    }
}

  async createOrder(orderData) {
    try {
      console.log('🚢 Creando orden en Shipday...');

      const payload = {
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        restaurantName: orderData.restaurantName || "enviGo",
        restaurantAddress: orderData.restaurantAddress || "santa hilda 1447, quilicura",
        customerEmail: orderData.customerEmail || '',
        customerPhoneNumber: orderData.customerPhoneNumber || '',
        deliveryInstruction: orderData.deliveryInstruction || '',
        deliveryFee: parseFloat(orderData.deliveryFee) || 1800,
        total: parseFloat(orderData.total) || 1,
        paymentMethod: "credit_card",
      };

      const headers = this.getHeaders();
      const response = await axios.post(`${BASE_URL}/orders`, payload, { headers });
      
      console.log('✅ Orden creada exitosamente:', response.data.orderId);
      return response.data;

    } catch (error) {
      console.error('❌ Error creando orden:', error.message);
      throw this.handleError(error);
    }
  }

  async assignOrder(orderId, driverId) {
     try {
      console.log(`🔗 Asignando orden: ${orderId} al conductor ID: ${driverId}`);

      const headers = this.getHeaders();
      
      // --- CAMBIO CLAVE: Usar la nueva URL correcta sin cuerpo (payload) ---
      const response = await axios.put(
        `${BASE_URL}/orders/assign/${orderId}/${driverId}`,
        null, // No se envía cuerpo en la petición con este endpoint
        { headers }
      );
      
      console.log('✅ Orden asignada exitosamente con el nuevo endpoint.');
      return response.data;

    } catch (error) {
      console.error('❌ Error asignando orden:', error.message);
      throw this.handleError(error);
    }
  }

  // ==================== TESTING ====================

  async testConnection() {
    try {
      console.log('🔍 Probando conexión con Shipday...');
      
      const headers = this.getHeaders();
      const response = await axios.get(`${BASE_URL}/carriers`, { headers });
      
      console.log('✅ Conexión exitosa con Shipday');
      return true;
      
    } catch (error) {
      console.error('❌ Error conectando con Shipday:', error.message);
      return false;
    }
  }
}

// Exportar como singleton
module.exports = new ShipDayService();