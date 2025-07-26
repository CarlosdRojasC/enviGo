<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2>📋 Manifiesto de Retiro</h2>
        <div class="modal-actions">
          <button @click="printManifest" class="btn btn-print" :disabled="!manifestData">
            🖨️ Imprimir
          </button>
          <button @click="downloadPDF" class="btn btn-download" :disabled="!manifestData">
            📄 PDF
          </button>
          <button 
            v-if="auth.isAdmin && manifestData?.status !== 'picked_up'" 
            @click="markAsPickedUp" 
            class="btn btn-pickup"
          >
            ✅ Marcar Retirado
          </button>
          <button @click="$emit('close')" class="btn-close">
            ✕
          </button>
        </div>
      </div>
      
      <div class="modal-content" id="manifest-print-area">
        <!-- Loading -->
        <div v-if="isLoading" class="loading">
          <div class="loading-spinner"></div>
          <p>Cargando manifiesto...</p>
        </div>
        
        <!-- Error -->
        <div v-if="error" class="error">
          <p>❌ {{ error }}</p>
          <button @click="loadManifestData" class="btn btn-retry">Reintentar</button>
        </div>

        <!-- Contenido del manifiesto -->
        <div v-if="manifestData" class="manifest-content">
          <!-- Información básica del manifiesto -->
          <div class="manifest-info">
            <div class="company-section">
              <h3>🏢 {{ getCompanyName() }}</h3>
              <p>📍 {{ getCompanyAddress() }}</p>
              <p v-if="getCompanyPhone()">📞 {{ getCompanyPhone() }}</p>
            </div>
            <div class="manifest-meta">
              <div class="meta-item">
                <strong>📋 N° Manifiesto:</strong> {{ getManifestNumber() }}
              </div>
              <div class="meta-item">
                <strong>📅 Fecha:</strong> {{ formatDate(manifestData.generated_at) }}
              </div>
              <div class="meta-item">
                <strong>📦 Total Pedidos:</strong> {{ getTotalOrders() }}
              </div>
              <div class="meta-item">
                <strong>📦 Total Bultos:</strong> {{ totalPackages }}
              </div>
              <div class="meta-item">
                <strong>👤 Generado por:</strong> {{ getGeneratedBy() }}
              </div>
            </div>
          </div>

          <!-- Estado del manifiesto -->
          <div v-if="manifestData.status" class="status-section">
            <span :class="['status-badge', `status-${manifestData.status}`]">
              {{ getStatusLabel(manifestData.status) }}
            </span>
            <span v-if="manifestData.picked_up_at" class="pickup-info">
              Retirado el {{ formatDate(manifestData.picked_up_at) }}
            </span>
          </div>

          <!-- Tabla compacta de pedidos -->
          <div class="orders-section">
            <h4>📦 Pedidos Incluidos ({{ getTotalOrders() }})</h4>
            <div class="orders-table-wrapper">
              <table class="orders-table">
                <thead>
                  <tr>
                    <th>N° Pedido</th>
                    <th>Cliente</th>
                    <th>Comuna</th>
                    <th>Bultos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in getOrdersData()" :key="order._id">
                    <td class="order-number">{{ order.order_number }}</td>
                    <td class="customer-name">{{ order.customer_name }}</td>
                    <td>{{ order.shipping_commune || 'N/A' }}</td>
                    <td class="packages">{{ order.load1Packages || 1 }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Resumen compacto -->
          <div class="summary-section">
            <div class="summary-item">
              <strong>🏘️ Comunas:</strong> {{ uniqueCommunes.join(', ') || 'N/A' }}
            </div>
            <div class="summary-item">
              <strong>📦 Total Bultos:</strong> {{ totalPackages }}
            </div>
          </div>

          <!-- Información de retiro (si aplica) -->
          <div v-if="manifestData.pickup_info" class="pickup-details">
            <h4>✅ Información de Retiro</h4>
            <p><strong>Retirado por:</strong> {{ manifestData.pickup_info.person_name }}</p>
            <p><strong>RUT:</strong> {{ manifestData.pickup_info.person_rut }}</p>
            <p v-if="manifestData.pickup_info.pickup_notes">
              <strong>Notas:</strong> {{ manifestData.pickup_info.pickup_notes }}
            </p>
          </div>

          <!-- Información solo lectura para empresas -->
          <div v-if="!auth.isAdmin" class="company-notice">
            <p>ℹ️ Solo los administradores pueden cambiar el estado del manifiesto</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de retiro -->
    <div v-if="showPickupModal" class="pickup-modal-overlay" @click.self="showPickupModal = false">
      <div class="pickup-modal">
        <div class="pickup-modal-header">
          <h3>✅ Marcar como Retirado</h3>
          <button @click="showPickupModal = false" class="btn-close">✕</button>
        </div>
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
              placeholder="Notas adicionales..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button @click="showPickupModal = false" class="btn btn-cancel">
              Cancelar
            </button>
            <button 
              @click="confirmPickup" 
              class="btn btn-confirm" 
              :disabled="!pickupForm.person_name || !pickupForm.person_rut"
            >
              ✅ Confirmar Retiro
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import { useToast } from 'vue-toastification';

// Props
const props = defineProps({
  manifestId: {
    type: String,
    required: true
  }
});

// Emits
const emit = defineEmits(['close']);

// Stores & Utils
const auth = useAuthStore();
const toast = useToast();

// State
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
    return total + (order.load1Packages || 1);
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
    console.log('📋 Cargando manifiesto en modal:', props.manifestId);
    
    const response = await apiService.manifests.getById(props.manifestId);
    manifestData.value = response.data;
    
    console.log('✅ Manifiesto cargado en modal:', manifestData.value);
    
  } catch (err) {
    console.error('❌ Error cargando manifiesto:', err);
    
    if (err.response?.status === 403) {
      error.value = "No tienes permisos para ver este manifiesto.";
    } else if (err.response?.status === 404) {
      error.value = "Manifiesto no encontrado.";
    } else {
      error.value = err.message || "Error al cargar el manifiesto.";
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
  
  if (manifestData.value.order_ids && Array.isArray(manifestData.value.order_ids)) {
    return manifestData.value.order_ids;
  }
  
  if (manifestData.value.manifest_data?.orders) {
    return manifestData.value.manifest_data.orders;
  }
  
  return [];
}

/**
 * Obtener información de la empresa
 */
function getCompanyName() {
  return manifestData.value?.company_id?.name || 
         manifestData.value?.manifest_data?.company?.name || 
         'Empresa';
}

function getCompanyAddress() {
  return manifestData.value?.company_id?.address || 
         manifestData.value?.manifest_data?.company?.address || 
         'Dirección no especificada';
}

function getCompanyPhone() {
  return manifestData.value?.company_id?.phone || 
         manifestData.value?.manifest_data?.company?.phone;
}

/**
 * Obtener información del manifiesto
 */
function getManifestNumber() {
  return manifestData.value?.manifest_number || 'N/A';
}

function getTotalOrders() {
  return manifestData.value?.total_orders || getOrdersData().length;
}

function getGeneratedBy() {
  return manifestData.value?.generated_by?.full_name || 
         manifestData.value?.manifest_data?.generated_by || 
         'Sistema';
}

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
 * Formatear fecha
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  return new Date(dateString).toLocaleDateString('es-CL', options);
}

