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
const driverHistoryRoutes = require('./routes/driverHistory.routes');
const manifestRoutes = require('./routes/manifest.routes');
const generalStoreRoutes = require('./routes/generalStore.routes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ------------------------------
// 🔧 Inicialización de servicios
// ------------------------------
const wsService = new WebSocketService(server);
global.wsService = wsService;
let syncSchedulerInitialized = false;

// ------------------------------
// 🔐 Configuración CORS segura
// ------------------------------
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
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('❌ CORS bloqueado para origen:', origin);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
};

// ------------------------------
// 🧱 Middlewares globales
// ------------------------------
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ------------------------------
// 🚦 Rate Limiting
// ------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api', limiter);

// ------------------------------
// 🧾 Logging (solo en desarrollo)
// ------------------------------
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ------------------------------
// ❤️ HEALTH CHECK
// ------------------------------
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
          uptime: syncStats.uptime,
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ------------------------------
// 📡 Rutas WebSocket y pruebas
// ------------------------------
app.get('/api/ws-stats', (req, res) => {
  if (global.wsService) return res.json(global.wsService.getStats());
  res.status(500).json({ error: 'WebSocket no disponible' });
});

// ------------------------------
// 🧭 Rutas API
// ------------------------------
app.use('/api/general-store', generalStoreRoutes);
app.use('/api/driver-history', driverHistoryRoutes);
app.use('/api/manifests', manifestRoutes);
app.use('/api', routes);

// ------------------------------
// 🚫 Error 404 y manejador global
// ------------------------------
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ------------------------------
// 🚀 Inicio del servidor
// ------------------------------
const startServer = async () => {
  try {
    await connectDB();
    console.log('🟢 Base de datos conectada');

    if (!syncSchedulerInitialized) {
      console.log('🔄 Inicializando Sync Scheduler...');
      await SyncSchedulerService.initialize();
      syncSchedulerInitialized = true;
      console.log('✅ Sync Scheduler iniciado correctamente');
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🔗 WebSocket en ws://localhost:${PORT}/ws`);
      console.log(`📊 WebSocket Stats: http://localhost:${PORT}/api/ws-stats`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
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
