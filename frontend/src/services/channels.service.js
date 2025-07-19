import axios from 'axios'

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
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      console.warn('Token expirado, el usuario debe hacer login nuevamente')
    }
    
    return Promise.reject(error)
  }
)

// Servicio específico para canales
export const channelsService = {
  // Para usuarios normales
  getByCompany: (companyId) => api.get(`/companies/${companyId}/channels`),
  
  // Para admin - ver todos los canales
  getAllForAdmin: () => api.get('/channels/admin/all'),
  
  // CRUD básico
  getById: (id) => api.get(`/channels/${id}`),
  create: (companyId, channelData) => api.post(`/companies/${companyId}/channels`, channelData),
  update: (id, channelData) => api.put(`/channels/${id}`, channelData),
  delete: (id) => api.delete(`/channels/${id}`),
  
  // Sincronización
  sync: (id, syncData) => api.post(`/channels/${id}/sync`, syncData),
  
  // Test de conexión
  testConnection: (connectionData) => api.post('/channels/test-connection', connectionData),
  
  // Logs y estadísticas (para funcionalidades futuras)
  getSyncLogs: (id, params = {}) => api.get(`/channels/${id}/sync-logs`, { params }),
  getStats: (id) => api.get(`/channels/${id}/stats`),
  getActivity: (id, params = {}) => api.get(`/channels/${id}/activity`, { params })
}

export default channelsService