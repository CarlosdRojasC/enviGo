// backend/src/routes/driverHistory.routes.js - VERSIÓN COMPLETA ACTUALIZADA
const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin, isAdminOrCompanyOwner } = require('../middlewares/auth.middleware');
const driverHistoryController = require('../controllers/driverHistory.controller');

// ==================== RUTAS GLOBALES DE ENVIGO (SOLO ADMINS) ====================

router.get('/test', 
  authenticateToken, 
  driverHistoryController.testMethod
);
/**
 * GET /api/driver-history/all-deliveries
 * Obtener TODAS las entregas de TODOS los conductores de EnviGo
 * Solo accesible por ADMINS
 */
router.get('/all-deliveries', 
  authenticateToken, 
  isAdmin, 
  driverHistoryController.getAllDeliveriesForPayments
);



module.exports = router;