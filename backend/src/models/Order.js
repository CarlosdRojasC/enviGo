// backend/src/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Relaciones (EXISTENTE)
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  
  // NUEVO: Relación con factura (EXISTENTE)
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  billed: { type: Boolean, default: false },
  
  // Identificación del pedido (EXISTENTE)
  external_order_id: { type: String, required: true }, // ID del pedido en la plataforma externa
  order_number: { type: String, required: true }, // Número de pedido visible

  // Información del cliente (EXISTENTE)
  customer_name: { type: String, required: true },
  customer_email: { type: String },
  customer_phone: { type: String },
  customer_document: { type: String },

  // Dirección de entrega (EXISTENTE)
  shipping_address: { type: String, required: true },
  shipping_city: { type: String },
  shipping_state: { type: String },
  shipping_zip: { type: String },
  shipping_commune: { type: String },

  // Información del pedido (EXISTENTE)
  total_amount: { type: Number, required: true, default: 0 },
  shipping_cost: { type: Number, default: 0 },

  // --- CAMPOS DE OPTIROUTE AÑADIDOS --- (EXISTENTE)
  priority: { type: String, default: 'Normal' },
  serviceTime: { type: Number, default: 5 }, // En minutos
  timeWindowStart: { type: String, default: '09:00' },
  timeWindowEnd: { type: String, default: '18:00' },
  load1Packages: { type: Number, default: 1 }, // Carga 1 (ej: N° de paquetes)
  load2WeightKg: { type: Number, default: 1 }, // Carga 2 (ej: Peso en KG)

  // Estados y fechas (EXISTENTE)
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  order_date: { type: Date, required: true },
  delivery_date: { type: Date },

  // Datos adicionales (EXISTENTE)
  notes: { type: String },
  raw_data: { type: mongoose.Schema.Types.Mixed }, // Datos completos de la plataforma

  // ✨ NUEVOS CAMPOS PARA SHIPDAY ✨
  // Conductor asignado
  driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  
  // Coordenadas para delivery (necesarias para Shipday)
  delivery_coordinates: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  
  // Dirección de pickup (desde donde se recoge)
  pickup_address: { type: String, default: null },
  pickup_coordinates: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },

  // Datos de Shipday
  shipday: {
    order_id: { type: String, unique: true, sparse: true }, // ID en Shipday
    status: { type: String, default: null }, // Estado desde Shipday
    tracking_link: { type: String, default: null }, // Link de tracking
    created_at: { type: Date, default: null }, // Cuándo se creó en Shipday
    last_update: { type: Date, default: null }, // Última actualización desde Shipday
    assigned_driver_id: { type: String, default: null } // ID del conductor en Shipday
  },

  // Prueba de entrega
  delivery_proof: {
    photos: [{ type: String }], // URLs de fotos de entrega
    signature: { type: String, default: null }, // URL de firma
    delivery_location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    delivered_at: { type: Date, default: null },
    driver_notes: { type: String, default: null }
  },

  // Historial de estados (para tracking detallado)
  status_history: [{
    previous_status: { type: String },
    new_status: { type: String, required: true },
    shipday_status: { type: String },
    driver_location: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    estimated_arrival: { type: Date },
    notes: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  // Items del pedido (útil para mostrar en Shipday)
  items: [{
    name: { type: String },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    description: { type: String }
  }],

  // Metadatos (EXISTENTE)
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Middleware para actualizar updated_at (EXISTENTE)
orderSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // ✨ NUEVO: Actualizar shipday.last_update cuando cambie algo de Shipday
  if (this.isModified('shipday')) {
    this.shipday.last_update = new Date();
  }
  
  next();
});

// Índices para mejorar rendimiento (EXISTENTES)
orderSchema.index({ company_id: 1, status: 1 });
orderSchema.index({ channel_id: 1, external_order_id: 1 }, { unique: true });
orderSchema.index({ order_date: -1 });
orderSchema.index({ customer_email: 1 });
orderSchema.index({ invoice_id: 1 }); // NUEVO: Índice para facturación
orderSchema.index({ billed: 1 }); // NUEVO: Índice para facturación

