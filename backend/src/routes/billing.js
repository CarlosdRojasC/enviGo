// backend/src/routes/billing.js

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');

// Obtener facturas (admin ve todas, empresa ve las suyas)
router.get('/invoices', authenticateToken, billingController.getInvoices);

// Obtener estadísticas de facturación
router.get('/stats', authenticateToken, billingController.getBillingStats);

// Obtener estimación de próxima factura (endpoint específico para companies)
router.get('/next-invoice-estimate', authenticateToken, billingController.getNextInvoiceEstimate);

// Descargar una factura específica en PDF
router.get('/invoices/:id/download', authenticateToken, validateMongoId('id'), billingController.downloadInvoice);

// Marcar una factura como pagada (solo admin)
router.post('/invoices/:id/mark-as-paid', authenticateToken, isAdmin, validateMongoId('id'), billingController.markAsPaid);

// Generar facturas manualmente (solo admin)
router.post('/generate-manual', authenticateToken, isAdmin, billingController.manualGenerateInvoices);

module.exports = router;