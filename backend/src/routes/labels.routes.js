// backend/src/routes/labels.routes.js - Versión final optimizada con QR más pequeño

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

// Rutas existentes (sin cambios)
router.post('/generate/:orderId', labelController.generateCode);
router.post('/generate-bulk', labelController.generateBulkCodes);
router.post('/mark-printed/:orderId', labelController.markPrinted);
router.get('/find/:code', labelController.findByCode);
router.get('/stats', labelController.getStats);

// 🔧 Función OPTIMIZADA: QR más pequeño pero legible
async function generateQRCode(text, size = 80) {
  try {
    const qrBuffer = await QRCode.toBuffer(text, {
      width: size,
      margin: 2, // Margen reducido
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M', // Nivel medio es suficiente
      type: 'png',
      quality: 1.0,
      scale: 6 // Escala reducida pero suficiente
    });
    return qrBuffer;
  } catch (error) {
    console.error('Error generando QR:', error);
    return null;
  }
}

// 🔧 Header COMPACTO con mejor distribución
function drawCompactHeader(doc, order, x, y, width) {
  const companyName = order.company_id?.name || order.company_name || 'enviGo';
  const uniqueCode = order.envigo_label?.unique_code || order._id.toString().slice(-6);

  // Nombre de la empresa (más pequeño)
  doc.font('Helvetica-Bold')
     .fontSize(13) // Reducido de 16 a 13
     .fillColor('#111827')
     .text(companyName, x, y, {
       width: width * 0.65,
       align: 'left'
     });

  // Código único a la derecha
  doc.font('Helvetica-Bold')
     .fontSize(11) // Reducido de 18 a 11
     .fillColor('#dc2626')
     .text(`Pedido: ${uniqueCode}`, x + width * 0.35, y, {
       width: width * 0.65,
       align: 'right'
     });

  // Línea divisoria más fina
  doc.moveTo(x, y + 22) // Más arriba
     .lineTo(x + width, y + 22)
     .lineWidth(0.5) // Más fina
     .strokeColor('#d1d5db')
     .stroke();
}

// 🔧 Comuna MÁS COMPACTA
function drawCompactCommune(doc, order, x, y, width) {
  const commune = order.shipping_commune || 'SIN COMUNA';
  
  // Rectángulo más pequeño
  const rectHeight = 28; // Reducido de 35 a 28
  doc.rect(x, y, width, rectHeight)
     .fillColor('#f8fafc')
     .fill();

  doc.rect(x, y, width, rectHeight)
     .lineWidth(1)
     .strokeColor('#e2e8f0')
     .stroke();

  doc.font('Helvetica-Bold')
     .fontSize(15) // Reducido de 18 a 15
     .fillColor('#1f2937')
     .text(commune.toUpperCase(), x, y + 6, { // Ajustado centrado
       width: width,
       align: 'center'
     });
}

// 🔧 Info cliente MÁS COMPACTA
function drawCompactCustomerInfo(doc, order, x, y, width) {
  const lineHeight = 16; // Reducido de 22 a 16
  let currentY = y;

  function addField(label, value, fontSize = 10) { // Reducido de 12 a 10
    if (!value || value === '') return;
    
    doc.font('Helvetica-Bold')
       .fontSize(fontSize)
       .fillColor('#374151')
       .text(`${label}:`, x, currentY);
    
    doc.font('Helvetica')
       .fontSize(fontSize)
       .fillColor('#111827')
       .text(value, x + 60, currentY, { // Reducido de 80 a 60
         width: width - 60,
         lineGap: 1
       });
    
    currentY += lineHeight;
  }

  addField('Cliente', order.customer_name, 11); // Ligeramente más grande para legibilidad
  addField('Teléfono', order.customer_phone, 10);
  addField('Dirección', order.shipping_address, 10);
  
  if (order.comment && order.comment.trim()) {
    currentY += 3; // Reducido espaciado
    addField('Comentario', order.comment, 9);
  }
}

// 🔧 QR Code OPTIMIZADO - Tamaño perfecto
function drawOptimizedQRCode(doc, order, qrBuffer, x, y, width) {
  if (!qrBuffer) return;

  // QR tamaño óptimo: ni muy grande ni muy pequeño
  const qrSize = 75; // Reducido de 120 a 75px
  const qrX = x + (width - qrSize) / 2;
  
  // Fondo blanco para el QR (mejor contraste)
  doc.rect(qrX - 3, y + 10, qrSize + 6, qrSize + 6)
     .fillColor('#ffffff')
     .fill();

  // Borde sutil alrededor del QR
  doc.rect(qrX - 3, y + 10, qrSize + 6, qrSize + 6)
     .lineWidth(0.5)
     .strokeColor('#e5e7eb')
     .stroke();

  // Título del QR más pequeño
  doc.font('Helvetica-Bold')
     .fontSize(10) // Reducido de 12 a 10
     .fillColor('#374151')
     .text('CÓDIGO QR PARA RECOGIDA', x, y, {
       width: width,
       align: 'center'
     });

  // Insertar el QR
  doc.image(qrBuffer, qrX, y + 13, { 
    width: qrSize, 
    height: qrSize 
  });

  // Order number debajo del QR
  const displayCode = order.order_number || 'Sin código';
  doc.font('Helvetica-Bold')
     .fontSize(12) // Reducido de 16 a 12
     .fillColor('#1f2937')
     .text(displayCode, x, y + 13 + qrSize + 8, {
       width: width,
       align: 'center'
     });

  // Instrucciones más compactas
  doc.font('Helvetica')
     .fontSize(8) // Reducido de 9 a 8
     .fillColor('#6b7280')
     .text('Escanear con la app del conductor', x, y + 13 + qrSize + 28, {
       width: width,
       align: 'center'
     });
}

