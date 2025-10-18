// backend/src/middlewares/auth.middleware.js (ACTUALIZACIÓN)
const jwt = require('jsonwebtoken');
const { ROLES, ERRORS } = require('../config/constants');
const User = require('../models/User');
const crypto = require('crypto');

// Verificar token JWT con validación de sesión
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: ERRORS.UNAUTHORIZED });
  }

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuario no activo' });
    }

    // Verificar si la sesión fue invalidada
    if (user.session_invalidated_at && 
        decoded.iat * 1000 < user.session_invalidated_at.getTime()) {
      return res.status(401).json({ 
        error: 'Sesión invalidada. Por favor, inicia sesión nuevamente.',
        code: 'SESSION_INVALIDATED'
      });
    }

    // Actualizar último acceso
    user.last_activity = new Date();
    await user.save({ validateBeforeSave: false });

    req.user = decoded;
    req.token = token;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    } else {
      console.error('Error en authenticateToken:', err);
      return res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
};

// Verificar si es administrador
const isAdmin = (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requiere rol de administrador.' 
    });
  }
  next();
};

// Verificar si es dueño de empresa
const isCompanyOwner = (req, res, next) => {
  if (req.user.role !== ROLES.COMPANY_OWNER && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requiere rol de dueño de empresa.' 
    });
  }
  next();
};

const isAdminOrCompanyOwner = (req, res, next) => {
  if (req.user.role !== ROLES.COMPANY_OWNER && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requiere rol de administrador o dueño de empresa.' 
    });
  }
  next();
};

// Verificar acceso a empresa específica
const hasCompanyAccess = (req, res, next) => {
  const companyId = req.params.companyId || req.query.company_id;
  
  // Admin tiene acceso a todo
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }
  
  // Usuarios de empresa solo a su propia empresa
  if (!req.user.company_id || req.user.company_id.toString() !== companyId) {
    return res.status(403).json({ error: ERRORS.FORBIDDEN });
  }
  
  next();
};

// Verificar que pertenece a alguna empresa (para empleados y owners)
const requiresCompany = (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN && !req.user.company_id) {
    return res.status(403).json({ 
      error: 'Usuario no asociado a ninguna empresa' 
    });
  }
  next();
};

const verifyShopifyWebhook = (req, res, next) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = req.rawBody;
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmac || !body) {
    return res.status(401).send('No autorizado');
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  if (hash === hmac) {
    next();
  } else {
    res.status(401).send('No autorizado');
  }
};
// ==========================================
// 🔐 Autorización dinámica por roles permitidos
// ==========================================
const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          error: 'No se encontró información del usuario en la solicitud.'
        });
      }

      // Si el rol del usuario está dentro del array permitido
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: `Acceso denegado. Requiere uno de los roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Error en authorizeRoles:', error);
      return res.status(500).json({
        error: 'Error en la autorización por roles.'
      });
    }
  };
};


module.exports = {
  authenticateToken,
  isAdmin,
  isCompanyOwner,
  hasCompanyAccess,
  requiresCompany,
  verifyShopifyWebhook,
  isAdminOrCompanyOwner,
  authorizeRoles
};