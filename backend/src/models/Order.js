const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  // Datos del origen
  source: {
    platform: { type: String, enum: ['shopify', 'woocommerce', 'mercadolibre', 'falabella'] },
    order_id: String, // ID original en la plataforma
    order_number: String,
    store_url: String
  },
  
  // Cliente que recibe
  customer: {
    name: String,
    email: String,
    phone: String
  },
  
  // Dirección de entrega
  delivery_address: {
    street: String,
    number: String,
    apartment: String,
    city: String,
    state: String,
    postal_code: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    delivery_notes: String
  },
  
  // Información del paquete
  package_info: {
    items_count: Number,
    weight: Number, // en kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    fragile: Boolean,
    value: Number // valor declarado
  },
  
  // Estados de última milla
  status: {
    type: String,
    enum: [
      'pending_sync',      // Recién capturado
      'ready_for_pickup',  // Listo para recolectar
      'in_transit',        // En ruta
      'delivered',         // Entregado
      'failed_delivery',   // Intento fallido
      'returned'          // Devuelto al origen
    ]
  },
  
  // Para facturación
  billing: {
    price_per_order: Number, // Lo que cobras por este pedido
    billed: { type: Boolean, default: false },
    billed_date: Date
  }
});
module.exports = mongoose.model('Order', orderSchema);
