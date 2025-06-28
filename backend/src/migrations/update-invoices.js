// backend/src/migrations/update-invoices.js
require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Company = require('../models/Company');

async function updateInvoicesWithCalculatedFields() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las facturas
    const invoices = await Invoice.find({}).populate('company_id');
    console.log(`📄 Encontradas ${invoices.length} facturas para actualizar`);

    let updatedCount = 0;

    for (const invoice of invoices) {
      try {
        // Calcular campos faltantes
        const subtotal = invoice.amount_due || (invoice.total_orders * invoice.price_per_order);
        const tax_amount = Math.round(subtotal * 0.19);
        const total_amount = subtotal + tax_amount;

        // Calcular fechas del período
        const period_start = new Date(invoice.year, invoice.month - 1, 1);
        const period_end = new Date(invoice.year, invoice.month, 0);

        // Actualizar la factura
        await Invoice.findByIdAndUpdate(invoice._id, {
          subtotal: subtotal,
          tax_amount: tax_amount,
          total_amount: total_amount,
          period_start: period_start,
          period_end: period_end,
          issue_date: invoice.created_at,
          updated_at: new Date()
        });

        console.log(`✅ Actualizada factura ${invoice.invoice_number} para ${invoice.company_id?.name}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error actualizando factura ${invoice.invoice_number}:`, error.message);
      }
    }

    console.log(`\n🎉 Migración completada: ${updatedCount} facturas actualizadas`);

    // Crear algunas facturas de ejemplo si no existen
    await createSampleInvoices();

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

async function createSampleInvoices() {
  console.log('\n📝 Creando facturas de ejemplo...');
  
  const companies = await Company.find({ is_active: true }).limit(3);
  
  if (companies.length === 0) {
    console.log('⚠️ No hay empresas activas, creando empresas de ejemplo...');
    
    // Crear empresas de ejemplo
    const sampleCompanies = [
      {
        name: "TechStore Chile",
        slug: "techstore-chile",
        price_per_order: 750,
        email: "contacto@techstore.cl",
        phone: "+56912345678",
        address: "Av. Providencia 1234, Santiago"
      },
      {
        name: "MercadoOnline",
        slug: "mercadoonline",
        price_per_order: 500,
        email: "info@mercadoonline.cl",
        phone: "+56987654321",
        address: "Las Condes 567, Santiago"
      }
    ];

    for (const companyData of sampleCompanies) {
      const company = new Company(companyData);
      await company.save();
      companies.push(company);
      console.log(`✅ Empresa creada: ${company.name}`);
    }
  }

  // Crear facturas para los últimos 3 meses
  const currentDate = new Date();
  let createdInvoices = 0;

  for (let monthsBack = 1; monthsBack <= 3; monthsBack++) {
    const invoiceDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthsBack, 1);
    const year = invoiceDate.getFullYear();
    const month = invoiceDate.getMonth() + 1;

    for (const company of companies) {
      // Verificar si ya existe factura para este período
      const existingInvoice = await Invoice.findOne({
        company_id: company._id,
        year: year,
        month: month
      });

      if (!existingInvoice) {
        const total_orders = Math.floor(Math.random() * 100) + 20; // 20-120 pedidos
        const amount_due = total_orders * company.price_per_order;
        
        const invoiceCount = await Invoice.countDocuments({}) + 1;
        const invoice_number = `INV-${year}${String(month).padStart(2, '0')}-${String(invoiceCount).padStart(4, '0')}`;

        const invoice = new Invoice({
          company_id: company._id,
          invoice_number: invoice_number,
          month: month,
          year: year,
          total_orders: total_orders,
          price_per_order: company.price_per_order,
          amount_due: amount_due,
          status: ['pending', 'sent', 'paid'][Math.floor(Math.random() * 3)],
          due_date: new Date(year, month, 15) // 15 del mes siguiente
        });

        await invoice.save();
        console.log(`✅ Factura creada: ${invoice_number} para ${company.name}`);
        createdInvoices++;
      }
    }
  }

  console.log(`🎉 ${createdInvoices} facturas de ejemplo creadas`);
}

// Ejecutar migración
if (require.main === module) {
  updateInvoicesWithCalculatedFields();
}

module.exports = updateInvoicesWithCalculatedFields;