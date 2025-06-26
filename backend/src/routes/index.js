const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
// Importar middlewares
const {
  authenticateToken,
  isAdmin,
  isCompanyOwner,
  hasCompanyAccess
} = require('../middlewares/auth.middleware');


// Importar validadores
const { validateMongoId } = require('../middlewares/validators/generic.validator'); // <-- AÑADIR IMPORT
const { validateRegistration } = require('../middlewares/validators/user.validator'); // <-- AÑADIR IMPORT



// Importar controladores
const authController = require('../controllers/auth.controller');
const companyController = require('../controllers/company.controller');
const orderController = require('../controllers/order.controller');
const channelController = require('../controllers/channel.controller');
const userController = require('../controllers/user.controller'); // <-- AÑADIR IMPORT
const { validateOrderCreation, validateStatusUpdate } = require('../middlewares/validators/order.validator.js');


// Importar modelos para dashboard
const Company = require('../models/Company');
const Order = require('../models/Order');
const Channel = require('../models/Channel');

// ==================== RUTAS PÚBLICAS ====================

router.post('/auth/login', authController.login);
router.post('/auth/register', validateRegistration, authController.register);

// Webhooks (no requieren autenticación)
router.post('/webhooks/:channel_type/:channel_id', async (req, res) => {
  try {
    const { channel_type, channel_id } = req.params;
    console.log(`Webhook recibido: ${channel_type} - Canal ${channel_id}`);

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

router.get('/auth/profile', authenticateToken, authController.getProfile);
router.post('/auth/change-password', authenticateToken, authController.changePassword);

// ==================== EMPRESAS ====================

router.get('/companies', authenticateToken, isAdmin, companyController.getAll);
router.post('/companies', authenticateToken, isAdmin, companyController.create);
router.patch('/companies/:id/price', authenticateToken, isAdmin, companyController.updatePrice);

router.get('/companies/:id', authenticateToken, validateMongoId('id'), companyController.getById); // <-- USAR MIDDLEWARE
router.put('/companies/:id', authenticateToken, validateMongoId('id'), companyController.update); // <-- USAR MIDDLEWARE
router.get('/companies/:id/users', authenticateToken, validateMongoId('id'), companyController.getUsers); // <-- USAR MIDDLEWARE
router.get('/companies/:id/stats', authenticateToken, validateMongoId('id'), companyController.getStats); // <-- USAR MIDDLEWARE
// ==================== CANALES DE VENTA ====================

router.get('/companies/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.getByCompany); // <-- USAR MIDDLEWARE
router.post('/companies/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.create); // <-- USAR MIDDLEWARE

router.get('/channels/:id', authenticateToken, validateMongoId('id'), channelController.getById); // <-- USAR MIDDLEWARE
router.put('/channels/:id', authenticateToken, validateMongoId('id'), channelController.update); // <-- USAR MIDDLEWARE
router.delete('/channels/:id', authenticateToken, validateMongoId('id'), channelController.delete); // <-- USAR MIDDLEWARE
router.post('/channels/:id/sync', authenticateToken, validateMongoId('id'), channelController.syncOrders); // <-- USAR MIDDLEWARE
router.post('/channels/:id/test', authenticateToken, validateMongoId('id'), channelController.testConnection); // <-- USAR MIDDLEWARE


// ==================== USUARIOS ====================
// La creación de usuarios por parte de un admin
router.post('/users', authenticateToken, isAdmin, authController.register);

// Ruta para actualizar (activar/desactivar)
router.patch('/users/:id', authenticateToken, isAdmin, userController.updateUser);

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

// ==================== PEDIDOS ====================

router.get('/orders', authenticateToken, orderController.getAll);
router.get('/orders/stats', authenticateToken, orderController.getStats);
router.get('/orders/export', authenticateToken, orderController.exportForOptiRoute);
router.post('/orders', authenticateToken, validateOrderCreation, orderController.create);
router.get('/orders/:id', authenticateToken, validateMongoId('id'), orderController.getById); // <-- USAR MIDDLEWARE
router.patch('/orders/:id/status', authenticateToken, validateMongoId('id'), isAdmin, orderController.updateStatus); // <-- USAR MIDDLEWARE

// ==================== DASHBOARD STATS (MONGO) ====================


// backend/src/routes/index.js - Actualizar la sección de estadísticas del dashboard
router.get('/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'admin') {
      // Estadísticas para admin - vista global
      const [totalCompanies, orderStats, revenue] = await Promise.all([
        Company.countDocuments({ is_active: true }),
        Order.aggregate([
          {
            $group: {
              _id: null,
              total_orders: { $sum: 1 },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
              shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
              delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
              orders_today: {
                $sum: {
                  $cond: [
                    {
                      $gte: ['$order_date', new Date(new Date().setHours(0, 0, 0, 0))]
                    },
                    1,
                    0
                  ]
                }
              },
              orders_this_month: {
                $sum: {
                  $cond: [
                    {
                      $gte: ['$order_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1)]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]),
        // Calcular ingresos estimados del mes actual
        Order.aggregate([
          {
            $match: {
              status: 'delivered',
              order_date: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }
          },
          {
            $lookup: {
              from: 'companies',
              localField: 'company_id',
              foreignField: '_id',
              as: 'company'
            }
          },
          { $unwind: '$company' },
          {
            $group: {
              _id: null,
              total_revenue: { $sum: '$company.price_per_order' }
            }
          }
        ])
      ]);

      stats = {
        companies: totalCompanies,
        orders: orderStats[0] || {
          total_orders: 0,
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          orders_today: 0,
          orders_this_month: 0
        },
        monthly_revenue: revenue[0]?.total_revenue || 0
      };

    } else {
      // Estadísticas para usuarios de empresa
      const companyId = req.user.company_id;

      if (!companyId) {
        return res.status(400).json({ error: 'Usuario no asociado a ninguna empresa' });
      }

      // Convertir a ObjectId usando new
      const companyObjectId = companyId;

      const [orderStats, company, channels] = await Promise.all([
        Order.aggregate([
          { $match: { company_id: new mongoose.Types.ObjectId(companyObjectId) } },
          {
            $group: {
              _id: null,
              total_orders: { $sum: 1 },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
              shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
              delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
              orders_today: {
                $sum: {
                  $cond: [
                    {
                      $gte: ['$order_date', new Date(new Date().setHours(0, 0, 0, 0))]
                    },
                    1,
                    0
                  ]
                }
              },
              orders_this_month: {
                $sum: {
                  $cond: [
                    {
                      $gte: ['$order_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1)]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]),
        Company.findById(companyObjectId).lean(),
        Channel.countDocuments({ company_id: companyObjectId, is_active: true })
      ]);

      const orderData = orderStats[0] || {
        total_orders: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        orders_today: 0,
        orders_this_month: 0
      };

      const delivered = orderData.delivered || 0;
      const price_per_order = company?.price_per_order || 0;

      stats = {
        orders: orderData,
        channels,
        price_per_order,
        monthly_cost: delivered * price_per_order
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;