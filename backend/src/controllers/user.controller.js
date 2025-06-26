// backend/src/controllers/user.controller.js
const User = require('../models/User');
const { ERRORS } = require('../config/constants');

class UserController {
  // Actualizar un usuario (usado por admin para activar/desactivar)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      // Solo se permite actualizar el estado 'is_active' por esta ruta
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'Solo se puede actualizar el estado de activación.' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // No permitir que un admin se desactive a sí mismo
      if (user.role === 'admin' && !is_active) {
        return res.status(400).json({ error: 'Un administrador no puede desactivarse a sí mismo.' });
      }

      user.is_active = is_active;
      await user.save();

      res.json({ message: 'Usuario actualizado exitosamente.', user });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new UserController();