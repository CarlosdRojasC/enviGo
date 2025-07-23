// frontend/src/services/api.js
import axios from 'axios'

// Configuración base de axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response || error)
    
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // No redirigir automáticamente para evitar bucles
      console.warn('Token expirado, el usuario debe hacer login nuevamente')
    }
    
    return Promise.reject(error)
  }
)



// Servicios de autenticación
const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

const communes = {
  // Llama a la ruta /api/communes/envigo que creaste
  getEnvigoCommunes: () => api.get('/communes/envigo') 
};
// --- FIN DEL NUEVO OBJETO ---
// Servicios de empresas
const companies = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  create: (companyData) => api.post('/companies', companyData),
  update: (id, companyData) => api.put(`/companies/${id}`, companyData),
  updatePrice: (id, price) => api.patch(`/companies/${id}/price`, { price_per_order: price }),
  getUsers: (id) => api.get(`/companies/${id}/users`),
  getStats: (id, params = {}) => api.get(`/companies/${id}/stats`, { params })
}

const users = {
  getByCompany: (companyId) => api.get(`/users/company/${companyId}`),
  create: (userData) => api.post('/auth/register', userData),
  updateUser: (id, userData) => api.patch(`/users/${id}`, userData)
}

// Servicios de pedidos
const orders = {
  getAll: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (orderData) => api.post('/orders', orderData),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  markAsReady: (id) => api.patch(`/orders/${id}/ready`),
  getStats: (params = {}) => api.get('/orders/stats', { params }),
  getManifestData: (orderIds) => api.post('/orders/manifest', { orderIds }),
  getTrend: (params = {}) => api.get('/orders/trend', { params }),
  debugShipday: (orderId) => api.get(`/orders/${orderId}/debug-shipday`),
  exportOrders: (params = {}) => api.get('/orders/export', { 
    params,
    responseType: 'blob'
  }),
  bulkUpload: (formData) => api.post('/orders/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 60000 // Aumentar timeout para cargas grandes
  }),
    downloadImportTemplate: () => api.get('/orders/import-template', {
    responseType: 'blob'
  }),
  /**
 * Obtener datos para el manifiesto de retiro
 * @param {Array} orderIds - Array de IDs de pedidos
 * @returns {Promise} Datos del manifiesto
 */
getManifest: async (orderIds) => {
  try {
    console.log('📋 API: Solicitando datos del manifiesto para:', orderIds);
    
    const response = await api.post('/orders/manifest', {
      orderIds
    });
    
    console.log('✅ API: Datos del manifiesto obtenidos:', {
      orders: response.data.orders?.length || 0,
      company: response.data.company?.name || 'N/A'
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ API: Error obteniendo manifiesto:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      orderIds
    });
    throw error;
  }
},
  markMultipleAsReady: async (orderIds) => {
    try {
      console.log('📦 API: Marcando pedidos como listos:', orderIds);
      // Se corrige la ruta a '/orders/bulk-ready'
      const response = await api.post('/orders/bulk-ready', { orderIds });
      console.log('✅ API: Respuesta del servidor:', response.data);
      return response;
    } catch (error) {
      console.error('❌ API: Error marcando pedidos como listos:', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
        orderIds
      });
      throw error;
    }
  },

/**
 * Marcar múltiples pedidos como listos para retiro
 * @param {Array} orderIds - Array de IDs de pedidos
 * @returns {Promise} Resultado de la operación
 */

  // ==================== MÉTODOS SHIPDAY EXISTENTES ====================
  
  // Crear orden en Shipday sin asignar conductor
  createInShipday: (orderId) => api.post(`/orders/${orderId}/create-shipday`),
  
  // Asignar conductor (crear+asignar o solo asignar)
  assignDriver: (orderId, driverId) => api.post(`/orders/${orderId}/assign-driver`, { driverId }),
  
  // Crear múltiples órdenes en Shipday
  bulkCreateInShipday: (orderIds) => api.post('/orders/bulk-create-shipday', { orderIds }),
  
  // Obtener estado de sincronización con Shipday
  getShipdayStatus: (orderId) => api.get(`/orders/${orderId}/shipday-status`),

   // --- 👇 AÑADE ESTA LÍNEA 👇 ---
