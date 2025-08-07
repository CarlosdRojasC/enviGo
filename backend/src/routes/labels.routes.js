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

        // --- CONFIGURACIÓN DEL PDF (10x10 cm) ---
        const doc = new PDFDocument({
            size: [283.5, 283.5], // 10x10 cm
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

module.exports = router;

