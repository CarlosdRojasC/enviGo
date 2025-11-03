const mongoose = require('mongoose');
const Order = require('./models/Order');

async function createOrderIndex() {
  await mongoose.connect(process.env.MONGO_URI);
  await Order.collection.createIndex({ order_date: -1, shipping_commune: 1, shipping_address: 1 });
  console.log('✅ Índice creado correctamente en orders');
  await mongoose.disconnect();
}

createOrderIndex().catch(console.error);
