const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const channelController = require('../controllers/channel.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');

// ==================== RUTAS DE EMPRESAS ====================

// Listar todas las empresas (solo admin)
router.get('/', authenticateToken, isAdmin, companyController.getAll);

// Crear nueva empresa (solo admin)
router.post('/', authenticateToken, isAdmin, companyController.create);

// Actualizar precio de empresa (solo admin)
router.patch('/:id/price', authenticateToken, isAdmin, validateMongoId('id'), companyController.updatePrice);

// Obtener empresa específica
router.get('/:id', authenticateToken, validateMongoId('id'), companyController.getById);

// Actualizar empresa
router.put('/:id', authenticateToken, validateMongoId('id'), companyController.update);

// Obtener usuarios de una empresa
router.get('/:id/users', authenticateToken, validateMongoId('id'), companyController.getUsers);

// Obtener estadísticas de una empresa
router.get('/:id/stats', authenticateToken, validateMongoId('id'), companyController.getStats);

// ==================== CANALES DE VENTA ANIDADOS ====================
router.get('/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.getByCompany);
router.post('/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.create);

module.exports = router;