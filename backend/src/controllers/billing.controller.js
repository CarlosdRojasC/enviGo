// backend/src/controllers/billing.controller.js

const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Company = require('../models/Company');
const { ERRORS } = require('../config/constants');
const cron = require('node-cron');

// Simulación de un generador de PDF.
const PdfService = {
  generateInvoicePdf: async (invoice) => {
    const content = `
      Factura Simplificada
      --------------------
      Empresa: ${invoice.company_id.name}
      Número de Factura: ${invoice.invoice_number}
      Mes de Servicio: ${invoice.month}/${invoice.year}
      Total Pedidos Entregados: ${invoice.total_orders}
      Precio por Pedido: $${invoice.price_per_order}
      Monto a Pagar: $${invoice.amount_due}
      Estado: ${invoice.status}
    `;
    return Buffer.from(content);
  }
};

class BillingController {
  
  async generateMonthlyInvoices() {
    console.log('Ejecutando tarea de generación de facturas mensuales...');
    // ... (lógica existente sin cambios)
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 1);
    
    const year = lastDayOfPreviousMonth.getFullYear();
    const month = lastDayOfPreviousMonth.getMonth() + 1;

    try {
      const companies = await Company.find({ is_active: true });

      for (const company of companies) {
        const existingInvoice = await Invoice.findOne({ company_id: company._id, month, year });
        if (existingInvoice) {
          console.log(`La factura para ${company.name} para ${month}/${year} ya existe. Saltando.`);
          continue;
        }

        const deliveredOrders = await Order.countDocuments({
          company_id: company._id,
          status: 'delivered',
          delivery_date: {
            $gte: new Date(year, month - 1, 1),
            $lt: new Date(year, month, 1)
          }
        });

        if (deliveredOrders > 0) {
          const amount_due = deliveredOrders * company.price_per_order;
          const invoiceCount = await Invoice.countDocuments({}) + 1;
          const invoice_number = `INV-${year}${String(month).padStart(2, '0')}-${String(invoiceCount).padStart(4, '0')}`;

          const newInvoice = new Invoice({
            company_id: company._id,
            invoice_number,
            month,
            year,
            total_orders: deliveredOrders,
            price_per_order: company.price_per_order,
            amount_due,
            due_date: new Date(today.getFullYear(), today.getMonth() + 1, 15)
          });

          await newInvoice.save();
          console.log(`Factura creada para ${company.name}: ${invoice_number}`);
        }
      }
      console.log('Tarea de generación de facturas completada.');
    } catch (error) {
      console.error('Error generando facturas mensuales:', error);
    }
  }

  async manualGenerateInvoices(req, res) {
    console.log('Solicitud manual para generar facturas recibida.');
    await this.generateMonthlyInvoices(); 
    res.status(200).json({ message: 'Proceso de generación de facturas iniciado. Las facturas para el mes anterior han sido creadas si correspondía.' });
  }

  async getInvoices(req, res) {
    // ... (lógica existente sin cambios)
    try {
      const filters = {};
      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      }

      const invoices = await Invoice.find(filters)
        .populate('company_id', 'name')
        .sort({ year: -1, month: -1 });
        
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  async markAsPaid(req, res) {
    // ... (lógica existente sin cambios)
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id);

      if (!invoice) {
        return res.status(404).json({ error: 'Factura no encontrada' });
      }

      invoice.status = 'paid';
      invoice.paid_date = new Date();
      await invoice.save();

      res.json({ message: 'Factura marcada como pagada.', invoice });
    } catch (error) {
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }
  
  async downloadInvoice(req, res) {
    // ... (lógica existente sin cambios)
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id).populate('company_id', 'name');

      if (!invoice) {
        return res.status(404).json({ error: 'Factura no encontrada' });
      }
      
      if (req.user.role !== 'admin' && req.user.company_id.toString() !== invoice.company_id._id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      const pdfBuffer = await PdfService.generateInvoicePdf(invoice);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura-${invoice.invoice_number}.pdf`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error al descargar la factura:", error);
      res.status(500).json({ error: 'Error generando el PDF de la factura.' });
    }
  }
}

const billingControllerInstance = new BillingController();

// AÑADIMOS ESTA SECCIÓN PARA CORREGIR EL ERROR
// "Atamos" (bind) el contexto 'this' de cada método a la instancia del controlador.
// Esto asegura que dentro de las funciones, 'this' siempre se refiera a 'billingControllerInstance'.
Object.getOwnPropertyNames(BillingController.prototype).forEach(method => {
    if (method !== 'constructor') {
        billingControllerInstance[method] = billingControllerInstance[method].bind(billingControllerInstance);
    }
});
// FIN DE LA CORRECCIÓN

// Configuración del cron job (sin cambios)
cron.schedule('0 1 1 * *', () => {
  billingControllerInstance.generateMonthlyInvoices();
}, {
  timezone: "America/Santiago"
});

console.log('✅ Tarea programada de facturación configurada para ejecutarse el día 1 de cada mes.');

module.exports = billingControllerInstance;