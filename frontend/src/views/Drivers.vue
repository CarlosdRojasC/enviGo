<template>
  <div class="drivers-management">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Gestión de Conductores</h1>
        <p class="page-subtitle">Administra tu flota de conductores y su disponibilidad</p>
      </div>
      <button @click="showCreateForm = true" class="btn-primary">
        <i class="icon-plus"></i>
        Nuevo Conductor
      </button>
    </div>

    <!-- Filtros y Búsqueda -->
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
          <option value="busy">Ocupados</option>
          <option value="available">Disponibles</option>
        </select>
        
        <select v-model="vehicleFilter" class="filter-select">
          <option value="">Todos los vehículos</option>
          <option value="car">🚗 Auto</option>
          <option value="motorcycle">🏍️ Moto</option>
          <option value="bicycle">🚲 Bicicleta</option>
          <option value="truck">🚚 Camión</option>
          <option value="van">🚐 Furgoneta</option>
        </select>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon active">👥</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.total }}</div>
          <div class="stat-label">Total Conductores</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon available">✅</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.available }}</div>
          <div class="stat-label">Disponibles</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon busy">🚚</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.busy }}</div>
          <div class="stat-label">En Servicio</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon inactive">⏸️</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.inactive }}</div>
          <div class="stat-label">Inactivos</div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando conductores...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && drivers.length === 0" class="empty-state">
      <div class="empty-icon">🚗</div>
      <h3>No hay conductores registrados</h3>
      <p>Comienza agregando tu primer conductor a la flota</p>
      <button @click="showCreateForm = true" class="btn-primary">
        Agregar Primer Conductor
      </button>
    </div>

    <!-- Drivers Grid -->
    <div v-else class="drivers-grid">
      <div
        v-for="driver in filteredDrivers"
        :key="driver.carrierId || driver.email"
        class="driver-card"
        :class="{ 
          'driver-active': driver.is_active && driver.status === 'available',
          'driver-busy': driver.status === 'busy',
          'driver-inactive': !driver.is_active 
        }"
      >
        <!-- Status Indicator -->
        <div class="status-indicator">
          <div class="status-dot" :class="getStatusClass(driver)"></div>
          <span class="status-text">{{ getStatusText(driver) }}</span>
        </div>

        <!-- Driver Info -->
        <div class="driver-info">
          <div class="driver-avatar">
            {{ getInitials(driver.name) }}
          </div>
          
          <div class="driver-details">
            <h3 class="driver-name">{{ driver.name }}</h3>
            <p class="driver-email">{{ driver.email }}</p>
            <p class="driver-phone">{{ driver.phone || driver.phoneNumber }}</p>
            
            <div class="driver-meta">
              <span v-if="driver.vehicle_type" class="vehicle-badge">
                {{ getVehicleIcon(driver.vehicle_type) }} {{ driver.vehicle_type }}
              </span>
              <span v-if="driver.vehicle_plate" class="plate-badge">
                🏷️ {{ driver.vehicle_plate }}
              </span>
            </div>
          </div>
        </div>

        <!-- Driver Stats -->
        <div class="driver-stats">
          <div class="stat-item">
            <span class="stat-value">{{ driver.completed_orders || 0 }}</span>
            <span class="stat-label">Entregas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ driver.rating || 'N/A' }}</span>
            <span class="stat-label">Rating</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="driver-actions">
          <!-- Toggle Status -->
          <button
            @click="toggleDriverStatus(driver)"
            :class="[
              'btn-status',
              driver.is_active ? 'btn-deactivate' : 'btn-activate'
            ]"
            :disabled="updatingStatus === (driver.carrierId || driver.email)"
          >
            {{ updatingStatus === (driver.carrierId || driver.email) ? '...' : (driver.is_active ? 'Desactivar' : 'Activar') }}
          </button>
          
          <!-- Edit -->
          <button @click="editDriver(driver)" class="btn-edit">
            ✏️
          </button>
          
          <!-- Delete -->
          <button @click="confirmDelete(driver)" class="btn-delete">
            🗑️
          </button>
          
          <!-- Assign Order (if available) -->
          <button
            v-if="driver.is_active && driver.status === 'available'"
            @click="assignOrder(driver)"
            class="btn-assign"
          >
            📦 Asignar
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Create/Edit Driver Modal -->
    <div v-if="showCreateForm || editingDriver" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <DriverForm
          :driver="editingDriver"
          @success="handleDriverSuccess"
          @cancel="closeModals"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="driverToDelete" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content delete-modal" @click.stop>
        <div class="delete-icon">⚠️</div>
        <h3>¿Eliminar Conductor?</h3>
        <p>
          ¿Estás seguro de que quieres eliminar a <strong>{{ driverToDelete.name }}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div class="delete-actions">
          <button @click="closeDeleteModal" class="btn-cancel">Cancelar</button>
          <button @click="deleteDriver" :disabled="deleting" class="btn-delete-confirm">
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
import { ref, computed, onMounted, watch } from 'vue'
import DriverForm from './DriverForm.vue' // Tu componente existente
import { shipdayService } from '../services/shipday'

