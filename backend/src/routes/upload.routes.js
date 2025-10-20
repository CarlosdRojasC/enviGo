// backend/src/routes/upload.routes.js (crear este archivo)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo por archivo
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

/**
 * POST /api/upload/delivery-photos
 * Sube fotos de entrega del conductor a Cloudinary
 */
router.post('/delivery-photos', [
  authenticateToken,
  authorizeRoles(['driver', 'admin', 'manager'])
], async (req, res) => {
  try {
    const { photos, orderId } = req.body;
    
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere al menos una foto'
      });
    }

    if (photos.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Máximo 5 fotos permitidas'
      });
    }

    const uploadedPhotos = [];
    
    // Subir cada foto a Cloudinary
    for (let i = 0; i < photos.length; i++) {
      try {
        console.log(`📸 Subiendo foto ${i + 1}/${photos.length} del conductor...`);
        
        const photoResult = await CloudinaryService.uploadProofImage(
          photos[i], 
          orderId || 'driver_delivery', 
          `driver_photo_${i + 1}`
        );
        
        uploadedPhotos.push({
          url: photoResult.url,
          public_id: photoResult.public_id,
          format: photoResult.format,
          width: photoResult.width,
          height: photoResult.height,
          bytes: photoResult.bytes
        });
        
        console.log(`✅ Foto ${i + 1} subida: ${photoResult.url}`);
      } catch (error) {
        console.error(`❌ Error subiendo foto ${i + 1}:`, error);
        return res.status(500).json({ 
          success: false,
          error: `Error al subir la foto ${i + 1}`,
          details: error.message 
        });
      }
    }

    res.json({
      success: true,
      message: `${uploadedPhotos.length} fotos subidas correctamente`,
      data: {
        photos: uploadedPhotos,
        count: uploadedPhotos.length
      }
    });

  } catch (error) {
    console.error('❌ Error en endpoint de subida de fotos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * DELETE /api/upload/delete-photo
 * Elimina una foto de Cloudinary
 */
router.delete('/delete-photo', [
  authenticateToken,
  authorizeRoles(['driver', 'admin', 'manager'])
], async (req, res) => {
  try {
    const { public_id } = req.body;
    
    if (!public_id) {
      return res.status(400).json({
        success: false,
        error: 'public_id requerido'
      });
    }

    console.log(`🗑️ Eliminando foto de Cloudinary: ${public_id}`);
    
    const result = await CloudinaryService.deleteImage(public_id);
    
    res.json({
      success: true,
      message: 'Foto eliminada correctamente',
      data: result
    });

  } catch (error) {
    console.error('❌ Error eliminando foto:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando foto',
      details: error.message
    });
  }
});

module.exports = router;