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

router.get('/orders', authenticateToken, orderController.getAll);
router.get('/orders/stats', authenticateToken, orderController.getStats);
router.get('/orders/trend', authenticateToken, orderController.getOrdersTrend);
router.get('/orders/export', authenticateToken, isAdmin, orderController.exportForOptiRoute);
router.get('/orders/import-template', authenticateToken, isAdmin, orderController.downloadImportTemplate);
router.post(
  '/orders/bulk-upload', 
  authenticateToken, 
  isAdmin, 
  upload.single('file'),
  orderController.bulkUpload
);

// Ruta para obtener todas las comunas disponibles (esta puede quedarse aquí ya que es específica de orders)
router.get('/orders/communes', authenticateToken, async (req, res) => {
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

router.post('/orders', authenticateToken, validateOrderCreation, orderController.create);
router.get('/orders/:id', authenticateToken, validateMongoId('id'), orderController.getById);
router.patch('/orders/:id/status', authenticateToken, validateMongoId('id'), isAdmin, orderController.updateStatus);

router.patch('/orders/:id/ready', authenticateToken, validateMongoId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Solo la empresa dueña puede marcar como listo
    if (req.user.company_id.toString() !== order.company_id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Solo los pedidos pendientes pueden marcarse como listos' });
    }

    order.status = 'ready_for_pickup';
    await order.save();
    res.json({ message: 'Pedido marcado como listo para retiro', order });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando el pedido' });
  }
});
router.post('/orders/bulk-ready', authenticateToken, async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
        }

        const result = await Order.updateMany(
            {
                '_id': { $in: orderIds },
                'company_id': req.user.company_id, // Seguridad: solo actualizar pedidos de la propia empresa
                'status': 'pending' // Solo actualizar los que están pendientes
            },
            {
                $set: { status: 'ready_for_pickup' }
            }
        );

        res.json({
            message: `${result.modifiedCount} pedidos marcados como listos para retiro.`,
            updatedCount: result.modifiedCount
        });

    } catch (error) {
        res.status(500).json({ error: 'Error actualizando los pedidos', details: error.message });
    }
});
// --> INICIO DE NUEVA RUTA PARA MANIFIESTO <--
router.post('/orders/manifest', authenticateToken, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
    }

    const orders = await Order.find({
      '_id': { $in: orderIds },
      'company_id': req.user.company_id // Asegurar que solo obtenga pedidos de su empresa
    }).select('order_number customer_name shipping_commune load1Packages');

    const company = await Company.findById(req.user.company_id).select('name address');

    res.json({
      company,
      orders,
      generationDate: new Date()
    });

  } catch (error) {
    res.status(500).json({ error: 'Error generando el manifiesto', details: error.message });
  }
});

// ==================== PEDIDOS - INTEGRACIÓN SHIPDAY ====================

