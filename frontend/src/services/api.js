import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',  // Cambia si tu backend está en otro host o puerto
});

// Agrega interceptor para enviar el token en cada request si existe
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
