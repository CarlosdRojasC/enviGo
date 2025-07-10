const { ERRORS, ORDER_STATUS } = require('../config/constants');
const ExcelService = require('../services/excel.service');
const Order = require('../models/Order');
const Company = require('../models/Company');
const Channel = require('../models/Channel');
const mongoose = require('mongoose'); // Agregar esta línea
const ShipdayService = require('../services/shipday.service.js');
const XLSX = require('xlsx'); // <--- Añade esta línea aquí
const shippingZone = require('../config/ShippingZone');

class OrderController {
  async getAll(req, res) {
    try {
      const { 
        status, date_from, date_to, company_id, channel_id,
        search, shipping_commune, page = 1, limit = 50 
      } = req.query;

      const filters = {};

      if (req.user.role === 'admin') {
        if (company_id) {
            filters.company_id = new mongoose.Types.ObjectId(company_id);
        }
        // --> INICIO DE LA NUEVA LÓGICA <--
        // Si el admin no está filtrando por un estado específico,
        // ocultamos los pedidos que están 'pendientes'.
        if (!status) {
          filters.status = { $ne: 'pending' }; } 
          else {
          filters.status = status;
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

 if (shipping_commune) {
        // Usamos una expresión regular para que la búsqueda no sea sensible a mayúsculas/minúsculas
        filters.shipping_commune = new RegExp(shipping_commune, 'i');
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

if (order.shipday_order_id) {
        try {
          const shipdayOrderDetails = await ShipdayService.getOrder(order.shipday_order_id);
          order.shipday_details = shipdayOrderDetails._raw;
          order.delivery_note = shipdayOrderDetails._raw?.deliveryNote;
          order.podUrls = shipdayOrderDetails._raw?.podUrls || [];
          order.signatureUrl = shipdayOrderDetails._raw?.signatures?.[0]?.url;
          order.driver_info = shipdayOrderDetails._raw?.assignedCarrier;
          order.shipday_times = shipdayOrderDetails._raw?.activityLog;
          if (shipdayOrderDetails._raw?.proofOfDelivery?.location) {
            order.delivery_location = {
              lat: shipdayOrderDetails._raw.proofOfDelivery.location.latitude,
              lng: shipdayOrderDetails._raw.proofOfDelivery.location.longitude,
              formatted_address: shipdayOrderDetails._raw.proofOfDelivery.location.address
            };
          }
        } catch (shipdayError) {
          order.shipday_error = "No se pudieron obtener los detalles de Shipday.";
        }
      }
      // --- FIN DE LA LÓGICA AÑADIDA ---

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
      return res.status(400).json({ 
        error: 'Se requiere el ID del conductor.' 
      });
    }

    console.log(`🎯 Asignando conductor individual: orden ${orderId} → conductor ${driverId}`);

    // Obtener información de la orden
    const order = await Order.findById(orderId).populate('company_id');
    
    if (!order) {
      return res.status(404).json({ 
        error: 'Orden no encontrada en la base de datos.' 
      });
    }

    let shipdayOrderId = order.shipday_order_id;

    // Si no está en Shipday, crearla primero
    if (!shipdayOrderId) {
      console.log(`📦 Creando orden en Shipday antes de asignar...`);
      
      const orderDataForShipday = {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerAddress: order.shipping_address,
        customerEmail: order.customer_email,
        customerPhoneNumber: order.customer_phone,
        restaurantName: order.company_id?.name || 'enviGo',
        restaurantAddress: order.company_id?.address || 'santa hilda 1447, quilicura',
        deliveryInstruction: order.notes || '',
        deliveryFee: order.shipping_cost || 1800
      };

      const shipdayOrder = await ShipdayService.createOrder(orderDataForShipday);
      shipdayOrderId = shipdayOrder.orderId;

      // Actualizar la orden en la BD con el ID de Shipday
      order.shipday_order_id = shipdayOrderId;
      await order.save();

      console.log(`✅ Orden creada en Shipday: ${shipdayOrderId}`);
    }

    // ========== ASIGNACIÓN CON RETRY Y RATE LIMITING ==========
    console.log(`🚚 Asignando conductor a orden existente: ${shipdayOrderId}`);
    
    try {
      // Usar el método mejorado con rate limiting del servicio
      const assignmentResult = await ShipdayService.assignOrderWithValidation(shipdayOrderId, driverId);
      
      // Actualizar la orden en la BD con el conductor asignado
      order.shipday_driver_id = driverId;
      order.status = 'shipped'; // Cambiar estado a enviado
      await order.save();

      console.log('✅ Asignación individual exitosa:', {
        orderId: order._id,
        orderNumber: order.order_number,
        shipdayOrderId: shipdayOrderId,
        driverId: driverId
      });

      res.json({
        message: 'Conductor asignado exitosamente',
        order: {
          _id: order._id,
          order_number: order.order_number,
          shipday_order_id: shipdayOrderId,
          shipday_driver_id: driverId,
          status: order.status
        },
        shipday_result: assignmentResult,
        success: true
      });

    } catch (assignError) {
      console.error('❌ Error asignando conductor:', assignError);
      
      // Proporcionar información detallada del error
      res.status(400).json({ 
        error: `Error asignando conductor: ${assignError.message}`,
        details: assignError.message.includes('Límite de requests') 
          ? 'Rate limit de Shipday alcanzado. Por favor, espera unos minutos antes de intentar nuevamente.'
          : 'Error en la asignación. Verifica que el conductor esté disponible.',
        shipday_order_id: shipdayOrderId,
        suggestions: [
          '1. Espera 1-2 minutos antes de intentar nuevamente.',
          '2. Verifica que el conductor esté activo en Shipday.',
          '3. Si el problema persiste, contacta a soporte.',
        ]
      });
    }

  } catch (error) {
    console.error('❌ Error completo en assignToDriver:', error);
    res.status(500).json({ 
      error: error.message || 'Error interno del servidor en el proceso de asignación.',
    });
  }
}
  async downloadImportTemplate(req, res) {
    try {
      const excelBuffer = await ExcelService.generateImportTemplate();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=plantilla_importacion_pedidos.xlsx`);
      res.send(excelBuffer);
    } catch (error) {
      res.status(500).json({ error: 'Error generando la plantilla de importación' });
    }
  }
  async bulkUpload(req, res) {
    // 1. Verificar que el archivo fue subido
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    }

    // 2. Obtener el ID de la empresa desde el cuerpo de la petición
    const { company_id } = req.body;
    if (!company_id) {
        return res.status(400).json({ error: 'No se especificó la empresa para la subida masiva.' });
    }

    try {
      // 3. Leer el archivo Excel desde el buffer de memoria
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = { success: 0, failed: 0, errors: [] };

      // 4. Buscar el canal de venta de la empresa seleccionada
      // Asumimos que cada empresa tiene al menos un canal para asociar los pedidos
      const channel = await Channel.findOne({ company_id: company_id });
      if (!channel) {
        return res.status(400).json({ error: 'La empresa seleccionada no tiene un canal de venta configurado.' });
      }

      // 5. Recorrer cada fila del Excel y crear los pedidos
      for (const row of data) {
        try {
          const orderData = {
            company_id: company_id, // Usar el ID real
            channel_id: channel._id, // Usar el ID del canal encontrado
            external_order_id: String(row['ID Externo*'] || `MANUAL-${Date.now()}`),
            order_number: String(row['Número de Pedido*']),
            customer_name: String(row['Nombre Cliente*']),
            customer_email: String(row['Email Cliente'] || ''),
            customer_phone: String(row['Teléfono Cliente'] || ''),
            shipping_address: String(row['Dirección*']),
            shipping_commune: String(row['Ciudad*']), // El campo en Excel es "Ciudad"
            shipping_state: String(row['Estado/Región'] || 'RM'),
            total_amount: parseFloat(row['Monto Total*'] || 0),
            shipping_cost: parseFloat(row['Costo de Envío'] || 0),
            order_date: new Date(),
            status: 'pending',
            notes: String(row['Notas'] || '')
          };

          // Validación simple de campos obligatorios
          if (!orderData.order_number || !orderData.customer_name || !orderData.shipping_address) {
            throw new Error('Faltan campos obligatorios (Pedido, Cliente o Dirección)');
          }

          await Order.create(orderData);
          results.success++;

        } catch (rowError) {
          results.failed++;
          results.errors.push({ 
            order: row['Número de Pedido*'] || 'Fila sin número', 
            reason: rowError.message 
          });
        }
      }

      return res.status(200).json(results);

    } catch (error) {
      console.error('Error procesando archivo de subida masiva:', error);
      return res.status(500).json({ error: 'Error al leer el archivo Excel.' });
    }
  }
  async getAllCommunes(req, res) {
    try {
      // Combina todas las comunas de todas las zonas en una sola lista
      const allCommunes = Object.values(shippingZones).flat();
      
      // Elimina duplicados (por si acaso) y ordena alfabéticamente
      const uniqueCommunes = [...new Set(allCommunes)].sort();
      res.json(ShippingZone);
      res.json(uniqueCommunes);

    } catch (error) {
      console.error('Error obteniendo la lista de comunas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
module.exports = new OrderController();
