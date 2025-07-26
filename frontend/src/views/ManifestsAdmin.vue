<template>
  <div class="manifests-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>📋 Gestión de Manifiestos</h1>
        <p>Historial y administración de manifiestos de retiro</p>
      </div>
      <div class="header-actions">
        <button @click="refreshData" class="btn-refresh" :disabled="loading">
          🔄 {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
        <button @click="showStats = !showStats" class="btn-stats">
          📊 {{ showStats ? 'Ocultar' : 'Mostrar' }} Estadísticas
        </button>
      </div>
    </div>

    <!-- Estadísticas -->
    <div v-if="showStats" class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.total || 0 }}</div>
            <div class="stat-label">Total Manifiestos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.picked_up || 0 }}</div>
            <div class="stat-label">Retirados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.total_orders || 0 }}</div>
            <div class="stat-label">Pedidos Totales</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.today || 0 }}</div>
            <div class="stat-label">Hoy</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters-grid">
        <div class="filter-group">
          <label>🏢 Empresa</label>
          <select v-model="filters.company_id" @change="applyFilters">
            <option value="">Todas las empresas</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>📊 Estado</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">Todos los estados</option>
            <option value="generated">Generado</option>
            <option value="printed">Impreso</option>
            <option value="picked_up">Retirado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>📅 Desde</label>
          <input 
            type="date" 
            v-model="filters.date_from" 
            @change="applyFilters"
          >
        </div>
        
        <div class="filter-group">
          <label>📅 Hasta</label>
          <input 
            type="date" 
            v-model="filters.date_to" 
            @change="applyFilters"
          >
        </div>
        
        <div class="filter-actions">
          <button @click="resetFilters" class="btn-reset">
            🗑️ Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de manifiestos -->
    <div class="table-section">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando manifiestos...</p>
      </div>
      
      <div v-else-if="manifests.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No hay manifiestos</h3>
        <p>No se encontraron manifiestos con los filtros aplicados</p>
      </div>
      
      <div v-else class="table-container">
        <table class="manifests-table">
          <thead>
            <tr>
              <th>N° Manifiesto</th>
              <th>Empresa</th>
              <th>Fecha</th>
              <th>Pedidos</th>
              <th>Bultos</th>
              <th>Estado</th>
              <th>Generado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="manifest in manifests" :key="manifest._id" class="manifest-row">
              <td class="manifest-number">
                <strong>{{ manifest.manifest_number }}</strong>
              </td>
              <td>
                <div class="company-info">
                  <div class="company-name">{{ manifest.company_id?.name }}</div>
                </div>
              </td>
              <td>
                <div class="date-info">
                  <div class="date">{{ formatDate(manifest.generated_at) }}</div>
                  <div class="time">{{ formatTime(manifest.generated_at) }}</div>
                </div>
              </td>
              <td class="text-center">
                <span class="orders-count">{{ manifest.total_orders }}</span>
              </td>
              <td class="text-center">
                <span class="packages-count">{{ manifest.total_packages }}</span>
              </td>
              <td>
                <span :class="['status-badge', `status-${manifest.status}`]">
                  {{ getStatusLabel(manifest.status) }}
                </span>
              </td>
              <td>
                <div class="user-info">
                  <div class="user-name">{{ manifest.generated_by?.full_name }}</div>
                  <div class="user-email">{{ manifest.generated_by?.email }}</div>
                </div>
              </td>
              <td>
                <div class="actions">
                  <button 
                    @click="viewManifest(manifest)" 
                    class="btn-action view"
                    title="Ver manifiesto"
                  >
                    👁️
                  </button>
                  <button 
                    @click="downloadPDF(manifest)" 
                    class="btn-action download"
                    title="Descargar PDF"
                  >
                    📄
                  </button>
                  <button 
                    v-if="manifest.status !== 'picked_up'"
                    @click="markAsPickedUp(manifest)" 
                    class="btn-action pickup"
                    title="Marcar como retirado"
                  >
                    ✅
                  </button>
                  <button 
                    @click="showManifestDetails(manifest)" 
                    class="btn-action details"
                    title="Ver detalles"
                  >
                    ℹ️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="pagination.pages > 1" class="pagination-section">
      <div class="pagination-info">
        Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
        {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
        de {{ pagination.total }} manifiestos
      </div>
      <div class="pagination-controls">
        <button 
          @click="goToPage(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="btn-page"
        >
          ← Anterior
        </button>
        <span class="page-info">
          Página {{ pagination.page }} de {{ pagination.pages }}
        </span>
        <button 
          @click="goToPage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.pages"
          class="btn-page"
        >
          Siguiente →
        </button>
      </div>
    </div>

    <!-- Modal de detalles -->
    <Modal v-model="showDetailsModal" title="📋 Detalles del Manifiesto" width="800px">
      <div v-if="selectedManifest" class="manifest-details">
        <div class="details-header">
          <h3>{{ selectedManifest.manifest_number }}</h3>
          <span :class="['status-badge', `status-${selectedManifest.status}`]">
            {{ getStatusLabel(selectedManifest.status) }}
          </span>
        </div>
        
        <div class="details-grid">
          <div class="detail-section">
            <h4>📊 Resumen</h4>
            <p><strong>Total Pedidos:</strong> {{ selectedManifest.total_orders }}</p>
            <p><strong>Total Bultos:</strong> {{ selectedManifest.total_packages }}</p>
            <p><strong>Comunas:</strong> {{ selectedManifest.communes?.join(', ') }}</p>
          </div>
          
          <div class="detail-section">
            <h4>📅 Fechas</h4>
            <p><strong>Generado:</strong> {{ formatDateTime(selectedManifest.generated_at) }}</p>
            <p v-if="selectedManifest.picked_up_at">
              <strong>Retirado:</strong> {{ formatDateTime(selectedManifest.picked_up_at) }}
            </p>
          </div>
          
          <div class="detail-section">
            <h4>👤 Usuario</h4>
            <p><strong>Generado por:</strong> {{ selectedManifest.generated_by?.full_name }}</p>
            <p><strong>Email:</strong> {{ selectedManifest.generated_by?.email }}</p>
          </div>
        </div>
        
        <div v-if="selectedManifest.pickup_info" class="pickup-info">
          <h4>✅ Información de Retiro</h4>
          <p><strong>Persona:</strong> {{ selectedManifest.pickup_info.person_name }}</p>
          <p><strong>RUT:</strong> {{ selectedManifest.pickup_info.person_rut }}</p>
          <p v-if="selectedManifest.pickup_info.pickup_notes">
            <strong>Notas:</strong> {{ selectedManifest.pickup_info.pickup_notes }}
          </p>
        </div>
        
        <div class="modal-actions">
          <button @click="viewManifest(selectedManifest)" class="btn-modal view">
            👁️ Ver Manifiesto
          </button>
          <button @click="downloadPDF(selectedManifest)" class="btn-modal download">
            📄 Descargar PDF
          </button>
          <button 
            v-if="selectedManifest.status !== 'picked_up'"
            @click="markAsPickedUp(selectedManifest)" 
            class="btn-modal pickup"
          >
            ✅ Marcar como Retirado
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de marcar como retirado -->
    <Modal v-model="showPickupModal" title="✅ Marcar como Retirado" width="500px">
      <div class="pickup-form">
        <p>Manifiesto: <strong>{{ pickupManifest?.manifest_number }}</strong></p>
        
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
          <label>Notas adicionales</label>
          <textarea 
            v-model="pickupForm.pickup_notes" 
            placeholder="Observaciones del retiro..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="modal-actions">
          <button @click="showPickupModal = false" class="btn-modal cancel">
            Cancelar
          </button>
          <button @click="confirmPickup" class="btn-modal confirm" :disabled="!pickupForm.person_name || !pickupForm.person_rut">
            ✅ Confirmar Retiro
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import { useToast } from 'vue-toastification';
import Modal from '../components/Modal.vue';

const auth = useAuthStore();
const toast = useToast();

// ==================== STATE ====================
const loading = ref(false);
const showStats = ref(true);
const manifests = ref([]);
const companies = ref([]);
const stats = ref({});
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  pages: 0
});

