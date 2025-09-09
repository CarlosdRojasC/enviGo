require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const connectDB = require('./config/database');
const WebSocketService = require('./services/websocket.service');
const SyncSchedulerService = require('./services/sync.service'); // ✅ MANTENER COMO ESTABA
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Inicializar WebSocket
const wsService = new WebSocketService(server);
global.wsService = wsService;
let syncSchedulerInitialized = false;

app.set('trust proxy', 1);

// Middlewares de seguridad
app.use(helmet());
app.use(compression());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://envigo-frontend-production.up.railway.app',
  'https://envigo.cl',
  'https://www.envigo.cl',
  'https://demosistema.up.railway.app',
    process.env.FRONTEND_URL,
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
  credentials: true
};

// ✅ FUNCIÓN CORRECTA (YA FUNCIONABA)
async function initializeSyncScheduler() {
  if (syncSchedulerInitialized) return;
  
  try {
    console.log('🚀 Inicializando Sync Scheduler...');
    await SyncSchedulerService.initialize(); // ✅ CORRECTO
    syncSchedulerInitialized = true;
    console.log('✅ Sync Scheduler inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Sync Scheduler:', error);
    setTimeout(initializeSyncScheduler, 30000);
  }
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
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

// Logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ✅ HEALTH CHECK CORRECTO
app.get('/health', async (req, res) => {
  try {
    const syncStats = SyncSchedulerService.getStats(); // ✅ CORRECTO
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        websocket: global.wsService ? 'active' : 'inactive',
        sync_scheduler: {
          running: syncStats.isRunning,
          uptime: syncStats.uptime
        }
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// WebSocket routes
app.get('/api/ws-stats', (req, res) => {
  if (global.wsService) {
    res.json(global.wsService.getStats());
  } else {
    res.status(500).json({ error: 'WebSocket no disponible' });
  }
});

app.post('/api/ws-test', (req, res) => {
  if (global.wsService) {
    const sentCount = global.wsService.sendTestNotification();
    res.json({ 
      success: true, 
      message: `Notificación de prueba enviada a ${sentCount} clientes`,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({ error: 'WebSocket no disponible' });
  }
});

app.post('/api/test-order-notification', (req, res) => {
  if (global.wsService) {
    const { orderNumber = 'TEST-123', eventType = 'delivered', customerName = 'Cliente de Prueba' } = req.body;
    
    const testOrderData = {
      order_id: 'test-id-' + Date.now(),
      order_number: orderNumber,
      status: eventType === 'driver_assigned' ? 'processing' : 
              eventType === 'picked_up' ? 'shipped' : 
              eventType === 'delivered' ? 'delivered' : 'pending',
      customer_name: customerName,
      shipping_commune: 'Santiago',
      company_name: 'Empresa Test',
      updated_at: new Date(),
      eventType: eventType,
      tracking_url: `https://tracking.shipday.com/test-${orderNumber}`,
      driver_name: eventType === 'driver_assigned' ? 'Juan Pérez' : null
    };

    const notifications = {
      'driver_assigned': {
        message: `👨‍💼 Conductor Juan Pérez asignado a pedido #${orderNumber}`,
        icon: '👨‍💼',
        type: 'driver_assigned',
        priority: 'medium'
      },
      'picked_up': {
        message: `🚚 Pedido #${orderNumber} recogido y en camino`,
        icon: '🚚', 
        type: 'picked_up',
        priority: 'medium'
      },
      'delivered': {
        message: `✅ Pedido #${orderNumber} entregado exitosamente`,
        icon: '✅',
        type: 'delivered',
        priority: 'high'
      },
      'proof_uploaded': {
        message: `📸 Prueba de entrega disponible para pedido #${orderNumber}`,
        icon: '📸',
        type: 'proof_uploaded',
        priority: 'medium'
      }
    };

    const notificationData = notifications[eventType] || {
      message: `📦 Pedido #${orderNumber} actualizado`,
      icon: '📦',
      type: 'status_updated',
      priority: 'low'
    };

    const sentCount = global.wsService.broadcast('order_status_changed', {
      ...testOrderData,
      ...notificationData
    });

    res.json({ 
      success: true, 
      message: `Notificación "${eventType}" enviada a ${sentCount} clientes conectados`,
      data: { ...testOrderData, ...notificationData },
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({ error: 'WebSocket no disponible' });
  }
});

app.post('/api/test-order-flow', (req, res) => {
  if (global.wsService) {
    const { orderNumber = `FLOW-${Date.now()}`, customerName = 'Cliente Demo' } = req.body;
    const events = [
      { type: 'driver_assigned', delay: 0 },
      { type: 'picked_up', delay: 3000 },
      { type: 'delivered', delay: 6000 },
      { type: 'proof_uploaded', delay: 9000 }
    ];
    
    events.forEach((event, index) => {
      setTimeout(() => {
        const testData = {
          order_id: `flow-${orderNumber}`,
          order_number: orderNumber,
          status: event.type === 'driver_assigned' ? 'processing' : 
                  event.type === 'picked_up' ? 'shipped' : 
                  event.type === 'delivered' ? 'delivered' : 'delivered',
          customer_name: customerName,
          shipping_commune: 'Las Condes',
          company_name: 'Demo Company',
          updated_at: new Date(),
          eventType: event.type,
          tracking_url: `https://tracking.shipday.com/${orderNumber}`,
          driver_name: 'Carlos Rodriguez'
        };

        const messages = {
          'driver_assigned': `👨‍💼 Conductor Carlos asignado a pedido #${orderNumber}`,
          'picked_up': `🚚 Pedido #${orderNumber} recogido desde Las Condes`,
          'delivered': `✅ Pedido #${orderNumber} entregado a ${customerName}`,
          'proof_uploaded': `📸 Foto y firma confirmadas para #${orderNumber}`
        };
        
        global.wsService.broadcast('order_status_changed', {
          ...testData,
          message: messages[event.type],
          icon: event.type === 'driver_assigned' ? '👨‍💼' : 
                event.type === 'picked_up' ? '🚚' : 
                event.type === 'delivered' ? '✅' : '📸',
          type: event.type,
          priority: event.type === 'delivered' ? 'high' : 'medium'
        });
        
        console.log(`📤 Flujo ${index + 1}/4: ${event.type} para #${orderNumber}`);
      }, event.delay);
    });

    res.json({ 
      success: true, 
      message: `Simulando flujo completo para pedido #${orderNumber} (4 eventos en 9 segundos)`,
      events: events.map(e => e.type),
      order_number: orderNumber,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({ error: 'WebSocket no disponible' });
  }
});

app.post('/api/test-multiple-orders', (req, res) => {
  if (global.wsService) {
    const { count = 5 } = req.body;
    const companies = ['TiendaOnline', 'EcommerceChile', 'VentasRápidas', 'MegaStore', 'SuperVentas'];
    const communes = ['Santiago', 'Las Condes', 'Providencia', 'Ñuñoa', 'San Miguel'];
    const events = ['driver_assigned', 'picked_up', 'delivered'];
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const orderNumber = `MULTI-${Date.now()}-${i}`;
        const eventType = events[Math.floor(Math.random() * events.length)];
        const company = companies[Math.floor(Math.random() * companies.length)];
        const commune = communes[Math.floor(Math.random() * communes.length)];
        
        const testData = {
          order_id: `multi-${i}`,
          order_number: orderNumber,
          status: eventType,
          customer_name: `Cliente ${i + 1}`,
          shipping_commune: commune,
          company_name: company,
          updated_at: new Date(),
          eventType: eventType
        };
        
        const messages = {
          'driver_assigned': `👨‍💼 Conductor asignado a #${orderNumber} (${company})`,
          'picked_up': `🚚 Pedido #${orderNumber} en camino a ${commune}`,
          'delivered': `✅ Entrega exitosa #${orderNumber} en ${commune}`
        };
        
        global.wsService.broadcast('order_status_changed', {
          ...testData,
          message: messages[eventType],
          icon: eventType === 'driver_assigned' ? '👨‍💼' : 
                eventType === 'picked_up' ? '🚚' : '✅',
          type: eventType,
          priority: 'medium'
        });
      }, i * 1000);
    }

    res.json({ 
      success: true, 
      message: `Enviando ${count} notificaciones de prueba (una por segundo)`,
      count: count,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({ error: 'WebSocket no disponible' });
  }
});

// ✅ ENDPOINTS ADMIN (YA ESTABAN CORRECTOS)
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
    
    // ⚠️ NECESITAS AGREGAR ESTE MÉTODO A TU sync.service.js
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
app.use('/api/general-store', require('./routes/generalStore.routes'));

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

const driverHistoryRoutes = require('./routes/driverHistory.routes');
app.use('/api/driver-history', driverHistoryRoutes);

// Rutas API
app.use('/api', routes);

// Manejo de errores 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});
app.use('/api/manifests', require('./routes/manifest.routes'));

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Error de validación', details: err.errors });
  }
  if (err.code === 11000) {
    return res.status(400).json({ error: 'El registro ya existe' });
  }
  res.status(err.status || 500).json({ 
    error: err.message || 'Error interno del servidor', 
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) 
  });
});

// ✅ FUNCIÓN STARTSERVER (YA ESTABA CORRECTA)
const startServer = async () => {
  try {
    await connectDB();
    
    console.log('🔄 Inicializando sistema de sincronización automática...');
    setTimeout(async () => {
      try {
        await SyncSchedulerService.initialize(); // ✅ CORRECTO
        console.log('✅ Sistema de sincronización automática iniciado');
      } catch (error) {
        console.error('❌ Error inicializando sync scheduler:', error);
      }
    }, 3000);
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🔗 WebSocket disponible en ws://localhost:${PORT}/ws`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
      console.log(`🔐 JWT configurado: ${process.env.JWT_SECRET ? 'Sí' : 'No'}`);
      console.log(`📊 WebSocket Stats: http://localhost:${PORT}/api/ws-stats`);
      console.log(`🤖 Auto-sync habilitado: Sí`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

startServer();