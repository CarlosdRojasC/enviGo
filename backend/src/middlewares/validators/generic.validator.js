// backend/src/middlewares/validators/generic.validator.js
const { param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Middleware para validar que un campo (de params o query) sea un ObjectId de MongoDB válido.
 * @param {string} fieldName - El nombre del campo a validar (ej. 'id', 'companyId').
 * @param {('param'|'query')} from - De dónde obtener el campo ('param' o 'query'). Por defecto 'param'.
 */
const validateMongoId = (fieldName, from = 'param') => {
  const check = from === 'param' ? param : query;
  
  return [
    check(fieldName).custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`El ID proporcionado para '${fieldName}' no es válido.`);
      }
      return true;
    }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
  ];
};

module.exports = {
  validateMongoId,
};