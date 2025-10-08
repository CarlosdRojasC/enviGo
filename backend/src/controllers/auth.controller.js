// backend/src/controllers/auth.controller.js (versión refactorizada)
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Company = require('../models/Company');
const { ERRORS, ROLES } = require('../config/constants');
const logger = require('../utils/logger'); // 🔥 nuevo: logger centralizado

// Helpers de respuesta unificada
const success = (res, message, data = {}, code = 200) =>
  res.status(code).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });

const fail = (res, error, code = 500, extra = {}) =>
  res.status(code).json({
    success: false,
    error,
    ...extra,
    timestamp: new Date().toISOString(),
  });

class AuthController {
  // 🔐 LOGIN
  login = async (req, res) => {
    try {
      const { email, password, remember_me = false } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      const user = await User.findOne({ email }).populate('company_id');
      if (!user) {
        this.logFailedAttempt(email, clientIP, 'USER_NOT_FOUND');
        return fail(res, ERRORS.INVALID_CREDENTIALS, 401);
      }

      if (!user.is_active) {
        this.logFailedAttempt(email, clientIP, 'USER_DISABLED');
        return fail(res, 'Cuenta desactivada. Contacta al administrador.', 403);
      }

      if (user.locked_until && user.locked_until > new Date()) {
        const mins = Math.ceil((user.locked_until - new Date()) / 60000);
        return fail(res, 'Cuenta bloqueada temporalmente', 423, {
          locked_until: user.locked_until,
          wait_minutes: mins,
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        await this.handleFailedLogin(user, clientIP);
        return fail(res, ERRORS.INVALID_CREDENTIALS, 401);
      }

      await this.handleSuccessfulLogin(user, clientIP);

      const tokenExpiry = remember_me ? '30d' : process.env.JWT_EXPIRE || '7d';
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
          company_id: user.company_id?._id || null,
          session_id: crypto.randomUUID(),
        },
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      success(res, 'Inicio de sesión exitoso', {
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
          requires_password_change: user.password_change_required || false,
        },
      });
    } catch (error) {
      logger.error({ msg: 'Error en login', error });
      fail(res, ERRORS.SERVER_ERROR, 500);
    }
  };

  // 🧾 REGISTRO
  register = async (req, res) => {
    try {
      const { email, password, full_name, company_id, role = ROLES.COMPANY_EMPLOYEE } = req.body;

      if (!Object.values(ROLES).includes(role))
        return fail(res, 'Rol no válido', 400);

      if (role !== ROLES.ADMIN) {
        if (!company_id) return fail(res, 'Se requiere empresa', 400);

        const company = await Company.findById(company_id);
        if (!company || !company.is_active)
          return fail(res, 'Empresa no válida', 400);
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

      success(res, 'Usuario creado exitosamente', {
        id: newUser._id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        company_id: newUser.company_id,
      }, 201);
    } catch (error) {
      logger.error({ msg: 'Error en registro', error });
      if (error.code === 11000)
        return fail(res, 'El email ya está registrado', 400);
      fail(res, ERRORS.SERVER_ERROR, 500);
    }
  };

  // 👤 PERFIL
  getProfile = async (req, res) => {
    try {
      const user = await User.findById(req.user.id).populate('company_id');
      if (!user) return fail(res, 'Usuario no encontrado', 404);

      success(res, 'Perfil cargado correctamente', {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company: user.company_id,
        last_login: user.last_login,
      });
    } catch (error) {
      logger.error({ msg: 'Error obteniendo perfil', error });
      fail(res, ERRORS.SERVER_ERROR);
    }
  };

  // 🔁 PASSWORD RESET REQUEST
  requestPasswordReset = async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email, is_active: true });

      if (!user)
        return success(res, 'Si el email existe, recibirás instrucciones');

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.password_reset_token = resetHash;
      user.password_reset_expires = new Date(Date.now() + 3600000);
      await user.save();

      await this.sendPasswordResetEmail(user.email, resetToken, user.full_name);

      success(res, 'Instrucciones de restablecimiento enviadas si el email existe');
    } catch (error) {
      logger.error({ msg: 'Error solicitando password reset', error });
      fail(res, ERRORS.SERVER_ERROR);
    }
  };

  // 🔒 PASSWORD RESET CONFIRMATION
  resetPassword = async (req, res) => {
    try {
      const { token, new_password } = req.body;
      if (!token || !new_password)
        return fail(res, 'Token y nueva contraseña requeridos', 400);

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        password_reset_token: tokenHash,
        password_reset_expires: { $gt: new Date() },
        is_active: true,
      });

      if (!user) return fail(res, 'Token inválido o expirado', 400);

      const samePassword = await bcrypt.compare(new_password, user.password_hash);
      if (samePassword)
        return fail(res, 'La nueva contraseña debe ser diferente', 400);

      user.password_hash = await bcrypt.hash(new_password, 12);
      user.password_reset_token = undefined;
      user.password_reset_expires = undefined;
      user.password_change_required = false;
      user.failed_login_attempts = 0;
      user.locked_until = undefined;
      user.password_changed_at = new Date();
      await user.save();

      success(res, 'Contraseña actualizada exitosamente');
    } catch (error) {
      logger.error({ msg: 'Error en password reset', error });
      fail(res, ERRORS.SERVER_ERROR);
    }
  };

  // 🔑 VALIDAR TOKEN JWT
  verifyToken = async (req, res) => {
    try {
      const user = await User.findById(req.user.id).populate('company_id');
      if (!user || !user.is_active)
        return fail(res, 'Usuario inválido o inactivo', 401);

      success(res, 'Token válido', {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company: user.company_id,
        permissions: this.getUserPermissions(user.role),
      });
    } catch (error) {
      logger.error({ msg: 'Error verificando token', error });
      fail(res, 'Token inválido', 401);
    }
  };

  // ⚙️ HELPERS
  async handleFailedLogin(user, clientIP) {
    user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
    user.last_failed_login = new Date();
    if (user.failed_login_attempts >= 5)
      user.locked_until = new Date(Date.now() + 15 * 60 * 1000);
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
    logger.warn({
      msg: 'Intento de login fallido',
      email,
      ip,
      reason,
      time: new Date().toISOString(),
    });
  }

  getUserPermissions(role) {
    const permissions = {
      admin: ['manage_companies', 'manage_users', 'view_all_orders', 'system_settings'],
      company_owner: ['manage_company_users', 'view_company_orders', 'company_settings'],
      company_employee: ['view_orders', 'create_orders', 'view_reports'],
    };
    return permissions[role] || [];
  }

  async sendPasswordResetEmail(email, token, fullName) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await transporter.sendMail({
        from: `"enviGo" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Restablecer contraseña - enviGo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>Hola ${fullName},</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <a href="${resetUrl}" style="background:#007bff;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Restablecer contraseña</a>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste este cambio, ignora este correo.</p>
          </div>`,
      });
      logger.info({ msg: `Email de reset enviado a ${email}` });
    } catch (error) {
      logger.error({ msg: 'Error enviando email de reset', error });
    }
  }
}

module.exports = new AuthController();
