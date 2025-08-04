const Channel = require('../models/Channel');
const Order = require('../models/Order');
const SyncLog = require('../models/SyncLog');
const { ERRORS, CHANNEL_TYPES } = require('../config/constants');
const ShopifyService = require('../services/shopify.service');
const WooCommerceService = require('../services/woocommerce.service');
const MercadoLibreService = require('../services/mercadolibre.service');
const JumpsellerService = require('../services/jumpseller.service'); // ✅ AÑADIR
class ChannelController {
  // Obtener canales de una empresa con total_orders y last_order_date
async getByCompany(req, res) {
  try {
    const { companyId } = req.params;

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.company_id.toString() !== companyId) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    console.log(`🔍 [Channel Controller] Obteniendo canales para empresa: ${companyId}`);

    // ✅ CAMBIO PRINCIPAL: Buscar TODOS los canales (no solo activos)
    // El filtrado de activos se hace en el frontend
    const channels = await Channel.find({ 
      company_id: companyId 
      // Removemos: is_active: true
    }).sort({ created_at: -1 });

    console.log(`📊 [Channel Controller] Encontrados ${channels.length} canales para empresa ${companyId}`);

    // Para cada canal, calcular estadísticas completas
    const channelsWithStats = await Promise.all(channels.map(async (channel) => {
      const totalOrders = await Order.countDocuments({ channel_id: channel._id });
      const lastOrder = await Order.findOne({ channel_id: channel._id }).sort({ order_date: -1 });
      
      // Calcular revenue total
      const totalRevenueAgg = await Order.aggregate([
        { $match: { channel_id: channel._id } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]);
      const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

      // ✅ MEJORAR: Más información del canal
      const channelData = {
        ...channel.toObject(),
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        last_order_date: lastOrder ? lastOrder.order_date : null,
        last_sync_at: channel.last_sync || channel.last_sync_at || null,
        
        // ✅ NUEVO: Información adicional útil para el frontend
        has_orders: totalOrders > 0,
        is_configured: !!(channel.api_key || channel.store_url),
        status_info: {
          is_active: channel.is_active,
          has_credentials: !!(channel.api_key && channel.api_secret),
          last_sync_success: channel.last_sync_status === 'success',
          sync_enabled: channel.sync_enabled !== false
        }
      };

      console.log(`📋 [Channel Controller] Canal ${channel._id}: ${channel.channel_name} - Activo: ${channel.is_active}, Pedidos: ${totalOrders}`);

      return channelData;
    }));

    // Separar canales activos vs inactivos para logs
    const activeChannels = channelsWithStats.filter(c => c.is_active);
    const inactiveChannels = channelsWithStats.filter(c => !c.is_active);

    console.log(`✅ [Channel Controller] Enviando respuesta: ${activeChannels.length} activos, ${inactiveChannels.length} inactivos`);

    // ✅ MANTENER: Envolver en data object (esto ya estaba correcto)
    res.json({ 
      success: true,
      data: channelsWithStats,
      meta: {
        total: channelsWithStats.length,
        active: activeChannels.length,
        inactive: inactiveChannels.length,
        company_id: companyId
      }
    });

  } catch (error) {
    console.error('❌ [Channel Controller] Error obteniendo canales:', error);
    res.status(500).json({ 
      error: ERRORS.SERVER_ERROR,
      details: error.message 
    });
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
        const { channel_type, channel_name, store_url, api_key, api_secret, webhook_secret } = req.body;

        // --- VALIDACIONES INICIALES ---
        if (req.user.role !== 'admin' && req.user.company_id.toString() !== companyId) {
            return res.status(403).json({ error: ERRORS.FORBIDDEN });
        }
        if (!channel_type) {
            return res.status(400).json({ error: 'El tipo de canal es obligatorio.' });
        }
        if (!Object.values(CHANNEL_TYPES).includes(channel_type)) {
            return res.status(400).json({ error: 'Tipo de canal no válido.' });
        }

        const exists = await Channel.findOne({ company_id: companyId, channel_name });
        if (exists) {
            return res.status(400).json({ error: 'Ya existe un canal con ese nombre para esta empresa.' });
        }

        // --- VALIDACIÓN ESPECÍFICA PARA MERCADOLIBRE ---
        if (channel_type === CHANNEL_TYPES.MERCADOLIBRE) {
            // Verificar variables de entorno
            if (!process.env.MERCADOLIBRE_APP_ID || !process.env.MERCADOLIBRE_SECRET_KEY) {
                console.error('❌ [ML] Variables de entorno no configuradas');
                return res.status(500).json({ 
                    error: 'La integración con MercadoLibre no está configurada correctamente.',
                    details: 'Las variables MERCADOLIBRE_APP_ID y MERCADOLIBRE_SECRET_KEY son requeridas.'
                });
            }

            // Validación de URL para MercadoLibre
            if (!store_url) {
                return res.status(400).json({ 
                    error: 'La URL de MercadoLibre es obligatoria.' 
                });
            }

            const validMLDomains = [
                'mercadolibre.com.ar',  // Argentina
                'mercadolibre.com.mx',  // México
                'mercadolibre.cl',      // Chile
                'mercadolibre.com.co',  // Colombia
                'mercadolibre.com.pe',  // Perú
                'mercadolibre.com.uy',  // Uruguay
                'mercadolibre.com.ve',  // Venezuela
                'mercadolivre.com.br'   // Brasil
            ];

            const isValidMLUrl = validMLDomains.some(domain => 
                store_url.toLowerCase().includes(domain)
            );

            if (!isValidMLUrl) {
                return res.status(400).json({ 
                    error: `La URL debe ser de un sitio válido de MercadoLibre.`,
                    details: `Dominios válidos: ${validMLDomains.join(', ')}`,
                    examples: [
                        'https://mercadolibre.com.ar',
                        'https://mercadolibre.com.mx', 
                        'https://mercadolibre.cl',
                        'https://mercadolibre.com.co'
                    ]
                });
            }

            console.log(`✅ [ML] URL válida para MercadoLibre: ${store_url}`);
        }
        if (channel_type === CHANNEL_TYPES.JUMPSELLER) {
    if (!api_key) {
        return res.status(400).json({ 
            error: 'El Token de API es obligatorio para Jumpseller.' 
        });
    }
    
    if (!store_url) {
        return res.status(400).json({ 
            error: 'La URL de la tienda es obligatoria para Jumpseller.' 
        });
    }

    if (api_key.length < 20) {
        return res.status(400).json({ 
            error: 'El Token de API debe tener al menos 20 caracteres.' 
        });
    }

    console.log(`✅ [Jumpseller] Creando canal para tienda: ${store_url}`);
}

        // --- CONSTRUCCIÓN DEL OBJETO DEL CANAL ---
        const channelPayload = {
            company_id: companyId,
            channel_type,
            channel_name,
            store_url: store_url.trim(),
            webhook_secret: webhook_secret || '',
            settings: {
                // Para MercadoLibre, inicializar campos OAuth
                ...(channel_type === CHANNEL_TYPES.MERCADOLIBRE && {
                    oauth_configured: false,
                    last_token_refresh: null,
                    user_id: null,
                    access_token: null,
                    refresh_token: null,
                    expires_in: null
                })
            },
            is_active: true,
            // ✅ CORRECCIÓN: Usar solo valores válidos del enum
            sync_status: 'pending' // Usar 'pending' en lugar de 'pending_oauth'
        };

        // Añadir credenciales solo si NO es MercadoLibre
// Añadir credenciales solo si NO requiere OAuth2
if (channel_type !== CHANNEL_TYPES.MERCADOLIBRE && 
    channel_type !== CHANNEL_TYPES.JUMPSELLER && 
    channel_type !== CHANNEL_TYPES.GENERAL_STORE) {
    // Solo Shopify y WooCommerce requieren credenciales iniciales
    if (!api_key || !api_secret) {
        return res.status(400).json({ 
            error: `El canal de tipo '${channel_type}' requiere credenciales de API.` 
        });
    }
    channelPayload.api_key = api_key.trim();
    channelPayload.api_secret = api_secret.trim();
}


// Para canales OAuth2 (MercadoLibre y Jumpseller), las credenciales se configuran después de la autorización

        // Crear el canal
        const channel = new Channel(channelPayload);
        await channel.save();

        console.log(`✅ [Canal] Canal ${channel_type} creado exitosamente:`, {
            id: channel._id,
            name: channel_name,
            company: companyId,
            store_url: store_url
        });

        // --- RESPUESTA ESPECÍFICA PARA MERCADOLIBRE ---
        if (channel.channel_type === CHANNEL_TYPES.MERCADOLIBRE) {
            try {
                        const authorizationUrl = MercadoLibreService.getAuthorizationUrlWithCountry(
            channel._id, 
            channel.store_url
        );

                
                console.log(`🔐 [ML] URL de autorización generada para canal ${channel._id}`);
                
                return res.status(201).json({
                    success: true,
                    message: 'Canal de MercadoLibre creado exitosamente. Procede con la autorización.',
                    channel: {
                        id: channel._id,
                        channel_name: channel.channel_name,
                        channel_type: channel.channel_type,
                        store_url: channel.store_url,
                        sync_status: channel.sync_status,
                        created_at: channel.created_at
                    },
                    authorizationUrl,
                    next_steps: [
                        'Haz clic en "Autorizar" para conectar con MercadoLibre',
                        'Inicia sesión en tu cuenta de MercadoLibre',
                        'Autoriza el acceso a enviGo',
                        'Serás redirigido de vuelta a la plataforma'
                    ]
                });
            } catch (authError) {
                console.error('❌ [ML] Error generando URL de autorización:', authError);
                
                // Si falla la URL de autorización, eliminamos el canal creado
                await Channel.findByIdAndDelete(channel._id);
                
                return res.status(500).json({ 
                    error: 'Error al generar la URL de autorización de MercadoLibre.',
                    details: authError.message,
                    solution: 'Verifica que las variables MERCADOLIBRE_APP_ID y MERCADOLIBRE_SECRET_KEY estén correctamente configuradas.'
                });
            }
        }
// Después de crear el canal, antes de la respuesta final:
if (channel.channel_type === CHANNEL_TYPES.JUMPSELLER) {
    try {
        const authorizationUrl = JumpsellerService.getAuthorizationUrl(channel._id);
        
        console.log(`🔐 [Jumpseller] URL de autorización generada para canal ${channel._id}`);
        
        return res.status(201).json({
            success: true,
            message: 'Canal de Jumpseller creado exitosamente. Procede con la autorización.',
            channel: {
                id: channel._id,
                channel_name: channel.channel_name,
                channel_type: channel.channel_type,
                store_url: channel.store_url,
                sync_status: channel.sync_status,
                created_at: channel.created_at
            },
            authorizationUrl,
            next_steps: [
                'Haz clic en "Autorizar" para conectar con Jumpseller',
                'Inicia sesión en tu cuenta de Jumpseller',
                'Autoriza el acceso a enviGo',
                'Serás redirigido de vuelta a la plataforma'
            ]
        });
    } catch (authError) {
        console.error('❌ [Jumpseller] Error generando URL de autorización:', authError);
        
        await Channel.findByIdAndDelete(channel._id);
        
        return res.status(500).json({ 
            error: 'Error al generar la URL de autorización de Jumpseller.',
            details: authError.message
        });
    }
}
        // Respuesta para otros tipos de canal
        res.status(201).json({ 
            success: true,
            message: 'Canal creado exitosamente', 
            channel: {
                id: channel._id,
                channel_name: channel.channel_name,
                channel_type: channel.channel_type,
                store_url: channel.store_url,
                sync_status: channel.sync_status,
                created_at: channel.created_at
            }
        });

    } catch (error) {
        console.error('❌ [Canal] Error creando canal:', error);
        
        // Manejo específico de errores
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'Ya existe un canal con esos datos.',
                details: 'Verifica que el nombre del canal sea único para esta empresa.'
            });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Error de validación en los datos del canal.',
                details: Object.values(error.errors).map(e => e.message)
            });
        }
        
        res.status(500).json({ 
            error: 'Error interno del servidor al crear el canal.',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Contacta al soporte técnico.'
        });
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

    const channel = await Channel.findOne({ _id: id, is_active: true });
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado o inactivo' });
    }

    if (!channel.channel_type) {
      return res.status(400).json({ error: 'El canal no tiene un tipo definido' });
    }

    if (req.user.role !== 'admin' && req.user.company_id.toString() !== channel.company_id.toString()) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    console.log(`🚀 Iniciando sincronización para canal ${channel.channel_name}`);

    // Crear registro de sincronización
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
      switch (channel.channel_type.toLowerCase()) {
        case CHANNEL_TYPES.SHOPIFY:
          syncResult = await ShopifyService.syncOrders(channel, date_from, date_to);
          break;
        case CHANNEL_TYPES.WOOCOMMERCE:
          syncResult = await WooCommerceService.syncOrders(channel, date_from, date_to);
          break;
        case CHANNEL_TYPES.MERCADOLIBRE:
          syncResult = await MercadoLibreService.syncOrders(channel, date_from, date_to);
          break;
        case CHANNEL_TYPES.JUMPSELLER:
          syncResult = await JumpsellerService.syncOrders(channel, date_from, date_to);
        default:
          throw new Error(`Sincronización no implementada para: "${channel.channel_type}"`);
      }

      // ACTUALIZACIÓN MEJORADA DEL CANAL
      const now = new Date();
      
      // Actualizar ambos campos para compatibilidad
      channel.last_sync = now;
      channel.last_sync_at = now;
      
      // Marcar como exitosamente sincronizado
      channel.sync_status = 'success';
      channel.last_sync_error = null;
      
      await channel.save();

      // Actualizar log de sincronización
      syncLog.updateWithResult(syncResult);
      syncLog.completed_at = now;
      await syncLog.save();

      const ordersImported = typeof syncResult === 'number' ? 
        syncResult : 
        (syncResult?.imported || syncResult?.orders_synced || 0);

      console.log(`✅ Sincronización completada: ${ordersImported} pedidos`);

      res.json({ 
        success: true,
        message: 'Sincronización completada exitosamente', 
        orders_imported: ordersImported,
        orders_rejected: syncLog.orders_rejected || 0,
        orders_total_processed: syncLog.orders_total_processed || ordersImported,
        sync_id: syncLog._id,
        last_sync: now,
        channel: channel.toObject()
      });

    } catch (syncError) {
      console.error(`❌ Error en sincronización:`, syncError);
      
      // Marcar canal con error
      channel.sync_status = 'error';
      channel.last_sync_error = syncError.message;
      await channel.save();
      
      // Marcar log como fallido
      syncLog.markAsFailed(syncError.message);
      await syncLog.save();

      throw syncError;
    }
  } catch (error) {
    console.error('Error sincronizando canal:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error interno del servidor' 
    });
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
        case CHANNEL_TYPES.JUMPSELLER:
          testResult = await JumpsellerService.testConnection(channel);
        default:
          testResult.message = `Prueba no implementada para el tipo de canal: "${channel.channel_type}"`;
      }

      res.json(testResult);
    } catch (error) {
      console.error('Error probando conexión:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al probar la conexión' });
    }
  }
   async getMLAuthorizationUrl(req, res) {
        try {
            const { channelId } = req.body;

            // Delega la creación de la URL al servicio
            const authUrl = MercadoLibreService.getAuthorizationUrl(channelId);

            res.status(200).json({ authUrl });
        } catch (error) {
            console.error('[Controller] Error obteniendo URL de autorización de ML:', error);
            res.status(500).json({ error: 'No se pudo generar la URL de autorización.' });
        }
    }

    /**
     * Maneja el callback de OAuth2, intercambia el código por tokens.
     */
