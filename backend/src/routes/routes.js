const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const RoutePlan = require('../models/RoutePlan');
const routeOptimizerService = require('../services/routeOptimizer.service');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Middleware de validación de errores
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

/**
 * POST /api/routes/optimize
 * Optimiza una ruta con múltiples pedidos
 */
router.post('/optimize', [
  authenticateToken,
  authorizeRoles(['admin', 'manager']),
  body('startLocation.latitude').isFloat().withMessage('Latitud de inicio requerida'),
  body('startLocation.longitude').isFloat().withMessage('Longitud de inicio requerida'),
  body('startLocation.address').notEmpty().withMessage('Dirección de inicio requerida'),
  body('endLocation.latitude').isFloat().withMessage('Latitud de destino requerida'),
  body('endLocation.longitude').isFloat().withMessage('Longitud de destino requerida'),
  body('endLocation.address').notEmpty().withMessage('Dirección de destino requerida'),
  body('orderIds').isArray({ min: 1 }).withMessage('Al menos un pedido es requerido'),
  body('driverId').notEmpty().withMessage('ID del conductor requerido'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  try {
    const {
      startLocation,
      endLocation,
      orderIds,
      driverId,
      preferences = {}
    } = req.body;

    const routeConfig = {
      startLocation,
      endLocation,
      orderIds,
      driverId,
      preferences,
      companyId: req.user.company || req.user.company_id,
      createdBy: req.user.id
    };

    const result = await routeOptimizerService.optimizeRoute(routeConfig);

    res.json({
      success: true,
      message: 'Ruta optimizada correctamente',
      data: result
    });

  } catch (error) {
    console.error('Error en optimización de ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
}));

/**
 * GET /api/routes
 * Obtiene todas las rutas de la empresa
 */
router.get('/', [
  authenticateToken
], asyncHandler(async (req, res) => {
  try {
    const { 
      status, 
      driverId, 
      startDate, 
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { company: req.user.company };
    
    if (status) filter.status = status;
    if (driverId) filter.driver = driverId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const [routes, total] = await Promise.all([
      RoutePlan.find(filter)
        .populate('driver', 'name email')
        .populate({
          path: 'orders.order',
          select: 'customer_name shipping_address delivery_location location status'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RoutePlan.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        routes,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: routes.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo rutas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo rutas'
    });
  }
}));

/**
 * GET /api/routes/:id
 * Obtiene una ruta específica
 */
router.get('/:id', [
  authenticateToken
], asyncHandler(async (req, res) => {
  try {
    const route = await RoutePlan.findOne({
      _id: req.params.id,
      company: req.user.company
    })
    .populate('driver', 'name email phone')
    .populate('orders.order', 'order_number delivery_address customer product_details')
    .populate('createdBy', 'name email');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    res.json({
      success: true,
      data: route
    });

  } catch (error) {
    console.error('Error obteniendo ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo ruta'
    });
  }
}));

/**
 * PATCH /api/routes/:id/assign
 * Asigna una ruta a un conductor
 */
router.patch('/:id/assign', [
  authenticateToken,
  authorizeRoles(['admin', 'manager']),
  body('driverId').notEmpty().withMessage('ID del conductor requerido'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  try {
    const { driverId } = req.body;
    const result = await routeOptimizerService.assignRouteToDriver(req.params.id, driverId);

    res.json({
      success: true,
      message: result.message,
      data: result.routePlan
    });

  } catch (error) {
    console.error('Error asignando ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error asignando ruta'
    });
  }
}));

/**
 * PATCH /api/routes/:id/start
 * Inicia la ejecución de una ruta (solo para conductores)
 */
router.patch('/:id/start', [
  authenticateToken,
  authorizeRoles(['driver'])
], asyncHandler(async (req, res) => {
  try {
    const result = await routeOptimizerService.startRoute(req.params.id, req.user.id);

    res.json({
      success: true,
      message: result.message,
      data: result.routePlan
    });

  } catch (error) {
    console.error('Error iniciando ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error iniciando ruta'
    });
  }
}));

/**
 * GET /api/routes/driver/active
 * Obtiene la ruta activa del conductor autenticado
 */
router.get('/driver/active', [
  authenticateToken,
  authorizeRoles(['driver'])
], asyncHandler(async (req, res) => {
  try {
    const activeRoute = await routeOptimizerService.getActiveRouteForDriver(req.user.id);

    if (!activeRoute) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay rutas activas asignadas'
      });
    }

    res.json({
      success: true,
      data: activeRoute
    });

  } catch (error) {
    console.error('Error obteniendo ruta activa:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo ruta activa'
    });
  }
}));

