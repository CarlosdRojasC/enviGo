// backend/src/models/Notification.js

const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    // A qué usuario pertenece la notificación
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    // Título de la notificación
    title: {
      type: String,
      required: true,
    },
    // Mensaje detallado
    message: {
      type: String,
      required: true,
    },
    // Tipo de notificación para el ícono en el frontend
    type: {
      type: String,
      required: true,
      enum: ['new_order', 'delivery', 'sync', 'error', 'success', 'info'],
    },
    // Si el usuario ya la leyó o no
    read: {
      type: Boolean,
      required: true,
      default: false,
    },
    // (Opcional) Enlace al que debe llevar la notificación
    link: {
      type: String,
    },
    // (Opcional) Referencia a una orden específica
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }
  },
  {
    timestamps: true, // Esto añade createdAt y updatedAt automáticamente
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;