// Filtros
const filters = ref({
  company_id: '',
  status: '',
  date_from: '',
  date_to: ''
});

// Modales
const showDetailsModal = ref(false);
const showPickupModal = ref(false);
const selectedManifest = ref(null);
const pickupManifest = ref(null);

// Formulario de retiro
const pickupForm = ref({
  person_name: '',
  person_rut: '',
  pickup_notes: ''
});

// ==================== COMPUTED ====================
const isAdmin = computed(() => auth.isAdmin);

// ==================== METHODS ====================

/**
 * Cargar datos iniciales
 */
async function loadInitialData() {
  loading.value = true;
  
  try {
    await Promise.all([
      loadManifests(),
      loadCompanies(),
      loadStats()
    ]);
  } catch (error) {
    console.error('❌ Error cargando datos iniciales:', error);
    toast.error('Error al cargar los datos');
  } finally {
    loading.value = false;
  }
}

/**
 * Cargar manifiestos
 */
async function loadManifests() {
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    };
    
    // Limpiar filtros vacíos
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    console.log('📋 Cargando manifiestos con filtros:', params);
    
    const response = await apiService.manifests.getAll(params);
    
    manifests.value = response.data.manifests;
    pagination.value = response.data.pagination;
    
    console.log(`✅ ${manifests.value.length} manifiestos cargados`);
    
  } catch (error) {
    console.error('❌ Error cargando manifiestos:', error);
    throw error;
  }
}

