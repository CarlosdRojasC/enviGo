// backend/src/middlewares/validators/user.validator.js - VERSIÓN COMPLETA
const { body, validationResult } = require('express-validator');
const { ROLES } = require('../../config/constants');

const validateRegistration = [
  body('email')
    .isEmail().withMessage('Debe ser un correo electrónico válido.')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),

  body('full_name')
    .not().isEmpty().withMessage('El nombre completo es requerido.')
    .trim()
    .escape(),
  
  body('role')
    .optional()
    .isIn(Object.values(ROLES)).withMessage('El rol proporcionado no es válido.'),

  body('company_id')
    .if(body('role').not().equals('admin'))
    .isMongoId().withMessage('El ID de la empresa no es válido.'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// 🆕 Validador para password reset
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Token es requerido')
    .isLength({ min: 64, max: 64 })
    .withMessage('Token inválido'),
  
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// 🆕 Validador para cambio de contraseña
const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Contraseña actual es requerida'),
  
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateRegistration,
  validatePasswordReset,
  validatePasswordChange
};