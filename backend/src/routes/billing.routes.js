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
router.get('/invoices/:id/details', authenticateToken, billingController.getInvoiceDetails);
router.get('/invoices/:id/orders', authenticateToken, billingController.getInvoiceOrders);
router.patch('/invoices/:id/notes', authenticateToken, billingController.updateInvoiceNotes);
router.post('/invoices/:id/duplicate', authenticateToken, isAdmin, billingController.duplicateInvoice);

// Generar facturas (solo admin)
router.post('/invoices/generate', authenticateToken, isAdmin, billingController.generateInvoice);
router.post('/invoices/generate-bulk', authenticateToken, isAdmin, billingController.generateBulkInvoices);
router.get('/invoices/bulk-preview', authenticateToken, isAdmin, billingController.previewBulkGeneration);
router.post('/invoices/:id/send', authenticateToken, isAdmin, validateMongoId('id'), billingController.sendInvoice);
router.put(
  '/invoices/:id/request-confirmation', 
  authenticateToken, // Protegida para usuarios logueados
  billingController.requestPaymentConfirmation
);

// RUTA PARA EL ADMIN: Confirmar que el pago ha sido recibido
router.put(
  '/invoices/:id/confirm-payment', 
  authenticateToken, // Protegida
  isAdmin, // Y solo para administradores
  billingController.confirmPayment
);


// Descargar y modificar facturas
router.get('/invoices/:id/download', authenticateToken, validateMongoId('id'), billingController.downloadInvoice);
router.post('/invoices/:id/mark-as-paid', authenticateToken, isAdmin, validateMongoId('id'), billingController.markAsPaid);


// Borrar facturas (solo admin)
router.delete('/invoices/:id', authenticateToken, isAdmin, validateMongoId('id'), billingController.deleteInvoice);
router.delete('/invoices', authenticateToken, isAdmin, billingController.deleteBulkInvoices); // Para borrado masivo


// ==================== NUEVAS RUTAS PARA FLUJO MEJORADO ====================

// ✅ RUTA PARA OBTENER PEDIDOS FACTURABLES
router.get('/invoiceable-orders', authenticateToken, billingController.getInvoiceableOrders);

// ✅ RUTA PARA GENERAR FACTURA MEJORADA (complementa la existente)
router.post('/invoices/generate-improved', authenticateToken, isAdmin, billingController.generateInvoiceImproved);

// ✅ RUTA PARA REVERTIR FACTURACIÓN
router.post('/invoices/:id/revert', authenticateToken, isAdmin, validateMongoId('id'), billingController.revertInvoicing);

// ✅ RUTA PARA ESTADÍSTICAS MEJORADAS DEL DASHBOARD
router.get('/dashboard-stats/:companyId', authenticateToken, billingController.getDashboardStats);

// ==================== RUTAS ADICIONALES ÚTILES ====================

// ✅ RUTA ALTERNATIVA PARA ESTADÍSTICAS (sin parámetro de empresa, usa la del usuario)
router.get('/my-dashboard-stats', authenticateToken, (req, res) => {
  // Redirigir a la ruta principal usando la empresa del usuario
  const companyId = req.user.company_id;
  req.params.companyId = companyId;
  return billingController.getDashboardStats(req, res);
});

// ✅ RUTA PARA OBTENER RESUMEN RÁPIDO DE FACTURACIÓN
router.get('/quick-summary', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === 'admin' ? req.query.company_id : req.user.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID requerido' });
    }

    // Obtener conteos rápidos
    const [deliveredCount, invoicedCount, pendingInvoices] = await Promise.all([
      Order.countDocuments({
        company_id: companyId,
        status: 'delivered',
        'billing_status.is_billable': true
      }),
      Order.countDocuments({
        company_id: companyId,
        status: 'invoiced'
      }),
      Invoice.countDocuments({
        company_id: companyId,
        status: { $in: ['draft', 'sent'] }
      })
    ]);

    res.json({
      ready_to_bill: deliveredCount,
      already_billed: invoicedCount,
      pending_invoices: pendingInvoices,
      billing_rate: deliveredCount + invoicedCount > 0 ? 
        Math.round((invoicedCount / (deliveredCount + invoicedCount)) * 100) : 0
    });

  } catch (error) {
    console.error('Error en quick-summary:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;