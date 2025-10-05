<!-- frontend/src/views/AdminDashboard.vue - TAILWIND VERSION -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header Principal -->
    <header class="mb-8">
      <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 flex justify-between items-center shadow-lg">
        <div>
          <h1 class="text-3xl font-bold text-white flex items-center">
            Panel de Administración
            <span class="material-icons ml-2 animate-spin-slow">sync</span>
          </h1>
          <p class="text-indigo-200 mt-1">Gestiona todo el sistema desde aquí</p>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right">
            <p class="text-lg font-semibold text-white">{{ currentTime }}</p>
            <p class="text-sm text-indigo-200">{{ currentDate }}</p>
          </div>
          <button 
            @click="fetchAllData" 
            :disabled="loading"
            class="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <span class="material-icons" :class="{ 'animate-spin': loading }">refresh</span>
            Actualizar
          </button>
        </div>
      </div>
    </header>

    <!-- Métricas del Sistema -->
    <section class="mb-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Métricas del Sistema</h2>
        <p class="text-sm text-indigo-600 font-medium">Vista global de toda la plataforma</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Empresas Activas -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-3xl font-bold text-gray-900">{{ stats.companies || 0 }}</p>
              <p class="text-sm text-gray-500 mt-1">Empresas Activas</p>
            </div>
            <div class="bg-indigo-100 p-3 rounded-full">
              <span class="material-icons text-indigo-500">business</span>
            </div>
          </div>
        </div>

        <!-- Total Pedidos de Hoy -->
        <div class="bg-white p-6 rounded-lg shadow-sm border-2 border-indigo-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-3xl font-bold text-gray-900">{{ ordersToday }}</p>
              <p class="text-sm text-gray-500 mt-1">Total Pedidos de Hoy</p>
            </div>
            <div class="bg-indigo-100 p-3 rounded-full">
              <span class="material-icons text-indigo-500">local_shipping</span>
            </div>
          </div>
          <div v-if="stats.ordersToday > 0" class="mt-2 text-sm flex items-center text-green-500">
            <span class="material-icons text-base mr-1">arrow_upward</span>
            Activo hoy
          </div>
        </div>

        <!-- Pedidos Entregados -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-3xl font-bold text-gray-900">{{ deliveredOrders }}</p>
              <p class="text-sm text-gray-500 mt-1">Pedidos Entregados</p>
            </div>
            <div class="bg-indigo-100 p-3 rounded-full">
              <span class="material-icons text-indigo-500">check_circle_outline</span>
            </div>
          </div>
          <div class="mt-2 text-sm flex items-center text-gray-500">
            <span class="material-icons text-base mr-1">inventory</span>
            Total histórico
          </div>
        </div>

        <!-- Ingresos del Mes -->
        <div class="bg-orange-400 p-6 rounded-lg shadow-sm text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-3xl font-bold">{{ formatCurrency(monthlyRevenue) }}</p>

              <p class="text-sm text-orange-100 mt-1">Ingresos del Mes</p>
            </div>
          </div>
          <p class="text-xs mt-2 text-orange-100">{{ stats.monthlyOrders || 0 }} pedidos este mes</p>
        </div>
      </div>
    </section>

    <!-- Grid Principal: Gráfico + Empresas -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <!-- Tendencia Global de Pedidos -->
      <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-xl font-semibold text-gray-900">Tendencia Global de Pedidos</h3>
            <p class="text-sm text-gray-500">Actividad de todas las empresas</p>
          </div>
          <select 
            v-model="chartPeriod" 
            @change="fetchChartData"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="7d">7 días</option>
            <option value="30d">30 días</option>
            <option value="90d">90 días</option>
          </select>
        </div>

        <!-- Gráfico Real -->
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
          :show-header="false"
          @period-change="handlePeriodChange"
        />
      </div>

      <!-- Gestión de Empresas -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-900">Gestión de Empresas</h3>
          <router-link to="/app/admin/companies" class="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Ver Todas
          </router-link>
        </div>

        <div v-if="loading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="h-20 bg-gray-100 rounded-lg"></div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div 
            v-for="company in topCompanies" 
            :key="company._id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3 flex-1">
              <div class="bg-gray-200 p-2 rounded-lg">
                <span class="material-icons text-gray-600">apartment</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-sm text-gray-900 truncate">{{ company.name || company.company_name || 'Sin nombre' }}</p>
                <p class="text-xs text-gray-500 truncate">{{ company.email || 'Sin email' }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <div v-if="company.orderCount !== undefined" class="text-right">
                <p class="font-bold text-sm text-gray-900">{{ company.orderCount || 0 }}</p>
                <p class="text-xs text-gray-500">Pedidos</p>
              </div>
              
              <div class="text-xs font-medium flex items-center" :class="company.is_active ? 'text-green-500' : 'text-gray-400'">
                <span class="h-2 w-2 rounded-full mr-2" :class="company.is_active ? 'bg-green-500' : 'bg-gray-400'"></span>
                {{ company.is_active ? 'Activa' : 'Inactiva' }}
              </div>
            </div>
          </div>

          <div v-if="!topCompanies || topCompanies.length === 0" class="text-center py-8">
            <span class="material-icons text-4xl text-gray-300 mb-2">business</span>
            <p class="text-gray-500 text-sm">No hay empresas registradas</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Herramientas de Administración -->
    <section class="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-gray-900">Herramientas de Administración</h2>
        <p class="text-sm text-gray-500">Gestión del sistema</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <router-link 
          v-for="action in adminActions" 
          :key="action.id"
          :to="action.route"
          class="group flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
        >
          <div class="text-3xl">{{ action.icon }}</div>
          <div class="flex-1">
            <div class="font-semibold text-gray-900 group-hover:text-indigo-600">{{ action.title }}</div>
            <div class="text-sm text-gray-500">{{ action.description }}</div>
          </div>
          <span class="material-icons text-gray-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1">arrow_forward</span>
        </router-link>
      </div>
    </section>

    <!-- Estado del Sistema -->
    <section class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-gray-900">Estado del Sistema</h2>
        <p class="text-sm text-gray-500">Monitoreo y salud</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="flex items-center gap-4">
          <span class="text-3xl">🟢</span>
          <div>
            <p class="font-semibold text-gray-900">API Backend</p>
            <p class="text-sm text-gray-500">Funcionando correctamente</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-3xl">🟢</span>
          <div>
            <p class="font-semibold text-gray-900">Base de Datos</p>
            <p class="text-sm text-gray-500">{{ stats.orders || 0 }} pedidos registrados</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-3xl">🟢</span>
          <div>
            <p class="font-semibold text-gray-900">Integración Shipday</p>
            <p class="text-sm text-gray-500">Conectado y funcionando</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-3xl">{{ channels > 0 ? '🟢' : '🟡' }}</span>
          <div>
            <p class="font-semibold text-gray-900">Canales Activos</p>
            <p class="text-sm text-gray-500">{{ channels }} canales conectados</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { apiService } from '../services/api'
import OrdersTrendChart from '../components/dashboard/OrdersTrendChart.vue'

// Estado
const loading = ref(false)
const loadingChart = ref(false)
const stats = ref({})
const companies = ref([])
const channels = ref(0)
const chartData = ref([])
const chartPeriod = ref('30d')
const currentTime = ref('')
const currentDate = ref('')
const timeInterval = ref(null)

// Datos computados
const topCompanies = computed(() => {
  if (!companies.value || !Array.isArray(companies.value)) return []
  return companies.value.slice(0, 5)
})

// Acciones de admin
const adminActions = [
  {
    id: 1,
    icon: '🏢',
    title: 'Gestionar Empresas',
    description: 'Administrar clientes',
    route: '/app/admin/companies'
  },
  {
    id: 2,
    icon: '📦',
    title: 'Ver Pedidos',
    description: 'Todos los envíos',
    route: '/app/admin/orders'
  },
  {
    id: 3,
    icon: '🚚',
    title: 'Conductores',
    description: 'Gestión de drivers',
    route: '/app/admin/drivers'
  },
  {
    id: 4,
    icon: '💰',
    title: 'Pagos',
    description: 'Liquidaciones',
    route: '/app/admin/driver-payments'
  },
  {
    id: 5,
    icon: '📡',
    title: 'Canales',
    description: 'Integraciones',
    route: '/app/admin/channels'
  },
  {
    id: 6,
    icon: '🧾',
    title: 'Facturación',
    description: 'Gestión de cobros',
    route: '/app/admin/billing'
  }
]
// ========== COMPUTED PROPERTIES CON FALLBACKS ==========
const deliveredOrders = computed(() => {
  // Opción 1: Buscar en ordersByStatus con fallbacks
  const byStatus = stats.value.ordersByStatus || stats.value.orders_by_status || {}
  const fromStatus = byStatus.delivered || 0
  
  // Opción 2: Buscar como propiedad directa con todos los fallbacks posibles
  const directValue = stats.value.deliveredOrders || 
                      stats.value.delivered_orders || 
                      stats.value.deliveredTotal || 
                      stats.value.delivered_total || 
                      0
  
  // Retornar el mayor de los dos (el que tenga datos reales)
  return Math.max(fromStatus, directValue)
})

const totalOrders = computed(() => 
  stats.value.totalOrders || 
  stats.value.total_orders || 
  stats.value.orders || 
  0
)

const ordersToday = computed(() => 
  stats.value.ordersToday || 
  stats.value.orders_today || 
  0
)

const monthlyRevenue = computed(() => 
  stats.value.monthlyRevenue || 
  stats.value.monthly_revenue ||
  stats.value.estimatedMonthlyCost || 
  stats.value.estimated_monthly_cost ||
  0
)

const deliveryRate = computed(() => {
  const total = totalOrders.value
  const delivered = deliveredOrders.value
  return total > 0 ? Math.round((delivered / total) * 100) : 0
})

// ========== ACTUALIZA fetchStats con debug mejorado ==========
async function fetchStats() {
  try {
    const statsRes = await apiService.dashboard.getAdminStats()
    
    // DEBUG: Ver qué propiedades envía realmente el backend
    console.log('✅ Stats recibidas:', statsRes.data)
    console.log('📊 Claves disponibles:', Object.keys(statsRes.data))
    console.log('📊 ordersToday:', statsRes.data.ordersToday, 'orders_today:', statsRes.data.orders_today)
    console.log('📊 deliveredOrders:', statsRes.data.deliveredOrders, 'delivered_orders:', statsRes.data.delivered_orders)
    console.log('📊 ordersByStatus:', statsRes.data.ordersByStatus)
    console.log('📊 orders_by_status:', statsRes.data.orders_by_status)
    
    stats.value = statsRes.data
  } catch (error) {
    console.error('❌ Error fetching stats:', error)
  }
}
// Funciones
function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  currentDate.value = now.toLocaleDateString('es-CL', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })
}

