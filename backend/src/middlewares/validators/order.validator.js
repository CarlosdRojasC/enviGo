// Si tienes un archivo backend/src/middlewares/validators/order.validator.js
// Asegúrate de que tenga algo así:

const { body } = require('express-validator');

const validateOrderCreation = [
  body('channel_id')
    .notEmpty()
    .withMessage('El canal de venta es requerido'),
  
  body('order_number')
    .notEmpty()
    .withMessage('El número de orden es requerido'),
  
  body('customer_name')
    .notEmpty()
    .withMessage('El nombre del cliente es requerido'),
  
  body('shipping_address')
    .notEmpty()
    .withMessage('La dirección de envío es requerida'),
  
  // CORREGIDO: Permitir 0 como valor válido
  body('total_amount')
    .optional({ nullable: true, checkFalsy: false })
    .isNumeric()
    .withMessage('El monto total debe ser un número')
    .custom((value) => {
      if (value !== null && value !== undefined && value < 0) {
        throw new Error('El monto total no puede ser negativo');
      }
      return true;
    }),
  
  body('shipping_cost')
    .optional({ nullable: true, checkFalsy: false })
    .isNumeric()
    .withMessage('El costo de envío debe ser un número')
    .custom((value) => {
      if (value !== null && value !== undefined && value < 0) {
        throw new Error('El costo de envío no puede ser negativo');
      }
      return true;
    }),
];

module.exports = {
  validateOrderCreation
};