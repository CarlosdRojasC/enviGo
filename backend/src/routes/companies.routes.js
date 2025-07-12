const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');
const channelController = require('../controllers/channel.controller');



// ==================== EMPRESAS ====================

router.get('/companies', authenticateToken, isAdmin, companyController.getAll);
router.post('/companies', authenticateToken, isAdmin, companyController.create);
router.patch('/companies/:id/price', authenticateToken, isAdmin, companyController.updatePrice);

router.get('/companies/:id', authenticateToken, validateMongoId('id'), companyController.getById);
router.put('/companies/:id', authenticateToken, validateMongoId('id'), companyController.update);
router.get('/companies/:id/users', authenticateToken, validateMongoId('id'), companyController.getUsers);
router.get('/companies/:id/stats', authenticateToken, validateMongoId('id'), companyController.getStats);

// ==================== CANALES DE VENTA (RUTAS BÁSICAS) ====================
// Las rutas avanzadas de comunas están en channels.routes.js

router.get('/companies/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.getByCompany);
router.post('/companies/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.create);


module.exports = router;