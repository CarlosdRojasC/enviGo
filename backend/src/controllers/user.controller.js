// backend/src/controllers/user.controller.js
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const { ERRORS, ROLES } = require('../config/constants');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email.service');

class UserController {
  // Obtener usuarios de la empresa
  async getCompanyUsers(req, res) {
    try {
      const { role, company_id } = req.user;
      
      let query = { is_active: true };
      
      // Admin puede ver usuarios de cualquier empresa
      if (role === ROLES.ADMIN) {
        if (req.query.company_id) {
          query.company_id = req.query.company_id;
        }
      } else {
        // Usuarios de empresa solo ven usuarios de su empresa
        query.company_id = company_id;
      }

      const users = await User.find(query)
        .populate('company_id', 'name slug')
        .select('-password_hash -password_reset_token')
        .sort({ created_at: -1 });

      // Estadísticas adicionales
      const stats = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        owners: users.filter(u => u.role === ROLES.COMPANY_OWNER).length,
        employees: users.filter(u => u.role === ROLES.COMPANY_EMPLOYEE).length,
        locked: users.filter(u => u.locked_until && u.locked_until > new Date()).length,
        password_change_required: users.filter(u => u.password_change_required).length
      };

      res.json({
        users,
        stats,
        pagination: {
          page: 1,
          limit: users.length,
          total: users.length
        }
      });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Crear nuevo usuario
  async createUser(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      const { 
        email, 
        full_name, 
        user_role = ROLES.COMPANY_EMPLOYEE,
        company_id,
        send_welcome_email = true,
        password_change_required = true
      } = req.body;

      // Validar permisos
      if (role !== ROLES.ADMIN && role !== ROLES.COMPANY_OWNER) {
        return res.status(403).json({ error: 'Sin permisos para crear usuarios' });
      }

      // Determinar empresa objetivo
      let targetCompanyId = company_id;
      if (role !== ROLES.ADMIN) {
        targetCompanyId = userCompanyId; // Usuarios no-admin solo pueden crear en su empresa
      }

      // Validar empresa
      const company = await Company.findById(targetCompanyId);
      if (!company || !company.is_active) {
        return res.status(400).json({ error: 'Empresa no válida' });
      }

      // Validar que no existe el email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      // Validar rol
      if (user_role === ROLES.ADMIN) {
        return res.status(400).json({ error: 'No se puede crear usuarios admin desde aquí' });
      }

      // Solo puede haber un company_owner por empresa
      if (user_role === ROLES.COMPANY_OWNER) {
        const existingOwner = await User.findOne({ 
          company_id: targetCompanyId, 
          role: ROLES.COMPANY_OWNER,
          is_active: true 
        });
        if (existingOwner) {
          return res.status(400).json({ error: 'Ya existe un propietario para esta empresa' });
        }
      }

      // Generar contraseña temporal
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const password_hash = await bcrypt.hash(tempPassword, 12);

      // Crear usuario
      const newUser = new User({
        email,
        password_hash,
        full_name,
        role: user_role,
        company_id: targetCompanyId,
        password_change_required,
        is_active: true,
        created_by: req.user.id
      });

      await newUser.save();

      // Enviar email de bienvenida con contraseña temporal
      if (send_welcome_email) {
        try {
          await sendWelcomeEmail(email, full_name, tempPassword, company.name);
        } catch (emailError) {
          console.error('Error enviando email de bienvenida:', emailError);
          // No fallar la creación por error de email
        }
      }

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: {
          id: newUser._id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          company_id: newUser.company_id,
          password_change_required: newUser.password_change_required
        },
        temp_password: send_welcome_email ? undefined : tempPassword // Solo mostrar si no se envió email
      });
    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Actualizar usuario
  async updateUser(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      const { userId } = req.params;
      const updateData = req.body;

      // Obtener usuario a actualizar
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Validar permisos
      if (role !== ROLES.ADMIN) {
        // Solo puede actualizar usuarios de su empresa
        if (user.company_id.toString() !== userCompanyId?.toString()) {
          return res.status(403).json({ error: 'Sin permisos para actualizar este usuario' });
        }
        
        // Company employees no pueden actualizar otros usuarios
        if (role === ROLES.COMPANY_EMPLOYEE) {
          return res.status(403).json({ error: 'Sin permisos para actualizar usuarios' });
        }
      }

      // Campos que no se pueden actualizar directamente
      delete updateData.password_hash;
      delete updateData._id;
      delete updateData.created_at;
      delete updateData.company_id; // La empresa no se cambia así

      // Validar cambio de rol
      if (updateData.role && updateData.role !== user.role) {
        // No se puede cambiar a admin
        if (updateData.role === ROLES.ADMIN) {
          return res.status(400).json({ error: 'No se puede asignar rol de administrador' });
        }

        // Validar que no haya otro owner si se cambia a owner
        if (updateData.role === ROLES.COMPANY_OWNER) {
          const existingOwner = await User.findOne({
            company_id: user.company_id,
            role: ROLES.COMPANY_OWNER,
            is_active: true,
            _id: { $ne: userId }
          });
          if (existingOwner) {
            return res.status(400).json({ error: 'Ya existe un propietario para esta empresa' });
          }
        }
      }

      // Actualizar usuario
      Object.assign(user, updateData);
      user.updated_at = new Date();
      await user.save();

      res.json({
        message: 'Usuario actualizado exitosamente',
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          company_id: user.company_id
        }
      });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Cambiar estado activo/inactivo
  async toggleUserStatus(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Validar permisos
      if (role !== ROLES.ADMIN) {
        if (user.company_id.toString() !== userCompanyId?.toString()) {
          return res.status(403).json({ error: 'Sin permisos' });
        }
        if (role !== ROLES.COMPANY_OWNER) {
          return res.status(403).json({ error: 'Sin permisos para cambiar estado de usuarios' });
        }
      }

      // No se puede desactivar a sí mismo
      if (user._id.toString() === req.user.id) {
        return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      }

      user.is_active = !user.is_active;
      user.updated_at = new Date();
      await user.save();

      res.json({
        message: `Usuario ${user.is_active ? 'activado' : 'desactivado'} exitosamente`,
        user: {
          id: user._id,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error('Error cambiando estado de usuario:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Restablecer contraseña de usuario
  async resetUserPassword(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Validar permisos
      if (role !== ROLES.ADMIN) {
        if (user.company_id.toString() !== userCompanyId?.toString()) {
          return res.status(403).json({ error: 'Sin permisos' });
        }
        if (role !== ROLES.COMPANY_OWNER) {
          return res.status(403).json({ error: 'Sin permisos para restablecer contraseñas' });
        }
      }

      // Generar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.password_reset_token = resetTokenHash;
      user.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      user.password_change_required = true;
      await user.save();

      // Enviar email
      try {
        await sendPasswordResetEmail(user.email, resetToken, user.full_name);
      } catch (emailError) {
        console.error('Error enviando email de reset:', emailError);
        return res.status(500).json({ error: 'Error enviando email de restablecimiento' });
      }

      res.json({
        message: 'Enlace de restablecimiento enviado al usuario'
      });
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Desbloquear usuario
  async unlockUser(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Validar permisos
      if (role !== ROLES.ADMIN) {
        if (user.company_id.toString() !== userCompanyId?.toString()) {
          return res.status(403).json({ error: 'Sin permisos' });
        }
        if (role !== ROLES.COMPANY_OWNER) {
          return res.status(403).json({ error: 'Sin permisos para desbloquear usuarios' });
        }
      }

      user.locked_until = undefined;
      user.failed_login_attempts = 0;
      await user.save();

      res.json({
        message: 'Usuario desbloqueado exitosamente'
      });
    } catch (error) {
      console.error('Error desbloqueando usuario:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Eliminar usuario (soft delete)
  async deleteUser(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Validar permisos
      if (role !== ROLES.ADMIN) {
        if (user.company_id.toString() !== userCompanyId?.toString()) {
          return res.status(403).json({ error: 'Sin permisos' });
        }
        if (role !== ROLES.COMPANY_OWNER) {
          return res.status(403).json({ error: 'Sin permisos para eliminar usuarios' });
        }
      }

      // No se puede eliminar a sí mismo
      if (user._id.toString() === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      }

      // Soft delete
      user.is_active = false;
      user.deleted_at = new Date();
      user.deleted_by = req.user.id;
      user.email = `${user.email}.deleted.${Date.now()}`; // Evitar conflictos
      await user.save();

      res.json({
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener usuario por ID
  async getUserById(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      const { userId } = req.params;

      let query = { _id: userId, is_active: true };
      
      // Filtrar por empresa si no es admin
      if (role !== ROLES.ADMIN) {
        query.company_id = userCompanyId;
      }

      const user = await User.findOne(query)
        .populate('company_id', 'name slug')
        .select('-password_hash -password_reset_token');

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener estadísticas de usuarios
  async getUserStats(req, res) {
    try {
      const { role, company_id: userCompanyId } = req.user;
      
      let matchQuery = {};
      if (role !== ROLES.ADMIN) {
        matchQuery.company_id = userCompanyId;
      }

      const stats = await User.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$is_active', 1, 0] } },
            owners: { $sum: { $cond: [{ $eq: ['$role', ROLES.COMPANY_OWNER] }, 1, 0] } },
            employees: { $sum: { $cond: [{ $eq: ['$role', ROLES.COMPANY_EMPLOYEE] }, 1, 0] } },
            locked: { 
              $sum: { 
                $cond: [
                  { $gt: ['$locked_until', new Date()] }, 
                  1, 
                  0
                ] 
              } 
            },
            password_change_required: { $sum: { $cond: ['$password_change_required', 1, 0] } },
            recent_logins: {
              $sum: {
                $cond: [
                  { $gte: ['$last_login', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        total: 0,
        active: 0,
        owners: 0,
        employees: 0,
        locked: 0,
        password_change_required: 0,
        recent_logins: 0
      };

      res.json(result);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new UserController();