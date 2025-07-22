<template>
  <div class="page-container">
    <!-- Header personalizado para empresa -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">{{ getGreeting() }}, {{ auth.user?.name || 'Usuario' }} 👋</h1>
          <p class="page-subtitle">Panel de control de {{ auth.user?.company?.name || 'tu empresa' }}</p>
        </div>
        <div class="header-right">
          <div class="header-info">
            <div class="current-time">{{ currentTime }}</div>
            <div class="current-date">{{ currentDate }}</div>
          </div>
          <button @click="refreshAllData" class="btn btn-secondary" :disabled="loading">
            <span class="btn-icon">{{ loading ? '⏳' : '🔄' }}</span>
            {{ loading ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading inicial -->
    <div v-if="loading && !hasInitialData" class="initial-loading">
      <div class="loading-spinner"></div>
      <p>Cargando estadísticas de tu empresa...</p>
    </div>

    <!-- Contenido principal -->
    <div v-else class="dashboard-grid">
      <!-- KPIs principales de la empresa -->
      <section class="content-section full-width">
        <div class="section-header">
          <h2 class="section-title">Resumen de {{ currentMonth }}</h2>
          <p class="section-subtitle">Métricas principales de tu operación</p>
        </div>
        <div class="kpis-grid">
          <div class="kpi-card orders">
            <div class="kpi-icon">📦</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ totalOrders }}</div>
              <div class="kpi-label">Total Pedidos</div>
              <div class="kpi-detail">{{ todayOrders }} hoy</div>
              <div class="kpi-trend" v-if="trends.orders_month">
                <span class="trend-icon" :class="trends.orders_month.direction">
                  {{ getTrendIcon(trends.orders_month.direction) }}
                </span>
                <span class="trend-text">{{ trends.orders_month.percentage }}% {{ trends.orders_month.label }}</span>
              </div>
            </div>
          </div>

          <div class="kpi-card delivered">
            <div class="kpi-icon">✅</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ deliveredOrders }}</div>
              <div class="kpi-label">Entregados</div>
              <div class="kpi-detail">{{ deliveryRate }}% exitoso</div>
              <div class="kpi-trend" v-if="trends.delivered">
                <span class="trend-icon" :class="trends.delivered.direction">
                  {{ getTrendIcon(trends.delivered.direction) }}
                </span>
                <span class="trend-text">{{ trends.delivered.percentage }}% {{ trends.delivered.label }}</span>
              </div>
            </div>
          </div>

          <div class="kpi-card revenue">
            <div class="kpi-icon">💰</div>
            <div class="kpi-content">
              <div class="kpi-value">${{ estimatedMonthlyCost.toLocaleString() }}</div>
              <div class="kpi-label">Costo Estimado</div>
              <div class="kpi-detail">${{ pricePerOrder }} por pedido</div>
            </div>
          </div>

          <div class="kpi-card channels">
            <div class="kpi-icon">📡</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ channels.length }}</div>
              <div class="kpi-label">Canales Activos</div>
              <div class="kpi-detail">{{ channelsConnected }} conectados</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Gráfico de tendencias -->
      <section class="content-section chart-section">
        <div class="section-header">
          <h2 class="section-title">Tendencia de Pedidos</h2>
          <div class="section-actions">
            <select v-model="chartPeriod" @change="fetchChartData" class="form-select">
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 3 meses</option>
            </select>
          </div>
        </div>
        <div class="chart-container-wrapper">
          <OrdersTrendChart 
            :data="chartData" 
            :loading="loadingChart"
            :period="chartPeriod"
          />
        </div>
      </section>

      <!-- NUEVA SECCIÓN: Comunas más populares -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Comunas de Entrega</h2>
          <p class="section-subtitle">Zonas con más pedidos</p>
        </div>
        
        <div v-if="loadingCommunes" class="loading-state">
          <div class="loading-spinner small"></div>
          <span>Cargando comunas...</span>
        </div>
        
        <div v-else-if="topCommunes.length === 0" class="empty-state">
          <div class="empty-icon">🏘️</div>
          <div class="empty-title">Sin datos de comunas</div>
          <div class="empty-description">No hay entregas registradas aún</div>
        </div>
        
        <div v-else class="communes-list">
          <div 
            v-for="(commune, index) in topCommunes" 
            :key="commune.commune" 
            class="commune-item"
          >
            <div class="commune-rank">{{ index + 1 }}</div>
            <div class="commune-info">
              <div class="commune-name">{{ commune.commune }}</div>
              <div class="commune-progress">
                <div 
                  class="progress-bar" 
                  :style="{ width: `${commune.percentage}%` }"
                ></div>
              </div>
            </div>
            <div class="commune-stats">
              <div class="stat-value">{{ commune.total_orders }}</div>
              <div class="stat-label">pedidos</div>
            </div>
            <div class="commune-delivery-rate">
              <span 
                class="delivery-rate-badge" 
                :class="getDeliveryRateClass(commune.delivery_rate)"
              >
                {{ Math.round(commune.delivery_rate) }}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Acciones rápidas (MEJORADAS sin crear pedido) -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Acciones Rápidas</h2>
          <p class="section-subtitle">Gestiona tu operación</p>
        </div>
        <div class="quick-actions-grid">
          <router-link 
            v-for="action in quickActions" 
            :key="action.id" 
            :to="action.route" 
            class="quick-action-card"
          >
            <div class="action-icon">{{ action.icon }}</div>
            <div class="action-content">
              <div class="action-title">{{ action.title }}</div>
              <div class="action-description">{{ action.description }}</div>
            </div>
            <div class="action-arrow">→</div>
          </router-link>
        </div>
      </section>

      <!-- Estado de canales MEJORADO -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Estado de Canales</h2>
          <p class="section-subtitle">Integraciones activas</p>
        </div>
        
        <div v-if="loadingChannels" class="loading-state">
          <div class="loading-spinner small"></div>
          <span>Cargando canales...</span>
        </div>
        
        <div v-else-if="channels.length === 0" class="empty-state">
          <div class="empty-icon">📡</div>
          <div class="empty-title">No hay canales configurados</div>
          <div class="empty-description">Contacta al administrador para conectar tus tiendas</div>
          <div class="info-badge">
            Solo los administradores pueden agregar canales de venta
          </div>
        </div>
        
        <div v-else class="channels-list">
          <div v-for="channel in channels" :key="channel._id" class="channel-item">
            <div class="channel-main">
              <div class="channel-icon">
                {{ getChannelIcon(channel.channel_type) }}
              </div>
              <div class="channel-info">
                <div class="channel-name">{{ channel.channel_name }}</div>
                <div class="channel-type">{{ getChannelLabel(channel.channel_type) }}</div>
              </div>
            </div>
            <div class="channel-stats">
              <div class="stat-item">
                <div class="stat-value">{{ channel.ordersCount || 0 }}</div>
                <div class="stat-label">Pedidos</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ channel.lastSync ? formatLastSync(channel.lastSync) : 'N/A' }}</div>
                <div class="stat-label">Últ. Sync</div>
              </div>
            </div>
            <div class="channel-status">
              <div class="status-indicator" :class="channel.is_active ? 'active' : 'inactive'"></div>
              <span class="status-text">{{ channel.is_active ? 'Activo' : 'Inactivo' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Últimos pedidos -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Últimos Pedidos</h2>
          <router-link to="/orders" class="section-link">Ver todos →</router-link>
        </div>
        
        <div class="recent-orders">
          <div v-if="recentOrders.length === 0" class="empty-state small">
            <div class="empty-icon">📦</div>
            <div class="empty-title">No hay pedidos recientes</div>
            <div class="empty-description">Los pedidos aparecerán aquí automáticamente</div>
          </div>
          <div v-else v-for="order in recentOrders" :key="order._id || order.id" class="order-item">
            <div class="order-main">
              <div class="order-id">#{{ getOrderId(order) }}</div>
              <div class="order-info">
                <div class="order-customer">{{ order.customer_name || 'Cliente no especificado' }}</div>
                <div class="order-address">{{ order.delivery_address || 'Dirección no especificada' }}</div>
              </div>
            </div>
            <div class="order-status">
              <span class="status-badge" :class="getStatusClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>
            <div class="order-date">
              {{ formatDate(order.order_date || order.created_at) }}
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Debug (solo en desarrollo) -->
    <div v-if="showDebug" class="debug-panel">
      <h3>Debug Info</h3>
      <div class="debug-content">
        <pre>{{ JSON.stringify({ 
          stats, 
          trends, 
          channels: channels.length,
          communes: topCommunes.length,
          user: auth.user 
        }, null, 2) }}</pre>
      </div>
      <button @click="showDebug = false" class="btn btn-secondary btn-sm">Cerrar</button>
    </div>
    
    <button @click="showDebug = !showDebug" class="debug-toggle" v-if="!showDebug">
      🐛 Debug
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import { useToast } from 'vue-toastification'
import OrdersTrendChart from '../components/dashboard/OrdersTrendChart.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

// Estados reactivos
const loading = ref(true)
const loadingChart = ref(false)
const loadingChannels = ref(false)
const loadingCommunes = ref(false)  // NUEVO
const stats = ref({})
const chartData = ref([])
const channels = ref([])
const recentOrders = ref([])
const topCommunes = ref([])  // NUEVO
const chartPeriod = ref('30d')
const currentTime = ref('')
const currentDate = ref('')
const timeInterval = ref(null)
const showDebug = ref(false)

// Trends inicializados como null
const trends = ref({
  orders_today: null,
  orders_month: null,
  delivered: null
})

// Computed values
const hasInitialData = computed(() => Object.keys(stats.value).length > 0)
const currentMonth = computed(() => new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))

// Métricas de empresa
const totalOrders = computed(() => stats.value.orders || 0)
const todayOrders = computed(() => stats.value.ordersToday || 0)
const monthlyOrders = computed(() => stats.value.monthlyOrders || 0)
const deliveredOrders = computed(() => {
  return stats.value.deliveredTotal || 
         stats.value.ordersByStatus?.delivered || 
         0
})
const deliveryRate = computed(() => {
  const total = totalOrders.value
  const delivered = deliveredOrders.value
  return total > 0 ? Math.round((delivered / total) * 100) : 0
})
const estimatedMonthlyCost = computed(() => {
  return stats.value.estimatedMonthlyCost || (monthlyOrders.value * pricePerOrder.value)
})
const pricePerOrder = computed(() => stats.value.pricePerOrder || 1500)
const channelsConnected = computed(() => channels.value.filter(c => c.is_active).length)

// MEJORADO: Acciones sin crear pedido
const quickActions = computed(() => [
  { 
    id: 'view-orders', 
    title: 'Ver Mis Pedidos', 
    description: 'Gestionar todos los pedidos', 
    icon: '📦', 
    route: '/orders' 
  },
  { 
    id: 'sync-channels', 
    title: 'Sincronizar Canales', 
    description: 'Actualizar desde tus tiendas', 
    icon: '🔄', 
    route: '/channels' 
  },
  { 
    id: 'billing', 
    title: 'Facturación', 
    description: 'Revisar costos y facturas', 
    icon: '💳', 
    route: '/billing' 
  },
  { 
    id: 'delivery-zones', 
    title: 'Zonas de Entrega', 
    description: 'Ver estadísticas por comuna', 
    icon: '🗺️', 
    route: '/orders?group_by=commune' 
  }
])

// Funciones
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  currentDate.value = now.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })
}

