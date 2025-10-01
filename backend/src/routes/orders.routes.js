const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const orderController = require('../controllers/order.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateOrderCreation, validateStatusUpdate } = require('../middlewares/validators/order.validator');
const { orderSearchLimiter, statusUpdateLimiter } = require('../middlewares/rateLimit');
const { validateMongoId } = require('../middlewares/validators/generic.validator');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Order = require('../models/Order');
const ShipdayService = require('../services/shipday.service');
const Company = require('../models/Company');
const circuitController = require('../controllers/circuit.controller');
const circuitService = require('../services/circuit.service');
const MercadoLibreService = require('../services/mercadolibre.service');
const CloudinaryService = require('../services/cloudinary.service');
const NotificationService = require('../services/notification.service');


// ==================== PEDIDOS ====================

router.get('/', authenticateToken, orderSearchLimiter, orderController.getAll);
router.get('/stats', authenticateToken, orderController.getStats);
router.get('/trend', authenticateToken, orderController.getOrdersTrend);
router.get('/export', authenticateToken, isAdmin, orderController.exportOrders);
router.get('/export-dashboard', authenticateToken, orderController.exportForDashboard);
router.get('/import-template', authenticateToken, orderController.downloadImportTemplate);
router.post(
  '/bulk-upload',
  authenticateToken,
  upload.single('file'),
  orderController.bulkUpload
);

// Ruta para obtener todas las comunas disponibles (esta puede quedarse aquí ya que es específica de orders)
router.get('/communes', authenticateToken, async (req, res) => {
  try {
    const { company_id } = req.query;
    
    const filters = {};
    
    // Aplicar filtro de empresa según el rol del usuario
    if (req.user.role === 'admin') {
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }
    } else {
      if (req.user.company_id) {
        filters.company_id = new mongoose.Types.ObjectId(req.user.company_id);
      }
    }
    
    console.log('🏘️ Obteniendo comunas con filtros:', filters);
    
    // Pipeline de agregación para obtener comunas únicas
    const communes = await Order.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$shipping_commune',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          commune: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    console.log('✅ Comunas encontradas:', communes.length);
    
    res.json({
      communes: communes.map(c => c.commune),
      detailed: communes,
      total: communes.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo comunas:', error);
    res.status(500).json({ error: 'Error obteniendo comunas disponibles' });
  }
});

// Middleware personalizado para validar permisos de creación
const validateOrderPermissions = (req, res, next) => {
  const user = req.user;
  
  // Admin puede crear para cualquier empresa
  if (user.role === 'admin') {
    return next();
  }
  
  // Company owner/employee solo para su empresa
  if (['company_owner', 'company_employee'].includes(user.role)) {
    if (!user.company_id) {
      return res.status(403).json({ error: 'Usuario no asociado a ninguna empresa' });
    }
    
    // Si especifica company_id en el body, debe coincidir con la del usuario
    if (req.body.company_id && req.body.company_id !== user.company_id.toString()) {
      return res.status(403).json({ error: 'No puedes crear pedidos para otra empresa' });
    }
    
    // Si no especifica company_id, usar la empresa del usuario
    if (!req.body.company_id) {
      req.body.company_id = user.company_id;
    }
    
    return next();
  }
  
  return res.status(403).json({ error: 'Sin permisos para crear pedidos' });
};

router.post('/', authenticateToken, validateOrderPermissions, validateOrderCreation, orderController.create);
router.get('/:id', authenticateToken, validateMongoId('id'), orderController.getById);
router.patch('/:id/status', authenticateToken, statusUpdateLimiter, validateMongoId('id'), isAdmin, orderController.updateStatus);

router.patch('/:id/ready', authenticateToken, validateMongoId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('company_id', 'name email phone');
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Solo la empresa dueña puede marcar como listo
    if (req.user.company_id.toString() !== order.company_id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Solo los pedidos pendientes pueden marcarse como listos' });
    }

    order.status = 'ready_for_pickup';
    order.ready_for_pickup_at = new Date(); // ← AGREGAR TIMESTAMP
    await order.save();

    // 🔔 ENVIAR NOTIFICACIÓN
    try {
      console.log(`🚚 PEDIDO LISTO PARA RETIRO:
📦 Pedido: ${order.order_number}
🏢 Empresa: ${order.company_id.name}
👤 Cliente: ${order.customer_name}
📍 ${order.shipping_commune}
💰 $${order.total_amount}
🕐 ${new Date().toLocaleString('es-CL')}
👨‍💼 Marcado por: ${req.user.full_name || req.user.email}`);
      
      // TODO: Aquí irán las notificaciones reales por email/WhatsApp
    } catch (notificationError) {
      console.error('❌ Error enviando notificaciones:', notificationError);
    }

    res.json({ message: 'Pedido marcado como listo para retiro', order });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando el pedido' });
  }
});
router.post('/bulk-ready', authenticateToken, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
    }

    console.log(`🔄 Procesando ${orderIds.length} pedidos para marcar como listos`);
    console.log(`👤 Usuario: ${req.user.email}, Rol: ${req.user.role}, Empresa: ${req.user.company_id}`);

    let filters = {
      '_id': { $in: orderIds },
      'status': 'pending' // Solo actualizar los que están pendientes
    };

    // ✅ CORRECCIÓN: Solo filtrar por empresa si NO es admin
    if (req.user.role !== 'admin') {
      if (!req.user.company_id) {
        return res.status(403).json({ 
          error: 'Usuario no asociado a ninguna empresa',
          user_role: req.user.role,
          has_company: !!req.user.company_id
        });
      }
      filters.company_id = req.user.company_id;
      console.log(`🏢 Filtrando por empresa: ${req.user.company_id}`);
    }

    // Primero verificar cuántos pedidos coinciden con los filtros
    const matchingOrders = await Order.find(filters).select('_id order_number status');
    console.log(`📊 Pedidos encontrados: ${matchingOrders.length} de ${orderIds.length} solicitados`);

    if (matchingOrders.length === 0) {
      return res.status(400).json({ 
        error: 'No se encontraron pedidos pendientes que puedan ser marcados como listos',
        details: {
          requested: orderIds.length,
          found: 0,
          filters_applied: filters
        }
      });
    }

    // Actualizar los pedidos
    const result = await Order.updateMany(filters, {
      $set: { 
        status: 'ready_for_pickup',
        updated_at: new Date()
      }
    });

    console.log(`✅ ${result.modifiedCount} pedidos actualizados exitosamente`);

    // 🔔 ENVIAR NOTIFICACIÓN MASIVA
