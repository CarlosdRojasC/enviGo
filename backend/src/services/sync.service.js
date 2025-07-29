// backend/src/services/sync-scheduler.service.js
const cron = require('node-cron');
const Channel = require('../models/Channel');
const Order = require('../models/Order');
const ShopifyService = require('./shopify.service');
const WooCommerceService = require('./woocommerce.service');
const MercadoLibreService = require('./mercadolibre.service');
const { CHANNEL_TYPES } = require('../config/constants');

class SyncSchedulerService {
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
    this.syncInProgress = new Set(); // ✅ Prevenir sync simultáneos
    this.emergencyPaused = false; // ✅ Pausa de emergencia
    this.syncErrors = new Map(); // ✅ Tracking de errores
  }

  // Inicializar el servicio de sincronización automática
  async initialize() {
    try {
      console.log('🚀 Inicializando Sync Scheduler Optimizado...');
      
      // ✅ VERIFICAR ESTADO DE EMERGENCIA AL INICIAR
      await this.checkEmergencyStatus();
      
      // Tarea principal - REDUCIDA de cada minuto a cada 5 minutos
      this.mainTask = cron.schedule('*/5 * * * *', async () => {
        if (!this.emergencyPaused) {
          await this.checkAndSyncChannels();
        } else {
          console.log('⏸️ Sync pausado por emergencia');
        }
      }, {
        scheduled: false
      });

      // Tarea de limpieza (cada 6 horas)
      this.cleanupTask = cron.schedule('0 */6 * * *', async () => {
        await this.cleanup();
      }, {
        scheduled: false
      });

      // ✅ TAREA DE MONITOREO (cada 15 minutos)
      this.monitorTask = cron.schedule('*/15 * * * *', async () => {
        await this.monitorSyncHealth();
      }, {
        scheduled: false
      });

      // Iniciar las tareas
      this.start();
      
      console.log('✅ Sync Scheduler optimizado inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando Sync Scheduler:', error);
      throw error;
    }
  }

  // ✅ VERIFICAR ESTADO DE EMERGENCIA
  async checkEmergencyStatus() {
    try {
      // Verificar si hay demasiados errores recientes
      const recentErrors = await this.getRecentSyncErrors();
      
      if (recentErrors > 50) { // Si hay más de 50 errores en la última hora
        console.log('🚨 Activando pausa de emergencia por exceso de errores');
        this.emergencyPaused = true;
        
        // Pausar todos los canales
        await Channel.updateMany({}, {
          auto_sync_enabled: false,
          sync_status: 'emergency_paused',
          last_sync_error: 'Pausado automáticamente por exceso de errores'
        });
      }
    } catch (error) {
      console.error('Error verificando estado de emergencia:', error);
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
    this.monitorTask.start(); // ✅ NUEVA TAREA
    this.isRunning = true;
    this.startTime = new Date();
    
    console.log('▶️ Sync Scheduler optimizado iniciado');
  }

  // Detener el scheduler


  // ✅ MÉTODO DE EMERGENCIA PARA PAUSAR TODO
  async emergencyPause(reason = 'Pausa manual de emergencia') {
    console.log('🚨 ACTIVANDO PAUSA DE EMERGENCIA:', reason);
    
    this.emergencyPaused = true;
    
    // Pausar todos los canales activos
    await Channel.updateMany(
      { is_active: true },
      {
        auto_sync_enabled: false,
        sync_status: 'emergency_paused',
        last_sync_error: reason,
        emergency_pause_time: new Date()
      }
    );
    
    // Limpiar syncs en progreso
    this.syncInProgress.clear();
    
    console.log('🛑 Todos los canales pausados por emergencia');
  }

  // ✅ REACTIVAR DESDE EMERGENCIA
  async resumeFromEmergency() {
    console.log('🔄 Reanudando desde pausa de emergencia...');
    
    this.emergencyPaused = false;
    this.syncErrors.clear();
    
    // Reactivar canales gradualmente
    const channels = await Channel.find({ 
      sync_status: 'emergency_paused',
      is_active: true 
    });
    
    console.log(`🔄 Reactivando ${channels.length} canales gradualmente...`);
    
    // Reactivar de a uno con delay
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      
      await Channel.findByIdAndUpdate(channel._id, {
        auto_sync_enabled: true,
        sync_status: 'ready',
        last_sync_error: null,
        emergency_pause_time: null,
        // ✅ AUMENTAR FRECUENCIA INICIAL PARA SER CONSERVADOR
        sync_frequency_minutes: Math.max(channel.sync_frequency_minutes, 30)
      });
      
      console.log(`✅ Canal ${channel.channel_name} reactivado`);
      
      // Delay entre reactivaciones
      if (i < channels.length - 1) {
        await this.sleep(2000);
      }
    }
    
    console.log('✅ Reanudación completada');
  }

  // Verificar y sincronizar canales que lo necesiten - OPTIMIZADO
  async checkAndSyncChannels() {
    try {
      if (this.emergencyPaused) {
        return;
      }

      // ✅ CONSULTA OPTIMIZADA CON MEJORES FILTROS
      const channelsNeedingSync = await Channel.find({
        is_active: true,
        auto_sync_enabled: true,
        sync_status: { $nin: ['pending', 'emergency_paused'] },
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
      }).populate('company_id').limit(5); // ✅ LIMITAR A 5 CANALES POR VEZ

      if (channelsNeedingSync.length === 0) {
        // Solo log cada 15 minutos para no saturar
        if (new Date().getMinutes() % 15 === 0) {
          console.log('📊 Todos los canales están sincronizados');
        }
        return;
      }

      console.log(`🔄 Encontrados ${channelsNeedingSync.length} canales para sincronizar`);

      // ✅ PROCESAR DE UNO EN UNO PARA EVITAR SOBRECARGA
      for (const channel of channelsNeedingSync) {
        // Verificar si ya está sincronizando
        if (this.syncInProgress.has(channel._id.toString())) {
          console.log(`⏭️ ${channel.channel_name} ya está sincronizando, omitiendo...`);
          continue;
        }

        // Verificar límite de errores por canal
        const channelErrors = this.syncErrors.get(channel._id.toString()) || 0;
        if (channelErrors >= 5) {
          console.log(`🚫 ${channel.channel_name} pausado por exceso de errores (${channelErrors})`);
          await this.pauseChannelForErrors(channel);
          continue;
        }

        // Sincronizar canal
        await this.syncChannel(channel);
        
        // ✅ DELAY ENTRE CANALES PARA NO SATURAR
        await this.sleep(3000); // 3 segundos entre canales
      }

    } catch (error) {
      console.error('❌ Error en checkAndSyncChannels:', error);
      
      // ✅ SI HAY ERROR CRÍTICO, ACTIVAR PAUSA DE EMERGENCIA
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('timeout') ||
          error.message.includes('rate limit')) {
        await this.emergencyPause(`Error crítico del sistema: ${error.message}`);
      }
    }
  }

  // Sincronizar un canal específico - MEJORADO