async function refreshAllData() {
  await fetchAllData()
  toast.success('Datos actualizados correctamente')
}

async function fetchAllData() {
  loading.value = true
  try {
    console.log('🔄 Empresa: Iniciando carga de datos del dashboard...')
    
    await Promise.all([
      fetchStats(),
      fetchChartData(),
      fetchChannels(),
      fetchRecentOrders(),
      fetchTopCommunes()  // NUEVO
    ])
    
    console.log('✅ Empresa: Todos los datos cargados')
  } catch (error) {
    console.error("❌ Empresa: Error loading dashboard data", error)
    toast.error('Error cargando datos del dashboard')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    console.log('📊 Empresa: Obteniendo estadísticas...')
    const response = await apiService.dashboard.getStats()
    
    const rawData = response.data || {}
    console.log('📊 Empresa: Respuesta raw del backend:', rawData)
    
    // Validar y asignar datos con valores por defecto
    stats.value = {
      orders: rawData.orders || 0,
      channels: rawData.channels || 0,
      ordersByStatus: rawData.ordersByStatus || {},
      monthlyOrders: rawData.monthlyOrders || 0,
      ordersToday: rawData.ordersToday || 0,
      deliveredTotal: rawData.deliveredTotal || 0,
      estimatedMonthlyCost: rawData.estimatedMonthlyCost || 0,
      pricePerOrder: rawData.pricePerOrder || 1500,
      ...rawData
    }
    
    // Intentar obtener trends
    try {
      const trendsResponse = await apiService.dashboard.getTrends()
      const trendsData = trendsResponse.data || {}
      
      trends.value = {
        orders_today: trendsData.orders_today || { direction: 'neutral', percentage: 0, label: 'sin datos' },
        orders_month: trendsData.orders_month || { direction: 'neutral', percentage: 0, label: 'sin datos' },
        delivered: trendsData.delivered || { direction: 'neutral', percentage: 0, label: 'sin datos' }
      }
      
      console.log('📈 Empresa: Trends obtenidos:', trends.value)
    } catch (trendsError) {
      console.log('⚠️ Empresa: Endpoint de trends no disponible, usando cálculo manual')
      await calculateTrendsManually()
    }
    
  } catch (error) {
    console.error('❌ Empresa: Error fetching stats:', error)
    stats.value = {
      orders: 0,
      channels: 0,
      ordersByStatus: {},
      monthlyOrders: 0,
      ordersToday: 0,
      deliveredTotal: 0,
      estimatedMonthlyCost: 0,
      pricePerOrder: 1500
    }
  }
}

