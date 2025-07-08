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
  
  // NUEVO: Relación con factura
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  billed: { type: Boolean, default: false },
  
  // Identificación del pedido
  external_order_id: { type: String, required: true }, // ID del pedido en la plataforma externa
  order_number: { type: String, required: true }, // Número de pedido visible
  
 // Información del cliente (Existente)
  customer_name: { type: String, required: true },
  customer_email: { type: String },
  customer_phone: { type: String },
  customer_document: { type: String },
  
  // Dirección de entrega (Existente)
  shipping_address: { type: String, required: true },
  shipping_city: { type: String },
  shipping_state: { type: String },
  shipping_zip: { type: String },
  shipping_commune: { type: String },
  
  // Información del pedido (Existente)
  total_amount: { type: Number, required: true, default: 0 },
  shipping_cost: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  payment_method: { type: String, default: 'CASH' },
  
  // --- CAMPOS DE OPTIROUTE AÑADIDOS ---
  priority: { type: String, default: 'Normal' },
  serviceTime: { type: Number, default: 5 }, // En minutos
  timeWindowStart: { type: String, default: '09:00' },
  timeWindowEnd: { type: String, default: '18:00' },
  load1Packages: { type: Number, default: 1 }, // Carga 1 (ej: N° de paquetes)
  load2WeightKg: { type: Number, default: 1 }, // Carga 2 (ej: Peso en KG)
  
   // --- NUEVOS CAMPOS PARA SHIPDAY ---
    shipday_order_id: { type: String }, // ID de la orden en Shipday
  shipday_driver_id: { type: String }, // ID del conductor asignado en Shipday
  shipday_tracking_url: { type: String }, // URL de tracking de Shipday
  shipday_status: { type: String }, // Estado en Shipday
  proof_of_delivery: { type: evidenceSchema, default: null },
  // NUEVOS CAMPOS PARA SHIPDAY
  pickup_address: { type: String }, // Dirección de recogida (restaurante/tienda)
  pickup_city: { type: String },
  pickup_phone: { type: String },

  // Estados y fechas
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'facturado'],
    default: 'pending' 
  },
  order_date: { type: Date, required: true },
  delivery_date: { type: Date },

   // Información adicional
  items_count: { type: Number, default: 0 },
  notes: { type: String },
  
  // Datos adicionales
  notes: { type: String },
  raw_data: { type: mongoose.Schema.Types.Mixed }, // Datos completos de la plataforma
  
  // Metadatos
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Middleware para actualizar updated_at
orderSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Índices para mejorar rendimiento
orderSchema.index({ company_id: 1, status: 1 });
orderSchema.index({ channel_id: 1, external_order_id: 1 }, { unique: true });
orderSchema.index({ order_date: -1 });
orderSchema.index({ customer_email: 1 });
orderSchema.index({ invoice_id: 1 }); // NUEVO: Índice para facturación
orderSchema.index({ billed: 1 }); // NUEVO: Índice para facturación

module.exports = mongoose.model('Order', orderSchema);