async syncChannel(channel) {
    const channelId = channel._id.toString();
    const startTime = new Date();
    let ordersImported = 0;
    let success = false;

    // ✅ MARCAR COMO EN PROGRESO
    this.syncInProgress.add(channelId);

    try {
      console.log(`🔄 Sincronizando ${channel.channel_name} (${channel.channel_type})`);

      // Marcar como en proceso en la base de datos
      await Channel.findByIdAndUpdate(channelId, { sync_status: 'pending' });

      // ✅ PARÁMETROS DE SINCRONIZACIÓN CONSERVADORES
      const syncParams = this.getSyncParameters(channel);
      console.log(`📊 Parámetros de sync para ${channel.channel_name}:`, syncParams);

      // Ejecutar sincronización según el tipo
      let syncResult;
      
      switch (channel.channel_type) {
        case CHANNEL_TYPES.SHOPIFY:
          syncResult = await this.syncShopifyOrders(channel, syncParams);
          break;
        case CHANNEL_TYPES.WOOCOMMERCE:
          syncResult = await this.syncWooCommerceOrders(channel, syncParams);
          break;
        case CHANNEL_TYPES.MERCADOLIBRE:
          syncResult = await this.syncMercadoLibreOrders(channel, syncParams);
          break;
        default:
          throw new Error(`Tipo de canal no soportado: ${channel.channel_type}`);
      }

      // Procesar resultado
      ordersImported = typeof syncResult === 'number' ? syncResult : (syncResult?.imported || 0);
      success = true;

      // ✅ LIMPIAR ERRORES SI LA SYNC FUE EXITOSA
      this.syncErrors.delete(channelId);

      // Actualizar estadísticas
      // ✅ CORRECCIÓN: Usar el método del servicio que sí funciona
      await this.updateChannelSyncStats(channel, true, ordersImported);

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
      
      // ✅ CONTAR ERRORES POR CANAL
      const currentErrors = this.syncErrors.get(channelId) || 0;
      this.syncErrors.set(channelId, currentErrors + 1);
      
      // Actualizar con error
      // ✅ CORRECCIÓN: Usar el método del servicio que sí funciona
      await this.updateChannelSyncStats(channel, false, 0, error.message);
      
      // ✅ LÓGICA MEJORADA DE MANEJO DE ERRORES
      if (error.message.includes('validation failed')) {
        console.log(`⚠️ Error de validación en ${channel.channel_name}, pausando temporalmente`);
        await this.pauseChannelForValidationErrors(channel);
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.log(`⏰ Rate limit en ${channel.channel_name}, incrementando frecuencia`);
        await this.adjustChannelFrequency(channel, 'increase');
      }
      
    } finally {
      // ✅ LIMPIAR ESTADO DE PROGRESO
      this.syncInProgress.delete(channelId);
    }

    return {
      channel: channel.channel_name,
      success,
      ordersImported,
      duration: new Date() - startTime,
      errors: this.syncErrors.get(channelId) || 0
    };
  }

  // ✅ OBTENER PARÁMETROS DE SYNC CONSERVADORES
  getSyncParameters(channel) {
    const now = new Date();
    const settings = channel.sync_settings || {};
    
    // Determinar rango de fechas conservador
    let daysBack = 7; // Por defecto 7 días
    let limit = 50; // Por defecto 50 pedidos
    
    // Si es primera sincronización, ser muy conservador
    if (!channel.last_sync) {
      daysBack = settings.initial_days || 7; // Solo 7 días en primera sync
      limit = settings.initial_limit || 25; // Solo 25 pedidos
    } else {
      // Sincronización regular: desde última sync + buffer pequeño
      const lastSync = new Date(channel.last_sync);
      const daysSinceLastSync = Math.ceil((now - lastSync) / (1000 * 60 * 60 * 24));
      daysBack = Math.min(daysSinceLastSync + 1, 14); // Máximo 14 días
      limit = settings.regular_limit || 100; // Máximo 100 pedidos
    }
    
    // Reducir límites si hay errores recientes
    const channelErrors = this.syncErrors.get(channel._id.toString()) || 0;
    if (channelErrors > 0) {
      limit = Math.max(10, Math.floor(limit / (channelErrors + 1)));
      daysBack = Math.max(1, Math.floor(daysBack / 2));
    }
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);
    
    return {
      dateFrom,
      limit,
      daysBack,
      batchSize: Math.min(25, Math.floor(limit / 2)) // Lotes más pequeños
    };
  }

  // ✅ SYNC SHOPIFY MEJORADO
  async syncShopifyOrders(channel, params) {
    try {
      const shopifyService = new ShopifyService(channel);
      
      // Parámetros API optimizados
      const apiParams = {
        status: 'any',
        created_at_min: params.dateFrom.toISOString(),
        limit: Math.min(params.limit, 50), // Límite conservador
        fields: 'id,name,email,created_at,updated_at,total_price,shipping_address,customer,line_items,financial_status,fulfillment_status'
      };
      
      console.log(`📡 Shopify API call para ${channel.channel_name}:`, {
        dateFrom: params.dateFrom.toISOString().split('T')[0],
        limit: apiParams.limit
      });
      
      const orders = await shopifyService.getOrders(apiParams);
      console.log(`📦 Obtenidos ${orders.length} pedidos de Shopify`);
      
      if (orders.length === 0) {
        return 0;
      }
      
      // ✅ PROCESAR EN LOTES PEQUEÑOS CON VALIDACIÓN
      let processedCount = 0;
      let errorCount = 0;
      const batchSize = params.batchSize;
      
      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        console.log(`🔄 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(orders.length/batchSize)}`);
        
        for (const order of batch) {
          try {
            const result = await this.processSingleShopifyOrder(order, channel);
            if (result) processedCount++;
          } catch (error) {
            console.warn(`⚠️ Error procesando pedido ${order.name}:`, error.message);
            errorCount++;
            
            // ✅ PARAR SI HAY DEMASIADOS ERRORES EN EL LOTE
            if (errorCount > Math.floor(batchSize / 2)) {
              console.log('🛑 Demasiados errores en el lote, pausando sincronización');
              throw new Error(`Demasiados errores de validación: ${errorCount}/${batch.length}`);
            }
          }
        }
        
        // ✅ DELAY MÁS LARGO ENTRE LOTES
        if (i + batchSize < orders.length) {
          await this.sleep(2000); // 2 segundos entre lotes
        }
      }
      
      console.log(`✅ Shopify sync completada: ${processedCount} procesados, ${errorCount} errores`);
      return processedCount;
      
    } catch (error) {
      console.error('❌ Error en sincronización de Shopify:', error);
      throw error;
    }
  }
