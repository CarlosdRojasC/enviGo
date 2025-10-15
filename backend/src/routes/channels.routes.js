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

router.post('/channels/:channelId/resync', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { daysBack } = req.body; // Opcional: cuántos días hacia atrás sincronizar
    
    console.log(`🔄 [API] Solicitud de re-sincronización para canal ${channelId}`);
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    if (channel.channel_type !== 'mercadolibre') {
      return res.status(400).json({ error: 'Este canal no es de MercadoLibre' });
    }
    
    // Iniciar re-sincronización en background
    const MercadoLibreService = require('../services/mercadoLibreService');
    
    // Ejecutar en background
    MercadoLibreService.resyncOrders(channelId, { daysBack: daysBack || 30 })
      .then(result => {
        console.log(`✅ [API] Re-sincronización completada para canal ${channelId}:`, result);
      })
      .catch(error => {
        console.error(`❌ [API] Error en re-sincronización para canal ${channelId}:`, error.message);
      });
    
    res.json({ 
      success: true, 
      message: 'Re-sincronización iniciada en segundo plano',
      daysBack: daysBack || 30
    });
    
  } catch (error) {
    console.error('❌ [API] Error iniciando re-sincronización:', error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;