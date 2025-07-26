// backend/src/models/Manifest.js

const mongoose = require('mongoose');

const manifestSchema = new mongoose.Schema({
  // Identificación
  manifest_number: {
    type: String,
    required: true,
    unique: true
  },
  
  // Empresa
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Pedidos incluidos
  order_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  }],
  
  // Información del manifiesto
  total_orders: {
    type: Number,
    required: true
  },
  
  total_packages: {
    type: Number,
    default: 0
  },
  
  communes: [{
    type: String
  }],
  
  // Estado del manifiesto
  status: {
    type: String,
    enum: ['generated', 'printed', 'picked_up', 'cancelled'],
    default: 'generated'
  },
  
  // Fechas
  generated_at: {
    type: Date,
    default: Date.now
  },
  
  picked_up_at: {
    type: Date
  },
  
  // Usuario que generó
  generated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Datos de quien retiró
  pickup_info: {
    person_name: String,
    person_rut: String,
    person_signature: String, // Base64 o URL
    pickup_notes: String
  },
  
  // Metadatos
  manifest_data: {
    type: mongoose.Schema.Types.Mixed // Snapshot de los datos completos
  },
  
  // Archivos generados
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
  }]
}, {
  timestamps: true
});

// Índices
manifestSchema.index({ company_id: 1, generated_at: -1 });
manifestSchema.index({ manifest_number: 1 });
manifestSchema.index({ status: 1 });
manifestSchema.index({ generated_by: 1 });

// Método para generar número de manifiesto
manifestSchema.statics.generateManifestNumber = async function(companyId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  // Buscar el último manifiesto del día
  const prefix = `M${year}${month}${day}`;
  const lastManifest = await this.findOne({
    manifest_number: new RegExp(`^${prefix}`),
    company_id: companyId
  }).sort({ manifest_number: -1 });
  
  let sequence = 1;
  if (lastManifest) {
    const lastSequence = parseInt(lastManifest.manifest_number.slice(-3));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

module.exports = mongoose.model('Manifest', manifestSchema);