const pool = require('../config/database');
const { ERRORS, ORDER_STATUS } = require('../config/constants');
const ExcelService = require('../services/excel.service');

class OrderController {
  // Listar pedidos con filtros
  async getAll(req, res) {
    try {
      const { 
        status, 
        date_from, 
        date_to, 
        company_id,
        channel_id,
        search,
        page = 1,
        limit = 50
      } = req.query;
      
      let query;
      let countQuery;
      let params = [];
      let whereConditions = ['1=1'];
      
      // Base query según rol
      if (req.user.role === 'admin') {
        query = `
          SELECT 
            o.*,
            c.name as company_name,
            c.price_per_order,
            sc.channel_type,
            sc.channel_name,
            COUNT(*) OVER() as total_count
          FROM orders o
          JOIN companies c ON o.company_id = c.id
          JOIN sales_channels sc ON o.channel_id = sc.id
        `;
        
        if (company_id) {
          params.push(company_id);
          whereConditions.push(`o.company_id = $${params.length}`);
        }
      } else {
        // Usuarios de empresa solo ven sus pedidos
        params.push(req.user.company_id);
        query = `
          SELECT 
            o.*,
            sc.channel_type,
            sc.channel_name,
            COUNT(*) OVER() as total_count
          FROM orders o
          JOIN sales_channels sc ON o.channel_id = sc.id
        `;
        whereConditions.push(`o.company_id = $${params.length}`);
      }
      
      // Aplicar filtros
      if (status) {
        params.push(status);
        whereConditions.push(`o.status = $${params.length}`);
      }
      
      if (channel_id) {
        params.push(channel_id);
        whereConditions.push(`o.channel_id = $${params.length}`);
      }
      
      if (date_from) {
        params.push(date_from);
        whereConditions.push(`o.order_date >= $${params.length}`);
      }
      
      if (date_to) {
        params.push(date_to);
        whereConditions.push(`o.order_date <= $${params.length}`);
      }
      
      if (search) {
        params.push(`%${search}%`);
        whereConditions.push(`(
          o.order_number ILIKE $${params.length} OR 
          o.customer_name ILIKE $${params.length} OR 
          o.customer_email ILIKE $${params.length} OR
          o.external_order_id ILIKE $${params.length}
        )`);
      }
      
      // Construir query final
      query += ` WHERE ${whereConditions.join(' AND ')}`;
      query += ' ORDER BY o.order_date DESC';
      
      // Paginación
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
      
      const result = await pool.query(query, params);
      
      // Obtener total de registros del primer resultado
      const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      // Remover total_count de los resultados
      const orders = result.rows.map(row => {
        const { total_count, ...order } = row;
        return order;
      });
      
      res.json({
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error obteniendo pedidos:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Obtener un pedido específico
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      let query = `
        SELECT 
          o.*,
          sc.channel_type,
          sc.channel_name,
          sc.store_url,
          c.name as company_name,
          c.price_per_order
        FROM orders o
        JOIN sales_channels sc ON o.channel_id = sc.id
        JOIN companies c ON o.company_id = c.id
        WHERE o.id = $1
      `;
      
      const params = [id];
      
      // Si no es admin, verificar que sea de su empresa
      if (req.user.role !== 'admin') {
        query += ' AND o.company_id = $2';
        params.push(req.user.company_id);
      }
      
      const orderResult = await pool.query(query, params);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }
      
      const order = orderResult.rows[0];
      
      // Obtener items del pedido
      const itemsResult = await pool.query(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
        [id]
      );
      
      // Obtener historial de estados
      const historyResult = await pool.query(
        `SELECT 
          osh.*,
          u.full_name as created_by_name
         FROM order_status_history osh
         LEFT JOIN users u ON osh.created_by = u.id
         WHERE osh.order_id = $1
         ORDER BY osh.created_at DESC`,
        [id]
      );
      
      res.json({
        ...order,
        items: itemsResult.rows,
        status_history: historyResult.rows
      });
    } catch (error) {
      console.error('Error obteniendo pedido:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Actualizar estado de pedido
  async updateStatus(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { status, notes } = req.body;
      
      // Validar estado
      if (!Object.values(ORDER_STATUS).includes(status)) {
        return res.status(400).json({ error: 'Estado no válido' });
      }
      
      // Verificar que el pedido existe y obtener estado actual
      const orderResult = await client.query(
        'SELECT status, company_id FROM orders WHERE id = $1',
        [id]
      );
      
      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }
      
      const order = orderResult.rows[0];
      
      // Verificar permisos
      if (req.user.role !== 'admin' && req.user.company_id !== order.company_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      // No permitir cambiar de 'delivered' o 'cancelled' a otro estado
      if ((order.status === 'delivered' || order.status === 'cancelled') && 
          status !== order.status) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'No se puede cambiar el estado de un pedido entregado o cancelado' 
        });
      }
      
      // Actualizar estado
      const updateResult = await client.query(
        `UPDATE orders 
         SET status = $1, 
             updated_at = NOW(),
             delivery_date = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivery_date END
         WHERE id = $2 
         RETURNING *`,
        [status, id]
      );
      
      // Registrar en historial
      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes, created_by)
         VALUES ($1, $2, $3, $4)`,
        [id, status, notes, req.user.id]
      );
      
      await client.query('COMMIT');
      
      res.json({
        message: 'Estado actualizado exitosamente',
        order: updateResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error actualizando estado:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    } finally {
      client.release();
    }
  }
  
  // Crear pedido manualmente
  async create(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        channel_id,
        external_order_id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_document,
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_zip,
        total_amount,
        shipping_cost,
        items,
        notes
      } = req.body;
      
      // Verificar que el canal existe y pertenece a la empresa correcta
      const channelResult = await client.query(
        'SELECT company_id FROM sales_channels WHERE id = $1 AND is_active = true',
        [channel_id]
      );
      
      if (channelResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Canal de venta no válido' });
      }
      
      const company_id = channelResult.rows[0].company_id;
      
      // Verificar permisos
      if (req.user.role !== 'admin' && req.user.company_id !== company_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      // Crear pedido
      const orderResult = await client.query(
        `INSERT INTO orders (
          company_id, channel_id, external_order_id, order_number,
          customer_name, customer_email, customer_phone, customer_document,
          shipping_address, shipping_city, shipping_state, shipping_zip,
          total_amount, shipping_cost, items_count, order_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          company_id, channel_id, external_order_id, order_number,
          customer_name, customer_email, customer_phone, customer_document,
          shipping_address, shipping_city, shipping_state, shipping_zip,
          total_amount, shipping_cost, items?.length || 0, new Date(), notes
        ]
      );
      
