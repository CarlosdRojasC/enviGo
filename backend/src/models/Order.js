// backend/src/models/Order.js
const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  photo_url: { type: String },
  signature_url: { type: String },
  notes: { type: String },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Relaciones
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  
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
  shipping_address: { type: String, required: true },
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
  
  // Campos de OptiRoute
  priority: { type: String, default: 'Normal' },
  serviceTime: { type: Number, default: 5 }, // En minutos
  timeWindowStart: { type: String, default: '09:00' },
  timeWindowEnd: { type: String, default: '18:00' },
  load1Packages: { type: Number, default: 1 }, // Carga 1 (ej: N° de paquetes)
  load2WeightKg: { type: Number, default: 1 }, // Carga 2 (ej: Peso en KG)
  
  // Campos para Shipday
  shipday_order_id: { type: String }, // ID de la orden en Shipday
  shipday_driver_id: { type: String }, // ID del conductor asignado en Shipday
  shipday_tracking_url: { type: String, default: '' }, 
  shipday_status: { type: String }, // Estado en Shipday
  proof_of_delivery: { type: evidenceSchema, default: null },
  
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

  // 🆕 NUEVOS CAMPOS PARA SHIPDAY (datos de pickup)
  pickup_address: { type: String }, // Dirección de recogida (restaurante/tienda)
  pickup_city: { type: String },
  pickup_phone: { type: String },

  // Estados y fechas
  status: { 
    type: String, 
    enum: ['pending',
    'ready_for_pickup', 
    'warehouse_received',
    'invoiced',
    'shipped',
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
  updated_at: { type: Date, default: Date.now }
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
  
  if (proofData.photo_url || proofData.signature_url || proofData.notes) {
    this.proof_of_delivery = proofData;
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

module.exports = mongoose.model('Order', orderSchema);