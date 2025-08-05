// backend/src/routes/channels.routes.js - Versión actualizada

const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const ChannelController = require('../controllers/channel.controller');


router.post('/jumpseller/authorize', ChannelController.getJumpsellerAuthorizationUrl);

// ✅ CORREGIDO: Callback de Jumpseller - DEBE SER GET, NO POST
router.get('/jumpseller/callback', (req, res, next) => {
  console.log('🔄 [DEBUG] Jumpseller callback route accessed!');
  console.log('🔄 [DEBUG] Query params:', req.query);
  console.log('🔄 [DEBUG] Method:', req.method);
  next();
}, ChannelController.handleJumpsellerCallback);


// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== RUTAS PARA ADMINISTRADORES ====================

// Obtener TODOS los canales (solo admin) - NUEVA RUTA
router.get('/admin/all', ChannelController.getAllForAdmin);

// Obtener canales de una empresa específica (admin o usuarios de la empresa)
router.get('/company/:companyId', ChannelController.getByCompany);

// ==================== RUTAS PARA CANALES ESPECÍFICOS ====================

// Obtener un canal específico con estadísticas
router.get('/:id', ChannelController.getById);

// Crear nuevo canal
router.post('/company/:companyId', ChannelController.create);

// Actualizar canal
router.put('/:id', ChannelController.update);

// Eliminar canal (desactivar)
router.delete('/:id', ChannelController.delete);

// Sincronizar pedidos de un canal
router.post('/:id/sync', ChannelController.syncOrders);

// Probar conexión con el canal
router.post('/:id/test-connection', ChannelController.testConnection);

// Obtener historial de sincronizaciones
router.get('/:id/sync-logs', ChannelController.getSyncLogs);

// Ruta para obtener la URL de autorización de Mercado Libre
router.post('/mercadolibre/authorize', authenticateToken, ChannelController.getMLAuthorizationUrl);

// Ruta para manejar el callback de Mercado Libre después de la autorización
router.post('/mercadolibre/callback', authenticateToken, ChannelController.handleMLCallback);

module.exports = router;