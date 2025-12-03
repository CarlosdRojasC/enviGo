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

      console.log('💰 Obteniendo entregas (Historial + Órdenes):', { payment_status, date_from, date_to });

      // =======================================================
      // 1. BUSCAR EN DRIVER HISTORY (Datos Migrados/Históricos)
      // =======================================================
      const historyFilter = {};
      
      // Filtro de fechas
      if (date_from || date_to) {
        const dateQuery = parseDateRangeForQuery(date_from, date_to);
        if (dateQuery) historyFilter.delivered_at = dateQuery;
      }

      // Filtros directos
      if (driver_id) historyFilter.driver_id = driver_id;
      if (company_id) historyFilter.company_id = new mongoose.Types.ObjectId(company_id);
      if (payment_status !== 'all') historyFilter.payment_status = payment_status;

      const historyRecords = await DriverHistory.find(historyFilter)
        .populate('company_id', 'name') // Necesitamos el nombre de la empresa si está referenciada
        .lean();

      console.log(`📚 Registros en Historial: ${historyRecords.length}`);

      // =======================================================
      // 2. BUSCAR EN ORDERS (Datos Recientes/No Migrados)
      // =======================================================
      const orderFilter = {
        status: { $in: ['delivered', 'invoiced'] },
        // Excluir los que ya están en el historial para no duplicar
        _id: { $nin: historyRecords.map(h => h.order_id) },
        // Buscar conductor en campos nativos
        $or: [
          { 'delivered_by_driver.driver_id': { $exists: true, $ne: null } },
          { 'driver_info.id': { $exists: true, $ne: null } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      };

      // Filtro de pago para órdenes
      if (payment_status === 'pending') {
        orderFilter.$and = [{ $or: [{ isPaid: { $exists: false } }, { isPaid: false }] }];
      } else if (payment_status === 'paid') {
        orderFilter.isPaid = true;
      }

      if (date_from || date_to) {
        const dateQuery = parseDateRangeForQuery(date_from, date_to);
        if (dateQuery) orderFilter.delivery_date = dateQuery;
      }

      if (driver_id) {
  orderFilter.$and = [
    ...(orderFilter.$and || []),
    {
      $or: [
        { 'delivered_by_driver.driver_id': driver_id },
        { 'driver_info.id': driver_id },
        { 'driver_info.email': driver_id }, // 👉 NUEVO
      ]
    }
  ];
}

      
      if (company_id) {
        orderFilter.company_id = new mongoose.Types.ObjectId(company_id);
      }

      const recentOrders = await Order.find(orderFilter)
        .populate('company_id', 'name')
        .lean();

      console.log(`📦 Órdenes recientes (no en historial): ${recentOrders.length}`);

      // =======================================================
      // 3. UNIFICAR FORMATOS
      // =======================================================
      
      // Formatear registros del historial
      const mappedHistory = historyRecords.map(h => ({
        _id: h._id, // ID del registro de pago
        driver_id: h.driver_id,
        driver_name: h.driver_name,
        driver_email: h.driver_email,
        company_id: h.company_id?._id || h.company_id, // Manejar si está poblado o no
        company_name: h.company_id?.name || 'N/A',
        order_id: h.order_id,
        order_number: h.order_number,
        customer_name: h.customer_name,
        delivery_address: h.delivery_address,
        delivered_at: h.delivered_at,
        payment_amount: h.payment_amount,
        payment_status: h.payment_status,
        paid_at: h.paid_at,
        source: 'history' // Marca de origen
      }));

      // Formatear órdenes recientes
      const mappedOrders = recentOrders.map(o => {
        const driverInfo = {
          id: o.delivered_by_driver?.driver_id || o.driver_info?.id,
          name: o.delivered_by_driver?.driver_name || o.driver_info?.name || 'Conductor Desconocido',
          email: o.delivered_by_driver?.driver_email || o.driver_info?.email || 'sin-email'
        };

        // Generar ID temporal si no existe
        if (!driverInfo.id && driverInfo.name) {
             driverInfo.id = `manual-${driverInfo.name.toLowerCase().replace(/\s+/g, '-')}`;
        }

        return {
          _id: o._id, // ID de la orden (actúa como ID de pago temporal)
          driver_id: driverInfo.id,
          driver_name: driverInfo.name,
          driver_email: driverInfo.email,
          company_id: o.company_id?._id || o.company_id,
          company_name: o.company_id?.name || 'N/A',
          order_id: o._id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          delivery_address: o.shipping_address,
          delivered_at: o.delivery_date || o.updated_at,
          payment_amount: 1700, // Tarifa por defecto
          payment_status: o.isPaid ? 'paid' : 'pending',
          paid_at: o.paidAt,
          source: 'order' // Marca de origen
        };
      }).filter(d => d.driver_id); // Filtramos si no logramos identificar conductor

      // Combinar todo
      const allDeliveries = [...mappedHistory, ...mappedOrders];
      
      // Ordenar por fecha descendente
      allDeliveries.sort((a, b) => new Date(b.delivered_at) - new Date(a.delivered_at));

      // =======================================================
      // 4. AGRUPAR Y RESPONDER
      // =======================================================
      const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(allDeliveries);

      const summary = {
        total_deliveries: allDeliveries.length,
        unique_drivers: driverGroups.length,
        total_amount: allDeliveries.reduce((sum, d) => sum + (d.payment_amount || 0), 0),
        data_source: 'merged'
      };

      res.json({
        success: true,
        data: {
          summary,
          drivers: driverGroups,
          debug: {
            history_count: mappedHistory.length,
            orders_count: mappedOrders.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo pagos:', error);
      res.status(500).json({ success: false, error: error.message });
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
            driver_id: order.driver_info?.email || order.shipday_driver_id || 'no-email@migrated.com',
  driver_email: order.driver_info?.email || 'no-email@migrated.com',
  driver_name: order.driver_info?.name || 'Conductor',
          company_id: order.company_id._id,
          order_id: order._id,
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
    const driverEmail =
      delivery.driver_email ||
      delivery.driver_info?.email ||
      'no-email@driver.com';

    const driverName =
      delivery.driver_name ||
      delivery.driver_info?.name ||
      'Conductor';

    const paymentAmount = delivery.payment_amount || 1700;

    const driverKey = driverEmail;

    if (!grouped[driverKey]) {
      grouped[driverKey] = {
        driver_id: driverKey,
        driver_name: driverName,
        driver_email: driverEmail,
        total_deliveries: 0,
        total_amount: 0,
        deliveries: []
      };
    }

    grouped[driverKey].total_deliveries++;
    grouped[driverKey].total_amount += paymentAmount;
    grouped[driverKey].deliveries.push({
      _id: delivery._id,
      // 🔥 IMPORTANTE: enviar también el order_id
      order_id: delivery.order_id || delivery._id,  // ← clave para el frontend
      order_number: delivery.order_number,
      customer_name: delivery.customer_name,
      delivery_address: delivery.delivery_address || delivery.shipping_address,
      delivered_at: delivery.delivered_at || delivery.delivery_date,
      payment_amount: paymentAmount,
      company_name: delivery.company_id?.name,
      payment_status: delivery.payment_status,
      paid_at: delivery.paid_at,
      // opcional pero útil:
      source: delivery.source,
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

    console.log('💰 Marcando como pagadas las órdenes/deliveries:', orderIds);

    // Actualizar las órdenes (si alguno es realmente un _id de Order)
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
      { 
        $or: [
          { order_id: { $in: orderIds } }, // cuando te manden IDs de Order
          { _id: { $in: orderIds } }       // cuando te manden IDs de DriverHistory (lo que pasa hoy)
        ]
      },
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
      message: `${orderResult.modifiedCount + historyResult.modifiedCount} entregas marcadas como pagadas`,
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
  status: { $in: ['delivered', 'invoiced'] },
  $or: [
    { 'driver_info.email': driverId },   // driverId = correo
    { 'driver_info.name': driverId }     // o nombre
  ],
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
        limit = 100 
      } = req.query;

      console.log('📚 App Móvil: Buscando historial para:', driverId);

      // 1. BUSCAR EN DRIVER HISTORY (Ya pagados o migrados)
      const historyQuery = { driver_id: driverId };
      
      if (start_date || end_date) {
        historyQuery.delivered_at = {};
        if (start_date) historyQuery.delivered_at.$gte = new Date(start_date);
        if (end_date) historyQuery.delivered_at.$lte = new Date(end_date);
      }

      const historyRecords = await DriverHistory.find(historyQuery)
        .sort({ delivered_at: -1 })
        .limit(parseInt(limit))
        .lean();

      // 2. BUSCAR EN ÓRDENES (Recientes, no migradas)
      const orderQuery = {
  status: { $in: ['delivered', 'invoiced'] },

  _id: { $nin: historyRecords.map(h => h.order_id) },

  $and: [
    {
      $or: [
        { 'delivered_by_driver.driver_id': driverId },
        { 'driver_info.id': driverId },
        { 'driver_info.email': driverId }, // 👉 NUEVO
        { shipday_driver_id: driverId }    // legacy
      ]
    }
  ]
};


      if (start_date || end_date) {
        orderQuery.delivery_date = {};
        if (start_date) orderQuery.delivery_date.$gte = new Date(start_date);
        if (end_date) orderQuery.delivery_date.$lte = new Date(end_date);
      }

      const recentOrders = await Order.find(orderQuery)
        .select('_id order_number customer_name shipping_address delivery_date isPaid paidAt paymentNote')
        .sort({ delivery_date: -1 })
        .limit(parseInt(limit))
        .lean();

      // 3. UNIFICAR
      const combined = [
        ...historyRecords.map(h => ({
          _id: h._id,
          order_number: h.order_number,
          customer_name: h.customer_name,
          delivery_address: h.delivery_address,
          delivered_at: h.delivered_at,
          payment_amount: h.payment_amount,
          payment_status: h.payment_status,
          source: 'history'
        })),
        ...recentOrders.map(o => ({
          _id: o._id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          delivery_address: o.shipping_address,
          delivered_at: o.delivery_date,
          payment_amount: 1700,
          payment_status: o.isPaid ? 'paid' : 'pending',
          source: 'order'
        }))
      ];

      // Ordenar por fecha descendente
      combined.sort((a, b) => new Date(b.delivered_at) - new Date(a.delivered_at));

      res.json({
        success: true,
        data: {
          deliveries: combined.slice(0, parseInt(limit)), // Aplicar límite final
          total: combined.length
        }
      });

    } catch (error) {
      console.error('❌ Error historial conductor:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ✅ NUEVO: Obtener estadísticas de un conductor
   */
  async getDriverStats(req, res) {
    try {
      const { driverId } = req.params;
      const { period = '30d' } = req.query; // 7d, 30d, all

      const dateFilter = {};
      const now = new Date();
      
      if (period === '7d') dateFilter.$gte = new Date(now.setDate(now.getDate() - 7));
      if (period === '30d') dateFilter.$gte = new Date(now.setDate(now.getDate() - 30));

      // Usamos una agregación simple sobre el Historial (que es más rápido)
      // Si necesitas precisión absoluta con órdenes no migradas, sería más complejo, 
      // pero para stats rápidas el historial suele bastar si se migra regularmente.
      
      // Vamos a contar todo (Historial + Orders) para ser precisos
      
      // ... (Puedes reutilizar la lógica de getDriverHistoryData o hacer un count rápido)
      // Por simplicidad y velocidad en la app, usaremos el método getDriverHistoryData que ya creamos antes
      
      const historyData = await this.getDriverHistoryData(driverId, dateFilter.$gte || new Date(0), new Date());
      const deliveries = historyData.deliveries;

      const stats = {
        successful_deliveries: deliveries.filter(d => d.deliveryStatus === 'delivered').length,
        estimated_earnings: deliveries.reduce((sum, d) => sum + (d.payment_amount || 1700), 0),
        pending_payment: deliveries.filter(d => d.payment_status === 'pending').reduce((sum, d) => sum + (d.payment_amount || 1700), 0)
      };

      res.json({ success: true, data: stats });

    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ✅ NUEVO: Obtener entregas pendientes de pago de un conductor
   */
  async getDriverPendingPayments(req, res) {
    try {
      const { driverId } = req.params;
      console.log('💰 App Móvil: Buscando pendientes para:', driverId);

      // 1. Pendientes en Historial
      const pendingHistory = await DriverHistory.find({
        driver_id: driverId,
        payment_status: 'pending'
      }).lean();

      // 2. Pendientes en Órdenes (que no estén en historial)
      const pendingOrders = await Order.find({
  status: { $in: ['delivered', 'invoiced'] },

  _id: { $nin: pendingHistory.map(h => h.order_id) },

  $and: [
    {
      $or: [
        { isPaid: false },
        { isPaid: { $exists: false } }
      ]
    },
    {
      $or: [
        { 'delivered_by_driver.driver_id': driverId },
        { 'driver_info.id': driverId },
        { shipday_driver_id: driverId }
      ]
    }
  ]
})
.select('_id order_number customer_name delivery_date shipping_address')
.lean();
      // 3. Combinar
      const allPending = [
        ...pendingHistory.map(h => ({
          _id: h._id,
          order_number: h.order_number,
          customer_name: h.customer_name,
          delivery_address: h.delivery_address,
          delivered_at: h.delivered_at,
          payment_amount: h.payment_amount,
          payment_status: 'pending',
          source: 'history'
        })),
        ...pendingOrders.map(o => ({
          _id: o._id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          delivery_address: o.shipping_address,
          delivered_at: o.delivery_date,
          payment_amount: 1700,
          payment_status: 'pending',
          source: 'order'
        }))
      ];

      // Ordenar más antiguas primero (para cobrar)
      allPending.sort((a, b) => new Date(a.delivered_at) - new Date(b.delivered_at));

      res.json({
        success: true,
        data: {
          deliveries: allPending,
          total_amount: allPending.reduce((sum, item) => sum + (item.payment_amount || 0), 0),
          count: allPending.length
        }
      });

    } catch (error) {
      console.error('❌ Error pendientes conductor:', error);
      res.status(500).json({ success: false, error: error.message });
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