// backend/src/models/Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
   name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1 // Asegurar que no esté vacío
  },
  slug: { type: String, required: true, unique: true },
  
  // NUEVOS: Campos de facturación
  rut: { type: String },
  email: { type: String },
  contact_email: { type: String },
   phone: { 
    type: String,
    default: '' // Permitir vacío pero no null
  },
  address: { 
    type: String,
    default: ''
  },
  // Configuración de precios
  price_per_order: { type: Number, default: 0 },
  plan_type: { 
    type: String, 
    enum: ['basic', 'pro', 'enterprise'], 
    default: 'basic' 
  },
  billing_cycle: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'annual'], 
    default: 'monthly' 
  },
  
  // Estado
  is_active: { type: Boolean, default: true },
  
  // Fechas
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

companySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
  
    if (!this.name || this.name.trim() === '') {
    this.name = 'Empresa Sin Nombre';
  }
  
});

// Método para calcular precio total con IVA
companySchema.methods.getTotalPricePerOrder = function() {
  const subtotal = this.price_per_order || 0;
  const iva = Math.round(subtotal * 0.19);
  return subtotal + iva;
};

// Método para obtener información de facturación
companySchema.methods.getBillingInfo = function() {
  const pricePerOrder = this.price_per_order || 0;
  const ivaPerOrder = Math.round(pricePerOrder * 0.19);
  const totalPerOrder = pricePerOrder + ivaPerOrder;

  return {
    planType: this.plan_type,
    pricePerOrder,
    ivaPerOrder,
    totalPerOrder,
    billingCycle: this.billing_cycle
  };

};

module.exports = mongoose.model('Company', companySchema);