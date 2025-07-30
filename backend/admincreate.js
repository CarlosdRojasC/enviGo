const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User'); // Ajusta la ruta según tu estructura

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/envigo';

const createAdminUser = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Conectado a MongoDB');

    // Datos del admin
    const adminData = {
      email: 'contacto@envigo.cl',
      password: 'AdminEnvigo2025.!', // Cambiar por una contraseña segura
      firstName: 'Super',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: adminData.email },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario admin en el sistema');
      console.log(`📧 Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Hashear contraseña
    const saltRounds = 12;
    adminData.password = await bcrypt.hash(adminData.password, saltRounds);

    // Crear usuario admin
    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Usuario admin creado exitosamente');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Contraseña temporal: Admin123! (¡CÁMBIALA!)');
    console.log('👤 Rol: admin');

  } catch (error) {
    console.error('❌ Error creando usuario admin:', error.message);
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