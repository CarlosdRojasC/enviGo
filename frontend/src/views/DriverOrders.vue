<template>
  <div class="driver-orders-container">
    <!-- Header de la vista -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">🚚 Pedidos de Conductores</h1>
        <p class="page-subtitle">Monitoreo en tiempo real de las entregas</p>
      </div>
      
      <div class="header-actions">
        <button @click="refreshData" :disabled="loading" class="refresh-btn">
          <span class="btn-icon">🔄</span>
          {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
        
        <div class="auto-refresh-toggle">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              v-model="autoRefresh" 
              @change="toggleAutoRefresh"
              class="toggle-input"
            >
            <span class="toggle-slider"></span>
            <span class="toggle-text">Auto-actualizar</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeDrivers }}</div>
          <div class="stat-label">Conductores Activos</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🚛</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.ordersInTransit }}</div>
          <div class="stat-label">En Tránsito</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.deliveredToday }}</div>
          <div class="stat-label">Entregados Hoy</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalOrders }}</div>
          <div class="stat-label">Total Pedidos</div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters-grid">
        <select v-model="filters.driver" class="filter-select">
          <option value="">Todos los conductores</option>
          <option v-for="driver in drivers" :key="driver.id" :value="driver.id">
            {{ driver.name }}
          </option>
        </select>
        
        <select v-model="filters.status" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="assigned">Asignado</option>
          <option value="picked_up">Recogido</option>
          <option value="in_transit">En Tránsito</option>
          <option value="delivered">Entregado</option>
        </select>
        
        <input 
          type="date" 
          v-model="filters.date" 
          class="filter-input"
          placeholder="Filtrar por fecha"
        >
        
        <div class="search-container">
          <input 
            type="text" 
            v-model="filters.search" 
            placeholder="Buscar por # pedido o cliente..."
            class="search-input"
          >
          <span class="search-icon">🔍</span>
        </div>
      </div>
    </div>

    <!-- Tabla de pedidos de conductores -->
    <div class="orders-table-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando pedidos de conductores...</p>
      </div>
      
      <div v-else-if="filteredOrders.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No hay pedidos que mostrar</h3>
        <p>No se encontraron pedidos con los filtros seleccionados.</p>
      </div>
      
      <div v-else class="orders-table">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Conductor</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Dirección</th>
              <th>Tiempo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in filteredOrders" :key="order.id" class="order-row">
              <!-- Información del pedido -->
              <td class="order-info">
                <div class="order-number">#{{ order.order_number }}</div>
                <div class="order-company">{{ order.company_name }}</div>
                <div v-if="order.total_amount" class="order-amount">
                  ${{ formatCurrency(order.total_amount) }}
                </div>
              </td>
              
              <!-- Información del conductor -->
              <td class="driver-info">
                <div class="driver-card">
                  <div class="driver-avatar">
                    <span>{{ getDriverInitials(order.driver) }}</span>
                  </div>
                  <div class="driver-details">
                    <div class="driver-name">{{ order.driver?.name || 'Sin asignar' }}</div>
                    <div v-if="order.driver?.phone" class="driver-phone">
                      📞 {{ order.driver.phone }}
                    </div>
                    <div v-if="order.driver?.status" class="driver-status" :class="order.driver.status">
                      {{ getDriverStatusText(order.driver.status) }}
                    </div>
                  </div>
                </div>
              </td>
              
              <!-- Cliente -->
              <td class="customer-info">
                <div class="customer-name">{{ order.customer_name }}</div>
                <div v-if="order.customer_phone" class="customer-phone">
                  📱 {{ order.customer_phone }}
                </div>
              </td>
              
              <!-- Estado del pedido -->
              <td class="order-status">
                <div class="status-container">
                  <span class="status-badge" :class="order.status">
                    {{ getStatusIcon(order.status) }} {{ getStatusName(order.status) }}
                  </span>
                  
                  <!-- Tiempo estimado si está disponible -->
                  <div v-if="order.estimated_delivery" class="estimated-time">
                    ⏱️ {{ formatEstimatedTime(order.estimated_delivery) }}
                  </div>
                  
                  <!-- Indicador de retraso -->
                  <div v-if="isDelayed(order)" class="delay-indicator">
                    ⚠️ Retraso
                  </div>
                </div>
              </td>
              
              <!-- Dirección de entrega -->
              <td class="delivery-address">
                <div class="address-text">{{ order.delivery_address }}</div>
                <div v-if="order.delivery_location" class="coordinates">
                  📍 {{ order.delivery_location.formatted_address }}
                </div>
              </td>
              
              <!-- Tiempos -->
              <td class="order-times">
                <div v-if="order.assigned_time" class="time-item">
                  <span class="time-label">Asignado:</span>
                  <span class="time-value">{{ formatTime(order.assigned_time) }}</span>
                </div>
                <div v-if="order.pickup_time" class="time-item">
                  <span class="time-label">Recogido:</span>
                  <span class="time-value">{{ formatTime(order.pickup_time) }}</span>
                </div>
                <div v-if="order.delivery_time" class="time-item">
                  <span class="time-label">Entregado:</span>
                  <span class="time-value">{{ formatTime(order.delivery_time) }}</span>
                </div>
              </td>
              
              <!-- Acciones -->
              <td class="order-actions">
                <div class="action-buttons">
                  <!-- Tracking en vivo -->
                  <button 
                    v-if="order.tracking_url && order.status !== 'delivered'" 
                    @click="openLiveTracking(order)"
                    class="action-btn live-btn"
                    title="Ver ubicación en tiempo real"
                  >
                    🔴 Live
                  </button>
                  
                  <!-- Prueba de entrega -->
                  <button 
                    v-if="order.status === 'delivered'" 
                    @click="showProofOfDelivery(order)"
                    class="action-btn proof-btn"
                    title="Ver prueba de entrega"
                  >
                    📸 Prueba
                  </button>
                  
                  <!-- Detalles del pedido -->
                  <button 
                    @click="showOrderDetails(order)"
                    class="action-btn details-btn"
                    title="Ver detalles"
                  >
                    👁️ Ver
                  </button>
                  
                  <!-- Contactar conductor -->
                  <button 
                    v-if="order.driver?.phone" 
                    @click="contactDriver(order.driver)"
                    class="action-btn contact-btn"
                    title="Contactar conductor"
                  >
                    📞 Llamar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="pagination.totalPages > 1" class="pagination">
      <button 
        @click="changePage(pagination.page - 1)"
        :disabled="pagination.page === 1"
        class="pagination-btn"
      >
        ← Anterior
      </button>
      
      <span class="pagination-info">
        Página {{ pagination.page }} de {{ pagination.totalPages }}
        ({{ pagination.total }} pedidos)
      </span>
      
      <button 
        @click="changePage(pagination.page + 1)"
        :disabled="pagination.page === pagination.totalPages"
        class="pagination-btn"
      >
        Siguiente →
      </button>
    </div>

    <!-- Modal de detalles del pedido -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📦 Detalles del Pedido #{{ selectedOrder?.order_number }}</h3>
          <button @click="closeDetailsModal" class="close-btn">×</button>
        </div>
        
        <div v-if="selectedOrder" class="modal-body">
          <!-- Aquí puedes usar tu componente OrderDetails existente -->
          <div class="order-details-grid">
            <div class="detail-section">
              <h4>Cliente</h4>
              <p>{{ selectedOrder.customer_name }}</p>
              <p v-if="selectedOrder.customer_phone">📱 {{ selectedOrder.customer_phone }}</p>
            </div>
            
            <div class="detail-section">
              <h4>Conductor</h4>
              <p>{{ selectedOrder.driver?.name || 'Sin asignar' }}</p>
              <p v-if="selectedOrder.driver?.phone">📞 {{ selectedOrder.driver.phone }}</p>
            </div>
            
            <div class="detail-section">
              <h4>Entrega</h4>
              <p>{{ selectedOrder.delivery_address }}</p>
              <p v-if="selectedOrder.estimated_delivery">
                ⏱️ Estimado: {{ formatEstimatedTime(selectedOrder.estimated_delivery) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Indicador de última actualización -->
    <div class="last-updated">
      <span>Última actualización: {{ formatTime(lastUpdated) }}</span>
      <span v-if="autoRefresh" class="auto-refresh-indicator">🔄 Auto-actualización activa</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { apiService } from '../services/api'
import { shipdayService } from '../services/shipday'

// Estado de datos
const orders = ref([])
const drivers = ref([])
const loading = ref(true)
const lastUpdated = ref(new Date())
const autoRefresh = ref(false)
let refreshInterval = null

// Filtros
const filters = ref({
  driver: '',
  status: '',
  date: '',
  search: ''
})

// Paginación
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 1
})

