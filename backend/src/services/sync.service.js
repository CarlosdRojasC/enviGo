// backend/src/services/sync-scheduler.service.js
const cron = require('node-cron');
const Channel = require('../models/Channel');
const ShopifyService = require('./shopify.service');
const WooCommerceService = require('./woocommerce.service');
const MercadoLibreService = require('./mercadolibre.service');
const { CHANNEL_TYPES } = require('../config/constants');

class SyncSchedulerService {
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  // Inicializar el servicio de sincronización automática
  async initialize() {
    try {
      console.log('🚀 Inicializando Sync Scheduler...');
      
      // Tarea principal que ejecuta cada minuto
      this.mainTask = cron.schedule('* * * * *', async () => {
        await this.checkAndSyncChannels();
      }, {
        scheduled: false // No iniciar automáticamente
      });

      // Tarea de limpieza (cada 6 horas)
      this.cleanupTask = cron.schedule('0 */6 * * *', async () => {
        await this.cleanup();
      }, {
        scheduled: false
      });

      // Iniciar las tareas
      this.start();
      
      console.log('✅ Sync Scheduler inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando Sync Scheduler:', error);
      throw error;
    }
  }

  // Iniciar el scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Sync Scheduler ya está corriendo');
      return;
    }

    this.mainTask.start();
    this.cleanupTask.start();
    this.isRunning = true;
    
    console.log('▶️ Sync Scheduler iniciado');
  }

  // Detener el scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Sync Scheduler ya está detenido');
      return;
    }

    this.mainTask.stop();
    this.cleanupTask.stop();
    this.isRunning = false;
    
    console.log('⏹️ Sync Scheduler detenido');
  }

  // Verificar y sincronizar canales que lo necesiten
  async checkAndSyncChannels() {
    try {
      // Obtener canales que necesitan sincronización
      const channelsNeedingSync = await Channel.find({
        is_active: true,
        auto_sync_enabled: true,
        $or: [
          { last_sync: { $exists: false } },
          {
            $expr: {
              $gte: [
                { $divide: [{ $subtract: [new Date(), '$last_sync'] }, 1000 * 60] },
                '$sync_frequency_minutes'
              ]
            }
          }
        ]
      }).populate('company_id');

      if (channelsNeedingSync.length === 0) {
        // Solo log cada 10 minutos para no saturar
        if (new Date().getMinutes() % 10 === 0) {
          console.log('📊 Todos los canales están sincronizados');
        }
        return;
      }

      console.log(`🔄 Encontrados ${channelsNeedingSync.length} canales para sincronizar`);

      // Procesar canales en paralelo (máximo 3 a la vez)
      const batchSize = 3;
      for (let i = 0; i < channelsNeedingSync.length; i += batchSize) {
        const batch = channelsNeedingSync.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(channel => this.syncChannel(channel))
        );

        // Pequeña pausa entre lotes para no saturar APIs
        if (i + batchSize < channelsNeedingSync.length) {
          await this.sleep(2000);
        }
      }

    } catch (error) {
      console.error('❌ Error en checkAndSyncChannels:', error);
    }
  }

  // Sincronizar un canal específico
  async syncChannel(channel) {
    const startTime = new Date();
    let ordersImported = 0;
    let success = false;

    try {
      console.log(`🔄 Sincronizando ${channel.channel_name} (${channel.channel_type})`);

      // Marcar como en proceso
      channel.sync_status = 'pending';
      await channel.save();

      // Ejecutar sincronización según el tipo
      let syncResult;
      
      switch (channel.channel_type) {
        case CHANNEL_TYPES.SHOPIFY:
          syncResult = await ShopifyService.syncOrders(channel);
          break;
        case CHANNEL_TYPES.WOOCOMMERCE:
          syncResult = await WooCommerceService.syncOrders(channel);
          break;
        case CHANNEL_TYPES.MERCADOLIBRE:
          syncResult = await MercadoLibreService.syncOrders(channel);
          break;
        default:
          throw new Error(`Tipo de canal no soportado: ${channel.channel_type}`);
      }

      // Procesar resultado
      ordersImported = typeof syncResult === 'number' ? syncResult : (syncResult?.imported || 0);
      success = true;

      // Actualizar estadísticas
      await channel.updateSyncStats(true, ordersImported);

      console.log(`✅ ${channel.channel_name}: ${ordersImported} pedidos importados`);

      // Notificar via WebSocket si hay pedidos nuevos
      if (ordersImported > 0 && global.wsService) {
        global.wsService.broadcast(`company_${channel.company_id}`, {
          type: 'orders_synced',
          channel: channel.channel_name,
          count: ordersImported,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error(`❌ Error sincronizando ${channel.channel_name}:`, error);
      
      // Actualizar con error
      await channel.updateSyncStats(false, 0, error.message);
      
      // Si hay muchos errores consecutivos, desactivar auto-sync
      if (channel.sync_stats.failed_syncs > 5 && 
          channel.sync_stats.successful_syncs === 0) {
        console.log(`🚫 Desactivando auto-sync para ${channel.channel_name} por errores consecutivos`);
        channel.auto_sync_enabled = false;
        await channel.save();
      }
    }

    return {
      channel: channel.channel_name,
      success,
      ordersImported,
      duration: new Date() - startTime
    };
  }

  // Sincronización forzada de todos los canales activos
  async forceSyncAll() {
    try {
      console.log('🚀 Iniciando sincronización forzada de todos los canales...');
      
      const channels = await Channel.find({
        is_active: true
      }).populate('company_id');

      const results = [];
      
      for (const channel of channels) {
        const result = await this.syncChannel(channel);
        results.push(result);
      }

      console.log(`✅ Sincronización forzada completada: ${results.length} canales procesados`);
      return results;

    } catch (error) {
      console.error('❌ Error en sincronización forzada:', error);
      throw error;
    }
  }

  // Sincronizar un canal específico por ID
  async syncChannelById(channelId) {
    try {
      const channel = await Channel.findById(channelId).populate('company_id');
      
      if (!channel) {
        throw new Error('Canal no encontrado');
      }

      if (!channel.is_active) {
        throw new Error('Canal inactivo');
      }

      return await this.syncChannel(channel);

    } catch (error) {
      console.error(`❌ Error sincronizando canal ${channelId}:`, error);
      throw error;
    }
  }

  // Obtener estadísticas del scheduler
  getStats() {
    return {
      isRunning: this.isRunning,
      tasksCount: this.scheduledTasks.size,
      uptime: this.isRunning ? new Date() - this.startTime : 0
    };
  }

  // Limpiar logs y estadísticas antiguas
  async cleanup() {
    try {
      console.log('🧹 Iniciando limpieza de datos antiguos...');
      
      // Aquí puedes agregar lógica para limpiar logs antiguos
      // Por ejemplo, eliminar sync logs más antiguos de 30 días
      
      console.log('✅ Limpieza completada');
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
    }
  }

  // Función auxiliar para pausas
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Reiniciar el scheduler
  async restart() {
    console.log('🔄 Reiniciando Sync Scheduler...');
    this.stop();
    await this.sleep(1000);
    this.start();
    console.log('✅ Sync Scheduler reiniciado');
  }

  // Obtener próximas sincronizaciones programadas
  async getUpcomingSyncs() {
    try {
      const channels = await Channel.find({
        is_active: true,
        auto_sync_enabled: true
      });

      return channels.map(channel => {
        const lastSync = channel.last_sync || new Date(0);
        const nextSync = new Date(lastSync.getTime() + (channel.sync_frequency_minutes * 60 * 1000));
        const minutesUntilSync = Math.max(0, Math.ceil((nextSync - new Date()) / (1000 * 60)));

        return {
          channelId: channel._id,
          channelName: channel.channel_name,
          channelType: channel.channel_type,
          lastSync: lastSync,
          nextSync: nextSync,
          minutesUntilSync: minutesUntilSync,
          status: channel.sync_status
        };
      }).sort((a, b) => a.minutesUntilSync - b.minutesUntilSync);

    } catch (error) {
      console.error('❌ Error obteniendo próximas sincronizaciones:', error);
      return [];
    }
  }
}

module.exports = new SyncSchedulerService();