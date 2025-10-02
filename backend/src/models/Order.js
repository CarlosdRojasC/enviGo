// backend/src/models/Order.js
const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  photo_urls: [{ type: String }], // ← CAMBIAR a array
  photo_public_ids: [{ type: String }], // ← AGREGAR para Cloudinary
  signature_url: { type: String },
  signature_public_id: { type: String }, // ← AGREGAR para Cloudinary
  recipient_name: { type: String }, // ← AGREGAR
  notes: { type: String },
  timestamp: { type: Date }, // ← AGREGAR
  location: {
    lat: { type: Number },
    lng: { type: Number },
    formatted_address: { type: String }
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Relaciones
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  manifest_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Manifest'
},
  // Relación con factura
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  billed: { type: Boolean, default: false },
   // ✅ NUEVOS CAMPOS MEJORADOS PARA FACTURACIÓN
  billing_status: {
    is_billable: {
      type: Boolean,
      default: false  // Solo true cuando status = 'delivered'
    },
    billed_at: {
      type: Date,
      default: null
    },
    billing_amount: {
      type: Number,
      default: null
    }
  },
  
  // Identificación del pedido
  external_order_id: { type: String, required: true }, // ID del pedido en la plataforma externa
  order_number: { type: String, required: true }, // Número de pedido visible
  
  shopify_fulfillment_id: { type: String }, // ID de fulfillment en Shopify (si aplica)
  // Información del cliente
  customer_name: { type: String, required: true },
  customer_email: { type: String },
  customer_phone: { type: String },
  customer_document: { type: String },
  
  // Dirección de entrega
  shipping_address: {
  type: String,
  required: function() {
    // La dirección solo es requerida si el tipo de entrega es 'shipping'
    return this.delivery_type === 'shipping';
  }
},
  shipping_city: { type: String },
  shipping_state: { type: String },
  shipping_zip: { type: String },
  shipping_commune: { type: String },
  
  // Información del pedido
  total_amount: { type: Number, required: true, default: 0 },
  shipping_cost: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  payment_method: { type: String, default: 'credit_card' },
  

  // Campos para Shipday
  shipday_order_id: { type: String }, // ID de la orden en Shipday
  shipday_driver_id: { type: String }, // ID del conductor asignado en Shipday
  shipday_tracking_url: { type: String, default: '' }, 
  shipday_status: { type: String }, // Estado en Shipday
  proof_of_delivery: { type: evidenceSchema, default: null },
  podUrls: [{ type: String }], // Array de URLs de fotos de entrega
  photos: [{ type: String }], // Array de URLs de fotos del pedido
  signatureUrl: { type: String }, // URL de firma digital
  
  // 🆕 Información del conductor expandida
  driver_info: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    status: { type: String } // ONLINE, OFFLINE, etc.
  },
  
  // 🆕 Ubicación de entrega
  delivery_location: {
    lat: { type: Number },
    lng: { type: Number },
    formatted_address: { type: String }
  },
  
  // 🆕 Tiempos detallados de Shipday
  shipday_times: {
    placement_time: { type: Date },
    assigned_time: { type: Date },
    pickup_time: { type: Date },
    delivery_time: { type: Date },
    expected_pickup_time: { type: Date }, // 🆕 AGREGADO
    expected_delivery_time: { type: Date } // 🆕 AGREGADO
  },
  custom_tracking_url: {
  type: String,
  default: null
},
isPaid: { 
  type: Boolean, 
  default: false,
  index: true 
},
paidAt: { 
  type: Date, 
  default: null 
},
paidBy: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'User',
  default: null 
},
paymentNote: { 
  type: String, 
  default: null 
},

  // 🆕 NUEVOS CAMPOS PARA SHIPDAY (datos de pickup)
  pickup_address: { type: String }, // Dirección de recogida (restaurante/tienda)
  pickup_city: { type: String },
  pickup_phone: { type: String },

  // Estados y fechas
  status: { 
    type: String, 
    enum: ['pending',
    'ready_for_pickup',
    'out_for_delivery', 
    'warehouse_received',
    'invoiced',
    'shipped',
    'delivered',
    'cancelled',
    'facturado'  ],
    default: 'pending' 
  },
  order_date: { type: Date, required: true },
  delivery_date: { type: Date },

  // Información adicional
  items_count: { type: Number, default: 0 },
  notes: { type: String }, // ✅ CORREGIDO: solo una vez
  
  // Datos adicionales
  raw_data: { type: mongoose.Schema.Types.Mixed }, // Datos completos de la plataforma
  
  // Metadatos
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },

   envigo_label: {
    unique_code: { 
      type: String, 
      unique: true, 
      sparse: true,  // Permite null pero único si existe
      index: true 
    },
    generated_at: { type: Date },
    printed_count: { type: Number, default: 0 },
    last_printed_at: { type: Date },
    last_printed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  ml_info: {
  barcode: String,
  ml_id: String,
  tracking_code: String,
  country: String,
  parsed_data: { type: mongoose.Schema.Types.Mixed }
},

created_via_scanner: {
  type: Boolean,
  default: false
},

scanner_timestamp: Date,

needs_completion: {
  type: Boolean,
  default: false
},

source: {
  type: String,
  enum: ['web', 'api', 'ml_scanner', 'shopify', 'woocommerce', 'jumpseller'],
  default: 'web'
}
});



