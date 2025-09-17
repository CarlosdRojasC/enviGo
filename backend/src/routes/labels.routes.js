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

function drawModernCardBackground(doc, x, y, w, h) {
  // Sombra suave
  doc.save();
  doc.roundedRect(x + 3, y + 3, w, h, 12)
     .fillOpacity(0.08)
     .fillColor('#000000')
     .fill();
  doc.restore();

  // Fondo blanco principal
  doc.roundedRect(x, y, w, h, 12)
     .fillColor('#ffffff')
     .fill();

  // Borde principal
  doc.roundedRect(x, y, w, h, 12)
     .lineWidth(1.5)
     .strokeColor('#e5e7eb')
     .stroke();

  // Barra superior decorativa (gradiente simulado)
  doc.roundedRect(x + 2, y + 2, w - 4, 6, 4)
     .fillColor('#3b82f6')
     .fill();

  // Línea de acento inferior de la barra
  doc.roundedRect(x + 2, y + 8, w - 4, 1, 0)
     .fillColor('#1d4ed8')
     .fill();
}

// 🔝 FUNCIÓN: Header elegante
function drawHeaderSection(doc, order, x, y, cardW) {
  const companyName = order.company_id?.name || order.company_name || 'ENVIGO';
  
  // Logo placeholder o real (si existe)
  const logoSize = 45;
  if (order.company_id?.logo_url) {
    try {
      // Aquí se cargaría el logo real si existiera
      drawLogoPlaceholder(doc, x, y, logoSize);
    } catch (e) {
      drawLogoPlaceholder(doc, x, y, logoSize);
    }
  } else {
    drawLogoPlaceholder(doc, x, y, logoSize);
  }

  // Nombre de empresa - Más elegante
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor('#1f2937')
     .text(companyName.toUpperCase(), x + logoSize + 15, y + 8, {
       width: cardW - logoSize - 100,
       align: 'left'
     });

  // Número de pedido - Mejor posicionado
  doc.roundedRect(x + cardW - 90, y + 5, 70, 25, 6)
     .fillColor('#f1f5f9')
     .fill();
  
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor('#475569')
     .text('#' + (order.order_number || '0000'), x + cardW - 85, y + 12, {
       width: 60,
       align: 'center'
     });

  // Línea divisoria elegante
  doc.moveTo(x, y + logoSize + 10)
     .lineTo(x + cardW - 40, y + logoSize + 10)
     .lineWidth(2)
     .strokeColor('#3b82f6')
     .stroke();

  // Línea de acento más fina
  doc.moveTo(x, y + logoSize + 14)
     .lineTo(x + cardW - 40, y + logoSize + 14)
     .lineWidth(0.5)
     .strokeColor('#94a3b8')
     .stroke();
}

// 📱 FUNCIÓN: Logo placeholder moderno
function drawLogoPlaceholder(doc, x, y, size) {
  // Fondo del logo
  doc.roundedRect(x, y, size, 30, 6)
     .fillColor('#e0f2fe')
     .fill();
  
  // Borde del logo
  doc.roundedRect(x, y, size, 30, 6)
     .lineWidth(1)
     .strokeColor('#0ea5e9')
     .stroke();

  // Icono de envío
  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#0369a1')
     .text('📦', x + size/2 - 7, y + 8);
}

// 🏷️ FUNCIÓN: Código único destacado
function drawUniqueCodeSection(doc, order, x, y, cardW) {
  const code = order.envigo_label.unique_code;
  
  // Fondo del código con gradiente simulado
  doc.roundedRect(x - 5, y - 5, cardW - 30, 50, 8)
     .fillColor('#f8fafc')
     .fill();

  doc.roundedRect(x - 5, y - 5, cardW - 30, 50, 8)
     .lineWidth(1.5)
     .strokeColor('#e2e8f0')
     .stroke();

  // Código principal
  doc.font('Helvetica-Bold')
     .fontSize(24)
     .fillColor('#1e293b')
     .text(code, x, y + 12, {
       width: cardW - 30,
       align: 'center'
     });

  // Subtítulo
  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('CÓDIGO DE SEGUIMIENTO', x, y + 40, {
       width: cardW - 30,
       align: 'center'
     });
}

// 🌍 FUNCIÓN: Zona de servicio
function drawServiceZone(doc, order, x, y, cardW) {
  const zone = order.delivery_zone || 'SANTIAGO METROPOLITANO';
  
  // Fondo de la zona
  doc.roundedRect(x, y, cardW - 40, 28, 6)
     .fillColor('#fef3c7')
     .fill();

  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#92400e')
     .text(zone.toUpperCase(), x + 10, y + 8, {
       width: cardW - 60,
       align: 'center'
     });
}

