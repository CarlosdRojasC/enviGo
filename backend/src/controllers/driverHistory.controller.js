// backend/src/controllers/driverHistory.controller.js
// VERSIÓN ACTUALIZADA: Eliminada dependencia de Shipday

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
        date_from, 
        date_to, 
        driver_id, 
        company_id, 
        payment_status = 'pending' 
      } = req.query;

      console.log('🔥 TEST: Iniciando diagnóstico de pagos...');

      // PASO 1: Contar pedidos delivered/invoiced
      const totalOrders = await Order.countDocuments({ 
        status: { $in: ['delivered', 'invoiced'] } 
      });
      console.log('🔥 Pedidos completados (delivered/invoiced):', totalOrders);

      // PASO 2: Pedidos con información de conductor (Lógica Nueva)
      const withDriverCount = await Order.countDocuments({
        status: { $in: ['delivered', 'invoiced'] },
        $or: [
          { 'delivered_by_driver.driver_id': { $exists: true, $ne: null } },
          { 'driver_info.id': { $exists: true, $ne: null } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      });
      console.log('🔥 Pedidos con conductor asignado:', withDriverCount);

      // PASO 3: Obtener ejemplos
      const examples = await Order.find({
        status: { $in: ['delivered', 'invoiced'] },
        $or: [
          { 'delivered_by_driver.driver_id': { $exists: true } },
          { 'driver_info.name': { $exists: true } }
        ]
      })
      .limit(5)
      .select('order_number status delivered_by_driver driver_info delivery_date')
      .lean();

      res.json({
        success: true,
        debug_info: {
          total_completed_orders: totalOrders,
          orders_with_driver: withDriverCount,
          sample_orders: examples
        }
      });

    } catch (error) {
      console.error('❌ Error en test method:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtener entregas para pagos (Vista Principal)
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

      console.log('💰 Obteniendo entregas (Nativo):', { payment_status, date_from, date_to });

      // 1. Construir Filtros
      const orderFilters = {
        status: { $in: ['delivered', 'invoiced'] },
        // Buscar conductor en campos nativos
        $or: [
          { 'delivered_by_driver.driver_id': { $exists: true, $ne: null } },
          { 'driver_info.id': { $exists: true, $ne: null } },
          // Fallback a búsqueda por nombre si no hay ID
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      };

      // Filtro por estado de pago
      if (payment_status === 'pending') {
        orderFilters.$and = [{ $or: [{ isPaid: { $exists: false } }, { isPaid: false }] }];
      } else if (payment_status === 'paid') {
        orderFilters.isPaid = true;
      }

      // Filtros de fecha
      if (date_from || date_to) {
        orderFilters.delivery_date = parseDateRangeForQuery(date_from, date_to);
      }

      // Filtro por Conductor Específico
      if (driver_id) {
        orderFilters.$or = [
          { 'delivered_by_driver.driver_id': driver_id },
          { 'driver_info.id': driver_id }
        ];
      }

      if (company_id) {
        orderFilters.company_id = new mongoose.Types.ObjectId(company_id);
      }

      // 2. Consultar Base de Datos
      const orders = await Order.find(orderFilters)
        .populate('company_id', 'name email phone')
        .sort({ delivery_date: -1 })
        .lean();

      console.log(`📊 Encontradas ${orders.length} órdenes para procesar`);

      // 3. Mapeo Inteligente
      const deliveries = orders.map(order => {
        // Prioridad: delivered_by_driver -> driver_info
        const driverInfo = {
          id: order.delivered_by_driver?.driver_id || order.driver_info?.id,
          name: order.delivered_by_driver?.driver_name || order.driver_info?.name || 'Conductor Desconocido',
          email: order.delivered_by_driver?.driver_email || order.driver_info?.email || 'sin-email'
        };

        // Si no hay ID pero hay nombre, generar ID temporal para agrupación
        if (!driverInfo.id && driverInfo.name !== 'Conductor Desconocido') {
             driverInfo.id = `manual-${driverInfo.name.toLowerCase().replace(/\s+/g, '-')}`;
        }

        return {
          _id: order._id,
          driver_id: driverInfo.id,
          driver_name: driverInfo.name,
          driver_email: driverInfo.email,
          company_id: order.company_id,
          company_name: order.company_id?.name,
          order_number: order.order_number,
          customer_name: order.customer_name,
          delivery_address: order.shipping_address,
          delivered_at: order.delivery_date || order.updated_at,
          payment_amount: 1700, // Tarifa fija
          payment_status: order.isPaid ? 'paid' : 'pending',
          paid_at: order.paidAt
        };
      }).filter(d => d.driver_id); 

      // 4. Agrupar por Conductor
      const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(deliveries);

      // 5. Resumen
      const summary = {
        total_deliveries: deliveries.length,
        unique_drivers: driverGroups.length,
        total_amount: deliveries.reduce((sum, d) => sum + d.payment_amount, 0),
        data_source: 'orders_native'
      };

      res.json({
        success: true,
        data: {
          summary,
          drivers: driverGroups,
          raw_count: deliveries.length
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo pagos:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Migrar datos históricos
   */
  async createHistoryFromOrders(req, res) {
    try {
      console.log('🔄 Iniciando migración de historial (Nativo)...');

      // Buscar órdenes entregadas con datos de conductor nativos
      const orders = await Order.find({
        status: 'delivered',
        $or: [
          { 'delivered_by_driver.driver_id': { $exists: true } },
          { 'driver_info.name': { $exists: true } }
        ]
      }).populate('company_id').lean();

      console.log(`📊 Analizando ${orders.length} órdenes para migración`);

      let created = 0;
      let skipped = 0;

      for (const order of orders) {
        const exists = await DriverHistory.findOne({ order_id: order._id });
        if (exists) {
          skipped++;
          continue;
        }

        // Resolver ID
        let driverId = order.delivered_by_driver?.driver_id || order.driver_info?.id;
        let driverName = order.delivered_by_driver?.driver_name || order.driver_info?.name || 'Conductor';
        let driverEmail = order.delivered_by_driver?.driver_email || order.driver_info?.email || 'sin-email';

        if (!driverId && driverName) {
            driverId = `manual-${driverName.toLowerCase().replace(/\s+/g, '-')}`;
        }

        if (!driverId) {
            continue;
        }

        const deliveryDate = order.delivery_date || order.updated_at || new Date();
        const paymentPeriod = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;

        await DriverHistory.create({
          driver_id: driverId,
          driver_name: driverName,
          driver_email: driverEmail,
          company_id: order.company_id._id,
          order_id: order._id,
          order_number: order.order_number,
          delivery_address: order.shipping_address,
          customer_name: order.customer_name,
          delivered_at: deliveryDate,
          payment_amount: 1700,
          payment_status: order.isPaid ? 'paid' : 'pending',
          payment_period: paymentPeriod
        });

        created++;
      }

      res.json({
        success: true,
        message: `Migración finalizada: ${created} creados, ${skipped} ya existían`,
        data: { created, total: orders.length }
      });

    } catch (error) {
      console.error('❌ Error en migración:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Agrupar entregas por conductor
   */
  static groupDeliveriesByDriverStatic(deliveries) {
    const grouped = {};
    
    deliveries.forEach(d => {
      const dId = d.driver_id;
      if (!dId) return;

      if (!grouped[dId]) {
        grouped[dId] = {
          id: dId,
          driver_id: dId,
          name: d.driver_name,
          email: d.driver_email,
          total_amount: 0,
          total_deliveries: 0,
          deliveries: []
        };
      }

      grouped[dId].total_amount += (d.payment_amount || 0);
      grouped[dId].total_deliveries++;
      grouped[dId].deliveries.push(d);
    });

    return Object.values(grouped).sort((a, b) => b.total_amount - a.total_amount);
  }

  /**
   * Marcar entregas como pagadas
   */
  async markDeliveriesAsPaid(req, res) {
    try {
      const { orderIds, paymentNote } = req.body;
      const paidBy = req.user.id;

      await Order.updateMany(
        { _id: { $in: orderIds } },
        { isPaid: true, paidAt: new Date(), paidBy, paymentNote }
      );

      await DriverHistory.updateMany(
        { order_id: { $in: orderIds } },
        { payment_status: 'paid', paid_at: new Date(), paid_by: paidBy }
      );

      res.json({ success: true, data: { orders_updated: orderIds.length } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Pagar TODO lo pendiente de un conductor
   */
  async payAllPendingToDriver(req, res) {
    try {
      const { driverId } = req.params;
      const { paymentNote } = req.body;
      const paidBy = req.user.id;

      // Buscar pendientes usando campos nativos
      const pendingOrders = await Order.find({
        status: { $in: ['delivered', 'invoiced'] },
        $or: [
            { isPaid: false },
            { isPaid: { $exists: false } }
        ],
        $or: [
          { 'delivered_by_driver.driver_id': driverId },
          { 'driver_info.id': driverId }
        ]
      }).select('_id');

      const ids = pendingOrders.map(o => o._id);

      if (ids.length > 0) {
          await Order.updateMany(
            { _id: { $in: ids } },
            { isPaid: true, paidAt: new Date(), paidBy, paymentNote }
          );
          
          await DriverHistory.updateMany(
            { order_id: { $in: ids } },
            { payment_status: 'paid', paid_at: new Date() }
          );
      }

      res.json({
        success: true,
        message: `Se pagaron ${ids.length} entregas`
      });

    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ✅ Obtener estadísticas de conductor
  async getDriverStats(req, res) {
      res.status(501).json({message: "Método en actualización"}); 
  }

  // ✅ Obtener pagos pendientes de un conductor específico
  async getDriverPendingPayments(req, res) {
      const { driverId } = req.params;
      req.query.driver_id = driverId;
      req.query.payment_status = 'pending';
      return this.getAllDeliveriesForPayments(req, res);
  }
}

module.exports = new DriverHistoryController();