/**
 * Cargar empresas (solo para admin)
 */
async function loadCompanies() {
  if (!isAdmin.value) return;
  
  try {
    const response = await apiService.companies.getAll();
    companies.value = response.data;
  } catch (error) {
    console.error('❌ Error cargando empresas:', error);
  }
}

/**
 * Cargar estadísticas
 */
async function loadStats() {
  try {
    // Calcular estadísticas localmente por ahora
    const total = manifests.value.length;
    const picked_up = manifests.value.filter(m => m.status === 'picked_up').length;
    const total_orders = manifests.value.reduce((sum, m) => sum + m.total_orders, 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayManifests = manifests.value.filter(m => 
      new Date(m.generated_at).toISOString().split('T')[0] === today
    ).length;
    
    stats.value = {
      total,
      picked_up,
      total_orders,
      today: todayManifests
    };
    
  } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
  }
}

/**
 * Aplicar filtros
 */
async function applyFilters() {
  pagination.value.page = 1; // Reset a primera página
  await loadManifests();
  await loadStats();
}

/**
 * Resetear filtros
 */
async function resetFilters() {
  filters.value = {
    company_id: '',
    status: '',
    date_from: '',
    date_to: ''
  };
  await applyFilters();
}

/**
 * Refrescar datos
 */
async function refreshData() {
  await loadInitialData();
  toast.success('Datos actualizados');
}

/**
 * Ir a página
 */
async function goToPage(page) {
  if (page < 1 || page > pagination.value.pages) return;
  
  pagination.value.page = page;
  await loadManifests();
}

/**
 * Ver manifiesto
 */
function viewManifest(manifest) {
  const manifestUrl = `/manifest/${manifest._id}`;
  window.open(manifestUrl, '_blank', 'width=900,height=700');
}

/**
 * Descargar PDF
 */
