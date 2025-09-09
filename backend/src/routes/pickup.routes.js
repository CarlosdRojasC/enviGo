const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const pickupController = require('../controllers/pickup.controller'); // Crearemos este archivo después

// ==================== RUTAS DE PICKUPS (RETIROS) ====================

// GET /api/pickups - Obtener todos los retiros (solo para admin)
router.get('/', authenticateToken, isAdmin, pickupController.getAll);

// GET /api/pickups/:id - Obtener un retiro específico
router.get('/:id', authenticateToken, isAdmin, pickupController.getById);

// PATCH /api/pickups/:id/assign - Asignar un conductor a un retiro
router.patch('/:id/assign', authenticateToken, isAdmin, pickupController.assignDriver);

// PATCH /api/pickups/:id/status - Actualizar el estado de un retiro
router.patch('/:id/status', authenticateToken, isAdmin, pickupController.updateStatus);


module.exports = router;