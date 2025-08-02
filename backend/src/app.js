require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const connectDB = require('./config/database');
const WebSocketService = require('./services/websocket.service'); // 🆕 Tu WebSocket mejorado
const SyncSchedulerService = require('./services/sync.service');
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// 🆕 Inicializar WebSocket mejorado
const wsService = new WebSocketService(server);
global.wsService = wsService;
let syncSchedulerInitialized = false;

// 🆕 Event listeners para el WebSocket
wsService.on('user_connected', (data) => {
  console.log(`👤 Usuario conectado: ${data.user.email} [${data.connectionId}]`);
});

wsService.on('user_disconnected', (data) => {
  console.log(`👤 Usuario desconectado: ${data.user.email} (duración: ${wsService.formatDuration(data.duration)})`);
});

wsService.on('order_notification_sent', (data) => {
  console.log(`📦 Notificación de orden enviada: ${data.order} (${data.results.total} conexiones)`);
});

app.set('trust proxy', 1);

// Middlewares de seguridad mejorados
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:", process.env.FRONTEND_URL],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression({
  level: 6,
  threshold: 100 * 1024, // Solo comprimir archivos > 100KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// 🆕 Orígenes permitidos mejorados para producción
const allowedOrigins = [
  // Desarrollo
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  
  // Producción
  'https://envigo-frontend-production.up.railway.app',
  'https://envigo.cl',
  'https://www.envigo.cl',
  'https://admin.envigo.cl',
  'https://api.envigo.cl',
  
  // Variables de entorno
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  
  null // Para Postman y herramientas de testing
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para origen:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// 🆕 Rate limiting mejorado
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Más strict en producción
  message: {
    error: 'Demasiadas peticiones desde esta IP',
    resetIn: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting para health checks
    return req.path === '/health' || req.path.startsWith('/api/ws/health');
  }
});

app.use('/api/', limiter);

// Body parser
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  } 
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🆕 Logging mejorado
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  });
}

