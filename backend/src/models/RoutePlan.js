const mongoose = require('mongoose');

const routePlanSchema = new mongoose.Schema({
  // Información básica de la ruta
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Configuración de la ruta
  startLocation: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    type: { type: String, default: 'warehouse' } // warehouse, driver_home
  },
  
  endLocation: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    type: { type: String, default: 'driver_home' }
  },
  
  // Pedidos y orden optimizado
  orders: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    sequenceNumber: { type: Number, required: true },
    estimatedArrival: Date,
    actualArrival: Date,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'delivered', 'failed', 'cancelled'],
      default: 'pending'
    },
    deliveryProof: {
      photo: String, // URL de Cloudinary
      signature: String,
      recipientName: String,
      comments: String,
      timestamp: Date
    }
  }],
  
  // Información de optimización
  optimization: {
    totalDistance: { type: Number }, // en metros
    totalDuration: { type: Number }, // en segundos
    algorithm: { type: String, default: 'google_directions' },
    optimizedAt: { type: Date, default: Date.now },
    googleRouteData: {
      type: mongoose.Schema.Types.Mixed // Guardamos la respuesta completa de Google
    }
  },
  
  // Estado general de la ruta
  status: {
    type: String,
    enum: ['draft', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Timestamps de ejecución
  assignedAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Configuraciones adicionales
  preferences: {
    avoidTolls: { type: Boolean, default: false },
    avoidHighways: { type: Boolean, default: false },
    prioritizeTime: { type: Boolean, default: true } // true = tiempo, false = distancia
  },
  
  // Información de sincronización offline
  offlineSync: {
    lastSyncAt: Date,
    pendingUpdates: [{
      orderId: mongoose.Schema.Types.ObjectId,
      action: String, // 'status_update', 'delivery_proof', etc.
      data: mongoose.Schema.Types.Mixed,
      timestamp: Date
    }]
  }
}, {
  timestamps: true
});

// Índices para mejorar performance
routePlanSchema.index({ company: 1, status: 1 });
routePlanSchema.index({ driver: 1, status: 1 });
routePlanSchema.index({ createdAt: -1 });
routePlanSchema.index({ 'orders.order': 1 });

// Métodos virtuales
routePlanSchema.virtual('totalOrders').get(function() {
  return this.orders.length;
});

routePlanSchema.virtual('completedOrders').get(function() {
  return this.orders.filter(o => o.deliveryStatus === 'delivered').length;
});

routePlanSchema.virtual('progress').get(function() {
  if (this.orders.length === 0) return 0;
  return Math.round((this.completedOrders / this.totalOrders) * 100);
});

// Métodos de instancia
routePlanSchema.methods.updateOrderStatus = function(orderId, status, deliveryProof = null) {
  const orderIndex = this.orders.findIndex(o => o.order.toString() === orderId.toString());
  
  if (orderIndex !== -1) {
    this.orders[orderIndex].deliveryStatus = status;
    
    if (deliveryProof) {
      this.orders[orderIndex].deliveryProof = {
        ...this.orders[orderIndex].deliveryProof,
        ...deliveryProof,
        timestamp: new Date()
      };
    }
    
    if (status === 'delivered') {
      this.orders[orderIndex].actualArrival = new Date();
    }
    
    // Actualizar estado general de la ruta
    this.updateRouteStatus();
  }
  
  return this.save();
};

routePlanSchema.methods.updateRouteStatus = function() {
  const deliveredCount = this.completedOrders;
  const totalCount = this.totalOrders;
  
  if (deliveredCount === 0 && this.status === 'draft') {
    // Mantener draft
  } else if (deliveredCount === 0 && this.status !== 'draft') {
    this.status = 'in_progress';
  } else if (deliveredCount === totalCount) {
    this.status = 'completed';
    this.completedAt = new Date();
  } else {
    this.status = 'in_progress';
  }
};

// Método estático para buscar rutas activas de un conductor
routePlanSchema.statics.findActiveForDriver = function(driverId) {
  return this.findOne({
    driver: driverId,
    status: { $in: ['assigned', 'in_progress'] }
  }).populate('orders.order');
};

module.exports = mongoose.model('RoutePlan', routePlanSchema);