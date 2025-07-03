// setup_shipday_existing_structure.js
// Ejecutar en MongoDB Compass (Mongosh) o MongoDB Shell
// Este script actualiza tu estructura existente para soportar Shipday


print("🚀 Configurando Shipday para tu estructura existente...");

// 2. Actualizar documentos existentes en orders
print("📦 Actualizando documentos existentes de orders...");

// Agregar campos de Shipday a pedidos existentes
db.orders.updateMany(
  { 
    shipday: { $exists: false } // Solo los que no tienen el campo shipday
  },
  { 
    $set: { 
      // Conductor asignado
      driver_id: null,
      
      // Coordenadas para delivery (necesarias para Shipday)
      delivery_coordinates: {
        latitude: null,
        longitude: null
      },
      
      // Dirección de pickup
      pickup_address: null,
      pickup_coordinates: {
        latitude: null,
        longitude: null
      },

      // Datos de Shipday
      shipday: {
        order_id: null,
        status: null,
        tracking_link: null,
        created_at: null,
        last_update: null,
        assigned_driver_id: null
      },

      // Prueba de entrega
      delivery_proof: {
        photos: [],
        signature: null,
        delivery_location: {
          latitude: null,
          longitude: null
        },
        delivered_at: null,
        driver_notes: null
      },

      // Historial de estados
      status_history: [],

      // Items del pedido (si no los tienes)
      items: []
    }
  }
);

print("✅ Campos de Shipday agregados a orders existentes");

// 3. Crear colección de drivers si no existe
print("🚗 Configurando colección de drivers...");

// Verificar si existe la colección drivers
const driversExists = db.getCollectionNames().includes('drivers');

if (!driversExists) {
  print("📝 Creando colección drivers...");
  
  // Crear un driver de ejemplo
  db.drivers.insertOne({
    company_id: ObjectId("685c7702a9731ba753a3ef7b"), // Cambiar por un ObjectId real de tu empresa
    name: "Conductor de Prueba",
    email: "conductor@prueba.com",
    phone: "+56912345678",
    document: "12345678-9",
    license_number: "LIC123456",
    
    vehicle: {
      type: "motorcycle",
      brand: "Honda",
      model: "CB150",
      year: 2022,
      license_plate: "TEST123",
      color: "Rojo"
    },
    
    documents: {
      license_photo: null,
      vehicle_registration: null,
      insurance: null,
      background_check: null
    },
    
    is_active: true,
    is_available: true,
    is_verified: false,
    
    shipday: {
      driver_id: null,
      is_synced: false,
      synced_at: null,
      last_location: {
        latitude: null,
        longitude: null,
        updated_at: null
      },
      color: '#3b82f6'
    },
    
    stats: {
      total_deliveries: 0,
      successful_deliveries: 0,
      cancelled_deliveries: 0,
      current_orders_count: 0,
      rating: null,
      total_earnings: 0,
      last_delivery_date: null
    },
    
    work_schedule: {
      monday: { start: "09:00", end: "18:00", active: true },
      tuesday: { start: "09:00", end: "18:00", active: true },
      wednesday: { start: "09:00", end: "18:00", active: true },
      thursday: { start: "09:00", end: "18:00", active: true },
      friday: { start: "09:00", end: "18:00", active: true },
      saturday: { start: "09:00", end: "15:00", active: false },
      sunday: { start: "09:00", end: "15:00", active: false }
    },
    
    work_zone: {
      communes: ["Santiago", "Providencia", "Las Condes"],
      max_distance_km: 20
    },
    
    payment_info: {
      bank_name: null,
      account_type: null,
      account_number: null,
      rut: null
    },
    
    created_at: new Date(),
    updated_at: new Date()
  });
  
  print("✅ Driver de ejemplo creado");
} else {
  print("🔄 Actualizando drivers existentes...");
  
  // Actualizar drivers existentes para agregar campos de Shipday
  db.drivers.updateMany(
    { shipday: { $exists: false } },
    { 
      $set: { 
        shipday: {
          driver_id: null,
          is_synced: false,
          synced_at: null,
          last_location: {
            latitude: null,
            longitude: null,
            updated_at: null
          },
          color: '#3b82f6'
        },
        stats: {
          total_deliveries: 0,
          successful_deliveries: 0,
          cancelled_deliveries: 0,
          current_orders_count: 0,
          rating: null,
          total_earnings: 0,
          last_delivery_date: null
        }
      }
    }
  );
  
  print("✅ Drivers existentes actualizados con campos de Shipday");
}

// 4. Crear índices optimizados para tu estructura
print("🔧 Creando índices optimizados...");

// Índices para orders (manteniendo los existentes y agregando nuevos)
db.orders.createIndex({ "company_id": 1, "status": 1 }); // Ya existe
db.orders.createIndex({ "channel_id": 1, "external_order_id": 1 }, { unique: true }); // Ya existe
db.orders.createIndex({ "order_date": -1 }); // Ya existe
db.orders.createIndex({ "customer_email": 1 }); // Ya existe
db.orders.createIndex({ "invoice_id": 1 }); // Ya existe
db.orders.createIndex({ "billed": 1 }); // Ya existe

// NUEVOS índices para Shipday
db.orders.createIndex({ "shipday.order_id": 1 }, { unique: true, sparse: true });
db.orders.createIndex({ "shipday.status": 1 });
db.orders.createIndex({ "shipday.tracking_link": 1 });
db.orders.createIndex({ "driver_id": 1 });
db.orders.createIndex({ "shipday.last_update": -1 });

