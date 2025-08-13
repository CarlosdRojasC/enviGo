<template>
  <div class="page-container">
    <!-- Header mejorado -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">Panel de Administración 🎯</h1>
          <p class="page-subtitle">Gestiona todo el sistema desde aquí</p>
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
      <p>Cargando estadísticas del sistema...</p>
    </div>

    <!-- Contenido principal -->
    <div v-else class="dashboard-grid">
      <!-- KPIs principales -->
      <section class="content-section full-width">
        <div class="section-header">
          <h2 class="section-title">Métricas del Sistema</h2>
          <p class="section-subtitle">Vista global de toda la plataforma</p>
        </div>
        <div class="kpis-grid">
          <div class="kpi-card companies">
            <div class="kpi-icon">🏢</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats.companies || 0 }}</div>
              <div class="kpi-label">Empresas Activas</div>
              <div class="kpi-trend" v-if="trends.companies">
                <span class="trend-icon" :class="trends.companies.direction">
                  {{ getTrendIcon(trends.companies.direction) }}
                </span>
                <span class="trend-text">{{ trends.companies.percentage }}% {{ trends.companies.label }}</span>
              </div>
            </div>
          </div>

          <div class="kpi-card orders">
            <div class="kpi-icon">📦</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ totalOrders }}</div>
              <div class="kpi-label">Total Pedidos</div>
              <div class="kpi-detail">{{ ordersToday }} hoy</div>
              <div class="kpi-trend" v-if="trends.orders_today">
                <span class="trend-icon" :class="trends.orders_today.direction">
                  {{ getTrendIcon(trends.orders_today.direction) }}
                </span>
                <span class="trend-text">{{ trends.orders_today.percentage }}% {{ trends.orders_today.label }}</span>
              </div>
            </div>
          </div>

          <div class="kpi-card success">
            <div class="kpi-icon">✅</div>
            <div class="kpi-content">
              <div class="kpi-value">{{ deliveredOrders }}</div>
              <div class="kpi-label">Pedidos Entregados</div>
              <div class="kpi-detail">{{ deliveryRate }}% de éxito global</div>
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
              <div class="kpi-value">${{ formatCurrency(monthlyRevenue) }}</div>
              <div class="kpi-label">Ingresos del Mes</div>
              <div class="kpi-detail">Costos de envío totales</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Gráfico de tendencias -->
      <section class="content-section chart-section">
        <div class="section-header">
          <div class="header-left">
            <h2 class="section-title">Tendencia Global de Pedidos</h2>
            <p class="section-subtitle">Actividad de todas las empresas</p>
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
            :show-header="false"
            @period-change="handlePeriodChange"
          />
        </div>
      </section>

      <!-- Gestión de empresas -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Gestión de Empresas</h2>
          <div class="header-actions">
            <router-link to="app/admin/companies" class="section-link">Ver todas</router-link>
            <button @click="console.log('🏢 Debug empresas:', topCompanies)" class="debug-btn" v-if="topCompanies.length > 0">
              🐛 Debug
            </button>
          </div>
        </div>
        
        <div v-if="loadingCompanies" class="loading-state">
          <div class="loading-spinner small"></div>
          <span>Cargando empresas...</span>
        </div>
        
        <div v-else-if="topCompanies.length === 0" class="empty-state">
          <div class="empty-icon">🏢</div>
          <h3>No hay empresas registradas</h3>
          <p>Crea la primera empresa para comenzar a usar el sistema</p>
          <router-link to="/admin/companies" class="btn btn-primary">Agregar Empresa</router-link>
        </div>
        
        <div v-else class="companies-preview">
          <div v-for="company in topCompanies" :key="company._id" class="company-item">
            <div class="company-main">
              <div class="company-icon">🏢</div>
              <div class="company-info">
                <div class="company-name">{{ company.name || 'Empresa Sin Nombre' }}</div>
                <div class="company-email">{{ company.email || company.contact_email || 'Sin email' }}</div>
              </div>
            </div>
            <div class="company-stats">
              <div class="stat-item">
                <span class="stat-value">{{ company.orders_count || 0 }}</span>
                <span class="stat-label">Pedidos</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ company.users_count || 0 }}</span>
                <span class="stat-label">Usuarios</span>
              </div>
            </div>
            <div class="company-status">
              <div class="status-indicator" :class="company.is_active ? 'active' : 'inactive'"></div>
              <span class="status-text">{{ company.is_active ? 'Activa' : 'Inactiva' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Acciones de administración -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Herramientas de Administración</h2>
          <p class="section-subtitle">Gestión del sistema</p>
        </div>
        <div class="admin-actions-grid">
          <router-link 
            v-for="action in adminActions" 
            :key="action.id" 
            :to="action.route" 
            class="admin-action-card"
            :class="action.variant"
          >
            <div class="action-icon">{{ action.icon }}</div>
            <div class="action-content">
              <div class="action-title">{{ action.title }}</div>
              <div class="action-description">{{ action.description }}</div>
              <div class="action-badge" v-if="action.badge">{{ action.badge }}</div>
            </div>
            <div class="action-arrow">→</div>
          </router-link>
        </div>
      </section>

      <!-- Estado del sistema -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">Estado del Sistema</h2>
          <p class="section-subtitle">Monitoreo y salud</p>
        </div>
        
        <div class="system-status">
          <div class="status-item">
            <div class="status-icon">🟢</div>
            <div class="status-info">
              <div class="status-title">API Backend</div>
              <div class="status-description">Funcionando correctamente</div>
            </div>
          </div>
          
          <div class="status-item">
            <div class="status-icon">🟢</div>
            <div class="status-info">
              <div class="status-title">Base de Datos</div>
              <div class="status-description">{{ stats.totalOrders || 0 }} pedidos registrados</div>
            </div>
          </div>
          
          <div class="status-item">
            <div class="status-icon">🟢</div>
            <div class="status-info">
              <div class="status-title">Integración Shipday</div>
              <div class="status-description">Conectado y funcionando</div>
            </div>
          </div>
          
          <div class="status-item">
            <div class="status-icon">{{ channels > 0 ? '🟢' : '🟡' }}</div>
            <div class="status-info">
              <div class="status-title">Canales de Venta</div>
              <div class="status-description">{{ channels }} canales activos</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Notificaciones de error -->
    <div v-if="showErrorToast" class="error-toast">
      <div class="toast-content">
        <span class="toast-icon">❌</span>
        <span class="toast-message">{{ errorMessage }}</span>
        <button @click="showErrorToast = false" class="toast-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import OrdersTrendChart from '../components/dashboard/OrdersTrendChart.vue'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const loadingChart = ref(false)
const loadingCompanies = ref(false)
const stats = ref({})
const chartData = ref([])
const topCompanies = ref([])
const chartPeriod = ref('30d')
const currentTime = ref('')
const currentDate = ref('')
const timeInterval = ref(null)
const showErrorToast = ref(false)
const errorMessage = ref('')

// Trends inicializados como null
const trends = ref({
  companies: null,
  orders_today: null,
  delivered: null
})

// Computed values
const hasInitialData = computed(() => Object.keys(stats.value).length > 0)

// Admin metrics
const totalOrders = computed(() => stats.value.totalOrders || stats.value.orders || 0)
const ordersToday = computed(() => stats.value.ordersToday || 0)
const deliveredOrders = computed(() => {
  const byStatus = stats.value.ordersByStatus || {}
  return byStatus.delivered || 0
})
const deliveryRate = computed(() => {
  const total = totalOrders.value
  const delivered = deliveredOrders.value
  return total > 0 ? Math.round((delivered / total) * 100) : 0
})
const monthlyRevenue = computed(() => stats.value.monthlyRevenue || stats.value.estimatedMonthlyCost || 0)
const channels = computed(() => stats.value.channels || 0)

const adminActions = computed(() => [
  { 
    id: 'companies', 
    title: 'Gestionar Empresas', 
    description: 'Ver, crear y administrar empresas cliente', 
    icon: '🏢', 
    route: 'companies',
    variant: 'primary',
    badge: stats.value.companies || 0
  },
  { 
    id: 'orders', 
    title: 'Pedidos Globales', 
    description: 'Ver todos los pedidos del sistema', 
    icon: '📦', 
    route: 'orders',
    variant: 'secondary',
    badge: totalOrders.value
  },
  { 
    id: 'billing', 
    title: 'Facturación', 
    description: 'Gestionar facturas y pagos', 
    icon: '💳', 
    route: 'billing',
    variant: 'success'
  },
  { 
    id: 'drivers', 
    title: 'Conductores', 
    description: 'Gestión de conductores del sistema', 
    icon: '🚚', 
    route: 'drivers',
    variant: 'info'
  },
  { 
    id: 'channels', 
    title: 'Canales de Venta', 
    description: 'Supervisar integraciones activas', 
    icon: '📡', 
    route: 'channels',
    variant: 'warning'
  },
  { 
    id: 'communes', 
    title: 'Comunas', 
    description: 'Configurar zonas de entrega', 
    icon: '🏘️', 
    route: 'communes',
    variant: 'neutral'
  }
])

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
    console.log('🔄 Admin: Iniciando carga de datos...')
    
    await Promise.all([
      fetchStats(),
      fetchChartData(),
      fetchTopCompanies()
    ])
    
    console.log('✅ Admin: Todos los datos cargados')
  } catch (error) {
    console.error("❌ Admin: Error loading dashboard data", error)
    showError('Error cargando las estadísticas del dashboard')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    console.log('📊 Admin: Obteniendo estadísticas...')
    const response = await apiService.dashboard.getStats()
    
    console.log('📊 Admin: Stats recibidas:', response.data)
    stats.value = response.data
    
    // Intentar obtener trends
    try {
      const trendsResponse = await apiService.dashboard.getTrends()
      trends.value = trendsResponse.data
      console.log('📈 Admin: Trends obtenidos:', trends.value)
    } catch (trendsError) {
      console.log('⚠️ Admin: Trends no disponibles')
    }
    
  } catch (error) {
    console.error('❌ Admin: Error fetching stats:', error)
    showError('Error obteniendo estadísticas del sistema')
  }
}

