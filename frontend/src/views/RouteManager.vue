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

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div v-for="card in statCards" :key="card.label" class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center gap-4">
          <div class="text-3xl">{{ card.icon }}</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ card.value }}</h3>
            <p class="text-gray-600">{{ card.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Estado:</label>
          <select v-model="filters.status" @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
          <select v-model="filters.driverId" @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">Todos</option>
            <option v-for="driver in drivers" :key="driver._id" :value="driver._id">{{ driver.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Fecha desde:</label>
          <input type="date" v-model="filters.startDate" @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Fecha hasta:</label>
          <input type="date" v-model="filters.endDate" @change="applyFilters"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
      </div>
    </div>

    <!-- Routes Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-xl font-semibold text-gray-900">Lista de Rutas</h3>
        <button
          v-if="selectedRoutes.length > 0"
          @click="bulkAssignDriver"
          class="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors">
          👥 Asignar Conductor ({{ selectedRoutes.length }})
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left">
                <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Ruta</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conductor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entregas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progreso</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distancia</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo Est.</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creada</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="10" class="px-6 py-12 text-center">⏳ Cargando rutas...</td>
            </tr>
            <tr v-else-if="routes.length === 0">
              <td colspan="10" class="px-6 py-12 text-center">
                <div>🛣️ No hay rutas aún</div>
                <button @click="showRouteOptimizer = true" class="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg">Crear Ruta</button>
              </td>
            </tr>
            <tr v-for="route in routes" :key="route._id" class="hover:bg-gray-50">
              <td class="px-6 py-4"><input type="checkbox" v-model="selectedRoutes" :value="route._id" /></td>
              <td class="px-6 py-4 font-medium">#{{ route._id.slice(-6).toUpperCase() }}</td>
              <td class="px-6 py-4">{{ route.driver?.name || 'Sin asignar' }}</td>
              <td class="px-6 py-4">{{ getStatusText(route.status) }}</td>
              <td class="px-6 py-4">{{ route.orders?.length || 0 }}</td>
              <td class="px-6 py-4">{{ getRouteProgress(route) }}%</td>
              <td class="px-6 py-4">{{ formatDistance(route.optimization?.totalDistance) }}</td>
              <td class="px-6 py-4">{{ formatDuration(route.optimization?.totalDuration) }}</td>
              <td class="px-6 py-4">{{ formatDate(route.createdAt) }}</td>
              <td class="px-6 py-4 flex gap-2">
                <button @click.stop="viewRoute(route)" class="text-gray-600 hover:text-gray-900">👁️</button>
                <button @click.stop="duplicateRoute(route)" class="text-green-600 hover:text-green-900">📋</button>
                <button @click.stop="deleteRoute(route)" class="text-red-600 hover:text-red-900">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 🌍 Mapa Leaflet -->
    <div
      v-if="showRouteMap"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl max-w-5xl w-full overflow-hidden shadow-xl">
        <div class="flex justify-between items-center border-b border-gray-200 p-4">
          <h3 class="text-lg font-semibold text-gray-900">
            🗺️ Ruta #{{ activeRoute?._id?.slice(-6).toUpperCase() }}
          </h3>
          <button @click="showRouteMap = false" class="text-gray-500 hover:text-gray-700">✖</button>
        </div>

        <div class="p-4">
          <LMap
            v-if="activeRoute && isValidCoord(activeRoute.startLocation)"
            style="height: 500px; width: 100%"
            :zoom="13"
            :center="[mapCenter.latitude, mapCenter.longitude]"
          >
            <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <!-- Inicio -->
            <LMarker
              v-if="isValidCoord(activeRoute.startLocation)"
              :lat-lng="[activeRoute.startLocation.latitude, activeRoute.startLocation.longitude]"
            >
              <LPopup>Inicio 🏭</LPopup>
            </LMarker>

            <!-- Entregas -->
            <LMarker
              v-for="(item, i) in activeRoute.orders || []"
              :key="i"
              v-if="item?.order?.location && isValidCoord(item.order.location)"
              :lat-lng="[item.order.location.latitude, item.order.location.longitude]"
            >
              <LTooltip permanent>{{ i + 1 }}</LTooltip>
              <LPopup>Entrega #{{ i + 1 }}</LPopup>
            </LMarker>

            <!-- Fin -->
            <LMarker
              v-if="isValidCoord(activeRoute.endLocation)"
              :lat-lng="[activeRoute.endLocation.latitude, activeRoute.endLocation.longitude]"
            >
              <LPopup>Destino 🏠</LPopup>
            </LMarker>

            <!-- Polyline -->
            <LPolyline
              v-if="polylineCoords.length > 1"
              :lat-lngs="polylineCoords.filter((p) => isValidCoord(p))"
              color="#1E88E5"
              :weight="4"
              :opacity="0.8"
            />
          </LMap>

          <div
            v-else
            class="text-center text-gray-600 py-20 border border-dashed border-gray-300 rounded-lg"
          >
            <div class="text-6xl mb-2">📭</div>
            <p class="text-lg font-semibold">No hay coordenadas válidas para mostrar el mapa</p>
            <p class="text-sm text-gray-500">Verifica que la ruta tenga inicio, fin y entregas con ubicaciones.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../services/api'
import { LMap, LTileLayer, LMarker, LPopup, LTooltip, LPolyline } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import polyline from '@mapbox/polyline'

// State
const routes = ref([])
const drivers = ref([])
const loading = ref(false)
const filters = ref({ status: '', driverId: '', startDate: '', endDate: '' })
const pagination = ref({ current: 1, total: 1, limit: 20 })
const selectedRoutes = ref([])
const showRouteMap = ref(false)
const showRouteOptimizer = ref(false)
const activeRoute = ref(null)
const polylineCoords = ref([])
const mapCenter = ref({ latitude: -33.45, longitude: -70.65 })

const routeStats = ref({ totalRoutes: 0, inProgressRoutes: 0, completedRoutes: 0, completionRate: 0 })
const isAllSelected = computed(() => routes.value.length > 0 && selectedRoutes.value.length === routes.value.length)
const statCards = computed(() => [
  { icon: '🛣️', label: 'Rutas Totales', value: routeStats.value.totalRoutes },
  { icon: '🚀', label: 'En Progreso', value: routeStats.value.inProgressRoutes },
  { icon: '✅', label: 'Completadas', value: routeStats.value.completedRoutes },
  { icon: '📊', label: 'Tasa de Éxito', value: `${routeStats.value.completionRate}%` }
])

// --- Utilidades ---
const isValidCoord = (loc) => {
  if (!loc) return false
  const lat = Number(loc.latitude)
  const lng = Number(loc.longitude)
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// --- Métodos principales ---
const loadRoutes = async () => {
  loading.value = true
  try {
    const response = await apiService.routes.getAll({ ...filters.value, page: pagination.value.current })
    routes.value = response.data.data.routes
    pagination.value = response.data.data.pagination
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadDrivers = async () => {
  try {
    const response = await apiService.drivers.getAll()
    drivers.value = response.data.data || []
  } catch (e) {
    console.error(e)
  }
}

const viewRoute = (route) => {
  activeRoute.value = route
  showRouteMap.value = true

  if (route.optimization?.overview_polyline) {
    polylineCoords.value = polyline
      .decode(route.optimization.overview_polyline)
      .map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
  } else {
    polylineCoords.value = []
  }

  mapCenter.value = isValidCoord(route.startLocation)
    ? route.startLocation
    : { latitude: -33.45, longitude: -70.65 }
}

// --- Formateadores ---
const getStatusText = (status) => ({
  draft: 'Borrador',
  assigned: 'Asignada',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada'
}[status] || status)

const getRouteProgress = (route) => {
  if (!route.orders?.length) return 0
  const completed = route.orders.filter(o => o.deliveryStatus === 'delivered').length
  return Math.round((completed / route.orders.length) * 100)
}

const formatDistance = (m) => !m ? '-' : `${(m / 1000).toFixed(1)} km`
const formatDuration = (s) => !s ? '-' : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
const formatDate = (d) => new Date(d).toLocaleDateString('es-CL')

// --- Otras funciones ---
const toggleSelectAll = () => selectedRoutes.value = isAllSelected.value ? [] : routes.value.map(r => r._id)
const bulkAssignDriver = () => alert(`Asignar ${selectedRoutes.value.length} rutas (pendiente)`)
const refreshRoutes = () => loadRoutes()
const applyFilters = () => loadRoutes()

onMounted(() => {
  loadRoutes()
  loadDrivers()
})
</script>
