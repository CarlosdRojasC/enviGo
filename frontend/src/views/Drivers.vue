<template>
  <div class="drivers-management">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <i class="icon-truck"></i>
          Gestión de Conductores
        </h1>
        <p class="page-subtitle">Administra tu flota de conductores, historial y rendimiento</p>
      </div>
      <div class="header-actions">
        <button @click="exportDriversReport" class="btn-export">
          <i class="icon-download"></i>
          Exportar Reporte
        </button>
        <button @click="showCreateForm = true" class="btn-primary">
          <i class="icon-plus"></i>
          Nuevo Conductor
        </button>
      </div>
    </div>

    <!-- Quick Actions & Real-time Status -->
    <div class="quick-actions-bar">
      <div class="realtime-status">
        <div class="status-item">
          <div class="pulse-dot available"></div>
          <span>{{ stats.availableNow }} disponibles ahora</span>
        </div>
        <div class="status-item">
          <div class="pulse-dot working"></div>
          <span>{{ stats.working }} en ruta</span>
        </div>
        <div class="status-item">
          <div class="pulse-dot offline"></div>
          <span>{{ stats.offline }} offline</span>
        </div>
        <div class="last-update">
          Actualizado: {{ formatTime(lastUpdate) }}
          <button @click="refreshData" class="btn-refresh" :class="{ spinning: refreshing }">
            <i class="icon-refresh"></i>
          </button>
        </div>
      </div>
      
      <div class="quick-actions">
        <button @click="bulkAssignOrders" class="btn-bulk" :disabled="selectedDrivers.length === 0">
          <i class="icon-truck"></i>
          Asignar Masivo ({{ selectedDrivers.length }})
        </button>
        <button @click="showAnalytics = !showAnalytics" class="btn-analytics">
          <i class="icon-chart"></i>
          Analytics
        </button>
      </div>
    </div>

    <!-- Analytics Panel (Collapsible) -->
    <div v-if="showAnalytics" class="analytics-panel">
      <div class="analytics-grid">
        <div class="metric-card">
          <h4>Eficiencia Promedio</h4>
          <div class="metric-value">{{ analytics.avgEfficiency }}%</div>
          <div class="metric-trend" :class="analytics.efficiencyTrend">
            <i :class="getTrendIcon(analytics.efficiencyTrend)"></i>
            {{ analytics.efficiencyChange }}%
          </div>
        </div>
        
        <div class="metric-card">
          <h4>Entregas Hoy</h4>
          <div class="metric-value">{{ analytics.deliveriesToday }}</div>
          <div class="metric-subtitle">{{ analytics.deliveriesGoal }} objetivo</div>
        </div>
        
        <div class="metric-card">
          <h4>Tiempo Respuesta</h4>
          <div class="metric-value">{{ analytics.avgResponseTime }}min</div>
          <div class="metric-subtitle">Promedio semanal</div>
        </div>
        
        <div class="metric-card">
          <h4>Satisfacción</h4>
          <div class="metric-value">{{ analytics.customerSatisfaction }}/5</div>
          <div class="metric-subtitle">{{ analytics.totalRatings }} evaluaciones</div>
        </div>
      </div>
    </div>

    <!-- Enhanced Filters -->
    <div class="filters-section">
      <div class="search-box">
        <i class="icon-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar conductores..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">×</button>
      </div>
      
      <div class="filters">
        <select v-model="statusFilter" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="available">🟢 Disponibles</option>
          <option value="working">🟡 En ruta</option>
          <option value="busy">🔴 Ocupados</option>
          <option value="offline">⚫ Offline</option>
        </select>
        
        <select v-model="vehicleFilter" class="filter-select">
          <option value="">Todos los vehículos</option>
          <option value="car">🚗 Auto</option>
          <option value="motorcycle">🏍️ Moto</option>
          <option value="bicycle">🚲 Bicicleta</option>
          <option value="truck">🚚 Camión</option>
          <option value="van">🚐 Furgoneta</option>
        </select>
        
        <select v-model="zoneFilter" class="filter-select">
          <option value="">Todas las zonas</option>
          <option v-for="zone in zones" :key="zone" :value="zone">{{ zone }}</option>
        </select>
        
        <select v-model="sortBy" class="filter-select">
          <option value="name">Ordenar por nombre</option>
          <option value="efficiency">Por eficiencia</option>
          <option value="deliveries">Por entregas</option>
          <option value="rating">Por calificación</option>
          <option value="lastActivity">Por actividad</option>
        </select>
      </div>
    </div>

    <!-- Enhanced Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.total }}</div>
          <div class="stat-label">Total Conductores</div>
          <div class="stat-change positive">+{{ stats.newThisWeek }} esta semana</div>
        </div>
      </div>
      
      <div class="stat-card success">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.availableNow }}</div>
          <div class="stat-label">Disponibles Ahora</div>
          <div class="stat-percentage">{{ getPercentage(stats.availableNow, stats.total) }}%</div>
        </div>
      </div>
      
      <div class="stat-card warning">
        <div class="stat-icon">🚚</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.working }}</div>
          <div class="stat-label">En Ruta</div>
          <div class="stat-subtitle">{{ stats.totalActiveOrders }} órdenes activas</div>
        </div>
      </div>
      
      <div class="stat-card info">
        <div class="stat-icon">⚡</div>
        <div class="stat-content">
          <div class="stat-number">{{ stats.avgDeliveryTime }}min</div>
          <div class="stat-label">Tiempo Promedio</div>
          <div class="stat-change negative">-5min vs ayer</div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando conductores...</p>
    </div>

    <!-- Enhanced Drivers Grid -->
    <div v-else-if="filteredDrivers.length > 0" class="drivers-grid">
      <div
        v-for="driver in paginatedDrivers"
        :key="driver.id || driver.email"
        class="driver-card enhanced"
        :class="getDriverCardClass(driver)"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="status-indicator">
            <div class="status-dot" :class="getStatusClass(driver)">
              <div class="pulse-ring" v-if="driver.status === 'working'"></div>
            </div>
            <span class="status-text">{{ getStatusText(driver) }}</span>
          </div>
          
          <div class="card-actions">
            <input 
              type="checkbox" 
              v-model="selectedDrivers" 
              :value="driver.id"
              class="driver-checkbox"
            >
            <div class="dropdown">
              <button class="btn-menu" @click="toggleMenu(driver.id)">⋮</button>
              <div v-if="activeMenu === driver.id" class="dropdown-menu">
                <button @click="viewHistory(driver)">📊 Ver Historial</button>
                <button @click="viewLocation(driver)" v-if="hasLocation(driver)">📍 Ubicación</button>
                <button @click="editDriver(driver)">✏️ Editar</button>
                <button @click="toggleStatus(driver)">
                  {{ driver.isActive ? '⏸️ Pausar' : '▶️ Activar' }}
                </button>
                <button @click="confirmDelete(driver)" class="danger">🗑️ Eliminar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Driver Profile -->
        <div class="driver-profile">
          <div class="driver-avatar">
            <img 
              v-if="driver.avatar || driver.carrierPhoto" 
              :src="driver.avatar || driver.carrierPhoto" 
              :alt="driver.name"
              class="avatar-photo"
              @error="handleImageError"
            />
            <span v-else class="avatar-initials">{{ getInitials(driver.name) }}</span>
            <div v-if="driver.isOnline" class="online-indicator"></div>
          </div>
          
          <div class="driver-info">
            <h3 class="driver-name">{{ driver.name }}</h3>
            <p class="driver-contact">
              <i class="icon-mail"></i>{{ driver.email }}
            </p>
            <p class="driver-contact">
              <i class="icon-phone"></i>{{ driver.phone || driver.phoneNumber }}
            </p>
            
            <div class="driver-tags">
              <span v-if="driver.vehicleType || driver.vehicle_type" class="tag vehicle">
                {{ getVehicleIcon(driver.vehicleType || driver.vehicle_type) }} 
                {{ driver.vehicleType || driver.vehicle_type }}
              </span>
              <span v-if="driver.zone" class="tag zone">📍 {{ driver.zone }}</span>
              <span v-if="driver.isTopPerformer" class="tag star">⭐ Top</span>
              <span v-if="driver.codeName" class="tag code">🏷️ {{ driver.codeName }}</span>
            </div>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="performance-metrics">
          <div class="metric">
            <span class="metric-label">Entregas</span>
            <span class="metric-value">{{ driver.totalDeliveries || 0 }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Eficiencia</span>
            <span class="metric-value">{{ driver.efficiency || 0 }}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Rating</span>
            <span class="metric-value">
              <i class="icon-star"></i>{{ driver.rating || 0 }}/5
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">Última actividad</span>
            <span class="metric-value">{{ formatTimeAgo(driver.lastActivity) }}</span>
          </div>
        </div>

        <!-- Current Order (if working) -->
        <div v-if="driver.currentOrder" class="current-order">
          <div class="order-header">
            <i class="icon-package"></i>
            <span>Orden en curso</span>
          </div>
          <div class="order-info">
            <span class="order-number">#{{ driver.currentOrder.number }}</span>
            <span class="order-destination">{{ driver.currentOrder.destination }}</span>
            <span class="order-time">{{ driver.currentOrder.estimatedTime }}min</span>
          </div>
          <div class="order-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: driver.currentOrder.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ driver.currentOrder.progress }}%</span>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-grid">
          <button 
            v-if="driver.status === 'available'" 
            @click="quickAssign(driver)" 
            class="btn-action primary"
          >
            <i class="icon-truck"></i>
            Asignar Orden
          </button>
          
          <button 
            v-if="hasLocation(driver)" 
            @click="trackDriver(driver)" 
            class="btn-action secondary"
          >
            <i class="icon-location"></i>
            Rastrear
          </button>
          
          <button @click="contactDriver(driver)" class="btn-action secondary">
            <i class="icon-message"></i>
            Contactar
          </button>
          
          <button @click="viewHistory(driver)" class="btn-action info">
            <i class="icon-chart"></i>
            Historial
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && drivers.length === 0" class="empty-state">
      <div class="empty-illustration">🚗💨</div>
      <h3>No hay conductores registrados</h3>
      <p>Comienza agregando conductores a tu flota para gestionar entregas</p>
      <button @click="showCreateForm = true" class="btn-primary large">
        <i class="icon-plus"></i>
        Agregar Primer Conductor
      </button>
    </div>

    <!-- No Results State -->
    <div v-else-if="!loading && filteredDrivers.length === 0" class="no-results-state">
      <div class="no-results-icon">🔍</div>
      <h3>No se encontraron conductores</h3>
      <p>Intenta ajustar los filtros de búsqueda</p>
      <button @click="clearFilters" class="btn-secondary">
        Limpiar Filtros
      </button>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="currentPage--" 
        :disabled="currentPage === 1"
        class="btn-page"
      >
        ← Anterior
      </button>
      
      <div class="page-numbers">
        <button 
          v-for="page in visiblePages" 
          :key="page"
          @click="currentPage = page"
          class="btn-page-num"
          :class="{ active: currentPage === page }"
        >
          {{ page }}
        </button>
      </div>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
        ({{ filteredDrivers.length }} conductores)
      </span>
      
      <button 
        @click="currentPage++" 
        :disabled="currentPage === totalPages"
        class="btn-page"
      >
        Siguiente →
      </button>
    </div>

    <!-- Modals -->
    <!-- Create/Edit Driver Modal -->
    <DriverForm
      v-if="showCreateForm || editingDriver"
      :driver="editingDriver"
      @success="handleDriverSuccess"
      @cancel="closeModals"
    />

    <!-- Driver History Modal -->
    <DriverHistoryModal
      v-if="driverHistory"
      :driver="driverHistory"
      @close="driverHistory = null"
    />

    <!-- Driver Location Modal -->
    <DriverLocationModal
      v-if="trackingDriver"
      :driver="trackingDriver"
      @close="trackingDriver = null"
    />

    <!-- Bulk Assignment Modal -->
    <BulkAssignmentModal
      v-if="showBulkAssign"
      :drivers="selectedDriversData"
      @success="handleBulkAssignSuccess"
      @cancel="showBulkAssign = false"
    />

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

    <!-- Notification Toast -->
    <div v-if="notification" class="toast" :class="notification.type">
      <div class="toast-content">
        <i :class="getToastIcon(notification.type)"></i>
        <span>{{ notification.message }}</span>
      </div>
      <button @click="notification = null" class="toast-close">×</button>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { shipdayService } from '../services/shipday'
import DriverForm from './DriverForm.vue'
import DriverHistoryModal from './DriverHistoryModal.vue'
import DriverLocationModal from './DriverLocationModal.vue'
import BulkAssignmentModal from './BulkAssignmentModal.vue'

// ==================== ESTADO ====================
const drivers = ref([])
const loading = ref(false)
const refreshing = ref(false)
const lastUpdate = ref(new Date())

// Filtros y búsqueda
const searchQuery = ref('')
const statusFilter = ref('')
const vehicleFilter = ref('')
const zoneFilter = ref('')
const sortBy = ref('name')

// Paginación
const currentPage = ref(1)
const itemsPerPage = ref(12)

// Modales y UI
const showCreateForm = ref(false)
const showAnalytics = ref(false)
const showBulkAssign = ref(false)
const editingDriver = ref(null)
const driverHistory = ref(null)
const trackingDriver = ref(null)
const driverToDelete = ref(null)
const deleting = ref(false)
const notification = ref(null)

// Selección y menús
const selectedDrivers = ref([])
const activeMenu = ref(null)

// Datos adicionales
const zones = ref(['Zona Norte', 'Zona Centro', 'Zona Sur', 'Zona Oriente', 'Zona Poniente', 'Zona Sur-Oriente'])
const analytics = ref({
  avgEfficiency: 85,
  efficiencyTrend: 'positive',
  efficiencyChange: 3,
  deliveriesToday: 47,
  deliveriesGoal: 60,
  avgResponseTime: 12,
  customerSatisfaction: 4.2,
  totalRatings: 234
})

// ==================== COMPUTED ====================
const filteredDrivers = computed(() => {
  let filtered = [...drivers.value]

  // Búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(driver => 
      driver.name?.toLowerCase().includes(query) ||
      driver.email?.toLowerCase().includes(query) ||
      driver.phone?.includes(query) ||
      driver.phoneNumber?.includes(query) ||
      driver.codeName?.toLowerCase().includes(query)
    )
  }

  // Filtros
  if (statusFilter.value) {
    filtered = filtered.filter(driver => driver.status === statusFilter.value)
  }

  if (vehicleFilter.value) {
    filtered = filtered.filter(driver => 
      (driver.vehicleType || driver.vehicle_type) === vehicleFilter.value
    )
  }

  if (zoneFilter.value) {
    filtered = filtered.filter(driver => driver.zone === zoneFilter.value)
  }

  // Ordenamiento
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'efficiency':
        return (b.efficiency || 0) - (a.efficiency || 0)
      case 'deliveries':
        return (b.totalDeliveries || 0) - (a.totalDeliveries || 0)
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      case 'lastActivity':
        return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0)
      default:
        return a.name?.localeCompare(b.name) || 0
    }
  })

  return filtered
})

