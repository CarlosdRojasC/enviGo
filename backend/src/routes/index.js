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
const { validateMongoId } = require('../middlewares/validators/generic.validator');
const { validateRegistration } = require('../middlewares/validators/user.validator');

// Importar controladores
const authController = require('../controllers/auth.controller');
const companyController = require('../controllers/company.controller');
const orderController = require('../controllers/order.controller');
const channelController = require('../controllers/channel.controller');
const userController = require('../controllers/user.controller');
const { validateOrderCreation, validateStatusUpdate } = require('../middlewares/validators/order.validator.js');
const billingController = require('../controllers/billing.controller')
const driverController = require('../controllers/driver.controller'); // NUEVO: Importar driver controller

const shipdayRoutes = require('./shipday.routes');
const ShipdayService = require('../services/shipday.service'); // NUEVO: Para usar en rutas

// Importar modelos para dashboard
const Company = require('../models/Company');
const Order = require('../models/Order');
const Channel = require('../models/Channel');

// ==================== RUTAS PÚBLICAS ====================

router.post('/auth/login', authController.login);
router.post('/auth/register', validateRegistration, authController.register);

// Webhooks (no requieren autenticación) - MODIFICADO PARA INCLUIR AUTO-CREACIÓN
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

// ==================== RUTAS AUTENTICADAS ====================

router.get('/auth/profile', authenticateToken, authController.getProfile);
router.post('/auth/change-password', authenticateToken, authController.changePassword);

// ==================== EMPRESAS ====================

router.get('/companies', authenticateToken, isAdmin, companyController.getAll);
router.post('/companies', authenticateToken, isAdmin, companyController.create);
router.patch('/companies/:id/price', authenticateToken, isAdmin, companyController.updatePrice);

router.get('/companies/:id', authenticateToken, validateMongoId('id'), companyController.getById);
router.put('/companies/:id', authenticateToken, validateMongoId('id'), companyController.update);
router.get('/companies/:id/users', authenticateToken, validateMongoId('id'), companyController.getUsers);
router.get('/companies/:id/stats', authenticateToken, validateMongoId('id'), companyController.getStats);

// ==================== CANALES DE VENTA ====================

