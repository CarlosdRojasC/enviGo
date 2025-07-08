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
      console.log('🔍 Obteniendo conductores desde ShipDay...');
      
      const res = await axios.get(`${BASE_URL}/carriers`, { headers });
      console.log('✅ Respuesta cruda de ShipDay:', JSON.stringify(res.data, null, 2));
      
      // Verificar si res.data es un array o tiene un wrapper
      const driversData = Array.isArray(res.data) ? res.data : res.data.data || res.data.carriers || [];
      
      if (!Array.isArray(driversData)) {
        console.error('❌ Los datos de conductores no son un array:', typeof driversData);
        return [];
      }
      
      console.log(`📊 Procesando ${driversData.length} conductores...`);
      
      // Mapear la respuesta de ShipDay al formato esperado
      const mappedDrivers = driversData.map((driver, index) => {
        console.log(`🔍 Conductor ${index + 1}:`, {
          name: driver.name,
          isActive: driver.isActive,
          isOnShift: driver.isOnShift,
          email: driver.email
        });
        
        return {
          ...driver,
          // Campos principales de ShipDay
          id: driver.id,
          carrierId: driver.id,
          email: driver.email,
          name: driver.name,
          phoneNumber: driver.phoneNumber,
          companyId: driver.companyId,
          
          // Estados importantes de ShipDay (con conversión explícita a boolean)
          isActive: Boolean(driver.isActive), // Habilitado para recibir órdenes
          isOnShift: Boolean(driver.isOnShift), // Trabajando actualmente
          
          // Ubicación GPS de ShipDay (campos originales + mapeados)
          carrrierLocationLat: driver.carrrierLocationLat,
          carrrierLocationLng: driver.carrrierLocationLng,
          location: {
            lat: driver.carrrierLocationLat || null,
            lng: driver.carrrierLocationLng || null
          },
          
          // Campos adicionales
          codeName: driver.codeName || '',
          carrierPhoto: driver.carrierPhoto || null,
          personalId: driver.personalId || '',
          areaId: driver.areaId || null,
          
          // Estado calculado para la UI
          status: this.calculateDriverStatus(driver)
        };
      });
      
      console.log('✅ Conductores mapeados:', mappedDrivers.length);
      return mappedDrivers;
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * Calcular el estado del conductor para la UI
   */
  calculateDriverStatus(driver) {
    if (!driver.isActive) {
      return 'inactive'; // Deshabilitado
    }
    
    if (driver.isOnShift) {
      return 'working'; // Trabajando/En turno
    }
    
    return 'available'; // Disponible para trabajar
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

 async createOrder(orderData) {
    try {
      const headers = this.workingFormat || this.getHeaders(1);
      
      console.log('🔍 DEBUG - Datos recibidos en createOrder:', JSON.stringify(orderData, null, 2));
      
      // Asegurar que SIEMPRE tenemos un nombre de restaurante
      const restaurantName = orderData.restaurantName || 
                           orderData.company_name || 
                           'Tienda Principal';
      
      const restaurantAddress = orderData.restaurantAddress || 
                              orderData.pickup_address || 
                              orderData.customerAddress || 
                              'Dirección no especificada';
      
      const payload = {
        // Información básica de la orden
        orderNumber: orderData.orderNumber || `ORDER-${Date.now()}`,
        customerName: orderData.customerName || 'Cliente',
        customerAddress: orderData.customerAddress || 'Dirección no especificada',
        customerEmail: orderData.customerEmail || '',
        customerPhoneNumber: orderData.customerPhoneNumber || '',
        deliveryInstruction: orderData.deliveryInstruction || 'Sin instrucciones',
        
        // CRÍTICO: Información del restaurante con valores garantizados
        restaurantName: restaurantName,
        restaurantAddress: restaurantAddress,
        restaurantPhoneNumber: orderData.restaurantPhoneNumber || 
                              orderData.company_phone || 
                              '',
        
        // Información financiera con valores por defecto
        deliveryFee: parseFloat(orderData.deliveryFee) || 0,
        tips: parseFloat(orderData.tips) || 0,
        tax: parseFloat(orderData.tax) || 0,
        discount: parseFloat(orderData.discount) || 0,
        total: parseFloat(orderData.total) || 1,
        
        // Método de pago
        paymentMethod: orderData.paymentMethod || 'CASH',
        
        // Items de la orden obligatorios
        orderItems: orderData.orderItems || [
          {
            name: 'Producto/Servicio',
            quantity: 1,
            price: parseFloat(orderData.total) || 1
          }
        ]
      };

      // ⭐ CRÍTICO: Solo agregar carrierId si existe y es válido
      if (orderData.carrierId) {
        console.log('👨‍💼 DEBUG - Asignando conductor con carrierId:', orderData.carrierId);
        payload.carrierId = orderData.carrierId;
      } else {
        console.log('📝 DEBUG - Creando orden SIN conductor asignado');
      }

      console.log('📦 DEBUG - Payload final enviado a Shipday:', JSON.stringify(payload, null, 2));
      
      // Validación adicional antes de enviar
      if (!payload.restaurantName || payload.restaurantName.trim() === '') {
        console.error('❌ CRÍTICO: restaurantName está vacío!');
        payload.restaurantName = 'Tienda Principal';
      }
      
      if (!payload.customerName || payload.customerName.trim() === '') {
        console.error('❌ CRÍTICO: customerName está vacío!');
        payload.customerName = 'Cliente Sin Nombre';
      }
      
      console.log('🚀 Enviando a Shipday:', {
        url: `${BASE_URL}/orders`,
        restaurantName: payload.restaurantName,
        customerName: payload.customerName,
        orderNumber: payload.orderNumber,
        carrierId: payload.carrierId || 'NO ASIGNADO',
        total: payload.total
      });
      
      const res = await axios.post(`${BASE_URL}/orders`, payload, { headers });
      console.log('✅ Respuesta completa de Shipday:', JSON.stringify(res.data, null, 2));
      
      return res.data;
    } catch (error) {
      console.error('❌ Error completo creando orden:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      throw this.handleError(error);
    }
  }

  /**
   * MÉTODO ALTERNATIVO: Crear orden y asignar conductor en pasos separados
   */
  async createAndAssignOrderSeparately(orderData, driverId) {
    try {
      console.log('🚀 MÉTODO SEPARADO - Creando orden primero, luego asignando conductor');
      console.log('📋 Driver ID recibido:', driverId);
      
      // Paso 1: Crear orden SIN conductor
      const orderDataWithoutDriver = { ...orderData };
      delete orderDataWithoutDriver.carrierId; // Asegurar que no tenga carrierId
      
      console.log('📦 Paso 1: Creando orden sin conductor...');
      const createdOrder = await this.createOrder(orderDataWithoutDriver);
      
      if (!createdOrder || createdOrder.success === false) {
        throw new Error(`Error creando orden: ${createdOrder?.response || 'Error desconocido'}`);
      }
      
      console.log('✅ Orden creada exitosamente:', createdOrder.orderId);
      
      // Paso 2: Obtener información del conductor
      console.log('👨‍💼 Paso 2: Obteniendo información del conductor...');
      const drivers = await this.getDrivers();
      const driver = drivers.find(d => d.id === driverId || d.carrierId === driverId);
      
      if (!driver) {
        console.error('❌ Conductor no encontrado:', driverId);
        console.log('📋 Conductores disponibles:', drivers.map(d => ({ id: d.id, email: d.email, name: d.name })));
        throw new Error(`Conductor con ID ${driverId} no encontrado`);
      }
      
      console.log('✅ Conductor encontrado:', {
        id: driver.id,
        email: driver.email,
        name: driver.name,
        isActive: driver.isActive
      });
      
      // Paso 3: Asignar conductor a la orden
      console.log('🔗 Paso 3: Asignando conductor a la orden...');
      try {
        const assignResult = await this.assignOrder(createdOrder.orderId, driver.email);
        console.log('✅ Asignación exitosa:', assignResult);
        
        return {
          success: true,
          order: createdOrder,
          orderId: createdOrder.orderId,
          driver: driver,
          assignment: assignResult,
          message: 'Orden creada y conductor asignado exitosamente'
        };
      } catch (assignError) {
        console.error('❌ Error en asignación:', assignError);
        // La orden se creó pero no se pudo asignar
        return {
          success: true,
          order: createdOrder,
          orderId: createdOrder.orderId,
          driver: driver,
          assignment_error: assignError.message,
          message: 'Orden creada exitosamente, pero falló la asignación del conductor'
        };
      }
      
    } catch (error) {
      console.error('❌ Error en createAndAssignOrderSeparately:', error);
      throw error;
    }
  }

  /**
   * MÉTODO ORIGINAL MEJORADO: Crear con conductor en un solo paso
   */
async createAndAssignOrder(order, driverId) {
    try {
      // ✅ CAMBIO CLAVE: Construimos el payload con los campos requeridos
      const payload = {
        orderNumber: order.order_number,
        
        // Datos del punto de recogida (usamos los de la empresa)
        restaurantName: order.company_id.name,
        restaurantAddress: order.company_id.address || 'Dirección no especificada', // Usamos la dirección de la empresa
        
        // Datos del cliente final
        customerName: order.customer_name,
        customerAddress: order.shipping_address,
        customerEmail: order.customer_email || '',
        customerPhoneNumber: order.customer_phone || '',
        
        // Instrucciones y asignación
        deliveryInstruction: order.notes || 'Sin notas.',
        carrierId: driverId,
      };

      console.log('📦 Creando y asignando pedido en Shipday con payload:', payload);
      const createdOrder = await this.createOrder(payload);

      // Actualiza tu pedido local con el ID de Shipday y el nuevo estado
      order.shipday_order_id = createdOrder.orderId;
      order.shipday_driver_id = driverId;
      order.status = 'processing';
      await order.save();

      return { success: true, order: createdOrder };

    } catch (error) {
      console.error('❌ Error en createAndAssignOrder:', error.message);
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

 async assignOrder(orderId, email) {
    try {
      console.log('🔗 Iniciando asignación de orden:', { orderId, email });
      
      // Verificar que tenemos los datos necesarios
      if (!orderId) {
        throw new Error('orderId es requerido para asignar orden');
      }
      
      if (!email) {
        throw new Error('email del conductor es requerido para asignar orden');
      }
      
      const headers = this.workingFormat || this.getHeaders(1);
      
      // Probar diferentes formatos de payload para asignación
      const payloadFormats = [
        // Formato 1: Objeto con orderId y email
        { orderId: orderId, email: email },
        
        // Formato 2: Objeto con carrierEmail
        { orderId: orderId, carrierEmail: email },
        
        // Formato 3: Solo el email
        { email: email },
        
        // Formato 4: carrierId si lo tenemos
        // { carrierId: driverId } // Lo agregaremos si es necesario
      ];
      
      let lastError;
      
      for (let i = 0; i < payloadFormats.length; i++) {
        const payload = payloadFormats[i];
        
        try {
          console.log(`🔍 Probando formato ${i + 1} para asignación:`, payload);
          
          const res = await axios.post(`${BASE_URL}/assignorder`, payload, { headers });
          console.log(`✅ Asignación exitosa con formato ${i + 1}:`, res.data);
          
          return res.data;
          
        } catch (error) {
          console.log(`❌ Formato ${i + 1} falló:`, error.response?.status, error.response?.data?.errorMessage);
          lastError = error;
          continue;
        }
      }
      
      // Si todos los formatos fallaron
      console.error('❌ Todos los formatos de asignación fallaron');
      console.error('Último error:', lastError.response?.data);
      throw this.handleError(lastError);
      
    } catch (error) {
      console.error('❌ Error asignando orden:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * MÉTODO ALTERNATIVO: Asignar usando PUT en lugar de POST
   */
  async assignOrderPUT(orderId, email) {
    try {
      console.log('🔄 Intentando asignación con PUT:', { orderId, email });
      
      const headers = this.workingFormat || this.getHeaders(1);
      const payload = { email: email };
      
      console.log('📤 PUT payload:', payload);
      
      const res = await axios.put(`${BASE_URL}/orders/${orderId}/assign`, payload, { headers });
      console.log('✅ Asignación PUT exitosa:', res.data);
      
      return res.data;
    } catch (error) {
      console.error('❌ Error en asignación PUT:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * MÉTODO DE VERIFICACIÓN: Obtener orden para verificar asignación
   */
  async verifyOrderAssignment(orderId) {
    try {
      console.log('🔍 Verificando asignación de orden:', orderId);
      
      const order = await this.getOrder(orderId);
      console.log('📋 Estado de la orden:', {
        orderId: order.orderId,
        carrierId: order.carrierId,
        carrierEmail: order.carrierEmail,
        status: order.status
      });
      
      return order;
    } catch (error) {
      console.error('❌ Error verificando orden:', error);
      return null;
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