// backend/src/controllers/driverHistory.controller.js - PARTE 1
const DriverHistoryService = require('../services/driverHistory.service');
const DriverHistory = require('../models/DriveryHistory');
const mongoose = require('mongoose');

class DriverHistoryController {

  // ==================== MÉTODOS GLOBALES (PARA ADMINS) ====================

  /**
   * Obtener TODAS las entregas de TODOS los conductores de EnviGo
   * GET /api/driver-history/all-deliveries
   * Solo accesible por ADMINS
   */
  async getAllDeliveriesForPayments(req, res) {
    try {
      const { 
        date_from, 
        date_to, 
        driver_id, 
        company_id, // Filtro opcional para ver empresa específica
        payment_status = 'pending' 
      } = req.query;

      console.log('📦 Obteniendo entregas GLOBALES para pagos:', { 
        date_from, 
        date_to, 
        driver_id, 
        company_id 
      });

      // Filtros base
      const filters = {};

      // Filtro por fechas
      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // Filtro por conductor específico
      if (driver_id) {
        filters.driver_id = driver_id;
      }

      // Filtro por empresa (opcional)
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }

      // Filtro por estado de pago
      if (payment_status && payment_status !== 'all') {
        filters.payment_status = payment_status;
      }

      // Obtener entregas con información de empresa
      const deliveries = await DriverHistory.find(filters)
        .populate('company_id', 'name email phone')
        .populate('order_id', 'order_number customer_name total_amount')
        .sort({ delivered_at: -1 })
        .lean();

      // Agrupar por conductor (incluye empresas servidas)
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
            driver_id: delivery.driver_id,
            driver_name: delivery.driver_name,
            driver_email: delivery.driver_email,
            order_number: delivery.order_number,
            customer_name: delivery.customer_name,
            delivery_address: delivery.delivery_address,
            delivered_at: delivery.delivered_at,
            payment_amount: delivery.payment_amount,
            payment_status: delivery.payment_status,
            paid_at: delivery.paid_at,
            // Información de la empresa cliente
            company: {
              id: delivery.company_id?._id,
              name: delivery.company_id?.name || 'Empresa Desconocida'
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

      const filters = { payment_status: 'pending' };
      
      // Filtro opcional por empresa
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }
      
      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      const summary = await DriverHistory.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'companies',
            localField: 'company_id',
            foreignField: '_id',
            as: 'company'
          }
        },
        {
          $group: {
            _id: {
              driver_id: '$driver_id',
              driver_name: '$driver_name',
              driver_email: '$driver_email'
            },
            total_deliveries: { $sum: 1 },
            total_amount: { $sum: '$payment_amount' },
            companies_served: { $addToSet: '$company_id' },
            company_names: { $addToSet: { $arrayElemAt: ['$company.name', 0] } },
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

      const activeDrivers = await DriverHistory.aggregate([
        {
          $match: {
            delivered_at: { $gte: start, $lte: end }
          }
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'company_id',
            foreignField: '_id',
            as: 'company'
          }
        },
        {
          $group: {
            _id: {
              driver_id: '$driver_id',
              driver_name: '$driver_name',
              driver_email: '$driver_email'
            },
            total_deliveries: { $sum: 1 },
            total_earnings: { $sum: '$payment_amount' },
            pending_amount: {
              $sum: {
                $cond: [{ $eq: ['$payment_status', 'pending'] }, '$payment_amount', 0]
              }
            },
            companies_served: { $addToSet: '$company_id' },
            companies_names: { $addToSet: { $arrayElemAt: ['$company.name', 0] } },
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

  /**
   * Obtener entregas de conductores para una empresa específica
   * GET /api/driver-history/company/:companyId/deliveries
   */
  async getCompanyDeliveries(req, res) {
    try {
      const { companyId } = req.params;
      const { 
        date_from, 
        date_to, 
        driver_id, 
        payment_status = 'pending' 
      } = req.query;

      console.log('📦 Obteniendo entregas de empresa específica:', { 
        companyId,
        date_from, 
        date_to, 
        driver_id 
      });

      // Filtros base - SIEMPRE filtrar por empresa
      const filters = { company_id: new mongoose.Types.ObjectId(companyId) };

      // Filtro por fechas
      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // Filtro por conductor específico
      if (driver_id) {
        filters.driver_id = driver_id;
      }

      // Filtro por estado de pago
      if (payment_status && payment_status !== 'all') {
        filters.payment_status = payment_status;
      }

      // Obtener entregas
      const deliveries = await DriverHistory.find(filters)
        .populate('company_id', 'name')
        .populate('order_id', 'order_number customer_name total_amount')
        .sort({ delivered_at: -1 })
        .lean();

      // Agrupar por conductor
      const driverGroups = this.groupDeliveriesByDriver(deliveries);

      // Calcular estadísticas
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
            driver_id: delivery.driver_id,
            driver_name: delivery.driver_name,
            order_number: delivery.order_number,
            customer_name: delivery.customer_name,
            delivery_address: delivery.delivery_address,
            delivered_at: delivery.delivered_at,
            payment_amount: delivery.payment_amount,
            payment_status: delivery.payment_status,
            paid_at: delivery.paid_at
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo entregas de empresa:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo entregas para pagos',
        details: error.message
      });
    }
  }
  // ==================== MÉTODOS ORIGINALES (MANTENER) ====================

  /**
   * Obtiene el historial de entregas de un conductor específico
   */
  async getDriverHistory(req, res) {
    try {
      const { driverId } = req.params;
      const { startDate, endDate, page = 1, limit = 50 } = req.query;

      const filters = { driver_id: driverId };
      
      if (startDate && endDate) {
        filters.delivered_at = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const skip = (page - 1) * limit;

      const [deliveries, total, stats] = await Promise.all([
        DriverHistory.find(filters)
          .populate('order_id', 'order_number customer_name')
          .populate('company_id', 'name')
          .sort({ delivered_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        
        DriverHistory.countDocuments(filters),
        
        DriverHistoryService.getDriverStats(
          driverId, 
          startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate ? new Date(endDate) : new Date()
        )
      ]);

      res.json({
        success: true,
        data: {
          deliveries,
          stats,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            total_records: total,
            per_page: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial del conductor:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo historial del conductor' 
      });
    }
  }

  /**
   * Obtiene pagos pendientes de un conductor
   */
  async getPendingPayments(req, res) {
    try {
      const { driverId } = req.params;
      const { companyId } = req.query;

      const result = await DriverHistoryService.getPendingPayments(driverId, companyId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error obteniendo pagos pendientes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo pagos pendientes' 
      });
    }
  }

  /**
   * Marca entregas como pagadas
   */
  async markDeliveriesAsPaid(req, res) {
    try {
      const { deliveryIds } = req.body;
      const paidBy = req.user.id;

      if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de IDs de entregas'
        });
      }

      const result = await DriverHistoryService.markAsPaid(deliveryIds, paidBy);

      res.json({
        success: true,
        message: `${result.modifiedCount} entregas marcadas como pagadas`,
        data: { modified_count: result.modifiedCount }
      });

    } catch (error) {
      console.error('❌ Error marcando entregas como pagadas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error procesando pagos' 
      });
    }
  }

  /**
   * Marca todos los pagos pendientes de un conductor como pagados
   */
  async payAllPendingToDriver(req, res) {
    try {
      const { driverId } = req.params;
      const { companyId } = req.body; // Opcional - si no se pasa, paga TODAS las empresas
      const paidBy = req.user.id;

      // Obtener todas las entregas pendientes (de todas las empresas o una específica)
      const pendingResult = await DriverHistoryService.getPendingPayments(driverId, companyId);
      
      if (pendingResult.deliveries.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay entregas pendientes de pago para este conductor'
        });
      }

      const deliveryIds = pendingResult.deliveries.map(d => d._id);
      const result = await DriverHistoryService.markAsPaid(deliveryIds, paidBy);

      res.json({
        success: true,
        message: `Pagadas ${result.modifiedCount} entregas por un total de $${pendingResult.summary.total_amount}`,
        data: {
          driver_id: driverId,
          total_amount: pendingResult.summary.total_amount,
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
  /**
   * Obtiene reporte mensual de pagos para una empresa
   */
  async getMonthlyPaymentReport(req, res) {
    try {
      const { companyId } = req.params;
      const { year, month } = req.query;

      const currentDate = new Date();
      const reportYear = parseInt(year) || currentDate.getFullYear();
      const reportMonth = parseInt(month) || currentDate.getMonth() + 1;

      const report = await DriverHistoryService.getMonthlyPaymentReport(
        companyId, 
        reportYear, 
        reportMonth
      );

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('❌ Error generando reporte mensual:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error generando reporte mensual' 
      });
    }
  }

  /**
   * Obtiene conductores activos de una empresa
   */
  async getActiveDrivers(req, res) {
    try {
      const { companyId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const activeDrivers = await DriverHistoryService.getActiveDrivers(companyId, start, end);

      res.json({
        success: true,
        data: {
          drivers: activeDrivers,
          period: {
            start_date: start,
            end_date: end
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo conductores activos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo conductores activos' 
      });
    }
  }

  /**
   * Obtiene estadísticas generales de entregas para una empresa
   */
  async getCompanyDeliveryStats(req, res) {
    try {
      const { companyId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const stats = await DriverHistory.getCompanyStats(companyId, start, end);

      res.json({
        success: true,
        data: {
          stats: stats[0] || {
            total_deliveries: 0,
            total_paid_to_drivers: 0,
            unique_drivers_count: 0,
            pending_payments: 0,
            paid_payments: 0
          },
          period: {
            start_date: start,
            end_date: end
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de empresa:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo estadísticas' 
      });
    }
  }

  /**
   * Exportar reporte a Excel
   * GET /api/driver-history/export-excel
   */
  async exportToExcel(req, res) {
    try {
      const { company_id, date_from, date_to, payment_status = 'pending' } = req.query;

      // Filtros base
      const filters = { payment_status };
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }
      
      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      const deliveries = await DriverHistory.find(filters)
        .populate('order_id', 'order_number customer_name')
        .populate('company_id', 'name')
        .sort({ delivered_at: -1 })
        .lean();

      // Formatear datos para Excel
      const excelData = deliveries.map(delivery => ({
        'Conductor': delivery.driver_name,
        'Email': delivery.driver_email,
        'N° Pedido': delivery.order_number,
        'Cliente': delivery.customer_name,
        'Empresa': delivery.company_id?.name || 'Empresa Desconocida',
        'Dirección': delivery.delivery_address,
        'Fecha Entrega': delivery.delivered_at.toLocaleDateString('es-CL'),
        'Monto': delivery.payment_amount,
        'Estado Pago': delivery.payment_status === 'paid' ? 'Pagado' : 'Pendiente',
        'Fecha Pago': delivery.paid_at ? delivery.paid_at.toLocaleDateString('es-CL') : ''
      }));

      // Calcular resumen
      const totalAmount = deliveries.reduce((sum, d) => sum + d.payment_amount, 0);
      const uniqueDrivers = new Set(deliveries.map(d => d.driver_id)).size;
      const uniqueCompanies = new Set(deliveries.map(d => d.company_id?._id?.toString()).filter(Boolean)).size;

      const summary = {
        total_drivers: uniqueDrivers,
        total_deliveries: deliveries.length,
        total_companies: uniqueCompanies,
        total_amount_to_pay: totalAmount,
        period: { date_from, date_to }
      };

      // Generar Excel usando el servicio existente
      const ExcelService = require('../services/excel.service');
      const excelBuffer = await ExcelService.generateDriverPaymentReport(excelData, summary);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=pagos_conductores_${date_from}_${date_to}.xlsx`);
      return res.send(excelBuffer);

    } catch (error) {
      console.error('❌ Error exportando a Excel:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error exportando reporte' 
      });
    }
  }
  // ================ MÉTODOS AUXILIARES ================

  groupDeliveriesByDriver(deliveries) {
    const drivers = {};

    deliveries.forEach(delivery => {
      const driverId = delivery.driver_id;
      const driverName = delivery.driver_name;

      if (!drivers[driverId]) {
        drivers[driverId] = {
          driver_id: driverId,
          driver_name: driverName,
          driver_email: delivery.driver_email,
          total_deliveries: 0,
          total_amount: 0,
          pending_amount: 0,
          paid_amount: 0,
          deliveries: []
        };
      }

      drivers[driverId].total_deliveries += 1;
      drivers[driverId].total_amount += delivery.payment_amount;
      
      if (delivery.payment_status === 'pending') {
        drivers[driverId].pending_amount += delivery.payment_amount;
      } else {
        drivers[driverId].paid_amount += delivery.payment_amount;
      }

      drivers[driverId].deliveries.push(delivery._id);
    });

    return Object.values(drivers);
  }

  groupDeliveriesByDriverGlobal(deliveries) {
    const drivers = {};

    deliveries.forEach(delivery => {
      const driverId = delivery.driver_id;
      const driverName = delivery.driver_name;
      const driverEmail = delivery.driver_email;

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

      drivers[driverId].total_deliveries += 1;
      drivers[driverId].total_amount += delivery.payment_amount;
      
      if (delivery.payment_status === 'pending') {
        drivers[driverId].pending_amount += delivery.payment_amount;
      } else {
        drivers[driverId].paid_amount += delivery.payment_amount;
      }

      // Agregar empresa servida
      if (delivery.company_id) {
        drivers[driverId].companies_served.add(delivery.company_id.name ||'Empresa Desconocida');
      }

      drivers[driverId].deliveries.push(delivery._id);
    });

    // Convertir Set a Array para el response
    return Object.values(drivers).map(driver => ({
      ...driver,
      companies_served: Array.from(driver.companies_served),
      companies_count: driver.companies_served.length
    }));
  }

  calculateDeliveryStats(deliveries) {
    const totalDeliveries = deliveries.length;
    const totalAmount = deliveries.reduce((sum, d) => sum + d.payment_amount, 0);
    
    const pendingDeliveries = deliveries.filter(d => d.payment_status === 'pending');
    const pendingAmount = pendingDeliveries.reduce((sum, d) => sum + d.payment_amount, 0);
    
    const uniqueDrivers = new Set(deliveries.map(d => d.driver_id)).size;

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
    const totalAmount = deliveries.reduce((sum, d) => sum + d.payment_amount, 0);
    
    const pendingDeliveries = deliveries.filter(d => d.payment_status === 'pending');
    const pendingAmount = pendingDeliveries.reduce((sum, d) => sum + d.payment_amount, 0);
    
    const uniqueDrivers = new Set(deliveries.map(d => d.driver_id)).size;
    const uniqueCompanies = new Set(deliveries.map(d => d.company_id?._id?.toString()).filter(Boolean)).size;

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
}

module.exports = new DriverHistoryController();