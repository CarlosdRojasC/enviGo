// backend/src/services/driverHistory.service.js
const DriverHistory = require('../models/DriveryHistory');
const Order = require('../models/Order');

class DriverHistoryService {
  
  /**
   * Registra una entrega completada en el historial
   * Se ejecuta desde el webhook cuando el estado es 'delivered'
   */
  static async recordDelivery(orderData, driverData) {
    try {
      const existingRecord = await DriverHistory.findOne({
        order_id: orderData._id,
        shipday_order_id: orderData.shipday_order_id
      });

      if (existingRecord) {
        console.log(`✅ Entrega ya registrada en historial: ${orderData.order_number}`);
        return existingRecord;
      }

      // ✅ CORRECCIÓN: Calcular el periodo de pago manualmente aquí
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const paymentPeriod = `${year}-${month}`;

      const historyRecord = new DriverHistory({
        driver_id: driverData.driver_id,
        driver_email: driverData.driver_email,
        driver_name: driverData.driver_name,
        company_id: orderData.company_id,
        order_id: orderData._id,
        shipday_order_id: orderData.shipday_order_id,
        order_number: orderData.order_number,
        delivery_address: orderData.shipping_address,
        customer_name: orderData.customer_name,
        delivered_at: now,
        payment_amount: 1700,
        payment_status: 'pending',
        payment_period: paymentPeriod // <--- ¡AQUÍ ESTÁ LA SOLUCIÓN!
      });

      await historyRecord.save();
      console.log(`✅ Entrega registrada en historial para ${driverData.driver_name}: $1700 (Periodo: ${paymentPeriod})`);
      return historyRecord;

    } catch (error) {
      console.error('❌ Error registrando entrega en historial:', error);
      throw error;
    }
  }

  /**
   * Obtiene las entregas pendientes de pago de un conductor
   */
  static async getPendingPayments(driverId, companyId = null) {
    try {
      const filters = {
  driver_id: driverId,
  $or: [
    { payment_status: 'pending' },
    { invoiced: true }   // incluye las facturadas
  ]
};

      if (companyId) {
        filters.company_id = companyId;
      }

      const pendingDeliveries = await DriverHistory.find(filters)
        .sort({ delivered_at: -1 })
        .populate('order_id', 'order_number customer_name');

      const summary = await DriverHistory.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            total_deliveries: { $sum: 1 },
            total_amount: { $sum: '$payment_amount' }
          }
        }
      ]);

      return {
        deliveries: pendingDeliveries,
        summary: summary[0] || { total_deliveries: 0, total_amount: 0 }
      };

    } catch (error) {
      console.error('❌ Error obteniendo pagos pendientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene reporte de pagos mensuales para una empresa
   */
  static async getMonthlyPaymentReport(companyId, year, month) {
    try {
      const paymentPeriod = `${year}-${String(month).padStart(2, '0')}`;
      
      const driverReports = await DriverHistory.getMonthlyPaymentReport(companyId, paymentPeriod);
      
      // Resumen total
      const totalSummary = await DriverHistory.aggregate([
        {
          $match: {
            company_id: companyId,
            payment_period: paymentPeriod,
            payment_status: 'pending'
          }
        },
        {
          $group: {
            _id: null,
            total_drivers: { $addToSet: '$driver_id' },
            total_deliveries: { $sum: 1 },
            total_amount: { $sum: '$payment_amount' }
          }
        },
        {
          $project: {
            total_drivers: { $size: '$total_drivers' },
            total_deliveries: 1,
            total_amount: 1
          }
        }
      ]);

      return {
        period: `${month}/${year}`,
        drivers: driverReports,
        summary: totalSummary[0] || { total_drivers: 0, total_deliveries: 0, total_amount: 0 }
      };

    } catch (error) {
      console.error('❌ Error generando reporte mensual:', error);
      throw error;
    }
  }

  /**
   * Marca entregas como pagadas
   */
  static async markAsPaid(deliveryIds, paidBy) {
    try {
      const result = await DriverHistory.updateMany(
        { _id: { $in: deliveryIds } },
        { 
          payment_status: 'paid',
          paid_at: new Date(),
          paid_by: paidBy
        }
      );

      console.log(`✅ ${result.modifiedCount} entregas marcadas como pagadas`);
      return result;

    } catch (error) {
      console.error('❌ Error marcando entregas como pagadas:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de un conductor
   */
  static async getDriverStats(driverId, startDate, endDate) {
    try {
      const stats = await DriverHistory.getDriverEarnings(driverId, startDate, endDate);
      
      // Obtener entregas por mes
      const monthlyStats = await DriverHistory.aggregate([
        {
          $match: {
            driver_id: driverId,
            delivered_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$payment_period',
            deliveries: { $sum: 1 },
            earnings: { $sum: '$payment_amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        summary: stats[0] || { total_deliveries: 0, total_earnings: 0, pending_earnings: 0, paid_earnings: 0 },
        monthly_breakdown: monthlyStats
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del conductor:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los conductores activos de una empresa
   */
  static async getActiveDrivers(companyId, startDate, endDate) {
    try {
      const matchFilter = { company_id: companyId };
      
      if (startDate && endDate) {
        matchFilter.delivered_at = { $gte: startDate, $lte: endDate };
      }

      const activeDrivers = await DriverHistory.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$driver_id',
            driver_name: { $first: '$driver_name' },
            driver_email: { $first: '$driver_email' },
            total_deliveries: { $sum: 1 },
            total_earnings: { $sum: '$payment_amount' },
            pending_amount: {
              $sum: {
                $cond: [{ $eq: ['$payment_status', 'pending'] }, '$payment_amount', 0]
              }
            },
            last_delivery: { $max: '$delivered_at' }
          }
        },
        { $sort: { total_deliveries: -1 } }
      ]);

      return activeDrivers;

    } catch (error) {
      console.error('❌ Error obteniendo conductores activos:', error);
      throw error;
    }
  }
}

module.exports = DriverHistoryService;