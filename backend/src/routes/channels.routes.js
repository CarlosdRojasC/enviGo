// backend/src/routes/channels.routes.js
const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  isAdmin
} = require('../middlewares/auth.middleware');
const Channel = require('../models/Channel');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const channelController = require('../controllers/channel.controller');

// ==================== RUTAS DE CANALES ====================

// Obtener todos los canales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    
    // Aplicar filtro de empresa según el rol del usuario
    if (req.user.role === 'admin') {
      if (req.query.company_id) {
        filters.company_id = new mongoose.Types.ObjectId(req.query.company_id);
      }
    } else {
      if (req.user.company_id) {
        filters.company_id = new mongoose.Types.ObjectId(req.user.company_id);
      }
    }
    
    const channels = await Channel.find(filters)
      .populate('company_id', 'name email')
      .sort({ created_at: -1 });
    
    res.json({
      success: true,
      channels: channels,
      total: channels.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo canales:', error);
    res.status(500).json({ error: 'Error obteniendo canales' });
  }
});

// Crear nuevo canal
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const channelData = {
      ...req.body,
      company_id: req.user.role === 'admin' ? req.body.company_id : req.user.company_id
    };
    
    const channel = new Channel(channelData);
    await channel.save();
    
    res.status(201).json({
      success: true,
      channel: channel,
      message: 'Canal creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando canal:', error);
    res.status(500).json({ error: 'Error creando canal' });
  }
});

// Obtener canal por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('company_id', 'name email');
    
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && channel.company_id._id.toString() !== req.user.company_id?.toString()) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este canal' });
    }
    
    res.json({
      success: true,
      channel: channel
    });
  } catch (error) {
    console.error('❌ Error obteniendo canal:', error);
    res.status(500).json({ error: 'Error obteniendo canal' });
  }
});

// Actualizar canal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && channel.company_id.toString() !== req.user.company_id?.toString()) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este canal' });
    }
    
    const updatedChannel = await Channel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('company_id', 'name email');
    
    res.json({
      success: true,
      channel: updatedChannel,
      message: 'Canal actualizado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando canal:', error);
    res.status(500).json({ error: 'Error actualizando canal' });
  }
});

// Eliminar canal
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar si hay pedidos asociados
    const ordersCount = await Order.countDocuments({ channel_id: req.params.id });
    
    if (ordersCount > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el canal porque tiene pedidos asociados',
        orders_count: ordersCount 
      });
    }
    
    await Channel.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Canal eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando canal:', error);
    res.status(500).json({ error: 'Error eliminando canal' });
  }
});

// ==================== GESTIÓN DE COMUNAS ====================

// Obtener comunas configuradas para un canal
router.get('/:channelId/communes', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && channel.company_id.toString() !== req.user.company_id?.toString()) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este canal' });
    }
    
    const normalizedCommunes = channel.getNormalizedCommunes();
    
    res.json({
      success: true,
      channel_id: channelId,
      platform: channel.platform,
      accepted_communes: channel.accepted_communes,
      normalized_communes: normalizedCommunes,
      total_communes: channel.accepted_communes.length,
      allows_all: channel.accepted_communes.length === 0
    });
  } catch (error) {
    console.error('❌ Error obteniendo comunas del canal:', error);
    res.status(500).json({ error: 'Error obteniendo comunas del canal' });
  }
});

// Configurar comunas permitidas para un canal
router.put('/:channelId/communes', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { accepted_communes } = req.body;
    
    // Validar entrada
    if (!Array.isArray(accepted_communes)) {
      return res.status(400).json({ error: 'accepted_communes debe ser un array' });
    }
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && channel.company_id.toString() !== req.user.company_id?.toString()) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este canal' });
    }
    
    // Limpiar y normalizar comunas
    const cleanedCommunes = accepted_communes
      .map(commune => commune.trim())
      .filter(commune => commune.length > 0)
      .filter((commune, index, arr) => arr.indexOf(commune) === index); // Remover duplicados
    
    // Actualizar el canal
    channel.accepted_communes = cleanedCommunes;
    await channel.save();
    
    console.log(`✅ Comunas actualizadas para canal ${channelId}: ${cleanedCommunes.join(', ')}`);
    
    res.json({
      success: true,
      message: 'Comunas actualizadas exitosamente',
      channel_id: channelId,
      accepted_communes: cleanedCommunes,
      total_communes: cleanedCommunes.length,
      allows_all: cleanedCommunes.length === 0
    });
  } catch (error) {
    console.error('❌ Error actualizando comunas del canal:', error);
    res.status(500).json({ error: 'Error actualizando comunas del canal' });
  }
});

// Probar filtro de comunas para un canal
router.post('/:channelId/communes/test', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { test_commune } = req.body;
    
    if (!test_commune) {
      return res.status(400).json({ error: 'test_commune es requerido' });
    }
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && channel.company_id.toString() !== req.user.company_id?.toString()) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este canal' });
    }
    
    // Probar si la comuna está permitida
    const isAllowed = channel.isCommuneAllowed(test_commune);
    
    // Obtener versión normalizada
    let normalizedCommune = test_commune;
    if (channel.platform === 'woocommerce') {
      const WooCommerceService = require('../services/woocommerce.service');
      normalizedCommune = WooCommerceService.normalizeCommune(test_commune);
    } else if (channel.platform === 'shopify') {
      const ShopifyService = require('../services/shopify.service');
      normalizedCommune = ShopifyService.normalizeCommune(test_commune);
    }
    
    res.json({
      success: true,
      test_commune: test_commune,
      normalized_commune: normalizedCommune,
      is_allowed: isAllowed,
      platform: channel.platform,
      configured_communes: channel.accepted_communes,
      message: isAllowed ? 
        `✅ La comuna "${test_commune}" está permitida` : 
        `🚫 La comuna "${test_commune}" será rechazada`
    });
  } catch (error) {
    console.error('❌ Error probando filtro de comunas:', error);
    res.status(500).json({ error: 'Error probando filtro de comunas' });
  }
});