getAvailableCommunes: (params = {}) => api.get('/orders/communes', { params }),

  // ==================== NUEVOS MÉTODOS PARA ASIGNACIÓN MASIVA ====================
  
  /**
   * Asignar múltiples pedidos a un conductor de forma masiva
   * @param {Array} orderIds - Array de IDs de pedidos
   * @param {string} driverId - ID del conductor en Shipday
   * @returns {Promise} Respuesta con resultados de la asignación masiva
   */
  bulkAssignDriver: async (orderIds, driverId) => {
    try {
      console.log('📦 API: Iniciando asignación masiva:', {
        ordersCount: orderIds.length,
        driverId
      });
      
      const response = await api.post('/orders/bulk-assign-driver', {
        orderIds,
        driverId
      });
      
      console.log('✅ API: Asignación masiva completada:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ API: Error en asignación masiva:', error.response || error);
      throw error;
    }
  },

  /**
   * Verificar el estado de múltiples asignaciones
   * @param {Array} orderIds - Array de IDs de pedidos
   * @returns {Promise} Estado de asignación de cada pedido
   */
  bulkCheckAssignmentStatus: async (orderIds) => {
    try {
      console.log('🔍 API: Verificando estado de asignaciones masivas:', orderIds);
      
      const response = await api.post('/orders/bulk-assignment-status', {
        orderIds
      });
      
      console.log('✅ API: Estados de asignación obtenidos:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ API: Error verificando estados:', error.response || error);
      throw error;
    }
  },

  /**
   * Cancelar asignaciones masivas (si es necesario)
   * @param {Array} orderIds - Array de IDs de pedidos
   * @returns {Promise} Resultado de la cancelación
   */
  bulkUnassignDriver: async (orderIds) => {
    try {
      console.log('🚫 API: Cancelando asignaciones masivas:', orderIds);
      
      const response = await api.post('/orders/bulk-unassign-driver', {
        orderIds
      });
      
      console.log('✅ API: Asignaciones canceladas:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ API: Error cancelando asignaciones:', error.response || error);
      throw error;
    }
  },

  /**
   * Obtener resumen de capacidad de asignación masiva
   * @param {Array} orderIds - Array de IDs de pedidos
   * @returns {Promise} Análisis de qué pedidos pueden ser asignados
   */
  bulkAssignmentPreview: async (orderIds) => {
    try {
      console.log('🔍 API: Obteniendo preview de asignación masiva:', orderIds);
      
      const response = await api.post('/orders/bulk-assignment-preview', {
        orderIds
      });
      
      console.log('✅ API: Preview obtenido:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ API: Error en preview:', error.response || error);
      throw error;
    }
  },
   // 🆕 NUEVO: Método para tracking
