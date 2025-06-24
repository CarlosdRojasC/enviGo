const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { ERRORS } = require('../config/constants');

class AuthController {
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuario activo y popular empresa
      const user = await User.findOne({ email, is_active: true }).populate('company_id');
      if (!user) return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });

      // Actualizar último login
      user.last_login = new Date();
      await user.save();

      // Generar token JWT
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email, 
          role: user.role,
          company_id: user.company_id ? user.company_id._id : null
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
          company: user.company_id ? {
            id: user.company_id._id,
            name: user.company_id.name,
            slug: user.company_id.slug,
            price_per_order: user.company_id.price_per_order
          } : null
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Registro de usuario (solo para empresas existentes)
  async register(req, res) {
    try {
      const { email, password, full_name, company_id } = req.body;

      // Verificar que la empresa existe y está activa
      const company = await Company.findOne({ _id: company_id, is_active: true });
      if (!company) {
        return res.status(400).json({ error: 'Empresa no válida' });
      }

      // Hash de contraseña
      const password_hash = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = new User({
        email,
        password_hash,
        full_name,
        role: 'company_employee',
        company_id
      });

      await user.save();

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          company_id: user.company_id
        }
      });
    } catch (error) {
      if (error.code === 11000) { // Duplicate key error Mongo
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      console.error('Error en registro:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Cambiar contraseña
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      // Obtener usuario actual
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      // Hash nueva contraseña
      const newPasswordHash = await bcrypt.hash(new_password, 10);

      // Actualizar contraseña
      user.password_hash = newPasswordHash;
      await user.save();

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener perfil actual
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      // Buscar usuario con empresa populada
      const user = await User.findById(userId).populate('company_id');

      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      res.json({
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        last_login: user.last_login,
        company: user.company_id ? {
          id: user.company_id._id,
          name: user.company_id.name,
          slug: user.company_id.slug,
          price_per_order: user.company_id.price_per_order
        } : null
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new AuthController();
