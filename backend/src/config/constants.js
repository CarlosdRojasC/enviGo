// backend/src/config/constants.js
module.exports = {
  // Roles de usuario (mantener los existentes + agregar driver)
  ROLES: {
    ADMIN: 'admin',
    COMPANY_OWNER: 'company_owner',
    COMPANY_EMPLOYEE: 'company_employee',
    DRIVER: 'driver' // ← AGREGADO
  },
     
  // Tipos de canales
  CHANNEL_TYPES: {
    SHOPIFY: 'shopify',
    WOOCOMMERCE: 'woocommerce',
    MERCADOLIBRE: 'mercadolibre',
    JUMPSELLER: 'jumpseller',
    FALABELLA: 'falabella',
    RIPLEY: 'ripley',
    GENERAL_STORE: 'general_store'
  },
     
  // Estados de pedidos (expandido)
  ORDER_STATUS: {
PENDING: 'pending',
  READY_FOR_PICKUP: 'ready_for_pickup', 
  WAREHOUSE_RECEIVED: 'warehouse_received',  // 🆕 CRÍTICO
  PROCESSING: 'processing',
  ASSIGNED: 'assigned',                      // 🆕 CRÍTICO
  OUT_FOR_DELIVERY: 'out_for_delivery',     // 🆕 CRÍTICO
  SHIPPED: 'shipped',                        // MANTENER
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  INVOICED: 'invoiced',                      // MANTENER
  IN_TRANSIT: 'in_transit'                    // 🆕 CRÍTICO
  },
     
  // Estados de facturas
  INVOICE_STATUS: {
    PENDING: 'pending',
    SENT: 'sent',
    PAID: 'paid'
  },
     
  // Mensajes de error comunes (expandido)
  ERRORS: {
    UNAUTHORIZED: 'No autorizado',
    FORBIDDEN: 'Acceso denegado',
    NOT_FOUND: 'No encontrado',
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    SERVER_ERROR: 'Error del servidor',
    
    // ← AGREGADOS para conductores
    DRIVER_NOT_FOUND: 'Conductor no encontrado',
    DRIVER_ALREADY_EXISTS: 'El conductor ya existe',
    DRIVER_NOT_AVAILABLE: 'Conductor no disponible',
    VALIDATION_ERROR: 'Error de validación',
    REQUIRED_FIELDS: 'Campos requeridos faltantes',
    INVALID_EMAIL: 'Email inválido',
    INVALID_PHONE: 'Teléfono inválido',
    
    // ← AGREGADOS para integraciones
    SHIPDAY_ERROR: 'Error en la integración con Shipday',
    SHOPIFY_ERROR: 'Error en la integración con Shopify',
    WOOCOMMERCE_ERROR: 'Error en la integración con WooCommerce',
    EXTERNAL_API_ERROR: 'Error en API externa'
  },

  // ← AGREGADAS: Constantes para vehículos
  VEHICLE_TYPES: {
    CAR: 'car',
    MOTORCYCLE: 'motorcycle',
    BICYCLE: 'bicycle',
    TRUCK: 'truck',
    VAN: 'van'
  },

  // ← AGREGADAS: Zonas de comunas
  COMMUNE_ZONES: {
    NORTE: 'Zona Norte',
    CENTRO: 'Zona Centro',
    ORIENTE: 'Zona Oriente',
    SUR: 'Zona Sur',
    PONIENTE: 'Zona Poniente',
    SUR_ORIENTE: 'Zona Sur-Oriente'
  },

  // ← AGREGADAS: Endpoints de Shipday
  SHIPDAY_ENDPOINTS: {
    DRIVERS: '/drivers',
    ORDERS: '/orders',
    TRACKING: '/tracking',
    WEBHOOKS: '/webhooks'
  }
};