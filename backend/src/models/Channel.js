// backend/src/models/Channel.js - MODELO ACTUALIZADO CON SYNC
const mongoose = require('mongoose');
const { CHANNEL_TYPES } = require('../config/constants');

const channelSchema = new mongoose.Schema({
  company_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  channel_type: { 
    type: String, 
    required: [true, 'El tipo de canal es obligatorio'],
    enum: {
      values: Object.values(CHANNEL_TYPES),
      message: 'Tipo de canal no válido. Valores permitidos: {VALUE}'
    }
  },
  settings: {
    type: Object,
    default: {} // ✅ ASEGURAR QUE TENGA DEFAULT
  },

  channel_name: { 
    type: String, 
    required: [true, 'El nombre del canal es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre del canal no puede exceder 100 caracteres']
  },
  api_key: { 
    type: String,
    trim: true
  },
  api_secret: { 
    type: String,
    trim: true
  },
 store_url: { 
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // ✅ Si no hay valor, permitir (excepto para canales que lo requieren)
        if (!v) {
          // Para general_store, el store_url es opcional
          if (this.channel_type === 'general_store') {
            return true;
          }
          // Para otros canales, verificar si es requerido
          return !['shopify', 'woocommerce', 'mercadolibre'].includes(this.channel_type);
        }
        
        // ✅ Si hay valor, debe ser una URL válida
        return /^https?:\/\/.+/.test(v);
      },
      message: function(props) {
        if (!props.value) {
          return `La URL de la tienda es requerida para ${this.channel_type}`;
        }
        return 'La URL de la tienda debe ser válida (debe comenzar con http:// o https://)';
      }
    }
  },
  webhook_secret: { 
    type: String,
    trim: true
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  
  // ========== NUEVOS CAMPOS DE SINCRONIZACIÓN ==========
  webhook_configured: { 
    type: Boolean, 
    default: false 
  },
  auto_sync_enabled: { 
    type: Boolean, 
    default: true 
  },
  sync_frequency_minutes: { 
    type: Number, 
    default: 5,
    min: 1,
    max: 1440 // Máximo 24 horas
  },
  last_sync: { 
    type: Date 
  },
  last_sync_orders: { 
    type: Number, 
    default: 0 
  },
  sync_status: { 
    type: String,
    enum: ['success', 'error', 'pending', 'never'],
    default: 'never'
  },
  last_sync_error: { 
    type: String 
  },
  sync_stats: {
    total_syncs: { type: Number, default: 0 },
    successful_syncs: { type: Number, default: 0 },
    failed_syncs: { type: Number, default: 0 },
    total_orders_imported: { type: Number, default: 0 }
  },
  
  // ========== CONFIGURACIÓN AVANZADA ==========
  sync_config: {
    include_cancelled: { type: Boolean, default: false },
    include_refunded: { type: Boolean, default: false },
    min_order_amount: { type: Number, default: 0 },
    sync_historical_days: { type: Number, default: 30 }
  },
  
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  },
  accepted_communes: {
    type: [String],
    default: [],
    validate: {
      validator: function(communes) {
        return communes.every(commune => 
          typeof commune === 'string' && commune.trim().length > 0
        );
      },
      message: 'Todas las comunas deben ser strings válidos'
    }
  }
});

// Middleware para actualizar updated_at antes de guardar
channelSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Middleware para validar campos requeridos según el tipo de canal
channelSchema.pre('save', function(next) {
  if (this.channel_type === CHANNEL_TYPES.SHOPIFY) {
    if (!this.api_key || !this.api_secret || !this.store_url) {
      return next(new Error('Shopify requiere API key, secret y URL de la tienda'));
    }
  }
  
  if (this.channel_type === CHANNEL_TYPES.WOOCOMMERCE) {
    if (!this.api_key || !this.api_secret || !this.store_url) {
      return next(new Error('WooCommerce requiere API key, secret y URL de la tienda'));
    }
  }
  
  next();
});

// Índices
channelSchema.index({ company_id: 1, channel_name: 1 }, { unique: true });
channelSchema.index({ channel_type: 1 });
channelSchema.index({ is_active: 1 });
channelSchema.index({ auto_sync_enabled: 1 });
channelSchema.index({ last_sync: 1 });
channelSchema.index({ sync_status: 1 });

// ========== MÉTODOS NUEVOS ==========

