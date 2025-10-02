const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Order = require('../models/Order');
const Channel = require('../models/Channel');
const Tesseract = require('tesseract.js');
const multer = require('multer');

// Configuración de multer (sin cambios)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// ==================== OBTENER CLIENTES (CÓDIGO DE DIAGNÓSTICO) ====================
router.get('/clients', async (req, res) => {
  try {
    console.log('--- DIAGNÓSTICO EN EL ARCHIVO DE RUTA ---');
    console.log('Buscando TODAS las empresas sin ningún filtro...');

    // 1. Quitamos el filtro { status: 'active' } para traer todo
    const allClients = await Company.find({})
      .select('_id name email status') // Agregamos 'status' para poder verlo
      .sort({ name: 1 });

    console.log(`✅ Se encontraron ${allClients.length} empresas en total.`);
    
    // 2. Mostramos en el log lo que se encontró para poder revisarlo
    console.log('DATOS CRUDOS DE LAS EMPRESAS ENCONTRADAS:', allClients);

    // 3. Devolvemos la lista completa para la prueba
    res.json({
      success: true,
      data: allClients.map(c => ({
        id: c._id,
        name: c.name,
        email: c.email || '',
        // Mostramos el status para que sea visible en la respuesta de la API también
        status: c.status || 'SIN STATUS'
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes'
    });
  }
});


// ==================== PROCESAR ETIQUETA ML CON OCR ====================
// (El resto del archivo no necesita cambios, se mantiene igual)
router.post('/process-ml-label', upload.single('image'), async (req, res) => {
  // ... (toda tu lógica de procesamiento de etiquetas va aquí sin cambios)
  try {
    console.log('📸 Procesando etiqueta ML con OCR...')

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió imagen'
      })
    }

    if (!req.body.client_id) {
      return res.status(400).json({
        success: false,
        message: 'client_id es requerido'
      })
    }

    // Ejecutar OCR
    console.log('🔍 Ejecutando OCR sobre la imagen...')
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'spa+eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR: ${(m.progress * 100).toFixed(1)}%`)
          }
        }
      }
    )

    console.log('📝 Texto extraído del OCR')
    console.log('Primeros 200 caracteres:', text.substring(0, 200))

    // Extraer datos estructurados
    const extractedData = extractMLLabelData(text)
    console.log('📊 Datos extraídos:', extractedData)

    // Validar datos mínimos
    if (!extractedData.shipping_number || !extractedData.customer_name || !extractedData.address) {
      return res.json({
        success: true,
        data: {
          status: 'invalid',
          message: 'Datos incompletos en la etiqueta',
          extracted_data: extractedData,
          raw_text: text.substring(0, 500)
        }
      })
    }

    // Verificar duplicado
    const existingOrder = await Order.findOne({
      'ml_info.barcode': extractedData.shipping_number
    })

    if (existingOrder) {
      console.log('⚠️ Pedido duplicado')
      return res.json({
        success: true,
        data: {
          status: 'duplicate',
          shipping_number: extractedData.shipping_number,
          order_id: existingOrder._id,
          ...extractedData
        }
      })
    }

    // Buscar o crear canal ML para esta empresa
   // Buscar cualquier canal activo de la empresa
let mlChannel = await Channel.findOne({
  company_id: req.body.client_id,
  is_active: true
})

if (!mlChannel) {
  return res.status(400).json({
    success: false,
    message: 'La empresa no tiene canales activos configurados'
  })
}

console.log('✅ Usando canal:', mlChannel.channel_name)

    // Crear pedido
    const orderNumber = extractedData.shipping_number

    const newOrder = new Order({
      company_id: req.body.client_id,
      channel_id: mlChannel._id,
      external_order_id: extractedData.shipping_number || extractedData.sale_id,
      order_number: orderNumber,
      
      // Cliente
      customer_name: extractedData.customer_name,
      customer_phone: '',
      customer_email: '',
      
      // Dirección
      shipping_address: extractedData.address,
      shipping_commune: extractedData.commune || 'Por definir',
      shipping_city: 'Santiago',
      shipping_state: 'Región Metropolitana',
      
      // Montos
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
      
      // Fechas
      order_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    })

    await newOrder.save()

    console.log('✅ Pedido creado:', orderNumber)

    res.json({
      success: true,
      data: {
        status: 'created',
        order_id: newOrder._id,
        order_number: orderNumber,
        shipping_number: extractedData.shipping_number,
        customer_name: extractedData.customer_name,
        address: extractedData.address,
        commune: extractedData.commune,
        reference: extractedData.reference
      }
    })

  } catch (error) {
    console.error('❌ Error procesando etiqueta:', error)
    res.status(500).json({
      success: false,
      message: 'Error procesando etiqueta',
      error: error.message
    })
  }
});

