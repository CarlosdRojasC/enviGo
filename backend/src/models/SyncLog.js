const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  sync_type: { type: String, required: true }, // ej: 'manual'
  status: { type: String, required: true },    // 'processing', 'success', 'failed'
  orders_synced: { type: Number, default: 0 },
  error_message: { type: String },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date }
});

module.exports = mongoose.model('SyncLog', syncLogSchema);
