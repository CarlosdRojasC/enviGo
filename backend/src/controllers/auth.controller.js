const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { ERRORS } = require('../config/constants');

class AuthController {
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Buscar usuario
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
      }
      
      const user = userResult.rows[0];
      
      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
      }
      
      // Actualizar último login
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Obtener información de la empresa si no es admin
      let company = null;
      if (user.company_id) {
        const companyResult = await pool.query(
          'SELECT id, name, slug, price_per_order FROM companies WHERE id = $1',
          [user.company_id]
        );
        company = companyResult.rows[0];
      }
      
      // Generar token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          company_id: user.company_id 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );
      
      res.json({ 
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          company: company
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
      
      // Verificar que la empresa existe
      const companyResult = await pool.query(
        'SELECT id FROM companies WHERE id = $1 AND is_active = true',
        [company_id]
      );
      
      if (companyResult.rows.length === 0) {
        return res.status(400).json({ error: 'Empresa no válida' });
      }
      
      // Hash de contraseña
      const password_hash = await bcrypt.hash(password, 10);
      
      // Crear usuario
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, company_id) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, full_name, role, company_id`,
        [email, password_hash, full_name, 'company_employee', company_id]
      );
      
      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') { // Duplicate key
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
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );
      
      const user = userResult.rows[0];
      
      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }
      
      // Hash nueva contraseña
      const newPasswordHash = await bcrypt.hash(new_password, 10);
      
      // Actualizar contraseña
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );
      
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
      
      const result = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.last_login,
                c.id as company_id, c.name as company_name, c.slug as company_slug
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         WHERE u.id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        last_login: user.last_login,
        company: user.company_id ? {
          id: user.company_id,
          name: user.company_name,
          slug: user.company_slug
        } : null
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new AuthController();