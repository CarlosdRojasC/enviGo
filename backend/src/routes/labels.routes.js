// backend/src/routes/labels.routes.js

const express = require('express');
const router = express.Router();
const labelController = require('../controllers/label.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const PDFDocument = require('pdfkit');
const sanitize = require('sanitize-filename');

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

function drawCardBackground(doc, x, y, w, h, radius) {
  // Sombra suave (simulada con un rectángulo gris muy sutil detrás)
  doc.save();
  doc.roundedRect(x + 2, y + 2, w, h, radius).fillOpacity(0.06).fill('#000000').restore();

  // Fondo blanco con esquinas redondeadas
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fillOpacity(1).fill('#FFFFFF').restore();

  // Borde interior punteado (small dash)
  doc.save();
  doc.lineWidth(0.8);
  doc.dash(2, { space: 2 }); // pequeño punteado
  doc.strokeColor('#BDBDBD');
  doc.roundedRect(x + 8, y + 8, w - 16, h - 16, Math.max(6, radius - 4)).stroke();
  doc.undash();
  doc.restore();
}

router.post('/print-pdf/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
    .populate('company_id', 'name logo_url website')
      .populate('channel_id', 'store_url')
      .lean();

    if (!order || !order.envigo_label) {
      return res.status(404).json({ error: 'Pedido o etiqueta no encontrada' });
    }

    const doc = new PDFDocument({
      size: [283.5, 425.25],
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `etiqueta-${sanitize(order.envigo_label.unique_code || order._id)}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const cardX = 16;
    const cardY = 14;
    const cardW = pageW - cardX * 2;
    const cardH = pageH - cardY * 2;
    const cornerRadius = 10;

    drawCardBackground(doc, cardX, cardY, cardW, cardH, cornerRadius);

    const innerX = cardX + 18;
    let cursorY = cardY + 18;

    // --- HEADER ---
    const headerY = cursorY;
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor('#000')
       .text((order.company_name || 'EnviGo').toUpperCase(), innerX, headerY, {
         width: (cardW - 36) * 0.65,
         align: 'left'
       });

    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#000')
       .text(`Pedido #${order.order_number || ''}`, innerX + (cardW - 36) * 0.65, headerY + 5, {
         width: (cardW - 36) * 0.35,
         align: 'right'
       });

    cursorY += 36;

    // Línea divisoria
    doc.moveTo(innerX - 6, cursorY).lineTo(innerX + cardW - 36, cursorY)
       .lineWidth(1).strokeColor('#333').stroke();
    cursorY += 12;

    // Zona/Servicio
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor('#111')
       .text(order.delivery_zone || 'Santiago Urbano', innerX, cursorY, { align: 'left' });
    cursorY += 32;

    // Línea divisoria
    doc.moveTo(innerX - 6, cursorY).lineTo(innerX + cardW - 36, cursorY)
       .lineWidth(1).strokeColor('#333').stroke();
    cursorY += 16;

    // --- DATOS ---
    const labelSize = 12;
    const valueSize = 12;
    const gapY = 8;
    const valueWidth = cardW - 140;

    function printField(label, value) {
      doc.font('Helvetica-Bold').fontSize(labelSize).text(label, innerX, cursorY);
      doc.font('Helvetica-Bold').fontSize(valueSize)
         .text(value || '', innerX + 70, cursorY, { width: valueWidth, lineGap: 2 });

      cursorY += Math.max(
        doc.heightOfString(label, { width: 70 }),
        doc.heightOfString(value || '', { width: valueWidth })
      ) + gapY;
    }

    printField('Nombre:', order.customer_name);
    printField('Dirección:', order.shipping_address);
    printField('Comuna:', order.shipping_commune);
    printField('Teléfono:', order.customer_phone);
    printField('Comentario:', order.comment);

    // Footer
    doc.moveTo(innerX - 6, cardY + cardH - 120)
       .lineTo(innerX + cardW - 36, cardY + cardH - 120)
       .lineWidth(1).strokeColor('#333').stroke();

    const footerY = cardY + cardH - 92;
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000')
       .text('Gracias por tu compra!', innerX, footerY, {
         width: cardW - 36, align: 'center'
       });

    const website = order.channel_id?.store_url || order.company_id?.store_url || 'www.envigo.cl';
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333')
       .text(website, innerX, cardY + cardH - 62, {
         width: cardW - 36, align: 'center'
       });

    doc.end();

  } catch (error) {
    console.error('Error al generar PDF de etiqueta:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF.' });
  }
});