// Modales
const showDetailsModal = ref(false)
const selectedOrder = ref(null)

// Estadísticas computadas
const stats = computed(() => {
  const totalOrders = orders.value.length
  const activeDrivers = new Set(orders.value.map(o => o.driver?.id).filter(Boolean)).size
  const ordersInTransit = orders.value.filter(o => ['assigned', 'picked_up', 'in_transit'].includes(o.status)).length
  
  // Pedidos entregados hoy
  const today = new Date().toDateString()
  const deliveredToday = orders.value.filter(o => {
    return o.status === 'delivered' && 
           o.delivery_time && 
           new Date(o.delivery_time).toDateString() === today
  }).length

  return {
    totalOrders,
    activeDrivers,
    ordersInTransit,
    deliveredToday
  }
})

// Órdenes filtradas
const filteredOrders = computed(() => {
  let filtered = [...orders.value]
  
  // Filtro por conductor
  if (filters.value.driver) {
    filtered = filtered.filter(order => order.driver?.id === filters.value.driver)
  }
  
  // Filtro por estado
  if (filters.value.status) {
    filtered = filtered.filter(order => order.status === filters.value.status)
  }
  
  // Filtro por fecha
  if (filters.value.date) {
    const filterDate = new Date(filters.value.date).toDateString()
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.order_date || order.created_at).toDateString()
      return orderDate === filterDate
    })
  }
  
  // Filtro de búsqueda
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    filtered = filtered.filter(order => 
      order.order_number?.toLowerCase().includes(search) ||
      order.customer_name?.toLowerCase().includes(search)
    )
  }
  
  return filtered
})

