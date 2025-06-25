// backend/src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { ERRORS, ROLES } = require('../config/constants');

class AuthController {
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email, is_active: true }).populate('company_id');
      if (!user) return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });

      user.last_login = new Date();
      await user.save();

      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email, 
          role: user.role, 
          company_id: user.company_id?._id || null
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          company: user.company_id,
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Registro de usuario
  async register(req, res) {
    try {
      const { email, password, full_name, company_id, role = ROLES.COMPANY_EMPLOYEE } = req.body;

      // Validar que el rol sea permitido
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ error: 'Rol no válido' });
      }

      // Si no es admin, debe tener una empresa
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

  // Cambiar contraseña
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const validPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!validPassword) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

      user.password_hash = await bcrypt.hash(new_password, 10);
      await user.save();

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener perfil
  async getProfile(req, res) {
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
}

module.exports = new AuthController();