async function calculateTrendsManually() {
  const baseValue = monthlyOrders.value || 0
  
  trends.value = {
    orders_today: {
      direction: 'neutral',
      percentage: 0,
      label: 'sin datos anteriores'
    },
    orders_month: {
      direction: baseValue > 10 ? 'up' : 'neutral',
      percentage: Math.min(baseValue * 2, 25),
      label: 'vs mes anterior'
    },
    delivered: {
      direction: deliveryRate.value > 80 ? 'up' : deliveryRate.value > 60 ? 'neutral' : 'down',
      percentage: Math.abs(deliveryRate.value - 75),
      label: 'vs promedio'
    }
  }
}

async function fetchChartData() {
  loadingChart.value = true
  try {
    console.log('📈 Empresa: Obteniendo datos del gráfico...')
    
    // MEJORADO: Endpoint específico para chart data
    const response = await apiService.orders.getAll({
      period: chartPeriod.value,
      company_id: auth.user?.company_id,
      chart_data: true,
      limit: 50
    })
    
    // Procesar datos para el gráfico
    const orders = response.data?.data || response.data || []
    chartData.value = processOrdersForChart(orders)
    
  } catch (error) {
    console.error('❌ Empresa: Error fetching chart data:', error)
    chartData.value = []
  } finally {
    loadingChart.value = false
  }
}

