const { ERRORS, ORDER_STATUS } = require('../config/constants');
const ExcelService = require('../services/excel.service');
const Order = require('../models/Order');
const Company = require('../models/Company');
const Channel = require('../models/Channel');
const mongoose = require('mongoose'); // Agregar esta línea

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
          filters.company_id = company_id;  
        }
      } else {
        if (req.user.company_id) {
          filters.company_id = req.user.company_id;  // Usar new aquí
        }
      }

      if (status) filters.status = status;
      if (channel_id) filters.channel_id = channel_id; // Usar new aquí

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
        shipping_zip,
        total_amount,
        shipping_cost,
        notes
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
        shipping_zip,
        total_amount,
        shipping_cost,
        items_count: 0,
        order_date: new Date(),
        notes,
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
      // 1. Quitamos el valor por defecto para 'status'
      const { date_from, date_to, company_id, status } = req.query;

      // 2. Empezamos con un objeto de filtros VACÍO
      const filters = {};

      // 3. AÑADIMOS EL FILTRO DE ESTADO SÓLO SI EXISTE
      if (status) {
        filters.status = status;
      }

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

      const orders = await Order.find(filters) // Ahora 'filters' estará vacío si no se envían parámetros
        .populate('company_id', 'name')
        .populate('channel_id', 'channel_name')
        .sort({ shipping_city: 1, shipping_address: 1 })
        .lean();

      if (orders.length === 0) {
        return res.status(404).json({ error: 'No se encontraron pedidos para los filtros seleccionados' });
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
    }
}
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
}

module.exports = new OrderController();
