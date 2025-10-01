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

    // OCR
    console.log('🔍 Ejecutando OCR...');
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'spa+eng',
      {
        logger: m => console.log('OCR:', m.status, m.progress)
      }
    );

    console.log('📝 Texto extraído');

    // Extraer datos
    const extractedData = extractMLLabelData(text);
    console.log('📊 Datos extraídos:', extractedData);

    // Validar
    const validation = validateExtractedData(extractedData);
    if (!validation.isValid) {
      return res.json({
        success: true,
        data: {
          status: 'invalid',
          message: validation.message,
          extracted_data: extractedData
        }
      });
    }

    // Importar modelo
    const Order = require('../models/Order');

    // Verificar duplicado por shipping_number
    const existingOrder = await Order.findOne({
      'ml_info.barcode': extractedData.shipping_number
    });

    if (existingOrder) {
      console.log('⚠️ Pedido duplicado');
      return res.json({
        success: true,
        data: {
          status: 'duplicate',
          shipping_number: extractedData.shipping_number,
          order_id: existingOrder._id,
          ...extractedData
        }
      });
    }

    // Obtener o crear canal ML para esta empresa
    const Channel = require('../models/Channel');
    let mlChannel = await Channel.findOne({
      company_id: req.body.client_id,
      platform: 'mercadolibre'
    });

    if (!mlChannel) {
      mlChannel = new Channel({
        company_id: req.body.client_id,
        platform: 'mercadolibre',
        name: 'MercadoLibre Scanner',
        is_active: true,
        created_at: new Date()
      });
      await mlChannel.save();
      console.log('✅ Canal ML creado');
    }

    // Crear número de orden único
    const orderNumber = `ML${Date.now().toString().slice(-8)}`;

    // CREAR PEDIDO
    const newOrder = new Order({
      // Relaciones requeridas
      company_id: req.body.client_id,
      channel_id: mlChannel._id,
      
      // IDs requeridos
      external_order_id: extractedData.sale_id || extractedData.shipping_number,
      order_number: orderNumber,
      
      // Cliente (requerido)
      customer_name: extractedData.customer_name,
      customer_phone: extractedData.customer_phone || '',
      customer_email: '',
      
      // Dirección
      shipping_address: extractedData.address,
      shipping_commune: extractedData.commune || 'Por definir',
      shipping_city: 'Santiago',
      shipping_state: 'Región Metropolitana',
      
      // Montos (requerido total_amount)
      total_amount: 0,
      shipping_cost: 0,
      
      // Info ML
      ml_info: {
        barcode: extractedData.shipping_number,
        ml_id: extractedData.sale_id,
        tracking_code: extractedData.shipping_number,
        country: 'CL',
        parsed_data: extractedData
      },
      
      // Notas
      notes: extractedData.reference || '',
      delivery_notes: extractedData.reference || '',
      
      // Estado
      status: 'pending',
      platform: 'mercadolibre',
      source: 'ml_scanner',
      created_via_scanner: true,
      scanner_timestamp: new Date(),
      
      // Fechas (requerido order_date)
      order_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    await newOrder.save();

    console.log('✅ Pedido creado:', orderNumber);

    res.json({
      success: true,
      data: {
        status: 'created',
        order_id: newOrder._id,
        order_number: orderNumber,
        shipping_number: extractedData.shipping_number,
        customer_name: extractedData.customer_name,
        address: extractedData.address,
        commune: extractedData.commune
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Funciones de extracción (las que ya tienes)
function extractMLLabelData(text, comunas = []) {
  const data = {
    shipping_number: null,
    sale_id: null,
    customer_name: null,
    customer_phone: null,
    address: null,
    commune: null,
    reference: null,
    delivery_date: null,
    product: null
  };

  const envioMatch = text.match(/Env[ií]o[:\s]+(\d{10,15})/i);
  if (envioMatch) data.shipping_number = envioMatch[1];

  const ventaMatch = text.match(/Venta[:\s]+(\d{10,20})/i);
  if (ventaMatch) data.sale_id = ventaMatch[1];

  const destinatarioMatch = text.match(/Destinatario[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)*)/i);
  if (destinatarioMatch) data.customer_name = destinatarioMatch[1].trim();

  const direccionMatch = text.match(/Direcci[oó]n[:\s]+([^\n]+)/i);
  if (direccionMatch) data.address = direccionMatch[1].trim();

  const referenciaMatch = text.match(/Referencia[:\s]+([^\n]+)/i);
  if (referenciaMatch) data.reference = referenciaMatch[1].trim();

  // Lista completa de comunas de Santiago
  const TODAS_LAS_COMUNAS = [
    // Zona Norte
    'HUECHURABA', 'QUILICURA', 'RECOLETA', 'INDEPENDENCIA', 'CONCHALÍ', 'COLINA',
    // Zona Centro
    'SANTIAGO', 'SANTIAGO CENTRO', 'ESTACIÓN CENTRAL', 'QUINTA NORMAL', 'PROVIDENCIA',
    // Zona Oriente
    'LAS CONDES', 'VITACURA', 'ÑUÑOA', 'LA REINA', 'PEÑALOLÉN', 'MACUL', 'LO BARNECHEA',
    // Zona Sur
    'SAN MIGUEL', 'SAN JOAQUÍN', 'PEDRO AGUIRRE CERDA', 'LA CISTERNA', 'SAN RAMÓN', 
    'LA GRANJA', 'EL BOSQUE', 'LO ESPEJO',
    // Zona Poniente
    'CERRILLOS', 'RENCA', 'CERRO NAVIA', 'PUDAHUEL', 'MAIPÚ', 'MAIPU',
    // Zona Sur-Oriente
    'LA FLORIDA', 'PUENTE ALTO', 'SAN BERNARDO', 'LA PINTANA', 'LO PRADO'
  ];

  const textUpper = text.toUpperCase();
  
  // Buscar comuna (ordenar por longitud descendente para evitar falsos positivos)
  const comunasOrdenadas = TODAS_LAS_COMUNAS.sort((a, b) => b.length - a.length);
  
  for (const comuna of comunasOrdenadas) {
    if (textUpper.includes(comuna)) {
      // Formatear nombre: Primera letra mayúscula, resto minúscula
      data.commune = comuna.split(' ').map(w => 
        w.charAt(0) + w.slice(1).toLowerCase()
      ).join(' ');
      break;
    }
  }

  return data;
}

function validateExtractedData(data) {
  const required = ['shipping_number', 'customer_name', 'address'];
  const missing = required.filter(f => !data[f]);

  if (missing.length > 0) {
    return {  
      isValid: false,
      message: `Faltan: ${missing.join(', ')}`
    };
  }

  return { isValid: true };
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