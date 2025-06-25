<template>
  <div class="store-dashboard">
    <!-- Header con información de la tienda -->
    <div class="dashboard-header">
      <h1>Dashboard - {{ user?.company?.name || 'Mi Tienda' }}</h1>
      <div class="user-info">
        <span>{{ user?.full_name }}</span>
        <button @click="logout" class="logout-btn">Cerrar Sesión</button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <p>Cargando datos...</p>
    </div>

    <!-- Dashboard content -->
    <div v-else class="dashboard-content">
      
      <!-- Estadísticas principales -->
<div class="stats-grid">
        <div class="stat-card">
          <h3>Pedidos Hoy</h3>
          <div class="stat-value">{{ stats.orders?.orders_today || 0 }}</div>
          <div class="stat-change">📈 Últimas 24h</div>
        </div>
        
        <div class="stat-card">
          <h3>Pedidos Este Mes</h3>
          <div class="stat-value">{{ stats.orders?.orders_this_month || 0 }}</div>
          <div class="stat-change">📅 {{ currentMonth }}</div>
        </div>
        
        <div class="stat-card">
          <h3>Total Entregados</h3>
          <div class="stat-value">{{ stats.orders?.delivered || 0 }}</div>
          <div class="stat-change">✅ Completados</div>
        </div>
        
        <div class="stat-card">
          <h3>Total Facturado</h3>
          <div class="stat-value">${{ formatCurrency(stats.monthly_cost || 0) }}</div>
          <div class="stat-change">💰 ${{ stats.price_per_order || 0 }} por pedido</div>
        </div>
      </div>

  <!-- Resumen de estados -->
      <div class="status-summary">
        <h2>Estado de Pedidos</h2>
        <div class="status-grid">
          <div class="status-item pending">
            <span class="status-count">{{ stats.orders?.pending || 0 }}</span>
            <span class="status-label">Pendientes</span>
          </div>
          <div class="status-item processing">
            <span class="status-count">{{ stats.orders?.processing || 0 }}</span>
            <span class="status-label">Procesando</span>
          </div>
          <div class="status-item shipped">
            <span class="status-count">{{ stats.orders?.shipped || 0 }}</span>
            <span class="status-label">Enviados</span>
          </div>
          <div class="status-item delivered">
            <span class="status-count">{{ stats.orders?.delivered || 0 }}</span>
            <span class="status-label">Entregados</span>
          </div>
        </div>
      </div>
      <!-- Canales conectados -->
      <div class="channels-section">
        <h2>Canales de Venta</h2>
        <div class="channels-grid">
          <div 
            v-for="channel in channels" 
            :key="channel._id" 
            class="channel-card"
            :class="{ inactive: !channel.is_active }"
          >
            <div class="channel-header">
              <h3>{{ channel.channel_name }}</h3>
              <span class="channel-type">{{ getChannelTypeName(channel.channel_type) }}</span>
            </div>
            <div class="channel-stats">
              <div class="channel-stat">
                <span class="label">Total Pedidos:</span>
                <span class="value">{{ channel.total_orders || 0 }}</span>
              </div>
              <div class="channel-stat">
                <span class="label">Última Sincronización:</span>
                <span class="value">{{ formatDate(channel.last_sync) }}</span>
              </div>
            </div>
            <div class="channel-actions">
              <button 
                @click="syncChannel(channel._id)" 
                :disabled="syncingChannels.includes(channel._id)"
                class="sync-btn"
              >
                {{ syncingChannels.includes(channel._id) ? 'Sincronizando...' : 'Sincronizar' }}
              </button>
              <button @click="showChannelDetails(channel)" class="details-btn">
                Ver Detalles
              </button>
            </div>
          </div>
          
          <!-- Botón agregar canal -->
          <div class="add-channel-card">
            <button @click="showAddChannelModal = true" class="add-channel-btn">
              <span class="plus">+</span>
              <span>Agregar Canal</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Filtros para pedidos -->
      <div class="filters-section">
        <h2>Pedidos Recientes</h2>
        <div class="filters">
          <select v-model="filters.status" @change="fetchOrders">
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="processing">Procesando</option>
            <option value="shipped">Enviados</option>
            <option value="delivered">Entregados</option>
            <option value="cancelled">Cancelados</option>
          </select>
          
          <select v-model="filters.channel_id" @change="fetchOrders">
            <option value="">Todos los canales</option>
            <option v-for="channel in channels" :key="channel._id" :value="channel._id">
              {{ channel.channel_name }}
            </option>
          </select>
          
          <input 
            type="date" 
            v-model="filters.date_from" 
            @change="fetchOrders"
            placeholder="Desde"
          >
          
          <input 
            type="date" 
            v-model="filters.date_to" 
            @change="fetchOrders"
            placeholder="Hasta"
          >
          
          <input 
            type="text" 
            v-model="filters.search" 
            @input="debounceSearch"
            placeholder="Buscar por cliente, email o #pedido"
            class="search-input"
          >
          
          <button @click="exportOrders" class="export-btn">
            📄 Exportar OptiRoute
          </button>
        </div>
      </div>

      <!-- Tabla de pedidos -->
      <div class="orders-section">
        <div class="orders-table-wrapper">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingOrders" colspan="7">
                <td class="loading-row">Cargando pedidos...</td>
              </tr>
              <tr v-else-if="orders.length === 0" colspan="7">
                <td class="empty-row">No hay pedidos que mostrar</td>
              </tr>
              <tr v-else v-for="order in orders" :key="order._id" class="order-row">
                <td class="order-number">{{ order.order_number }}</td>
                <td class="customer-info">
                  <div class="customer-name">{{ order.customer_name }}</div>
                  <div class="customer-email">{{ order.customer_email }}</div>
                </td>
                <td class="channel-info">
                  <span class="channel-badge" :class="order.channel_id?.channel_type">
                    {{ order.channel_id?.channel_name }}
                  </span>
                </td>
                <td class="order-status">
                  <span class="status-badge" :class="order.status">
                    {{ getStatusName(order.status) }}
                  </span>
                </td>
                <td class="order-total">${{ formatCurrency(order.total_amount) }}</td>
                <td class="order-date">{{ formatDate(order.order_date) }}</td>
                <td class="order-actions">
                  <button @click="viewOrder(order)" class="action-btn view">👁️</button>
                  <button @click="updateOrderStatus(order)" class="action-btn edit">✏️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Paginación -->
        <div v-if="pagination.totalPages > 1" class="pagination">
          <button 
            @click="goToPage(pagination.page - 1)" 
            :disabled="pagination.page <= 1"
            class="page-btn"
          >
            ← Anterior
          </button>
          
          <span class="page-info">
            Página {{ pagination.page }} de {{ pagination.totalPages }}
          </span>
          
          <button 
            @click="goToPage(pagination.page + 1)" 
            :disabled="pagination.page >= pagination.totalPages"
            class="page-btn"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>

    <!-- Modal para agregar canal -->
    <div v-if="showAddChannelModal" class="modal-overlay" @click="showAddChannelModal = false">
      <div class="modal" @click.stop>
        <h3>Agregar Nuevo Canal</h3>
        <form @submit.prevent="addChannel">
          <div class="form-group">
            <label>Tipo de Canal:</label>
            <select v-model="newChannel.channel_type" required>
              <option value="">Seleccionar...</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="mercadolibre">MercadoLibre</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Nombre del Canal:</label>
            <input v-model="newChannel.channel_name" type="text" required>
          </div>
          
          <div class="form-group">
            <label>API Key:</label>
            <input v-model="newChannel.api_key" type="text" required>
          </div>
          
          <div class="form-group">
            <label>API Secret:</label>
            <input v-model="newChannel.api_secret" type="password" required>
          </div>
          
          <div class="form-group">
            <label>URL de la Tienda:</label>
            <input v-model="newChannel.store_url" type="url" required>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="showAddChannelModal = false">Cancelar</button>
            <button type="submit" :disabled="addingChannel">
              {{ addingChannel ? 'Agregando...' : 'Agregar Canal' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import api from '../services/api'

const auth = useAuthStore()
const router = useRouter()

// Estado reactivo
const loading = ref(true)
const loadingOrders = ref(false)
const stats = ref({})
const channels = ref([])
const orders = ref([])
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1
})

