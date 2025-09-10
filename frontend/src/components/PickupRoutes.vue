<template>
  <div class="page-container">
    <!-- HEADER -->
    <div class="page-header">
      <h1 class="page-title">📍 Rutas de Retiro</h1>
      <p class="page-subtitle">Gestiona los retiros pendientes en las direcciones de tus clientes.</p>
    </div>

    <!-- TABLE SECTION -->
    <div class="table-section">
      <div class="table-container">
        <table class="pickups-table">
          <!-- HEADER -->
          <thead>
            <tr>
              <th class="col-checkbox">
                <input 
                  type="checkbox" 
                  :checked="selectAllChecked"
                  :indeterminate="selectAllIndeterminate"
                  @change="toggleSelectAll"
                  class="select-all-checkbox"
                />
              </th>
              <th class="col-index">#</th>
              <th class="col-manifest">Manifiesto</th>
              <th class="col-company">Empresa</th>
              <th class="col-address">Dirección retiro</th>
              <th class="col-orders">Órdenes</th>
              <th class="col-packages">Bultos</th>
              <th class="col-date">Fecha</th>
              <th class="col-driver">Conductor</th>
              <th class="col-actions">Acciones</th>
            </tr>
          </thead>

          <!-- BODY -->
          <tbody>
            <!-- LOADING STATE -->
            <tr v-if="loading" class="loading-row">
              <td colspan="10" class="loading-state">
                <div class="loading-spinner"></div>
                <span>Cargando rutas de retiro...</span>
              </td>
            </tr>

            <!-- EMPTY STATE -->
            <tr v-else-if="pickups.length === 0" class="empty-row">
              <td colspan="10" class="empty-state">
                <div class="empty-icon">📦</div>
                <p class="empty-title">No hay rutas de retiro pendientes</p>
                <p class="empty-subtitle">Las rutas aparecerán aquí cuando se generen manifiestos</p>
              </td>
            </tr>

            <!-- PICKUP ROWS -->
            <tr 
              v-for="(pickup, index) in pickups" 
              :key="pickup._id"
              class="pickup-row"
              :class="{ 
                'selected': isPickupSelected(pickup),
                'driver-assigned': !!pickup.driver_id 
              }"
            >
              <!-- CHECKBOX -->
              <td class="col-checkbox">
                <input 
                  type="checkbox" 
                  :checked="isPickupSelected(pickup)"
                  @change="toggleSelectPickup(pickup)"
                  class="pickup-checkbox"
                />
              </td>

              <!-- INDEX -->
              <td class="col-index">
                <div class="index-number">{{ index + 1 }}</div>
              </td>

              <!-- MANIFEST -->
              <td class="col-manifest">
                <div class="manifest-info">
                  <div class="manifest-number">
                    {{ pickup.manifest_id?.manifest_number || 'N/A' }}
                  </div>
                  <div class="manifest-id">ID: {{ pickup.manifest_id?._id?.slice(-6) || 'N/A' }}</div>
                </div>
              </td>

              <!-- COMPANY -->
              <td class="col-company">
                <div class="company-info">
                  <div class="company-name">
                    {{ pickup.company_id?.name || 'Sin empresa' }}
                  </div>
                  <div v-if="pickup.company_id?.email" class="company-email">
                    📧 {{ pickup.company_id.email }}
                  </div>
                </div>
              </td>

              <!-- ADDRESS -->
              <td class="col-address">
                <div class="address-info">
                  <div class="address-text">{{ pickup.pickup_address }}</div>
                  <div v-if="pickup.pickup_commune" class="address-commune">
                    📍 {{ pickup.pickup_commune }}
                  </div>
                </div>
              </td>

              <!-- ORDERS COUNT -->
              <td class="col-orders">
                <div class="orders-count">
                  <span class="count-badge orders">
                    📦 {{ pickup.total_orders }}
                  </span>
                </div>
              </td>

              <!-- PACKAGES COUNT -->
              <td class="col-packages">
                <div class="packages-count">
                  <span class="count-badge packages">
                    📋 {{ pickup.total_packages }}
                  </span>
                </div>
              </td>

              <!-- DATE -->
              <td class="col-date">
                <div class="date-info">
                  <div class="date-created">
                    <span class="date-label">Creado:</span>
                    <span class="date-value">{{ formatDate(pickup.created_at) }}</span>
                  </div>
                  <div v-if="pickup.updated_at !== pickup.created_at" class="date-updated">
                    <span class="date-label">Actualizado:</span>
                    <span class="date-value">{{ formatDate(pickup.updated_at) }}</span>
                  </div>
                </div>
              </td>

              <!-- DRIVER STATUS -->
              <td class="col-driver">
                <div class="driver-info">
                  <div v-if="pickup.driver_id" class="driver-assigned">
                    <span class="driver-badge active">
                      🚚 {{ pickup.driver_info?.name || 'Conductor asignado' }}
                    </span>
                    <div v-if="pickup.driver_info?.phone" class="driver-phone">
                      📱 {{ pickup.driver_info.phone }}
                    </div>
                  </div>
                  <div v-else class="driver-pending">
                    <span class="driver-badge pending">
                      ⏳ Sin conductor
                    </span>
                  </div>
                </div>
              </td>

              <!-- ACTIONS -->
              <td class="col-actions">
                <div class="action-buttons">
                  <button 
                    @click="viewDetails(pickup)" 
                    class="btn-action view"
                    title="Ver detalles del retiro"
                  >
                    <span class="action-icon">👁️</span>
                    <span class="action-text">Ver</span>
                  </button>

                  <button 
                    @click="assignDriver(pickup)" 
                    class="btn-action assign"
                    :class="{ disabled: !!pickup.driver_id }"
                    :title="pickup.driver_id ? 'Conductor ya asignado' : 'Asignar conductor'"
                  >
                    <span class="action-icon">🚚</span>
                    <span class="action-text">{{ pickup.driver_id ? 'Reasignar' : 'Asignar' }}</span>
                  </button>

                  <div class="action-dropdown">
                    <button class="btn-action more" title="Más acciones">
                      <span class="action-icon">⋮</span>
                    </button>
                    <div class="dropdown-menu">
                      <button @click="generateRoute(pickup)" class="dropdown-item">
                        <span class="action-icon">🗺️</span>
                        Generar Ruta
                      </button>
                      <button @click="printManifest(pickup)" class="dropdown-item">
                        <span class="action-icon">🖨️</span>
                        Imprimir Manifiesto
                      </button>
                      <button @click="duplicateRoute(pickup)" class="dropdown-item">
                        <span class="action-icon">📋</span>
                        Duplicar Ruta
                      </button>
                      <button @click="cancelPickup(pickup)" class="dropdown-item danger">
                        <span class="action-icon">❌</span>
                        Cancelar Retiro
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION -->
      <div class="pagination-section">
        <div class="pagination-info">
          <span class="results-info">
            Mostrando {{ startItem }} a {{ endItem }} de {{ pagination.total }} rutas de retiro
          </span>
          <div class="page-size-selector">
            <label>Mostrar:</label>
            <select :value="pagination.limit" @change="changePageSize($event.target.value)">
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span>por página</span>
          </div>
        </div>

        <div class="pagination-controls">
          <button 
            @click="goToPage(1)" 
            :disabled="pagination.page <= 1"
            class="page-btn first"
            title="Primera página"
          >
            ⏮️
          </button>

          <button 
            @click="goToPage(pagination.page - 1)" 
            :disabled="pagination.page <= 1"
            class="page-btn prev"
            title="Página anterior"
          >
            ◀️ Anterior
          </button>

          <div class="page-numbers">
            <button 
              v-for="page in visiblePages" 
              :key="page"
              @click="goToPage(page)"
              class="page-btn number"
              :class="{ active: page === pagination.page }"
            >
              {{ page }}
            </button>
          </div>

          <button 
            @click="goToPage(pagination.page + 1)" 
            :disabled="pagination.page >= pagination.totalPages"
            class="page-btn next"
            title="Página siguiente"
          >
            Siguiente ▶️
          </button>

          <button 
            @click="goToPage(pagination.totalPages)" 
            :disabled="pagination.page >= pagination.totalPages"
            class="page-btn last"
            title="Última página"
          >
            ⏭️
          </button>
        </div>

        <div class="pagination-jump">
          <label>Ir a página:</label>
          <input 
            type="number" 
            :min="1" 
            :max="pagination.totalPages"
            :value="pagination.page"
            @keyup.enter="goToPage($event.target.value)"
            class="page-input"
          />
          <span>de {{ pagination.totalPages }}</span>
        </div>
      </div>
    </div>

    <!-- MODALES -->
    <!-- Modal de Asignación de Conductor -->
    <div v-if="showDriverModal" class="modal-overlay" @click="closeDriverModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>🚚 Asignar Conductor</h3>
          <button @click="closeDriverModal" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="pickup-summary">
            <h4>Retiro seleccionado:</h4>
            <p><strong>Dirección:</strong> {{ selectedPickup?.pickup_address }}</p>
            <p><strong>Empresa:</strong> {{ selectedPickup?.company_id?.name }}</p>
            <p><strong>Órdenes:</strong> {{ selectedPickup?.total_orders }} órdenes, {{ selectedPickup?.total_packages }} bultos</p>
          </div>
          
          <div class="driver-selection">
            <h4>Seleccionar Conductor:</h4>
            <select v-model="selectedDriverId" class="driver-select">
  <option value="">-- Seleccionar conductor --</option>
  <option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id">
    {{ driver.name }} - {{ driver.phone }}
  </option>
