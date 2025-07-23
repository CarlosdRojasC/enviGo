// backend/src/models/DriverHistory.js
const mongoose = require('mongoose');

const driverHistorySchema = new mongoose.Schema({
  // INFORMACIÓN DEL CONDUCTOR
  driver_id: {
    type: String,
    required: true,
    index: true
  },
  driver_email: {
    type: String,
    required: true
  },
  driver_name: {
    type: String,
    required: true
  },
  
  // INFORMACIÓN DE LA EMPRESA
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // INFORMACIÓN DEL PEDIDO ENTREGADO
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  shipday_order_id: {
    type: String,
    required: true
  },
  order_number: {
    type: String,
    required: true
  },
  
  // DIRECCIÓN DE ENTREGA
  delivery_address: {
    type: String,
    required: true
  },
  customer_name: {
    type: String,
    required: true
  },
  
  // FECHAS
  delivered_at: {
    type: Date,
    required: true,
    index: true
  },
  
  // PAGO - PRECIO FIJO
  payment_amount: {
    type: Number,
    required: true,
    default: 1700
  },
  
  // CONTROL DE PAGOS
  payment_status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
    index: true
  },
  payment_period: {
    type: String, // Formato: '2024-01' para enero 2024
    required: true,
    index: true
  },
  paid_at: {
    type: Date,
    default: null
  },
  
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas eficientes
driverHistorySchema.index({ driver_id: 1, delivered_at: -1 });
driverHistorySchema.index({ company_id: 1, payment_period: 1, payment_status: 1 });
driverHistorySchema.index({ payment_period: 1, payment_status: 1 });

// Middleware para calcular período de pago automáticamente
driverHistorySchema.pre('save', function(next) {
  if (this.delivered_at) {
    const date = new Date(this.delivered_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.payment_period = `${year}-${month}`;
  }
  next();
});

// Métodos estáticos para reportes y consultas
driverHistorySchema.statics.getDriverEarnings = function(driverId, startDate, endDate) {
  const matchFilter = {
    driver_id: driverId
  };
  
  if (startDate && endDate) {
    matchFilter.delivered_at = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        total_deliveries: { $sum: 1 },
        total_earnings: { $sum: '$payment_amount' },
        pending_earnings: {
          $sum: {
            $cond: [{ $eq: ['$payment_status', 'pending'] }, '$payment_amount', 0]
          }
        },
        paid_earnings: {
          $sum: {
            $cond: [{ $eq: ['$payment_status', 'paid'] }, '$payment_amount', 0]
          }
        }
      }
    }
  ]);
};

driverHistorySchema.statics.getMonthlyPaymentReport = function(companyId, paymentPeriod) {
  return this.aggregate([
    {
      $match: {
        company_id: companyId,
        payment_period: paymentPeriod,
        payment_status: 'pending'
      }
    },
    {
      $group: {
        _id: '$driver_id',
        driver_name: { $first: '$driver_name' },
        driver_email: { $first: '$driver_email' },
        total_deliveries: { $sum: 1 },
        total_amount: { $sum: '$payment_amount' },
        delivery_records: { $push: '$_id' }
      }
    },
    {
      $sort: { total_amount: -1 }
    }
  ]);
};

driverHistorySchema.statics.getCompanyStats = function(companyId, startDate, endDate) {
  const matchFilter = { company_id: companyId };
  
  if (startDate && endDate) {
    matchFilter.delivered_at = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        total_deliveries: { $sum: 1 },
        total_paid_to_drivers: { $sum: '$payment_amount' },
        unique_drivers: { $addToSet: '$driver_id' },
        pending_payments: {
          $sum: {
            $cond: [{ $eq: ['$payment_status', 'pending'] }, '$payment_amount', 0]
          }
        }
      }
    },
    {
      $project: {
        total_deliveries: 1,
        total_paid_to_drivers: 1,
        unique_drivers_count: { $size: '$unique_drivers' },
        pending_payments: 1,
        paid_payments: { $subtract: ['$total_paid_to_drivers', '$pending_payments'] }
      }
    }
  ]);
};

module.exports = mongoose.model('DriverHistory', driverHistorySchema);