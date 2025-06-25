const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  company_id: { type: mongoose.Types.ObjectId, ref: 'Company', required: true },
  channel_id: { type: mongoose.Types.ObjectId, ref: 'Channel', required: true },

  external_order_id: String,
  order_number: String,

  customer_name: String,
  customer_email: String,
  customer_phone: String,
  customer_document: String,

  shipping_address: String,
  shipping_city: String,
  shipping_state: String,
  shipping_zip: String,

  total_amount: Number,
  shipping_cost: Number,

  notes: String,

  status: { type: String, default: 'pending' },

  order_date: { type: Date, default: Date.now },
  delivery_date: Date,

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
