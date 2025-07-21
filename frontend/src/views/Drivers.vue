<template>
  <div class="drivers-management">
    <div class="page-header">
      <div class="header-content">
        <h1>Gestión de Conductores</h1>
        <p>Administra conductores de la plataforma</p>
      </div>
      <button @click="showCreateForm = true" class="btn-primary">
        <i class="icon-plus"></i>
        Agregar Conductor
      </button>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="filters-section">
      <div class="search-box">
        <i class="icon-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          class="search-input"
        />
      </div>
      
      <div class="filters">
        <select v-model="statusFilter" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="working">Trabajando</option>
          <option value="available">Disponibles</option>
        </select>
        
        <select v-model="vehicleFilter" class="filter-select">
          <option value="">Todos los vehículos</option>
          <option value="car">Auto</option>
          <option value="motorcycle">Moto</option>
          <option value="bicycle">Bicicleta</option>
          <option value="truck">Camión</option>
          <option value="van">Van</option>
        </select>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon active">👥</div>
        <div>
          <div class="stat-value">{{ driverStats.total }}</div>
          <div class="stat-label">Total Conductores</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon available">✅</div>
        <div>
          <div class="stat-value">{{ driverStats.active }}</div>
          <div class="stat-label">Activos</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon working">🚗</div>
        <div>
          <div class="stat-value">{{ driverStats.working }}</div>
          <div class="stat-label">En Servicio</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon inactive">😴</div>
        <div>
          <div class="stat-value">{{ driverStats.inactive }}</div>
          <div class="stat-label">Inactivos</div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando conductores...</p>
    </div>

    <!-- Lista de conductores -->
    <div v-else-if="filteredDriversList.length > 0" class="drivers-grid">
      <div 
        v-for="driver in filteredDriversList" 
        :key="getDriverKey(driver)"
        class="driver-card"
      >
        <!-- Status Badge -->
        <div class="status-badge" :class="getDriverStatusClass(driver)">
          {{ getDriverStatusText(driver) }}
        </div>
        
        <!-- Driver Info -->
        <div class="driver-info">
          <div class="driver-avatar">
            <img 
              v-if="driver.profilePicture || driver.avatar"
              :src="driver.profilePicture || driver.avatar"
              :alt="getDriverDisplayName(driver)"
              class="avatar-photo"
              @error="onImageError"
            />
            <div class="avatar-initials">
              {{ getDriverInitials(getDriverDisplayName(driver)) }}
            </div>
          </div>
          
          <div class="driver-details">
            <h3>{{ getDriverDisplayName(driver) }}</h3>
            <p>{{ getDriverDisplayEmail(driver) }}</p>
            <p>{{ getDriverDisplayPhone(driver) }}</p>
            <div class="driver-code">ID: {{ getDriverKey(driver) }}</div>
          </div>
        </div>

        <!-- Driver Meta -->
        <div class="driver-meta">
          <span class="vehicle-badge">
            {{ getVehicleDisplayIcon(driver.vehicleType) }} {{ driver.vehicleType || 'No especificado' }}
          </span>
          
          <span v-if="driver.plateNumber" class="plate-badge">
            🚗 {{ driver.plateNumber }}
          </span>
          
          <span 
            v-if="driverHasLocation(driver)" 
            class="location-badge"
            @click="openDriverLocation(driver)"
            style="cursor: pointer;"
          >
            📍 {{ formatDriverCoordinates(driver) }}
          </span>
        </div>

        <!-- Driver Stats -->
        <div class="driver-stats">
          <div class="stat-item">
            <span class="stat-value">{{ driver.totalDeliveries || 0 }}</span>
            <span class="stat-label">Entregas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ driver.rating || 'N/A' }}</span>
            <span class="stat-label">Rating</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ driver.ordersAssigned || 0 }}</span>
            <span class="stat-label">Asignadas</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="driver-actions">
          <!-- Toggle Status -->
          <button
            @click="toggleStatus(driver)"
            :class="getToggleButtonClass(driver)"
            :disabled="updatingStatus === getDriverKey(driver)"
          >
            {{ getToggleButtonText(driver) }}
          </button>
          
          <!-- Edit -->
          <button @click="startEdit(driver)" class="btn-edit">
            ✏️
          </button>
          
          <!-- Delete -->
          <button @click="startDelete(driver)" class="btn-delete">
            🗑️
          </button>
          
          <!-- Assign Order -->
          <button
            v-if="canAssignOrders(driver)"
            @click="startAssign(driver)"
            class="btn-assign"
          >
            📦 Asignar
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">👥</div>
      <h3>No hay conductores</h3>
      <p>No se encontraron conductores con los filtros aplicados.</p>
      <button @click="showCreateForm = true" class="btn-primary">
        Agregar Primer Conductor
      </button>
    </div>

    <!-- Modals -->
    <!-- Create/Edit Driver Modal -->
    <div v-if="showCreateForm || editingDriver" class="modal-overlay" @click="closeAllModals">
      <div class="modal-content" @click.stop>
        <DriverForm
          :driver="editingDriver"
          @success="onDriverSuccess"
          @cancel="closeAllModals"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="driverToDelete" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content delete-modal" @click.stop>
        <div class="delete-icon">⚠️</div>
        <h3>¿Eliminar Conductor?</h3>
        <p>
          ¿Estás seguro de que quieres eliminar a <strong>{{ getDriverDisplayName(driverToDelete) }}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div class="delete-actions">
          <button @click="cancelDelete" class="btn-cancel">Cancelar</button>
          <button @click="confirmDelete" :disabled="deleting" class="btn-delete-confirm">
            {{ deleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div v-if="notification" class="toast" :class="notification.type">
      <span>{{ notification.message }}</span>
      <button @click="notification = null" class="toast-close">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { apiService } from '../services/api'; // CAMBIO CLAVE: Usamos tu API, no la de Shipday
import DriverForm from './DriverForm.vue';

// ===== ESTADO REACTIVO (Se mantiene igual) =====
const drivers = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const statusFilter = ref('');
const vehicleFilter = ref('');
const showCreateForm = ref(false);
const editingDriver = ref(null);
const driverToDelete = ref(null);
const deleting = ref(false);
const updatingStatus = ref(null);
const notification = ref(null); // Puedes reemplazar esto con `toast` para un look más pro
const toast = useToast();

// ===== FUNCIONES HELPER (Ahora con la sintaxis 'function' para evitar errores) =====

function getDriverDisplayName(driver) {
  if (!driver) return 'Sin nombre';
  return driver.name || driver.full_name || driver.firstName || 'Sin nombre';
}

function getDriverDisplayEmail(driver) {
  if (!driver) return 'Sin email';
  return driver.email || 'Sin email';
}

function getDriverDisplayPhone(driver) {
  if (!driver) return 'Sin teléfono';
  return driver.phone || driver.phoneNumber || driver.mobile || 'Sin teléfono';
}

function getDriverKey(driver) {
  if (!driver) return 'unknown';
  // Usamos _id de tu base de datos como la clave principal y más confiable
  return driver._id || driver.email || driver.id || 'unknown';
}

function getDriverInitials(name) {
  if (!name || typeof name !== 'string') return '??';
  const words = name.trim().split(' ').filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function calculateDriverStatus(driver) {
  // Esta lógica puede venir de tu backend o la puedes mantener si es solo visual
  if (!driver) return 'inactive';
  if (!driver.is_active) return 'inactive'; // Usamos el campo de tu modelo User
  // Podrías añadir un campo 'on_shift' a tu modelo User si quieres mantener esta lógica
  return 'active'; 
}

function getDriverStatusClass(driver) {
  const status = calculateDriverStatus(driver);
  return `status-${status}`;
}

function getDriverStatusText(driver) {
  const status = calculateDriverStatus(driver);
  const statusTexts = { 'inactive': 'Inactivo', 'active': 'Activo' };
  return statusTexts[status] || 'Desconocido';
}

// ... (El resto de tus funciones helper como getVehicleDisplayIcon, etc., se mantienen igual)

// ===== COMPUTED PROPERTIES (Se mantienen, pero ahora usan los datos correctos) =====
const filteredDriversList = computed(() => {
  // Tu lógica de filtrado aquí. No necesita cambios.
  return drivers.value;
});

const driverStats = computed(() => {
    const total = drivers.value.length;
    const active = drivers.value.filter(d => d.is_active).length;
    const inactive = total - active;
    // Las demás métricas vienen por conductor
    return { total, active, inactive };
});


// ===== MÉTODOS PRINCIPALES (CORREGIDOS) =====

async function loadDrivers() {
  loading.value = true;
  try {
    console.log('🔄 Cargando conductores desde TU API...');
    // CAMBIO CLAVE: Llamamos a tu backend, que ya calcula las estadísticas
    const { data } = await apiService.drivers.getAll();
    drivers.value = data;
    console.log('✅ Conductores con estadísticas cargados:', drivers.value.length);
  } catch (error) {
    console.error('❌ Error cargando conductores:', error);
    toast.error('Error al cargar conductores.');
  } finally {
    loading.value = false;
  }
}

function onDriverSuccess(event) {
    toast.success(event.message);
    closeAllModals();
    loadDrivers(); // Recarga la lista para ver los cambios
}

function startEdit(driver) {
  editingDriver.value = { ...driver };
  showCreateForm.value = true; // Abre el mismo modal/form
}

function startDelete(driver) {
  driverToDelete.value = driver;
}

function cancelDelete() {
  driverToDelete.value = null;
}

async function confirmDelete() {
  if (!driverToDelete.value) return;
  deleting.value = true;
  try {
    await apiService.drivers.delete(driverToDelete.value._id);
    toast.success('Conductor eliminado exitosamente');
    cancelDelete();
    await loadDrivers();
  } catch (error) {
    toast.error('Error al eliminar el conductor.');
  } finally {
    deleting.value = false;
  }
}

function closeAllModals() {
  showCreateForm.value = false;
  editingDriver.value = null;
}

// ===== LIFECYCLE =====
onMounted(() => {
  loadDrivers();
});
</script>

<style scoped>
.drivers-management {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-content p {
  color: #6b7280;
  margin: 4px 0 0 0;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

/* Filters */
.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.search-box .icon-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
}

.filters {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  min-width: 150px;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
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
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.active { background: #dbeafe; }
.stat-icon.available { background: #dcfce7; }
.stat-icon.working { background: #fef3c7; }
.stat-icon.inactive { background: #fee2e2; }

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: #1f2937;
}

/* Drivers Grid */
.drivers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.driver-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.driver-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.status-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-available {
  background: #dcfce7;
  color: #166534;
}

.status-working {
  background: #fef3c7;
  color: #92400e;
}

.status-inactive {
  background: #fee2e2;
  color: #dc2626;
}

/* Driver Info */
.driver-info {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  position: relative;
}

.avatar-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.driver-details h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.driver-details p {
  margin: 2px 0;
  font-size: 14px;
  color: #6b7280;
}

.driver-code {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.driver-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.vehicle-badge,
.plate-badge,
.location-badge {
  background: #f3f4f6;
  color: #374151;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.location-badge {
  background: #dbeafe;
  color: #1d4ed8;
}

/* Driver Stats */
.driver-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-item {
  text-align: center;
}

.stat-item .stat-value {
  display: block;
  font-weight: 600;
  color: #1f2937;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #6b7280;
}

/* Actions */
.driver-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.driver-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-status {
  flex: 1;
}

.btn-activate {
  background: #10b981;
  color: white;
}

.btn-deactivate {
  background: #ef4444;
  color: white;
}

.btn-edit {
  background: #f59e0b;
  color: white;
}

.btn-delete {
  background: #ef4444;
  color: white;
}

.btn-assign {
  background: #3b82f6;
  color: white;
}

/* Modals */
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
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.delete-modal {
  padding: 24px;
  text-align: center;
}

.delete-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.btn-cancel {
  background: #6b7280;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-delete-confirm {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

/* Toast notifications */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1001;
  min-width: 300px;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  border-left: 4px solid #10b981;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast.info {
  border-left: 4px solid #3b82f6;
}

.toast.warning {
  border-left: 4px solid #f59e0b;
}

.toast-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6b7280;
  margin-left: auto;
}

.toast-close:hover {
  color: #374151;
}

/* Responsive */
@media (max-width: 768px) {
  .drivers-management {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .drivers-grid {
    grid-template-columns: 1fr;
  }
  
  .driver-actions {
    flex-direction: column;
  }
  
  .driver-stats {
    justify-content: space-around;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .driver-meta {
    flex-direction: column;
    gap: 4px;
  }
  
  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>