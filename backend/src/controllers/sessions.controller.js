// backend/src/controllers/sessions.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES, ERRORS } = require('../config/constants');

class SessionsController {
  // Obtener todas las sesiones activas (solo admin)
  async getActiveSessions(req, res) {
    try {
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ error: 'Solo administradores pueden ver sesiones activas' });
      }

      // En una implementación real, esto vendría de Redis o una base de datos
      // Por ahora simularemos con datos del usuario
      const users = await User.find({ 
        is_active: true,
        last_login: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24 horas
      })
      .select('email full_name role last_login last_login_ip company_id')
      .populate('company_id', 'name')
      .sort({ last_login: -1 });

      // Simular sesiones activas basadas en usuarios
      const activeSessions = users.map(user => ({
        id: user._id.toString(),
        user_id: user._id,
        user_name: user.full_name,
        user_email: user.email,
        role: user.role,
        company_name: user.company_id?.name || 'Sin empresa',
        last_activity: user.last_login,
        ip_address: user.last_login_ip || 'Desconocida',
        device: this.generateDeviceInfo(req.headers['user-agent'] || ''),
        location: 'Santiago, Chile', // En producción, usar geolocalización por IP
        session_duration: this.calculateSessionDuration(user.last_login),
        is_current: user._id.toString() === req.user.id
      }));

      res.json({
        sessions: activeSessions,
        total: activeSessions.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error obteniendo sesiones activas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Terminar sesión específica (solo admin)
  async terminateSession(req, res) {
    try {
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ error: 'Solo administradores pueden terminar sesiones' });
      }

      const { sessionId } = req.params;
      
      // Buscar el usuario por sessionId (que es user_id en nuestro caso)
      const user = await User.findById(sessionId);
      if (!user) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      // Prevenir que el admin se desconecte a sí mismo
      if (sessionId === req.user.id) {
        return res.status(400).json({ error: 'No puedes desconectar tu propia sesión' });
      }

      // Marcar para forzar re-login
      user.session_invalidated_at = new Date();
      user.password_change_required = false; // No forzar cambio de password, solo re-login
      await user.save();

      // Log de seguridad
      console.log(`🚨 ADMIN LOGOUT: ${req.user.email} desconectó a ${user.email} (${user.full_name})`);

      res.json({
        message: `Sesión de ${user.full_name} terminada exitosamente`,
        terminated_user: {
          id: user._id,
          name: user.full_name,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Error terminando sesión:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Terminar TODAS las sesiones (emergencia)
  async terminateAllSessions(req, res) {
    try {
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ error: 'Solo administradores pueden terminar todas las sesiones' });
      }

      // Invalidar todas las sesiones excepto la del admin actual
      const result = await User.updateMany(
        { 
          _id: { $ne: req.user.id }, // Excluir al admin actual
          is_active: true 
        },
        { 
          session_invalidated_at: new Date(),
          password_change_required: false
        }
      );

      // Log crítico de seguridad
      console.log(`🚨 EMERGENCY LOGOUT: ${req.user.email} terminó TODAS las sesiones activas. Usuarios afectados: ${result.modifiedCount}`);

      res.json({
        message: `${result.modifiedCount} sesiones terminadas exitosamente`,
        affected_count: result.modifiedCount,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error terminando todas las sesiones:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener estadísticas de sesiones
  async getSessionStats(req, res) {
    try {
      if (req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ error: 'Solo administradores pueden ver estadísticas' });
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = await User.aggregate([
        { $match: { is_active: true } },
        {
          $group: {
            _id: null,
            total_users: { $sum: 1 },
            active_last_hour: {
              $sum: {
                $cond: [{ $gte: ['$last_login', oneHourAgo] }, 1, 0]
              }
            },
            active_last_day: {
              $sum: {
                $cond: [{ $gte: ['$last_login', oneDayAgo] }, 1, 0]
              }
            },
            admins: {
              $sum: {
                $cond: [{ $eq: ['$role', 'admin'] }, 1, 0]
              }
            },
            company_owners: {
              $sum: {
                $cond: [{ $eq: ['$role', 'company_owner'] }, 1, 0]
              }
            },
            employees: {
              $sum: {
                $cond: [{ $eq: ['$role', 'company_employee'] }, 1, 0]
              }
            }
          }
        }
      ]);

      const sessionStats = stats[0] || {
        total_users: 0,
        active_last_hour: 0,
        active_last_day: 0,
        admins: 0,
        company_owners: 0,
        employees: 0
      };

      res.json({
        ...sessionStats,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Métodos auxiliares
  generateDeviceInfo(userAgent) {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      return '📱 Móvil';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return '📱 Tablet';
    } else if (userAgent.includes('Chrome')) {
      return '🖥️ Chrome';
    } else if (userAgent.includes('Firefox')) {
      return '🖥️ Firefox';
    } else if (userAgent.includes('Safari')) {
      return '🖥️ Safari';
    } else {
      return '🖥️ Navegador';
    }
  }

  calculateSessionDuration(lastLogin) {
    if (!lastLogin) return '0 min';
    
    const now = new Date();
    const diffMs = now - new Date(lastLogin);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} min`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ${diffMins % 60}min`;
    } else {
      return `${Math.floor(diffMins / 1440)} días`;
    }
  }
}

module.exports = new SessionsController();