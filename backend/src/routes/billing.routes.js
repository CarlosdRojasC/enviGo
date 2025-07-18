const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');

// --- RUTAS DE FACTURACIÓN ---
// Nota: Las rutas ahora son relativas (ej. '/invoices' en lugar de '/billing/invoices')

// Obtener facturas y estadísticas
router.get('/invoices', authenticateToken, billingController.getInvoices);
router.get('/stats', authenticateToken, billingController.getBillingStats);
router.get('/next-estimate', authenticateToken, billingController.getNextInvoiceEstimate);
router.get('/financial-summary', authenticateToken, isAdmin, billingController.getFinancialSummary);

// Generar facturas (solo admin)
router.post('/invoices/generate', authenticateToken, isAdmin, billingController.generateInvoice);
router.post('/invoices/generate-bulk', authenticateToken, isAdmin, billingController.generateBulkInvoices);
router.get('/invoices/bulk-preview', authenticateToken, isAdmin, billingController.previewBulkGeneration);

// Descargar y modificar facturas
router.get('/invoices/:id/download', authenticateToken, validateMongoId('id'), billingController.downloadInvoice);
router.post('/invoices/:id/mark-as-paid', authenticateToken, isAdmin, validateMongoId('id'), billingController.markAsPaid);

// Borrar facturas (solo admin)
router.delete('/invoices/:id', authenticateToken, isAdmin, validateMongoId('id'), billingController.deleteInvoice);
router.delete('/invoices', authenticateToken, isAdmin, billingController.deleteBulkInvoices); // Para borrado masivo

module.exports = router;