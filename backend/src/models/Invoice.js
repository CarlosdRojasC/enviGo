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
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax_amount: {
    type: Number,
    required: true,
    default: 0
  },
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

invoiceSchema.pre('save', function(next) {
  this.updated_at = Date.now();

  if (!this.period_start) {
    this.period_start = new Date(this.year, this.month - 1, 1);
  }

  if (!this.period_end) {
    this.period_end = new Date(this.year, this.month, 0);
  }

  if (this.subtotal && !this.tax_amount) {
    this.tax_amount = Math.round(this.subtotal * 0.19);
  }

  if (this.subtotal && this.tax_amount) {
    this.total_amount = this.subtotal + this.tax_amount;
  }

  next();
});

invoiceSchema.virtual('price_per_order').get(function() {
  if (this.subtotal && this.total_orders > 0) {
    return Math.round(this.subtotal / this.total_orders);
  }
  return 0;
});

invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });
invoiceSchema.index({ company_id: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Invoice', invoiceSchema);