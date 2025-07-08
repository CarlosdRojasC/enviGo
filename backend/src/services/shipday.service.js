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
      
      // CORREGIDO: Asegurar que SIEMPRE tenemos un nombre de restaurante
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
        total: parseFloat(orderData.total) || 1, // Mínimo 1 para evitar 0
        
        // Método de pago
        paymentMethod: orderData.paymentMethod || 'CASH',
        
        // Asignación de conductor (opcional)
        ...(orderData.carrierId && { carrierId: orderData.carrierId }),
        
        // Items de la orden obligatorios
        orderItems: orderData.orderItems || [
          {
            name: 'Producto/Servicio',
            quantity: 1,
            price: parseFloat(orderData.total) || 1
          }
        ]
      };

      console.log('📦 DEBUG - Payload final enviado a Shipday:', JSON.stringify(payload, null, 2));
      
      // Validación adicional antes de enviar
      if (!payload.restaurantName || payload.restaurantName.trim() === '') {
        console.error('❌ CRÍTICO: restaurantName está vacío!');
        payload.restaurantName = 'Tienda Principal'; // Forzar valor
      }
      
      if (!payload.customerName || payload.customerName.trim() === '') {
        console.error('❌ CRÍTICO: customerName está vacío!');
        payload.customerName = 'Cliente Sin Nombre';
      }
      
      console.log('🚀 Enviando a Shipday con validaciones finales:', {
        restaurantName: payload.restaurantName,
        customerName: payload.customerName,
        orderNumber: payload.orderNumber,
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
   * CORREGIDO: Crea la orden en Shipday y la asigna a un conductor
   * NO intenta hacer .save() en el objeto order
   */
  async createAndAssignOrder(orderData, driverId) {
    try {
      console.log('🚀 Iniciando createAndAssignOrder para:', orderData.order_number, 'con conductor:', driverId);
      
      // Asegurar que tenemos información completa
      const companyName = orderData.company_name || 
                         orderData.company_id?.name || 
                         'Tienda Principal';
      
      const companyPhone = orderData.company_phone || 
                          orderData.company_id?.phone || 
                          '';
      
      console.log('🏢 Información de empresa:', { companyName, companyPhone });
      
      // Preparar datos con valores garantizados
      const payload = {
        // Información básica
        orderNumber: orderData.order_number,
        customerName: orderData.customer_name || 'Cliente Sin Nombre',
        customerAddress: orderData.shipping_address || 'Dirección no especificada',
        customerEmail: orderData.customer_email || '',
        customerPhoneNumber: orderData.customer_phone || '',
        deliveryInstruction: orderData.notes || 'Sin instrucciones especiales',
        
        // CRÍTICO: Información del restaurante con valores garantizados
        restaurantName: companyName,
        restaurantAddress: orderData.pickup_address || orderData.shipping_address || 'Dirección no especificada',
        restaurantPhoneNumber: companyPhone,
        
        // Información financiera
        deliveryFee: parseFloat(orderData.shipping_cost) || 1,
        tips: 0,
        tax: parseFloat(orderData.tax_amount) || 0,
        discount: parseFloat(orderData.discount_amount) || 0,
        total: parseFloat(orderData.total_amount) || parseFloat(orderData.shipping_cost) || 1,
        
        // Método de pago
        paymentMethod: orderData.payment_method || 'CASH',
        
        // Asignar conductor
        carrierId: driverId,
        
        // Items obligatorios
        orderItems: [
          {
            name: `Pedido ${orderData.order_number}`,
            quantity: orderData.items_count || 1,
            price: parseFloat(orderData.total_amount) || parseFloat(orderData.shipping_cost) || 1
          }
        ]
      };

      console.log('📦 Payload preparado para Shipday:', JSON.stringify(payload, null, 2));

      // Crear la orden en Shipday
      const createdOrder = await this.createOrder(payload);
      
      console.log('📋 Respuesta de Shipday:', JSON.stringify(createdOrder, null, 2));

      // Verificar respuesta
      if (!createdOrder || createdOrder.success === false) {
        const errorMsg = createdOrder?.response || 'Error desconocido en Shipday';
        console.error('❌ Error en respuesta de Shipday:', errorMsg);
        throw new Error(`Error de Shipday: ${errorMsg}`);
      }

      // ✅ CORREGIDO: Retornar solo la información, NO intentar hacer .save()
      // El OrderController se encargará de actualizar la orden en la base de datos

      console.log('✅ Orden creada exitosamente en Shipday:', createdOrder.orderId);

      return { 
        success: true, 
        order: createdOrder,
        orderId: createdOrder.orderId, // Para facilitar acceso
        message: 'Orden creada y asignada exitosamente en Shipday'
      };

    } catch (error) {
      console.error('❌ Error completo en createAndAssignOrder:', error);
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
      const payload = { orderId, email };
      const headers = this.workingFormat || this.getHeaders(1);
      console.log('👨‍💼 Asignando orden existente:', payload);
      
      const res = await axios.post(`${BASE_URL}/assignorder`, payload, { headers });
      console.log('✅ Orden asignada:', res.data);
      
      return res.data;
    } catch (error) {
      console.error('❌ Error asignando orden:', error.response?.data);
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