const paginatedDrivers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredDrivers.value.slice(start, start + itemsPerPage.value)
})

const totalPages = computed(() => {
  return Math.ceil(filteredDrivers.value.length / itemsPerPage.value)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const delta = 2
  
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)
  
  if (end - start < 4) {
    start = Math.max(1, end - 4)
    end = Math.min(total, start + 4)
  }
  
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const stats = computed(() => {
  const total = drivers.value.length
  const availableNow = drivers.value.filter(d => d.status === 'available').length
  const working = drivers.value.filter(d => d.status === 'working').length
  const offline = drivers.value.filter(d => d.status === 'offline').length
  
  return {
    total,
    availableNow,
    working,
    offline,
    newThisWeek: 3, // Esto vendría de tu backend
    avgDeliveryTime: 25,
    totalActiveOrders: working
  }
})

const selectedDriversData = computed(() => {
  return drivers.value.filter(d => selectedDrivers.value.includes(d.id || d.email))
})

// ==================== LIFECYCLE ====================
onMounted(() => {
  loadDrivers()
  startRealTimeUpdates()
  
  // Cerrar menús al hacer clic fuera
  document.addEventListener('click', closeMenusOutside)
})

onUnmounted(() => {
  stopRealTimeUpdates()
  document.removeEventListener('click', closeMenusOutside)
})

// Watchers
watch([searchQuery, statusFilter, vehicleFilter, zoneFilter], () => {
  currentPage.value = 1 // Reset pagination when filters change
})

// ==================== MÉTODOS PRINCIPALES ====================
const loadDrivers = async () => {
  loading.value = true
  try {
    console.log('🔄 Cargando conductores...')
    const response = await shipdayService.getDrivers()
    const rawData = response.data?.data || response.data || response
    
    console.log('📋 Datos recibidos:', rawData)
    
    drivers.value = processDriversData(rawData)
    lastUpdate.value = new Date()
    
    console.log('✅ Conductores procesados:', drivers.value.length)
  } catch (error) {
    console.error('❌ Error cargando conductores:', error)
    showNotification('Error al cargar conductores', 'error')
  } finally {
    loading.value = false
  }
}

const processDriversData = (rawDrivers) => {
  return rawDrivers.map(driver => {
    const processedDriver = {
      ...driver,
      // Normalizar campos
      id: driver.id || driver.carrierId || driver.email,
      status: calculateDriverStatus(driver),
      efficiency: calculateEfficiency(driver),
      totalDeliveries: driver.totalDeliveries || Math.floor(Math.random() * 100),
      rating: driver.rating || (4 + Math.random()).toFixed(1),
      lastActivity: driver.lastActivity || new Date(Date.now() - Math.random() * 86400000),
      zone: driver.zone || zones.value[Math.floor(Math.random() * zones.value.length)],
      isTopPerformer: Math.random() > 0.7,
      currentOrder: driver.status === 'working' ? generateMockOrder() : null,
      avatar: driver.carrierPhoto || driver.avatar
    }
    
    console.log('👤 Conductor procesado:', {
      name: processedDriver.name,
      status: processedDriver.status,
      isActive: processedDriver.isActive,
      isOnShift: processedDriver.isOnShift
    })
    
    return processedDriver
  })
}

const refreshData = async () => {
  refreshing.value = true
  await loadDrivers()
  setTimeout(() => refreshing.value = false, 500)
}

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  vehicleFilter.value = ''
  zoneFilter.value = ''
  sortBy.value = 'name'
}

