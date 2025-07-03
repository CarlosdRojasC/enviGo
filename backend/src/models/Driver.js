// backend/src/models/Driver.js
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  // Relación con empresa (para multi-tenant)
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  
  // Información personal
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  document: { type: String, required: true }, // RUT o cédula
  license_number: { type: String, required: true },
  
  // Información del vehículo
  vehicle: {
    type: { 
      type: String, 
      enum: ['car', 'motorcycle', 'bicycle', 'truck', 'van'],
      required: true 
    },
    brand: { type: String },
    model: { type: String },
    year: { type: Number },
    license_plate: { type: String, required: true },
    color: { type: String }
  },
  
  // Documentos del conductor
  documents: {
    license_photo: { type: String }, // URL de foto de licencia
    vehicle_registration: { type: String }, // URL de permiso de circulación
    insurance: { type: String }, // URL de seguro
    background_check: { type: String } // URL de certificado de antecedentes
  },
  
  // Estados del conductor
  is_active: { type: Boolean, default: true },
  is_available: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false }, // Si está verificado para trabajar
  
  // ✨ CAMPOS PARA SHIPDAY ✨
  shipday: {
    driver_id: { type: String, unique: true, sparse: true }, // ID en Shipday
    is_synced: { type: Boolean, default: false },
    synced_at: { type: Date, default: null },
    last_location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      updated_at: { type: Date, default: null }
    },
    color: { type: String, default: '#3b82f6' } // Color en el mapa de Shipday
  },
  
  // Estadísticas del conductor
  stats: {
    total_deliveries: { type: Number, default: 0 },
    successful_deliveries: { type: Number, default: 0 },
    cancelled_deliveries: { type: Number, default: 0 },
    current_orders_count: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5, default: null },
    total_earnings: { type: Number, default: 0 },
    last_delivery_date: { type: Date, default: null }
  },
  
  // Configuración de trabajo
  work_schedule: {
    monday: { start: String, end: String, active: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, active: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, active: { type: Boolean, default: true } },
    thursday: { start: String, end: String, active: { type: Boolean, default: true } },
    friday: { start: String, end: String, active: { type: Boolean, default: true } },
    saturday: { start: String, end: String, active: { type: Boolean, default: false } },
    sunday: { start: String, end: String, active: { type: Boolean, default: false } }
  },
  
  // Zona de trabajo
  work_zone: {
    communes: [{ type: String }], // Comunas donde puede trabajar
    max_distance_km: { type: Number, default: 20 } // Distancia máxima desde base
  },
  
  // Información bancaria para pagos
  payment_info: {
    bank_name: { type: String },
    account_type: { type: String, enum: ['checking', 'savings'] },
    account_number: { type: String },
    rut: { type: String }
  },
  
  // Metadatos
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Middleware para actualizar updated_at
driverSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Actualizar shipday.last_location.updated_at si cambió la ubicación
  if (this.isModified('shipday.last_location.latitude') || this.isModified('shipday.last_location.longitude')) {
    this.shipday.last_location.updated_at = new Date();
  }
  
  next();
});

// Índices para optimizar consultas
driverSchema.index({ company_id: 1, is_active: 1 });
driverSchema.index({ company_id: 1, is_available: 1 });
driverSchema.index({ email: 1 }, { unique: true });
driverSchema.index({ phone: 1 });
driverSchema.index({ document: 1 }, { unique: true });
driverSchema.index({ 'vehicle.license_plate': 1 });

// ✨ ÍNDICES PARA SHIPDAY ✨
driverSchema.index({ 'shipday.driver_id': 1 });
driverSchema.index({ 'shipday.is_synced': 1 });
driverSchema.index({ company_id: 1, 'shipday.is_synced': 1 });

// ✨ MÉTODOS VIRTUALES ✨

// Virtual para saber si está sincronizado con Shipday
driverSchema.virtual('isInShipday').get(function() {
  return !!(this.shipday && this.shipday.driver_id && this.shipday.is_synced);
});