// Crear orden individual en Shipday (sin asignar conductor)
router.post('/orders/:orderId/create-shipday', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('company_id');
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
      restaurantName: order.company_id?.name || 'Tienda Principal',
      restaurantAddress: order.company_id?.address || order.shipping_address,
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

// ==================== ASIGNACIÓN MASIVA DE PEDIDOS ====================

// Asignar múltiples pedidos a un conductor de forma masiva
router.post('/orders/bulk-assign-driver', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds, driverId, options = {} } = req.body;

    // Validaciones básicas
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: 'Se requiere un array de IDs de órdenes.',
        received: typeof orderIds,
        example: { orderIds: ["order1", "order2"], driverId: "driver123" }
      });
    }

    if (!driverId) {
      return res.status(400).json({ 
        error: 'Se requiere el ID del conductor.',
        example: { orderIds: ["order1", "order2"], driverId: "driver123" }
      });
    }

    if (orderIds.length > 50) {
      return res.status(400).json({ 
        error: 'Máximo 50 órdenes por lote para evitar timeouts.',
        received: orderIds.length,
        suggestion: 'Divide la operación en lotes más pequeños'
      });
    }

    console.log(`🚀 Iniciando asignación masiva: ${orderIds.length} pedidos al conductor ${driverId}`);

    // Configuración para la asignación masiva
    const bulkOptions = {
      stopOnFirstError: options.stopOnFirstError || false,
      delayBetweenRequests: options.delayBetweenRequests || 300, // 300ms entre peticiones
      validateDriver: options.validateDriver !== false, // true por defecto
      validateOrders: options.validateOrders || false, // false por defecto (más rápido)
      retryFailedOnce: options.retryFailedOnce !== false // true por defecto
    };

    const results = {
      successful: [],
      failed: [],
      alreadyInShipday: [],
      needsCreation: [],
      total: orderIds.length
    };

    // Paso 1: Obtener todas las órdenes de la base de datos
    console.log('📋 Paso 1: Obteniendo órdenes de la base de datos...');
    const orders = await Order.find({ 
      _id: { $in: orderIds }
    }).populate('company_id');

    if (orders.length === 0) {
      return res.status(400).json({ 
        error: 'No se encontraron órdenes válidas para procesar.',
        searched_ids: orderIds,
        found_count: 0
      });
    }

    console.log(`✅ Encontradas ${orders.length}/${orderIds.length} órdenes en la base de datos`);

    // Paso 2: Separar órdenes que ya están en Shipday vs las que necesitan creación
    const ordersInShipday = [];
    const ordersNeedingCreation = [];

    for (const order of orders) {
      if (order.shipday_order_id) {
        ordersInShipday.push(order);
        results.alreadyInShipday.push({
          orderId: order._id,
          orderNumber: order.order_number,
          shipdayOrderId: order.shipday_order_id
        });
      } else {
        ordersNeedingCreation.push(order);
        results.needsCreation.push({
          orderId: order._id,
          orderNumber: order.order_number
        });
      }
    }

    console.log(`📊 Análisis: ${ordersInShipday.length} ya en Shipday, ${ordersNeedingCreation.length} necesitan creación`);

    // Paso 3: Crear órdenes faltantes en Shipday
    if (ordersNeedingCreation.length > 0) {
      console.log(`🏗️ Paso 3: Creando ${ordersNeedingCreation.length} órdenes en Shipday...`);
      
      for (let i = 0; i < ordersNeedingCreation.length; i++) {
        const order = ordersNeedingCreation[i];
        
        try {
          console.log(`[${i + 1}/${ordersNeedingCreation.length}] Creando orden: ${order.order_number}`);
          
          const orderDataForShipday = {
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerAddress: order.shipping_address,
            restaurantName: "enviGo",
            restaurantAddress: "Santa hilda 1447, quilicura",
            customerPhoneNumber: order.customer_phone || '',
            deliveryInstruction: order.notes || '',
            deliveryFee: 1800,
            total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
            customerEmail: order.customer_email || '',
          };
          
          const createdShipdayOrder = await ShipdayService.createOrder(orderDataForShipday);
          
          if (!createdShipdayOrder || !createdShipdayOrder.orderId) {
            results.failed.push({
              orderId: order._id,
              orderNumber: order.order_number,
              error: 'No se pudo crear la orden en Shipday',
              step: 'creation'
            });
            continue;
          }
          
          // Actualizar orden local
          order.shipday_order_id = createdShipdayOrder.orderId;
          order.status = 'processing';
          await order.save();
          
          // Mover a la lista de órdenes listas para asignar
          ordersInShipday.push(order);
          
          console.log(`✅ Orden ${order.order_number} creada en Shipday con ID: ${createdShipdayOrder.orderId}`);
          
          // Pequeño delay para no sobrecargar la API
          if (i < ordersNeedingCreation.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          console.error(`❌ Error creando orden ${order.order_number}:`, error.message);
          results.failed.push({
            orderId: order._id,
            orderNumber: order.order_number,
            error: `Error creando en Shipday: ${error.message}`,
            step: 'creation'
          });
        }
      }
    }

    // Paso 4: Asignar conductor a todas las órdenes que ahora están en Shipday
    console.log(`🎯 Paso 4: Asignando conductor a ${ordersInShipday.length} órdenes...`);
    
    if (ordersInShipday.length > 0) {
      // Preparar IDs de Shipday para asignación masiva
      const shipdayOrderIds = ordersInShipday.map(order => order.shipday_order_id);
      
      // Usar el nuevo método de asignación masiva optimizado
      const assignmentResults = await ShipdayService.bulkAssignOrders(shipdayOrderIds, driverId, bulkOptions);
      
      // Procesar resultados y actualizar base de datos local
      for (const successfulAssignment of assignmentResults.successful) {
        const orderId = successfulAssignment.orderId; // Este es el shipday_order_id
        const localOrder = ordersInShipday.find(o => o.shipday_order_id == orderId);
        
        if (localOrder) {
          try {
            localOrder.shipday_driver_id = driverId;
            localOrder.status = 'shipped';
            await localOrder.save();
            
            results.successful.push({
              orderId: localOrder._id,
              orderNumber: localOrder.order_number,
              shipdayOrderId: orderId,
              driverId: driverId,
              message: 'Creado y asignado exitosamente'
            });
          } catch (dbError) {
            console.error(`❌ Error actualizando orden local ${localOrder.order_number}:`, dbError);
          }
        }
      }
      
      // Agregar fallos de asignación a los resultados
      for (const failedAssignment of assignmentResults.failed) {
        const orderId = failedAssignment.orderId; // Este es el shipday_order_id
        const localOrder = ordersInShipday.find(o => o.shipday_order_id == orderId);
        
        results.failed.push({
          orderId: localOrder?._id || 'unknown',
          orderNumber: localOrder?.order_number || 'unknown',
          shipdayOrderId: orderId,
          error: failedAssignment.error,
          step: 'assignment'
        });
      }
    }

    // Paso 5: Generar respuesta final
    const finalSummary = {
      total: results.total,
      successful: results.successful.length,
      failed: results.failed.length,
      alreadyInShipday: results.alreadyInShipday.length,
      createdNew: results.needsCreation.length,
      successRate: ((results.successful.length / results.total) * 100).toFixed(2) + '%'
    };

    console.log(`\n🏁 RESUMEN FINAL DE ASIGNACIÓN MASIVA:`);
    console.log(`📊 Total órdenes: ${finalSummary.total}`);
    console.log(`✅ Asignadas exitosamente: ${finalSummary.successful}`);
    console.log(`❌ Fallidas: ${finalSummary.failed}`);
    console.log(`🔄 Ya estaban en Shipday: ${finalSummary.alreadyInShipday}`);
    console.log(`🆕 Creadas nuevas: ${finalSummary.createdNew}`);
    console.log(`📈 Tasa de éxito: ${finalSummary.successRate}`);

    // Determinar código de estado HTTP
    const statusCode = results.failed.length === 0 ? 200 : 
                      results.successful.length > 0 ? 207 : // Multi-status
                      400; // Bad request

    res.status(statusCode).json({
      message: `Asignación masiva completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas.`,
      summary: finalSummary,
      details: {
        successful: results.successful,
        failed: results.failed,
        alreadyInShipday: results.alreadyInShipday.slice(0, 5), // Solo primeras 5 para no sobrecargar
        needsCreation: results.needsCreation.slice(0, 5)
      },
      driverId: driverId,
      processedAt: new Date().toISOString(),
      recommendations: results.failed.length > 0 ? [
        'Revisa los errores específicos en la sección "failed"',
        'Verifica que el conductor esté activo en Shipday',
        'Considera procesar las órdenes fallidas individualmente',
        results.failed.length > results.successful.length ? 'Contacta soporte de Shipday si persisten los errores' : null
      ].filter(Boolean) : [
        'Todas las asignaciones fueron exitosas',
        'Puedes verificar el estado en el dashboard de Shipday'
      ]
    });

  } catch (error) {
    console.error('❌ Error crítico en asignación masiva:', error);
    res.status(500).json({ 
      error: error.message || 'Error interno del servidor en asignación masiva',
      type: 'critical_error',
      timestamp: new Date().toISOString(),
      suggestion: 'Verifica la conectividad con Shipday y que los datos sean válidos'
    });
  }
});