// 🔧 Footer COMPACTO
function drawCompactFooter(doc, order, x, y, width) {
  doc.moveTo(x, y)
     .lineTo(x + width, y)
     .lineWidth(0.5)
     .strokeColor('#e5e7eb')
     .stroke();

  doc.font('Helvetica-Bold')
     .fontSize(11) // Reducido de 14 a 11
     .fillColor('#374151')
     .text('¡Gracias por tu confianza!', x, y + 12, {
       width: width,
       align: 'center'
     });

  const website = order.company_id?.website || 
                 order.channel_id?.store_url || 
                 'www.envigo.cl';

  doc.font('Helvetica')
     .fontSize(8) // Reducido de 10 a 8
     .fillColor('#9ca3af')
     .text(website.replace(/^https?:\/\//, ''), x, y + 28, {
       width: width,
       align: 'center'
     });
}

// 🚀 ENDPOINT OPTIMIZADO: PDF individual con todo en una página
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

    // QR contiene SOLO el order_number
    const qrText = order.order_number;
    
    if (!qrText) {
      return res.status(400).json({ error: 'El pedido no tiene order_number' });
    }

    console.log(`📱 Generando QR optimizado para order_number: ${qrText}`);

    // QR tamaño óptimo
    const qrBuffer = await generateQRCode(qrText, 100);

    const doc = new PDFDocument({
      size: [283.5, 425.25], // 10x15 cm exacto
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `etiqueta-${sanitize(order.order_number || order._id)}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    
    // Fondo limpio
    doc.rect(0, 0, pageW, pageH)
       .fillColor('#ffffff')
       .fill();

    // Borde perimetral más fino
    doc.rect(6, 6, pageW - 12, pageH - 12)
       .lineWidth(0.5)
       .strokeColor('#e5e7eb')
       .stroke();

    const margin = 16; // Reducido de 20 a 16
    let y = 18; // Reducido de 25 a 18

    // 📍 Header compacto
    drawCompactHeader(doc, order, margin, y, pageW - margin * 2);
    y += 35; // Reducido de 70 a 35

    // 🏘️ Comuna compacta
    drawCompactCommune(doc, order, margin, y, pageW - margin * 2);
    y += 38; // Reducido de 45 a 38

    // 👤 Info cliente compacta
    drawCompactCustomerInfo(doc, order, margin, y, pageW - margin * 2);
    y += 70; // Reducido de 90 a 70

    // 📱 QR CODE optimizado
    drawOptimizedQRCode(doc, order, qrBuffer, margin, y, pageW - margin * 2);
    
    // 🙏 Footer compacto en la parte inferior
    drawCompactFooter(doc, order, margin, pageH - 50, pageW - margin * 2);

    doc.end();

  } catch (error) {
    console.error('Error generando etiqueta optimizada:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF.' });
  }
});

// 🚀 ENDPOINT OPTIMIZADO: PDF masivo con etiquetas compactas
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
      size: [283.5, 425.25], // 10x15 cm
      autoFirstPage: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=etiquetas-optimizadas-bulk.pdf`);
    doc.pipe(res);

    // Generar una etiqueta optimizada por página
    for (const order of orders) {
      if (!order.envigo_label || !order.order_number) continue;

      // Generar QR optimizado para cada etiqueta
      const qrText = order.order_number;
      const qrBuffer = await generateQRCode(qrText, 100);

      doc.addPage();

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      
      // Fondo limpio
      doc.rect(0, 0, pageW, pageH)
         .fillColor('#ffffff')
         .fill();

      // Borde perimetral más fino
      doc.rect(6, 6, pageW - 12, pageH - 12)
         .lineWidth(0.5)
         .strokeColor('#e5e7eb')
         .stroke();

      const margin = 16;
      let y = 18;

      // Header compacto
      drawCompactHeader(doc, order, margin, y, pageW - margin * 2);
      y += 35;

      // Comuna compacta
      drawCompactCommune(doc, order, margin, y, pageW - margin * 2);
      y += 38;

      // Info cliente compacta
      drawCompactCustomerInfo(doc, order, margin, y, pageW - margin * 2);
      y += 70;

      // QR CODE optimizado
      drawOptimizedQRCode(doc, order, qrBuffer, margin, y, pageW - margin * 2);
      
      // Footer compacto
      drawCompactFooter(doc, order, margin, pageH - 50, pageW - margin * 2);
    }

    doc.end();

  } catch (error) {
    console.error('Error generando etiquetas masivas optimizadas:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});

router.get('/proof/:orderId/download', authenticateToken, labelController.downloadProofOfDelivery);

module.exports = router;