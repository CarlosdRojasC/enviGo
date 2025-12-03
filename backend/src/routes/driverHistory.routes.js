// backend/src/routes/driverHistory.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const driverHistoryController = require('../controllers/driverHistory.controller');

// ==================== RUTAS GLOBALES (ADMIN) ====================

/**
 * GET /api/driver-history/test
 * Método de prueba para debuggear el sistema
 */
router.get('/test', 
  authenticateToken, 
  driverHistoryController.testMethod
);

/**
 * GET /api/driver-history/all-deliveries
 * Obtener entregas para pagos
 */
router.get('/all-deliveries', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getAllDeliveriesForPayments
);

/**
 * POST /api/driver-history/create-from-orders
 * Crear registros desde órdenes existentes
 */
router.post('/create-from-orders', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.createHistoryFromOrders
);

/**
 * POST /api/driver-history/mark-as-paid
 * Marcar entregas específicas como pagadas
 */
router.post('/mark-as-paid', 
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

// ==================== RUTAS DE HISTORIAL Y ESTADÍSTICAS (CONDUCTOR) ====================

/**
 * GET /api/driver-history/driver/:driverId
 * Historial completo
 */
router.get('/driver/:driverId', [
  authenticateToken,
  async (req, res, next) => {
    const { driverId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const userEmail = req.user.email; // ✅ Obtenemos el email

    // Admin/Manager pueden ver todo
    if (['admin', 'manager'].includes(userRole)) return next();

    // Conductor puede ver si coincide su ID o su Email
    if (userRole === 'driver' && (userId === driverId || userEmail === driverId)) {
      return next();
    }

    if (userRole === 'company_owner') return next();

    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para ver este historial'
    });
  }
], driverHistoryController.getDriverHistory);

/**
 * GET /api/driver-history/driver/:driverId/stats
 * Estadísticas
 */
router.get('/driver/:driverId/stats', [
  authenticateToken,
  async (req, res, next) => {
    const { driverId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const userEmail = req.user.email;

    if (['admin', 'manager'].includes(userRole)) return next();

    // ✅ Validación flexible (ID o Email)
    if (userRole === 'driver' && (userId === driverId || userEmail === driverId)) {
      return next();
    }

    if (userRole === 'company_owner') return next();

    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para ver estas estadísticas'
    });
  }
], driverHistoryController.getDriverStats);

/**
 * GET /api/driver-history/driver/:driverId/pending
 * Pagos pendientes
 */
router.get('/driver/:driverId/pending', [
  authenticateToken,
  async (req, res, next) => {
    const { driverId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;
    const userEmail = req.user.email;

    if (['admin', 'manager'].includes(userRole)) return next();

    // ✅ Validación flexible (ID o Email)
    if (userRole === 'driver' && (userId === driverId || userEmail === driverId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para ver información de pagos'
    });
  }
], driverHistoryController.getDriverPendingPayments);

module.exports = router;