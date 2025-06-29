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
    required: true 
  },
  // 'subtotal' ahora es el campo principal que almacena la suma de los shipping_cost
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  // 'tax_amount' se calcula a partir del subtotal
  tax_amount: {
    type: Number,
    required: true
  },
  // 'total_amount' es la suma de subtotal + impuestos
  total_amount: {
    type: Number,
    required: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'paid', 'overdue', 'cancelled'], 
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
  },
  period_end: {
    type: Date,
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

// Pre-save middleware para establecer fechas y actualizar 'updated_at'
invoiceSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Establecer fechas del período si no están definidas
  if (!this.period_start) {
    this.period_start = new Date(this.year, this.month - 1, 1);
  }
  
  if (!this.period_end) {
    this.period_end = new Date(this.year, this.month, 0);
  }
  
  next();
});

// Índice único por empresa, año y mes
invoiceSchema.index({ company_id: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Invoice', invoiceSchema);