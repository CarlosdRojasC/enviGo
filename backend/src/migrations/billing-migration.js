// backend/src/migrations/billing-migration.js
require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../models/Company');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');

async function runBillingMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔄 Iniciando migración de facturación...');

    // 1. Actualizar empresas con datos de facturación faltantes
    console.log('📝 Actualizando empresas...');
    
    const companies = await Company.find({});
    let companiesUpdated = 0;

    for (const company of companies) {
      let updated = false;
      
      // Agregar campos faltantes si no existen
      if (!company.rut) {
        company.rut = `${Math.floor(Math.random() * 90000000) + 10000000}-${Math.floor(Math.random() * 9) + 1}`;
        updated = true;
      }
      
      if (!company.email) {
        company.email = `contacto@${company.slug}.cl`;
        updated = true;
      }
      
      if (!company.contact_email) {
        company.contact_email = company.email;
        updated = true;
      }
      
      if (!company.phone) {
        company.phone = `+56${Math.floor(Math.random() * 900000000) + 100000000}`;
        updated = true;
      }
      
      if (!company.address) {
        company.address = `Av. Principal ${Math.floor(Math.random() * 9000) + 1000}, Santiago, Chile`;
        updated = true;
      }
      
      if (!company.plan_type) {
        company.plan_type = 'basic';
        updated = true;
      }
      
      if (!company.billing_cycle) {
        company.billing_cycle = 'monthly';
        updated = true;
      }
      
      // Asegurar que price_per_order tenga un valor por defecto
      if (!company.price_per_order || company.price_per_order === 0) {
        company.price_per_order = 500; // Precio por defecto
        updated = true;
      }
      
      if (updated) {
        await company.save();
        companiesUpdated++;
      }
    }
    
    console.log(`✅ ${companiesUpdated} empresas actualizadas`);

    // 2. Actualizar pedidos con campos de facturación
    console.log('📦 Actualizando pedidos...');
    
    const ordersToUpdate = await Order.find({
      $or: [
        { billed: { $exists: false } },
        { invoice_id: { $exists: false } }
      ]
    });
    
    let ordersUpdated = 0;
    
    for (const order of ordersToUpdate) {
      let updated = false;
      
      if (order.billed === undefined) {
        order.billed = false;
        updated = true;
      }
      
      if (!order.invoice_id) {
        order.invoice_id = null;
        updated = true;
      }
      
      if (updated) {
        await order.save();
        ordersUpdated++;
      }
    }
    
    console.log(`✅ ${ordersUpdated} pedidos actualizados`);

    // 3. Actualizar facturas existentes con campos calculados
    console.log('💰 Actualizando facturas existentes...');
    
    const invoices = await Invoice.find({}).populate('company_id');
    let invoicesUpdated = 0;

    for (const invoice of invoices) {
      let updated = false;
      
      // Calcular campos faltantes si no existen
      if (!invoice.subtotal && invoice.amount_due) {
        invoice.subtotal = invoice.amount_due;
        updated = true;
      }
      
      if (!invoice.tax_amount && invoice.subtotal) {
        invoice.tax_amount = Math.round(invoice.subtotal * 0.19);
        updated = true;
      }
      
      if (!invoice.total_amount && invoice.subtotal && invoice.tax_amount) {
        invoice.total_amount = invoice.subtotal + invoice.tax_amount;
        updated = true;
      }
      
      // Calcular fechas del período si no existen
      if (!invoice.period_start && invoice.year && invoice.month) {
        invoice.period_start = new Date(invoice.year, invoice.month - 1, 1);
        updated = true;
      }
      
      if (!invoice.period_end && invoice.year && invoice.month) {
        invoice.period_end = new Date(invoice.year, invoice.month, 0);
        updated = true;
      }
      
      // Establecer issue_date si no existe
      if (!invoice.issue_date) {
        invoice.issue_date = invoice.created_at || new Date();
        updated = true;
      }
      
      if (updated) {
        await invoice.save();
        invoicesUpdated++;
      }
    }
    
    console.log(`✅ ${invoicesUpdated} facturas actualizadas`);

    // 4. Generar algunas facturas de ejemplo para empresas que no tienen
    console.log('📄 Generando facturas de ejemplo...');
    
    let exampleInvoicesCreated = 0;
    
    for (const company of companies) {
      const existingInvoices = await Invoice.countDocuments({ company_id: company._id });
      
      if (existingInvoices === 0) {
        // Crear facturas para los últimos 3 meses
        for (let monthsBack = 1; monthsBack <= 3; monthsBack++) {
          const now = new Date();
          const invoiceDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
          const year = invoiceDate.getFullYear();
          const month = invoiceDate.getMonth() + 1;
          
          // Contar pedidos reales para este período
          const ordersCount = await Order.countDocuments({
            company_id: company._id,
            order_date: {
              $gte: new Date(year, month - 1, 1),
              $lt: new Date(year, month, 1)
            }
          });
          
          // Solo crear factura si hay pedidos
          if (ordersCount > 0) {
            const subtotal = ordersCount * company.price_per_order;
            const taxAmount = Math.round(subtotal * 0.19);
            const totalAmount = subtotal + taxAmount;
            
            const invoiceCount = await Invoice.countDocuments({}) + 1;
            const invoiceNumber = `INV-${year}${String(month).padStart(2, '0')}-${String(invoiceCount).padStart(4, '0')}`;
            
            const invoice = new Invoice({
              company_id: company._id,
              invoice_number: invoiceNumber,
              month: month,
              year: year,
              total_orders: ordersCount,
              price_per_order: company.price_per_order,
              amount_due: subtotal,
              subtotal: subtotal,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              period_start: new Date(year, month - 1, 1),
              period_end: new Date(year, month, 0),
              issue_date: new Date(year, month, 1),
              due_date: new Date(year, month + 1, 15), // 15 del mes siguiente
              status: monthsBack === 1 ? 'sent' : 'paid', // La más reciente pendiente
              created_at: new Date(year, month, 1)
            });
            
            await invoice.save();
            
            // Marcar pedidos como facturados
            await Order.updateMany(
              {
                company_id: company._id,
                order_date: {
                  $gte: new Date(year, month - 1, 1),
                  $lt: new Date(year, month, 1)
                }
              },
              {
                $set: {
                  invoice_id: invoice._id,
                  billed: true
                }
              }
            );
            
            exampleInvoicesCreated++;
            console.log(`✅ Factura ${invoiceNumber} creada para ${company.name}`);
          }
        }
      }
    }
    
    console.log(`✅ ${exampleInvoicesCreated} facturas de ejemplo creadas`);

    // 5. Estadísticas finales
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    const totalCompanies = await Company.countDocuments({});
    const totalOrders = await Order.countDocuments({});
    const totalInvoices = await Invoice.countDocuments({});
    const billedOrders = await Order.countDocuments({ billed: true });
    const unbilledOrders = await Order.countDocuments({ billed: false });
    
    console.log(`- Empresas totales: ${totalCompanies}`);
    console.log(`- Pedidos totales: ${totalOrders}`);
    console.log(`- Facturas totales: ${totalInvoices}`);
    console.log(`- Pedidos facturados: ${billedOrders}`);
    console.log(`- Pedidos sin facturar: ${unbilledOrders}`);
    
    // Estadísticas por empresa
    console.log('\n📈 ESTADÍSTICAS POR EMPRESA:');
    for (const company of companies.slice(0, 5)) { // Mostrar solo las primeras 5
      const companyOrders = await Order.countDocuments({ company_id: company._id });
      const companyInvoices = await Invoice.countDocuments({ company_id: company._id });
      const companyRevenue = await Invoice.aggregate([
        { $match: { company_id: company._id, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]);
      
      const revenue = companyRevenue.length > 0 ? companyRevenue[0].total : 0;
      
      console.log(`- ${company.name}:`);
      console.log(`  * Pedidos: ${companyOrders}`);
      console.log(`  * Facturas: ${companyInvoices}`);
      console.log(`  * Revenue: ${revenue.toLocaleString('es-CL')}`);
      console.log(`  * Precio por pedido: ${company.price_per_order}`);
    }

    console.log('\n🎉 Migración de facturación completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migración de facturación:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Ejecutar migración
if (require.main === module) {
  runBillingMigration();
}

module.exports = runBillingMigration;