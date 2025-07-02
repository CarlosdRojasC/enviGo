// backend/test-endpoints.js
// Script para probar que los endpoints de billing funcionen

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Token de prueba - reemplaza con un token válido
const TEST_TOKEN = 'tu_token_jwt_aqui';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testEndpoints() {
  console.log('🧪 Probando endpoints del backend...\n');

  // 1. Health check
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health check:', response.data);
  } catch (error) {
    console.log('❌ Health check falló:', error.message);
    return;
  }

  // 2. Test billing endpoints sin autenticación
  console.log('\n📋 Probando endpoints de billing...');

  // Test GET /billing/invoices (sin token para ver el error específico)
  try {
    const response = await axios.get(`${BASE_URL}/billing/invoices`);
    console.log('✅ GET /billing/invoices (sin token):', response.status);
  } catch (error) {
    if (error.response) {
      console.log(`ℹ️  GET /billing/invoices (sin token): ${error.response.status} - ${error.response.data?.error || 'Error desconocido'}`);
    } else {
      console.log('❌ GET /billing/invoices (sin token) - Error de conexión:', error.message);
    }
  }

  // Si tienes un token válido, descomenta esto:
  /*
  try {
    const response = await api.get('/billing/invoices');
    console.log('✅ GET /billing/invoices (con token):', response.data);
  } catch (error) {
    console.log('❌ GET /billing/invoices (con token):', error.response?.data || error.message);
  }
  */

  // 3. Test other endpoints
  const endpoints = [
    '/companies',
    '/orders',
    '/stats/dashboard'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`);
      console.log(`✅ GET ${endpoint}: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`ℹ️  GET ${endpoint}: ${error.response.status} - ${error.response.data?.error || 'Error de autenticación'}`);
      } else {
        console.log(`❌ GET ${endpoint} - Error de conexión:`, error.message);
      }
    }
  }

  console.log('\n📋 Resumen:');
  console.log('- Si ves "Error de conexión", el backend no está ejecutándose');
  console.log('- Si ves "401" o "No autorizado", el backend funciona pero necesitas login');
  console.log('- Si ves "404", la ruta no existe');
  console.log('- Si ves "200", todo funciona correctamente');
}

// Ejecutar tests
testEndpoints().catch(console.error);