async function fetchChartData() {
  loadingChart.value = true
  try {
    console.log('📈 Admin: Obteniendo datos del gráfico para período:', chartPeriod.value)
    const response = await apiService.orders.getTrend({ period: chartPeriod.value })
    const newData = response.data || []
    
    console.log('📈 Admin: Datos del gráfico recibidos:', newData.length, 'puntos')
    
    // Asignar datos después de un pequeño delay para asegurar que el loading se muestre
    setTimeout(() => {
      chartData.value = newData
      loadingChart.value = false
    }, 200)
    
  } catch (error) {
    console.error('❌ Admin: Error fetching chart data:', error)
    chartData.value = []
    loadingChart.value = false
  }
}

async function fetchTopCompanies() {
  loadingCompanies.value = true
  try {
    console.log('🏢 Admin: Obteniendo empresas destacadas...')
    const response = await apiService.companies.getAll()
    const companiesData = response.data || []
    
    console.log('🏢 Admin: Datos de empresas recibidos:', companiesData.map(c => ({
      id: c._id,
      name: c.name,
      email: c.email || c.contact_email,
      orders: c.orders_count,
      users: c.users_count
    })))
    
    // Tomar las primeras 5 empresas como preview
    topCompanies.value = companiesData.slice(0, 5)
    console.log('🏢 Admin: Empresas para mostrar:', topCompanies.value.length)
  } catch (error) {
    console.error('❌ Admin: Error fetching companies:', error)
    topCompanies.value = []
  } finally {
    loadingCompanies.value = false
  }
}

