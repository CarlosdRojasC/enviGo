const express = require('express');
const router = express.Router();
const manifestController = require('../controllers/manifest.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Crear manifiesto
router.post('/', authenticateToken, manifestController.create);

// Listar manifiestos
router.get('/', authenticateToken, manifestController.getAll);

// Obtener manifiesto específico
router.get('/:id', authenticateToken, manifestController.getById);

// Generar PDF
router.get('/:id/pdf', authenticateToken, manifestController.generatePDF);

// Actualizar estado
router.patch('/:id/status', 
  authenticateToken, 
  authorizeRoles(['admin', 'company_owner']), 
  manifestController.updateStatus
);

module.exports = router;
