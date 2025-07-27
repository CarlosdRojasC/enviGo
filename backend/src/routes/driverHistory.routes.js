// backend/src/routes/driverHistory.routes.js
// VERSIÓN MÍNIMA - SOLO MÉTODOS QUE REALMENTE EXISTEN EN EL CONTROLADOR

const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin, isAdminOrCompanyOwner } = require('../middlewares/auth.middleware');
const driverHistoryController = require('../controllers/driverHistory.controller');

// ==================== RUTAS QUE SÍ FUNCIONAN ====================

/**
 * GET /api/driver-history/test
 * Método de prueba para debuggear el sistema (IMPLEMENTADO ✅)
 */
router.get('/test', 
  authenticateToken, 
  driverHistoryController.testMethod
);

/**
 * GET /api/driver-history/all-deliveries
 * Obtener entregas para pagos (IMPLEMENTADO ✅)
 */
router.get('/all-deliveries', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getAllDeliveriesForPayments
);

/**
 * POST /api/driver-history/create-from-orders
 * Crear registros desde órdenes existentes (IMPLEMENTADO ✅)
 */
router.post('/create-from-orders', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.createHistoryFromOrders
);

router.post('/mark-paid', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.markDeliveriesAsPaid
);

/**
 * POST /api/driver-history/driver/:driverId/pay-all
 * Pagar todas las entregas pendientes de un conductor
 */
router.post('/driver/:driverId/pay-all', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.payAllPendingToDriver
);

// ==================== RUTAS QUE HAY QUE IMPLEMENTAR DESPUÉS ====================
// (Comentadas hasta que implementemos los métodos en el controlador)

/*
router.get('/global-payment-summary', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getGlobalPaymentSummary  // ❌ NO EXISTE
);

router.get('/all-active-drivers', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getAllActiveDrivers  // ❌ NO EXISTE
);

router.get('/export-excel', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.exportToExcel  // ❌ NO EXISTE
);

router.get('/company/:companyId/deliveries', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getCompanyDeliveries  // ❌ NO EXISTE
);

router.get('/company/:companyId/active-drivers', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getActiveDrivers  // ❌ NO EXISTE
);

router.get('/company/:companyId/monthly-report', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getMonthlyPaymentReport  // ❌ NO EXISTE
);

router.get('/company/:companyId/stats', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getCompanyDeliveryStats  // ❌ NO EXISTE
);

router.get('/driver/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getDriverHistory  // ❌ NO EXISTE
);

router.get('/driver/:driverId/pending', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getPendingPayments  // ❌ NO EXISTE
);

router.post('/driver/:driverId/pay-all', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.payAllPendingToDriver  // ❌ NO EXISTE
);

router.post('/mark-paid', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.markDeliveriesAsPaid  // ❌ NO EXISTE
);
*/

module.exports = router;