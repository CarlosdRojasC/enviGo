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
  
  // 🏘️ NUEVO CAMPO: Comunas aceptadas
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
  
  // Estadísticas
  total_orders_synced: {
    type: Number,
    default: 0
  },
  
  total_orders_rejected: {
    type: Number,
    default: 0
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

// Método para obtener comunas normalizadas
channelSchema.methods.getNormalizedCommunes = function() {
  const WooCommerceService = require('../services/woocommerce.service');
  const ShopifyService = require('../services/shopify.service');
  
  if (this.platform === 'woocommerce') {
    return this.accepted_communes.map(commune => 
      WooCommerceService.normalizeCommune(commune)
    );
  } else if (this.platform === 'shopify') {
    return this.accepted_communes.map(commune => 
      ShopifyService.normalizeCommune(commune)
    );
  }
  
  return this.accepted_communes;
};

// Método para verificar si una comuna está permitida
channelSchema.methods.isCommuneAllowed = function(commune) {
  if (!this.accepted_communes || this.accepted_communes.length === 0) {
    return true;
  }
  
  const WooCommerceService = require('../services/woocommerce.service');
  const ShopifyService = require('../services/shopify.service');
  
  if (this.platform === 'woocommerce') {
    return WooCommerceService.isCommuneAllowed(commune, this.accepted_communes);
  } else if (this.platform === 'shopify') {
    return ShopifyService.isCommuneAllowed(commune, this.accepted_communes);
  }
  
  return this.accepted_communes.includes(commune);
};

// Método para obtener estadísticas del canal
channelSchema.methods.getStats = async function() {
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
};

// Método para probar la conexión
channelSchema.methods.testConnection = async function() {
  try {
    const WooCommerceService = require('../services/woocommerce.service');
    const ShopifyService = require('../services/shopify.service');
    
    let result;
    
    if (this.platform === 'woocommerce') {
      result = await WooCommerceService.validateChannel(this);
    } else if (this.platform === 'shopify') {
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

module.exports = mongoose.model('Channel', channelSchema);