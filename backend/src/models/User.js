// backend/src/models/User.js - VERSIÓN ACTUALIZADA
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
  
  // --- CAMPOS PARA SHIPDAY ---
  shipday_driver_id: { type: Number, index: true },
  
  // --- 🆕 CAMPOS PARA SEGURIDAD Y LOGIN MEJORADO ---
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: { type: Date },
  password_reset_token: { type: String },
  password_reset_expires: { type: Date },
  password_change_required: { type: Boolean, default: false },
  password_changed_at: { type: Date },
  last_failed_login: { type: Date },
  
  // --- CAMPOS EXISTENTES ---
  is_active: { type: Boolean, default: true },
  last_login: { type: Date },
  last_login_ip: { type: String },
  last_activity: { type: Date, default: Date.now },
  session_invalidated_at: { type: Date }, // 🔥 AGREGAR ESTE CAMPO
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Middleware para actualizar `updated_at` en cada save
userSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Índices para mejorar consultas
userSchema.index({ company_id: 1, role: 1 });
userSchema.index({ email: 1 }); // Para búsquedas por email
userSchema.index({ password_reset_token: 1 }); // Para password reset

module.exports = mongoose.model('User', userSchema);