// 🆕 HEALTH CHECK MEJORADO
app.get('/health', async (req, res) => {
  try {
    const syncStats = SyncSchedulerService.getStats();
    const wsHealth = global.wsService ? global.wsService.getHealthStatus() : null;
    
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '2.0.0',
      uptime: process.uptime(),
      
      services: {
        database: 'connected',
        websocket: {
          status: global.wsService ? 'active' : 'inactive',
          connections: global.wsService ? global.wsService.connections.online.size : 0,
          health: wsHealth?.status || 'unknown'
        },
        sync_scheduler: {
          running: syncStats.isRunning,
          uptime: syncStats.uptime,
          next_sync: syncStats.nextSyncTime
        }
      },
      
      performance: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Verificar si algún servicio está fallando
    const hasIssues = wsHealth?.status === 'critical' || !syncStats.isRunning;
    
    res.status(hasIssues ? 503 : 200).json(health);
    
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🆕 WEBSOCKET ENDPOINTS MEJORADOS
app.get('/api/ws/health', (req, res) => {
  if (global.wsService) {
    const health = global.wsService.getHealthStatus();
    res.json(health);
  } else {
    res.status(503).json({ error: 'WebSocket service not available' });
  }
});

app.get('/api/ws/stats', (req, res) => {
  if (global.wsService) {
    const stats = global.wsService.getFullStats();
    res.json(stats);
  } else {
    res.status(503).json({ error: 'WebSocket service not available' });
  }
});

// 🆕 ENDPOINTS DE ADMINISTRACIÓN WEBSOCKET (requieren autenticación)
const auth = require('./middlewares/auth.middleware'); // Asumiendo que tienes middleware de auth

app.get('/api/admin/ws/metrics', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  if (global.wsService) {
    const metrics = global.wsService.getStatsForUser(req.user);
    res.json(metrics);
  } else {
    res.status(503).json({ error: 'WebSocket service not available' });
  }
});

app.post('/api/admin/ws/broadcast', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (!global.wsService) {
    return res.status(503).json({ error: 'WebSocket service not available' });
  }

  const { title, message, type = 'info', target = 'all', targetIds = [] } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    const sentCount = global.wsService.sendSystemNotification(title, message, {
      type,
      target,
      targetIds,
      priority: 'normal'
    });

    res.json({
      success: true,
      message: `Notificación enviada a ${sentCount} conexiones`,
      sentCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enviando broadcast:', error);
    res.status(500).json({ error: 'Error sending broadcast' });
  }
});

app.post('/api/admin/ws/disconnect-user', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (!global.wsService) {
    return res.status(503).json({ error: 'WebSocket service not available' });
  }

  const { userId, reason = 'Admin action' } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const disconnected = global.wsService.disconnectUser(userId, reason);
    
    res.json({
      success: true,
      message: `${disconnected} conexiones desconectadas`,
      disconnected,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error desconectando usuario:', error);
    res.status(500).json({ error: 'Error disconnecting user' });
  }
});

// 🆕 MANTENER TUS ENDPOINTS DE TESTING EXISTENTES PERO MEJORADOS
app.post('/api/ws-test', (req, res) => {
  if (!global.wsService) {
    return res.status(500).json({ error: 'WebSocket no disponible' });
  }

  try {
    const sentCount = global.wsService.sendSystemNotification(
      'Notificación de Prueba',
      'Esta es una notificación de prueba del sistema WebSocket mejorado',
      {
        type: 'info',
        target: 'all',
        priority: 'normal'
      }
    );

    res.json({ 
      success: true, 
      message: `Notificación de prueba enviada a ${sentCount} clientes`,
      sentCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en test WebSocket:', error);
    res.status(500).json({ error: 'Error en test' });
  }
});

app.post('/api/test-order-notification', (req, res) => {
  if (!global.wsService) {
    return res.status(500).json({ error: 'WebSocket no disponible' });
  }

  try {
    const { 
      orderNumber = `TEST-${Date.now()}`, 
      eventType = 'delivered', 
      customerName = 'Cliente de Prueba',
      companyId = null
    } = req.body;
    
    // Crear orden de prueba
    const testOrder = {
      _id: `test-${Date.now()}`,
      order_number: orderNumber,
      customer_name: customerName,
      company_id: companyId,
      status: eventType,
      delivery_address: { address: 'Dirección de prueba, Santiago' },
      customer_phone: '+56912345678',
      total_amount: 25000,
      channel_name: 'Test Channel',
      created_at: new Date(),
      tracking_url: `https://envigo.cl/tracking/${orderNumber}`
    };

    // Usar el método mejorado de notificación
    const results = global.wsService.notifyOrderStatusChange(
      testOrder, 
      eventType, 
      'pending', // old status
      {
        driver_name: eventType === 'driver_assigned' ? 'Juan Pérez' : null,
        test_mode: true
      }
    );

    res.json({ 
      success: true, 
      message: `Notificación "${eventType}" enviada`,
      results,
      order: {
        number: orderNumber,
        status: eventType,
        customer: customerName
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en test de orden:', error);
    res.status(500).json({ error: 'Error en test de orden' });
  }
});

app.post('/api/test-order-flow', (req, res) => {
  if (!global.wsService) {
    return res.status(500).json({ error: 'WebSocket no disponible' });
  }

  try {
    const { 
      orderNumber = `FLOW-${Date.now()}`, 
      customerName = 'Cliente Demo',
      companyId = null
    } = req.body;

    const testOrder = {
      _id: `flow-${Date.now()}`,
      order_number: orderNumber,
      customer_name: customerName,
      company_id: companyId,
      delivery_address: { address: 'Las Condes, Santiago' },
      customer_phone: '+56987654321',
      total_amount: 45000,
      channel_name: 'Demo Store'
    };

    const events = [
      { type: 'driver_assigned', delay: 0, oldStatus: 'confirmed' },
      { type: 'picked_up', delay: 3000, oldStatus: 'driver_assigned' },
      { type: 'delivered', delay: 6000, oldStatus: 'picked_up' }
    ];
    
    events.forEach((event, index) => {
      setTimeout(() => {
        global.wsService.notifyOrderStatusChange(
          testOrder,
          event.type,
          event.oldStatus,
          {
            driver_name: 'Carlos Rodriguez',
            test_mode: true,
            flow_step: index + 1,
            total_steps: events.length
          }
        );
        
        console.log(`📤 Flujo ${index + 1}/${events.length}: ${event.type} para #${orderNumber}`);
      }, event.delay);
    });

    res.json({ 
      success: true, 
      message: `Simulando flujo completo para pedido #${orderNumber}`,
      events: events.map(e => e.type),
      order_number: orderNumber,
      duration: '6 segundos',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en test de flujo:', error);
    res.status(500).json({ error: 'Error en test de flujo' });
  }
});

app.post('/api/test-multiple-orders', (req, res) => {
  if (!global.wsService) {
    return res.status(500).json({ error: 'WebSocket no disponible' });
  }

  try {
    const { count = 5 } = req.body;
    const companies = ['TiendaOnline', 'EcommerceChile', 'VentasRápidas', 'MegaStore', 'SuperVentas'];
    const communes = ['Santiago', 'Las Condes', 'Providencia', 'Ñuñoa', 'San Miguel'];
    const events = ['driver_assigned', 'picked_up', 'delivered'];
    
    const orders = [];
    
    for (let i = 0; i < count; i++) {
      const orderNumber = `MULTI-${Date.now()}-${i}`;
      const eventType = events[Math.floor(Math.random() * events.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      const commune = communes[Math.floor(Math.random() * communes.length)];
      
      const testOrder = {
        _id: `multi-${Date.now()}-${i}`,
        order_number: orderNumber,
        customer_name: `Cliente ${i + 1}`,
        company_id: `company-${company.toLowerCase()}`,
        delivery_address: { address: `${commune}, Santiago` },
        total_amount: Math.floor(Math.random() * 50000) + 10000,
        channel_name: company
      };

      orders.push({ order: testOrder, event: eventType });
      
      setTimeout(() => {
        global.wsService.notifyOrderStatusChange(
          testOrder,
          eventType,
          'pending',
          {
            test_mode: true,
            batch_id: `multi-${Date.now()}`,
            batch_index: i + 1,
            batch_total: count
          }
        );
      }, i * 1000);
    }

    res.json({ 
      success: true, 
      message: `Enviando ${count} notificaciones de prueba`,
      orders: orders.map(o => ({
        number: o.order.order_number,
        event: o.event,
        company: o.order.channel_name
      })),
      interval: '1 segundo entre cada notificación',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en test múltiple:', error);
    res.status(500).json({ error: 'Error en test múltiple' });
  }
});

// 🆕 FUNCIÓN PARA INICIALIZAR SYNC SCHEDULER (SIN CAMBIOS)
async function initializeSyncScheduler() {
  if (syncSchedulerInitialized) return;
  
  try {
    console.log('🚀 Inicializando Sync Scheduler...');
    await SyncSchedulerService.initialize();
    syncSchedulerInitialized = true;
    console.log('✅ Sync Scheduler inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Sync Scheduler:', error);
    setTimeout(initializeSyncScheduler, 30000);
  }
}

// MANTENER TODOS TUS ENDPOINTS ADMIN EXISTENTES
app.get('/api/admin/sync/status', async (req, res) => {
  try {
    const stats = SyncSchedulerService.getStats();
    const upcomingSyncs = await SyncSchedulerService.getUpcomingSyncs();
    
    res.json({
      scheduler: stats,
      upcoming_syncs: upcomingSyncs.slice(0, 10)
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado sync:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/sync/force-all', async (req, res) => {
  try {
    console.log('🚀 Forzando sincronización de todos los canales...');
    
    const results = await SyncSchedulerService.forceSyncAll();
    
    res.json({ 
      success: true, 
      message: 'Sincronización forzada iniciada',
      results: results 
    });
  } catch (error) {
    console.error('❌ Error en sincronización forzada:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/admin/sync/force/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    console.log(`🚀 Forzando sincronización del canal ${channelId}...`);
    
    const result = await SyncSchedulerService.syncChannelById(channelId);
    
    res.json({ 
      success: true, 
      message: 'Sincronización del canal completada',
      result: result 
    });
  } catch (error) {
    console.error('❌ Error sincronizando canal:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/admin/sync/restart', async (req, res) => {
  try {
    console.log('🔄 Reiniciando Sync Scheduler...');
    
    await SyncSchedulerService.restart();
    
    res.json({ 
      success: true, 
      message: 'Sync Scheduler reiniciado exitosamente' 
    });
  } catch (error) {
    console.error('❌ Error reiniciando Sync Scheduler:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/admin/sync/upcoming', async (req, res) => {
  try {
    const upcomingSyncs = await SyncSchedulerService.getUpcomingSyncs();
    
    res.json({ 
      success: true,
      data: upcomingSyncs 
    });
  } catch (error) {
    console.error('❌ Error obteniendo próximas sincronizaciones:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// MANTENER TODAS TUS RUTAS EXISTENTES
app.use('/api/general-store', require('./routes/generalStore.routes'));
const driverHistoryRoutes = require('./routes/driverHistory.routes');
app.use('/api/driver-history', driverHistoryRoutes);
app.use('/api/manifests', require('./routes/manifest.routes'));

// Rutas API principales
app.use('/api', routes);

// Manejo de errores 404
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 🆕 Manejo de errores global mejorado
app.use((err, req, res, next) => {
  // Log del error
  console.error('🚨 Error en aplicación:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Respuestas específicas por tipo de error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Error de validación', 
      details: err.errors,
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({ 
      error: 'El registro ya existe',
      field: Object.keys(err.keyPattern)[0],
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID inválido',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      timestamp: new Date().toISOString()
    });
  }

  // Error genérico
  res.status(err.status || 500).json({ 
    error: err.message || 'Error interno del servidor',
    requestId: req.id || Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    })
  });
});

// 🆕 FUNCIÓN STARTSERVER MEJORADA
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('✅ Base de datos conectada');
    
    // Inicializar sistema de sincronización (después de un delay)
    console.log('🔄 Inicializando sistema de sincronización automática...');
    setTimeout(async () => {
      try {
        await SyncSchedulerService.initialize();
        console.log('✅ Sistema de sincronización automática iniciado');
      } catch (error) {
        console.error('❌ Error inicializando sync scheduler:', error);
        // Reintentar después de 30 segundos
        setTimeout(initializeSyncScheduler, 30000);
      }
    }, 3000);
    
    // Iniciar servidor
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    server.listen(PORT, host, () => {
      console.log('🚀='.repeat(50));
      console.log(`🚀 enviGo Server iniciado exitosamente`);
      console.log(`📍 URL: http://${host}:${PORT}`);
      console.log(`🔗 WebSocket: ws://${host}:${PORT}/ws`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
      console.log(`🔐 JWT configurado: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
      console.log(`📊 Health Check: http://${host}:${PORT}/health`);
      console.log(`📈 WS Stats: http://${host}:${PORT}/api/ws/stats`);
      console.log(`🤖 Auto-sync: ✅ Habilitado`);
      console.log(`🔔 WebSocket avanzado: ✅ Activo (${wsService.connections.online.size} conexiones)`);
      console.log('🚀='.repeat(50));
    });

    // Registrar event listeners para el proceso
    setupProcessHandlers();

  } catch (error) {
    console.error('❌ Error crítico al iniciar servidor:', error);
    process.exit(1);
  }
};

// 🆕 MANEJO MEJORADO DE SEÑALES DEL PROCESO
function setupProcessHandlers() {
  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Señal ${signal} recibida, iniciando shutdown graceful...`);
    
    try {
      // Cerrar WebSocket primero
      if (global.wsService) {
        console.log('🔌 Cerrando WebSocket Service...');
        await global.wsService.shutdown();
      }

      // Cerrar servidor HTTP
      console.log('🌐 Cerrando servidor HTTP...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });

      // Forzar cierre después de 30 segundos
      setTimeout(() => {
        console.error('⚠️ Forzando cierre después de timeout');
        process.exit(1);
      }, 30000);

    } catch (error) {
      console.error('❌ Error durante shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Manejo de errores no capturados
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  // Log de métricas cada 5 minutos en producción
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      if (global.wsService) {
        const stats = global.wsService.getFullStats();
        console.log(`📊 Métricas WS: ${stats.connections.current} conexiones activas, ${stats.messages.sent} mensajes enviados`);
      }
    }, 5 * 60 * 1000);
  }
}

// Iniciar servidor
startServer();