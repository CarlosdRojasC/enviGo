// backend/src/controllers/driverHistory.controller.js - MODIFICADO PARA USAR ORDERS
const DriverHistoryService = require('../services/driverHistory.service');
const Order = require('../models/Order'); // CAMBIO: Usar Order en lugar de DriverHistory
const mongoose = require('mongoose');

class DriverHistoryController {

  // ==================== MÉTODOS GLOBALES (PARA ADMINS) ====================

  /**
   * Obtener TODAS las entregas de TODOS los conductores de EnviGo
   * Ahora basado en Orders entregados con shipping_cost
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

      console.log('📦 Obteniendo pedidos entregados para pagos:', { 
        date_from, date_to, driver_id, company_id, payment_status 
      });

      // CAMBIO: Filtros basados en Orders entregados
      const filters = {
        shipday_status: 'delivered', // Solo pedidos entregados
        shipday_driver_id: { $exists: true, $ne: null }, // Solo con conductor asignado
        delivered_at: { $exists: true, $ne: null } // Solo con fecha de entrega
      };

      // Filtro por fechas
      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // Filtro por conductor específico
      if (driver_id) {
        filters.shipday_driver_id = driver_id;
      }

      // Filtro por empresa (opcional)
      if (company_id) {
        filters.company = new mongoose.Types.ObjectId(company_id);
      }

      // CAMBIO: Filtro por estado de pago al conductor
      if (payment_status === 'pending') {
        filters.driver_payment_status = { $ne: 'paid' };
      } else if (payment_status === 'paid') {
        filters.driver_payment_status = 'paid';
      }

      console.log('🔍 Filtros aplicados:', filters);

      // CAMBIO: Obtener Orders en lugar de DriverHistory
      const deliveries = await Order.find(filters)
        .populate('company', 'name email phone')
        .populate('customer', 'first_name last_name email phone')
        .select(`
          order_number customer company 
          shipping_address shipping_commune
          total_amount shipping_cost delivery_fee
          delivered_at shipday_driver_id shipday_driver_name shipday_driver_email
          driver_payment_status driver_payment_date driver_payment_amount
          created_at
        `)
        .sort({ delivered_at: -1 })
        .lean();

      console.log('📊 Pedidos encontrados:', deliveries.length);

      // Agrupar por conductor
      const driverGroups = this.groupDeliveriesByDriverGlobal(deliveries);

      // Estadísticas globales
      const stats = this.calculateGlobalDriverStats(deliveries);

      res.json({
        success: true,
        data: {
          period: { date_from, date_to },
          filters: { driver_id, company_id, payment_status },
          stats,
          drivers: driverGroups,
          deliveries: deliveries.map(delivery => ({
            id: delivery._id,
            driver_id: delivery.shipday_driver_id,
            driver_name: delivery.shipday_driver_name,
            driver_email: delivery.shipday_driver_email,
            order_number: delivery.order_number,
            customer_name: delivery.customer ? 
              `${delivery.customer.first_name} ${delivery.customer.last_name}` : 
              'Cliente Desconocido',
            delivery_address: delivery.shipping_address,
            delivered_at: delivery.delivered_at,
            payment_amount: delivery.shipping_cost || 1800, // CAMBIO: Usar shipping_cost
            payment_status: delivery.driver_payment_status || 'pending',
            paid_at: delivery.driver_payment_date,
            company: {
              id: delivery.company?._id,
              name: delivery.company?.name || 'Empresa Desconocida'
            }
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo entregas globales:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo entregas para pagos',
        details: error.message
      });
    }
  }

  /**
   * Obtener resumen global de pagos pendientes por conductor
   * GET /api/driver-history/global-payment-summary
   */
  async getGlobalPaymentSummary(req, res) {
    try {
      const { date_from, date_to, company_id } = req.query;

      // CAMBIO: Filtros basados en Orders
      const filters = { 
        shipday_status: 'delivered',
        shipday_driver_id: { $exists: true, $ne: null },
        driver_payment_status: { $ne: 'paid' }
      };
      
      if (company_id) {
        filters.company = new mongoose.Types.ObjectId(company_id);
      }
      
      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // CAMBIO: Aggregation en Orders
      const summary = await Order.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'companies',
            localField: 'company',
            foreignField: '_id',
            as: 'company_info'
          }
        },
        {
          $group: {
            _id: {
              driver_id: '$shipday_driver_id',
              driver_name: '$shipday_driver_name',
              driver_email: '$shipday_driver_email'
            },
            total_deliveries: { $sum: 1 },
            total_amount: { $sum: { $ifNull: ['$shipping_cost', 1800] } }, // CAMBIO: shipping_cost
            companies_served: { $addToSet: '$company' },
            company_names: { $addToSet: { $arrayElemAt: ['$company_info.name', 0] } },
            oldest_delivery: { $min: '$delivered_at' },
            newest_delivery: { $max: '$delivered_at' }
          }
        },
        {
          $project: {
            driver_id: '$_id.driver_id',
            driver_name: '$_id.driver_name',
            driver_email: '$_id.driver_email',
            total_deliveries: 1,
            total_amount: 1,
            companies_count: { $size: '$companies_served' },
            company_names: { $filter: { input: '$company_names', cond: { $ne: ['$$this', null] } } },
            oldest_delivery: 1,
            newest_delivery: 1,
            _id: 0
          }
        },
        { $sort: { total_amount: -1 } }
      ]);

      const grandTotal = summary.reduce((sum, driver) => sum + driver.total_amount, 0);
      const totalDeliveries = summary.reduce((sum, driver) => sum + driver.total_deliveries, 0);

      res.json({
        success: true,
        data: {
          period: { date_from, date_to },
          summary: {
            total_drivers: summary.length,
            total_deliveries: totalDeliveries,
            total_amount_pending: grandTotal,
            average_per_driver: summary.length > 0 ? grandTotal / summary.length : 0,
            average_per_delivery: totalDeliveries > 0 ? grandTotal / totalDeliveries : 0
          },
          drivers: summary
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo resumen global:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo resumen global de pagos',
        details: error.message
      });
    }
  }

  /**
   * Obtener todos los conductores activos de EnviGo
   * GET /api/driver-history/all-active-drivers
   */
  async getAllActiveDrivers(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // CAMBIO: Aggregation en Orders
      const activeDrivers = await Order.aggregate([
        {
          $match: {
            shipday_status: 'delivered',
            shipday_driver_id: { $exists: true, $ne: null },
            delivered_at: { $gte: start, $lte: end }
          }
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'company',
            foreignField: '_id',
            as: 'company_info'
          }
        },
        {
          $group: {
            _id: {
              driver_id: '$shipday_driver_id',
              driver_name: '$shipday_driver_name',
              driver_email: '$shipday_driver_email'
            },
            total_deliveries: { $sum: 1 },
            total_earnings: { $sum: { $ifNull: ['$shipping_cost', 1800] } },
            pending_amount: {
              $sum: {
                $cond: [
                  { $ne: ['$driver_payment_status', 'paid'] }, 
                  { $ifNull: ['$shipping_cost', 1800] }, 
                  0
                ]
              }
            },
            companies_served: { $addToSet: '$company' },
            companies_names: { $addToSet: { $arrayElemAt: ['$company_info.name', 0] } },
            last_delivery: { $max: '$delivered_at' },
            first_delivery: { $min: '$delivered_at' }
          }
        },
        {
          $project: {
            driver_id: '$_id.driver_id',
            driver_name: '$_id.driver_name',
            driver_email: '$_id.driver_email',
            total_deliveries: 1,
            total_earnings: 1,
            pending_amount: 1,
            paid_amount: { $subtract: ['$total_earnings', '$pending_amount'] },
            companies_count: { $size: '$companies_served' },
            companies_names: { $filter: { input: '$companies_names', cond: { $ne: ['$$this', null] } } },
            last_delivery: 1,
            first_delivery: 1,
            _id: 0
          }
        },
        { $sort: { total_deliveries: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          drivers: activeDrivers,
          period: {
            start_date: start,
            end_date: end
          },
          summary: {
            total_active_drivers: activeDrivers.length,
            total_deliveries: activeDrivers.reduce((sum, d) => sum + d.total_deliveries, 0),
            total_pending: activeDrivers.reduce((sum, d) => sum + d.pending_amount, 0)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo conductores activos globales:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo conductores activos',
        details: error.message
      });
    }
  }

  // ==================== MÉTODOS POR EMPRESA ====================

  async getCompanyDeliveries(req, res) {
    try {
      const { companyId } = req.params;
      const { 
        date_from, 
        date_to, 
        driver_id, 
        payment_status = 'pending' 
      } = req.query;

      console.log('📦 Obteniendo pedidos de empresa específica:', { 
        companyId, date_from, date_to, driver_id 
      });

      // CAMBIO: Filtros basados en Orders por empresa
      const filters = { 
        company: new mongoose.Types.ObjectId(companyId),
        shipday_status: 'delivered',
        shipday_driver_id: { $exists: true, $ne: null }
      };

      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      if (driver_id) {
        filters.shipday_driver_id = driver_id;
      }

      if (payment_status === 'pending') {
        filters.driver_payment_status = { $ne: 'paid' };
      } else if (payment_status === 'paid') {
        filters.driver_payment_status = 'paid';
      }

      const deliveries = await Order.find(filters)
        .populate('company', 'name')
        .populate('customer', 'first_name last_name email phone')
        .select(`
          order_number customer company 
          shipping_address shipping_commune
          total_amount shipping_cost
          delivered_at shipday_driver_id shipday_driver_name
          driver_payment_status driver_payment_date
        `)
        .sort({ delivered_at: -1 })
        .lean();

      const driverGroups = this.groupDeliveriesByDriver(deliveries);
      const stats = this.calculateDeliveryStats(deliveries);

      res.json({
        success: true,
        data: {
          period: { date_from, date_to },
          filters: { company_id: companyId, driver_id, payment_status },
          stats,
          drivers: driverGroups,
          deliveries: deliveries.map(delivery => ({
            id: delivery._id,
            driver_id: delivery.shipday_driver_id,
            driver_name: delivery.shipday_driver_name,
            order_number: delivery.order_number,
            customer_name: delivery.customer ? 
              `${delivery.customer.first_name} ${delivery.customer.last_name}` : 
              'Cliente Desconocido',
            delivery_address: delivery.shipping_address,
            delivered_at: delivery.delivered_at,
            payment_amount: delivery.shipping_cost || 1800, // CAMBIO: shipping_cost
            payment_status: delivery.driver_payment_status || 'pending',
            paid_at: delivery.driver_payment_date
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo pedidos de empresa:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo entregas para pagos',
        details: error.message
      });
    }
  }

  // ==================== MÉTODOS DE PAGOS ====================

  /**
   * Marca pedidos como pagadas (MODIFICADO)
   */
  async markDeliveriesAsPaid(req, res) {
    try {
      const { deliveryIds } = req.body; // Son order IDs ahora
      const paidBy = req.user.id;

      if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de IDs de pedidos'
        });
      }

      // CAMBIO: Actualizar Orders en lugar de DriverHistory
      const result = await Order.updateMany(
        { 
          _id: { $in: deliveryIds },
          shipday_status: 'delivered',
          driver_payment_status: { $ne: 'paid' }
        },
        {
          $set: {
            driver_payment_status: 'paid',
            driver_payment_date: new Date(),
            driver_payment_by: paidBy,
            driver_payment_amount: 1800 // O usar el shipping_cost existente
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
   * Pagar todos los pedidos pendientes de un conductor (MODIFICADO)
   */
  async payAllPendingToDriver(req, res) {
    try {
      const { driverId } = req.params;
      const { companyId } = req.body;
      const paidBy = req.user.id;

      // CAMBIO: Filtros en Orders
      const filters = {
        shipday_status: 'delivered',
        shipday_driver_id: driverId,
        driver_payment_status: { $ne: 'paid' }
      };

      if (companyId) {
        filters.company = new mongoose.Types.ObjectId(companyId);
      }

      const pendingOrders = await Order.find(filters);
      
      if (pendingOrders.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay pedidos pendientes de pago para este conductor'
        });
      }

      const totalAmount = pendingOrders.reduce((sum, order) => {
        return sum + (order.shipping_cost || 1800);
      }, 0);

      const orderIds = pendingOrders.map(order => order._id);
      const result = await Order.updateMany(
        { _id: { $in: orderIds } },
        {
          $set: {
            driver_payment_status: 'paid',
            driver_payment_date: new Date(),
            driver_payment_by: paidBy,
            driver_payment_amount: 1800
          }
        }
      );

      res.json({
        success: true,
        message: `Pagados ${result.modifiedCount} pedidos por un total de $${totalAmount.toLocaleString('es-CL')}`,
        data: {
          driver_id: driverId,
          total_amount: totalAmount,
          deliveries_paid: result.modifiedCount
        }
      });

    } catch (error) {
      console.error('❌ Error pagando todas las entregas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error procesando pago total' 
      });
    }
  }

  // ================ MÉTODOS AUXILIARES MODIFICADOS ================

  groupDeliveriesByDriver(deliveries) {
    const drivers = {};

    deliveries.forEach(delivery => {
      const driverId = delivery.shipday_driver_id;
      const driverName = delivery.shipday_driver_name;

      if (!drivers[driverId]) {
        drivers[driverId] = {
          driver_id: driverId,
          driver_name: driverName,
          driver_email: delivery.shipday_driver_email,
          total_deliveries: 0,
          total_amount: 0,
          pending_amount: 0,
          paid_amount: 0,
          deliveries: []
        };
      }

      const paymentAmount = delivery.shipping_cost || 1800; // CAMBIO: shipping_cost
      drivers[driverId].total_deliveries += 1;
      drivers[driverId].total_amount += paymentAmount;
      
      if (delivery.driver_payment_status === 'paid') {
        drivers[driverId].paid_amount += paymentAmount;
      } else {
        drivers[driverId].pending_amount += paymentAmount;
      }

      drivers[driverId].deliveries.push(delivery._id);
    });

    return Object.values(drivers);
  }

  groupDeliveriesByDriverGlobal(deliveries) {
    const drivers = {};

    deliveries.forEach(delivery => {
      const driverId = delivery.shipday_driver_id;
      const driverName = delivery.shipday_driver_name;
      const driverEmail = delivery.shipday_driver_email;

      if (!drivers[driverId]) {
        drivers[driverId] = {
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

      const paymentAmount = delivery.shipping_cost || 1800; // CAMBIO: shipping_cost
      drivers[driverId].total_deliveries += 1;
      drivers[driverId].total_amount += paymentAmount;
      
      if (delivery.driver_payment_status === 'paid') {
        drivers[driverId].paid_amount += paymentAmount;
      } else {
        drivers[driverId].pending_amount += paymentAmount;
      }

      if (delivery.company) {
        drivers[driverId].companies_served.add(delivery.company.name || 'Empresa Desconocida');
      }

      drivers[driverId].deliveries.push(delivery._id);
    });

    return Object.values(drivers).map(driver => ({
      ...driver,
      companies_served: Array.from(driver.companies_served),
      companies_count: driver.companies_served.length
    }));
  }

  calculateDeliveryStats(deliveries) {
    const totalDeliveries = deliveries.length;
    const totalAmount = deliveries.reduce((sum, d) => sum + (d.shipping_cost || 1800), 0);
    
    const pendingDeliveries = deliveries.filter(d => d.driver_payment_status !== 'paid');
    const pendingAmount = pendingDeliveries.reduce((sum, d) => sum + (d.shipping_cost || 1800), 0);
    
    const uniqueDrivers = new Set(deliveries.map(d => d.shipday_driver_id)).size;

    return {
      total_deliveries: totalDeliveries,
      total_amount: totalAmount,
      pending_deliveries: pendingDeliveries.length,
      pending_amount: pendingAmount,
      paid_deliveries: totalDeliveries - pendingDeliveries.length,
      paid_amount: totalAmount - pendingAmount,
      unique_drivers: uniqueDrivers,
      average_per_delivery: totalDeliveries > 0 ? totalAmount / totalDeliveries : 0
    };
  }

  calculateGlobalDriverStats(deliveries) {
    const totalDeliveries = deliveries.length;
    const totalAmount = deliveries.reduce((sum, d) => sum + (d.shipping_cost || 1800), 0);
    
    const pendingDeliveries = deliveries.filter(d => d.driver_payment_status !== 'paid');
    const pendingAmount = pendingDeliveries.reduce((sum, d) => sum + (d.shipping_cost || 1800), 0);
    
    const uniqueDrivers = new Set(deliveries.map(d => d.shipday_driver_id)).size;
    const uniqueCompanies = new Set(deliveries.map(d => d.company?._id?.toString()).filter(Boolean)).size;

    return {
      total_deliveries: totalDeliveries,
      total_amount: totalAmount,
      pending_deliveries: pendingDeliveries.length,
      pending_amount: pendingAmount,
      paid_deliveries: totalDeliveries - pendingDeliveries.length,
      paid_amount: totalAmount - pendingAmount,
      unique_drivers: uniqueDrivers,
      unique_companies: uniqueCompanies,
      average_per_delivery: totalDeliveries > 0 ? totalAmount / totalDeliveries : 0,
      average_per_driver: uniqueDrivers > 0 ? totalAmount / uniqueDrivers : 0
    };
  }

  // ==================== MÉTODOS LEGACY (mantener por compatibilidad) ====================
  
  async getDriverHistory(req, res) {
    return res.json({ success: false, error: 'Método no implementado en versión Orders' });
  }

  async getPendingPayments(req, res) {
    return res.json({ success: false, error: 'Método no implementado en versión Orders' });
  }

  async getMonthlyPaymentReport(req, res) {
    return res.json({ success: false, error: 'Método no implementado en versión Orders' });
  }

  async getActiveDrivers(req, res) {
    return res.json({ success: false, error: 'Método no implementado en versión Orders' });
  }

  async getCompanyDeliveryStats(req, res) {
    return res.json({ success: false, error: 'Método no implementado en versión Orders' });
  }

  async exportToExcel(req, res) {
    return res.json({ success: false, error: 'Método no implementado en versión Orders' });
  }
}

module.exports = new DriverHistoryController();