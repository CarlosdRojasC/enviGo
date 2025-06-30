// backend/src/routes/billing.routes.js

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// Rutas para obtener facturas
router.get('/invoices', billingController.getInvoices);
router.get('/invoices/:id', billingController.getInvoiceById || billingController.getInvoices);

// Rutas para estadísticas de facturación
router.get('/stats', billingController.getBillingStats);
router.get('/next-invoice-estimate', billingController.getNextInvoiceEstimate);

// Rutas para acciones de facturas
router.put('/invoices/:id/mark-paid', billingController.markAsPaid);
router.get('/invoices/:id/download', billingController.downloadInvoice);

// Rutas para solicitudes y reportes (usuarios company)
router.post('/request-invoice', billingController.requestInvoice || billingController.manualGenerateInvoices);
router.post('/report-payment', billingController.reportPayment || billingController.markAsPaid);

// Rutas de exportación
router.get('/export', billingController.exportInvoices || billingController.getInvoices);
router.get('/payment-history', billingController.getPaymentHistory || billingController.getInvoices);

// Rutas administrativas (solo admin)
router.post('/generate-invoices', adminMiddleware, billingController.manualGenerateInvoices);
router.put('/company-info', billingController.updateBillingInfo || billingController.getBillingStats);

module.exports = router;