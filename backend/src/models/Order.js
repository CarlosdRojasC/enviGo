// backend/src/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Relaciones
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  
  // Identificación del pedido
  external_order_id: { type: String, required: true }, // ID del pedido en la plataforma externa
  order_number: { type: String, required: true }, // Número de pedido visible
  
  // Información del cliente
  customer_name: { type: String, required: true },
  customer_email: { type: String },
  customer_phone: { type: String },
  customer_document: { type: String }, // RUT u otro documento
  
  // Dirección de entrega
  shipping_address: { type: String, required: true },
  shipping_city: { type: String },
  shipping_state: { type: String },
  shipping_zip: { type: String },
  
  // Información del pedido
  total_amount: { type: Number, required: true, default: 0 },
  shipping_cost: { type: Number, default: 0 },
  currency: { type: String, default: 'CLP' },
  items_count: { type: Number, default: 0 },
  
  // Estados y fechas
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending' 
  },
  order_date: { type: Date, required: true },
  delivery_date: { type: Date },
  
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

module.exports = mongoose.model('Order', orderSchema);