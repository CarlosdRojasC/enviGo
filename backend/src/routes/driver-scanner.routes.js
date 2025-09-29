const express = require('express')
const router = express.Router()
const multer = require('multer')
const { authenticateToken } = require('../middlewares/auth.middleware')
const ScannerController = require('../controllers/scanner.controller')

// Configurar multer para uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes'))
    }
  }
})

/**
 * GET /api/scanner/clients
 * Obtener clientes disponibles para escaneo
 */
router.get('/clients', authenticateToken, ScannerController.getClients)

/**
 * POST /api/scanner/process-ml-barcode
 * Procesar código de barras de ML
 */
router.post('/process-ml-barcode', 
  authenticateToken, 
  upload.single('image'), 
  ScannerController.processMLBarcode
)

/**
 * POST /api/scanner/finalize-session
 * Finalizar sesión de escaneo
 */
router.post('/finalize-session', authenticateToken, ScannerController.finalizeSession)

/**
 * GET /api/scanner/stats/:companyId?
 * Obtener estadísticas ML
 */

router.get('/stats/:companyId?', authenticateToken, ScannerController.getMLStats)

module.exports = router