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
        // Solo validar URL si se proporciona
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'La URL de la tienda debe ser válida'
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
  last_sync: { 
    type: Date 
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
        // Validar que todas las comunas sean strings no vacíos
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

// Índice compuesto para evitar nombres duplicados dentro de la misma empresa
channelSchema.index({ company_id: 1, channel_name: 1 }, { unique: true });

// Índice para búsquedas por tipo de canal
channelSchema.index({ channel_type: 1 });

// Índice para búsquedas por estado activo
channelSchema.index({ is_active: 1 });

// Método para obtener configuración completa del canal
channelSchema.methods.getConfig = function() {
  return {
    id: this._id,
    type: this.channel_type,
    name: this.channel_name,
    api_key: this.api_key,
    api_secret: this.api_secret,
    store_url: this.store_url,
    webhook_secret: this.webhook_secret,
    accepted_communes: this.accepted_communes
  };
};

// Método para verificar si el canal está configurado correctamente
channelSchema.methods.isConfiguredCorrectly = function() {
  const requiredFields = ['channel_type', 'channel_name'];
  
  // Verificar campos básicos
  for (const field of requiredFields) {
    if (!this[field]) {
      return { valid: false, error: `Campo requerido faltante: ${field}` };
    }
  }
  
  // Verificar campos específicos según el tipo de canal
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
    case CHANNEL_TYPES.MERCADOLIBRE:
      if (!this.api_key) {
        return { 
          valid: false, 
          error: 'MercadoLibre requiere API key' 
        };
      }
      break;
  }
  
  return { valid: true };
};

// Método estático para obtener tipos de canal disponibles
channelSchema.statics.getChannelTypes = function() {
  return Object.values(CHANNEL_TYPES);
};
channelSchema.methods.getSyncStatus = function() {
  const lastSync = this.last_sync_at || this.last_sync;
  
  if (!lastSync) {
    return {
      status: 'never_synced',
      message: 'Nunca sincronizado',
      needsSync: true,
      daysSinceSync: null
    };
  }
  
  const now = new Date();
  const syncDate = new Date(lastSync);
  const diffTime = Math.abs(now - syncDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return {
      status: 'synced_today',
      message: 'Sincronizado hoy',
      needsSync: false,
      daysSinceSync: 0
    };
  } else if (diffDays <= 1) {
    return {
      status: 'recent',
      message: 'Sincronizado recientemente',
      needsSync: false,
      daysSinceSync: diffDays
    };
  } else if (diffDays <= 7) {
    return {
      status: 'needs_sync',
      message: `Hace ${diffDays} días`,
      needsSync: true,
      daysSinceSync: diffDays
    };
  } else {
    return {
      status: 'outdated',
      message: `Hace ${diffDays} días`,
      needsSync: true,
      daysSinceSync: diffDays
    };
  }
};
module.exports = mongoose.model('Channel', channelSchema);