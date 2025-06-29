import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30 segundos
});

// Request interceptor para agregar token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor para manejar errores
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // ---- INICIO DE LA CORRECCIÓN ----
    // Si la respuesta de error es un archivo (Blob), lo dejamos pasar
    // para que la lógica del componente se encargue de leerlo.
    if (error.response && error.response.data instanceof Blob) {
      return Promise.reject(error);
    }
    // ---- FIN DE LA CORRECCIÓN ----

    if (error.response) {
      // Error del servidor (Lógica original para errores JSON)
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
          break;
        case 403:
          console.error('Acceso denegado:', data.error);
          break;
        case 404:
          console.error('Recurso no encontrado:', data.error);
          break;
        case 429:
          console.error('Demasiadas peticiones, intenta más tarde');
          break;
        case 500:
          console.error('Error del servidor:', data.error);
          break;
        default:
          console.error('Error:', data.error || 'Error desconocido');
      }
      
      // Crear error personalizado con mensaje
      const customError = new Error(data.error || 'Error en la petición');
      customError.response = error.response; // Adjuntar la respuesta para más detalles si es necesario
      return Promise.reject(customError);

    } else if (error.request) {
      // Error de red
      console.error('Error de conexión:', error.message);
      return Promise.reject(new Error('Error de conexión. Verifica tu internet.'));
    } else {
      // Error en la configuración de la petición
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

// Métodos de conveniencia
export const apiService = {
  // Autenticación
  auth: {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/profile'),
    changePassword: (passwords) => api.post('/auth/change-password', passwords),
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Dashboard y estadísticas
  dashboard: {
    getStats: () => api.get('/stats/dashboard'),
    getCompanyStats: (companyId, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/companies/${companyId}/stats?${queryString}`);
    }
  },

  // Empresas
  companies: {
    getAll: () => api.get('/companies'),
    getById: (id) => api.get(`/companies/${id}`),
    create: (data) => api.post('/companies', data),
    update: (id, data) => api.put(`/companies/${id}`, data),
    updatePrice: (id, price) => api.patch(`/companies/${id}/price`, { price_per_order: price }),
    getUsers: (id) => api.get(`/companies/${id}/users`),
    getStats: (id, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/companies/${id}/stats?${queryString}`);
    }
  },

  // Canales de venta
  channels: {
    getByCompany: (companyId) => api.get(`/companies/${companyId}/channels`),
    getById: (id) => api.get(`/channels/${id}`),
    create: (companyId, data) => api.post(`/companies/${companyId}/channels`, data),
    update: (id, data) => api.put(`/channels/${id}`, data),
    delete: (id) => api.delete(`/channels/${id}`),
    sync: (id, params = {}) => api.post(`/channels/${id}/sync`, params),
    testConnection: (id) => api.post(`/channels/${id}/test`)
  },
  // Facturación
     // Obtener facturas con filtros
  getInvoices: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/billing/invoices${queryString ? `?${queryString}` : ''}`);
  },

  // Descargar PDF de factura
  downloadInvoice: (invoiceId) => {
    return api.get(`/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob', // Importante para PDFs
      headers: {
        'Accept': 'application/pdf'
      }
    });
  },

  // Marcar factura como pagada (admin)
  markAsPaid: (invoiceId) => {
    return api.post(`/billing/invoices/${invoiceId}/mark-as-paid`);
  },

  // Obtener estadísticas de facturación
  getBillingStats: (companyId = null) => {
    const params = companyId ? { company_id: companyId } : {};
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/billing/stats${queryString ? `?${queryString}` : ''}`);
  },

  // Obtener estimación de próxima factura
  getNextInvoiceEstimate: () => {
    return api.get('/billing/next-invoice-estimate');
  },

  // Generar facturas manualmente (admin)
  generateManualInvoices: () => {
    return api.post('/billing/generate-manual');
  },

  // Para futuras funcionalidades
  requestInvoice: (requestData) => {
    return api.post('/billing/request-invoice', requestData);
  },

  reportPayment: (paymentData) => {
    return api.post('/billing/report-payment', paymentData);
  },

  // Funcionalidades masivas para admin
  bulkSendInvoices: (invoiceIds) => {
    return api.post('/billing/bulk-send', { invoice_ids: invoiceIds });
  },

  bulkMarkAsPaid: (invoiceIds) => {
    return api.post('/billing/bulk-mark-paid', { invoice_ids: invoiceIds });
  },

  bulkDownload: (invoiceIds) => {
    return api.post('/billing/bulk-download', { invoice_ids: invoiceIds }, {
      responseType: 'blob'
    });
  },
  // Pedidos
  orders: {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/orders?${queryString}`);
    },
    getById: (id) => api.get(`/orders/${id}`),
    getOrdersTrend: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/orders/trend?${queryString}`);
    },
    create: (data) => api.post('/orders', data),
    updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
    getStats: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/orders/stats?${queryString}`);
    },
    export: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return api.get(`/orders/export?${queryString}`, { responseType: 'blob' });
    }
  },

  // Usuarios
  users: {
    getByCompany: (companyId) => api.get(`/companies/${companyId}/users`),
    create: (userData) => api.post('/users', userData), // La ruta ahora es /users
    update: (id, data) => api.patch(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`)
  }
};

export default api;