// 👤 FUNCIÓN: Información del cliente mejorada
function drawCustomerInfo(doc, order, x, y, cardW) {
  const fields = [
    { label: 'DESTINATARIO', value: order.customer_name, icon: '👤' },
    { label: 'DIRECCIÓN', value: order.shipping_address, icon: '📍' },
    { label: 'COMUNA', value: order.shipping_commune, icon: '🏘️' },
    { label: 'TELÉFONO', value: order.customer_phone, icon: '📱' }
  ];

  let fieldY = y;
  
  fields.forEach((field, index) => {
    if (field.value) {
      // Icono
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#6b7280')
         .text(field.icon, x, fieldY + 2);

      // Label
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('#4b5563')
         .text(field.label, x + 20, fieldY);

      // Valor
      doc.font('Helvetica')
         .fontSize(11)
         .fillColor('#1f2937')
         .text(field.value || '', x + 20, fieldY + 12, {
           width: cardW - 70,
           lineGap: 1
         });

      fieldY += 30;

      // Línea divisoria sutil entre campos (excepto el último)
      if (index < fields.length - 1) {
        doc.moveTo(x + 15, fieldY - 5)
           .lineTo(x + cardW - 50, fieldY - 5)
           .lineWidth(0.5)
           .strokeColor('#e5e7eb')
           .stroke();
      }
    }
  });

  // Comentarios especiales si existen
  if (order.comment) {
    fieldY += 10;
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#dc2626')
       .text('⚠️ COMENTARIOS ESPECIALES:', x, fieldY);
    
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#dc2626')
       .text(order.comment, x, fieldY + 12, {
         width: cardW - 50,
         lineGap: 1
       });
  }
}

// 🔽 FUNCIÓN: Footer profesional
function drawFooterSection(doc, order, x, y, cardW) {
  // Línea divisoria superior
  doc.moveTo(x, y - 10)
     .lineTo(x + cardW - 40, y - 10)
     .lineWidth(1)
     .strokeColor('#e2e8f0')
     .stroke();

  // Mensaje de agradecimiento
  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#1f2937')
     .text('¡Gracias por elegirnos!', x, y + 5, {
       width: cardW - 40,
       align: 'center'
     });

  // Website/URL
  const website = order.company_id?.website || 
                 order.channel_id?.store_url || 
                 'www.envigo.cl';

  doc.font('Helvetica')
     .fontSize(10)
     .fillColor('#3b82f6')
     .text(website.replace(/^https?:\/\//, ''), x, y + 25, {
       width: cardW - 40,
       align: 'center'
     });

  // Información adicional pequeña
  const currentDate = new Date().toLocaleDateString('es-CL');
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor('#9ca3af')
     .text(`Generado: ${currentDate} • EnviGo Logistics`, x, y + 45, {
       width: cardW - 40,
       align: 'center'
     });

  // Código QR placeholder (opcional)
  drawQRPlaceholder(doc, x + cardW - 70, y + 35);
}

// 📱 FUNCIÓN: QR Code placeholder
function drawQRPlaceholder(doc, x, y) {
  const qrSize = 25;
  
  // Fondo del QR
  doc.roundedRect(x, y, qrSize, qrSize, 2)
     .fillColor('#f9fafb')
     .fill();

  doc.roundedRect(x, y, qrSize, qrSize, 2)
     .lineWidth(0.5)
     .strokeColor('#d1d5db')
     .stroke();

  // Patrón de QR simple
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor('#6b7280')
     .text('QR', x + 6, y + 8);
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
      size: [283.5, 425.25], // 10x15 cm
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `etiqueta-${sanitize(order.envigo_label.unique_code || order._id)}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const cardX = 12;
    const cardY = 12;
    const cardW = pageW - cardX * 2;
    const cardH = pageH - cardY * 2;

    // 🎨 FONDO MODERNO CON GRADIENTE SUTIL
    drawModernCardBackground(doc, cardX, cardY, cardW, cardH);

    const innerX = cardX + 20;
    let cursorY = cardY + 20;

    // 🔝 HEADER SECTION - MÁS ELEGANTE
    drawHeaderSection(doc, order, innerX, cursorY, cardW);
    cursorY += 55;

    // 🏷️ CÓDIGO ÚNICO - MÁS PROMINENTE
    drawUniqueCodeSection(doc, order, innerX, cursorY, cardW);
    cursorY += 65;

    // 📦 ZONA DE SERVICIO
    drawServiceZone(doc, order, innerX, cursorY, cardW);
    cursorY += 40;

    // 👤 INFORMACIÓN DEL CLIENTE - MÁS LEGIBLE
    drawCustomerInfo(doc, order, innerX, cursorY, cardW);
    cursorY += 140; // Ajustar según contenido

    // 🔽 FOOTER - MÁS PROFESIONAL
    drawFooterSection(doc, order, innerX, cardY + cardH - 80, cardW);

    doc.end();

  } catch (error) {
    console.error('Error generando etiqueta mejorada:', error);
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
    res.setHeader('Content-Disposition', `inline; filename=etiquetas-envigo-${orders.length}.pdf`);
    doc.pipe(res);

    // Generar cada etiqueta con el diseño mejorado
    for (const order of orders) {
      if (!order.envigo_label) continue;

      doc.addPage();

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const cardX = 12;
      const cardY = 12;
      const cardW = pageW - cardX * 2;
      const cardH = pageH - cardY * 2;

      // Usar las mismas funciones mejoradas
      drawModernCardBackground(doc, cardX, cardY, cardW, cardH);

      const innerX = cardX + 20;
      let cursorY = cardY + 20;

      drawHeaderSection(doc, order, innerX, cursorY, cardW);
      cursorY += 55;

      drawUniqueCodeSection(doc, order, innerX, cursorY, cardW);
      cursorY += 65;

      drawServiceZone(doc, order, innerX, cursorY, cardW);
      cursorY += 40;

      drawCustomerInfo(doc, order, innerX, cursorY, cardW);

      drawFooterSection(doc, order, innerX, cardY + cardH - 80, cardW);
    }

    doc.end();

  } catch (error) {
    console.error('Error generando etiquetas masivas mejoradas:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});

router.get(
    '/proof/:orderId/download',
    authenticateToken, // Asumiendo que usas este middleware de autenticación
    labelController.downloadProofOfDelivery
);


module.exports = router;

