require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const connectDB = require('./config/database');  // <-- Importa conexión MongoDB

const app = express();
const PORT = process.env.PORT || 3001;

// --- AÑADE ESTA LÍNEA AQUÍ ---
app.set('trust proxy', 1); // Confía en el primer proxy (el de Render)

// Middlewares de seguridad
app.use(helmet());
app.use(compression());

const allowedOrigins = [
  'https://envi-go.vercel.app',
  'http://localhost:5173' // si usas desarrollo también
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite peticiones sin 'origin' (como apps móviles o Postman) y las de la lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true // Permite que el frontend envíe cookies o tokens de autorización
};

app.use(cors(corsOptions));

app.set('trust proxy', 1); // Esto es para que express-rate-limit funcione correctamente en Render


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por IP
});

app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb',verify: (req, res, buf) => {
    req.rawBody = buf; // Guarda el buffer del body
  } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Rutas API
app.use('/api', routes);

// Manejo de errores 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Error de validación', details: err.errors });
  }
  if (err.code === 11000) { // Mongo duplicate key error
    return res.status(400).json({ error: 'El registro ya existe' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor', ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
});


// Iniciar servidor

const startServer = async () => {
  try {
    await connectDB();  // <-- conecta a MongoDB
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
      console.log(`🔐 JWT configurado: ${process.env.JWT_SECRET ? 'Sí' : 'No'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

// Iniciar
startServer();
