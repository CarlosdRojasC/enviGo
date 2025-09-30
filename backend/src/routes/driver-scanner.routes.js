const express = require('express')
const router = express.Router()
const Company = require('../models/Company')
const Tesseract = require('tesseract.js');

// ==================== RUTA PARA OBTENER CLIENTES (SIN AUTENTICACIÓN) ====================

/**
 * GET /api/scanner/clients
 * Obtener clientes disponibles para escaneo (SIN autenticación de enviGo)
 */
router.get('/clients', async (req, res) => {
  try {
    console.log('📋 Scanner: Obteniendo clientes...')

    // Obtener todas las empresas activas
    const clients = await Company.find({
      // is_active: true  // Si tienes este campo, úsalo
      status: 'active'  // O si usas 'status'
    })
    .select('_id name email phone address type')
    .sort({ name: 1 })
    .limit(50)

    console.log(`✅ Scanner: ${clients.length} clientes encontrados`)

    res.json({
      success: true,
      data: clients.map(client => ({
        id: client._id,
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        type: client.type || 'Cliente'
      }))
    })

  } catch (error) {
    console.error('❌ Scanner: Error obteniendo clientes:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo lista de clientes'
    })
  }
})

router.post('/process-ml-label', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Scanner: Procesando etiqueta ML con OCR...');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió imagen'
      });
    }

    if (!req.body.client_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente requerido'
      });
    }

    // Procesar imagen con Tesseract OCR
    console.log('🔍 Ejecutando OCR...');
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'spa+eng', // Español + Inglés
      {
        logger: m => console.log('OCR:', m.status, m.progress)
      }
    );

    console.log('📝 Texto extraído:', text);

    // Por ahora, devolver texto extraído (luego lo parseamos)
    res.json({
      success: true,
      data: {
        status: 'created',
        shipping_number: 'TEST-123456',
        customer_name: 'Cliente de prueba',
        commune: 'Santiago',
        raw_text: text,
        message: 'OCR procesado exitosamente'
      }
    });

  } catch (error) {
    console.error('❌ Error procesando etiqueta ML:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando etiqueta',
      error: error.message
    });
  }
});
/**
 * GET /api/driver-scanner/public-clients
 * Obtener clientes SIN autenticación (para el scanner web)
 */
router.get('/public-clients', async (req, res) => {
  try {
    console.log('📋 Scanner Público: Obteniendo clientes...');

    const clients = await Company.find({
      // Ajusta según tu modelo de Company:
      // status: 'active'     // Si usas campo 'status'
      // is_active: true      // Si usas campo 'is_active'
    })
    .select('_id name email phone address')
    .sort({ name: 1 })
    .limit(50);

    console.log(`✅ Scanner Público: ${clients.length} clientes encontrados`);

    res.json({
      success: true,
      data: clients.map(client => ({
        id: client._id,
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        type: 'Cliente'
      }))
    });

  } catch (error) {
    console.error('❌ Scanner Público: Error obteniendo clientes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error obteniendo lista de clientes' 
    });
  }
});

/**
 * GET /api/driver-scanner/public-test
 * Ruta de test pública
 */
router.get('/public-test', (req, res) => {
  console.log('🧪 Scanner Público: Test accedido');
  res.json({
    success: true,
    message: 'Scanner público funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ==================== RUTA TEMPORAL PARA TESTING ====================

/**
 * GET /api/scanner/test
 * Ruta de prueba para verificar que el scanner funciona
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Scanner backend funcionando correctamente',
    timestamp: new Date().toISOString()
  })
})

module.exports = router