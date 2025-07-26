<template>
  <div class="manifest-container">
    <!-- HEADER solo visible en pantalla -->
    <div class="manifest-header no-print">
      <h1>📋 Manifiesto de Retiro</h1>
      <div class="header-actions">
        <button @click="goBack" class="back-button">
          ← Volver a Pedidos
        </button>
        <button @click="printManifest" class="print-button">
          🖨️ Imprimir
        </button>
      </div>
    </div>

    <!-- ÁREA A IMPRIMIR (visible también en frontend) -->
    <div id="print-area">
      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>Cargando manifiesto...</p>
      </div>
      
      <div v-if="error" class="error">
        <p>❌ {{ error }}</p>
        <button @click="retry" class="retry-button">Reintentar</button>
      </div>

      <div v-if="manifestData" class="manifest-content">
        <!-- Header del manifiesto para impresión -->
        <div class="print-header">
          <h1>📋 MANIFIESTO DE RETIRO</h1>
          <h2>enviGo Logistics</h2>
        </div>

        <div class="manifest-info">
          <div class="company-details">
            <h3>🏢 {{ manifestData.company.name }}</h3>
            <p>📍 {{ manifestData.company.address || 'Dirección no especificada' }}</p>
            <p v-if="manifestData.company.phone">📞 {{ manifestData.company.phone }}</p>
            <p v-if="manifestData.company.email">📧 {{ manifestData.company.email }}</p>
          </div>
          <div class="manifest-meta">
            <p><strong>📅 Fecha de Emisión:</strong> {{ formatDate(manifestData.generationDate) }}</p>
            <p><strong>📦 Total de Pedidos:</strong> {{ manifestData.total_orders || manifestData.orders.length }}</p>
            <p v-if="manifestData.generated_by"><strong>👤 Generado por:</strong> {{ manifestData.generated_by }}</p>
          </div>
        </div>

        <table class="manifest-table">
          <thead>
            <tr>
              <th>N° Pedido</th>
              <th>Cliente</th>
              <th>Comuna</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Bultos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in manifestData.orders" :key="order._id">
              <td class="order-number">{{ order.order_number }}</td>
              <td>{{ order.customer_name }}</td>
              <td>{{ order.shipping_commune || 'N/A' }}</td>
              <td class="address">{{ order.shipping_address }}</td>
              <td>{{ order.customer_phone || 'N/A' }}</td>
              <td class="packages">{{ order.load1Packages || 1 }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Resumen del manifiesto -->
        <div class="manifest-summary">
          <div class="summary-item">
            <strong>Total de Bultos:</strong> {{ totalPackages }}
          </div>
          <div class="summary-item">
            <strong>Comunas:</strong> {{ uniqueCommunes.join(', ') }}
          </div>
        </div>

        <!-- Sección de firmas -->
        <div class="signature-section">
          <div class="signature-box">
            <p><strong>Nombre de quien retira:</strong></p>
            <div class="line"></div>
          </div>
          <div class="signature-box">
            <p><strong>RUT:</strong></p>
            <div class="line"></div>
          </div>
          <div class="signature-box">
            <p><strong>Firma:</strong></p>
            <div class="line"></div>
          </div>
        </div>

        <!-- Footer para impresión -->
        <div class="print-footer">
          <p>Documento generado automáticamente por enviGo - {{ formatDate(new Date()) }}</p>
          <p>Este manifiesto certifica que los pedidos listados están listos para retiro</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiService } from '../services/api';
import { useToast } from 'vue-toastification';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const manifestData = ref(null);
const isLoading = ref(true);
const error = ref(null);

// ==================== COMPUTED ====================

const totalPackages = computed(() => {
  if (!manifestData.value?.orders) return 0;
  return manifestData.value.orders.reduce((total, order) => {
    return total + (order.load1Packages || 1);
  }, 0);
});

const uniqueCommunes = computed(() => {
  if (!manifestData.value?.orders) return [];
  const communes = manifestData.value.orders
    .map(order => order.shipping_commune)
    .filter(commune => commune && commune !== 'N/A');
  return [...new Set(communes)].sort();
});

// ==================== METHODS ====================

async function loadManifestData() {
  isLoading.value = true;
  error.value = null;

  const ids = route.query.ids;
  if (!ids) {
    error.value = "No se proporcionaron IDs de pedidos.";
    isLoading.value = false;
    return;
  }

  try {
    console.log('📋 Cargando datos del manifiesto para IDs:', ids);
    
    // ✅ CORRECCIÓN: Usar getManifest en lugar de getManifestData
    const response = await apiService.orders.getManifest(ids.split(','));
    
    console.log('✅ Datos del manifiesto cargados:', response.data);
    manifestData.value = response.data;
    
    // Mostrar notificación de éxito
    toast.success(`📋 Manifiesto generado con ${response.data.orders.length} pedidos`);
    
  } catch (err) {
    console.error('❌ Error cargando manifiesto:', err);
    
    if (err.response?.status === 403) {
      error.value = "No tienes permisos para ver este manifiesto.";
    } else if (err.response?.status === 404) {
      error.value = "No se encontraron pedidos para el manifiesto.";
    } else {
      error.value = "Error al cargar los datos del manifiesto.";
    }
    
    toast.error(error.value);
    
  } finally {
    isLoading.value = false;
  }
}