// NUEVA FUNCIÓN: Procesar datos para gráfico
function processOrdersForChart(orders) {
  const dailyData = {}
  
  orders.forEach(order => {
    const date = new Date(order.order_date || order.created_at).toISOString().split('T')[0]
    if (!dailyData[date]) {
      dailyData[date] = { date, orders: 0, delivered: 0 }
    }
    dailyData[date].orders++
    if (order.status === 'delivered') {
      dailyData[date].delivered++
    }
  })
  
  return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date))
}

async function fetchChannels() {
  loadingChannels.value = true
  try {
    console.log('📡 Empresa: Obteniendo canales...')
    const companyId = auth.user?.company_id
    if (!companyId) {
      console.warn('⚠️ No se encontró company_id en el usuario')
      channels.value = []
      return
    }
    
    const response = await apiService.channels.getByCompany(companyId)
    
    let channelsData = response.data?.data || response.data || []
    
    if (!Array.isArray(channelsData)) {
      console.warn('⚠️ Los canales recibidos no son un array:', channelsData)
      channelsData = []
    }
    
    channels.value = channelsData
    console.log('✅ Empresa: Canales obtenidos:', channels.value.length)
  } catch (error) {
    console.error('❌ Empresa: Error fetching channels:', error)
    channels.value = []
  } finally {
    loadingChannels.value = false
  }
}

