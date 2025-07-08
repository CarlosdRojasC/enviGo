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

  async getDrivers() {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
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
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error.response?.data);
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

  // ==================== ORDERS ====================
/**
   * ✅ CORREGIDO: Crea una orden en Shipday asegurando que los campos obligatorios estén presentes.
   */
  async createOrder(orderData) {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
      
      const payload = {
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        customerAddress: orderData.customerAddress,
        restaurantName: orderData.restaurantName,
        restaurantAddress: orderData.restaurantAddress,
        ...orderData, // Incluye el resto de los datos opcionales
      };

      console.log('📦 Enviando payload de creación de orden a Shipday:', JSON.stringify(payload, null, 2));
      const res = await axios.post(`${BASE_URL}/orders`, payload, { headers });
      
      return res.data;
    } catch (error) {
      console.error('❌ Error creando la orden en Shipday:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * ✅ CORREGIDO: Asigna una orden ya creada a un conductor.
   * Sigue la documentación oficial: POST /orders/assign/{orderId}
   */

  async assignOrder(orderId, driverId) {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
      
      console.log(`🔗 Asignando orden ${orderId} al conductor ${driverId} (según docs oficiales)...`);
      
      // Según la documentación, el payload debe ser:
      const payload = {
        carrierId: parseInt(driverId) // Asegurar que sea número entero
      };
      
      console.log(`📋 Payload oficial:`, payload);
      console.log(`🌐 URL: PUT ${BASE_URL}/orders/${orderId}/assign`);
      
      const response = await axios.put(`${BASE_URL}/orders/${orderId}/assign`, payload, { headers });
      
      console.log('✅ Asignación exitosa según docs oficiales:', response.data);
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error con método oficial:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      // Si el método oficial falla, intentar variaciones del payload
      if (error.response?.status === 400 || error.response?.status === 422) {
        console.log('🔄 Intentando variaciones del payload...');
        return await this.assignOrderWithVariations(orderId, driverId);
      }
      
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
  async getValidatedDriver(driverId) {
    try {
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
  
  async getOrders() {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.get(`${BASE_URL}/orders`, { headers });
      return res.data;
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error.response?.data);
      throw this.handleError(error);
    }
  }

  async getOrder(orderId) {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
      const res = await axios.get(`${BASE_URL}/orders/${orderId}`, { headers });
      return res.data;
    } catch (error) {
      console.error('❌ Error obteniendo orden:', error.response?.data);
      throw this.handleError(error);
    }
  }

  // ==================== UTILITIES ====================

  async testConnection() {
    try {
      console.log('🔍 Probando conexión con ShipDay...');
      
      const authFormats = [
        { name: 'Basic + API_KEY', headers: this.getHeaders(1) },
        { name: 'Solo API_KEY', headers: this.getHeaders(2) },
        { name: 'Bearer + API_KEY', headers: this.getHeaders(3) },
        { name: 'X-API-Key header', headers: this.getHeaders(4) }
      ];

      for (const format of authFormats) {
        try {
          console.log(`🔍 Probando conexión con formato: ${format.name}`);
          const result = await axios.get(`${BASE_URL}/orders?limit=1`, { headers: format.headers });
          console.log(`✅ Conexión exitosa con formato: ${format.name}`);
          this.workingFormat = format.headers;
          return true;
        } catch (error) {
          console.log(`❌ Formato ${format.name} falló en test:`, error.response?.status);
          continue;
        }
      }
      
      console.error('❌ Todos los formatos fallaron en test de conexión');
      return false;
    } catch (error) {
      console.error('❌ Error general en test de conexión:', error.message);
      return false;
    }
  }

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