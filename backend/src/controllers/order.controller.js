const { ERRORS, ORDER_STATUS } = require('../config/constants');
const ExcelService = require('../services/excel.service');
const Order = require('../models/Order');
const Company = require('../models/Company');
const Channel = require('../models/Channel');
const mongoose = require('mongoose'); // Agregar esta línea
const ShipdayService = require('../services/shipday.service.js');

class OrderController {
  async getAll(req, res) {
    try {
      const { 
        status, date_from, date_to, company_id, channel_id,
        search, page = 1, limit = 50 
      } = req.query;

      const filters = {};

      if (req.user.role === 'admin') {
        if (company_id) {
            filters.company_id = new mongoose.Types.ObjectId(company_id);
        }
      } else {
        if (req.user.company_id) {
          filters.company_id = new mongoose.Types.ObjectId(req.user.company_id);
        }
      }

      if (status) filters.status = status;
      if (channel_id) filters.channel_id = new mongoose.Types.ObjectId(channel_id);

      if (date_from || date_to) {
        filters.order_date = {};
        if (date_from) filters.order_date.$gte = new Date(date_from);
        if (date_to) filters.order_date.$lte = new Date(date_to);
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filters.$or = [
          { order_number: searchRegex },
          { customer_name: searchRegex },
          { customer_email: searchRegex },
          { external_order_id: searchRegex }
        ];
      }

      const skip = (page - 1) * limit;

      console.log('Filtros finales aplicados:', JSON.stringify(filters, null, 2));

      const [orders, totalCount] = await Promise.all([
        Order.find(filters)
          .populate('company_id', 'name price_per_order')
          .populate('channel_id', 'channel_type channel_name')
          .sort({ order_date: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Order.countDocuments(filters)
      ]);

      res.json({
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error obteniendo pedidos:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findById(id)
        .populate('company_id', 'name price_per_order')
        .populate('channel_id', 'channel_type channel_name store_url')
        .lean();

      if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== order.company_id._id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      res.json(order);
    } catch (error) {
      console.error('Error obteniendo pedido:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(ORDER_STATUS).includes(status)) {
        return res.status(400).json({ error: 'Estado no válido' });
      }

      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== order.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      if ((order.status === 'delivered' || order.status === 'cancelled') && status !== order.status) {
        return res.status(400).json({ error: 'No se puede cambiar el estado de un pedido entregado o cancelado' });
      }

      order.status = status;
      if (status === 'delivered') order.delivery_date = new Date();
      order.updated_at = new Date();

      await order.save();

      res.json({ message: 'Estado actualizado exitosamente', order });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  async create(req, res) {
    try {
      const {
        channel_id,
        external_order_id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_document,
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_commune,
        shipping_zip,
        total_amount,
        shipping_cost,
        notes,
        priority, serviceTime, timeWindowStart, timeWindowEnd, 
        load1Packages, load2WeightKg
      } = req.body;

      const channel = await Channel.findOne({ _id: channel_id, is_active: true });
      if (!channel) return res.status(400).json({ error: 'Canal de venta no válido' });

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const existsOrder = await Order.findOne({ external_order_id, channel_id });
      if (existsOrder) {
        return res.status(400).json({ error: 'Ya existe un pedido con ese ID externo en este canal' });
      }

      const order = new Order({
        company_id: channel.company_id,
        channel_id,
        external_order_id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_document,
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_commune,
        shipping_zip,
        total_amount,
        shipping_cost,
        items_count: 0,
        order_date: new Date(),
        notes,
        priority,
        serviceTime,
        timeWindowStart,
        timeWindowEnd,
        load1Packages,
        load2WeightKg,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      await order.save();

      res.status(201).json({ message: 'Pedido creado exitosamente', order });
    } catch (error) {
      console.error('Error creando pedido:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

async exportForOptiRoute(req, res) {
    // Esta ruta ahora es solo para administradores
    try {
      const { date_from, date_to, company_id, status } = req.query;

      const filters = {};

      if (status) {
        filters.status = status;
      }
      
      // El admin puede filtrar por una empresa específica
      if (company_id) {
        filters.company_id = company_id;
      }

      if (date_from || date_to) {
        filters.order_date = {};
        if (date_from) filters.order_date.$gte = new Date(date_from);
        if (date_to) filters.order_date.$lte = new Date(date_to);
      }

      const orders = await Order.find(filters)
        .populate('company_id', 'name')
        .populate('channel_id', 'channel_name')
        .sort({ shipping_city: 1, shipping_address: 1 })
        .lean();

      if (orders.length === 0) {
        return res.status(404).json({ error: 'No se encontraron pedidos para exportar con los filtros aplicados' });
      }

      const excelBuffer = await ExcelService.generateOptiRouteExport(orders);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=optiroute_export_${Date.now()}.xlsx`
      );

      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exportando para OptiRoute:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }}
  async getStats(req, res) {
    try {
      const { company_id, date_from, date_to } = req.query;

      const filters = {};

      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      } else if (company_id) {
        filters.company_id = company_id;
      }

      if (date_from || date_to) {
        filters.order_date = {};
        if (date_from) filters.order_date.$gte = new Date(date_from);
        if (date_to) filters.order_date.$lte = new Date(date_to);
      }

      const stats = await Order.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            total_orders: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
            shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            total_revenue: { $sum: '$total_amount' },
            avg_order_value: { $avg: '$total_amount' },
            days_with_orders: {
              $addToSet: {
                $dateToString: { format: '%Y-%m-%d', date: '$order_date' }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            total_orders: 1,
            pending: 1,
            processing: 1,
            shipped: 1,
            delivered: 1,
            cancelled: 1,
            total_revenue: 1,
            avg_order_value: 1,
            days_with_orders: { $size: '$days_with_orders' }
          }
        }
      ]);

      res.json(stats[0] || {
        total_orders: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        total_revenue: 0,
        avg_order_value: 0,
        days_with_orders: 0
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
async getOrdersTrend(req, res) {
      try {
    const { period = '30d' } = req.query;
    const filters = {};

    if (req.user.role !== 'admin') {
      filters.company_id = new mongoose.Types.ObjectId(req.user.company_id);
    }

    // ✅ CORRECCIÓN: Se crea una nueva fecha en cada cálculo para evitar modificar la original.
    const now = new Date();
    let startDate = new Date(); // Inicializamos con la fecha actual

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '90d':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '30d':
      default:
        startDate.setDate(now.getDate() - 30);
        break;
    }
    
    // Aseguramos que la hora se vaya al inicio del día para incluir todos los pedidos de ese día
    startDate.setHours(0, 0, 0, 0);

    filters.order_date = { $gte: startDate };

    const trendData = await Order.aggregate([
      { $match: filters },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$order_date' } },
          orders: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          orders: '$orders'
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    res.json(trendData);
      } catch (error) {
    console.error('Error obteniendo tendencia de pedidos:', error);
    res.status(500).json({ error: ERRORS.SERVER_ERROR });
  }
}

/**
   * DEBUG: assignToDriver con logging completo
   */
  async assignToDriver(req, res) {
    try {
      const { orderId } = req.params;
      const { driverId } = req.body;

      console.log('🔍 DEBUG - assignToDriver iniciado:', { orderId, driverId });

      if (!driverId) {
        return res.status(400).json({ error: 'Se requiere el ID del conductor de Shipday.' });
      }

      // Obtener orden con población completa
      const order = await Order.findById(orderId)
        .populate('company_id')
        .populate('channel_id');
        
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      console.log('📋 DEBUG - Orden encontrada:', {
        order_number: order.order_number,
        company_id: order.company_id,
        customer_name: order.customer_name,
        shipping_address: order.shipping_address,
        shipday_order_id: order.shipday_order_id
      });

      let result;

      // Caso 1: Crear y asignar
      if (!order.shipday_order_id) {
        console.log('📦 DEBUG - Creando nueva orden en Shipday...');
        
        // Verificar datos de empresa
        if (!order.company_id) {
          console.error('❌ CRÍTICO: Orden sin company_id');
          return res.status(400).json({ error: 'Orden sin empresa asociada' });
        }

        console.log('🏢 DEBUG - Datos de empresa:', {
          _id: order.company_id._id,
          name: order.company_id.name,
          phone: order.company_id.phone
        });
        
        // Preparar orden enriquecida
        const enrichedOrder = {
          ...order.toObject(),
          company_name: order.company_id.name || 'Tienda Principal',
          company_phone: order.company_id.phone || '',
          pickup_address: order.pickup_address || order.shipping_address,
        };
        
        console.log('💎 DEBUG - Orden enriquecida:', {
          order_number: enrichedOrder.order_number,
          company_name: enrichedOrder.company_name,
          company_phone: enrichedOrder.company_phone,
          customer_name: enrichedOrder.customer_name,
          shipping_address: enrichedOrder.shipping_address,
          total_amount: enrichedOrder.total_amount,
          shipping_cost: enrichedOrder.shipping_cost
        });
        
        try {
          result = await ShipdayService.createAndAssignOrder(enrichedOrder, driverId);
          console.log('✅ DEBUG - Resultado de createAndAssignOrder:', result);
        } catch (shipdayError) {
          console.error('❌ DEBUG - Error en Shipday:', shipdayError);
          return res.status(400).json({ 
            error: 'Error en Shipday: ' + shipdayError.message,
            details: shipdayError.message
          });
        }
        
        // Verificar resultado
        if (!result.success || result.order?.success === false) {
          console.error('❌ DEBUG - Shipday retornó error:', result);
          return res.status(400).json({ 
            error: 'Error en Shipday: ' + (result.order?.response || result.message || 'Error desconocido'),
            shipday_error: result.order,
            full_result: result
          });
        }
        
        res.status(200).json({ 
          message: 'Pedido creado y asignado en Shipday exitosamente.',
          shipday_order_id: result.order?.orderId,
          success: true,
          debug_info: {
            company_name: enrichedOrder.company_name,
            restaurant_name_sent: enrichedOrder.company_name
          }
        });
      } 
      // Caso 2: Solo asignar
      else {
        console.log('👨‍💼 DEBUG - Asignando a orden existente...');
        
        const drivers = await ShipdayService.getDrivers();
        const driver = drivers.find(d => d.id === driverId || d.carrierId === driverId);
        
        if (!driver) {
          return res.status(404).json({ error: 'Conductor no encontrado en Shipday.' });
        }

        await ShipdayService.assignOrder(order.shipday_order_id, driver.email);
        
        order.shipday_driver_id = driverId;
        order.status = 'shipped';
        await order.save();

        res.status(200).json({ 
          message: 'Conductor asignado exitosamente a la orden existente.',
          order_id: order.shipday_order_id,
          driver_email: driver.email,
          success: true
        });
      }

    } catch (error) {
      console.error('❌ DEBUG - Error completo en assignToDriver:', error);
      
      let errorMessage = 'Error interno del servidor';
      
      if (error.message.includes('Column') && error.message.includes('cannot be null')) {
        errorMessage = 'Error en Shipday: Faltan datos del restaurante. Verifica que la empresa tenga nombre configurado.';
      } else if (error.message.includes('API Key')) {
        errorMessage = 'Error de autenticación con Shipday. Verifica tu API Key.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        error: errorMessage,
        debug_details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }

  /**
   * MEJORADO: Método para crear en Shipday sin asignar conductor
   */
  async createInShipday(req, res) {
    try {
      const { orderId } = req.params;

      const order = await Order.findById(orderId)
        .populate('company_id', 'name phone')
        .populate('channel_id', 'channel_name');
        
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      if (order.shipday_order_id) {
        return res.status(400).json({ error: 'Este pedido ya está en Shipday.' });
      }

      // Crear en Shipday sin asignar conductor
      const shipdayData = {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerAddress: order.shipping_address,
        customerEmail: order.customer_email || '',
        customerPhoneNumber: order.customer_phone || '',
        deliveryInstruction: order.notes || 'Sin instrucciones especiales',
        
        // Información del restaurante
        restaurantName: order.company_id?.name || 'Tienda Principal',
        restaurantAddress: order.shipping_address, // Por defecto
        restaurantPhoneNumber: order.company_id?.phone || '',
        
        // Información financiera
        deliveryFee: parseFloat(order.shipping_cost) || 0,
        total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 0,
        paymentMethod: 'CASH',
        
        // Items básicos
        orderItems: [
          {
            name: `Pedido ${order.order_number}`,
            quantity: order.items_count || 1,
            price: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 0
          }
        ]
      };

      const shipdayOrder = await ShipdayService.createOrder(shipdayData);

      // Verificar respuesta de Shipday
      if (!shipdayOrder.success || shipdayOrder.success === false) {
        return res.status(400).json({ 
          error: 'Error en Shipday: ' + (shipdayOrder.response || 'Error desconocido'),
          shipday_error: shipdayOrder
        });
      }

      // Actualizar orden local
      order.shipday_order_id = shipdayOrder.orderId;
      order.status = 'processing';
      await order.save();

      res.status(200).json({ 
        message: 'Pedido creado en Shipday exitosamente.',
        shipday_order_id: shipdayOrder.orderId,
        success: true
      });

    } catch (error) {
      console.error('Error creando pedido en Shipday:', error);
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  }
}
module.exports = new OrderController();
