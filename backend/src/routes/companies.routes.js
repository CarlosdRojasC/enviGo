const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const channelController = require('../controllers/channel.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });
const { uploadLogo } = require('../controllers/company.controller');

// ==================== RUTAS DE EMPRESAS ====================

// Listar todas las empresas (solo admin)
router.get('/', authenticateToken, isAdmin, companyController.getAll);

// Crear nueva empresa (solo admin)
router.post('/', authenticateToken, isAdmin, companyController.create);

// Actualizar precio de empresa (solo admin)
router.patch('/:id/price', authenticateToken, isAdmin, validateMongoId('id'), companyController.updatePrice);

// Obtener empresa específica
router.get('/:id', authenticateToken, validateMongoId('id'), companyController.getById);

// Actualizar empresa
router.put('/:id', authenticateToken, validateMongoId('id'), companyController.update);

// Obtener usuarios de una empresa
router.get('/:id/users', authenticateToken, validateMongoId('id'), companyController.getUsers);

// Obtener estadísticas de una empresa
router.get('/:id/stats', authenticateToken, validateMongoId('id'), companyController.getStats);

// ==================== CANALES DE VENTA ANIDADOS ====================
router.get('/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.getByCompany);
router.post('/:companyId/channels', authenticateToken, validateMongoId('companyId'), channelController.create);

router.post('/:id/logo', upload.single('logo'), uploadLogo);

router.post('/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error: 'No se subió imagen' });

    res.json({ logo_url: req.file.path });
  } catch (err) {
    console.error('Error subiendo logo:', err);
    res.status(500).json({ error: 'Error al subir logo' });
  }
});
module.exports = router;