// Lifecycle
onMounted(() => {
  loadData()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Watchers para auto-refresh
watch(() => filters.value, () => {
  loadData()
}, { deep: true })

// Funciones principales
async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      loadDriverOrders(),
      loadDrivers()
    ])
  } catch (error) {
    console.error('❌ Error cargando datos:', error)
  } finally {
    loading.value = false
    lastUpdated.value = new Date()
  }
}

async function loadDriverOrders() {
  try {
    // Obtener órdenes desde Shipday con información de conductores
    const shipdayOrders = await shipdayService.getOrders()
    
    // También obtener órdenes locales para información adicional
    const localOrders = await apiService.orders.getAll({
      page: 1,
      limit: 1000, // Obtener muchas para hacer el matching
      has_driver: true // Solo órdenes con conductor asignado
    })
    
    // Combinar datos de Shipday con datos locales
    const combinedOrders = shipdayOrders.data.map(shipdayOrder => {
      // Buscar la orden local correspondiente
      const localOrder = localOrders.data.orders.find(lo => 
        lo.shipday_order_id === shipdayOrder.orderId?.toString()
      )
      
      return {
        id: shipdayOrder.orderId,
        order_number: shipdayOrder.orderNumber || localOrder?.order_number,
        customer_name: shipdayOrder.customerName,
        customer_phone: shipdayOrder.customerPhone,
        delivery_address: shipdayOrder.deliveryAddress,
        status: mapShipdayStatus(shipdayOrder.orderStatus),
        driver: shipdayOrder.carrier ? {
          id: shipdayOrder.carrier.id,
          name: shipdayOrder.carrier.name,
          phone: shipdayOrder.carrier.phone,
          email: shipdayOrder.carrier.email,
          status: shipdayOrder.carrier.status || 'unknown'
        } : null,
        tracking_url: shipdayOrder.trackingUrl,
        estimated_delivery: shipdayOrder.estimatedDeliveryTime,
        assigned_time: shipdayOrder.assignedTime,
        pickup_time: shipdayOrder.pickedupTime,
        delivery_time: shipdayOrder.deliveryTime,
        total_amount: localOrder?.total_amount,
        company_name: localOrder?.company?.name,
        delivery_location: {
          formatted_address: shipdayOrder.deliveryAddress
        },
        // Información adicional del local
        shipday_order_id: shipdayOrder.orderId,
        local_order_id: localOrder?._id,
        order_date: localOrder?.order_date || shipdayOrder.placementTime
      }
    })
    
    // Filtrar solo órdenes que tienen conductor asignado
    orders.value = combinedOrders.filter(order => order.driver)
    
    console.log('✅ Pedidos de conductores cargados:', orders.value.length)
    
  } catch (error) {
    console.error('❌ Error cargando órdenes de conductores:', error)
    throw error
  }
}

