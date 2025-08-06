const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const { authenticateToken } = require('../middlewares/auth.middleware');
const ShipdayService = require('../services/shipday.service');
const shipdayController = require('../controllers/shipday.controller');
const MercadoLibreService = require('../services/mercadolibre.service');

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

router.get('/mercadolibre/callback', async (req, res) => {
  console.log('🚨 [ML CALLBACK] EJECUTADO - URL completa:', req.url);
  console.log('🚨 [ML CALLBACK] Query completa:', req.query);
  
  try {
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      console.log(`❌ [ML Callback] Error OAuth recibido: ${oauthError}`);
      return res.redirect(`${process.env.FRONTEND_URL}/channels?error=oauth_denied&details=${oauthError}`);
    }
    
    if (!code || !state) {
      console.log('❌ [ML Callback] Faltan parámetros');
      return res.redirect(`${process.env.FRONTEND_URL}/channels?error=missing_params`);
    }
    
    console.log(`🔄 [ML Callback] Procesando - Code: ${code.substring(0, 10)}..., State: ${state}`);
    
    // ✅ VERIFICAR QUE EL SERVICIO SE CARGÓ
    console.log('🔍 [ML Callback] MercadoLibreService cargado:', !!MercadoLibreService);
    console.log('🔍 [ML Callback] Método exchangeCodeForTokens disponible:', typeof MercadoLibreService.exchangeCodeForTokens);
    
    // ✅ LLAMAR AL MÉTODO CON LOG
    console.log('🚀 [ML Callback] Llamando a exchangeCodeForTokens...');
    const channel = await MercadoLibreService.exchangeCodeForTokens(code, state);
    
    console.log(`✅ [ML Callback] Autorización exitosa para: ${channel.channel_name}`);
    res.redirect(`${process.env.FRONTEND_URL}/channels?success=ml_connected&channel_name=${encodeURIComponent(channel.channel_name)}`);
    
  } catch (error) {
    console.error('❌ [ML Callback] Error procesando:', error.message);
    console.error('❌ [ML Callback] Stack trace:', error.stack);
    res.redirect(`${process.env.FRONTEND_URL}/channels?error=validation_failed&details=${encodeURIComponent(error.message)}`);
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

router.post('/shipday-webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (event === 'order_delivered' || event === 'delivery_completed') {
      const orderId = data.orderId;
      
      // Actualizar la orden local
      const order = await Order.findOne({ shipday_order_id: orderId });
      
      if (order) {
        order.status = 'delivered';
        order.delivery_date = new Date();
        
        // Si viene info del conductor en el webhook, guardarla
        if (data.carrier || data.driver) {
          order.driver_info = {
            name: data.carrier?.name || data.driver?.name || '',
            email: data.carrier?.email || data.driver?.email || '',
            phone: data.carrier?.phone || data.driver?.phone || ''
          };
        }
        
        await order.save();
        console.log(`✅ Orden ${order.order_number} marcada como entregada para pagos`);
      }
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(500).json({ error: error.message });
  }
});
router.post('/shipday', shipdayController.handleWebhook);

router.get('/debug/mercadolibre/:channelId', async (req, res) => {
  try {
    const MercadoLibreService = require('../services/mercadolibre.service');
    const result = await MercadoLibreService.debugSpecificOrdersForPostman(req.params.channelId);
    res.json(result);
  } catch (error) {
    console.error('❌ [Debug] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;