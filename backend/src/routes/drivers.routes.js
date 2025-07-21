const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');

// ==================== RUTAS DE CONDUCTORES ====================

// Obtener todos los conductores (solo admin)
router.get('/', authenticateToken, isAdmin, driverController.getAllDrivers);

// Crear nuevo conductor (solo admin)
router.post('/', authenticateToken, isAdmin, driverController.createDriver);

// Obtener conductor específico (solo admin)
router.get('/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverController.getDriver
);

// Actualizar conductor (solo admin)
router.put('/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverController.updateDriver
);

// Eliminar conductor (solo admin)
router.delete('/:driverId', 
  authenticateToken, 
  isAdmin, 
  driverController.deleteDriver
);

module.exports = router;