      const order = orderResult.rows[0];
      
      // Crear items si se proporcionaron
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO order_items (
              order_id, product_id, sku, name, variant, 
              quantity, unit_price, total_price, weight
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              order.id,
              item.product_id,
              item.sku,
              item.name,
              item.variant,
              item.quantity,
              item.unit_price,
              item.total_price || (item.unit_price * item.quantity),
              item.weight
            ]
          );
        }
      }
      
      // Registrar en historial
      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes, created_by)
         VALUES ($1, $2, $3, $4)`,
        [order.id, 'pending', 'Pedido creado manualmente', req.user.id]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Pedido creado exitosamente',
        order: order
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.code === '23505') { // Duplicate key
        return res.status(400).json({ 
          error: 'Ya existe un pedido con ese ID externo en este canal' 
        });
      }
      
      console.error('Error creando pedido:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    } finally {
      client.release();
    }
  }
  
  // Exportar pedidos para OptiRoute
  async exportForOptiRoute(req, res) {
    try {
      const { 
        date_from, 
        date_to, 
        company_id,
        status = 'pending'
      } = req.query;
      
      let query = `
        SELECT 
          o.id,
          o.order_number,
          o.customer_name,
          o.customer_phone,
          o.customer_email,
          o.shipping_address,
          o.shipping_city,
          o.shipping_state,
          o.shipping_zip,
          o.total_amount,
          o.notes,
          o.order_date,
          c.name as company_name,
          sc.channel_name
        FROM orders o
        JOIN companies c ON o.company_id = c.id
        JOIN sales_channels sc ON o.channel_id = sc.id
        WHERE o.status = $1
      `;
      
      const params = [status];
      
      // Filtros según rol
      if (req.user.role !== 'admin') {
        params.push(req.user.company_id);
        query += ` AND o.company_id = $${params.length}`;
      } else if (company_id) {
        params.push(company_id);
        query += ` AND o.company_id = $${params.length}`;
      }
      
      if (date_from) {
        params.push(date_from);
        query += ` AND o.order_date >= $${params.length}`;
      }
      
      if (date_to) {
        params.push(date_to);
        query += ` AND o.order_date <= $${params.length}`;
      }
      
      query += ' ORDER BY o.shipping_city, o.shipping_address';
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No hay pedidos para exportar' });
      }
      
      // Generar Excel
      const excelBuffer = await ExcelService.generateOptiRouteExport(result.rows);
      
      // Registrar exportación
      await pool.query(
        `INSERT INTO export_logs (filename, total_orders, exported_by, filters_applied)
         VALUES ($1, $2, $3, $4)`,
        [
          `optiroute_export_${Date.now()}.xlsx`,
          result.rows.length,
          req.user.id,
          JSON.stringify({ date_from, date_to, company_id, status })
        ]
      );
      
      // Enviar archivo
      res.setHeader(
        'Content-Type', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename=optiroute_export_${Date.now()}.xlsx`
      );
      
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exportando para OptiRoute:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Estadísticas de pedidos
  async getStats(req, res) {
    try {
      const { company_id, date_from, date_to } = req.query;
      
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT DATE(order_date)) as days_with_orders
        FROM orders
        WHERE 1=1
      `;
      
      const params = [];
      
      // Filtros según rol
      if (req.user.role !== 'admin') {
        params.push(req.user.company_id);
        query += ` AND company_id = $${params.length}`;
      } else if (company_id) {
        params.push(company_id);
        query += ` AND company_id = $${params.length}`;
      }
      
      if (date_from) {
        params.push(date_from);
        query += ` AND order_date >= $${params.length}`;
      }
      
      if (date_to) {
        params.push(date_to);
        query += ` AND order_date <= $${params.length}`;
      }
      
      const result = await pool.query(query, params);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new OrderController();