// Estado
const drivers = ref([])
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const vehicleFilter = ref('')
const showCreateForm = ref(false)
const editingDriver = ref(null)
const driverToDelete = ref(null)
const deleting = ref(false)
const updatingStatus = ref(null)
const notification = ref(null)

// Computed
const filteredDrivers = computed(() => {
  let filtered = drivers.value

  // Filtro de búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(driver => 
      driver.name?.toLowerCase().includes(query) ||
      driver.email?.toLowerCase().includes(query) ||
      driver.phone?.includes(query) ||
      driver.phoneNumber?.includes(query)
    )
  }

  // Filtro de estado
  if (statusFilter.value) {
    filtered = filtered.filter(driver => {
      switch (statusFilter.value) {
        case 'active':
          return driver.is_active
        case 'inactive':
          return !driver.is_active
        case 'busy':
          return driver.status === 'busy'
        case 'available':
          return driver.is_active && driver.status === 'available'
        default:
          return true
      }
    })
  }

  // Filtro de vehículo
  if (vehicleFilter.value) {
    filtered = filtered.filter(driver => driver.vehicle_type === vehicleFilter.value)
  }

  return filtered
})

const stats = computed(() => {
  const total = drivers.value.length
  const active = drivers.value.filter(d => d.is_active).length
  const available = drivers.value.filter(d => d.is_active && d.status === 'available').length
  const busy = drivers.value.filter(d => d.status === 'busy').length
  const inactive = drivers.value.filter(d => !d.is_active).length

  return { total, active, available, busy, inactive }
})

// Lifecycle
onMounted(() => {
  loadDrivers()
})

// Métodos
const loadDrivers = async () => {
  loading.value = true
  try {
    const response = await shipdayService.getDrivers()
    drivers.value = response.data.data || response.data || response // Manejo de diferentes estructuras
    console.log('✅ Conductores cargados:', drivers.value)
  } catch (error) {
    console.error('❌ Error cargando conductores:', error)
    showNotification('Error al cargar conductores', 'error')
  } finally {
    loading.value = false
  }
}

const editDriver = (driver) => {
  editingDriver.value = { ...driver }
}

const confirmDelete = (driver) => {
  driverToDelete.value = driver
}

const deleteDriver = async () => {
  if (!driverToDelete.value) return

  deleting.value = true
  try {
    await shipdayService.deleteDriver(driverToDelete.value.carrierId || driverToDelete.value.email)
    
    // Remover de la lista local
    drivers.value = drivers.value.filter(d => 
      (d.carrierId !== driverToDelete.value.carrierId) && (d.email !== driverToDelete.value.email)
    )
    
    showNotification('Conductor eliminado exitosamente', 'success')
    closeDeleteModal()
  } catch (error) {
    console.error('❌ Error eliminando conductor:', error)
    showNotification('Error al eliminar conductor', 'error')
  } finally {
    deleting.value = false
  }
}

const toggleDriverStatus = async (driver) => {
  updatingStatus.value = driver.carrierId || driver.email
  try {
    const newStatus = !driver.is_active
    await shipdayService.updateDriver(driver.carrierId || driver.email, {
      ...driver,
      is_active: newStatus
    })
    
    // Actualizar en la lista local
    const index = drivers.value.findIndex(d => 
      (d.carrierId === driver.carrierId) || (d.email === driver.email)
    )
    if (index !== -1) {
      drivers.value[index].is_active = newStatus
      drivers.value[index].status = newStatus ? 'available' : 'inactive'
    }
    
    showNotification(
      `Conductor ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      'success'
    )
  } catch (error) {
    console.error('❌ Error actualizando estado:', error)
    showNotification('Error al actualizar estado del conductor', 'error')
  } finally {
    updatingStatus.value = null
  }
}

const assignOrder = (driver) => {
  // TODO: Implementar asignación de órdenes
  console.log('Asignar orden a:', driver)
  showNotification('Función de asignación en desarrollo', 'info')
}

const handleDriverSuccess = (event) => {
  if (editingDriver.value) {
    // Actualizar conductor existente
    const index = drivers.value.findIndex(d => 
      (d.carrierId === editingDriver.value.carrierId) || (d.email === editingDriver.value.email)
    )
    if (index !== -1) {
      drivers.value[index] = { ...event.driver }
    }
  } else {
    // Agregar nuevo conductor
    drivers.value.push(event.driver)
  }
  
  showNotification(event.message, 'success')
  closeModals()
}

const closeModals = () => {
  showCreateForm.value = false
  editingDriver.value = null
}

const closeDeleteModal = () => {
  driverToDelete.value = null
}

const showNotification = (message, type = 'info') => {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

// Helper functions
const getInitials = (name) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'
}

const getStatusClass = (driver) => {
  if (!driver.is_active) return 'status-inactive'
  if (driver.status === 'busy') return 'status-busy'
  return 'status-available'
}

const getStatusText = (driver) => {
  if (!driver.is_active) return 'Inactivo'
  if (driver.status === 'busy') return 'Ocupado'
  return 'Disponible'
}

const getVehicleIcon = (type) => {
  const icons = {
    car: '🚗',
    motorcycle: '🏍️',
    bicycle: '🚲',
    truck: '🚚',
    van: '🚐'
  }
  return icons[type] || '🚗'
}
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
.stat-icon.busy { background: #fef3c7; }
.stat-icon.inactive { background: #f3f4f6; }

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  color: #6b7280;
  font-size: 14px;
}

/* Loading & Empty States */
.loading-state {
  text-align: center;
  padding: 64px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 64px 0;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

/* Drivers Grid */
.drivers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.driver-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  border-left: 4px solid #e5e7eb;
}

.driver-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.driver-card.driver-active {
  border-left-color: #10b981;
}

.driver-card.driver-busy {
  border-left-color: #f59e0b;
}

.driver-card.driver-inactive {
  border-left-color: #ef4444;
}

/* Status */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.status-available {
  background: #10b981;
}

.status-dot.status-busy {
  background: #f59e0b;
}

.status-dot.status-inactive {
  background: #ef4444;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
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

.driver-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.vehicle-badge,
.plate-badge {
  background: #f3f4f6;
  color: #374151;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
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
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.delete-modal {
  padding: 24px;
  text-align: center;
  max-width: 400px;
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
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-delete-confirm {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1001;
}

.toast.success { background: #10b981; }
.toast.error { background: #ef4444; }
.toast.info { background: #3b82f6; }

.toast-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 18px;
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
    min-width: unset;
  }
  
  .drivers-grid {
    grid-template-columns: 1fr;
  }
  
  .driver-actions {
    justify-content: center;
  }
}
</style>