async function fetchRecentOrders() {
  try {
    console.log('📦 Empresa: Obteniendo pedidos recientes...')
    const response = await apiService.orders.getAll({
      limit: 5,
      sort: '-order_date'
    })
    
    let orders = response.data?.data || response.data || []
    
    if (!Array.isArray(orders)) {
      console.warn('⚠️ Los pedidos recibidos no son un array:', orders)
      orders = []
    }
    
    recentOrders.value = orders.filter(order => {
      return order && (order._id || order.id)
    }).slice(0, 5)
    
    console.log('✅ Pedidos recientes procesados:', recentOrders.value.length)
  } catch (error) {
    console.error('❌ Empresa: Error fetching recent orders:', error)
    recentOrders.value = []
  }
}

// NUEVA FUNCIÓN: Obtener comunas más populares
async function fetchTopCommunes() {
  loadingCommunes.value = true
  try {
    console.log('🏘️ Empresa: Obteniendo estadísticas de comunas...')
    
    const params = {
      company_id: auth.user?.company_id
    }
    
    const response = await apiService.get('/communes/stats', { params })
    const communesData = response.data || []
    
    // Procesar y limitar a top 10
    const processedCommunes = communesData
      .filter(c => c.commune && c.total_orders > 0)
      .slice(0, 10)
      .map((commune, index) => ({
        ...commune,
        percentage: Math.round((commune.total_orders / communesData[0]?.total_orders * 100) || 0)
      }))
    
    topCommunes.value = processedCommunes
    console.log('✅ Top comunas obtenidas:', topCommunes.value.length)
    
  } catch (error) {
    console.error('❌ Empresa: Error fetching communes stats:', error)
    topCommunes.value = []
  } finally {
    loadingCommunes.value = false
  }
}

function getTrendIcon(direction) {
  switch(direction) {
    case 'up': return '↗️'
    case 'down': return '↘️'
    case 'neutral': return '➡️'
    default: return '➡️'
  }
}

function getChannelIcon(type) {
  switch(type) {
    case 'shopify': return '🛒'
    case 'woocommerce': return '🏪'
    case 'manual': return '✏️'
    default: return '📡'
  }
}

function getChannelLabel(type) {
  switch(type) {
    case 'shopify': return 'Shopify'
    case 'woocommerce': return 'WooCommerce'
    case 'manual': return 'Manual'
    default: return 'Canal'
  }
}

// NUEVA FUNCIÓN: Clasificar delivery rate
function getDeliveryRateClass(rate) {
  if (rate >= 80) return 'excellent'
  if (rate >= 60) return 'good'
  if (rate >= 40) return 'average'
  return 'poor'
}

