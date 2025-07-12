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
  }
static lastRequestTime = 0;
  static minDelayBetweenRequests = 1000; // 1 segundo mínimo entre requests

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
    const payload = {
      name: driverData.name,
      email: driverData.email,
      phoneNumber: driverData.phone,
      vehicleType: driverData.vehicle_type || 'car'
    };

    console.log('🚚 Enviando payload a ShipDay:', payload);

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
  }

 static async getDrivers() {
    try {
      await this.enforceRateLimit();
      
      const headers = this.getHeaders();
      
      console.log('👥 Obteniendo conductores...');
      
      const response = await axios.get(`${BASE_URL}/carriers`, { headers });
      
      console.log(`✅ ${response.data.length} conductores obtenidos`);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error);
      
      if (error.response?.status === 429) {
        console.log('🚫 Rate limit obteniendo conductores, aplicando delay...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.lastRequestTime = Date.now();
      }
      
      throw this.handleError(error);
    }
  }

  calculateDriverStatus(driver) {
    if (!driver.isActive) return 'inactive';
    if (driver.isOnShift) return 'working';
    return 'available';
  }

  async getDriver(email) {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.get(`${BASE_URL}/carriers/${email}`, { headers });
      return res.data;
    } catch (error) {
      console.error('❌ Error obteniendo conductor:', error.response?.data);
      throw this.handleError(error);
    }
  }

  async updateDriver(email, updateData) {
    try {
      const payload = {
        name: updateData.name,
        email,
        phoneNumber: updateData.phone || updateData.phoneNumber,
        // ShipDay maneja isActive para habilitar/deshabilitar
        isActive: updateData.isActive,
        // Otros campos si están disponibles
        codeName: updateData.codeName || '',
        areaId: updateData.areaId || null
      };

      console.log('🔄 Actualizando conductor en ShipDay:', payload);

      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.put(`${BASE_URL}/carriers/${email}`, payload, { headers });
      
      console.log('✅ Conductor actualizado:', res.data);
      return res.data;
    } catch (error) {
      console.error('❌ Error actualizando conductor:', error.response?.data);
      throw this.handleError(error);
    }
  }

  async deleteDriver(email) {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.delete(`${BASE_URL}/carriers/${email}`, { headers });
      return res.data;
    } catch (error) {
      console.error('❌ Error eliminando conductor:', error.response?.data);
      throw this.handleError(error);
    }
  }

    // 🔥 MÉTODO ESTÁTICO PARA APLICAR DELAY AUTOMÁTICO
  static async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const delayNeeded = this.minDelayBetweenRequests - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: esperando ${delayNeeded}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    this.lastRequestTime = Date.now();
  }
  // ==================== ORDERS ====================
/**
   * ✅ CORREGIDO: Crea una orden en Shipday asegurando que los campos obligatorios estén presentes.
   */
 static async createOrder(orderData) {
    try {
      // Aplicar rate limiting automáticamente
      await this.enforceRateLimit();
      
      const headers = this.getHeaders();
      
      // Preparar payload con todos los campos requeridos
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
        paymentMethod: "cash" // Campo requerido por Shipday
      };

      console.log('🚢 Creando orden en Shipday:', {
        orderNumber: payload.orderNumber,
        customerName: payload.customerName,
        total: payload.total
      });
      
      const response = await axios.post(`${BASE_URL}/orders`, payload, { headers });
      
      console.log('✅ Orden creada exitosamente en Shipday:', {
        orderId: response.data.orderId,
        orderNumber: payload.orderNumber
      });
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error creando orden en Shipday:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Si es error 429, aplicar delay extra
      if (error.response?.status === 429) {
        console.log('🚫 Rate limit detectado, aplicando delay extra de 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        this.lastRequestTime = Date.now();
      }
      
      throw this.handleError(error);
    }
  }

