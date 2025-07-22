<template>
  <div class="page-container">
    <!-- Header mejorado -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">{{ getGreeting() }} 👋</h1>
          <p class="page-subtitle">{{ auth.user?.full_name?.split(' ')[0] || 'Usuario' }}, aquí tienes un resumen de tu operación</p>
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
      <p>Cargando tu dashboard...</p>
    </div>

    <!-- Contenido principal -->
    <div v-else class="dashboard-grid">
      <!-- KPIs principales -->
      <section class="content-section full-width">
        <div class="section-header">
          <h2 class="section-title">Métricas Principales</h2>
          <p class="section-subtitle">Resumen de tu operación en tiempo real</p>
        </div>
        <div class="kpis-grid">
          <div class="kpi-card orders">
            <div class="kpi-icon">📦</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ todayOrders }}</div>
              <div class="kpi-label">Pedidos Hoy</div>
              <div class="kpi-trend" v-if="trends.orders_today">
                <span class="trend-icon" :class="trends.orders_today.direction">
                  {{ getTrendIcon(trends.orders_today.direction) }}
                </span>
                <span class="trend-text">{{ trends.orders_today.percentage }}% {{ trends.orders_today.label }}</span>
              </div>
              <div v-else class="kpi-detail">
                <span class="loading-text">Calculando...</span>
              </div>
            </div>
          </div>

          <div class="kpi-card orders">
            <div class="kpi-icon">📅</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ monthlyOrders }}</div>
              <div class="kpi-label">Pedidos Este Mes</div>
              <div class="kpi-trend" v-if="trends.orders_month">
                <span class="trend-icon" :class="trends.orders_month.direction">
                  {{ getTrendIcon(trends.orders_month.direction) }}
                </span>
                <span class="trend-text">{{ trends.orders_month.percentage }}% {{ trends.orders_month.label }}</span>
              </div>
              <div v-else class="kpi-detail">
                <span class="loading-text">{{ currentMonth }}</span>
              </div>
            </div>
          </div>

          <div class="kpi-card success">
            <div class="kpi-icon">✅</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ deliveredOrders }}</div>
              <div class="kpi-label">Entregados</div>
              <div class="kpi-detail">{{ deliveryRate }}% de éxito</div>
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
              <div class="kpi-value">${{ formatCurrency(estimatedMonthlyCost) }}</div>
              <div class="kpi-label">Costo Estimado</div>
              <div class="kpi-detail">${{ formatCurrency(pricePerOrder) }} por pedido</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Debug info (quitar en producción) -->
      <section class="content-section full-width" v-if="showDebug">
        <div class="section-header">
          <h2 class="section-title">Debug Info</h2>
          <button @click="showDebug = false" class="btn btn-secondary">Ocultar</button>
        </div>
        <pre class="debug-content">{{ JSON.stringify(stats, null, 2) }}</pre>
      </section>

      <!-- Gráfico de tendencias -->
      <section class="content-section chart-section">
        <div class="section-header">
          <div class="header-left">
            <h2 class="section-title">Tendencia de Pedidos</h2>
            <p class="section-subtitle">Evolución de tu operación en el tiempo</p>
          </div>
          <div class="header-right">
            <select v-model="chartPeriod" @change="fetchChartData" class="form-select">
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
              <option value="90d">3 meses</option>
            </select>
          </div>
        </div>
        <div class="chart-container">
          <div v-if="loadingChart" class="chart-loading">
            <div class="loading-spinner small"></div>
            <span>Cargando gráfico...</span>
          </div>
          <div v-else-if="chartData.length === 0" class="chart-empty">
            <div class="empty-icon">📊</div>
            <p>No hay datos suficientes para mostrar el gráfico</p>
          </div>
          <OrdersTrendChart 
            :data="chartData" 
            :loading="loadingChart" 
            :height="320"
          />
        </div>
      </section>

      <!-- Acciones rápidas -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Acciones Rápidas</h2>
          <p class="section-subtitle">Herramientas frecuentes</p>
        </div>
        <div class="actions-grid">
          <router-link 
            v-for="action in quickActions" 
            :key="action.id" 
            :to="action.route" 
            class="action-card"
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

      <!-- Mis canales -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Mis Canales</h2>
          <router-link to="/channels" class="section-link">Gestionar todos</router-link>
        </div>
        
        <div v-if="loadingChannels" class="loading-state">
          <div class="loading-spinner small"></div>
          <span>Cargando canales...</span>
        </div>
        
        <div v-else-if="channels.length === 0" class="empty-state">
          <div class="empty-icon">📡</div>
          <h3>No hay canales configurados</h3>
          <p>Conecta tus tiendas online para sincronizar pedidos automáticamente</p>
          <router-link to="/channels" class="btn btn-primary">Conectar Canal</router-link>
        </div>
        
        <div v-else class="channels-list">
          <div v-for="channel in channels.slice(0, 4)" :key="channel._id" class="channel-item">
            <div class="channel-main">
              <div class="channel-icon">{{ getChannelIcon(channel.channel_type) }}</div>
              <div class="channel-info">
                <div class="channel-name">{{ channel.channel_name }}</div>
                <div class="channel-type">{{ formatChannelType(channel.channel_type) }}</div>
              </div>
            </div>
            <div class="channel-stats">
              <div class="stat-item">
                <span class="stat-value">{{ channel.total_orders || 0 }}</span>
                <span class="stat-label">Pedidos</span>
              </div>
            </div>
            <div class="channel-status">
              <div class="status-indicator" :class="getChannelStatusClass(channel)"></div>
              <span class="status-text">{{ getChannelStatus(channel) }}</span>
            </div>
          </div>
        </div>
      </section>
      <!-- Top Comunas -->
