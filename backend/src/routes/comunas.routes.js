const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  isAdmin,
  isCompanyOwner,
  hasCompanyAccess
} = require('../middlewares/auth.middleware');
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const mongoose = require('mongoose');

// ==================== RUTAS DE COMUNAS ====================

// Lista completa y actualizada de comunas que maneja enviGo
const ENVIGO_COMMUNES = [
  // Zona Norte
  'Huechuraba',
  'Quilicura', 
  'Recoleta',
  'Independencia',
  'Conchalí',
  
  // Zona Centro
  'Santiago',
  'Santiago Centro',
  'Estación Central',
  'Quinta Normal',
  'Providencia',
  
  // Zona Oriente
  'Las Condes',
  'Vitacura',
  'Ñuñoa',
  'La Reina',
  'Peñalolén',
  'Macul',
  'Lo Barnechea',
  
  // Zona Sur
  'San Miguel',
  'San Joaquín',
  'Pedro Aguirre Cerda',
  'La Cisterna',
  'San Ramón',
  'La Granja',
  'El Bosque',
  'Lo Espejo',
  
  // Zona Poniente
  'Cerrillos',
  'Renca',
  'Cerro Navia',
  'Pudahuel',
  'Maipú',
  
  // Zona Sur-Oriente
  'La Florida',
  'Puente Alto',
  'San Bernardo'
];

const COMMUNES_BY_ZONE = {
  'Zona Norte': [
    'Huechuraba', 
    'Quilicura', 
    'Recoleta', 
    'Independencia', 
    'Conchalí'
  ],
  'Zona Centro': [
    'Santiago', 
    'Santiago Centro', 
    'Estación Central', 
    'Quinta Normal', 
    'Providencia'
  ],
  'Zona Oriente': [
    'Las Condes', 
    'Vitacura', 
    'Ñuñoa', 
    'La Reina', 
    'Peñalolén', 
    'Macul', 
    'Lo Barnechea'
  ],
  'Zona Sur': [
    'San Miguel', 
    'San Joaquín', 
    'Pedro Aguirre Cerda', 
    'La Cisterna', 
    'San Ramón', 
    'La Granja', 
    'El Bosque', 
    'Lo Espejo'
  ],
  'Zona Poniente': [
    'Cerrillos', 
    'Renca', 
    'Cerro Navia', 
    'Pudahuel', 
    'Maipú'
  ],
  'Zona Sur-Oriente': [
    'La Florida', 
    'Puente Alto', 
    'San Bernardo'
  ]
};

// Función para normalizar nombres de comunas (quitar acentos, espacios extra, etc.)
function normalizeCommune(commune) {
  if (!commune || typeof commune !== 'string') return '';
  
  return commune
    .trim()
    .toLowerCase()
    // Quitar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Capitalizar primera letra de cada palabra
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Obtener lista de comunas que maneja enviGo
router.get('/envigo', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      total_communes: ENVIGO_COMMUNES.length,
      communes: ENVIGO_COMMUNES.sort(),
      communes_by_zone: COMMUNES_BY_ZONE,
      message: 'Comunas que maneja enviGo en la Región Metropolitana'
    });
  } catch (error) {
    console.error('❌ Error obteniendo comunas de enviGo:', error);
    res.status(500).json({ error: 'Error obteniendo comunas de enviGo' });
  }
});

// Obtener comunas disponibles en pedidos (mejorado con normalización)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const { company_id, include_counts = 'true', normalize = 'true' } = req.query;
    
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
    
    // Pipeline de agregación mejorado
    const pipeline = [
      { $match: filters },
      {
        $match: {
          shipping_commune: { 
            $exists: true, 
            $ne: null, 
            $ne: '', 
            $ne: 'null',
            $ne: 'undefined'
          }
        }
      }
    ];

    // Si queremos incluir conteos, agregamos group
    if (include_counts === 'true') {
      pipeline.push(
        {
          $group: {
            _id: '$shipping_commune',
            count: { $sum: 1 },
            latest_order: { $max: '$order_date' },
            earliest_order: { $min: '$order_date' }
          }
        },
        {
          $project: {
            commune: '$_id',
            count: 1,
            latest_order: 1,
            earliest_order: 1,
            _id: 0
          }
        }
      );
    } else {
      pipeline.push(
        {
          $group: {
            _id: '$shipping_commune'
          }
        },
        {
          $project: {
            commune: '$_id',
            _id: 0
          }
        }
      );
    }

    pipeline.push({ $sort: { commune: 1 } });

    const results = await Order.aggregate(pipeline);
    
    // Normalizar nombres de comunas si está habilitado
    let processedResults = results;
    if (normalize === 'true') {
      processedResults = results.map(result => ({
        ...result,
        commune: normalizeCommune(result.commune),
        original_commune: result.commune
      }));
      
      // Eliminar duplicados después de normalizar
      const uniqueCommunes = new Map();
      processedResults.forEach(result => {
        const normalizedName = result.commune;
        if (!uniqueCommunes.has(normalizedName)) {
          uniqueCommunes.set(normalizedName, result);
        } else {
          // Si ya existe, sumar los conteos
          const existing = uniqueCommunes.get(normalizedName);
          if (result.count) {
            existing.count = (existing.count || 0) + (result.count || 0);
          }
        }
      });
      
      processedResults = Array.from(uniqueCommunes.values()).sort((a, b) => 
        a.commune.localeCompare(b.commune)
      );
    }
    
    // Separar comunas que maneja enviGo vs otras
    const envigoCommunes = [];
    const otherCommunes = [];
    const normalizedEnvigoCommunes = ENVIGO_COMMUNES.map(c => normalizeCommune(c));
    
    processedResults.forEach(result => {
      const normalizedCommune = normalizeCommune(result.commune);
      if (normalizedEnvigoCommunes.includes(normalizedCommune)) {
        envigoCommunes.push(result);
      } else {
        otherCommunes.push(result);
      }
    });
    
    console.log(`✅ Comunas encontradas: ${processedResults.length} total (${envigoCommunes.length} enviGo, ${otherCommunes.length} otras)`);
    
    const response = {
      success: true,
      total: processedResults.length,
      envigo_communes_count: envigoCommunes.length,
      other_communes_count: otherCommunes.length,
      communes: processedResults.map(c => c.commune),
    };

    // Incluir información detallada si se solicita
    if (include_counts === 'true') {
      response.detailed = {
        envigo_communes: envigoCommunes,
        other_communes: otherCommunes,
        all_communes: processedResults
      };
    } else {
      response.envigo_communes = envigoCommunes.map(c => c.commune);
      response.other_communes = otherCommunes.map(c => c.commune);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error obteniendo comunas disponibles:', error);
    res.status(500).json({ error: 'Error obteniendo comunas disponibles' });
  }
});