function refreshAllData() {
  console.log('🔄 Admin: Refrescando datos...')
  fetchAllData()
}

function handlePeriodChange(period) {
  console.log('📊 Admin: Cambiando período del gráfico a:', period)
  chartPeriod.value = period
  // Hacer la llamada inmediatamente y manejar el estado de carga
  fetchChartData()
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function getTrendIcon(direction) {
  switch(direction) {
    case 'up': return '↗'
    case 'down': return '↘'
    case 'neutral': return '→'
    default: return '→'
  }
}

function showError(message) {
  errorMessage.value = message
  showErrorToast.value = true
  setTimeout(() => {
    showErrorToast.value = false
  }, 5000)
}

onMounted(() => {
  console.log('🚀 AdminDashboard montado')
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.full-width {
  grid-column: 1 / -1;
}

.chart-section {
  grid-column: 1 / 8; /* Reducir el ancho del gráfico */
}

.content-section:not(.full-width):not(.chart-section) {
  grid-column: span 5; /* Aumentar el ancho de las otras secciones */
}

/* ==================== SECCIONES ==================== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.debug-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
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
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.section-link:hover {
  color: #5a67d8;
}

/* ==================== KPIs ==================== */
.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.kpi-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.kpi-card.companies::before {
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.kpi-card.orders::before {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.kpi-card.success::before {
  background: linear-gradient(90deg, #10b981, #047857);
}

.kpi-card.revenue::before {
  background: linear-gradient(90deg, #f59e0b, #d97706);
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
.chart-container-wrapper {
  height: 280px;
  position: relative;
  margin-top: -8px; /* Reducir espacio superior */
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

/* ==================== EMPRESAS PREVIEW ==================== */
.companies-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.company-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.company-item:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.company-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.company-icon {
  font-size: 20px;
}

.company-info {
  flex: 1;
}

.company-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.company-email {
  font-size: 12px;
  color: #6b7280;
}

.company-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
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

.company-status {
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

/* ==================== ACCIONES ADMIN ==================== */
.admin-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.admin-action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  background: white;
  position: relative;
  overflow: hidden;
}

.admin-action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.admin-action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.admin-action-card:hover::before {
  transform: scaleX(1);
}

.admin-action-card.primary::before {
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.admin-action-card.secondary::before {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.admin-action-card.success::before {
  background: linear-gradient(90deg, #10b981, #047857);
}

.admin-action-card.info::before {
  background: linear-gradient(90deg, #06b6d4, #0891b2);
}

.admin-action-card.warning::before {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.admin-action-card.neutral::before {
  background: linear-gradient(90deg, #6b7280, #4b5563);
}

.action-icon {
  font-size: 32px;
  opacity: 0.9;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.action-description {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.action-badge {
  font-size: 12px;
  font-weight: 600;
  background: #f3f4f6;
  color: #4b5563;
  padding: 4px 8px;
  border-radius: 12px;
  display: inline-block;
}

.action-arrow {
  color: #9ca3af;
  font-size: 24px;
  transition: all 0.3s ease;
}

.admin-action-card:hover .action-arrow {
  color: #667eea;
  transform: translateX(4px);
}

/* ==================== ESTADO DEL SISTEMA ==================== */
.system-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.status-icon {
  font-size: 20px;
}

.status-info {
  flex: 1;
}

.status-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.status-description {
  font-size: 12px;
  color: #6b7280;
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
  border-top-color: #667eea;
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

.empty-state .empty-icon {
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

/* ==================== NOTIFICACIONES ==================== */
.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  border: 1px solid #fecaca;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fef2f2;
}

.toast-icon {
  color: #dc2626;
}

.toast-message {
  flex: 1;
  color: #7f1d1d;
  font-size: 14px;
}

.toast-close {
  background: none;
  border: none;
  color: #7f1d1d;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
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
  
  .admin-actions-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
  
  .admin-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .system-status {
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
  
  .admin-action-card {
    padding: 20px;
  }
  
  .action-title {
    font-size: 16px;
  }
}
</style>