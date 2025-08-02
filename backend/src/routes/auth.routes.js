// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validateRegistration, validatePasswordReset, validatePasswordChange } = require('../middlewares/validators/user.validator');
const rateLimit = require('express-rate-limit');

// Rate limiters para diferentes endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos por IP
  message: {
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 solicitudes por IP
  message: {
    error: 'Demasiadas solicitudes de restablecimiento. Intenta de nuevo en 1 hora.'
  }
});

// ==================== RUTAS PÚBLICAS ====================
router.post('/login', loginLimiter, authController.login.bind(authController));
router.post('/register', validateRegistration, authController.register);

// Password reset
router.post('/request-password-reset', passwordResetLimiter, authController.requestPasswordReset);
router.post('/reset-password', validatePasswordReset, authController.resetPassword);

// ==================== RUTAS PROTEGIDAS ====================
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, validatePasswordChange, authController.changePassword);
router.post('/verify-token', authenticateToken, authController.verifyToken);
router.get('/reset-password/validate/:token', authController.validateResetToken);
module.exports = router;
