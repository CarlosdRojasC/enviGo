// frontend/src/services/api.js
import axios from 'axios'

// Configuración base de axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
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
 login: (email, password, remember_me = false) => 
    api.post('/auth/login', { email, password, remember_me }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  getProfile: () => 
    api.get('/auth/profile'),
  
  changePassword: (passwordData) => 
    api.post('/auth/change-password', passwordData),
  
  // NUEVOS MÉTODOS PARA PASSWORD RESET
  requestPasswordReset: (email) => 
    api.post('/auth/request-password-reset', { email }),

  validateResetToken: (token) =>
    api.get(`/auth/reset-password/validate/${token}`),
  
  resetPassword: (token, newPassword) => 
    api.post('/auth/reset-password', { token, new_password: newPassword }),
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  getSettings: () => api.get('/auth/settings'),
  updateSettings: (settingsData) => api.put('/auth/settings', settingsData),
getActiveSessions: () => api.get('/sessions/active'),
  getSessionStats: () => api.get('/sessions/stats'),
  terminateSession: (sessionId) => api.delete(`/sessions/${sessionId}`),
  terminateAllSessions: () => api.post('/sessions/terminate-all')
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
    // Obtener usuarios de la empresa
  getCompanyUsers: (params = {}) => 
    api.get('/users/company', { params }),
  
  // Crear nuevo usuario
  create: (userData) => 
    api.post('/users', userData),
  
  // Actualizar usuario
  update: (userId, userData) => 
    api.put(`/users/${userId}`, userData),
  
  // Cambiar estado activo/inactivo
  toggleStatus: (userId) => 
    api.patch(`/users/${userId}/toggle-status`),
  
  // Restablecer contraseña de usuario
  resetPassword: (userId) => 
    api.post(`/users/${userId}/reset-password`),
  
  // Desbloquear usuario
  unlock: (userId) => 
    api.post(`/users/${userId}/unlock`),
  
  // Eliminar usuario
  delete: (userId) => 
    api.delete(`/users/${userId}`)

}