// NUEVO: Obtener estadísticas por comuna
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { company_id, date_from, date_to, limit = 50 } = req.query;
    
    const filters = {};
    
    // Filtro de empresa (mejorado)
    if (req.user.role === 'admin') {
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }
    } else {
      // Para usuarios de empresa, solo mostrar sus datos
      if (req.user.company_id) {
        filters.company_id = new mongoose.Types.ObjectId(req.user.company_id);
      } else {
        return res.status(403).json({ 
          error: 'Usuario sin empresa asignada no puede ver estadísticas' 
        });
      }
    }
    
    // Filtro de fechas
    if (date_from || date_to) {
      filters.order_date = {};
      if (date_from) filters.order_date.$gte = new Date(date_from);
      if (date_to) filters.order_date.$lte = new Date(date_to);
    }
    
    console.log('📊 Obteniendo estadísticas por comuna con filtros:', filters);
    
    const stats = await Order.aggregate([
      { $match: filters },
      {
        // Filtrar solo órdenes con comuna válida
        $match: {
          shipping_commune: { 
            $exists: true, 
            $ne: null, 
            $ne: '', 
            $ne: 'null',
            $ne: 'undefined'
          }
        }
      },
      {
        $group: {
          _id: '$shipping_commune',
          total_orders: { $sum: 1 },
          delivered_orders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          pending_orders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processing_orders: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          cancelled_orders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          total_revenue: { $sum: '$total_amount' },
          avg_order_value: { $avg: '$total_amount' },
          latest_order: { $max: '$order_date' },
          earliest_order: { $min: '$order_date' }
        }
      },
      {
        $project: {
          commune: '$_id',
          total_orders: 1,
          delivered_orders: 1,
          pending_orders: 1,
          processing_orders: 1,
          cancelled_orders: 1,
          delivery_rate: {
            $multiply: [
              { 
                $cond: [
                  { $eq: ['$total_orders', 0] },
                  0,
                  { $divide: ['$delivered_orders', '$total_orders'] }
                ]
              },
              100
            ]
          },
          total_revenue: { $round: ['$total_revenue', 2] },
          avg_order_value: { $round: ['$avg_order_value', 2] },
          latest_order: 1,
          earliest_order: 1,
          _id: 0
        }
      },
      { $sort: { total_orders: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    // Calcular totales globales
    const totalStats = stats.reduce((acc, stat) => ({
      total_orders: acc.total_orders + stat.total_orders,
      total_revenue: acc.total_revenue + stat.total_revenue,
      delivered_orders: acc.delivered_orders + stat.delivered_orders
    }), { total_orders: 0, total_revenue: 0, delivered_orders: 0 });
    
    // Agregar porcentaje relativo a cada comuna
    const statsWithPercentage = stats.map(stat => ({
      ...stat,
      percentage_of_total: totalStats.total_orders > 0 
        ? Math.round((stat.total_orders / totalStats.total_orders) * 100)
        : 0
    }));
    
    res.json({
      success: true,
      total_communes: stats.length,
      summary: {
        ...totalStats,
        overall_delivery_rate: totalStats.total_orders > 0 
          ? Math.round((totalStats.delivered_orders / totalStats.total_orders) * 100)
          : 0
      },
      filters_applied: filters,
      communes: statsWithPercentage
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas por comuna:', error);
    res.status(500).json({ 
      error: 'Error obteniendo estadísticas por comuna',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// NUEVO: Validar si una comuna es atendida por enviGo
router.get('/validate/:commune', authenticateToken, async (req, res) => {
  try {
    const { commune } = req.params;
    const normalizedInput = normalizeCommune(commune);
    const normalizedEnvigoCommunes = ENVIGO_COMMUNES.map(c => normalizeCommune(c));
    
    const isSupported = normalizedEnvigoCommunes.includes(normalizedInput);
    const exactMatch = ENVIGO_COMMUNES.find(c => 
      normalizeCommune(c) === normalizedInput
    );
    
    // Buscar coincidencias parciales si no hay match exacto
    const partialMatches = ENVIGO_COMMUNES.filter(c => 
      normalizeCommune(c).includes(normalizedInput) || 
      normalizedInput.includes(normalizeCommune(c))
    );
    
    res.json({
      success: true,
      commune: commune,
      normalized_commune: normalizedInput,
      is_supported: isSupported,
      exact_match: exactMatch || null,
      partial_matches: partialMatches,
      suggestion: exactMatch || (partialMatches.length > 0 ? partialMatches[0] : null)
    });
    
  } catch (error) {
    console.error('❌ Error validando comuna:', error);
    res.status(500).json({ error: 'Error validando comuna' });
  }
});

module.exports = router;