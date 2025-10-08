// backend/src/middlewares/requireAdmin.js
const { fail } = require('../utils/response');
const { ERRORS } = require('../config/constants');

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return fail(res, ERRORS.FORBIDDEN, 403);
  }
  next();
};
