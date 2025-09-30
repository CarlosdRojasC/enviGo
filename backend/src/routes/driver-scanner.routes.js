const express = require('express')
const router = express.Router()
const Company = require('../models/Company')
const Tesseract = require('tesseract.js');
const multer = require('multer');


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

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
      'spa+eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR: ${m.status} ${(m.progress * 100).toFixed(1)}%`);
          }
        }
      }
    );

    console.log('📝 Texto extraído del OCR');

    // Extraer datos estructurados
    const extractedData = extractMLLabelData(text);
    console.log('📊 Datos extraídos:', extractedData);

    // Validar datos
    const validation = validateExtractedData(extractedData);
    
    if (!validation.isValid) {
      return res.json({
        success: true,
        data: {
          status: 'invalid',
          message: validation.message,
          raw_text: text,
          extracted_data: extractedData
        }
      });
    }

    // Verificar si ya existe (simulado por ahora - ajusta según tu modelo Order)
    // const existingOrder = await Order.findOne({ shipping_number: extractedData.shipping_number });
    // if (existingOrder) { ... }

    // Por ahora retornar datos extraídos
    res.json({
      success: true,
      data: {
        status: 'created',
        shipping_number: extractedData.shipping_number,
        customer_name: extractedData.customer_name,
        address: extractedData.address,
        commune: extractedData.commune,
        reference: extractedData.reference,
        sale_id: extractedData.sale_id,
        product: extractedData.product,
        delivery_date: extractedData.delivery_date,
        raw_text: text // Para debugging
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

// ==================== FUNCIONES DE EXTRACCIÓN ====================

function extractMLLabelData(text) {
  const data = {
    shipping_number: null,
    sale_id: null,
    customer_name: null,
    address: null,
    commune: null,
    reference: null,
    delivery_date: null,
    product: null
  };

  // 1. Número de envío
  const envioMatch = text.match(/Env[ií]o[:\s]+(\d{10,15})/i);
  if (envioMatch) {
    data.shipping_number = envioMatch[1];
  }

  // 2. ID de venta
  const ventaMatch = text.match(/Venta[:\s]+(\d{10,20})/i);
  if (ventaMatch) {
    data.sale_id = ventaMatch[1];
  }

  // 3. Nombre del destinatario
  const destinatarioMatch = text.match(/Destinatario[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)*)/i);
  if (destinatarioMatch) {
    data.customer_name = destinatarioMatch[1].trim();
  }

  // 4. Dirección
  const direccionMatch = text.match(/Direcci[oó]n[:\s]+([^\n]+)/i);
  if (direccionMatch) {
    data.address = direccionMatch[1].trim();
  }

  // 5. Referencia
  const referenciaMatch = text.match(/Referencia[:\s]+([^\n]+)/i);
  if (referenciaMatch) {
    data.reference = referenciaMatch[1].trim();
  }

  // 6. Comuna
  const comunas = [
    'CERRO NAVIA', 'LA FLORIDA', 'MAIPÚ', 'PUENTE ALTO', 'LAS CONDES',
    'PROVIDENCIA', 'SANTIAGO', 'ÑUÑOA', 'LA REINA', 'PEÑALOLÉN',
    'MACUL', 'SAN MIGUEL', 'LA CISTERNA', 'EL BOSQUE', 'SAN BERNARDO',
    'QUILICURA', 'RENCA', 'CONCHALÍ', 'INDEPENDENCIA', 'RECOLETA',
    'VITACURA', 'LO BARNECHEA', 'COLINA', 'LAMPA', 'PUDAHUEL',
    'ESTACIÓN CENTRAL', 'QUINTA NORMAL', 'LO PRADO', 'PAC', 'SAN JOAQUÍN'
  ];

  const textUpper = text.toUpperCase();
  for (const comuna of comunas) {
    if (textUpper.includes(comuna)) {
      data.commune = comuna.split(' ').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ');
      break;
    }
  }

  // 7. Fecha de entrega
  const fechaMatch = text.match(/Entrega[:\s]+(\d{1,2}[-/]\w{3})/i);
  if (fechaMatch) {
    data.delivery_date = fechaMatch[1];
  }

  // 8. Producto (buscar después de SKU o nombre del vendedor)
  const productoMatch = text.match(/(?:SKU|Producto)[:\s]+([^\n]+)/i);
  if (productoMatch) {
    data.product = productoMatch[1].trim();
  }

  return data;
}

function validateExtractedData(data) {
  const requiredFields = ['shipping_number', 'customer_name', 'address'];
  const missingFields = requiredFields.filter(field => !data[field]);

  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `Faltan campos: ${missingFields.join(', ')}`
    };
  }

  return {
    isValid: true,
    message: 'Datos válidos'
  };
}
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