// Virtual para calcular rating promedio
driverSchema.virtual('successRate').get(function() {
  if (this.stats.total_deliveries === 0) return 0;
  return ((this.stats.successful_deliveries / this.stats.total_deliveries) * 100).toFixed(1);
});

// Virtual para nombre completo del vehículo
driverSchema.virtual('vehicleFullName').get(function() {
  if (!this.vehicle.brand || !this.vehicle.model) return this.vehicle.type;
  return `${this.vehicle.brand} ${this.vehicle.model} (${this.vehicle.license_plate})`;
});

// ✨ MÉTODOS DE INSTANCIA ✨

// Método para sincronizar con Shipday
driverSchema.methods.syncWithShipday = function(shipdayDriverId) {
  this.shipday.driver_id = shipdayDriverId;
  this.shipday.is_synced = true;
  this.shipday.synced_at = new Date();
  return this.save();
};

// Método para actualizar ubicación
driverSchema.methods.updateLocation = function(latitude, longitude) {
  this.shipday.last_location = {
    latitude: latitude,
    longitude: longitude,
    updated_at: new Date()
  };
  return this.save();
};

// Método para actualizar estadísticas después de una entrega
driverSchema.methods.updateStatsAfterDelivery = function(wasSuccessful, earnings = 0) {
  this.stats.total_deliveries += 1;
  
  if (wasSuccessful) {
    this.stats.successful_deliveries += 1;
    this.stats.total_earnings += earnings;
    this.stats.last_delivery_date = new Date();
  } else {
    this.stats.cancelled_deliveries += 1;
  }
  
  return this.save();
};

// Método para verificar si puede trabajar ahora
driverSchema.methods.canWorkNow = function() {
  if (!this.is_active || !this.is_available || !this.is_verified) {
    return false;
  }
  
  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const schedule = this.work_schedule[dayOfWeek];
  
  if (!schedule || !schedule.active) {
    return false;
  }
  
  // Verificar horario (simplificado)
  const currentTime = now.toTimeString().substring(0, 5);
  return currentTime >= schedule.start && currentTime <= schedule.end;
};

// ✨ MÉTODOS ESTÁTICOS ✨

// Método para obtener conductores disponibles para Shipday
driverSchema.statics.getAvailableForShipday = function(companyId, filters = {}) {
  const query = {
    company_id: companyId,
    is_active: true,
    is_available: true,
    is_verified: true,
    ...filters
  };
  
  return this.find(query)
    .populate('company_id', 'name')
    .sort({ 'stats.total_deliveries': -1, name: 1 });
};

// Método para obtener conductores sincronizados con Shipday
driverSchema.statics.getSyncedWithShipday = function(companyId) {
  return this.find({
    company_id: companyId,
    'shipday.is_synced': true,
    'shipday.driver_id': { $ne: null }
  });
};

// Método para obtener métricas de conductores
driverSchema.statics.getDriverMetrics = function(companyId) {
  return this.aggregate([
    { $match: { company_id: companyId } },
    { 
      $group: {
        _id: null,
        total_drivers: { $sum: 1 },
        active_drivers: { 
          $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] } 
        },
        available_drivers: { 
          $sum: { $cond: [{ $and: ['$is_active', '$is_available'] }, 1, 0] } 
        },
        verified_drivers: { 
          $sum: { $cond: ['$is_verified', 1, 0] } 
        },
        synced_with_shipday: { 
          $sum: { $cond: ['$shipday.is_synced', 1, 0] } 
        },
        total_deliveries: { $sum: '$stats.total_deliveries' },
        total_earnings: { $sum: '$stats.total_earnings' }
      }
    }
  ]);
};

// Configurar opciones del esquema
driverSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    // No incluir información sensible en JSON
    if (ret.payment_info) {
      delete ret.payment_info.account_number;
    }
    return ret;
  }
});

driverSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Driver', driverSchema);