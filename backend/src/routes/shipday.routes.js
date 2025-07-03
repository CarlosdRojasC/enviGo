// backend/src/routes/shipday.routes.js
const express = require('express');
const { body, param, query } = require('express-validator');
const orderShipdayController = require('../controllers/orderShipdayController');

// Importar middlewares (ajusta las rutas según tu estructura)
const authMiddleware = require('../middlewares/auth'); // Tu middleware de autenticación
const validateRequest = require('../middlewares/validateRequest'); // Tu middleware de validación
const companyMiddleware = require('../middlewares/company'); // Si tienes middleware para empresa

const router = express.Router();

// ============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ============================================================================

/**
 * ASIGNAR PEDIDOS A CONDUCTOR Y CREAR EN SHIPDAY
 * POST /api/orders/assign-to-driver
 */
router.post('/orders/assign-to-driver',
  authMiddleware, // Usuario debe estar autenticado
  companyMiddleware, // Usuario debe tener empresa asignada (opcional)
  [
    body('driver_id')
      .notEmpty()
      .withMessage('driver_id es requerido')
      .isMongoId()
      .withMessage('driver_id debe ser un ObjectId válido'),
    body('order_ids')
      .isArray({ min: 1 })
      .withMessage('order_ids debe ser un array con al menos un elemento'),
    body('order_ids.*')
      .isMongoId()
      .withMessage('Todos los order_ids deben ser ObjectIds válidos')
  ],
  validateRequest,
  orderShipdayController.assignOrdersToDriver
);

/**
 * OBTENER PEDIDOS DISPONIBLES PARA ASIGNAR A SHIPDAY
 * GET /api/orders/available-for-shipday
 */
router.get('/orders/available-for-shipday',
  authMiddleware,
  companyMiddleware,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit debe ser un número entre 1 y 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page debe ser un número mayor a 0'),
    query('status')
      .optional()
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('status debe ser un estado válido')
  ],
  validateRequest,
  orderShipdayController.getAvailableOrdersForShipday
);

/**
 * OBTENER CONDUCTORES DISPONIBLES PARA SHIPDAY
 * GET /api/drivers/available-for-shipday
 */
router.get('/drivers/available-for-shipday',
  authMiddleware,
  companyMiddleware,
  orderShipdayController.getAvailableDriversForShipday
);

/**
 * OBTENER ESTADO ACTUAL DE PEDIDOS DESDE SHIPDAY
 * GET /api/orders/shipday-status
 */
router.get('/orders/shipday-status',
  authMiddleware,
  companyMiddleware,
  [
    query('order_ids')
      .notEmpty()
      .withMessage('order_ids es requerido')
  ],
  validateRequest,
  orderShipdayController.getOrdersShipdayStatus
);

/**
 * OBTENER HISTORIAL DE ESTADOS DE UN PEDIDO
 * GET /api/orders/:orderId/status-history
 */
router.get('/orders/:orderId/status-history',
  authMiddleware,
  companyMiddleware,
  [
    param('orderId')
      .isMongoId()
      .withMessage('orderId debe ser un ObjectId válido')
  ],
  validateRequest,
  orderShipdayController.getOrderStatusHistory
);

/**
 * SINCRONIZAR CONDUCTOR CON SHIPDAY
 * POST /api/drivers/:driverId/sync-shipday
 */
router.post('/drivers/:driverId/sync-shipday',
  authMiddleware,
  companyMiddleware,
  [
    param('driverId')
      .isMongoId()
      .withMessage('driverId debe ser un ObjectId válido')
  ],
  validateRequest,
  orderShipdayController.syncDriverWithShipday
);

/**
 * FORZAR ACTUALIZACIÓN DE ESTADO DESDE SHIPDAY
 * POST /api/orders/:orderId/force-shipday-update
 */
router.post('/orders/:orderId/force-shipday-update',
  authMiddleware,
  companyMiddleware,
  [
    param('orderId')
      .isMongoId()
      .withMessage('orderId debe ser un ObjectId válido')
  ],
  validateRequest,
  orderShipdayController.forceShipdayUpdate
);

/**
 * OBTENER MÉTRICAS DE SHIPDAY PARA DASHBOARD
 * GET /api/admin/shipday-metrics
 */
