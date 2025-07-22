<template>
  <div class="drivers-page">
    <div class="page-header">
      <h1 class="page-title">Gestión de Conductores</h1>
      <button @click="showAddDriverModal = true" class="btn-primary">+ Agregar Conductor</button>
    </div>

    <div v-if="loading" class="loading-container">Cargando conductores...</div>
    
    <div v-else class="drivers-grid">
      <div v-for="driver in drivers" :key="driver._id" class="driver-card">
        <div class="driver-header">
          <div class="driver-avatar">{{ driver.full_name.charAt(0) }}</div>
          <div class="driver-info">
            <h3 class="driver-name">{{ driver.full_name }}</h3>
            <p class="driver-phone">{{ driver.phone }}</p>
          </div>
        </div>
        <div class="driver-stats">
          <div class="stat-item">
            <span class="stat-value">{{ driver.stats.deliveredThisMonth }}</span>
            <span class="stat-label">Entregas (Mes)</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ driver.stats.totalAssigned }}</span>
            <span class="stat-label">Asignados (Total)</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ driver.stats.issuesCount }}</span>
            <span class="stat-label">Incidencias</span>
          </div>
        </div>
        <div class="driver-actions">
          <button @click="editDriver(driver)" class="action-btn">Editar</button>
          <button @click="deleteDriver(driver._id)" class="action-btn-danger">Eliminar</button>
        </div>
      </div>
    </div>
    
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

  // Filtro de estado basado en campos reales de ShipDay
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
    filtered = filtered.filter(driver => driver.vehicle_type === vehicleFilter.value)
  }

  return filtered
})

const stats = computed(() => {
  const total = drivers.value.length
  
  // Contar basándose en los campos directos de ShipDay
  const active = drivers.value.filter(d => d.isActive === true).length
  const inactive = drivers.value.filter(d => d.isActive === false).length
  const working = drivers.value.filter(d => d.isActive === true && d.isOnShift === true).length
  const available = drivers.value.filter(d => d.isActive === true && d.isOnShift === false).length

  console.log('📊 Stats calculadas:', { 
    total, 
    active, 
    inactive, 
    working, 
    available,
    // Debug: mostrar algunos conductores para verificar
    sampleDrivers: drivers.value.slice(0, 3).map(d => ({
      name: d.name,
      isActive: d.isActive,
      isOnShift: d.isOnShift,
      status: d.status
    }))
  });

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
    const response = await shipdayService.getDrivers()
    const rawData = response.data?.data || response.data || response
    
    console.log('🔍 Datos raw de conductores:', rawData);
    
    // Asegurar que tenemos el status calculado correctamente
    drivers.value = rawData.map(driver => ({
      ...driver,
      // Asegurar que tenemos los campos calculados
      status: calculateStatus(driver),
      // Asegurar campos booleanos
      isActive: Boolean(driver.isActive),
      isOnShift: Boolean(driver.isOnShift)
    }));
    
    console.log('✅ Conductores procesados:', drivers.value.length);
    console.log('📋 Primer conductor:', drivers.value[0]);
    
  } catch (error) {
    console.error('❌ Error cargando conductores:', error)
    showNotification('Error al cargar conductores', 'error')
  } finally {
    loading.value = false
  }
}

// Función helper para calcular status
const calculateStatus = (driver) => {
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
    await shipdayService.deleteDriver(driverToDelete.value.email)
    
    // Remover de la lista local
    drivers.value = drivers.value.filter(d => d.email !== driverToDelete.value.email)
    
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
  updatingStatus.value = driver.email
  try {
    const newStatus = !driver.isActive
    await shipdayService.updateDriver(driver.email, {
      ...driver,
      isActive: newStatus
    })
    
    // Actualizar en la lista local
    const index = drivers.value.findIndex(d => d.email === driver.email)
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
    const index = drivers.value.findIndex(d => d.email === editingDriver.value.email)
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

// Helper functions actualizadas para ShipDay
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

// Helper functions
const getInitials = (name) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'
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
.location-indicator {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.7;
}

.btn-location {
  background: #8b5cf6;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-location:hover {
  background: #7c3aed;
}

.stat-icon.working { background: #fef3c7; }
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

.driver-card.driver-available {
  border-left-color: #10b981;
}

.driver-card.driver-working {
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

.status-dot.status-working {
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

/* Debug Info */
.debug-info {
  margin-bottom: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.debug-info summary {
  cursor: pointer;
  font-weight: 500;
  color: #495057;
}

.debug-info pre {
  margin-top: 8px;
  font-size: 11px;
  background: white;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
}
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