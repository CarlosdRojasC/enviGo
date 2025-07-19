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
              <div class="kpi-value">{{ stats.orders?.orders_today || 0 }}</div>
              <div class="kpi-label">Pedidos Hoy</div>
              <div class="kpi-trend" v-if="trends.orders_today">
                <span class="trend-icon">{{ trends.orders_today.direction === 'up' ? '↗' : '↘' }}</span>
                <span class="trend-text">{{ trends.orders_today.percentage }}% {{ trends.orders_today.label }}</span>
              </div>
            </div>
          </div>

          <div class="kpi-card orders">
            <div class="kpi-icon">📅</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats.orders?.orders_this_month || 0 }}</div>
              <div class="kpi-label">Pedidos Este Mes</div>
              <div class="kpi-trend" v-if="trends.orders_month">
                <span class="trend-icon">{{ trends.orders_month.direction === 'up' ? '↗' : '↘' }}</span>
                <span class="trend-text">{{ trends.orders_month.percentage }}% {{ trends.orders_month.label }}</span>
              </div>
            </div>
          </div>

          <div class="kpi-card success">
            <div class="kpi-icon">✅</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats.orders?.delivered || 0 }}</div>
              <div class="kpi-label">Entregados</div>
              <div class="kpi-detail">{{ deliveryRate }}% de éxito</div>
              <div class="kpi-trend" v-if="trends.delivered">
                <span class="trend-icon" :class="trends.delivered.direction">
                  {{ getTrendIcon(trends.delivered.direction) }}
                </span>
                <span class="trend-text">
                  {{ trends.delivered.percentage }}% {{ trends.delivered.label }}
                </span>
              </div>
            </div>
          </div>

          <div class="kpi-card revenue">
            <div class="kpi-icon">💰</div>
            <div class="kpi-content">
              <div class="kpi-value">${{ formatCurrency(stats.monthly_cost || 0) }}</div>
              <div class="kpi-label">Costo del Mes</div>
              <div class="kpi-detail">${{ stats.price_per_order || 0 }} por pedido</div>
            </div>
          </div>
        </div>
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
          <OrdersTrendChart :data="chartData" :loading="loadingChart" height="320" />
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
    </div>
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

const trends = ref({
  orders_today: null,
  orders_month: null,
  delivered: null
})

const hasInitialData = computed(() => Object.keys(stats.value).length > 0)
const currentMonth = computed(() => new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))
const deliveryRate = computed(() => {
  const total = stats.value.orders?.total_orders || 0
  const delivered = stats.value.orders?.delivered || 0
  return total > 0 ? Math.round((delivered / total) * 100) : 0
})

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
    await Promise.all([
      fetchStats(),
      fetchChartData(),
      fetchChannels()
    ])
  } catch (error) {
    console.error("Error loading dashboard data", error)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    // Obtener estadísticas y trends en paralelo
    const [statsResponse, trendsResponse] = await Promise.all([
      apiService.dashboard.getStats(),
      apiService.dashboard.getTrends()
    ])
    
    stats.value = statsResponse.data
    trends.value = trendsResponse.data
    
    console.log('📊 Stats cargadas:', stats.value)
    console.log('📈 Trends calculadas:', trends.value)
    
  } catch (error) {
    console.error('Error fetching stats:', error)
    // Si falla el endpoint de trends, calcular manualmente
    if (error.response?.status === 404) {
      await calculateTrends()
    }
  }
}

async function fetchChartData() {
  loadingChart.value = true
  try {
    const { data } = await apiService.orders.getTrend({ period: chartPeriod.value })
    chartData.value = data
  } catch (error) {
    console.error('Error fetching chart data:', error)
    chartData.value = []
  } finally {
    loadingChart.value = false
  }
}

async function fetchChannels() {
  loadingChannels.value = true
  try {
    const companyId = auth.user?.company?._id || auth.user?.company_id
    if (companyId) {
      const { data } = await channelsService.getByCompany(companyId)
      channels.value = data || []
    }
  } catch (error) {
    console.error('Error fetching channels:', error)
    channels.value = []
  } finally {
    loadingChannels.value = false
  }
}

async function calculateTrends() {
  try {
    // Obtener datos de comparación para calcular trends
    const [todayData, monthData, deliveredData] = await Promise.all([
      calculateTodayTrend(),
      calculateMonthTrend(), 
      calculateDeliveredTrend()
    ])
    
    trends.value = {
      orders_today: todayData,
      orders_month: monthData,
      delivered: deliveredData
    }
  } catch (error) {
    console.error('Error calculating trends:', error)
    // Mantener trends como null si hay error
  }
}

