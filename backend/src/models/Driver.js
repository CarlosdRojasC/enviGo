const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  // Datos principales del conductor
  full_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // El email debe ser único
  },
  phone: {
    type: String,
    required: true,
  },
  // IDs de las plataformas externas
  shipday_driver_id: {
    type: String,
    required: true,
  },
  circuit_driver_id: {
    type: String,
    required: false, // Es opcional porque la creación en Circuit puede fallar
  },
  // Datos adicionales que ya usas
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false, // Hazlo opcional si no siempre lo tienes al crear
  },
  vehicle_type: {
    type: String,
    required: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  home_address: { type: String },
home_latitude: { type: Number },
home_longitude: { type: Number }
}, {
  timestamps: true, // Añade createdAt y updatedAt
});

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;