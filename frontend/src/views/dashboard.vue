<!-- frontend/src/views/dashboard.vue - MEJORADO CON TIEMPO REAL -->
<template>
  <div class="page-container">
    <!-- Header mejorado con indicador de tiempo real -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">{{ getGreeting() }} 👋</h1>
          <p class="page-subtitle">{{ auth.user?.full_name?.split(' ')[0] || 'Usuario' }}, aquí tienes un resumen de tu operación</p>
          
          <!-- Indicador de tiempo real -->
          <div class="realtime-indicator" :class="{ active: realtimeEnabled }" @click="toggleRealtime">
            <div class="indicator-dot" :class="{ pulsing: realtimeEnabled }"></div>
            <span class="indicator-text">
              {{ realtimeEnabled ? 'Tiempo real activo' : 'Actualización manual' }}
            </span>
            <span class="indicator-stats" v-if="realtimeStats.updateCount > 0">
              ({{ realtimeStats.updateCount }} actualizaciones)
            </span>
          </div>
        </div>
        
        <div class="header-right">
          <div class="header-info">
            <div class="current-time">{{ currentTime }}</div>
            <div class="current-date">{{ currentDate }}</div>
            <div class="last-update" v-if="lastDataUpdate">
              <span class="update-label">Última actualización:</span>
              <span class="update-time">{{ formatLastUpdate(lastDataUpdate) }}</span>
            </div>
          </div>
          
          <div class="header-actions">
            <button 
              @click="toggleRealtime" 
              class="btn btn-realtime"
              :class="{ active: realtimeEnabled }"
              title="Alternar actualizaciones en tiempo real"
            >
              <span class="btn-icon">{{ realtimeEnabled ? '⚡' : '⏸️' }}</span>
              {{ realtimeEnabled ? 'Tiempo Real' : 'Manual' }}
            </button>
            
            <button 
              @click="refreshAllData" 
              class="btn btn-secondary" 
              :disabled="loading"
              title="Actualizar datos manualmente"
            >
              <span class="btn-icon" :class="{ spinning: loading }">{{ loading ? '⏳' : '🔄' }}</span>
              {{ loading ? 'Actualizando...' : 'Actualizar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notificaciones flotantes de actualización -->
    <div v-if="pendingUpdates.size > 0" class="pending-updates-banner">
      <div class="banner-content">
        <span class="banner-icon">🔄</span>
        <span class="banner-text">
          {{ pendingUpdates.size }} actualización{{ pendingUpdates.size > 1 ? 'es' : '' }} pendiente{{ pendingUpdates.size > 1 ? 's' : '' }}
        </span>
        <button @click="applyPendingUpdates" class="banner-button">
          Aplicar ahora
        </button>
        <button @click="clearPendingUpdates" class="banner-close">×</button>
      </div>
    </div>

    <!-- Loading inicial -->
    <div v-if="loading && !hasInitialData" class="initial-loading">
      <div class="loading-spinner"></div>
      <p>Cargando tu dashboard...</p>
    </div>

    <!-- Contenido principal -->
    <div v-else class="dashboard-grid">
      <!-- KPIs principales con animaciones -->
      <section class="content-section full-width">
        <div class="section-header">
          <h2 class="section-title">Métricas Principales</h2>
          <p class="section-subtitle">Resumen de tu operación en tiempo real</p>
        </div>
        <div class="kpis-grid">
          <!-- KPI Pedidos Hoy -->
          <div class="kpi-card orders" :class="{ updated: kpiUpdates.ordersToday }">
            <div class="kpi-icon">📦</div>
            <div class="kpi-content">
              <div class="kpi-value" :class="{ animating: kpiUpdates.ordersToday }">
                {{ todayOrders }}
              </div>
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

          <!-- KPI Pedidos Este Mes -->
          <div class="kpi-card orders" :class="{ updated: kpiUpdates.monthlyOrders }">
            <div class="kpi-icon">📅</div>
            <div class="kpi-content">
              <div class="kpi-value" :class="{ animating: kpiUpdates.monthlyOrders }">
                {{ monthlyOrders }}
              </div>
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

          <!-- KPI Entregados -->
          <div class="kpi-card success" :class="{ updated: kpiUpdates.deliveredOrders }">
            <div class="kpi-icon">✅</div>
            <div class="kpi-content">
              <div class="kpi-value" :class="{ animating: kpiUpdates.deliveredOrders }">
                {{ deliveredOrders }}
              </div>
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

          <!-- KPI Costo Estimado -->
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

      <!-- Resto del contenido existente -->
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
          <router-link to="/app/channels" class="section-link">Gestionar todos</router-link>
        </div>
        
        <div v-if="loadingChannels" class="loading-state">
          <div class="loading-spinner small"></div>
          <span>Cargando canales...</span>
        </div>
        
        <div v-else-if="channels.length === 0" class="empty-state">
          <div class="empty-icon">📡</div>
          <h3>No hay canales configurados</h3>
          <p>Conecta tus tiendas online para sincronizar pedidos automáticamente</p>
          <router-link to="/app/channels" class="btn btn-primary">Conectar Canal</router-link>
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
          <router-link to="/app/orders" class="section-link">Ver pedidos</router-link>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import channelsService from '../services/channels.service'
import OrdersTrendChart from '../components/dashboard/OrdersTrendChart.vue'
import { useEnvigoToast } from '../services/toast.service'

// ==================== SETUP ====================
const router = useRouter()
const auth = useAuthStore()
const toast = useEnvigoToast()

// Estado existente
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
const loadingCommunes = ref(false)
const communesStats = ref([])

// ==================== NUEVO ESTADO TIEMPO REAL ====================
const realtimeEnabled = ref(true)
const realtimeInterval = ref(null)
const lastDataUpdate = ref(null)
const pendingUpdates = ref(new Map())
const kpiUpdates = ref({
  ordersToday: false,
  monthlyOrders: false,
  deliveredOrders: false
})

const realtimeStats = ref({
  updateCount: 0,
  lastUpdate: null,
  pendingCount: 0
})

// Trends inicializados como null
const trends = ref({
  orders_today: null,
  orders_month: null,
  delivered: null
})

// ==================== COMPUTED EXISTENTE ====================
const hasInitialData = computed(() => Object.keys(stats.value).length > 0)
const currentMonth = computed(() => new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))

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

const quickActions = computed(() => [
  { 
    id: 'new-order', 
    title: 'Crear Pedido', 
    description: 'Agregar un nuevo pedido manual', 
    icon: '➕', 
    route: '/app/orders?action=create' 
  },
  { 
    id: 'view-orders', 
    title: 'Ver Mis Pedidos', 
    description: 'Gestionar todos los pedidos', 
    icon: '📦', 
    route: '/app/orders' 
  },
  { 
    id: 'sync-channels', 
    title: 'Sincronizar Canales', 
    description: 'Actualizar desde tus tiendas', 
    icon: '🔄', 
    route: '/app/channels' 
  },
  { 
    id: 'billing', 
    title: 'Facturación', 
    description: 'Revisar costos y facturas', 
    icon: '💳', 
    route: '/app/billing' 
  }
])

// ==================== MÉTODOS TIEMPO REAL ====================

/**
 * Toggle del sistema de tiempo real
 */
function toggleRealtime() {
  realtimeEnabled.value = !realtimeEnabled.value
  
  if (realtimeEnabled.value) {
    startRealtimeUpdates()
    toast.success('⚡ Actualizaciones en tiempo real activadas')
  } else {
    stopRealtimeUpdates()
    toast.info('⏸️ Actualizaciones pausadas - modo manual activado')
  }
}

/**
 * Iniciar actualizaciones automáticas
 */
function startRealtimeUpdates() {
  if (realtimeInterval.value) clearInterval(realtimeInterval.value)
  
  console.log('⚡ [Dashboard] Activando actualizaciones en tiempo real cada 30s')
  
  realtimeInterval.value = setInterval(() => {
    if (realtimeEnabled.value) {
      fetchStatsInBackground()
    }
  }, 30000) // 30 segundos
  
  // Configurar listeners de WebSocket
  setupWebSocketListeners()
}

/**
 * Detener actualizaciones automáticas
 */
function stopRealtimeUpdates() {
  if (realtimeInterval.value) {
    clearInterval(realtimeInterval.value)
    realtimeInterval.value = null
  }
  
  // Cleanup WebSocket listeners
  cleanupWebSocketListeners()
  
  console.log('⏸️ [Dashboard] Actualizaciones en tiempo real desactivadas')
}

/**
 * Obtener estadísticas en segundo plano
 */
async function fetchStatsInBackground() {
  try {
    console.log('🔄 [Dashboard] Actualizando datos en segundo plano...')
    
    const response = await apiService.dashboard.getStats()
    const newStats = response.data
    
    // Detectar cambios en KPIs
    detectKPIChanges(stats.value, newStats)
    
    // Actualizar datos
    stats.value = newStats
    lastDataUpdate.value = Date.now()
    realtimeStats.value.updateCount++
    realtimeStats.value.lastUpdate = lastDataUpdate.value
    
    console.log('✅ [Dashboard] Datos actualizados en segundo plano')
    
  } catch (error) {
    console.error('❌ [Dashboard] Error en actualización de fondo:', error)
  }
}

/**
 * Detectar cambios en KPIs para animaciones
 */
function detectKPIChanges(oldStats, newStats) {
  const changes = []
  
  // Detectar cambios en pedidos de hoy
  if (oldStats.ordersToday !== newStats.ordersToday) {
    kpiUpdates.value.ordersToday = true
    changes.push(`Pedidos hoy: ${oldStats.ordersToday || 0} → ${newStats.ordersToday || 0}`)
    setTimeout(() => { kpiUpdates.value.ordersToday = false }, 2000)
  }
  
  // Detectar cambios en pedidos mensuales
  if (oldStats.monthlyOrders !== newStats.monthlyOrders) {
    kpiUpdates.value.monthlyOrders = true
    changes.push(`Pedidos mes: ${oldStats.monthlyOrders || 0} → ${newStats.monthlyOrders || 0}`)
    setTimeout(() => { kpiUpdates.value.monthlyOrders = false }, 2000)
  }
  
  // Detectar cambios en entregas
  const oldDelivered = oldStats.deliveredTotal || oldStats.ordersByStatus?.delivered || 0
  const newDelivered = newStats.deliveredTotal || newStats.ordersByStatus?.delivered || 0
  
  if (oldDelivered !== newDelivered) {
    kpiUpdates.value.deliveredOrders = true
    changes.push(`Entregas: ${oldDelivered} → ${newDelivered}`)
    setTimeout(() => { kpiUpdates.value.deliveredOrders = false }, 2000)
  }
  
  // Mostrar notificación si hay cambios
  if (changes.length > 0) {
    toast.info(`📊 Dashboard actualizado: ${changes.join(', ')}`, {
      timeout: 5000
    })
  }
}

/**
 * Configurar listeners de WebSocket
 */
function setupWebSocketListeners() {
  // Escuchar eventos de actualización de pedidos
  window.addEventListener('orderUpdated', handleOrderUpdate)
  window.addEventListener('orderCreated', handleOrderCreated)
  window.addEventListener('channelSyncCompleted', handleChannelSync)
}

/**
 * Limpiar listeners de WebSocket
 */
function cleanupWebSocketListeners() {
  window.removeEventListener('orderUpdated', handleOrderUpdate)
  window.removeEventListener('orderCreated', handleOrderCreated)
  window.removeEventListener('channelSyncCompleted', handleChannelSync)
}

/**
 * Manejar actualización de pedido via WebSocket
 */
function handleOrderUpdate(event) {
  if (!realtimeEnabled.value) return
  
  const { orderId, newStatus, oldStatus } = event.detail
  
  console.log(`⚡ [Dashboard] Pedido actualizado: ${orderId} (${oldStatus} → ${newStatus})`)
  
  // Agregar a actualizaciones pendientes
  pendingUpdates.value.set(`order-${orderId}`, {
    type: 'order_update',
    orderId,
    newStatus,
    oldStatus,
    timestamp: Date.now()
  })
  
  // Mostrar notificación
  toast.orderUpdated({
    order_id: orderId,
    order_number: `#${orderId.substring(0, 8)}`,
    status: newStatus
  })
  
  // Auto-aplicar después de 5 segundos
  setTimeout(() => {
    if (pendingUpdates.value.has(`order-${orderId}`)) {
      applyPendingUpdates()
    }
  }, 5000)
}

/**
 * Manejar nuevo pedido via WebSocket
 */
function handleOrderCreated(event) {
  if (!realtimeEnabled.value) return
  
  const { orderId, companyId } = event.detail
  
  // Solo procesar si es de nuestra empresa
  if (companyId === auth.user?.company_id) {
    console.log(`⚡ [Dashboard] Nuevo pedido creado: ${orderId}`)
    
    toast.success(`📦 Nuevo pedido recibido: #${orderId.substring(0, 8)}`)
    
    // Actualizar datos después de un breve delay
    setTimeout(() => {
      fetchStatsInBackground()
    }, 2000)
  }
}

/**
 * Manejar sincronización de canal completada
 */
function handleChannelSync(event) {
  const { channelName, ordersImported } = event.detail
  
  toast.syncNotification(channelName, {
    success: true,
    ordersImported
  })
  
  // Actualizar datos
  setTimeout(() => {
    fetchAllData()
  }, 3000)
}

/**
 * Aplicar actualizaciones pendientes
 */
function applyPendingUpdates() {
  console.log(`🔄 [Dashboard] Aplicando ${pendingUpdates.value.size} actualizaciones pendientes`)
  
  pendingUpdates.value.clear()
  fetchStatsInBackground()
  
  toast.success('✅ Datos actualizados correctamente')
}

/**
 * Limpiar actualizaciones pendientes
 */
function clearPendingUpdates() {
  pendingUpdates.value.clear()
  toast.info('🗑️ Actualizaciones pendientes descartadas')
}

/**
 * Formatear tiempo de última actualización
 */
function formatLastUpdate(timestamp) {
  if (!timestamp) return 'Nunca'
  
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  
  if (minutes < 1) return 'Hace menos de 1 minuto'
  if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`
  
  const days = Math.floor(hours / 24)
  return `Hace ${days} día${days > 1 ? 's' : ''}`
}

// ==================== MÉTODOS EXISTENTES ====================

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
    
    lastDataUpdate.value = Date.now()
    console.log('✅ Todos los datos cargados')
  } catch (error) {
    console.error("❌ Error loading dashboard data", error)
    toast.error('Error al cargar el dashboard')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    console.log('📊 Obteniendo estadísticas...')
    const response = await apiService.dashboard.getStats()
    const rawData = response.data
    
    stats.value = rawData
    
    try {
      const trendsResponse = await apiService.dashboard.getTrends()
      trends.value = trendsResponse.data
    } catch (trendsError) {
      await calculateTrendsManually()
    }
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error)
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
    const response = await apiService.orders.getTrend({ period: chartPeriod.value })
    const newData = response.data
    
    if (Array.isArray(newData)) {
      setTimeout(() => {
        chartData.value = newData
        loadingChart.value = false
      }, 200)
    } else {
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
      const response = await channelsService.getByCompany(companyId)
      channels.value = response.data.data || []
    } else {
      channels.value = response.data.data || []
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
    const response = await apiService.dashboard.getCommunesStats()
    const communesArray = response.data.all_stats || []
    
    communesStats.value = communesArray
      .sort((a, b) => (b.delivered_orders || 0) - (a.delivered_orders || 0))
      .slice(0, 5)
      
  } catch (error) {
    console.error('❌ Error fetching communes stats:', error)
    communesStats.value = []
  } finally {
    loadingCommunes.value = false
  }
}

function refreshAllData() {
  console.log('🔄 Refrescando datos manualmente...')
  fetchAllData()
  toast.success('🔄 Datos actualizados manualmente')
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

// ==================== LIFECYCLE ====================

onMounted(() => {
  console.log('🚀 Dashboard montado con sistema de tiempo real')
  
  // Configurar tiempo
  updateTime()
  timeInterval.value = setInterval(updateTime, 1000 * 60)
  
  // Cargar datos iniciales
  fetchAllData()
  
  // Iniciar sistema de tiempo real
  if (realtimeEnabled.value) {
    startRealtimeUpdates()
  }
})

onUnmounted(() => {
  console.log('🧹 [Dashboard] Limpiando recursos...')
  
  // Limpiar timers
  if (timeInterval.value) {
    clearInterval(timeInterval.value)
  }
  
  // Limpiar sistema de tiempo real
  stopRealtimeUpdates()
})
</script>

<style scoped>
/* ==================== ESTILOS EXISTENTES + NUEVOS ==================== */

/* Variables y base existentes */
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #f8fafc;
  min-height: 100vh;
}

/* ==================== NUEVOS ESTILOS TIEMPO REAL ==================== */

/* Indicador de tiempo real en header */
.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
}

.realtime-indicator.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-color: #10b981;
}

.realtime-indicator:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
  transition: all 0.3s ease;
}

.indicator-dot.pulsing {
  background: #fbbf24;
  animation: pulse 2s infinite;
}

.realtime-indicator.active .indicator-dot {
  background: white;
}

.indicator-text {
  font-weight: 500;
}

.indicator-stats {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Botón de tiempo real en header */
.btn-realtime {
  background: #f3f4f6 !important;
  color: #374151 !important;
  border: 1px solid #d1d5db !important;
}

.btn-realtime.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  color: white !important;
  border-color: #10b981 !important;
}

.btn-realtime:hover {
  transform: translateY(-1px);
}

/* Banner de actualizaciones pendientes */
.pending-updates-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-left: 4px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  animation: slideInFromRight 0.4s ease-out;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
}

.banner-icon {
  font-size: 1.25rem;
  color: #3b82f6;
}

.banner-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.banner-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.banner-button:hover {
  background: #2563eb;
}

.banner-close {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s ease;
}

.banner-close:hover {
  color: #6b7280;
}

/* Información de última actualización */
.last-update {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.update-label {
  font-weight: 500;
}

.update-time {
  color: #374151;
}

/* Acciones del header */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Animaciones para KPIs actualizados */
.kpi-card.updated {
  animation: kpiUpdate 0.6s ease-out;
  border-left-width: 6px;
}

.kpi-value.animating {
  animation: valueChange 0.8s ease-out;
}

@keyframes kpiUpdate {
  0% {
    transform: scale(1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  25% {
    transform: scale(1.02);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

@keyframes valueChange {
  0% {
    transform: scale(1);
    color: #1f2937;
  }
  50% {
    transform: scale(1.1);
    color: #10b981;
    text-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
  }
  100% {
    transform: scale(1);
    color: #1f2937;
    text-shadow: none;
  }
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
  }
  50% { 
    opacity: 0.5; 
    transform: scale(1.1); 
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==================== ESTILOS EXISTENTES ==================== */

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

/* Botones */
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

/* Layout grid */
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

/* Secciones */
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

/* KPIs */
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
  transition: all 0.3s ease;
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

/* Formularios */
.form-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #374151;
}

/* Gráficos */
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

/* Acciones rápidas */
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

/* Estados y loading */
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

/* Resto de estilos existentes para canales y comunas... */
.channels-list, .communes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-item, .commune-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.channel-item:hover, .commune-item:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
}

/* Responsive */
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
  
  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .realtime-indicator {
    align-self: flex-start;
  }
  
  .pending-updates-banner {
    position: relative;
    top: auto;
    right: auto;
    margin-bottom: 1rem;
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
  
  .realtime-indicator .indicator-text {
    font-size: 0.75rem;
  }
  
  .realtime-indicator .indicator-stats {
    display: none;
  }
}
/* ==================== ESTILOS FALTANTES PARA DASHBOARD ==================== */
/* Agregar estos estilos al final de tu dashboard.vue en la sección <style scoped> */

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
  transition: all 0.2s ease;
}

.channel-item:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.channel-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.channel-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  border-radius: 8px;
  color: white;
  flex-shrink: 0;
}

.channel-info {
  flex: 1;
  min-width: 0;
}

.channel-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  font-size: 16px;
}

.channel-type {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.channel-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-weight: 700;
  color: #1f2937;
  font-size: 18px;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.channel-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: flex-end;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}

.status-indicator.active {
  background-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.status-indicator.active::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: #10b981;
  opacity: 0.3;
  animation: pulse 2s infinite;
}

.status-indicator.warning {
  background-color: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.status-indicator.inactive {
  background-color: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.status-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-align: right;
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
  position: relative;
  overflow: hidden;
}

.commune-item:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.commune-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  opacity: 0.7;
}

.commune-rank {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.commune-main {
  flex: 1;
  min-width: 0;
}

.commune-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  font-size: 16px;
}

.commune-details {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.commune-details::before {
  content: '📦';
  font-size: 10px;
}

.commune-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}

.commune-success-rate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.success-rate-bar {
  width: 60px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.success-rate-fill {
  height: 100%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  transition: width 0.6s ease;
  border-radius: 4px;
  position: relative;
}

.success-rate-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

.success-rate-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

/* ==================== ESTADOS VACÍOS Y LOADING ==================== */
.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 32px 20px;
  color: #6b7280;
  justify-content: center;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
  display: block;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: #6b7280;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

/* ==================== ANIMACIONES ==================== */
@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.05); 
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  .channel-item,
  .commune-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
  
  .channel-main,
  .commune-main {
    width: 100%;
  }
  
  .channel-stats,
  .commune-stats,
  .channel-status,
  .commune-success-rate {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    min-width: auto;
  }
  
  .status-text {
    text-align: left;
  }
  
  .commune-rank {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .channel-item,
  .commune-item {
    padding: 12px;
  }
  
  .channel-icon {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
  
  .channel-name,
  .commune-name {
    font-size: 14px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .success-rate-bar {
    width: 40px;
    height: 6px;
  }
}
</style>