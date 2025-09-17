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
    
    // ✨ FONDO LIMPIO - Solo blanco con borde sutil
    doc.rect(0, 0, pageW, pageH)
       .fillColor('#ffffff')
       .fill();

    // Borde perimetral muy sutil
    doc.rect(8, 8, pageW - 16, pageH - 16)
       .lineWidth(0.5)
       .strokeColor('#e5e7eb')
       .stroke();

    const margin = 20;
    let y = 25;

    // 🔝 HEADER - Minimalista y Limpio
    drawCleanHeader(doc, order, margin, y, pageW - margin * 2);
    y += 60;

    // 🏷️ CÓDIGO ÚNICO - Simple y Grande
    drawCleanCode(doc, order, margin, y, pageW - margin * 2);
    y += 70;

    // 🌍 ZONA DE ENTREGA - Sin colores llamativos
    drawCleanZone(doc, order, margin, y, pageW - margin * 2);
    y += 40;

    // 👤 INFORMACIÓN DEL CLIENTE - Clean y Legible
    drawCleanCustomerInfo(doc, order, margin, y, pageW - margin * 2);
    
    // 🔽 FOOTER - Minimalista
    drawCleanFooter(doc, order, margin, pageH - 70, pageW - margin * 2);

    doc.end();

  } catch (error) {
    console.error('Error generando etiqueta limpia:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF.' });
  }
});

// 🔝 FUNCIÓN: Header limpio y profesional
function drawCleanHeader(doc, order, x, y, width) {
  const companyName = order.company_id?.name || 'ENVIGO';
  
  // Línea superior fina
  doc.moveTo(x, y)
     .lineTo(x + width, y)
     .lineWidth(1)
     .strokeColor('#374151')
     .stroke();

  y += 15;

  // Nombre de la empresa - Simple
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor('#1f2937')
     .text(companyName.toUpperCase(), x, y);

  // Número de pedido - Alineado a la derecha
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

// 🏷️ FUNCIÓN: Código único simple
function drawCleanCode(doc, order, x, y, width) {
  const code = order.envigo_label.unique_code;
  
  // Fondo muy sutil para el código
  doc.rect(x, y, width, 50)
     .fillColor('#f9fafb')
     .fill();

  doc.rect(x, y, width, 50)
     .lineWidth(0.5)
     .strokeColor('#e5e7eb')
     .stroke();

  // Código principal - Grande y centrado
  doc.font('Helvetica-Bold')
     .fontSize(28)
     .fillColor('#111827')
     .text(code, x, y + 15, {
       width: width,
       align: 'center'
     });
}

// 🌍 FUNCIÓN: Zona limpia
function drawCleanZone(doc, order, x, y, width) {
  const zone = order.delivery_zone || 'SANTIAGO METROPOLITANO';
  
  // Solo texto, sin fondo de color
  doc.font('Helvetica-Bold')
     .fontSize(13)
     .fillColor('#374151')
     .text(zone.toUpperCase(), x, y, {
       width: width,
       align: 'center'
     });

  // Línea debajo
  doc.moveTo(x + 40, y + 20)
     .lineTo(x + width - 40, y + 20)
     .lineWidth(0.5)
     .strokeColor('#d1d5db')
     .stroke();
}

// 👤 FUNCIÓN: Info del cliente - Sin iconos, solo texto limpio
function drawCleanCustomerInfo(doc, order, x, y, width) {
  const fields = [
    { label: 'DESTINATARIO', value: order.customer_name },
    { label: 'DIRECCIÓN', value: order.shipping_address },
    { label: 'COMUNA', value: order.shipping_commune },
    { label: 'TELÉFONO', value: order.customer_phone }
  ];

  let currentY = y;
  
  fields.forEach((field, index) => {
    if (field.value) {
      // Label en mayúsculas, pequeño
      doc.font('Helvetica-Bold')
         .fontSize(9)
         .fillColor('#6b7280')
         .text(field.label, x, currentY);

      // Valor principal
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#111827')
         .text(field.value, x, currentY + 12, {
           width: width - 20,
           lineGap: 2
         });

      currentY += 32;

      // Línea separadora muy sutil (excepto el último)
      if (index < fields.length - 1) {
        doc.moveTo(x, currentY - 8)
           .lineTo(x + width, currentY - 8)
           .lineWidth(0.25)
           .strokeColor('#f3f4f6')
           .stroke();
      }
    }
  });

  // Comentarios si existen - En rojo pero discreto
  if (order.comment) {
    currentY += 15;
    
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#dc2626')
       .text('INSTRUCCIONES ESPECIALES', x, currentY);
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#dc2626')
       .text(order.comment, x, currentY + 12, {
         width: width - 20,
         lineGap: 1
       });
  }
}

// 🔽 FUNCIÓN: Footer limpio
function drawCleanFooter(doc, order, x, y, width) {
  // Línea superior
  doc.moveTo(x, y)
     .lineTo(x + width, y)
     .lineWidth(0.5)
     .strokeColor('#e5e7eb')
     .stroke();

  y += 12;

  // Mensaje simple
  doc.font('Helvetica-Bold')
     .fontSize(12)
     .fillColor('#374151')
     .text('Gracias por tu confianza', x, y, {
       width: width,
       align: 'center'
     });

  // Website discreto
  const website = order.company_id?.website || 
                 order.channel_id?.store_url || 
                 'www.envigo.cl';

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#9ca3af')
     .text(website.replace(/^https?:\/\//, ''), x, y + 20, {
       width: width,
       align: 'center'
     });

  // Info técnica muy pequeña
  const currentDate = new Date().toLocaleDateString('es-CL');
  doc.font('Helvetica')
     .fontSize(7)
     .fillColor('#d1d5db')
     .text(`${currentDate} • EnviGo`, x, y + 35, {
       width: width,
       align: 'center'
     });
}




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

