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
  price_per_order: { 
    type: Number, 
    required: true 
  },
  amount_due: { 
    type: Number, 
    required: true 
  },
  subtotal: {
    type: Number,
    default: function() {
      return this.amount_due;
    }
  },
  tax_amount: {
    type: Number,
    default: function() {
      return Math.round(this.amount_due * 0.19);
    }
  },
  total_amount: {
    type: Number,
    default: function() {
      return this.amount_due + Math.round(this.amount_due * 0.19);
    }
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
    default: function() {
      return new Date(this.year, this.month - 1, 1);
    }
  },
  period_end: {
    type: Date,
    default: function() {
      return new Date(this.year, this.month, 0);
    }
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

// Pre-save middleware para calcular campos automáticamente
invoiceSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calcular subtotal si no está definido
  if (!this.subtotal) {
    this.subtotal = this.amount_due;
  }
  
  // Calcular IVA si no está definido
  if (!this.tax_amount) {
    this.tax_amount = Math.round(this.subtotal * 0.19);
  }
  
  // Calcular total si no está definido
  if (!this.total_amount) {
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

// Método para obtener el estado de vencimiento
invoiceSchema.methods.getDueStatus = function() {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return this.status;
  }
  
  const now = new Date();
  const dueDate = new Date(this.due_date);
  
  if (dueDate < now) {
    return 'overdue';
  } else if ((dueDate - now) < (7 * 24 * 60 * 60 * 1000)) {
    return 'due_soon';
  }
  
  return 'current';
};

// Método para formatear el período
invoiceSchema.methods.getFormattedPeriod = function() {
  const startDate = new Date(this.period_start);
  const endDate = new Date(this.period_end);
  
  return `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;
};

module.exports = mongoose.model('Invoice', invoiceSchema);