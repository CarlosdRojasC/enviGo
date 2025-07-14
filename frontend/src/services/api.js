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
  exportForOptiRoute: (params = {}) => api.get('/orders/export', { 
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
}
}

// Servicios de canales
const channels = {
  getByCompany: (companyId) => api.get(`/companies/${companyId}/channels`),
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
  // Obtener facturas con mejor manejo de errores
  getInvoices: async (params = {}) => {
    try {
      console.log('🔍 API: Solicitando facturas con parámetros:', params)
      const response = await api.get('/billing/invoices', { params })
      console.log('✅ API: Facturas recibidas:', response.data)
      return response
    } catch (error) {
      console.error('❌ API: Error en getInvoices:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      })
      throw error
    }
  },
  
  // Obtener estadísticas de facturación
  getBillingStats: async (params = {}) => {
    try {
      console.log('🔍 API: Solicitando estadísticas de facturación:', params)
      const response = await api.get('/billing/stats', { params })
      console.log('✅ API: Estadísticas recibidas:', response.data)
      return response
    } catch (error) {
      console.error('❌ API: Error en getBillingStats:', error.response || error)
      throw error
    }
  },
  
  // Obtener estimación de próxima factura
  getNextInvoiceEstimate: async (params = {}) => {
    try {
      console.log('🔍 API: Solicitando estimación de próxima factura:', params)
      const response = await api.get('/billing/next-estimate', { params })
      console.log('✅ API: Estimación recibida:', response.data)
      return response
    } catch (error) {
      console.error('❌ API: Error en getNextInvoiceEstimate:', error.response || error)
      throw error
    }
  },
  
  // Descargar factura en PDF
  downloadInvoice: async (invoiceId) => {
    try {
      console.log('📥 API: Descargando factura:', invoiceId)
      const response = await api.get(`/billing/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      })
      console.log('✅ API: Factura descargada exitosamente')
      return response
    } catch (error) {
      console.error('❌ API: Error descargando factura:', error.response || error)
      throw error
    }
  },
  
  // Marcar factura como pagada (admin)
  markAsPaid: async (invoiceId) => {
    try {
      console.log('💳 API: Marcando factura como pagada:', invoiceId)
      const response = await api.post(`/billing/invoices/${invoiceId}/mark-as-paid`)
      console.log('✅ API: Factura marcada como pagada')
      return response
    } catch (error) {
      console.error('❌ API: Error marcando como pagada:', error.response || error)
      throw error
    }
  },
  
  // Generar factura individual
  generateInvoice: async (data) => {
    try {
      console.log('🔨 API: Generando factura individual:', data)
      const response = await api.post('/billing/invoices/generate', data)
      console.log('✅ API: Factura generada:', response.data)
      return response
    } catch (error) {
      console.error('❌ API: Error generando factura:', error.response || error)
      throw error
    }
  },
  
  // Vista previa de generación masiva
  previewBulkGeneration: async (params) => {
    try {
      console.log('🔍 API: Vista previa generación masiva:', params)
      const response = await api.get('/billing/invoices/bulk-preview', { params })
      console.log('✅ API: Vista previa recibida:', response.data)
      return response
    } catch (error) {
      console.error('❌ API: Error en vista previa:', error.response || error)
      throw error
    }
  },
  
  // Generar facturas masivas
  generateBulkInvoices: async (data) => {
    try {
      console.log('🔨 API: Generando facturas masivas:', data)
      const response = await api.post('/billing/invoices/generate-bulk', data)
      console.log('✅ API: Facturas masivas generadas:', response.data)
      return response
    } catch (error) {
      console.error('❌ API: Error generando facturas masivas:', error.response || error)
      throw error
    }
  },
  
  // Generar facturas mensuales automáticas
  generateMonthlyInvoices: () => api.post('/billing/generate'),

  // Para empresas - Solicitar nueva factura
  requestInvoice: (data) => api.post('/billing/request-invoice', data),
  
  // Para empresas - Reportar pago de factura
  reportPayment: (data) => api.post('/billing/report-payment', data),
  
  // Borrar una factura individual
  deleteInvoice: async (invoiceId) => {
    try {
      console.log('🗑️ API: Borrando factura:', invoiceId)
      const response = await api.delete(`/billing/invoices/${invoiceId}`)
      console.log('✅ API: Factura borrada exitosamente')
      return response
    } catch (error) {
      console.error('❌ API: Error borrando factura:', error.response || error)
      throw error
    }
  },

  // Borrar múltiples facturas
  deleteBulkInvoices: async (invoiceIds) => {
    try {
      console.log('🗑️ API: Borrando facturas en lote:', invoiceIds.length)
      const response = await api.delete('/billing/invoices', {
        data: { invoice_ids: invoiceIds }
      })
      console.log('✅ API: Facturas borradas exitosamente')
      return response
    } catch (error) {
      console.error('❌ API: Error borrando facturas en lote:', error.response || error)
      throw error
    }
  },

  // Borrar todas las facturas (solo desarrollo)
  deleteAllInvoices: async () => {
    try {
      console.log('🧹 API: Borrando TODAS las facturas')
      const response = await api.delete('/billing/invoices/all/development')
      console.log('✅ API: Todas las facturas borradas')
      return response
    } catch (error) {
      console.error('❌ API: Error borrando todas las facturas:', error.response || error)
      throw error
    }
  },

  // Obtener resumen financiero para admin
  getFinancialSummary: async () => {
    try {
      console.log('🔍 API: Solicitando resumen financiero')
      const response = await api.get('/billing/financial-summary')
      console.log('✅ API: Resumen financiero recibido:', response.data)
      return response
    } catch (error) {
      console.error('❌ API: Error en getFinancialSummary:', error.response || error)
      throw error
    }
  },

  // Exportar facturas a CSV/Excel
  exportInvoices: (params = {}) => 
    api.get('/billing/export', { 
      params,
      responseType: 'blob' 
    })
}

// Servicios de dashboard
const dashboard = {
  getStats: () => api.get('/dashboard')
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
  users
}

// Exportar instancia de axios para casos especiales
export { api }