</select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDriverModal" class="btn-secondary">Cancelar</button>
          <button @click="confirmDriverAssignment" :disabled="!selectedDriverId" class="btn-primary">
            Asignar Conductor
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { apiService } from '../services/api';
import { useToast } from "vue-toastification";

// ==================== REFS ====================
const pickups = ref([]);
const loading = ref(true);
const selectedPickups = ref([]);
const availableDrivers = ref([]);

// Modal refs
const showDriverModal = ref(false);
const selectedPickup = ref(null);
const selectedDriverId = ref('');

// Pagination
const pagination = ref({
  page: 1,
  limit: 15,
  total: 0,
  totalPages: 1
});

const toast = useToast();

// ==================== COMPUTED ====================
const selectAllChecked = computed(() => {
  return pickups.value.length > 0 && selectedPickups.value.length === pickups.value.length;
});

const selectAllIndeterminate = computed(() => {
  return selectedPickups.value.length > 0 && selectedPickups.value.length < pickups.value.length;
});

const startItem = computed(() => {
  return Math.max(1, ((pagination.value.page - 1) * pagination.value.limit) + 1);
});

const endItem = computed(() => {
  return Math.min(pagination.value.page * pagination.value.limit, pagination.value.total);
});

const visiblePages = computed(() => {
  const current = pagination.value.page;
  const total = pagination.value.totalPages;
  const delta = 2;
  
  let start = Math.max(1, current - delta);
  let end = Math.min(total, current + delta);
  
  if (current <= delta + 1) {
    end = Math.min(total, delta * 2 + 1);
  }
  if (current >= total - delta) {
    start = Math.max(1, total - delta * 2);
  }
  
  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
});

