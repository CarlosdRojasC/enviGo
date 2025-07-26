<template>
  <div class="manifest-container">
    <!-- HEADER solo visible en pantalla -->
    <div class="manifest-header no-print">
      <h1>📋 Manifiesto de Retiro</h1>
      <div class="header-actions">
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
        <button @click="printManifest" class="print-button" :disabled="!manifestData">
          🖨️ Imprimir
        </button>
        <button 
          v-if="manifestData && manifestData.status !== 'picked_up'" 
          @click="markAsPickedUp" 
          class="pickup-button"
        >
          ✅ Marcar como Retirado
        </button>
      </div>
    </div>

    <!-- ÁREA A IMPRIMIR -->
    <div id="print-area">
      <!-- Loading -->
      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>Cargando manifiesto...</p>
      </div>
      
      <!-- Error -->
      <div v-if="error" class="error">
        <p>❌ {{ error }}</p>
        <button @click="retry" class="retry-button">Reintentar</button>
      </div>

      <!-- Contenido del manifiesto -->
      <div v-if="manifestData" class="manifest-content">
        <!-- Header para impresión -->
        <div class="print-header">
          <h1>📋 MANIFIESTO DE RETIRO</h1>
          <h2>enviGo Logistics</h2>
        </div>

        <!-- Información del manifiesto -->
        <div class="manifest-info">
          <div class="company-details">
            <h3>🏢 {{ getCompanyName() }}</h3>
            <p>📍 {{ getCompanyAddress() }}</p>
            <p v-if="getCompanyPhone()">📞 {{ getCompanyPhone() }}</p>
            <p v-if="getCompanyEmail()">📧 {{ getCompanyEmail() }}</p>
          </div>
          <div class="manifest-meta">
            <p><strong>📋 N° Manifiesto:</strong> {{ getManifestNumber() }}</p>
            <p><strong>📅 Fecha:</strong> {{ formatDate(manifestData.generated_at || manifestData.generationDate) }}</p>
            <p><strong>📦 Total Pedidos:</strong> {{ getTotalOrders() }}</p>
            <p><strong>📦 Total Bultos:</strong> {{ totalPackages }}</p>
            <p><strong>👤 Generado por:</strong> {{ getGeneratedBy() }}</p>
            <p v-if="manifestData.communes && manifestData.communes.length > 0">
              <strong>🏘️ Comunas:</strong> {{ manifestData.communes.join(', ') }}
            </p>
          </div>
        </div>

        <!-- Estado del manifiesto -->
        <div v-if="manifestData.status" class="manifest-status">
          <span :class="['status-badge', `status-${manifestData.status}`]">
            {{ getStatusLabel(manifestData.status) }}
          </span>
          <span v-if="manifestData.picked_up_at" class="pickup-date">
            Retirado el {{ formatDate(manifestData.picked_up_at) }}
          </span>
        </div>

        <!-- Tabla de pedidos -->
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
            <tr v-for="order in getOrdersData()" :key="order._id || order.id || order.order_number">
              <td class="order-number">{{ order.order_number }}</td>
              <td>{{ order.customer_name }}</td>
              <td>{{ order.shipping_commune || 'N/A' }}</td>
              <td class="address">{{ order.shipping_address }}</td>
              <td>{{ order.customer_phone || 'N/A' }}</td>
              <td class="packages">{{ order.load1Packages || order.packages || 1 }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Resumen del manifiesto -->
        <div class="manifest-summary">
          <div class="summary-item">
            <strong>Total de Bultos:</strong> {{ totalPackages }}
          </div>
          <div class="summary-item">
            <strong>Comunas incluidas:</strong> {{ uniqueCommunes.join(', ') || 'N/A' }}
          </div>
          <div v-if="manifestData.status" class="summary-item">
            <strong>Estado:</strong> {{ getStatusLabel(manifestData.status) }}
          </div>
        </div>

        <!-- Información de retiro (si está retirado) -->
        <div v-if="manifestData.pickup_info" class="pickup-info">
          <h4>✅ Información de Retiro</h4>
          <div class="pickup-details">
            <p><strong>Retirado por:</strong> {{ manifestData.pickup_info.person_name }}</p>
            <p><strong>RUT:</strong> {{ manifestData.pickup_info.person_rut }}</p>
            <p v-if="manifestData.pickup_info.pickup_notes">
              <strong>Observaciones:</strong> {{ manifestData.pickup_info.pickup_notes }}
            </p>
            <p><strong>Fecha y hora:</strong> {{ formatDate(manifestData.picked_up_at) }}</p>
          </div>
        </div>

        <!-- Sección de firmas (solo si no está retirado) -->
        <div v-if="!manifestData.status || manifestData.status !== 'picked_up'" class="signature-section">
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
          <p>
            Manifiesto N° {{ getManifestNumber() }} - 
            Este documento certifica que los pedidos listados están listos para retiro
          </p>
        </div>
      </div>
    </div>

    <!-- Modal de marcar como retirado -->
    <Modal v-model="showPickupModal" title="✅ Marcar como Retirado" width="500px">
      <div class="pickup-form">
        <p>Manifiesto: <strong>{{ getManifestNumber() }}</strong></p>
        
        <div class="form-group">
          <label>Nombre de quien retira *</label>
          <input 
            type="text" 
            v-model="pickupForm.person_name" 
            placeholder="Nombre completo"
            required
          >
        </div>
        
        <div class="form-group">
          <label>RUT *</label>
          <input 
            type="text" 
            v-model="pickupForm.person_rut" 
            placeholder="12.345.678-9"
            required
          >
        </div>
        
        <div class="form-group">
          <label>Observaciones del retiro</label>
          <textarea 
            v-model="pickupForm.pickup_notes" 
            placeholder="Notas adicionales sobre el retiro..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="modal-actions">
          <button @click="showPickupModal = false" class="btn-modal cancel">
            Cancelar
          </button>
          <button 
            @click="confirmPickup" 
            class="btn-modal confirm" 
            :disabled="!pickupForm.person_name || !pickupForm.person_rut"
          >
            ✅ Confirmar Retiro
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiService } from '../services/api';
import { useToast } from 'vue-toastification';
import Modal from '../components/Modal.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// ==================== STATE ====================
const manifestData = ref(null);
const isLoading = ref(true);
const error = ref(null);
const showPickupModal = ref(false);

