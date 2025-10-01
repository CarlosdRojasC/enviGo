const rateLimit = require('express-rate-limit');

// Rate limiter para búsquedas de pedidos
const orderSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto
  message: {
    error: 'Demasiadas solicitudes. Por favor espera un momento.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // No aplicar rate limit a admins en desarrollo
    return process.env.NODE_ENV === 'development' && req.user?.role === 'admin';
  },
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit alcanzado para IP: ${req.ip}`);
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de búsquedas. Por favor espera 1 minuto.',
      retryAfter: 60
    });
  }
});

// Rate limiter para webhooks (más permisivo)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // 100 webhooks por minuto
  message: { error: 'Demasiados webhooks recibidos' },
  skip: (req) => {
    // Permitir webhooks de IPs conocidas sin límite
    const trustedIPs = process.env.TRUSTED_WEBHOOK_IPS?.split(',') || [];
    return trustedIPs.includes(req.ip);
  }
});

// Rate limiter para actualizaciones de estado
const statusUpdateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // 50 actualizaciones por minuto
  message: { error: 'Demasiadas actualizaciones de estado' }
});

// Rate limiter general para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requests por 15 minutos
  message: { error: 'Límite de API alcanzado' }
});

module.exports = {
  orderSearchLimiter,
  webhookLimiter,
  statusUpdateLimiter,
  apiLimiter
};