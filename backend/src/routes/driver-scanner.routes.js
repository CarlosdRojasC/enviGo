const express = require('express')
const router = express.Router()
const Order = require('../models/Order')
const Company = require('../models/Company')
const Channel = require('../models/Channel')
const Tesseract = require('tesseract.js')
const multer = require('multer')

// Configurar multer para recibir imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes'))
    }
  }
})

// Middleware de autenticación simple (opcional - puedes quitarlo si no lo necesitas)
const authenticateDriver = (req, res, next) => {
  // Por ahora sin autenticación, pero puedes agregar token si quieres
  next()
}

// ==================== OBTENER CLIENTES ====================
router.get('/clients', async (req, res) => {
  try {
    console.log('📋 Obteniendo clientes para scanner...')

    const clients = await Company.find({ status: 'active' })
      .select('_id name email phone')
      .sort({ name: 1 })
      .limit(50)

    console.log(`✅ ${clients.length} clientes encontrados`)

    res.json({
      success: true,
      data: clients.map(c => ({
        id: c._id,
        name: c.name,
        email: c.email || '',
        phone: c.phone || ''
      }))
    })
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes'
    })
  }
})

// ==================== PROCESAR ETIQUETA ML CON OCR ====================
router.post('/process-ml-label', upload.single('image'), async (req, res) => {
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
    let mlChannel = await Channel.findOne({
      company_id: req.body.client_id,
      platform: 'mercadolibre'
    })

    if (!mlChannel) {
      mlChannel = new Channel({
        company_id: req.body.client_id,
        platform: 'mercadolibre',
        name: 'MercadoLibre Scanner',
        is_active: true,
        created_at: new Date()
      })
      await mlChannel.save()
      console.log('✅ Canal ML creado')
    }

    // Crear pedido
    const orderNumber = `ML${Date.now().toString().slice(-8)}`
    
    const newOrder = new Order({
      company_id: req.body.client_id,
      channel_id: mlChannel._id,
      external_order_id: extractedData.sale_id || extractedData.shipping_number,
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
})

// ==================== FUNCIONES DE EXTRACCIÓN ====================

function extractMLLabelData(text) {
  const data = {
    shipping_number: null,
    sale_id: null,
    customer_name: null,
    address: null,
    commune: null,
    reference: null
  }

  // 1. Número de envío
  const envioMatch = text.match(/Env[ií]o[:\s]+(\d{10,15})/i)
  if (envioMatch) data.shipping_number = envioMatch[1]

  // 2. ID de venta
  const ventaMatch = text.match(/Venta[:\s]+(\d{10,20})/i)
  if (ventaMatch) data.sale_id = ventaMatch[1]

  // 3. Nombre del destinatario
  const destinatarioMatch = text.match(/Destinatario[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+)*)/i)
  if (destinatarioMatch) data.customer_name = destinatarioMatch[1].trim()

  // 4. Dirección
  const direccionMatch = text.match(/Direcci[oó]n[:\s]+([^\n]+)/i)
  if (direccionMatch) data.address = direccionMatch[1].trim()

  // 5. Referencia
  const referenciaMatch = text.match(/Referencia[:\s]+([^\n]+)/i)
  if (referenciaMatch) data.reference = referenciaMatch[1].trim()

  // 6. Comuna - Lista completa
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

module.exports = router