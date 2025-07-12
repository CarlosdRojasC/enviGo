const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validateRegistration } = require('../middlewares/validators/user.validator');

// ==================== RUTAS PÚBLICAS ====================
router.post('/login', authController.login);
router.post('/register', validateRegistration, authController.register);

// ==================== RUTAS PROTEGIDAS ====================
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;