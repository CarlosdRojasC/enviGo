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

router.get('/driver/:driverId', [
  authenticateToken,
  // Permitir que conductores vean su propio historial O que admins/managers vean cualquier historial
  async (req, res, next) => {
    const { driverId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Admins pueden ver cualquier historial
    if (['admin', 'manager'].includes(userRole)) {
      return next();
    }

    // Conductores solo pueden ver su propio historial
    if (userRole === 'driver' && userId === driverId) {
      return next();
    }

    // Company owners pueden ver conductores de su empresa (requiere lógica adicional)
    if (userRole === 'company_owner') {
      // Aquí podrías agregar lógica para verificar que el conductor pertenece a la empresa
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para ver este historial'
    });
  }
], driverHistoryController.getDriverHistory);

/**
 * GET /api/driver-history/driver/:driverId/stats
 * Obtener estadísticas de entregas de un conductor específico
 */
router.get('/driver/:driverId/stats', [
  authenticateToken,
  // Misma lógica de permisos que arriba
  async (req, res, next) => {
    const { driverId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (['admin', 'manager'].includes(userRole)) {
      return next();
    }

    if (userRole === 'driver' && userId === driverId) {
      return next();
    }

    if (userRole === 'company_owner') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para ver estas estadísticas'
    });
  }
], driverHistoryController.getDriverStats);

/**
 * GET /api/driver-history/driver/:driverId/pending
 * Obtener entregas pendientes de pago de un conductor
 */
router.get('/driver/:driverId/pending', [
  authenticateToken,
  // Solo admins y el propio conductor pueden ver pagos pendientes
  async (req, res, next) => {
    const { driverId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (['admin'].includes(userRole)) {
      return next();
    }

    if (userRole === 'driver' && userId === driverId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para ver información de pagos'
    });
  }
], driverHistoryController.getDriverPendingPayments);

module.exports = router;