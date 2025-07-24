const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');

// ==================== RUTAS DE CONDUCTORES ====================

// Obtener todos los conductores (solo admin)
router.get('/', authenticateToken, isAdmin, driverController.getAllDrivers);

// Crear nuevo conductor (solo admin)
router.post('/', authenticateToken, isAdmin, driverController.createDriver);

// Obtener conductor específico (solo admin)
router.get('/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverController.getDriver
);

// Actualizar conductor (solo admin)
router.put('/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverController.updateDriver
);

// Eliminar conductor (solo admin)
router.delete('/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverController.deleteDriver
);
// Obtener pedidos entregados por conductores para pagos
router.get('/delivered-orders', 
  authenticateToken, 
  isAdmin, 
  async (req, res) => {
    try {
      const { date_from, date_to } = req.query;
      
      console.log('💰 Obteniendo pedidos entregados para pagos de conductores');
      console.log('📅 Rango de fechas:', { date_from, date_to });
      
      // Validar fechas
      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren las fechas date_from y date_to'
        });
      }
      
      // Convertir fechas
      const dateFromObj = new Date(date_from + 'T00:00:00.000Z');
      const dateToObj = new Date(date_to + 'T23:59:59.999Z');
      
      // Buscar órdenes entregadas con conductor asignado
      const orders = await Order.find({
        status: 'delivered', // Solo pedidos entregados
        delivery_date: {
          $gte: dateFromObj,
          $lte: dateToObj
        },
        $or: [
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } },
          { 'shipday_driver_id': { $exists: true, $ne: null, $ne: '' } }
        ]
      })
      .select('order_number customer_name shipping_address shipping_commune delivery_date driver_info shipday_driver_id')
      .lean();
      
      console.log(`📦 Encontradas ${orders.length} órdenes entregadas`);
      
      // Estadísticas
      const stats = {
        total_orders: orders.length,
        total_amount: orders.length * 1700, // $1.700 por entrega
        date_range: { date_from, date_to },
        unique_drivers: new Set(orders.map(o => 
          o.driver_info?.name || o.shipday_driver_id || 'Sin conductor'
        )).size
      };
      
      res.json({
        success: true,
        orders,
        stats,
        payment_per_delivery: 1700,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo pedidos para pagos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
// Generar reporte de pagos por conductor (Excel)
router.get('/payment-report', 
  authenticateToken, 
  isAdmin, 
  async (req, res) => {
    try {
      const { date_from, date_to, format = 'json' } = req.query;
      
      console.log('📊 Generando reporte de pagos de conductores');
      
      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren las fechas date_from y date_to'
        });
      }
      
      const dateFromObj = new Date(date_from + 'T00:00:00.000Z');
      const dateToObj = new Date(date_to + 'T23:59:59.999Z');
      
      // Obtener órdenes entregadas
      const orders = await Order.find({
        status: 'delivered',
        delivery_date: {
          $gte: dateFromObj,
          $lte: dateToObj
        },
        $or: [
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } },
          { 'shipday_driver_id': { $exists: true, $ne: null, $ne: '' } }
        ]
      })
      .select('order_number customer_name shipping_address shipping_commune delivery_date driver_info shipday_driver_id')
      .lean();
      
      // Agrupar por conductor
      const driverPayments = {};
      
      orders.forEach(order => {
        const driverName = order.driver_info?.name || 
                          order.shipday_driver_id || 
                          'Conductor Desconocido';
        
        if (!driverPayments[driverName]) {
          driverPayments[driverName] = {
            driver_name: driverName,
            orders: [],
            total_deliveries: 0,
            total_payment: 0
          };
        }
        
        driverPayments[driverName].orders.push({
          order_number: order.order_number,
          customer_name: order.customer_name,
          commune: order.shipping_commune || 'Sin comuna',
          delivery_date: order.delivery_date,
          payment: 1700
        });
        
        driverPayments[driverName].total_deliveries++;
        driverPayments[driverName].total_payment += 1700;
      });
      
      // Convertir a array y ordenar por total de pago descendente
      const reportData = Object.values(driverPayments)
        .sort((a, b) => b.total_payment - a.total_payment);
      
      const summary = {
        period: { date_from, date_to },
        total_drivers: reportData.length,
        total_deliveries: orders.length,
        total_amount_to_pay: orders.length * 1700,
        payment_per_delivery: 1700,
        generated_at: new Date().toISOString()
      };
      
      if (format === 'excel') {
        // Si quieren Excel, generar usando el servicio de Excel
        const ExcelService = require('../services/excel.service');
        
        // Preparar datos para Excel
        const excelData = [];
        reportData.forEach(driver => {
          driver.orders.forEach(order => {
            excelData.push({
              'Conductor': driver.driver_name,
              'N° Pedido': order.order_number,
              'Cliente': order.customer_name,
              'Comuna': order.commune,
              'Fecha Entrega': order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('es-CL') : '',
              'Monto': order.payment
            });
          });
        });
        
        const buffer = await ExcelService.generateDriverPaymentReport(excelData, summary);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=pagos-conductores-${date_from}-${date_to}.xlsx`);
        res.send(buffer);
        
      } else {
        // Respuesta JSON normal
        res.json({
          success: true,
          summary,
          drivers: reportData,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Error generando reporte de pagos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;