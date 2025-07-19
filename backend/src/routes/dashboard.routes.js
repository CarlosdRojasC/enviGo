const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// Importar modelos
const Company = require('../models/Company');
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const User = require('../models/User');

// ==================== RUTAS DE DASHBOARD Y ESTADÍSTICAS ====================

// Estadísticas generales del dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    let stats = {};
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      // Dashboard para administrador
      const [companies, totalOrders, channels, users] = await Promise.all([
        Company.countDocuments({ is_active: true }),
        Order.countDocuments({}),
        Channel.countDocuments({ is_active: true }),
        User.countDocuments({ is_active: true })
      ]);

      // Estadísticas de órdenes por estado
      const ordersByStatus = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Estadísticas de tiempo (hoy, este mes)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const [ordersToday, ordersThisMonth, deliveredTotal] = await Promise.all([
        Order.countDocuments({ order_date: { $gte: today } }),
        Order.countDocuments({ order_date: { $gte: thisMonthStart } }),
        Order.countDocuments({ status: 'delivered' })
      ]);

      // Costos mensuales (simulado por ahora)
      const monthlyCost = ordersThisMonth * 1500; // Promedio por pedido
      const pricePerOrder = 1500;

      stats = {
        companies,
        orders: {
          total_orders: totalOrders,
          orders_today: ordersToday,
          orders_this_month: ordersThisMonth,
          delivered: deliveredTotal,
          by_status: ordersByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        channels,
        users,
        monthly_cost: monthlyCost,
        price_per_order: pricePerOrder,
        monthly_revenue: monthlyCost // Para admin es igual al costo
      };

    } else {
      // Dashboard para empresa
      const companyId = req.user.company_id;
      const companyFilter = { company_id: new mongoose.Types.ObjectId(companyId) };

      const [totalOrders, channels] = await Promise.all([
        Order.countDocuments(companyFilter),
        Channel.countDocuments({ ...companyFilter, is_active: true })
      ]);

      // Estadísticas de órdenes por estado para la empresa
      const ordersByStatus = await Order.aggregate([
        { $match: companyFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Estadísticas de tiempo (hoy, este mes)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const [ordersToday, ordersThisMonth, deliveredTotal] = await Promise.all([
        Order.countDocuments({ 
          ...companyFilter,
          order_date: { $gte: today } 
        }),
        Order.countDocuments({ 
          ...companyFilter,
          order_date: { $gte: thisMonthStart } 
        }),
        Order.countDocuments({ 
          ...companyFilter,
          status: 'delivered' 
        })
      ]);

      // Costos estimados
      const pricePerOrder = 1500; // Esto debería venir de la configuración de la empresa
      const monthlyCost = ordersThisMonth * pricePerOrder;

      stats = {
        orders: {
          total_orders: totalOrders,
          orders_today: ordersToday,
          orders_this_month: ordersThisMonth,
          delivered: deliveredTotal,
          by_status: ordersByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        channels,
        monthly_cost: monthlyCost,
        price_per_order: pricePerOrder
      };
    }

    res.json({
      success: true,
      data: stats,
      metadata: {
        generated_at: new Date(),
        user_role: req.user.role,
        company_id: req.user.company_id
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// Tendencia de órdenes en el tiempo
router.get('/orders-trend', authenticateToken, async (req, res) => {
  try {
    const { period = '7d', company_id } = req.query;
    
    // Calcular fechas según el período
    let startDate;
    let groupBy;
    
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$order_date' },
          month: { $month: '$order_date' },
          day: { $dayOfMonth: '$order_date' },
          hour: { $hour: '$order_date' }
        };
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$order_date' },
          month: { $month: '$order_date' },
          day: { $dayOfMonth: '$order_date' }
        };
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$order_date' },
          month: { $month: '$order_date' },
          day: { $dayOfMonth: '$order_date' }
        };
        break;
      case '12m':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$order_date' },
          month: { $month: '$order_date' }
        };
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$order_date' },
          month: { $month: '$order_date' },
          day: { $dayOfMonth: '$order_date' }
        };
    }

    // Filtros de consulta
    const matchStage = {
      order_date: { $gte: startDate }
    };

    // Aplicar filtro de empresa
    if (req.user.role === 'admin' && company_id) {
      matchStage.company_id = new mongoose.Types.ObjectId(company_id);
    } else if (req.user.role !== 'admin') {
      matchStage.company_id = new mongoose.Types.ObjectId(req.user.company_id);
    }

    const trend = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          revenue: { $sum: '$total_amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.json(trend);

  } catch (error) {
    console.error('Error obteniendo tendencia de órdenes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Estadísticas de ingresos por empresa (solo admin)
router.get('/revenue-by-company', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const revenueByCompany = await Order.aggregate([
      {
        $match: {
          order_date: { $gte: startDate },
          status: { $in: ['delivered', 'shipped'] }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'company_id',
          foreignField: '_id',
          as: 'company'
        }
      },
      { $unwind: '$company' },
      {
        $group: {
          _id: '$company_id',
          company_name: { $first: '$company.company_name' },
          total_orders: { $sum: 1 },
          total_revenue: { $sum: '$total_amount' },
          avg_order_value: { $avg: '$total_amount' }
        }
      },
      { $sort: { total_revenue: -1 } }
    ]);

    res.json(revenueByCompany);

  } catch (error) {
    console.error('Error obteniendo ingresos por empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
router.get('/dashboard/trends', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const companyId = isAdmin ? null : req.user.company_id;
    
    // Definir filtro base según el rol
    const baseFilter = isAdmin ? {} : { company_id: new mongoose.Types.ObjectId(companyId) };
    
    // Fechas para comparaciones
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Obtener estadísticas comparativas
    const [
      todayOrders,
      yesterdayOrders,
      thisMonthOrders,
      lastMonthOrders,
      thisMonthDelivered,
      lastMonthDelivered,
      thisMonthTotal,
      lastMonthTotal
    ] = await Promise.all([
      // Pedidos de hoy
      Order.countDocuments({
        ...baseFilter,
        order_date: { $gte: today }
      }),
      
      // Pedidos de ayer
      Order.countDocuments({
        ...baseFilter,
        order_date: { 
          $gte: yesterday,
          $lt: today
        }
      }),
      
      // Pedidos este mes
      Order.countDocuments({
        ...baseFilter,
        order_date: { $gte: thisMonthStart }
      }),
      
      // Pedidos mes pasado
      Order.countDocuments({
        ...baseFilter,
        order_date: { 
          $gte: lastMonthStart,
          $lte: lastMonthEnd
        }
      }),
      
      // Entregados este mes
      Order.countDocuments({
        ...baseFilter,
        order_date: { $gte: thisMonthStart },
        status: 'delivered'
      }),
      
      // Entregados mes pasado
      Order.countDocuments({
        ...baseFilter,
        order_date: { 
          $gte: lastMonthStart,
          $lte: lastMonthEnd
        },
        status: 'delivered'
      }),
      
      // Total pedidos este mes
      Order.countDocuments({
        ...baseFilter,
        order_date: { $gte: thisMonthStart }
      }),
      
      // Total pedidos mes pasado
      Order.countDocuments({
        ...baseFilter,
        order_date: { 
          $gte: lastMonthStart,
          $lte: lastMonthEnd
        }
      })
    ]);
    
    // Calcular trends
    const calculateTrend = (current, previous, label) => {
      if (previous === 0) {
        return current > 0 ? 
          { direction: 'up', percentage: 100, label } :
          { direction: 'neutral', percentage: 0, label };
      }
      
      const percentageChange = Math.round(((current - previous) / previous) * 100);
      
      return {
        direction: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'neutral',
        percentage: Math.abs(percentageChange),
        label,
        current,
        previous
      };
    };
    
    // Calcular tasa de entrega
    const thisMonthDeliveryRate = thisMonthTotal > 0 ? (thisMonthDelivered / thisMonthTotal) * 100 : 0;
    const lastMonthDeliveryRate = lastMonthTotal > 0 ? (lastMonthDelivered / lastMonthTotal) * 100 : 0;
    
    const trends = {
      orders_today: calculateTrend(todayOrders, yesterdayOrders, 'vs ayer'),
      orders_month: calculateTrend(thisMonthOrders, lastMonthOrders, 'vs mes anterior'),
      delivered: {
        direction: thisMonthDeliveryRate > lastMonthDeliveryRate ? 'up' : 
                  thisMonthDeliveryRate < lastMonthDeliveryRate ? 'down' : 'neutral',
        percentage: Math.abs(Math.round(thisMonthDeliveryRate - lastMonthDeliveryRate)),
        label: 'vs mes anterior',
        current_rate: Math.round(thisMonthDeliveryRate),
        previous_rate: Math.round(lastMonthDeliveryRate)
      }
    };
    
    res.json({
      success: true,
      data: trends,
      metadata: {
        calculation_date: now,
        company_id: companyId,
        is_admin: isAdmin
      }
    });
    
  } catch (error) {
    console.error('Error calculando trends del dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor calculando tendencias' 
    });
  }
});


module.exports = router;