// ==================== METHODS ====================

/**
 * Fetch pickups data
 */
async function fetchPickups() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    };
    
    const { data } = await apiService.pickups.getAll(params);
    
    pickups.value = data.pickups || data;
    
    // Update pagination if response includes pagination info
    if (data.pagination) {
      pagination.value = { ...pagination.value, ...data.pagination };
    } else {
      pagination.value.total = pickups.value.length;
      pagination.value.totalPages = Math.ceil(pickups.value.length / pagination.value.limit);
    }
    
  } catch (error) {
    console.error("Error al cargar las rutas de retiro:", error);
    toast.error("Error al cargar las rutas de retiro");
  } finally {
    loading.value = false;
  }
}

/**
 * Fetch available drivers
 */
  async function fetchAvailableDrivers() {
    loadingDrivers.value = true
    
    try {
      console.log('👥 Fetching available drivers from Shipday...')
      
      const response = await shipdayService.getDrivers()
      console.log('📋 Drivers API response:', response)
      
      // Handle different response formats
      let drivers = []
      if (response.data?.data) {
        drivers = response.data.data
      } else if (response.data && Array.isArray(response.data)) {
        drivers = response.data
      } else {
        drivers = []
      }
      
      // Filter active drivers
      availableDrivers.value = drivers.filter(driver => driver.isActive)
      
      console.log('✅ Available drivers loaded:', {
        total: drivers.length,
        active: availableDrivers.value.length,
        drivers: availableDrivers.value.map(d => ({ id: d.id, name: d.name, email: d.email }))
      })
      
    } catch (error) {
      console.error('❌ Error fetching drivers:', error)
      toast.error('Error al cargar conductores')
      availableDrivers.value = []
    } finally {
      loadingDrivers.value = false
    }
  }


