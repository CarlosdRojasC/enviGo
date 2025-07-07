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
  create: (userData) => api.post('/auth/register', userData)
}
// Servicios de pedidos
const orders = {
  getAll: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (orderData) => api.post('/orders', orderData),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  getStats: (params = {}) => api.get('/orders/stats', { params }),
  getTrend: (params = {}) => api.get('/orders/trend', { params }),
  exportForOptiRoute: (params = {}) => api.get('/orders/export', { 
    params,
    responseType: 'blob'
  }),
  assignDriver: (orderId, driverId) => api.post(`/orders/${orderId}/assign-driver`, { driverId }),

}

// Servicios de canales
const channels = {
  getByCompany: (companyId) => api.get(`/companies/${companyId}/channels`),
  getById: (id) => api.get(`/channels/${id}`),
  create: (companyId, channelData) => api.post(`/companies/${companyId}/channels`, channelData),
  update: (id, channelData) => api.put(`/channels/${id}`, channelData),
  delete: (id) => api.delete(`/channels/${id}`),
  syncOrders: (id, syncData) => api.post(`/channels/${id}/sync`, syncData),
  testConnection: (id) => api.post(`/channels/${id}/test`)
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
  getStats: () => api.get('/stats/dashboard')
}

const drivers = {
  create: (driverData) => api.post('/drivers', driverData),
  // MÉTODO MODIFICADO/AÑADIDO
  getAll: () => api.get('/drivers'),
  // El método getByCompany sigue siendo útil si en alguna otra parte un admin
  // necesita ver los conductores de una sola empresa, pero no es necesario para Drivers.vue
  getByCompany: (companyId) => api.get(`/companies/${companyId}/drivers`)
};

// Helper para verificar conectividad
export const checkConnection = async () => {
  try {
    // Usar la URL base sin /api para health check
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const healthURL = baseURL.replace('/api', '/health')
    
    console.log('🔍 Verificando conexión con:', healthURL)
    
    const response = await axios.get(healthURL, { timeout: 5000 })
    console.log('🟢 Conexión con backend exitosa:', response.data)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('🔴 Error de conexión con backend:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    })
    return { 
      success: false, 
      error: error.message,
      details: {
        code: error.code,
        status: error.response?.status,
        url: error.config?.url
      }
    }
  }
}

// Exportar todos los servicios
export const apiService = {
  auth,
  companies,
  orders,
  channels,
  drivers,
  billing,
  dashboard,
  users
}

// Exportar instancia de axios para casos especiales
export { api }