const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ['admin', 'company_owner', 'company_employee', 'driver'], 
    default: 'company_employee' 
  },
  company_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company',
    required: function() {
      return this.role !== 'admin' && this.role !== 'driver';
    }
  },
  // --- NUEVO CAMPO PARA EL ID DE SHIPDAY ---
  shipday_driver_id: { type: Number, index: true },
  is_active: { type: Boolean, default: true },
  last_login: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },

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

// Índice para mejorar consultas
userSchema.index({ company_id: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);