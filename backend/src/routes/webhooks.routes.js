const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const { authenticateToken } = require('../middlewares/auth.middleware');
const ShipdayService = require('../services/shipday.service');
const shipdayController = require('../controllers/shipday.controller');
const MercadoLibreService = require('../services/mercadolibre.service');
const ShopifyService = require('../services/shopify.service');
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
router.post('/mercadolibre', async (req, res) => {
  try {
    console.log('🔔 [ML Webhook] Notificación recibida RAW:', JSON.stringify(req.body, null, 2));

    const { topic, resource, user_id: userId } = req.body;
    const acceptedTopics = ['orders', 'orders_v2', 'shipments'];

    // ✅ Validar que sea un topic que nos interesa
    if (!acceptedTopics.includes(topic)) {
      console.log(`[ML Webhook] Topic ignorado: ${topic}`);
      return res.status(200).json({ status: 'ignored', reason: 'topic_not_accepted' });
    }

    // ✅ Validar user_id
    if (!userId) {
      console.log('[ML Webhook] user_id faltante en la notificación');
      return res.status(200).json({ status: 'ignored', reason: 'missing_user_id' });
    }

    // ✅ Buscar canal correspondiente
    const channel = await Channel.findOne({
      channel_type: 'mercadolibre',
      $or: [
        { 'settings.user_id': userId },
        { 'settings.user_id': userId.toString() }
      ],
      is_active: true
    });

    if (!channel) {
      console.log(`[ML Webhook] No se encontró canal activo para user_id: ${userId}`);
      return res.status(200).json({
        status: 'ignored',
        reason: 'channel_not_found',
        user_id: userId
      });
    }

    console.log(`[ML Webhook] Canal encontrado: ${channel.channel_name} (${channel._id}). Procesando en background...`);

    // ⚡ Respondemos a MercadoLibre de inmediato
    res.status(200).json({ status: 'queued', channel_id: channel._id });

    // 👇 Procesamos en background (no bloqueamos la respuesta a ML)
    setImmediate(async () => {
      try {
        const result = await MercadoLibreService.processWebhook(channel._id, req.body);

        if (result) {
          console.log(`[ML Webhook Worker] Pedido procesado correctamente para canal ${channel._id}`);
        } else {
          console.warn(`[ML Webhook Worker] No se pudo procesar pedido para canal ${channel._id}`);
        }
      } catch (err) {
        console.error(`[ML Webhook Worker] Error procesando webhook para canal ${channel._id}:`, err.message);
      }
    });

  } catch (error) {
    console.error('❌ [ML Webhook] Error fatal procesando webhook:', error);
    res.status(200).json({
      status: 'error',
      message: error.message
    });
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

router.get('/debug/mercadolibre/:channelId/shipment/:shipmentId', async (req, res) => {
  try {
    const MercadoLibreService = require('../services/mercadolibre.service');
    const result = await MercadoLibreService.debugSingleShipmentForPostman(
      req.params.channelId, 
      req.params.shipmentId
    );
    res.json(result);
  } catch (error) {
    console.error('❌ [Debug] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
router.post('/shopify/:channel_id', async (req, res) => {
  try {
    console.log('🎯 WEBHOOK SHOPIFY RECIBIDO'); // Este log debería aparecer
    
    const { channel_id } = req.params;
    const result = await ShopifyService.processWebhook(channel_id, req.body);
    
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/orders/:orderId/label', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Buscar el pedido en la BD para obtener el channel_id
    const order = await Order.findOne({ external_order_id: orderId });
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada en BD' });
    }

    // Obtener la etiqueta desde ML
    const pdfResponse = await MercadoLibreService.getShippingLabel(orderId, order.channel_id);

    // Configurar headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="label-${orderId}.pdf"`);

    // Pipear el stream directo al response
    pdfResponse.data.pipe(res);
  } catch (err) {
    console.error('❌ [ML Label] Error obteniendo etiqueta:', err.message);
    res.status(500).json({ error: 'No se pudo obtener la etiqueta', details: err.message });
  }
});


module.exports = router;