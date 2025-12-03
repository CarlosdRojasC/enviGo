// backend/src/controllers/driverHistory.controller.js
// VERSIÓN FINAL: Lógica unificada Web y App Móvil

const DriverHistoryService = require('../services/driverHistory.service');
const DriverHistory = require('../models/DriveryHistory');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const { parseDateRangeForQuery } = require('../utils/timezone');

class DriverHistoryController {

  // ... (testMethod se mantiene igual si quieres, o puedes borrarlo) ...
  async testMethod(req, res) {
    try {
      const totalOrders = await Order.countDocuments({ status: { $in: ['delivered', 'invoiced'] } });
      res.json({ success: true, message: "Sistema operativo", total_orders: totalOrders });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * WEB: Obtener entregas para pagos (Vista Admin)
   */
  async getAllDeliveriesForPayments(req, res) {
    try {
      const { date_from, date_to, driver_id, company_id, payment_status = 'pending' } = req.query;
      console.log('💰 Web Admin: Obteniendo pagos:', { payment_status, date_from, date_to });

      // 1. Historial
      const historyFilter = {};
      if (date_from || date_to) {
        const dateQuery = parseDateRangeForQuery(date_from, date_to);
        if (dateQuery) historyFilter.delivered_at = dateQuery;
      }
      if (driver_id) historyFilter.driver_id = driver_id;
      if (company_id) historyFilter.company_id = new mongoose.Types.ObjectId(company_id);
      if (payment_status !== 'all') historyFilter.payment_status = payment_status;

      const historyRecords = await DriverHistory.find(historyFilter).populate('company_id', 'name').lean();

      // 2. Órdenes Recientes
      const orderFilter = {
        status: { $in: ['delivered', 'invoiced'] },
        _id: { $nin: historyRecords.map(h => h.order_id) }, // Evitar duplicados
        $or: [
          { 'delivered_by_driver.driver_id': { $exists: true, $ne: null } },
          { 'driver_info.id': { $exists: true, $ne: null } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      };

      if (payment_status === 'pending') orderFilter.$and = [{ $or: [{ isPaid: { $exists: false } }, { isPaid: false }] }];
      else if (payment_status === 'paid') orderFilter.isPaid = true;

      if (date_from || date_to) {
        const dateQuery = parseDateRangeForQuery(date_from, date_to);
        if (dateQuery) orderFilter.delivery_date = dateQuery;
      }

      if (driver_id) {
        orderFilter.$or = [
          { 'delivered_by_driver.driver_id': driver_id },
          { 'driver_info.id': driver_id }
        ];
      }
      if (company_id) orderFilter.company_id = new mongoose.Types.ObjectId(company_id);

      const recentOrders = await Order.find(orderFilter).populate('company_id', 'name').lean();

      // 3. Mapeo y Fusión
      const allDeliveries = this.mergeAndMapDeliveries(historyRecords, recentOrders);

      const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(allDeliveries);
      
      res.json({
        success: true,
        data: {
          summary: {
            total_deliveries: allDeliveries.length,
            unique_drivers: driverGroups.length,
            total_amount: allDeliveries.reduce((sum, d) => sum + (d.payment_amount || 0), 0)
          },
          drivers: driverGroups
        }
      });

    } catch (error) {
      console.error('❌ Error Web Admin:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 📱 APP MÓVIL: Historial completo de un conductor
   */
  async getDriverHistory(req, res) {
    try {
      const { driverId } = req.params;
      const { start_date, end_date, limit = 100 } = req.query;

      console.log('📚 App Móvil: Buscando historial para:', driverId);

      // 1. Historial (DriverHistory)
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

      // 2. Órdenes (Order)
      const orderQuery = {
        status: { $in: ['delivered', 'invoiced'] },
        _id: { $nin: historyRecords.map(h => h.order_id) }, // Excluir ya migrados
        $or: [
          { 'delivered_by_driver.driver_id': driverId },
          { 'driver_info.id': driverId },
          // Fallback nombre por si acaso
          { 'driver_info.email': driverId } 
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

      // 3. Fusión usando el helper
      const combined = this.mergeAndMapDeliveries(historyRecords, recentOrders);

      // Ordenar por fecha
      combined.sort((a, b) => new Date(b.delivered_at) - new Date(a.delivered_at));

      res.json({
        success: true,
        data: {
          deliveries: combined.slice(0, parseInt(limit)),
          total: combined.length
        }
      });

    } catch (error) {
      console.error('❌ Error historial app:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 📱 APP MÓVIL: Pagos pendientes
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

      // 2. Pendientes en Órdenes
      const pendingOrders = await Order.find({
        status: { $in: ['delivered', 'invoiced'] },
        _id: { $nin: pendingHistory.map(h => h.order_id) }, // Evitar duplicados
        $or: [
          { isPaid: false },
          { isPaid: { $exists: false } }
        ],
        $or: [
          { 'delivered_by_driver.driver_id': driverId },
          { 'driver_info.id': driverId },
          { 'driver_info.email': driverId }
        ]
      }).select('_id order_number customer_name delivery_date shipping_address').lean();

      // 3. Fusión usando el helper
      const allPending = this.mergeAndMapDeliveries(pendingHistory, pendingOrders);

      // Ordenar por fecha (más antiguos primero para cobrar)
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
      console.error('❌ Error pendientes app:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 📱 APP MÓVIL: Estadísticas Rápidas
   */
  async getDriverStats(req, res) {
    try {
      const { driverId } = req.params;
      const { period = '30d' } = req.query;

      const now = new Date();
      const startDate = new Date();
      if (period === '7d') startDate.setDate(now.getDate() - 7);
      if (period === '30d') startDate.setDate(now.getDate() - 30);

      // Reutilizamos la lógica de getDriverHistory para consistencia
      // Nota: Esto podría optimizarse con un count(), pero así aseguramos que los números cuadren
      const reqMock = { 
          params: { driverId }, 
          query: { start_date: startDate.toISOString(), limit: 1000 } 
      };
      
      // Llamada interna simulada para obtener datos (simplificado)
      // En producción idealmente extraes la lógica de búsqueda a un servicio
      const historyQuery = { 
          driver_id: driverId, 
          delivered_at: { $gte: startDate } 
      };
      const historyRecords = await DriverHistory.find(historyQuery).lean();

      const orderQuery = {
        status: { $in: ['delivered', 'invoiced'] },
        _id: { $nin: historyRecords.map(h => h.order_id) },
        delivery_date: { $gte: startDate },
        $or: [
          { 'delivered_by_driver.driver_id': driverId },
          { 'driver_info.id': driverId }
        ]
      };
      const recentOrders = await Order.find(orderQuery).lean();

      const allDeliveries = this.mergeAndMapDeliveries(historyRecords, recentOrders);

      const stats = {
        successful_deliveries: allDeliveries.length,
        estimated_earnings: allDeliveries.reduce((sum, d) => sum + (d.payment_amount || 0), 0),
        // Pendientes totales (históricos + recientes)
        pending_payment: allDeliveries.filter(d => d.payment_status === 'pending').reduce((sum, d) => sum + (d.payment_amount || 0), 0)
      };

      res.json({ success: true, data: stats });

    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==================== HELPERS PRIVADOS (MÉTODOS DE CLASE) ====================

  /**
   * Fusiona y normaliza registros de historial y órdenes
   */
  mergeAndMapDeliveries(historyRecords, recentOrders) {
    const mappedHistory = historyRecords.map(h => ({
      _id: h._id,
      order_id: h.order_id,
      driver_id: h.driver_id,
      driver_name: h.driver_name,
      driver_email: h.driver_email,
      company_name: h.company_id?.name || 'N/A',
      order_number: h.order_number,
      customer_name: h.customer_name,
      delivery_address: h.delivery_address,
      delivered_at: h.delivered_at,
      payment_amount: h.payment_amount || 1700,
      payment_status: h.payment_status,
      paid_at: h.paid_at,
      source: 'history'
    }));

    const mappedOrders = recentOrders.map(o => {
      const dInfo = o.delivered_by_driver || {};
      const dInfo2 = o.driver_info || {};
      
      let dId = dInfo.driver_id || dInfo2.id || o.shipday_driver_id;
      let dName = dInfo.driver_name || dInfo2.name || 'Conductor';
      let dEmail = dInfo.driver_email || dInfo2.email || 'sin-email';

      if (!dId && dName !== 'Conductor') {
           dId = `manual-${dName.toLowerCase().replace(/\s+/g, '-')}`;
      }

      if (!dId) return null;

      return {
        _id: o._id,
        order_id: o._id,
        driver_id: dId,
        driver_name: dName,
        driver_email: dEmail,
        company_name: o.company_id?.name || 'N/A',
        order_number: o.order_number,
        customer_name: o.customer_name,
        delivery_address: o.shipping_address,
        delivered_at: o.delivery_date || o.updated_at,
        payment_amount: 1700, 
        payment_status: o.isPaid ? 'paid' : 'pending',
        paid_at: o.paidAt,
        source: 'order'
      };
    }).filter(Boolean);

    return [...mappedHistory, ...mappedOrders];
  }

  static groupDeliveriesByDriverStatic(deliveries) {
    const grouped = {};
    deliveries.forEach(d => {
      if (!grouped[d.driver_id]) {
        grouped[d.driver_id] = {
          id: d.driver_id,
          name: d.driver_name,
          email: d.driver_email,
          totalAmount: 0,
          total_deliveries: 0,
          deliveries: []
        };
      }
      grouped[d.driver_id].deliveries.push(d);
      grouped[d.driver_id].totalAmount += (d.payment_amount || 0);
      grouped[d.driver_id].total_deliveries++;
    });
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  // ... (createHistoryFromOrders, markDeliveriesAsPaid, payAllPendingToDriver se mantienen igual) ...
  // (Asegúrate de incluirlos copiando del código anterior si los borraste, 
  // pero este bloque principal arregla la visualización en la App)
  
    async createHistoryFromOrders(req, res) {
    /* ... Código de createHistoryFromOrders (Mantenlo igual que te di antes) ... */
        // (Para no hacer el mensaje gigante, asumo que ya tienes este método funcional del paso anterior.
        // Si lo necesitas de nuevo, avísame)
         try {
      console.log('🔄 Iniciando migración de historial (Nativo)...');
      const orders = await Order.find({
        status: 'delivered',
        $or: [
          { 'delivered_by_driver.driver_id': { $exists: true } },
          { 'driver_info.name': { $exists: true } }
        ]
      }).populate('company_id').lean();

      let created = 0, skipped = 0;
      for (const order of orders) {
        const exists = await DriverHistory.findOne({ order_id: order._id });
        if (exists) { skipped++; continue; }

        let driverId = order.delivered_by_driver?.driver_id || order.driver_info?.id;
        let driverName = order.delivered_by_driver?.driver_name || order.driver_info?.name || 'Conductor';
        let driverEmail = order.delivered_by_driver?.driver_email || order.driver_info?.email || 'sin-email';

        if (!driverId && driverName) driverId = `manual-${driverName.toLowerCase().replace(/\s+/g, '-')}`;
        if (!driverId) continue;

        const deliveryDate = order.delivery_date || order.updated_at || new Date();
        const paymentPeriod = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;

        await DriverHistory.create({
          driver_id: driverId, driver_name: driverName, driver_email: driverEmail,
          company_id: order.company_id._id, order_id: order._id, order_number: order.order_number,
          delivery_address: order.shipping_address, customer_name: order.customer_name,
          delivered_at: deliveryDate, payment_amount: 1700, payment_status: order.isPaid ? 'paid' : 'pending',
          payment_period: paymentPeriod
        });
        created++;
      }
      res.json({ success: true, message: `Migración: ${created} creados, ${skipped} existen` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async markDeliveriesAsPaid(req, res) {
     try {
      const { orderIds, paymentNote } = req.body;
      const paidBy = req.user.id;
      await Order.updateMany({ _id: { $in: orderIds } }, { isPaid: true, paidAt: new Date(), paidBy, paymentNote });
      await DriverHistory.updateMany({ order_id: { $in: orderIds } }, { payment_status: 'paid', paid_at: new Date(), paid_by: paidBy });
      res.json({ success: true, data: { orders_updated: orderIds.length } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async payAllPendingToDriver(req, res) {
      /* ... Código de payAllPendingToDriver (Igual que antes) ... */
        try {
      const { driverId } = req.params;
      const { paymentNote } = req.body;
      const paidBy = req.user.id;

      const pendingOrders = await Order.find({
        status: { $in: ['delivered', 'invoiced'] },
        $or: [{ isPaid: false }, { isPaid: { $exists: false } }],
        $or: [{ 'delivered_by_driver.driver_id': driverId }, { 'driver_info.id': driverId }]
      }).select('_id');

      const ids = pendingOrders.map(o => o._id);
      if (ids.length > 0) {
          await Order.updateMany({ _id: { $in: ids } }, { isPaid: true, paidAt: new Date(), paidBy, paymentNote });
          await DriverHistory.updateMany({ order_id: { $in: ids } }, { payment_status: 'paid', paid_at: new Date() });
      }
      res.json({ success: true, message: `Se pagaron ${ids.length} entregas` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new DriverHistoryController();