function formatCurrency(value) {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(value)
}

async function fetchAllData() {
  loading.value = true
  try {
    console.log('🔄 Iniciando carga de datos del dashboard admin...')
    
    await Promise.all([
      fetchStats(),
      fetchChartData(),
      fetchCompanies()
    ])

    console.log('✅ Todos los datos cargados')
  } catch (error) {
    console.error('❌ Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const statsRes = await apiService.dashboard.getAdminStats()
    console.log('✅ Stats recibidas:', statsRes.data)
    stats.value = statsRes.data
  } catch (error) {
    console.error('❌ Error fetching stats:', error)
  }
}

async function fetchChartData() {
  loadingChart.value = true
  try {
    console.log('📈 Obteniendo datos del gráfico para período:', chartPeriod.value)
    const response = await apiService.orders.getTrend({ period: chartPeriod.value })
    const newData = response.data || []
    
    console.log('📈 Datos del gráfico recibidos:', newData.length, 'puntos')
    
    setTimeout(() => {
      chartData.value = newData
      loadingChart.value = false
    }, 200)
  } catch (error) {
    console.error('❌ Error fetching chart data:', error)
    chartData.value = []
    loadingChart.value = false
  }
}

async function fetchCompanies() {
  try {
    const companiesRes = await apiService.companies.getAll()
    const channelsRes = await apiService.channels.getAll()

    console.log('✅ Companies recibidas:', companiesRes.data)
    console.log('✅ Channels recibidos:', channelsRes.data)

    // Asignar companies - manejar diferentes formatos de respuesta
    if (Array.isArray(companiesRes.data)) {
      companies.value = companiesRes.data
    } else if (companiesRes.data.companies && Array.isArray(companiesRes.data.companies)) {
      companies.value = companiesRes.data.companies
    } else if (companiesRes.data.data && Array.isArray(companiesRes.data.data)) {
      companies.value = companiesRes.data.data
    } else {
      console.warn('⚠️ Formato de companies no reconocido:', companiesRes.data)
      companies.value = []
    }

    // Asignar channels
    if (Array.isArray(channelsRes.data)) {
      channels.value = channelsRes.data.length
    } else if (channelsRes.data.channels && Array.isArray(channelsRes.data.channels)) {
      channels.value = channelsRes.data.channels.length
    } else if (channelsRes.data.data && Array.isArray(channelsRes.data.data)) {
      channels.value = channelsRes.data.data.length
    } else {
      channels.value = 0
    }

    console.log('✅ Datos procesados:', {
      stats: stats.value,
      companiesCount: companies.value.length,
      channelsCount: channels.value
    })
  } catch (error) {
    console.error('❌ Error fetching companies/channels:', error)
  }
}

function handlePeriodChange(period) {
  console.log('📊 Cambiando período del gráfico a:', period)
  chartPeriod.value = period
  fetchChartData()
}

onMounted(() => {
  updateTime()
  timeInterval.value = setInterval(updateTime, 60000)
  fetchAllData()
})

onUnmounted(() => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value)
  }
})
</script>

<style scoped>
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}
</style>