/**
 * Selection methods
 */
function isPickupSelected(pickup) {
  return selectedPickups.value.includes(pickup._id);
}

function toggleSelectPickup(pickup) {
  const index = selectedPickups.value.indexOf(pickup._id);
  if (index > -1) {
    selectedPickups.value.splice(index, 1);
  } else {
    selectedPickups.value.push(pickup._id);
  }
}

function toggleSelectAll() {
  if (selectAllChecked.value) {
    selectedPickups.value = [];
  } else {
    selectedPickups.value = pickups.value.map(p => p._id);
  }
}

/**
 * Date formatting
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago'
  };
  
  return new Date(dateString).toLocaleString('es-CL', options);
}

/**
 * Pagination methods
 */
function goToPage(page) {
  const pageNumber = parseInt(page);
  if (pageNumber >= 1 && pageNumber <= pagination.value.totalPages) {
    pagination.value.page = pageNumber;
    fetchPickups();
  }
}

function changePageSize(newSize) {
  pagination.value.limit = parseInt(newSize);
  pagination.value.page = 1;
  fetchPickups();
}

/**
 * Action methods
 */
function viewDetails(pickup) {
  console.log('Ver detalles del retiro:', pickup);
  // Implementar modal de detalles
}

function assignDriver(pickup) {
  selectedPickup.value = pickup;
  selectedDriverId.value = pickup.driver_id || '';
  showDriverModal.value = true;
}

function closeDriverModal() {
  showDriverModal.value = false;
  selectedPickup.value = null;
  selectedDriverId.value = '';
}

async function confirmDriverAssignment() {
  if (!selectedDriverId.value || !selectedPickup.value) return;
  
  try {
    await apiService.pickups.assignDriver(selectedPickup.value._id, selectedDriverId.value);
    
    // Update the pickup in the list
    const pickupIndex = pickups.value.findIndex(p => p._id === selectedPickup.value._id);
    if (pickupIndex > -1) {
      pickups.value[pickupIndex].driver_id = selectedDriverId.value;
      
      // Find driver info
      const driver = availableDrivers.value.find(d => d._id === selectedDriverId.value);
      if (driver) {
        pickups.value[pickupIndex].driver_info = driver;
      }
    }
    
    toast.success("Conductor asignado exitosamente");
    closeDriverModal();
    
  } catch (error) {
    console.error("Error al asignar conductor:", error);
    toast.error("Error al asignar conductor");
  }
}

function generateRoute(pickup) {
  console.log('Generar ruta para:', pickup);
  // Implementar generación de ruta
}

function printManifest(pickup) {
  console.log('Imprimir manifiesto para:', pickup);
  // Implementar impresión de manifiesto
}

function duplicateRoute(pickup) {
  console.log('Duplicar ruta:', pickup);
  // Implementar duplicación de ruta
}

function cancelPickup(pickup) {
  console.log('Cancelar retiro:', pickup);
  // Implementar cancelación de retiro
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  fetchPickups();
  fetchAvailableDrivers();
});
</script>

<style scoped>
/* ==================== PAGE LAYOUT ==================== */
.page-container {
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 1rem;
  color: #64748b;
}

/* ==================== TABLE LAYOUT ==================== */
.table-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
}

.pickups-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

/* ==================== TABLE HEADER ==================== */
.pickups-table thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.pickups-table th {
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 10;
}

/* Column widths */
.col-checkbox { width: 40px; }
.col-index { width: 60px; }
.col-manifest { width: 140px; }
.col-company { width: 150px; }
.col-address { width: 200px; }
.col-orders { width: 80px; }
.col-packages { width: 80px; }
.col-date { width: 160px; }
.col-driver { width: 160px; }
.col-actions { width: 180px; }

/* ==================== TABLE BODY ==================== */
.pickups-table tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.pickups-table tbody tr:hover {
  background: #f1f5f9;
}

.pickups-table tbody tr.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.pickups-table tbody tr.driver-assigned {
  background: #f0fdf4;
}

