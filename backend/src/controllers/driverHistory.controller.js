// backend/src/controllers/driverHistory.controller.js - CON LOGS DE DEBUG
const Order = require('../models/Order');
const mongoose = require('mongoose');

class DriverHistoryController {

  async getAllDeliveriesForPayments(req, res) {
    try {
      const { 
        date_from, 
        date_to, 
        driver_id, 
        company_id, 
        payment_status = 'pending' 
      } = req.query;

      console.log('🔥 PARAMS RECIBIDOS:', { date_from, date_to, driver_id, company_id, payment_status });

      // PASO 1: Ver todos los pedidos primero
      console.log('🔥 PASO 1: Contando TODOS los pedidos...');
      const totalOrders = await Order.countDocuments({});
      console.log('🔥 Total pedidos en BD:', totalOrders);

      // PASO 2: Ver pedidos con status = 'delivered'
      console.log('🔥 PASO 2: Contando pedidos delivered...');
      const deliveredCount = await Order.countDocuments({ status: 'delivered' });
      console.log('🔥 Pedidos delivered:', deliveredCount);

      // PASO 3: Ver pedidos con conductor
      console.log('🔥 PASO 3: Contando pedidos con conductor...');
      const withDriverCount = await Order.countDocuments({ 
        'driver_info.shipday_driver_id': { $exists: true, $ne: null } 
      });
      console.log('🔥 Pedidos con conductor:', withDriverCount);

      // PASO 4: Ver pedidos delivered Y con conductor
      console.log('🔥 PASO 4: Contando pedidos delivered + conductor...');
      const deliveredWithDriverCount = await Order.countDocuments({ 
        status: 'delivered',
        'driver_info.shipday_driver_id': { $exists: true, $ne: null } 
      });
      console.log('🔥 Pedidos delivered + conductor:', deliveredWithDriverCount);

      // PASO 5: Ver algunos ejemplos de pedidos
      console.log('🔥 PASO 5: Obteniendo ejemplos de pedidos...');
      const sampleOrders = await Order.find({})
        .select('order_number status driver_info delivery_date')
        .limit(3)
        .lean();
      
      console.log('🔥 EJEMPLOS DE PEDIDOS:');
      sampleOrders.forEach((order, index) => {
        console.log(`🔥 Pedido ${index + 1}:`, {
          order_number: order.order_number,
          status: order.status,
          has_driver_info: !!order.driver_info,
          driver_id: order.driver_info?.shipday_driver_id,
          delivery_date: order.delivery_date
        });
      });

      // PASO 6: Aplicar filtros paso a paso
      console.log('🔥 PASO 6: Aplicando filtros...');
      
      const filters = {
        status: 'delivered',
        'driver_info.shipday_driver_id': { $exists: true, $ne: null }
      };

      console.log('🔥 Filtros base:', filters);

      // Solo agregar filtro de fechas si se proporcionan
      if (date_from || date_to) {
        filters.delivery_date = {};
        if (date_from) {
          filters.delivery_date.$gte = new Date(date_from);
          console.log('🔥 Fecha desde:', new Date(date_from));
        }
        if (date_to) {
          filters.delivery_date.$lte = new Date(date_to + 'T23:59:59.999Z');
          console.log('🔥 Fecha hasta:', new Date(date_to + 'T23:59:59.999Z'));
        }
      }

      if (driver_id) {
        filters['driver_info.shipday_driver_id'] = driver_id;
        console.log('🔥 Filtro conductor:', driver_id);
      }

      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
        console.log('🔥 Filtro empresa:', company_id);
      }

      console.log('🔥 FILTROS FINALES:', JSON.stringify(filters, null, 2));

      // PASO 7: Ejecutar consulta con filtros
      console.log('🔥 PASO 7: Ejecutando consulta con filtros...');
      const filteredCount = await Order.countDocuments(filters);
      console.log('🔥 Pedidos que cumplen filtros:', filteredCount);

      // PASO 8: Obtener los pedidos
      console.log('🔥 PASO 8: Obteniendo pedidos completos...');
      const orders = await Order.find(filters)
        .populate('company_id', 'name')
        .select(`
          order_number customer_name customer_email
          shipping_address shipping_commune
          shipping_cost total_amount
          delivery_date driver_info
          status created_at
        `)
        .sort({ delivery_date: -1 })
        .lean();

      console.log('🔥 Pedidos obtenidos:', orders.length);

      if (orders.length > 0) {
        console.log('🔥 PRIMER PEDIDO:', {
          order_number: orders[0].order_number,
          driver_name: orders[0].driver_info?.name,
          driver_id: orders[0].driver_info?.shipday_driver_id,
          shipping_cost: orders[0].shipping_cost,
          delivery_date: orders[0].delivery_date
        });
      }

      // PASO 9: Agrupar por conductor
      console.log('🔥 PASO 9: Agrupando por conductor...');
      const driversMap = {};
      
      orders.forEach(order => {
        const driverId = order.driver_info?.shipday_driver_id;
        const driverName = order.driver_info?.name || 'Conductor Desconocido';
        const driverEmail = order.driver_info?.email;
        const paymentAmount = order.shipping_cost || 1800;

        console.log('🔥 Procesando pedido:', {
          order: order.order_number,
          driver: driverName,
          driver_id: driverId,
          amount: paymentAmount
        });

        if (!driversMap[driverId]) {
          driversMap[driverId] = {
            driver_id: driverId,
            driver_name: driverName,
            driver_email: driverEmail,
            total_deliveries: 0,
            total_amount: 0,
            pending_amount: 0,
            paid_amount: 0,
            companies_served: new Set(),
            deliveries: []
          };
        }

        driversMap[driverId].total_deliveries += 1;
        driversMap[driverId].total_amount += paymentAmount;
        driversMap[driverId].pending_amount += paymentAmount; // Todos pendientes por ahora

        if (order.company_id?.name) {
          driversMap[driverId].companies_served.add(order.company_id.name);
        }

        driversMap[driverId].deliveries.push(order._id);
      });

      const drivers = Object.values(driversMap).map(driver => ({
        ...driver,
        companies_served: Array.from(driver.companies_served),
        companies_count: driver.companies_served.length
      }));

      console.log('🔥 CONDUCTORES FINALES:', drivers.length);
      drivers.forEach(driver => {
        console.log('🔥 Conductor:', {
          name: driver.driver_name,
          deliveries: driver.total_deliveries,
          amount: driver.total_amount
        });
      });

      // Calcular estadísticas
      const totalAmount = orders.reduce((sum, order) => sum + (order.shipping_cost || 1800), 0);
      const uniqueDrivers = new Set(orders.map(order => order.driver_info?.shipday_driver_id)).size;

      const stats = {
        total_deliveries: orders.length,
        total_amount: totalAmount,
        pending_deliveries: orders.length,
        pending_amount: totalAmount,
        paid_deliveries: 0,
        paid_amount: 0,
        unique_drivers: uniqueDrivers,
        average_per_delivery: orders.length > 0 ? totalAmount / orders.length : 0,
        average_per_driver: uniqueDrivers > 0 ? totalAmount / uniqueDrivers : 0
      };

      console.log('🔥 STATS FINALES:', stats);

      res.json({
        success: true,
        data: {
          period: { date_from, date_to },
          filters: { driver_id, company_id, payment_status },
          stats,
          drivers,
          deliveries: orders.map(order => ({
            id: order._id,
            driver_id: order.driver_info?.shipday_driver_id,
            driver_name: order.driver_info?.name,
            driver_email: order.driver_info?.email,
            order_number: order.order_number,
            customer_name: order.customer_name,
            delivery_address: order.shipping_address,
            delivered_at: order.delivery_date,
            payment_amount: order.shipping_cost || 1800,
            payment_status: 'pending',
            paid_at: null,
            company: {
              id: order.company_id?._id,
              name: order.company_id?.name || 'Empresa Desconocida'
            }
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ ERROR COMPLETO:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo entregas para pagos',
        details: error.message
      });
    }
  }

  // Otros métodos simplificados...
  async markDeliveriesAsPaid(req, res) {
    res.json({ success: false, error: 'Método no implementado aún' });
  }

  async payAllPendingToDriver(req, res) {
    res.json({ success: false, error: 'Método no implementado aún' });
  }

  async getGlobalPaymentSummary(req, res) {
    return this.getAllDeliveriesForPayments(req, res);
  }

  async getAllActiveDrivers(req, res) {
    res.json({ success: false, error: 'Método no implementado' });
  }

  async getCompanyDeliveries(req, res) {
    req.query.company_id = req.params.companyId;
    return this.getAllDeliveriesForPayments(req, res);
  }

  async getDriverHistory(req, res) {
    res.json({ success: false, error: 'Método no implementado' });
  }

  async getPendingPayments(req, res) {
    res.json({ success: false, error: 'Método no implementado' });
  }

  async getMonthlyPaymentReport(req, res) {
    res.json({ success: false, error: 'Método no implementado' });
  }

  async getActiveDrivers(req, res) {
    res.json({ success: false, error: 'Método no implementado' });
  }

  async getCompanyDeliveryStats(req, res) {
    res.json({ success: false, error: 'Método no implementado' });
  }

  async exportToExcel(req, res) {
    res.json({ success: false, error: 'Método no implementado' });
  }
}

module.exports = new DriverHistoryController();