function printManifest() {
  const printContents = document.getElementById('print-area').innerHTML;
  const printWindow = window.open('', '', 'width=800,height=600');

  printWindow.document.write(`
    <html>
      <head>
        <title>Manifiesto de Retiro - ${manifestData.value?.company?.name || 'enviGo'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 14px;
            line-height: 1.4;
            color: #333;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 20px;
          }
          
          .print-header h1 {
            margin: 0;
            color: #4f46e5;
            font-size: 24px;
          }
          
          .print-header h2 {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 18px;
            font-weight: normal;
          }
          
          .manifest-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
            border-bottom: 1px solid #ddd;
            padding-bottom: 1rem;
          }
          
          .company-details h3 {
            margin: 0 0 10px 0;
            color: #4f46e5;
          }
          
          .company-details p {
            margin: 3px 0;
            font-size: 13px;
          }
          
          .manifest-meta p {
            margin: 3px 0;
            font-size: 13px;
          }
          
          .manifest-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
            font-size: 12px;
          }
          
          .manifest-table th, .manifest-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          .manifest-table th {
            background-color: #f8fafc;
            font-weight: bold;
            color: #374151;
          }
          
          .manifest-table tbody tr:nth-child(even) {
            background-color: #f9fafb;
          }
          
          .order-number {
            font-weight: bold;
            color: #4f46e5;
          }
          
          .address {
            font-size: 11px;
            max-width: 200px;
          }
          
          .packages {
            text-align: center;
            font-weight: bold;
          }
          
          .manifest-summary {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 2rem;
            border: 1px solid #e5e7eb;
          }
          
          .summary-item {
            margin: 5px 0;
            font-size: 13px;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-around;
            margin-top: 3rem;
            margin-bottom: 2rem;
          }
          
          .signature-box {
            width: 30%;
            text-align: center;
          }
          
          .signature-box p {
            font-size: 12px;
            margin-bottom: 1rem;
          }
          
          .line {
            border-bottom: 1px solid #000;
            margin-top: 2rem;
            height: 1px;
          }
          
          .print-footer {
            text-align: center;
            font-size: 11px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            margin-top: 2rem;
          }
          
          .print-footer p {
            margin: 3px 0;
          }
          
          .loading, .error {
            display: none;
          }
        </style>
      </head>
      <body>
        ${printContents}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
}

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  return new Date(dateString).toLocaleDateString('es-CL', options);
}

function goBack() {
  router.go(-1); // Volver a la página anterior
}

function retry() {
  loadManifestData();
}

// ==================== LIFECYCLE ====================

onMounted(() => {
  loadManifestData();
});
</script>

<style scoped>
.manifest-container {
  font-family: Arial, sans-serif;
  padding: 2rem;
  max-width: 900px;
  margin: auto;
  background: #fff;
  min-height: 100vh;
}

.manifest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.manifest-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.back-button, .print-button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.back-button {
  background-color: #6b7280;
  color: white;
}

.back-button:hover {
  background-color: #4b5563;
}

.print-button {
  background-color: #10b981;
  color: white;
}

.print-button:hover {
  background-color: #059669;
}

.retry-button {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.loading {
  text-align: center;
  margin-top: 3rem;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  margin-top: 2rem;
  color: #dc2626;
  background: #fef2f2;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.print-header {
  text-align: center;
  margin-bottom: 30px;
  display: none; /* Solo visible en impresión */
}

.manifest-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 1rem;
  gap: 2rem;
}

.company-details h3 {
  margin: 0 0 10px 0;
  color: #1f2937;
  font-size: 20px;
}

.company-details p {
  margin: 5px 0;
  color: #4b5563;
}

.manifest-meta {
  text-align: right;
  min-width: 250px;
}

.manifest-meta p {
  margin: 5px 0;
  color: #374151;
}

.manifest-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.manifest-table th, .manifest-table td {
  border: 1px solid #e5e7eb;
  padding: 12px 8px;
  text-align: left;
}

.manifest-table th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.manifest-table tbody tr:hover {
  background-color: #f9fafb;
}

.order-number {
  font-weight: 600;
  color: #4f46e5;
}

.address {
  font-size: 13px;
  max-width: 200px;
  word-wrap: break-word;
}

.packages {
  text-align: center;
  font-weight: 600;
  color: #059669;
}

.manifest-summary {
  background: #f0f9ff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid #bae6fd;
}

.summary-item {
  margin: 8px 0;
  font-weight: 500;
  color: #0c4a6e;
}

.signature-section {
  display: flex;
  justify-content: space-around;
  margin-top: 3rem;
  gap: 20px;
}

.signature-box {
  flex: 1;
  text-align: center;
  max-width: 200px;
}

.signature-box p {
  font-weight: 500;
  margin-bottom: 1rem;
  color: #374151;
}

.line {
  border-bottom: 2px solid #374151;
  margin-top: 2rem;
  height: 1px;
}

.print-footer {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  padding-top: 15px;
  margin-top: 2rem;
  display: none; /* Solo visible en impresión */
}

/* Media queries para impresión */
@media print {
  .manifest-header {
    display: none !important;
  }
  
  .print-header, .print-footer {
    display: block !important;
  }
  
  .manifest-container {
    padding: 0;
    max-width: none;
  }
  
  .loading, .error {
    display: none !important;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .manifest-container {
    padding: 1rem;
  }
  
  .manifest-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .manifest-info {
    flex-direction: column;
    gap: 1rem;
  }
  
  .manifest-meta {
    text-align: left;
  }
  
  .manifest-table {
    font-size: 12px;
  }
  
  .manifest-table th, .manifest-table td {
    padding: 8px 4px;
  }
  
  .signature-section {
    flex-direction: column;
    gap: 2rem;
  }
  
  .signature-box {
    max-width: none;
  }
}
</style>