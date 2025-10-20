// backend/src/middlewares/driverAuth.middleware.js - NUEVO ARCHIVO
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

// 🚚 Middleware específico para autenticación de conductores
const authenticateDriver = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acceso requerido' 
      });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ Verificar que el token sea de un driver
    if (decoded.role !== 'driver') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token no válido para conductores' 
      });
    }

    // Buscar el driver en la base de datos
    const driver = await Driver.findById(decoded.id);
    
    if (!driver || !driver.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Conductor no encontrado o inactivo' 
      });
    }

    // ✅ Adjuntar información del driver al request
    req.driver = {
      id: driver._id,
      email: driver.email,
      full_name: driver.full_name,
      role: 'driver'
    };
    
    req.token = token;
    next();

  } catch (err) {
    console.error('❌ Error en authenticateDriver:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
};

module.exports = { authenticateDriver };