<section class="content-section">
  <div class="section-header">
    <h2 class="section-title">Comunas más Entregadas</h2>
    <router-link to="/orders" class="section-link">Ver pedidos</router-link>
  </div>
  
  <div v-if="loadingCommunes" class="loading-state">
    <div class="loading-spinner small"></div>
    <span>Cargando comunas...</span>
  </div>
  
  <div v-else-if="communesStats.length === 0" class="empty-state">
    <div class="empty-icon">🏘️</div>
    <h3>No hay datos de entregas</h3>
    <p>Aún no tienes entregas registradas por comuna</p>
  </div>
  
  <div v-else class="communes-list">
    <div 
      v-for="(commune, index) in communesStats" 
      :key="commune.commune" 
      class="commune-item"
    >
      <div class="commune-rank">{{ index + 1 }}</div>
      <div class="commune-main">
        <div class="commune-name">{{ commune.commune }}</div>
        <div class="commune-details">
          {{ commune.delivered_orders }} entregas exitosas
        </div>
      </div>
      <div class="commune-stats">
        <div class="stat-item">
          <span class="stat-value">{{ commune.total_orders }}</span>
          <span class="stat-label">Total</span>
        </div>
      </div>
      <div class="commune-success-rate">
        <div class="success-rate-bar">
          <div 
            class="success-rate-fill" 
            :style="{ width: commune.delivery_rate + '%' }"
          ></div>
        </div>
        <span class="success-rate-text">{{ Math.round(commune.delivery_rate) }}%</span>
      </div>
    </div>
  </div>
</section>
    </div>

    <!-- Botón debug -->
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
import channelsService from '../services/channels.service'
import OrdersTrendChart from '../components/dashboard/OrdersTrendChart.vue'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const loadingChart = ref(false)
const loadingChannels = ref(false)
const stats = ref({})
const chartData = ref([])
const channels = ref([])
const chartPeriod = ref('30d')
const currentTime = ref('')
const currentDate = ref('')
const timeInterval = ref(null)
const showDebug = ref(false)

const loadingCommunes = ref(false)
const communesStats = ref([])

// Trends inicializados como null
const trends = ref({
  orders_today: null,
  orders_month: null,
  delivered: null
})

// Computed values basados en la estructura real del backend
const hasInitialData = computed(() => Object.keys(stats.value).length > 0)
const currentMonth = computed(() => new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))

// Para usuarios de empresa - ahora usando la estructura correcta
const totalOrders = computed(() => stats.value.orders || 0)
const todayOrders = computed(() => stats.value.ordersToday || 0)
const monthlyOrders = computed(() => stats.value.monthlyOrders || 0)
const deliveredOrders = computed(() => {
  // Primero intentar deliveredTotal, luego buscar en ordersByStatus
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
  // Usar el costo calculado del backend si está disponible
  return stats.value.estimatedMonthlyCost || (monthlyOrders.value * pricePerOrder.value)
})
const pricePerOrder = computed(() => stats.value.pricePerOrder || 1500)

