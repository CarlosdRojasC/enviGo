// backend/src/services/shipday.service.js - Adaptado a tu estructura
const axios = require('axios');
const Order = require('../models/Order');
const Driver = require('../models/Driver');
const logger = require('../utils/logger'); // Ajusta la ruta según tu estructura

class ShipdayService {
  constructor() {
    this.baseURL = process.env.SHIPDAY_API_URL || 'https://api.shipday.com';
    this.apiKey = process.env.SHIPDAY_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('SHIPDAY_API_KEY no está configurada en las variables de entorno');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Interceptors para logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Shipday API Request:', {
          method: config.method,
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('Shipday API Response:', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('Shipday API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 1. SINCRONIZAR CONDUCTOR CON SHIPDAY
   */
  async syncDriverWithShipday(driverId, companyId) {
    try {
      // Buscar conductor en MongoDB por tu estructura
      const driver = await Driver.findOne({ 
        _id: driverId, 
        company_id: companyId 
      });
      
      if (!driver) {
        throw new Error(`Conductor con ID ${driverId} no encontrado para empresa ${companyId}`);
      }

      // Si ya está sincronizado, retornar ID existente
      if (driver.shipday?.driver_id) {
        logger.info(`Conductor ${driverId} ya sincronizado con Shipday ID: ${driver.shipday.driver_id}`);
        return { shipday_driver_id: driver.shipday.driver_id };
      }

      // Preparar datos para Shipday usando tu estructura
      const shipdayDriverData = {
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        color: driver.shipday?.color || '#3b82f6',
        transport_type: this.mapVehicleType(driver.vehicle?.type),
        is_active: driver.is_active && driver.is_available
      };

      // Crear conductor en Shipday
      const response = await this.client.post('/carriers', shipdayDriverData);
      const shipdayDriver = response.data;

      // Actualizar conductor usando tu método personalizado
      await driver.syncWithShipday(shipdayDriver.id);

      logger.info(`Conductor ${driverId} sincronizado exitosamente con Shipday ID: ${shipdayDriver.id}`);
      
      return {
        shipday_driver_id: shipdayDriver.id,
        driver_data: shipdayDriver
      };

    } catch (error) {
      logger.error(`Error sincronizando conductor ${driverId} con Shipday:`, error);
      throw new Error(`Error sincronizando conductor: ${error.message}`);
    }
  }

  /**
   * 2. CREAR PEDIDO EN SHIPDAY Y ASIGNAR CONDUCTOR
   */
  async createOrderInShipday(orderId, driverId, companyId) {
    try {
      // Buscar pedido y conductor usando tu estructura
      const order = await Order.findOne({ 
        _id: orderId, 
        company_id: companyId 
      }).populate('company_id channel_id');
      
      const driver = await Driver.findOne({ 
        _id: driverId, 
        company_id: companyId 
      });

      if (!order) throw new Error(`Pedido ${orderId} no encontrado`);
      if (!driver) throw new Error(`Conductor ${driverId} no encontrado`);

      // Verificar que no esté ya en Shipday
      if (order.shipday?.order_id) {
        throw new Error(`Pedido ya está asignado en Shipday: ${order.shipday.order_id}`);
      }

      // Sincronizar conductor si es necesario
      let shipdayDriverResult = await this.syncDriverWithShipday(driverId, companyId);
      const shipdayDriverId = shipdayDriverResult.shipday_driver_id;

      // Preparar datos del pedido para Shipday usando tu estructura
      const shipdayOrderData = {
        order_id: `${order.order_number}_${orderId}`, // Usar tu order_number
        customer_name: order.customer_name,
        customer_email: order.customer_email || '',
        customer_phone: order.customer_phone || '',
        
        // Usar tu estructura de dirección
        delivery_address: order.fullShippingAddress, // Virtual que creamos
        delivery_city: order.shipping_city || '',
        delivery_state: order.shipping_state || '',
        delivery_zip: order.shipping_zip || '',
        delivery_country: 'Chile',
        delivery_latitude: order.delivery_coordinates?.latitude,
        delivery_longitude: order.delivery_coordinates?.longitude,
        
        // Dirección de pickup (desde tu configuración)
        pickup_address: order.pickup_address || process.env.DEFAULT_PICKUP_ADDRESS,
        pickup_latitude: order.pickup_coordinates?.latitude || parseFloat(process.env.DEFAULT_PICKUP_LAT),
        pickup_longitude: order.pickup_coordinates?.longitude || parseFloat(process.env.DEFAULT_PICKUP_LNG),
        
        // Usar tu estructura de montos
        order_total: order.total_amount,
        delivery_fee: order.shipping_cost,
        tip: 0,
        tax: 0,
        
        // Items del pedido
        items: order.items || [],
        
        // Usar tus campos de OptiRoute como configuración
        expected_delivery_date: order.delivery_date || new Date(Date.now() + 2 * 60 * 60 * 1000),
        delivery_instruction: order.notes || '',
        
        // Configuración de tiempo usando tus campos OptiRoute
        service_time: order.serviceTime || 5,
        time_window_start: order.timeWindowStart || '09:00',
        time_window_end: order.timeWindowEnd || '18:00',
        priority: order.priority || 'Normal',
        
        // Asignar conductor directamente
        carrier_id: shipdayDriverId,
        
        require_signature: true,
        require_picture: true,
        
        webhook_url: `${process.env.APP_URL}/api/webhooks/shipday`
      };

      // Crear pedido en Shipday
      const response = await this.client.post('/orders', shipdayOrderData);
      const shipdayOrder = response.data;

      // Generar tracking link
      const trackingLink = this.generateTrackingLink(shipdayOrder.id);

      // Actualizar pedido usando tu estructura
      order.driver_id = driverId;
      order.shipday = {
        order_id: shipdayOrder.id,
        status: shipdayOrder.status || 'created',
        tracking_link: trackingLink,
        created_at: new Date(),
        last_update: new Date(),
        assigned_driver_id: shipdayDriverId
      };

      // Usar tu método personalizado para agregar al historial
      await order.addStatusHistory(
        'processing', // Cambiar a processing cuando se asigna
        shipdayOrder.status || 'created',
        `Asignado a conductor ${driver.name} via Shipday`
      );

      await order.save();

      // Actualizar estadísticas del conductor
      await Driver.findByIdAndUpdate(driverId, {
        $inc: { 'stats.current_orders_count': 1 }
      });

      logger.info(`Pedido ${orderId} creado exitosamente en Shipday con ID: ${shipdayOrder.id}`);

      return {
        success: true,
        shipday_order_id: shipdayOrder.id,
        tracking_link: trackingLink,
        driver_assigned: driver.name,
        shipday_status: shipdayOrder.status
      };

    } catch (error) {
      logger.error(`Error creando pedido ${orderId} en Shipday:`, error);
      throw new Error(`Error creando pedido en Shipday: ${error.message}`);
    }
  }

  /**
   * 3. OBTENER ESTADO ACTUAL DEL PEDIDO
   */
  async getOrderStatus(shipdayOrderId) {
    try {
      const response = await this.client.get(`/orders/${shipdayOrderId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error obteniendo estado del pedido ${shipdayOrderId}:`, error);
      throw error;
    }
  }

  /**
   * 4. PROCESAR WEBHOOK DE SHIPDAY
   */
  async processWebhook(webhookData) {
    try {
      logger.info('Procesando webhook de Shipday:', webhookData);

      const { order_id, status, tracking_link, carrier, delivery_proof } = webhookData;
      
      // Buscar pedido en MongoDB usando shipday.order_id
      const order = await Order.findOne({ 'shipday.order_id': order_id });
      
      if (!order) {
        logger.warn(`Pedido no encontrado para Shipday ID: ${order_id}`);
        return { success: false, message: 'Pedido no encontrado' };
      }

      // Usar tu método personalizado para actualizar desde webhook
      await order.updateFromShipdayWebhook(webhookData);

      // Actualizar estadísticas del conductor si fue entregado
      if (status === 'delivered' && order.driver_id) {
        const driver = await Driver.findById(order.driver_id);
        if (driver) {
          await driver.updateStatsAfterDelivery(true, order.shipping_cost);
          // Decrementar contador de pedidos actuales
          await Driver.findByIdAndUpdate(order.driver_id, {
            $inc: { 'stats.current_orders_count': -1 }
          });
        }
      }

      // Notificar al cliente si es necesario
      if (this.shouldNotifyCustomer(status)) {
        await this.notifyCustomer(order, status);
      }

      logger.info(`Webhook procesado exitosamente para pedido ${order._id}`);
      
      return { success: true, order_id: order._id, status: order.status };

    } catch (error) {
      logger.error('Error procesando webhook de Shipday:', error);
      throw error;
    }
  }

  /**
   * 5. OBTENER MÚLTIPLES ESTADOS PARA DASHBOARD
   */
  async getMultipleOrderStatuses(orderIds, companyId) {
    try {
      // Obtener órdenes con shipday_order_ids usando tu estructura
      const orders = await Order.find(
        { 
          _id: { $in: orderIds },
          company_id: companyId,
          'shipday.order_id': { $exists: true, $ne: null }
        },
        'shipday status order_number'
      );

      const shipdayOrderIds = orders.map(order => order.shipday.order_id);
      
      if (shipdayOrderIds.length === 0) {
        return [];
      }

      // Obtener estados desde Shipday
      const promises = shipdayOrderIds.map(id => 
        this.getOrderStatus(id).catch(error => ({ error: error.message }))
      );
      const results = await Promise.allSettled(promises);
      
      return orders.map((order, index) => ({
        order_id: order._id,
        order_number: order.order_number,
        shipday_order_id: order.shipday.order_id,
        local_status: order.status,
        shipday_status: order.shipday.status,
        tracking_link: order.shipday.tracking_link,
        shipday_data: results[index].status === 'fulfilled' ? results[index].value : null,
        error: results[index].status === 'rejected' ? results[index].reason.message : null
      }));

    } catch (error) {
      logger.error('Error obteniendo múltiples estados:', error);
      throw error;
    }
  }

  /**
   * 6. OBTENER PEDIDOS DISPONIBLES PARA ASIGNAR A SHIPDAY
   */
  async getAvailableOrdersForShipday(companyId, filters = {}) {
    try {
      const orders = await Order.getAvailableForShipday(companyId, filters);
      
      // Agregar información calculada
      const ordersWithInfo = orders.map(order => ({
        ...order.toObject(),
        canAssignToShipday: !order.shipday?.order_id && 
                           ['pending', 'processing'].includes(order.status),
        hasCoordinates: !!(order.delivery_coordinates?.latitude && 
                          order.delivery_coordinates?.longitude)
      }));

      return ordersWithInfo;
    } catch (error) {
      logger.error('Error obteniendo pedidos disponibles para Shipday:', error);
      throw error;
    }
  }

  /**
   * 7. OBTENER CONDUCTORES DISPONIBLES PARA SHIPDAY
   */
  async getAvailableDriversForShipday(companyId) {
    try {
      const drivers = await Driver.getAvailableForShipday(companyId);
      
      // Agregar información calculada
      const driversWithInfo = await Promise.all(
        drivers.map(async (driver) => {
          // Contar pedidos activos usando tu estructura
          const currentOrdersCount = await Order.countDocuments({
            company_id: companyId,
            driver_id: driver._id,
            status: { $in: ['processing', 'shipped'] }
          });

          return {
            ...driver.toObject(),
            current_orders_count: currentOrdersCount,
            canWorkNow: driver.canWorkNow(),
            isInShipday: driver.isInShipday,
            successRate: driver.successRate
          };
        })
      );

      return driversWithInfo;
    } catch (error) {
      logger.error('Error obteniendo conductores disponibles para Shipday:', error);
      throw error;
    }
  }

  /**
   * 8. OBTENER MÉTRICAS DE SHIPDAY PARA DASHBOARD
   */
  async getShipdayMetrics(companyId) {
    try {
      const [orderMetrics, driverMetrics] = await Promise.all([
        Order.getShipdayMetrics(companyId),
        Driver.getDriverMetrics(companyId)
      ]);

      return {
        orders: {
          total_in_shipday: orderMetrics[0],
          by_status: orderMetrics[1].reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          recent_deliveries: orderMetrics[2]
        },
        drivers: driverMetrics[0] || {
          total_drivers: 0,
          active_drivers: 0,
          available_drivers: 0,
          verified_drivers: 0,
          synced_with_shipday: 0,
          total_deliveries: 0,
          total_earnings: 0
        }
      };
    } catch (error) {
      logger.error('Error obteniendo métricas de Shipday:', error);
      throw error;
    }
  }

  /**
   * MÉTODOS AUXILIARES
   */
  
  mapVehicleType(vehicleType) {
    const typeMap = {
      'car': 'car',
      'motorcycle': 'motorcycle', 
      'bicycle': 'bicycle',
      'truck': 'truck',
      'van': 'car'
    };
    return typeMap[vehicleType] || 'car';
  }

  shouldNotifyCustomer(status) {
    const notifyStatuses = ['assigned', 'pickup', 'in_transit', 'delivered'];
    return notifyStatuses.includes(status);
  }

  generateTrackingLink(shipdayOrderId) {
    return `${process.env.APP_URL}/tracking/${shipdayOrderId}`;
  }

  async notifyCustomer(order, status) {
    // Implementar notificación al cliente usando tu sistema
    logger.info(`Notificando al cliente para pedido ${order._id}, estado: ${status}`);
    
    // Aquí puedes integrar con tu sistema de notificaciones existente
    // Por ejemplo: email, SMS, push notifications, etc.
  }

  /**
   * 9. FORZAR ACTUALIZACIÓN DE ESTADO DESDE SHIPDAY
   */
  async forceUpdateFromShipday(orderId, companyId) {
    try {
      const order = await Order.findOne({ 
        _id: orderId, 
        company_id: companyId,
        'shipday.order_id': { $exists: true, $ne: null }
      });
      
      if (!order) {
        throw new Error('Pedido no encontrado o no está en Shipday');
      }

      // Obtener estado actual desde Shipday
      const shipdayStatus = await this.getOrderStatus(order.shipday.order_id);
      
      // Simular webhook para actualizar estado
      await this.processWebhook({
        order_id: order.shipday.order_id,
        status: shipdayStatus.status,
        tracking_link: shipdayStatus.tracking_link,
        carrier: shipdayStatus.carrier,
        delivery_proof: shipdayStatus.delivery_proof
      });

      return {
        success: true,
        message: 'Estado actualizado desde Shipday',
        shipday_status: shipdayStatus.status,
        local_status: order.status
      };

    } catch (error) {
      logger.error(`Error forzando actualización del pedido ${orderId}:`, error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const shipdayService = new ShipdayService();
module.exports = shipdayService;