const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Evento para cuando se conecta
pool.on('connect', () => {
  console.log('✅ Base de datos conectada');
});

// Evento para errores
pool.on('error', (err) => {
  console.error('❌ Error en la base de datos:', err);
  process.exit(-1);
});

module.exports = pool;