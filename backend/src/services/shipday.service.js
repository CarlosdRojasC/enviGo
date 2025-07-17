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
      console.log('📦 Obteniendo orden:', orderId);
      
      const headers = this.getHeaders();
      const response = await axios.get(`${BASE_URL}/orders/${orderId}`, { headers });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo orden:', error.message);
      throw this.handleError(error);
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
        paymentMethod: "cash"
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

  /**
 * Obtener información detallada de un conductor específico
 * @param {string} driverId - ID del conductor en Shipday
 * @returns {Object} Información completa del conductor
 */
async getDriverDetails(driverId) {
  try {
    console.log(`👨‍💼 [SHIPDAY] Obteniendo detalles del conductor: ${driverId}`);
    
    // Método 1: Intentar obtener conductor directamente por ID
    try {
      const headers = this.getHeaders();
      const response = await axios.get(`${BASE_URL}/carriers/${driverId}`, { headers });
      
      if (response.data && (response.data.id || response.data.carrierId)) {
        console.log('✅ [SHIPDAY] Conductor obtenido directamente:', response.data.name || 'Sin nombre');
        return this.normalizeDriverData(response.data);
      }
    } catch (directError) {
      console.log('⚠️ [SHIPDAY] Método directo falló, probando alternativo...');
    }

    // Método 2: Buscar en la lista de todos los conductores
    console.log('🔄 [SHIPDAY] Buscando conductor en lista completa...');
    const drivers = await this.getDrivers();
    
    const driver = drivers.find(d => 
      d.id == driverId || 
      d.carrierId == driverId ||
      d.email === driverId ||
      String(d.id) === String(driverId)
    );
    
    if (driver) {
      console.log('✅ [SHIPDAY] Conductor encontrado en lista:', driver.name || 'Sin nombre');
      return this.normalizeDriverData(driver);
    }

    // Si no se encuentra, devolver datos básicos
    console.log('⚠️ [SHIPDAY] Conductor no encontrado, devolviendo datos básicos');
    return {
      id: driverId,
      name: 'Conductor',
      email: '',
      phoneNumber: '',
      status: 'unknown',
      isActive: true,
      isOnShift: false,
      lastSeen: null,
      location: null,
      rating: null,
      vehicle: null,
      error: 'Conductor no encontrado'
    };
    
  } catch (error) {
    console.error(`❌ [SHIPDAY] Error obteniendo conductor ${driverId}:`, error.message);
    return this.handleDriverDetailsError(driverId, error);
  }
}

/**
 * Normalizar datos del conductor para consistencia
 * @param {Object} rawDriverData - Datos crudos del conductor desde Shipday
 * @returns {Object} Datos normalizados del conductor
 */
normalizeDriverData(rawDriverData) {
  if (!rawDriverData) {
    return {
      id: null,
      name: 'Conductor',
      email: '',
      phoneNumber: '',
      status: 'unknown',
      isActive: false,
      isOnShift: false,
      lastSeen: null
    };
  }

  return {
    id: rawDriverData.id || rawDriverData.carrierId,
    carrierId: rawDriverData.carrierId || rawDriverData.id,
    name: rawDriverData.name || rawDriverData.carrierName || 'Conductor',
    email: rawDriverData.email || rawDriverData.carrierEmail || '',
    phoneNumber: rawDriverData.phoneNumber || rawDriverData.phone || rawDriverData.carrierPhone || '',
    status: this.normalizeDriverStatus(rawDriverData.status || rawDriverData.carrierStatus),
    isActive: rawDriverData.isActive !== undefined ? rawDriverData.isActive : (rawDriverData.active !== undefined ? rawDriverData.active : true),
    isOnShift: rawDriverData.isOnShift !== undefined ? rawDriverData.isOnShift : (rawDriverData.onShift !== undefined ? rawDriverData.onShift : false),
    lastSeen: rawDriverData.lastSeen || rawDriverData.lastSeenAt || null,
    location: rawDriverData.location || rawDriverData.currentLocation || null,
    // Información adicional
    rating: rawDriverData.rating || rawDriverData.averageRating || null,
    vehicle: rawDriverData.vehicle || {
      type: rawDriverData.vehicleType || null,
      model: rawDriverData.vehicleModel || null,
      plate: rawDriverData.vehiclePlate || null,
      color: rawDriverData.vehicleColor || null
    },
    profilePicture: rawDriverData.profilePicture || rawDriverData.avatar || null,
    completedOrders: rawDriverData.completedOrders || rawDriverData.totalDeliveries || 0,
    // Metadatos
    createdAt: rawDriverData.createdAt || null,
    updatedAt: rawDriverData.updatedAt || new Date(),
    lastUpdated: new Date()
  };
}