// ==================== REAL-TIME UPDATES ====================
let updateInterval = null

const startRealTimeUpdates = () => {
  updateInterval = setInterval(() => {
    updateDriverStatuses()
    lastUpdate.value = new Date()
  }, 30000) // Cada 30 segundos
}

const stopRealTimeUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
}

const updateDriverStatuses = () => {
  drivers.value.forEach(driver => {
    // Simular cambios de estado aleatorios
    if (Math.random() > 0.95) {
      driver.status = getRandomStatus()
      driver.lastActivity = new Date()
    }
  })
}

// ==================== ACCIONES DE CONDUCTORES ====================
const quickAssign = async (driver) => {
  try {
    showNotification(`Buscando órdenes para asignar a ${driver.name}...`, 'info')
    // TODO: Implementar lógica de asignación rápida
    // Aquí podrías:
    // 1. Buscar órdenes pendientes
    // 2. Asignar automáticamente la más cercana
    // 3. Notificar al conductor
  } catch (error) {
    showNotification('Error en asignación rápida', 'error')
  }
}

const trackDriver = (driver) => {
  trackingDriver.value = driver
}

const contactDriver = (driver) => {
  const phone = driver.phone || driver.phoneNumber
  if (phone) {
    // Normalizar número de teléfono
    const cleanPhone = phone.replace(/\D/g, '')
    window.open(`tel:+${cleanPhone}`)
  } else {
    showNotification('Número de teléfono no disponible', 'warning')
  }
}

