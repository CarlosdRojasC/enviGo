// backend/src/routes/driverHistory.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const driverHistoryController = require('../controllers/driverHistory.controller');

// ==================== RUTAS DE CONDUCTORES ====================

/**
 * GET /api/driver-history/driver/:driverId
 * Obtiene el historial completo de entregas de un conductor
 */
router.get('/driver/:driverId', authenticateToken, driverHistoryController.getDriverHistory);

/**
 * GET /api/driver-history/driver/:driverId/pending
 * Obtiene entregas pendientes de pago de un conductor
 */
router.get('/driver/:driverId/pending', authenticateToken, driverHistoryController.getPendingPayments);

/**
 * POST /api/driver-history/driver/:driverId/pay-all
 * Marca todas las entregas pendientes de un conductor como pagadas
 */
router.post('/driver/:driverId/pay-all', authenticateToken, driverHistoryController.payAllPendingToDriver);

// ==================== RUTAS DE EMPRESA ====================

/**
 * GET /api/driver-history/company/:companyId/active-drivers
 * Obtiene todos los conductores activos de una empresa
 */
router.get('/company/:companyId/active-drivers', authenticateToken, driverHistoryController.getActiveDrivers);

/**
 * GET /api/driver-history/company/:companyId/monthly-report
 * Obtiene reporte mensual de pagos pendientes
 */
router.get('/company/:companyId/monthly-report', authenticateToken, driverHistoryController.getMonthlyPaymentReport);

/**
 * GET /api/driver-history/company/:companyId/stats
 * Obtiene estadísticas generales de entregas de la empresa
 */
router.get('/company/:companyId/stats', authenticateToken, driverHistoryController.getCompanyDeliveryStats);

// ==================== RUTAS DE PAGOS ====================

/**
 * POST /api/driver-history/mark-paid
 * Marca entregas específicas como pagadas
 * Body: { deliveryIds: ['id1', 'id2', ...] }
 */
router.post('/mark-paid', authenticateToken, driverHistoryController.markDeliveriesAsPaid);

module.exports = router;