router.get('/companies/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.getByCompany);
router.post('/companies/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.create);

router.get('/channels/:id', authenticateToken, validateMongoId('id'), channelController.getById);
router.put('/channels/:id', authenticateToken, validateMongoId('id'), channelController.update);
router.delete('/channels/:id', authenticateToken, validateMongoId('id'), channelController.delete);
router.post('/channels/:id/sync', authenticateToken, validateMongoId('id'), channelController.syncOrders);
router.post('/channels/:id/test', authenticateToken, validateMongoId('id'), channelController.testConnection);

// ==================== USUARIOS ====================

router.post('/users', authenticateToken, isAdmin, authController.register);
router.get('/users/company/:companyId', authenticateToken, isAdmin, userController.getByCompany);
router.patch('/users/:id', authenticateToken, isAdmin, userController.updateUser);

// ==================== CONDUCTORES ====================
// NUEVO: Rutas para gestión de conductores

router.get('/drivers', authenticateToken, isAdmin, driverController.getAllDrivers);
router.post('/drivers', authenticateToken, isAdmin, driverController.createDriver);
router.delete('/drivers/:driverId', authenticateToken, isAdmin, driverController.deleteDriver);

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
router.get('/orders/trend', authenticateToken, orderController.getOrdersTrend);
router.get('/orders/export', authenticateToken, isAdmin, orderController.exportForOptiRoute);
router.post('/orders', authenticateToken, validateOrderCreation, orderController.create);
router.get('/orders/:id', authenticateToken, validateMongoId('id'), orderController.getById);
router.patch('/orders/:id/status', authenticateToken, validateMongoId('id'), isAdmin, orderController.updateStatus);

// ==================== PEDIDOS - INTEGRACIÓN SHIPDAY ====================
// NUEVAS RUTAS para integración con Shipday

// Crear orden individual en Shipday (sin asignar conductor)
router.post('/orders/:orderId/create-shipday', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    if (order.shipday_order_id) {
      return res.status(400).json({ error: 'Este pedido ya está en Shipday.' });
    }

    const shipdayData = {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerAddress: order.shipping_address,
      customerEmail: order.customer_email || '',
      customerPhoneNumber: order.customer_phone || '',
      deliveryInstruction: order.notes || 'Sin instrucciones especiales',
    };

    const shipdayOrder = await ShipdayService.createOrder(shipdayData);

    order.shipday_order_id = shipdayOrder.orderId;
    order.status = 'processing';
    await order.save();

    res.status(200).json({ 
      message: 'Pedido creado en Shipday exitosamente.',
      shipday_order_id: shipdayOrder.orderId
    });

  } catch (error) {
    console.error('Error creando pedido en Shipday:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// Asignar conductor a pedido (crear+asignar o solo asignar)
router.post('/orders/:orderId/assign-driver', authenticateToken, isAdmin, orderController.assignToDriver);

// Crear múltiples órdenes en Shipday de una vez
router.post('/orders/bulk-create-shipday', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }

    const orders = await Order.find({ 
      _id: { $in: orderIds },
      shipday_order_id: { $exists: false }
    });

    if (orders.length === 0) {
      return res.status(400).json({ error: 'No se encontraron órdenes válidas para procesar.' });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const order of orders) {
      try {
        const shipdayData = {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerAddress: order.shipping_address,
          customerEmail: order.customer_email || '',
          customerPhoneNumber: order.customer_phone || '',
          deliveryInstruction: order.notes || 'Sin instrucciones especiales',
        };

        const shipdayOrder = await ShipdayService.createOrder(shipdayData);

        order.shipday_order_id = shipdayOrder.orderId;
        order.status = 'processing';
        await order.save();

        results.successful.push({
          local_order_id: order._id,
          order_number: order.order_number,
          shipday_order_id: shipdayOrder.orderId
        });

      } catch (error) {
        console.error(`Error procesando orden ${order.order_number}:`, error);
        results.failed.push({
          local_order_id: order._id,
          order_number: order.order_number,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: `Procesamiento completado: ${results.successful.length} exitosas, ${results.failed.length} fallidas.`,
      results
    });

  } catch (error) {
    console.error('Error en bulkCreateInShipday:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// Obtener estado de sincronización con Shipday
router.get('/orders/:orderId/shipday-status', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const status = {
      order_id: order._id,
      order_number: order.order_number,
      is_in_shipday: !!order.shipday_order_id,
      shipday_order_id: order.shipday_order_id || null,
      shipday_driver_id: order.shipday_driver_id || null,
      current_status: order.status
    };

    if (order.shipday_order_id) {
      try {
        const shipdayOrder = await ShipdayService.getOrder(order.shipday_order_id);
        status.shipday_details = shipdayOrder;
      } catch (error) {
        status.shipday_error = 'No se pudo obtener información de Shipday';
      }
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FACTURACIÓN (BILLING) ====================

router.get('/billing/invoices', authenticateToken, billingController.getInvoices);
router.get('/billing/stats', authenticateToken, billingController.getBillingStats);
router.get('/billing/next-estimate', authenticateToken, billingController.getNextInvoiceEstimate);
router.post('/billing/invoices/generate', authenticateToken, isAdmin, billingController.generateInvoice);
router.get('/billing/invoices/bulk-preview', authenticateToken, isAdmin, billingController.previewBulkGeneration);
router.post('/billing/invoices/generate-bulk', authenticateToken, isAdmin, billingController.generateBulkInvoices);
router.get('/billing/invoices/:id/download', authenticateToken, validateMongoId('id'), billingController.downloadInvoice);
router.post('/billing/invoices/:id/mark-as-paid', authenticateToken, isAdmin, validateMongoId('id'), billingController.markAsPaid);
router.post('/billing/generate', authenticateToken, isAdmin, billingController.manualGenerateInvoices);
router.get('/billing/financial-summary', authenticateToken, isAdmin, billingController.getFinancialSummary);
router.delete('/billing/invoices/:id', authenticateToken, isAdmin, validateMongoId('id'), billingController.deleteInvoice);
router.delete('/billing/invoices', authenticateToken, isAdmin, billingController.deleteBulkInvoices);
router.delete('/billing/invoices/all/development', authenticateToken, isAdmin, billingController.deleteAllInvoices);

// ==================== SHIPDAY ROUTES ====================

router.use('/shipday', shipdayRoutes);

// ==================== DASHBOARD STATS (MONGO) ====================

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
            $group: {
              _id: null,
              total_revenue: { $sum: '$shipping_cost' }
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

      const companyObjectId = new mongoose.Types.ObjectId(companyId);

      const [orderStats, company, channels, recent_orders] = await Promise.all([
        Order.aggregate([
          { $match: { company_id: companyObjectId } },
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
        Channel.countDocuments({ company_id: companyObjectId, is_active: true }),
        Order.find({ company_id: companyObjectId }).sort({ order_date: -1 }).limit(5).lean()
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
        monthly_cost: delivered * price_per_order,
        recent_orders
      }
    }

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;