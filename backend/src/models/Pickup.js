const mongoose = require('mongoose');

const pickupSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  manifest_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manifest',
    required: true,
    unique: true, // Solo puede haber un pickup por manifiesto
  },
  pickup_address: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending_assignment', 'assigned', 'in_transit_to_warehouse', 'completed', 'cancelled'],
    default: 'pending_assignment',
  },
  orders_to_pickup: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  }],
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver', // Asumiendo que tienes un modelo 'Driver'
  },
    shipday_order_id: {
    type: Number,
  },
  shipday_tracking_url: {
    type: String,
  },
  total_orders: {
    type: Number,
    required: true,
  },
  total_packages: {
    type: Number,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  assigned_at: Date,
  completed_at: Date,
});

module.exports = mongoose.model('Pickup', pickupSchema);