/**
 * PATCH /api/routes/:id/orders/:orderId/status
 * Actualiza el estado de entrega de un pedido
 */
router.patch('/:id/orders/:orderId/status', [
  authenticateToken,
  authorizeRoles(['driver', 'admin', 'manager']),
  body('status').isIn(['pending', 'in_progress', 'delivered', 'failed', 'cancelled']).withMessage('Estado inválido'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  try {
    const { status, deliveryProof } = req.body;
    const { id: routeId, orderId } = req.params;

    console.log('📦 Actualizando estado de entrega:', {
      routeId,
      orderId,
      status,
      userId: req.user.id,
      userRole: req.user.role
    });

    // AGREGAR: Obtener información del conductor
    let driverInfo = {
      id: req.user.id,
      name: req.user.name || req.user.email,
      email: req.user.email
    };

    // Si es un conductor, buscar su información completa
    if (req.user.role === 'driver' && req.user.driver_id) {
      try {
        const Driver = require('../models/Driver'); // Asegúrate de tener el modelo Driver
        const driver = await Driver.findById(req.user.driver_id);
        if (driver) {
          driverInfo = {
            id: driver._id,
            name: driver.full_name || driver.name,
            email: driver.email
          };
        }
      } catch (error) {
        console.log('⚠️ No se pudo obtener info del conductor, usando datos del usuario');
      }
    }

    const result = await routeOptimizerService.updateDeliveryStatus(
      routeId,
      orderId,
      status,
      deliveryProof,
      driverInfo  
    );

    res.json({
      success: true,
      message: result.message,
      data: result.routePlan
    });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error actualizando estado'
    });
  }
}));

/**
 * POST /api/routes/:id/sync-offline
 * Sincroniza actualizaciones offline
 */
router.post('/:id/sync-offline', [
  authenticateToken,
  authorizeRoles(['driver']),
  body('updates').isArray().withMessage('Array de actualizaciones requerido'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  try {
    const { updates } = req.body;

    const result = await routeOptimizerService.processOfflineUpdates(req.params.id, updates);

    res.json({
      success: true,
      message: result.message,
      data: {
        processedUpdates: result.processedUpdates
      }
    });

  } catch (error) {
    console.error('Error en sincronización offline:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error en sincronización offline'
    });
  }
}));

/**
 * DELETE /api/routes/:id
 * Elimina una ruta (solo si está en estado draft)
 */
router.delete('/:id', [
  authenticateToken,
  authorizeRoles(['admin', 'manager'])
], asyncHandler(async (req, res) => {
  try {
    const route = await RoutePlan.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: 'draft'
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada o no se puede eliminar'
      });
    }

    await RoutePlan.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Ruta eliminada correctamente'
    });

  } catch (error) {
    console.error('Error eliminando ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando ruta'
    });
  }
}));

/**
 * GET /api/routes/stats/summary
 * Obtiene estadísticas generales de rutas
 */
router.get('/stats/summary', [
  authenticateToken
], asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchFilter = { company: req.user.company };
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    const stats = await RoutePlan.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRoutes: { $sum: 1 },
          completedRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgressRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          totalDistance: { $sum: '$optimization.totalDistance' },
          totalDuration: { $sum: '$optimization.totalDuration' },
          totalOrders: { $sum: { $size: '$orders' } },
          averageOrdersPerRoute: { $avg: { $size: '$orders' } }
        }
      }
    ]);

    const result = stats[0] || {
      totalRoutes: 0,
      completedRoutes: 0,
      inProgressRoutes: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalOrders: 0,
      averageOrdersPerRoute: 0
    };

    // Calcular métricas adicionales
    result.completionRate = result.totalRoutes > 0 
      ? Math.round((result.completedRoutes / result.totalRoutes) * 100) 
      : 0;
    
    result.averageDistancePerRoute = result.totalRoutes > 0 
      ? Math.round((result.totalDistance / result.totalRoutes) / 1000 * 100) / 100 
      : 0;

    result.averageDurationPerRoute = result.totalRoutes > 0 
      ? Math.round((result.totalDuration / result.totalRoutes) / 60) 
      : 0;

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
}));

/**
 * POST /api/routes/:id/duplicate
 * Duplica una ruta existente
 */