/**
 * Normalizar estado del conductor
 * @param {string} rawStatus - Estado crudo desde Shipday
 * @returns {string} Estado normalizado
 */
normalizeDriverStatus(rawStatus) {
  if (!rawStatus) return 'unknown';
  
  const status = String(rawStatus).toLowerCase();
  
  // Mapear estados de Shipday a estados estándar
  const statusMap = {
    'online': 'online',
    'offline': 'offline',
    'available': 'online',
    'unavailable': 'offline',
    'busy': 'busy',
    'occupied': 'busy',
    'driving': 'driving',
    'delivering': 'driving',
    'on_delivery': 'driving',
    'in_transit': 'driving',
    'idle': 'online',
    'active': 'online',
    'inactive': 'offline',
    'true': 'online',  // Por si viene como boolean
    'false': 'offline'
  };
  
  return statusMap[status] || 'unknown';
}

/**
 * Manejar errores al obtener detalles del conductor
 * @param {string} driverId - ID del conductor
 * @param {Error} error - Error ocurrido
 * @returns {Object} Datos básicos del conductor
 */
handleDriverDetailsError(driverId, error) {
  return {
    id: driverId,
    name: 'Conductor',
    email: '',
    phoneNumber: '',
    status: 'unknown',
    isActive: true,
    isOnShift: false,
    lastSeen: null,
    location: null,
    rating: null,
    vehicle: null,
    error: error.message,
    lastUpdated: new Date()
  };
}

/**
 * Verificar si un conductor está disponible para asignación
 * @param {string} driverId - ID del conductor
 * @returns {Object} Estado de disponibilidad
 */
async checkDriverAvailability(driverId) {
  try {
    const driver = await this.getDriverDetails(driverId);
    
    const isAvailable = (
      driver.isActive && 
      !driver.isOnShift && 
      ['online', 'available'].includes(driver.status)
    );
    
    return {
      available: isAvailable,
      driver: {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        isActive: driver.isActive,
        isOnShift: driver.isOnShift
      },
      reasons: !isAvailable ? [
        !driver.isActive && 'Conductor inactivo',
        driver.isOnShift && 'Conductor en turno',
        !['online', 'available'].includes(driver.status) && `Estado: ${driver.status}`
      ].filter(Boolean) : []
    };
    
  } catch (error) {
    return {
      available: false,
      error: error.message,
      reasons: ['Error obteniendo información del conductor']
    };
  }
}

/**
 * Refrescar estado de un conductor específico
 * @param {string} driverId - ID del conductor
 * @returns {Object} Estado actualizado del conductor
 */
async refreshDriverStatus(driverId) {
  try {
    console.log(`🔄 [SHIPDAY] Refrescando estado del conductor: ${driverId}`);
    
    const driver = await this.getDriverDetails(driverId);
    
    console.log(`✅ [SHIPDAY] Estado del conductor refrescado:`, {
      name: driver.name,
      status: driver.status,
      isActive: driver.isActive,
      isOnShift: driver.isOnShift
    });
    
    return {
      success: true,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phoneNumber,
        email: driver.email,
        status: driver.status,
        isActive: driver.isActive,
        isOnShift: driver.isOnShift,
        isConnected: ['online', 'driving'].includes(driver.status),
        lastSeen: driver.lastSeen,
        location: driver.location,
        lastUpdated: new Date()
      },
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`❌ [SHIPDAY] Error refrescando conductor ${driverId}:`, error);
    throw new Error(`No se pudo refrescar el estado del conductor: ${error.message}`);
  }
}

/**
 * Normalizar datos del conductor para consistencia
 * @param {Object} rawDriverData - Datos crudos del conductor desde Shipday
 * @returns {Object} Datos normalizados del conductor
 */
normalizeDriverData(rawDriverData) {
  if (!rawDriverData) {
    throw new Error('No hay datos del conductor para normalizar');
  }

  return {
    id: rawDriverData.id || rawDriverData.carrierId,
    carrierId: rawDriverData.carrierId || rawDriverData.id,
    name: rawDriverData.name || rawDriverData.carrierName || 'Conductor',
    email: rawDriverData.email || rawDriverData.carrierEmail || '',
    phoneNumber: rawDriverData.phoneNumber || rawDriverData.phone || rawDriverData.carrierPhone || '',
    status: this.normalizeDriverStatus(rawDriverData.status || rawDriverData.carrierStatus),
    isActive: rawDriverData.isActive ?? rawDriverData.active ?? true,
    isOnShift: rawDriverData.isOnShift ?? rawDriverData.onShift ?? false,
    lastSeen: rawDriverData.lastSeen || rawDriverData.lastSeenAt || null,
    location: rawDriverData.location || rawDriverData.currentLocation || null,
    // Información adicional
    rating: rawDriverData.rating || rawDriverData.averageRating || null,
    vehicle: rawDriverData.vehicle || {
      type: rawDriverData.vehicleType || null,
      model: rawDriverData.vehicleModel || null,
      plate: rawDriverData.vehiclePlate || null,
      color: rawDriverData.vehicleColor || null
    },
    profilePicture: rawDriverData.profilePicture || rawDriverData.avatar || null,
    completedOrders: rawDriverData.completedOrders || rawDriverData.totalDeliveries || 0,
    // Metadatos
    createdAt: rawDriverData.createdAt || null,
    updatedAt: rawDriverData.updatedAt || new Date(),
    lastUpdated: new Date()
  };
}

