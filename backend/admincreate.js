const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User'); // Ajusta la ruta según tu estructura

// Configuración de conexión
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/envigo';

const createAdminUser = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Conectado a MongoDB');

    // Datos del admin - ADAPTADO A TU MODELO
    const tempPassword = '12345678.!'; // Tu contraseña
    
    const adminData = {
      email: 'contacto@envigo.cl',
      password_hash: '', // Se asignará después del hash
      full_name: 'Super Admin EnviGo',
      role: 'admin',
      company_id: null, // Admin no tiene empresa
      is_active: true,
      password_change_required: false,
      failed_login_attempts: 0,
      phone: '+56912345678' // Opcional, puedes cambiarlo o eliminarlo
    };


    // Hashear contraseña
    const saltRounds = 12;
    adminData.password_hash = await bcrypt.hash(tempPassword, saltRounds);

    // Crear usuario admin
    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Usuario admin creado exitosamente');
    console.log('📧 Email:', adminData.email);
    console.log(`🔑 Contraseña: ${tempPassword}`);
    console.log('👤 Nombre:', adminData.full_name);
    console.log('👤 Rol: admin');
    console.log('🆔 ID:', admin._id);
    console.log('');
    console.log('🔐 IMPORTANTE: Guarda estas credenciales en un lugar seguro');
    console.log('⚠️  Cambia la contraseña después de hacer login');

  } catch (error) {
    console.error('❌ Error creando usuario admin:', error.message);
    
    // Mostrar detalles específicos del error si es de validación
    if (error.name === 'ValidationError') {
      console.log('📋 Detalles del error:');
      Object.keys(error.errors).forEach(key => {
        console.log(`   - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('📦 Desconectado de MongoDB');
    process.exit(0);
  }
};

// Ejecutar si el archivo se llama directamente
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };