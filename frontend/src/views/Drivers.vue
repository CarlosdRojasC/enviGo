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
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">Total Conductores</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon available">✅</div>
        <div>
          <div class="stat-value">{{ stats.active }}</div>
          <div class="stat-label">Activos</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon working">🚗</div>
        <div>
          <div class="stat-value">{{ stats.working }}</div>
          <div class="stat-label">En Servicio</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon inactive">😴</div>
        <div>
          <div class="stat-value">{{ stats.inactive }}</div>
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
    <div v-else-if="filteredDrivers.length > 0" class="drivers-grid">
      <div 
        v-for="driver in filteredDrivers" 
        :key="driver.email || driver.id || driver._id"
        class="driver-card"
      >
        <!-- Status Badge -->
        <div class="status-badge" :class="getStatusClass(driver)">
          {{ getStatusText(driver) }}
        </div>
        
        <!-- Driver Info -->
        <div class="driver-info">
          <div class="driver-avatar">
            <img 
              v-if="driver.profilePicture || driver.avatar"
              :src="driver.profilePicture || driver.avatar"
              :alt="getDriverName(driver)"
              class="avatar-photo"
              @error="handleImageError"
            />
            <div class="avatar-initials">
              {{ getInitials(getDriverName(driver)) }}
            </div>
          </div>
          
          <div class="driver-details">
            <h3>{{ getDriverName(driver) }}</h3>
            <p>{{ getDriverEmail(driver) }}</p>
            <p>{{ getDriverPhone(driver) }}</p>
            <div class="driver-code">ID: {{ driver.email || driver.id || 'Sin ID' }}</div>
          </div>
        </div>

        <!-- Driver Meta -->
        <div class="driver-meta">
          <span class="vehicle-badge">
            {{ getVehicleIcon(driver.vehicleType) }} {{ driver.vehicleType || 'No especificado' }}
          </span>
          
          <span v-if="driver.plateNumber" class="plate-badge">
            🚗 {{ driver.plateNumber }}
          </span>
          
          <span 
            v-if="hasLocation(driver)" 
            class="location-badge"
            @click="showLocation(driver)"
            style="cursor: pointer;"
          >
            📍 {{ formatCoordinates(
              driver.carrrierLocationLat || driver.location?.lat,
              driver.carrrierLocationLng || driver.location?.lng
            ) }}
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
            @click="toggleDriverStatus(driver)"
            :class="[
              'btn-status',
              driver.isActive ? 'btn-deactivate' : 'btn-activate'
            ]"
            :disabled="updatingStatus === getDriverId(driver)"
          >
            {{ updatingStatus === getDriverId(driver) ? '...' : (driver.isActive ? 'Desactivar' : 'Activar') }}
          </button>
          
          <!-- Edit -->
          <button @click="editDriver(driver)" class="btn-edit">
            ✏️
          </button>
          
          <!-- Delete -->
          <button @click="confirmDelete(driver)" class="btn-delete">
            🗑️
          </button>
          
          <!-- Assign Order (solo si está disponible) -->
          <button
            v-if="driver.isActive && !driver.isOnShift"
            @click="assignOrder(driver)"
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
          ¿Estás seguro de que quieres eliminar a <strong>{{ getDriverName(driverToDelete) }}</strong>?
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
import { ref, computed, onMounted } from 'vue'
import DriverForm from './DriverForm.vue'
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

// Helper functions para manejar datos inconsistentes
const getDriverName = (driver) => {
  return driver?.name || driver?.full_name || driver?.firstName || 'Sin nombre'
}

const getDriverEmail = (driver) => {
  return driver?.email || 'Sin email'
}

const getDriverPhone = (driver) => {
  return driver?.phone || driver?.phoneNumber || driver?.mobile || 'Sin teléfono'
}

const getDriverId = (driver) => {
  return driver?.email || driver?.id || driver?._id || 'unknown'
}

// Computed
const filteredDrivers = computed(() => {
  let filtered = drivers.value

  // Filtro de búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(driver => {
      const name = getDriverName(driver).toLowerCase()
      const email = getDriverEmail(driver).toLowerCase()
      const phone = getDriverPhone(driver)
      
      return name.includes(query) ||
             email.includes(query) ||
             phone.includes(query)
    })
  }

  // Filtro de estado
  if (statusFilter.value) {
    filtered = filtered.filter(driver => {
      switch (statusFilter.value) {
        case 'active':
          return driver.isActive === true
        case 'inactive':
          return driver.isActive === false
        case 'working':
          return driver.isActive === true && driver.isOnShift === true
        case 'available':
          return driver.isActive === true && driver.isOnShift === false
        default:
          return true
      }
    })
  }

  // Filtro de vehículo
  if (vehicleFilter.value) {
    filtered = filtered.filter(driver => 
      driver.vehicleType === vehicleFilter.value
    )
  }

  return filtered
})

const stats = computed(() => {
  const total = drivers.value.length
  const active = drivers.value.filter(d => d.isActive === true).length
  const inactive = drivers.value.filter(d => d.isActive === false).length
  const working = drivers.value.filter(d => d.isActive === true && d.isOnShift === true).length
  const available = drivers.value.filter(d => d.isActive === true && d.isOnShift === false).length

  return { total, active, available, working, inactive }
})

// Lifecycle
onMounted(() => {
  loadDrivers()
})

// Métodos
const loadDrivers = async () => {
  loading.value = true
  try {
    console.log('🔄 Cargando conductores...')
    const response = await shipdayService.getDrivers()
    const rawData = response.data?.data || response.data || response || []
    
    console.log('🔍 Datos raw de conductores:', rawData)
    
    // Procesar y normalizar datos
    drivers.value = (Array.isArray(rawData) ? rawData : []).map(driver => ({
      ...driver,
      status: calculateStatus(driver),
      isActive: Boolean(driver.isActive),
      isOnShift: Boolean(driver.isOnShift)
    }))
    
    console.log('✅ Conductores procesados:', drivers.value.length)
    
  } catch (error) {
    console.error('❌ Error cargando conductores:', error)
    drivers.value = [] // Asegurar que siempre sea un array
    showNotification('Error al cargar conductores: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// Función helper para calcular status
const calculateStatus = (driver) => {
  if (!driver) return 'inactive'
  if (!driver.isActive) return 'inactive'
  if (driver.isOnShift) return 'working'
  return 'available'
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
    const driverId = getDriverId(driverToDelete.value)
    await shipdayService.deleteDriver(driverId)
    
    // Remover de la lista local
    drivers.value = drivers.value.filter(d => 
      getDriverId(d) !== getDriverId(driverToDelete.value)
    )
    
    showNotification('Conductor eliminado exitosamente', 'success')
    closeDeleteModal()
  } catch (error) {
    console.error('❌ Error eliminando conductor:', error)
    showNotification('Error al eliminar conductor: ' + error.message, 'error')
  } finally {
    deleting.value = false
  }
}

const toggleDriverStatus = async (driver) => {
  const driverId = getDriverId(driver)
  updatingStatus.value = driverId
  
  try {
    const newStatus = !driver.isActive
    await shipdayService.updateDriver(driverId, {
      ...driver,
      isActive: newStatus
    })
    
    // Actualizar en la lista local
    const index = drivers.value.findIndex(d => getDriverId(d) === driverId)
    if (index !== -1) {
      drivers.value[index].isActive = newStatus
      drivers.value[index].status = newStatus ? 'available' : 'inactive'
    }
    
    showNotification(
      `Conductor ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      'success'
    )
  } catch (error) {
    console.error('❌ Error actualizando estado:', error)
    showNotification('Error al actualizar estado del conductor: ' + error.message, 'error')
  } finally {
    updatingStatus.value = null
  }
}

const assignOrder = (driver) => {
  console.log('Asignar orden a:', driver)
  showNotification('Función de asignación en desarrollo', 'info')
}

const handleDriverSuccess = (event) => {
  if (editingDriver.value) {
    // Actualizar conductor existente
    const index = drivers.value.findIndex(d => 
      getDriverId(d) === getDriverId(editingDriver.value)
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

const showLocation = (driver) => {
  const lat = driver.carrrierLocationLat || driver.location?.lat
  const lng = driver.carrrierLocationLng || driver.location?.lng
  
  if (lat && lng) {
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}&zoom=15`
    window.open(googleMapsUrl, '_blank')
  } else {
    showNotification('Ubicación no disponible', 'info')
  }
}

const hasLocation = (driver) => {
  return (driver.carrrierLocationLat && driver.carrrierLocationLng) || 
         (driver.location?.lat && driver.location?.lng)
}

const formatCoordinates = (lat, lng) => {
  if (!lat || !lng) return 'N/A'
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`
}

const handleImageError = (event) => {
  // Si la imagen falla al cargar, ocultar la imagen y mostrar iniciales
  event.target.style.display = 'none'
  event.target.nextElementSibling.style.display = 'flex'
}

// Helper functions para UI
const getStatusClass = (driver) => {
  if (!driver.isActive) return 'status-inactive'
  if (driver.isOnShift) return 'status-working'
  return 'status-available'
}

const getStatusText = (driver) => {
  if (!driver.isActive) return 'Inactivo'
  if (driver.isOnShift) return 'En Turno'
  return 'Disponible'
}

// Helper function mejorada para iniciales
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '??'
  
  const cleanName = name.trim()
  if (cleanName.length === 0) return '??'
  
  const words = cleanName.split(' ').filter(word => word.length > 0)
  
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
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