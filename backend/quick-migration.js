// Ejecutar con: node backend/scripts/payment-migration.js
const mongoose = require('mongoose');
const Order = require('./src/models/Order'); // ‼️ ¡OJO! Ajusta la ruta a tu modelo Order si es necesario
const User = require('./src/models/User');   // ‼️ Ajusta la ruta a tu modelo User si es necesario
require('dotenv').config();

async function paymentMigration() {
  try {
    console.log('🔄 Iniciando migración de campos de pago en pedidos...');

    // Conectar a la base de datos
    const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/envigo';
    console.log('🔌 Conectando a:', mongoUrl.replace(/\/\/.*@/, '//***:***@'));
    await mongoose.connect(mongoUrl);

    // 1. Contar cuántos documentos necesitan ser actualizados
    const documentsToUpdateCount = await Order.countDocuments({
      isPaid: { $exists: false }
    });

    if (documentsToUpdateCount === 0) {
      console.log('✅ ¡Excelente! No se encontraron pedidos para migrar. Todos los documentos ya están actualizados.');
      return; // Salir del script si no hay nada que hacer
    }

    console.log(`\n📊 Se encontraron ${documentsToUpdateCount} pedidos que necesitan ser actualizados.`);
    console.log('\n🔄 Aplicando nuevos campos de pago...');

    // 2. Ejecutar la actualización en los documentos que no tienen el campo 'isPaid'
    const updateResult = await Order.updateMany(
      { isPaid: { $exists: false } }, // Filtro: selecciona solo pedidos sin el nuevo campo
      {
        $set: {
          isPaid: false,
          paidAt: null,
          paidBy: null,
          paymentNote: null,
        },
      }
    );

    console.log(`  ➡️  Pedidos afectados: ${updateResult.matchedCount}`);
    console.log(`  🛠️  Pedidos modificados: ${updateResult.modifiedCount}`);

    // 3. Mostrar estadísticas finales para verificar
    console.log('\n📊 ESTADO FINAL:');
    const finalStats = await Order.aggregate([
      {
        $group: {
          _id: '$isPaid', // Agrupar por el nuevo campo 'isPaid'
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    finalStats.forEach(stat => {
      const statusText = stat._id === true ? 'Pagados' : 'No Pagados';
      console.log(`  ${statusText}: ${stat.count} pedidos`);
    });

    const totalOrders = await Order.countDocuments();
    console.log(`  Total de pedidos en la base de datos: ${totalOrders}`);

    console.log('\n✅ Migración de pagos completada exitosamente.');

  } catch (error) {
    console.error('❌ Error durante la migración de pagos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB.');
  }
}

// Ejecutar migración si el script es llamado directamente
if (require.main === module) {
  paymentMigration();
}

module.exports = paymentMigration;