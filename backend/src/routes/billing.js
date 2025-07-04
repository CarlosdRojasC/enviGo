// backend/src/routes/billing.routes.js

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const {
  authenticateToken,
  isAdmin} = require('../middlewares/auth.middleware');


// ==================== FACTURACIÓN (BILLING) ====================

// Obtener facturas (admin ve todas, empresa ve las suyas)
router.get('/billing/invoices', authenticateToken, billingController.getInvoices);

// Obtener estadísticas de facturación
router.get('/billing/stats', authenticateToken, billingController.getBillingStats);

// Obtener estimación de próxima factura
router.get('/billing/next-estimate', authenticateToken, billingController.getNextInvoiceEstimate);

// NUEVAS RUTAS QUE FALTAN:
// Generar factura individual (solo admin) - ESTA ES LA QUE FALTA
router.post('/billing/invoices/generate', authenticateToken, isAdmin, billingController.generateInvoice);

// Vista previa de generación masiva (solo admin)
router.get('/billing/invoices/bulk-preview', authenticateToken, isAdmin, billingController.previewBulkGeneration);

// Generar facturas masivas (solo admin) 
router.post('/billing/invoices/generate-bulk', authenticateToken, isAdmin, billingController.generateBulkInvoices);

// Descargar una factura específica en PDF
router.get('/billing/invoices/:id/download', authenticateToken, validateMongoId('id'), billingController.downloadInvoice);

// Marcar una factura como pagada (solo admin)
router.post('/billing/invoices/:id/mark-as-paid', authenticateToken, isAdmin, validateMongoId('id'), billingController.markAsPaid);

// Disparar la generación manual de facturas mensuales (solo admin)
router.post('/billing/generate', authenticateToken, isAdmin, billingController.manualGenerateInvoices);