async function loadDrivers() {
  try {
    const response = await shipdayService.getDrivers()
    drivers.value = response.data || response
    console.log('✅ Conductores cargados:', drivers.value.length)
  } catch (error) {
    console.error('❌ Error cargando conductores:', error)
    throw error
  }
}

function mapShipdayStatus(shipdayStatus) {
  const statusMap = {
    'assigned': 'assigned',
    'pickedup': 'picked_up',
    'in_transit': 'in_transit',
    'delivered': 'delivered',
    'cancelled': 'cancelled'
  }
  return statusMap[shipdayStatus] || shipdayStatus
}

function refreshData() {
  loadData()
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    // Activar auto-refresh cada 30 segundos
    refreshInterval = setInterval(() => {
      loadData()
    }, 30000)
    console.log('🔄 Auto-refresh activado')
  } else {
    // Desactivar auto-refresh
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
    console.log('⏹️ Auto-refresh desactivado')
  }
}

// Funciones de utilidad
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatTime(timestamp) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatEstimatedTime(timestamp) {
  if (!timestamp) return 'No estimado'
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = date - now
  const diffMins = Math.round(diffMs / (1000 * 60))
  
  if (diffMins < 0) return 'Vencido'
  if (diffMins < 60) return `${diffMins} min`
  return `${Math.round(diffMins / 60)}h ${diffMins % 60}min`
}

function isDelayed(order) {
  if (!order.estimated_delivery || order.status === 'delivered') return false
  return new Date(order.estimated_delivery) < new Date()
}

function getDriverInitials(driver) {
  if (!driver?.name) return '??'
  return driver.name.split(' ').map(n => n[0]).join('').toUpperCase()
}

function getDriverStatusText(status) {
  const statusMap = {
    'available': 'Disponible',
    'busy': 'Ocupado',
    'offline': 'Desconectado',
    'unknown': 'Desconocido'
  }
  return statusMap[status] || status
}

function getStatusIcon(status) {
  const icons = {
    'assigned': '📋',
    'picked_up': '📦',
    'in_transit': '🚛',
    'delivered': '✅',
    'cancelled': '❌'
  }
  return icons[status] || '📄'
}

function getStatusName(status) {
  const names = {
    'assigned': 'Asignado',
    'picked_up': 'Recogido',
    'in_transit': 'En Tránsito',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  }
  return names[status] || status
}

// Funciones de acciones
function openLiveTracking(order) {
  if (order.tracking_url) {
    window.open(order.tracking_url, '_blank')
    console.log('📍 Abriendo tracking en vivo:', order.order_number)
  }
}

function showProofOfDelivery(order) {
  // Aquí puedes abrir tu modal de prueba de entrega existente
  console.log('📸 Mostrando prueba de entrega:', order.order_number)
  // Podrías emitir un evento o usar tu modal existente
}

function showOrderDetails(order) {
  selectedOrder.value = order
  showDetailsModal.value = true
}

function closeDetailsModal() {
  showDetailsModal.value = false
  selectedOrder.value = null
}

function contactDriver(driver) {
  if (driver.phone) {
    window.location.href = `tel:${driver.phone}`
  }
}

function changePage(newPage) {
  if (newPage >= 1 && newPage <= pagination.value.totalPages) {
    pagination.value.page = newPage
    loadData()
  }
}
</script>

<style scoped>
.driver-orders-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-subtitle {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #2563eb;
}

.refresh-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Toggle de auto-refresh */
.auto-refresh-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: #d1d5db;
  border-radius: 12px;
  position: relative;
  transition: all 0.2s ease;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: all 0.2s ease;
}

.toggle-input:checked + .toggle-slider {
  background: #10b981;
}

.toggle-input:checked + .toggle-slider::after {
  transform: translateX(20px);
}

.toggle-text {
  font-size: 14px;
  color: #374151;
}

