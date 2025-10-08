// backend/src/controllers/billing.controller.js
// Versión modernizada con: Pino logger, respuestas unificadas, validación express-validator,
// transacciones Mongoose y compatibilidad con tus endpoints actuales.

const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { body, query, param } = require('express-validator');

const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Company = require('../models/Company');
const NotificationService = require('../services/notification.service');

const { ERRORS } = require('../config/constants');
const { success, fail } = require('../utils/response');
const logger = require('../utils/logger');

class BillingController {
  // ==============
  //  CREACIÓN (unidad y masiva)
  // ==============

  // [POST] /api/billing/invoices
  async generateInvoice(req, res) {
    const session = await mongoose.startSession();
    const log = logger.child({ ctrl: 'billing', op: 'generateInvoice' });

    try {
      await session.withTransaction(async () => {
        const {
          company_id,
          period_start,
          period_end,
          order_ids,
          type = 'invoice',
        } = req.body;

        if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

        if (!company_id || !period_start || !period_end || !order_ids?.length) {
          return fail(
            res,
            'Se requieren company_id, period_start, period_end y al menos un order_id',
            400
          );
        }

        const company = await Company.findById(company_id).session(session);
        if (!company) return fail(res, 'Empresa no encontrada', 404);

        const orders = await Order.find({
          _id: { $in: order_ids.map((id) => new mongoose.Types.ObjectId(id)) },
          company_id: new mongoose.Types.ObjectId(company_id),
        })
          .session(session)
          .lean();

        if (!orders.length) return fail(res, 'Los pedidos seleccionados no son válidos.', 400);

        const subtotal = orders.reduce((acc, o) => acc + (o.shipping_cost || 0), 0);
        const tax_amount = Math.round(subtotal * 0.19);
        const total_amount = subtotal + tax_amount;

        const invoice_number = await this.generateUniqueInvoiceNumber(session);

        const newInvoice = new Invoice({
          company_id,
          invoice_number,
          month: new Date(period_end).getMonth() + 1,
          year: new Date(period_end).getFullYear(),
          total_orders: orders.length,
          price_per_order: company.price_per_order,
          subtotal,
          tax_amount,
          total_amount,
          amount_due: subtotal,
          period_start: new Date(period_start),
          period_end: new Date(period_end),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'draft',
          order_ids,
        });

        await newInvoice.save({ session });

        await Order.updateMany(
          { _id: { $in: orders.map((o) => o._id) } },
          { $set: { billed: true, invoice_id: newInvoice._id, status: 'invoiced' } },
          { session }
        );

        const invoiceWithCompany = await Invoice.findById(newInvoice._id)
          .populate('company_id', 'name email')
          .session(session);

        log.info({ invoice_number, company_id, count: orders.length }, 'Factura creada');
        return success(res, 'Factura generada exitosamente', { invoice: invoiceWithCompany }, 201);
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'generateInvoice' }, 'Error generando factura');
      return fail(res, 'Error interno del servidor al generar la factura', 500);
    } finally {
      await session.endSession();
    }
  }