async function calculateTodayTrend() {
  try {
    // Comparar hoy vs ayer
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayCount = stats.value.orders?.orders_today || 0
    
    // Obtener pedidos de ayer usando la API de tendencias
    const yesterdayResponse = await apiService.orders.getTrend({ period: '24h' })
    const yesterdayData = yesterdayResponse.data || []
    
    // Buscar el dato de ayer en la respuesta
    const yesterdayCount = yesterdayData.length >= 2 ? 
      yesterdayData[yesterdayData.length - 2]?.count || 0 : 0
    
    if (yesterdayCount === 0) {
      return todayCount > 0 ? 
        { direction: 'up', percentage: 100, label: 'vs ayer' } :
        { direction: 'neutral', percentage: 0, label: 'vs ayer' }
    }
    
    const percentageChange = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
    
    return {
      direction: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'neutral',
      percentage: Math.abs(percentageChange),
      label: 'vs ayer'
    }
  } catch (error) {
    console.error('Error calculating today trend:', error)
    return null
  }
}

async function calculateMonthTrend() {
  try {
    const currentMonth = stats.value.orders?.orders_this_month || 0
    
    // Obtener datos del mes anterior
    const lastMonthResponse = await apiService.orders.getTrend({ period: '60d' })
    const trendData = lastMonthResponse.data || []
    
    // Calcular pedidos del mes pasado (días 30-60 del período)
    const lastMonthData = trendData.slice(0, 30) // Primeros 30 días son del mes pasado
    const lastMonthCount = lastMonthData.reduce((sum, day) => sum + (day.count || 0), 0)
    
    if (lastMonthCount === 0) {
      return currentMonth > 0 ?
        { direction: 'up', percentage: 100, label: 'vs mes anterior' } :
        { direction: 'neutral', percentage: 0, label: 'vs mes anterior' }
    }
    
    const percentageChange = Math.round(((currentMonth - lastMonthCount) / lastMonthCount) * 100)
    
    return {
      direction: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'neutral',
      percentage: Math.abs(percentageChange),
      label: 'vs mes anterior'
    }
  } catch (error) {
    console.error('Error calculating month trend:', error)
    return null
  }
}

async function calculateDeliveredTrend() {
  try {
    const currentDelivered = stats.value.orders?.delivered || 0
    const currentTotal = stats.value.orders?.total_orders || 0
    const currentRate = currentTotal > 0 ? (currentDelivered / currentTotal) * 100 : 0
    
    // Obtener datos históricos para comparar tasa de entrega
    const historicalResponse = await apiService.orders.getTrend({ period: '60d' })
    const historicalData = historicalResponse.data || []
    
    // Calcular tasa de entrega del período anterior (hace 30-60 días)
    const lastPeriodData = historicalData.slice(0, 30)
    const lastPeriodTotal = lastPeriodData.reduce((sum, day) => sum + (day.count || 0), 0)
    const lastPeriodDelivered = lastPeriodData.reduce((sum, day) => sum + (day.delivered || 0), 0)
    const lastPeriodRate = lastPeriodTotal > 0 ? (lastPeriodDelivered / lastPeriodTotal) * 100 : 0
    
    if (lastPeriodRate === 0) {
      return currentRate > 0 ?
        { direction: 'up', percentage: Math.round(currentRate), label: 'vs período anterior' } :
        { direction: 'neutral', percentage: 0, label: 'vs período anterior' }
    }
    
    const rateChange = currentRate - lastPeriodRate
    const percentageChange = Math.round(Math.abs(rateChange))
    
    return {
      direction: rateChange > 0 ? 'up' : rateChange < 0 ? 'down' : 'neutral',
      percentage: percentageChange,
      label: 'vs período anterior'
    }
  } catch (error) {
    console.error('Error calculating delivered trend:', error)
    return null
  }
}

function refreshAllData() {
  fetchAllData()
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
  const daysSinceSync = channel.last_sync_at 
    ? Math.floor((new Date() - new Date(channel.last_sync_at)) / (1000 * 60 * 60 * 24)) 
    : 999
  
  if (daysSinceSync <= 1) return 'Activo'
  if (daysSinceSync <= 7) return 'Atrasado'
  return 'Inactivo'
}

function getChannelStatusClass(channel) {
  const status = getChannelStatus(channel)
  if (status === 'Activo') return 'active'
  if (status === 'Atrasado') return 'warning'
  return 'inactive'
}

function getTrendIcon(direction) {
  switch(direction) {
    case 'up': return '↗'
    case 'down': return '↘'
    case 'neutral': return '→'
    default: return '→'
  }
}

function getTrendClass(direction) {
  switch(direction) {
    case 'up': return 'trend-up'
    case 'down': return 'trend-down'
    case 'neutral': return 'trend-neutral'
    default: return 'trend-neutral'
  }
}

onMounted(() => {
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
</style>