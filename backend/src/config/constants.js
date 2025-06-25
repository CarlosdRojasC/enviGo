// backend/src/config/constants.js
module.exports = {
  // Roles de usuario
  ROLES: {
    ADMIN: 'admin',
    COMPANY_OWNER: 'company_owner',
    COMPANY_EMPLOYEE: 'company_employee'
  },
  
  // Tipos de canales
  CHANNEL_TYPES: {
    SHOPIFY: 'shopify',
    WOOCOMMERCE: 'woocommerce',
    MERCADOLIBRE: 'mercadolibre',
    FALABELLA: 'falabella',
    RIPLEY: 'ripley'
  },
  
  // Estados de pedidos
  ORDER_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },
  
  // Estados de facturas
  INVOICE_STATUS: {
    PENDING: 'pending',
    SENT: 'sent',
    PAID: 'paid'
  },
  
  // Mensajes de error comunes
  ERRORS: {
    UNAUTHORIZED: 'No autorizado',
    FORBIDDEN: 'Acceso denegado',
    NOT_FOUND: 'No encontrado',
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    SERVER_ERROR: 'Error del servidor'
  }
};