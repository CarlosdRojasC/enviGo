
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notifications.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// --- AQUÍ ESTÁ LA RUTA QUE FALTA ---
// GET /api/notifications
router.get(
  '/',
  authenticateToken, // Protege la ruta para que solo usuarios autenticados la usen
  notificationController.getAllNotifications
);

// (Opcional) Rutas para marcar como leídas, que también creamos en el frontend
router.post(
  '/:id/read',
  authenticateToken,
  notificationController.markAsRead
);

router.post(
  '/mark-all-read',
  authenticateToken,
  notificationController.markAllAsRead
);


module.exports = router;