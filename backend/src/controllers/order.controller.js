const { ERRORS, ORDER_STATUS } = require('../config/constants');
const ExcelService = require('../services/excel.service');
const Order = require('../models/Order');
const Company = require('../models/Company');
const Channel = require('../models/Channel');
const Notification = require('../models/Notification');

const mongoose = require('mongoose'); // Agregar esta línea
const ShipdayService = require('../services/shipday.service.js');
const XLSX = require('xlsx'); // <--- Añade esta línea aquí
const shippingZone = require('../config/ShippingZone');
const circuitController = require('./circuit.controller');


class OrderController {
async getAll(req, res) {
  try {
    const { 
      status, date_from, date_to, company_id, channel_id,
      search, shipping_commune, page = 1, limit = 50 
    } = req.query;

    console.log('🔍 Parámetros recibidos:', { status, date_from, date_to, company_id, channel_id, search, shipping_commune });

    const filters = {};

    // ✅ VALIDACIÓN Y APLICACIÓN DE FILTROS
    if (req.user.role === 'admin') {
      if (company_id && company_id !== '' && company_id !== 'undefined' && company_id !== 'null') {
        // ✅ VALIDAR QUE SEA UN OBJECTID VÁLIDO
        if (!mongoose.Types.ObjectId.isValid(company_id)) {
          console.error('❌ company_id inválido:', company_id);
          return res.status(400).json({ 
            error: 'ID de empresa inválido',
            details: `El company_id "${company_id}" no es válido`
          });
        }
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }
      
      // Si el admin no está filtrando por un estado específico,
      // se pueden aplicar lógicas adicionales aquí
      if (status) {
        filters.status = status;
      }
    } else {
      // Para usuarios no admin, usar su company_id
      if (req.user.company_id) {
        if (!mongoose.Types.ObjectId.isValid(req.user.company_id)) {
          console.error('❌ company_id del usuario inválido:', req.user.company_id);
          return res.status(500).json({ 
            error: 'Error de configuración del usuario'
          });
        }
        filters.company_id = new mongoose.Types.ObjectId(req.user.company_id);
      }
    }

    // ✅ VALIDAR Y APLICAR FILTRO DE STATUS
    if (status && status !== '' && status !== 'undefined' && status !== 'null') {
      filters.status = status;
    }

    // ✅ VALIDAR Y APLICAR FILTRO DE CHANNEL
    if (channel_id && channel_id !== '' && channel_id !== 'undefined' && channel_id !== 'null') {
      if (!mongoose.Types.ObjectId.isValid(channel_id)) {
        console.error('❌ channel_id inválido:', channel_id);
        return res.status(400).json({ 
          error: 'ID de canal inválido',
          details: `El channel_id "${channel_id}" no es válido`
        });
      }
      filters.channel_id = new mongoose.Types.ObjectId(channel_id);
    }

    // ✅ FILTRO DE FECHAS CON VALIDACIÓN
    if (date_from || date_to) {
      filters.order_date = {};
      
      if (date_from && date_from !== '' && date_from !== 'undefined') {
        const fromDate = new Date(date_from);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json({ error: 'Fecha de inicio inválida' });
        }
        filters.order_date.$gte = fromDate;
      }
      
      if (date_to && date_to !== '' && date_to !== 'undefined') {
        const toDate = new Date(date_to);
        if (isNaN(toDate.getTime())) {
          return res.status(400).json({ error: 'Fecha de fin inválida' });
        }
        filters.order_date.$lte = toDate;
      }
    }

    // ✅ FILTRO DE COMUNA
    if (shipping_commune && shipping_commune !== '' && shipping_commune !== 'undefined') {
      console.log('📍 Filtro de comuna recibido:', shipping_commune);

      const communeArray = shipping_commune.split(',').map(c => c.trim()).filter(c => c);

      if (communeArray.length > 1) {
        filters.shipping_commune = { $in: communeArray.map(c => new RegExp(c, 'i')) };
      } else if (communeArray.length === 1) {
        filters.shipping_commune = new RegExp(communeArray[0], 'i');
      }
    }

    // ✅ FILTRO DE BÚSQUEDA
    if (search && search !== '' && search !== 'undefined') {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { order_number: searchRegex },
        { customer_name: searchRegex },
        { customer_email: searchRegex },
        { external_order_id: searchRegex }
      ];
    }

