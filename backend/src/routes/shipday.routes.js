// backend/src/routes/shipday.routes.js

const express = require('express');
const router = express.Router();
const shipdayController = require('../controllers/shipday.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// ==================== CONEXIÓN ====================

// Probar conexión con ShipDay
router.get('/test-connection', authenticateToken, shipdayController.testConnection);

// ==================== DRIVERS ====================

// Obtener todos los conductores
router.get('/drivers', authenticateToken, shipdayController.getDrivers);

// Obtener un conductor específico
router.get('/drivers/:id', authenticateToken, shipdayController.getDriver);

// Crear nuevo conductor
router.post('/drivers', authenticateToken, shipdayController.createDriver);

// Actualizar estado de orden
router.put('/orders/:id/status', authenticateToken, shipdayController.updateOrderStatus);

// ==================== TRACKING ====================

// Obtener tracking de una orden
router.get('/orders/:id/tracking', authenticateToken, shipdayController.getOrderTracking);

// ==================== WEBHOOKS ====================

// Configurar webhook (solo admin)
router.post('/webhooks/setup', authenticateToken, isAdmin, shipdayController.setupWebhook);

// Recibir webhook de ShipDay (sin autenticación - viene de ShipDay)
router.post('/webhooks/shipday', shipdayController.handleWebhook);

module.exports = router; conductor
router.put('/drivers/:id', authenticateToken, shipdayController.updateDriver);

// Eliminar conductor
router.delete('/drivers/:id', authenticateToken, shipdayController.deleteDriver);

// ==================== ORDERS ====================

// Obtener todas las órdenes
router.get('/orders', authenticateToken, shipdayController.getOrders);

// Obtener una orden específica
router.get('/orders/:id', authenticateToken, shipdayController.getOrder);

// Crear nueva orden
router.post('/orders', authenticateToken, shipdayController.createOrder);

// Asignar orden a conductor
router.put('/orders/:id/assign', authenticateToken, shipdayController.assignOrder);

// Actualizar