async syncChannelById(channelId) {
    try {
      console.log(`🔄 Sincronización forzada del canal ${channelId}...`);
      
      const channel = await Channel.findById(channelId).populate('company_id');
      if (!channel) {
        throw new Error(`Canal ${channelId} no encontrado`);
      }

      if (!channel.is_active) {
        throw new Error(`El canal ${channel.channel_name} está inactivo y no puede ser sincronizado.`);
      }

      // ✅ VERIFICACIÓN DE SEGURIDAD: Evita syncs simultáneos
      if (this.syncInProgress.has(channel._id.toString())) {
        console.log(`⏭️ ${channel.channel_name} ya está sincronizando, la solicitud manual será omitida.`);
        throw new Error(`El canal ${channel.channel_name} ya tiene una sincronización en curso.`);
      }

      // ✅ REUTILIZAR LA LÓGICA PRINCIPAL Y ROBUSTA DE SYNC
      const result = await this.syncChannel(channel);

      console.log(`✅ Sincronización forzada de ${channel.channel_name} completada.`);
      
      // Construir una respuesta consistente
      return {
        success: result.success,
        channel_name: result.channel,
        orders_synced: result.ordersImported,
        duration_ms: result.duration,
        message: result.success 
          ? `${result.ordersImported} pedidos sincronizados exitosamente.`
          : `Falló la sincronización. Revisa los logs.`
      };

    } catch (error) {
      console.error(`❌ Error en la sincronización forzada del canal ${channelId}:`, error.message);
      // El error ya fue manejado y logueado dentro de syncChannel,
      // aquí solo lo relanzamos para que el controlador de la API lo capture.
      throw error;
    }
  }

    async updateChannelSyncStats(channel, success, ordersCount = 0, errorMessage = null) {
    try {
      const updateData = {
        last_sync: new Date(),
        last_sync_orders: ordersCount,
        sync_status: success ? 'success' : 'error'
      };

      if (success) {
        updateData.last_sync_error = null;
        updateData['sync_stats.total_syncs'] = (channel.sync_stats?.total_syncs || 0) + 1;
        updateData['sync_stats.successful_syncs'] = (channel.sync_stats?.successful_syncs || 0) + 1;
        updateData['sync_stats.total_orders_imported'] = (channel.sync_stats?.total_orders_imported || 0) + ordersCount;
      } else {
        updateData.last_sync_error = errorMessage;
        updateData['sync_stats.total_syncs'] = (channel.sync_stats?.total_syncs || 0) + 1;
        updateData['sync_stats.failed_syncs'] = (channel.sync_stats?.failed_syncs || 0) + 1;
      }

      await Channel.findByIdAndUpdate(channel._id, updateData);
      
    } catch (error) {
      console.error('Error actualizando estadísticas del canal:', error);
    }
  }

  // ✅ PROCESAR PEDIDO INDIVIDUAL CON VALIDACIÓN MEJORADA
  async processSingleShopifyOrder(orderData, channel) {
    try {
      // Verificar si ya existe
      const existingOrder = await Order.findOne({
        external_order_id: String(orderData.id),
        channel_id: channel._id
      });
      
      if (existingOrder) {
        console.log(`⏭️ Pedido ${orderData.name} ya existe, omitiendo...`);
        return false;
      }
      
      // ✅ VALIDACIÓN PREVIA ANTES DE CREAR
      const validation = this.validateShopifyOrderData(orderData);
      if (!validation.isValid) {
        console.log(`🚫 Pedido ${orderData.name} rechazado:`, validation.errors.join(', '));
        return false;
      }
      
      // Verificar comuna permitida
      const commune = this.extractCommune(orderData);
      if (!this.isCommuneAllowed(commune, channel)) {
        console.log(`🚫 Pedido #${orderData.name} rechazado. Comuna "${commune}" no permitida.`);
        return false;
      }
      
      // Crear pedido
      const shopifyService = new ShopifyService(channel);
      await shopifyService.createOrderFromWebhook(orderData, channel._id);
      
      return true;
      
    } catch (error) {
      console.warn(`⚠️ Error procesando pedido ${orderData.name || orderData.id}:`, error.message);
      throw error;
    }
  }

  // ✅ VALIDACIÓN PREVIA DE DATOS DE SHOPIFY
  validateShopifyOrderData(orderData) {
    const errors = [];
    
    // Validar shipping_address
    if (!orderData.shipping_address || 
        !orderData.shipping_address.address1 ||
        orderData.shipping_address.address1.trim().length < 5) {
      errors.push('Dirección de envío inválida o muy corta');
    }
    
    // Validar customer
    if (!orderData.customer || 
        (!orderData.customer.first_name && !orderData.customer.last_name)) {
      errors.push('Información de cliente incompleta');
    }
    
    // Validar campos básicos
    if (!orderData.id || !orderData.name) {
      errors.push('ID o nombre de pedido faltante');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ✅ PAUSAR CANAL POR ERRORES DE VALIDACIÓN
  async pauseChannelForValidationErrors(channel) {
    const pauseDuration = 60; // 60 minutos
    
    await Channel.findByIdAndUpdate(channel._id, {
      auto_sync_enabled: false,
      sync_status: 'paused_validation_errors',
      last_sync_error: 'Pausado por errores de validación de datos',
      auto_sync_pause_until: new Date(Date.now() + (pauseDuration * 60 * 1000))
    });
    
    console.log(`⏸️ Canal ${channel.channel_name} pausado por ${pauseDuration} minutos por errores de validación`);
  }

  // ✅ PAUSAR CANAL POR EXCESO DE ERRORES
  async pauseChannelForErrors(channel) {
    const pauseDuration = 120; // 2 horas
    
    await Channel.findByIdAndUpdate(channel._id, {
      auto_sync_enabled: false,
      sync_status: 'paused_too_many_errors',
      last_sync_error: 'Pausado por exceso de errores consecutivos',
      auto_sync_pause_until: new Date(Date.now() + (pauseDuration * 60 * 1000))
    });
    
    console.log(`⏸️ Canal ${channel.channel_name} pausado por ${pauseDuration} minutos por exceso de errores`);
  }

  // ✅ AJUSTAR FRECUENCIA DE CANAL
  async adjustChannelFrequency(channel, direction) {
    let newFrequency = channel.sync_frequency_minutes;
    
    if (direction === 'increase') {
      newFrequency = Math.min(newFrequency * 2, 480); // Máximo 8 horas
    } else {
      newFrequency = Math.max(Math.floor(newFrequency / 2), 15); // Mínimo 15 minutos
    }
    
    await Channel.findByIdAndUpdate(channel._id, {
      sync_frequency_minutes: newFrequency
    });
    
    console.log(`⏰ Frecuencia de ${channel.channel_name} ajustada: ${channel.sync_frequency_minutes} → ${newFrequency} minutos`);
  }

  // ✅ MONITOREAR SALUD DEL SISTEMA
  async monitorSyncHealth() {
    try {
      const stats = await this.getSyncHealthStats();
      
      console.log('📊 Estadísticas de salud del sync:', {
        totalChannels: stats.totalChannels,
        activeChannels: stats.activeChannels,
        errorChannels: stats.errorChannels,
        recentErrors: stats.recentErrors
      });
      
      // Si hay demasiados errores, considerar pausa de emergencia
      if (stats.errorRate > 0.8 && stats.activeChannels > 0) {
        console.log('🚨 Alta tasa de errores detectada, considerando pausa de emergencia');
        
        if (stats.recentErrors > 100) {
          await this.emergencyPause('Alta tasa de errores detectada automáticamente');
        }
      }
      
    } catch (error) {
      console.error('Error monitoreando salud del sync:', error);
    }
  }

  // ✅ OBTENER ESTADÍSTICAS DE SALUD
  async getSyncHealthStats() {
    const totalChannels = await Channel.countDocuments({ is_active: true });
    const activeChannels = await Channel.countDocuments({ 
      is_active: true, 
      auto_sync_enabled: true 
    });
    const errorChannels = await Channel.countDocuments({
      is_active: true,
      sync_status: { $in: ['error', 'paused_validation_errors', 'paused_too_many_errors'] }
    });
    
    // Contar errores recientes (última hora)
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
    const recentErrors = await this.getRecentSyncErrors(oneHourAgo);
    
    return {
      totalChannels,
      activeChannels,
      errorChannels,
      errorRate: totalChannels > 0 ? errorChannels / totalChannels : 0,
      recentErrors
    };
  }

  // ✅ CONTAR ERRORES RECIENTES
  async getRecentSyncErrors(since = new Date(Date.now() - (60 * 60 * 1000))) {
    // Esto podría implementarse con logs en base de datos
    // Por ahora, usar conteo simple de errores en memoria
    let errorCount = 0;
    for (const [channelId, errors] of this.syncErrors.entries()) {
      errorCount += errors;
    }
    return errorCount;
  }

  // ✅ SYNC WOOCOMMERCE Y MERCADOLIBRE (conservadores)
async syncWooCommerceOrders(channel, params) {
  try {
    // ✅ VERIFICAR SI WooCommerceService TAMBIÉN ES ESTÁTICO
    const result = await WooCommerceService.syncOrders(channel._id, {
      dateFrom: params.dateFrom,
      dateTo: new Date(),
      limit: params.limit
    });
    
    return result.syncedCount || 0;
    
  } catch (error) {
    console.error(`❌ Error en syncWooCommerceOrders:`, error.message);
    throw error;
  }
}

  async syncMercadoLibreOrders(channel, params) {
  try {
    // ✅ USAR MÉTODO ESTÁTICO DIRECTAMENTE
    const result = await MercadoLibreService.syncOrders(channel._id, {
      dateFrom: params.dateFrom,
      dateTo: new Date(),
      limit: params.limit
    });
    
    // Extraer el número de pedidos sincronizados
    return result.syncedCount || 0;
    
  } catch (error) {
    console.error(`❌ Error en syncMercadoLibreOrders:`, error.message);
    throw error;
  }
}

  // ✅ MÉTODOS AUXILIARES EXISTENTES MEJORADOS
  extractCommune(orderData) {
    return orderData.shipping_address?.city || 
           orderData.shipping_address?.province_code ||
           'Desconocida';
  }
  
  isCommuneAllowed(commune, channel) {
    const allowedCommunes = channel.allowed_communes || [];
    
    if (allowedCommunes.length === 0) {
      return true;
    }
    
    const normalizedCommune = commune.toLowerCase().trim();
    return allowedCommunes.some(allowed => 
      allowed.toLowerCase().trim() === normalizedCommune
    );
  }

  // Sincronización forzada de todos los canales activos - MEJORADA
  async forceSyncAll() {
    try {
      console.log('🚀 Iniciando sincronización forzada (modo conservador)...');
      
      if (this.emergencyPaused) {
        throw new Error('Sistema en pausa de emergencia. Use resumeFromEmergency() primero.');
      }
      
      const channels = await Channel.find({
        is_active: true
      }).populate('company_id');

      const results = [];
      
      // ✅ PROCESAR DE UNO EN UNO CON DELAYS
      for (const channel of channels) {
        try {
          const result = await this.syncChannel(channel);
          results.push(result);
          
          // Delay entre canales
          await this.sleep(5000); // 5 segundos entre canales
        } catch (error) {
          results.push({
            channel: channel.channel_name,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`✅ Sincronización forzada completada: ${results.length} canales procesados`);
      return results;

    } catch (error) {
      console.error('❌ Error en sincronización forzada:', error);
      throw error;
    }
  }

  // ✅ MÉTODOS DE ADMINISTRACIÓN ADICIONALES
  
  // Obtener estadísticas del scheduler
  getStats() {
    return {
      isRunning: this.isRunning,
      emergencyPaused: this.emergencyPaused,
      syncInProgress: Array.from(this.syncInProgress),
      channelErrors: Object.fromEntries(this.syncErrors),
      tasksCount: this.scheduledTasks.size,
      uptime: this.isRunning ? new Date() - this.startTime : 0
    };
  }

  // Limpiar logs y estadísticas antiguas
  async cleanup() {
    try {
      console.log('🧹 Iniciando limpieza de datos antiguos...');
      
      // Limpiar errores antiguos en memoria
      this.syncErrors.clear();
      
      // Reactivar canales que hayan cumplido su pausa
      const now = new Date();
      const channelsToReactivate = await Channel.find({
        auto_sync_pause_until: { $lt: now },
        auto_sync_enabled: false,
        sync_status: { $in: ['paused_validation_errors', 'paused_too_many_errors'] }
      });
      
      for (const channel of channelsToReactivate) {
        await Channel.findByIdAndUpdate(channel._id, {
          auto_sync_enabled: true,
          sync_status: 'ready',
          last_sync_error: null,
          auto_sync_pause_until: null
        });
        
        console.log(`✅ Canal ${channel.channel_name} reactivado automáticamente`);
      }
      
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
    try {
      console.log('🔄 Reiniciando Sync Scheduler...');
      
      // Limpiar timers existentes
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }

      // Limpiar errores acumulados
      this.syncErrors.clear();
      this.emergencyPaused = false;

      // Reinicializar
      await this.initialize();
      
      console.log('✅ Sync Scheduler reiniciado exitosamente');
      
      return {
        success: true,
        message: 'Sistema de sincronización reiniciado',
        restart_time: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error reiniciando Sync Scheduler:', error);
      throw error;
    }
  }

  // Obtener próximas sincronizaciones programadas
async getUpcomingSyncs() {
    try {
      const channels = await Channel.find({
        is_active: true,
        auto_sync_enabled: true
      }).select('channel_name channel_type last_sync sync_frequency_minutes');

      const upcomingSyncs = channels.map(channel => {
        const lastSync = new Date(channel.last_sync || 0);
        const nextSync = new Date(lastSync.getTime() + (channel.sync_frequency_minutes * 60 * 1000));
        const minutesUntilNext = Math.max(0, Math.floor((nextSync.getTime() - Date.now()) / (1000 * 60)));

        return {
          channel_id: channel._id,
          channel_name: channel.channel_name,
          channel_type: channel.channel_type,
          last_sync: channel.last_sync,
          next_sync: nextSync,
          minutes_until_next: minutesUntilNext,
          frequency_minutes: channel.sync_frequency_minutes,
          is_overdue: minutesUntilNext === 0 && lastSync.getTime() > 0
        };
      });

      // Ordenar por próxima sincronización
      upcomingSyncs.sort((a, b) => a.minutes_until_next - b.minutes_until_next);

      return {
        success: true,
        upcoming_syncs: upcomingSyncs,
        total_channels: channels.length,
        overdue_count: upcomingSyncs.filter(s => s.is_overdue).length
      };

    } catch (error) {
      console.error('Error obteniendo próximas sincronizaciones:', error);
      throw error;
    }
  }

    stop() {
    if (!this.isRunning) {
      console.log('⚠️ Sync Scheduler ya está detenido');
      return;
    }

    this.mainTask.stop();
    this.cleanupTask.stop();
    this.monitorTask.stop();
    this.isRunning = false;
    
    console.log('⏹️ Sync Scheduler detenido');
  }
}

module.exports = new SyncSchedulerService();