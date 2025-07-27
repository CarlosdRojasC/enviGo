const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateRegistration } = require('../middlewares/validators/user.validator');
const { validateMongoId } = require('../middlewares/validators/generic.validator');

// ==================== RUTAS DE USUARIOS ====================

// Crear nuevo usuario (solo admin)
router.post('/', authenticateToken, isAdmin, validateRegistration, authController.register);

// Obtener usuarios por empresa (solo admin)
router.get('/company/:companyId', 
  authenticateToken, 
  isAdmin, 
  validateMongoId('companyId'), 
  userController.getCompanyUsers
);

// Actualizar usuario (solo admin)
router.patch('/:id', 
  authenticateToken, 
  isAdmin, 
  validateMongoId('id'), 
  userController.updateUser
);


module.exports = router;