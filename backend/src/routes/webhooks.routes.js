const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const { authenticateToken } = require('../middlewares/auth.middleware');
const ShipdayService = require('../services/shipday.service');

// OAuth MercadoLibre
router.get('/channels/mercadolibre/auth', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.query; // Cambio: usar query en lugar de body para GET
    
    if (!channelId) {
      return res.status(400).json({ error: 'channelId es requerido' });
    }
    
    const MercadoLibreService = require('../services/mercadolibre.service');
    
    // ✅ USAR LA MISMA URL QUE EL SERVICIO
    const authUrl = MercadoLibreService.getAuthorizationUrl(channelId);
    
    console.log(`🔐 [ML Auth] URL generada para canal ${channelId}:`, authUrl);
    
    res.json({ auth_url: authUrl });
  } catch (error) {
    console.error('❌ [ML Auth] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/channels/mercadolibre/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    // Manejar errores de autorización
    if (oauthError) {
      console.log(`❌ [ML Callback] Error OAuth: ${oauthError}`);
      return res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/error?error=${oauthError}`);
    }
    
    if (!code || !state) {
      console.log('❌ [ML Callback] Faltan parámetros:', { code: !!code, state: !!state });
      return res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/error?error=missing_params`);
    }
    
    console.log(`🔄 [ML Callback] Procesando autorización para canal: ${state}`);
    
    const MercadoLibreService = require('../services/mercadolibre.service');
    
    // ✅ USAR exchangeCodeForTokens CON LOS PARÁMETROS CORRECTOS
    const channel = await MercadoLibreService.exchangeCodeForTokens(code, state);
    
    console.log(`✅ [ML Callback] Autorización exitosa para canal: ${channel.channel_name}`);
    
    // Redirigir al frontend con éxito
    res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/success?channel=${channel._id}`);
    
  } catch (error) {
    console.error('❌ [ML Callback] Error procesando callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/error?error=processing_failed`);
  }
});
// ===== WEBHOOK GENÉRICO PARA MERCADOLIBRE =====
router.post('/webhooks/mercadolibre', async (req, res) => {
  try {
    console.log('🔔 Webhook ML recibido:', {
      topic: req.body.topic,
      resource: req.body.resource,
      user_id: req.body.user_id,
      application_id: req.body.application_id
    });

    // Validar que sea una notificación de pedidos
    if (req.body.topic !== 'orders' && req.body.topic !== 'orders_v2') {
      console.log(`[ML Webhook] Topic ignorado: ${req.body.topic}`);
      return res.status(200).json({ status: 'ignored', reason: 'topic_not_orders' });
    }

    // Obtener el user_id de la notificación
    const userId = req.body.user_id;
    if (!userId) {
      console.log('[ML Webhook] user_id faltante en la notificación');
      return res.status(400).json({ error: 'user_id requerido' });
    }

    // Buscar el canal que corresponde a este usuario de ML
    const channel = await Channel.findOne({
      channel_type: 'mercadolibre',
      'settings.user_id': userId.toString(),
      is_active: true
    });

    if (!channel) {
      console.log(`[ML Webhook] No se encontró canal activo para user_id: ${userId}`);
      return res.status(404).json({ 
        error: 'Canal no encontrado',
        user_id: userId,
        message: 'No hay canal de MercadoLibre configurado para este usuario'
      });
    }

    console.log(`[ML Webhook] Canal encontrado: ${channel.channel_name} (${channel._id})`);

    // Procesar el webhook con el canal encontrado
    const MercadoLibreService = require('../services/mercadolibre.service');
    const result = await MercadoLibreService.processWebhook(channel._id, req.body);

    if (result) {
      console.log('[ML Webhook] Webhook procesado exitosamente');
      res.status(200).json({ 
        status: 'success', 
        channel_id: channel._id,
        channel_name: channel.channel_name 
      });
    } else {
      console.log('[ML Webhook] Webhook no pudo ser procesado');
      res.status(500).json({ error: 'Error procesando webhook' });
    }

  } catch (error) {
    console.error('❌ [ML Webhook] Error procesando webhook:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});
router.post('/webhooks/:channel_type/:channel_id', async (req, res) => {
  try {
    const { channel_type, channel_id } = req.params;
    console.log(`Webhook recibido: ${channel_type} - Canal ${channel_id}`);

    let order = null;

    if (channel_type === 'shopify') {
      const ShopifyService = require('../services/shopify.service');
      order = await ShopifyService.processWebhook(channel_id, req.body);
    } else if (channel_type === 'woocommerce') {
      const WooCommerceService = require('../services/woocommerce.service');
      order = await WooCommerceService.processWebhook(channel_id, req.body, req.headers);
    } else if (channel_type === 'mercadolibre') {
      const MercadoLibreService = require('../services/mercadolibre.service');
      order = await MercadoLibreService.processWebhook(channel_id, req.body);
    }

    // NUEVO: Auto-crear en Shipday si está habilitado
    if (order && process.env.AUTO_CREATE_SHIPDAY_ORDERS === 'true') {
      try {
        console.log('🚀 Auto-creando orden en Shipday:', order.order_number);
        
        const shipdayData = {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerAddress: order.shipping_address,
          customerEmail: order.customer_email || '',
          customerPhoneNumber: order.customer_phone || '',
          deliveryInstruction: order.notes || 'Sin instrucciones especiales',
        };

        const shipdayOrder = await ShipdayService.createOrder(shipdayData);
        
        // Actualizar orden local
        order.shipday_order_id = shipdayOrder.orderId;
        order.status = 'processing';
        await order.save();

        console.log('✅ Orden auto-creada en Shipday:', shipdayOrder.orderId);
        
      } catch (shipdayError) {
        console.error('❌ Error auto-creando en Shipday:', shipdayError);
        // No fallar el webhook por error de Shipday
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});
module.exports = router;