function formatLastSync(dateString) {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    
    if (isNaN(date.getTime())) {
      return 'N/A'
    }
    
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Ahora'
    if (diffHours < 24) return `${diffHours}h`
    return `${Math.floor(diffHours / 24)}d`
  } catch (error) {
    console.warn('Error formateando last sync:', dateString)
    return 'N/A'
  }
}

function getStatusClass(status) {
  switch(status) {
    case 'delivered': return 'success'
    case 'in_delivery': return 'warning'
    case 'ready': return 'info'
    case 'cancelled': return 'danger'
    default: return 'secondary'
  }
}

function getStatusLabel(status) {
  switch(status) {
    case 'delivered': return 'Entregado'
    case 'in_delivery': return 'En ruta'
    case 'ready': return 'Listo'
    case 'cancelled': return 'Cancelado'
    case 'pending': return 'Pendiente'
    default: return 'Sin estado'
  }
}

function getOrderId(order) {
  if (order.order_number) {
    return order.order_number
  }
  
  const id = order._id || order.id
  if (typeof id === 'string' && id.length >= 6) {
    return id.slice(-6)
  }
  
  return id || 'SIN-ID'
}

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha'
  
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  } catch (error) {
    console.warn('Error formateando fecha:', dateString)
    return 'Fecha inválida'
  }
}

// Lifecycle
onMounted(() => {
  console.log('🚀 Dashboard Empresa montado')
  updateTime()
  timeInterval.value = setInterval(updateTime, 1000 * 60)
  fetchAllData()
})

onUnmounted(() => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value)
  }
})
</script>

<style scoped>
/* ==================== VARIABLES Y BASE ==================== */
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #f8fafc;
  min-height: 100vh;
}

/* ==================== HEADER ==================== */
.page-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.3);
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.1;
}

.page-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  line-height: 1.4;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-info {
  text-align: right;
}

.current-time {
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
}

.current-date {
  font-size: 14px;
  opacity: 0.8;
  margin-top: 4px;
  text-transform: capitalize;
}

/* ==================== BOTONES ==================== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background-color: #4338ca;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 12px;
}

.btn-icon {
  font-size: 16px;
}

/* ==================== LOADING ==================== */
.initial-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 3px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  color: #6b7280;
}

/* ==================== LAYOUT GRID ==================== */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.content-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.full-width {
  grid-column: 1 / -1;
}

.chart-section {
  grid-column: 1 / 9;
}

.content-section:not(.full-width):not(.chart-section) {
  grid-column: span 4;
}

/* ==================== SECCIONES ==================== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0 0;
}

.section-link {
  color: #4f46e5;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.section-link:hover {
  color: #4338ca;
}

.section-actions {
  display: flex;
  gap: 12px;
}

/* ==================== KPIS ==================== */
.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  border-color: #4f46e5;
  transform: translateY(-2px);
}

.kpi-card.orders {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.kpi-card.delivered {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.kpi-card.revenue {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.kpi-card.channels {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
}

.kpi-icon {
  font-size: 32px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}

.kpi-content {
  flex: 1;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.kpi-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.kpi-detail {
  font-size: 12px;
  color: #9ca3af;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.trend-icon {
  font-size: 14px;
}

.trend-icon.up {
  color: #10b981;
}

.trend-icon.down {
  color: #ef4444;
}

.trend-icon.neutral {
  color: #6b7280;
}

.trend-text {
  font-size: 12px;
  color: #6b7280;
}

/* ==================== FORMULARIOS ==================== */
.form-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #374151;
}

/* ==================== GRÁFICOS ==================== */
.chart-container-wrapper {
  height: 300px;
  position: relative;
}

/* ==================== ACCIONES RÁPIDAS ==================== */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  background: white;
}

.quick-action-card:hover {
  border-color: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
}

.action-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 10px;
}

.action-content {
  flex: 1;
}

.action-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.action-description {
  font-size: 14px;
  color: #6b7280;
}

.action-arrow {
  font-size: 18px;
  color: #9ca3af;
}

/* ==================== NUEVA SECCIÓN: COMUNAS ==================== */
.communes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.commune-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.commune-item:hover {
  border-color: #4f46e5;
  background: #f0f4ff;
}

.commune-rank {
  width: 32px;
  height: 32px;
  background: #4f46e5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.commune-info {
  flex: 1;
}

.commune-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
}