// Obtener estadísticas de pedidos por comuna para un canal
router.get('/:channelId/communes/stats', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && channel.company_id.toString() !== req.user.company_id?.toString()) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este canal' });
    }
    
    // Obtener estadísticas de pedidos por comuna
    const stats = await Order.aggregate([
      { $match: { channel_id: new mongoose.Types.ObjectId(channelId) } },
      {
        $group: {
          _id: '$shipping_commune',
          total_orders: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          last_order: { $max: '$order_date' },
          avg_amount: { $avg: '$total_amount' }
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $sort: { total_orders: -1 }
      },
      {
        $project: {
          commune: '$_id',
          total_orders: 1,
          total_amount: { $round: ['$total_amount', 0] },
          pending: 1,
          processing: 1,
          shipped: 1,
          delivered: 1,
          cancelled: 1,
          last_order: 1,
          avg_amount: { $round: ['$avg_amount', 0] },
          _id: 0
        }
      }
    ]);
    
    // Marcar cuáles comunas están permitidas
    const statsWithPermissions = stats.map(stat => ({
      ...stat,
      is_allowed: channel.isCommuneAllowed(stat.commune),
      would_be_rejected: !channel.isCommuneAllowed(stat.commune)
    }));
    
    // Calcular resumen
    const summary = {
      total_communes: stats.length,
      allowed_communes: statsWithPermissions.filter(s => s.is_allowed).length,
      rejected_communes: statsWithPermissions.filter(s => !s.is_allowed).length,
      total_orders: stats.reduce((sum, s) => sum + s.total_orders, 0),
      total_allowed_orders: statsWithPermissions.filter(s => s.is_allowed).reduce((sum, s) => sum + s.total_orders, 0),
      total_rejected_orders: statsWithPermissions.filter(s => !s.is_allowed).reduce((sum, s) => sum + s.total_orders, 0),
      total_amount: stats.reduce((sum, s) => sum + s.total_amount, 0),
      allowed_amount: statsWithPermissions.filter(s => s.is_allowed).reduce((sum, s) => sum + s.total_amount, 0),
      rejected_amount: statsWithPermissions.filter(s => !s.is_allowed).reduce((sum, s) => sum + s.total_amount, 0)
    };
    
    res.json({
      success: true,
      channel_id: channelId,
      platform: channel.platform,
      configured_communes: channel.accepted_communes,
      allows_all: channel.accepted_communes.length === 0,
      summary: summary,
      communes_stats: statsWithPermissions
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de comunas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas de comunas' });
  }
});

// Sincronizar pedidos con filtro de comunas
router.post('/:channelId/sync-with-communes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { date_from, date_to, dry_run } = req.body;
    
    const channel = await Channel.findById(channelId).populate('company_id');
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }
    
    console.log(`🔄 Iniciando sincronización con filtro de comunas para canal ${channelId}`);
    console.log(`📋 Comunas permitidas: ${channel.accepted_communes.join(', ')}`);
    
    let result;
    
    if (dry_run) {
      // Simulación sin crear pedidos
      console.log('🧪 Ejecutando simulación (dry run)');
      result = { 
        imported: 0, 
        rejected: 0, 
        total: 0, 
        message: 'Simulación - no se crearon pedidos reales' 
      };
    } else {
      // Sincronización real
      if (channel.platform === 'woocommerce') {
        const WooCommerceService = require('../services/woocommerce.service');
        result = await WooCommerceService.syncOrders(channel, date_from, date_to);
      } else if (channel.platform === 'shopify') {
        const ShopifyService = require('../services/shopify.service');
        result = await ShopifyService.syncOrders(channel, date_from, date_to);
      } else {
        return res.status(400).json({ error: 'Plataforma no soportada para sincronización' });
      }
      
      // Actualizar estadísticas del canal
      channel.last_sync = new Date();
      channel.total_orders_synced += result.imported;
      channel.total_orders_rejected += result.rejected;
      await channel.save();
    }
    
    res.json({
      success: true,
      channel_id: channelId,
      platform: channel.platform,
      sync_result: result,
      communes_filter: {
        enabled: channel.accepted_communes.length > 0,
        accepted_communes: channel.accepted_communes,
        total_communes: channel.accepted_communes.length
      },
      message: `Sincronización completada: ${result.imported} pedidos importados, ${result.rejected} rechazados por filtro de comuna`
    });
    
  } catch (error) {
    console.error('❌ Error en sincronización con filtro de comunas:', error);
    res.status(500).json({ error: 'Error en sincronización con filtro de comunas' });
  }
});
// --- 👇 AÑADE ESTA RUTA AL FINAL DEL ARCHIVO 👇 ---
router.post(
  '/:id/sync',
  authenticateToken,
  channelController.syncOrders);

module.exports = router;