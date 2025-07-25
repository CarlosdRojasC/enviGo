const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const GeneralStoreService = require('../services/generalStore.service');
const Channel = require('../models/Channel');

// Crear pedido en tienda general
router.post('/:channelId/orders', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const orderData = req.body;
    const userId = req.user.user_id;
    
    // Validar datos
    GeneralStoreService.validateOrderData(orderData);
    
    // Verificar que el usuario tenga acceso al canal
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar permisos (solo admin o usuarios de la empresa)
    if (req.user.role === 'admin' || 
        req.user.company_id?.toString() === channel.company_id.toString()) {
      
      const newOrder = await GeneralStoreService.createOrder(channelId, orderData, userId);
      
      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: newOrder
      });
      
    } else {
      return res.status(403).json({ error: 'Sin permisos para este canal' });
    }
    
  } catch (error) {
    console.error('Error creando pedido en tienda general:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener estadísticas del canal
router.get('/:channelId/stats', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { period = '30d' } = req.query;
    
    const stats = await GeneralStoreService.getChannelStats(channelId, period);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;