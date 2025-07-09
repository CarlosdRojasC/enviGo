const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  channel_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Channel', 
    required: true 
  },
  sync_type: { 
    type: String, 
    required: true,
    enum: ['manual', 'automatic', 'webhook'],
    default: 'manual'
  },
  status: { 
    type: String, 
    required: true,
    enum: ['processing', 'success', 'failed'],
    default: 'processing'
  },
  
  // Información detallada de sincronización
  orders_synced: { 
    type: Number, 
    default: 0,
    min: 0
  },
  orders_rejected: { 
    type: Number, 
    default: 0,
    min: 0
  },
  orders_total_processed: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // Detalles adicionales
  sync_details: {
    date_from: { type: Date },
    date_to: { type: Date },
    pages_processed: { type: Number, default: 0 },
    rejection_reasons: [{
      order_id: String,
      reason: String
    }]
  },
  
  error_message: { type: String },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date }
});

// Índices para mejorar rendimiento
syncLogSchema.index({ channel_id: 1, started_at: -1 });
syncLogSchema.index({ status: 1 });
syncLogSchema.index({ sync_type: 1 });

// Middleware para calcular duración
syncLogSchema.virtual('duration_minutes').get(function() {
  if (!this.started_at || !this.completed_at) return null;
  return Math.round((this.completed_at - this.started_at) / (1000 * 60));
});

// Método para actualizar con resultado detallado
syncLogSchema.methods.updateWithResult = function(result) {
  if (typeof result === 'number') {
    // Resultado simple (número)
    this.orders_synced = result;
    this.orders_total_processed = result;
  } else if (typeof result === 'object' && result !== null) {
    // Resultado detallado (objeto)
    this.orders_synced = result.imported || result.orders_synced || 0;
    this.orders_rejected = result.rejected || result.orders_rejected || 0;
    this.orders_total_processed = result.total || result.total_processed || 
                                 (this.orders_synced + this.orders_rejected);
    
    // Guardar detalles adicionales si están disponibles
    if (result.rejection_reasons) {
      this.sync_details.rejection_reasons = result.rejection_reasons;
    }
  }
  
  this.status = 'success';
  this.completed_at = new Date();
  return this;
};

// Método para marcar como fallido
syncLogSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.error_message = errorMessage;
  this.completed_at = new Date();
  return this;
};

// Método estático para obtener estadísticas de sincronización
syncLogSchema.statics.getChannelStats = async function(channelId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        channel_id: new mongoose.Types.ObjectId(channelId),
        started_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_orders_synced: { $sum: '$orders_synced' },
        total_orders_rejected: { $sum: '$orders_rejected' }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      orders_synced: stat.total_orders_synced,
      orders_rejected: stat.total_orders_rejected
    };
    return acc;
  }, {});
};

module.exports = mongoose.model('SyncLog', syncLogSchema);