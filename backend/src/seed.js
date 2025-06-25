// backend/src/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Modelos
const Company = require('./models/Company');
const User = require('./models/User');
const Channel = require('./models/Channel');
const Order = require('./models/Order');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Limpia datos previos (opcional)
    await Company.deleteMany({});
    await User.deleteMany({});
    await Channel.deleteMany({});
    await Order.deleteMany({});
    
    console.log('🧹 Datos previos eliminados');

    // Crear empresa Liquo
    const liquoCompany = new Company({
      name: "Liquo",
      slug: "liquo",
      price_per_order: 1000,
      is_active: true
    });
    await liquoCompany.save();
    console.log('✅ Empresa Liquo creada:', liquoCompany._id);

    // Crear empresa adicional para testing
    const testCompany = new Company({
      name: "Tienda Test",
      slug: "tienda-test",
      price_per_order: 800,
      is_active: true
    });
    await testCompany.save();
    console.log('✅ Empresa Test creada:', testCompany._id);

    // Crear usuario admin (sin empresa)
    const adminPassword = 'admin1234';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const adminUser = new User({
      email: 'admin@liquo.com',
      password_hash: adminPasswordHash,
      full_name: 'Admin Sistema',
      role: 'admin',
      company_id: null,  // Admin no tiene empresa
      is_active: true,
      last_login: new Date()
    });
    await adminUser.save();
    console.log('✅ Usuario admin creado:', adminUser.email);

    // Crear dueño de empresa Liquo
    const ownerPassword = 'owner1234';
    const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);

    const ownerUser = new User({
      email: 'owner@liquo.com',
      password_hash: ownerPasswordHash,
      full_name: 'Dueño Liquo',
      role: 'company_owner',
      company_id: liquoCompany._id,
      is_active: true,
      last_login: new Date()
    });
    await ownerUser.save();
    console.log('✅ Usuario owner creado:', ownerUser.email);

    // Crear empleado de Liquo
    const employeePassword = 'employee1234';
    const employeePasswordHash = await bcrypt.hash(employeePassword, 10);

    const employeeUser = new User({
      email: 'employee@liquo.com',
      password_hash: employeePasswordHash,
      full_name: 'Empleado Liquo',
      role: 'company_employee',
      company_id: liquoCompany._id,
      is_active: true,
      last_login: new Date()
    });
    await employeeUser.save();
    console.log('✅ Usuario employee creado:', employeeUser.email);

    // Crear dueño de empresa Test
    const testOwnerPassword = 'test1234';
    const testOwnerPasswordHash = await bcrypt.hash(testOwnerPassword, 10);

    const testOwnerUser = new User({
      email: 'owner@test.com',
      password_hash: testOwnerPasswordHash,
      full_name: 'Dueño Test',
      role: 'company_owner',
      company_id: testCompany._id,
      is_active: true,
      last_login: new Date()
    });
    await testOwnerUser.save();
    console.log('✅ Usuario test owner creado:', testOwnerUser.email);

    // Crear canal de ejemplo para Liquo
    const shopifyChannel = new Channel({
      company_id: liquoCompany._id,
      channel_type: 'shopify',
      channel_name: 'Tienda Shopify Liquo',
      api_key: 'fake_api_key_123',
      api_secret: 'fake_api_secret_456',
      store_url: 'https://liquo.myshopify.com',
      is_active: true
    });
    await shopifyChannel.save();
    console.log('✅ Canal Shopify creado:', shopifyChannel.channel_name);

    // Crear pedidos de ejemplo
    const sampleOrders = [
      {
        company_id: liquoCompany._id,
        channel_id: shopifyChannel._id,
        external_order_id: 'SHOP-001',
        order_number: 'LQ-001',
        customer_name: 'Juan Pérez',
        customer_email: 'juan@email.com',
        customer_phone: '+56912345678',
        shipping_address: 'Av. Providencia 1234',
        shipping_city: 'Santiago',
        shipping_state: 'RM',
        shipping_zip: '7500000',
        total_amount: 25000,
        shipping_cost: 2500,
        status: 'pending',
        order_date: new Date(),
        notes: 'Pedido de prueba'
      },
      {
        company_id: liquoCompany._id,
        channel_id: shopifyChannel._id,
        external_order_id: 'SHOP-002',
        order_number: 'LQ-002',
        customer_name: 'María González',
        customer_email: 'maria@email.com',
        customer_phone: '+56987654321',
        shipping_address: 'Las Condes 567',
        shipping_city: 'Santiago',
        shipping_state: 'RM',
        shipping_zip: '7550000',
        total_amount: 35000,
        shipping_cost: 2500,
        status: 'delivered',
        order_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
        delivery_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 día atrás
        notes: 'Entregado exitosamente'
      }
    ];

    await Order.insertMany(sampleOrders);
    console.log(`✅ ${sampleOrders.length} pedidos de ejemplo creados`);

    console.log('\n📋 RESUMEN DE USUARIOS CREADOS:');
    console.log('Admin: admin@liquo.com / admin1234');
    console.log('Owner Liquo: owner@liquo.com / owner1234');
    console.log('Employee Liquo: employee@liquo.com / employee1234');
    console.log('Owner Test: owner@test.com / test1234');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();