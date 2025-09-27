// backend/src/routes/sessions.routes.js
const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessions.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateToken);
router.use(isAdmin);

// Obtener todas las sesiones activas
router.get('/active', sessionsController.getActiveSessions);

// Obtener estadísticas de sesiones
router.get('/stats', sessionsController.getSessionStats);

// Terminar sesión específica
router.delete('/:sessionId', sessionsController.terminateSession);

// Terminar TODAS las sesiones (emergencia)
router.post('/terminate-all', sessionsController.terminateAllSessions);

module.exports = router;

// NO OLVIDES: Agregar en tu app.js principal:
// app.use('/api/sessions', require('./routes/sessions.routes'));