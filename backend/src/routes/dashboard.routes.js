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
    console.log('📊 BACKEND: Generando estadísticas del dashboard...');
    console.log('👤 Usuario:', { 
      id: req.user.id, 
      role: req.user.role, 
      company_id: req.user.company_id 
    });

    let stats = {};
    const isAdmin = req.user.role === 'admin';
    const companyId = isAdmin ? null : req.user.company_id;

    if (isAdmin) {
      // Estadísticas para admin (código existente...)
      stats = await generateAdminStats();
    } else {
      // MEJORADO: Estadísticas específicas para empresa
      stats = await generateCompanyStats(companyId);
    }

    res.json({
      success: true,
      data: stats,
      metadata: {
        generated_at: new Date(),
        user_role: req.user.role,
        company_id: req.user.company_id || null
      }
    });

  } catch (error) {
    console.error('❌ BACKEND: Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para trends (nuevo)
router.get('/dashboard/trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 BACKEND: Calculando trends...');
    
    const isAdmin = req.user.role === 'admin';
    const companyId = isAdmin ? null : req.user.company_id;
    
    // Filtro base según el rol
    const baseFilter = isAdmin ? {} : { company_id: new mongoose.Types.ObjectId(companyId) };
    
    // Fechas para comparaciones
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    console.log('📈 BACKEND: Fechas de comparación:', {
      today: today.toISOString(),
      yesterday: yesterday.toISOString(),
      thisMonthStart: thisMonthStart.toISOString(),
      lastMonthStart: lastMonthStart.toISOString()
    });
    
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
      
      // Total pedidos este mes (para calcular tasa)
      Order.countDocuments({
        ...baseFilter,
        order_date: { $gte: thisMonthStart }
      }),
      
      // Total pedidos mes pasado (para calcular tasa)
      Order.countDocuments({
        ...baseFilter,
        order_date: { 
          $gte: lastMonthStart,
          $lte: lastMonthEnd
        }
      })
    ]);
    
    console.log('📈 BACKEND: Datos obtenidos:', {
      todayOrders,
      yesterdayOrders,
      thisMonthOrders,
      lastMonthOrders,
      thisMonthDelivered,
      lastMonthDelivered
    });
    
    // Función para calcular trend
    const calculateTrend = (current, previous, label) => {
      if (previous === 0) {
        return current > 0 ? 
          { direction: 'up', percentage: 100, label, current, previous } :
          { direction: 'neutral', percentage: 0, label, current, previous };
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
        previous_rate: Math.round(lastMonthDeliveryRate),
        current: thisMonthDelivered,
        previous: lastMonthDelivered
      }
    };
    
    console.log('✅ BACKEND: Trends calculados:', trends);
    
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
    console.error('❌ BACKEND: Error calculando trends del dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor calculando tendencias',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

router.get('/dashboard/chart-data', authenticateToken, async (req, res) => {
  try {
    console.log('📈 BACKEND: Generando datos de gráfico...');
    
    const { period = '30d', company_id } = req.query;
    const isAdmin = req.user.role === 'admin';
    const targetCompanyId = isAdmin && company_id ? company_id : req.user.company_id;

    // Calcular fecha de inicio según período
    const endDate = new Date();
    const startDate = new Date();
    
    switch(period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Filtros para la consulta
    const matchFilters = {
      order_date: { $gte: startDate, $lte: endDate }
    };

    if (!isAdmin && targetCompanyId) {
      matchFilters.company_id = new mongoose.Types.ObjectId(targetCompanyId);
    }

    console.log('🔍 Filtros para chart data:', matchFilters);

    // Agregación por días
    const chartData = await Order.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: {
            year: { $year: '$order_date' },
            month: { $month: '$order_date' },
            day: { $dayOfMonth: '$order_date' }
          },
          total_orders: { $sum: 1 },
          delivered_orders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          pending_orders: {
            $sum: { $cond: [{ $ne: ['$status', 'delivered'] }, 1, 0] }
          },
          total_revenue: { $sum: '$total_amount' }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          total_orders: 1,
          delivered_orders: 1,
          pending_orders: 1,
          total_revenue: { $round: ['$total_revenue', 2] },
          delivery_rate: {
            $multiply: [
              { $divide: ['$delivered_orders', '$total_orders'] },
              100
            ]
          },
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    console.log('✅ Chart data generado:', chartData.length, 'puntos');

    res.json({
      success: true,
      data: chartData,
      metadata: {
        period,
        start_date: startDate,
        end_date: endDate,
        company_id: targetCompanyId,
        points_count: chartData.length
      }
    });

  } catch (error) {
    console.error('❌ BACKEND: Error generando chart data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error generando datos del gráfico',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

async function generateCompanyStats(companyId) {
  if (!companyId) {
    throw new Error('Company ID es requerido para estadísticas de empresa');
  }

  console.log('🏢 Generando stats para company:', companyId);

  // Fechas para cálculos
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Filtro base para la empresa
  const companyFilter = { company_id: new mongoose.Types.ObjectId(companyId) };

  // Consultas en paralelo
  const [
    totalOrders,
    ordersToday,
    ordersThisMonth,
    deliveredTotal,
    ordersByStatus,
    channels,
    company
  ] = await Promise.all([
    // Total de pedidos de la empresa
    Order.countDocuments(companyFilter),
    
    // Pedidos de hoy
    Order.countDocuments({ 
      ...companyFilter,
      order_date: { $gte: today } 
    }),
    
    // Pedidos del mes actual
    Order.countDocuments({ 
      ...companyFilter,
      order_date: { $gte: thisMonthStart } 
    }),
    
    // Total entregados
    Order.countDocuments({ 
      ...companyFilter,
      status: 'delivered' 
    }),
    
    // Pedidos por estado
    Order.aggregate([
      { $match: companyFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    
    // Canales de la empresa
    Channel.countDocuments({ company_id: new mongoose.Types.ObjectId(companyId) }),
    
    // Información de la empresa
    Company.findById(companyId).select('price_per_order name')
  ]);

  // Procesar datos
  const pricePerOrder = company?.price_per_order || 1500;
  const estimatedMonthlyCost = ordersThisMonth * pricePerOrder;

  const stats = {
    // Métricas principales
    orders: totalOrders,
    channels,
    ordersByStatus: ordersByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    
    // Métricas específicas
    ordersToday,
    monthlyOrders: ordersThisMonth,
    deliveredTotal,
    estimatedMonthlyCost,
    pricePerOrder,
    
    // Tasas calculadas
    deliveryRate: totalOrders > 0 ? Math.round((deliveredTotal / totalOrders) * 100) : 0,
    monthlyGrowth: await calculateMonthlyGrowth(companyId, thisMonthStart),
    
    // Meta información
    role: 'company',
    company_id: companyId,
    company_name: company?.name,
    calculatedAt: new Date()
  };

  console.log('✅ BACKEND: Stats empresa generadas:', {
    totalOrders,
    ordersToday,
    monthlyOrders: ordersThisMonth,
    deliveredTotal,
    channels
  });

  return stats;
}

// Nueva función para calcular crecimiento mensual
async function calculateMonthlyGrowth(companyId, thisMonthStart) {
  try {
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    
    const lastMonthEnd = new Date(thisMonthStart);
    lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);

    const companyFilter = { company_id: new mongoose.Types.ObjectId(companyId) };

    const [thisMonth, lastMonth] = await Promise.all([
      Order.countDocuments({
        ...companyFilter,
        order_date: { $gte: thisMonthStart }
      }),
      Order.countDocuments({
        ...companyFilter,
        order_date: { $gte: lastMonthStart, $lte: lastMonthEnd }
      })
    ]);

    if (lastMonth === 0) return { percentage: 0, direction: 'neutral' };
    
    const growth = ((thisMonth - lastMonth) / lastMonth) * 100;
    
    return {
      percentage: Math.abs(Math.round(growth)),
      direction: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral',
      this_month: thisMonth,
      last_month: lastMonth
    };
    
  } catch (error) {
    console.error('Error calculando crecimiento mensual:', error);
    return { percentage: 0, direction: 'neutral' };
  }
}

module.exports = router;