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

    if (req.user.role === 'admin') {
      // Dashboard para administrador
      const [companies, orders, channels, users] = await Promise.all([
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

      // Ingresos del mes actual
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlyRevenue = await Order.aggregate([
        {
          $match: {
            order_date: { $gte: startOfMonth },
            status: { $in: ['delivered', 'shipped'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total_amount' }
          }
        }
      ]);

      stats = {
        companies,
        orders,
        channels,
        users,
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      };

    } else {
      // Dashboard para empresa
      const companyId = req.user.company_id;

      const [orders, channels] = await Promise.all([
        Order.countDocuments({ company_id: companyId }),
        Channel.countDocuments({ company_id: companyId, is_active: true })
      ]);

      // Estadísticas de órdenes por estado para la empresa
      const ordersByStatus = await Order.aggregate([
        { $match: { company_id: new mongoose.Types.ObjectId(companyId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Órdenes del mes actual para la empresa
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlyOrders = await Order.countDocuments({
        company_id: companyId,
        order_date: { $gte: startOfMonth }
      });

      stats = {
        orders,
        channels,
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyOrders
      };
    }

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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

module.exports = router;