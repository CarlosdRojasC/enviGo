const express = require('express');
const router = express.Router();
const ChannelController = require('../controllers/channel.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener canales de una empresa
router.get('/company/:companyId', ChannelController.getByCompany);

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

// NUEVO: Obtener historial de sincronizaciones
router.get('/:id/sync-logs', ChannelController.getSyncLogs);

module.exports = router;