// Formulario de retiro
const pickupForm = ref({
  person_name: '',
  person_rut: '',
  pickup_notes: ''
});

// ==================== COMPUTED ====================
const totalPackages = computed(() => {
  const orders = getOrdersData();
  return orders.reduce((total, order) => {
    return total + (order.load1Packages || order.packages || 1);
  }, 0);
});

const uniqueCommunes = computed(() => {
  const orders = getOrdersData();
  const communes = orders
    .map(order => order.shipping_commune)
    .filter(commune => commune && commune !== 'N/A');
  return [...new Set(communes)].sort();
});

// ==================== METHODS ====================

/**
 * Cargar datos del manifiesto
 */
async function loadManifestData() {
  isLoading.value = true;
  error.value = null;

  try {
    // Determinar si es por ID del manifiesto o IDs de órdenes (legacy)
    const manifestId = route.params.id;
    const orderIds = route.query.ids;

    if (manifestId) {
      // NUEVO: Cargar manifiesto guardado por ID
      console.log('📋 Cargando manifiesto guardado:', manifestId);
      
      const response = await apiService.manifests.getById(manifestId);
      manifestData.value = response.data;
      
      console.log('✅ Manifiesto cargado:', manifestData.value);
      
    } else if (orderIds) {
      // LEGACY: Generar manifiesto temporal desde IDs de órdenes
      console.log('📋 Generando manifiesto temporal para IDs:', orderIds);
      
      const response = await apiService.orders.getManifest(orderIds.split(','));
      
      // Convertir formato legacy a nuevo formato
      manifestData.value = {
        manifest_number: `TEMP-${Date.now()}`,
        status: 'generated',
        generated_at: new Date().toISOString(),
        total_orders: response.data.orders.length,
        total_packages: response.data.orders.reduce((sum, o) => sum + (o.load1Packages || 1), 0),
        communes: [...new Set(response.data.orders.map(o => o.shipping_commune).filter(Boolean))],
        company_id: response.data.company,
        manifest_data: response.data,
        generated_by: { full_name: response.data.generated_by || 'Sistema' }
      };
      
      console.log('✅ Manifiesto temporal creado:', manifestData.value);
      
    } else {
      throw new Error('No se proporcionó ID de manifiesto ni IDs de pedidos');
    }
    
    toast.success(`📋 Manifiesto cargado: ${getManifestNumber()}`);
    
  } catch (err) {
    console.error('❌ Error cargando manifiesto:', err);
    
    if (err.response?.status === 403) {
      error.value = "No tienes permisos para ver este manifiesto.";
    } else if (err.response?.status === 404) {
      error.value = "Manifiesto no encontrado.";
    } else {
      error.value = err.message || "Error al cargar los datos del manifiesto.";
    }
    
    toast.error(error.value);
    
  } finally {
    isLoading.value = false;
  }
}

