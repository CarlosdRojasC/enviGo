// backend/src/routes/driverHistory.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin, isAdminOrCompanyOwner } = require('../middlewares/auth.middleware');
const driverHistoryController = require('../controllers/driverHistory.controller');

// ==================== RUTAS GLOBALES DE ENVIGO (SOLO ADMINS) ====================

/**
 * GET /api/driver-history/all-deliveries
 * Obtener TODAS las entregas de TODOS los conductores de EnviGo
 * Solo accesible por ADMINS
 * Query params: date_from, date_to, driver_id, company_id (filtro opcional), payment_status
 */
router.get('/all-deliveries', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getAllDeliveriesForPayments
);

/**
 * GET /api/driver-history/global-payment-summary
 * Resumen global de pagos pendientes de todos los conductores
 * Solo accesible por ADMINS
 * Query params: date_from, date_to, company_id (filtro opcional)
 */
router.get('/global-payment-summary', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getGlobalPaymentSummary
);

/**
 * GET /api/driver-history/all-active-drivers
 * Todos los conductores activos de EnviGo
 * Solo accesible por ADMINS
 * Query params: startDate, endDate
 */
router.get('/all-active-drivers', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getAllActiveDrivers
);

/**
 * GET /api/driver-history/export-excel
 * Exportar reporte global de pagos a Excel
 * Solo accesible por ADMINS
 * Query params: company_id (opcional), date_from, date_to, payment_status
 */
router.get('/export-excel', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.exportToExcel
);

// ==================== RUTAS POR EMPRESA ====================

/**
 * GET /api/driver-history/company/:companyId/deliveries
 * Obtener entregas de conductores para una empresa específica
 * Accesible por ADMINS y COMPANY_OWNERS (solo su empresa)
 */
router.get('/company/:companyId/deliveries', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getCompanyDeliveries
);

/**
 * GET /api/driver-history/company/:companyId/active-drivers
 * Obtiene conductores que han entregado para esta empresa
 */
router.get('/company/:companyId/active-drivers', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getActiveDrivers
);

/**
 * GET /api/driver-history/company/:companyId/monthly-report
 * Obtiene reporte mensual de entregas para una empresa
 */
router.get('/company/:companyId/monthly-report', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getMonthlyPaymentReport
);

/**
 * GET /api/driver-history/company/:companyId/stats
 * Obtiene estadísticas de entregas de la empresa
 */
router.get('/company/:companyId/stats', 
  authenticateToken, 
  isAdminOrCompanyOwner, 
  driverHistoryController.getCompanyDeliveryStats
);

// ==================== RUTAS DE CONDUCTORES INDIVIDUALES (SOLO ADMINS) ====================

/**
 * GET /api/driver-history/driver/:driverId
 * Obtiene el historial completo de entregas de un conductor
 * Solo accesible por ADMINS
 */
router.get('/driver/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getDriverHistory
);

/**
 * GET /api/driver-history/driver/:driverId/pending
 * Obtiene entregas pendientes de pago de un conductor
 * Solo accesible por ADMINS
 * Query params: companyId (opcional - para filtrar por empresa)
 */
router.get('/driver/:driverId/pending', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getPendingPayments
);

/**
 * POST /api/driver-history/driver/:driverId/pay-all
 * Marca todas las entregas pendientes de un conductor como pagadas
 * Solo ADMINS pueden pagar conductores (es responsabilidad de EnviGo)
 * Body: { companyId? } - opcional para pagar solo entregas de una empresa
 */
router.post('/driver/:driverId/pay-all', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.payAllPendingToDriver
);

// ==================== RUTAS DE PAGOS (SOLO ADMINS) ====================

/**
 * POST /api/driver-history/mark-paid
 * Marca entregas específicas como pagadas
 * Solo ADMINS pueden marcar pagos (es responsabilidad de EnviGo)
 * Body: { deliveryIds: ['id1', 'id2', ...] }
 */
router.post('/mark-paid', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.markDeliveriesAsPaid
);

// ==================== RUTAS LEGACY (MANTENER COMPATIBILIDAD) ====================

/**
 * GET /api/driver-history/company-deliveries
 * LEGACY: Redirigir a método global para admins
 * Query params: company_id, date_from, date_to, driver_id, payment_status
 */
router.get('/company-deliveries', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getAllDeliveriesForPayments
);

/**
 * GET /api/driver-history/payment-summary
 * LEGACY: Redirigir a método global para admins
 * Query params: company_id, date_from, date_to
 */
router.get('/payment-summary', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getGlobalPaymentSummary
);

module.exports = router;