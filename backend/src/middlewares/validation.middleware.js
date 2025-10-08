// backend/src/middlewares/validation.middleware.js
const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(
      res,
      'Datos inválidos',
      400,
      { details: errors.array().map(e => ({ field: e.param, msg: e.msg })) }
    );
  }
  next();
};
