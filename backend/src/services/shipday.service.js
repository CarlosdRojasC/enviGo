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
       this.requestQueue = [];
    this.isProcessingQueue = false;
    this.requestCounts = {
      minute: { count: 0, resetTime: Date.now() + 60000 },
      hour: { count: 0, resetTime: Date.now() + 3600000 }
    };
    
    // Límites más conservadores para evitar 429
    this.rateLimits = {
      maxPerMinute: 40,    // Reducido de 60 a 40
      maxPerHour: 800,     // Reducido de 1000 a 800
      baseDelay: 1500,     // Aumentado de 1000 a 1500ms
      backoffDelay: 3000   // Delay adicional después de error 429
    };
    
    this.lastRequestTime = 0;
    this.consecutiveErrors = 0;
    this.backoffUntil = 0;
  }
  
  updateRateLimitCounters() {
    const now = Date.now();
    
    // Reset contadores si han pasado los intervalos
    if (now > this.requestCounts.minute.resetTime) {
      this.requestCounts.minute = { count: 0, resetTime: now + 60000 };
    }
    
    if (now > this.requestCounts.hour.resetTime) {
      this.requestCounts.hour = { count: 0, resetTime: now + 3600000 };
    }
    
    // Incrementar contadores
    this.requestCounts.minute.count++;
    this.requestCounts.hour.count++;
  }

  /**
   * Verificar si podemos hacer una request
   */
  canMakeRequest() {
    const now = Date.now();
    
    // Verificar si estamos en backoff
    if (now < this.backoffUntil) {
      return false;
    }
    
    // Verificar límites
    if (this.requestCounts.minute.count >= this.rateLimits.maxPerMinute) {
      return false;
    }
    
    if (this.requestCounts.hour.count >= this.rateLimits.maxPerHour) {
      return false;
    }
    
    return true;
  }

  /**
   * Calcular delay necesario antes de la próxima request
   */
  calculateDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Delay base
    let delay = this.rateLimits.baseDelay;
    
    // Delay adicional basado en errores consecutivos
    if (this.consecutiveErrors > 0) {
      delay += this.consecutiveErrors * 1000; // +1s por cada error
    }
    
    // Delay adicional si estamos cerca del límite
    if (this.requestCounts.minute.count > this.rateLimits.maxPerMinute * 0.8) {
      delay += 2000; // +2s si estamos al 80% del límite
    }
    
    // Asegurar que no hagamos requests demasiado seguidas
    const minimumDelay = Math.max(0, this.rateLimits.baseDelay - timeSinceLastRequest);
    
    return Math.max(delay, minimumDelay);
  }

  /**
   * Wrapper para requests con rate limiting
   */
  async makeRateLimitedRequest(requestFn, description = 'Request') {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, description, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Procesar cola de requests
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const { requestFn, description, resolve, reject } = this.requestQueue.shift();
      
      try {
        // Esperar si no podemos hacer la request
        while (!this.canMakeRequest()) {
          const waitTime = Math.min(5000, this.requestCounts.minute.resetTime - Date.now());
          console.log(`⏳ Rate limit alcanzado, esperando ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Calcular y aplicar delay
        const delay = this.calculateDelay();
        if (delay > 0) {
          console.log(`⏱️ Aplicando delay de ${delay}ms para ${description}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Actualizar contadores
        this.updateRateLimitCounters();
        this.lastRequestTime = Date.now();
        
        // Hacer la request
        console.log(`📡 [${description}] Enviando request...`);
        const result = await requestFn();
        
        // Request exitosa
        this.consecutiveErrors = 0;
        this.backoffUntil = 0;
        
        console.log(`✅ [${description}] Request exitosa`);
        resolve(result);
        
      } catch (error) {
        console.error(`❌ [${description}] Error:`, error.message);
        
        // Manejar error 429 específicamente
        if (error.response?.status === 429) {
          this.consecutiveErrors++;
          this.backoffUntil = Date.now() + this.rateLimits.backoffDelay;
          
          console.log(`🚫 Rate limit exceeded, aplicando backoff de ${this.rateLimits.backoffDelay}ms`);
          
          // Reintentar después del backoff
          this.requestQueue.unshift({ requestFn, description, resolve, reject });
          continue;
        }
        
        // Otros errores
        this.consecutiveErrors++;
        reject(this.handleError(error));
      }
    }
    
    this.isProcessingQueue = false;
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
  const requestFn = async () => {
    console.log('👥 Obteniendo conductores de Shipday...');
    
    const headers = this.getHeaders();
    const response = await axios.get(`${BASE_URL}/carriers`, { headers });
    
    console.log(`✅ ${response.data.length} conductores obtenidos`);
    return response.data || [];
  };
  
  return this.makeRateLimitedRequest(requestFn, 'Get Drivers');
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

async getOrders(filters = {}) {
  const requestFn = async () => {
    console.log('📦 Obteniendo órdenes de Shipday...');
    
    const headers = this.getHeaders();
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(`${BASE_URL}/orders${params ? `?${params}` : ''}`, { headers });
    
    console.log(`✅ ${response.data.length} órdenes obtenidas`);
    return response.data || [];
  };
  
  return this.makeRateLimitedRequest(requestFn, 'Get Orders');
}

 async getOrder(orderId) {
  const requestFn = async () => {
    console.log('📦 Obteniendo orden:', orderId);
    
    const headers = this.getHeaders();
    const response = await axios.get(`${BASE_URL}/orders/${orderId}`, { headers });
    
    return response.data;
  };
  
  return this.makeRateLimitedRequest(requestFn, `Get Order ${orderId}`);
}
async createOrder(orderData) {
  const requestFn = async () => {
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
      paymentMethod: "credit_card"
    };

    const headers = this.getHeaders();
    const response = await axios.post(`${BASE_URL}/orders`, payload, { headers });
    
    console.log('✅ Orden creada exitosamente:', response.data.orderId);
    return response.data;
  };
  
  return this.makeRateLimitedRequest(requestFn, `Create Order ${orderData.orderNumber}`);
}


   async assignOrder(orderId, driverId) {
    const requestFn = async () => {
      const headers = this.getHeaders();
      const payload = {
        carrierId: parseInt(driverId, 10)
      };
      
      const response = await axios.put(
        `${BASE_URL}/orders/${orderId}/assign`,
        payload,
        { headers }
      );
      
      return response.data;
    };
    
    return this.makeRateLimitedRequest(requestFn, `Assign Order ${orderId}`);
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

   getRateLimitStats() {
    return {
      requestCounts: this.requestCounts,
      queueLength: this.requestQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      consecutiveErrors: this.consecutiveErrors,
      backoffUntil: this.backoffUntil,
      lastRequestTime: this.lastRequestTime
    };
  }

}


// Exportar como singleton
module.exports = new ShipDayService();