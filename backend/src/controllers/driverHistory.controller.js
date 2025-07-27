// backend/src/controllers/driverHistory.controller.js
// VERSIÓN CORREGIDA SIN ERRORES

const DriverHistoryService = require('../services/driverHistory.service');
const DriverHistory = require('../models/DriveryHistory');
const Order = require('../models/Order');
const mongoose = require('mongoose');

class DriverHistoryController {

  /**
   * Método de prueba para debuggear el sistema
   */
  async testMethod(req, res) {
    try {
      const { 
        date_from = '2025-06-27', 
        date_to = '2025-07-27', 
        driver_id, 
        company_id, 
        payment_status = 'pending' 
      } = req.query;

      console.log('🔥 PARAMS RECIBIDOS:', { 
        date_from, 
        date_to, 
        driver_id, 
        company_id, 
        payment_status 
      });

      // PASO 1: Contar todos los pedidos
      console.log('🔥 PASO 1: Contando TODOS los pedidos...');
      const totalOrders = await Order.countDocuments({});
      console.log('🔥 Total pedidos en BD:', totalOrders);

      // PASO 2: Pedidos delivered
      console.log('🔥 PASO 2: Contando pedidos delivered...');
      const deliveredCount = await Order.countDocuments({ status: 'delivered' });
      console.log('🔥 Pedidos delivered:', deliveredCount);

      // PASO 3: Pedidos con información de conductor ✅ CONSULTA CORREGIDA
      console.log('🔥 PASO 3: Contando pedidos con conductor...');
      const withDriverCount = await Order.countDocuments({
        $and: [
          { status: 'delivered' },
          {
            $or: [
              { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
              { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
            ]
          }
        ]
      });
      console.log('🔥 Pedidos delivered con conductor:', withDriverCount);

      // PASO 4: Obtener ejemplos REALES
      console.log('🔥 PASO 4: Obteniendo ejemplos de pedidos delivered con conductor...');
      const deliveredWithDriverExamples = await Order.find({
        status: 'delivered',
        $or: [
          { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      })
      .limit(5)
      .select('order_number status shipday_driver_id driver_info delivery_date shipping_address customer_name')
      .lean();

      console.log('🔥 PEDIDOS DELIVERED CON CONDUCTOR:');
      deliveredWithDriverExamples.forEach((order, i) => {
        console.log(`🔥 Pedido ${i + 1}:`, {
          order_number: order.order_number,
          status: order.status,
          driver_id: order.shipday_driver_id,
          driver_name: order.driver_info?.name,
          customer_name: order.customer_name,
          delivery_date: order.delivery_date
        });
      });

      // PASO 5: Generar reporte de pagos por conductor
      console.log('🔥 PASO 5: Generando reporte de pagos...');
      const paymentReport = await this.generateDriverPaymentReport(date_from, date_to);

      res.json({
        success: true,
        debug_info: {
          total_orders: totalOrders,
          delivered_orders: deliveredCount,
          delivered_with_driver: withDriverCount
        },
        examples: deliveredWithDriverExamples,
        payment_report: paymentReport
      });

    } catch (error) {
      console.error('❌ Error en test method:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Generar reporte de pagos por conductor ✅ MÉTODO NUEVO Y CORREGIDO
   */
  async generateDriverPaymentReport(dateFrom, dateTo) {
    try {
      // Filtros de fecha
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo + 'T23:59:59.999Z');

      // Buscar pedidos entregados con conductor en el rango de fechas
      const matchCriteria = {
        status: 'delivered',
        $or: [
          { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      };

      if (Object.keys(dateFilter).length > 0) {
        matchCriteria.delivery_date = dateFilter;
      }

      console.log('🔍 Criterios de búsqueda:', JSON.stringify(matchCriteria, null, 2));

      const deliveredOrders = await Order.find(matchCriteria)
        .populate('company_id', 'name email')
        .sort({ delivery_date: -1 })
        .lean();

      console.log(`📊 Órdenes encontradas: ${deliveredOrders.length}`);

      // Agrupar por conductor usando método estático
      const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(deliveredOrders);

      const summary = {
        total_drivers: driverGroups.length,
        total_deliveries: deliveredOrders.length,
        total_amount: driverGroups.reduce((sum, driver) => sum + driver.total_amount, 0),
        period: { from: dateFrom, to: dateTo }
      };

      return {
        summary,
        drivers: driverGroups,
        raw_orders_found: deliveredOrders.length
      };

    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      throw error;
    }
  }

  /**
   * Obtener entregas para pagos - VERSIÓN FINAL CORREGIDA
   */
async getAllDeliveriesForPayments(req, res) {
  try {
    const { 
      date_from, 
      date_to, 
      driver_id, 
      company_id, 
      payment_status = 'pending' // Por defecto busca pendientes
    } = req.query;

    console.log('💰 Obteniendo entregas con filtros:', { payment_status, date_from, date_to });

    // 1. Construir el filtro de base para la consulta
    const filters = {
      status: 'delivered',
      $or: [
        { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
        { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
      ]
    };

    // 2. Añadir filtro de ESTADO DE PAGO (Punto clave)
    if (payment_status === 'pending') {
      // Busca órdenes que no han sido pagadas
      filters.$or = [
        { isPaid: { $exists: false } },
        { isPaid: false }
      ];
    } else if (payment_status === 'paid') {
      // Busca órdenes que ya fueron pagadas
      filters.isPaid = true;
    }
    // Si payment_status es 'all', no se añade ningún filtro de pago.

    // 3. Añadir filtros opcionales
    if (date_from || date_to) {
      filters.delivery_date = {};
      if (date_from) filters.delivery_date.$gte = new Date(date_from);
      if (date_to) filters.delivery_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }
    if (driver_id) filters.shipday_driver_id = driver_id;
    if (company_id) filters.company_id = new mongoose.Types.ObjectId(company_id);

    console.log('🔍 Filtros de MongoDB aplicados:', JSON.stringify(filters, null, 2));

    // 4. Ejecutar la consulta a la base de datos
    const orders = await Order.find(filters)
      .populate('company_id', 'name')
      .sort({ delivery_date: -1 })
      .lean(); // .lean() para mayor rendimiento

    console.log(`📊 Órdenes encontradas: ${orders.length}`);

    // 5. Transformar los datos para el frontend (Punto clave)
    const deliveries = orders.map(order => ({
      _id: order._id.toString(), // Importante para que el front lo use en los clics
      driver_id: order.shipday_driver_id,
      driver_name: order.driver_info?.name || 'Conductor Asignado',
      driver_email: order.driver_info?.email,
      order_number: order.order_number,
      customer_name: order.customer_name,
      delivery_address: order.shipping_address,
      delivered_at: order.delivery_date,
      company_name: order.company_id?.name || 'N/A',
      payment_amount: 1700, // O el campo que uses para el monto
      
      // ESTA ES LA LÍNEA MÁS IMPORTANTE PARA TU FRONTEND
      payment_status: order.isPaid ? 'paid' : 'pending',
      
      paid_at: order.paidAt || null, // Asegúrate de enviar la fecha de pago
    }));

    // 6. Agrupar por conductor y enviar la respuesta
    const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(deliveries);

    const summary = {
      total_deliveries: deliveries.length,
      unique_drivers: driverGroups.length,
      total_amount: deliveries.reduce((sum, d) => sum + d.payment_amount, 0),
    };

    res.json({
      success: true,
      data: {
        summary,
        drivers: driverGroups,
      }
    });

  } catch (error) {
    console.error('❌ Error en getAllDeliveriesForPayments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

  /**
   * Crear registros en DriverHistory desde órdenes existentes
   */
  async createHistoryFromOrders(req, res) {
    try {
      console.log('🔄 Iniciando creación de registros en DriverHistory...');

      const orders = await Order.find({
        status: 'delivered',
        $or: [
          { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      }).populate('company_id').lean();

      console.log(`📊 Encontradas ${orders.length} órdenes entregadas con conductor`);

      let created = 0;
      let skipped = 0;

      for (const order of orders) {
        // Verificar si ya existe
        const exists = await DriverHistory.findOne({ order_id: order._id });
        if (exists) {
          skipped++;
          continue;
        }

        // Crear registro
        const deliveryDate = order.delivery_date || order.updated_at || new Date();
        const paymentPeriod = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;

        const historyRecord = new DriverHistory({
          driver_id: order.shipday_driver_id,
          driver_email: order.driver_info?.email || 'no-email@migrated.com',
          driver_name: order.driver_info?.name || 'Conductor',
          company_id: order.company_id._id,
          order_id: order._id,
          shipday_order_id: order.shipday_order_id || 'no-shipday-id',
          order_number: order.order_number,
          delivery_address: order.shipping_address,
          customer_name: order.customer_name,
          delivered_at: deliveryDate,
          payment_amount: 1700,
          payment_status: 'pending',
          payment_period: paymentPeriod
        });

        await historyRecord.save();
        created++;
      }

      res.json({
        success: true,
        message: `Proceso completado: ${created} registros creados, ${skipped} omitidos`,
        data: {
          created,
          skipped,
          total_processed: orders.length
        }
      });

    } catch (error) {
      console.error('❌ Error creando registros:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // ==================== MÉTODOS ESTÁTICOS AUXILIARES ====================

  /**
   * Agrupar entregas por conductor - MÉTODO ESTÁTICO
   */
  static groupDeliveriesByDriverStatic(deliveries) {
    const grouped = {};
    
    deliveries.forEach(delivery => {
      let driverId, driverName, driverEmail, paymentAmount;
      
      // Si viene de DriverHistory
      if (delivery.driver_id) {
        driverId = delivery.driver_id;
        driverName = delivery.driver_name;
        driverEmail = delivery.driver_email;
        paymentAmount = delivery.payment_amount || 1700;
      } 
      // Si viene de Order
      else if (delivery.shipday_driver_id) {
        driverId = delivery.shipday_driver_id;
        driverName = delivery.driver_info?.name || 'Conductor';
        driverEmail = delivery.driver_info?.email || 'no-email@shipday.com';
        paymentAmount = 1700;
      } else {
        return; // Saltar si no hay driver_id
      }

      if (!grouped[driverId]) {
        grouped[driverId] = {
          driver_id: driverId,
          driver_name: driverName,
          driver_email: driverEmail,
          total_deliveries: 0,
          total_amount: 0,
          deliveries: []
        };
      }

      grouped[driverId].total_deliveries++;
      grouped[driverId].total_amount += paymentAmount;
      grouped[driverId].deliveries.push({
        order_number: delivery.order_number,
        customer_name: delivery.customer_name,
        delivery_address: delivery.delivery_address || delivery.shipping_address,
        delivered_at: delivery.delivered_at || delivery.delivery_date,
        payment_amount: paymentAmount,
        company_name: delivery.company_id?.name
      });
    });

    return Object.values(grouped).sort((a, b) => b.total_amount - a.total_amount);
  }

  /**
 * Marcar entregas específicas como pagadas
 */
async markDeliveriesAsPaid(req, res) {
  try {
    const { orderIds, paymentNote = 'Pago manual desde panel' } = req.body;
    const paidBy = req.user.id;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de IDs de órdenes'
      });
    }

    console.log('💰 Marcando como pagadas las órdenes:', orderIds);

    // Actualizar las órdenes
    const orderResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        isPaid: true,
        paidAt: new Date(),
        paidBy: paidBy,
        paymentNote: paymentNote
      }
    );

    // También actualizar DriverHistory si existe
    const historyResult = await DriverHistory.updateMany(
      { order_id: { $in: orderIds } },
      { 
        payment_status: 'paid',
        paid_at: new Date(),
        paid_by: paidBy
      }
    );

    console.log(`✅ Órdenes actualizadas: ${orderResult.modifiedCount}`);
    console.log(`✅ Registros de historial actualizados: ${historyResult.modifiedCount}`);

    res.json({
      success: true,
      message: `${orderResult.modifiedCount} entregas marcadas como pagadas`,
      data: {
        orders_updated: orderResult.modifiedCount,
        history_updated: historyResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('❌ Error marcando entregas como pagadas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Pagar todas las entregas pendientes de un conductor
 */
async payAllPendingToDriver(req, res) {
  try {
    const { driverId } = req.params;
    const { paymentNote = 'Pago completo de conductor' } = req.body;
    const paidBy = req.user.id;

    console.log(`💸 Pagando todas las entregas pendientes del conductor: ${driverId}`);

    // Buscar todas las órdenes pendientes del conductor
    const pendingOrders = await Order.find({
      status: 'delivered',
      shipday_driver_id: driverId,
      $or: [
        { isPaid: { $exists: false } },
        { isPaid: false }
      ]
    }).select('_id order_number customer_name');

    if (pendingOrders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay entregas pendientes para este conductor'
      });
    }

    const orderIds = pendingOrders.map(order => order._id);

    // Actualizar las órdenes
    const orderResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        isPaid: true,
        paidAt: new Date(),
        paidBy: paidBy,
        paymentNote: paymentNote
      }
    );

    // También actualizar DriverHistory si existe
    const historyResult = await DriverHistory.updateMany(
      { driver_id: driverId, payment_status: 'pending' },
      { 
        payment_status: 'paid',
        paid_at: new Date(),
        paid_by: paidBy
      }
    );

    const totalAmount = pendingOrders.length * 1700; // Precio fijo por entrega

    console.log(`✅ Pagadas ${orderResult.modifiedCount} entregas por $${totalAmount}`);

    res.json({
      success: true,
      message: `Pagadas ${orderResult.modifiedCount} entregas por $${totalAmount.toLocaleString()}`,
      data: {
        driver_id: driverId,
        orders_paid: orderResult.modifiedCount,
        total_amount: totalAmount,
        order_numbers: pendingOrders.map(o => o.order_number)
      }
    });

  } catch (error) {
    console.error('❌ Error pagando conductor:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Obtener entregas con filtro de estado de pago correcto
 */
async getAllDeliveriesForPayments(req, res) {
  try {
    const { 
      date_from, 
      date_to, 
      driver_id, 
      company_id, 
      payment_status = 'pending' 
    } = req.query;

    console.log('💰 Obteniendo entregas para pagos:', { 
      date_from, 
      date_to, 
      driver_id, 
      company_id, 
      payment_status 
    });

    // Filtros base para órdenes
    const orderFilters = {
      status: 'delivered',
      $or: [
        { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
        { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
      ]
    };

    // Filtro por estado de pago
    if (payment_status === 'pending') {
      orderFilters.$and = [
        {
          $or: [
            { isPaid: { $exists: false } },
            { isPaid: false }
          ]
        }
      ];
    } else if (payment_status === 'paid') {
      orderFilters.isPaid = true;
    }
    // Si payment_status === 'all', no agregar filtro de pago

    // Filtros de fecha
    if (date_from || date_to) {
      orderFilters.delivery_date = {};
      if (date_from) orderFilters.delivery_date.$gte = new Date(date_from);
      if (date_to) orderFilters.delivery_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    // Filtros adicionales
    if (driver_id) orderFilters.shipday_driver_id = driver_id;
    if (company_id) orderFilters.company_id = new mongoose.Types.ObjectId(company_id);

    console.log('🔍 Filtros aplicados:', JSON.stringify(orderFilters, null, 2));

    const orders = await Order.find(orderFilters)
      .populate('company_id', 'name email phone')
      .sort({ delivery_date: -1 })
      .lean();

    console.log('📊 Órdenes encontradas:', orders.length);

    // Convertir a formato de entregas
    const deliveries = orders.map(order => ({
      _id: order._id,
      driver_id: order.shipday_driver_id,
      driver_name: order.driver_info?.name || 'Conductor',
      driver_email: order.driver_info?.email || 'no-email@shipday.com',
      company_id: order.company_id,
      order_id: order._id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      delivery_address: order.shipping_address,
      delivered_at: order.delivery_date,
      payment_amount: 1700,
      payment_status: order.isPaid ? 'paid' : 'pending',
      paid_at: order.paidAt || null,
      source: 'orders'
    }));

    // Agrupar por conductor
    const driverGroups = DriverHistoryController.groupDeliveriesByDriverStatic(deliveries);

    const summary = {
      total_deliveries: deliveries.length,
      unique_drivers: driverGroups.length,
      total_amount: deliveries.reduce((sum, d) => sum + d.payment_amount, 0),
      data_source: 'orders',
      payment_filter: payment_status
    };

    res.json({
      success: true,
      data: {
        period: { date_from, date_to },
        filters: { driver_id, company_id, payment_status },
        summary,
        drivers: driverGroups,
        all_deliveries: deliveries.slice(0, 100)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo entregas para pagos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
}

module.exports = new DriverHistoryController();