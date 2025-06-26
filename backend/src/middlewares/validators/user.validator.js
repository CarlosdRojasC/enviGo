// backend/src/middlewares/validators/user.validator.js
const { body, validationResult } = require('express-validator');
const { ROLES } = require('../../config/constants');

const validateRegistration = [
  // El email debe ser un correo válido.
  body('email')
    .isEmail().withMessage('Debe ser un correo electrónico válido.')
    .normalizeEmail(),

  // La contraseña debe tener al menos 8 caracteres.
  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),

  // El nombre completo no puede estar vacío.
  body('full_name')
    .not().isEmpty().withMessage('El nombre completo es requerido.')
    .trim()
    .escape(),
  
  // El rol debe ser uno de los roles permitidos.
  body('role')
    .optional()
    .isIn(Object.values(ROLES)).withMessage('El rol proporcionado no es válido.'),

  // Si se proporciona un company_id, debe ser un ID de Mongo válido.
  body('company_id')
    .if(body('role').not().equals('admin')) // Se aplica si el rol no es admin
    .isMongoId().withMessage('El ID de la empresa no es válido.'),

  // Middleware que revisa los resultados de la validación.
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validateRegistration,
};