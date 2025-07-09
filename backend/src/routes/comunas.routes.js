// backend/src/routes/communes.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const mongoose = require('mongoose');

// ==================== RUTAS DE COMUNAS ====================

// Obtener lista de comunas que maneja enviGo
router.get('/envigo', authenticateToken, async (req, res) => {
  try {
    // Comunas específicas que maneja enviGo
    const envigoCommunes = [
      'Macul',
      'San Miguel', 
      'Santiago Centro',
      'La Florida',
      'Peñalolén',
      'Las Condes',
      'Vitacura',
      'Quinta Normal',
      'Independencia',
      'Recoleta',
      'Huechuraba',
      'Quilicura',
      'Estación Central',
      'Ñuñoa',
      'La Reina',
      'San Joaquín',
      'Pedro Aguirre Cerda',
      'Cerrillos',
      'Renca',
      'La Granja',
      'La Cisterna',
      'San Ramón',
      'Cerro Navia'
    ];
    
    // Agrupar por zonas geográficas para mejor organización
    const communesByZone = {
      'Zona Norte': ['Huechuraba', 'Quilicura', 'Recoleta', 'Independencia'],
      'Zona Centro': ['Santiago Centro', 'Estación Central', 'Quinta Normal'],
      'Zona Oriente': ['Las Condes', 'Vitacura', 'Ñuñoa', 'La Reina', 'Peñalolén', 'Macul'],
      'Zona Sur': ['San Miguel', 'San Joaquín', 'Pedro Aguirre Cerda', 'La Cisterna', 'San Ramón', 'La Granja'],
      'Zona Poniente': ['Cerrillos', 'Renca', 'Cerro Navia'],
      'Zona Sur-Oriente': ['La Florida']
    };
    
    res.json({
      success: true,
      total_communes: envigoCommunes.length,
      communes: envigoCommunes.sort(),
      communes_by_zone: communesByZone,
      message: 'Comunas que maneja enviGo'
    });
  } catch (error) {
    console.error('❌ Error obteniendo comunas de enviGo:', error);
    res.status(500).json({ error: 'Error obteniendo comunas de enviGo' });
  }
});

// Obtener comunas disponibles en pedidos (para estadísticas)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const { company_id } = req.query;
    
    const filters = {};
    
    // Aplicar filtro de empresa según el rol del usuario
    if (req.user.role === 'admin') {
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }
    } else {
      if (req.user.company_id) {
        filters.company_id = new mongoose.Types.ObjectId(req.user.company_id);
      }
    }
    
    console.log('🏘️ Obteniendo comunas disponibles con filtros:', filters);
    
    // Pipeline de agregación para obtener comunas únicas
    const communes = await Order.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$shipping_commune',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          commune: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    console.log('✅ Comunas encontradas:', communes.length);
    
    res.json({
      success: true,
      communes: communes.map(c => c.commune),
      detailed: communes,
      total: communes.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo comunas disponibles:', error);
    res.status(500).json({ error: 'Error obteniendo comunas disponibles' });
  }
});

module.exports = router;