// Middleware para actualizar updated_at
orderSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Si el pedido cambia a 'delivered', puede ser facturado
  if (this.status === 'delivered' && !this.invoice_id) {
    this.billing_status.is_billable = true;
    // Asegurar que delivery_date esté establecida
    if (!this.delivery_date) {
      this.delivery_date = new Date();
    }
  }
  
  // Si se factura, ya no puede ser facturado nuevamente
  if (this.status === 'invoiced') {
    this.billing_status.is_billable = false;
    this.billed = true;
    if (!this.billing_status.billed_at) {
      this.billing_status.billed_at = new Date();
    }
  }
  
  // Migración automática: convertir 'facturado' a 'invoiced'
  if (this.status === 'facturado') {
    this.status = 'invoiced';
    this.billing_status.is_billable = false;
    this.billed = true;
    if (!this.billing_status.billed_at) {
      this.billing_status.billed_at = new Date();
    }
  }
  
  next();
});
orderSchema.methods.markAsDelivered = function(proofData = {}) {
  this.status = 'delivered';
  this.delivery_date = new Date();
  this.billing_status.is_billable = true;
  
  // Crear objeto de prueba de entrega
  if (proofData.photo_urls || proofData.signature_url || proofData.notes) {
    this.proof_of_delivery = {
      photo_urls: proofData.photo_urls || [],
      photo_public_ids: proofData.photo_public_ids || [],
      signature_url: proofData.signature_url || null,
      signature_public_id: proofData.signature_public_id || null,
      recipient_name: proofData.recipient_name || 'No especificado',
      notes: proofData.notes || '',
      timestamp: proofData.timestamp || new Date(),
      location: proofData.location || null
    };
  }
  
  return this;
};
// ✅ MÉTODO PARA MARCAR COMO FACTURADO
orderSchema.methods.markAsInvoiced = function(invoiceId, billingAmount = null) {
  this.status = 'invoiced';
  this.invoice_id = invoiceId;
  this.billed = true;
  this.billing_status.is_billable = false;
  this.billing_status.billed_at = new Date();
  
  if (billingAmount) {
    this.billing_status.billing_amount = billingAmount;
  }
  
  return this;
};

// ✅ MÉTODO PARA REVERTIR FACTURACIÓN
orderSchema.methods.revertBilling = function() {
  if (this.status === 'invoiced') {
    this.status = 'delivered';
    this.invoice_id = null;
    this.billed = false;
    this.billing_status.is_billable = true;
    this.billing_status.billed_at = null;
    this.billing_status.billing_amount = null;
  }
  
  return this;
};

orderSchema.methods.generateEnvigoCode = async function() {
  if (this.envigo_label?.unique_code) {
    return this.envigo_label.unique_code;
  }

  // Obtener el código de la empresa (primeras 3-4 letras)
  await this.populate('company_id');
  const companyCode = this.company_id.name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 4);

  // Generar código: EMPRESA-NUMERO
  const baseCode = `${companyCode}-${String(this.order_number).padStart(4, '0')}`;
  
  // Verificar si existe, agregar sufijo si es necesario
  let finalCode = baseCode;
  let counter = 1;
  
  while (await mongoose.model('Order').findOne({ 'envigo_label.unique_code': finalCode })) {
    finalCode = `${baseCode}-${counter}`;
    counter++;
  }

  // Inicializar envigo_label si no existe
  if (!this.envigo_label) {
    this.envigo_label = {};
  }

  this.envigo_label.unique_code = finalCode;
  this.envigo_label.generated_at = new Date();
  
  await this.save();
  return finalCode;
};

// ✅ MÉTODO PARA MARCAR COMO IMPRESA
orderSchema.methods.markLabelPrinted = async function(userId) {
  if (!this.envigo_label) {
    this.envigo_label = {};
  }

  this.envigo_label.printed_count = (this.envigo_label.printed_count || 0) + 1;
  this.envigo_label.last_printed_at = new Date();
  this.envigo_label.last_printed_by = userId;
  
  await this.save();
};

// Índices para mejorar rendimiento
orderSchema.index({ company_id: 1, status: 1 });
orderSchema.index({ channel_id: 1, external_order_id: 1 }, { unique: true });
orderSchema.index({ order_date: -1 });
orderSchema.index({ customer_email: 1 });
orderSchema.index({ invoice_id: 1 });
orderSchema.index({ billed: 1 });

// ✅ NUEVOS ÍNDICES PARA FACTURACIÓN
orderSchema.index({ 'billing_status.is_billable': 1 });
orderSchema.index({ 'billing_status.billed_at': 1 });
orderSchema.index({ delivery_date: -1 });

// 🆕 NUEVOS ÍNDICES PARA TRACKING
orderSchema.index({ shipday_tracking_url: 1 });
orderSchema.index({ shipday_order_id: 1 });
orderSchema.index({ 'driver_info.name': 1 });
orderSchema.index({ 'proof_of_delivery.photo_urls': 1 });
orderSchema.index({ 'proof_of_delivery.signature_url': 1 });
orderSchema.index({ 'proof_of_delivery.timestamp': -1 });

module.exports = mongoose.model('Order', orderSchema);