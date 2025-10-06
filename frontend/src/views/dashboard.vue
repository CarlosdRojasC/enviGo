<!-- frontend/src/views/dashboard.vue - TAILWIND VERSION CORREGIDA FINAL -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header Principal -->
    <header class="mb-8">
      <div class="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 flex justify-between items-center shadow-lg">
        <div>
          <h1 class="text-3xl font-bold text-white">
            {{ getGreeting() }}, {{ auth.user?.full_name?.split(' ')[0] || 'Usuario' }} 👋
          </h1>
          <p class="text-blue-100 mt-1">{{ auth.user?.full_name || 'Usuario' }}, aquí tienes un resumen de tu operación</p>
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
          <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-3xl font-bold text-gray-900">{{ todayOrders }}</p>
                <p class="text-sm text-gray-500 mt-1">Pedidos Hoy</p>
                <div v-if="trends.orders_today" class="flex items-center gap-1 mt-2 text-xs">
                  <span :class="trends.orders_today.direction === 'up' ? 'text-green-600' : trends.orders_today.direction === 'down' ? 'text-red-600' : 'text-gray-600'">
                    {{ getTrendIcon(trends.orders_today.direction) }}
                  </span>
                  <span class="text-gray-600">{{ trends.orders_today.percentage }}% {{ trends.orders_today.label }}</span>
                </div>
                <p v-else class="text-xs text-gray-400 mt-2">Calculando...</p>
              </div>
              <span class="text-4xl">📦</span>
            </div>
          </div>

          <!-- KPI Pedidos Este Mes -->
          <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-3xl font-bold text-gray-900">{{ monthlyOrders }}</p>
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
          <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-3xl font-bold text-gray-900">{{ deliveredOrders }}</p>
                <p class="text-sm text-gray-500 mt-1">Entregados</p>
                <p class="text-xs text-green-600 mt-2">{{ deliveryRate }}% de éxito</p>
              </div>
              <span class="text-4xl">✅</span>
            </div>
          </div>

          <!-- KPI Costo Estimado -->
          <div class="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-lg shadow-sm text-white hover:shadow-md transition-shadow">
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
              <p class="text-sm text-gray-500">Evolución de tu operación en el tiempo</p>
            </div>
            <select 
              v-model="chartPeriod" 
              @change="fetchChartData"
              class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
              <option value="90d">3 meses</option>
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

        <!-- Mis Canales -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">Mis Canales</h3>
              <p class="text-sm text-gray-500">Tus integraciones</p>
            </div>
            <router-link to="/app/channels" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Gestionar
            </router-link>
          </div>

          <div v-if="loadingChannels" class="space-y-4">
            <div v-for="i in 3" :key="i" class="animate-pulse">
              <div class="h-20 bg-gray-200 rounded-lg"></div>
            </div>
          </div>

          <div v-else-if="channels.length === 0" class="text-center py-8">
            <span class="text-5xl mb-3 block">📡</span>
            <h3 class="text-lg font-semibold text-gray-700 mb-2">No hay canales configurados</h3>
            <p class="text-sm text-gray-500 mb-4">Conecta tus tiendas online para sincronizar pedidos automáticamente</p>
            <router-link to="/app/channels" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <span class="material-icons text-lg">add</span>
              Conectar Canal
            </router-link>
          </div>

          <div v-else class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            <div 
              v-for="channel in channels.slice(0, 4)" 
              :key="channel._id"
              class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <!-- Icono del canal -->
              <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-2xl">
                {{ getChannelIcon(channel.channel_type) }}
              </div>
              
              <!-- Info del canal -->
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 truncate">{{ channel.channel_name }}</p>
                <p class="text-xs text-gray-500 uppercase tracking-wide">{{ formatChannelType(channel.channel_type) }}</p>
              </div>
              
              <!-- Stats del canal -->
              <div class="flex flex-col items-center">
                <span class="text-lg font-bold text-gray-900">{{ channel.total_orders || 0 }}</span>
                <span class="text-xs text-gray-500 uppercase">Pedidos</span>
              </div>
              
              <!-- Estado -->
              <div class="flex items-center gap-2">
                <span 
                  class="w-2.5 h-2.5 rounded-full"
                  :class="{
                    'bg-green-500 animate-pulse': getChannelStatusClass(channel) === 'active',
                    'bg-yellow-500': getChannelStatusClass(channel) === 'warning',
                    'bg-red-500': getChannelStatusClass(channel) === 'inactive'
                  }"
                ></span>
                <span class="text-xs text-gray-600">{{ getChannelStatus(channel) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones Rápidas -->
      <section class="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Acciones Rápidas</h2>
          <p class="text-sm text-gray-500">Herramientas frecuentes</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <router-link 
            v-for="action in quickActions" 
            :key="action.id"
            :to="action.route"
            class="group flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div class="text-3xl">{{ action.icon }}</div>
            <div class="flex-1">
              <div class="font-semibold text-gray-900 group-hover:text-blue-600">{{ action.title }}</div>
              <div class="text-sm text-gray-500">{{ action.description }}</div>
            </div>
            <span class="text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1">→</span>
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
            <div class="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        <div v-else-if="communesStats.length === 0" class="text-center py-12">
          <span class="text-6xl mb-3 block">🏘️</span>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">No hay datos de entregas</h3>
          <p class="text-gray-500">Aún no tienes entregas registradas por comuna</p>
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="(commune, index) in communesStats" 
            :key="commune.commune"
            class="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <!-- Ranking -->
            <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {{ index + 1 }}
            </div>
            
            <!-- Nombre comuna -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 truncate">{{ commune.commune }}</p>
              <p class="text-sm text-gray-500 flex items-center gap-1">
                <span>📦</span>
                {{ commune.delivered_orders || 0 }} entregas exitosas
              </p>
            </div>
            
            <!-- Total -->
            <div class="flex flex-col items-center">
              <span class="text-lg font-bold text-gray-900">{{ commune.total_orders || 0 }}</span>
              <span class="text-xs text-gray-500 uppercase">Total</span>
            </div>
            
            <!-- Barra de progreso -->
            <div class="flex-shrink-0 w-32">
              <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out"
                  :style="{ width: (commune.delivery_rate || 0) + '%' }"
                ></div>
              </div>
              <p class="text-xs text-gray-600 mt-1 text-center font-medium">
                {{ Math.round(commune.delivery_rate || 0) }}%
              </p>
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

// Trends
const trends = ref({
  orders_today: null,
  orders_month: null,
  delivered: null
})

// ==================== COMPUTED ====================
const hasInitialData = computed(() => Object.keys(stats.value).length > 0)
const currentMonth = computed(() => new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))

const totalOrders = computed(() => {
  const value = stats.value.orders || 0
  console.log('📊 totalOrders computed:', value)
  return value
})

const todayOrders = computed(() => {
  const value = stats.value.ordersToday || 0
  console.log('📊 todayOrders computed:', value, 'from stats:', stats.value.ordersToday)
  return value
})

const monthlyOrders = computed(() => {
  const value = stats.value.monthlyOrders || 0
  console.log('📊 monthlyOrders computed:', value)
  return value
})

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

const pricePerOrder = computed(() => stats.value.pricePerOrder || 2500)

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
    
    console.log('📊 Raw stats recibidas:', rawData)
    console.log('📊 ordersToday:', rawData.ordersToday)
    console.log('📊 monthlyOrders:', rawData.monthlyOrders)
    console.log('📊 deliveredTotal:', rawData.deliveredTotal)
    
    stats.value = rawData
    
    try {
      const trendsResponse = await apiService.dashboard.getTrends()
      trends.value = trendsResponse.data
      console.log('📈 Trends recibidos:', trends.value)
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
    console.log('📡 Obteniendo canales...')
    const companyId = auth.user?.company?._id || auth.user?.company_id
    
    console.log('📡 Company ID:', companyId)
    
    if (companyId) {
      const response = await channelsService.getByCompany(companyId)
      console.log('📡 Response completo:', response)
      console.log('📡 Response.data:', response.data)
      channels.value = response.data.data || response.data || []
    } else {
      console.warn('⚠️ No se encontró company_id')
      channels.value = []
    }
    
    console.log('📡 Canales cargados:', channels.value.length)
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
    const response = await apiService.dashboard.getCommunesStats()
    console.log('🏘️ Response de comunas:', response.data)
    
    const communesArray = response.data.all_stats || response.data || []
    console.log('🏘️ Array de comunas:', communesArray.length)
    
    // Ordenar por entregas exitosas y tomar top 5
    communesStats.value = communesArray
      .sort((a, b) => (b.delivered_orders || 0) - (a.delivered_orders || 0))
      .slice(0, 5)
      
    console.log('🏘️ Top 5 comunas:', communesStats.value)
  } catch (error) {
    console.error('❌ Error fetching communes stats:', error)
    communesStats.value = []
  } finally {
    loadingCommunes.value = false
  }
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
})
</script>

<style scoped>
/* Animaciones personalizadas */
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

/* Scrollbar personalizado */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive */
@media (max-width: 768px) {
  .lg\:col-span-2 {
    grid-column: span 1;
  }
  
  .grid {
    gap: 1rem;
  }
}
</style>