const viewHistory = (driver) => {
  driverHistory.value = driver
}

const viewLocation = (driver) => {
  if (hasLocation(driver)) {
    const lat = driver.carrrierLocationLat || driver.location?.lat
    const lng = driver.carrrierLocationLng || driver.location?.lng
    const url = `https://www.google.com/maps?q=${lat},${lng}&zoom=15`
    window.open(url, '_blank')
  } else {
    showNotification('Ubicación no disponible', 'info')
  }
}

const bulkAssignOrders = () => {
  if (selectedDrivers.value.length === 0) {
    showNotification('Selecciona al menos un conductor', 'warning')
    return
  }
  showBulkAssign.value = true
}

const exportDriversReport = async () => {
  try {
    showNotification('Generando reporte...', 'info')
    
    // Preparar datos para exportar
    const exportData = drivers.value.map(driver => ({
      Nombre: driver.name,
      Email: driver.email,
      Teléfono: driver.phone || driver.phoneNumber,
      Vehículo: driver.vehicleType || driver.vehicle_type,
      Estado: getStatusText(driver),
      'Total Entregas': driver.totalDeliveries || 0,
      Eficiencia: `${driver.efficiency || 0}%`,
      Rating: `${driver.rating || 0}/5`,
      'Última Actividad': formatTimeAgo(driver.lastActivity)
    }))
    
    // Convertir a CSV
    const csvContent = convertToCSV(exportData)
    
    // Descargar archivo
    downloadCSV(csvContent, `conductores_${new Date().toISOString().split('T')[0]}.csv`)
    
    showNotification('Reporte exportado exitosamente', 'success')
  } catch (error) {
    console.error('Error exportando reporte:', error)
    showNotification('Error al exportar reporte', 'error')
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
    const driverId = driverToDelete.value.id || driverToDelete.value.email
    await shipdayService.deleteDriver(driverId)
    
    // Remover de la lista local
    drivers.value = drivers.value.filter(d => 
      (d.id || d.email) !== (driverToDelete.value.id || driverToDelete.value.email)
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

const toggleStatus = async (driver) => {
  try {
    const newStatus = !driver.isActive
    const driverId = driver.id || driver.email
    
    await shipdayService.updateDriver(driverId, {
      ...driver,
      isActive: newStatus
    })
    
    // Actualizar en la lista local
    const index = drivers.value.findIndex(d => 
      (d.id || d.email) === (driver.id || driver.email)
    )
    if (index !== -1) {
      drivers.value[index].isActive = newStatus
      drivers.value[index].status = calculateDriverStatus({
        ...drivers.value[index],
        isActive: newStatus
      })
    }
    
    showNotification(
      `Conductor ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      'success'
    )
  } catch (error) {
    console.error('❌ Error actualizando estado:', error)
    showNotification('Error al actualizar estado del conductor', 'error')
  }
}

// ==================== EVENT HANDLERS ====================
const handleDriverSuccess = (event) => {
  if (editingDriver.value) {
    // Actualizar conductor existente
    const index = drivers.value.findIndex(d => 
      (d.id || d.email) === (editingDriver.value.id || editingDriver.value.email)
    )
    if (index !== -1) {
      drivers.value[index] = { 
        ...drivers.value[index], 
        ...event.driver,
        status: calculateDriverStatus(event.driver)
      }
    }
  } else {
    // Agregar nuevo conductor
    const newDriver = {
      ...event.driver,
      status: calculateDriverStatus(event.driver),
      efficiency: calculateEfficiency(event.driver),
      totalDeliveries: 0,
      rating: 0,
      lastActivity: new Date(),
      zone: zones.value[0],
      isTopPerformer: false
    }
    drivers.value.push(newDriver)
  }
  
  showNotification(event.message, 'success')
  closeModals()
}

const handleBulkAssignSuccess = () => {
  selectedDrivers.value = []
  showBulkAssign.value = false
  loadDrivers() // Recargar para actualizar estados
  showNotification('Asignación masiva completada', 'success')
}

const closeModals = () => {
  showCreateForm.value = false
  editingDriver.value = null
}

const closeDeleteModal = () => {
  driverToDelete.value = null
}

const toggleMenu = (driverId) => {
  activeMenu.value = activeMenu.value === driverId ? null : driverId
}

const closeMenusOutside = (event) => {
  if (!event.target.closest('.dropdown')) {
    activeMenu.value = null
  }
}

// ==================== HELPERS ====================
const calculateDriverStatus = (driver) => {
  if (!driver.isActive) return 'offline'
  if (driver.isOnShift) return 'working'
  return 'available'
}

const calculateEfficiency = (driver) => {
  // Lógica simple para calcular eficiencia
  // En producción esto vendría del backend con datos reales
  const baseEfficiency = 75
  const deliveries = driver.totalDeliveries || 0
  const rating = driver.rating || 0
  
  return Math.min(100, Math.floor(
    baseEfficiency + 
    (deliveries * 0.1) + 
    (rating * 5) + 
    Math.random() * 10
  ))
}

const generateMockOrder = () => ({
  number: Math.floor(Math.random() * 10000),
  destination: 'Las Condes, Santiago',
  estimatedTime: Math.floor(15 + Math.random() * 30),
  progress: Math.floor(Math.random() * 100)
})

const getRandomStatus = () => {
  const statuses = ['available', 'working', 'offline']
  return statuses[Math.floor(Math.random() * statuses.length)]
}

const hasLocation = (driver) => {
  return (driver.carrrierLocationLat && driver.carrrierLocationLng) || 
         (driver.location?.lat && driver.location?.lng)
}

const getStatusClass = (driver) => {
  const statusMap = {
    available: 'status-available',
    working: 'status-working',
    busy: 'status-busy',
    offline: 'status-offline'
  }
  return statusMap[driver.status] || 'status-offline'
}

const getStatusText = (driver) => {
  const statusMap = {
    available: 'Disponible',
    working: 'En ruta',
    busy: 'Ocupado',
    offline: 'Offline'
  }
  return statusMap[driver.status] || 'Desconocido'
}

const getDriverCardClass = (driver) => {
  return {
    'status-available': driver.status === 'available',
    'status-working': driver.status === 'working',
    'status-busy': driver.status === 'busy',
    'status-offline': driver.status === 'offline',
    'top-performer': driver.isTopPerformer
  }
}

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

const getTrendIcon = (trend) => {
  return trend === 'positive' ? 'icon-arrow-up' : 'icon-arrow-down'
}

const getPercentage = (value, total) => {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

const getToastIcon = (type) => {
  const icons = {
    success: 'icon-check',
    error: 'icon-x',
    warning: 'icon-alert-triangle',
    info: 'icon-info'
  }
  return icons[type] || 'icon-info'
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const formatTimeAgo = (date) => {
  if (!date) return 'N/A'
  
  const now = new Date()
  const diff = now - new Date(date)
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))
  
  if (hours > 24) return `${Math.floor(hours / 24)}d`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

const handleImageError = (event) => {
  // Si la imagen falla al cargar, ocultar y mostrar iniciales
  event.target.style.display = 'none'
  const initialsElement = event.target.parentElement.querySelector('.avatar-initials')
  if (initialsElement) {
    initialsElement.style.display = 'flex'
  }
}

const showNotification = (message, type = 'info') => {
  notification.value = { message, type }
  setTimeout(() => notification.value = null, 5000)
}

// Utilidades para exportación
const convertToCSV = (data) => {
  if (!data.length) return ''
  
  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value
    }).join(',')
  )
  
  return [csvHeaders, ...csvRows].join('\n')
}

const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
</script>
<style scoped>
/* ==================== VARIABLES CSS ==================== */
:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --secondary: #6b7280;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #06b6d4;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  
  --border: #e5e7eb;
  --border-light: #f3f4f6;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  --radius: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

/* ==================== BASE STYLES ==================== */
.drivers-management {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  background: var(--bg-secondary);
  min-height: 100vh;
}

/* ==================== HEADER ==================== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  background: var(--bg-primary);
  padding: 24px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
}

.header-content h1 {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content p {
  color: var(--text-secondary);
  margin: 8px 0 0 0;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-export,
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.btn-export {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-export:hover {
  background: var(--border-light);
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary.large {
  padding: 16px 32px;
  font-size: 16px;
}

/* ==================== QUICK ACTIONS BAR ==================== */
.quick-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-primary);
  padding: 20px 24px;
  border-radius: var(--radius-lg);
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.realtime-status {
  display: flex;
  align-items: center;
  gap: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
}

.pulse-dot.available {
  background: var(--success);
}

.pulse-dot.working {
  background: var(--warning);
}

.pulse-dot.offline {
  background: var(--text-tertiary);
}

.pulse-dot::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: inherit;
  opacity: 0.3;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.1; }
  100% { transform: scale(1); opacity: 0.3; }
}

.last-update {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.btn-refresh {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius);
  transition: all 0.2s;
}

.btn-refresh:hover {
  color: var(--primary);
  background: var(--bg-tertiary);
}

.btn-refresh.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.btn-bulk,
.btn-analytics {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.btn-bulk:hover:not(:disabled),
.btn-analytics:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-bulk:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== ANALYTICS PANEL ==================== */
.analytics-panel {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metric-card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--primary);
}

.metric-card h4 {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.metric-trend.positive {
  color: var(--success);
}

.metric-trend.negative {
  color: var(--error);
}

.metric-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ==================== FILTERS ==================== */
.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  background: var(--bg-primary);
  padding: 20px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.search-box .icon-search {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 16px;
  background: var(--bg-primary);
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--text-tertiary);
  color: white;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  min-width: 150px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ==================== STATS GRID ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-primary);
  padding: 24px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-card.primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  background: var(--primary);
}

.stat-card.success::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  background: var(--success);
}

.stat-card.warning::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  background: var(--warning);
}

.stat-card.info::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  background: var(--info);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--bg-secondary);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 12px;
  font-weight: 500;
}

.stat-change.positive {
  color: var(--success);
}

.stat-change.negative {
  color: var(--error);
}

.stat-percentage {
  font-size: 14px;
  color: var(--text-tertiary);
}

.stat-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ==================== LOADING STATES ==================== */
.loading-state {
  text-align: center;
  padding: 64px 0;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading-state p {
  color: var(--text-secondary);
  margin: 0;
}

/* ==================== EMPTY STATES ==================== */
.empty-state,
.no-results-state {
  text-align: center;
  padding: 64px 32px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.empty-illustration,
.no-results-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3,
.no-results-state h3 {
  font-size: 24px;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-state p,
.no-results-state p {
  color: var(--text-secondary);
  margin: 0 0 24px 0;
  font-size: 16px;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: 12px 24px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary:hover {
  background: var(--border-light);
  transform: translateY(-1px);
}

/* ==================== DRIVERS GRID ==================== */
.drivers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.driver-card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow);
  transition: all 0.3s;
  border: 2px solid transparent;
  position: relative;
}

.driver-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.driver-card.enhanced {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.driver-card.status-available {
  border-color: var(--success);
}

.driver-card.status-working {
  border-color: var(--warning);
}

.driver-card.status-offline {
  border-color: var(--text-tertiary);
}

.driver-card.top-performer::after {
  content: '⭐';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 20px;
}

/* ==================== CARD HEADER ==================== */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
}

.status-dot.status-available {
  background: var(--success);
}

.status-dot.status-working {
  background: var(--warning);
}

.status-dot.status-offline {
  background: var(--text-tertiary);
}

.pulse-ring {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid var(--warning);
  border-radius: 50%;
  opacity: 0.6;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 0.2; }
  100% { transform: scale(1); opacity: 0.6; }
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.driver-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.dropdown {
  position: relative;
}

.btn-menu {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius);
  font-size: 18px;
  transition: all 0.2s;
}

.btn-menu:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 10;
  min-width: 160px;
  overflow: hidden;
}

.dropdown-menu button {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: var(--text-primary);
}

.dropdown-menu button:hover {
  background: var(--bg-secondary);
}

.dropdown-menu button.danger {
  color: var(--error);
}

.dropdown-menu button.danger:hover {
  background: #fef2f2;
}

/* ==================== DRIVER PROFILE ==================== */
.driver-profile {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
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

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: var(--success);
  border: 2px solid var(--bg-primary);
  border-radius: 50%;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.driver-contact {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.driver-contact i {
  width: 16px;
  font-size: 12px;
}

.driver-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 8px;
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 500;
}

.tag.vehicle {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag.zone {
  background: #dcfce7;
  color: #15803d;
}

.tag.star {
  background: #fef3c7;
  color: #d97706;
}

.tag.code {
  background: #f3e8ff;
  color: #7c3aed;
}

/* ==================== PERFORMANCE METRICS ==================== */
.performance-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
}

.metric {
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  font-weight: 500;
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.metric-value i {
  font-size: 12px;
  color: var(--warning);
}

/* ==================== CURRENT ORDER ==================== */
.current-order {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 20px;
  border-left: 4px solid var(--warning);
}

.order-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 12px;
  font-size: 14px;
}

.order-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-number {
  font-weight: 600;
  color: #92400e;
}

.order-destination {
  color: #a16207;
  font-size: 14px;
}

.order-time {
  background: #92400e;
  color: white;
  padding: 4px 8px;
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 500;
}

.order-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #fde68a;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #92400e;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  min-width: 30px;
}

/* ==================== QUICK ACTIONS GRID ==================== */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 500;
}

.btn-action.primary {
  background: var(--primary);
  color: white;
}

.btn-action.primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.btn-action.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-action.secondary:hover {
  background: var(--border-light);
  border-color: var(--text-tertiary);
}

.btn-action.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.btn-action.info:hover {
  background: #bfdbfe;
}

/* ==================== PAGINATION ==================== */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
  padding: 24px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.btn-page {
  padding: 10px 16px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.btn-page:hover:not(:disabled) {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.btn-page-num {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-page-num:hover {
  background: var(--bg-tertiary);
}

.btn-page-num.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
}

/* ==================== MODALS ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.delete-modal {
  padding: 32px;
  text-align: center;
  max-width: 400px;
}

.delete-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.delete-modal h3 {
  color: var(--text-primary);
  margin: 0 0 16px 0;
  font-size: 20px;
}

.delete-modal p {
  color: var(--text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel,
.btn-delete-confirm {
  padding: 12px 24px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-cancel:hover {
  background: var(--border-light);
}

.btn-delete-confirm {
  background: var(--error);
  color: white;
  border: none;
}

.btn-delete-confirm:hover:not(:disabled) {
  background: #dc2626;
}

.btn-delete-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== TOAST NOTIFICATIONS ==================== */
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  max-width: 400px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.toast.success {
  border-left: 4px solid var(--success);
}

.toast.error {
  border-left: 4px solid var(--error);
}

.toast.warning {
  border-left: 4px solid var(--warning);
}

.toast.info {
  border-left: 4px solid var(--info);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: var(--text-primary);
}

.toast-content i {
  font-size: 18px;
}

.toast.success .toast-content i {
  color: var(--success);
}

.toast.error .toast-content i {
  color: var(--error);
}

.toast.warning .toast-content i {
  color: var(--warning);
}

.toast.info .toast-content i {
  color: var(--info);
}

.toast-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 18px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toast-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 1200px) {
  .drivers-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

@media (max-width: 768px) {
  .drivers-management {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    text-align: center;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .quick-actions-bar {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .realtime-status {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .search-box {
    min-width: unset;
  }
  
  .filters {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .drivers-grid {
    grid-template-columns: 1fr;
  }
  
  .driver-card {
    margin-bottom: 16px;
  }
  
  .pagination {
    flex-direction: column;
    gap: 12px;
  }
  
  .page-numbers {
    order: -1;
  }
  
  .modal-content {
    margin: 20px;
    max-width: calc(100vw - 40px);
  }
  
  .toast {
    top: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .page-header h1 {
    font-size: 24px;
  }
  
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .performance-metrics {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .filter-select {
    min-width: unset;
  }
  
  .btn-page {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>