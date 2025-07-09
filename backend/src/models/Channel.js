// backend/src/models/Channel.js
const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Información básica del canal
  channel_name: {
    type: String,
    required: true,
    trim: true
  },
  
  platform: {
    type: String,
    enum: ['shopify', 'woocommerce', 'mercadolibre', 'manual'],
    required: true
  },
  
  // Configuración de conexión
  store_url: {
    type: String,
    required: true,
    trim: true
  },
  
  api_key: {
    type: String,
    required: true
  },
  
  api_secret: {
    type: String,
    required: true
  },
  
  // 🆕 CAMPO PARA COMUNAS ACEPTADAS
  accepted_communes: {
    type: [String],
    default: [],
    validate: {
      validator: function(communes) {
        // Validar que todas las comunas sean strings no vacíos
        return communes.every(commune => 
          typeof commune === 'string' && commune.trim().length > 0
        );
      },
      message: 'Todas las comunas deben ser strings no vacíos'
    }
  },
  
  // Configuración de webhooks
  webhook_secret: {
    type: String,
    default: ''
  },
  
  // Configuración de automatización
  auto_create_shipday: {
    type: Boolean,
    default: false
  },
  
  auto_assign_driver: {
    type: Boolean,
    default: false
  },
  
  // Estado del canal
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Configuración de importación
  sync_enabled: {
    type: Boolean,
    default: true
  },
  
  last_sync: {
    type: Date,
    default: null
  },
  
  sync_frequency: {
    type: String,
    enum: ['manual', 'hourly', 'daily', 'weekly'],
    default: 'manual'
  },
  
  // 🆕 ESTADÍSTICAS DE SINCRONIZACIÓN
  total_orders_synced: {
    type: Number,
    default: 0
  },
  
  total_orders_rejected: {
    type: Number,
    default: 0
  },
  
  // Configuración de filtros adicionales
  status_filter: {
    type: [String],
    default: ['processing', 'completed', 'shipped'],
    validate: {
      validator: function(statuses) {
        const allowedStatuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'shipped'];
        return statuses.every(status => allowedStatuses.includes(status));
      },
      message: 'Estado de filtro inválido'
    }
  },
  
  // Configuración de precios
  use_fixed_shipping_cost: {
    type: Boolean,
    default: true
  },
  
  // Configuración de notificaciones
  notify_new_orders: {
    type: Boolean,
    default: true
  },
  
  notify_status_changes: {
    type: Boolean,
    default: false
  },
  
  // Información de conexión
  connection_status: {
    type: String,
    enum: ['connected', 'disconnected', 'error', 'testing'],
    default: 'disconnected'
  },
  
  last_connection_test: {
    type: Date,
    default: null
  },
  
  connection_error: {
    type: String,
    default: ''
  },
  
  // Metadatos
  created_at: {
    type: Date,
    default: Date.now
  },
  
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updated_at
channelSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Índices para mejorar rendimiento
channelSchema.index({ company_id: 1, platform: 1 });
channelSchema.index({ is_active: 1 });
channelSchema.index({ last_sync: 1 });
channelSchema.index({ connection_status: 1 });

// 🆕 MÉTODOS PARA GESTIÓN DE COMUNAS

// Método para obtener comunas normalizadas
channelSchema.methods.getNormalizedCommunes = function() {
  if (!this.accepted_communes || this.accepted_communes.length === 0) {
    return [];
  }
  
  try {
    if (this.platform === 'woocommerce') {
      const WooCommerceService = require('../services/woocommerce.service');
      return this.accepted_communes.map(commune => 
        WooCommerceService.normalizeCommune(commune)
      );
    } else if (this.platform === 'shopify') {
      const ShopifyService = require('../services/shopify.service');
      return this.accepted_communes.map(commune => 
        ShopifyService.normalizeCommune(commune)
      );
    }
  } catch (error) {
    console.warn('Error normalizando comunas:', error);
  }
  
  return this.accepted_communes;
};