/**
 * Imprimir manifiesto
 */
function printManifest() {
  const printContents = document.getElementById('manifest-print-area').innerHTML;
  const printWindow = window.open('', '', 'width=800,height=600');

  printWindow.document.write(`
    <html>
      <head>
        <title>Manifiesto ${getManifestNumber()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .loading, .error, .modal-header { display: none !important; }
          .manifest-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .orders-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .orders-table th, .orders-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .orders-table th { background-color: #f5f5f5; }
          .status-badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
          .status-generated { background: #dbeafe; color: #1e40af; }
          .status-printed { background: #fef3c7; color: #92400e; }
          .status-picked_up { background: #d1fae5; color: #065f46; }
          .summary-section { margin: 20px 0; padding: 15px; background: #f8f9fa; }
          h3, h4 { color: #333; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1 style="text-align: center;">📋 MANIFIESTO DE RETIRO - enviGo</h1>
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
  
  // Marcar como impreso si es nuevo
  if (manifestData.value.status === 'generated') {
    markAsPrinted();
  }
}

/**
 * Descargar PDF
 */
async function downloadPDF() {
  try {
    const response = await apiService.manifests.downloadPDF(props.manifestId);
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `manifest_${getManifestNumber()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('PDF descargado exitosamente');
  } catch (error) {
    console.error('Error descargando PDF:', error);
    toast.error('Error al descargar el PDF');
  }
}

/**
 * Marcar como impreso
 */
async function markAsPrinted() {
  try {
    await apiService.manifests.updateStatus(props.manifestId, 'printed');
    manifestData.value.status = 'printed';
    toast.success('Manifiesto marcado como impreso');
  } catch (error) {
    console.error('Error marcando como impreso:', error);
  }
}

/**
 * Abrir modal de retiro
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
    await apiService.manifests.updateStatus(
      props.manifestId, 
      'picked_up', 
      pickupForm.value
    );
    
    manifestData.value.status = 'picked_up';
    manifestData.value.picked_up_at = new Date().toISOString();
    manifestData.value.pickup_info = pickupForm.value;
    
    showPickupModal.value = false;
    toast.success('Manifiesto marcado como retirado');
    
  } catch (error) {
    console.error('Error marcando como retirado:', error);
    toast.error('Error al marcar como retirado');
  }
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  loadManifestData();
});
</script>

<style scoped>
/* ==================== MODAL BASE ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}

/* ==================== HEADER ==================== */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ==================== BOTONES ==================== */
.btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-print {
  background: #3b82f6;
  color: white;
}

.btn-print:hover:not(:disabled) {
  background: #2563eb;
}

.btn-download {
  background: #10b981;
  color: white;
}

.btn-download:hover:not(:disabled) {
  background: #059669;
}

.btn-pickup {
  background: #f59e0b;
  color: white;
}

.btn-pickup:hover {
  background: #d97706;
}

.btn-close {
  background: #ef4444;
  color: white;
  padding: 8px 10px;
  font-size: 16px;
}

.btn-close:hover {
  background: #dc2626;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== CONTENIDO ==================== */
.modal-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* ==================== LOADING Y ERROR ==================== */
.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 20px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin-bottom: 20px;
}

.btn-retry {
  background: #3b82f6;
  color: white;
  margin-top: 10px;
}

/* ==================== INFO DEL MANIFIESTO ==================== */
.manifest-info {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.company-section h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 18px;
}

.company-section p {
  margin: 4px 0;
  color: #4b5563;
  font-size: 14px;
}

.manifest-meta {
  text-align: right;
  min-width: 280px;
}

.meta-item {
  margin: 4px 0;
  font-size: 14px;
  color: #374151;
}

/* ==================== ESTADO ==================== */
.status-section {
  text-align: center;
  margin: 16px 0;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
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

.pickup-info {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
}

/* ==================== TABLA DE PEDIDOS ==================== */
.orders-section {
  margin: 20px 0;
}

.orders-section h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 16px;
}

.orders-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.orders-table th,
.orders-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.orders-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.orders-table tbody tr:hover {
  background: #f9fafb;
}

.order-number {
  font-weight: 600;
  color: #4f46e5;
}

.customer-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.packages {
  text-align: center;
  font-weight: 600;
  color: #059669;
}

/* ==================== RESUMEN ==================== */
.summary-section {
  background: #f0f9ff;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
  border: 1px solid #bae6fd;
}

.summary-item {
  margin: 6px 0;
  font-size: 14px;
  color: #0c4a6e;
}

/* ==================== INFORMACIÓN DE RETIRO ==================== */
.pickup-details {
  background: #f0fdf4;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
  border: 1px solid #bbf7d0;
}

.pickup-details h4 {
  margin: 0 0 8px 0;
  color: #14532d;
  font-size: 14px;
}

.pickup-details p {
  margin: 4px 0;
  color: #166534;
  font-size: 13px;
}

/* ==================== AVISO PARA EMPRESAS ==================== */
.company-notice {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 12px;
  margin-top: 16px;
  text-align: center;
  color: #0369a1;
  font-size: 13px;
}

/* ==================== MODAL DE RETIRO ==================== */
.pickup-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.pickup-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.pickup-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.pickup-modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
}

.pickup-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-confirm {
  background: #10b981;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #059669;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-header {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .modal-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .modal-content {
    padding: 16px;
  }
  
  .manifest-info {
    flex-direction: column;
    gap: 16px;
  }
  
  .manifest-meta {
    text-align: left;
    min-width: auto;
  }
  
  .orders-table {
    font-size: 11px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 6px 8px;
  }
  
  .customer-name {
    max-width: 120px;
  }
}

@media (max-width: 480px) {
  .btn {
    padding: 6px 8px;
    font-size: 12px;
  }
  
  .modal-header h2 {
    font-size: 18px;
  }
  
  .orders-table {
    font-size: 10px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 4px 6px;
  }
}
</style>