// backend/src/routes/manifest.routes.js

const express = require('express');
const router = express.Router();
const manifestController = require('../controllers/manifest.controller');
const { authenticateToken, isAdmin, isAdminOrCompanyOwner } = require('../middlewares/auth.middleware');

// ==================== RUTAS DE MANIFIESTOS ====================

// Crear manifiesto (todos los usuarios autenticados)
router.post('/', authenticateToken, manifestController.create);

// Listar manifiestos (admin ve todos, otros solo los de su empresa)
router.get('/', authenticateToken, manifestController.getAll);

// Obtener manifiesto específico (admin ve todos, otros solo los de su empresa)
router.get('/:id', authenticateToken, manifestController.getById);

// Generar PDF (admin ve todos, otros solo los de su empresa)
router.get('/:id/pdf', authenticateToken, manifestController.generatePDF);

// Actualizar estado - solo admin y company_owner pueden cambiar estados
router.patch('/:id/status', authenticateToken, isAdmin, manifestController.updateStatus);
router.get('/pending-pickups', authenticateToken, isAdmin, manifestController.getPendingPickups);