// Servicios de pedidos
const orders = {
  getAll: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (orderData) => api.post('/orders', orderData),
  remove: (orderId) => api.delete(`/orders/${orderId}`),
  bulkUpdateStatus: (data) => api.post('/orders/bulk-actions/status', data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  markAsReady: (id) => api.patch(`/orders/${id}/ready`),
  getStats: (params = {}) => api.get('/orders/stats', { params }),
  getManifestData: (orderIds) => api.post('/orders/manifest', { orderIds }),
  getTrend: (params = {}) => api.get('/orders/trend', { params }),
  debugShipday: (orderId) => api.get(`/orders/${orderId}/debug-shipday`),
  getAvailableCommunes: (params = {}) => api.get('/orders/communes', { params }),
  exportOrders: (filters = {}) => {
    console.log('📤 API: Exportando pedidos con filtros:', filters);
    return api.get('/orders/export', { 
      params: filters,
      responseType: 'blob' // Importante para descargar archivos
    });
  },
   // 🆕 Nueva función para exportación de dashboard
  exportForDashboard: (params = {}) => api.get('/orders/export-dashboard', { 
    params,
    responseType: 'blob'
  }),
  
  // ✅ Función genérica que ahora usará dashboard por defecto
  export: (params = {}) => api.get('/orders/export-dashboard', { 
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
getManifestData: function(orderIds) {
    console.warn('⚠️ getManifestData está deprecado, usar getManifest');
    return this.getManifest(orderIds);
  },
markMultipleAsReady: async (orderIds) => {
    try {
      console.log('📦 API: Marcando pedidos como listos:', orderIds);
      
      const response = await api.post('/orders/bulk-ready', { 
        orderIds 
      });
      
      console.log('✅ API: Respuesta del servidor:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ API: Error marcando pedidos como listos:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.error || error.message,
        details: error.response?.data?.details,
        orderIds
      });
      throw error;
    }
  },
  downloadLabel: (externalOrderId) => {
    console.log('🏷️ API: Descargando etiqueta para orden externa:', externalOrderId);
    return api.get(`/orders/${externalOrderId}/label`, {
      responseType: 'blob'
    });
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
  },
  customerBulkUpload: (formData) => api.post('/orders/customer-bulk-upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  timeout: 60000
}),

downloadCustomerTemplate: () => api.get('/orders/customer-template', {
  responseType: 'blob'
}),
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
    syncWithCommunes: (channelId, data) => api.post(`/channels/${channelId}/sync-with-communes`, data),
    getChannels: (companyId) => {
    console.log('🏢 API: Obteniendo canales para empresa:', companyId);
    return api.get(`/companies/${companyId}/channels`);
  }
}
const collections =  {
  request: (data) => api.post('/collections/request', data),
  getRequests: () => api.get('/collections/requests')
}
const mercadolibre = {
  getAuthorizationUrl: (data) => api.post('/channels/mercadolibre/auth-url', data)
}

const jumpseller = {
  getAuthorizationUrl: (data) => api.post('/channels/jumpseller/auth-url', data)
}
const notifications = {
  /**
   * Obtener todas las notificaciones con paginación
   * @param {object} params - Parámetros como page, limit, include_read
   * @returns {Promise}
   */
  getAll: (params = {}) => api.get('/notifications', { params }),

  /**
   * Marcar una notificación como leída
   * @param {string} id - ID de la notificación
   * @returns {Promise}
   */
  markAsRead: (id) => api.post(`/notifications/${id}/read`),

  /**
   * Marcar todas las notificaciones como leídas
   * @returns {Promise}
   */
  markAllAsRead: () => api.post('/notifications/mark-all-read')
};

// Servicios de facturación
const billing = {
  // Obtener resumen financiero para admin dashboard
   getFinancialSummary: () => {
    return api.get('/billing/financial-summary', {
      timeout: 45000 // 45 segundos para summary financiero
    });
  },
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
  sendInvoice: async (invoiceId) => {
  try {
    console.log('📤 API: Enviando factura:', invoiceId);
    const response = await api.post(`/billing/invoices/${invoiceId}/send`);
    console.log('✅ API: Factura enviada exitosamente');
    return response;
  } catch (error) {
    console.error('❌ API: Error enviando factura:', error);
    throw error;
  }
},
  
  // Descargar factura
  downloadInvoice: (invoiceId) => api.get(`/billing/invoices/${invoiceId}/download`, {
    responseType: 'blob'
  }),
  
  // Eliminar facturas
  deleteInvoice: async (invoiceId) => {
  try {
    console.log('🗑️ API: Eliminando factura:', invoiceId);
    const response = await api.delete(`/billing/invoices/${invoiceId}`);
    console.log('✅ API: Factura eliminada exitosamente');
    return response;
  } catch (error) {
    console.error('❌ API: Error eliminando factura:', error);
    throw error;
  }
},
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
  requestConfirmation: async (invoiceId) => {
  try {
    console.log('💸 API: Solicitando confirmación de pago:', invoiceId);
    const response = await api.put(`/billing/invoices/${invoiceId}/request-confirmation`);
    console.log('✅ API: Confirmación solicitada exitosamente');
    return response;
  } catch (error) {
    console.error('❌ API: Error solicitando confirmación:', error);
    throw error;
  }
},
 confirmPayment: async (invoiceId) => {
  try {
    console.log('✅ API: Confirmando pago como admin:', invoiceId);
    const response = await api.put(`/billing/invoices/${invoiceId}/confirm-payment`);
    console.log('✅ API: Pago confirmado exitosamente');
    return response;
  } catch (error) {
    console.error('❌ API: Error confirmando pago:', error);
    throw error;
  }
},


  // ✅ Obtener pedidos facturables (solo delivered, no facturados)
getInvoiceableOrders: (filters = {}) => {
  console.log('📦 API: Obteniendo pedidos facturables con filtros:', filters);
  return api.get('/billing/invoiceable-orders', {
    params: filters,
    timeout: 30000
  });
},

// ✅ Generar factura con flujo mejorado (complementa generateInvoice existente)
  generateInvoiceImproved: (invoiceData) => {
    console.log('📤 API: Generando factura mejorada:', invoiceData);
    return api.post('/billing/invoices/generate-improved', invoiceData, {
      timeout: 60000 // 60 segundos para generación de factura
    });
  },

// ✅ Revertir facturación (volver pedidos de invoiced a delivered)
revertInvoicing: (invoiceId) => {
  console.log('🔄 API: Revirtiendo facturación:', invoiceId);
  return api.post(`/billing/invoices/${invoiceId}/revert`);
},

// ✅ Obtener estadísticas completas del dashboard
getDashboardStats: (companyId) => {
    console.log('📊 API: Obteniendo estadísticas del dashboard para:', companyId);
    return api.get(`/billing/dashboard-stats/${companyId}`, {
      timeout: 45000 // 45 segundos para estadísticas complejas
    });
  },

// ✅ Obtener estadísticas del usuario actual (sin especificar empresa)
getMyDashboardStats: () => {
  return api.get('/billing/my-dashboard-stats');
},

// ✅ Obtener resumen rápido de facturación
  getQuickSummary: (companyId = null) => {
    const params = companyId ? `?company_id=${companyId}` : '';
    return api.get(`/billing/quick-summary${params}`, {
      timeout: 15000 // 15 segundos para resumen rápido
    });
  },
// ==================== MÉTODOS AUXILIARES ÚTILES ====================

// ✅ Verificar si un pedido puede ser facturado
canOrderBeInvoiced: (order) => {
  return order.status === 'delivered' && 
         order.billing_status?.is_billable === true && 
         !order.invoice_id;
},

// ✅ Obtener estado de facturación de un pedido
getOrderBillingStatus: (order) => {
  if (order.status === 'invoiced') {
    return {
      status: 'invoiced',
      message: 'Pedido facturado',
      billed_at: order.billing_status?.billed_at,
      invoice_id: order.invoice_id
    };
  }
  
  if (order.status === 'delivered' && order.billing_status?.is_billable) {
    return {
      status: 'billable',
      message: 'Listo para facturar',
      delivered_at: order.delivery_date
    };
  }
  
  return {
    status: 'not_billable',
    message: 'No se puede facturar aún',
    current_status: order.status
  };
},

// ✅ Formatear datos para facturación
prepareInvoiceData: (companyId, orderIds, periodStart, periodEnd) => {
  return {
    company_id: companyId,
    order_ids: orderIds,
    period_start: periodStart,
    period_end: periodEnd,
    type: 'invoice'
  };
},
validateInvoiceData: (invoiceData) => {
  const errors = [];
  
  if (!invoiceData.company_id) {
    errors.push('ID de empresa es requerido');
  }
  
  if (!invoiceData.order_ids || invoiceData.order_ids.length === 0) {
    errors.push('Se requiere al menos un pedido');
  }
  
  if (!invoiceData.period_start || !invoiceData.period_end) {
    errors.push('Período de facturación es requerido');
  }
  
  if (new Date(invoiceData.period_start) > new Date(invoiceData.period_end)) {
    errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
},

// ✅ Calcular totales estimados
calculateEstimatedTotals: (orders, pricePerOrder = 0) => {
  const subtotal = orders.reduce((sum, order) => sum + (order.shipping_cost || pricePerOrder), 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;
  
  return {
    order_count: orders.length,
    subtotal,
    iva,
    total,
    average_per_order: orders.length > 0 ? Math.round(subtotal / orders.length) : 0
  };
}
}

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
  
  getAvailable: () => api.get('/drivers'), // Reutilizamos la ruta existente

  // Crear conductor en tu BD local
  create: (driverData) => api.post('/drivers', driverData),
  
  // Eliminar conductor
  delete: (driverId) => api.delete(`/drivers/${driverId}`),
  
  // Obtener conductores por empresa (si necesitas)
  getByCompany: (companyId) => api.get(`/companies/${companyId}/drivers`),
  
syncWithShipday: () => api.post('/drivers/sync-with-shipday'),

getDeliveredOrders: (params) => {
      console.log('📦 API: Obteniendo pedidos entregados para pagos');
      return api.get('/drivers/delivered-orders', { params });
    },
    
    // NUEVO: Generar reporte de pagos
    getPaymentReport: (params) => {
      console.log('📊 API: Generando reporte de pagos');
      return api.get('/drivers/payment-report', { params });
    },
    
    // NUEVO: Exportar pagos a Excel
    exportPaymentsToExcel: (params) => {
      console.log('📊 API: Exportando pagos a Excel');
      return api.get('/drivers/payment-report', { 
        params: { ...params, format: 'excel' },
        responseType: 'blob' // Importante para descargar archivos
      });
    }
    
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
const search = {
  /**
   * Realiza una búsqueda global en la aplicación
   * @param {string} query - El término de búsqueda
   * @returns {Promise}
   */
  global: (query) => api.get('/search/global', { params: { q: query } })
};
const manifests = {
  // Crear manifiesto
  create: (orderIds) => {
    console.log('📋 API: Creando manifiesto para:', orderIds);
    return api.post('/manifests', { orderIds });
  },
  
  // Listar manifiestos
  getAll: (params = {}) => {
    console.log('📋 API: Obteniendo lista de manifiestos');
    return api.get('/manifests', { params });
  },
  
  // Obtener manifiesto específico
  getById: (id) => {
    console.log('📋 API: Obteniendo manifiesto:', id);
    return api.get(`/manifests/${id}`);
  },
  
  // Generar PDF
  downloadPDF: (id) => {
    console.log('📄 API: Descargando PDF del manifiesto:', id);
    return api.get(`/manifests/${id}/pdf`, { responseType: 'blob' });
  },
  
  // Actualizar estado
  updateStatus: (id, status, pickupInfo = null) => {
    console.log('📋 API: Actualizando estado del manifiesto:', id, 'a', status);
    return api.patch(`/manifests/${id}/status`, { 
      status, 
      pickup_info: pickupInfo 
    });
  }
};
const labels = {
  generateBulk: (orderIds) => {
    console.log('🏷️ API: Generando etiquetas masivas para:', orderIds);
    return api.post('/labels/generate-bulk', { orderIds });
  },
  
  generateCode: (orderId) => {
    console.log('🏷️ API: Generando código para pedido:', orderId);
    return api.post(`/labels/generate/${orderId}`);
  },
  
  markPrinted: (orderId) => {
    console.log('🖨️ API: Marcando etiqueta como impresa:', orderId);
    return api.post(`/labels/mark-printed/${orderId}`);
  },
  
  getStats: (companyId = null) => {
    const params = companyId ? `?company_id=${companyId}` : '';
    console.log('📊 API: Obteniendo estadísticas de etiquetas');
    return api.get(`/labels/stats${params}`);
  },
  
  findByCode: (code) => {
    console.log('🔍 API: Buscando pedido por código:', code);
    return api.get(`/labels/find/${code}`);
  },
  printLabelPDF: (orderId) => {
    console.log('📄 API: Solicitando PDF para la etiqueta del pedido:', orderId);
    // La configuración 'responseType: blob' es crucial para que funcione
    return api.post(`/labels/print-pdf/${orderId}`, {}, {
      responseType: 'blob',
    });
  },
   printBulkLabelsPDF: (orderIds) => {
    console.log(`📄 API: Solicitando PDF masivo para ${orderIds.length} etiquetas.`);
    return api.post('/labels/print-bulk-pdf', { orderIds }, { // Envía los IDs en el cuerpo
      responseType: 'blob',
    });
  }
}
const pickups = {
  // Obtener todos los retiros (con filtros opcionales)
  getAll: (params = {}) => {
    console.log('API: Obteniendo todas las rutas de retiro', params);
    return api.get('/pickups', { params });
  },

  // Obtener un retiro por su ID
  getById: (id) => {
    console.log('API: Obteniendo retiro por ID:', id);
    return api.get(`/pickups/${id}`);
  },

  // Asignar un conductor a un retiro
  assignDriver: (pickupId, driverId) => {
    console.log(`API: Asignando conductor ${driverId} a retiro ${pickupId}`);
    return api.patch(`/pickups/${pickupId}/assign`, { driver_id: driverId });
  },

  // Actualizar el estado de un retiro
  updateStatus: (pickupId, status) => {
    console.log(`API: Actualizando estado de retiro ${pickupId} a ${status}`);
    return api.patch(`/pickups/${pickupId}/status`, { status });
  }
};

const scanner = {
  // Obtener clientes disponibles para scanner
  getClients: () => api.get('/driver-scanner/public-clients'),
  
  // Procesar código ML
  processMLBarcode: (formData) => api.post('/driver-scanner/process-ml-barcode', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Finalizar sesión
  finalizeSession: (sessionData) => api.post('/driver-scanner/finalize-session', sessionData),
  
  // Stats ML para dashboard
  getMLStats: (companyId = null) => {
    const endpoint = companyId ? `/driver-scanner/stats/${companyId}` : '/driver-scanner/stats'
    return api.get(endpoint)
  }
}
const contact = {
  send: (contactData) => api.post('/contact', contactData)
}
const routes = {
  // Optimizar una nueva ruta
  optimize: (routeData) => {
    console.log('🛣️ API: Optimizando ruta con Google Maps');
    return api.post('/routes/optimize', routeData);
  },

  // Obtener todas las rutas de la empresa
  getAll: (params = {}) => {
    console.log('📋 API: Obteniendo rutas de la empresa');
    return api.get('/routes', { params });
  },

  // Obtener una ruta específica
  getById: (id) => {
    console.log(`🛣️ API: Obteniendo ruta ${id}`);
    return api.get(`/routes/${id}`);
  },

  // Asignar ruta a conductor
  assign: (routeId, driverId) => {
    console.log(`👤 API: Asignando ruta ${routeId} a conductor ${driverId}`);
    return api.patch(`/routes/${routeId}/assign`, { driverId });
  },

  // Iniciar ruta (solo para conductores)
  startRoute: (routeId) => {
    console.log(`🚀 API: Iniciando ruta ${routeId}`);
    return api.patch(`/routes/${routeId}/start`);
  },

  // Obtener ruta activa del conductor
  getActiveRoute: () => {
    console.log('🎯 API: Obteniendo ruta activa del conductor');
    return api.get('/routes/driver/active');
  },

  // Actualizar estado de entrega de un pedido
  updateOrderStatus: (routeId, orderId, status, deliveryProof = null) => {
    console.log(`📦 API: Actualizando estado de entrega ${orderId} a ${status}`);
    return api.patch(`/routes/${routeId}/orders/${orderId}/status`, {
      status,
      deliveryProof
    });
  },

  // Sincronizar actualizaciones offline
  syncOfflineUpdates: (routeId, updates) => {
    console.log(`🔄 API: Sincronizando ${updates.length} actualizaciones offline`);
    return api.post(`/routes/${routeId}/sync-offline`, { updates });
  },

  // Eliminar ruta (solo drafts)
  delete: (routeId) => {
    console.log(`🗑️ API: Eliminando ruta ${routeId}`);
    return api.delete(`/routes/${routeId}`);
  },

  // Obtener estadísticas de rutas
  getStats: (params = {}) => {
    console.log('📊 API: Obteniendo estadísticas de rutas');
    return api.get('/routes/stats/summary', { params });
  },

  // Obtener historial de rutas de un conductor
  getDriverHistory: (driverId, params = {}) => {
    console.log(`📚 API: Obteniendo historial de rutas del conductor ${driverId}`);
    return api.get('/routes', { 
      params: { 
        ...params, 
        driverId 
      } 
    });
  },

  // Duplicar ruta
  duplicate: (routeId, newDriverId = null) => {
    console.log(`📋 API: Duplicando ruta ${routeId}`);
    return api.post(`/routes/${routeId}/duplicate`, {
      driverId: newDriverId
    });
  },

  // Re-optimizar ruta existente
  reoptimize: (routeId, preferences = {}) => {
    console.log(`🔄 API: Re-optimizando ruta ${routeId}`);
    return api.patch(`/routes/${routeId}/reoptimize`, { preferences });
  },

  // Operaciones masivas
  bulkAssign: (routeIds, driverId) => {
    console.log(`👥 API: Asignación masiva de ${routeIds.length} rutas`);
    return api.post('/routes/bulk/assign', {
      routeIds,
      driverId
    });
  },

  bulkUpdateStatus: (routeIds, status) => {
    console.log(`📝 API: Actualización masiva de estado a ${status}`);
    return api.post('/routes/bulk/status', {
      routeIds,
      status
    });
  }
};
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
  scanner,
  users,
  shipday,
  notifications,
  search,
  manifests,
  mercadolibre,
  jumpseller,
  labels,
  pickups,
  collections,
  contact,
  routes
}

// Exportar instancia de axios para casos especiales
export { api }