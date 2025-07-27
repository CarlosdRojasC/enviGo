// backend/src/controllers/driverHistory.controller.js - CORREGIDO CON TUS CAMPOS REALES
const Order = require('../models/Order');
const mongoose = require('mongoose');

class DriverHistoryController {

  /**
   * Obtener pedidos entregados para pagos de conductores
   * GET /api/driver-history/all-deliveries
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

      console.log('📦 Buscando pedidos entregados para pagos...');

      // Filtros: solo pedidos entregados con conductor
      const filters = {
        status: 'delivered', // TU CAMPO: status
        'driver_info.shipday_driver_id': { $exists: true, $ne: null } // TU CAMPO: driver_info.shipday_driver_id
      };

      // Filtro por fechas (usando delivery_date)
      if (date_from || date_to) {
        filters.delivery_date = {}; // TU CAMPO: delivery_date
        if (date_from) filters.delivery_date.$gte = new Date(date_from);
        if (date_to) filters.delivery_date.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // Filtro por conductor
      if (driver_id) {
        filters['driver_info.shipday_driver_id'] = driver_id; // TU CAMPO
      }

      // Filtro por empresa
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id); // TU CAMPO: company_id
      }

      // Para payment_status, vamos a agregar un campo nuevo después
      // Por ahora, asumimos que todos están "pending" ya que no existe el campo

      console.log('🔍 Filtros aplicados:', filters);

      // Buscar pedidos
      const orders = await Order.find(filters)
        .populate('company_id', 'name') // TU CAMPO: company_id
        .select(`
          order_number customer_name customer_email
          shipping_address shipping_commune
          shipping_cost total_amount
          delivery_date driver_info
          status created_at
          driver_payment_status driver_payment_date
        `)
        .sort({ delivery_date: -1 }) // TU CAMPO: delivery_date
        .lean();

      console.log('📊 Pedidos encontrados:', orders.length);

      // Agrupar por conductor
      const driversMap = {};
      
      orders.forEach(order => {
        const driverId = order.driver_info?.shipday_driver_id;
        const driverName = order.driver_info?.name || 'Conductor Desconocido';
        const driverEmail = order.driver_info?.email;
        const paymentAmount = order.shipping_cost || 1800; // TU CAMPO: shipping_cost

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
        
        // Como no tienes driver_payment_status, asumimos que todos están pendientes
        // Puedes agregar este campo a tu modelo después
        if (order.driver_payment_status === 'paid') {
          driversMap[driverId].paid_amount += paymentAmount;
        } else {
          driversMap[driverId].pending_amount += paymentAmount;
        }

        if (order.company_id?.name) {
          driversMap[driverId].companies_served.add(order.company_id.name);
        }

        driversMap[driverId].deliveries.push(order._id);
      });

      // Convertir a array
      const drivers = Object.values(driversMap).map(driver => ({
        ...driver,
        companies_served: Array.from(driver.companies_served),
        companies_count: driver.companies_served.length
      }));

      // Calcular estadísticas
      const totalOrders = orders.length;
      const totalAmount = orders.reduce((sum, order) => sum + (order.shipping_cost || 1800), 0);
      const uniqueDrivers = new Set(orders.map(order => order.driver_info?.shipday_driver_id)).size;

      const stats = {
        total_deliveries: totalOrders,
        total_amount: totalAmount,
        pending_deliveries: totalOrders, // Todos pendientes por ahora
        pending_amount: totalAmount,
        paid_deliveries: 0,
        paid_amount: 0,
        unique_drivers: uniqueDrivers,
        average_per_delivery: totalOrders > 0 ? totalAmount / totalOrders : 0,
        average_per_driver: uniqueDrivers > 0 ? totalAmount / uniqueDrivers : 0
      };

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
            delivered_at: order.delivery_date, // TU CAMPO: delivery_date
            payment_amount: order.shipping_cost || 1800, // TU CAMPO: shipping_cost
            payment_status: order.driver_payment_status || 'pending',
            paid_at: order.driver_payment_date,
            company: {
              id: order.company_id?._id,
              name: order.company_id?.name || 'Empresa Desconocida'
            }
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo pedidos para pagos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo entregas para pagos',
        details: error.message
      });
    }
  }

  /**
   * Marcar pedidos como pagados a conductor
   * POST /api/driver-history/mark-paid
   */
  async markDeliveriesAsPaid(req, res) {
    try {
      const { deliveryIds } = req.body;
      const paidBy = req.user.id;

      if (!deliveryIds || !Array.isArray(deliveryIds)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de deliveryIds'
        });
      }

