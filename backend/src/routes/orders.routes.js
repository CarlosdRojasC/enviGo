const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const orderController = require('../controllers/order.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateOrderCreation, validateStatusUpdate } = require('../middlewares/validators/order.validator');
const { validateMongoId } = require('../middlewares/validators/generic.validator');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Order = require('../models/Order');
const ShipdayService = require('../services/shipday.service');
const Company = require('../models/Company');


// ==================== PEDIDOS ====================

router.get('/', authenticateToken, orderController.getAll);
router.get('/stats', authenticateToken, orderController.getStats);
router.get('/trend', authenticateToken, orderController.getOrdersTrend);
router.get('/export', authenticateToken, isAdmin, orderController.exportOrders);
router.get('/export-dashboard', authenticateToken, orderController.exportForDashboard);
router.get('/import-template', authenticateToken, isAdmin, orderController.downloadImportTemplate);
router.post(
  '/bulk-upload',
  authenticateToken,
  isAdmin,
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
router.patch('/:id/status', authenticateToken, validateMongoId('id'), isAdmin, orderController.updateStatus);

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
        phone: '+56912345678',
        email: 'admin@envigo.cl'
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
router.post('/bulk-assign-driver', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds, driverId } = req.body;

    // --- Validaciones ---
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }
    if (!driverId) {
      return res.status(400).json({ error: 'Se requiere el ID del conductor.' });
    }

    console.log(`🚀 INICIO: Asignación masiva de ${orderIds.length} pedidos al conductor ${driverId}`);
    
    const results = { successful: [], failed: [] };
    
    // ✅ CORRECCIÓN: Hacer populate de company_id desde el inicio
    const ordersToProcess = await Order.find({ _id: { $in: orderIds } }).populate('company_id');
    const ordersThatFailedCreation = new Set();

    // --- FASE 1: Crear en Shipday todas las órdenes que no existan ---
    console.log('--- FASE 1: Creando órdenes en Shipday ---');
    for (const order of ordersToProcess) {
      if (!order.shipday_order_id) {
        try {
          console.log(`📦 Creando orden #${order.order_number} en Shipday...`);
          
          // ✅ CORRECCIÓN: Usar nombre de empresa + enviGo
          const companyName = order.company_id?.name || 'Cliente';
          const restaurantName = `${companyName} - enviGo`;
          const restaurantAddress = order.company_id?.address || "santa hilda 1447, quilicura";
          
          const orderDataForShipday = {
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerAddress: order.shipping_address,
            restaurantName: restaurantName, // ← CAMBIADO: era "enviGo"
            restaurantAddress: restaurantAddress, // ← CAMBIADO: era fijo
            customerPhoneNumber: order.customer_phone || '',
            deliveryInstruction: order.notes || '',
            deliveryFee: order.shipping_cost || 1800, // ← MEJORADO: usar shipping_cost dinámico
            total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
            customerEmail: order.customer_email || '',
            payment_method: order.payment_method || '', // ← MEJORADO: usar payment_method real
            // ✅ CORRECCIÓN: NO incluir campos de propina para permitir que el repartidor añada propina
          };
          
          console.log(`🏢 Creando orden bulk assign para: ${restaurantName}`);
          const createdShipdayOrder = await ShipdayService.createOrder(orderDataForShipday);
          order.shipday_order_id = createdShipdayOrder.orderId;
          await order.save();
          
        } catch (creationError) {
          console.error(`❌ Error creando #${order.order_number} en Shipday:`, creationError.message);
          results.failed.push({ 
            orderId: order._id, 
            orderNumber: order.order_number, 
            error: `Error al crear en Shipday: ${creationError.message}` 
          });
          ordersThatFailedCreation.add(order._id.toString());
        }
      }
    }

    const validOrdersForAssignment = ordersToProcess.filter(
      order => !ordersThatFailedCreation.has(order._id.toString())
    );

    // --- FASE 2: Asignar el conductor a todas las órdenes válidas ---
    console.log(`--- FASE 2: Asignando conductor a ${validOrdersForAssignment.length} órdenes ---`);
    for (const order of validOrdersForAssignment) {
      try {
        await ShipdayService.assignOrder(order.shipday_order_id, driverId);
      } catch (assignError) {
        console.error(`❌ Error asignando #${order.order_number}:`, assignError.message);
        results.failed.push({ 
          orderId: order._id, 
          orderNumber: order.order_number, 
          error: `Error en la asignación: ${assignError.message}` 
        });
      }
    }
    
    // --- FASE 3: Consultar TODAS las órdenes de Shipday para obtener los datos actualizados ---
    console.log('--- FASE 3: Obteniendo datos actualizados de Shipday ---');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay para dar tiempo a la API
    const allShipdayOrders = await ShipdayService.getOrders();
    const shipdayOrdersMap = new Map(allShipdayOrders.map(o => [o.orderId.toString(), o]));
    const driverInfo = (await ShipdayService.getDrivers()).find(d => d.id == driverId);

    // --- FASE 4: Actualizar la base de datos local con la información correcta ---
    console.log('--- FASE 4: Actualizando base de datos local ---');
    for (const order of validOrdersForAssignment) {
      if (results.failed.some(f => f.orderId.equals(order._id))) continue;

      const updatedShipdayOrder = shipdayOrdersMap.get(order.shipday_order_id);
      const trackingUrl = updatedShipdayOrder?.trackingLink || '';

      order.shipday_driver_id = driverId;
      order.status = 'shipped';
      order.shipday_tracking_url = trackingUrl;
      if (driverInfo) {
        order.driver_info = { 
          name: driverInfo.name, 
          phone: driverInfo.phone, 
          email: driverInfo.email, 
          status: driverInfo.isOnShift ? 'ONLINE' : 'OFFLINE' 
        };
      }
      await order.save();
      
      // ✅ AGREGADO: Incluir información de empresa en el resultado
      results.successful.push({ 
        orderId: order._id, 
        orderNumber: order.order_number,
        companyName: order.company_id?.name, // ← AGREGADO para logging
        restaurantNameSent: `${order.company_id?.name || 'Cliente'} - enviGo` // ← AGREGADO para debug
      });
      console.log(`✅ Orden #${order.order_number} (${order.company_id?.name}) actualizada con Tracking URL: "${trackingUrl}"`);
    }

    console.log(`🏁 FIN: Proceso completado.`);
    res.status(200).json({
      message: `Asignación masiva completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas.`,
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

router.patch('/:id/deliver', authenticateToken, validateMongoId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      notes, 
      photo_url, 
      signature_url, 
      delivery_location 
    } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.company_id.toString() !== order.company_id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    // Verificar que el pedido se puede marcar como entregado
    if (!['processing', 'shipped', 'ready_for_pickup'].includes(order.status)) {
      return res.status(400).json({ 
        error: `No se puede marcar como entregado un pedido con estado "${order.status}"` 
      });
    }

    // Actualizar estado y agregar prueba de entrega
    order.status = 'delivered';
    order.delivery_date = new Date();
    order.updated_at = new Date();

    // Crear prueba de entrega
    order.proof_of_delivery = {
      photo_url: photo_url || null,
      signature_url: signature_url || null,
      notes: notes || 'Entrega confirmada manualmente',
      delivery_location: delivery_location || null,
      delivered_by: req.user.name || req.user.email || 'Sistema',
      delivery_timestamp: new Date()
    };

    // Campos de compatibilidad
    if (photo_url) {
      order.podUrls = [photo_url];
    }
    if (signature_url) {
      order.signatureUrl = signature_url;
    }

    await order.save();

    console.log(`✅ Pedido marcado como entregado manualmente:`, {
      order_number: order.order_number,
      delivered_by: order.proof_of_delivery.delivered_by,
      has_photo: !!photo_url,
      has_signature: !!signature_url
    });

    res.json({
      message: 'Pedido marcado como entregado exitosamente',
      order,
      proof_of_delivery: order.proof_of_delivery
    });

  } catch (error) {
    console.error('Error marcando pedido como entregado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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

module.exports = router;