// Filtros
const filters = ref({
  status: '',
  channel_id: '',
  date_from: '',
  date_to: '',
  search: ''
})

// Modales y estados
const showAddChannelModal = ref(false)
const syncingChannels = ref([])
const addingChannel = ref(false)
const newChannel = ref({
  channel_type: '',
  channel_name: '',
  api_key: '',
  api_secret: '',
  store_url: ''
})

// Usuario actual
const user = computed(() => auth.user)

// Mes actual para mostrar en stats
const currentMonth = computed(() => {
  const date = new Date()
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
})


// Funciones principales
onMounted(async () => {
  await Promise.all([
    fetchStats(),
    fetchChannels(),
    fetchOrders()
  ])
  loading.value = false
})

async function fetchStats() {
  try {
    const { data } = await api.get('/stats/dashboard')
    console.log('Stats recibidas:', data) // Para debug
    stats.value = data
  } catch (error) {
    console.error('Error fetching stats:', error)
  }
}

async function fetchChannels() {
  try {
    const companyId = user.value?.company?._id
    if (!companyId) return
    
    const { data } = await api.get(`/companies/${companyId}/channels`)
    channels.value = data
  } catch (error) {
    console.error('Error fetching channels:', error)
  }
}

async function fetchOrders() {
  try {
    loadingOrders.value = true
    const params = new URLSearchParams()
    
    // Agregar filtros que tengan valor
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    
    params.append('page', pagination.value.page)
    params.append('limit', pagination.value.limit)
    
    const { data } = await api.get(`/orders?${params}`)
    orders.value = data.orders
    pagination.value = data.pagination
  } catch (error) {
    console.error('Error fetching orders:', error)
  } finally {
    loadingOrders.value = false
  }
}

