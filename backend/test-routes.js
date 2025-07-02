// backend/test-routes.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testRoutes() {
  console.log('🧪 Probando rutas del backend...\n');

  // 1. Login para obtener token
  let token = '';
  try {
    console.log('🔐 Haciendo login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@liquo.com',
      password: 'admin1234'
    });
    
    token = loginResponse.data.token;
    console.log('✅ Login exitoso');
  } catch (error) {
    console.log('❌ Error en login:', error.response?.data || error.message);
    return;
  }

  // 2. Configurar headers
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 3. Probar rutas específicas de billing
  const routesToTest = [
    { method: 'GET', url: '/billing/invoices', description: 'Obtener facturas' },
    { method: 'GET', url: '/billing/stats', description: 'Estadísticas de facturación' },
    { method: 'GET', url: '/billing/next-estimate', description: 'Estimación próxima factura' },
    { method: 'GET', url: '/billing/invoices/bulk-preview', description: 'Vista previa masiva' },
    { method: 'POST', url: '/billing/invoices/generate', description: 'Generar factura (ESTA ES LA QUE FALLA)' },
    { method: 'POST', url: '/billing/invoices/generate-bulk', description: 'Generar facturas masivas' },
    { method: 'POST', url: '/billing/generate', description: 'Generar facturas mensuales' }
  ];

  for (const route of routesToTest) {
    try {
      if (route.method === 'GET') {
        const response = await axios.get(`${BASE_URL}${route.url}`, { headers });
        console.log(`✅ ${route.method} ${route.url} - ${response.status} (${route.description})`);
      } else if (route.method === 'POST') {
        // Para POST, enviar datos mínimos
        let data = {};
        if (route.url === '/billing/invoices/generate') {
          data = {
            company_id: '675c7702a9731ba753a3ef7e', // ID de ejemplo
            period_start: '2024-01-01',
            period_end: '2024-01-31'
          };
        }
        
        const response = await axios.post(`${BASE_URL}${route.url}`, data, { headers });
        console.log(`✅ ${route.method} ${route.url} - ${response.status} (${route.description})`);
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      
      if (status === 404) {
        console.log(`❌ ${route.method} ${route.url} - 404 RUTA NO ENCONTRADA (${route.description})`);
      } else if (status === 400) {
        console.log(`ℹ️  ${route.method} ${route.url} - 400 Datos incorreos pero ruta existe (${route.description})`);
      } else if (status === 403) {
        console.log(`ℹ️  ${route.method} ${route.url} - 403 Sin permisos pero ruta existe (${route.description})`);
      } else {
        console.log(`❌ ${route.method} ${route.url} - ${status} ${message} (${route.description})`);
      }
    }
  }

  console.log('\n📋 Resumen:');
  console.log('- ❌ 404 = Ruta no existe, verifica routes/index.js');
  console.log('- ℹ️  400/403 = Ruta existe pero hay error en datos/permisos');
  console.log('- ✅ = Ruta funciona correctamente');
}

testRoutes().catch(console.error);