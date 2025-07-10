const rateLimit = require('express-rate-limit');

// Un limiter más estricto para las rutas de creación de pedidos
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 30, // Permitir 30 creaciones de pedidos cada 10 minutos desde la misma IP
  message: {
    error: 'Demasiadas solicitudes de creación de pedidos desde esta IP. Por favor, intente de nuevo más tarde.'
  },
  standardHeaders: true, // Devuelve información del límite en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});

// Puedes agregar otros limiters aquí si los necesitas
// const loginLimiter = rateLimit({...});

module.exports = {
  orderLimiter,
  // loginLimiter
};