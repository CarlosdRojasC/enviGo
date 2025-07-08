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
    try {
      const { date_from, date_to, company_id, status } = req.query;

      const filters = {};

      if (status) {
        filters.status = status;
      }
      
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

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=optiroute_export_${Date.now()}.xlsx`);
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exportando para OptiRoute:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
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

   async assignToDriver(req, res) {
    try {
      const { orderId } = req.params;
      const { driverId } = req.body;

      if (!driverId) {
        return res.status(400).json({ error: 'Se requiere el ID del conductor de Shipday.' });
      }

      console.log('🔍 assignToDriver iniciado (docs oficiales):', { orderId, driverId });

      // Obtener orden con población completa
      const order = await Order.findById(orderId).populate('company_id');

      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }
      
      if (!order.company_id) {
        return res.status(400).json({ error: 'El pedido no está asociado a ninguna empresa.' });
      }

      console.log('📋 Orden encontrada:', {
        order_number: order.order_number,
        company_name: order.company_id.name,
        customer_name: order.customer_name,
        shipday_order_id: order.shipday_order_id
      });

      // CASO 1: La orden NO está en Shipday → Crear primero, luego asignar
      if (!order.shipday_order_id) {
        console.log('📦 Paso 1: Creando orden en Shipday...');
        
        const orderDataForShipday = {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerAddress: order.shipping_address,
          restaurantName: order.company_id.name,
          restaurantAddress: order.company_id.address || order.shipping_address,
          customerPhoneNumber: order.customer_phone || '',
          deliveryInstruction: order.notes || '',
          
          // Información financiera básica
          deliveryFee: parseFloat(order.shipping_cost) || 0,
          total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
          paymentMethod: order.payment_method || 'CASH'
        };
        
        console.log('📦 Datos para crear orden:', orderDataForShipday);
        
        const createdShipdayOrder = await ShipdayService.createOrder(orderDataForShipday);
        
        if (!createdShipdayOrder || !createdShipdayOrder.orderId) {
          throw new Error('No se pudo crear la orden en Shipday o la respuesta no incluyó un orderId.');
        }
        
        const shipdayOrderId = createdShipdayOrder.orderId;
        console.log(`✅ Orden creada en Shipday con ID: ${shipdayOrderId}`);

        // Actualizar la orden local con el ID de Shipday
        order.shipday_order_id = shipdayOrderId;
        order.status = 'processing';
        await order.save();

        console.log('👨‍💼 Paso 2: Asignando conductor usando docs oficiales...');
        
        try {
          // Usar el método que sigue la documentación oficial
          const assignmentResult = await ShipdayService.assignOrderWithValidation(shipdayOrderId, driverId);
          
          console.log('✅ Asignación exitosa:', assignmentResult);
          
          // Actualizar orden local con conductor asignado
          order.shipday_driver_id = driverId;
          order.status = 'shipped';
          await order.save();

          res.status(200).json({ 
            message: 'Pedido creado y conductor asignado exitosamente.',
            shipday_order_id: shipdayOrderId,
            driver_info: {
              id: assignmentResult.driverId,
              name: assignmentResult.driverName,
              email: assignmentResult.driverEmail
            },
            assignment_method: 'official_documentation',
            success: true
          });
          
        } catch (assignError) {
          console.error('❌ Error asignando conductor:', assignError);
          
          // La orden se creó pero falló la asignación
          res.status(200).json({ 
            message: `Orden creada en Shipday (ID: ${shipdayOrderId}) pero falló la asignación del conductor.`,
            shipday_order_id: shipdayOrderId,
            assignment_error: assignError.message,
            manual_assignment_required: true,
            instructions: [
              '1. Ve al dashboard de Shipday',
              '2. Busca la orden con ID: ' + shipdayOrderId,
              '3. Asigna el conductor manualmente',
              '4. Verifica que el conductor esté activo y disponible'
            ],
            success: true // La orden se creó exitosamente
          });
        }
      } 
      // CASO 2: La orden YA está en Shipday → Solo asignar conductor
      else {
        console.log('👨‍💼 Orden ya existe en Shipday, asignando conductor...');
        
        try {
          const assignmentResult = await ShipdayService.assignOrderWithValidation(order.shipday_order_id, driverId);
          
          console.log('✅ Asignación exitosa:', assignmentResult);
          
          // Actualizar orden local
          order.shipday_driver_id = driverId;
          order.status = 'shipped';
          await order.save();

          res.status(200).json({ 
            message: 'Conductor asignado exitosamente a la orden existente.',
            shipday_order_id: order.shipday_order_id,
            driver_info: {
              id: assignmentResult.driverId,
              name: assignmentResult.driverName,
              email: assignmentResult.driverEmail
            },
            assignment_method: 'official_documentation',
            success: true
          });
          
        } catch (assignError) {
          console.error('❌ Error asignando a orden existente:', assignError);
          
          res.status(400).json({ 
            error: `Error asignando conductor: ${assignError.message}`,
            shipday_order_id: order.shipday_order_id,
            suggestions: [
              'Verificar que el conductor existe y está activo en Shipday',
              'Comprobar que la orden no está ya asignada a otro conductor',
              'Intentar la asignación manualmente desde el dashboard de Shipday'
            ],
            debug_info: {
              driverId: driverId,
              orderId: order.shipday_order_id
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ Error completo en assignToDriver:', error);
      
      let errorMessage = 'Error interno del servidor';
      let suggestions = [];
      
      if (error.message.includes('no encontrado')) {
        errorMessage = 'Conductor o orden no encontrado en Shipday.';
        suggestions = [
          'Verificar que el conductor existe en Shipday',
          'Comprobar que la orden se creó correctamente',
          'Revisar los logs del servidor para más detalles'
        ];
      } else if (error.message.includes('no está activo')) {
        errorMessage = 'El conductor seleccionado no está activo.';
        suggestions = [
          'Activar el conductor desde el dashboard de Shipday',
          'Seleccionar un conductor diferente que esté activo'
        ];
      } else if (error.message.includes('API Key')) {
        errorMessage = 'Error de autenticación con Shipday.';
        suggestions = [
          'Verificar que la API Key de Shipday sea correcta',
          'Comprobar los permisos de la API Key'
        ];
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        error: errorMessage,
        suggestions: suggestions,
        documentation: 'https://docs.shipday.com/reference/assign-order',
        debug_details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }


  /**
   * Crea una orden en Shipday sin asignar conductor.
   */
  async createInShipday(req, res) {
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
        restaurantName: order.company_id.name,
        restaurantAddress: order.company_id.address,
      };

      const shipdayOrder = await ShipdayService.createOrder(shipdayData);

      if (!shipdayOrder.success) {
        return res.status(400).json({ error: 'Error en Shipday: ' + (shipdayOrder.response || 'Error desconocido') });
      }

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
  }
}
module.exports = new OrderController();
