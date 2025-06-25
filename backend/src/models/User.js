const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'company_employee', 'user'], default: 'company_employee' },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  is_active: { type: Boolean, default: true },
  last_login: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Middleware para actualizar `updated_at` en cada save
userSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
