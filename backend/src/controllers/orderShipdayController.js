// backend/src/controllers/orderShipdayController.js - Adaptado a tu estructura
const shipdayService = require('../services/shipday.service');
const Order = require('../models/Order');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class OrderShipdayController {
  
  /**
   * ASIGNAR PEDIDOS A CONDUCTOR Y CREAR EN SHIPDAY
   * POST /api/orders/assign-to-driver
   */
  async assignOrdersToDriver(req, res) {
    try {
      const { driver_id, order_ids } = req.body;
      const company_id = req.user?.company_id; // Asumiendo que tienes middleware de auth

      // Validar datos de entrada
      if (!driver_id || !order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'driver_id y order_ids (array) son requeridos'
        });
      }

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido. Usuario no autenticado correctamente.'
        });
      }

      // Validar que sean ObjectIds válidos
      if (!mongoose.Types.ObjectId.isValid(driver_id)) {
        return res.status(400).json({
          success: false,
          message: 'driver_id no es un ObjectId válido'
        });
      }

      const invalidOrderIds = order_ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidOrderIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Los siguientes order_ids no son válidos: ${invalidOrderIds.join(', ')}`
        });
      }

      logger.info(`Asignando ${order_ids.length} pedidos al conductor ${driver_id} para empresa ${company_id}`);

      const results = [];
      const errors = [];

      // Procesar cada pedido
      for (const orderId of order_ids) {
        try {
          // Verificar que el pedido existe, pertenece a la empresa y no esté ya asignado a Shipday
          const existingOrder = await Order.findOne({ 
            _id: orderId, 
            company_id: company_id 
          });

          if (!existingOrder) {
            errors.push({ order_id: orderId, error: 'Pedido no encontrado o no pertenece a tu empresa' });
            continue;
          }

          if (existingOrder.shipday?.order_id) {
            errors.push({ 
              order_id: orderId, 
              error: 'Pedido ya está asignado en Shipday',
              shipday_order_id: existingOrder.shipday.order_id,
              order_number: existingOrder.order_number
            });
            continue;
          }

          // Verificar que el pedido esté en estado válido para asignar
          if (!['pending', 'processing'].includes(existingOrder.status)) {
            errors.push({ 
              order_id: orderId, 
              error: `Pedido en estado '${existingOrder.status}' no puede ser asignado a Shipday`,
              order_number: existingOrder.order_number
            });
            continue;
          }

          // Crear pedido en Shipday y asignar conductor
          const result = await shipdayService.createOrderInShipday(orderId, driver_id, company_id);
          
          results.push({
            order_id: orderId,
            order_number: existingOrder.order_number,
            ...result
          });

          logger.info(`Pedido ${orderId} (${existingOrder.order_number}) asignado exitosamente a conductor ${driver_id}`);

        } catch (error) {
          logger.error(`Error asignando pedido ${orderId}:`, error);
          errors.push({ 
            order_id: orderId, 
            error: error.message 
          });
        }
      }

      // Responder con resultados
      const response = {
        success: errors.length === 0,
        total_orders: order_ids.length,
        successful_assignments: results.length,
        failed_assignments: errors.length,
        results,
        errors,
        company_id
      };

      const statusCode = errors.length === 0 ? 200 : (results.length > 0 ? 207 : 400);
      
      res.status(statusCode).json(response);

    } catch (error) {
      logger.error('Error en assignOrdersToDriver:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * OBTENER PEDIDOS DISPONIBLES PARA ASIGNAR A SHIPDAY
   * GET /api/orders/available-for-shipday
   */
  async getAvailableOrdersForShipday(req, res) {
    try {
      const company_id = req.user?.company_id;
      const { status, limit = 50, page = 1, search } = req.query;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      // Construir filtros adicionales
      const filters = {};
      if (status) filters.status = status;
      if (search) {
        filters.$or = [
          { order_number: { $regex: search, $options: 'i' } },
          { customer_name: { $regex: search, $options: 'i' } },
          { customer_phone: { $regex: search, $options: 'i' } },
          { shipping_address: { $regex: search, $options: 'i' } }
        ];
      }

      const orders = await shipdayService.getAvailableOrdersForShipday(company_id, filters);
      
      // Implementar paginación
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedOrders = orders.slice(startIndex, endIndex);

      res.json({
        success: true,
        orders: paginatedOrders,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_orders: orders.length,
          total_pages: Math.ceil(orders.length / parseInt(limit)),
          has_next: endIndex < orders.length,
          has_prev: startIndex > 0
        },
        filters_applied: { status, search }
      });

    } catch (error) {
      logger.error('Error obteniendo pedidos disponibles para Shipday:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo pedidos disponibles',
        error: error.message
      });
    }
  }

  /**
   * OBTENER CONDUCTORES DISPONIBLES PARA SHIPDAY
   * GET /api/drivers/available-for-shipday
   */
  async getAvailableDriversForShipday(req, res) {
    try {
      const company_id = req.user?.company_id;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      const drivers = await shipdayService.getAvailableDriversForShipday(company_id);

      res.json({
        success: true,
        drivers,
        total_drivers: drivers.length,
        synced_drivers: drivers.filter(d => d.isInShipday).length,
        available_now: drivers.filter(d => d.canWorkNow).length
      });

    } catch (error) {
      logger.error('Error obteniendo conductores disponibles para Shipday:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo conductores disponibles',
        error: error.message
      });
    }
  }

  /**
   * OBTENER ESTADO ACTUAL DE PEDIDOS DESDE SHIPDAY
   * GET /api/orders/shipday-status
   */
  async getOrdersShipdayStatus(req, res) {
    try {
      const company_id = req.user?.company_id;
      const { order_ids } = req.query;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      if (!order_ids) {
        return res.status(400).json({
          success: false,
          message: 'order_ids es requerido'
        });
      }

      const orderIdsArray = Array.isArray(order_ids) ? order_ids : order_ids.split(',');
      
      // Validar ObjectIds
      const invalidIds = orderIdsArray.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `IDs inválidos: ${invalidIds.join(', ')}`
        });
      }

      const statusResults = await shipdayService.getMultipleOrderStatuses(orderIdsArray, company_id);

      if (statusResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron pedidos con IDs de Shipday para esta empresa'
        });
      }

      res.json({
        success: true,
        orders: statusResults,
        total_checked: orderIdsArray.length,
        found_in_shipday: statusResults.length
      });

    } catch (error) {
      logger.error('Error obteniendo estados de Shipday:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estados',
        error: error.message
      });
    }
  }

  /**
   * WEBHOOK PARA RECIBIR ACTUALIZACIONES DE SHIPDAY
   * POST /api/webhooks/shipday
   */
  async handleShipdayWebhook(req, res) {
    try {
      logger.info('Webhook recibido de Shipday:', {
        headers: req.headers,
        body: req.body
      });

      // Validar que la petición viene de Shipday
      if (!this.validateShipdayWebhook(req)) {
        logger.warn('Webhook inválido de Shipday rechazado');
        return res.status(401).json({
          success: false,
          message: 'Webhook no autorizado'
        });
      }

      // Procesar el webhook
      const result = await shipdayService.processWebhook(req.body);

      if (result.success) {
        res.json({
          success: true,
          message: 'Webhook procesado exitosamente',
          order_id: result.order_id,
          status: result.status
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Error procesando webhook'
        });
      }

    } catch (error) {
      logger.error('Error procesando webhook de Shipday:', error);
      
      // Siempre responder 200 para evitar que Shipday reintente
      res.status(200).json({
        success: false,
        message: 'Error procesando webhook',
        error: error.message
      });
    }
  }

  /**
   * OBTENER HISTORIAL DE ESTADOS DE UN PEDIDO
   * GET /api/orders/:orderId/status-history
   */
  async getOrderStatusHistory(req, res) {
    try {
      const { orderId } = req.params;
      const company_id = req.user?.company_id;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          success: false,
          message: 'orderId no es un ObjectId válido'
        });
      }

      const order = await Order.findOne({ 
        _id: orderId, 
        company_id: company_id 
      }, 'status_history order_number shipday');
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado o no pertenece a tu empresa'
        });
      }

      res.json({
        success: true,
        order_id: orderId,
        order_number: order.order_number,
        shipday_order_id: order.shipday?.order_id,
        history: order.status_history?.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) || []
      });

    } catch (error) {
      logger.error(`Error obteniendo historial del pedido ${req.params.orderId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo historial',
        error: error.message
      });
    }
  }

  /**
   * SINCRONIZAR CONDUCTOR CON SHIPDAY
   * POST /api/drivers/:driverId/sync-shipday
   */
  async syncDriverWithShipday(req, res) {
    try {
      const { driverId } = req.params;
      const company_id = req.user?.company_id;

      if (!mongoose.Types.ObjectId.isValid(driverId)) {
        return res.status(400).json({
          success: false,
          message: 'driverId no es un ObjectId válido'
        });
      }

      const result = await shipdayService.syncDriverWithShipday(driverId, company_id);

      res.json({
        success: true,
        driver_id: driverId,
        shipday_driver_id: result.shipday_driver_id,
        message: 'Conductor sincronizado exitosamente con Shipday'
      });

    } catch (error) {
      logger.error(`Error sincronizando conductor ${req.params.driverId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error sincronizando conductor',
        error: error.message
      });
    }
  }

  /**
   * FORZAR ACTUALIZACIÓN DE ESTADO DESDE SHIPDAY
   * POST /api/orders/:orderId/force-shipday-update
   */
  async forceShipdayUpdate(req, res) {
    try {
      const { orderId } = req.params;
      const company_id = req.user?.company_id;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          success: false,
          message: 'orderId no es un ObjectId válido'
        });
      }

      const result = await shipdayService.forceUpdateFromShipday(orderId, company_id);

      res.json({
        success: true,
        message: result.message,
        shipday_status: result.shipday_status,
        local_status: result.local_status
      });

    } catch (error) {
      logger.error(`Error forzando actualización del pedido ${req.params.orderId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error forzando actualización',
        error: error.message
      });
    }
  }

  /**
   * OBTENER MÉTRICAS DE SHIPDAY PARA DASHBOARD
   * GET /api/admin/shipday-metrics
   */
  async getShipdayMetrics(req, res) {
    try {
      const company_id = req.user?.company_id;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      const metrics = await shipdayService.getShipdayMetrics(company_id);

      res.json({
        success: true,
        company_id,
        metrics,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error obteniendo métricas de Shipday:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas',
        error: error.message
      });
    }
  }

  /**
   * OBTENER ESTADÍSTICAS DEL DASHBOARD ADMIN (ACTUALIZADO)
   * GET /api/admin/dashboard/stats
   */
  async getAdminDashboardStats(req, res) {
    try {
      const company_id = req.user?.company_id;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      const [
        totalOrders,
        ordersByStatus,
        totalDrivers,
        shipdayMetrics,
        monthlyRevenue
      ] = await Promise.all([
        // Total de pedidos
        Order.countDocuments({ company_id }),
        
        // Pedidos por estado
        Order.aggregate([
          { $match: { company_id: new mongoose.Types.ObjectId(company_id) } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        
        // Total de conductores activos
        Driver.countDocuments({ company_id, is_active: true }),
        
        // Métricas de Shipday
        shipdayService.getShipdayMetrics(company_id),
        
        // Ingresos mensuales (suma de shipping_cost)
        Order.aggregate([
          { 
            $match: { 
              company_id: new mongoose.Types.ObjectId(company_id),
              status: 'delivered',
              delivery_date: { 
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
              }
            } 
          },
          { $group: { _id: null, total: { $sum: '$shipping_cost' } } }
        ])
      ]);

      // Formatear datos de pedidos por estado
      const ordersStats = ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
      });

      // Calcular total de pedidos por estado
      const totalOrdersCount = Object.values(ordersStats).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        company_id,
        stats: {
          // Información general
          total_orders: totalOrders,
          total_drivers: totalDrivers,
          
          // Pedidos por estado (compatible con tu dashboard existente)
          orders: {
            total_orders: totalOrdersCount,
            pending: ordersStats.pending,
            processing: ordersStats.processing,
            shipped: ordersStats.shipped,
            delivered: ordersStats.delivered,
            cancelled: ordersStats.cancelled
          },
          
          // Ingresos mensuales
          monthly_revenue: monthlyRevenue[0]?.total || 0,
          
          // Métricas de Shipday
          shipday: shipdayMetrics
        },
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas del dashboard admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      });
    }
  }

  /**
   * OBTENER TENDENCIA DE PEDIDOS
   * GET /api/admin/dashboard/orders-trend
   */
  async getOrdersTrend(req, res) {
    try {
      const company_id = req.user?.company_id;
      const { period = '7d' } = req.query;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      // Calcular fechas según el período
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trendData = await Order.aggregate([
        {
          $match: {
            company_id: new mongoose.Types.ObjectId(company_id),
            order_date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$order_date" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Llenar días faltantes con 0
      const completeData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const existingData = trendData.find(item => item._id === dateString);
        completeData.push({
          date: dateString,
          count: existingData ? existingData.count : 0
        });
      }

      res.json({
        success: true,
        period,
        data: completeData
      });

    } catch (error) {
      logger.error('Error obteniendo tendencia de pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo tendencia',
        error: error.message
      });
    }
  }

  /**
   * OBTENER INGRESOS MENSUALES
   * GET /api/admin/dashboard/monthly-revenue
   */
  async getMonthlyRevenue(req, res) {
    try {
      const company_id = req.user?.company_id;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      // Obtener últimos 6 meses
      const monthlyData = await Order.aggregate([
        {
          $match: {
            company_id: new mongoose.Types.ObjectId(company_id),
            status: 'delivered',
            delivery_date: { 
              $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1) 
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$delivery_date' },
              month: { $month: '$delivery_date' }
            },
            total_shipping_cost: { $sum: '$shipping_cost' },
            total_orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Formatear datos para el frontend
      const formattedData = monthlyData.map(item => {
        const date = new Date(item._id.year, item._id.month - 1, 1);
        return {
          month_year: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          total_shipping_cost: item.total_shipping_cost,
          total_orders: item.total_orders
        };
      });

      res.json({
        success: true,
        data: formattedData
      });

    } catch (error) {
      logger.error('Error obteniendo ingresos mensuales:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo ingresos mensuales',
        error: error.message
      });
    }
  }

  /**
   * EXPORTAR PEDIDOS PARA OPTIROUTE
   * GET /api/orders/export/optiroute
   */
  async exportOrdersForOptiRoute(req, res) {
    try {
      const company_id = req.user?.company_id;
      const { date, status } = req.query;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'company_id requerido'
        });
      }

      // Construir query para exportación
      const query = { company_id };
      
      if (date) {
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.order_date = { $gte: targetDate, $lt: nextDay };
      }
      
      if (status) {
        query.status = status;
      } else {
        query.status = { $in: ['pending', 'processing', 'shipped'] };
      }

      const orders = await Order.find(query)
        .populate('company_id', 'name')
        .sort({ order_date: -1 });

      // Formatear datos para OptiRoute (usando tus campos existentes)
      const exportData = orders.map(order => ({
        // Identificación
        order_id: order.order_number,
        external_id: order.external_order_id,
        
        // Cliente
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        
        // Dirección
        address: order.fullShippingAddress,
        city: order.shipping_city,
        state: order.shipping_state,
        zip: order.shipping_zip,
        commune: order.shipping_commune,
        
        // Coordenadas (si las tienes)
        latitude: order.delivery_coordinates?.latitude,
        longitude: order.delivery_coordinates?.longitude,
        
        // Campos OptiRoute (ya los tienes!)
        priority: order.priority,
        serviceTime: order.serviceTime,
        timeWindowStart: order.timeWindowStart,
        timeWindowEnd: order.timeWindowEnd,
        load1Packages: order.load1Packages,
        load2WeightKg: order.load2WeightKg,
        
        // Información adicional
        total_amount: order.total_amount,
        shipping_cost: order.shipping_cost,
        notes: order.notes,
        status: order.status,
        order_date: order.order_date
      }));

      // Configurar respuesta para descarga
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="orders_optiroute_${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json({
        export_date: new Date().toISOString(),
        company_id,
        total_orders: exportData.length,
        filters: { date, status },
        orders: exportData
      });

    } catch (error) {
      logger.error('Error exportando pedidos para OptiRoute:', error);
      res.status(500).json({
        success: false,
        message: 'Error exportando pedidos',
        error: error.message
      });
    }
  }

  /**
   * MÉTODOS AUXILIARES
   */

  validateShipdayWebhook(req) {
    // Verificar User-Agent
    const userAgent = req.headers['user-agent'];
    if (!userAgent || !userAgent.includes('Shipday')) {
      return false;
    }

    // Aquí puedes agregar más validaciones:
    // - Verificar IP de origen
    // - Verificar signature si Shipday lo provee
    // - Verificar timestamp para evitar replay attacks

    return true;
  }
}

module.exports = new OrderShipdayController();