if (result.modifiedCount > 0) {
  try {
    console.log(`🚚 PEDIDOS MASIVOS LISTOS PARA RETIRO:
📦 Cantidad: ${result.modifiedCount} pedidos
🏢 Empresa: ${req.user.company_id ? 'Una empresa específica' : 'Múltiples empresas'}
🕐 ${new Date().toLocaleString('es-CL')}
👨‍💼 Marcado por: ${req.user.full_name || req.user.email}
📋 Pedidos: ${matchingOrders.map(o => o.order_number).join(', ')}`);
    
    // TODO: Aquí irán las notificaciones reales por email/WhatsApp
  } catch (notificationError) {
    console.error('❌ Error enviando notificación masiva:', notificationError);
  }
}

    res.json({
      message: `${result.modifiedCount} pedidos marcados como listos para retiro.`,
      updatedCount: result.modifiedCount,
      totalRequested: orderIds.length,
      foundPending: matchingOrders.length,
      updated_orders: matchingOrders.map(o => ({
        id: o._id,
        order_number: o.order_number,
        previous_status: o.status
      }))
    });

  } catch (error) {
    console.error('❌ Error en bulk-ready:', error);
    res.status(500).json({ 
      error: 'Error actualizando los pedidos', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// --> INICIO DE NUEVA RUTA PARA MANIFIESTO <--
router.post('/manifest', authenticateToken, async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
    }

    console.log(`📋 Generando manifiesto para ${orderIds.length} pedidos`);
    console.log(`👤 Usuario: ${req.user.email}, Rol: ${req.user.role}, Empresa: ${req.user.company_id}`);

    let filters = {
      '_id': { $in: orderIds }
    };

    // ✅ CORRECCIÓN: Solo filtrar por empresa si NO es admin
    if (req.user.role !== 'admin') {
      if (!req.user.company_id) {
        return res.status(403).json({ 
          error: 'Usuario no asociado a ninguna empresa',
          user_role: req.user.role 
        });
      }
      filters.company_id = req.user.company_id;
      console.log(`🏢 Filtrando manifiesto por empresa: ${req.user.company_id}`);
    }

    const orders = await Order.find(filters)
      .select('order_number customer_name shipping_commune shipping_address customer_phone notes')
      .lean();

    console.log(`📊 Pedidos encontrados para manifiesto: ${orders.length} de ${orderIds.length} solicitados`);

    if (orders.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron pedidos para generar el manifiesto',
        details: {
          requested: orderIds.length,
          found: 0,
          filters_applied: filters
        }
      });
    }

    // Obtener información de la empresa
    let company = null;
    if (req.user.company_id) {
      company = await Company.findById(req.user.company_id)
        .select('name address phone email')
        .lean();
    }

    const manifestData = {
      company: company || {
        name: 'enviGo Admin',
        address: 'Administración Central',
        phone: '+56986147420',
        email: 'contacto@envigo.cl'
      },
      orders,
      generationDate: new Date(),
      generated_by: req.user.email,
      total_orders: orders.length
    };

    console.log(`✅ Manifiesto generado exitosamente para empresa: ${manifestData.company.name}`);

    res.json(manifestData);

  } catch (error) {
    console.error('❌ Error generando manifiesto:', error);
    res.status(500).json({ 
      error: 'Error generando el manifiesto', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== PEDIDOS - INTEGRACIÓN SHIPDAY ====================

// Crear orden individual en Shipday (sin asignar conductor)
router.post('/:orderId/create-shipday', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    // ✅ CORRECCIÓN: Incluir populate desde el inicio
    const order = await Order.findById(orderId).populate('company_id');
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    if (order.shipday_order_id) {
      return res.status(400).json({ error: 'Este pedido ya está en Shipday.' });
    }

    // ✅ CORRECCIÓN: Usar nombre de empresa + enviGo
    const companyName = order.company_id?.name || 'Cliente';
    const restaurantName = `${companyName} - enviGo`;
    const restaurantAddress = order.company_id?.address || "santa hilda 1447, quilicura";

    const shipdayData = {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerAddress: order.shipping_address,
      restaurantName: restaurantName, // ← CAMBIADO
      restaurantAddress: restaurantAddress, // ← CAMBIADO
      customerEmail: order.customer_email || '',
      customerPhoneNumber: order.customer_phone || '',
      deliveryInstruction: order.notes || 'Sin instrucciones especiales',
      deliveryFee: order.shipping_cost || 1800,
      total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
      payment_method: order.payment_method || '',
      // ✅ CORRECCIÓN: NO incluir campos de propina
    };

    console.log(`🏢 Creando orden individual para: ${restaurantName}`);
    const shipdayOrder = await ShipdayService.createOrder(shipdayData);

    order.shipday_order_id = shipdayOrder.orderId;
    order.status = 'processing';
    await order.save();

    res.status(200).json({
      message: 'Pedido creado en Shipday exitosamente.',
      shipday_order_id: shipdayOrder.orderId,
      company_name: companyName,
      restaurant_name_sent: restaurantName
    });

  } catch (error) {
    console.error('Error creando pedido en Shipday:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// Asignar conductor a pedido (crear+asignar o solo asignar)
router.post('/:orderId/assign-driver', authenticateToken, isAdmin, orderController.assignToDriver);

// ==================== ASIGNACIÓN MASIVA DE PEDIDOS ====================

// Asignar múltiples pedidos a un conductor de forma masiva
// Asignar múltiples pedidos a un conductor de forma masiva
router.post('/bulk-assign-driver', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds, driverId } = req.body;
    if (!Array.isArray(orderIds) || !driverId) {
      return res.status(400).json({ error: 'Faltan orderIds o driverId.' });
    }

    console.log('--- FASE PREPARATORIA: Obteniendo info del conductor ---');
    const shipdayDrivers = await ShipdayService.getDrivers();
    const shipdayDriver = shipdayDrivers.find(d => d.id == driverId);
    if (!shipdayDriver?.email) {
      throw new Error('Conductor no encontrado en Shipday o sin email.');
    }

    const circuitDriverId = await circuitService.getDriverIdByEmail(shipdayDriver.email);
    if (!circuitDriverId) {
      console.warn(`⚠️ Conductor no encontrado en Circuit, solo se asignará en Shipday.`);
    }

    const results = { successful: [], failed: [] };
    const ordersThatFailedCreation = new Set();

    // 1️⃣ Obtener órdenes
    const ordersToProcess = await Order.find({ _id: { $in: orderIds } }).populate('company_id');

    // 2️⃣ Crear en Shipday las órdenes que no existan
    for (const order of ordersToProcess) {
      if (!order.shipday_order_id) {
        try {
          const companyName = order.company_id?.name || 'Cliente';
          const restaurantName = `${companyName} - enviGo`;
          const restaurantAddress = order.company_id?.address || "santa hilda 1447, quilicura";

          const shipdayData = {
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerAddress: order.shipping_address,
            restaurantName,
            restaurantAddress,
            customerPhoneNumber: order.customer_phone || '',
            deliveryInstruction: order.notes || '',
            deliveryFee: order.shipping_cost || 1800,
            total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
            customerEmail: order.customer_email || '',
            payment_method: order.payment_method || ''
          };

          const createdShipdayOrder = await ShipdayService.createOrder(shipdayData);
          order.shipday_order_id = createdShipdayOrder.orderId;
          await order.save();
        } catch (err) {
          console.error(`❌ Error creando #${order.order_number} en Shipday:`, err.message);
          results.failed.push({ orderId: order._id, orderNumber: order.order_number, error: err.message });
          ordersThatFailedCreation.add(order._id.toString());
        }
      }
    }

    const validOrdersForAssignment = ordersToProcess.filter(
      o => !ordersThatFailedCreation.has(o._id.toString())
    );

    // 3️⃣ Asignar en Shipday
    for (const order of validOrdersForAssignment) {
      try {
        await ShipdayService.assignOrder(order.shipday_order_id, driverId);
      } catch (err) {
        console.error(`❌ Error asignando #${order.order_number} en Shipday:`, err.message);
        results.failed.push({ orderId: order._id, orderNumber: order.order_number, error: err.message });
      }
    }

    // 4️⃣ Circuit: Crear plan, añadir paradas, optimizar y distribuir
    if (circuitDriverId && validOrdersForAssignment.length > 0) {
      try {
        console.log(`🚀 Circuit: Creando plan para ${validOrdersForAssignment.length} órdenes...`);
        const newPlanId = await circuitController.createPlanForAssignment(circuitDriverId, validOrdersForAssignment);

        await Promise.all(validOrdersForAssignment.map(order =>
          circuitController.addStopToPlan(order, newPlanId, circuitDriverId)
        ));
        console.log(`✅ Circuit: Paradas añadidas al plan ${newPlanId}.`);

        // Optimizar
        const { optimized, operationId } = await circuitController.optimizePlan(newPlanId);
        let planOptimized = optimized;

        if (!planOptimized && operationId) {
          for (let i = 0; i < 10; i++) {
            await new Promise(res => setTimeout(res, 2000));
            const status = await circuitController.getOperationStatus(operationId);
            if (status?.done) {
              planOptimized = true;
              console.log(`✅ Circuit: Plan ${newPlanId} optimizado tras polling.`);
              break;
            }
            console.log(`⏳ Circuit: Optimización en progreso (${i + 1}/10)...`);
          }
        }

        // Distribuir
        if (planOptimized) {
          const distributed = await circuitController.distributePlan(newPlanId);
          if (distributed) {
            console.log(`📲 Circuit: Plan ${newPlanId} enviado al conductor.`);
          } else {
            console.warn(`⚠️ Circuit: Falló la distribución del plan ${newPlanId}.`);
          }
        } else {
          console.warn(`⚠️ Circuit: Optimización no completada, no se distribuyó el plan.`);
        }

      } catch (err) {
        console.error(`❌ Circuit: Error en proceso - ${err.message}`);
      }
    }

    // 5️⃣ Guardar y responder
    for (const order of validOrdersForAssignment) {
      await order.save();
      results.successful.push({
        orderId: order._id,
        orderNumber: order.order_number,
        companyName: order.company_id?.name
      });
    }

    res.status(200).json({
      message: `Asignación completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas.`,
      summary: {
        total: orderIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      details: results
    });

  } catch (error) {
    console.error('❌ Error crítico en asignación masiva:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor en asignación masiva' });
  }
});

// Preview de asignación masiva (verificar qué pedidos pueden ser asignados)
router.post('/bulk-assignment-preview', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }

    console.log(`🔍 Generando preview para ${orderIds.length} pedidos`);

    const orders = await Order.find({
      _id: { $in: orderIds }
    }).populate('company_id').lean();

    const analysis = {
      assignable: [],
      not_assignable: [],
      total: orderIds.length,
      found: orders.length
    };

    orders.forEach(order => {
      if (order.shipday_order_id) {
        analysis.not_assignable.push({
          orderId: order._id,
          orderNumber: order.order_number,
          reason: 'Ya está en Shipday'
        });
      } else if (!order.company_id?.name) {
        analysis.not_assignable.push({
          orderId: order._id,
          orderNumber: order.order_number,
          reason: 'Sin datos de empresa'
        });
      } else {
        analysis.assignable.push({
          orderId: order._id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          companyName: order.company_id.name
        });
      }
    });

    // Verificar órdenes no encontradas
    const foundIds = orders.map(o => o._id.toString());
    const notFound = orderIds.filter(id => !foundIds.includes(id));
    
    notFound.forEach(orderId => {
      analysis.not_assignable.push({
        orderId,
        orderNumber: 'No encontrado',
        reason: 'Orden no existe'
      });
    });

    res.json({
      preview: analysis,
      recommendations: analysis.assignable.length > 0 ?
        [`Se pueden asignar ${analysis.assignable.length} de ${analysis.total} pedidos`] :
        ['No hay pedidos disponibles para asignación'],
      ready_for_assignment: analysis.assignable.length > 0
    });

  } catch (error) {
    console.error('❌ Error generando preview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar estado de asignaciones masivas
router.post('/bulk-assignment-status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }

    const orders = await Order.find({
      _id: { $in: orderIds }
    }).lean();

    const statusReport = orders.map(order => ({
      orderId: order._id,
      orderNumber: order.order_number,
      status: order.status,
      isInShipday: !!order.shipday_order_id,
      shipdayOrderId: order.shipday_order_id,
      hasDriverAssigned: !!order.shipday_driver_id,
      shipdayDriverId: order.shipday_driver_id
    }));

    const summary = {
      total: orderIds.length,
      in_shipday: statusReport.filter(s => s.isInShipday).length,
      with_driver: statusReport.filter(s => s.hasDriverAssigned).length,
      pending: statusReport.filter(s => !s.isInShipday).length
    };

    res.json({
      status_report: statusReport,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error verificando estados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancelar asignaciones masivas (desasignar conductores)
router.post('/bulk-unassign-driver', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }

    console.log(`🚫 Cancelando asignaciones para ${orderIds.length} pedidos`);

    const results = {
      successful: [],
      failed: [],
      total: orderIds.length
    };

    const orders = await Order.find({
      _id: { $in: orderIds },
      shipday_driver_id: { $exists: true }
    });

    for (const order of orders) {
      try {
        // Resetear campos de asignación
        order.shipday_driver_id = undefined;
        order.status = 'processing'; // Volver a estado anterior
        await order.save();

        results.successful.push({
          orderId: order._id,
          orderNumber: order.order_number,
          message: 'Asignación cancelada'
        });

      } catch (error) {
        results.failed.push({
          orderId: order._id,
          orderNumber: order.order_number,
          error: error.message
        });
      }
    }

    res.json({
      message: `Cancelación completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas.`,
      results,
      summary: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });

  } catch (error) {
    console.error('❌ Error cancelando asignaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear múltiples órdenes en Shipday de una vez
router.post('/bulk-create-shipday', authenticateToken, async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }

    // ✅ CORRECCIÓN: Incluir populate de company_id desde el inicio
    const orders = await Order.find({
      _id: { $in: orderIds },
      shipday_order_id: { $exists: false }
    }).populate('company_id'); // ← AGREGADO POPULATE

    if (orders.length === 0) {
      return res.status(400).json({ error: 'No se encontraron órdenes válidas para procesar.' });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const order of orders) {
      try {
        // ✅ CORRECCIÓN: Usar nombre de empresa + enviGo
        const companyName = order.company_id?.name || 'Cliente';
        const restaurantName = `${companyName} - enviGo`;
        const restaurantAddress = order.company_id?.address || "santa hilda 1447, quilicura";
        
        const shipdayData = {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerAddress: order.shipping_address,
          restaurantName: restaurantName, // ← CAMBIADO
          restaurantAddress: restaurantAddress, // ← CAMBIADO
          customerEmail: order.customer_email || '',
          customerPhoneNumber: order.customer_phone || '',
          deliveryInstruction: order.notes || 'Sin instrucciones especiales',
          deliveryFee: order.shipping_cost || 1800,
          total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
          payment_method: order.payment_method || '',
          // ✅ CORRECCIÓN: NO incluir campos de propina para permitir que el repartidor añada propina
        };

        console.log(`🏢 Creando orden bulk para: ${restaurantName}`);
        const shipdayOrder = await ShipdayService.createOrder(shipdayData);

        order.shipday_order_id = shipdayOrder.orderId;
        order.status = 'processing';
        await order.save();

        results.successful.push({
          local_order_id: order._id,
          order_number: order.order_number,
          shipday_order_id: shipdayOrder.orderId,
          company_name: companyName, // ← AGREGADO PARA LOGGING
          restaurant_name_sent: restaurantName // ← AGREGADO PARA DEBUG
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
router.get('/:orderId/shipday-status', authenticateToken, async (req, res) => {
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
router.delete('/:id', async (req, res) => {
  try {
    // 1. Obtener el ID del pedido desde los parámetros de la URL
    const orderId = req.params.id;

    // 2. Buscar y eliminar el pedido en la base de datos
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    // 3. Si no se encuentra el pedido, devolver un error 404
    if (!deletedOrder) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // 4. Si se elimina correctamente, enviar una respuesta de éxito
    res.status(200).json({ message: 'Pedido eliminado exitosamente', orderId: deletedOrder._id });

  } catch (error) {
    // 5. Si ocurre un error en el servidor, informarlo
    console.error('Error al eliminar el pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
router.get('/:orderId/label', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🟢 [Label] Solicitando etiqueta para external_order_id recibido en URL:', orderId);

    // Buscar en la BD
    const order = await Order.findOne({ external_order_id: String(orderId) });
    console.log('📦 [Label] Orden encontrada en BD:', order ? {
      _id: order._id,
      external_order_id: order.external_order_id,
      channel_id: order.channel_id
    } : 'NO');

    if (!order) {
      return res.status(404).json({ 
        error: 'Orden no encontrada en BD',
        details: `external_order_id ${orderId} no existe en Orders`
      });
    }

    // 🚨 Debug extra: ver exactamente qué datos usamos para llamar a ML
    console.log('➡️ [Label] Llamando a MercadoLibreService.getShippingLabel con:', {
      external_order_id: order.external_order_id,
      channel_id: order.channel_id
    });

    // Importante: pasar el external_order_id guardado en la BD
    const pdfResponse = await MercadoLibreService.getShippingLabel(
      order.external_order_id,
      order.channel_id
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="label-${order.external_order_id}.pdf"`);

    pdfResponse.data.pipe(res);
  } catch (err) {
    console.error('❌ [ML Label] Error obteniendo etiqueta:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'No se pudo obtener la etiqueta', 
      details: err.response?.data || err.message 
    });
  }
});

router.post('/bulk-actions/status', authenticateToken, isAdmin, orderController.bulkUpdateStatus);

// ==================== TRACKING DE PEDIDOS ====================
/**
 * Generar timeline de eventos del pedido
 */
function generateTimeline(order) {
  const timeline = []
  
  // Evento de creación
  timeline.push({
    status: 'created',
    timestamp: order.order_date,
    title: 'Pedido Creado',
    description: `Pedido #${order.order_number} creado`,
    icon: '📝'
  })
  
  // Eventos basados en el estado
  if (order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
    timeline.push({
      status: 'processing',
      timestamp: order.updated_at || order.order_date,
      title: 'En Procesamiento',
      description: 'Pedido confirmado y en preparación',
      icon: '⚙️'
    })
  }
  
  if (order.status === 'shipped' || order.status === 'delivered') {
    timeline.push({
      status: 'shipped',
      timestamp: order.shipped_date || order.updated_at,
      title: 'Enviado',
      description: 'Pedido en camino al destino',
      icon: '🚚'
    })
  }
  
  if (order.status === 'delivered') {
    timeline.push({
      status: 'delivered',
      timestamp: order.delivery_date,
      title: 'Entregado',
      description: 'Pedido entregado exitosamente',
      icon: '✅'
    })
  }
  
  // Ordenar por timestamp
  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

router.get('/:orderId/tracking', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`📍 Solicitando tracking para orden: ${orderId}`);
    
    const order = await Order.findById(orderId)
      .populate('company_id', 'name phone address')
      .populate('channel_id', 'channel_name channel_type');
    
    if (!order) {
      console.log(`❌ Orden no encontrada: ${orderId}`);
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Verificar permisos (admin o dueño del pedido)
        // Verificar permisos (admin o dueño del pedido)
    if (req.user.role !== 'admin' && (!req.user.company_id || req.user.company_id.toString() !== order.company_id._id.toString())) {
      console.log(`🚫 Permiso denegado para ver la orden: ${orderId}`);
      return res.status(403).json({ error: 'No tienes permisos para ver este pedido' });
    }

    console.log(`✅ Generando tracking info para orden: #${order.order_number}`);

    // INTENTAR OBTENER DATOS ACTUALIZADOS DE SHIPDAY SI ES POSIBLE
    let freshShipdayData = null;
    if (order.shipday_order_id) {
      try {
        console.log('🔄 Obteniendo datos actualizados de Shipday...');
        freshShipdayData = await ShipdayService.getOrder(order.shipday_order_id);
        console.log('✅ Datos frescos de Shipday obtenidos');
      } catch (shipdayError) {
        console.log('⚠️ No se pudieron obtener datos frescos de Shipday:', shipdayError.message);
      }
    }

    // INFORMACIÓN COMPLETA DE TRACKING
    const trackingInfo = {
      order_number: order.order_number,
      customer_name: order.customer_name,
      current_status: order.status,
      
      // URLs de tracking (buscar en múltiples lugares)
      tracking_url: order.shipday_tracking_url || freshShipdayData?.trackingUrl || null,
      shipday_tracking_url: order.shipday_tracking_url || freshShipdayData?.trackingUrl || null,
      has_tracking: !!(order.shipday_tracking_url || freshShipdayData?.trackingUrl),
      
      // Información del conductor (usar datos frescos si están disponibles)
      driver: order.driver_info || {
        id: order.shipday_driver_id || freshShipdayData?.carrierId,
        name: order.driver_info?.name || freshShipdayData?.carrierName || null,
        phone: order.driver_info?.phone || freshShipdayData?.carrierPhone || null,
        email: order.driver_info?.email || freshShipdayData?.carrierEmail || null,
        status: order.driver_info?.status || freshShipdayData?.carrierStatus || null
      },
      
      // Ubicaciones
      pickup_address: order.pickup_address || order.company_id?.address || 'Dirección no especificada',
      delivery_address: order.shipping_address,
      delivery_location: order.delivery_location,
      
      // Fechas importantes
      order_date: order.order_date,
      delivery_date: order.delivery_date,
      estimated_delivery: order.shipday_times?.expected_delivery_time,
      
      // Estado en Shipday
      shipday_status: order.shipday_status,
      shipday_order_id: order.shipday_order_id,
      
      // Timeline de eventos
      timeline: generateTimeline(order),
      
      // Información adicional
      notes: order.notes,
      total_amount: order.total_amount,
      shipping_cost: order.shipping_cost,
      company: {
        name: order.company_id?.name,
        phone: order.company_id?.phone
      },
      
      // DATOS DE DEBUG
      debug_info: {
        has_shipday_order: !!order.shipday_order_id,
        fresh_data_available: !!freshShipdayData,
        tracking_url_source: order.shipday_tracking_url ? 'database' :
                             freshShipdayData?.trackingUrl ? 'shipday_api' : 'none'
      }
    };

    console.log(`🚚 Tracking generado para #${order.order_number}:`, {
      has_tracking_url: !!trackingInfo.tracking_url,
      tracking_url_source: trackingInfo.debug_info.tracking_url_source,
      has_driver: !!trackingInfo.driver?.name,
      timeline_events: trackingInfo.timeline.length
    });

    res.json({
      success: true,
      tracking: trackingInfo,
      last_updated: order.updated_at
    });

  } catch (error) {
    console.error('❌ Error obteniendo tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/deliver', authenticateToken, async (req, res) => {
  try {
    const { photo, signature, notes, recipient_name } = req.body;
    
    console.log('📦 Marcando pedido como entregado:', {
      orderId: req.params.id,
      hasPhoto: !!photo,
      hasSignature: !!signature,
      hasNotes: !!notes,
      recipientName: recipient_name
    });

    // Validar que existe la orden
    const order = await Order.findById(req.params.id)
      .populate('company_id')  // ← AGREGAR para datos de la empresa
      .populate('channel_id'); // ← AGREGAR para datos del canal
      
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Validar que hay al menos una foto
    if (!photo) {
      return res.status(400).json({ 
        error: 'Se requiere una foto como prueba de entrega' 
      });
    }

    // Preparar objeto de prueba de entrega
    const proofData = {
      timestamp: new Date(),
      recipient_name: recipient_name || 'No especificado',
      notes: notes || ''
    };

    // 📸 Subir foto a Cloudinary
    if (photo) {
      try {
        console.log('📸 Subiendo foto de prueba de entrega...');
        const photoResult = await CloudinaryService.uploadProofImage(
          photo, 
          order._id, 
          'photo'
        );
        
        proofData.photo_url = photoResult.url;
        proofData.photo_public_id = photoResult.public_id;
        proofData.photo_uploaded_at = new Date();
        
        console.log('✅ Foto subida exitosamente:', {
          url: photoResult.url,
          size: `${Math.round(photoResult.bytes / 1024)}KB`
        });
      } catch (error) {
        console.error('❌ Error subiendo foto:', error);
        return res.status(500).json({ 
          error: 'Error al subir la foto de entrega',
          details: error.message 
        });
      }
    }

    // ✍️ Subir firma si existe (opcional)
    if (signature) {
      try {
        console.log('✍️ Subiendo firma...');
        const signatureResult = await CloudinaryService.uploadProofImage(
          signature, 
          order._id, 
          'signature'
        );
        
        proofData.signature_url = signatureResult.url;
        proofData.signature_public_id = signatureResult.public_id;
        proofData.signature_uploaded_at = new Date();
        
        console.log('✅ Firma subida exitosamente:', signatureResult.url);
      } catch (error) {
        console.error('❌ Error subiendo firma:', error);
        console.warn('⚠️ Continuando sin firma');
      }
    }

    // Actualizar orden usando el método del modelo
    order.markAsDelivered(proofData);
    await order.save();

    console.log('✅ Pedido marcado como entregado:', {
      orderId: order._id,
      orderNumber: order.order_number,
      status: order.status,
      hasPhoto: !!proofData.photo_url,
      hasSignature: !!proofData.signature_url,
      deliveryDate: order.delivery_date
    });

    // 📧 ENVIAR EMAIL DE CONFIRMACIÓN
    try {
      console.log('📧 Enviando email de confirmación de entrega...');
      
      const notificationService = new NotificationService();
      await notificationService.sendDeliveryConfirmationEmail(order);
      
      console.log('✅ Email de confirmación enviado exitosamente');
    } catch (emailError) {
      console.error('❌ Error enviando email de confirmación:', emailError);
      // No fallar el endpoint si el email falla
      console.warn('⚠️ El pedido se marcó como entregado pero el email no se pudo enviar');
    }

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Pedido marcado como entregado exitosamente',
      order: {
        _id: order._id,
        order_number: order.order_number,
        status: order.status,
        delivery_date: order.delivery_date,
        proof_of_delivery: order.proof_of_delivery
      }
    });

  } catch (error) {
    console.error('❌ Error marcando pedido como entregado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al marcar como entregado',
      details: error.message 
    });
  }
});
router.patch('/:id/warehouse-received', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    order.status = 'warehouse_received';
    await order.save();

    res.json({ 
      message: 'Pedido recepcionado en bodega', 
      order: {
        _id: order._id,
        order_number: order.order_number,
        status: order.status,
        updated_at: order.updated_at
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error actualizando el pedido' });
  }
});

// 👨‍💼 Marcar como asignado
router.patch('/:id/assigned', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    order.status = 'assigned';
    await order.save();

    res.json({ 
      message: 'Conductor asignado', 
      order: {
        _id: order._id,
        order_number: order.order_number,
        status: order.status,
        updated_at: order.updated_at
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error actualizando el pedido' });
  }
});

// 🚚 Marcar como en ruta
router.patch('/:id/out-for-delivery', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    order.status = 'out_for_delivery';
    await order.save();

    res.json({ 
      message: 'Pedido en ruta de entrega', 
      order: {
        _id: order._id,
        order_number: order.order_number,
        status: order.status,
        updated_at: order.updated_at
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error actualizando el pedido' });
  }
});
router.get('/customer-template', authenticateToken, orderController.downloadImportTemplate);
router.post(
  '/customer-bulk-upload',
  authenticateToken,
  upload.single('file'),
  orderController.customerBulkUpload  // Nueva función simplificada
);
module.exports = router;