// --- Endpoint para bulk (15x10 cm en landscape por página) ---
router.post('/print-bulk-pdf', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
    }

    const orders = await Order.find({ '_id': { $in: orderIds } })
      .populate('company_id', 'name logo_url website')
      .populate('channel_id', 'store_url')
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({ error: 'No se encontraron pedidos.' });
    }

    const doc = new PDFDocument({
      layout: 'portrait',
      size: [283.5, 425.25],
      autoFirstPage: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=etiquetas-10x15-bulk.pdf`);
    doc.pipe(res);

    for (const order of orders) {
      if (!order.envigo_label) continue;

      doc.addPage();

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const cardX = 16;
      const cardY = 14;
      const cardW = pageW - cardX * 2;
      const cardH = pageH - cardY * 2;

      drawCardBackground(doc, cardX, cardY, cardW, cardH, 10);

      const innerX = cardX + 18;
      let y = cardY + 18;

      // Logo
      const logoUrl = order.company_id?.logo_url;
      if (logoUrl) {
        try {
          const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data, 'binary');
          doc.image(imageBuffer, innerX, y - 2, { width: 60, height: 40, fit: [60, 40] });
        } catch (e) {
          console.warn('No se pudo cargar logo', e.message || e);
        }
      }

      // Header con nombre y pedido
      const companyName = order.company_id?.name || order.company_name || 'Empresa';
      doc.font('Helvetica-Bold').fontSize(16)
         .text(companyName, innerX + (logoUrl ? 76 : 0), y, {
           width: (cardW - 36) * 0.65 - (logoUrl ? 76 : 0),
           align: 'left'
         });

      doc.font('Helvetica-Bold').fontSize(10)
         .text(`Pedido #${order.order_number || ''}`, innerX + (cardW - 36) * 0.65, y + 2, {
           width: (cardW - 36) * 0.35,
           align: 'right'
         });

      y += 36;
      doc.moveTo(innerX - 6, y).lineTo(innerX + cardW - 36, y)
         .lineWidth(1).strokeColor('#333').stroke();
      y += 10;

      // Código único
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#000')
         .text(order.envigo_label.unique_code, innerX, y, {
           width: cardW - 36, align: 'center'
         });

      y += 36;
      doc.moveTo(innerX - 6, y).lineTo(innerX + cardW - 36, y)
         .lineWidth(1).strokeColor('#333').stroke();
      y += 12;

      // Campos
      const labelSize = 10;
      const valueSize = 10;
      const gapY = 6;
      const valueWidth = cardW - 140;

      function printField(label, value) {
        doc.font('Helvetica-Bold').fontSize(labelSize).text(label, innerX, y);
        doc.font('Helvetica-Bold').fontSize(valueSize)
           .text(value || '', innerX + 70, y, { width: valueWidth, lineGap: 2 });

        y += Math.max(
          doc.heightOfString(label, { width: 70 }),
          doc.heightOfString(value || '', { width: valueWidth })
        ) + gapY;
      }

      printField('Nombre:', order.customer_name);
      printField('Dirección:', order.shipping_address);
      printField('Comuna:', order.shipping_commune);
      printField('Teléfono:', order.customer_phone);

      // Footer
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
         .text('Gracias por tu compra!', innerX, cardY + cardH - 90, {
           width: cardW - 36, align: 'center'
         });

      const website = order.channel_id?.website || order.company_id?.website || 'www.envigo.cl';
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333')
         .text(website, innerX, cardY + cardH - 62, {
           width: cardW - 36, align: 'center'
         });
    }

    doc.end();

  } catch (error) {
    console.error('Error al generar PDF masivo:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});

router.get(
    '/proof/:orderId/download',
    authenticateToken, // Asumiendo que usas este middleware de autenticación
    labelController.downloadProofOfDelivery
);


module.exports = router;

