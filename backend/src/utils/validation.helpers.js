const mongoose = require('mongoose');

/**
 * Valida si un valor es un ObjectId válido y no está vacío
 * @param {any} value - Valor a validar
 * @returns {boolean} - true si es válido, false si no
 */
function isValidObjectId(value) {
  if (!value || 
      value === '' || 
      value === 'undefined' || 
      value === 'null' || 
      value === null || 
      value === undefined) {
    return false;
  }
  
  return mongoose.Types.ObjectId.isValid(value);
}

/**
 * Convierte un valor a ObjectId solo si es válido
 * @param {any} value - Valor a convertir
 * @returns {mongoose.Types.ObjectId|null} - ObjectId o null
 */
function toObjectIdSafe(value) {
  if (!isValidObjectId(value)) {
    return null;
  }
  
  try {
    return new mongoose.Types.ObjectId(value);
  } catch (error) {
    console.error('Error convirtiendo a ObjectId:', error);
    return null;
  }
}

/**
 * Valida múltiples ObjectIds de una vez
 * @param {Object} values - Objeto con valores a validar
 * @param {Array} fields - Array de nombres de campos a validar
 * @returns {Object} - { valid: boolean, errors: Array, converted: Object }
 */
function validateMultipleObjectIds(values, fields) {
  const errors = [];
  const converted = {};
  
  fields.forEach(field => {
    const value = values[field];
    
    if (value) { // Solo validar si el valor existe
      if (isValidObjectId(value)) {
        converted[field] = toObjectIdSafe(value);
      } else {
        errors.push({
          field,
          value,
          message: `${field} debe ser un ObjectId válido`
        });
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    converted
  };
}

/**
 * Middleware express para validar ObjectIds en query params
 * @param {Array} fields - Campos a validar
 */
function validateObjectIdsMiddleware(fields = []) {
  return (req, res, next) => {
    const validation = validateMultipleObjectIds(req.query, fields);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        details: validation.errors
      });
    }
    
    // Agregar ObjectIds convertidos al request
    req.validatedIds = validation.converted;
    next();
  };
}

module.exports = {
  isValidObjectId,
  toObjectIdSafe,
  validateMultipleObjectIds,
  validateObjectIdsMiddleware
};