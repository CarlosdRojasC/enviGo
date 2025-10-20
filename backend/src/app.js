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
const SyncSchedulerService = require('./services/sync.service');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// =====================================================
// 🔌 Inicializar WebSocket
// =====================================================
const wsService = new WebSocketService(server);
global.wsService = wsService;
let syncSchedulerInitialized = false;

app.set('trust proxy', 1);

// =====================================================
// 🛡️ Middlewares de seguridad
// =====================================================
app.use(helmet());
app.use(compression());

// =====================================================
// 🌍 Configuración de CORS
// =====================================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://envigo-frontend-production.up.railway.app',
  'https://envigo.cl',
  'https://www.envigo.cl',
  'https://demosistema.up.railway.app',
  process.env.FRONTEND_URL
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

app.use(cors(corsOptions));

// =====================================================
// 🚦 Rate Limiting
// =====================================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// =====================================================
// 🧠 Body Parser
// =====================================================
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// 🧾 Logging en desarrollo
// =====================================================
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// =====================================================
// ❤️ Health Check
// =====================================================
app.get('/health', async (req, res) => {
  try {
    const syncStats = SyncSchedulerService.getStats();
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

// =====================================================
// 🛰️ WebSocket endpoints
// =====================================================
app.get('/api/ws-stats', (req, res) => {
  if (global.wsService) res.json(global.wsService.getStats());
  else res.status(500).json({ error: 'WebSocket no disponible' });
});

app.post('/api/ws-test', (req, res) => {
  if (!global.wsService) return res.status(500).json({ error: 'WebSocket no disponible' });
  const sentCount = global.wsService.sendTestNotification();
  res.json({
    success: true,
    message: `Notificación de prueba enviada a ${sentCount} clientes`,
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// 🧩 Endpoints de simulación y administración
// =====================================================
app.post('/api/test-order-notification', require('./routes/test-order-notification'));
app.post('/api/test-order-flow', require('./routes/test-order-flow'));
app.post('/api/test-multiple-orders', require('./routes/test-multiple-orders'));
app.get('/api/admin/sync/status', require('./routes/admin/sync-status'));
app.post('/api/admin/sync/force-all', require('./routes/admin/sync-force-all'));
app.post('/api/admin/sync/force/:channelId', require('./routes/admin/sync-force-one'));
app.post('/api/admin/sync/restart', require('./routes/admin/sync-restart'));
app.get('/api/admin/sync/upcoming', require('./routes/admin/sync-upcoming'));

// =====================================================
// ✅ RUTAS PRINCIPALES DE API (orden correcto)
// =====================================================
app.use('/api/general-store', require('./routes/generalStore.routes'));
app.use('/api/driver-history', require('./routes/driverHistory.routes'));
app.use('/api/manifests', require('./routes/manifest.routes'));
app.use('/api', routes); // <-- TODAS LAS RUTAS CENTRALES (drivers, orders, etc.)

// =====================================================
// 🚫 Manejo de errores 404 (debe ir al final)
// =====================================================
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// =====================================================
// ❌ Manejo global de errores
// =====================================================
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

// =====================================================
// 🚀 Iniciar Servidor
// =====================================================
const startServer = async () => {
  try {
    await connectDB();
    console.log('🔄 Inicializando sistema de sincronización automática...');
    setTimeout(async () => {
      try {
        await SyncSchedulerService.initialize();
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

// =====================================================
// 🧹 Señales del sistema
// =====================================================
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

startServer();
