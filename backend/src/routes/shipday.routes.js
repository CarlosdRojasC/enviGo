// backend/src/routes/shipday.routes.js

const express = require('express');
const router = express.Router();
const shipdayController = require('../controllers/shipday.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// ==================== CONEXIÓN ====================
router.get('/test-connection', authenticateToken, shipdayController.testConnection);

// ==================== DRIVERS ====================
router.get('/drivers', authenticateToken, shipdayController.getDrivers);
router.get('/drivers/:id', authenticateToken, shipdayController.getDriver);
router.post('/drivers', authenticateToken, shipdayController.createDriver);
router.put('/drivers/:id', authenticateToken, shipdayController.updateDriver);
router.delete('/drivers/:id', authenticateToken, shipdayController.deleteDriver);


// ==================== ORDERS ====================
router.get('/orders', authenticateToken, shipdayController.getOrders);
router.get('/orders/:id', authenticateToken, shipdayController.getOrder);
router.post('/orders', authenticateToken, shipdayController.createOrder);
router.put('/orders/:id/assign', authenticateToken, shipdayController.assignOrder);
router.put('/orders/:id/status', authenticateToken, shipdayController.updateOrderStatus);

// ==================== TRACKING ====================
router.get('/orders/:id/tracking', authenticateToken, shipdayController.getOrderTracking);

// ==================== WEBHOOKS ====================
router.post('/webhooks/setup', authenticateToken, isAdmin, shipdayController.setupWebhook);


// ==================== DEBUG SHIPDAY ====================

// Ruta para probar directamente el endpoint oficial de asignación
router.post('/shipday/test-assign/:orderId/:driverId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId, driverId } = req.params;
    
    console.log(`🧪 TEST: Probando endpoint oficial PUT /orders/${orderId}/assign con conductor ${driverId}`);
    
    // Primero validar que el conductor existe
    const driver = await ShipdayService.getValidatedDriver(driverId);
    console.log('✅ Conductor validado:', driver);
    
    // Luego verificar que la orden existe
    const orderInfo = await ShipdayService.getOrder(orderId);
    console.log('✅ Orden encontrada:', {
      orderId: orderInfo.orderId,
      customerName: orderInfo.customerName,
      hasCurrentDriver: !!(orderInfo.carrierId || orderInfo.carrierEmail)
    });
    
    // Probar asignación usando método oficial
    const result = await ShipdayService.assignOrder(orderId, driverId);
    
    // Verificar resultado
    const verification = await ShipdayService.verifyOrderAssignment(orderId);
    
    res.json({
      test_result: 'success',
      endpoint_tested: `PUT /orders/${orderId}/assign`,
      driver_info: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        isActive: driver.isActive
      },
      assignment_result: result,
      verification: verification,
      conclusion: verification.hasDriverAssigned ? 
        'Asignación exitosa según documentación oficial' : 
        'La asignación no se reflejó inmediatamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en test de endpoint oficial:', error);
    
    res.status(500).json({
      test_result: 'failed',
      endpoint_tested: `PUT /orders/${req.params.orderId}/assign`,
      error: error.message,
      error_details: {
        status: error.response?.status,
        data: error.response?.data
      },
      troubleshooting: [
        'Verificar que la orden existe en Shipday',
        'Comprobar que el conductor existe y está activo',
        'Revisar que la API Key tiene permisos de asignación',
        'Consultar documentación: https://docs.shipday.com/reference/assign-order'
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta para obtener información detallada de una orden en Shipday
router.get('/shipday/order-info/:orderId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log(`🔍 Obteniendo información detallada de orden ${orderId}...`);
    
    const orderInfo = await ShipdayService.debugOrder(orderId);
    
    res.json({
      shipday_order_id: orderId,
      order_info: orderInfo,
      driver_assignment: {
        has_driver: !!(orderInfo.carrierId || orderInfo.carrierEmail),
        driver_id: orderInfo.carrierId,
        driver_email: orderInfo.carrierEmail
      },
      order_status: orderInfo.orderStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo info de orden:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para listar conductores disponibles con detalles
router.get('/shipday/drivers-detailed', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🔍 Obteniendo lista detallada de conductores...');
    
    const drivers = await ShipdayService.getDrivers();
    
    const driversAnalysis = drivers.map(driver => ({
      id: driver.id,
      carrierId: driver.carrierId,
      name: driver.name,
      email: driver.email,
      isActive: driver.isActive,
      isOnShift: driver.isOnShift,
      status: driver.status,
      canBeAssigned: driver.isActive && !driver.isOnShift,
      phoneNumber: driver.phoneNumber
    }));
    
    const summary = {
      total: drivers.length,
      active: drivers.filter(d => d.isActive).length,
      available: drivers.filter(d => d.isActive && !d.isOnShift).length,
      onShift: drivers.filter(d => d.isOnShift).length,
      inactive: drivers.filter(d => !d.isActive).length
    };
    
    res.json({
      summary,
      drivers: driversAnalysis,
      recommendations: summary.available > 0 ? 
        [`Hay ${summary.available} conductores disponibles para asignación`] :
        [
          'No hay conductores disponibles',
          'Verifica que los conductores estén activos',
          'Algunos conductores pueden estar en turno'
        ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo conductores:', error);
    res.status(500).json({ error: error.message });
  }
});

// INVESTIGACIÓN COMPLETA DE SHIPDAY API
router.get('/shipday/full-investigation', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🔬 INICIANDO INVESTIGACIÓN COMPLETA DE SHIPDAY API...');
    
    const investigation = await ShipdayService.investigateAPIEndpoints();
    
    res.json({
      investigation_timestamp: new Date().toISOString(),
      shipday_base_url: 'https://api.shipday.com',
      investigation_results: investigation,
      summary: {
        api_accessible: investigation.api_info ? true : false,
        order_endpoints_working: Object.values(investigation.order_endpoints || {}).some(e => e.status === 'success'),
        assignment_endpoints_working: Object.values(investigation.assignment_endpoints || {}).some(e => e.status === 'success'),
        conclusion: investigation.conclusion
      },
      next_actions: investigation.conclusion?.working_assign_endpoint !== 'none' ? [
        'Implementar el endpoint de asignación que funciona',
        'Actualizar el método assignOrder en el servicio',
        'Probar la asignación con el nuevo método'
      ] : [
        'Contactar soporte de Shipday',
        'Verificar plan y permisos de API',
        'Considerar asignación manual desde dashboard web'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error en investigación completa:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Verificar conectividad básica con Shipday'
    });
  }
});

// Ruta más simple para probar conectividad básica
router.get('/shipday/basic-test', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🧪 Prueba básica de Shipday...');
    
    // Probar obtener órdenes (sabemos que esto funciona)
    const orders = await ShipdayService.getOrders();
    const drivers = await ShipdayService.getDrivers();
    
    res.json({
      test_result: 'success',
      connectivity: 'OK',
      orders_endpoint: 'working',
      drivers_endpoint: 'working',
      orders_count: Array.isArray(orders) ? orders.length : 'unknown',
      drivers_count: Array.isArray(drivers) ? drivers.length : 'unknown',
      next_step: 'Run full investigation to find working assignment endpoint',
      investigation_url: '/api/shipday/full-investigation'
    });
    
  } catch (error) {
    console.error('❌ Error en prueba básica:', error);
    res.status(500).json({ 
      test_result: 'failed',
      error: error.message 
    });
  }
});


// La exportación debe ser la última línea del archivo
module.exports = router;