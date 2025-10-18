<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-2">
            🛣️ Gestión de Rutas
          </h1>
          <p class="text-gray-600 mt-1">Optimiza y administra las rutas de entrega de tus conductores</p>
        </div>
        <div class="flex gap-3">
          <button 
            @click="showRouteOptimizer = true" 
            class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            ✨ Optimizar Nueva Ruta
          </button>
          <button 
            @click="refreshRoutes" 
            class="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            :disabled="loading"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="text-3xl">🛣️</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ routeStats?.totalRoutes || 0 }}</h3>
            <p class="text-gray-600">Rutas Totales</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="text-3xl">🚀</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ routeStats.inProgressRoutes || 0 }}</h3>
            <p class="text-gray-600">En Progreso</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="text-3xl">✅</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ routeStats.completedRoutes || 0 }}</h3>
            <p class="text-gray-600">Completadas</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="text-3xl">📊</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ routeStats.completionRate || 0 }}%</h3>
            <p class="text-gray-600">Tasa de Éxito</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Estado:</label>
          <select 
            v-model="filters.status" 
            @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="assigned">Asignada</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Conductor:</label>
          <select 
            v-model="filters.driverId" 
            @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option v-for="driver in drivers" :key="driver._id" :value="driver._id">
              {{ driver.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Fecha desde:</label>
          <input 
            type="date" 
            v-model="filters.startDate" 
            @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Fecha hasta:</label>
          <input 
            type="date" 
            v-model="filters.endDate" 
            @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
      </div>
    </div>

    <!-- Routes Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold text-gray-900">Lista de Rutas</h3>
          <div class="flex gap-2">
            <button 
              v-if="selectedRoutes.length > 0"
              @click="bulkAssignDriver"
              class="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors"
            >
              👥 Asignar Conductor ({{ selectedRoutes.length }})
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left">
                <input 
                  type="checkbox" 
                  @change="toggleSelectAll"
                  :checked="isAllSelected"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Ruta</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conductor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entregas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progreso</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distancia</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo Est.</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creada</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="10" class="px-6 py-12 text-center">
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span class="ml-2 text-gray-600">Cargando rutas...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="routes.length === 0">
              <td colspan="10" class="px-6 py-12 text-center">
                <div class="text-center">
                  <div class="text-6xl mb-4">🛣️</div>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">No hay rutas</h3>
                  <p class="text-gray-600 mb-4">Aún no has creado ninguna ruta optimizada</p>
                  <button 
                    @click="showRouteOptimizer = true" 
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Crear Primera Ruta
                  </button>
                </div>
              </td>
            </tr>
            <tr 
              v-else
              v-for="route in routes" 
              :key="route._id"
              :class="{ 'bg-blue-50': selectedRoutes.includes(route._id) }"
              class="hover:bg-gray-50 cursor-pointer"
              @click="selectRoute(route)"
            >
              <td class="px-6 py-4 whitespace-nowrap" @click.stop>
                <input 
                  type="checkbox" 
                  :value="route._id"
                  v-model="selectedRoutes"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">
                  #{{ route._id.slice(-6).toUpperCase() }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {{ route.driver?.name?.charAt(0) || 'N' }}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ route.driver?.name || 'Sin asignar' }}</div>
                    <div class="text-sm text-gray-500">{{ route.driver?.email || '' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="{
                    'bg-yellow-100 text-yellow-800': route.status === 'draft',
                    'bg-blue-100 text-blue-800': route.status === 'assigned',
                    'bg-purple-100 text-purple-800': route.status === 'in_progress',
                    'bg-green-100 text-green-800': route.status === 'completed',
                    'bg-red-100 text-red-800': route.status === 'cancelled'
                  }"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getStatusText(route.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ route.orders?.length || 0 }}</div>
                <div class="text-sm text-gray-500">pedidos</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${getRouteProgress(route)}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium text-gray-700">{{ getRouteProgress(route) }}%</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDistance(route.optimization?.totalDistance) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDuration(route.optimization?.totalDuration) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(route.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex gap-1">
                  <button 
  @click.stop="viewRoute(route)" 
  class="text-gray-600 hover:text-gray-900 p-1 rounded"
  title="Ver detalles"
>
  🗺️
</button>
                  <button 
                    v-if="route.status === 'draft'"
                    @click.stop="assignDriver(route)" 
                    class="text-blue-600 hover:text-blue-900 p-1 rounded"
                    title="Asignar conductor"
                  >
                    👤
                  </button>
                  <button 
                    @click.stop="duplicateRoute(route)" 
                    class="text-green-600 hover:text-green-900 p-1 rounded"
                    title="Duplicar ruta"
                  >
                    📋
                  </button>
                  <button 
                    v-if="route.status === 'draft'"
                    @click.stop="deleteRoute(route)" 
                    class="text-red-600 hover:text-red-900 p-1 rounded"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > 1" class="bg-white px-6 py-4 border-t border-gray-200">
        <div class="flex justify-between items-center">
          <button 
            @click="changePage(pagination.current - 1)"
            :disabled="pagination.current === 1"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span class="text-sm text-gray-700">
            Página {{ pagination.current }} de {{ pagination.total }}
          </span>
          <button 
            @click="changePage(pagination.current + 1)"
            :disabled="pagination.current === pagination.total"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>

    <!-- Route Optimizer Modal -->
    <div v-if="showRouteOptimizer" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-md w-full max-h-96 overflow-y-auto" @click.stop>
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">✨ Optimizar Nueva Ruta</h3>
            <button @click="showRouteOptimizer = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6">
          <p class="text-gray-600 mb-4">Modal de optimización - En construcción</p>
          <button 
            @click="showRouteOptimizer = false" 
            class="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    <!-- Route Details / Map Modal -->
<div v-if="showRouteMap" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl max-w-4xl w-full overflow-hidden shadow-xl">
    <div class="flex justify-between items-center border-b border-gray-200 p-4">
      <h3 class="text-lg font-semibold text-gray-900">
        🗺️ Detalle de Ruta #{{ activeRoute?._id.slice(-6).toUpperCase() }}
      </h3>
      <button @click="showRouteMap = false" class="text-gray-500 hover:text-gray-700">
        ✖
      </button>
    </div>
    <div id="routeMap" class="w-full h-[500px]"></div>
  </div>
</div>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../services/api'
import L from 'leaflet'

export default {
  name: 'RouteManager',
  setup() {
    // State
    const routes = ref([])
    const drivers = ref([])
    const routeStats = ref({
      totalRoutes: 0,
      inProgressRoutes: 0,
      completedRoutes: 0,
      completionRate: 0
    })
    const loading = ref(false)
    const showRouteOptimizer = ref(false)
    const showRouteMap = ref(false)
const activeRoute = ref(null)
let mapInstance = null

    // Filters
    const filters = ref({
      status: '',
      driverId: '',
      startDate: '',
      endDate: ''
    })
    
    // Pagination
    const pagination = ref({
      current: 1,
      total: 1,
      limit: 20
    })
    
    // Selection
    const selectedRoutes = ref([])
    
    // Computed
    const isAllSelected = computed(() => {
      return routes.value.length > 0 && selectedRoutes.value.length === routes.value.length
    })
    
    // Methods
    const loadRoutes = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.value.current,
          limit: pagination.value.limit,
          ...filters.value
        }
        
        // ✅ CORREGIDO: Usar apiService directamente (objeto), no como función
        const response = await apiService.routes.getAll(params)
        routes.value = response.data.data.routes
        pagination.value = response.data.data.pagination
      } catch (error) {
        console.error('Error loading routes:', error)
        // Fallback: usar datos mock si la API no está disponible
        routes.value = []
        alert('Error al cargar las rutas: ' + error.message)
      } finally {
        loading.value = false
      }
    }
    
    const loadRouteStats = async () => {
      try {
        // ✅ CORREGIDO: Verificar si el endpoint existe
        if (apiService.routes && apiService.routes.getStats) {
          const response = await apiService.routes.getStats(filters.value)
          routeStats.value = response.data.data
        } else {
          // Fallback: usar datos mock
          routeStats.value = {
            totalRoutes: routes.value.length,
            inProgressRoutes: routes.value.filter(r => r.status === 'in_progress').length,
            completedRoutes: routes.value.filter(r => r.status === 'completed').length,
            completionRate: routes.value.length > 0 ? Math.round((routes.value.filter(r => r.status === 'completed').length / routes.value.length) * 100) : 0
          }
        }
      } catch (error) {
        console.error('Error loading route stats:', error)
        // Usar stats básicas como fallback
        routeStats.value = {
          totalRoutes: 0,
          inProgressRoutes: 0,
          completedRoutes: 0,
          completionRate: 0
        }
      }
    }
    
    const loadDrivers = async () => {
      try {
        // ✅ CORREGIDO: Usar apiService directamente
        const response = await apiService.drivers.getAll()
        drivers.value = response.data.data || response.data
      } catch (error) {
        console.error('Error loading drivers:', error)
        drivers.value = []
      }
    }
    
    const viewRoute = (route) => {
      alert(`Ver detalles de ruta: ${route._id}`)
    }
    
    const assignDriver = async (route) => {
      const driverId = prompt('ID del conductor a asignar:')
      if (!driverId) return
      
      try {
        // ✅ CORREGIDO: Verificar si el método existe
        if (apiService.routes && apiService.routes.assign) {
          await apiService.routes.assign(route._id, driverId)
          alert('Conductor asignado correctamente')
          await loadRoutes()
        } else {
          alert('Funcionalidad de asignación no disponible')
        }
      } catch (error) {
        console.error('Error assigning driver:', error)
        alert('Error al asignar conductor: ' + error.message)
      }
    }
    
    const duplicateRoute = async (route) => {
      try {
        // ✅ CORREGIDO: Verificar si el método existe
        if (apiService.routes && apiService.routes.duplicate) {
          await apiService.routes.duplicate(route._id)
          alert('Ruta duplicada correctamente')
          await loadRoutes()
        } else {
          alert('Funcionalidad de duplicación no disponible')
        }
      } catch (error) {
        console.error('Error duplicating route:', error)
        alert('Error al duplicar ruta: ' + error.message)
      }
    }
    
    const deleteRoute = async (route) => {
      if (!confirm('¿Estás seguro de eliminar esta ruta?')) return
      
      try {
        // ✅ CORREGIDO: Verificar si el método existe
        if (apiService.routes && apiService.routes.delete) {
          await apiService.routes.delete(route._id)
          alert('Ruta eliminada correctamente')
          await loadRoutes()
        } else {
          alert('Funcionalidad de eliminación no disponible')
        }
      } catch (error) {
        console.error('Error deleting route:', error)
        alert('Error al eliminar ruta: ' + error.message)
      }
    }
    
    const applyFilters = () => {
      pagination.value.current = 1
      loadRoutes()
      loadRouteStats()
    }
    
    const refreshRoutes = () => {
      loadRoutes()
      loadRouteStats()
    }
    
    const toggleSelectAll = () => {
      if (isAllSelected.value) {
        selectedRoutes.value = []
      } else {
        selectedRoutes.value = routes.value.map(r => r._id)
      }
    }
    
    const selectRoute = (route) => {
      if (selectedRoutes.value.includes(route._id)) {
        selectedRoutes.value = selectedRoutes.value.filter(id => id !== route._id)
      } else {
        selectedRoutes.value.push(route._id)
      }
    }
    
    const changePage = (page) => {
      pagination.value.current = page
      loadRoutes()
    }
    
    const bulkAssignDriver = () => {
      alert(`Asignar conductor a ${selectedRoutes.value.length} rutas - En construcción`)
    }
    
    // Utility functions
    const getStatusText = (status) => {
      const statusMap = {
        'draft': 'Borrador',
        'assigned': 'Asignada',
        'in_progress': 'En Progreso',
        'completed': 'Completada',
        'cancelled': 'Cancelada'
      }
      return statusMap[status] || status
    }
    
    const getRouteProgress = (route) => {
      if (!route.orders || route.orders.length === 0) return 0
      const completed = route.orders.filter(o => o.deliveryStatus === 'delivered').length
      return Math.round((completed / route.orders.length) * 100)
    }
    
    const formatDistance = (meters) => {
      if (!meters) return '-'
      const km = meters / 1000
      return `${km.toFixed(1)} km`
    }
    
    const formatDuration = (seconds) => {
      if (!seconds) return '-'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
    
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('es-CL')
    }
    const viewRoute = (route) => {
  activeRoute.value = route
  showRouteMap.value = true
  setTimeout(initMap, 300) // Pequeño delay para esperar render
}

const initMap = () => {
  if (!activeRoute.value) return

  const route = activeRoute.value
  const start = route.startLocation
  const end = route.endLocation
  const orders = route.orders || []

  // Crear mapa o reiniciar
  if (mapInstance) {
    mapInstance.remove()
  }

  mapInstance = L.map('routeMap').setView([start.latitude, start.longitude], 12)

  // Añadir capa base
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapInstance)

  // Marcador de inicio
  const startMarker = L.marker([start.latitude, start.longitude], {
    title: `Inicio: ${start.address}`
  }).addTo(mapInstance)
  startMarker.bindPopup(`<b>Inicio</b><br>${start.address}`).openPopup()

  // Marcadores de pedidos
  orders.forEach((item, i) => {
    const o = item.order
    if (!o || !o.location) return

    L.marker([o.location.latitude, o.location.longitude])
      .addTo(mapInstance)
      .bindPopup(`<b>Pedido #${i + 1}</b><br>${o.location.address}`)
  })

  // Marcador final
  if (end) {
    L.marker([end.latitude, end.longitude], {
      title: `Fin: ${end.address}`,
      icon: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        iconSize: [32, 32]
      })
    })
      .addTo(mapInstance)
      .bindPopup(`<b>Fin</b><br>${end.address}`)
  }

  // Ajustar vista a todos los puntos
  const allPoints = [
    [start.latitude, start.longitude],
    ...orders
      .filter(o => o.order?.location)
      .map(o => [o.order.location.latitude, o.order.location.longitude]),
    [end.latitude, end.longitude]
  ]
  mapInstance.fitBounds(allPoints, { padding: [50, 50] })

  // Opcional: dibujar línea
  const polyline = L.polyline(allPoints, { color: 'blue', weight: 3, opacity: 0.7 })
  polyline.addTo(mapInstance)
}

    
    // Lifecycle
    onMounted(() => {
      loadRoutes()
      loadRouteStats()
      loadDrivers()
    })
    
    return {
      // State
      routes,
      drivers,
      routeStats,
      loading,
      showRouteOptimizer,
      filters,
      pagination,
      selectedRoutes,
      showRouteMap,
activeRoute,
      // Computed
      isAllSelected,
      
      // Methods
      loadRoutes,
      viewRoute,
      assignDriver,
      duplicateRoute,
      deleteRoute,
      applyFilters,
      refreshRoutes,
      toggleSelectAll,
      selectRoute,
      changePage,
      bulkAssignDriver,
      getStatusText,
      getRouteProgress,
      formatDistance,
      formatDuration,
      formatDate,
      
    }
  }
}
</script>