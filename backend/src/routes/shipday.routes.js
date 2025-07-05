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
router.post('/webhooks/shipday', shipdayController.handleWebhook);

// La exportación debe ser la última línea del archivo
module.exports = router;