router.post('/:id/duplicate', [
  authenticateToken,
  authorizeRoles(['admin', 'manager'])
], asyncHandler(async (req, res) => {
  try {
    const { driverId } = req.body;
    const originalRoute = await RoutePlan.findOne({
      _id: req.params.id,
      company: req.user.company
    }).populate('orders.order');

    if (!originalRoute) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const newRoute = new RoutePlan({
      company: originalRoute.company,
      driver: driverId || originalRoute.driver,
      createdBy: req.user.id,
      startLocation: originalRoute.startLocation,
      endLocation: originalRoute.endLocation,
      orders: originalRoute.orders.map(o => ({
        order: o.order._id,
        sequenceNumber: o.sequenceNumber,
        deliveryStatus: 'pending'
      })),
      optimization: originalRoute.optimization,
      preferences: originalRoute.preferences,
      status: 'draft'
    });

    await newRoute.save();
    await newRoute.populate('driver orders.order');

    res.json({
      success: true,
      message: 'Ruta duplicada correctamente',
      data: newRoute
    });

  } catch (error) {
    console.error('Error duplicando ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicando ruta'
    });
  }
}));

/**
 * PATCH /api/routes/:id/reoptimize
 * Re-optimiza una ruta existente
 */
router.patch('/:id/reoptimize', [
  authenticateToken,
  authorizeRoles(['admin', 'manager'])
], asyncHandler(async (req, res) => {
  try {
    const { preferences = {} } = req.body;

    // 🛰️ Log de depuración: ver exactamente lo que llega del frontend
    console.log('🛰️ reoptimize body:', JSON.stringify(req.body, null, 2));

    // ✅ Aceptar tanto start/end como startLocation/endLocation
    const incomingStart = req.body.startLocation || req.body.start;
    const incomingEnd   = req.body.endLocation || req.body.end;

    const route = await RoutePlan.findOne({
      _id: req.params.id,
      status: { $in: ['draft', 'assigned', 'in_progress'] }
    }).populate('orders.order');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada o no se puede re-optimizar'
      });
    }

    const orderIds = route.orders.map(o => o.order._id);

    // 🧭 Configuración de optimización
    const routeConfig = {
      startLocation: incomingStart || route.startLocation,
      endLocation:   incomingEnd   || route.endLocation,
      orderIds,
      driverId: route.driver,
      preferences: { ...route.preferences, ...preferences },
      createdBy: req.user.id,
      existingRouteId: req.params.id
    };

    console.log('🧩 routeConfig listo para optimización:', routeConfig);

    // 🔁 Reoptimizar con el servicio central
    const newRoute = await routeOptimizerService.optimizeRoute(routeConfig);

    // ✅ Actualiza la ruta existente (sin eliminarla)
    const updated = await RoutePlan.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          startLocation: newRoute.startLocation,
          endLocation: newRoute.endLocation,
          orders: newRoute.orders,
          optimization: newRoute.optimization,
          updatedAt: new Date(),
          status: 'assigned'
        }
      },
      { new: true }
    ).populate('driver orders.order');

    console.log(`✅ Ruta ${updated._id} re-optimizada correctamente`);
    console.log(`🧭 Nuevo inicio: ${updated.startLocation.address}`);
    console.log(`🏁 Nuevo fin: ${updated.endLocation.address}`);

    res.json({
      success: true,
      message: 'Ruta re-optimizada correctamente',
      data: updated
    });

  } catch (error) {
    console.error('❌ Error re-optimizando ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error re-optimizando ruta'
    });
  }
}));
router.get('/driver/history', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    const driverId = req.user.driver_id || req.user.id || req.query.driverId;

    console.log('📚 Obteniendo historial para conductor:', driverId);

    const query = {
      driver: driverId,
      status: { $in: ['completed', 'cancelled'] }
    };

    if (start_date && end_date) {
      query.completedAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    // CORREGIR: Usar RoutePlan en lugar de Route
    const routes = await RoutePlan.find(query)
      .populate('orders.order')
      .populate('driver', 'name email full_name')
      .sort({ completedAt: -1 })
      .limit(100);

    // Extraer entregas individuales de las rutas
    const deliveries = [];
    routes.forEach(route => {
      route.orders.forEach(orderItem => {
        if (orderItem.deliveryStatus === 'delivered' || orderItem.deliveryStatus === 'failed') {
          deliveries.push({
            ...orderItem.toObject(),
            routeId: route._id,
            completedAt: orderItem.deliveredAt || route.completedAt,
            driverInfo: route.driver // AGREGAR: Información del conductor
          });
        }
      });
    });

    res.json({
      success: true,
      deliveries: deliveries.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});
module.exports = router;