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
    const order = await Order.findById(orderId).lean();

    if (!order || !order.envigo_label) {
      return res.status(404).json({ error: 'Pedido o etiqueta no encontrada' });
    }

    // 10x15 cm -> puntos ya convertidos aprox (72pt/in * inches)
    const doc = new PDFDocument({
      size: [283.5, 425.25],
      margins: { top: 0, bottom: 0, left: 0, right: 0 } // nosotros manejamos margins manualmente
    });

    // Enviar PDF al cliente
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `etiqueta-${sanitize(order.envigo_label.unique_code || order._id)}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    // Variables de layout
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const cardX = 16;
    const cardY = 14;
    const cardW = pageW - cardX * 2;
    const cardH = pageH - cardY * 2;
    const cornerRadius = 10;

    // Fondo blanco con borde redondeado + borde interior punteado
    drawCardBackground(doc, cardX, cardY, cardW, cardH, cornerRadius);

    // Usar posiciones absolutas dentro de la "tarjeta"
    const innerX = cardX + 18;
    let cursorY = cardY + 18;

    // --- HEADER: Nombre empresa centrado grande ---
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000')
       .text((order.company_name || 'COMERCIAL FLIX S.P.A').toUpperCase(), innerX, cursorY, {
         width: cardW - 36,
         align: 'center'
       });

    // Pedido a la derecha (pequeño) - colocamos en la misma altura que el header pero alineado a la derecha
    doc.font('Helvetica').fontSize(10).fillColor('black')
       .text(`Pedido #${order.order_number || ''}`, cardX + 18, cursorY + 2, {
         width: cardW - 36,
         align: 'right'
       });

    cursorY += 36; // espacio tras header

    // Línea divisoria fina
    doc.moveTo(innerX - 6, cursorY).lineTo(innerX + cardW - 36, cursorY).lineWidth(1).strokeColor('#333').stroke();
    cursorY += 8;

    // GRAN texto de zona/servicio (p.ej. "Santiago Urbano") a la izquierda
    doc.font('Helvetica').fontSize(20).fillColor('#111')
       .text(order.delivery_zone || 'Santiago Urbano', innerX, cursorY, { align: 'left' });

    cursorY += 28;

    // Otra línea separadora (fina)
    doc.moveTo(innerX - 6, cursorY).lineTo(innerX + cardW - 36, cursorY).lineWidth(1).strokeColor('#333').stroke();
    cursorY += 12;

    // --- CUADRO DE DATOS (Nombre, Dirección, Comuna, Teléfono, Comentario) ---
    const labelSize = 11;
    const valueSize = 11;
    const gapY = 6;

    doc.font('Helvetica-Bold').fontSize(labelSize).text('Nombre:', innerX, cursorY);
    doc.font('Helvetica').fontSize(valueSize).text(` ${order.customer_name || ''}`, innerX + 70, cursorY);
    cursorY += labelSize + gapY;

    doc.font('Helvetica-Bold').fontSize(labelSize).text('Dirección:', innerX, cursorY);
    doc.font('Helvetica').fontSize(valueSize).text(` ${order.shipping_address || ''}`, innerX + 70, cursorY, { width: cardW - 120 });
    cursorY += labelSize + gapY;

    doc.font('Helvetica-Bold').fontSize(labelSize).text('Comuna:', innerX, cursorY);
    doc.font('Helvetica').fontSize(valueSize).text(` ${order.shipping_commune || ''}`, innerX + 70, cursorY);
    cursorY += labelSize + gapY;

    doc.font('Helvetica-Bold').fontSize(labelSize).text('Telefono:', innerX, cursorY);
    doc.font('Helvetica').fontSize(valueSize).text(` ${order.customer_phone || ''}`, innerX + 70, cursorY);
    cursorY += labelSize + gapY;

    doc.font('Helvetica-Bold').fontSize(labelSize).text('Comentario:', innerX, cursorY);
    doc.font('Helvetica').fontSize(valueSize).text(` ${order.comment || ''}`, innerX, cursorY + 14, { width: cardW - 72 });
    cursorY += 50;

    // Línea divisoria antes del footer
    doc.moveTo(innerX - 6, cardY + cardH - 120).lineTo(innerX + cardW - 36, cardY + cardH - 120).lineWidth(1).strokeColor('#333').stroke();

    // --- PIE: Gracias por tu compra! + web ---
    const footerY = cardY + cardH - 92;
    doc.font('Helvetica').fontSize(20).fillColor('#000').text('Gracias por tu compra!', innerX, footerY, {
      width: cardW - 36,
      align: 'center'
    });

    doc.font('Helvetica').fontSize(12).fillColor('#333').text(order.company_website || 'www.flixspa.com', innerX, footerY + 34, {
      width: cardW - 36,
      align: 'center'
    });

    // Finalizar
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
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({ error: 'No se encontraron pedidos.' });
    }

    const doc = new PDFDocument({
      layout: 'portrait', // mantendremos portrait y rotamos el diseño internamente si quieres landscape
      size: [283.5, 425.25], // mismo tamaño por etiqueta (10x15)
      autoFirstPage: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=etiquetas-10x15-bulk.pdf`);
    doc.pipe(res);

    for (const order of orders) {
      if (!order.envigo_label) continue;

      doc.addPage();
      // layout copia del single, pero simplificado y con logo a la izquierda
      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const cardX = 16;
      const cardY = 14;
      const cardW = pageW - cardX * 2;
      const cardH = pageH - cardY * 2;

      drawCardBackground(doc, cardX, cardY, cardW, cardH, 10);

      const innerX = cardX + 18;
      let y = cardY + 18;

      // Logo (si existe)
      const logoUrl = order.company_id?.logo_url;
      if (logoUrl) {
        try {
          const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data, 'binary');
          // Ajusta x,y,w según necesites
          doc.image(imageBuffer, innerX, y - 2, { width: 60, height: 40, fit: [60,40] });
        } catch (e) {
          console.warn('No se pudo cargar logo', e.message || e);
        }
      }

      // Company name (centrado si no hay logo)
      const companyName = order.company_id?.name || order.company_name || 'Empresa';
      doc.font('Helvetica-Bold').fontSize(16).text(companyName, innerX + (logoUrl ? 76 : 0), y, {
        width: cardW - 36 - (logoUrl ? 76 : 0),
        align: logoUrl ? 'left' : 'center'
      });

      // Pedido a la derecha
      doc.font('Helvetica').fontSize(9).text(`Pedido #${order.order_number || ''}`, innerX, y + 2, {
        width: cardW - 36,
        align: 'right'
      });

      y += 36;
      doc.moveTo(innerX - 6, y).lineTo(innerX + cardW - 36, y).lineWidth(1).strokeColor('#333').stroke();
      y += 8;

      // Código único prominent
      doc.font('Helvetica-Bold').fontSize(26).fillColor('#dc2626').text(order.envigo_label.unique_code, innerX, y, {
        width: cardW - 36,
        align: 'center'
      });

      y += 36;
      doc.moveTo(innerX - 6, y).lineTo(innerX + cardW - 36, y).lineWidth(1).strokeColor('#333').stroke();
      y += 10;

      // Info cliente
      doc.font('Helvetica-Bold').fontSize(10).text('Nombre: ', innerX, y);
      doc.font('Helvetica').fontSize(10).text(`${order.customer_name || ''}`, innerX + 70, y);
      y += 16;

      doc.font('Helvetica-Bold').fontSize(10).text('Dirección: ', innerX, y);
      doc.font('Helvetica').fontSize(10).text(`${order.shipping_address || ''}`, innerX + 70, y, { width: cardW - 120 });
      y += 16;

      doc.font('Helvetica-Bold').fontSize(10).text('Comuna: ', innerX, y);
      doc.font('Helvetica').fontSize(10).text(`${order.shipping_commune || ''}`, innerX + 70, y);
      y += 16;

      doc.font('Helvetica-Bold').fontSize(10).text('Telefono: ', innerX, y);
      doc.font('Helvetica').fontSize(10).text(`${order.customer_phone || ''}`, innerX + 70, y);

      // Footer simplificado
      doc.font('Helvetica').fontSize(12).fillColor('#000').text('Gracias por tu compra!', innerX, cardY + cardH - 90, {
        width: cardW - 36,
        align: 'center'
      });
      doc.font('Helvetica').fontSize(9).fillColor('#333').text(order.company_id?.website || 'www.flixspa.com', innerX, cardY + cardH - 62, {
        width: cardW - 36,
        align: 'center'
      });
    }

    doc.end();

  } catch (error) {
    console.error('Error al generar PDF masivo:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});


module.exports = router;

