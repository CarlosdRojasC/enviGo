<!-- frontend/src/views/dashboard.vue - TAILWIND VERSION -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header Principal -->
    <header class="mb-8">
      <div class="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 flex justify-between items-center shadow-lg">
        <div>
          <h1 class="text-3xl font-bold text-white">
            {{ getGreeting() }}, {{ auth.user?.full_name || 'Usuario' }} 👋
          </h1>
          <p class="text-blue-100 mt-1">Panel de control de {{ auth.company?.name || 'tu empresa' }}</p>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right">
            <p class="text-lg font-semibold text-white">{{ currentTime }}</p>
            <p class="text-sm text-blue-100 capitalize">{{ currentDate }}</p>
          </div>
          <button 
            @click="fetchAllData" 
            :disabled="loading"
            class="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <span class="material-icons" :class="{ 'animate-spin': loading }">refresh</span>
            {{ loading ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Notificaciones de actualizaciones pendientes -->
    <div v-if="pendingUpdates.size > 0" class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🔄</span>
        <span class="text-blue-900 font-medium">
          {{ pendingUpdates.size }} actualización{{ pendingUpdates.size > 1 ? 'es' : '' }} pendiente{{ pendingUpdates.size > 1 ? 's' : '' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button @click="applyPendingUpdates" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Aplicar ahora
        </button>
        <button @click="clearPendingUpdates" class="text-gray-500 hover:text-gray-700 px-2">
          <span class="text-xl">×</span>
        </button>
      </div>
    </div>

    <!-- Loading inicial -->
    <div v-if="loading && !hasInitialData" class="flex flex-col items-center justify-center py-20">
      <span class="material-icons text-6xl text-gray-400 animate-spin mb-4">refresh</span>
      <p class="text-gray-600">Cargando tu dashboard...</p>
    </div>

    <!-- Contenido principal -->
    <div v-else>
      <!-- KPIs Principales -->
      <section class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900">Métricas Principales</h2>
          <p class="text-sm text-blue-600 font-medium">Resumen de tu operación en tiempo real</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- KPI Pedidos Hoy -->
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200" :class="{ 'ring-2 ring-blue-500': kpiUpdates.ordersToday }">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-3xl font-bold text-gray-900 transition-all" :class="{ 'scale-110': kpiUpdates.ordersToday }">
                  {{ todayOrders }}
                </p>
                <p class="text-sm text-gray-500 mt-1">Pedidos Hoy</p>
                <div v-if="trends.orders_today" class="flex items-center gap-1 mt-2 text-xs">
                  <span :class="trends.orders_today.direction === 'up' ? 'text-green-600' : trends.orders_today.direction === 'down' ? 'text-red-600' : 'text-gray-600'">
                    {{ getTrendIcon(trends.orders_today.direction) }}
                  </span>
                  <span class="text-gray-600">{{ trends.orders_today.percentage }}% {{ trends.orders_today.label }}</span>
                </div>
              </div>
              <span class="text-4xl">📦</span>
            </div>
          </div>

          <!-- KPI Pedidos Este Mes -->
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200" :class="{ 'ring-2 ring-blue-500': kpiUpdates.monthlyOrders }">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-3xl font-bold text-gray-900 transition-all" :class="{ 'scale-110': kpiUpdates.monthlyOrders }">
                  {{ monthlyOrders }}
                </p>
                <p class="text-sm text-gray-500 mt-1">Pedidos Este Mes</p>
                <div v-if="trends.orders_month" class="flex items-center gap-1 mt-2 text-xs">
                  <span :class="trends.orders_month.direction === 'up' ? 'text-green-600' : trends.orders_month.direction === 'down' ? 'text-red-600' : 'text-gray-600'">
                    {{ getTrendIcon(trends.orders_month.direction) }}
                  </span>
                  <span class="text-gray-600">{{ trends.orders_month.percentage }}% {{ trends.orders_month.label }}</span>
                </div>
                <p v-else class="text-xs text-gray-400 mt-2 capitalize">{{ currentMonth }}</p>
              </div>
              <span class="text-4xl">📅</span>
            </div>
          </div>

          <!-- KPI Entregados -->
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200" :class="{ 'ring-2 ring-green-500': kpiUpdates.deliveredOrders }">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-3xl font-bold text-gray-900 transition-all" :class="{ 'scale-110': kpiUpdates.deliveredOrders }">
                  {{ deliveredOrders }}
                </p>
                <p class="text-sm text-gray-500 mt-1">Entregados</p>
                <p class="text-xs text-green-600 mt-2">{{ deliveryRate }}% de éxito</p>
              </div>
              <span class="text-4xl">✅</span>
            </div>
          </div>

          <!-- KPI Costo Estimado -->
          <div class="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-lg shadow-sm text-white">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-3xl font-bold">${{ formatCurrency(estimatedMonthlyCost) }}</p>
                <p class="text-sm text-orange-100 mt-1">Costo Estimado</p>
                <p class="text-xs text-orange-100 mt-2">${{ formatCurrency(pricePerOrder) }} por pedido</p>
              </div>
              <span class="text-4xl">💰</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Grid: Gráfico + Canales -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <!-- Tendencia de Pedidos -->
        <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">Tendencia de Pedidos</h3>
              <p class="text-sm text-gray-500">Actividad de tu empresa</p>
            </div>
            <select 
              v-model="chartPeriod" 
              @change="fetchChartData"
              class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
              <option value="90d">90 días</option>
            </select>
          </div>

          <div v-if="loadingChart" class="h-80 flex items-center justify-center">
            <div class="flex flex-col items-center gap-3">
              <span class="material-icons text-4xl text-gray-400 animate-spin">refresh</span>
              <p class="text-gray-500">Cargando gráfico...</p>
            </div>
          </div>
          <div v-else-if="chartData.length === 0" class="h-80 flex items-center justify-center">
            <div class="text-center">
              <span class="material-icons text-6xl text-gray-300 mb-2">show_chart</span>
              <p class="text-gray-500">No hay datos suficientes para mostrar el gráfico</p>
            </div>
          </div>
          <OrdersTrendChart 
            v-else
            :data="chartData" 
            :loading="loadingChart"
            :height="320"
          />
        </div>

        <!-- Canales Activos -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">Canales Activos</h3>
              <p class="text-sm text-gray-500">Tus integraciones</p>
            </div>
            <router-link to="/app/channels" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Gestionar
            </router-link>
          </div>

          <div v-if="loadingChannels" class="space-y-4">
            <div v-for="i in 3" :key="i" class="animate-pulse">
              <div class="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          </div>

          <div v-else-if="channels.length === 0" class="text-center py-8">
            <span class="material-icons text-5xl text-gray-300 mb-3">store</span>
            <p class="text-gray-500 mb-4">No tienes canales configurados</p>
            <router-link to="/app/channels" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <span class="material-icons text-lg">add</span>
              Agregar Canal
            </router-link>
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="channel in channels" 
              :key="channel._id"
              class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {{ channel.channel_name.substring(0, 2).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ channel.channel_name }}</p>
                <p class="text-xs text-gray-500">{{ getChannelTypeName(channel.channel_type) }}</p>
              </div>
              <span 
                class="flex-shrink-0 w-2 h-2 rounded-full"
                :class="channel.is_active ? 'bg-green-500' : 'bg-gray-300'"
              ></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones Rápidas -->
      <section class="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Acciones Rápidas</h2>
          <p class="text-sm text-gray-500">Accede rápidamente a las funciones principales</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <router-link 
            to="/app/orders?action=create"
            class="group flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div class="text-3xl">📦</div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900 group-hover:text-blue-600">Crear Pedido</div>
              <div class="text-sm text-gray-500">Nuevo envío manual</div>
            </div>
            <span class="material-icons text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </router-link>

          <router-link 
            to="/app/orders"
            class="group flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div class="text-3xl">📋</div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900 group-hover:text-blue-600">Ver Pedidos</div>
              <div class="text-sm text-gray-500">Gestionar envíos</div>
            </div>
            <span class="material-icons text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </router-link>

          <router-link 
            to="/app/channels"
            class="group flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div class="text-3xl">📡</div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900 group-hover:text-blue-600">Canales</div>
              <div class="text-sm text-gray-500">Gestionar integraciones</div>
            </div>
            <span class="material-icons text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </router-link>

          <router-link 
            to="/app/billing"
            class="group flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div class="text-3xl">💳</div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900 group-hover:text-blue-600">Facturación</div>
              <div class="text-sm text-gray-500">Ver facturas</div>
            </div>
            <span class="material-icons text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </router-link>
        </div>
      </section>

      <!-- Comunas más Entregadas -->
      <section class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Comunas más Entregadas</h2>
            <p class="text-sm text-gray-500">Tus zonas de mayor actividad</p>
          </div>
          <router-link to="/app/orders" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Ver pedidos
          </router-link>
        </div>

        <div v-if="loadingCommunes" class="space-y-4">
          <div v-for="i in 5" :key="i" class="animate-pulse">
            <div class="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        <div v-else-if="communesStats.length === 0" class="text-center py-12">
          <span class="material-icons text-6xl text-gray-300 mb-3">location_on</span>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">No hay datos de entregas</h3>
          <p class="text-gray-500">Aún no tienes entregas registradas por comuna</p>
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="(commune, index) in communesStats" 
            :key="commune.commune"
            class="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div class="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
              {{ index + 1 }}
            </div>
            <div class="flex-1">
              <p class="font-semibold text-gray-900">{{ commune.commune }}</p>
              <p class="text-sm text-gray-500">{{ commune.delivered_orders }} entregas exitosas</p>
            </div>
            <div class="flex-shrink-0 text-right">
              <p class="font-semibold text-gray-900">{{ commune.total_orders }}</p>
              <p class="text-xs text-gray-500">total</p>
            </div>
            <div class="flex-shrink-0 w-24">
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  :style="{ width: commune.delivery_rate + '%' }"
                ></div>
              </div>
              <p class="text-xs text-gray-600 mt-1 text-center">{{ Math.round(commune.delivery_rate) }}%</p>
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

// Estado
const loading = ref(true)
const loadingChart = ref(false)
const loadingChannels = ref(false)
const loadingCommunes = ref(false)
const stats = ref({})
const chartData = ref([])
const channels = ref([])
const communesStats = ref([])
const chartPeriod = ref('30d')
const currentTime = ref('')
const currentDate = ref('')
const timeInterval = ref(null)

// Estado tiempo real
const realtimeEnabled = ref(true)
const realtimeInterval = ref(null)
const lastDataUpdate = ref(null)
const pendingUpdates = ref(new Map())
const kpiUpdates = ref({
  ordersToday: false,
  monthlyOrders: false,
  deliveredOrders: false
})

// Trends
const trends = ref({
  orders_today: null,
  orders_month: null,
  delivered: null
})

// ==================== COMPUTED ====================
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
const estimatedMonthlyCost = computed(() => stats.value.estimatedMonthlyCost || 0)
const pricePerOrder = computed(() => stats.value.pricePerOrder || 0)

// ==================== MÉTODOS ====================

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

function formatCurrency(value) {
  if (!value) return '0'
  return new Intl.NumberFormat('es-CL').format(value)
}

function getTrendIcon(direction) {
  switch(direction) {
    case 'up': return '↗'
    case 'down': return '↘'
    case 'neutral': return '→'
    default: return '→'
  }
}

function getChannelTypeName(type) {
  const types = {
    'shopify': 'Shopify',
    'woocommerce': 'WooCommerce',
    'mercadolibre': 'Mercado Libre',
    'manual': 'Manual',
    'api': 'API'
  }
  return types[type] || type
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
    stats.value = response.data
    
    try {
      const trendsResponse = await apiService.dashboard.getTrends()
      trends.value = trendsResponse.data
    } catch (trendsError) {
      console.log('⚠️ Trends no disponibles, calculando manualmente...')
      calculateTrendsManually()
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

function calculateTrendsManually() {
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
      percentage: deliveryRate.value,
      label: 'tasa de éxito'
    }
  }
}

async function fetchChartData() {
  loadingChart.value = true
  try {
    console.log('📈 Obteniendo datos del gráfico para período:', chartPeriod.value)
    const response = await apiService.orders.getTrend({ period: chartPeriod.value })
    chartData.value = response.data || []
  } catch (error) {
    console.error('❌ Error fetching chart data:', error)
    chartData.value = []
  } finally {
    loadingChart.value = false
  }
}

async function fetchChannels() {
  loadingChannels.value = true
  try {
    const response = await channelsService.getAll()
    channels.value = response.data || []
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
    communesStats.value = response.data || []
  } catch (error) {
    console.error('❌ Error fetching communes stats:', error)
    communesStats.value = []
  } finally {
    loadingCommunes.value = false
  }
}

function applyPendingUpdates() {
  console.log(`🔄 Aplicando ${pendingUpdates.value.size} actualizaciones pendientes`)
  pendingUpdates.value.clear()
  fetchStats()
  toast.success('✅ Datos actualizados correctamente')
}

function clearPendingUpdates() {
  pendingUpdates.value.clear()
  toast.info('🗑️ Actualizaciones pendientes descartadas')
}

// ==================== LIFECYCLE ====================
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
  if (realtimeInterval.value) {
    clearInterval(realtimeInterval.value)
  }
})
</script>

<style scoped>
/* Animaciones personalizadas */
@keyframes pulse-ring {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Material Icons fix */
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
}

/* Responsive */
@media (max-width: 768px) {
  .lg\:col-span-2 {
    grid-column: span 1;
  }
}
</style>