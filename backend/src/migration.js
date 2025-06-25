// backend/src/migration.js
require('dotenv').config();
const mongoose = require('mongoose');

// Modelos
const User = require('./models/User');
const Order = require('./models/Order');

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // 1. Migrar roles de usuarios
    console.log('🔄 Migrando roles de usuarios...');
    
    // Cambiar 'user' por 'company_employee'
    const userRoleUpdate = await User.updateMany(
      { role: 'user' },
      { $set: { role: 'company_employee' } }
    );
    console.log(`✅ ${userRoleUpdate.modifiedCount} usuarios migrados de 'user' a 'company_employee'`);

    // Verificar usuarios sin empresa que no sean admin
    const usersWithoutCompany = await User.find({ 
      role: { $ne: 'admin' },
      $or: [
        { company_id: null },
        { company_id: { $exists: false } }
      ]
    });

    if (usersWithoutCompany.length > 0) {
      console.log(`⚠️  Encontrados ${usersWithoutCompany.length} usuarios sin empresa:`);
      usersWithoutCompany.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    }

    // 2. Migrar estructura de pedidos si es necesario
    console.log('🔄 Verificando estructura de pedidos...');
    
    const ordersToUpdate = await Order.find({
      $or: [
        { company_id: { $exists: false } },
        { channel_id: { $exists: false } },
        { external_order_id: { $exists: false } }
      ]
    });

    if (ordersToUpdate.length > 0) {
      console.log(`⚠️  Encontrados ${ordersToUpdate.length} pedidos con estructura incompleta`);
      console.log('   Estos pedidos necesitan ser actualizados manualmente.');
    }

    // 3. Verificar integridad de datos
    console.log('🔍 Verificando integridad de datos...');
    
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Estadísticas de usuarios por rol:');
    stats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count}`);
    });

    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Estadísticas de pedidos por estado:');
    orderStats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count}`);
    });

    console.log('✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateData();
}

module.exports = migrateData;