/**
 * Obtener datos de las órdenes
 */
function getOrdersData() {
  if (!manifestData.value) return [];
  
  // Si tiene order_ids poblados (manifiesto guardado)
  if (manifestData.value.order_ids && Array.isArray(manifestData.value.order_ids)) {
    return manifestData.value.order_ids;
  }
  
  // Si tiene manifest_data.orders (manifiesto temporal o snapshot)
  if (manifestData.value.manifest_data?.orders) {
    return manifestData.value.manifest_data.orders;
  }
  
  // Fallback para formato legacy
  if (manifestData.value.orders) {
    return manifestData.value.orders;
  }
  
  return [];
}

/**
 * Obtener nombre de la empresa
 */
function getCompanyName() {
  return manifestData.value?.company_id?.name || 
         manifestData.value?.manifest_data?.company?.name || 
         'Empresa';
}

/**
 * Obtener dirección de la empresa
 */
function getCompanyAddress() {
  return manifestData.value?.company_id?.address || 
         manifestData.value?.manifest_data?.company?.address || 
         'Dirección no especificada';
}

/**
 * Obtener teléfono de la empresa
 */
function getCompanyPhone() {
  return manifestData.value?.company_id?.phone || 
         manifestData.value?.manifest_data?.company?.phone;
}

/**
 * Obtener email de la empresa
 */
function getCompanyEmail() {
  return manifestData.value?.company_id?.email || 
         manifestData.value?.manifest_data?.company?.email;
}

/**
 * Obtener número de manifiesto
 */
function getManifestNumber() {
  return manifestData.value?.manifest_number || 'N/A';
}

/**
 * Obtener total de órdenes
 */
function getTotalOrders() {
  return manifestData.value?.total_orders || 
         manifestData.value?.manifest_data?.orders?.length || 
         getOrdersData().length;
}

/**
 * Obtener quién generó el manifiesto
 */
function getGeneratedBy() {
  return manifestData.value?.generated_by?.full_name || 
         manifestData.value?.manifest_data?.generated_by || 
         'Sistema';
}

/**
 * Obtener etiqueta de estado
 */
function getStatusLabel(status) {
  const labels = {
    generated: 'Generado',
    printed: 'Impreso',
    picked_up: 'Retirado',
    cancelled: 'Cancelado'
  };
  return labels[status] || status;
}

/**
 * Imprimir manifiesto
 */
