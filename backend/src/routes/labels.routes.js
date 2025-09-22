// backend/src/routes/labels.routes.js

const express = require('express');
const router = express.Router();
const labelController = require('../controllers/label.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const PDFDocument = require('pdfkit');
const sanitize = require('sanitize-filename');
const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');
const QRCode = require('qrcode');

const Order = require('../models/Order');
// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Generar código enviGo para un pedido
router.post('/generate/:orderId', labelController.generateCode);

// Generar códigos para múltiples pedidos
router.post('/generate-bulk', labelController.generateBulkCodes);

// Marcar etiqueta como impresa
router.post('/mark-printed/:orderId', labelController.markPrinted);

// Buscar pedido por código (para repartidores)
router.get('/find/:code', labelController.findByCode);

// Obtener estadísticas de etiquetas
router.get('/stats', labelController.getStats);

router.post('/print-pdf/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate('company_id', 'name website')
      .populate('channel_id', 'store_url')
      .lean();

    if (!order || !order.envigo_label) {
      return res.status(404).json({ error: 'Pedido o etiqueta no encontrada' });
    }

    const doc = new PDFDocument({
      size: [283.5, 566.3], // 10x20 cm (más alto)
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `etiqueta-${sanitize(order.envigo_label.unique_code || order._id)}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    
    // Fondo limpio
    doc.rect(0, 0, pageW, pageH)
       .fillColor('#ffffff')
       .fill();

    // Borde perimetral
    doc.rect(8, 8, pageW - 16, pageH - 16)
       .lineWidth(0.5)
       .strokeColor('#e5e7eb')
       .stroke();

    const margin = 20;
    let y = 25;

    // Header
    drawCleanHeader(doc, order, margin, y, pageW - margin * 2);
    y += 50;

    // Código único
    drawCleanCode(doc, order, margin, y, pageW - margin * 2);
    y += 60;

    // Comuna
    drawCommune(doc, order, margin, y, pageW - margin * 2);
    y += 40;

    // Info del cliente con altura controlada
    const customerInfoHeight = drawCleanCustomerInfo(doc, order, margin, y, pageW - margin * 2);
    y += customerInfoHeight + 20;

    // QR Code con más espacio garantizado
    await drawFooterWithQRCode(doc, order, margin, y, pageW - margin * 2);

    doc.end();

  } catch (error) {
    console.error('Error generando etiqueta con QR:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF.' });
  }
});

// FUNCIÓN MEJORADA: Info del cliente con altura controlada
function drawCleanCustomerInfo(doc, order, x, y, width) {
  let currentY = y;
  const startY = y;
  
  // DESTINATARIO
  if (order.customer_name) {
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#6b7280')
       .text('DESTINATARIO', x, currentY);

    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#111827')
       .text(order.customer_name, x, currentY + 12, {
         width: width - 15,
         lineGap: 2
       });

    currentY += 35;
  }

  // DIRECCIÓN
  if (order.shipping_address) {
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#6b7280')
       .text('DIRECCIÓN', x, currentY);

    // Limitar altura del texto de dirección
    const addressLines = order.shipping_address.split(' ');
    let addressText = order.shipping_address;
    
    // Si la dirección es muy larga, cortarla
    if (addressLines.length > 8) {
      addressText = addressLines.slice(0, 8).join(' ') + '...';
    }

    doc.font('Helvetica')
       .fontSize(11)
       .fillColor('#111827')
       .text(addressText, x, currentY + 12, {
         width: width - 10,
         lineGap: 2,
         height: 40 // Limitar altura máxima
       });

    currentY += 55; // Altura fija para la dirección
  }

  // TELÉFONO
  if (order.customer_phone) {
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#6b7280')
       .text('TELÉFONO', x, currentY);

    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#111827')
       .text(order.customer_phone, x, currentY + 12);

    currentY += 30;
  }

  // Retornar la altura total usada
  return currentY - startY;
}

// FUNCIÓN MEJORADA: QR Code más compacto
async function drawFooterWithQRCode(doc, order, x, y, width) {
  try {
    // Formatear información para Circuit Route Planner
    const companyName = order.company_id?.name || 'Cliente';
    
    // Formato optimizado y más corto
    const circuitData = [
      order.customer_name || '',
      order.shipping_address || '',
      order.shipping_commune ? `${order.shipping_commune}, Chile` : 'Chile',
      order.customer_phone ? `Tel: ${order.customer_phone}` : '',
      `#${order.order_number}`,
      order.notes ? `Notas: ${order.notes.substring(0, 50)}${order.notes.length > 50 ? '...' : ''}` : ''
    ].filter(line => line.trim() !== '').join('\n');

    // Generar QR Code más pequeño
    const qrBuffer = await QRCode.toBuffer(circuitData, {
      type: 'png',
      width: 120,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    // Línea separadora
    doc.moveTo(x, y)
       .lineTo(x + width, y)
       .lineWidth(0.5)
       .strokeColor('#e5e7eb')
       .stroke();

    y += 10;

    // Título del QR
    doc.font('Helvetica-Bold')
       .fontSize(10)
       .fillColor('#374151')
       .text('QR para Circuit Route Planner', x, y, {
         width: width,
         align: 'center'
       });

    y += 20;

    // QR Code
    const qrSize = 80;
    const qrX = x + (width - qrSize) / 2;
    
    doc.image(qrBuffer, qrX, y, {
      width: qrSize,
      height: qrSize
    });

    // Código de seguimiento al lado del QR
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor('#111827')
       .text(order.envigo_label.unique_code, x, y + qrSize + 10, {
         width: width,
         align: 'center'
       });

    // Instrucción
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor('#6b7280')
       .text('Escanea con Circuit para agregar parada', x, y + qrSize + 30, {
         width: width,
         align: 'center'
       });

    // Website más abajo
    const website = order.company_id?.website || 'www.envigo.cl';
    doc.font('Helvetica')
       .fontSize(7)
       .fillColor('#9ca3af')
       .text(website.replace(/^https?:\/\//, ''), x, y + qrSize + 45, {
         width: width,
         align: 'center'
       });

    console.log(`✅ QR Code generado para: ${order.order_number}`);

  } catch (qrError) {
    console.error('❌ Error generando QR Code:', qrError);
    
    // Fallback simple
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor('#111827')
       .text(order.envigo_label.unique_code, x, y + 20, {
         width: width,
         align: 'center'
       });
  }
}

// FUNCIÓN MEJORADA: Comuna más compacta
function drawCommune(doc, order, x, y, width) {
  const commune = order.shipping_commune || 'SIN COMUNA';
  
  doc.rect(x, y - 2, width, 25)
     .fillColor('#f8fafc')
     .fill();

  doc.rect(x, y - 2, width, 25)
     .lineWidth(0.5)
     .strokeColor('#e2e8f0')
     .stroke();

  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#374151')
     .text(commune.toUpperCase(), x, y + 6, {
       width: width,
       align: 'center'
     });
}

// ==================== ETIQUETAS MASIVAS CON CÓDIGO DE BARRAS ====================
router.post('/print-bulk-pdf', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
    }

    const orders = await Order.find({ '_id': { $in: orderIds } })
      .populate('company_id', 'name website')
      .populate('channel_id', 'store_url')
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({ error: 'No se encontraron pedidos.' });
    }

    const doc = new PDFDocument({
      layout: 'portrait',
      size: [283.5, 566.3], // 10x20 cm (más alto)
      autoFirstPage: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=etiquetas-qr-${orders.length}.pdf`);
    doc.pipe(res);

    for (const order of orders) {
      if (!order.envigo_label) continue;

      doc.addPage();

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      
      // Fondo y borde
      doc.rect(0, 0, pageW, pageH).fillColor('#ffffff').fill();
      doc.rect(8, 8, pageW - 16, pageH - 16).lineWidth(0.5).strokeColor('#e5e7eb').stroke();

      const margin = 20;
      let y = 25;

      // Layout mejorado
      drawCleanHeader(doc, order, margin, y, pageW - margin * 2);
      y += 50;

      drawCleanCode(doc, order, margin, y, pageW - margin * 2);
      y += 60;

      drawCommune(doc, order, margin, y, pageW - margin * 2);
      y += 40;

      const customerInfoHeight = drawCleanCustomerInfo(doc, order, margin, y, pageW - margin * 2);
      y += customerInfoHeight + 20;

      await drawFooterWithQRCode(doc, order, margin, y, pageW - margin * 2);
    }

    doc.end();

  } catch (error) {
    console.error('Error generando etiquetas masivas:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});
// ==================== FUNCIONES AUXILIARES LIMPIAS ====================
function drawCleanHeader(doc, order, x, y, width) {
  const companyName = order.company_id?.name || 'ENVIGO';
  
  // Línea superior
  doc.moveTo(x, y)
     .lineTo(x + width, y)
     .lineWidth(1)
     .strokeColor('#374151')
     .stroke();

  y += 15;

  // Nombre de empresa
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor('#1f2937')
     .text(companyName.toUpperCase(), x, y);

  // Número de pedido
  const orderText = `#${order.order_number || '0000'}`;
  const orderWidth = doc.widthOfString(orderText);
  doc.font('Helvetica')
     .fontSize(12)
     .fillColor('#6b7280')
     .text(orderText, x + width - orderWidth, y + 3);

  // Línea separadora
  doc.moveTo(x, y + 25)
     .lineTo(x + width, y + 25)
     .lineWidth(0.5)
     .strokeColor('#d1d5db')
     .stroke();
}

function drawCleanCode(doc, order, x, y, width) {
  const code = order.envigo_label.unique_code;
  
  // Fondo sutil
  doc.rect(x, y, width, 40)
     .fillColor('#f9fafb')
     .fill();

  doc.rect(x, y, width, 40)
     .lineWidth(0.5)
     .strokeColor('#e5e7eb')
     .stroke();

  // Código principal
  doc.font('Helvetica-Bold')
     .fontSize(28)
     .fillColor('#111827')
     .text(code, x, y + 15, {
       width: width,
       align: 'center'
     });
}

function drawCleanCustomerInfo(doc, order, x, y, width) {
  let currentY = y;
  
  // DESTINATARIO
  if (order.customer_name) {
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#6b7280')
       .text('DESTINATARIO', x, currentY);

    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#111827')
       .text(order.customer_name, x, currentY + 12, {
         width: width - 15,
         lineGap: 2
       });

    currentY += 30; // Más espacio después del destinatario

    // Línea separadora
    doc.moveTo(x, currentY - 8)
       .lineTo(x + width, currentY - 8)
       .lineWidth(0.25)
       .strokeColor('#f3f4f6')
       .stroke();
  }

  // DIRECCIÓN - Más espacio
  if (order.shipping_address) {
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#6b7280')
       .text('DIRECCIÓN', x, currentY);

    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#111827')
       .text(order.shipping_address, x, currentY + 12, {
         width: width - 10,
         lineGap: 3
       });

    // Calcular altura del texto de dirección
    const addressHeight = doc.heightOfString(order.shipping_address, {
      width: width - 20
    });

    currentY += Math.max(50, addressHeight + 25); // Mucho más espacio para la dirección

    // Línea separadora más visible
    doc.moveTo(x, currentY - 8)
       .lineTo(x + width, currentY - 8)
       .lineWidth(0.5)
       .strokeColor('#e5e7eb')
       .stroke();
  }

  // TELÉFONO - Separado claramente
  if (order.customer_phone) {
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#6b7280')
       .text('TELÉFONO', x, currentY);

    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#111827')
       .text(order.customer_phone, x, currentY + 12, {
         width: width - 20,
         lineGap: 2
       });

    currentY += 35; // Espacio después del teléfono
  }

  // Comentarios especiales
  if (order.comment) {
    currentY += 10;
    
    // Línea separadora antes de comentarios
    doc.moveTo(x, currentY)
       .lineTo(x + width, currentY)
       .lineWidth(0.5)
       .strokeColor('#fca5a5')
       .stroke();
    
    currentY += 15;
    
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#dc2626')
       .text('⚠️ INSTRUCCIONES ESPECIALES', x, currentY);
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#dc2626')
       .text(order.comment, x, currentY + 12, {
         width: width - 20,
         lineGap: 2
       });
  }
}


router.get(
    '/proof/:orderId/download',
    authenticateToken, // Asumiendo que usas este middleware de autenticación
    labelController.downloadProofOfDelivery
);


module.exports = router;