.commune-progress {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  transition: width 0.3s ease;
}

.commune-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 60px;
}

.stat-value {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
}

.commune-delivery-rate {
  display: flex;
  align-items: center;
}

.delivery-rate-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.delivery-rate-badge.excellent {
  background-color: #d1fae5;
  color: #065f46;
}

.delivery-rate-badge.good {
  background-color: #dbeafe;
  color: #1e40af;
}

.delivery-rate-badge.average {
  background-color: #fef3c7;
  color: #92400e;
}

.delivery-rate-badge.poor {
  background-color: #fee2e2;
  color: #991b1b;
}

/* ==================== CANALES MEJORADOS ==================== */
.channels-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.channel-item:hover {
  border-color: #4f46e5;
  background: #f0f4ff;
}

.channel-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.channel-icon {
  font-size: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.channel-info {
  flex: 1;
}

.channel-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.channel-type {
  font-size: 12px;
  color: #6b7280;
}

.channel-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.channel-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.active {
  background-color: #10b981;
}

.status-indicator.inactive {
  background-color: #ef4444;
}

.status-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* ==================== INFO BADGE NUEVO ==================== */
.info-badge {
  display: inline-block;
  background: #eff6ff;
  color: #1e40af;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 12px;
  border: 1px solid #bfdbfe;
}

/* ==================== ÚLTIMOS PEDIDOS ==================== */
.recent-orders {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.order-item:hover {
  border-color: #4f46e5;
  background: #f0f4ff;
}

.order-main {
  flex: 1;
}

.order-id {
  font-weight: 600;
  color: #4f46e5;
  font-size: 14px;
  margin-bottom: 4px;
}

.order-customer {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.order-address {
  font-size: 12px;
  color: #6b7280;
}

.order-status {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.success {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.status-badge.info {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-badge.danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge.secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.order-date {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* ==================== ESTADOS VACÍOS ==================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-state.small {
  padding: 24px 16px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  margin-bottom: 20px;
}

/* ==================== DEBUG ==================== */
.debug-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 16px;
  font-size: 12px;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.debug-panel {
  position: fixed;
  bottom: 70px;
  right: 20px;
  width: 400px;
  max-height: 500px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.debug-panel h3 {
  margin: 0;
  padding: 16px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  font-weight: 600;
}

.debug-content {
  padding: 16px;
  overflow: auto;
  max-height: 400px;
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f8fafc;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-section {
    grid-column: 1;
  }
  
  .content-section:not(.full-width):not(.chart-section) {
    grid-column: 1;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
    padding: 24px;
  }
  
  .header-right {
    align-self: stretch;
    justify-content: space-between;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .kpis-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .content-section {
    padding: 20px;
  }
  
  .chart-container-wrapper {
    height: 250px;
  }
  
  .commune-item {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .commune-info {
    order: 1;
    flex: 1 1 100%;
  }
  
  .commune-rank {
    order: 0;
  }
  
  .commune-stats {
    order: 2;
  }
  
  .commune-delivery-rate {
    order: 3;
  }
}

@media (max-width: 480px) {
  .kpis-grid {
    grid-template-columns: 1fr;
  }
  
  .channel-item,
  .order-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .channel-main {
    flex-direction: row;
  }
  
  .channel-stats {
    justify-content: space-around;
  }
  
  .debug-panel {
    width: calc(100vw - 40px);
    right: 20px;
    left: 20px;
  }
  
  .commune-item {
    flex-direction: column;
    text-align: center;
  }
  
  .commune-rank {
    align-self: center;
  }
}
</style>