// backend/scripts/quick-migration.js
// Ejecutar con: node backend/scripts/quick-migration.js

const mongoose = require('mongoose');
const Order = require('./src/models/Order');
require('dotenv').config();

async function quickMigration() {
  try {
    console.log('🔄 Iniciando migración rápida de pedidos...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/envigo');
    console.log('✅ Conectado a MongoDB');

    // 1. Ver el estado actual
    console.log('\n📊 ESTADO ACTUAL:');
    const currentStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    currentStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} pedidos`);
    });

    // 2. Convertir estados antiguos a nuevos
    console.log('\n🔄 CONVIRTIENDO ESTADOS:');
    
    // Convertir 'facturado' a 'invoiced'
    const facturadoResult = await Order.updateMany(
      { status: 'facturado' },
      { 
        $set: { 
          status: 'invoiced',
          'billing_status.is_billable': false,
          'billing_status.billed_at': new Date(),
          billed: true
        }
      }
    );
    console.log(`   'facturado' → 'invoiced': ${facturadoResult.modifiedCount} pedidos`);

    // Convertir 'shipped' a 'delivered' (asumiendo que shipped = entregado)
    const shippedResult = await Order.updateMany(
      { 
        status: 'shipped',
        billed: { $ne: true },
        invoice_id: null
      },
      { 
        $set: { 
          status: 'delivered',
          'billing_status.is_billable': true,
          delivery_date: new Date() // Fecha actual como delivery_date
        }
      }
    );
    console.log(`   'shipped' → 'delivered': ${shippedResult.modifiedCount} pedidos`);

    // 3. Actualizar pedidos ya facturados pero sin el nuevo esquema
    const billedResult = await Order.updateMany(
      { 
        billed: true,
        status: { $nin: ['invoiced'] }
      },
      { 
        $set: { 
          status: 'invoiced',
          'billing_status.is_billable': false,
          'billing_status.billed_at': new Date()
        }
      }
    );
    console.log(`   Pedidos facturados actualizados: ${billedResult.modifiedCount}`);

    // 4. Agregar billing_status a pedidos que no lo tienen
    const missingBillingStatus = await Order.updateMany(
      { 
        'billing_status.is_billable': { $exists: false }
      },
      { 
        $set: { 
          'billing_status.is_billable': false,
          'billing_status.billed_at': null,
          'billing_status.billing_amount': null
        }
      }
    );
    console.log(`   billing_status agregado a: ${missingBillingStatus.modifiedCount} pedidos`);

    // 5. Marcar como facturables los que están en 'delivered'
    const deliveredResult = await Order.updateMany(
      { 
        status: 'delivered',
        billed: { $ne: true },
        invoice_id: null
      },
      { 
        $set: { 
          'billing_status.is_billable': true
        }
      }
    );
    console.log(`   Marcados como facturables: ${deliveredResult.modifiedCount} pedidos`);

    // 6. Crear algunos pedidos de prueba si no hay delivered
    const deliveredCount = await Order.countDocuments({ status: 'delivered' });
    
    if (deliveredCount === 0) {
      console.log('\n🧪 CREANDO PEDIDOS DE PRUEBA:');
      
      // Obtener una empresa para los pedidos de prueba
      const Company = require('./src/models/Company');
      const Channel = require('./src/models/Channel');
      
      const company = await Company.findOne();
      const channel = await Channel.findOne();
      
      if (company && channel) {
        const testOrders = [];
        
        for (let i = 1; i <= 5; i++) {
          testOrders.push({
            company_id: company._id,
            channel_id: channel._id,
            external_order_id: `TEST-${Date.now()}-${i}`,
            order_number: `TEST-${String(i).padStart(3, '0')}`,
            customer_name: `Cliente de Prueba ${i}`,
            customer_email: `test${i}@example.com`,
            customer_phone: `+56912345${i}${i}${i}`,
            shipping_address: `Dirección de Prueba ${i}, Santiago`,
            shipping_city: 'Santiago',
            shipping_commune: 'Las Condes',
            total_amount: 25000 + (i * 5000),
            shipping_cost: 5000 + (i * 500),
            status: 'delivered',
            delivery_date: new Date(),
            order_date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // i días atrás
            billing_status: {
              is_billable: true,
              billed_at: null,
              billing_amount: null
            },
            billed: false,
            invoice_id: null
          });
        }
        
        await Order.insertMany(testOrders);
        console.log(`   ✅ Creados ${testOrders.length} pedidos de prueba en estado 'delivered'`);
      }
    }

    // 7. Mostrar estadísticas finales
    console.log('\n📊 ESTADO FINAL:');
    const finalStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          billable: {
            $sum: {
              $cond: ['$billing_status.is_billable', 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    finalStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} pedidos (${stat.billable} facturables)`);
    });

    // Resumen de pedidos facturables
    const billableCount = await Order.countDocuments({
      status: 'delivered',
      'billing_status.is_billable': true,
      invoice_id: null
    });

    console.log(`\n🎯 RESULTADO: ${billableCount} pedidos listos para facturar`);
    console.log('\n✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar migración
if (require.main === module) {
  quickMigration();
}

module.exports = quickMigration;