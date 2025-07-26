// backend/src/models/Manifest.js

const mongoose = require('mongoose');

const manifestSchema = new mongoose.Schema({
  manifest_number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  order_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  }],
  total_orders: {
    type: Number,
    required: true,
    min: 1
  },
  total_packages: {
    type: Number,
    required: true,
    min: 1
  },
  communes: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['generated', 'printed', 'picked_up', 'cancelled'],
    default: 'generated',
    index: true
  },
  generated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generated_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Snapshot de datos al momento de generación
  manifest_data: {
    company: {
      name: String,
      address: String,
      phone: String,
      email: String
    },
    orders: [{
      _id: mongoose.Schema.Types.ObjectId,
      order_number: String,
      customer_name: String,
      shipping_commune: String,
      shipping_address: String,
      customer_phone: String,
      load1Packages: { type: Number, default: 1 },
      notes: String
    }],
    generation_date: Date,
    generated_by: String
  },
  // Archivos generados (PDF, Excel, etc.)
  files: [{
    type: {
      type: String,
      enum: ['pdf', 'excel']
    },
    filename: String,
    file_path: String,
    file_size: Number,
    generated_at: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'manifests'
});

// ==================== ÍNDICES ====================
manifestSchema.index({ company_id: 1, generated_at: -1 });
manifestSchema.index({ manifest_number: 1 }, { unique: true });
manifestSchema.index({ status: 1, company_id: 1 });

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Generar número de manifiesto único
 * Formato: MAN-YYYY-MM-DD-XXX (donde XXX es secuencial del día)
 */
manifestSchema.statics.generateManifestNumber = async function(companyId) {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const datePrefix = `MAN-${year}-${month}-${day}`;
    
    // Buscar el último manifiesto del día para esta empresa
    const lastManifest = await this.findOne({
      company_id: companyId,
      manifest_number: { $regex: `^${datePrefix}` }
    })
    .sort({ manifest_number: -1 })
    .lean();
    
    let sequence = 1;
    
    if (lastManifest) {
      // Extraer el número de secuencia del último manifiesto
      const lastSequence = lastManifest.manifest_number.split('-').pop();
      sequence = parseInt(lastSequence) + 1;
    }
    
    const sequenceStr = String(sequence).padStart(3, '0');
    const manifestNumber = `${datePrefix}-${sequenceStr}`;
    
    console.log(`📋 Número de manifiesto generado: ${manifestNumber}`);
    
    return manifestNumber;
    
  } catch (error) {
    console.error('❌ Error generando número de manifiesto:', error);
    
    // Fallback: usar timestamp
    const timestamp = Date.now();
    const fallbackNumber = `MAN-${timestamp}`;
    
    console.log(`⚠️ Usando número de manifiesto fallback: ${fallbackNumber}`);
    return fallbackNumber;
  }
};

/**
 * Buscar manifiestos por empresa y filtros
 */
manifestSchema.statics.findByCompany = function(companyId, filters = {}) {
  const query = { company_id: companyId, ...filters };
  return this.find(query)
    .populate('company_id', 'name address')
    .populate('generated_by', 'full_name email')
    .sort({ generated_at: -1 });
};

/**
 * Obtener estadísticas de manifiestos
 */
manifestSchema.statics.getStats = async function(companyId, dateFrom, dateTo) {
  const matchStage = { company_id: mongoose.Types.ObjectId(companyId) };
  
  if (dateFrom || dateTo) {
    matchStage.generated_at = {};
    if (dateFrom) matchStage.generated_at.$gte = new Date(dateFrom);
    if (dateTo) matchStage.generated_at.$lte = new Date(dateTo);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total_manifests: { $sum: 1 },
        total_orders: { $sum: '$total_orders' },
        total_packages: { $sum: '$total_packages' },
        by_status: {
          $push: {
            status: '$status',
            count: 1
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    total_manifests: 0,
    total_orders: 0,
    total_packages: 0,
    by_status: []
  };
};

// ==================== MÉTODOS DE INSTANCIA ====================

/**
 * Actualizar estado del manifiesto
 */
manifestSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  this.updated_at = new Date();
  
  // Log del cambio de estado
  console.log(`📋 Manifiesto ${this.manifest_number}: ${this.status} → ${newStatus}`);
  
  return this.save();
};

/**
 * Agregar archivo generado
 */
manifestSchema.methods.addFile = function(fileData) {
  this.files.push({
    type: fileData.type,
    filename: fileData.filename,
    file_path: fileData.file_path,
    file_size: fileData.file_size
  });
  
  return this.save();
};

/**
 * Verificar si puede ser editado
 */
manifestSchema.methods.canBeEdited = function() {
  return ['generated', 'printed'].includes(this.status);
};

/**
 * Verificar si puede ser cancelado
 */
manifestSchema.methods.canBeCancelled = function() {
  return ['generated', 'printed'].includes(this.status);
};

// ==================== VIRTUAL FIELDS ====================

manifestSchema.virtual('is_active').get(function() {
  return !['cancelled'].includes(this.status);
});

manifestSchema.virtual('display_date').get(function() {
  return this.generated_at.toLocaleDateString('es-CL');
});

// ==================== MIDDLEWARE ====================

// Pre-save: validaciones adicionales
manifestSchema.pre('save', function(next) {
  // Validar que hay órdenes
  if (!this.order_ids || this.order_ids.length === 0) {
    return next(new Error('Un manifiesto debe tener al menos una orden'));
  }
  
  // Validar coherencia de totales
  if (this.total_orders !== this.order_ids.length) {
    this.total_orders = this.order_ids.length;
  }
  
  next();
});

// Post-save: logging
manifestSchema.post('save', function(doc) {
  console.log(`✅ Manifiesto guardado: ${doc.manifest_number} (${doc.total_orders} órdenes)`);
});

// ==================== EXPORT ====================

const Manifest = mongoose.model('Manifest', manifestSchema);

module.exports = Manifest;