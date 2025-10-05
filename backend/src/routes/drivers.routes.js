const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');
const { parseDateRangeForQuery } = require('../utils/timezone');

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
router.post('/sync-with-shipday', authenticateToken, isAdmin, driverController.syncWithShipday);

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
      
      console.log('📅 Fechas convertidas:', { dateFromObj, dateToObj });
      
      // 🔥 CAMBIO PRINCIPAL: Buscar órdenes entregadas Y facturadas con conductor asignado
      const orders = await Order.find({
        // ✅ INCLUIR TANTO DELIVERED COMO INVOICED
        status: { $in: ['delivered', 'invoiced'] }, 
        delivery_date: {
          $gte: dateFromObj,
          $lte: dateToObj
        },
        $or: [
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } },
          { 'shipday_driver_id': { $exists: true, $ne: null, $ne: '' } }
        ]
      })
      .select('order_number customer_name shipping_address shipping_commune delivery_date driver_info shipday_driver_id status isPaid paidAt')
      .lean();
      
      console.log(`📦 Encontradas ${orders.length} órdenes entregadas/facturadas`);
      
      // Si no hay órdenes, devolver respuesta vacía pero exitosa
      if (orders.length === 0) {
        return res.json({
          success: true,
          orders: [],
          stats: {
            total_orders: 0,
            total_amount: 0,
            date_range: { date_from, date_to },
            unique_drivers: 0
          },
          payment_per_delivery: 1700,
          timestamp: new Date().toISOString(),
          message: 'No se encontraron pedidos entregados en el rango de fechas especificado'
        });
      }
      
      // Estadísticas
      const uniqueDrivers = new Set(orders.map(o => 
        o.driver_info?.name || o.shipday_driver_id || 'Sin conductor'
      ));
      
      const stats = {
        total_orders: orders.length,
        total_amount: orders.length * 1700, // $1.700 por entrega
        date_range: { date_from, date_to },
        unique_drivers: uniqueDrivers.size,
        // 📊 ESTADÍSTICAS ADICIONALES
        delivered_count: orders.filter(o => o.status === 'delivered').length,
        invoiced_count: orders.filter(o => o.status === 'invoiced').length,
        paid_count: orders.filter(o => o.isPaid === true).length,
        pending_count: orders.filter(o => !o.isPaid).length
      };
      
      console.log('📊 Estadísticas:', stats);
      
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
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// Generar reporte de pagos por conductor (CSV simple)
router.get('/payment-report-csv', 
  authenticateToken, 
  isAdmin, 
  async (req, res) => {
    try {
      const { date_from, date_to } = req.query;
      
      console.log('📊 Generando reporte CSV de pagos de conductores');
      
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
      
      // Generar CSV
      let csvContent = 'Conductor,N° Pedido,Cliente,Comuna,Fecha Entrega,Monto\n';
      
      orders.forEach(order => {
        const driverName = order.driver_info?.name || order.shipday_driver_id || 'Sin conductor';
        const orderNumber = order.order_number || '';
        const customerName = (order.customer_name || '').replace(/,/g, ' ');
        const commune = order.shipping_commune || 'Sin comuna';
        const deliveryDate = order.delivery_date ? 
          new Date(order.delivery_date).toLocaleDateString('es-CL') : '';
        const amount = '1700';
        
        csvContent += `"${driverName}","${orderNumber}","${customerName}","${commune}","${deliveryDate}","${amount}"\n`;
      });
      
      // Agregar resumen al final
      csvContent += '\n';
      csvContent += `RESUMEN,,,,Total Entregas,${orders.length}\n`;
      csvContent += `,,,,Total a Pagar,$${(orders.length * 1700).toLocaleString('es-CL')}\n`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=pagos-conductores-${date_from}-${date_to}.csv`);
      res.send('\ufeff' + csvContent); // BOM para UTF-8
      
    } catch (error) {
      console.error('❌ Error generando CSV:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;