.pickups-table td {
  padding: 12px;
  vertical-align: top;
}

/* ==================== LOADING & EMPTY STATES ==================== */
.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f1f5f9;
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

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.empty-subtitle {
  color: #64748b;
}

/* ==================== CELL CONTENT ==================== */
.index-number {
  font-weight: 600;
  color: #64748b;
}

/* Manifest Info */
.manifest-info .manifest-number {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.manifest-info .manifest-id {
  font-size: 11px;
  color: #64748b;
}

/* Company Info */
.company-info .company-name {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
}

.company-info .company-email {
  font-size: 11px;
  color: #64748b;
}

/* Address Info */
.address-info .address-text {
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.4;
}

.address-info .address-commune {
  font-size: 11px;
  color: #64748b;
}

/* Count Badges */
.count-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.count-badge.orders {
  background: #dbeafe;
  color: #1e40af;
}

.count-badge.packages {
  background: #dcfce7;
  color: #166534;
}

/* Date Info */
.date-info div {
  margin-bottom: 4px;
  font-size: 11px;
}

.date-label {
  color: #64748b;
  margin-right: 4px;
}

.date-value {
  color: #1e293b;
}

/* Driver Info */
.driver-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.driver-badge.active {
  background: #dcfce7;
  color: #166534;
}

.driver-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.driver-phone {
  font-size: 10px;
  color: #64748b;
  margin-top: 4px;
}

/* ==================== ACTION BUTTONS ==================== */
.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover:not(:disabled):not(.disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-action:disabled,
.btn-action.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action.view { color: #3b82f6; border-color: #93c5fd; }
.btn-action.view:hover { background: #dbeafe; }

.btn-action.assign { color: #059669; border-color: #6ee7b7; }
.btn-action.assign:hover:not(:disabled):not(.disabled) { background: #d1fae5; }

.btn-action.more { color: #64748b; }
.btn-action.more:hover { background: #f1f5f9; }

/* Action Dropdown */
.action-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 20;
  min-width: 140px;
  display: none;
}

.action-dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-item.danger {
  color: #dc2626;
}

.dropdown-item.danger:hover {
  background: #fee2e2;
}

/* ==================== PAGINATION ==================== */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 16px;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #64748b;
  font-size: 14px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-selector select {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.pagination-jump {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
}

.page-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

/* ==================== CHECKBOXES ==================== */
.select-all-checkbox,
.pickup-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.select-all-checkbox:disabled,
.pickup-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== MODAL STYLES ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 24px;
}

.pickup-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.pickup-summary h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.pickup-summary p {
  margin: 8px 0;
  color: #64748b;
}

.driver-selection h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.driver-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #1e293b;
}

.driver-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-primary {
  padding: 8px 16px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 1400px) {
  .col-address { display: none; }
  .action-text { display: none; }
}

@media (max-width: 1200px) {
  .col-company { display: none; }
  .company-email { display: none; }
}

@media (max-width: 1000px) {
  .col-date { display: none; }
  .pickups-table {
    font-size: 12px;
  }
}

@media (max-width: 800px) {
  .col-driver { display: none; }
  .pagination-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .pagination-controls {
    justify-content: center;
  }
  
  .pagination-jump {
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .pickups-table th,
  .pickups-table td {
    padding: 8px 4px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
  
  .btn-action {
    font-size: 10px;
    padding: 4px 6px;
  }
  
  .modal-content {
    width: 95%;
    margin: 20px;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }
}

/* ==================== ANIMATIONS ==================== */
.pickup-row.driver-assigned {
  position: relative;
}

.pickup-row.driver-assigned::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 0 4px 4px 0;
}

.driver-badge.active {
  animation: pulseDriver 3s infinite;
}

@keyframes pulseDriver {
  0%, 100% { 
    box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    transform: scale(1.02);
  }
}

/* ==================== HOVER EFFECTS ==================== */
.pickup-row:hover .count-badge {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

.pickup-row:hover .driver-badge {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

/* ==================== SPECIAL STATES ==================== */
.pickup-row.urgent {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.05), transparent);
  border-left: 4px solid #ef4444;
}

.pickup-row.completed {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.05), transparent);
  border-left: 4px solid #22c55e;
  opacity: 0.8;
}

/* Priority indicators */
.priority-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>