    // ✅ VALIDAR PAGINACIÓN
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    console.log('Filtros finales aplicados:', JSON.stringify(filters, null, 2));

    // ✅ CONSULTA CON PROMESAS PARALELAS
    const [orders, totalCount] = await Promise.all([
      Order.find(filters)
        .populate('company_id', 'name price_per_order')
        .populate('channel_id', 'channel_type channel_name')
        .sort({ order_date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filters)
    ]);

    console.log(`✅ Encontrados ${orders.length} pedidos de ${totalCount} total`);

    // ✅ RESPUESTA CONSISTENTE
    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      },
      appliedFilters: {
        count: Object.keys(filters).length,
        details: filters
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo pedidos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error procesando la solicitud'
    });
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

    // 🔧 CORRECCIÓN: Obtener datos actualizados de Shipday si existe la orden
    if (order.shipday_order_id) {
      try {
        console.log(`📍 Obteniendo datos actualizados de Shipday para orden: ${order.shipday_order_id}`);
        
        const shipdayOrderDetails = await ShipdayService.getOrder(order.shipday_order_id);
        
        // 🆕 MAPEAR CORRECTAMENTE LOS DATOS DE SHIPDAY
        if (shipdayOrderDetails) {
          // Actualizar URL de tracking
          if (shipdayOrderDetails.trackingUrl && shipdayOrderDetails.trackingUrl !== order.shipday_tracking_url) {
            console.log('🔄 Actualizando tracking URL desde Shipday:', shipdayOrderDetails.trackingUrl);
            
            // Actualizar en la base de datos para futuras consultas
            await Order.findByIdAndUpdate(id, {
              shipday_tracking_url: shipdayOrderDetails.trackingUrl,
              updated_at: new Date()
            });
            
            // Actualizar en el objeto de respuesta
            order.shipday_tracking_url = shipdayOrderDetails.trackingUrl;
          }

          // Agregar datos completos de Shipday para debugging
          order.shipday_details = shipdayOrderDetails._raw || shipdayOrderDetails;
          
          // Extraer datos específicos
          order.delivery_note = shipdayOrderDetails.deliveryNote || shipdayOrderDetails._raw?.deliveryNote;
          order.podUrls = shipdayOrderDetails.podUrls || shipdayOrderDetails._raw?.podUrls || [];
          order.signatureUrl = shipdayOrderDetails.signatureUrl || shipdayOrderDetails._raw?.signatures?.[0]?.url;
          
          // Información del conductor
          if (shipdayOrderDetails.carrierName || shipdayOrderDetails._raw?.assignedCarrier) {
            order.driver_info = {
              name: shipdayOrderDetails.carrierName || shipdayOrderDetails._raw?.assignedCarrier?.name,
              phone: shipdayOrderDetails.carrierPhone || shipdayOrderDetails._raw?.assignedCarrier?.phone,
              email: shipdayOrderDetails.carrierEmail || shipdayOrderDetails._raw?.assignedCarrier?.email,
              status: shipdayOrderDetails.carrierStatus || shipdayOrderDetails._raw?.assignedCarrier?.status
            };
          }
          
          // Tiempos de Shipday
          if (shipdayOrderDetails._raw?.activityLog) {
            order.shipday_times = shipdayOrderDetails._raw.activityLog;
          }
          
          // Ubicación de entrega
          if (shipdayOrderDetails._raw?.proofOfDelivery?.location) {
            order.delivery_location = {
              lat: shipdayOrderDetails._raw.proofOfDelivery.location.latitude,
              lng: shipdayOrderDetails._raw.proofOfDelivery.location.longitude,
              formatted_address: shipdayOrderDetails._raw.proofOfDelivery.location.address
            };
          }

          console.log('✅ Datos de Shipday actualizados correctamente:', {
            has_tracking_url: !!order.shipday_tracking_url,
            tracking_url: order.shipday_tracking_url,
            has_driver: !!order.driver_info?.name,
            has_pods: !!(order.podUrls?.length || order.signatureUrl)
          });
        }
        
      } catch (shipdayError) {
        console.error('❌ Error obteniendo datos de Shipday:', shipdayError);
        order.shipday_error = "No se pudieron obtener los detalles de Shipday.";
      }
    }

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.company_id.toString() !== order.company_id._id.toString()) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    console.log(`📋 Orden enviada al frontend:`, {
      order_id: order._id,
      order_number: order.order_number,
      status: order.status,
      shipday_tracking_url: order.shipday_tracking_url,
      has_shipday_order: !!order.shipday_order_id
    });

    res.json(order);
  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({ error: ERRORS.SERVER_ERROR });
  }
}

 async updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, proof_of_delivery } = req.body; // 🆕 Aceptar prueba de entrega

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

    // 🆕 LÓGICA MEJORADA PARA ESTADO "DELIVERED"
    order.status = status;
    order.updated_at = new Date();

    if (status === 'delivered') {
      // Establecer fecha de entrega
      if (!order.delivery_date) {
        order.delivery_date = new Date();
      }

      // 🆕 Manejar prueba de entrega
      if (proof_of_delivery) {
        order.proof_of_delivery = {
          photo_url: proof_of_delivery.photo_url || order.proof_of_delivery?.photo_url || null,
          signature_url: proof_of_delivery.signature_url || order.proof_of_delivery?.signature_url || null,
          notes: proof_of_delivery.notes || order.proof_of_delivery?.notes || '',
          delivery_location: proof_of_delivery.delivery_location || order.proof_of_delivery?.delivery_location || null,
          delivered_by: req.user.name || req.user.email || 'Sistema',
          delivery_timestamp: new Date()
        };

        // 🆕 Compatibilidad con campos adicionales
        if (proof_of_delivery.photo_url) {
          order.podUrls = [proof_of_delivery.photo_url];
        }
        if (proof_of_delivery.signature_url) {
          order.signatureUrl = proof_of_delivery.signature_url;
        }

        console.log('📸 Prueba de entrega agregada manualmente:', {
          order_number: order.order_number,
          has_photo: !!order.proof_of_delivery.photo_url,
          has_signature: !!order.proof_of_delivery.signature_url,
          delivered_by: order.proof_of_delivery.delivered_by
        });
      } else {
        // 🆕 Si no se proporciona POD, crear una básica
        order.proof_of_delivery = {
          photo_url: null,
          signature_url: null,
          notes: 'Entrega confirmada manualmente desde el sistema',
          delivery_location: null,
          delivered_by: req.user.name || req.user.email || 'Sistema',
          delivery_timestamp: new Date()
        };
        console.log('📋 Prueba de entrega básica creada para:', order.order_number);
      }

      // 🆕 Intentar actualizar en Shipday si está integrado
      if (order.shipday_order_id) {
        try {
          console.log('🔄 Intentando marcar como entregado en Shipday:', order.shipday_order_id);
          
          // Aquí puedes llamar a tu servicio de Shipday para marcar como entregado
          // await ShipdayService.markAsDelivered(order.shipday_order_id, proof_of_delivery);
          
        } catch (shipdayError) {
          console.warn('⚠️ No se pudo actualizar en Shipday:', shipdayError.message);
          // No fallar por esto, solo registrar
        }
      }
    }

    await order.save();

    console.log(`✅ Estado actualizado: ${order.order_number} -> ${status}`, {
      delivery_date: order.delivery_date,
      has_proof_of_delivery: !!order.proof_of_delivery,
      proof_created_by: order.proof_of_delivery?.delivered_by
    });

    res.json({ 
      message: 'Estado actualizado exitosamente', 
      order,
      proof_of_delivery_created: status === 'delivered' && !!order.proof_of_delivery
    });
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

      const savedOrder = await order.save();

        if (savedOrder) {
        try {
          await Notification.create({
            user: req.user.id,
            title: 'Nuevo Pedido Creado',
            message: `El pedido #${savedOrder.order_number} ha sido creado exitosamente.`,
            type: 'new_order',
            link: `/app/orders?search=${savedOrder.order_number}`,
            order: savedOrder._id,
          });
          console.log(`✅ Notificación creada para el nuevo pedido ${savedOrder.order_number}.`);
        } catch (notificationError) {
          console.error('❌ No se pudo crear la notificación:', notificationError);
        }
      }

      res.status(201).json({ message: 'Pedido creado exitosamente', order: savedOrder });
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

