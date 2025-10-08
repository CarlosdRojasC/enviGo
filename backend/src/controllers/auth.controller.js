// backend/src/controllers/auth.controller.js - ESTRUCTURA CORREGIDA
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Company = require('../models/Company');
const { ERRORS, ROLES } = require('../config/constants');

class AuthController {
  // Login mejorado
  login = async(req, res) => {
    try {
      const { email, password, remember_me = false } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      const user = await User.findOne({ email }).populate('company_id');
if (!user) {
  this.logFailedAttempt(email, clientIP, 'USER_NOT_FOUND');
  return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
}

// 🔥 NUEVA VALIDACIÓN: Verificar si el usuario está desactivado
if (!user.is_active) {
  this.logFailedAttempt(email, clientIP, 'USER_DISABLED');
  return res.status(403).json({ 
    error: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
    code: 'USER_DISABLED' 
  });
}

      // Verificar si la cuenta está bloqueada
      if (user.locked_until && user.locked_until > new Date()) {
        const lockTimeRemaining = Math.ceil((user.locked_until - new Date()) / 1000 / 60);
        return res.status(423).json({ 
          error: 'Cuenta bloqueada',
          details: `Intentalo de nuevo en ${lockTimeRemaining} minutos`,
          locked_until: user.locked_until
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        await this.handleFailedLogin(user, clientIP);
        return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
      }

      // Login exitoso - resetear contadores de fallo
      await this.handleSuccessfulLogin(user, clientIP);

      // Generar token
      const tokenExpiry = remember_me ? '30d' : (process.env.JWT_EXPIRE || '7d');
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email, 
          role: user.role, 
          company_id: user.company_id?._id || null,
          session_id: crypto.randomUUID()
        },
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      res.json({
        token,
        expires_in: tokenExpiry,
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          company: user.company_id,
          permissions: this.getUserPermissions(user.role),
          last_login: user.last_login,
          requires_password_change: user.password_change_required || false
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Registro de usuario
  register = async(req, res) => {
    try {
      const { email, password, full_name, company_id, role = ROLES.COMPANY_EMPLOYEE } = req.body;

      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ error: 'Rol no válido' });
      }

      if (role !== ROLES.ADMIN) {
        if (!company_id) {
          return res.status(400).json({ error: 'Se requiere empresa para este rol' });
        }

        const company = await Company.findById(company_id);
        if (!company || !company.is_active) {
          return res.status(400).json({ error: 'Empresa no válida' });
        }
      }

      const password_hash = await bcrypt.hash(password, 10);

      const newUser = new User({
        email,
        password_hash,
        full_name,
        role,
        company_id: role === ROLES.ADMIN ? null : company_id,
      });

      await newUser.save();

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: {
          id: newUser._id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          company_id: newUser.company_id
        },
      });
    } catch (error) {
      console.error('Error en registro:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener perfil
  getProfile = async(req, res) =>  {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).populate('company_id');
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      res.json({
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        last_login: user.last_login,
        company: user.company_id,
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Solicitar reset de contraseña
requestPasswordReset = async (req, res) => {
    
    try {
      const { email } = req.body;

      const user = await User.findOne({ email, is_active: true });
      if (!user) {
        return res.json({ 
          message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña' 
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.password_reset_token = resetTokenHash;
      user.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      await this.sendPasswordResetEmail(user.email, resetToken, user.full_name);

      res.json({ 
        message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña' 
      });
    } catch (error) {
      console.error('Error en password reset request:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Resetear contraseña con token
  resetPassword = async(req, res) => {
    try {
      const { token, new_password } = req.body;

      if (!token || !new_password) {
        return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
      }

      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        password_reset_token: resetTokenHash,
        password_reset_expires: { $gt: new Date() },
        is_active: true
      });

      if (!user) {
        return res.status(400).json({ error: 'Token inválido o expirado' });
      }

      const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
      if (isSamePassword) {
        return res.status(400).json({ 
          error: 'La nueva contraseña debe ser diferente a la anterior' 
        });
      }

      user.password_hash = await bcrypt.hash(new_password, 12);
      user.password_reset_token = undefined;
      user.password_reset_expires = undefined;
      user.password_change_required = false;
      user.failed_login_attempts = 0;
      user.locked_until = undefined;
      user.password_changed_at = new Date();
      await user.save();

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error en password reset:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Cambiar contraseña
  changePassword = async(req, res) => {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const validPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
      if (isSamePassword) {
        return res.status(400).json({ 
          error: 'La nueva contraseña debe ser diferente a la actual' 
        });
      }

      user.password_hash = await bcrypt.hash(new_password, 12);
      user.password_change_required = false;
      user.password_changed_at = new Date();
      await user.save();

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Verificar token
  verifyToken = async(req, res) => {
    try {
      const user = await User.findById(req.user.id).populate('company_id');
      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Usuario inválido' });
      }

      res.json({
        valid: true,
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          company: user.company_id,
          permissions: this.getUserPermissions(user.role)
        }
      });
    } catch (error) {
      console.error('Error verificando token:', error);
      res.status(401).json({ error: 'Token inválido' });
    }
  }

  // ✅ MÉTODOS AUXILIARES - CORRECTAMENTE DENTRO DE LA CLASE
  async handleFailedLogin(user, clientIP) {
    user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
    user.last_failed_login = new Date();

    if (user.failed_login_attempts >= 5) {
      user.locked_until = new Date(Date.now() + 15 * 60 * 1000);
    }

    await user.save();
    this.logFailedAttempt(user.email, clientIP, 'INVALID_PASSWORD');
  }

  async handleSuccessfulLogin(user, clientIP) {
    user.last_login = new Date();
    user.failed_login_attempts = 0;
    user.locked_until = undefined;
    user.last_login_ip = clientIP;
    await user.save();
  }

  logFailedAttempt(email, ip, reason) {
    console.warn(`Failed login attempt - Email: ${email}, IP: ${ip}, Reason: ${reason}, Time: ${new Date().toISOString()}`);
  }

  getUserPermissions(role) {
    const permissions = {
      admin: ['manage_companies', 'manage_users', 'view_all_orders', 'system_settings'],
      company_owner: ['manage_company_users', 'view_company_orders', 'company_settings'],
      company_employee: ['view_orders', 'create_orders', 'view_reports']
    };
    return permissions[role] || [];
  }
validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Hashea el token que viene del cliente para buscarlo en la BD
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      password_reset_token: resetTokenHash,
      password_reset_expires: { $gt: Date.now() } // Revisa que no haya expirado
    });

    // Si no se encuentra un usuario, el token es inválido o expiró
    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // Si se encuentra, el token es válido
    res.json({ message: 'Token válido' });

  } catch (error) {
    console.error('Error validando token:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
  sendPasswordResetEmail = async(email, token, fullName) => {
    try {
      // Si no tienes configurado SMTP, simplemente log por ahora

       const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,    // Ahora usas la variable correcta
        pass: process.env.EMAIL_PASSWORD // Ahora usas la variable correcta
      }
    });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const mailOptions = {
        from: `"enviGo" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Restablecer tu contraseña de enviGo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hola ${fullName},</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña en enviGo.</p>
            <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Restablecer Contraseña
            </a>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
            <hr>
            <p><small>enviGo - Gestión Logística de Última Milla</small></p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }
} // ✅ CIERRE CORRECTO DE LA CLASE

module.exports = new AuthController();