const { body, validationResult } = require('express-validator');
const { ORDER_STATUS } = require('../../config/constants');

exports.validateOrderCreation = [
  body('channel_id').isMongoId().withMessage('El ID del canal no es válido'),
  body('customer_name').notEmpty().withMessage('El nombre del cliente es requerido'),
  body('shipping_address').notEmpty().withMessage('La dirección de envío es requerida'),
  body('total_amount').isNumeric().withMessage('El monto total debe ser un número'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateStatusUpdate = [
    body('status').isIn(Object.values(ORDER_STATUS)).withMessage('Estado no válido'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];