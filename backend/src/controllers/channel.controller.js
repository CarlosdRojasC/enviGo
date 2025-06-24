const pool = require('../config/database');
const { ERRORS, CHANNEL_TYPES } = require('../config/constants');
const ShopifyService = require('../services/shopify.service');
const WooCommerceService = require('../services/woocommerce.service');
const MercadoLibreService = require('../services/mercadolibre.service');

class ChannelController {
  // Obtener canales de una empresa
  async getByCompany(req, res) {
    try {
      const { companyId } = req.params;
      
      // Verificar acceso
      if (req.user.role !== 'admin' && req.user.company_id !== parseInt(companyId)) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      const result = await pool.query(
        `SELECT 
          sc.*,
          COUNT(DISTINCT o.id) as total_orders,
          MAX(o.order_date) as last_order_date
         FROM sales_channels sc
         LEFT JOIN orders o ON sc.id = o.channel_id
         WHERE sc.company_id = $1
         GROUP BY sc.id
         ORDER BY sc.channel_name`,
        [companyId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo canales:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Obtener un canal específico
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT sc.*, c.id as company_id 
         FROM sales_channels sc
         JOIN companies c ON sc.company_id = c.id
         WHERE sc.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }
      
      const channel = result.rows[0];
      
      // Verificar acceso
      if (req.user.role !== 'admin' && req.user.company_id !== channel.company_id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      // Obtener estadísticas del canal
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
          SUM(total_amount) as total_revenue
         FROM orders
         WHERE channel_id = $1`,
        [id]
      );
      
      res.json({
        ...channel,
        stats: statsResult.rows[0]
      });
    } catch (error) {
      console.error('Error obteniendo canal:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Crear canal de venta
  async create(req, res) {
    try {
      const { companyId } = req.params;
      const { 
        channel_type, 
        channel_name, 
        api_key, 
        api_secret, 
        store_url,
        webhook_secret 
      } = req.body;
      
      // Verificar acceso
      if (req.user.role !== 'admin' && req.user.company_id !== parseInt(companyId)) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      // Validar tipo de canal
      if (!Object.values(CHANNEL_TYPES).includes(channel_type)) {
        return res.status(400).json({ error: 'Tipo de canal no válido' });
      }
      
      // Validar credenciales según el tipo de canal
      if (channel_type === CHANNEL_TYPES.SHOPIFY && (!api_key || !api_secret || !store_url)) {
        return res.status(400).json({ 
          error: 'Shopify requiere API key, secret y URL de la tienda' 
        });
      }
      
      const result = await pool.query(
        `INSERT INTO sales_channels 
         (company_id, channel_type, channel_name, api_key, api_secret, store_url, webhook_secret) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [companyId, channel_type, channel_name, api_key, api_secret, store_url, webhook_secret]
      );
      
      const channel = result.rows[0];
      
      // Registrar webhook según el tipo de canal
      try {
        if (channel_type === CHANNEL_TYPES.SHOPIFY) {
          await ShopifyService.registerWebhook(channel);
        } else if (channel_type === CHANNEL_TYPES.WOOCOMMERCE) {
          await WooCommerceService.registerWebhook(channel);
        } else if (channel_type === CHANNEL_TYPES.MERCADOLIBRE) {
          await MercadoLibreService.registerWebhook(channel);
        }
      } catch (webhookError) {
        console.error('Error registrando webhook:', webhookError);
        // No fallar la creación del canal por esto
      }
      
      res.status(201).json({
        message: 'Canal creado exitosamente',
        channel: channel
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: 'Ya existe un canal con ese nombre para esta empresa' 
        });
      }
      
      console.error('Error creando canal:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Actualizar canal
  async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        channel_name, 
        api_key, 
        api_secret, 
        store_url,
        webhook_secret,
        is_active 
      } = req.body;
      
      // Verificar que existe y obtener company_id
      const channelResult = await pool.query(
        'SELECT company_id, channel_type FROM sales_channels WHERE id = $1',
        [id]
      );
      
      if (channelResult.rows.length === 0) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }
      
      const channel = channelResult.rows[0];
      
      // Verificar acceso
      if (req.user.role !== 'admin' && req.user.company_id !== channel.company_id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      const result = await pool.query(
        `UPDATE sales_channels 
         SET channel_name = COALESCE($1, channel_name),
             api_key = COALESCE($2, api_key),
             api_secret = COALESCE($3, api_secret),
             store_url = COALESCE($4, store_url),
             webhook_secret = COALESCE($5, webhook_secret),
             is_active = COALESCE($6, is_active),
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [channel_name, api_key, api_secret, store_url, webhook_secret, is_active, id]
      );
      
      res.json({
        message: 'Canal actualizado exitosamente',
        channel: result.rows[0]
      });
    } catch (error) {
      console.error('Error actualizando canal:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Eliminar canal (desactivar)
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar que existe y obtener company_id
      const channelResult = await pool.query(
        'SELECT company_id FROM sales_channels WHERE id = $1',
        [id]
      );
      
      if (channelResult.rows.length === 0) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }
      
      const channel = channelResult.rows[0];
      
      // Verificar acceso
      if (req.user.role !== 'admin' && req.user.company_id !== channel.company_id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      // No eliminar físicamente, solo desactivar
      await pool.query(
        'UPDATE sales_channels SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );
      
      res.json({ message: 'Canal desactivado exitosamente' });
    } catch (error) {
      console.error('Error eliminando canal:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  // Sincronizar pedidos de un canal
  async syncOrders(req, res) {
    try {
      const { id } = req.params;
      const { date_from, date_to } = req.body;
      
      // Obtener información del canal
      const channelResult = await pool.query(
        'SELECT * FROM sales_channels WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (channelResult.rows.length === 0) {
        return res.status(404).json({ error: 'Canal no encontrado o inactivo' });
      }
      
      const channel = channelResult.rows[0];
      
      // Verificar acceso
      if (req.user.role !== 'admin' && req.user.company_id !== channel.company_id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      // Registrar inicio de sincronización
      const syncResult = await pool.query(
        `INSERT INTO sync_logs (channel_id, sync_type, status, started_at)
         VALUES ($1, 'manual', 'processing', NOW())
         RETURNING id`,
        [id]
      );
      
      const syncLogId = syncResult.rows[0].id;
      
      try {
        let ordersImported = 0;
        
        // Sincronizar según el tipo de canal
        switch (channel.channel_type) {
          case CHANNEL_TYPES.SHOPIFY:
            ordersImported = await ShopifyService.syncOrders(channel, date_from, date_to);
            break;
          case CHANNEL_TYPES.WOOCOMMERCE:
            ordersImported = await WooCommerceService.syncOrders(channel, date_from, date_to);
            break;
          case CHANNEL_TYPES.MERCADOLIBRE:
            ordersImported = await MercadoLibreService.syncOrders(channel, date_from, date_to);
            break;
          default:
            throw new Error(`Sincronización no implementada para ${channel.channel_type}`);
        }
        
        // Actualizar log de sincronización
        await pool.query(
          `UPDATE sync_logs 
           SET status = 'success', 
               orders_synced = $1, 
               completed_at = NOW()
           WHERE id = $2`,
          [ordersImported, syncLogId]
        );
        
        // Actualizar última sincronización del canal
        await pool.query(
          'UPDATE sales_channels SET last_sync = NOW() WHERE id = $1',
          [id]
        );
        
        res.json({
          message: 'Sincronización completada',
          orders_imported: ordersImported
        });
      } catch (syncError) {
        // Registrar error en log
        await pool.query(
          `UPDATE sync_logs 
           SET status = 'failed', 
               error_message = $1, 
               completed_at = NOW()
           WHERE id = $2`,
          [syncError.message, syncLogId]
        );
        
        throw syncError;
      }
    } catch (error) {
      console.error('Error sincronizando canal:', error);
      res.status(500).json({ error: error.message || ERRORS.SERVER_ERROR });
    }
  }
  
  // Probar conexión con el canal
  async testConnection(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener información del canal
      const channelResult = await pool.query(
        'SELECT * FROM sales_channels WHERE id = $1',
        [id]
      );
      
      if (channelResult.rows.length === 0) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }
      
      const channel = channelResult.rows[0];
      
      // Verificar acceso
      if (req.user.role !== 'admin' && req.user.company_id !== channel.company_id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      let testResult = { success: false, message: '' };
      
      // Probar conexión según el tipo de canal
      switch (channel.channel_type) {
        case CHANNEL_TYPES.SHOPIFY:
          testResult = await ShopifyService.testConnection(channel);
          break;
        case CHANNEL_TYPES.WOOCOMMERCE:
          testResult = await WooCommerceService.testConnection(channel);
          break;
        case CHANNEL_TYPES.MERCADOLIBRE:
          testResult = await MercadoLibreService.testConnection(channel);
          break;
        default:
          testResult.message = 'Prueba no implementada para este tipo de canal';
      }
      
      res.json(testResult);
    } catch (error) {
      console.error('Error probando conexión:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error al probar la conexión' 
      });
    }
  }
}

module.exports = new ChannelController();