const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoice_number: { type: String, required: true, unique: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  total_orders: { type: Number, required: true },
  price_per_order: { type: Number, required: true },
  amount_due: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'overdue'], 
    default: 'pending' 
  },
  due_date: { type: Date },
  paid_date: { type: Date },
  pdf_url: { type: String }, // Opcional: para almacenar la factura en S3
  created_at: { type: Date, default: Date.now }
});

invoiceSchema.index({ company_id: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Invoice', invoiceSchema);