router.get('/admin/shipday-metrics',
  authMiddleware,
  companyMiddleware,
  // Opcional: agregar middleware para verificar rol de admin
  // adminRoleMiddleware,
  orderShipdayController.getShipdayMetrics
);

/**
 * OBTENER ESTADÍSTICAS DEL DASHBOARD ADMIN
 * GET /api/admin/dashboard/stats
 */
router.get('/admin/dashboard/stats',
  authMiddleware,
  companyMiddleware,
  orderShipdayController.getAdminDashboardStats
);

/**
 * OBTENER TENDENCIA DE PEDIDOS
 * GET /api/admin/dashboard/orders-trend
 */
router.get('/admin/dashboard/orders-trend',
  authMiddleware,
  companyMiddleware,
  [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d'])
      .withMessage('period debe ser 7d, 30d o 90d')
  ],
  validateRequest,
  orderShipdayController.getOrdersTrend
);

/**
 * OBTENER INGRESOS MENSUALES
 * GET /api/admin/dashboard/monthly-revenue
 */
router.get('/admin/dashboard/monthly-revenue',
  authMiddleware,
  companyMiddleware,
  orderShipdayController.getMonthlyRevenue
);

/**
 * EXPORTAR PEDIDOS PARA OPTIROUTE
 * GET /api/orders/export/optiroute
 */
router.get('/orders/export/optiroute',
  authMiddleware,
  companyMiddleware,
  [
    query('date')
      .optional()
      .isISO8601()
      .withMessage('date debe ser una fecha válida en formato ISO8601'),
    query('status')
      .optional()
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('status debe ser un estado válido')
  ],
  validateRequest,
  orderShipdayController.exportOrdersForOptiRoute
);

// ============================================================================
// RUTAS PÚBLICAS (Sin autenticación)
// ============================================================================

/**
 * WEBHOOK PARA RECIBIR ACTUALIZACIONES DE SHIPDAY
 * POST /api/webhooks/shipday
 * 
 * IMPORTANTE: Esta ruta NO debe tener autenticación porque viene de Shipday
 */
router.post('/webhooks/shipday',
  // Sin autenticación - viene de Shipday
  orderShipdayController.handleShipdayWebhook
);

/**
 * TRACKING PÚBLICO PARA CLIENTES
 * GET /api/public/tracking/:trackingId
 */
router.get('/public/tracking/:trackingId',
  // Sin autenticación - es para clientes
  [
    param('trackingId')
      .notEmpty()
      .withMessage('trackingId es requerido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { trackingId } = req.params;
      const Order = require('../models/Order');
      
      // Buscar pedido por shipday.order_id o tracking_link
      const order = await Order.findOne({
        $or: [
          { 'shipday.order_id': trackingId },
          { 'shipday.tracking_link': { $regex: trackingId } }
        ]
      }, 'customer_name shipping_address status shipday delivery_proof status_history order_number');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Información pública del pedido (sin datos sensibles)
      const publicOrderInfo = {
        order_number: order.order_number,
        customer_name: order.customer_name,
        shipping_address: order.shipping_address,
        status: order.status,
        shipday_status: order.shipday?.status,
        tracking_link: order.shipday?.tracking_link,
        last_update: order.shipday?.last_update,
        delivered_at: order.delivery_proof?.delivered_at,
        status_timeline: order.status_history?.map(h => ({
          status: h.new_status,
          shipday_status: h.shipday_status,
          timestamp: h.timestamp,
          notes: h.notes
        })) || []
      };

      res.json({
        success: true,
        order: publicOrderInfo
      });

    } catch (error) {
      console.error('Error en tracking público:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo información de tracking'
      });
    }
  }
);

// ============================================================================
// HEALTH CHECK PARA SHIPDAY
// ============================================================================

/**
 * HEALTH CHECK ESPECÍFICO PARA SHIPDAY
 * GET /api/shipday/health
 */
router.get('/shipday/health', (req, res) => {
  res.json({
    success: true,
    service: 'Shipday Integration',
    status: 'active',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      webhook: `${process.env.APP_URL}/api/webhooks/shipday`,
      public_tracking: `${process.env.APP_URL}/api/public/tracking/:trackingId`
    },
    configuration: {
      shipday_api_configured: !!process.env.SHIPDAY_API_KEY,
      webhook_url_configured: !!process.env.APP_URL
    }
  });
});

module.exports = router;