async exportOrders(req, res) {
  try {
    const { date_from, date_to, company_id, status, shipping_commune } = req.query;

    console.log('📤 Exportando pedidos con filtros:', { date_from, date_to, company_id, status, shipping_commune });

    const filters = {};

    // Filtros de rol y empresa
    if (req.user.role !== 'admin') {
      filters.company_id = req.user.company_id;
    } else if (company_id) {
      filters.company_id = company_id;
    }

    // Filtro por estado
    if (status) {
      filters.status = status;
    }

    // Filtro por comuna
    if (shipping_commune) {
      if (Array.isArray(shipping_commune)) {
        filters.shipping_commune = { $in: shipping_commune };
      } else {
        filters.shipping_commune = shipping_commune;
      }
    }

    // Filtro por fechas
    if (date_from || date_to) {
      filters.order_date = {};
      if (date_from) filters.order_date.$gte = new Date(date_from);
      if (date_to) filters.order_date.$lte = new Date(date_to);
    }

    const orders = await Order.find(filters)
      .populate('company_id', 'name address')
      .populate('channel_id', 'channel_name')
      .sort({ order_date: -1, shipping_commune: 1, shipping_address: 1 })
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron pedidos para exportar con los filtros aplicados' 
      });
    }

    console.log(`✅ Exportando ${orders.length} pedidos`);

    const excelBuffer = await ExcelService.generateOrdersExport(orders);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pedidos_export_${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}`
    );

    res.send(excelBuffer);
    
  } catch (error) {
    console.error('❌ Error exportando pedidos:', error);
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

    console.log(`🚀 INICIO: Asignando driver ${driverId} a orden ${orderId}`);

    // ✅ CORRECCIÓN: Hacer populate de company_id desde el inicio
    let order = await Order.findById(orderId).populate('company_id');
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    let shipdayOrderId = order.shipday_order_id;

    // Si la orden no está en Shipday, la creamos primero
    if (!shipdayOrderId) {
      console.log('📦 Orden no existe en Shipday. Creando...');
      
      // ✅ CORRECCIÓN: Usar nombre de empresa + enviGo
      const companyName = order.company_id?.name || 'Cliente';
      const restaurantName = `${companyName} - enviGo`;
      
      // ✅ CORRECCIÓN: Usar dirección de empresa si está disponible
      const restaurantAddress = order.company_id?.address || "santa hilda 1447, quilicura";
      
      const orderDataForShipday = {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerAddress: order.shipping_address,
          restaurantName: restaurantName, // ← CAMBIADO: Ahora usa empresa + enviGo
          restaurantAddress: restaurantAddress, // ← CAMBIADO: Ahora usa dirección de empresa
          customerPhoneNumber: order.customer_phone || '',
          deliveryInstruction: order.notes || '',
          deliveryFee: order.shipping_cost || 1800,
          total: parseFloat(order.total_amount) || parseFloat(order.shipping_cost) || 1,
          customerEmail: order.customer_email || '',
          payment_method: order.payment_method || '',
          // ✅ CORRECCIÓN: Campos de propina vacíos o sin definir para que Shipday permita añadir propina
          // NO incluir tip: 0 ni tipAmount: 0, dejar que Shipday maneje esto
      };
      
      console.log(`🏢 Creando orden para: ${restaurantName} en dirección: ${restaurantAddress}`);
      
      const createdShipdayOrder = await ShipdayService.createOrder(orderDataForShipday);
      if (!createdShipdayOrder || !createdShipdayOrder.orderId) {
        throw new Error('Error al crear la orden en Shipday.');
      }
      
      shipdayOrderId = createdShipdayOrder.orderId;
      order.shipday_order_id = shipdayOrderId;
      await order.save();
      console.log(`✅ Orden creada en Shipday con ID: ${shipdayOrderId} para empresa: ${companyName}`);
    }

    // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---

    // Paso 1: Asignar el conductor
    console.log(`👨‍💼 Asignando conductor a Shipday Order ID: ${shipdayOrderId}`);
    await ShipdayService.assignOrder(shipdayOrderId, driverId);
    console.log('✅ Asignación enviada a Shipday.');

    // Paso 2: Volver a pedir TODAS las órdenes de Shipday para encontrar la nuestra
    console.log(`🔗 Consultando la lista completa de órdenes para encontrar el trackingLink...`);
    const allShipdayOrders = await ShipdayService.getOrders();

    // Paso 3: Buscar nuestra orden en la lista
    const updatedShipdayOrder = allShipdayOrders.find(o => o.orderId == shipdayOrderId);

    if (!updatedShipdayOrder) {
      console.warn(`⚠️ No se encontró la orden ${shipdayOrderId} en la lista de Shipday después de asignar.`);
      // Aunque no se encuentre, procedemos a guardar el resto de la info.
    } else {
        console.log('📦 Datos actualizados encontrados en la lista:', JSON.stringify(updatedShipdayOrder, null, 2));
    }

    // Paso 4: Extraer el trackingLink de los datos encontrados
    const trackingUrl = updatedShipdayOrder?.trackingLink || '';
    console.log(`🔗 URL de seguimiento final: "${trackingUrl}"`);
    
    // Paso 5: Actualizar la orden local
    order.shipday_driver_id = driverId;
    order.status = 'shipped'; // o 'assigned' según tu lógica de negocio
    order.shipday_tracking_url = trackingUrl;

    // Obtener info del conductor (opcional pero recomendado)
    try {
      const drivers = await ShipdayService.getDrivers();
      const driver = drivers.find(d => d.id == driverId);
      if (driver) {
        order.driver_info = { 
          name: driver.name, 
          phone: driver.phone || '', 
          email: driver.email || '', 
          status: driver.isOnShift ? 'ONLINE' : 'OFFLINE' 
        };
      }
    } catch (driverError) {
      console.warn('⚠️ No se pudo obtener info del conductor:', driverError.message);
    }
    
    // Paso 6: Guardar la orden
    const savedOrder = await order.save();
    console.log(`💾 Orden ${savedOrder.order_number} guardada con tracking URL: "${savedOrder.shipday_tracking_url}"`);

    // --- FIN DE LA CORRECCIÓN DEFINITIVA ---
    // =================================================================
    // =========== 🚀 INICIO DE LA INTEGRACIÓN CON CIRCUIT 🚀 ===========
    // =================================================================
   if (circuitDriverId && dailyPlanId) {
          try {
              console.log(`   -> Circuit: Añadiendo parada para orden #${savedOrder.order_number} al plan ${dailyPlanId}...`);
              // CAMBIO CLAVE: Usamos la nueva función 'addStopToPlan' en lugar de 'sendOrderToCircuit'
              await circuitController.addStopToPlan(savedOrder, dailyPlanId, circuitDriverId);
              console.log(`   -> ✅ Parada para orden #${savedOrder.order_number} añadida al plan de Circuit.`);
          } catch (circuitError) {
              console.error(`   -> ❌ Circuit: ${circuitError.message}`);
              results.failed.push({
                  orderId: savedOrder._id,
                  orderNumber: savedOrder.order_number,
                  error: `Error al añadir parada en Circuit: ${circuitError.message}`
              });
          }
      }
    // ===============================================================
    // ============= 🏁 FIN DE LA INTEGRACIÓN CON CIRCUIT 🏁 =============
    // ===============================================================

    res.status(200).json({ 
      message: 'Conductor asignado exitosamente.',
      success: true,
      trackingUrl: savedOrder.shipday_tracking_url,
      company_name: order.company_id?.name, // ← AGREGADO para confirmación
      restaurant_name_sent: `${order.company_id?.name || 'Cliente'} - enviGo`, // ← AGREGADO para debug
      order: savedOrder
    });

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

  // 2. Obtener parámetros del cuerpo de la petición
  const { company_id, create_in_shipday = 'true' } = req.body; // create_in_shipday viene como string del FormData
  
  if (!company_id) {
    return res.status(400).json({ error: 'No se especificó la empresa para la subida masiva.' });
  }

  // Convertir string a boolean
  const shouldCreateInShipday = create_in_shipday === 'true' || create_in_shipday === true;

  try {
    // 3. Leer el archivo Excel desde el buffer de memoria
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Procesando ${data.length} pedidos para subida masiva...`);
    console.log(`🚢 Crear en Shipday: ${shouldCreateInShipday ? 'SÍ' : 'NO'}`);

    const results = { 
      success: 0, 
      failed: 0, 
      errors: [],
      shipday_created: 0,
      shipday_failed: 0,
      shipday_errors: []
    };

    // 4. Buscar el canal de venta de la empresa seleccionada
    const channel = await Channel.findOne({ company_id: company_id });
    if (!channel) {
      return res.status(400).json({ error: 'La empresa seleccionada no tiene un canal de venta configurado.' });
    }

    // 5. Recorrer cada fila del Excel y crear los pedidos
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        console.log(`\n📦 Procesando pedido ${i + 1}/${data.length}: ${row['Número de Pedido*']}`);
        
        const orderData = {
          company_id: company_id,
          channel_id: channel._id,
          external_order_id: String(row['ID Externo*'] || `MANUAL-${Date.now()}-${i}`),
          order_number: String(row['Número de Pedido*']),
          customer_name: String(row['Nombre Cliente*']),
          customer_email: String(row['Email Cliente'] || ''),
          customer_phone: String(row['Teléfono Cliente'] || ''),
          shipping_address: String(row['Dirección*']),
          shipping_commune: String(row['Ciudad*']),
          shipping_state: String(row['Estado/Región'] || 'RM'),
          total_amount: parseFloat(row['Monto Total*'] || 0),
          shipping_cost: parseFloat(row['Costo de Envío'] || 0),
          order_date: new Date(),
          status: 'pending',
          notes: String(row['Notas'] || '')
        };

        // Validación de campos obligatorios
        if (!orderData.order_number || !orderData.customer_name || !orderData.shipping_address) {
          throw new Error('Faltan campos obligatorios (Pedido, Cliente o Dirección)');
        }

        // Crear el pedido en la base de datos local
        const createdOrder = await Order.create(orderData);
        results.success++;
        console.log(`✅ Pedido ${orderData.order_number} creado en base de datos local`);

        // 🔥 CREAR AUTOMÁTICAMENTE EN SHIPDAY SI ESTÁ HABILITADO
        if (shouldCreateInShipday) {
          try {
            console.log(`🚢 Creando pedido ${orderData.order_number} en Shipday...`);
            
            // Preparar datos para Shipday
            const shipdayOrderData = {
              orderNumber: orderData.order_number,
              customerName: orderData.customer_name,
              customerAddress: orderData.shipping_address,
              restaurantName: "enviGo",
              restaurantAddress: "santa hilda 1447, quilicura",
              customerPhoneNumber: orderData.customer_phone || '',
              deliveryInstruction: orderData.notes || '',
              deliveryFee: orderData.shipping_cost || 1800,
              total: orderData.total_amount || 1,
              customerEmail: orderData.customer_email || '',
            };

            // Crear en Shipday usando el servicio con rate limiting
            const shipdayResult = await ShipdayService.createOrder(shipdayOrderData);
            
            if (shipdayResult && shipdayResult.orderId) {
              // Actualizar el pedido local con el ID de Shipday
              createdOrder.shipday_order_id = shipdayResult.orderId;
              createdOrder.status = 'pending';
              await createdOrder.save();
              
              results.shipday_created++;
              console.log(`✅ Pedido ${orderData.order_number} creado en Shipday con ID: ${shipdayResult.orderId}`);
            } else {
              throw new Error('Shipday no devolvió un orderId válido');
            }

            // 🔥 DELAY CRUCIAL PARA EVITAR 429 (3 segundos entre creaciones)
            if (i < data.length - 1) { // No hacer delay en el último pedido
              console.log('⏱️ Aplicando delay de 3 segundos para evitar rate limiting...');
              await new Promise(resolve => setTimeout(resolve, 3000));
            }

          } catch (shipdayError) {
            console.error(`❌ Error creando en Shipday:`, shipdayError.message);
            results.shipday_failed++;
            results.shipday_errors.push({
              order: orderData.order_number,
              error: shipdayError.message
            });
            
            // Aunque falle Shipday, el pedido ya se creó localmente
            // Solo marcamos como pendiente
            createdOrder.status = 'pending';
            await createdOrder.save();
            
            // Delay de recuperación tras error de Shipday
            if (i < data.length - 1) {
              console.log('⏱️ Delay de recuperación tras error: 2 segundos...');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

      } catch (rowError) {
        console.error(`❌ Error procesando fila ${i + 1}:`, rowError.message);
        results.failed++;
        results.errors.push({ 
          order: row['Número de Pedido*'] || `Fila ${i + 1}`, 
          reason: rowError.message 
        });
      }
    }

    // Preparar respuesta con estadísticas completas
    const response = {
      message: 'Subida masiva completada',
      database: {
        success: results.success,
        failed: results.failed,
        errors: results.errors
      }
    };

    if (shouldCreateInShipday) {
      response.shipday = {
        created: results.shipday_created,
        failed: results.shipday_failed,
        errors: results.shipday_errors
      };
      response.message += ` (${results.shipday_created} creados en Shipday de ${results.success} pedidos locales)`;
    }

    console.log('\n📊 RESUMEN FINAL DE SUBIDA MASIVA:');
    console.log(`✅ Base de datos: ${results.success} exitosos, ${results.failed} fallidos`);
    if (shouldCreateInShipday) {
      console.log(`🚢 Shipday: ${results.shipday_created} creados, ${results.shipday_failed} fallidos`);
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error procesando archivo de subida masiva:', error);
    return res.status(500).json({ 
      error: 'Error al procesar el archivo Excel.',
      details: error.message 
    });
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
  async exportForDashboard(req, res) {
  try {
    const { date_from, date_to, company_id, status, channel_id } = req.query;

    const filters = {};

    // Aplicar filtro de empresa según el rol del usuario
    if (req.user.role !== 'admin') {
      // Si no es admin, solo puede ver órdenes de su empresa
      filters.company_id = req.user.company_id;
    } else {
      // Si es admin, puede filtrar por empresa específica
      if (company_id) {
        filters.company_id = company_id;
      }
    }

    // Filtros adicionales
    if (status) {
      filters.status = status;
    }

    if (channel_id) {
      filters.channel_id = channel_id;
    }

    if (date_from || date_to) {
      filters.order_date = {};
      if (date_from) filters.order_date.$gte = new Date(date_from);
      if (date_to) filters.order_date.$lte = new Date(date_to);
    }

    console.log('📊 Exportando pedidos para dashboard con filtros:', filters);

    const orders = await Order.find(filters)
      .populate('company_id', 'name')
      .populate('channel_id', 'channel_name')
      .sort({ created_at: -1 }) // Ordenar por fecha de creación descendente
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron pedidos para exportar con los filtros aplicados' 
      });
    }

    console.log(`✅ Encontrados ${orders.length} pedidos para exportar`);

    // Usar el nuevo método de ExcelService para dashboard
    const excelBuffer = await ExcelService.generateDashboardExport(orders);

    // Configurar headers para descarga
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=pedidos_dashboard_${Date.now()}.xlsx`
    );

    res.send(excelBuffer);
    
    console.log('✅ Exportación para dashboard completada exitosamente');

  } catch (error) {
    console.error('❌ Error exportando para dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
}
module.exports = new OrderController();