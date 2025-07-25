// backend/src/controllers/notificationController.js

const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

/**
 * @desc    Obtener notificaciones del usuario con paginación
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Busca las notificaciones para el usuario actual, ordenadas por fecha
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // .lean() para que sea más rápido, ya que solo es para lectura

  const total = await Notification.countDocuments({ user: userId });

  res.json({
    notifications: notifications.map(n => ({ ...n, id: n._id })), // Asegura que el 'id' esté presente
    hasMore: skip + notifications.length < total,
    currentPage: page,
  });
});


/**
 * @desc    Marcar una notificación como leída
 * @route   POST /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id }, // Asegura que solo el dueño pueda marcarla
        { read: true },
        { new: true } // Devuelve el documento actualizado
    );

    if (!notification) {
        res.status(404);
        throw new Error('Notificación no encontrada');
    }

    res.status(200).json(notification);
});


/**
 * @desc    Marcar todas las notificaciones como leídas
 * @route   POST /api/notifications/mark-all-read
 * @access  Private
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { user: req.user.id, read: false },
        { read: true }
    );

    res.status(200).json({ message: 'Todas las notificaciones han sido marcadas como leídas' });
});