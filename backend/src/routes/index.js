const express = require('express');
const router = express.Router();

// Importar middlewares
const { 
  authenticateToken, 
  isAdmin, 
  isCompanyOwner,
  hasCompanyAccess 
} = require('../middlewares/auth.middleware');

// Importar controladores
const authController = require('../controllers/auth.controller');
const companyController = require('../controllers/company.controller');
const orderController = require('../controllers/order.controller');
const channelController = require('../controllers/channel.controller');

// ==================== RUTAS PÚBLICAS ====================

// Autenticación
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);

// Webhooks (no requieren autenticación)
router.post('/webhooks/:channel_type/:channel_id', async (req, res) => {
  try {
    const { channel_type, channel_id } = req.params;
    
    // Log del webhook recibido
    console.log(`Webhook recibido: ${channel_type} - Canal ${channel_id}`);
    
    // Procesar según el tipo de canal
    if (channel_type === 'shopify') {
      const ShopifyService = require('../services/shopify.service');
      await ShopifyService.processWebhook(channel_id, req.body);
    } else if (channel_type === 'woocommerce') {
      const WooCommerceService = require('../services/woocommerce.service');
      await WooCommerceService.processWebhook(channel_id, req.body, req.headers);
    } else if (channel_type === 'mercadolibre') {
      const MercadoLibreService = require('../services/mercadolibre.service');
      await MercadoLibreService.processWebhook(channel_id, req.body);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// ==================== RUTAS AUTENTICADAS ====================

// Perfil del usuario actual
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.post('/auth/change-password', authenticateToken, authController.changePassword);

// ==================== EMPRESAS ====================

// Admin only
router.get('/companies', authenticateToken, isAdmin, companyController.getAll);
router.post('/companies', authenticateToken, isAdmin, companyController.create);
router.patch('/companies/:id/price', authenticateToken, isAdmin, companyController.updatePrice);

// Admin o dueño de empresa
router.get('/companies/:id', authenticateToken, hasCompanyAccess, companyController.getById);
router.put('/companies/:id', authenticateToken, hasCompanyAccess, companyController.update);
router.get('/companies/:id/users', authenticateToken, hasCompanyAccess, companyController.getUsers);
router.get('/companies/:id/stats', authenticateToken, hasCompanyAccess, companyController.getStats);

// ==================== CANALES DE VENTA ====================

router.get('/companies/:companyId/channels', authenticateToken, hasCompanyAccess, channelController.getByCompany);
router.post('/companies/:companyId/channels', authenticateToken, hasCompanyAccess, channelController.create);

router.get('/channels/:id', authenticateToken, channelController.getById);
router.put('/channels/:id', authenticateToken, channelController.update);
router.delete('/channels/:id', authenticateToken, channelController.delete);
router.post('/channels/:id/sync', authenticateToken, channelController.syncOrders);
router.post('/channels/:id/test', authenticateToken, channelController.testConnection);

// OAuth para MercadoLibre
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
    const { code, state } = req.query;
    const MercadoLibreService = require('../services/mercadolibre.service');
    const redirectUri = `${process.env.BACKEND_URL}/api/channels/mercadolibre/callback`;
    
    const tokens = await MercadoLibreService.exchangeCodeForTokens(code, redirectUri);
    
    // Aquí deberías guardar los tokens en el canal correspondiente
    // El state podría contener el channel_id
    
    res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/success`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/channels/mercadolibre/error`);
  }
});

// ==================== PEDIDOS ====================

router.get('/orders', authenticateToken, orderController.getAll);
router.get('/orders/stats', authenticateToken, orderController.getStats);
router.get('/orders/export', authenticateToken, orderController.exportForOptiRoute);
router.post('/orders', authenticateToken, orderController.create);

router.get('/orders/:id', authenticateToken, orderController.getById);
router.patch('/orders/:id/status', authenticateToken, orderController.updateStatus);

// ==================== DASHBOARD STATS ====================

router.get('/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    const pool = require('../config/database');
    let stats = {};
    
    if (req.user.role === 'admin') {
      // Estadísticas generales para admin
      const companiesResult = await pool.query(
        'SELECT COUNT(*) as total FROM companies WHERE is_active = true'
      );
      
      const ordersResult = await pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE DATE_TRUNC('day', order_date) = CURRENT_DATE) as orders_today,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', CURRENT_DATE)) as orders_this_month
        FROM orders
      `);
      
      const revenueResult = await pool.query(`
        SELECT 
          SUM(c.price_per_order) as total_revenue
        FROM orders o
        JOIN companies c ON o.company_id = c.id
        WHERE o.status = 'delivered' 
        AND DATE_TRUNC('month', o.order_date) = DATE_TRUNC('month', CURRENT_DATE)
      `);
      
      stats = {
        companies: companiesResult.rows[0].total,
        orders: ordersResult.rows[0],
        monthly_revenue: revenueResult.rows[0].total_revenue || 0
      };
    } else {
      // Estadísticas para empresa
      const ordersResult = await pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE DATE_TRUNC('day', order_date) = CURRENT_DATE) as orders_today,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', CURRENT_DATE)) as orders_this_month
        FROM orders
        WHERE company_id = $1
      `, [req.user.company_id]);
      
      const companyResult = await pool.query(
        'SELECT price_per_order FROM companies WHERE id = $1',
        [req.user.company_id]
      );
      
      const channelsResult = await pool.query(
        'SELECT COUNT(*) as total FROM sales_channels WHERE company_id = $1 AND is_active = true',
        [req.user.company_id]
      );
      
      const price_per_order = companyResult.rows[0].price_per_order;
      const delivered_this_month = ordersResult.rows[0].orders_this_month;
      
      stats = {
        orders: ordersResult.rows[0],
        channels: channelsResult.rows[0].total,
        price_per_order: price_per_order,
        monthly_cost: price_per_order * delivered_this_month
      };
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;