// ==================== FUNCIONES DE EXTRACCIÓN ====================
// (Sin cambios)
function extractMLLabelData(text) {
  const data = {
    shipping_number: null,
    sale_id: null,
    customer_name: null,
    address: null,
    commune: null,
    reference: null
  }

  // Limpiar texto
  const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ')

  // 1. Buscar PRIMERO "Envío" o "Envio"
  let envioMatch = cleanText.match(/Env[ií]o\s*[:\s]+(\d{10,15})/i)
  
  // Si no encuentra "Envío", buscar "Pack ID"
  if (!envioMatch) {
    envioMatch = cleanText.match(/Pack\s*ID\s*[:\s]+(\d{10,20})/i)
  }
  
  if (envioMatch) {
    data.shipping_number = envioMatch[1]
  }

  // 2. Pack ID o Venta como sale_id
  const packMatch = cleanText.match(/Pack\s*ID\s*[:\s]+(\d{10,20})/i)
  if (packMatch) {
    data.sale_id = packMatch[1]
  } else {
    const ventaMatch = cleanText.match(/Venta\s*[:\s]+(\d{10,20})/i)
    if (ventaMatch) {
      data.sale_id = ventaMatch[1]
    }
  }

  // 3. Destinatario
  const destinatarioMatch = cleanText.match(/Destinatario\s*[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)/i)
  if (destinatarioMatch) {
    let name = destinatarioMatch[1].trim()
    name = name.replace(/\([^)]*\)/g, '').trim()
    data.customer_name = name
  }

  // 4. Dirección
  const direccionMatch = cleanText.match(/Direcci[oó]n\s*[:\s]+([^\n]+)/i)
  if (direccionMatch) {
    data.address = direccionMatch[1].trim()
  }

  // 5. Referencia
  const referenciaMatch = cleanText.match(/Referencia\s*[:\s]+([^\n]+)/i)
  if (referenciaMatch) {
    data.reference = referenciaMatch[1].trim()
  }

  // 6. Comuna
  const comunas = [
    'HUECHURABA', 'QUILICURA', 'RECOLETA', 'INDEPENDENCIA', 'CONCHALÍ', 'COLINA',
    'SANTIAGO', 'SANTIAGO CENTRO', 'ESTACIÓN CENTRAL', 'QUINTA NORMAL', 'PROVIDENCIA',
    'LAS CONDES', 'VITACURA', 'ÑUÑOA', 'LA REINA', 'PEÑALOLÉN', 'MACUL', 'LO BARNECHEA',
    'SAN MIGUEL', 'SAN JOAQUÍN', 'PEDRO AGUIRRE CERDA', 'LA CISTERNA', 'SAN RAMÓN',
    'LA GRANJA', 'EL BOSQUE', 'LO ESPEJO',
    'CERRILLOS', 'RENCA', 'CERRO NAVIA', 'PUDAHUEL', 'MAIPÚ', 'MAIPU',
    'LA FLORIDA', 'PUENTE ALTO', 'SAN BERNARDO', 'LA PINTANA', 'LO PRADO'
  ]

  const textUpper = text.toUpperCase()
  const comunasOrdenadas = comunas.sort((a, b) => b.length - a.length)
  
  for (const comuna of comunasOrdenadas) {
    if (textUpper.includes(comuna)) {
      data.commune = comuna.split(' ').map(w => 
        w.charAt(0) + w.slice(1).toLowerCase()
      ).join(' ')
      break
    }
  }

  return data
}


module.exports = router;