const jwt = require('jsonwebtoken');
const { ROLES, ERRORS } = require('../config/constants');

// Verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: ERRORS.UNAUTHORIZED });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }
    req.user = user;
    next();
  });
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

// Verificar acceso a empresa específica
const hasCompanyAccess = (req, res, next) => {
  const companyId = parseInt(req.params.companyId || req.query.company_id);
  
  // Admin tiene acceso a todo
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }
  
  // Usuarios de empresa solo a su propia empresa
  if (req.user.company_id !== companyId) {
    return res.status(403).json({ error: ERRORS.FORBIDDEN });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  isAdmin,
  isCompanyOwner,
  hasCompanyAccess
};