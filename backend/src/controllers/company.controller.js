const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { ERRORS } = require('../config/constants');

class CompanyController {
  // Listar todas las empresas (admin)
  async getAll(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          c.*,
          COUNT(DISTINCT sc.id) as channels_count,
          COUNT(DISTINCT o.id) as orders_count,
          COUNT(DISTINCT u.id) as users_count
        FROM companies c
        LEFT JOIN sales_channels sc ON c.id = sc.company_id AND sc.is_active = true
        LEFT JOIN orders o ON c.id = o.company_id
        LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
        GROUP BY c.id
        ORDER BY c.name
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Obtener una empresa específica
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        SELECT 
          c.*,
          COUNT(DISTINCT sc.id) as channels_count,
          COUNT(DISTINCT o.id) as orders_count,
          COUNT(DISTINCT u.id) as users_count
        FROM companies c
        LEFT JOIN sales_channels sc ON c.id = sc.company_id AND sc.is_active = true
        LEFT JOIN orders o ON c.id = o.company_id
        LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
        WHERE c.id = $1
        GROUP BY c.id
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo empresa:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Crear nueva empresa (admin)
  async create(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { 
        name, 
        email, 
        phone, 
        address, 
        price_per_order,
        owner_email,
        owner_name,
        owner_password
      } = req.body;
      
      // Generar slug
      const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .substring(0, 100);
      
      // Crear empresa
      const companyResult = await client.query(
        `INSERT INTO companies (name, slug, email, phone, address, price_per_order) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [name, slug, email, phone, address, price_per_order || 0]
      );
      
      const company = companyResult.rows[0];
      
      // Si se proporcionaron datos del dueño, crear usuario
      if (owner_email && owner_password) {
        const password_hash = await bcrypt.hash(owner_password, 10);
        
        await client.query(
          `INSERT INTO users (company_id, email, password_hash, full_name, role) 
           VALUES ($1, $2, $3, $4, $5)`,
          [company.id, owner_email, password_hash, owner_name || name, 'company_owner']
        );
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Empresa creada exitosamente',
        company: company
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.code === '23505') { // Duplicate key
        return res.status(400).json({ error: 'Ya existe una empresa con ese nombre o email' });
      }
      
      console.error('Error creando empresa:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    } finally {
      client.release();
    }
  }
  
  // Actualizar empresa
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, address, is_active } = req.body;
      
      const result = await pool.query(
        `UPDATE companies 
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             address = COALESCE($4, address),
             is_active = COALESCE($5, is_active),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, email, phone, address, is_active, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error actualizando empresa:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Actualizar precio por pedido (admin)
  async updatePrice(req, res) {
    try {
      const { id } = req.params;
      const { price_per_order } = req.body;
      
      if (price_per_order < 0) {
        return res.status(400).json({ error: 'El precio no puede ser negativo' });
      }
      
      const result = await pool.query(
        'UPDATE companies SET price_per_order = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [price_per_order, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }
      
      res.json({
        message: 'Precio actualizado exitosamente',
        company: result.rows[0]
      });
    } catch (error) {
      console.error('Error actualizando precio:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Obtener usuarios de una empresa
  async getUsers(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT id, email, full_name, role, is_active, last_login, created_at
         FROM users 
         WHERE company_id = $1
         ORDER BY full_name`,
        [id]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Estadísticas de la empresa
  async getStats(req, res) {
    try {
      const { id } = req.params;
      const { month, year } = req.query;
      
      // Si no se especifica mes/año, usar el actual
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();
      
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
          COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped_orders,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value
        FROM orders
        WHERE company_id = $1
          AND EXTRACT(MONTH FROM order_date) = $2
          AND EXTRACT(YEAR FROM order_date) = $3
      `, [id, targetMonth, targetYear]);
      
      const companyResult = await pool.query(
        'SELECT price_per_order FROM companies WHERE id = $1',
        [id]
      );
      
      const stats = statsResult.rows[0];
      const price_per_order = companyResult.rows[0].price_per_order;
      
      res.json({
        month: targetMonth,
        year: targetYear,
        ...stats,
        price_per_order: price_per_order,
        estimated_invoice: stats.delivered_orders * price_per_order
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new CompanyController();