// Índices compuestos para queries de Shipday
db.orders.createIndex({ "company_id": 1, "status": 1, "shipday.order_id": 1 });
db.orders.createIndex({ "company_id": 1, "driver_id": 1, "status": 1 });

// Índices para drivers
db.drivers.createIndex({ "company_id": 1, "is_active": 1 });
db.drivers.createIndex({ "company_id": 1, "is_available": 1 });
db.drivers.createIndex({ "email": 1 }, { unique: true });
db.drivers.createIndex({ "phone": 1 });
db.drivers.createIndex({ "document": 1 }, { unique: true });
db.drivers.createIndex({ "vehicle.license_plate": 1 });
db.drivers.createIndex({ "shipday.driver_id": 1 }, { unique: true, sparse: true });
db.drivers.createIndex({ "shipday.is_synced": 1 });

print("✅ Índices creados exitosamente");

// 5. Crear configuración de Shipday para la empresa
print("⚙️ Creando configuración de Shipday...");

db.shipday_config.insertOne({
  company_id: ObjectId("685c7702a9731ba753a3ef7e"), // Cambiar por tu ObjectId real
  api_key: "TU_SHIPDAY_API_KEY_AQUI", // Cambiar por tu API key real
  webhook_url: "https://tudominio.com/api/webhooks/shipday",
  
  default_pickup: {
    address: "Tu dirección de almacén o tienda principal",
    latitude: -33.4489, // Cambiar por tus coordenadas reales
    longitude: -70.6693
  },
  
  settings: {
    require_signature: true,
    require_photo: true,
    auto_assign: false,
    webhook_events: [
      "order.status_changed",
      "order.delivered",
      "driver.location_updated"
    ]
  },
  
  integration_active: true,
  created_at: new Date(),
  updated_at: new Date()
});

print("✅ Configuración de Shipday creada");

// 6. Función para migrar coordenadas desde direcciones (opcional)
print("📍 Función para geocodificar direcciones...");

// Esta función te ayudará a obtener coordenadas de tus direcciones existentes
function geocodeAddresses() {
  print("Para geocodificar direcciones, puedes usar un servicio como:");
  print("1. Google Geocoding API");
  print("2. OpenStreetMap Nominatim");
  print("3. Mapbox Geocoding API");
  print("");
  print("Ejemplo de actualización manual:");
  print("db.orders.updateOne(");
  print("  { _id: ObjectId('ORDER_ID') },");
  print("  { $set: { 'delivery_coordinates.latitude': -33.4489, 'delivery_coordinates.longitude': -70.6693 } }");
  print(");");
}

// 7. Verificar configuración
print("🔍 Verificando configuración...");

const ordersCount = db.orders.countDocuments();
const driversCount = db.drivers.countDocuments();
const ordersWithShipday = db.orders.countDocuments({ "shipday": { $exists: true } });
const driversWithShipday = db.drivers.countDocuments({ "shipday": { $exists: true } });

print("📊 Estadísticas:");
print(`   Orders totales: ${ordersCount}`);
print(`   Orders con campos Shipday: ${ordersWithShipday}`);
print(`   Drivers totales: ${driversCount}`);
print(`   Drivers con campos Shipday: ${driversWithShipday}`);

print("🔍 Índices en orders:");
db.orders.getIndexes().forEach(index => {
  if (index.name.includes('shipday') || index.name.includes('driver')) {
    print(`   ✅ ${index.name}`);
  }
});

print("🔍 Índices en drivers:");
db.drivers.getIndexes().forEach(index => {
  if (index.name.includes('shipday') || index.name.includes('company')) {
    print(`   ✅ ${index.name}`);
  }
});

// 8. Consultas útiles para tu estructura
print("\n📋 Consultas útiles para tu estructura:");

print("Ver pedidos de una empresa disponibles para Shipday:");
print("db.orders.find({ company_id: ObjectId('TU_COMPANY_ID'), 'shipday.order_id': null, status: { $in: ['pending', 'processing'] } })");

print("Ver conductores de una empresa disponibles:");
print("db.drivers.find({ company_id: ObjectId('TU_COMPANY_ID'), is_active: true, is_available: true })");

print("Ver pedidos ya en Shipday:");
print("db.orders.find({ 'shipday.order_id': { $ne: null } })");

print("Ver historial de un pedido:");
print("db.orders.findOne({ _id: ObjectId('ORDER_ID') }, { status_history: 1, order_number: 1 })");

// 9. Script de limpieza (para testing)
print("\n🧹 Para limpiar datos de Shipday en testing:");
print("function clearShipdayData(companyId) {");
print("  db.orders.updateMany(");
print("    { company_id: ObjectId(companyId) },");
print("    { $set: { 'shipday.order_id': null, 'shipday.status': null, 'shipday.tracking_link': null, driver_id: null } }");
print("  );");
print("  db.drivers.updateMany(");
print("    { company_id: ObjectId(companyId) },");
print("    { $set: { 'shipday.driver_id': null, 'shipday.is_synced': false } }");
print("  );");
print("}");

print("\n🎉 ¡Configuración de Shipday completada para tu estructura existente!");
print("\n📝 Próximos pasos:");
print("1. Cambiar 'COMPANY_ID_EJEMPLO' por tu ObjectId real de empresa");
print("2. Configurar tu SHIPDAY_API_KEY en las variables de entorno");
print("3. Actualizar coordenadas de direcciones existentes");
print("4. Crear conductores reales en la colección drivers");
print("5. Probar la asignación de pedidos desde tu dashboard");

// Función para obtener ObjectId de empresa (helper)
print("\n🔧 Para obtener tu company_id real:");
print("db.companies.findOne({}, {_id: 1, name: 1})");

print("\n✅ Script completado exitosamente!");