/**
 * Normalizar estado del conductor
 * @param {string} rawStatus - Estado crudo desde Shipday
 * @returns {string} Estado normalizado
 */
normalizeDriverStatus(rawStatus) {
  if (!rawStatus) return 'unknown';
  
  const status = rawStatus.toString().toLowerCase();
  
  // Mapear estados de Shipday a estados estándar
  const statusMap = {
    'online': 'online',
    'offline': 'offline',
    'available': 'online',
    'unavailable': 'offline',
    'busy': 'busy',
    'occupied': 'busy',
    'driving': 'driving',
    'delivering': 'driving',
    'on_delivery': 'driving',
    'in_transit': 'driving',
    'idle': 'online',
    'active': 'online',
    'inactive': 'offline',
    'true': 'online',  // Por si viene como boolean
    'false': 'offline'
  };
  
  return statusMap[status] || 'unknown';
}

/**
 * Verificar si un conductor está disponible para asignación
 * @param {string} driverId - ID del conductor
 * @returns {Object} Estado de disponibilidad
 */
async checkDriverAvailability(driverId) {
  try {
    const driver = await this.getDriverDetails(driverId);
    
    const isAvailable = (
      driver.isActive && 
      !driver.isOnShift && 
      ['online', 'available'].includes(driver.status)
    );
    
    return {
      available: isAvailable,
      driver: {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        isActive: driver.isActive,
        isOnShift: driver.isOnShift
      },
      reasons: !isAvailable ? [
        !driver.isActive && 'Conductor inactivo',
        driver.isOnShift && 'Conductor en turno',
        !['online', 'available'].includes(driver.status) && `Estado: ${driver.status}`
      ].filter(Boolean) : []
    };
    
  } catch (error) {
    return {
      available: false,
      error: error.message,
      reasons: ['Error obteniendo información del conductor']
    };
  }
}

/**
 * Obtener múltiples conductores con sus estados
 * @param {Array} driverIds - Array de IDs de conductores
 * @returns {Array} Estados de los conductores
 */
async getBulkDriverDetails(driverIds) {
  try {
    console.log(`📊 [SHIPDAY] Obteniendo detalles de ${driverIds.length} conductores...`);
    
    const results = await Promise.allSettled(
      driverIds.map(driverId => this.getDriverDetails(driverId))
    );
    
    const processedResults = results.map((result, index) => {
      const driverId = driverIds[index];
      
      if (result.status === 'fulfilled') {
        return {
          driverId,
          success: true,
          driver: result.value
        };
      } else {
        return {
          driverId,
          success: false,
          error: result.reason.message,
          driver: null
        };
      }
    });
    
    const successful = processedResults.filter(r => r.success).length;
    console.log(`✅ [SHIPDAY] Conductores obtenidos: ${successful}/${driverIds.length}`);
    
    return processedResults;
    
  } catch (error) {
    console.error('❌ [SHIPDAY] Error obteniendo conductores múltiples:', error);
    throw error;
  }
}

/**
 * Refrescar estado de un conductor específico
 * @param {string} driverId - ID del conductor
 * @returns {Object} Estado actualizado del conductor
 */
async refreshDriverStatus(driverId) {
  try {
    console.log(`🔄 [SHIPDAY] Refrescando estado del conductor: ${driverId}`);
    
    const driver = await this.getDriverDetails(driverId);
    
    console.log(`✅ [SHIPDAY] Estado del conductor refrescado:`, {
      name: driver.name,
      status: driver.status,
      isActive: driver.isActive,
      isOnShift: driver.isOnShift
    });
    
    return {
      success: true,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phoneNumber,
        email: driver.email,
        status: driver.status,
        isActive: driver.isActive,
        isOnShift: driver.isOnShift,
        isConnected: ['online', 'driving'].includes(driver.status),
        lastSeen: driver.lastSeen,
        location: driver.location,
        lastUpdated: new Date()
      },
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`❌ [SHIPDAY] Error refrescando conductor ${driverId}:`, error);
    throw new Error(`No se pudo refrescar el estado del conductor: ${error.message}`);
  }
}
}

// Exportar como singleton
module.exports = new ShipDayService();