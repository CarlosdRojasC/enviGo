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
  try {
    console.log('📸 Procesando etiqueta ML con OCR...');

    if (!req.file || !req.body.client_id) {
      return res.status(400).json({ success: false, message: 'Faltan datos (imagen o client_id)' });
    }

    // 1. Ejecutar OCR y extraer datos (sin cambios)
    console.log('🔍 Ejecutando OCR...');
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'spa+eng');
    const extractedData = extractMLLabelData(text);
    console.log('📊 Datos extraídos:', extractedData);

    if (!extractedData.shipping_number || !extractedData.customer_name) {
      return res.json({
        success: true,
        data: { status: 'invalid', message: 'Datos incompletos en la etiqueta', ...extractedData }
      });
    }

    // 2. Buscar el canal activo de la empresa
    const mlChannel = await Channel.findOne({
      company_id: req.body.client_id,
      is_active: true
    });

    if (!mlChannel) {
      return res.status(404).json({ success: false, message: 'La empresa no tiene un canal activo' });
    }
    console.log('✅ Usando canal:', mlChannel.name);

    // 3. ✨ VERIFICACIÓN DE DUPLICADOS MEJORADA ✨
    //    Buscamos usando la misma combinación de la regla de la base de datos.
    const uniqueExternalId = extractedData.shipping_number || extractedData.sale_id;
    
    const existingOrder = await Order.findOne({
      channel_id: mlChannel._id,
      external_order_id: uniqueExternalId
    });

    if (existingOrder) {
      console.log('⚠️ Pedido duplicado encontrado por channel_id y external_order_id.');
      return res.json({
        success: true,
        data: {
          status: 'duplicate',
          message: 'Este pedido ya fue ingresado al sistema.',
          order_id: existingOrder._id,
          ...extractedData
        }
      });
    }

    // 4. Crear el nuevo pedido (si no se encontró un duplicado)
    const newOrder = new Order({
      company_id: req.body.client_id,
      channel_id: mlChannel._id,
      external_order_id: uniqueExternalId, // Usamos el ID único
      order_number: extractedData.shipping_number, // El número de envío como número de orden
      customer_name: extractedData.customer_name,
      shipping_address: extractedData.address,
      shipping_commune: extractedData.commune || 'Por definir',
      shipping_city: 'Santiago',
      notes: extractedData.reference || '',
      delivery_notes: extractedData.reference || '',
      ml_info: {
        barcode: extractedData.shipping_number,
        ml_id: extractedData.sale_id,
        tracking_code: extractedData.shipping_number,
        parsed_data: extractedData
      },
      status: 'pending',
      source: 'ml_scanner',
      created_via_scanner: true,
      scanner_timestamp: new Date(),
      order_date: new Date()
      // ... otros campos de tu modelo Order
    });

    await newOrder.save();
    console.log('✅ Pedido creado exitosamente:', newOrder.order_number);

    res.json({
      success: true,
      data: {
        status: 'created',
        order_id: newOrder._id,
        ...extractedData
      }
    });

  } catch (error) {
    // Si AÚN ocurre un error de duplicado (ej. dos personas escanean al mismo tiempo),
    // lo manejamos elegantemente en lugar de crashear.
    if (error.code === 11000) {
      console.log('⚠️ Error de duplicado durante la creación (carrera de condiciones).');
      return res.json({
        success: true,
        data: {
          status: 'duplicate',
          message: 'Pedido duplicado (detectado en creación).'
        }
      });
    }
    console.error('❌ Error grave procesando etiqueta:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
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
  };

  // 1. EXTRAER DATOS PRINCIPALES
  // Se usa el texto con saltos de línea para algunas búsquedas y texto limpio para otras.
  const cleanText = text.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Número de envío y Venta (más robusto)
  data.shipping_number = (cleanText.match(/Env[ií]o\s*[:\s]\s*(\d{10,15})/i) || cleanText.match(/Pack\s*ID\s*[:\s]\s*(\d{10,20})/i) || [])[1] || null;
  data.sale_id = (cleanText.match(/Venta\s*[:\s]\s*(\d{10,20})/i) || cleanText.match(/Pack\s*ID\s*[:\s]\s*(\d{10,20})/i) || [])[1] || null;

  // Destinatario, Dirección y Referencia (con límites para no capturar de más)
  const destinatarioMatch = cleanText.match(/Destinatario\s*[:\s](.+?)(?=\s*\(|Direcci[oó]n:|Venta:|$)/i);
  if (destinatarioMatch) data.customer_name = destinatarioMatch[1].trim();

  const direccionMatch = text.match(/Direcci[oó]n\s*[:\s]([^\n]+)/i);
  if (direccionMatch) data.address = direccionMatch[1].trim();

  const referenciaMatch = text.match(/Referencia\s*[:\s]([^\n]+)/i);
  if (referenciaMatch) data.reference = referenciaMatch[1].trim();


  // 2. LÓGICA INTELIGENTE PARA ENCONTRAR LA COMUNA CORRECTA
  const comunas = [
    'HUECHURABA', 'QUILICURA', 'RECOLETA', 'INDEPENDENCIA', 'CONCHALÍ', 'COLINA',
    'SANTIAGO', 'SANTIAGO CENTRO', 'ESTACIÓN CENTRAL', 'QUINTA NORMAL', 'PROVIDENCIA',
    'LAS CONDES', 'VITACURA', 'ÑUÑOA', 'LA REINA', 'PEÑALOLÉN', 'MACUL', 'LO BARNECHEA',
    'SAN MIGUEL', 'SAN JOAQUÍN', 'PEDRO AGUIRRE CERDA', 'LA CISTERNA', 'SAN RAMÓN',
    'LA GRANJA', 'EL BOSQUE', 'LO ESPEJO', 'CERRILLOS', 'RENCA', 'CERRO NAVIA', 
    'PUDAHUEL', 'MAIPÚ', 'MAIPU', 'LA FLORIDA', 'PUENTE ALTO', 'SAN BERNARDO', 
    'LA PINTANA', 'LO PRADO'
  ];

  // Se busca la comuna en el bloque de texto del destinatario para evitar confusiones.
  const lines = text.toUpperCase().split('\n');
  const recipientLineIndex = lines.findIndex(line => line.includes('DESTINATARIO'));
  
  let searchBlock = text.toUpperCase(); // Fallback por si no encuentra "DESTINATARIO"
  if (recipientLineIndex !== -1) {
    // Definimos el área de búsqueda como las 6 líneas ANTERIORES a la del destinatario.
    const startIndex = Math.max(0, recipientLineIndex - 6);
    searchBlock = lines.slice(startIndex, recipientLineIndex + 1).join(' ');
  }

  // Se ordenan las comunas de más larga a más corta para evitar falsos positivos (ej: "Lo Prado" antes que "Prado").
  const comunasOrdenadas = comunas.sort((a, b) => b.length - a.length);
  for (const comuna of comunasOrdenadas) {
    if (searchBlock.includes(comuna)) {
      data.commune = comuna.charAt(0) + comuna.slice(1).toLowerCase();
      // Si la comuna tiene varias palabras (ej: Puente Alto), se capitalizan ambas.
      if (data.commune.includes(' ')) {
        data.commune = data.commune.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      break; 
    }
  }

  // 3. LIMPIEZA FINAL
  const capitalize = (str) => str ? str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : null;
  data.customer_name = capitalize(data.customer_name);
  if (data.address && data.commune) {
    data.address = data.address.replace(new RegExp(data.commune, 'i'), '').replace(/,|\|/g, '').trim();
  }
  if (data.reference) data.reference = data.reference.replace(/\|/g, '').trim();

  return data;
}


module.exports = router;