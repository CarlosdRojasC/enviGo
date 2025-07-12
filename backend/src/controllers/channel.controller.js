const Channel = require('../models/Channel');
const Order = require('../models/Order');
const SyncLog = require('../models/SyncLog');
const { ERRORS, CHANNEL_TYPES } = require('../config/constants');
const ShopifyService = require('../services/shopify.service');
const WooCommerceService = require('../services/woocommerce.service');
const MercadoLibreService = require('../services/mercadolibre.service');

class ChannelController {
  // Obtener canales de una empresa con total_orders y last_order_date
  async getByCompany(req, res) {
    try {
      const { companyId } = req.params;

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== companyId) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      // Buscar canales activos de la empresa
      const channels = await Channel.find({ company_id: companyId, is_active: true });

      // Para cada canal, calcular total_orders y last_order_date
      const channelsWithStats = await Promise.all(channels.map(async (channel) => {
        const totalOrders = await Order.countDocuments({ channel_id: channel._id });
        const lastOrder = await Order.findOne({ channel_id: channel._id }).sort({ order_date: -1 });

        return {
          ...channel.toObject(),
          total_orders: totalOrders,
          last_order_date: lastOrder ? lastOrder.order_date : null,
        };
      }));

      res.json(channelsWithStats);
    } catch (error) {
      console.error('Error obteniendo canales:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener un canal específico con estadísticas
  async getById(req, res) {
    try {
      const { id } = req.params;

      const channel = await Channel.findById(id);
      if (!channel) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const totalOrders = await Order.countDocuments({ channel_id: channel._id });
      const deliveredOrders = await Order.countDocuments({ channel_id: channel._id, status: 'delivered' });
      const totalRevenueAgg = await Order.aggregate([
        { $match: { channel_id: channel._id } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]);
      const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

      res.json({
        ...channel.toObject(),
        stats: {
          total_orders: totalOrders,
          delivered_orders: deliveredOrders,
          total_revenue: totalRevenue,
        },
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
      const { channel_type, channel_name, api_key, api_secret, store_url, webhook_secret } = req.body;

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== companyId) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      // VALIDACIÓN CRÍTICA: Verificar que el channel_type esté presente
      if (!channel_type) {
        return res.status(400).json({ error: 'El tipo de canal es obligatorio' });
      }

      if (!Object.values(CHANNEL_TYPES).includes(channel_type)) {
        return res.status(400).json({ error: 'Tipo de canal no válido' });
      }

      if (channel_type === CHANNEL_TYPES.SHOPIFY && (!api_key || !api_secret || !store_url)) {
        return res.status(400).json({ error: 'Shopify requiere API key, secret y URL de la tienda' });
      }

      // Verificar si canal con mismo nombre existe para la empresa
      const exists = await Channel.findOne({ company_id: companyId, channel_name });
      if (exists) {
        return res.status(400).json({ error: 'Ya existe un canal con ese nombre para esta empresa' });
      }

      const channel = new Channel({
        company_id: companyId,
        channel_type,
        channel_name,
        api_key,
        api_secret,
        store_url,
        webhook_secret,
        accepted_communes: accepted_communes || []
      });

      await channel.save();

      try {
        if (channel_type === CHANNEL_TYPES.SHOPIFY) {
          await ShopifyService.registerWebhook(channel);
        } else if (channel_type === CHANNEL_TYPES.WOOCOMMERCE) {
          await WooCommerceService.registerWebhook(channel);
        }
      } catch (webhookError) {
        console.warn('Error registrando webhook:', webhookError.message);
        // No fallar la creación del canal por un error de webhook
      }

      res.status(201).json({ 
        message: 'Canal creado exitosamente', 
        channel 
      });
    } catch (error) {
      console.error('Error creando canal:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Actualizar canal
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const channel = await Channel.findById(id);
      if (!channel) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      // Si se está actualizando el channel_type, validarlo
      if (updates.channel_type && !Object.values(CHANNEL_TYPES).includes(updates.channel_type)) {
        return res.status(400).json({ error: 'Tipo de canal no válido' });
      }

      Object.assign(channel, updates);
      channel.updated_at = new Date();
      await channel.save();

      res.json({ message: 'Canal actualizado exitosamente', channel });
    } catch (error) {
      console.error('Error actualizando canal:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Eliminar canal (desactivar)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const channel = await Channel.findById(id);
      if (!channel) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      channel.is_active = false;
      await channel.save();

      res.json({ message: 'Canal desactivado exitosamente' });
    } catch (error) {
      console.error('Error eliminando canal:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Sincronizar pedidos de un canal - MEJORADO PARA MANEJAR RESULTADOS DETALLADOS
  async syncOrders(req, res) {
    try {
      const { id } = req.params;
      const { date_from, date_to } = req.body;

      // VALIDACIÓN MEJORADA: Buscar canal con validación explícita
      const channel = await Channel.findOne({ _id: id, is_active: true });
      if (!channel) {
        return res.status(404).json({ error: 'Canal no encontrado o inactivo' });
      }

      // VALIDACIÓN CRÍTICA: Verificar que channel_type existe
      if (!channel.channel_type) {
        console.error(`❌ Canal ${id} no tiene channel_type definido`);
        return res.status(400).json({ error: 'El canal no tiene un tipo definido' });
      }

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      console.log(`🚀 Iniciando sincronización para canal ${channel.channel_name} (Tipo: ${channel.channel_type})`);

      // Crear registro de sincronización con detalles de fechas
      const syncLog = new SyncLog({
        channel_id: id,
        sync_type: 'manual',
        status: 'processing',
        started_at: new Date(),
        sync_details: {
          date_from: date_from ? new Date(date_from) : null,
          date_to: date_to ? new Date(date_to) : null
        }
      });
      await syncLog.save();

      let syncResult = null;

      try {
        // SWITCH MEJORADO con validación explícita
        switch (channel.channel_type.toLowerCase()) {
          case CHANNEL_TYPES.SHOPIFY:
            console.log('📦 Sincronizando con Shopify...');
            syncResult = await ShopifyService.syncOrders(channel, date_from, date_to);
            break;
          case CHANNEL_TYPES.WOOCOMMERCE:
            console.log('📦 Sincronizando con WooCommerce...');
            syncResult = await WooCommerceService.syncOrders(channel, date_from, date_to);
            break;
          case CHANNEL_TYPES.MERCADOLIBRE:
            console.log('📦 Sincronizando con MercadoLibre...');
            syncResult = await MercadoLibreService.syncOrders(channel, date_from, date_to);
            break;
          default:
            const errorMsg = `Sincronización no implementada para el tipo de canal: "${channel.channel_type}"`;
            console.error(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }

        // MANEJO MEJORADO DE RESULTADOS
        syncLog.updateWithResult(syncResult);
        await syncLog.save();

        channel.last_sync = new Date();
        await channel.save();

        // Determinar el número de pedidos importados para la respuesta
        const ordersImported = typeof syncResult === 'number' ? 
          syncResult : 
          (syncResult?.imported || syncResult?.orders_synced || 0);

        console.log(`✅ Sincronización completada.`);
        console.log(`📊 Resultado:`, {
          importados: ordersImported,
          rechazados: syncLog.orders_rejected,
          total_procesados: syncLog.orders_total_processed
        });

        res.json({ 
          message: 'Sincronización completada', 
          orders_imported: ordersImported,
          orders_rejected: syncLog.orders_rejected,
          orders_total_processed: syncLog.orders_total_processed,
          sync_id: syncLog._id
        });

      } catch (syncError) {
        console.error(`❌ Error en sincronización:`, syncError);
        
        syncLog.markAsFailed(syncError.message);
        await syncLog.save();

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

      const channel = await Channel.findById(id);
      if (!channel) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }

      // VALIDACIÓN: Verificar que channel_type existe
      if (!channel.channel_type) {
        return res.status(400).json({ 
          success: false, 
          message: 'El canal no tiene un tipo definido' 
        });
      }

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      let testResult = { success: false, message: '' };

      switch (channel.channel_type.toLowerCase()) {
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
          testResult.message = `Prueba no implementada para el tipo de canal: "${channel.channel_type}"`;
      }

      res.json(testResult);
    } catch (error) {
      console.error('Error probando conexión:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al probar la conexión' });
    }
  }

  // NUEVO: Obtener historial de sincronizaciones
  async getSyncLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const channel = await Channel.findById(id);
      if (!channel) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const skip = (page - 1) * limit;

      const [logs, totalCount] = await Promise.all([
        SyncLog.find({ channel_id: id })
          .sort({ started_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        SyncLog.countDocuments({ channel_id: id })
      ]);

      // Agregar duración calculada
      const logsWithDuration = logs.map(log => ({
        ...log,
        duration_minutes: log.completed_at && log.started_at ? 
          Math.round((new Date(log.completed_at) - new Date(log.started_at)) / (1000 * 60)) : null
      }));

      res.json({
        logs: logsWithDuration,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error obteniendo logs de sincronización:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
}

module.exports = new ChannelController();