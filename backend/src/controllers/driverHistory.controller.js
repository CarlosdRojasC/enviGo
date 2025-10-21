// backend/src/controllers/driverHistory.controller.js
// VERSIÓN CORREGIDA SIN ERRORES

const DriverHistoryService = require('../services/driverHistory.service');
const DriverHistory = require('../models/DriveryHistory');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const { parseDateRangeForQuery } = require('../utils/timezone');
class DriverHistoryController {

  /**
   * Método de prueba para debuggear el sistema
   */
  async testMethod(req, res) {
    try {
      const { 
        date_from = '2025-06-27', 
        date_to = '2025-07-27', 
        driver_id, 
        company_id, 
        payment_status = 'pending' 
      } = req.query;

      console.log('🔥 PARAMS RECIBIDOS:', { 
        date_from, 
        date_to, 
        driver_id, 
        company_id, 
        payment_status 
      });

      // PASO 1: Contar todos los pedidos
      console.log('🔥 PASO 1: Contando TODOS los pedidos...');
      const totalOrders = await Order.countDocuments({});
      console.log('🔥 Total pedidos en BD:', totalOrders);

      // PASO 2: Pedidos delivered
      console.log('🔥 PASO 2: Contando pedidos delivered...');
      const deliveredCount = await Order.countDocuments({ status: 'delivered' });
      console.log('🔥 Pedidos delivered:', deliveredCount);

      // PASO 3: Pedidos con información de conductor ✅ CONSULTA CORREGIDA
      console.log('🔥 PASO 3: Contando pedidos con conductor...');
      const withDriverCount = await Order.countDocuments({
        $and: [
          { status: 'delivered' },
          {
            $or: [
              { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
              { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
            ]
          }
        ]
      });
      console.log('🔥 Pedidos delivered con conductor:', withDriverCount);

      // PASO 4: Obtener ejemplos REALES
      console.log('🔥 PASO 4: Obteniendo ejemplos de pedidos delivered con conductor...');
      const deliveredWithDriverExamples = await Order.find({
        status: 'delivered',
        $or: [
          { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      })
      .limit(5)
      .select('order_number status shipday_driver_id driver_info delivery_date shipping_address customer_name')
      .lean();

      console.log('🔥 PEDIDOS DELIVERED CON CONDUCTOR:');
      deliveredWithDriverExamples.forEach((order, i) => {
        console.log(`🔥 Pedido ${i + 1}:`, {
          order_number: order.order_number,
          status: order.status,
          driver_id: order.shipday_driver_id,
          driver_name: order.driver_info?.name,
          customer_name: order.customer_name,
          delivery_date: order.delivery_date
        });
      });

      // PASO 5: Generar reporte de pagos por conductor
      console.log('🔥 PASO 5: Generando reporte de pagos...');
      const paymentReport = await this.generateDriverPaymentReport(date_from, date_to);

      res.json({
        success: true,
        debug_info: {
          total_orders: totalOrders,
          delivered_orders: deliveredCount,
          delivered_with_driver: withDriverCount
        },
        examples: deliveredWithDriverExamples,
        payment_report: paymentReport
      });

    } catch (error) {
      console.error('❌ Error en test method:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Generar reporte de pagos por conductor ✅ MÉTODO NUEVO Y CORREGIDO
   */
  async generateDriverPaymentReport(dateFrom, dateTo) {
    try {
      // Filtros de fecha
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo + 'T23:59:59.999Z');

      // Buscar pedidos entregados con conductor en el rango de fechas
      const matchCriteria = {
        status: 'delivered',
        $or: [
          { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      };

      if (Object.keys(dateFilter).length > 0) {
        matchCriteria.delivery_date = dateFilter;
      }

      console.log('🔍 Criterios de búsqueda:', JSON.stringify(matchCriteria, null, 2));

      const deliveredOrders = await Order.find(matchCriteria)
        .populate('company_id', 'name email')
        .sort({ delivery_date: -1 })
        .lean();

      console.log(`📊 Órdenes encontradas: ${deliveredOrders.length}`);

      // Agrupar por conductor usando método estático
      const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(deliveredOrders);

      const summary = {
        total_drivers: driverGroups.length,
        total_deliveries: deliveredOrders.length,
        total_amount: driverGroups.reduce((sum, driver) => sum + driver.total_amount, 0),
        period: { from: dateFrom, to: dateTo }
      };

      return {
        summary,
        drivers: driverGroups,
        raw_orders_found: deliveredOrders.length
      };

    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      throw error;
    }
  }

  /**
   * Obtener entregas para pagos - VERSIÓN FINAL CORREGIDA
   */
async getAllDeliveriesForPayments(req, res) {
  try {
    const { 
      date_from, 
      date_to, 
      driver_id, 
      company_id, 
      payment_status = 'pending' 
    } = req.query;

    console.log('💰 Obteniendo entregas para pagos:', { 
      date_from, 
      date_to, 
      driver_id, 
      company_id, 
      payment_status 
    });

    // 🔥 CAMBIO PRINCIPAL: Filtros base para órdenes (incluir invoiced)
    const orderFilters = {
      // ✅ INCLUIR TANTO DELIVERED COMO INVOICED
      status: { $in: ['delivered', 'invoiced'] },
      $or: [
        { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
        { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
      ]
    };

    // Filtro por estado de pago
    if (payment_status === 'pending') {
      orderFilters.$and = [
        {
          $or: [
            { isPaid: { $exists: false } },
            { isPaid: false }
          ]
        }
      ];
    } else if (payment_status === 'paid') {
      orderFilters.isPaid = true;
    }
    // Si payment_status === 'all', no agregar filtro de pago

    // Filtros de fecha
    if (date_from || date_to) {
  orderFilters.delivery_date = parseDateRangeForQuery(date_from, date_to);
}

    // Filtros adicionales
    if (driver_id) orderFilters.shipday_driver_id = driver_id;
    if (company_id) orderFilters.company_id = new mongoose.Types.ObjectId(company_id);

    console.log('🔍 Filtros aplicados:', JSON.stringify(orderFilters, null, 2));

    const orders = await Order.find(orderFilters)
      .populate('company_id', 'name email phone')
      .sort({ delivery_date: -1 })
      .lean();

    console.log('📊 Órdenes encontradas:', orders.length);

    // Convertir a formato de entregas
    const deliveries = orders.map(order => ({
      _id: order._id,
      driver_id: order.shipday_driver_id,
      driver_name: order.driver_info?.name || 'Conductor',
      driver_email: order.driver_info?.email || 'no-email@shipday.com',
      company_id: order.company_id,
      order_id: order._id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      delivery_address: order.shipping_address,
      delivered_at: order.delivery_date,
      payment_amount: 1700,
      payment_status: order.isPaid ? 'paid' : 'pending',
      paid_at: order.paidAt,
      // 📋 CAMPO ADICIONAL PARA DEBUGGING
      order_status: order.status, // 'delivered' o 'invoiced'
      company_name: order.company_id?.name
    }));

    // Agrupar por conductor usando el método estático
    const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(deliveries);

    const summary = {
      total_deliveries: deliveries.length,
      unique_drivers: driverGroups.length,
      total_amount: deliveries.reduce((sum, d) => sum + d.payment_amount, 0),
      data_source: 'orders',
      payment_filter: payment_status
    };

    res.json({
      success: true,
      data: {
        period: { date_from, date_to },
        filters: { driver_id, company_id, payment_status },
        summary,
        drivers: driverGroups,
        // 📊 Para debugging, incluir una muestra de los datos
        sample_deliveries: deliveries.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo entregas para pagos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

  /**
   * Crear registros en DriverHistory desde órdenes existentes
   */
  async createHistoryFromOrders(req, res) {
    try {
      console.log('🔄 Iniciando creación de registros en DriverHistory...');

      const orders = await Order.find({
        status: 'delivered',
        $or: [
          { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      }).populate('company_id').lean();

      console.log(`📊 Encontradas ${orders.length} órdenes entregadas con conductor`);

      let created = 0;
      let skipped = 0;

      for (const order of orders) {
        // Verificar si ya existe
        const exists = await DriverHistory.findOne({ order_id: order._id });
        if (exists) {
          skipped++;
          continue;
        }

        // Crear registro
        const deliveryDate = order.delivery_date || order.updated_at || new Date();
        const paymentPeriod = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;

        const historyRecord = new DriverHistory({
          driver_id: order.shipday_driver_id,
          driver_email: order.driver_info?.email || 'no-email@migrated.com',
          driver_name: order.driver_info?.name || 'Conductor',
          company_id: order.company_id._id,
          order_id: order._id,
          shipday_order_id: order.shipday_order_id || 'no-shipday-id',
          order_number: order.order_number,
          delivery_address: order.shipping_address,
          customer_name: order.customer_name,
          delivered_at: deliveryDate,
          payment_amount: 1700,
          payment_status: 'pending',
          payment_period: paymentPeriod
        });

        await historyRecord.save();
        created++;
      }

      res.json({
        success: true,
        message: `Proceso completado: ${created} registros creados, ${skipped} omitidos`,
        data: {
          created,
          skipped,
          total_processed: orders.length
        }
      });

    } catch (error) {
      console.error('❌ Error creando registros:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // ==================== MÉTODOS ESTÁTICOS AUXILIARES ====================

  /**
   * Agrupar entregas por conductor - MÉTODO ESTÁTICO
   */
  static groupDeliveriesByDriverStatic(deliveries) {
    const grouped = {};
    
    deliveries.forEach(delivery => {
      let driverId, driverName, driverEmail, paymentAmount;
      
      // Si viene de DriverHistory
      if (delivery.driver_id) {
        driverId = delivery.driver_id;
        driverName = delivery.driver_name;
        driverEmail = delivery.driver_email;
        paymentAmount = delivery.payment_amount || 1700;
      } 
      // Si viene de Order
      else if (delivery.shipday_driver_id) {
        driverId = delivery.shipday_driver_id;
        driverName = delivery.driver_info?.name || 'Conductor';
        driverEmail = delivery.driver_info?.email || 'no-email@shipday.com';
        paymentAmount = 1700;
      } else {
        return; // Saltar si no hay driver_id
      }

      if (!grouped[driverId]) {
        grouped[driverId] = {
          driver_id: driverId,
          driver_name: driverName,
          driver_email: driverEmail,
          total_deliveries: 0,
          total_amount: 0,
          deliveries: []
        };
      }

      grouped[driverId].total_deliveries++;
      grouped[driverId].total_amount += paymentAmount;
      grouped[driverId].deliveries.push({
        _id: delivery._id,
        order_number: delivery.order_number,
        customer_name: delivery.customer_name,
        delivery_address: delivery.delivery_address || delivery.shipping_address,
        delivered_at: delivery.delivered_at || delivery.delivery_date,
        payment_amount: paymentAmount,
        company_name: delivery.company_id?.name,
         payment_status: delivery.payment_status, // 'paid' o 'pending'
      paid_at: delivery.paid_at,
      });
    });

    return Object.values(grouped).sort((a, b) => b.total_amount - a.total_amount);
  }

  /**
 * Marcar entregas específicas como pagadas
 */
async markDeliveriesAsPaid(req, res) {
  try {
    const { orderIds, paymentNote = 'Pago manual desde panel' } = req.body;
    const paidBy = req.user.id;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de IDs de órdenes'
      });
    }

    console.log('💰 Marcando como pagadas las órdenes:', orderIds);

    // Actualizar las órdenes
    const orderResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        isPaid: true,
        paidAt: new Date(),
        paidBy: paidBy,
        paymentNote: paymentNote
      }
    );

    // También actualizar DriverHistory si existe
    const historyResult = await DriverHistory.updateMany(
      { order_id: { $in: orderIds } },
      { 
        payment_status: 'paid',
        paid_at: new Date(),
        paid_by: paidBy
      }
    );

    console.log(`✅ Órdenes actualizadas: ${orderResult.modifiedCount}`);
    console.log(`✅ Registros de historial actualizados: ${historyResult.modifiedCount}`);

    res.json({
      success: true,
      message: `${orderResult.modifiedCount} entregas marcadas como pagadas`,
      data: {
        orders_updated: orderResult.modifiedCount,
        history_updated: historyResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('❌ Error marcando entregas como pagadas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Pagar todas las entregas pendientes de un conductor
 */
async payAllPendingToDriver(req, res) {
  try {
    const { driverId } = req.params;
    const { paymentNote = 'Pago completo de conductor' } = req.body;
    const paidBy = req.user.id;

    console.log(`💸 Pagando todas las entregas pendientes del conductor: ${driverId}`);

    // 🔥 CAMBIO: Buscar todas las órdenes pendientes del conductor (delivered E invoiced)
    const pendingOrders = await Order.find({
      // ✅ INCLUIR TANTO DELIVERED COMO INVOICED
      status: { $in: ['delivered', 'invoiced'] },
      shipday_driver_id: driverId,
      $or: [
        { isPaid: { $exists: false } },
        { isPaid: false }
      ]
    }).select('_id order_number customer_name status');

    if (pendingOrders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay entregas pendientes para este conductor'
      });
    }

    const orderIds = pendingOrders.map(order => order._id);

    // Actualizar las órdenes
    const orderResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        isPaid: true,
        paidAt: new Date(),
        paidBy: paidBy,
        paymentNote: paymentNote
      }
    );

    // También actualizar DriverHistory si existe
    const historyResult = await DriverHistory.updateMany(
      { driver_id: driverId, payment_status: 'pending' },
      { 
        payment_status: 'paid',
        paid_at: new Date(),
        paid_by: paidBy
      }
    );

    const totalAmount = pendingOrders.length * 1700; // Precio fijo por entrega

    console.log(`✅ Pagadas ${orderResult.modifiedCount} entregas por $${totalAmount}`);
    console.log(`📋 Estados de pedidos pagados:`, 
      pendingOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {})
    );

    res.json({
      success: true,
      message: `Pagadas ${orderResult.modifiedCount} entregas por $${totalAmount.toLocaleString()}`,
      data: {
        driver_id: driverId,
        orders_paid: orderResult.modifiedCount,
        total_amount: totalAmount,
        order_numbers: pendingOrders.map(o => o.order_number),
        // 📊 BREAKDOWN POR ESTADO
        status_breakdown: pendingOrders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('❌ Error pagando conductor:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
  async getDriverHistory(req, res) {
    try {
      const { driverId } = req.params;
      const { 
        start_date, 
        end_date, 
        status = 'completed', 
        limit = 100 
      } = req.query;

      console.log('📚 Obteniendo historial para conductor:', {
        driverId,
        start_date,
        end_date,
        status
      });

      // 1. BUSCAR EN ROUTEPLANS (entregas del optimizador de rutas)
      const RoutePlan = require('../models/RoutePlan');
      
      const routeQuery = {
        driver: driverId,
        status: { $in: ['completed', 'in_progress'] }
      };

      if (start_date || end_date) {
        routeQuery.createdAt = {};
        if (start_date) routeQuery.createdAt.$gte = new Date(start_date);
        if (end_date) routeQuery.createdAt.$lte = new Date(end_date);
      }

      const routePlans = await RoutePlan.find(routeQuery)
        .populate('orders.order', 'order_number customer_name shipping_address customer_phone')
        .populate('driver', 'full_name name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      console.log(`📊 Rutas encontradas: ${routePlans.length}`);

      // 2. EXTRAER ENTREGAS DE LAS RUTAS
      const deliveries = [];
      
      routePlans.forEach(route => {
        route.orders?.forEach(orderItem => {
          if (['delivered', 'failed', 'cancelled'].includes(orderItem.deliveryStatus)) {
            deliveries.push({
              _id: `route_${route._id}_${orderItem.order._id}`,
              order: {
                _id: orderItem.order._id,
                order_number: orderItem.order.order_number,
                customer_name: orderItem.order.customer_name,
                shipping_address: orderItem.order.shipping_address,
                customer_phone: orderItem.order.customer_phone
              },
              deliveryStatus: orderItem.deliveryStatus,
              completedAt: orderItem.deliveredAt || orderItem.attemptedAt || route.createdAt,
              deliveryProof: orderItem.deliveryProof || null,
              route_id: route._id,
              sequence_number: orderItem.sequenceNumber,
              source: 'route_optimizer'
            });
          }
        });
      });

      // 3. TAMBIÉN BUSCAR EN ÓRDENES DIRECTAS (Shipday, Circuit, manuales)
      const Order = require('../models/Order');
      
      const orderQuery = {
        status: { $in: ['delivered', 'invoiced'] },
        $or: [
          { shipday_driver_id: driverId },
          { assigned_driver_id: driverId },
          { 'delivered_by_driver.driver_id': driverId },
          { 'driver_info.id': driverId }
        ]
      };

      if (start_date || end_date) {
        orderQuery.delivery_date = {};
        if (start_date) orderQuery.delivery_date.$gte = new Date(start_date);
        if (end_date) orderQuery.delivery_date.$lte = new Date(end_date);
      }

      const directOrders = await Order.find(orderQuery)
        .select('_id order_number customer_name shipping_address customer_phone delivery_date proof_of_delivery delivered_by_driver')
        .sort({ delivery_date: -1 })
        .limit(parseInt(limit))
        .lean();

      console.log(`📦 Órdenes directas encontradas: ${directOrders.length}`);

      // 4. AGREGAR ÓRDENES DIRECTAS A LAS ENTREGAS
      directOrders.forEach(order => {
        // Evitar duplicados
        const existsInRoutes = deliveries.some(d => d.order._id.toString() === order._id.toString());
        
        if (!existsInRoutes) {
          deliveries.push({
            _id: `order_${order._id}`,
            order: {
              _id: order._id,
              order_number: order.order_number,
              customer_name: order.customer_name,
              shipping_address: order.shipping_address,
              customer_phone: order.customer_phone
            },
            deliveryStatus: 'delivered', // Las órdenes directas entregadas
            completedAt: order.delivery_date,
            deliveryProof: this.convertProofOfDelivery(order.proof_of_delivery),
            route_id: null,
            sequence_number: null,
            source: 'direct_order'
          });
        }
      });

      // 5. ORDENAR POR FECHA MÁS RECIENTE
      deliveries.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      // 6. CALCULAR ESTADÍSTICAS
      const stats = {
        total: deliveries.length,
        delivered: deliveries.filter(d => d.deliveryStatus === 'delivered').length,
        failed: deliveries.filter(d => d.deliveryStatus === 'failed').length,
        cancelled: deliveries.filter(d => d.deliveryStatus === 'cancelled').length
      };

      console.log('✅ Historial compilado:', {
        total_deliveries: deliveries.length,
        sources: {
          route_optimizer: deliveries.filter(d => d.source === 'route_optimizer').length,
          direct_orders: deliveries.filter(d => d.source === 'direct_order').length
        },
        stats
      });

      res.json({
        success: true,
        data: {
          deliveries,
          stats,
          driver_id: driverId,
          period: { start_date, end_date },
          total_found: deliveries.length
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial del conductor:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * ✅ NUEVO: Obtener estadísticas de un conductor
   */
  async getDriverStats(req, res) {
    try {
      const { driverId } = req.params;
      const { period = '30d' } = req.query;

      console.log('📊 Obteniendo estadísticas del conductor:', { driverId, period });

      // Calcular fechas
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Reutilizar la lógica del método anterior
      const historyData = await this.getDriverHistoryData(driverId, startDate, endDate);
      const deliveries = historyData.deliveries;

      // Calcular estadísticas detalladas
      const stats = {
        period,
        total_deliveries: deliveries.length,
        successful_deliveries: deliveries.filter(d => d.deliveryStatus === 'delivered').length,
        failed_deliveries: deliveries.filter(d => d.deliveryStatus === 'failed').length,
        success_rate: deliveries.length > 0 ? 
          Math.round((deliveries.filter(d => d.deliveryStatus === 'delivered').length / deliveries.length) * 100) : 0,
        estimated_earnings: deliveries.filter(d => d.deliveryStatus === 'delivered').length * 1700,
        
        // Estadísticas por día
        daily_average: deliveries.length > 0 ? 
          Math.round(deliveries.length / Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))) : 0,
        
        // Fuentes de entregas
        sources: {
          route_optimizer: deliveries.filter(d => d.source === 'route_optimizer').length,
          direct_orders: deliveries.filter(d => d.source === 'direct_order').length
        }
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del conductor:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * ✅ NUEVO: Obtener entregas pendientes de pago de un conductor
   */
  async getDriverPendingPayments(req, res) {
    try {
      const { driverId } = req.params;
      
      console.log('💰 Obteniendo pagos pendientes del conductor:', driverId);

      // Buscar en DriverHistory
      const DriverHistory = require('../models/DriveryHistory');
      const pendingHistory = await DriverHistory.find({
        driver_id: driverId,
        payment_status: 'pending'
      }).sort({ delivered_at: -1 });

      // También buscar en Orders directamente
      const Order = require('../models/Order');
      const pendingOrders = await Order.find({
        status: { $in: ['delivered', 'invoiced'] },
        $or: [
          { shipday_driver_id: driverId },
          { 'delivered_by_driver.driver_id': driverId }
        ],
        $or: [
          { isPaid: { $exists: false } },
          { isPaid: false }
        ]
      }).select('_id order_number customer_name delivery_date shipping_address')
        .sort({ delivery_date: -1 });

      const totalPending = (pendingHistory.length * 1700) + (pendingOrders.length * 1700);

      res.json({
        success: true,
        data: {
          driver_id: driverId,
          pending_from_history: pendingHistory.length,
          pending_from_orders: pendingOrders.length,
          total_pending_deliveries: pendingHistory.length + pendingOrders.length,
          total_pending_amount: totalPending,
          deliveries: [
            ...pendingHistory.map(h => ({
              _id: h._id,
              order_number: h.order_number,
              customer_name: h.customer_name,
              delivered_at: h.delivered_at,
              payment_amount: h.payment_amount,
              source: 'driver_history'
            })),
            ...pendingOrders.map(o => ({
              _id: o._id,
              order_number: o.order_number,
              customer_name: o.customer_name,
              delivered_at: o.delivery_date,
              payment_amount: 1700,
              source: 'order_direct'
            }))
          ]
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo pagos pendientes:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * ✅ HELPER: Método auxiliar para obtener datos de historial (reutilizable)
   */
  async getDriverHistoryData(driverId, startDate, endDate) {
    const RoutePlan = require('../models/RoutePlan');
    const Order = require('../models/Order');
    
    // Buscar en rutas
    const routeQuery = {
      driver: driverId,
      status: { $in: ['completed', 'in_progress'] },
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const routePlans = await RoutePlan.find(routeQuery)
      .populate('orders.order', 'order_number customer_name shipping_address customer_phone')
      .lean();

    const deliveries = [];

    // Extraer entregas de rutas
    routePlans.forEach(route => {
      route.orders?.forEach(orderItem => {
        if (['delivered', 'failed', 'cancelled'].includes(orderItem.deliveryStatus)) {
          deliveries.push({
            _id: `route_${route._id}_${orderItem.order._id}`,
            order: orderItem.order,
            deliveryStatus: orderItem.deliveryStatus,
            completedAt: orderItem.deliveredAt || orderItem.attemptedAt || route.createdAt,
            deliveryProof: orderItem.deliveryProof,
            source: 'route_optimizer'
          });
        }
      });
    });

    // Buscar órdenes directas
    const orderQuery = {
      status: { $in: ['delivered', 'invoiced'] },
      delivery_date: { $gte: startDate, $lte: endDate },
      $or: [
        { shipday_driver_id: driverId },
        { assigned_driver_id: driverId },
        { 'delivered_by_driver.driver_id': driverId }
      ]
    };

    const directOrders = await Order.find(orderQuery)
      .select('_id order_number customer_name shipping_address customer_phone delivery_date proof_of_delivery')
      .lean();

    // Agregar órdenes directas
    directOrders.forEach(order => {
      const existsInRoutes = deliveries.some(d => d.order._id.toString() === order._id.toString());
      
      if (!existsInRoutes) {
        deliveries.push({
          _id: `order_${order._id}`,
          order: order,
          deliveryStatus: 'delivered',
          completedAt: order.delivery_date,
          deliveryProof: this.convertProofOfDelivery(order.proof_of_delivery),
          source: 'direct_order'
        });
      }
    });

    return { deliveries };
  }

  /**
   * ✅ HELPER: Convertir proof_of_delivery al formato esperado por el frontend
   */
  convertProofOfDelivery(proof) {
    if (!proof) return null;

    return {
      recipientName: proof.recipient_name || 'Sin receptor',
      comments: proof.notes || '',
      photos: proof.photo_urls || (proof.photo_url ? [proof.photo_url] : []),
      photo: proof.photo_url || null,
      location: proof.delivery_location || null,
      timestamp: proof.timestamp || proof.delivery_timestamp
    };
  }


}

module.exports = new DriverHistoryController();