require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../src/models/Order'); // Asumo que tienes uno

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Eliminar pedidos previos
    await Order.deleteMany({});
    console.log('🧹 Pedidos anteriores eliminados');

    const pedidos = [];

    for (let i = 1; i <= 5; i++) {
      pedidos.push({
        source: {
          platform: 'shopify',
          order_id: `SHOP-${i}`,
          order_number: `ORD-${1000 + i}`,
          store_url: 'https://liquo.com'
        },
        customer: {
          name: `Cliente ${i}`,
          email: `cliente${i}@liquo.com`,
          phone: `+5691234567${i}`
        },
        delivery_address: {
          street: 'Calle Falsa',
          number: `${100 + i}`,
          apartment: `Depto ${i}`,
          city: 'Santiago',
          state: 'RM',
          postal_code: '8320000',
          coordinates: {
            lat: -33.4489,
            lng: -70.6693
          },
          delivery_notes: 'Dejar en conserjería'
        },
        package_info: {
          items_count: 2,
          weight: 1.5,
          dimensions: {
            length: 20,
            width: 15,
            height: 10
          },
          fragile: false,
          value: 5000
        },
        status: 'pending_sync',
        billing: {
          price_per_order: 1000,
          billed: false
        }
      });
    }

    await Order.insertMany(pedidos);
    console.log(`✅ ${pedidos.length} pedidos insertados correctamente`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();
