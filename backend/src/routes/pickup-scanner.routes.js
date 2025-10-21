// backend/src/routes/pickup-scanner.routes.js

const express = require('express');
const router = express.Router();
const pickupScannerController = require('../controllers/pickup-scanner.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// 📱 Escanear código QR y marcar como recogido
router.post('/scan', 
  authenticateToken, 
  pickupScannerController.scanPackageForPickup
);

// 🔍 Validar código antes de escanear
router.post('/validate', 
  authenticateToken, 
  pickupScannerController.validateCode
);

// 📊 Obtener historial de recogidas del conductor
router.get('/history', 
  authenticateToken, 
  pickupScannerController.getDriverPickupHistory
);

// 📈 Obtener estadísticas de recogidas del conductor
router.get('/stats', 
  authenticateToken, 
  pickupScannerController.getDriverPickupStats
);

module.exports = router;