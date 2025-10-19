<!-- RouteManager.vue - Con Leaflet + OSRM (sin Google Maps) -->

<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header igual que antes... -->
    
    <!-- Modal del mapa con Leaflet -->
    <div
      v-if="showRouteMap"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl max-w-6xl w-full overflow-hidden shadow-xl">
        <div class="flex justify-between items-center border-b border-gray-200 p-4">
          <h3 class="text-lg font-semibold text-gray-900">
            🗺️ Ruta #{{ activeRoute?._id?.slice(-6).toUpperCase() }}
          </h3>
          <div class="flex items-center gap-4">
            <!-- Información de distancia -->
            <div v-if="routeInfo.distance" class="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
              📏 {{ routeInfo.distance }} • ⏱️ {{ routeInfo.duration }}
            </div>
            <button @click="showRouteMap = false" class="text-gray-500 hover:text-gray-700">
              ✖
            </button>
          </div>
        </div>

        <div class="flex h-[600px]">
          <!-- Mapa con Leaflet -->
          <div class="flex-1">
            <div 
              ref="mapContainer" 
              id="route-map" 
              style="width: 100%; height: 100%"
            ></div>
          </div>

          <!-- Panel lateral con direcciones -->
          <div class="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
            <div class="p-4">
              <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🧭 Información de la Ruta
              </h4>
              
              <!-- Información general -->
              <div v-if="routeInfo.distance" class="bg-white rounded-lg p-3 mb-4 border border-gray-200">
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span class="text-gray-500">Distancia:</span>
                    <div class="font-semibold text-blue-600">{{ routeInfo.distance }}</div>
                  </div>
                  <div>
                    <span class="text-gray-500">Duración:</span>
                    <div class="font-semibold text-green-600">{{ routeInfo.duration }}</div>
                  </div>
                  <div>
                    <span class="text-gray-500">Paradas:</span>
                    <div class="font-semibold">{{ (activeRoute?.orders || []).length }}</div>
                  </div>
                  <div>
                    <span class="text-gray-500">Algoritmo:</span>
                    <div class="font-semibold capitalize">{{ activeRoute?.optimization?.algorithm || 'N/A' }}</div>
                  </div>
                </div>
              </div>

              <!-- Lista de paradas -->
              <div v-if="activeRoute?.orders?.length" class="space-y-2">
                <h5 class="font-medium text-gray-700 mb-2">📋 Secuencia de Entregas</h5>
                <div 
                  v-for="(orderItem, index) in activeRoute.orders" 
                  :key="index"
                  class="bg-white rounded-lg p-3 border border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer"
                  @click="focusOnStop(index)"
                >
                  <div class="flex items-start gap-3">
                    <div class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {{ orderItem.sequenceNumber || index + 1 }}
                    </div>
                    <div class="flex-1">
                      <div class="text-sm font-medium text-gray-900">
                        {{ orderItem.order?.customer_name || 'Cliente' }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        {{ orderItem.order?.shipping_address || 'Sin dirección' }}
                      </div>
                      <div class="text-xs text-green-600 mt-1">
                        {{ orderItem.order?.shipping_commune || '' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Loading state -->
              <div v-if="loadingRouteDetails" class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p class="text-gray-500 mt-2">Cargando detalles...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue'
import { apiService } from '../services/api'
import { useToast } from 'vue-toastification'
// Importar Leaflet
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default {
  name: 'RouteManager',
  setup() {
    const toast = useToast()

    // Estado
    const loading = ref(false)
    const routes = ref([])
    const routeStats = ref({
      totalRoutes: 0,
      inProgressRoutes: 0, 
      completedRoutes: 0,
      completionRate: 0
    })

    // Modal y mapa
    const showRouteMap = ref(false)
    const activeRoute = ref(null)
    const mapContainer = ref(null)
    const leafletMap = ref(null)
    const loadingRouteDetails = ref(false)

    // Datos de ruta
    const routeInfo = ref({
      distance: '',
      duration: '',
      totalDistanceKm: 0,
      totalDurationMinutes: 0
    })

    // ==================== FUNCIONES DE MAPA ====================

    // Inicializar mapa con Leaflet
    const initializeMap = () => {
      if (!mapContainer.value) return

      // Crear mapa centrado en Santiago
      leafletMap.value = L.map('route-map').setView([-33.4489, -70.6693], 12)

      // Agregar tiles de OpenStreetMap (GRATIS)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(leafletMap.value)

      console.log('✅ Mapa Leaflet inicializado')
    }

    // Mostrar ruta en el mapa
    const displayRouteOnMap = async (route) => {
      if (!leafletMap.value || !route) return

      try {
        console.log('🗺️ Mostrando ruta en Leaflet...')

        // Limpiar mapa
        leafletMap.value.eachLayer((layer) => {
          if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            leafletMap.value.removeLayer(layer)
          }
        })

        const bounds = L.latLngBounds([])

        // 1. Agregar marcador de inicio (verde)
        if (route.startLocation) {
          const startIcon = L.divIcon({
            html: '<div style="background: green; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">🏭</div>',
            className: 'custom-marker',
            iconSize: [30, 30]
          })

          const startMarker = L.marker([route.startLocation.latitude, route.startLocation.longitude], { icon: startIcon })
            .addTo(leafletMap.value)
            .bindPopup('📍 Inicio: ' + (route.startLocation.address || 'Punto de inicio'))

          bounds.extend([route.startLocation.latitude, route.startLocation.longitude])
        }

        // 2. Agregar marcadores de entregas (azules numerados)
        if (route.orders) {
          route.orders.forEach((orderItem, index) => {
            if (orderItem.order?.location) {
              const deliveryIcon = L.divIcon({
                html: `<div style="background: blue; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${orderItem.sequenceNumber || index + 1}</div>`,
                className: 'custom-marker',
                iconSize: [30, 30]
              })

              const deliveryMarker = L.marker([orderItem.order.location.latitude, orderItem.order.location.longitude], { icon: deliveryIcon })
                .addTo(leafletMap.value)
                .bindPopup(`📦 Parada ${orderItem.sequenceNumber || index + 1}: ${orderItem.order.customer_name || 'Cliente'}<br>${orderItem.order.shipping_address || ''}`)

              bounds.extend([orderItem.order.location.latitude, orderItem.order.location.longitude])
            }
          })
        }

        // 3. Agregar marcador de fin (rojo)
        if (route.endLocation) {
          const endIcon = L.divIcon({
            html: '<div style="background: red; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">🏠</div>',
            className: 'custom-marker',
            iconSize: [30, 30]
          })

          const endMarker = L.marker([route.endLocation.latitude, route.endLocation.longitude], { icon: endIcon })
            .addTo(leafletMap.value)
            .bindPopup('🏁 Final: ' + (route.endLocation.address || 'Punto final'))

          bounds.extend([route.endLocation.latitude, route.endLocation.longitude])
        }

        // 4. Dibujar línea de ruta (si existe polyline del backend)
        if (route.optimization?.overview_polyline) {
          console.log('✅ Dibujando polyline optimizada por Python')
          
          // Decodificar polyline de Google (tu backend la tiene)
          const decodedPoints = decodePolyline(route.optimization.overview_polyline)
          
          // Crear polyline en Leaflet
          const polyline = L.polyline(decodedPoints, {
            color: '#1E88E5',
            weight: 5,
            opacity: 0.8
          }).addTo(leafletMap.value)

          // Agregar puntos de la polyline a los bounds
          decodedPoints.forEach(point => bounds.extend(point))
        } else {
          console.log('⚠️ No hay polyline, dibujando líneas directas')
          
          // Dibujar líneas directas entre puntos
          const points = []
          
          if (route.startLocation) {
            points.push([route.startLocation.latitude, route.startLocation.longitude])
          }
          
          if (route.orders) {
            route.orders
              .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
              .forEach(orderItem => {
                if (orderItem.order?.location) {
                  points.push([orderItem.order.location.latitude, orderItem.order.location.longitude])
                }
              })
          }
          
          if (route.endLocation) {
            points.push([route.endLocation.latitude, route.endLocation.longitude])
          }

          if (points.length > 1) {
            L.polyline(points, {
              color: '#FF6B6B',
              weight: 3,
              opacity: 0.7,
              dashArray: '10, 10'
            }).addTo(leafletMap.value)
          }
        }

        // 5. Ajustar vista del mapa
        if (bounds.isValid()) {
          leafletMap.value.fitBounds(bounds, { padding: [20, 20] })
        }

        console.log('✅ Ruta mostrada en Leaflet')

      } catch (error) {
        console.error('❌ Error mostrando ruta:', error)
      }
    }

    // Función para decodificar polyline de Google
    const decodePolyline = (encoded) => {
      const points = []
      let index = 0
      const len = encoded.length
      let lat = 0
      let lng = 0

      while (index < len) {
        let b, shift = 0, result = 0
        do {
          b = encoded.charCodeAt(index++) - 63
          result |= (b & 0x1f) << shift
          shift += 5
        } while (b >= 0x20)
        
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lat += dlat

        shift = 0
        result = 0
        do {
          b = encoded.charCodeAt(index++) - 63
          result |= (b & 0x1f) << shift
          shift += 5
        } while (b >= 0x20)
        
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lng += dlng

        points.push([lat / 1e5, lng / 1e5])
      }

      return points
    }

    // Enfocar en una parada específica
    const focusOnStop = (stopIndex) => {
      if (!leafletMap.value || !activeRoute.value?.orders?.[stopIndex]) return

      const orderItem = activeRoute.value.orders[stopIndex]
      if (orderItem.order?.location) {
        leafletMap.value.setView([
          orderItem.order.location.latitude,
          orderItem.order.location.longitude
        ], 16)

        console.log('🎯 Enfocando en parada:', stopIndex + 1)
      }
    }

    // ==================== FUNCIONES PRINCIPALES ====================

    // Ver ruta (usando solo datos del backend)
    const viewRoute = async (route) => {
      try {
        activeRoute.value = route
        showRouteMap.value = true
        loadingRouteDetails.value = true
        
        // Reset
        routeInfo.value = { distance: '', duration: '', totalDistanceKm: 0, totalDurationMinutes: 0 }

        console.log('🗺️ Cargando ruta optimizada:', route._id)

        // Obtener datos completos desde backend
        const response = await apiService.routes.getById(route._id)
        const fullRoute = response.data.data
        
        activeRoute.value = fullRoute
        
        // Usar información calculada por Python
        if (fullRoute.routeInfo) {
          routeInfo.value = fullRoute.routeInfo
          console.log('✅ Información de Python OR-Tools:', routeInfo.value)
        }

        await nextTick()
        await new Promise((r) => setTimeout(r, 300))
        
        // Inicializar mapa si no existe
        if (!leafletMap.value) {
          initializeMap()
          await new Promise((r) => setTimeout(r, 100))
        }
        
        // Mostrar ruta en Leaflet
        await displayRouteOnMap(fullRoute)
        
      } catch (error) {
        console.error('❌ Error mostrando ruta:', error)
        toast.error('Error al cargar la ruta: ' + error.message)
      } finally {
        loadingRouteDetails.value = false
      }
    }

    // Resto de funciones igual que antes...
    const loadRoutes = async () => {
      loading.value = true
      try {
        const response = await apiService.routes.getAll({ page: 1, limit: 50 })
        routes.value = response.data.data.routes || response.data.routes || []
        console.log('✅ Rutas cargadas:', routes.value.length)
        await loadRouteStats()
      } catch (error) {
        console.error('❌ Error cargando rutas:', error)
        toast.error('Error al cargar las rutas')
        routes.value = []
      } finally {
        loading.value = false
      }
    }

    const loadRouteStats = async () => {
      try {
        const response = await apiService.routes.getStats()
        const stats = response.data.data
        routeStats.value = {
          totalRoutes: stats.totalRoutes,
          inProgressRoutes: stats.summary.inProgressRoutes,
          completedRoutes: stats.summary.completedRoutes,
          completionRate: stats.summary.completionRate
        }
      } catch (error) {
        console.error('❌ Error cargando estadísticas:', error)
      }
    }

    // ==================== LIFECYCLE ====================
    onMounted(async () => {
      await loadRoutes()
    })

    // ==================== RETURN ====================
    return {
      // Estado
      loading,
      routes,
      routeStats,
      
      // Modal y mapa
      showRouteMap,
      activeRoute,
      mapContainer,
      loadingRouteDetails,
      routeInfo,
      
      // Funciones
      loadRoutes,
      viewRoute,
      focusOnStop,
      
      // Funciones auxiliares
      getDriverInitials: (driver) => {
        if (!driver) return '??'
        const name = driver.full_name || driver.name || 'Conductor'
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
      },
      
      getStatusBadgeClass: (status) => {
        const classes = {
          'draft': 'bg-gray-100 text-gray-800',
          'assigned': 'bg-blue-100 text-blue-800',
          'in_progress': 'bg-yellow-100 text-yellow-800',
          'completed': 'bg-green-100 text-green-800',
          'cancelled': 'bg-red-100 text-red-800'
        }
        return classes[status] || 'bg-gray-100 text-gray-800'
      },
      
      getStatusText: (status) => {
        const texts = {
          'draft': 'Borrador',
          'assigned': 'Asignada',
          'in_progress': 'En Progreso',
          'completed': 'Completada', 
          'cancelled': 'Cancelada'
        }
        return texts[status] || 'Sin Estado'
      },
      
      formatDate: (dateString) => {
        if (!dateString) return 'Sin fecha'
        return new Date(dateString).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }
  }
}
</script>

<style scoped>
/* Estilos específicos para Leaflet */
.custom-marker {
  background: transparent !important;
  border: none !important;
}

#route-map {
  z-index: 1;
}
</style>