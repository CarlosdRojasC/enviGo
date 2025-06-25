const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  channel_type: { type: String, required: true },
  channel_name: { type: String, required: true },
  api_key: { type: String },
  api_secret: { type: String },
  store_url: { type: String },
  webhook_secret: { type: String },
  is_active: { type: Boolean, default: true },
  last_sync: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Índice para evitar nombres duplicados dentro de la misma empresa
channelSchema.index({ company_id: 1, channel_name: 1 }, { unique: true });

module.exports = mongoose.model('Channel', channelSchema);