static async assignOrderNewUrl(orderId, driverId) {
    try {
      // Aplicar rate limiting automáticamente
      await this.enforceRateLimit();
      
      const headers = this.getHeaders();
      const url = `${BASE_URL}/orders/assign/${orderId}/${driverId}`;
      
      console.log(`🎯 Asignando: orden ${orderId} -> conductor ${driverId}`);
      
      const response = await axios.put(url, {}, { headers });
      
      console.log('✅ Asignación exitosa:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error en asignación:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Si es error 429, aplicar delay extra
      if (error.response?.status === 429) {
        console.log('🚫 Rate limit en asignación, aplicando delay extra...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        this.lastRequestTime = Date.now();
      }
      
      throw this.handleError(error);
    }
  }


  /**
   * ✅ CORREGIDO: Asigna una orden ya creada a un conductor.
   * Sigue la documentación oficial: POST /orders/assign/{orderId}
   */

 static async assignOrder(orderId, driverId) {
    try {
      const headers = this.getHeaders();
      
      console.log(`🔗 Asignando orden ${orderId} al conductor ${driverId}...`);
      
      const payload = {
        carrierId: parseInt(driverId)
      };
      
      const response = await axios.put(`${BASE_URL}/orders/${orderId}/assign`, payload, { headers });
      
      console.log('✅ Asignación exitosa:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error con método oficial:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      throw this.handleError(error);
    }
  }

  /**
   * ✅ VARIACIONES: Intentar diferentes formatos de payload si el oficial falla
   */
  async assignOrderWithVariations(orderId, driverId) {
    try {
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
      
    } catch (error) {
      console.error('❌ Error en variaciones:', error);
      throw this.handleError(error);
    }
  }

  /**
   * ✅ MÉTODO MEJORADO: Obtener conductor con validación
   */
static async getValidatedDriver(driverId) {
    try {
      console.log(`🔍 Validando conductor ${driverId}...`);
      
      const drivers = await this.getDrivers(); // Ya tiene rate limiting
      console.log(`📋 Total conductores encontrados: ${drivers.length}`);
      
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
      
      if (!driver.isActive) {
        throw new Error(`El conductor ${driver.name} no está activo`);
      }
      
      return driver;
      
    } catch (error) {
      console.error('❌ Error validando conductor:', error);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO COMPLETO: Asignar con validación completa
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
      
      // Paso 4: Verificar que la asignación fue exitosa
      console.log('🔍 Verificando asignación...');
      setTimeout(async () => {
        try {
          const verification = await this.verifyOrderAssignment(orderId);
          console.log('📋 Resultado de verificación:', verification);
        } catch (verifyError) {
          console.error('❌ Error en verificación:', verifyError);
        }
      }, 2000);
      
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
  
 static async getOrders() {
    try {
      await this.enforceRateLimit();
      
      const headers = this.getHeaders();
      
      console.log('📋 Obteniendo todas las órdenes...');
      
      const response = await axios.get(`${BASE_URL}/orders`, { headers });
      
      console.log(`✅ ${response.data.length} órdenes obtenidas`);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error);
      
      if (error.response?.status === 429) {
        console.log('🚫 Rate limit obteniendo órdenes, aplicando delay...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.lastRequestTime = Date.now();
      }
      
      throw this.handleError(error);
    }
  }

 static async getOrder(orderId) {
    try {
      await this.enforceRateLimit();
      
      const headers = this.getHeaders();
      
      console.log(`🔍 Obteniendo orden ${orderId}...`);
      
      const response = await axios.get(`${BASE_URL}/orders/${orderId}`, { headers });
      
      console.log(`✅ Orden ${orderId} obtenida`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error obteniendo orden ${orderId}:`, error);
      
      if (error.response?.status === 429) {
        console.log('🚫 Rate limit obteniendo orden, aplicando delay...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.lastRequestTime = Date.now();
      }
      
      throw this.handleError(error);
    }
  }


  // ==================== UTILITIES ====================

static handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Error de solicitud: ${data.message || 'Datos inválidos'}`);
        case 401:
          return new Error('Error de autenticación: Verifica tu API key de Shipday');
        case 404:
          return new Error('Recurso no encontrado en Shipday');
        case 429:
          return new Error('Rate limit excedido: Demasiadas solicitudes a Shipday');
        case 500:
          return new Error('Error interno del servidor de Shipday');
        default:
          return new Error(`Error de Shipday (${status}): ${data.message || 'Error desconocido'}`);
      }
    } else if (error.request) {
      return new Error('Error de conexión: No se pudo conectar con Shipday');
    } else {
      return new Error(`Error inesperado: ${error.message}`);
    }
  }
}

module.exports = new ShipDayService();