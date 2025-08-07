// backend/src/routes/labels.routes.js

const express = require('express');
const router = express.Router();
const labelController = require('../controllers/label.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const PDFDocument = require('pdfkit');
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
        const order = await Order.findById(orderId).lean();

        if (!order || !order.envigo_label) {
            return res.status(404).json({ error: 'Pedido o etiqueta no encontrada' });
        }

        // --- CONFIGURACIÓN DEL PDF (10x15 cm) ---
        const doc = new PDFDocument({
            size: [283.5,425.25], // 10x15 cm
            margins: { top: 20, bottom: 20, left: 20, right: 20 }
        });

        // --- ENVIAR PDF AL CLIENTE ---
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=etiqueta-${order.envigo_label.unique_code}.pdf`);
        doc.pipe(res);

        // --- DIBUJAR CONTENIDO (SIN QR) ---

        doc.font('Helvetica-Bold').fontSize(16).text('enviGo', { align: 'center' });
        doc.moveDown(2); // Más espacio hacia abajo

        // Código único, ahora más grande y centrado
        doc.fontSize(32) // Aumentamos el tamaño de la fuente considerablemente
           .fillColor('#dc2626')
           .text(order.envigo_label.unique_code, {
                align: 'center'
           });
        doc.moveDown(2); // Más espacio

        // Información del cliente
        doc.fillColor('black').font('Helvetica').fontSize(10);
        doc.text(`Pedido #${order.order_number}`, { align: 'left' });
        doc.font('Helvetica-Bold').text(order.customer_name, { align: 'left' });
        doc.font('Helvetica').text(order.shipping_address, { align: 'left' });
        doc.text(order.shipping_commune, { align: 'left' });

        // Finalizar y enviar el PDF
        doc.end();

    } catch (error) {
        console.error('Error al generar PDF de etiqueta:', error);
        res.status(500).json({ error: 'Error interno al generar el PDF.' });
    }
});

router.post('/print-bulk-pdf', async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de IDs de pedidos.' });
        }

        const orders = await Order.find({ '_id': { $in: orderIds } })
            .populate('company_id', 'name logo_url')
            .lean();

        if (orders.length === 0) {
            return res.status(404).json({ error: 'No se encontraron pedidos.' });
        }

        const doc = new PDFDocument({
            layout: 'landscape',
            size: [425.25, 283.5], // 15x10 cm en puntos
            autoFirstPage: false,
            margins: { top: 30, bottom: 30, left: 35, right: 35 }
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=etiquetas-15x10.pdf`);
        doc.pipe(res);

        for (const order of orders) {
      if (!order.envigo_label) continue;

      doc.addPage();

      const pageWidth = doc.page.width;

      // === 1. DIBUJAR LOGO SI EXISTE ===
      const logoUrl = order.company_id?.logo_url;
      if (logoUrl) {
        try {
          const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data, 'base64');
          doc.image(imageBuffer, 35, 30, { width: 80 }); // Puedes ajustar el tamaño y posición
        } catch (e) {
          console.warn('No se pudo cargar el logo para:', order.company_id.name);
        }
      }

      // === 2. Nombre de empresa centrado arriba (ajustado por si hay logo) ===
      const companyName = order.company_id?.name || 'Empresa';
      doc.font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('black')
        .text(companyName, logoUrl ? 130 : 35, 30, { align: logoUrl ? 'left' : 'center' });

      doc.moveDown(1);

      // Línea divisoria
      doc.moveTo(35, doc.y).lineTo(pageWidth - 35, doc.y).strokeColor('#ccc').lineWidth(1).stroke();
      doc.moveDown(0.5);

      // Código único destacado
      doc.fontSize(34)
        .fillColor('#dc2626')
        .font('Helvetica-Bold')
        .text(order.envigo_label.unique_code, { align: 'center' });

      doc.moveDown(0.5);

      // Otra línea divisoria
      doc.moveTo(35, doc.y).lineTo(pageWidth - 35, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.8);

      // Info del pedido y cliente
      doc.fontSize(12).fillColor('black');
      doc.font('Helvetica').text(`Pedido #: ${order.order_number}`, { continued: true })
         .font('Helvetica-Bold').text(`   ${order.customer_name}`);

      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(11);
      doc.text(order.shipping_address);
      doc.text(order.shipping_commune);
    }

    doc.end();

  } catch (error) {
    console.error('Error al generar PDF masivo:', error);
    res.status(500).json({ error: 'Error interno al generar el PDF masivo.' });
  }
});


module.exports = router;

