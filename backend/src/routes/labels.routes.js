const express = require('express');
const router = express.Router();
const labelController = require('../controllers/label.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const PDFDocument = require('pdfkit');
const sanitize = require('sanitize-filename');
const QRCode = require('qrcode');
const Order = require('../models/Order');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas existentes
router.post('/generate/:orderId', labelController.generateCode);
router.post('/generate-bulk', labelController.generateBulkCodes);
router.post('/mark-printed/:orderId', labelController.markPrinted);
router.get('/find/:code', labelController.findByCode);
router.get('/stats', labelController.getStats);

// 🧠 Generador de QR elegante y nítido
async function generateQRCode(text, size = 100) {
  try {
    return await QRCode.toBuffer(text, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
      type: 'png',
      quality: 1.0,
    });
  } catch (err) {
    console.error('Error generando QR:', err);
    return null;
  }
}

// 🎨 HEADER ELEGANTE
function drawHeader(doc, order, x, y, width) {
  const companyName = order.company_id?.name || order.company_name || 'enviGo';
  const uniqueCode = order.envigo_label?.unique_code || order._id.toString().slice(-6);
  const orderNumber = order.order_number ? `PEDIDO ${order.order_number}` : `ID ${uniqueCode}`;

  // Fondo con borde redondeado
  doc.roundedRect(x, y, width, 48, 6)
    .fillColor('#f8fafc')
    .strokeColor('#e2e8f0')
    .lineWidth(0.6)
    .fillAndStroke();

  // Nombre de empresa (alineado a la izquierda)
  doc.font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#0f172a')
    .text(companyName, x + 12, y + 10, {
      width: width - 24,
      align: 'left'
    });

  // Código del pedido (alineado a la derecha y más pequeño)
  doc.font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor('#2563eb')
    .text(orderNumber, x + 12, y + 26, {
      width: width - 24,
      align: 'right'
    });

  // Línea divisoria inferior
  doc.moveTo(x, y + 48)
    .lineTo(x + width, y + 48)
    .strokeColor('#dbeafe')
    .lineWidth(0.8)
    .stroke();
}

// 🏙️ BLOQUE DE COMUNA
function drawCommuneBlock(doc, order, x, y, width) {
  const commune = order.shipping_commune || 'SIN COMUNA';
  doc.roundedRect(x, y, width, 32, 4)
    .fillColor('#e0f2fe')
    .strokeColor('#7dd3fc')
    .lineWidth(0.8)
    .fillAndStroke();

  doc.font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#075985')
    .text(commune.toUpperCase(), x, y + 7, { width, align: 'center' });
}

// 👤 BLOQUE DE CLIENTE
function drawCustomerInfo(doc, order, x, y, width) {
  const lineHeight = 16;
  let currentY = y;

  const addField = (label, value, bold = false) => {
    if (!value) return;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(10)
      .fillColor(bold ? '#1e293b' : '#334155')
      .text(`${label}: `, x + 6, currentY, { continued: true })
      .font('Helvetica')
      .text(value, { width: width - 12 });
    currentY += lineHeight;
  };

  doc.roundedRect(x, y - 6, width, 70, 4)
    .fillColor('#f8fafc')
    .strokeColor('#e2e8f0')
    .lineWidth(0.5)
    .fillAndStroke();

  addField('Cliente', order.customer_name, true);
  addField('Teléfono', order.customer_phone);
  addField('Dirección', order.shipping_address);
  if (order.comment) addField('Comentario', order.comment);
}

// 📱 QR CÓDIGO MODERNO
function drawQRCodeBlock(doc, order, qrBuffer, x, y, width) {
  if (!qrBuffer) return;

  const qrSize = 90;
  const qrX = x + (width - qrSize) / 2;

  doc.roundedRect(qrX - 5, y, qrSize + 10, qrSize + 10, 6)
    .fillColor('#ffffff')
    .strokeColor('#cbd5e1')
    .lineWidth(0.8)
    .fillAndStroke();

  doc.image(qrBuffer, qrX, y + 5, { width: qrSize, height: qrSize });

  const displayCode = order.order_number || 'Sin código';
  doc.font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#1e293b')
    .text(displayCode, x, y + qrSize + 20, { width, align: 'center' });

  doc.font('Helvetica')
    .fontSize(9)
    .fillColor('#475569')
    .text('Escanea con la app del conductor', x, y + qrSize + 36, { width, align: 'center' });
}