getTracking: async (orderId) => {
  try {
    console.log('📍 API: Obteniendo tracking para orden:', orderId);
    
    const response = await api.get(`/orders/${orderId}/tracking`);
    
    console.log('✅ API: Tracking obtenido:', {
      order_number: response.data.tracking?.order_number,
      has_tracking_url: !!response.data.tracking?.tracking_url,
      tracking_url: response.data.tracking?.tracking_url,
      current_status: response.data.tracking?.current_status,
      timeline_events: response.data.tracking?.timeline?.length || 0,
      debug_info: response.data.tracking?.debug_info
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ API: Error obteniendo tracking:', {
      orderId,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    throw error;
  }
},

// 🆕 NUEVO: Método para refrescar datos de una orden específica
refreshOrderData: async (orderId) => {
  try {
    console.log('🔄 API: Refrescando datos de orden:', orderId);
    
    const response = await api.get(`/orders/${orderId}`);
    
    console.log('✅ API: Datos de orden refrescados:', {
      order_id: response.data._id,
      order_number: response.data.order_number,
      status: response.data.status,
      has_tracking_url: !!response.data.shipday_tracking_url,
      tracking_url: response.data.shipday_tracking_url,
      last_updated: response.data.updated_at
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ API: Error refrescando datos de orden:', {
      orderId,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    throw error;
  }
},

markAsDelivered: async (orderId, proofData = {}) => {
    try {
      console.log('📦 API: Marcando pedido como entregado:', orderId, proofData);
      
      const response = await api.patch(`/orders/${orderId}/deliver`, proofData);
      
      console.log('✅ API: Pedido marcado como entregado:', {
        order_id: response.data.order._id,
        order_number: response.data.order.order_number,
        has_proof: !!response.data.proof_of_delivery
      });
      
      return response;
      
    } catch (error) {
      console.error('❌ API: Error marcando como entregado:', {
        orderId,
        status: error.response?.status,
        message: error.response?.data?.error || error.message
      });
      throw error;
    }
  }
}

// Servicios de canales
const channels = {
  getByCompany: (companyId) => api.get(`/companies/${companyId}/channels`),
  getAll: () => api.get('/channels/admin/all'), // Para admin ver todos
getAllForAdmin: () => api.get('/channels/admin/all'),
  getById: (id) => api.get(`/channels/${id}`),
  create: (companyId, channelData) => api.post(`/companies/${companyId}/channels`, channelData),
  update: (id, channelData) => api.put(`/channels/${id}`, channelData),
  delete: (id) => api.delete(`/channels/${id}`),
  syncOrders: (id, syncData) => api.post(`/channels/${id}/sync`, syncData),
  testConnection: (id) => api.post(`/channels/${id}/test`),
  getCommunes: (channelId) => api.get(`/channels/${channelId}/communes`),
    updateCommunes: (channelId, data) => api.put(`/channels/${channelId}/communes`, data),
    testCommune: (channelId, data) => api.post(`/channels/${channelId}/communes/test`, data),
    syncWithCommunes: (channelId, data) => api.post(`/channels/${channelId}/sync-with-communes`, data)
}

// Servicios de facturación
const billing = {
  // Obtener resumen financiero para admin dashboard
  getFinancialSummary: () => api.get('/billing/financial-summary'),
  
  // Obtener facturas
  getInvoices: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/billing/invoices${queryParams ? '?' + queryParams : ''}`);
  },
  
  // Generar factura individual
  generateInvoice: (data) => api.post('/billing/invoices/generate', data),
  
  // Generar facturas masivas
  generateBulkInvoices: (data) => api.post('/billing/invoices/generate-bulk', data),
  
  // Preview de generación masiva
  getBulkGenerationPreview: (params) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/billing/invoices/bulk-preview?${queryParams}`);
  },
  
  // Obtener pedidos disponibles para facturar
  getAvailableOrders: (params) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/orders?${queryParams}&status=delivered&billed=false`);
  },
  
  // Marcar como pagada
  markAsPaid: (invoiceId) => api.post(`/billing/invoices/${invoiceId}/mark-as-paid`),
  
  // Enviar factura
  sendInvoice: (invoiceId) => api.post(`/billing/invoices/${invoiceId}/send`),
  
  // Descargar factura
  downloadInvoice: (invoiceId) => api.get(`/billing/invoices/${invoiceId}/download`, {
    responseType: 'blob'
  }),
  
  // Eliminar facturas
  deleteInvoice: (invoiceId) => api.delete(`/billing/invoices/${invoiceId}`),
  bulkDelete: (invoiceIds) => api.delete('/billing/invoices', { data: { invoice_ids: invoiceIds } }),
  
  // Operaciones masivas
  bulkMarkAsPaid: (invoiceIds) => api.post('/billing/invoices/bulk-mark-paid', { invoice_ids: invoiceIds }),
  
  // Detalles de factura
  getInvoiceDetails: (invoiceId) => api.get(`/billing/invoices/${invoiceId}/details`),
  getInvoiceOrders: (invoiceId) => api.get(`/billing/invoices/${invoiceId}/orders`),
  updateInvoiceNotes: (invoiceId, data) => api.patch(`/billing/invoices/${invoiceId}/notes`, data),
  duplicateInvoice: (invoiceId) => api.post(`/billing/invoices/${invoiceId}/duplicate`),
  
  // Estadísticas para empresas
  getBillingStats: (companyId) => {
    const params = companyId ? `?company_id=${companyId}` : '';
    return api.get(`/billing/stats${params}`);
  },
  
  getNextInvoiceEstimate: (companyId) => {
    const params = companyId ? `?company_id=${companyId}` : '';
    return api.get(`/billing/next-estimate${params}`);
  },
  requestConfirmation: (invoiceId) => api.put(`/billing/invoices/${invoiceId}/request-confirmation`),
  confirmPayment: (invoiceId) => api.put(`/billing/invoices/${invoiceId}/confirm-payment`),
};

// Servicios de dashboard
const dashboard = {
  // Método existente
 getStats: async () => {
    try {
      console.log('📊 API: Solicitando estadísticas del dashboard...');
      const response = await api.get('/dashboard');
      
      // Manejar tanto respuesta nueva como antigua
      const data = response.data?.data || response.data;
      
      console.log('✅ API: Estadísticas recibidas:', data);
      return { data };
    } catch (error) {
      console.error('❌ API: Error obteniendo estadísticas:', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message
      });
      throw error;
    }
  },
  getCommunesStats: async () => {
  try {
    console.log('🏘️ API: Solicitando estadísticas de comunas...')
    const response = await api.get('/communes/stats')
    console.log('✅ API: Stats de comunas recibidas:', response.data)
    return { data: response.data }
  } catch (error) {
    console.error('❌ API: Error obteniendo stats de comunas:', error)
    throw error
  }
},
  
  getTrends: async () => {
    try {
      console.log('📈 API: Solicitando trends del dashboard...');
      const response = await api.get('/dashboard/trends');
      
      // Manejar tanto respuesta nueva como antigua
      const data = response.data?.data || response.data;
      
      console.log('✅ API: Trends recibidos:', data);
      return { data };
    } catch (error) {
      console.error('❌ API: Error obteniendo trends:', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message
      });
      throw error;
    }
  },
  
  // Método para admin (si necesitas funcionalidad específica)
  getAdminStats: async () => {
    try {
      console.log('👑 API: Solicitando estadísticas de administrador...');
      const response = await api.get('/dashboard');
      const data = response.data?.data || response.data;
      
      console.log('✅ API: Stats admin recibidas:', data);
      return { data };
    } catch (error) {
      console.error('❌ API: Error obteniendo stats admin:', error);
      throw error;
    }
  },

  // Método para comparar períodos específicos
  getComparison: (params) => api.get('/dashboard/comparison', { params })
}
// Servicios de conductores
const drivers = {
  // Obtener todos los conductores (desde tu BD local)
  getAll: () => api.get('/drivers'),
  
  // Crear conductor en tu BD local
  create: (driverData) => api.post('/drivers', driverData),
  
  // Eliminar conductor
  delete: (driverId) => api.delete(`/drivers/${driverId}`),
  
  // Obtener conductores por empresa (si necesitas)
  getByCompany: (companyId) => api.get(`/companies/${companyId}/drivers`)
}
// Servicios de Shipday
const shipday = {
  // ==================== CONEXIÓN ====================
  testConnection: () => api.get('/shipday/test-connection'),
  
  // ==================== DRIVERS ====================
  getDrivers: () => api.get('/shipday/drivers'),
  getDriver: (id) => api.get(`/shipday/drivers/${id}`),
  createDriver: (driverData) => api.post('/shipday/drivers', driverData),
  updateDriver: (id, driverData) => api.put(`/shipday/drivers/${id}`, driverData),
  deleteDriver: (id) => api.delete(`/shipday/drivers/${id}`),
  
  // ==================== ORDERS ====================
  getOrders: (filters = {}) => {
    const params = new URLSearchParams(filters).toString()
    return api.get(`/shipday/orders${params ? `?${params}` : ''}`)
  },
  getOrder: (id) => api.get(`/shipday/orders/${id}`),
  createOrder: (orderData) => api.post('/shipday/orders', orderData),
  assignOrder: (orderId, driverId) => api.put(`/shipday/orders/${orderId}/assign`, { driverId }),
  updateOrderStatus: (id, status) => api.put(`/shipday/orders/${id}/status`, { status }),
  
  // ==================== TRACKING ====================
  getOrderTracking: (id) => api.get(`/shipday/orders/${id}/tracking`),
  
  // ==================== WEBHOOKS ====================
  setupWebhook: (webhookData) => api.post('/shipday/webhooks/setup', webhookData),
  
  // ==================== DEBUG/TESTING ====================
  testAssignOrder: (orderId, driverId) => api.post(`/shipday/test-assign/${orderId}/${driverId}`),
  getDriversDetailed: () => api.get('/shipday/drivers-detailed'),
  fullInvestigation: () => api.get('/shipday/full-investigation')
}

// ACTUALIZAR la exportación para incluir shipday
// Exportar todos los servicios
export const apiService = {
  auth,
  companies,
  orders,
  channels,
  communes,
  drivers,
  billing,
  dashboard,
  users,
  shipday
}

// Exportar instancia de axios para casos especiales
export { api }