function printManifest() {
  const printContents = document.getElementById('print-area').innerHTML;
  const printWindow = window.open('', '', 'width=800,height=600');

  printWindow.document.write(`
    <html>
      <head>
        <title>Manifiesto ${getManifestNumber()}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 14px;
            line-height: 1.4;
            color: #333;
          }
          
          .loading, .error, .manifest-header {
            display: none !important;
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
          
          .manifest-status {
            text-align: center;
            margin: 20px 0;
          }
          
          .status-badge {
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .status-generated { background: #dbeafe; color: #1e40af; }
          .status-printed { background: #fef3c7; color: #92400e; }
          .status-picked_up { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #dc2626; }
          
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
          
          .pickup-info {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 2rem;
            border: 1px solid #bae6fd;
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
  
  // Marcar como impreso si es un manifiesto guardado
  if (manifestData.value._id && manifestData.value.status === 'generated') {
    markAsPrinted();
  }
}

/**
 * Marcar como impreso
 */
async function markAsPrinted() {
  try {
    await apiService.manifests.updateStatus(manifestData.value._id, 'printed');
    manifestData.value.status = 'printed';
    toast.success('Manifiesto marcado como impreso');
  } catch (error) {
    console.error('Error marcando como impreso:', error);
  }
}

/**
 * Abrir modal para marcar como retirado
 */
function markAsPickedUp() {
  pickupForm.value = {
    person_name: '',
    person_rut: '',
    pickup_notes: ''
  };
  showPickupModal.value = true;
}

/**
 * Confirmar retiro
 */
async function confirmPickup() {
  try {
    console.log('✅ Marcando manifiesto como retirado:', getManifestNumber());
    
    await apiService.manifests.updateStatus(
      manifestData.value._id, 
      'picked_up', 
      pickupForm.value
    );
    
    // Actualizar datos localmente
    manifestData.value.status = 'picked_up';
    manifestData.value.picked_up_at = new Date().toISOString();
    manifestData.value.pickup_info = pickupForm.value;
    
    showPickupModal.value = false;
    toast.success('Manifiesto marcado como retirado');
    
  } catch (error) {
    console.error('❌ Error marcando como retirado:', error);
    toast.error('Error al marcar como retirado');
  }
}

/**
 * Formatear fecha
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  return new Date(dateString).toLocaleDateString('es-CL', options);
}

/**
 * Volver a la página anterior
 */
function goBack() {
  router.go(-1);
}

/**
 * Reintentar carga
 */
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

/* ==================== HEADER ==================== */
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

.back-button, 
.print-button, 
.pickup-button {
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
  background-color: #3b82f6;
  color: white;
}

.print-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.print-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.pickup-button {
  background-color: #10b981;
  color: white;
}

.pickup-button:hover {
  background-color: #059669;
}

/* ==================== ESTADOS DE CARGA ==================== */
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

.retry-button {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.retry-button:hover {
  background-color: #2563eb;
}

/* ==================== CONTENIDO DEL MANIFIESTO ==================== */
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
  min-width: 300px;
}

.manifest-meta p {
  margin: 5px 0;
  color: #374151;
  font-size: 14px;
}

/* ==================== ESTADO ==================== */
.manifest-status {
  text-align: center;
  margin: 20px 0;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-generated {
  background: #dbeafe;
  color: #1e40af;
}

.status-printed {
  background: #fef3c7;
  color: #92400e;
}

.status-picked_up {
  background: #d1fae5;
  color: #065f46;
}

.status-cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.pickup-date {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  font-size: 14px;
}

/* ==================== TABLA ==================== */
.manifest-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.manifest-table th, 
.manifest-table td {
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

/* ==================== RESUMEN ==================== */
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

/* ==================== INFORMACIÓN DE RETIRO ==================== */
.pickup-info {
  background: #f0fdf4;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid #bbf7d0;
}

.pickup-info h4 {
  margin: 0 0 12px 0;
  color: #14532d;
  font-size: 16px;
}

.pickup-details p {
  margin: 8px 0;
  color: #166534;
}

/* ==================== SECCIÓN DE FIRMAS ==================== */
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

/* ==================== FOOTER PARA IMPRESIÓN ==================== */
.print-footer {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  padding-top: 15px;
  margin-top: 2rem;
  display: none; /* Solo visible en impresión */
}

/* ==================== FORMULARIO DE RETIRO ==================== */
.pickup-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ==================== ACCIONES DEL MODAL ==================== */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-modal {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-modal.cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-modal.cancel:hover {
  background: #e5e7eb;
}

.btn-modal.confirm {
  background: #10b981;
  color: white;
}

.btn-modal.confirm:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.btn-modal:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ==================== MEDIA QUERIES PARA IMPRESIÓN ==================== */
@media print {
  .manifest-header {
    display: none !important;
  }
  
  .print-header, 
  .print-footer {
    display: block !important;
  }
  
  .manifest-container {
    padding: 0;
    max-width: none;
  }
  
  .loading, 
  .error {
    display: none !important;
  }
  
  /* Ajustar colores para impresión */
  .status-badge {
    border: 1px solid #000;
  }
  
  .manifest-summary,
  .pickup-info {
    border: 1px solid #000;
  }
}

/* ==================== RESPONSIVE DESIGN ==================== */
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
  
  .manifest-table th, 
  .manifest-table td {
    padding: 8px 4px;
  }
  
  .signature-section {
    flex-direction: column;
    gap: 2rem;
  }
  
  .signature-box {
    max-width: none;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .back-button,
  .print-button,
  .pickup-button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .manifest-container {
    padding: 0.5rem;
  }
  
  .manifest-header h1 {
    font-size: 24px;
  }
  
  .company-details h3 {
    font-size: 18px;
  }
  
  .manifest-meta {
    min-width: auto;
  }
  
  .manifest-table {
    font-size: 10px;
  }
  
  .manifest-table th,
  .manifest-table td {
    padding: 4px 2px;
  }
  
  .address {
    font-size: 11px;
    max-width: 120px;
  }
}

/* ==================== UTILIDADES ==================== */
.no-print {
  /* Clase para elementos que no se imprimen */
}

/* ==================== ACCESIBILIDAD ==================== */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }
  
  .btn-modal,
  .back-button,
  .print-button,
  .pickup-button {
    transition: none;
  }
}

/* ==================== MODO DE CONTRASTE ALTO ==================== */
@media (prefers-contrast: high) {
  .manifest-table th,
  .manifest-table td {
    border: 2px solid #000;
  }
  
  .status-badge {
    border: 2px solid #000;
  }
  
  .line {
    border-bottom: 3px solid #000;
  }
}
</style>