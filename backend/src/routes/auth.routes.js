const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validateRegistration } = require('../middlewares/validators/user.validator');

// ==================== RUTAS PÚBLICAS ====================

router.post('/auth/login', authController.login);
router.post('/auth/register', validateRegistration, authController.register);

// ==================== RUTAS AUTENTICADAS ====================

router.get('/auth/profile', authenticateToken, authController.getProfile);
router.post('/auth/change-password', authenticateToken, authController.changePassword);

module.exports = router;