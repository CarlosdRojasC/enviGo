const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const RoutePlan = require('../models/RoutePlan');
const routeOptimizerService = require('../services/routeOptimizer.service');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const multer = require('multer');
// Configuración de Multer para memoria (RAM)
const upload = multer({ storage: multer.memoryStorage() });
const CloudinaryService = require('../services/cloudinary.service');

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
 */
/**
 * POST /api/routes/optimize
 * Optimiza una ruta con múltiples pedidos
 */
router.post('/optimize', [
  authenticateToken,
  authorizeRoles(['admin', 'manager', 'driver']), // ✅ Drivers permitidos
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
    // 1. Usamos 'let' para poder modificar el driverId si viene como 'self'
    let {
      startLocation,
      endLocation,
      orderIds,
      driverId,
      preferences = {}
    } = req.body;

    // ✅ TRUCO: Si es conductor y manda "self", usamos su propio ID
  if (req.user.role === 'driver' && driverId === 'self') {
       // req.user.id es el estándar en JWT, pero dejamos los otros por si acaso
       driverId = req.user.id || req.user.driver_id || req.user._id;
       
       console.log('🚗 Auto-asignando ruta al conductor:', driverId);
    }

    // 🛡️ VALIDACIÓN DE SEGURIDAD
    if (!driverId) {
        return res.status(400).json({
            success: false, 
            message: "No se pudo identificar el ID del conductor. Cierra sesión y vuelve a entrar."
        });
    }

    const routeConfig = {
      startLocation,
      endLocation,
      orderIds,
      driverId, // Aquí ya va el ID real
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
 */
router.get('/driver/active', [
  authenticateToken,
  authorizeRoles(['driver'])
], asyncHandler(async (req, res) => {
  try {
    const { routes, currentRoute } = await routeOptimizerService.getActiveRouteForDriver(req.user.id);

    if (!routes || routes.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay rutas activas asignadas'
      });
    }

    res.json({
      success: true,
      data: {
        routes,
        currentRoute
      }
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
 * Actualiza el estado de entrega de un pedido con soporte para FOTOS
 */
router.patch('/:id/orders/:orderId/status', [
  authenticateToken,
  authorizeRoles(['driver', 'admin', 'manager']),
  upload.any(), // Middleware para procesar archivos y campos
  body('status').isIn(['pending', 'in_progress', 'delivered', 'failed', 'cancelled']).withMessage('Estado inválido'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  try {
    let { status, deliveryProof } = req.body;
    const { id: routeId, orderId } = req.params;

    // 📸 PROCESAMIENTO DE IMÁGENES PARALELO (TURBO MODE 🚀)
    if (req.files && req.files.length > 0) {
      console.log(`📸 Procesando ${req.files.length} fotos en PARALELO...`);
      
      // 1. Crear array de promesas para subida simultánea
      const uploadPromises = req.files.map(async (file) => {
        try {
          // Convertir Buffer a Base64
          const b64 = Buffer.from(file.buffer).toString('base64');
          const dataURI = `data:${file.mimetype};base64,${b64}`;
          
          // Subir a Cloudinary (Retorna promesa sin await aquí)
          const uploadResult = await CloudinaryService.uploadProofImage(dataURI, orderId, 'photo');
          return uploadResult.url;
        } catch (uploadError) {
          console.error('❌ Error subiendo una foto:', uploadError.message);
          return null; // Continuar con las otras si una falla
        }
      });

      // 2. Esperar a que todas terminen
      const results = await Promise.all(uploadPromises);
      
      // 3. Filtrar errores
      const photoUrls = results.filter(url => url !== null);
      console.log(`✅ ${photoUrls.length} fotos subidas exitosamente`);

      // Construir objeto deliveryProof
      deliveryProof = {
        recipientName: req.body.recipient_name,
        notes: req.body.notes,
        photos: photoUrls, // Usamos 'photos' como array de strings (URLs)
        location: {
          latitude: req.body.latitude,
          longitude: req.body.longitude
        },
        timestamp: new Date()
      };
    } else if (typeof deliveryProof === 'string') {
      try {
        deliveryProof = JSON.parse(deliveryProof);
      } catch (e) {
        console.error('Error parseando deliveryProof string', e);
      }
    }

    console.log('📦 Guardando estado con pruebas:', deliveryProof);

    // Info del conductor
    let driverInfo = {
      id: req.user.id,
      name: req.user.name || req.user.email,
      email: req.user.email
    };

    if (req.user.role === 'driver' && req.user.driver_id) {
      try {
        const Driver = require('../models/Driver');
        const driver = await Driver.findById(req.user.driver_id);
        if (driver) {
          driverInfo = {
            id: driver._id,
            name: driver.full_name || driver.name,
            email: driver.email
          };
        }
      } catch (error) {
        console.log('⚠️ No se pudo obtener info del conductor:', error.message);
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
 */
router.patch('/:id/reoptimize', [
  authenticateToken,
  // ✅ 1. IMPORTANTE: Agregamos 'driver' para que el conductor pueda llamarlo
  authorizeRoles(['admin', 'manager', 'driver']) 
], asyncHandler(async (req, res) => {
  try {
    // ✅ 2. IMPORTANTE: Recibimos 'addedOrderIds' del cuerpo de la petición
    const { preferences = {}, addedOrderIds = [] } = req.body;

    // Log para depuración
    console.log('🛰️ Petición de re-optimización recibida:', {
        routeId: req.params.id,
        newOrdersCount: addedOrderIds.length,
        addedIds: addedOrderIds
    });

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

    // 3. Fusionar IDs actuales + IDs nuevos (evitando duplicados)
    const currentOrderIds = route.orders.map(o => o.order._id.toString());
    
    // Set elimina duplicados automáticamente
    const combinedOrderIds = [...new Set([...currentOrderIds, ...addedOrderIds])];

    console.log(`🧩 Fusionando pedidos: ${currentOrderIds.length} actuales + ${addedOrderIds.length} nuevos = ${combinedOrderIds.length} total`);

    const routeConfig = {
      startLocation: incomingStart || route.startLocation,
      endLocation:   incomingEnd   || route.endLocation,
      orderIds: combinedOrderIds, // ✅ Enviamos la lista combinada al optimizador
      driverId: route.driver,
      preferences: { ...route.preferences, ...preferences },
      createdBy: req.user.id,
      existingRouteId: req.params.id
    };

    // Llamar al servicio de optimización
    const result = await routeOptimizerService.optimizeRoute(routeConfig);

    res.json({
      success: true,
      message: `Ruta actualizada con ${addedOrderIds.length} nuevos pedidos`,
      data: result
    });

  } catch (error) {
    console.error('❌ Error re-optimizando ruta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error re-optimizando ruta'
    });
  }
}));

/**
 * GET /api/routes/driver/history
 */
router.get('/driver/history', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    const driverId = req.user.driver_id || req.user.id || req.query.driverId;

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

    const routes = await RoutePlan.find(query)
      .populate('orders.order')
      .populate('driver', 'name email full_name')
      .sort({ completedAt: -1 })
      .limit(100);

    const deliveries = [];
    routes.forEach(route => {
      route.orders.forEach(orderItem => {
        if (orderItem.deliveryStatus === 'delivered' || orderItem.deliveryStatus === 'failed') {
          deliveries.push({
            ...orderItem.toObject(),
            routeId: route._id,
            completedAt: orderItem.deliveredAt || route.completedAt,
            driverInfo: route.driver
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