// ✨ NUEVOS ÍNDICES PARA SHIPDAY ✨
orderSchema.index({ 'shipday.order_id': 1 });
orderSchema.index({ 'shipday.status': 1 });
orderSchema.index({ 'shipday.tracking_link': 1 });
orderSchema.index({ driver_id: 1 });
orderSchema.index({ 'shipday.last_update': -1 });

// Índices compuestos para queries comunes
orderSchema.index({ company_id: 1, status: 1, 'shipday.order_id': 1 });
orderSchema.index({ company_id: 1, driver_id: 1, status: 1 });

// ✨ MÉTODOS VIRTUALES Y DE INSTANCIA ✨

// Virtual para saber si está en Shipday
orderSchema.virtual('isInShipday').get(function() {
  return !!(this.shipday && this.shipday.order_id);
});

// Virtual para obtener el estado más reciente
orderSchema.virtual('currentStatus').get(function() {
  return this.shipday?.status || this.status;
});

// Virtual para formatear dirección completa
orderSchema.virtual('fullShippingAddress').get(function() {
  const parts = [
    this.shipping_address,
    this.shipping_commune,
    this.shipping_city,
    this.shipping_state
  ].filter(Boolean);
  return parts.join(', ');
});

// Método para agregar entrada al historial de estados
orderSchema.methods.addStatusHistory = function(newStatus, shipdayStatus = null, notes = null, driverLocation = null) {
  this.status_history.push({
    previous_status: this.status,
    new_status: newStatus,
    shipday_status: shipdayStatus,
    driver_location: driverLocation,
    notes: notes,
    timestamp: new Date()
  });
  
  this.status = newStatus;
  return this.save();
};

// Método para actualizar desde webhook de Shipday
orderSchema.methods.updateFromShipdayWebhook = function(webhookData) {
  const { status, tracking_link, carrier, delivery_proof } = webhookData;
  
  // Actualizar datos de Shipday
  if (status) this.shipday.status = status;
  if (tracking_link) this.shipday.tracking_link = tracking_link;
  this.shipday.last_update = new Date();
  
  // Mapear estado de Shipday a nuestro sistema
  const statusMapping = {
    'created': 'pending',
    'assigned': 'processing',
    'pickup': 'shipped',
    'in_transit': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'failed': 'cancelled'
  };
  
  const localStatus = statusMapping[status] || this.status;
  
  // Agregar al historial
  this.addStatusHistory(
    localStatus, 
    status,
    `Actualización automática desde Shipday: ${status}`,
    carrier ? { latitude: carrier.latitude, longitude: carrier.longitude } : null
  );
  
  // Si fue entregado, agregar prueba de entrega
  if (status === 'delivered' && delivery_proof) {
    this.delivery_proof = {
      photos: delivery_proof.pictures || [],
      signature: delivery_proof.signature || null,
      delivery_location: delivery_proof.location ? {
        latitude: delivery_proof.location.latitude,
        longitude: delivery_proof.location.longitude
      } : this.delivery_proof.delivery_location,
      delivered_at: new Date(),
      driver_notes: delivery_proof.note || null
    };
    
    this.delivery_date = new Date();
  }
  
  return this.save();
};

// Método estático para obtener pedidos disponibles para Shipday
orderSchema.statics.getAvailableForShipday = function(companyId, filters = {}) {
  const query = {
    company_id: companyId,
    'shipday.order_id': { $exists: false }, // No asignados a Shipday
    status: { $in: ['pending', 'processing'] }, // Estados válidos
    ...filters
  };
  
  return this.find(query)
    .populate('company_id', 'name')
    .populate('channel_id', 'name')
    .populate('driver_id', 'name phone vehicle')
    .sort({ order_date: -1 });
};

// Método estático para obtener métricas de Shipday
orderSchema.statics.getShipdayMetrics = function(companyId) {
  return Promise.all([
    // Total en Shipday
    this.countDocuments({ 
      company_id: companyId, 
      'shipday.order_id': { $exists: true } 
    }),
    
    // Por estado de Shipday
    this.aggregate([
      { $match: { company_id: companyId, 'shipday.order_id': { $exists: true } } },
      { $group: { _id: '$shipday.status', count: { $sum: 1 } } }
    ]),
    
    // Entregas recientes (últimos 7 días)
    this.countDocuments({
      company_id: companyId,
      status: 'delivered',
      'delivery_proof.delivered_at': { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      }
    })
  ]);
};

// Configurar opciones del esquema
orderSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);