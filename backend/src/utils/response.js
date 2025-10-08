// backend/src/utils/response.js
exports.success = (res, message, data = {}, code = 200) =>
  res.status(code).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });

exports.fail = (res, error, code = 500, extra = {}) =>
  res.status(code).json({
    success: false,
    error,
    ...extra,
    timestamp: new Date().toISOString(),
  });