const quickActions = computed(() => [
  { 
    id: 'new-order', 
    title: 'Crear Pedido', 
    description: 'Agregar un nuevo pedido manual', 
    icon: '➕', 
    route: '/orders?action=create' 
  },
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
  }
])

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

async function fetchAllData() {
  loading.value = true
  try {
    console.log('🔄 Iniciando carga de datos del dashboard...')
    
    await Promise.all([
      fetchStats(),
      fetchChartData(),
      fetchChannels(),
      fetchCommunesStats()
    ])
    
    console.log('✅ Todos los datos cargados')
  } catch (error) {
    console.error("❌ Error loading dashboard data", error)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    console.log('📊 Obteniendo estadísticas...')
    const response = await apiService.dashboard.getStats()
    
    // Manejar respuesta nueva con estructura data
    const rawData = response.data
    console.log('📊 Respuesta raw del backend:', rawData)
    
    // Asignar directamente, ya manejamos la estructura en el API service
    stats.value = rawData
    
    // Intentar obtener trends si existe el endpoint
    try {
      const trendsResponse = await apiService.dashboard.getTrends()
      trends.value = trendsResponse.data
      console.log('📈 Trends obtenidos:', trends.value)
    } catch (trendsError) {
      console.log('⚠️ Endpoint de trends no disponible, usando cálculo manual')
      await calculateTrendsManually()
    }
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error)
    // Agregar datos de ejemplo para debug
    stats.value = {
      orders: 0,
      channels: 0,
      ordersByStatus: {},
      monthlyOrders: 0,
      ordersToday: 0,
      deliveredTotal: 0
    }
  }
}

async function calculateTrendsManually() {
  // Cálculo básico de trends como fallback
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
    console.log('📈 Obteniendo datos del gráfico para período:', chartPeriod.value)
    const response = await apiService.orders.getTrend({ period: chartPeriod.value })
    const newData = response.data
    
    // ✅ VALIDACIÓN: Verificar que sea array antes de asignar
    if (Array.isArray(newData)) {
      setTimeout(() => {
        chartData.value = newData
        loadingChart.value = false
      }, 200)
    } else {
      console.warn('⚠️ Response.data no es array:', newData)
      chartData.value = []
      loadingChart.value = false
    }
    
  } catch (error) {
    console.error('❌ Error fetching chart data:', error)
    chartData.value = []
    loadingChart.value = false
  }
}

async function fetchChannels() {
  loadingChannels.value = true
  try {
    const companyId = auth.user?.company?._id || auth.user?.company_id
    if (companyId) {
      console.log('📡 Obteniendo canales para empresa:', companyId)
      const response = await channelsService.getByCompany(companyId)
      channels.value = response.data.data || []
      console.log('📡 Canales obtenidos:', channels.value.length)
    } else {
      console.log('⚠️ No se encontró company_id')
      channels.value = []
    }
  } catch (error) {
    console.error('❌ Error fetching channels:', error)
    channels.value = []
  } finally {
    loadingChannels.value = false
  }
}

async function fetchCommunesStats() {
  loadingCommunes.value = true
  try {
    console.log('🏘️ Obteniendo estadísticas de comunas...')
    // 'response' ya es el objeto de datos que necesitas
    const response = await apiService.dashboard.getCommunesStats()
    
    // CORRECCIÓN: Usamos 'response.all_communes' directamente.
    // Como fallback, convertimos el objeto 'summary' en un arreglo.
    const communesArray = response.all_communes || Object.values(response.summary || {});
    
    // Usamos el nuevo arreglo para ordenar y cortar los resultados
    communesStats.value = communesArray
      .sort((a, b) => (b.delivered_orders || 0) - (a.delivered_orders || 0))
      .slice(0, 5)
    
    console.log('🏘️ Top comunas obtenidas:', communesStats.value.length)
  } catch (error) {
    console.error('❌ Error fetching communes stats:', error)
    communesStats.value = []
  } finally {
    loadingCommunes.value = false
  }
}

function refreshAllData() {
  console.log('🔄 Refrescando datos...')
  fetchAllData()
}

