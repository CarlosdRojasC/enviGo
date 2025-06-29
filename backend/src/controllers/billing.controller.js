// backend/src/controllers/billing.controller.js

const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Company = require('../models/Company');
const { ERRORS } = require('../config/constants');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');

class BillingController {
  
 async generateMonthlyInvoices() {
    console.log('Ejecutando tarea de generación de facturas mensuales...');
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

        // --- LÓGICA DE FACTURACIÓN CORREGIDA ---
        const aggregationResult = await Order.aggregate([
          {
            $match: {
              company_id: company._id,
              status: 'delivered',
              delivery_date: {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1)
              }
            }
          },
          {
            $group: {
              _id: null,
              totalShippingCost: { $sum: "$shipping_cost" },
              totalOrders: { $sum: 1 }
            }
          }
        ]);

        if (aggregationResult.length > 0 && aggregationResult[0].totalOrders > 0) {
          const { totalShippingCost, totalOrders } = aggregationResult[0];
          const invoiceCount = await Invoice.countDocuments({}) + 1;
          const invoice_number = `INV-${year}${String(month).padStart(2, '0')}-${String(invoiceCount).padStart(4, '0')}`;

          const newInvoice = new Invoice({
            company_id: company._id,
            invoice_number,
            month,
            year,
            total_orders: totalOrders,
            total_amount_billed: totalShippingCost, // El total ahora es la suma de costos de envío
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
    try {
      const filters = {};
      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      }

      const invoices = await Invoice.find(filters)
        .populate('company_id', 'name email phone address')
        .sort({ year: -1, month: -1 });
        
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  async markAsPaid(req, res) {
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
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id).populate('company_id', 'name email phone address');

      if (!invoice) {
        return res.status(404).json({ error: 'Factura no encontrada' });
      }
      
      // Verificar permisos
      if (req.user.role !== 'admin' && req.user.company_id.toString() !== invoice.company_id._id.toString()) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }
      
      // Generar PDF usando PDFKit
      const pdfBuffer = await this.generateInvoicePDF(invoice);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura-${invoice.invoice_number}.pdf`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error al descargar la factura:", error);
      res.status(500).json({ error: 'Error generando el PDF de la factura.' });
    }
  }

  async generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header de la empresa
        doc.fontSize(20).font('Helvetica-Bold');
        doc.text('enviGo', 50, 50);
        doc.fontSize(10).font('Helvetica');
        doc.text('Sistema de Gestión de Envíos', 50, 75);
        doc.text('RUT: 12.345.678-9', 50, 90);
        doc.text('Santiago, Chile', 50, 105);
        doc.text('Email: facturacion@envigo.cl', 50, 120);

        // Información de la factura
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('FACTURA', 400, 50);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Número: ${invoice.invoice_number}`, 400, 75);
        doc.text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString('es-ES')}`, 400, 90);
        doc.text(`Vencimiento: ${new Date(invoice.due_date).toLocaleDateString('es-ES')}`, 400, 105);

        // Línea separadora
        doc.moveTo(50, 150).lineTo(550, 150).stroke();

        // Datos del cliente
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('FACTURAR A:', 50, 170);
        doc.fontSize(10).font('Helvetica');
        doc.text(invoice.company_id.name, 50, 190);
        if (invoice.company_id.email) {
          doc.text(`Email: ${invoice.company_id.email}`, 50, 205);
        }
        if (invoice.company_id.phone) {
          doc.text(`Teléfono: ${invoice.company_id.phone}`, 50, 220);
        }
        if (invoice.company_id.address) {
          doc.text(`Dirección: ${invoice.company_id.address}`, 50, 235);
        }

        // Período de facturación
        const startDate = new Date(invoice.year, invoice.month - 1, 1);
        const endDate = new Date(invoice.year, invoice.month, 0);
        doc.text(`Período: ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`, 50, 260);

        // Tabla de servicios
        let yPosition = 300;
        
        // Header de la tabla
        doc.fontSize(10).font('Helvetica-Bold');
        doc.rect(50, yPosition, 500, 20).fill('#f0f0f0').stroke();
        doc.fillColor('black');
        doc.text('Descripción', 60, yPosition + 6);
        doc.text('Cantidad', 250, yPosition + 6);
        doc.text('Precio Unit.', 350, yPosition + 6);
        doc.text('Total', 450, yPosition + 6);

        yPosition += 25;

        // Fila de servicio
        doc.fontSize(9).font('Helvetica');
        doc.text('Procesamiento de Pedidos', 60, yPosition);
        doc.text(`${invoice.total_orders} pedidos`, 250, yPosition);
        doc.text(`$${this.formatCurrency(invoice.price_per_order)}`, 350, yPosition);
        doc.text(`$${this.formatCurrency(invoice.amount_due)}`, 450, yPosition);

        yPosition += 30;

        // Línea separadora
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

        // Totales
        yPosition += 20;
        const subtotal = invoice.amount_due;
        const iva = Math.round(subtotal * 0.19);
        const total = subtotal + iva;

        doc.fontSize(10).font('Helvetica');
        doc.text('Subtotal:', 400, yPosition);
        doc.text(`$${this.formatCurrency(subtotal)}`, 480, yPosition);

        yPosition += 15;
        doc.text('IVA (19%):', 400, yPosition);
        doc.text(`$${this.formatCurrency(iva)}`, 480, yPosition);

        yPosition += 15;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('TOTAL:', 400, yPosition);
        doc.text(`$${this.formatCurrency(total)}`, 480, yPosition);

        // Información de pago
        yPosition += 50;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('INFORMACIÓN DE PAGO:', 50, yPosition);
        
        yPosition += 20;
        doc.fontSize(9).font('Helvetica');
        doc.text('Banco: Banco de Chile', 50, yPosition);
        doc.text('Cuenta Corriente: 123-456-789', 50, yPosition + 15);
        doc.text('RUT: 12.345.678-9', 50, yPosition + 30);
        doc.text('Email: facturacion@envigo.cl', 50, yPosition + 45);

        // Footer
        doc.fontSize(8).font('Helvetica');
        doc.text('Gracias por confiar en enviGo para la gestión de sus envíos.', 50, 750, {
          align: 'center',
          width: 500
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
   // Obtener estadísticas de facturación para una empresa
  async getBillingStats(req, res) {
    try {
      const companyId = req.user.role === 'admin' ? req.query.company_id : req.user.company_id;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID requerido' });
      }

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      // Obtener estadísticas de facturas
      const invoiceStats = await this.getInvoiceStatistics(companyId);
      
      // Obtener estimación de próxima factura
      const nextInvoiceEstimate = await this.getNextInvoiceEstimate(companyId, company.price_per_order);
      
      // Obtener información de precios actual
      const currentPricing = await this.getCurrentPricing(company);

      res.json({
        invoiceSummary: invoiceStats,
        nextInvoiceEstimate,
        currentPricing,
        companyInfo: {
          name: company.name,
          rut: company.rut,
          address: company.address,
          contactEmail: company.email || company.contact_email
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de facturación:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener estadísticas de facturas existentes
  async getInvoiceStatistics(companyId) {
    try {
      const invoices = await Invoice.find({ company_id: companyId });
      
      let pendingAmount = 0;
      let pendingCount = 0;
      let paidAmount = 0;
      let paidCount = 0;
      let totalOrders = 0;

      invoices.forEach(invoice => {
        totalOrders += invoice.total_orders || 0;
        
        if (['pending', 'sent', 'overdue'].includes(invoice.status)) {
          pendingAmount += invoice.total_amount || 0;
          pendingCount++;
        }
        
        if (invoice.status === 'paid') {
          paidAmount += invoice.total_amount || 0;
          paidCount++;
        }
      });

      // Obtener pedidos del mes actual
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const ordersThisMonth = await Order.countDocuments({
        company_id: companyId,
        order_date: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1)
        }
      });

      return {
        pendingAmount,
        pendingCount,
        paidAmount,
        paidCount,
        totalOrders,
        ordersThisMonth
      };

    } catch (error) {
      console.error('Error calculando estadísticas de facturas:', error);
      return {
        pendingAmount: 0,
        pendingCount: 0,
        paidAmount: 0,
        paidCount: 0,
        totalOrders: 0,
        ordersThisMonth: 0
      };
    }
  }

  // Estimar próxima factura basada en pedidos del mes actual
  async getNextInvoiceEstimate(companyId, pricePerOrder) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Obtener pedidos entregados del mes actual
      const deliveredOrdersThisMonth = await Order.countDocuments({
        company_id: companyId,
        status: 'delivered',
        delivery_date: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1)
        }
      });

      // Obtener todos los pedidos del mes actual para estimar total
      const totalOrdersThisMonth = await Order.countDocuments({
        company_id: companyId,
        order_date: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1)
        }
      });

      // Calcular progreso del mes (días transcurridos / días totales)
      const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
      const daysInMonth = lastDayOfMonth.getDate();
      const daysPassed = now.getDate();
      const monthProgress = daysPassed / daysInMonth;

      // Estimar pedidos totales basado en el progreso del mes
      let estimatedTotalOrders;
      if (monthProgress > 0.1) { // Si hemos pasado al menos el 10% del mes
        estimatedTotalOrders = Math.round(totalOrdersThisMonth / monthProgress);
      } else {
        // Si es muy temprano en el mes, usar promedio de meses anteriores
        const avgOrdersFromPreviousMonths = await this.getAverageOrdersFromPreviousMonths(companyId, 3);
        estimatedTotalOrders = avgOrdersFromPreviousMonths;
      }

      // Estimar pedidos entregados basado en la tasa de entrega histórica
      const deliveryRate = await this.getHistoricalDeliveryRate(companyId);
      const estimatedDeliveredOrders = Math.round(estimatedTotalOrders * deliveryRate);

      // Calcular montos
      const subtotal = estimatedDeliveredOrders * pricePerOrder;
      const iva = Math.round(subtotal * 0.19);
      const total = subtotal + iva;

      // Calcular período de la próxima factura
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const periodStart = new Date(currentYear, currentMonth - 1, 1);
      const periodEnd = new Date(currentYear, currentMonth, 0);

      return {
        ordersCount: estimatedDeliveredOrders,
        totalOrdersThisMonth,
        deliveredOrdersThisMonth,
        monthProgress: Math.round(monthProgress * 100),
        subtotal,
        iva,
        total,
        period: {
          start: periodStart,
          end: periodEnd,
          month: currentMonth,
          year: currentYear
        },
        estimationMethod: monthProgress > 0.1 ? 'current_month_projection' : 'historical_average'
      };

    } catch (error) {
      console.error('Error estimando próxima factura:', error);
      return {
        ordersCount: 0,
        totalOrdersThisMonth: 0,
        deliveredOrdersThisMonth: 0,
        monthProgress: 0,
        subtotal: 0,
        iva: 0,
        total: 0,
        period: {
          start: new Date(),
          end: new Date(),
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        },
        estimationMethod: 'no_data'
      };
    }
  }

  // Obtener promedio de pedidos de meses anteriores
  async getAverageOrdersFromPreviousMonths(companyId, monthsBack = 3) {
    try {
      const now = new Date();
      const promises = [];

      for (let i = 1; i <= monthsBack; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        promises.push(
          Order.countDocuments({
            company_id: companyId,
            order_date: {
              $gte: startDate,
              $lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
            }
          })
        );
      }

      const counts = await Promise.all(promises);
      const total = counts.reduce((sum, count) => sum + count, 0);
      return Math.round(total / monthsBack);

    } catch (error) {
      console.error('Error calculando promedio de meses anteriores:', error);
      return 0;
    }
  }

  // Obtener tasa de entrega histórica
  async getHistoricalDeliveryRate(companyId) {
    try {
      const totalOrders = await Order.countDocuments({ company_id: companyId });
      const deliveredOrders = await Order.countDocuments({ 
        company_id: companyId, 
        status: 'delivered' 
      });

      if (totalOrders === 0) return 0.85; // Tasa por defecto del 85%
      
      const rate = deliveredOrders / totalOrders;
      return Math.max(0.5, Math.min(1, rate)); // Entre 50% y 100%

    } catch (error) {
      console.error('Error calculando tasa de entrega:', error);
      return 0.85; // Tasa por defecto
    }
  }

  // Obtener información de precios actual
  async getCurrentPricing(company) {
    const pricePerOrder = company.price_per_order || 0;
    const ivaPerOrder = Math.round(pricePerOrder * 0.19);
    const totalPerOrder = pricePerOrder + ivaPerOrder;

    return {
      planType: company.plan_type || 'basic',
      pricePerOrder: pricePerOrder,
      ivaPerOrder: ivaPerOrder,
      totalPerOrder: totalPerOrder,
      billingCycle: company.billing_cycle || 'monthly'
    };
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL').format(amount || 0);
  }
}

const billingControllerInstance = new BillingController();

// Bind methods to instance
Object.getOwnPropertyNames(BillingController.prototype).forEach(method => {
    if (method !== 'constructor') {
        billingControllerInstance[method] = billingControllerInstance[method].bind(billingControllerInstance);
    }
});

// Configuración del cron job
cron.schedule('0 1 1 * *', () => {
  billingControllerInstance.generateMonthlyInvoices();
}, {
  timezone: "America/Santiago"
});

console.log('✅ Tarea programada de facturación configurada para ejecutarse el día 1 de cada mes.');

module.exports = billingControllerInstance;