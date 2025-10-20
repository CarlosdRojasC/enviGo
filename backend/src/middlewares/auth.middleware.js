const jwt = require('jsonwebtoken');
const { ROLES, ERRORS } = require('../config/constants');
const User = require('../models/User');
const Driver = require('../models/Driver');
const crypto = require('crypto');

// ==========================================
// 🧠 Verificar token JWT (User o Driver)
// ==========================================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: ERRORS.UNAUTHORIZED });
  }

  try {
    // Decodificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = null;
    let isDriver = false;

    // Buscar primero en usuarios normales
    user = await User.findById(decoded.id);

    // Si no es usuario, probar con Driver
    if (!user) {
      user = await Driver.findById(decoded.id);
      if (user) isDriver = true;
    }

    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'Usuario o conductor no activo' });
    }

    // Verificar si la sesión fue invalidada (solo aplica a usuarios del panel)
    if (!isDriver && user.session_invalidated_at && 
        decoded.iat * 1000 < user.session_invalidated_at.getTime()) {
      return res.status(401).json({
        error: 'Sesión invalidada. Por favor, inicia sesión nuevamente.',
        code: 'SESSION_INVALIDATED'
      });
    }

    // Actualizar último acceso (solo si no es driver, para no afectar performance)
    if (!isDriver) {
      user.last_activity = new Date();
      await user.save({ validateBeforeSave: false });
    }

    // Guardar info en req
    req.user = decoded;
    req.token = token;
    req.isDriver = isDriver;
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

// ==========================================
// 👑 Solo admin
// ==========================================
const isAdmin = (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador.'
    });
  }
  next();
};

// ==========================================
// 🏢 Dueño de empresa o admin
// ==========================================
const isCompanyOwner = (req, res, next) => {
  if (req.user.role !== ROLES.COMPANY_OWNER && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de dueño de empresa.'
    });
  }
  next();
};

// ==========================================
// 🚛 Solo conductor autenticado
// ==========================================
const isDriver = (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({
      error: 'Acceso restringido a conductores'
    });
  }
  next();
};

// ==========================================
// 🧩 Admin o dueño
// ==========================================
const isAdminOrCompanyOwner = (req, res, next) => {
  if (![ROLES.COMPANY_OWNER, ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador o dueño de empresa.'
    });
  }
  next();
};

// ==========================================
// 🏭 Acceso a empresa específica
// ==========================================
const hasCompanyAccess = (req, res, next) => {
  const companyId = req.params.companyId || req.query.company_id;

  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  if (!req.user.company_id || req.user.company_id.toString() !== companyId) {
    return res.status(403).json({ error: ERRORS.FORBIDDEN });
  }

  next();
};

// ==========================================
// 🔗 Usuario debe pertenecer a una empresa
// ==========================================
const requiresCompany = (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN && !req.user.company_id) {
    return res.status(403).json({
      error: 'Usuario no asociado a ninguna empresa'
    });
  }
  next();
};

// ==========================================
// 🛍️ Verificar Webhook Shopify
// ==========================================
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

  if (hash === hmac) next();
  else res.status(401).send('No autorizado');
};

// ==========================================
// 🎯 Autorización dinámica por roles
// ==========================================
const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user?.role) {
        return res.status(403).json({
          error: 'No se encontró información del usuario en la solicitud.'
        });
      }

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

// ==========================================
// 🧩 EXPORTS
// ==========================================
module.exports = {
  authenticateToken,
  isAdmin,
  isCompanyOwner,
  isDriver,
  isAdminOrCompanyOwner,
  hasCompanyAccess,
  requiresCompany,
  verifyShopifyWebhook,
  authorizeRoles
};