async function downloadPDF(manifest) {
  try {
    console.log('📄 Descargando PDF del manifiesto:', manifest.manifest_number);
    
    const response = await apiService.manifests.downloadPDF(manifest._id);
    
    // Crear enlace de descarga
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifest_${manifest.manifest_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('PDF descargado exitosamente');
    
  } catch (error) {
    console.error('❌ Error descargando PDF:', error);
    toast.error('Error al descargar el PDF');
  }
}

/**
 * Mostrar modal de detalles
 */
async function showManifestDetails(manifest) {
  try {
    loading.value = true;
    
    // Cargar detalles completos
    const response = await apiService.manifests.getById(manifest._id);
    selectedManifest.value = response.data;
    showDetailsModal.value = true;
    
  } catch (error) {
    console.error('❌ Error cargando detalles:', error);
    toast.error('Error al cargar los detalles');
  } finally {
    loading.value = false;
  }
}

/**
 * Marcar como retirado
 */
function markAsPickedUp(manifest) {
  pickupManifest.value = manifest;
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
    console.log('✅ Marcando manifiesto como retirado:', pickupManifest.value.manifest_number);
    
    await apiService.manifests.updateStatus(
      pickupManifest.value._id, 
      'picked_up', 
      pickupForm.value
    );
    
    // Actualizar localmente
    const manifestIndex = manifests.value.findIndex(m => m._id === pickupManifest.value._id);
    if (manifestIndex !== -1) {
      manifests.value[manifestIndex].status = 'picked_up';
      manifests.value[manifestIndex].picked_up_at = new Date().toISOString();
      manifests.value[manifestIndex].pickup_info = pickupForm.value;
    }
    
    showPickupModal.value = false;
    toast.success('Manifiesto marcado como retirado');
    
    // Actualizar estadísticas
    await loadStats();
    
  } catch (error) {
    console.error('❌ Error marcando como retirado:', error);
    toast.error('Error al marcar como retirado');
  }
}

/**
 * Formatear fecha
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-CL');
}

/**
 * Formatear hora
 */
function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatear fecha y hora
 */
function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('es-CL');
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

// ==================== LIFECYCLE ====================
onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
.manifests-page {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 28px;
  font-weight: 700;
}

.header-content p {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh, .btn-stats {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh {
  background: #3b82f6;
  color: white;
}

.btn-refresh:hover:not(:disabled) {
  background: #2563eb;
}

.btn-refresh:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-stats {
  background: #f3f4f6;
  color: #374151;
}

.btn-stats:hover {
  background: #e5e7eb;
}

/* Estadísticas */
.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  color: #6b7280;
  font-size: 14px;
}

/* Filtros */
.filters-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-reset {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-reset:hover {
  background: #e5e7eb;
}

/* Tabla */
.table-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-state, .empty-state {
  padding: 60px;
  text-align: center;
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

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.table-container {
  overflow-x: auto;
}

.manifests-table {
  width: 100%;
  border-collapse: collapse;
}

.manifests-table th {
  background: #f8fafc;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.manifests-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.manifest-row:hover {
  background: #f9fafb;
}

.manifest-number {
  color: #3b82f6;
  font-weight: 600;
}

.company-name {
  font-weight: 500;
  color: #1f2937;
}

.date-info .date {
  font-weight: 500;
  color: #1f2937;
}

.date-info .time {
  font-size: 12px;
  color: #6b7280;
}

.text-center {
  text-align: center;
}

.orders-count, .packages-count {
  font-weight: 600;
  color: #059669;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
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

.user-info .user-name {
  font-weight: 500;
  color: #1f2937;
}

.user-info .user-email {
  font-size: 12px;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-action.view {
  background: #dbeafe;
  color: #1e40af;
}

.btn-action.download {
  background: #fef3c7;
  color: #92400e;
}

.btn-action.pickup {
  background: #d1fae5;
  color: #065f46;
}

.btn-action.details {
  background: #f3f4f6;
  color: #374151;
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Paginación */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 16px 0;
}

.pagination-info {
  color: #6b7280;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-page {
  padding: 8px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-page:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #374151;
  font-weight: 500;
}

/* Modales */
.manifest-details {
  padding: 20px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.details-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
}

.detail-section p {
  margin: 8px 0;
  color: #6b7280;
}

.pickup-info {
  background: #f0f9ff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.pickup-info h4 {
  margin: 0 0 12px 0;
  color: #0c4a6e;
}

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

.btn-modal.view {
  background: #3b82f6;
  color: white;
}

.btn-modal.download {
  background: #f59e0b;
  color: white;
}

.btn-modal.pickup {
  background: #10b981;
  color: white;
}

.btn-modal.cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-modal.confirm {
  background: #10b981;
  color: white;
}

.btn-modal:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-modal:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Formulario de retiro */
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
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .manifests-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .table-container {
    font-size: 12px;
  }
  
  .manifests-table th,
  .manifests-table td {
    padding: 8px;
  }
  
  .pagination-section {
    flex-direction: column;
    gap: 16px;
  }
}
</style>