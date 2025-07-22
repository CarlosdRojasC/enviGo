// backend/src/services/sync.service.js
const cron = require('node-cron');
const ShopifyService = require('./shopify.service');
const WooCommerceService = require('./woocommerce.service');
const SalesChannel = require('../models/SalesChannel');
const Company = require('../models/Company');

class SyncService {
  constructor() {
    this.isRunning = false;
    this.syncStats = {
      lastSync: null,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalOrdersImported: 0
    };
  }

  // Inicializar cron jobs automáticos
  initializeScheduler() {
    console.log('🚀 Inicializando sistema de sincronización automática...');

    // Sincronización cada 5 minutos para órdenes nuevas
    cron.schedule('*/5 * * * *', () => {
      this.syncAllChannels('recent');
    });

    // Sincronización cada hora para órdenes actualizadas
    cron.schedule('0 * * * *', () => {
      this.syncAllChannels('updated');
    });

    // Limpieza y mantenimiento diario
    cron.schedule('0 2 * * *', () => {
      this.performDailyMaintenance();
    });

    console.log('✅ Scheduler de sincronización iniciado');
  }

  // Sincronizar todos los canales activos
  async syncAllChannels(type = 'recent') {
    if (this.isRunning) {
      console.log('⏳ Sincronización ya en progreso, saltando...');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Iniciando sincronización ${type}...`);

    try {
      // Obtener todos los canales activos
      const activeChannels = await SalesChannel.find({
        is_active: true,
        webhook_configured: true
      }).populate('company_id');

      const results = {
        successful: 0,
        failed: 0,
        totalOrders: 0,
        errors: []
      };

      for (const channel of activeChannels) {
        try {
          await this.syncSingleChannel(channel, type);
          results.successful++;
        } catch (error) {
          console.error(`❌ Error sincronizando canal ${channel._id}:`, error.message);
          results.failed++;
          results.errors.push({
            channel_id: channel._id,
            channel_name: channel.channel_name,
            error: error.message
          });
        }
      }

      this.syncStats.lastSync = new Date();
      this.syncStats.successfulSyncs += results.successful;
      this.syncStats.failedSyncs += results.failed;

      console.log(`✅ Sincronización completada: ${results.successful} exitosos, ${results.failed} fallidos`);

    } catch (error) {
      console.error('❌ Error en sincronización general:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Sincronizar un canal específico
  async syncSingleChannel(channel, type = 'recent') {
    const now = new Date();
    let dateFrom, dateTo;

    // Definir rango de fechas según el tipo
    switch (type) {
      case 'recent':
        dateFrom = new Date(now - 10 * 60 * 1000); // Últimos 10 minutos
        dateTo = now;
        break;
      case 'updated':
        dateFrom = new Date(now - 60 * 60 * 1000); // Última hora
        dateTo = now;
        break;
      case 'daily':
        dateFrom = new Date(now - 24 * 60 * 60 * 1000); // Último día
        dateTo = now;
        break;
      default:
        dateFrom = new Date(now - 10 * 60 * 1000);
        dateTo = now;
    }

    console.log(`🔄 Sincronizando canal: ${channel.channel_name} (${channel.channel_type})`);
    console.log(`📅 Rango: ${dateFrom.toISOString()} - ${dateTo.toISOString()}`);

    try {
      let ordersImported = 0;

      switch (channel.channel_type) {
        case 'shopify':
          ordersImported = await ShopifyService.syncOrders(channel, dateFrom.toISOString(), dateTo.toISOString());
          break;
        case 'woocommerce':
          ordersImported = await WooCommerceService.syncOrders(channel, dateFrom.toISOString(), dateTo.toISOString());
          break;
        default:
          throw new Error(`Tipo de canal no soportado: ${channel.channel_type}`);
      }

      this.syncStats.totalOrdersImported += ordersImported;
      
      // Actualizar última sincronización del canal
      await SalesChannel.findByIdAndUpdate(channel._id, {
        last_sync: now,
        sync_status: 'success',
        last_sync_orders: ordersImported
      });

      console.log(`✅ Canal ${channel.channel_name}: ${ordersImported} órdenes importadas`);
      return ordersImported;

    } catch (error) {
      // Marcar canal con error
      await SalesChannel.findByIdAndUpdate(channel._id, {
        sync_status: 'error',
        last_sync_error: error.message
      });

      throw error;
    }
  }

  // Mantenimiento diario
  async performDailyMaintenance() {
    console.log('🧹 Ejecutando mantenimiento diario...');

    try {
      // Limpiar logs antiguos
      // Verificar webhooks
      // Estadísticas de rendimiento
      // etc.
      
      console.log('✅ Mantenimiento completado');
    } catch (error) {
      console.error('❌ Error en mantenimiento:', error);
    }
  }

  // Obtener estadísticas de sincronización
  getStats() {
    return {
      ...this.syncStats,
      isRunning: this.isRunning
    };
  }

  // Sincronización manual (API endpoint)
  async manualSync(channelId = null) {
    if (channelId) {
      const channel = await SalesChannel.findById(channelId).populate('company_id');
      if (!channel) {
        throw new Error('Canal no encontrado');
      }
      return await this.syncSingleChannel(channel, 'daily');
    } else {
      return await this.syncAllChannels('daily');
    }
  }
}

module.exports = new SyncService();

// ============================================
// backend/src/app.js - Agregar al inicio del servidor

const SyncService = require('./services/sync.service');

// Inicializar sincronización automática después de conectar DB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    
    // IMPORTANTE: Inicializar scheduler después de DB conectada
    setTimeout(() => {
      SyncService.initializeScheduler();
    }, 5000); // 5 segundos de delay para asegurar estabilidad
    
  })
  .catch(err => console.error('❌ Error conectando MongoDB:', err));

// ============================================
// backend/src/routes/sync.routes.js - Nuevas rutas de sincronización

const express = require('express');
const router = express.Router();
const SyncService = require('../services/sync.service');
const { authenticateToken } = require('../middleware/auth');

// Obtener estadísticas de sincronización
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = SyncService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sincronización manual
router.post('/manual/:channelId?', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    const result = await SyncService.manualSync(channelId);
    
    res.json({
      success: true,
      message: channelId ? 'Canal sincronizado exitosamente' : 'Todos los canales sincronizados',
      ordersImported: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Forzar sincronización inmediata
router.post('/force', authenticateToken, async (req, res) => {
  try {
    SyncService.syncAllChannels('daily');
    
    res.json({
      success: true,
      message: 'Sincronización forzada iniciada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;