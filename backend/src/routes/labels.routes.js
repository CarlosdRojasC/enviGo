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

    // 📍 HEADER - Nombre empresa y código único
    drawSimpleHeader(doc, order, margin, y, pageW - margin * 2);
    y += 80;

    // 🏘️ COMUNA DESTACADA
    drawCommune(doc, order, margin, y, pageW - margin * 2);
    y += 55;

    // 👤 INFORMACIÓN DEL CLIENTE
    drawCustomerInfo(doc, order, margin, y, pageW - margin * 2);
    
    // 🙏 FOOTER SIMPLE
    drawSimpleFooter(doc, order, margin, pageH - 80, pageW - margin * 2);

    doc.end();

  } catch (error) {
    console.error('Error generando etiqueta simple:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF.' });
  }
});

// 📍 FUNCIÓN: Header simple con empresa y código
function drawSimpleHeader(doc, order, x, y, width) {
  const companyName = order.company_id?.name || order.company_name || 'enviGo';
  const uniqueCode = order.envigo_label?.unique_code || order._id.toString().slice(-6);

  // Nombre de la empresa (más pequeño para dar espacio)
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

  // Código único destacado (más grande)
  doc.font('Helvetica-Bold')
     .fontSize(18)
     .fillColor('#1f2937')
     .text(`Pedido: ${uniqueCode}`, x, y + 35, {
       width: width,
       align: 'center'
     });
}

// 🏘️ FUNCIÓN: Comuna destacada (igual que antes)
function drawCommune(doc, order, x, y, width) {
  const commune = order.shipping_commune || 'SIN COMUNA';
  
  // Fondo gris claro para destacar
  doc.rect(x, y - 5, width, 35)
     .fillColor('#f8fafc')
     .fill();

  // Borde de la comuna
  doc.rect(x, y - 5, width, 35)
     .lineWidth(1)
     .strokeColor('#e2e8f0')
     .stroke();

  // Texto de la comuna en mayúsculas y centrado
  doc.font('Helvetica-Bold')
     .fontSize(18)
     .fillColor('#1f2937')
     .text(commune.toUpperCase(), x, y + 8, {
       width: width,
       align: 'center'
     });
}

// 👤 FUNCIÓN: Información del cliente
function drawCustomerInfo(doc, order, x, y, width) {
  const lineHeight = 22;
  let currentY = y;

  // Función helper para agregar campos
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

  // Campos de información
  addField('Cliente', order.customer_name, 13);
  addField('Teléfono', order.customer_phone, 12);
  addField('Dirección', order.shipping_address, 12);
  
  if (order.comment && order.comment.trim()) {
    currentY += 5; // Espacio extra antes del comentario
    addField('Comentario', order.comment, 11);
  }
}

// 🙏 FUNCIÓN: Footer simple
function drawSimpleFooter(doc, order, x, y, width) {
  // Línea divisoria superior
  doc.moveTo(x, y)
     .lineTo(x + width, y)
     .lineWidth(0.5)
     .strokeColor('#e5e7eb')
     .stroke();

  // Mensaje de agradecimiento
  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#374151')
     .text('¡Gracias por tu confianza!', x, y + 20, {
       width: width,
       align: 'center'
     });

  // Website (si existe)
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

// ==================== ETIQUETAS MASIVAS SIMPLES ====================
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
    res.setHeader('Content-Disposition', `inline; filename=etiquetas-simples-bulk.pdf`);
    doc.pipe(res);

    // Generar una etiqueta por página
    for (const order of orders) {
      if (!order.envigo_label) continue;

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

      // Header
      drawSimpleHeader(doc, order, margin, y, pageW - margin * 2);
      y += 80;

      // Comuna
      drawCommune(doc, order, margin, y, pageW - margin * 2);
      y += 55;

      // Info cliente
      drawCustomerInfo(doc, order, margin, y, pageW - margin * 2);
      
      // Footer
      drawSimpleFooter(doc, order, margin, pageH - 80, pageW - margin * 2);
    }

    doc.end();

  } catch (error) {
    console.error('Error generando etiquetas masivas:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});

router.get(
    '/proof/:orderId/download',
    authenticateToken, // Asumiendo que usas este middleware de autenticación
    labelController.downloadProofOfDelivery
);


module.exports = router;

