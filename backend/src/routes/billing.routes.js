// backend/src/routes/billing.routes.js

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const {
  authenticateToken,
  isAdmin} = require('../middlewares/auth.middleware');
const { validateMongoId } = require('../middlewares/validators/generic.validator');

// ==================== FACTURACIÓN (BILLING) ====================

router.get('/billing/invoices', authenticateToken, billingController.getInvoices);
router.get('/billing/stats', authenticateToken, billingController.getBillingStats);
router.get('/billing/next-estimate', authenticateToken, billingController.getNextInvoiceEstimate);
router.post('/billing/invoices/generate', authenticateToken, isAdmin, billingController.generateInvoice);
router.get('/billing/invoices/bulk-preview', authenticateToken, isAdmin, billingController.previewBulkGeneration);
router.post('/billing/invoices/generate-bulk', authenticateToken, isAdmin, billingController.generateBulkInvoices);
router.get('/billing/invoices/:id/download', authenticateToken, validateMongoId('id'), billingController.downloadInvoice);
router.post('/billing/invoices/:id/mark-as-paid', authenticateToken, isAdmin, validateMongoId('id'), billingController.markAsPaid);
router.post('/billing/generate', authenticateToken, isAdmin, billingController.manualGenerateInvoices);
router.get('/billing/financial-summary', authenticateToken, isAdmin, billingController.getFinancialSummary);
router.delete('/billing/invoices/:id', authenticateToken, isAdmin, validateMongoId('id'), billingController.deleteInvoice);
router.delete('/billing/invoices', authenticateToken, isAdmin, billingController.deleteBulkInvoices);
router.delete('/billing/invoices/all/development', authenticateToken, isAdmin, billingController.deleteAllInvoices);

module.exports = router;