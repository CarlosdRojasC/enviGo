// backend/src/middlewares/validators/generic.validator.js

const mongoose = require('mongoose');

// Validar ObjectId de MongoDB
const validateMongoId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: `${paramName} es requerido`
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `${paramName} no es un ID válido`
      });
    }
    
    next();
  };
};

// Validar múltiples ObjectIds
const validateMultipleMongoIds = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName] || req.body[paramName] || req.query[paramName];
      
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: `${paramName} no es un ID válido`
        });
      }
    }
    
    next();
  };
};

// Validar parámetros de paginación
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      error: 'El número de página debe ser un entero positivo'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'El límite debe ser un entero entre 1 y 100'
    });
  }
  
  req.query.page = pageNum;
  req.query.limit = limitNum;
  
  next();
};

// Validar campos requeridos
const validateRequired = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Campos requeridos faltantes: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
};

// Validar email
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
    }
  }
  
  next();
};

// Validar fechas
const validateDateRange = (startField = 'start_date', endField = 'end_date') => {
  return (req, res, next) => {
    const startDate = req.query[startField] || req.body[startField];
    const endDate = req.query[endField] || req.body[endField];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Formato de fecha inválido'
        });
      }
      
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de inicio no puede ser mayor que la fecha de fin'
        });
      }
    }
    
    next();
  };
};

module.exports = {
  validateMongoId,
  validateMultipleMongoIds,
  validatePagination,
  validateRequired,
  validateEmail,
  validateDateRange
};