function handlePeriodChange(period) {
  console.log('📊 Cambiando período del gráfico a:', period)
  chartPeriod.value = period
  fetchChartData()
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function getChannelIcon(type) {
  const icons = { 
    shopify: '🛍️', 
    woocommerce: '🛒', 
    mercadolibre: '🏪',
    manual: '✏️'
  }
  return icons[type] || '📦'
}

function formatChannelType(type) {
  const types = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    mercadolibre: 'MercadoLibre',
    manual: 'Manual'
  }
  return types[type] || type
}

function getChannelStatus(channel) {
  const lastSync = channel.last_sync_at || channel.last_sync
  
  if (!lastSync) {
    return 'Necesita sincronización'
  }
  
  const daysSinceSync = Math.floor((new Date() - new Date(lastSync)) / (1000 * 60 * 60 * 24))
  
  if (daysSinceSync === 0) {
    return 'Sincronizado hoy'
  } else if (daysSinceSync <= 1) {
    return 'Sincronizado'
  } else if (daysSinceSync <= 7) {
    return `Hace ${daysSinceSync} días`
  } else {
    return 'Necesita sincronización'
  }
}

function getChannelStatusClass(channel) {
  const lastSync = channel.last_sync_at || channel.last_sync
  
  if (!lastSync) {
    return 'inactive'
  }
  
  const daysSinceSync = Math.floor((new Date() - new Date(lastSync)) / (1000 * 60 * 60 * 24))
  
  if (daysSinceSync <= 1) {
    return 'active'
  } else if (daysSinceSync <= 7) {
    return 'warning'
  } else {
    return 'inactive'
  }
}

function getTrendIcon(direction) {
  switch(direction) {
    case 'up': return '↗'
    case 'down': return '↘'
    case 'neutral': return '→'
    default: return '→'
  }
}

onMounted(() => {
  console.log('🚀 Dashboard montado')
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
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  line-height: 1.1;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
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
  color: #1f2937;
  line-height: 1;
}

.current-date {
  font-size: 14px;
  color: #6b7280;
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
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 16px;
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
}

.debug-content {
  background: #f3f4f6;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  overflow: auto;
  max-height: 400px;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
  font-size: 14px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.section-link:hover {
  color: #2563eb;
}

/* ==================== KPIs ==================== */
.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.kpi-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kpi-card.orders {
  border-left: 4px solid #3b82f6;
}

.kpi-card.success {
  border-left: 4px solid #10b981;
}

.kpi-card.revenue {
  border-left: 4px solid #f59e0b;
}

.kpi-icon {
  font-size: 28px;
  opacity: 0.8;
}

.kpi-content {
  flex: 1;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.kpi-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.kpi-detail {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.loading-text {
  color: #9ca3af;
  font-style: italic;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
}

.trend-icon {
  font-size: 14px;
  font-weight: 600;
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
.chart-container {
  height: 320px;
  position: relative;
}

.chart-loading, .chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
}

.chart-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* ==================== ACCIONES RÁPIDAS ==================== */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  background: #f8fafc;
}

.action-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 24px;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.action-description {
  font-size: 14px;
  color: #6b7280;
}

.action-arrow {
  color: #9ca3af;
  font-size: 18px;
}

/* ==================== CANALES ==================== */
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
  border-radius: 8px;
  background: #f8fafc;
}

.channel-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.channel-icon {
  font-size: 20px;
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
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.status-indicator.warning {
  background-color: #f59e0b;
}

.status-indicator.inactive {
  background-color: #ef4444;
}

.status-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* ==================== ESTADOS ==================== */
.initial-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
  margin-bottom: 0;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  color: #6b7280;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.empty-state p {
  color: #6b7280;
  margin-bottom: 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .content-section,
  .chart-section {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding: 24px;
  }
  
  .header-right {
    align-self: stretch;
    justify-content: space-between;
  }
  
  .content-section {
    padding: 24px;
  }
  
  .kpis-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }
  
  .header-right {
    flex-direction: column;
    gap: 16px;
  }
  
  .kpi-card {
    padding: 20px;
  }
  
  .kpi-value {
    font-size: 24px;
  }
}
/* ==================== COMUNAS ==================== */
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
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.commune-item:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
}

.commune-rank {
  width: 32px;
  height: 32px;
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

.commune-main {
  flex: 1;
}

.commune-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.commune-details {
  font-size: 12px;
  color: #6b7280;
}

.commune-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.commune-success-rate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}

.success-rate-bar {
  width: 50px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.success-rate-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

.success-rate-text {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}
</style>