      // Actualizar pedidos - agregar campos de pago
      const result = await Order.updateMany(
        { 
          _id: { $in: deliveryIds },
          status: 'delivered'
        },
        {
          $set: {
            driver_payment_status: 'paid',
            driver_payment_date: new Date(),
            driver_payment_by: paidBy
          }
        }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} pedidos marcados como pagados`,
        data: { modified_count: result.modifiedCount }
      });

    } catch (error) {
      console.error('❌ Error marcando pedidos como pagados:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error procesando pagos' 
      });
    }
  }

  /**
   * Pagar todos los pedidos pendientes de un conductor
   * POST /api/driver-history/driver/:driverId/pay-all
   */
  async payAllPendingToDriver(req, res) {
    try {
      const { driverId } = req.params;
      const { companyId } = req.body;
      const paidBy = req.user.id;

      // Filtros para pedidos pendientes
      const filters = {
        status: 'delivered',
        'driver_info.shipday_driver_id': driverId,
        driver_payment_status: { $ne: 'paid' }
      };

      if (companyId) {
        filters.company_id = new mongoose.Types.ObjectId(companyId);
      }

      // Obtener pedidos pendientes
      const pendingOrders = await Order.find(filters);

      if (pendingOrders.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay pedidos pendientes de pago para este conductor'
        });
      }

      // Calcular total
      const totalAmount = pendingOrders.reduce((sum, order) => {
        return sum + (order.shipping_cost || 1800);
      }, 0);

      // Marcar como pagados
      const orderIds = pendingOrders.map(order => order._id);
      const updateResult = await Order.updateMany(
        { _id: { $in: orderIds } },
        {
          $set: {
            driver_payment_status: 'paid',
            driver_payment_date: new Date(),
            driver_payment_by: paidBy
          }
        }
      );

      res.json({
        success: true,
        message: `Pagados ${updateResult.modifiedCount} pedidos por un total de $${totalAmount.toLocaleString('es-CL')}`,
        data: {
          driver_id: driverId,
          driver_name: pendingOrders[0]?.driver_info?.name,
          orders_paid: updateResult.modifiedCount,
          total_amount: totalAmount
        }
      });

    } catch (error) {
      console.error('❌ Error pagando conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error procesando pago total' 
      });
    }
  }

  // ==================== MÉTODOS COMPATIBILIDAD ====================
  
  async getGlobalPaymentSummary(req, res) {
    // Redirigir al método principal
    return this.getAllDeliveriesForPayments(req, res);
  }

  async getAllActiveDrivers(req, res) {
    return res.json({ success: false, error: 'Método no implementado' });
  }

  async getCompanyDeliveries(req, res) {
    // Agregar filtro de empresa y redirigir
    req.query.company_id = req.params.companyId;
    return this.getAllDeliveriesForPayments(req, res);
  }

  async getDriverHistory(req, res) {
    return res.json({ success: false, error: 'Método no implementado' });
  }

  async getPendingPayments(req, res) {
    return res.json({ success: false, error: 'Método no implementado' });
  }

  async getMonthlyPaymentReport(req, res) {
    return res.json({ success: false, error: 'Método no implementado' });
  }

  async getActiveDrivers(req, res) {
    return res.json({ success: false, error: 'Método no implementado' });
  }

  async getCompanyDeliveryStats(req, res) {
    return res.json({ success: false, error: 'Método no implementado' });
  }

  async exportToExcel(req, res) {
    return res.json({ success: false, error: 'Método no implementado' });
  }
}

module.exports = new DriverHistoryController();