async function syncChannel(channelId) {
  if (syncingChannels.value.includes(channelId)) return
  
  syncingChannels.value.push(channelId)
  try {
    await api.post(`/channels/${channelId}/sync`, {
      date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Últimos 30 días
      date_to: new Date().toISOString()
    })
    
    alert('Sincronización completada')
    await fetchStats()
    await fetchChannels()
    await fetchOrders()
  } catch (error) {
    console.error('Error syncing channel:', error)
    alert('Error en la sincronización')
  } finally {
    syncingChannels.value = syncingChannels.value.filter(id => id !== channelId)
  }
}

async function addChannel() {
  if (addingChannel.value) return
  
  addingChannel.value = true
  try {
    const companyId = user.value?.company?._id
    await api.post(`/companies/${companyId}/channels`, newChannel.value)
    
    showAddChannelModal.value = false
    newChannel.value = {
      channel_type: '',
      channel_name: '',
      api_key: '',
      api_secret: '',
      store_url: ''
    }
    
    await fetchChannels()
    alert('Canal agregado exitosamente')
  } catch (error) {
    console.error('Error adding channel:', error)
    alert('Error al agregar el canal')
  } finally {
    addingChannel.value = false
  }
}

async function exportOrders() {
  try {
    const params = new URLSearchParams()
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    
    const response = await api.get(`/orders/export?${params}`, {
      responseType: 'blob'
    })
    
    // Crear link de descarga
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `optiroute_export_${Date.now()}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Error exporting orders:', error)
    alert('Error al exportar pedidos')
  }
}

function goToPage(page) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page
    fetchOrders()
  }
}

// Búsqueda con debounce
let searchTimeout
function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    fetchOrders()
  }, 500)
}

// Funciones auxiliares
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getChannelTypeName(type) {
  const names = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce', 
    mercadolibre: 'MercadoLibre',
    falabella: 'Falabella',
    ripley: 'Ripley'
  }
  return names[type] || type
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  }
  return names[status] || status
}

function viewOrder(order) {
  // TODO: Implementar modal de detalles del pedido
  alert(`Ver detalles del pedido ${order.order_number}`)
}

function updateOrderStatus(order) {
  // TODO: Implementar modal para cambiar estado
  alert(`Cambiar estado del pedido ${order.order_number}`)
}

function showChannelDetails(channel) {
  // TODO: Implementar modal de detalles del canal
  alert(`Detalles del canal ${channel.channel_name}`)
}

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<style scoped>
.store-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.dashboard-header h1 {
  color: #1f2937;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #dc2626;
}

.loading {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 5px;
}

.stat-change {
  font-size: 12px;
  color: #10b981;
}

.status-summary {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 30px;
}

.status-summary h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.status-item {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid;
}

.status-item.pending { border-color: #f59e0b; background: #fef3c7; }
.status-item.processing { border-color: #3b82f6; background: #dbeafe; }
.status-item.shipped { border-color: #8b5cf6; background: #e9d5ff; }
.status-item.delivered { border-color: #10b981; background: #d1fae5; }

.status-count {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.status-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.channels-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 30px;
}

.channels-section h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.channel-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: #f9fafb;
}

.channel-card.inactive {
  opacity: 0.6;
  background: #f3f4f6;
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.channel-header h3 {
  margin: 0;
  color: #1f2937;
}

.channel-type {
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.channel-stats {
  margin-bottom: 15px;
}

.channel-stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.channel-stat .label {
  color: #6b7280;
}

.channel-stat .value {
  color: #1f2937;
  font-weight: 500;
}

.channel-actions {
  display: flex;
  gap: 10px;
}

.sync-btn, .details-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}

.sync-btn:hover, .details-btn:hover {
  background: #f3f4f6;
}

.sync-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-channel-card {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.add-channel-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 20px;
}

.add-channel-btn:hover {
  color: #3b82f6;
}

.add-channel-btn .plus {
  font-size: 48px;
  font-weight: 300;
}

.filters-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 30px;
}

.filters-section h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  align-items: center;
}

.filters select,
.filters input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-input {
  grid-column: span 2;
}

.export-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.export-btn:hover {
  background: #059669;
}

.orders-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.orders-table-wrapper {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th {
  background: #f9fafb;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.orders-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.order-row:hover {
  background: #f9fafb;
}

.customer-name {
  font-weight: 500;
  color: #1f2937;
}

.customer-email {
  font-size: 12px;
  color: #6b7280;
}

.channel-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.channel-badge.shopify { background: #95f3d9; color: #065f46; }
.channel-badge.woocommerce { background: #c7d2fe; color: #312e81; }
.channel-badge.mercadolibre { background: #fed7aa; color: #9a3412; }

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }

.order-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: #f3f4f6;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.action-btn:hover {
  background: #e5e7eb;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.page-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.page-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.page-info {
  color: #6b7280;
  font-size: 14px;
}

.loading-row,
.empty-row {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-style: italic;
}

/* Modal styles */
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

.modal {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #374151;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

.modal-actions button {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.modal-actions button[type="submit"] {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.modal-actions button[type="submit"]:hover {
  background: #2563eb;
}

.modal-actions button[type="button"] {
  background: white;
}

.modal-actions button[type="button"]:hover {
  background: #f3f4f6;
}

.modal-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive design */
@media (max-width: 768px) {
  .store-dashboard {
    padding: 10px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .channels-grid {
    grid-template-columns: 1fr;
  }
  
  .filters {
    grid-template-columns: 1fr;
  }
  
  .search-input {
    grid-column: span 1;
  }
  
  .orders-table-wrapper {
    font-size: 12px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 8px;
  }
  
  .pagination {
    flex-direction: column;
    gap: 10px;
  }
}

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.stat-card,
.channel-card,
.order-row {
  animation: fadeIn 0.3s ease-out;
}

/* Estados de carga */
.sync-btn:disabled {
  background: #f3f4f6;
  color: #9ca3af;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.loading::after {
  content: '';
  width: 20px;
  height: 20px;
  margin-left: 10px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>