// Método para verificar si una comuna está permitida
channelSchema.methods.isCommuneAllowed = function(commune) {
  // Si no hay restricciones, permitir todas
  if (!this.accepted_communes || this.accepted_communes.length === 0) {
    return true;
  }
  
  // Si no hay comuna en el pedido, rechazar
  if (!commune || commune.trim() === '') {
    return false;
  }
  
  try {
    if (this.platform === 'woocommerce') {
      const WooCommerceService = require('../services/woocommerce.service');
      return WooCommerceService.isCommuneAllowed(commune, this.accepted_communes);
    } else if (this.platform === 'shopify') {
      const ShopifyService = require('../services/shopify.service');
      return ShopifyService.isCommuneAllowed(commune, this.accepted_communes);
    }
  } catch (error) {
    console.warn('Error verificando comuna:', error);
  }
  
  // Fallback: verificación simple
  const normalizedCommune = commune.trim().toLowerCase();
  return this.accepted_communes.some(allowedCommune => 
    allowedCommune.toLowerCase() === normalizedCommune
  );
};

// Método para obtener estadísticas del canal
channelSchema.methods.getStats = async function() {
  try {
    const Order = require('./Order');
    
    const stats = await Order.aggregate([
      { $match: { channel_id: this._id } },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          orders_this_month: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$order_date',
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    return stats[0] || {
      total_orders: 0,
      total_amount: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      orders_this_month: 0
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas del canal:', error);
    return {
      total_orders: 0,
      total_amount: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      orders_this_month: 0
    };
  }
};

// Método para probar la conexión
channelSchema.methods.testConnection = async function() {
  try {
    let result;
    
    if (this.platform === 'woocommerce') {
      const WooCommerceService = require('../services/woocommerce.service');
      result = await WooCommerceService.validateChannel(this);
    } else if (this.platform === 'shopify') {
      const ShopifyService = require('../services/shopify.service');
      result = await ShopifyService.validateChannel(this);
    } else {
      throw new Error('Plataforma no soportada');
    }
    
    // Actualizar estado de conexión
    this.connection_status = result.valid ? 'connected' : 'error';
    this.last_connection_test = new Date();
    this.connection_error = result.valid ? '' : result.error;
    
    await this.save();
    
    return result;
  } catch (error) {
    this.connection_status = 'error';
    this.last_connection_test = new Date();
    this.connection_error = error.message;
    
    await this.save();
    
    throw error;
  }
};

// Método para obtener resumen de configuración de comunas
channelSchema.methods.getCommuneSummary = function() {
  const acceptedCount = this.accepted_communes ? this.accepted_communes.length : 0;
  
  return {
    total_accepted: acceptedCount,
    allows_all: acceptedCount === 0,
    accepts_some: acceptedCount > 0,
    is_restrictive: acceptedCount > 0 && acceptedCount <= 5,
    is_moderate: acceptedCount > 5 && acceptedCount <= 15,
    is_permissive: acceptedCount > 15,
    communes_list: this.accepted_communes || [],
    filter_enabled: acceptedCount > 0,
    status_text: acceptedCount === 0 ? 
      'Acepta todas las comunas' : 
      `Acepta ${acceptedCount} comunas específicas`
  };
};

// Método para sincronizar pedidos con filtro de comunas
channelSchema.methods.syncWithCommuneFilter = async function(dateFrom = null, dateTo = null) {
  try {
    console.log(`🔄 Iniciando sincronización con filtro de comunas para canal ${this._id}`);
    
    let result = { imported: 0, rejected: 0, total: 0 };
    
    if (this.platform === 'woocommerce') {
      const WooCommerceService = require('../services/woocommerce.service');
      result = await WooCommerceService.syncOrders(this, dateFrom, dateTo);
    } else if (this.platform === 'shopify') {
      const ShopifyService = require('../services/shopify.service');
      result = await ShopifyService.syncOrders(this, dateFrom, dateTo);
    } else {
      throw new Error('Plataforma no soportada para sincronización');
    }
    
    // Actualizar estadísticas
    this.last_sync = new Date();
    if (typeof result.imported === 'number') {
      this.total_orders_synced = (this.total_orders_synced || 0) + result.imported;
    }
    if (typeof result.rejected === 'number') {
      this.total_orders_rejected = (this.total_orders_rejected || 0) + result.rejected;
    }
    
    await this.save();
    
    return result;
  } catch (error) {
    console.error('Error en sincronización:', error);
    throw error;
  }
};

module.exports = mongoose.model('Channel', channelSchema);