// backend/src/models/Invoice.js
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  company_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  invoice_number: { 
    type: String, 
    required: true, 
    unique: true 
  },
  month: { 
    type: Number, 
    required: true 
  },
  year: { 
    type: Number, 
    required: true 
  },
  total_orders: { 
    type: Number, 
    required: true,
    default: 0
  },
  // 'subtotal' es el campo principal que almacena la suma de los shipping_cost
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  // 'tax_amount' se calcula a partir del subtotal (19% IVA)
  tax_amount: {
    type: Number,
    required: true,
    default: 0
  },
  // 'total_amount' es la suma de subtotal + impuestos
  total_amount: {
    type: Number,
    required: true,
    default: 0
  },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'paid', 'overdue', 'cancelled', 'draft'], 
    default: 'pending' 
  },
  due_date: { 
    type: Date 
  },
  paid_date: { 
    type: Date 
  },
  issue_date: {
    type: Date,
    default: Date.now
  },
  period_start: {
    type: Date,
    required: true
  },
  period_end: {
    type: Date,
    required: true
  },
  notes: {
    type: String
  },
  pdf_url: { 
    type: String 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware para calcular valores automáticamente
invoiceSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Establecer fechas del período si no están definidas
  if (!this.period_start) {
    this.period_start = new Date(this.year, this.month - 1, 1);
  }
  
  if (!this.period_end) {
    this.period_end = new Date(this.year, this.month, 0);
  }

  // Calcular tax_amount si no está definido pero subtotal sí
  if (this.subtotal && !this.tax_amount) {
    this.tax_amount = Math.round(this.subtotal * 0.19);
  }

  // Calcular total_amount si no está definido
  if (this.subtotal && this.tax_amount && !this.total_amount) {
    this.total_amount = this.subtotal + this.tax_amount;
  }

  // Asegurar que total_amount es consistente
  if (this.subtotal && this.tax_amount) {
    this.total_amount = this.subtotal + this.tax_amount;
  }
  
  next();
});

// Método virtual para obtener el precio por pedido
invoiceSchema.virtual('price_per_order').get(function() {
  if (this.subtotal && this.total_orders > 0) {
    return Math.round(this.subtotal / this.total_orders);
  }
  return 0;
});

// Método virtual para verificar si está vencida
invoiceSchema.virtual('is_overdue').get(function() {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  return this.due_date && new Date() > this.due_date;
});

// Método virtual para obtener días hasta vencimiento
invoiceSchema.virtual('days_until_due').get(function() {
  if (!this.due_date || this.status === 'paid' || this.status === 'cancelled') {
    return null;
  }
  const today = new Date();
  const due = new Date(this.due_date);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Incluir virtuals en JSON
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

// Índice único por empresa, año y mes
invoiceSchema.index({ company_id: 1, year: 1, month: 1 }, { unique: true });

// Índices para mejorar performance en consultas
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ due_date: 1 });
invoiceSchema.index({ created_at: -1 });
invoiceSchema.index({ period_start: 1, period_end: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);