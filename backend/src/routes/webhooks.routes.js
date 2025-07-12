const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const { authenticateToken } = require('../middlewares/auth.middleware');
const ShipdayService = require('../services/shipday.service');

// OAuth MercadoLibre
router.get('/channels/mercadolibre/auth', authenticateToken, async (req, res) => {
  try {
    const MercadoLibreService = require('../services/mercadolibre.service');
    const redirectUri = `${process.env.BACKEND_URL}/api/channels/mercadolibre/callback`;
    const authUrl = await MercadoLibreService.getAuthorizationUrl(redirectUri);
    res.json({ auth_url: authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/channels/mercadolibre/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const MercadoLibreService = require('../services/mercadolibre.service');
    const redirectUri = `${process.env.BACKEND_URL}/api/channels/mercadolibre/callback`;

    const tokens = await MercadoLibreService.exchangeCodeForTokens(code, redirectUri);

    res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/success`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/error`);
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