// Método para actualizar estadísticas de sincronización
channelSchema.methods.updateSyncStats = function(success, ordersImported = 0, error = null) {
  this.sync_stats.total_syncs += 1;
  
  if (success) {
    this.sync_stats.successful_syncs += 1;
    this.sync_stats.total_orders_imported += ordersImported;
    this.last_sync = new Date();
    this.last_sync_orders = ordersImported;
    this.sync_status = 'success';
    this.last_sync_error = null;
  } else {
    this.sync_stats.failed_syncs += 1;
    this.sync_status = 'error';
    this.last_sync_error = error;
  }
  
  return this.save();
};

// Método para verificar si necesita sincronización
channelSchema.methods.needsSync = function() {
  if (!this.auto_sync_enabled || !this.is_active) {
    return false;
  }
  
  if (!this.last_sync) {
    return true; // Nunca se ha sincronizado
  }
  
  const now = new Date();
  const lastSync = new Date(this.last_sync);
  const diffMinutes = (now - lastSync) / (1000 * 60);
  
  return diffMinutes >= this.sync_frequency_minutes;
};

// Método para obtener el estado de sincronización
channelSchema.methods.getSyncStatus = function() {
  const lastSync = this.last_sync;
  
  if (!lastSync) {
    return {
      status: 'never_synced',
      message: 'Nunca sincronizado',
      needsSync: true,
      minutesSinceSync: null,
      health: 'warning'
    };
  }
  
  const now = new Date();
  const syncDate = new Date(lastSync);
  const diffMinutes = Math.floor((now - syncDate) / (1000 * 60));
  
  let status, message, health;
  
  if (diffMinutes < this.sync_frequency_minutes) {
    status = 'synced_recently';
    message = `Hace ${diffMinutes} minutos`;
    health = 'good';
  } else if (diffMinutes < this.sync_frequency_minutes * 2) {
    status = 'sync_due';
    message = `Retraso de ${diffMinutes - this.sync_frequency_minutes} minutos`;
    health = 'warning';
  } else {
    status = 'sync_overdue';
    message = `Retraso de ${Math.floor(diffMinutes / 60)} horas`;
    health = 'error';
  }
  
  return {
    status,
    message,
    needsSync: this.needsSync(),
    minutesSinceSync: diffMinutes,
    health,
    sync_stats: this.sync_stats,
    last_error: this.last_sync_error
  };
};

// Método para configurar webhook automáticamente
channelSchema.methods.setupWebhook = async function() {
  try {
    // Lógica para configurar webhook según el tipo de canal
    const webhookUrl = `${process.env.API_BASE_URL}/webhook/${this.channel_type}/${this._id}`;
    
    switch (this.channel_type) {
      case 'shopify':
        // Configurar webhook de Shopify
        break;
      case 'woocommerce':
        // Configurar webhook de WooCommerce
        break;
    }
    
    this.webhook_configured = true;
    await this.save();
    
    return true;
  } catch (error) {
    console.error('Error configurando webhook:', error);
    return false;
  }
};

// Método para obtener configuración completa
channelSchema.methods.getConfig = function() {
  return {
    id: this._id,
    type: this.channel_type,
    name: this.channel_name,
    api_key: this.api_key,
    api_secret: this.api_secret,
    store_url: this.store_url,
    webhook_secret: this.webhook_secret,
    accepted_communes: this.accepted_communes,
    auto_sync_enabled: this.auto_sync_enabled,
    sync_frequency_minutes: this.sync_frequency_minutes
  };
};

// Método para verificar configuración
channelSchema.methods.isConfiguredCorrectly = function() {
  const requiredFields = ['channel_type', 'channel_name'];
  
  for (const field of requiredFields) {
    if (!this[field]) {
      return { valid: false, error: `Campo requerido faltante: ${field}` };
    }
  }
  
  switch (this.channel_type) {
    case CHANNEL_TYPES.SHOPIFY:
    case CHANNEL_TYPES.WOOCOMMERCE:
      if (!this.api_key || !this.api_secret || !this.store_url) {
        return { 
          valid: false, 
          error: `${this.channel_type} requiere API key, secret y URL de la tienda` 
        };
      }
      break;
  }
  
  return { valid: true };
};

// Método estático para obtener canales que necesitan sincronización
channelSchema.statics.getChannelsNeedingSync = function() {
  return this.find({
    is_active: true,
    auto_sync_enabled: true,
    $or: [
      { last_sync: { $exists: false } },
      { 
        last_sync: { 
          $lt: new Date(Date.now() - 5 * 60 * 1000) // Hace más de 5 minutos
        } 
      }
    ]
  });
};

module.exports = mongoose.model('Channel', channelSchema);