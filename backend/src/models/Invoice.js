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
  // Este es el monto base a facturar (antes de impuestos). 
  // El controlador debe establecer este valor.
  amount_due: { 
    type: Number, 
    required: true 
  },
  // Los siguientes campos se calcularán automáticamente.
  subtotal: {
    type: Number
  },
  tax_amount: {
    type: Number
  },
  total_amount: {
    type: Number
  },
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'], 
    default: 'draft' 
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

// Pre-save middleware para calcular campos y establecer fechas
invoiceSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Si el monto a cobrar cambia o es una nueva factura, recalcula todo.
  if (this.isModified('amount_due') || this.isNew) {
    this.subtotal = this.amount_due;
    this.tax_amount = Math.round(this.subtotal * 0.19); // Asume IVA del 19%
    this.total_amount = this.subtotal + this.tax_amount;
  }
  
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