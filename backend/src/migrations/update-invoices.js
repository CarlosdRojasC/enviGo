require('dotenv').config();
const mongoose = require('mongoose');

async function initializeInvoiceCounters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar el número más alto existente para cada año-mes
    const existingInvoices = await mongoose.connection.db.collection('invoices').aggregate([
      {
        $match: {
          invoice_number: { $regex: /^INV-\d{6}-\d{4}$/ }
        }
      },
      {
        $project: {
          year_month: { $substr: ['$invoice_number', 4, 6] },
          sequence: { 
            $toInt: { $substr: ['$invoice_number', 11, 4] } 
          }
        }
      },
      {
        $group: {
          _id: '$year_month',
          max_sequence: { $max: '$sequence' }
        }
      }
    ]).toArray();

    console.log(`📊 Encontrados ${existingInvoices.length} períodos con facturas existentes`);

    // Crear o actualizar contadores
    for (const period of existingInvoices) {
      await mongoose.connection.db.collection('invoice_counters').updateOne(
        { year_month: period._id },
        { 
          $set: { 
            sequence: period.max_sequence,
            updated_at: new Date()
          }
        },
        { upsert: true }
      );
      
      console.log(`✅ Contador inicializado: ${period._id} → ${period.max_sequence}`);
    }

    console.log('🎉 Contadores de facturas inicializados correctamente');

  } catch (error) {
    console.error('❌ Error inicializando contadores:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

initializeInvoiceCounters();