async handleMLCallback(req, res) {
  try {
    const { code, state, error: oauthError } = req.query; // Usar req.query, no req.body
    
    console.log('📥 [ML Callback] Parámetros recibidos:', { code: !!code, state, error: oauthError });
    
    if (oauthError) {
      console.error('❌ [ML Callback] Error OAuth:', oauthError);
      return res.redirect(`${process.env.FRONTEND_URL}/channels?error=oauth_denied`);
    }
    
    if (!code || !state) {
      console.error('❌ [ML Callback] Faltan parámetros requeridos');
      return res.redirect(`${process.env.FRONTEND_URL}/channels?error=missing_params`);
    }
    
    // ✅ AGREGAR TIMEOUT para evitar códigos expirados
    const updatedChannel = await Promise.race([
      MercadoLibreService.exchangeCodeForTokens(code, state),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout en validación')), 10000)
      )
    ]);
    
    console.log('✅ [ML Callback] OAuth completado exitosamente');
    res.redirect(`${process.env.FRONTEND_URL}/channels?success=ml_connected`);
    
  } catch (error) {
    console.error('❌ [ML Callback] Error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL}/channels?error=validation_failed`);
  }
}

// En channel.controller.js, agregar método:
async handleJumpsellerCallback(req, res) {
    try {
        const { code, state, error: oauthError } = req.query;
        
        if (oauthError) {
            return res.status(400).json({ 
                error: `Error en autorización: ${oauthError}` 
            });
        }

        if (!code || !state) {
            return res.status(400).json({ 
                error: 'Código de autorización o state faltante' 
            });
        }

        // state contiene el ID del canal
        const channel = await Channel.findById(state);
        if (!channel) {
            return res.status(404).json({ 
                error: 'Canal no encontrado' 
            });
        }

        // Intercambiar código por tokens
        const tokens = await JumpsellerService.exchangeCodeForTokens(code);
        
        // Guardar tokens en el canal
        channel.api_key = tokens.access_token;
        channel.settings = {
            ...channel.settings,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            scope: tokens.scope,
            oauth_configured: true,
            token_updated_at: new Date()
        };
        channel.sync_status = 'success';
        
        await channel.save();

        // Probar conexión
        const testResult = await JumpsellerService.testConnection(channel);
        
        if (testResult.success) {
            console.log(`✅ [Jumpseller] Canal ${channel._id} autorizado exitosamente`);
            
            // Redirigir al frontend con éxito
            res.redirect(`${process.env.FRONTEND_URL}/dashboard/channels?jumpseller_success=true&channel_id=${channel._id}`);
        } else {
            throw new Error(testResult.message);
        }

    } catch (error) {
        console.error('❌ [Jumpseller] Error en callback:', error);
        res.redirect(`${process.env.FRONTEND_URL}/dashboard/channels?jumpseller_error=${encodeURIComponent(error.message)}`);
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
async getAllForAdmin(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    // Obtener todos los canales activos de todas las empresas
    const channels = await Channel.find({ is_active: true })
      .populate('company_id', 'name') // Para mostrar nombre de empresa
      .lean();

    // Para cada canal, calcular estadísticas
    const channelsWithStats = await Promise.all(channels.map(async (channel) => {
      const totalOrders = await Order.countDocuments({ channel_id: channel._id });
      const lastOrder = await Order.findOne({ channel_id: channel._id }).sort({ order_date: -1 });
      
      const totalRevenueAgg = await Order.aggregate([
        { $match: { channel_id: channel._id } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]);
      const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

      return {
        ...channel,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        last_order_date: lastOrder ? lastOrder.order_date : null,
        last_sync_at: channel.last_sync || channel.last_sync_at || null,
        // Agregar nombre de empresa para admin
        company_name: channel.company_id?.name || 'Sin empresa'
      };
    }));

    res.json({ data: channelsWithStats });
  } catch (error) {
    console.error('Error obteniendo todos los canales (admin):', error);
    res.status(500).json({ error: ERRORS.SERVER_ERROR });
  }
}
}

module.exports = new ChannelController();