  // [POST] /api/billing/invoices/bulk
  async generateBulkInvoices(req, res) {
    const log = logger.child({ ctrl: 'billing', op: 'generateBulkInvoices' });

    try {
      const { period_start, period_end, only_with_orders = true, exclude_existing = true } = req.body;

      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);
      if (!period_start || !period_end) return fail(res, 'Se requieren period_start y period_end', 400);

      const companies = await Company.find({ is_active: true }).lean();
      const generatedInvoices = [];
      const errors = [];

      for (const company of companies) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            if (exclude_existing) {
              const existingInvoice = await Invoice.findOne({
                company_id: company._id,
                period_start: { $gte: new Date(period_start) },
                period_end: { $lte: new Date(period_end) },
              })
                .session(session)
                .lean();

              if (existingInvoice) return; // saltar
            }

            const orders = await Order.find({
              company_id: company._id,
              status: 'delivered',
              order_date: { $gte: new Date(period_start), $lte: new Date(period_end) },
            })
              .session(session)
              .lean();

            if (only_with_orders && orders.length === 0) return;

            const subtotal = orders.reduce((acc, o) => acc + (o.shipping_cost || 0), 0);
            const total_orders = orders.length;
            const price_per_order = company.price_per_order || 0;
            const tax_amount = Math.round(subtotal * 0.19);
            const total_amount = subtotal + tax_amount;

            const invoice_number = await this.generateUniqueInvoiceNumber(session);

            const invoice = new Invoice({
              company_id: company._id,
              invoice_number,
              month: new Date(period_end).getMonth() + 1,
              year: new Date(period_end).getFullYear(),
              total_orders,
              price_per_order,
              amount_due: subtotal,
              subtotal,
              tax_amount,
              total_amount,
              period_start: new Date(period_start),
              period_end: new Date(period_end),
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'draft',
            });

            await invoice.save({ session });

            if (orders.length > 0) {
              await Order.updateMany(
                { _id: { $in: orders.map((o) => o._id) } },
                { $set: { invoice_id: invoice._id, billed: true, updated_at: new Date() } },
                { session }
              );
            }

            generatedInvoices.push({
              company_name: company.name,
              invoice_number,
              total_orders,
              total_amount,
            });
          });
        } catch (companyError) {
          errors.push({ company_name: company.name, error: companyError.message });
          log.warn({ company: company.name, err: companyError.message }, 'Fallo al generar factura masiva');
        } finally {
          await session.endSession();
        }
      }

      return success(res, `Generadas ${generatedInvoices.length} facturas`, {
        generated_invoices: generatedInvoices,
        errors: errors.length ? errors : undefined,
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'generateBulkInvoices' }, 'Error masivo');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [GET] /api/billing/invoices/preview
  async previewBulkGeneration(req, res) {
    const log = logger.child({ ctrl: 'billing', op: 'previewBulkGeneration' });
    try {
      const { period_start, period_end, only_with_orders = true, exclude_existing = true } = req.query;

      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);
      if (!period_start || !period_end) return fail(res, 'Se requieren period_start y period_end', 400);

      const companies = await Company.find({ is_active: true }).lean();
      const preview = [];

      for (const company of companies) {
        if (exclude_existing) {
          const existingInvoice = await Invoice.findOne({
            company_id: company._id,
            period_start: { $gte: new Date(period_start) },
            period_end: { $lte: new Date(period_end) },
          })
            .lean();

          if (existingInvoice) continue;
        }

        const orders = await Order.find({
          company_id: company._id,
          order_date: { $gte: new Date(period_start), $lte: new Date(period_end) },
        }).lean();

        if (only_with_orders && orders.length === 0) continue;

        const subtotal = orders.reduce((acc, o) => acc + (o.shipping_cost || 0), 0);
        const price_per_order = company.price_per_order || 0;
        const tax_amount = Math.round(subtotal * 0.19);
        const total_amount = subtotal + tax_amount;

        preview.push({
          company_id: company._id,
          company_name: company.name,
          orders_count: orders.length,
          price_per_order,
          subtotal,
          tax_amount,
          total_amount,
        });
      }

      return res.json(preview);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'previewBulkGeneration' }, 'Error preview');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // ==============
  //  ACCIONES Y ESTADOS
  // ==============

  // [POST] /api/billing/invoices/:id/send
  async sendInvoice(req, res) {
    const log = logger.child({ ctrl: 'billing', op: 'sendInvoice' });
    try {
      const { id } = req.params;
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

      const invoice = await Invoice.findById(id).populate('company_id', 'name email contact_email');
      if (!invoice) return fail(res, 'Factura no encontrada', 404);
      if (invoice.status !== 'draft') return fail(res, 'Solo se pueden enviar facturas en borrador', 400);

      invoice.status = 'sent';
      invoice.sent_at = new Date();
      await invoice.save();

      const companyEmail = invoice.company_id.contact_email || invoice.company_id.email;
      if (companyEmail) {
        try {
          const formattedData = {
            number: invoice.invoice_number,
            period: `${new Date(invoice.period_start).toLocaleDateString('es-ES')} - ${new Date(
              invoice.period_end
            ).toLocaleDateString('es-ES')}`,
            issue_date: new Date(invoice.created_at).toLocaleDateString('es-ES'),
            due_date: new Date(invoice.due_date).toLocaleDateString('es-ES'),
            total_amount: `$${new Intl.NumberFormat('es-CL').format(invoice.total_amount)}`,
            total_orders: invoice.total_orders,
            download_url: `${process.env.BASE_URL}/api/billing/invoices/${invoice._id}/download`,
          };

          await NotificationService.sendInvoiceEmail(companyEmail, invoice.company_id.name, formattedData);
          log.info({ invoice: invoice.invoice_number, email: companyEmail }, 'Factura enviada');
        } catch (emailError) {
          logger.error({ err: emailError, ctrl: 'billing', op: 'sendInvoice' }, 'Fallo al enviar email');
        }
      } else {
        log.warn({ company: invoice.company_id.name }, 'Empresa sin email para envío de factura');
      }

      return success(res, 'Factura enviada exitosamente', { invoice });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'sendInvoice' }, 'Error enviando factura');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [POST] /api/billing/invoices/:id/request-payment
  async requestPaymentConfirmation(req, res) {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id);

      if (!invoice) return fail(res, 'Factura no encontrada', 404);
      if (req.user.company_id.toString() !== invoice.company_id.toString())
        return fail(res, 'No tienes permiso para modificar esta factura', 403);

      if (!['sent', 'overdue'].includes(invoice.status)) {
        return fail(res, `No se puede notificar el pago de una factura en estado "${invoice.status}"`, 400);
      }

      invoice.status = 'pending_confirmation';
      invoice.payment_notification_date = new Date();
      await invoice.save();

      return success(res, 'Notificación de pago enviada. El administrador la revisará pronto.');
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'requestPaymentConfirmation' }, 'Error notificando pago');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [POST] /api/billing/invoices/:id/confirm-payment
  async confirmPayment(req, res) {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id);
      if (!invoice) return fail(res, 'Factura no encontrada', 404);
      if (invoice.status !== 'pending_confirmation')
        return fail(res, 'Esta factura no está pendiente de confirmación.', 400);

      invoice.status = 'paid';
      invoice.paid_date = new Date();
      await invoice.save();

      return success(res, 'Pago confirmado exitosamente', { invoice });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'confirmPayment' }, 'Error confirmando pago');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [PATCH] /api/billing/invoices/:id/mark-paid
  async markAsPaid(req, res) {
    try {
      const { id } = req.params;
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

      const invoice = await Invoice.findById(id);
      if (!invoice) return fail(res, 'Factura no encontrada', 404);

      invoice.status = 'paid';
      invoice.paid_date = new Date();
      await invoice.save();

      return success(res, 'Factura marcada como pagada', { invoice });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'markAsPaid' }, 'Error marcando pagada');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // ==============
  //  CONSULTAS Y LISTADOS
  // ==============

  // [GET] /api/billing/invoices
  async getInvoices(req, res) {
    try {
      const { page = 1, limit = 15, status, company_id, period, search } = req.query;

      const filters = {};
      if (req.user.role !== 'admin') {
        filters.company_id = req.user.company_id;
      } else if (company_id) {
        filters.company_id = company_id;
      }

      if (status) filters.status = status;

      if (period) {
        const now = new Date();
        switch (period) {
          case 'current':
            filters.month = now.getMonth() + 1;
            filters.year = now.getFullYear();
            break;
          case 'last': {
            const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
            const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            filters.month = lastMonth;
            filters.year = lastYear;
            break;
          }
          case 'quarter':
            filters.period_start = { $gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
            break;
          case 'year':
            filters.year = now.getFullYear();
            break;
        }
      }

      if (search) filters.$or = [{ invoice_number: new RegExp(search, 'i') }];

      const skip = (Number(page) - 1) * Number(limit);

      const [invoices, totalCount] = await Promise.all([
        Invoice.find(filters)
          .populate('company_id', 'name email phone address rut')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Invoice.countDocuments(filters),
      ]);

      return success(res, 'Listado de facturas', {
        invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
        },
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getInvoices' }, 'Error listando facturas');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [GET] /api/billing/invoices/:id
  async getInvoiceDetails(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findById(id)
        .populate('company_id', 'name email rut address phone')
        .lean();

      if (!invoice) return fail(res, 'Factura no encontrada', 404);

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== invoice.company_id._id.toString()) {
        return fail(res, ERRORS.FORBIDDEN, 403);
      }

      return res.json(invoice);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getInvoiceDetails' }, 'Error detalle factura');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [GET] /api/billing/invoices/:id/orders
  async getInvoiceOrders(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findById(id);
      if (!invoice) return fail(res, 'Factura no encontrada', 404);

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== invoice.company_id.toString()) {
        return fail(res, ERRORS.FORBIDDEN, 403);
      }

      const orders = await Order.find({ invoice_id: id })
        .select('order_number customer_name customer_phone shipping_address status created_at shipping_cost')
        .lean();

      return res.json(orders);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getInvoiceOrders' }, 'Error pedidos de factura');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [GET] /api/billing/invoices/:id/download
  async downloadInvoice(req, res) {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id).populate('company_id', 'name email phone address rut');

      if (!invoice) return fail(res, 'Factura no encontrada', 404);
      if (req.user.role !== 'admin' && req.user.company_id.toString() !== invoice.company_id._id.toString()) {
        return fail(res, ERRORS.FORBIDDEN, 403);
      }

      const pdfBuffer = await this.generateInvoicePDF(invoice);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura-${invoice.invoice_number}.pdf`);
      return res.send(pdfBuffer);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'downloadInvoice' }, 'Error PDF factura');
      return fail(res, 'Error generando el PDF de la factura.', 500);
    }
  }

  // ==============
  //  MÉTRICAS Y ESTADÍSTICAS
  // ==============

  // [GET] /api/billing/stats
  async getBillingStats(req, res) {
    try {
      const companyId = req.user.role === 'admin' ? req.query.company_id : req.user.company_id;
      if (!companyId) return fail(res, 'Company ID requerido', 400);

      const company = await Company.findById(companyId);
      if (!company) return fail(res, 'Empresa no encontrada', 404);

      const invoiceStats = await this.getInvoiceStatistics(companyId);
      const nextInvoiceEstimate = await this.computeNextInvoiceEstimate(companyId, company.price_per_order);
      const currentPricing = await this.getCurrentPricing(company);

      return success(res, 'Estadísticas de facturación', {
        invoiceSummary: invoiceStats,
        nextInvoiceEstimate,
        currentPricing,
        companyInfo: {
          name: company.name,
          rut: company.rut,
          address: company.address,
          contactEmail: company.email || company.contact_email,
        },
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getBillingStats' }, 'Error stats billing');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [GET] /api/billing/estimate
  async getNextInvoiceEstimate(req, res) {
    try {
      const companyId = req.user.role === 'admin' ? req.query.company_id : req.user.company_id;
      if (!companyId) return fail(res, 'Company ID requerido', 400);

      const company = await Company.findById(companyId);
      if (!company) return fail(res, 'Empresa no encontrada', 404);

      const estimate = await this.computeNextInvoiceEstimate(companyId, company.price_per_order);
      return res.json(estimate);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getNextInvoiceEstimate' }, 'Error estimate');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  async getInvoiceStatistics(companyId) {
    try {
      const invoices = await Invoice.find({ company_id: companyId }).lean();

      let pendingAmount = 0;
      let pendingCount = 0;
      let paidAmount = 0;
      let paidCount = 0;
      let totalOrders = 0;

      invoices.forEach((inv) => {
        totalOrders += inv.total_orders || 0;
        if (['sent', 'overdue'].includes(inv.status)) {
          pendingAmount += inv.total_amount || 0;
          pendingCount++;
        }
        if (inv.status === 'paid') {
          paidAmount += inv.total_amount || 0;
          paidCount++;
        }
      });

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const ordersThisMonth = await Order.countDocuments({
        company_id: companyId,
        order_date: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1),
        },
      });

      return { pendingAmount, pendingCount, paidAmount, paidCount, totalOrders, ordersThisMonth };
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getInvoiceStatistics' }, 'Error stats facturas');
      return { pendingAmount: 0, pendingCount: 0, paidAmount: 0, paidCount: 0, totalOrders: 0, ordersThisMonth: 0 };
    }
  }

  async computeNextInvoiceEstimate(companyId, pricePerOrder) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const deliveredOrdersThisMonth = await Order.countDocuments({
        company_id: companyId,
        status: 'delivered',
        delivery_date: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1),
        },
      });

      const totalOrdersThisMonth = await Order.countDocuments({
        company_id: companyId,
        order_date: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1),
        },
      });

      const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
      const daysInMonth = lastDayOfMonth.getDate();
      const daysPassed = now.getDate();
      const monthProgress = daysPassed / daysInMonth;

      let estimatedTotalOrders;
      if (monthProgress > 0.1) {
        estimatedTotalOrders = Math.round(totalOrdersThisMonth / monthProgress);
      } else {
        const avg = await this.getAverageOrdersFromPreviousMonths(companyId, 3);
        estimatedTotalOrders = avg;
      }

      const deliveryRate = await this.getHistoricalDeliveryRate(companyId);
      const estimatedDeliveredOrders = Math.round(estimatedTotalOrders * deliveryRate);

      const subtotal = estimatedDeliveredOrders * (pricePerOrder || 0);
      const iva = Math.round(subtotal * 0.19);
      const total = subtotal + iva;

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
        period: { start: periodStart, end: periodEnd, month: currentMonth, year: currentYear },
        estimationMethod: monthProgress > 0.1 ? 'current_month_projection' : 'historical_average',
      };
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'computeNextInvoiceEstimate' }, 'Error estimate');
      return {
        ordersCount: 0,
        totalOrdersThisMonth: 0,
        deliveredOrdersThisMonth: 0,
        monthProgress: 0,
        subtotal: 0,
        iva: 0,
        total: 0,
        period: { start: new Date(), end: new Date(), month: new Date().getMonth() + 1, year: new Date().getFullYear() },
        estimationMethod: 'no_data',
      };
    }
  }

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
            order_date: { $gte: startDate, $lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000) },
          })
        );
      }

      const counts = await Promise.all(promises);
      const total = counts.reduce((sum, count) => sum + count, 0);
      return Math.round(total / monthsBack);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getAverageOrdersFromPreviousMonths' }, 'Error promedio meses');
      return 0;
    }
  }

  async getHistoricalDeliveryRate(companyId) {
    try {
      const totalOrders = await Order.countDocuments({ company_id: companyId });
      const deliveredOrders = await Order.countDocuments({ company_id: companyId, status: 'delivered' });
      if (totalOrders === 0) return 0.85;
      const rate = deliveredOrders / totalOrders;
      return Math.max(0.5, Math.min(1, rate));
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getHistoricalDeliveryRate' }, 'Error tasa histórica');
      return 0.85;
    }
  }

  async getCurrentPricing(company) {
    const pricePerOrder = company.price_per_order || 0;
    const ivaPerOrder = Math.round(pricePerOrder * 0.19);
    const totalPerOrder = pricePerOrder + ivaPerOrder;

    return {
      planType: company.plan_type || 'basic',
      pricePerOrder,
      ivaPerOrder,
      totalPerOrder,
      billingCycle: company.billing_cycle || 'monthly',
    };
    // Nota: sin logs aquí por ser función pura.
  }

  // ==============
  //  DESCARGA PDF
  // ==============

  async generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        doc.on('data', (d) => buffers.push(d));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header enviGo
        doc.fontSize(20).font('Helvetica-Bold').text('enviGo', 50, 50);
        doc.fontSize(10).font('Helvetica').text('Sistema de Gestión de Envíos', 50, 75);
        doc.text('RUT: 78.200.293-7', 50, 90);
        doc.text('Santiago, Chile', 50, 105);
        doc.text('Email: contacto@envigo.cl', 50, 120);

        // Info Factura
        doc.fontSize(16).font('Helvetica-Bold').text('FACTURA', 400, 50);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Número: ${invoice.invoice_number}`, 400, 75);
        doc.text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString('es-ES')}`, 400, 90);
        doc.text(`Vencimiento: ${new Date(invoice.due_date).toLocaleDateString('es-ES')}`, 400, 105);

        doc.moveTo(50, 150).lineTo(550, 150).stroke();

        // Datos cliente
        doc.fontSize(12).font('Helvetica-Bold').text('FACTURAR A:', 50, 170);
        doc.fontSize(10).font('Helvetica');
        doc.text(invoice.company_id.name, 50, 190);
        if (invoice.company_id.email) doc.text(`Email: ${invoice.company_id.email}`, 50, 205);
        if (invoice.company_id.phone) doc.text(`Teléfono: ${invoice.company_id.phone}`, 50, 220);
        if (invoice.company_id.address) doc.text(`Dirección: ${invoice.company_id.address}`, 50, 235);

        const startDate = new Date(invoice.period_start);
        const endDate = new Date(invoice.period_end);
        doc.text(`Período: ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`, 50, 260);

        // Tabla
        let y = 300;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.rect(50, y, 500, 20).fill('#f0f0f0').stroke();
        doc.fillColor('black');
        doc.text('Descripción', 60, y + 6);
        doc.text('Cantidad', 250, y + 6);
        doc.text('Precio Unit.', 350, y + 6);
        doc.text('Total', 450, y + 6);

        y += 25;

        doc.fontSize(9).font('Helvetica');
        doc.text('Procesamiento de Pedidos', 60, y);
        doc.text(`${invoice.total_orders} pedidos`, 250, y);
        doc.text(`$${this.formatCurrency(invoice.price_per_order)}`, 350, y);
        doc.text(`$${this.formatCurrency(invoice.subtotal)}`, 450, y);

        y += 30;
        doc.moveTo(50, y).lineTo(550, y).stroke();

        y += 20;
        const subtotal = invoice.subtotal;
        const iva = invoice.tax_amount;
        const total = invoice.total_amount;

        doc.fontSize(10).font('Helvetica');
        doc.text('Subtotal:', 400, y);
        doc.text(`$${this.formatCurrency(subtotal)}`, 480, y);

        y += 15;
        doc.text('IVA (19%):', 400, y);
        doc.text(`$${this.formatCurrency(iva)}`, 480, y);

        y += 15;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('TOTAL:', 400, y);
        doc.text(`$${this.formatCurrency(total)}`, 480, y);

        y += 50;
        doc.fontSize(10).font('Helvetica-Bold').text('INFORMACIÓN DE PAGO:', 50, y);

        y += 20;
        doc.fontSize(9).font('Helvetica');
        doc.text('Banco: Mercado Pago', 50, y);
        doc.text('Cuenta Vista: 1094296676', 50, y + 15);
        doc.text('RUT: 78.200.293-7', 50, y + 30);
        doc.text('Email: contacto@envigo.cl', 50, y + 45);

        doc.fontSize(8).font('Helvetica');
        doc.text('Gracias por confiar en enviGo para la gestión de sus envíos.', 50, 750, { align: 'center', width: 500 });

        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  // ==============
  //  BORRADO / REVERSIÓN
  // ==============

  // [DELETE] /api/billing/invoices/:id
  async deleteInvoice(req, res) {
    const log = logger.child({ ctrl: 'billing', op: 'deleteInvoice' });

    try {
      const { id } = req.params;
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

      const invoice = await Invoice.findById(id);
      if (!invoice) return fail(res, 'Factura no encontrada', 404);

      if (invoice.status === 'paid') return fail(res, 'No se puede borrar una factura pagada', 400);

      await Order.updateMany(
        { invoice_id: invoice._id },
        { $set: { invoice_id: null, billed: false, updated_at: new Date() } }
      );

      await Invoice.findByIdAndDelete(id);
      log.info({ invoice: invoice.invoice_number }, 'Factura borrada');

      return success(res, `Factura ${invoice.invoice_number} borrada exitosamente`);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'deleteInvoice' }, 'Error borrando factura');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [POST] /api/billing/invoices/delete-bulk
  async deleteBulkInvoices(req, res) {
    try {
      const { invoice_ids } = req.body;
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

      if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
        return fail(res, 'Se requiere un array de IDs de facturas', 400);
        }
      const invoices = await Invoice.find({ _id: { $in: invoice_ids } }).lean();
      if (!invoices.length) return fail(res, 'No se encontraron facturas para borrar', 404);

      const paidInvoices = invoices.filter((i) => i.status === 'paid');
      if (paidInvoices.length > 0) {
        return fail(res, `No se pueden borrar ${paidInvoices.length} facturas pagadas`, 400, {
          paid_invoices: paidInvoices.map((i) => i.invoice_number),
        });
      }

      await Order.updateMany(
        { invoice_id: { $in: invoice_ids } },
        { $set: { invoice_id: null, billed: false, updated_at: new Date() } }
      );

      const deleteResult = await Invoice.deleteMany({ _id: { $in: invoice_ids } });
      return success(res, `${deleteResult.deletedCount} facturas borradas`, {
        deleted_count: deleteResult.deletedCount,
        invoice_numbers: invoices.map((i) => i.invoice_number),
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'deleteBulkInvoices' }, 'Error borrado masivo');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [DELETE] /api/billing/invoices (solo dev)
  async deleteAllInvoices(req, res) {
    try {
      if (process.env.NODE_ENV !== 'development' || req.user.role !== 'admin') {
        return fail(res, 'Esta acción solo está disponible en desarrollo', 403);
      }

      await Order.updateMany({}, { $set: { invoice_id: null, billed: false, updated_at: new Date() } });
      const deleteResult = await Invoice.deleteMany({});
      return success(res, `Todas las facturas borradas (${deleteResult.deletedCount})`, {
        deleted_count: deleteResult.deletedCount,
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'deleteAllInvoices' }, 'Error borrando todo');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [POST] /api/billing/invoices/:id/revert
  async revertInvoicing(req, res) {
    const session = await mongoose.startSession();
    const log = logger.child({ ctrl: 'billing', op: 'revertInvoicing' });

    try {
      await session.withTransaction(async () => {
        const { id } = req.params;
        if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

        const invoice = await Invoice.findById(id).session(session);
        if (!invoice) return fail(res, 'Factura no encontrada', 404);
        if (invoice.status === 'paid') return fail(res, 'No se puede revertir una factura pagada', 400);

        const orders = await Order.find({ invoice_id: invoice._id }).session(session);
        let revertedCount = 0;
        for (const order of orders) {
          if (typeof order.revertBilling === 'function') {
            order.revertBilling();
          } else {
            order.invoice_id = null;
            order.billed = false;
            order.status = 'delivered';
          }
          await order.save({ session });
          revertedCount++;
        }

        await Invoice.findByIdAndDelete(id).session(session);
        log.info({ invoice: invoice.invoice_number, revertedCount }, 'Facturación revertida');

        return success(res, `Facturación revertida. ${revertedCount} pedidos liberados`, {
          orders_reverted: revertedCount,
          invoice_number: invoice.invoice_number,
        });
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'revertInvoicing' }, 'Error revirtiendo facturación');
      return fail(res, ERRORS.SERVER_ERROR);
    } finally {
      await session.endSession();
    }
  }

  // [POST] /api/billing/invoices/duplicate/:id
  async duplicateInvoice(req, res) {
    try {
      const { id } = req.params;
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

      const originalInvoice = await Invoice.findById(id);
      if (!originalInvoice) return fail(res, 'Factura no encontrada', 404);

      const invoice_number = await this.generateUniqueInvoiceNumber();

      const duplicateInvoice = new Invoice({
        ...originalInvoice.toObject(),
        _id: undefined,
        invoice_number,
        created_at: new Date(),
        status: 'draft',
        sent_at: null,
        paid_date: null,
      });

      await duplicateInvoice.save();

      return success(res, 'Factura duplicada exitosamente', { invoice_number });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'duplicateInvoice' }, 'Error duplicando factura');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [POST] /api/billing/invoices/bulk/mark-paid
  async bulkMarkAsPaid(req, res) {
    try {
      const { invoice_ids } = req.body;
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);
      if (!invoice_ids || !Array.isArray(invoice_ids)) return fail(res, 'Se requiere un array de IDs', 400);

      const result = await Invoice.updateMany(
        { _id: { $in: invoice_ids } },
        { $set: { status: 'paid', paid_date: new Date() } }
      );

      return success(res, `${result.modifiedCount} facturas marcadas como pagadas`, {
        modified_count: result.modifiedCount,
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'bulkMarkAsPaid' }, 'Error marcando pagadas (bulk)');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // ==============
  //  CONSULTAS AUX / DASHBOARD
  // ==============

  // [GET] /api/billing/financial-summary
  async getFinancialSummary(req, res) {
    try {
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      const [
        totalInvoices,
        totalRevenue,
        currentMonthRevenue,
        lastMonthRevenue,
        pendingInvoices,
        overdueInvoices,
        newInvoicesThisMonth,
        unfactoredOrders,
      ] = await Promise.all([
        Invoice.countDocuments({}),
        Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$total_amount' } } }]).then(
          (r) => r[0]?.total || 0
        ),
        Invoice.aggregate([
          { $match: { status: 'paid', paid_date: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$total_amount' } } },
        ]).then((r) => r[0]?.total || 0),
        Invoice.aggregate([
          { $match: { status: 'paid', paid_date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
          { $group: { _id: null, total: { $sum: '$total_amount' } } },
        ]).then((r) => r[0]?.total || 0),
        Invoice.aggregate([
          { $match: { status: { $in: ['sent', 'draft'] } } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$total_amount' } } },
        ]).then((r) => r[0] || { count: 0, amount: 0 }),
        Invoice.countDocuments({ status: 'sent', due_date: { $lt: currentDate } }),
        Invoice.countDocuments({ created_at: { $gte: startOfMonth } }),
        Order.countDocuments({ status: 'delivered', billed: { $ne: true } }),
      ]);

      const revenueGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const averageInvoiceAmount = totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyRevenueData = await Invoice.aggregate([
        { $match: { status: 'paid', paid_date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$paid_date' }, month: { $month: '$paid_date' } },
            revenue: { $sum: '$total_amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            month: {
              $let: {
                vars: { monthNames: ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] },
                in: { $concat: [{ $arrayElemAt: ['$$monthNames', '$_id.month'] }, ' ', { $toString: '$_id.year' }] },
              },
            },
            revenue: '$revenue',
          },
        },
      ]);

      return res.json({
        totalRevenue,
        currentMonthRevenue,
        revenueGrowth,
        pendingAmount: pendingInvoices.amount,
        totalInvoices,
        pendingInvoices: pendingInvoices.count,
        overdueInvoices,
        newInvoicesThisMonth,
        unfactoredOrders,
        averageInvoiceAmount,
        monthlyRevenueData: monthlyRevenueData.length ? monthlyRevenueData : [{ month: 'Datos no disponibles', revenue: 0 }],
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getFinancialSummary' }, 'Error financial summary');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [GET] /api/billing/dashboard-stats/:companyId?
  async getDashboardStats(req, res) {
    try {
      const companyId = req.user.role === 'admin' ? req.params.companyId : req.user.company_id;

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== companyId) {
        return fail(res, 'Sin permisos para acceder a esta empresa', 403);
      }

      const start = Date.now();

      const [orderStats, invoiceableCount, monthlyRevenue] = await Promise.all([
        Order.aggregate([
          { $match: { company_id: new mongoose.Types.ObjectId(companyId) } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              total_amount: { $sum: { $ifNull: ['$shipping_cost', 0] } },
            },
          },
        ]),
        Order.countDocuments({ company_id: companyId, status: 'delivered', 'billing_status.is_billable': true }),
        Order.aggregate([
          {
            $match: {
              company_id: new mongoose.Types.ObjectId(companyId),
              status: 'invoiced',
              'billing_status.billed_at': {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
              },
            },
          },
          {
            $group: {
              _id: null,
              total_revenue: { $sum: { $ifNull: ['$shipping_cost', 0] } },
              invoiced_orders: { $sum: 1 },
            },
          },
        ]),
      ]);

      const byStatus = orderStats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, total_amount: s.total_amount || 0 };
        return acc;
      }, {});

      const deliveredCount = byStatus.delivered?.count || 0;
      const invoicedCount = byStatus.invoiced?.count || 0;
      const totalDeliverable = deliveredCount + invoicedCount;
      const billingRate = totalDeliverable > 0 ? Math.round((invoicedCount / totalDeliverable) * 100) : 0;

      const stats = {
        ordersByStatus: byStatus,
        invoiceableOrders: invoiceableCount,
        monthlyRevenue: monthlyRevenue[0] || { total_revenue: 0, invoiced_orders: 0 },
        billingRate,
        summary: {
          total_orders: orderStats.reduce((sum, s) => sum + s.count, 0),
          total_delivered: deliveredCount,
          total_invoiced: invoicedCount,
          pending_billing: invoiceableCount,
        },
      };

      const ms = Date.now() - start;
      logger.info({ ctrl: 'billing', op: 'getDashboardStats', ms, companyId }, 'Estadísticas generadas');
      return res.json(stats);
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getDashboardStats' }, 'Error dashboard stats');
      return fail(res, 'Error del servidor');
    }
  }

  // ==============
  //  AUXILIARES
  // ==============

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL').format(amount || 0);
  }

  async generateUniqueInvoiceNumber(session = null) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      try {
        const lastInvoice = await Invoice.findOne({
          invoice_number: { $regex: `^INV-${yearMonth}-` },
        })
          .sort({ invoice_number: -1 })
          .session(session);

        let next = 1;
        if (lastInvoice) {
          const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2], 10);
          next = lastNumber + 1;
        }

        const invoice_number = `INV-${yearMonth}-${String(next).padStart(4, '0')}`;
        const exists = await Invoice.findOne({ invoice_number }).session(session);
        if (!exists) return invoice_number;

        attempt++;
        await new Promise((r) => setTimeout(r, 80));
      } catch (e) {
        attempt++;
        if (attempt >= maxAttempts) throw new Error('No se pudo generar número de factura único');
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('No se pudo generar un número de factura único');
  }

  // ==============
  //  ENDPOINTS ADICIONALES DEL ARCHIVO ORIGINAL (compat)
  // ==============

  async manualGenerateInvoices(req, res) {
    return fail(res, 'La generación automática ha sido desactivada. Utilice la generación manual por período.', 400);
  }

  // [PATCH] /api/billing/invoices/:id/notes
  async updateInvoiceNotes(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const invoice = await Invoice.findById(id);
      if (!invoice) return fail(res, 'Factura no encontrada', 404);
      if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);

      invoice.notes = notes;
      await invoice.save();

      return success(res, 'Notas actualizadas', { notes });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'updateInvoiceNotes' }, 'Error actualizando notas');
      return fail(res, ERRORS.SERVER_ERROR);
    }
  }

  // [GET] /api/billing/invoiceable-orders
  async getInvoiceableOrders(req, res) {
    try {
      const { company_id, startDate, endDate } = req.query;
      const companyIdRaw = req.user.role === 'admin' ? company_id : req.user.company_id;
      if (!companyIdRaw) return fail(res, 'Company ID requerido', 400);

      let companyId;
      try {
        companyId = new mongoose.Types.ObjectId(String(companyIdRaw));
      } catch {
        return fail(res, 'company_id inválido', 400);
      }

      const query = {
        company_id: companyId,
        status: 'delivered',
        'billing_status.is_billable': true,
        invoice_id: null,
      };

      if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);
        query.delivery_date = { $gte: start, $lte: end };
      }

      const startTime = Date.now();

      const [orders, totalCount] = await Promise.all([
        Order.find(query).select('order_number customer_name delivery_date shipping_cost').sort({ delivery_date: -1 }).limit(200).lean(),
        Order.countDocuments(query),
      ]);

      const totalAmount = orders.reduce((sum, o) => sum + (o.shipping_cost || 0), 0);
      const dates = orders.map((o) => o.delivery_date).filter(Boolean);
      const minDate = dates.length ? new Date(Math.min(...dates.map((d) => new Date(d)))) : null;
      const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => new Date(d)))) : null;

      const summary = {
        total_orders: orders.length,
        total_count: totalCount,
        total_amount: totalAmount,
        date_range: { from: minDate, to: maxDate },
        showing_limit: orders.length < totalCount ? 200 : null,
      };

      const ms = Date.now() - startTime;
      logger.info({ ctrl: 'billing', op: 'getInvoiceableOrders', ms, count: orders.length, totalCount }, 'Consulta facturables');

      return res.json({ orders, summary });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'getInvoiceableOrders' }, 'Error facturables');
      return fail(res, 'Error del servidor');
    }
  }

  // [POST] /api/billing/invoices/improved
  async generateInvoiceImproved(req, res) {
    const session = await mongoose.startSession();
    const log = logger.child({ ctrl: 'billing', op: 'generateInvoiceImproved' });

    try {
      await session.withTransaction(async () => {
        const { company_id, period_start, period_end, order_ids } = req.body;

        if (req.user.role !== 'admin') return fail(res, ERRORS.FORBIDDEN, 403);
        if (!company_id || !period_start || !period_end || !order_ids?.length) {
          return fail(res, 'Se requieren company_id, period_start, period_end y order_ids', 400);
        }

        let companyObjectId;
        try {
          companyObjectId = new mongoose.Types.ObjectId(String(company_id));
        } catch {
          return fail(res, 'company_id inválido', 400);
        }

        const orders = await Order.find({
          _id: { $in: order_ids.map((id) => new mongoose.Types.ObjectId(id)) },
          company_id: companyObjectId,
          status: 'delivered',
          'billing_status.is_billable': true,
          invoice_id: null,
        })
          .session(session)
          .lean();

        if (orders.length !== order_ids.length) {
          const invalidOrders = order_ids.length - orders.length;
          throw new Error(`${invalidOrders} pedidos no son facturables o ya pertenecen a otra factura.`);
        }

        const company = await Company.findById(companyObjectId).session(session);
        if (!company) throw new Error('Empresa no encontrada');

        const subtotal = orders.reduce((acc, o) => acc + (o.shipping_cost || 0), 0);
        const tax_amount = Math.round(subtotal * 0.19);
        const total_amount = subtotal + tax_amount;

        const invoice_number = await this.generateUniqueInvoiceNumber(session);

        const newInvoice = new Invoice({
          company_id: companyObjectId,
          invoice_number,
          month: new Date(period_end).getMonth() + 1,
          year: new Date(period_end).getFullYear(),
          total_orders: orders.length,
          price_per_order: company.price_per_order,
          subtotal,
          tax_amount,
          total_amount,
          amount_due: subtotal,
          period_start: new Date(period_start),
          period_end: new Date(period_end),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'draft',
          order_ids,
        });

        await newInvoice.save({ session });

        for (const order of orders) {
          if (typeof Order.prototype.markAsInvoiced === 'function') {
            const doc = await Order.findById(order._id).session(session);
            doc.markAsInvoiced(newInvoice._id, company.price_per_order);
            await doc.save({ session });
          } else {
            await Order.updateOne(
              { _id: order._id },
              { $set: { invoice_id: newInvoice._id, billed: true, status: 'invoiced' } },
              { session }
            );
          }
        }

        const invoiceWithCompany = await Invoice.findById(newInvoice._id)
          .populate('company_id', 'name email')
          .session(session);

        log.info({ invoice: newInvoice.invoice_number, count: orders.length }, 'Factura mejorada creada');

        return success(
          res,
          'Factura generada exitosamente',
          { invoice: invoiceWithCompany, orders_invoiced: orders.length },
          201
        );
      });
    } catch (error) {
      logger.error({ err: error, ctrl: 'billing', op: 'generateInvoiceImproved' }, 'Error generate improved');
      return fail(res, error.message || 'Error interno del servidor al generar la factura', 500);
    } finally {
      await session.endSession();
    }
  }
}

// ---------- VALIDATORS (express-validator) ----------
// Se exponen en billingController.validators para usarlos en las rutas.
const validators = {
  generateInvoice: [
    body('company_id').isMongoId().withMessage('company_id inválido'),
    body('period_start').isISO8601().withMessage('period_start inválido'),
    body('period_end').isISO8601().withMessage('period_end inválido'),
    body('order_ids').isArray({ min: 1 }).withMessage('order_ids debe ser array con al menos 1 id'),
  ],
  generateBulkInvoices: [
    body('period_start').isISO8601().withMessage('period_start inválido'),
    body('period_end').isISO8601().withMessage('period_end inválido'),
    body('only_with_orders').optional().isBoolean(),
    body('exclude_existing').optional().isBoolean(),
  ],
  previewBulkGeneration: [
    query('period_start').isISO8601().withMessage('period_start inválido'),
    query('period_end').isISO8601().withMessage('period_end inválido'),
    query('only_with_orders').optional().toBoolean(),
    query('exclude_existing').optional().toBoolean(),
  ],
  sendInvoice: [param('id').isMongoId().withMessage('id inválido')],
  requestPaymentConfirmation: [param('id').isMongoId().withMessage('id inválido')],
  confirmPayment: [param('id').isMongoId().withMessage('id inválido')],
  getInvoices: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString(),
    query('company_id').optional().isMongoId(),
    query('period').optional().isIn(['current', 'last', 'quarter', 'year']),
    query('search').optional().isString(),
  ],
  markAsPaid: [param('id').isMongoId().withMessage('id inválido')],
  downloadInvoice: [param('id').isMongoId().withMessage('id inválido')],
  getInvoiceDetails: [param('id').isMongoId().withMessage('id inválido')],
  getInvoiceOrders: [param('id').isMongoId().withMessage('id inválido')],
  updateInvoiceNotes: [
    param('id').isMongoId().withMessage('id inválido'),
    body('notes').isString().withMessage('notes debe ser string'),
  ],
  duplicateInvoice: [param('id').isMongoId().withMessage('id inválido')],
  bulkMarkAsPaid: [body('invoice_ids').isArray({ min: 1 }).withMessage('invoice_ids debe ser array')],
  deleteInvoice: [param('id').isMongoId().withMessage('id inválido')],
  deleteBulkInvoices: [body('invoice_ids').isArray({ min: 1 }).withMessage('invoice_ids debe ser array')],
  getBillingStats: [query('company_id').optional().isMongoId()],
  getNextInvoiceEstimate: [query('company_id').optional().isMongoId()],
  getInvoiceableOrders: [
    query('company_id').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  generateInvoiceImproved: [
    body('company_id').isMongoId(),
    body('period_start').isISO8601(),
    body('period_end').isISO8601(),
    body('order_ids').isArray({ min: 1 }),
  ],
  revertInvoicing: [param('id').isMongoId().withMessage('id inválido')],
  getDashboardStats: [param('companyId').optional().isMongoId()],
};

// Instancia + binding + export con validators
const billingControllerInstance = new BillingController();
Object.getOwnPropertyNames(BillingController.prototype).forEach((method) => {
  if (method !== 'constructor') {
    billingControllerInstance[method] = billingControllerInstance[method].bind(billingControllerInstance);
  }
});
billingControllerInstance.validators = validators;

module.exports = billingControllerInstance;
