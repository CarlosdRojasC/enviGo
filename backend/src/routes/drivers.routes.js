const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

// ==================== RUTAS DE CONDUCTORES ====================

router.get('/drivers', authenticateToken, isAdmin, driverController.getAllDrivers);
router.post('/drivers', authenticateToken, isAdmin, driverController.createDriver);
router.delete('/drivers/:driverId', authenticateToken, isAdmin, driverController.deleteDriver);


module.exports = router;