/* Estadísticas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 32px;
  opacity: 0.8;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

/* Filtros */
.filters-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.filter-select, .filter-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.search-container {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

/* Tabla de órdenes */
.orders-table-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 30px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Tabla */
.orders-table {
  overflow-x: auto;
}

.orders-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.orders-table th {
  background: #f9fafb;
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  white-space: nowrap;
}

.orders-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.order-row:hover {
  background: #f9fafb;
}

.order-row:last-child td {
  border-bottom: none;
}

/* Celdas específicas */
.order-info {
  min-width: 120px;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.order-company {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.order-amount {
  font-size: 12px;
  color: #059669;
  font-weight: 500;
  margin-top: 2px;
}

/* Información del conductor */
.driver-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 160px;
}

.driver-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.driver-details {
  flex: 1;
}

.driver-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.driver-phone {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.driver-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
}

.driver-status.available {
  background: #d1fae5;
  color: #065f46;
}

.driver-status.busy {
  background: #fef3c7;
  color: #92400e;
}

.driver-status.offline {
  background: #fee2e2;
  color: #991b1b;
}

/* Información del cliente */
.customer-info {
  min-width: 140px;
}

.customer-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.customer-phone {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

/* Estado del pedido */
.status-container {
  min-width: 120px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

.status-badge.assigned {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.picked_up {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.in_transit {
  background: #e0e7ff;
  color: #3730a3;
}

.status-badge.delivered {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.estimated-time {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.delay-indicator {
  font-size: 11px;
  color: #dc2626;
  margin-top: 4px;
  font-weight: 500;
}

/* Dirección */
.delivery-address {
  max-width: 200px;
}

.address-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.coordinates {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

/* Tiempos */
.order-times {
  min-width: 120px;
}

.time-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.time-label {
  font-size: 11px;
  color: #6b7280;
}

.time-value {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

/* Acciones */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 120px;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.live-btn {
  background: #dc2626;
  color: white;
}

.live-btn:hover {
  background: #b91c1c;
}

.proof-btn {
  background: #059669;
  color: white;
}

.proof-btn:hover {
  background: #047857;
}

.details-btn {
  background: #6b7280;
  color: white;
}

.details-btn:hover {
  background: #4b5563;
}

.contact-btn {
  background: #3b82f6;
  color: white;
}

.contact-btn:hover {
  background: #2563eb;
}

/* Paginación */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination-btn:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

/* Modal */
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
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.order-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.detail-section {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
}

.detail-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.detail-section p {
  margin: 4px 0;
  font-size: 14px;
  color: #6b7280;
}

/* Indicador de última actualización */
.last-updated {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
  margin-top: 20px;
}

.auto-refresh-indicator {
  color: #10b981;
  font-weight: 500;
}

/* Estados de carga y vacío */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #6b7280;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Animaciones */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Efectos hover para filas */
.order-row {
  transition: all 0.2s ease;
}

.order-row:hover {
  background: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Responsive */
@media (max-width: 1200px) {
  .orders-table table {
    min-width: 1000px;
  }
}

@media (max-width: 768px) {
  .driver-orders-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .orders-table {
    font-size: 12px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 8px 6px;
  }
  
  .driver-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-width: 120px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .action-btn {
    width: 100%;
    text-align: center;
  }
  
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .modal-header {
    padding: 16px;
  }
  
  .modal-body {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 12px;
    text-align: center;
  }
  
  .order-details-grid {
    grid-template-columns: 1fr;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .last-updated {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  
  .auto-refresh-toggle {
    order: -1;
  }
}

/* Mejoras de accesibilidad */
.action-btn:focus,
.refresh-btn:focus,
.pagination-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.toggle-input:focus + .toggle-slider {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Mejoras de UX */
.driver-card:hover .driver-avatar {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

.status-badge {
  transition: all 0.2s ease;
}

.status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Indicadores especiales */
.urgent-order {
  position: relative;
}

.urgent-order::before {
  content: '🔥';
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Tooltips básicos */
[title] {
  position: relative;
}

/* Print styles */
@media print {
  .driver-orders-container {
    padding: 0;
  }
  
  .page-header,
  .filters-section,
  .action-buttons,
  .pagination,
  .last-updated {
    display: none;
  }
  
  .orders-table {
    font-size: 10px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 4px;
    border: 1px solid #000;
  }
}
</style>