// Preview de asignación masiva (verificar qué pedidos pueden ser asignados)
router.post('/orders/bulk-assignment-preview', authenticateToken, isAdmin, async (req, res) => {
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
router.post('/orders/bulk-assignment-status', authenticateToken, isAdmin, async (req, res) => {
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
router.post('/orders/bulk-unassign-driver', authenticateToken, isAdmin, async (req, res) => {
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
router.post('/orders/bulk-create-shipday', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }

    const orders = await Order.find({ 
      _id: { $in: orderIds },
      shipday_order_id: { $exists: false }
    }).populate('company_id');

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
          restaurantName: "enviGo",
          restaurantAddress: "santa hilda 1447, quilicura",
          customerEmail: order.customer_email || '',
          customerPhoneNumber: order.customer_phone || '',
          deliveryInstruction: order.notes || 'Sin instrucciones especiales',
          deliveryFee: 1800
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

// ==================== TRACKING DE PEDIDOS ====================

router.get('/orders/:orderId/tracking', authenticateToken, async (req, res) => {
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
    if (req.user.role !== 'admin' && req.user.company_id.toString() !== order.company_id._id.toString()) {
      console.log(`🚫 Sin permisos para ver orden: ${orderId}`);
      return res.status(403).json({ error: 'Sin permisos para ver este pedido' });
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

module.exports = router;