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
const driverController = require('../controllers/driver.controller');

const shipdayRoutes = require('./shipday.routes');
const ShipdayService = require('../services/shipday.service');

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

// Ruta para obtener todas las comunas disponibles
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

// DEBUG: Ruta para verificar datos de orden antes de enviar a Shipday
router.get('/orders/:orderId/debug-shipday', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('company_id')
      .populate('channel_id');
      
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    const debugInfo = {
      // Datos básicos de la orden
      order_basics: {
        _id: order._id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        shipping_address: order.shipping_address,
        total_amount: order.total_amount,
        shipping_cost: order.shipping_cost,
        status: order.status,
        shipday_order_id: order.shipday_order_id
      },
      
      // Datos de la empresa
      company_data: {
        company_id: order.company_id?._id,
        company_name: order.company_id?.name,
        company_phone: order.company_id?.phone,
        company_email: order.company_id?.email,
        company_address: order.company_id?.address
      },
      
      // Datos del canal
      channel_data: {
        channel_id: order.channel_id?._id,
        channel_name: order.channel_id?.channel_name,
        channel_type: order.channel_id?.channel_type
      },
      
      // Payload que se enviaría a Shipday
      shipday_payload_preview: {
        orderNumber: order.order_number,
        customerName: order.customer_name || 'Cliente Sin Nombre',
        customerAddress: order.shipping_address || 'Dirección no especificada',
        customerEmail: order.customer_email || '',
        customerPhoneNumber: order.customer_phone || '',
        deliveryInstruction: order.notes || 'Sin instrucciones especiales',
        
        // CRÍTICO: Datos del restaurante
        restaurantName: order.company_id?.name || 'Tienda Principal',
        restaurantAddress: order.pickup_address || order.shipping_address || 'Dirección no especificada',
        restaurantPhoneNumber: order.company_id?.phone || '',
        
        // Financiero
        deliveryFee: parseFloat(order.shipping_cost) || 1,
        total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
        paymentMethod: order.payment_method || 'CASH',
        
        // Items
        orderItems: [
          {
            name: `Pedido ${order.order_number}`,
            quantity: order.items_count || 1,
            price: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1
          }
        ]
      },
      
      // Validaciones
      validations: {
        has_company: !!order.company_id,
        has_company_name: !!(order.company_id?.name),
        company_name_not_empty: !!(order.company_id?.name && order.company_id.name.trim() !== ''),
        has_customer_name: !!order.customer_name,
        has_shipping_address: !!order.shipping_address,
        restaurant_name_final: order.company_id?.name || 'Tienda Principal',
        all_required_fields_ok: !!(
          order.order_number &&
          (order.customer_name || 'Cliente Sin Nombre') &&
          (order.shipping_address || 'Dirección no especificada') &&
          (order.company_id?.name || 'Tienda Principal')
        )
      }
    };

    res.json({
      success: true,
      debug_info: debugInfo,
      recommendations: debugInfo.validations.all_required_fields_ok 
        ? ['✅ Todos los campos requeridos están presentes']
        : [
            '❌ Faltan campos requeridos:',
            !order.order_number && '- order_number',
            !order.customer_name && '- customer_name',
            !order.shipping_address && '- shipping_address',
            !(order.company_id?.name) && '- company name'
          ].filter(Boolean)
    });

  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:id', authenticateToken, validateMongoId('id'), orderController.getById);
router.patch('/orders/:id/status', authenticateToken, validateMongoId('id'), isAdmin, orderController.updateStatus);

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

// ==================== NUEVAS RUTAS PARA ASIGNACIÓN MASIVA ====================

// Asignar múltiples pedidos a un conductor de forma masiva
router.post('/orders/bulk-assign-driver', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderIds, driverId } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de órdenes.' });
    }

    if (!driverId) {
      return res.status(400).json({ error: 'Se requiere el ID del conductor.' });
    }

    console.log(`🚀 Iniciando asignación masiva: ${orderIds.length} pedidos al conductor ${driverId}`);

    const results = {
      successful: [],
      failed: [],
      total: orderIds.length
    };

    // Procesar cada orden secuencialmente
    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      
      try {
        console.log(`📦 Procesando orden ${i + 1}/${orderIds.length}: ${orderId}`);
        
        // Obtener información de la orden
        const order = await Order.findById(orderId).populate('company_id');
        
        if (!order) {
          results.failed.push({
            orderId,
            orderNumber: 'No encontrado',
            error: 'Orden no encontrada en la base de datos'
          });
          continue;
        }

        if (order.shipday_order_id) {
          results.failed.push({
            orderId,
            orderNumber: order.order_number,
            error: 'La orden ya está asignada en Shipday'
          });
          continue;
        }

        // Usar el mismo método que funciona individualmente
        let shipdayOrderId = order.shipday_order_id;

        // Si no está en Shipday, crearla primero
        if (!shipdayOrderId) {
          const orderDataForShipday = {
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerAddress: order.shipping_address,
            restaurantName: order.company_id?.name || 'Tienda Principal',
            restaurantAddress: order.company_id?.address || order.shipping_address,
            customerPhoneNumber: order.customer_phone || '',
            deliveryInstruction: order.notes || '',
            deliveryFee: parseFloat(order.shipping_cost) || 0,
            total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
            paymentMethod: order.payment_method || 'CASH'
          };
          
          const createdShipdayOrder = await ShipdayService.createOrder(orderDataForShipday);
          
          if (!createdShipdayOrder || !createdShipdayOrder.orderId) {
            results.failed.push({
              orderId,
              orderNumber: order.order_number,
              error: 'No se pudo crear la orden en Shipday'
            });
            continue;
          }
          
          shipdayOrderId = createdShipdayOrder.orderId;
          order.shipday_order_id = shipdayOrderId;
          order.status = 'processing';
          await order.save();
        }

        // Asignar conductor usando el método que funciona
        await ShipdayService.assignOrderNewUrl(shipdayOrderId, driverId);
        
        // Actualizar orden local
        order.shipday_driver_id = driverId;
        order.status = 'shipped';
        await order.save();

        results.successful.push({
          orderId,
          orderNumber: order.order_number,
          shipdayOrderId: shipdayOrderId,
          message: 'Asignado exitosamente'
        });

        console.log(`✅ Orden ${order.order_number} asignada exitosamente`);

      } catch (error) {
        console.error(`❌ Error procesando orden ${orderId}:`, error);
        
        results.failed.push({
          orderId,
          orderNumber: 'Error',
          error: error.message || 'Error desconocido'
        });
      }

      // Pausa pequeña entre asignaciones para no sobrecargar
      if (i < orderIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('🏁 Asignación masiva completada:', {
      total: results.total,
      successful: results.successful.length,
      failed: results.failed.length
    });

    res.status(200).json({
      message: `Asignación masiva completada: ${results.successful.length} exitosas, ${results.failed.length} fallidas.`,
      results,
      summary: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        success_rate: Math.round((results.successful.length / results.total) * 100)
      }
    });

  } catch (error) {
    console.error('❌ Error en asignación masiva:', error);
    res.status(500).json({ 
      error: error.message || 'Error interno del servidor en asignación masiva',
      details: 'Error procesando la asignación masiva'
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

// ==================== DEBUG: PROBAR ENDPOINT OFICIAL DE SHIPDAY ====================

// Ruta para probar directamente el endpoint oficial de asignación
router.post('/shipday/test-assign/:orderId/:driverId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId, driverId } = req.params;
    
    console.log(`🧪 TEST: Probando endpoint oficial PUT /orders/${orderId}/assign con conductor ${driverId}`);
    
    // Primero validar que el conductor existe
    const driver = await ShipdayService.getValidatedDriver(driverId);
    console.log('✅ Conductor validado:', driver);
    
    // Luego verificar que la orden existe
    const orderInfo = await ShipdayService.getOrder(orderId);
    console.log('✅ Orden encontrada:', {
      orderId: orderInfo.orderId,
      customerName: orderInfo.customerName,
      hasCurrentDriver: !!(orderInfo.carrierId || orderInfo.carrierEmail)
    });
    
    // Probar asignación usando método oficial
    const result = await ShipdayService.assignOrder(orderId, driverId);
    
    // Verificar resultado
    const verification = await ShipdayService.verifyOrderAssignment(orderId);
    
    res.json({
      test_result: 'success',
      endpoint_tested: `PUT /orders/${orderId}/assign`,
      driver_info: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        isActive: driver.isActive
      },
      assignment_result: result,
      verification: verification,
      conclusion: verification.hasDriverAssigned ? 
        'Asignación exitosa según documentación oficial' : 
        'La asignación no se reflejó inmediatamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en test de endpoint oficial:', error);
    
    res.status(500).json({
      test_result: 'failed',
      endpoint_tested: `PUT /orders/${req.params.orderId}/assign`,
      error: error.message,
      error_details: {
        status: error.response?.status,
        data: error.response?.data
      },
      troubleshooting: [
        'Verificar que la orden existe en Shipday',
        'Comprobar que el conductor existe y está activo',
        'Revisar que la API Key tiene permisos de asignación',
        'Consultar documentación: https://docs.shipday.com/reference/assign-order'
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta para obtener información detallada de una orden en Shipday
router.get('/shipday/order-info/:orderId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log(`🔍 Obteniendo información detallada de orden ${orderId}...`);
    
    const orderInfo = await ShipdayService.debugOrder(orderId);
    
    res.json({
      shipday_order_id: orderId,
      order_info: orderInfo,
      driver_assignment: {
        has_driver: !!(orderInfo.carrierId || orderInfo.carrierEmail),
        driver_id: orderInfo.carrierId,
        driver_email: orderInfo.carrierEmail
      },
      order_status: orderInfo.orderStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo info de orden:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para listar conductores disponibles con detalles
router.get('/shipday/drivers-detailed', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🔍 Obteniendo lista detallada de conductores...');
    
    const drivers = await ShipdayService.getDrivers();
    
    const driversAnalysis = drivers.map(driver => ({
      id: driver.id,
      carrierId: driver.carrierId,
      name: driver.name,
      email: driver.email,
      isActive: driver.isActive,
      isOnShift: driver.isOnShift,
      status: driver.status,
      canBeAssigned: driver.isActive && !driver.isOnShift,
      phoneNumber: driver.phoneNumber
    }));
    
    const summary = {
      total: drivers.length,
      active: drivers.filter(d => d.isActive).length,
      available: drivers.filter(d => d.isActive && !d.isOnShift).length,
      onShift: drivers.filter(d => d.isOnShift).length,
      inactive: drivers.filter(d => !d.isActive).length
    };
    
    res.json({
      summary,
      drivers: driversAnalysis,
      recommendations: summary.available > 0 ? 
        [`Hay ${summary.available} conductores disponibles para asignación`] :
        [
          'No hay conductores disponibles',
          'Verifica que los conductores estén activos',
          'Algunos conductores pueden estar en turno'
        ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo conductores:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== INVESTIGACIÓN COMPLETA DE SHIPDAY API ====================

router.get('/shipday/full-investigation', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🔬 INICIANDO INVESTIGACIÓN COMPLETA DE SHIPDAY API...');
    
    const investigation = await ShipdayService.investigateAPIEndpoints();
    
    res.json({
      investigation_timestamp: new Date().toISOString(),
      shipday_base_url: 'https://api.shipday.com',
      investigation_results: investigation,
      summary: {
        api_accessible: investigation.api_info ? true : false,
        order_endpoints_working: Object.values(investigation.order_endpoints || {}).some(e => e.status === 'success'),
        assignment_endpoints_working: Object.values(investigation.assignment_endpoints || {}).some(e => e.status === 'success'),
        conclusion: investigation.conclusion
      },
      next_actions: investigation.conclusion?.working_assign_endpoint !== 'none' ? [
        'Implementar el endpoint de asignación que funciona',
        'Actualizar el método assignOrder en el servicio',
        'Probar la asignación con el nuevo método'
      ] : [
        'Contactar soporte de Shipday',
        'Verificar plan y permisos de API',
        'Considerar asignación manual desde dashboard web'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error en investigación completa:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Verificar conectividad básica con Shipday'
    });
  }
});

// Ruta más simple para probar conectividad básica
router.get('/shipday/basic-test', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🧪 Prueba básica de Shipday...');
    
    // Probar obtener órdenes (sabemos que esto funciona)
    const orders = await ShipdayService.getOrders();
    const drivers = await ShipdayService.getDrivers();
    
    res.json({
      test_result: 'success',
      connectivity: 'OK',
      orders_endpoint: 'working',
      drivers_endpoint: 'working',
      orders_count: Array.isArray(orders) ? orders.length : 'unknown',
      drivers_count: Array.isArray(drivers) ? drivers.length : 'unknown',
      next_step: 'Run full investigation to find working assignment endpoint',
      investigation_url: '/api/shipday/full-investigation'
    });
    
  } catch (error) {
    console.error('❌ Error en prueba básica:', error);
    res.status(500).json({ 
      test_result: 'failed',
      error: error.message 
    });
  }
});

module.exports = router;