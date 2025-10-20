const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  // 🧍 Datos personales
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    trim: true
  },

  // 🏠 Dirección base del conductor (para inicio de ruta)
  home_address: { type: String, required: false },
  home_latitude: { type: Number, required: false },
  home_longitude: { type: Number, required: false },

  // 🚚 Datos de compañía
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false
  },

  // 🚗 Tipo de vehículo (auto, moto, bici, etc.)
  vehicle_type: {
    type: String,
    enum: ['car', 'motorcycle', 'bicycle', 'van', 'truck', 'other'],
    default: 'car'
  },

  // 🔒 Autenticación
  password: {
    type: String,
    required: true,
    select: false
  },

  // ⚙️ Estado del conductor
  is_active: {
    type: Boolean,
    default: true
  },

  // ⏱️ Tiempos automáticos
}, {
  timestamps: true
});

// 🔑 Encriptar contraseña automáticamente antes de guardar
driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Método para validar contraseñas
driverSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);
