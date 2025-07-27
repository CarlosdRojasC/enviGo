// backend/src/controllers/driverHistory.controller.js
// VERSIÓN CORREGIDA - El problema era la consulta incorrecta

const DriverHistoryService = require('../services/driverHistory.service');
const DriverHistory = require('../models/DriveryHistory');
const Order = require('../models/Order');
const mongoose = require('mongoose');

class DriverHistoryController {

  /**
   * Método de prueba CORREGIDO
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

      // Agrupar por conductor
      const driverGroups = {};
      
      deliveredOrders.forEach(order => {
        const driverId = order.shipday_driver_id;
        const driverName = order.driver_info?.name || 'Conductor sin nombre';
        const driverEmail = order.driver_info?.email || 'sin-email@shipday.com';

        if (!driverId) return; // Saltar si no hay driver_id

        if (!driverGroups[driverId]) {
          driverGroups[driverId] = {
            driver_id: driverId,
            driver_name: driverName,
            driver_email: driverEmail,
            total_deliveries: 0,
            total_amount: 0,
            deliveries: []
          };
        }

        const paymentAmount = 1700; // Precio fijo por entrega
        driverGroups[driverId].total_deliveries++;
        driverGroups[driverId].total_amount += paymentAmount;
        driverGroups[driverId].deliveries.push({
          order_number: order.order_number,
          customer_name: order.customer_name,
          delivery_address: order.shipping_address,
          delivered_at: order.delivery_date,
          payment_amount: paymentAmount,
          company_name: order.company_id?.name
        });
      });

      const driversArray = Object.values(driverGroups)
        .sort((a, b) => b.total_amount - a.total_amount);

      const summary = {
        total_drivers: driversArray.length,
        total_deliveries: deliveredOrders.length,
        total_amount: driversArray.reduce((sum, driver) => sum + driver.total_amount, 0),
        period: { from: dateFrom, to: dateTo }
      };

      return {
        summary,
        drivers: driversArray,
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
        payment_status = 'pending' 
      } = req.query;

      console.log('💰 Obteniendo entregas para pagos:', { 
        date_from, 
        date_to, 
        driver_id, 
        company_id, 
        payment_status 
      });

      // OPCIÓN 1: Intentar usar DriverHistory primero
      let deliveriesFromHistory = [];
      try {
        const historyFilters = {};
        
        if (date_from || date_to) {
          historyFilters.delivered_at = {};
          if (date_from) historyFilters.delivered_at.$gte = new Date(date_from);
          if (date_to) historyFilters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
        }
        
        if (driver_id) historyFilters.driver_id = driver_id;
        if (company_id) historyFilters.company_id = new mongoose.Types.ObjectId(company_id);
        if (payment_status && payment_status !== 'all') historyFilters.payment_status = payment_status;

        deliveriesFromHistory = await DriverHistory.find(historyFilters)
          .populate('company_id', 'name email phone')
          .populate('order_id', 'order_number customer_name total_amount')
          .sort({ delivered_at: -1 })
          .lean();

        console.log('📊 Entregas desde DriverHistory:', deliveriesFromHistory.length);
      } catch (historyError) {
        console.log('⚠️ Error en DriverHistory:', historyError.message);
      }

      // OPCIÓN 2: Usar Order directamente (CONSULTA CORREGIDA)
      let deliveriesFromOrders = [];
      
      const orderFilters = {
        status: 'delivered',
        $or: [
          { shipday_driver_id: { $exists: true, $ne: null, $ne: '' } },
          { 'driver_info.name': { $exists: true, $ne: null, $ne: '' } }
        ]
      };

      if (date_from || date_to) {
        orderFilters.delivery_date = {};
        if (date_from) orderFilters.delivery_date.$gte = new Date(date_from);
        if (date_to) orderFilters.delivery_date.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      if (driver_id) orderFilters.shipday_driver_id = driver_id;
      if (company_id) orderFilters.company_id = new mongoose.Types.ObjectId(company_id);

      console.log('🔍 Filtros para Order:', JSON.stringify(orderFilters, null, 2));

      const orders = await Order.find(orderFilters)
        .populate('company_id', 'name email phone')
        .sort({ delivery_date: -1 })
        .lean();

      console.log('📊 Órdenes encontradas:', orders.length);

      // Convertir órdenes a formato de entrega para pagos
      deliveriesFromOrders = orders.map(order => ({
        _id: `order_${order._id}`,
        driver_id: order.shipday_driver_id,
        driver_name: order.driver_info?.name || 'Conductor',
        driver_email: order.driver_info?.email || 'no-email@shipday.com',
        company_id: order.company_id,
        order_id: order,
        order_number: order.order_number,
        customer_name: order.customer_name,
        delivery_address: order.shipping_address,
        delivered_at: order.delivery_date,
        payment_amount: 1700,
        payment_status: 'pending',
        source: 'order_collection'
      }));

      // Usar DriverHistory si tiene datos, sino usar Order
      const finalDeliveries = deliveriesFromHistory.length > 0 ? deliveriesFromHistory : deliveriesFromOrders;
      const dataSource = deliveriesFromHistory.length > 0 ? 'driver_history' : 'orders';

      // Agrupar por conductor
      const driverGroups = this.groupDeliveriesByDriver(finalDeliveries);

      const summary = {
        total_deliveries: finalDeliveries.length,
        unique_drivers: driverGroups.length,
        total_amount: finalDeliveries.reduce((sum, d) => sum + (d.payment_amount || 1700), 0),
        data_source: dataSource
      };

      res.json({
        success: true,
        data: {
          period: { date_from, date_to },
          filters: { driver_id, company_id, payment_status },
          summary,
          drivers: driverGroups,
          all_deliveries: finalDeliveries.slice(0, 100) // Limitar respuesta
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

  /**
   * Agrupar entregas por conductor
   */
  groupDeliveriesByDriver(deliveries) {
    const grouped = {};
    
    deliveries.forEach(delivery => {
      const driverId = delivery.driver_id;
      if (!driverId) return;

      if (!grouped[driverId]) {
        grouped[driverId] = {
          driver_id: driverId,
          driver_name: delivery.driver_name,
          driver_email: delivery.driver_email,
          total_deliveries: 0,
          total_amount: 0,
          deliveries: []
        };
      }

      const amount = delivery.payment_amount || 1700;
      grouped[driverId].total_deliveries++;
      grouped[driverId].total_amount += amount;
      grouped[driverId].deliveries.push({
        order_number: delivery.order_number,
        customer_name: delivery.customer_name,
        delivery_address: delivery.delivery_address,
        delivered_at: delivery.delivered_at,
        payment_amount: amount,
        company_name: delivery.company_id?.name
      });
    });

    return Object.values(grouped).sort((a, b) => b.total_amount - a.total_amount);
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
}

module.exports = new DriverHistoryController();