// 🙏 FOOTER ELEGANTE
function drawFooter(doc, order, x, y, width) {
  doc.moveTo(x, y)
    .lineTo(x + width, y)
    .strokeColor('#e2e8f0')
    .lineWidth(0.5)
    .stroke();

  doc.font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#334155')
    .text('¡Gracias por confiar en enviGo!', x, y + 10, { width, align: 'center' });

  const website = order.company_id?.website || order.channel_id?.store_url || 'www.envigo.cl';
  doc.font('Helvetica')
    .fontSize(8)
    .fillColor('#94a3b8')
    .text(website.replace(/^https?:\/\//, ''), x, y + 26, { width, align: 'center' });
}

// 🚀 ENDPOINT: PDF individual mejorado
router.post('/print-pdf/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('company_id', 'name website')
      .populate('channel_id', 'store_url')
      .lean();

    if (!order || !order.envigo_label) {
      return res.status(404).json({ error: 'Pedido o etiqueta no encontrada' });
    }

    const qrBuffer = await generateQRCode(order.order_number);

    const doc = new PDFDocument({
      size: [283.5, 425.25], // 10x15 cm
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `etiqueta-${sanitize(order.order_number || order._id)}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 16;

    // Fondo principal
    doc.roundedRect(6, 6, pageW - 12, pageH - 12, 10)
      .fillColor('#ffffff')
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .fillAndStroke();

    let y = 20;
    drawHeader(doc, order, margin, y, pageW - margin * 2);
    y += 50;

    drawCommuneBlock(doc, order, margin, y, pageW - margin * 2);
    y += 50;

    drawCustomerInfo(doc, order, margin, y, pageW - margin * 2);
    y += 90;

    drawQRCodeBlock(doc, order, qrBuffer, margin, y, pageW - margin * 2);
    drawFooter(doc, order, margin, pageH - 60, pageW - margin * 2);

    doc.end();
  } catch (err) {
    console.error('Error generando PDF mejorado:', err);
    res.status(500).json({ error: 'Error interno al generar el PDF.' });
  }
});

// 🚀 ENDPOINT: PDF masivo mejorado
router.post('/print-bulk-pdf', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0)
      return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });

    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate('company_id', 'name website')
      .populate('channel_id', 'store_url')
      .lean();

    if (orders.length === 0)
      return res.status(404).json({ error: 'No se encontraron pedidos.' });

    const doc = new PDFDocument({
      layout: 'portrait',
      size: [283.5, 425.25],
      autoFirstPage: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="etiquetas-mejoradas-bulk.pdf"');
    doc.pipe(res);

    for (const order of orders) {
      if (!order.envigo_label || !order.order_number) continue;
      const qrBuffer = await generateQRCode(order.order_number);

      doc.addPage();
      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const margin = 16;

      doc.roundedRect(6, 6, pageW - 12, pageH - 12, 10)
        .fillColor('#ffffff')
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .fillAndStroke();

      let y = 20;
      drawHeader(doc, order, margin, y, pageW - margin * 2);
      y += 50;

      drawCommuneBlock(doc, order, margin, y, pageW - margin * 2);
      y += 50;

      drawCustomerInfo(doc, order, margin, y, pageW - margin * 2);
      y += 90;

      drawQRCodeBlock(doc, order, qrBuffer, margin, y, pageW - margin * 2);
      drawFooter(doc, order, margin, pageH - 60, pageW - margin * 2);
    }

    doc.end();
  } catch (err) {
    console.error('Error generando etiquetas masivas mejoradas:', err);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});

router.get('/proof/:orderId/download', authenticateToken, labelController.downloadProofOfDelivery);

module.exports = router;
