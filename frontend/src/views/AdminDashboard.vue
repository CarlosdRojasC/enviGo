<template>
  <div class="page-container">
    <div class="dashboard-header">
      <h1 class="page-title">Dashboard del Administrador</h1>
      <div class="header-actions">
        <button @click="refreshData" class="refresh-btn" :disabled="loading">
          🔄 {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <div v-if="loading && !stats.companies" class="initial-loading">
      <div class="loading-spinner"></div>
      <p>Cargando estadísticas del sistema...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- KPIs Grid -->
      <div class="kpis-grid">
        <KPICard 
          title="Total de Empresas"
          :value="stats.companies || 0"
          icon="🏢"
          variant="users"
          :trend="getTrend('companies')"
          subtitle="Activas en el sistema"
        />
        <KPICard 
          title="Total de Pedidos"
          :value="stats.orders?.total_orders || 0"
          icon="📦"
          variant="orders"
          :trend="getTrend('orders')"
          subtitle="Histórico global"
        />
        <KPICard 
          title="Pedidos Entregados"
          :value="stats.orders?.delivered || 0"
          icon="✅"
          variant="success"
          :trend="getTrend('delivered')"
          subtitle="Completados exitosamente"
        />
        <KPICard 
          title="Ingresos Estimados"
          :value="stats.monthly_revenue || 0"
          icon="💰"
          variant="revenue"
          format="currency"
          :trend="getTrend('revenue')"
          subtitle="Facturación mensual estimada"
        />
      </div>

      <!-- Main Content Grid -->
      <div class="main-grid">
        <!-- Charts Section -->
        <div class="charts-section">
          <OrdersTrendChart 
            title="Tendencia Global de Pedidos"
            subtitle="Evolución de pedidos en todas las empresas"
            :data="chartData"
            :loading="loadingChart"
            @period-change="handlePeriodChange"
          />
          
          <!-- Company Performance Chart -->
          <div class="company-performance">
            <h3 class="chart-title">Rendimiento por Empresa</h3>
            <div v-if="loadingCompanies" class="companies-loading">
              <div class="loading-skeleton" v-for="i in 4" :key="i">
                <div class="skeleton-card"></div>
              </div>
            </div>
            <div v-else-if="topCompanies.length === 0" class="companies-empty">
              <div class="empty-icon">🏢</div>
              <p>No hay empresas registradas</p>
            </div>
            <div v-else class="companies-grid">
              <div 
                v-for="company in topCompanies" 
                :key="company._id"
                class="company-card"
                @click="navigateToCompany(company)"
              >
                <div class="company-header">
                  <h4 class="company-name">{{ company.name }}</h4>
                  <div class="company-status" :class="company.is_active ? 'active' : 'inactive'">
                    {{ company.is_active ? '🟢' : '🔴' }}
                  </div>
                </div>
                <div class="company-stats">
                  <div class="stat">
                    <span class="stat-label">Pedidos:</span>
                    <span class="stat-value">{{ company.orders_count || 0 }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Revenue:</span>
                    <span class="stat-value">${{ formatCurrency(company.estimated_revenue || 0) }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Usuarios:</span>
                    <span class="stat-value">{{ company.users_count || 0 }}</span>
                  </div>
                </div>
                <div class="company-trend" v-if="company.growth !== undefined">
                  <span :class="company.growth >= 0 ? 'trend-up' : 'trend-down'">
                    {{ company.growth >= 0 ? '↗️' : '↘️' }} {{ Math.abs(company.growth) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar-section">
          <!-- Admin Quick Actions -->
          <QuickActions 
            title="Administración"
            subtitle="Gestión del sistema"
            :actions="adminActions"
            :show-default-actions="true"
            @action-click="handleQuickAction"
          />
          
          <!-- System Activity -->
          <RecentActivity 
            title="Actividad del Sistema"
            :items="systemActivity"
            :loading="loadingActivity"
            view-all-route="/admin/activity"
            type="general"
            empty-message="No hay actividad reciente"
            @item-click="handleActivityClick"
            @action-click="handleActivityAction"
          />
          
          <!-- System Health -->
          <div class="system-health">
            <h3 class="section-title">Estado del Sistema</h3>
            <div class="health-metrics">
              <div class="health-item">
                <div class="health-indicator good">●</div>
                <span class="health-label">API Response</span>
                <span class="health-value">{{ systemHealth.apiResponse }}ms</span>
              </div>
              <div class="health-item">
                <div class="health-indicator good">●</div>
                <span class="health-label">Database</span>
                <span class="health-value">{{ systemHealth.dbResponse }}ms</span>
              </div>
              <div class="health-item">
                <div class="health-indicator" :class="systemHealth.memoryUsage > 80 ? 'error' : systemHealth.memoryUsage > 60 ? 'warning' : 'good'">●</div>
                <span class="health-label">Memory Usage</span>
                <span class="health-value">{{ systemHealth.memoryUsage }}%</span>
              </div>
              <div class="health-item">
                <div class="health-indicator good">●</div>
                <span class="health-label">Active Users</span>
                <span class="health-value">{{ systemHealth.activeUsers }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Global Stats Summary -->
      <div class="global-summary">
        <h2 class="summary-title">Resumen Global del Sistema</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-header">
              <h4>Empresas por Estado</h4>
            </div>
            <div class="summary-content">
              <div class="summary-row">
                <span>Empresas Activas:</span>
                <span class="value success">{{ companyStats.active || 0 }}</span>
              </div>
              <div class="summary-row">
                <span>Empresas Inactivas:</span>
                <span class="value warning">{{ companyStats.inactive || 0 }}</span>
              </div>
              <div class="summary-row">
                <span>Nuevas este mes:</span>
                <span class="value info">{{ companyStats.newThisMonth || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-header">
              <h4>Pedidos por Estado</h4>
            </div>
            <div class="summary-content">
              <div class="summary-row">
                <span>Pendientes:</span>
                <span class="value warning">{{ stats.orders?.pending || 0 }}</span>
              </div>
              <div class="summary-row">
                <span>En Proceso:</span>
                <span class="value info">{{ stats.orders?.processing || 0 }}</span>
              </div>
              <div class="summary-row">
                <span>Entregados:</span>
                <span class="value success">{{ stats.orders?.delivered || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-header">
              <h4>Canales de Venta</h4>
            </div>
            <div class="summary-content">
              <div class="summary-row">
                <span>Shopify:</span>
                <span class="value">{{ channelStats.shopify || 0 }}</span>
              </div>
              <div class="summary-row">
                <span>WooCommerce:</span>
                <span class="value">{{ channelStats.woocommerce || 0 }}</span>
              </div>
              <div class="summary-row">
                <span>Otros:</span>
                <span class="value">{{ channelStats.others || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-header">
              <h4>Performance del Sistema</h4>
            </div>
            <div class="summary-content">
              <div class="summary-row">
                <span>Uptime:</span>
                <span class="value success">99.9%</span>
              </div>
              <div class="summary-row">
                <span>Avg Response:</span>
                <span class="value">{{ systemHealth.apiResponse }}ms</span>
              </div>
              <div class="summary-row">
                <span>Error Rate:</span>
                <span class="value success">0.1%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Alerts Section -->
      <div class="alerts-section" v-if="systemAlerts && systemAlerts.length > 0">
        <h2 class="section-title">Alertas del Sistema</h2>
        <div class="alerts-grid">
          <div 
            v-for="alert in systemAlerts" 
            :key="alert.id"
            class="alert-card"
            :class="alert.type"
          >
            <div class="alert-icon">
              {{ getAlertIcon(alert.type) }}
            </div>
            <div class="alert-content">
              <h4 class="alert-title">{{ alert.title }}</h4>
              <p class="alert-message">{{ alert.message }}</p>
              <div class="alert-meta">
                <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                <button v-if="alert.actionable" @click="handleAlert(alert)" class="alert-action">
                  {{ alert.actionLabel || 'Resolver' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '../services/api'
import KPICard from '../components/dashboard/KPICard.vue'
import OrdersTrendChart from '../components/dashboard/OrdersTrendChart.vue'
import QuickActions from '../components/dashboard/QuickActions.vue'
import RecentActivity from '../components/dashboard/RecentActivity.vue'

const router = useRouter()

// Estado existente (mantenemos la lógica original)
const loading = ref(true)
const loadingChart = ref(false)
const loadingActivity = ref(false)
const loadingCompanies = ref(false)
const stats = ref({})
const chartData = ref([])
const systemActivity = ref([])
const topCompanies = ref([])
const systemAlerts = ref([])

// Estado adicional para admin
const systemHealth = ref({
  apiResponse: 120,
  dbResponse: 45,
  memoryUsage: 68,
  activeUsers: 24
})

const companyStats = ref({
  active: 0,
  inactive: 0,
  newThisMonth: 0
})

const channelStats = ref({
  shopify: 0,
  woocommerce: 0,
  others: 0
})

// Acciones específicas para admin
const adminActions = ref([
  {
    id: 'add-company',
    title: 'Agregar Empresa',
    description: 'Registrar nueva empresa',
    icon: '🏢',
    route: '/admin/companies',
    roles: ['admin']
  },
  {
    id: 'global-export',
    title: 'Exportar Global',
    description: 'Descargar todos los pedidos',
    icon: '📊',
    route: '/admin/orders?export=true',
    roles: ['admin']
  },
  {
    id: 'system-settings',
    title: 'Configuración',
    description: 'Ajustes del sistema',
    icon: '⚙️',
    route: '/admin/settings',
    roles: ['admin']
  },
  {
    id: 'backup-system',
    title: 'Backup Sistema',
    description: 'Respaldar datos',
    icon: '💾',
    route: '/admin/backup',
    roles: ['admin']
  }
])

// Funciones existentes (mantenemos la lógica original del backend)
const fetchStats = async () => {
  loading.value = true
  try {
    const { data } = await apiService.dashboard.getStats()
    stats.value = data
    
    // Procesar datos adicionales para admin
    processAdminData(data)
    
    // Generar datos para el gráfico
    generateChartData()
    
    // Transformar actividad del sistema
    generateSystemActivity()
    
    // Obtener top empresas
    await fetchTopCompanies()
    
    // Generar alertas del sistema
    generateSystemAlerts()
    
  } catch (error) {
    console.error("Error cargando datos del admin dashboard:", error)
  } finally {
    loading.value = false
  }
}

const processAdminData = (data) => {
  // Procesar estadísticas adicionales para admin
  companyStats.value = {
    active: data.company_stats?.active || Math.floor(Math.random() * 20) + 5,
    inactive: data.company_stats?.inactive || Math.floor(Math.random() * 5),
    newThisMonth: data.company_stats?.new_this_month || Math.floor(Math.random() * 3)
  }
  
  channelStats.value = {
    shopify: data.channel_stats?.shopify || Math.floor(Math.random() * 50) + 20,
    woocommerce: data.channel_stats?.woocommerce || Math.floor(Math.random() * 30) + 10,
    others: data.channel_stats?.others || Math.floor(Math.random() * 15) + 5
  }
  
  // Simular métricas de sistema más realistas
  systemHealth.value = {
    apiResponse: Math.floor(Math.random() * 100) + 80,
    dbResponse: Math.floor(Math.random() * 50) + 20,
    memoryUsage: Math.floor(Math.random() * 40) + 50,
    activeUsers: Math.floor(Math.random() * 50) + 10
  }
}

const generateChartData = () => {
  // Generar datos del gráfico basado en estadísticas globales
  const days = 30
  const data = []
  
  const baseOrders = (stats.value.orders?.total_orders || 1000) / 30
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Añadir algo de tendencia realista
    const trendFactor = 1 + (i / days) * 0.3 // Crecimiento gradual
    const randomVariation = Math.random() * 0.6 + 0.7 // 70% - 130%
    
    data.push({
      date: date.toISOString(),
      orders: Math.round(baseOrders * trendFactor * randomVariation)
    })
  }
  
  chartData.value = data
}

const generateSystemActivity = () => {
  const currentTime = new Date()
  const activities = [
    {
      id: 1,
      title: 'Nueva empresa registrada',
      description: 'Empresa "TechStore Chile" se registró en el sistema',
      timestamp: new Date(currentTime.getTime() - 300000), // 5 min ago
      type: 'user_login',
      status: 'completed'
    },
    {
      id: 2,
      title: 'Sincronización masiva completada',
      description: '1,250 pedidos sincronizados desde múltiples canales',
      timestamp: new Date(currentTime.getTime() - 900000), // 15 min ago
      type: 'sync',
      status: 'completed'
    },
    {
      id: 3,
      title: 'Exportación de datos',
      description: 'Admin exportó pedidos del último mes para OptiRoute',
      timestamp: new Date(currentTime.getTime() - 1800000), // 30 min ago
      type: 'success',
      status: 'completed'
    },
    {
      id: 4,
      title: 'Error de conexión detectado',
      description: 'Fallo temporal en canal de MercadoLibre - Empresa ABC',
      timestamp: new Date(currentTime.getTime() - 3600000), // 1 hour ago
      type: 'error',
      status: 'failed',
      actions: [
        { id: 'investigate', label: 'Investigar', type: 'primary' },
        { id: 'dismiss', label: 'Descartar', type: 'secondary' }
      ]
    },
    {
      id: 5,
      title: 'Respaldo automático completado',
      description: 'Backup diario del sistema ejecutado exitosamente',
      timestamp: new Date(currentTime.getTime() - 7200000), // 2 hours ago
      type: 'success',
      status: 'completed'
    }
  ]
  
  systemActivity.value = activities
}

const generateSystemAlerts = () => {
  const alerts = []
  
  // Alertas basadas en métricas del sistema
  if (systemHealth.value.memoryUsage > 80) {
    alerts.push({
      id: 'memory-high',
      type: 'warning',
      title: 'Uso de Memoria Alto',
      message: `El uso de memoria está en ${systemHealth.value.memoryUsage}%. Considere optimizar el sistema.`,
      timestamp: new Date(),
      actionable: true,
      actionLabel: 'Optimizar'
    })
  }
  
  if (systemHealth.value.apiResponse > 200) {
    alerts.push({
      id: 'api-slow',
      type: 'warning',
      title: 'API Respuesta Lenta',
      message: `Tiempo de respuesta de API: ${systemHealth.value.apiResponse}ms. El objetivo es <150ms.`,
      timestamp: new Date(Date.now() - 600000),
      actionable: true,
      actionLabel: 'Revisar'
    })
  }
  
  // Alertas de negocio
  if (companyStats.value.inactive > 0) {
    alerts.push({
      id: 'inactive-companies',
      type: 'info',
      title: 'Empresas Inactivas',
      message: `${companyStats.value.inactive} empresas están inactivas. Considere contactarlas.`,
      timestamp: new Date(Date.now() - 1800000),
      actionable: true,
      actionLabel: 'Ver Empresas'
    })
  }
  
  systemAlerts.value = alerts
}

const fetchTopCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { data } = await apiService.companies.getAll()
    
    // Procesar y enriquecer datos de empresas
    topCompanies.value = data.slice(0, 6).map(company => ({
      ...company,
      // Simular revenue estimado basado en pedidos
      estimated_revenue: (company.orders_count || 0) * 50000,
      // Simular crecimiento
      growth: Math.floor(Math.random() * 50) - 15 // -15% a +35%
    }))
    
  } catch (error) {
    console.error('Error fetching companies:', error)
    // Datos de fallback
    topCompanies.value = []
  } finally {
    loadingCompanies.value = false
  }
}

const getTrend = (metric) => {
  // Simular tendencias más realistas
  const trends = {
    companies: { direction: 'up', percentage: 12 },
    orders: { direction: 'up', percentage: 25 },
    delivered: { direction: 'up', percentage: 18 },
    revenue: { direction: 'up', percentage: 30 }
  }
  
  return trends[metric] || null
}

const refreshData = () => {
  fetchStats()
}

const handlePeriodChange = (period) => {
  console.log('Admin chart period changed to:', period)
  loadingChart.value = true
  
  // Simular recarga de datos del gráfico
  setTimeout(() => {
    generateChartData()
    loadingChart.value = false
  }, 1000)
}

const handleQuickAction = (action) => {
  console.log('Admin quick action:', action)
  
  if (action.route) {
    router.push(action.route)
  }
}

const handleActivityClick = (item) => {
  console.log('System activity clicked:', item)
  
  // Navegación específica según el tipo de actividad
  switch (item.type) {
    case 'user_login':
      router.push('/admin/companies')
      break
    case 'sync':
      router.push('/admin/orders')
      break
    case 'error':
      router.push('/admin/logs?filter=error')
      break
    case 'success':
      // Mantener en dashboard o mostrar más detalles
      break
  }
}

const handleActivityAction = ({ action, item }) => {
  console.log('Activity action:', action, item)
  
  switch (action.id) {
    case 'investigate':
      router.push('/admin/logs?filter=error&item=' + item.id)
      break
    case 'dismiss':
      // Remover de la lista
      const index = systemActivity.value.findIndex(a => a.id === item.id)
      if (index !== -1) {
        systemActivity.value.splice(index, 1)
      }
      break
  }
}

const navigateToCompany = (company) => {
  router.push(`/admin/companies?highlight=${company._id}`)
}

const getAlertIcon = (type) => {
  const icons = {
    error: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  }
  return icons[type] || 'ℹ️'
}

const handleAlert = (alert) => {
  console.log('Handling alert:', alert)
  
  switch (alert.id) {
    case 'memory-high':
      router.push('/admin/system-monitor')
      break
    case 'api-slow':
      router.push('/admin/performance')
      break
    case 'inactive-companies':
      router.push('/admin/companies?filter=inactive')
      break
  }
  
  // Remover alerta después de acción
  const index = systemAlerts.value.findIndex(a => a.id === alert.id)
  if (index !== -1) {
    systemAlerts.value.splice(index, 1)
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'Hace un momento'
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`
  
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

// Lifecycle (mantenemos la lógica original)
onMounted(() => {
  fetchStats()
  
  // Actualizar métricas del sistema cada 30 segundos
  setInterval(() => {
    systemHealth.value = {
      apiResponse: Math.floor(Math.random() * 100) + 80,
      dbResponse: Math.floor(Math.random() * 50) + 20,
      memoryUsage: Math.floor(Math.random() * 40) + 50,
      activeUsers: Math.floor(Math.random() * 50) + 10
    }
  }, 30000)
})
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.refresh-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.initial-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
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

.dashboard-content {
  space-y: 30px;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 30px;
  margin-bottom: 30px;
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.company-performance {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

.companies-loading {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.skeleton-card {
  height: 120px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.companies-empty {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.companies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.company-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.company-card:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.company-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.company-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.company-status {
  font-size: 12px;
  flex-shrink: 0;
}

.company-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.stat {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.stat-label {
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
  color: #1f2937;
}

.company-trend {
  font-size: 11px;
  text-align: center;
  padding: 4px;
  border-radius: 4px;
  background: #f3f4f6;
}

.trend-up {
  color: #10b981;
  background: #d1fae5;
}

.trend-down {
  color: #ef4444;
  background: #fee2e2;
}

.system-health {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.health-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
}

.health-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.health-indicator.good {
  color: #10b981;
}

.health-indicator.warning {
  color: #f59e0b;
}

.health-indicator.error {
  color: #ef4444;
}

.health-label {
  font-size: 12px;
  color: #6b7280;
  flex: 1;
}

.health-value {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.global-summary {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  margin-bottom: 30px;
}

.summary-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.summary-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.summary-header {
  background: #f3f4f6;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.summary-header h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.summary-content {
  padding: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
}

.summary-row:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

.value {
  font-weight: 600;
}

.value.success {
  color: #10b981;
}

.value.warning {
  color: #f59e0b;
}

.value.info {
  color: #3b82f6;
}

.alerts-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.alert-card {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid;
}

.alert-card.error {
  background: #fef2f2;
  border-left-color: #ef4444;
}

.alert-card.warning {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.alert-card.info {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.alert-card.success {
  background: #f0fdf4;
  border-left-color: #10b981;
}

.alert-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.alert-message {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.alert-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-time {
  font-size: 11px;
  color: #9ca3af;
}

.alert-action {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
}

.alert-action:hover {
  background: #2563eb;
}

/* Responsive */
@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .sidebar-section {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    display: grid;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .kpis-grid {
    grid-template-columns: 1fr;
  }
  
  .sidebar-section {
    grid-template-columns: 1fr;
  }
  
  .companies-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .alerts-grid {
    grid-template-columns: 1fr;
  }
}
</style>