// backend/src/services/shipday.service.js

const axios = require('axios');

const BASE_URL = 'https://api.shipday.com';
const API_KEY = process.env.SHIPDAY_API_KEY;

class ShipDayService {
  constructor() {
    if (!API_KEY) {
      console.warn('⚠️  SHIPDAY_API_KEY no está configurada en las variables de entorno');
    } else {
      console.log('✅ ShipDay API Key configurada:', `${API_KEY.substring(0, 10)}...`);
    }
    this.workingFormat = null; // Para almacenar el formato de auth que funciona
    
    // ========== NUEVO: RATE LIMITING ==========
    this.lastRequestTime = 0;
    this.minRequestInterval = 250; // 250ms entre requests (4 requests/segundo máximo)
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // ========== RETRY CONFIGURATION ==========
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 segundo
  }

  // ========== NUEVO: RATE LIMITING ==========
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // ========== NUEVO: RETRY CON BACKOFF EXPONENCIAL ==========
  async retryWithBackoff(fn, context = 'operación', attempt = 1) {
    try {
      await this.waitForRateLimit();
      return await fn();
    } catch (error) {
      const isRateLimitError = 
        error.response?.status === 429 || 
        error.message?.toLowerCase().includes('rate limit') ||
        error.message?.toLowerCase().includes('límite') ||
        error.response?.data?.errorMessage?.toLowerCase().includes('rate limit') ||
        error.response?.data?.errorMessage?.toLowerCase().includes('limit exceeded');

      if (isRateLimitError && attempt <= this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000; // Backoff exponencial + jitter
        console.log(`🔄 Rate limit detectado en ${context}. Reintento ${attempt}/${this.maxRetries} en ${Math.round(delay)}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, context, attempt + 1);
      }
      
      throw error;
    }
  }

  // Método para probar diferentes formatos de autenticación
  getHeaders(format = 1) {
    const baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    const formats = {
      1: { ...baseHeaders, 'Authorization': `Basic ${API_KEY}` },
      2: { ...baseHeaders, 'Authorization': API_KEY },
      3: { ...baseHeaders, 'Authorization': `Bearer ${API_KEY}` },
      4: { ...baseHeaders, 'X-API-Key': API_KEY },
    };
    return formats[format] || formats[1];
  }

  // ==================== DRIVERS ====================

  async createDriver(driverData) {
    return this.retryWithBackoff(async () => {
      const payload = {
        name: driverData.name,
        email: driverData.email,
        phoneNumber: driverData.phone,
        vehicleType: driverData.vehicle_type || 'car'
      };

      console.log('🚚 Enviando payload a ShipDay con rate limiting:', payload);

      // Probar diferentes formatos de autenticación
      const authFormats = [
        { name: 'Basic + API_KEY', headers: this.getHeaders(1) },
        { name: 'Solo API_KEY', headers: this.getHeaders(2) },
        { name: 'Bearer + API_KEY', headers: this.getHeaders(3) },
        { name: 'X-API-Key header', headers: this.getHeaders(4) }
      ];

      let lastError;
      
      for (const format of authFormats) {
        try {
          console.log(`🔍 Probando formato: ${format.name}`);
          
          const res = await axios.post(`${BASE_URL}/carriers`, payload, { headers: format.headers });
          console.log(`✅ ¡ÉXITO con formato ${format.name}!`, res.data);
          
          // Si funciona, actualizar el método getHeaders por defecto
          this.workingFormat = format.headers;
          return res.data;
          
        } catch (error) {
          console.log(`❌ Formato ${format.name} falló:`, error.response?.status, error.response?.data?.errorMessage);
          lastError = error;
          continue;
        }
      }

      // Si ningún formato funcionó, lanzar el último error
      console.error('❌ Todos los formatos de autenticación fallaron');
      throw this.handleError(lastError);
    }, 'crear conductor');
  }

  async getDrivers() {
    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      console.log('🚗 Obteniendo conductores con rate limiting...');
      
      const res = await axios.get(`${BASE_URL}/carriers`, { headers });
      const driversData = Array.isArray(res.data) ? res.data : res.data.data || res.data.carriers || [];
      
      if (!Array.isArray(driversData)) {
        console.error('❌ Los datos de conductores de Shipday no son un array.');
        return [];
      }
      
      return driversData.map(driver => ({
        ...driver,
        id: driver.id,
        carrierId: driver.id,
        isActive: Boolean(driver.isActive),
        isOnShift: Boolean(driver.isOnShift),
        status: this.calculateDriverStatus(driver)
      }));
    }, 'obtener conductores');
  }

  calculateDriverStatus(driver) {
    if (!driver.isActive) return 'inactive';
    if (driver.isOnShift) return 'working';
    return 'available';
  }

  async getDriver(email) {
    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.get(`${BASE_URL}/carriers/${email}`, { headers });
      return res.data;
    }, `obtener conductor ${email}`);
  }

  async updateDriver(email, updateData) {
    return this.retryWithBackoff(async () => {
      const payload = {
        name: updateData.name,
        email,
        phoneNumber: updateData.phone || updateData.phoneNumber,
        isActive: updateData.isActive,
        codeName: updateData.codeName || '',
        areaId: updateData.areaId || null
      };

      console.log('🔄 Actualizando conductor en ShipDay con rate limiting:', payload);

      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.put(`${BASE_URL}/carriers/${email}`, payload, { headers });
      
      console.log('✅ Conductor actualizado:', res.data);
      return res.data;
    }, `actualizar conductor ${email}`);
  }

  async deleteDriver(email) {
    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.delete(`${BASE_URL}/carriers/${email}`, { headers });
      return res.data;
    }, `eliminar conductor ${email}`);
  }

  // ==================== ORDERS ====================

  /**
   * ✅ CORREGIDO: Crea una orden en Shipday con rate limiting
   */
  async createOrder(orderData) {
    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      
      const payload = {
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        restaurantName: "enviGo", // <-- VALOR FIJO
        restaurantAddress: "santa hilda 1447, quilicura", // <-- VALOR FIJO
        customerEmail: orderData.customerEmail,
        customerPhoneNumber: orderData.customerPhoneNumber,
        deliveryInstruction: orderData.deliveryInstruction,
        deliveryFee: 1800,
      };

      console.log('📦 Enviando payload de creación de orden a Shipday con rate limiting:', JSON.stringify(payload, null, 2));
      const res = await axios.post(`${BASE_URL}/orders`, payload, { headers });
      
      return res.data;
    }, `crear orden ${orderData.orderNumber}`);
  }

  async assignOrderNewUrl(orderId, carrierId) {
    if (!orderId || !carrierId) {
      throw new Error('El orderId y el carrierId son requeridos para el nuevo método.');
    }

    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      const url = `${BASE_URL}/orders/assign/${orderId}/${carrierId}`;
      
      console.log(`🚀 Probando NUEVO método de asignación con la URL sugerida...`);
      console.log(`🌐 URL: PUT ${url}`);
      
      const response = await axios.put(url, {}, { headers });
      
      console.log('✅ ¡ÉXITO con el nuevo método de asignación!:', response.data);
      return response.data;
    }, `asignación nueva URL (orden ${orderId})`);
  }

  /**
   * ✅ ASIGNACIÓN MEJORADA CON RATE LIMITING Y MÚLTIPLES MÉTODOS
   */
  async assignOrder(orderId, driverId) {
    console.log(`🎯 Iniciando asignación con rate limiting: orden ${orderId} → conductor ${driverId}`);
    
    // Método 1: Endpoint oficial (recomendado por documentación)
    try {
      return await this.retryWithBackoff(async () => {
        const headers = this.workingFormat || this.getHeaders(1);
        
        const payload = {
          carrierId: parseInt(driverId)
        };
        
        console.log(`🔵 Método 1: PUT /orders/${orderId}/assign`);
        const response = await axios.put(`${BASE_URL}/orders/${orderId}/assign`, payload, { headers });
        
        console.log('✅ Método 1 exitoso:', response.data);
        return response.data;
        
      }, `asignación método 1 (orden ${orderId})`);
      
    } catch (error1) {
      console.log('❌ Método 1 falló:', error1.message);
      
      // Método 2: Endpoint alternativo
      try {
        return await this.retryWithBackoff(async () => {
          const headers = this.workingFormat || this.getHeaders(1);
          
          console.log(`🔵 Método 2: PUT /orders/assign/${orderId}/${driverId}`);
          const response = await axios.put(`${BASE_URL}/orders/assign/${orderId}/${driverId}`, {}, { headers });
          
          console.log('✅ Método 2 exitoso:', response.data);
          return response.data;
          
        }, `asignación método 2 (orden ${orderId})`);
        
      } catch (error2) {
        console.log('❌ Método 2 falló:', error2.message);
        
        // Método 3: Variaciones del payload
        try {
          return await this.assignOrderWithVariations(orderId, driverId);
          
        } catch (error3) {
          console.error('❌ Todos los métodos de asignación fallaron');
          
          // Si es error de rate limit, lanzar mensaje específico
          if (error1.message?.toLowerCase().includes('límite') || 
              error1.message?.toLowerCase().includes('rate limit') ||
              error1.response?.status === 429) {
            throw new Error('Límite de requests excedido. Intenta más tarde');
          }
          
          // Lanzar el primer error que es el más relevante
          throw this.handleError(error1);
        }
      }
    }
  }

  /**
   * ✅ VARIACIONES: Intentar diferentes formatos de payload con rate limiting
   */
  async assignOrderWithVariations(orderId, driverId) {
    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      
      console.log('🔄 Probando variaciones del payload para asignación...');
      
      const payloadVariations = [
        // Variación 1: carrierId como string
        { carrierId: String(driverId) },
        
        // Variación 2: con campo adicional
        { carrierId: parseInt(driverId), assignType: 'manual' },
        
        // Variación 3: formato alternativo que algunas APIs usan
        { driver_id: parseInt(driverId) },
        { driverId: parseInt(driverId) },
        
        // Variación 4: con más campos que podrían ser requeridos
        { 
          carrierId: parseInt(driverId),
          assignedBy: 'api',
          timestamp: new Date().toISOString()
        }
      ];
      
      let lastError;
      
      for (let i = 0; i < payloadVariations.length; i++) {
        const payload = payloadVariations[i];
        
        try {
          console.log(`🔍 Variación ${i + 1}:`, payload);
          
          // Aplicar rate limiting entre variaciones
          await this.waitForRateLimit();
          
          const response = await axios.put(`${BASE_URL}/orders/${orderId}/assign`, payload, { headers });
          
          console.log(`✅ Éxito con variación ${i + 1}:`, response.data);
          return response.data;
          
        } catch (error) {
          console.log(`❌ Variación ${i + 1} falló:`, {
            status: error.response?.status,
            data: error.response?.data
          });
          lastError = error;
          continue;
        }
      }
      
      console.error('❌ Todas las variaciones fallaron');
      throw this.handleError(lastError);
      
    }, `variaciones asignación orden ${orderId}`);
  }

  /**
   * ✅ MÉTODO MEJORADO: Obtener conductor con validación y rate limiting
   */
  async getValidatedDriver(driverId) {
    return this.retryWithBackoff(async () => {
      console.log(`🔍 Validando conductor ${driverId}...`);
      
      const drivers = await this.getDrivers();
      console.log(`📋 Total conductores encontrados: ${drivers.length}`);
      
      // Buscar conductor por ID (probando como string y número)
      const driver = drivers.find(d => 
        d.id == driverId || 
        d.carrierId == driverId ||
        String(d.id) === String(driverId) ||
        String(d.carrierId) === String(driverId)
      );
      
      if (!driver) {
        console.log('❌ Conductor no encontrado. Conductores disponibles:', 
          drivers.map(d => ({ id: d.id, carrierId: d.carrierId, email: d.email, name: d.name }))
        );
        throw new Error(`Conductor con ID ${driverId} no encontrado`);
      }
      
      console.log('✅ Conductor validado:', {
        id: driver.id,
        carrierId: driver.carrierId,
        email: driver.email,
        name: driver.name,
        isActive: driver.isActive,
        isOnShift: driver.isOnShift
      });
      
      // Verificar que el conductor esté disponible
      if (!driver.isActive) {
        throw new Error(`El conductor ${driver.name} no está activo`);
      }
      
      return driver;
      
    }, `validar conductor ${driverId}`);
  }

  /**
   * ✅ MÉTODO COMPLETO: Asignar con validación completa y rate limiting
   */
  async assignOrderWithValidation(orderId, driverId) {
    try {
      console.log(`🚀 Iniciando asignación completa: orden ${orderId} -> conductor ${driverId}`);
      
      // Paso 1: Validar que el conductor existe y está disponible
      const driver = await this.getValidatedDriver(driverId);
      
      // Paso 2: Verificar que la orden existe en Shipday
      console.log(`🔍 Verificando que la orden ${orderId} existe en Shipday...`);
      try {
        const orderInfo = await this.getOrder(orderId);
        console.log('✅ Orden encontrada en Shipday:', {
          orderId: orderInfo.orderId,
          customerName: orderInfo.customerName,
          status: orderInfo.orderStatus
        });
      } catch (orderError) {
        throw new Error(`La orden ${orderId} no existe en Shipday: ${orderError.message}`);
      }
      
      // Paso 3: Realizar la asignación usando el método oficial
      console.log(`🎯 Asignando conductor usando ID: ${driver.id || driver.carrierId}`);
      const result = await this.assignOrder(orderId, driver.id || driver.carrierId);
      
      // Paso 4: Verificar que la asignación fue exitosa (con delay para rate limiting)
      console.log('🔍 Verificando asignación...');
      setTimeout(async () => {
        try {
          const verification = await this.verifyOrderAssignment(orderId);
          console.log('📋 Resultado de verificación:', verification);
        } catch (verifyError) {
          console.error('❌ Error en verificación:', verifyError);
        }
      }, 3000); // Aumentado a 3 segundos para rate limiting
      
      return {
        success: true,
        orderId: orderId,
        driverId: driver.id || driver.carrierId,
        driverName: driver.name,
        driverEmail: driver.email,
        assignmentResult: result,
        message: 'Conductor asignado exitosamente según documentación oficial'
      };
      
    } catch (error) {
      console.error('❌ Error en asignación completa:', error);
      throw error;
    }
  }
  
  async getOrders() {
    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      console.log('📦 Obteniendo órdenes con rate limiting...');
      
      const res = await axios.get(`${BASE_URL}/orders`, { headers });
      return res.data;
    }, 'obtener órdenes');
  }

  async getOrder(orderId) {
    return this.retryWithBackoff(async () => {
      const headers = this.workingFormat || this.getHeaders(1);
      
      console.log(`🔍 Obteniendo orden ${orderId} de Shipday con rate limiting...`);
      
      const response = await axios.get(`${BASE_URL}/orders/${orderId}`, { headers });
      
      console.log('📋 Respuesta raw de getOrder:', JSON.stringify(response.data, null, 2));
      
      // Analizar la estructura de respuesta
      const orderData = response.data;
      
      // Shipday puede devolver la orden en diferentes formatos
      let processedOrder;
      
      if (Array.isArray(orderData)) {
        // Si devuelve un array, tomar el primer elemento
        processedOrder = orderData[0] || {};
        console.log('📋 Orden encontrada en array:', processedOrder);
      } else if (orderData && typeof orderData === 'object') {
        // Si devuelve un objeto, usarlo directamente
        processedOrder = orderData;
        console.log('📋 Orden encontrada como objeto:', processedOrder);
      } else {
        console.log('❌ Formato de respuesta inesperado:', typeof orderData);
        throw new Error(`Formato de respuesta inesperado: ${typeof orderData}`);
      }
      
      // Mapear campos comunes de Shipday a formato estándar
      const standardizedOrder = {
        orderId: processedOrder.orderId || processedOrder.id || processedOrder.orderNumber || orderId,
        orderNumber: processedOrder.orderNumber || processedOrder.order_number || processedOrder.number,
        customerName: processedOrder.customerName || processedOrder.customer_name || processedOrder.customer?.name,
        customerAddress: processedOrder.customerAddress || processedOrder.customer_address || processedOrder.address,
        orderStatus: processedOrder.orderStatus || processedOrder.status || processedOrder.order_status,
        carrierId: processedOrder.carrierId || processedOrder.carrier_id || processedOrder.driverId,
        carrierEmail: processedOrder.carrierEmail || processedOrder.carrier_email || processedOrder.driver_email,
        carrierName: processedOrder.carrierName || processedOrder.carrier_name || processedOrder.driver_name,
        createdAt: processedOrder.createdAt || processedOrder.created_at || processedOrder.orderDate,
        total: processedOrder.total || processedOrder.orderTotal || processedOrder.amount,
        // Mantener datos originales para debugging
        _raw: processedOrder
      };
      
      console.log('✅ Orden estandarizada:', {
        orderId: standardizedOrder.orderId,
        orderNumber: standardizedOrder.orderNumber,
        customerName: standardizedOrder.customerName,
        hasDriver: !!(standardizedOrder.carrierId || standardizedOrder.carrierEmail),
        status: standardizedOrder.orderStatus
      });
      
      return standardizedOrder;
      
    }, `obtener orden ${orderId}`);
  }

  /**
   * ✅ NUEVO: Verificar asignación de orden con rate limiting
   */
  async verifyOrderAssignment(orderId) {
    return this.retryWithBackoff(async () => {
      const orderInfo = await this.getOrder(orderId);
      
      return {
        orderId: orderInfo.orderId,
        hasDriverAssigned: !!(orderInfo.carrierId || orderInfo.carrierEmail),
        assignedDriverId: orderInfo.carrierId,
        assignedDriverEmail: orderInfo.carrierEmail,
        assignedDriverName: orderInfo.carrierName,
        orderStatus: orderInfo.orderStatus
      };
    }, `verificar asignación orden ${orderId}`);
  }

  /**
   * ✅ NUEVO: Debug de orden con rate limiting
   */
  async debugOrder(orderId) {
    return this.retryWithBackoff(async () => {
      const orderInfo = await this.getOrder(orderId);
      
      return {
        ...orderInfo,
        debug_info: {
          has_carrier_id: !!orderInfo.carrierId,
          has_carrier_email: !!orderInfo.carrierEmail,
          has_carrier_name: !!orderInfo.carrierName,
          raw_carrier_id: orderInfo.carrierId,
          raw_carrier_email: orderInfo.carrierEmail
        }
      };
    }, `debug orden ${orderId}`);
  }

  // ==================== UTILITIES ====================

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Datos inválidos: ${data?.errorMessage || data?.message || 'Verifica los datos enviados'}`);
        case 401:
          return new Error(`🔑 API Key inválida: ${data?.errorMessage || 'Verifica tu API Key en el dashboard de ShipDay. Ve a https://www.shipday.com/login > Integrations'}`);
        case 403:
          return new Error(`Acceso denegado: ${data?.errorMessage || 'Sin permisos para esta operación'}`);
        case 404:
          return new Error(`Recurso no encontrado: ${data?.errorMessage || 'El recurso solicitado no existe'}`);
        case 429:
          return new Error('Límite de requests excedido. Intenta más tarde');
        case 500:
          return new Error(`Error del servidor de ShipDay: ${data?.errorMessage || 'Error interno'}`);
        default:
          return new Error(`Error ${status}: ${data?.errorMessage || data?.message || 'Error desconocido'}`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      return new Error('No se puede conectar con ShipDay. Verifica tu conexión a internet');
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('Error desconocido en ShipDay SDK');
    }
  }
}

module.exports = new ShipDayService();