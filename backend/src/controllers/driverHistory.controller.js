// backend/src/controllers/driverHistory.controller.js
const DriverHistoryService = require('../services/driverHistory.service');
const DriverHistory = require('../models/DriverHistory');

class DriverHistoryController {

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
      const { companyId } = req.body;
      const paidBy = req.user.id;

      // Obtener todas las entregas pendientes
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
}

module.exports = new DriverHistoryController();