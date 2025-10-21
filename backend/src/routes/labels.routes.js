// backend/src/routes/labels.routes.js - Versión con QR grande abajo

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

// Función para generar QR más grande
async function generateQRCode(text, size = 180) {
  try {
    const qrBuffer = await QRCode.toBuffer(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return qrBuffer;
  } catch (error) {
    console.error('Error generando QR:', error);
    return null;
  }
}

// Header simple sin QR
function drawSimpleHeader(doc, order, x, y, width) {
  const companyName = order.company_id?.name || order.company_name || 'enviGo';
  const uniqueCode = order.envigo_label?.unique_code || order._id.toString().slice(-6);

  // Nombre de la empresa
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor('#111827')
     .text(companyName, x, y, {
       width: width,
       align: 'center'
     });

  // Línea divisoria
  doc.moveTo(x + 40, y + 25)
     .lineTo(x + width - 40, y + 25)
     .lineWidth(1)
     .strokeColor('#d1d5db')
     .stroke();

  // Código único destacado
  doc.font('Helvetica-Bold')
     .fontSize(18)
     .fillColor('#1f2937')
     .text(`Pedido: ${uniqueCode}`, x, y + 35, {
       width: width,
       align: 'center'
     });
}

// Comuna destacada (sin cambios)
function drawCommune(doc, order, x, y, width) {
  const commune = order.shipping_commune || 'SIN COMUNA';
  
  doc.rect(x, y - 5, width, 35)
     .fillColor('#f8fafc')
     .fill();

  doc.rect(x, y - 5, width, 35)
     .lineWidth(1)
     .strokeColor('#e2e8f0')
     .stroke();

  doc.font('Helvetica-Bold')
     .fontSize(18)
     .fillColor('#1f2937')
     .text(commune.toUpperCase(), x, y + 8, {
       width: width,
       align: 'center'
     });
}

// Información del cliente (sin cambios)
function drawCustomerInfo(doc, order, x, y, width) {
  const lineHeight = 22;
  let currentY = y;

  function addField(label, value, fontSize = 12) {
    if (!value || value === '') return;
    
    doc.font('Helvetica-Bold')
       .fontSize(fontSize)
       .fillColor('#374151')
       .text(`${label}:`, x, currentY);
    
    doc.font('Helvetica')
       .fontSize(fontSize)
       .fillColor('#111827')
       .text(value, x + 80, currentY, {
         width: width - 80,
         lineGap: 2
       });
    
    currentY += lineHeight;
  }

  addField('Cliente', order.customer_name, 13);
  addField('Teléfono', order.customer_phone, 12);
  addField('Dirección', order.shipping_address, 12);
  
  if (order.comment && order.comment.trim()) {
    currentY += 5;
    addField('Comentario', order.comment, 11);
  }
}

// NUEVA función: QR Code grande abajo
function drawLargeQRCode(doc, order, qrBuffer, x, y, width) {
  if (!qrBuffer) return;

  // Tamaño del QR más grande
  const qrSize = 100;
  const qrX = x + (width - qrSize) / 2; // Centrado
  
  // Título del QR
  doc.font('Helvetica-Bold')
     .fontSize(12)
     .fillColor('#374151')
     .text('CÓDIGO QR PARA RECOGIDA', x, y, {
       width: width,
       align: 'center'
     });

  // Insertar el QR centrado
  doc.image(qrBuffer, qrX, y + 20, { 
    width: qrSize, 
    height: qrSize 
  });

  // Código de seguimiento debajo del QR
  const trackingCode = order.tracking_code || order.envigo_label?.unique_code || order._id;
  doc.font('Helvetica')
     .fontSize(10)
     .fillColor('#6b7280')
     .text(trackingCode, x, y + 20 + qrSize + 10, {
       width: width,
       align: 'center'
     });

  // Instrucciones
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor('#9ca3af')
     .text('Escanear con la app del conductor', x, y + 20 + qrSize + 30, {
       width: width,
       align: 'center'
     });
}

// Footer simple (sin cambios)
function drawSimpleFooter(doc, order, x, y, width) {
  doc.moveTo(x, y)
     .lineTo(x + width, y)
     .lineWidth(0.5)
     .strokeColor('#e5e7eb')
     .stroke();

  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#374151')
     .text('¡Gracias por tu confianza!', x, y + 20, {
       width: width,
       align: 'center'
     });

  const website = order.company_id?.website || 
                 order.channel_id?.store_url || 
                 'www.envigo.cl';

  doc.font('Helvetica')
     .fontSize(10)
     .fillColor('#9ca3af')
     .text(website.replace(/^https?:\/\//, ''), x, y + 45, {
       width: width,
       align: 'center'
     });
}

// ENDPOINT ACTUALIZADO: PDF individual con QR grande
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

    // Generar código QR más grande
    const qrText = order.tracking_code || order.envigo_label.unique_code || order._id;
    const qrBuffer = await generateQRCode(qrText, 200);

    const doc = new PDFDocument({
      size: [283.5, 425.25], // 10x15 cm exacto
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

    // Borde perimetral suave
    doc.rect(8, 8, pageW - 16, pageH - 16)
       .lineWidth(0.5)
       .strokeColor('#e5e7eb')
       .stroke();

    const margin = 20;
    let y = 25;

    // Header simple (sin QR)
    drawSimpleHeader(doc, order, margin, y, pageW - margin * 2);
    y += 80;

    // Comuna destacada
    drawCommune(doc, order, margin, y, pageW - margin * 2);
    y += 55;

    // Información del cliente
    drawCustomerInfo(doc, order, margin, y, pageW - margin * 2);
    y += 110; // Más espacio para el QR

    // QR CODE GRANDE
    drawLargeQRCode(doc, order, qrBuffer, margin, y, pageW - margin * 2);
    
    // Footer en la parte inferior
    drawSimpleFooter(doc, order, margin, pageH - 80, pageW - margin * 2);

    doc.end();

  } catch (error) {
    console.error('Error generando etiqueta con QR grande:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF.' });
  }
});

// ENDPOINT ACTUALIZADO: PDF masivo con QR grande
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
    res.setHeader('Content-Disposition', `inline; filename=etiquetas-bulk-qr-grande.pdf`);
    doc.pipe(res);

    // Generar una etiqueta por página
    for (const order of orders) {
      if (!order.envigo_label) continue;

      // Generar QR para cada etiqueta
      const qrText = order.tracking_code || order.envigo_label.unique_code || order._id;
      const qrBuffer = await generateQRCode(qrText, 200);

      doc.addPage();

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

      // Header simple
      drawSimpleHeader(doc, order, margin, y, pageW - margin * 2);
      y += 80;

      // Comuna
      drawCommune(doc, order, margin, y, pageW - margin * 2);
      y += 55;

      // Info cliente
      drawCustomerInfo(doc, order, margin, y, pageW - margin * 2);
      y += 110;

      // QR CODE GRANDE
      drawLargeQRCode(doc, order, qrBuffer, margin, y, pageW - margin * 2);
      
      // Footer
      drawSimpleFooter(doc, order, margin, pageH - 80, pageW - margin * 2);
    }

    doc.end();

  } catch (error) {
    console.error('Error generando etiquetas masivas con QR grande:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});

router.get('/proof/:orderId/download', authenticateToken, labelController.downloadProofOfDelivery);

module.exports = router;