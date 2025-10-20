<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-900">Mapa de Ruta</h2>
      <button 
        @click="centerOnCurrentLocation"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
      >
        <span>📍</span>
        <span>Mi Ubicación</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center h-96 bg-white rounded-xl shadow-sm">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Cargando mapa...</p>
      </div>
    </div>

    <!-- Sin ruta -->
    <div v-else-if="!activeRoute" class="flex items-center justify-center h-96 bg-white rounded-xl shadow-sm">
      <div class="text-center">
        <div class="text-6xl mb-4">🗺️</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Sin ruta activa</h3>
        <p class="text-gray-600">No hay una ruta asignada para mostrar en el mapa.</p>
      </div>
    </div>

    <!-- Mapa principal -->
    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
      <!-- Info de la ruta -->
      <div class="p-4 border-b border-gray-200 bg-gray-50">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-semibold text-gray-900">
              Ruta #{{ activeRoute._id.slice(-6).toUpperCase() }}
            </h3>
            <p class="text-sm text-gray-600">
              {{ activeRoute.orders?.length || 0 }} paradas programadas
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">
              {{ formatDistance(activeRoute.optimization?.totalDistance) }}
            </p>
            <p class="text-xs text-gray-500">
              {{ formatDuration(activeRoute.optimization?.totalDuration) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Contenedor del mapa -->
      <div class="relative">
        <div id="driverRouteMap" class="w-full h-96 md:h-[500px]"></div>
        
        <!-- Loading overlay -->
        <div v-if="!mapInstance" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
          <div class="text-center">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p class="text-sm text-gray-600">Inicializando mapa...</p>
          </div>
        </div>

        <!-- Controles del mapa -->
        <div class="absolute top-4 right-4 space-y-2">
          <button 
            @click="fitBounds"
            class="bg-white text-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
            title="Ver toda la ruta"
          >
            🗺️
          </button>
          <button 
            @click="centerOnCurrentLocation"
            class="bg-white text-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
            title="Mi ubicación"
          >
            📍
          </button>
        </div>
      </div>

      <!-- Lista de paradas -->
      <div class="p-4 border-t border-gray-200 bg-gray-50">
        <h4 class="font-semibold text-gray-900 mb-3">Paradas de la ruta:</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div 
            v-for="(stop, idx) in activeRoute.orders" 
            :key="stop._id"
            class="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            @click="centerOnStop(stop, idx)"
          >
            <span 
              class="w-8 h-8 flex items-center justify-center rounded-full text-white font-bold text-sm flex-shrink-0"
              :style="{ backgroundColor: getMarkerColor(stop.deliveryStatus) }"
            >
              {{ idx + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 truncate">
                {{ stop.order?.customer_name || 'Cliente' }}
              </p>
              <p class="text-xs text-gray-500 truncate">
                {{ stop.order?.shipping_address || 'Sin dirección' }}
              </p>
              <span 
                class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusBadgeClass(stop.deliveryStatus)"
              >
                {{ getStatusText(stop.deliveryStatus) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones rápidas -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl mb-2">🚀</div>
        <h4 class="font-semibold text-gray-900 mb-1">Siguiente Parada</h4>
        <p class="text-sm text-gray-600 mb-3">
          {{ nextStop?.order?.customer_name || 'Todas completadas' }}
        </p>
        <button 
          v-if="nextStop"
          @click="navigateToNext"
          class="w-full bg-green-600 text-white px-3 py-2 rounded font-medium hover:bg-green-700 transition-colors"
        >
          Navegar
        </button>
      </div>
      
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl mb-2">📦</div>
        <h4 class="font-semibold text-gray-900 mb-1">Progreso</h4>
        <p class="text-sm text-gray-600 mb-3">
          {{ completedCount }}/{{ totalCount }} entregas
        </p>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl mb-2">⏱️</div>
        <h4 class="font-semibold text-gray-900 mb-1">Tiempo</h4>
        <p class="text-sm text-gray-600 mb-3">
          {{ formatDuration(activeRoute.optimization?.totalDuration) }}
        </p>
        <p class="text-xs text-gray-500">Tiempo estimado</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'

// Props
const props = defineProps({
  activeRoute: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Estado del mapa
const mapInstance = ref(null)
const currentLocationMarker = ref(null)
const routeMarkers = ref([])

// Computed properties
const nextStop = computed(() => {
  if (!props.activeRoute?.orders) return null
  return props.activeRoute.orders
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .find(o => o.deliveryStatus === 'pending' || o.deliveryStatus === 'in_progress')
})

const completedCount = computed(() => {
  return props.activeRoute?.orders?.filter(o => o.deliveryStatus === 'delivered').length || 0
})

const totalCount = computed(() => {
  return props.activeRoute?.orders?.length || 0
})

const progressPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

// Métodos del mapa
const getGoogleMapsApiKey = () => {
  return (
    window.env?.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
  )
}

const loadGoogleMaps = async () => {
  if (typeof window.google !== "undefined" && window.google.maps) {
    return window.google.maps
  }

  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) {
    console.error("🚫 No se encontró Google Maps API Key")
    throw new Error("Missing Google Maps API key")
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,marker`
    script.async = true
    script.defer = true
    script.onload = () => {
      console.log("✅ Google Maps API cargada correctamente")
      resolve(window.google.maps)
    }
    script.onerror = (e) => {
      console.error("❌ Error al cargar Google Maps:", e)
      reject(e)
    }
    document.head.appendChild(script)
  })
}

const initializeMap = async () => {
  if (!props.activeRoute) return

  const mapContainer = document.getElementById("driverRouteMap")
  if (!mapContainer) return

  try {
    const maps = await loadGoogleMaps()
    const { geometry } = maps

    // Crear el mapa
    const map = new maps.Map(mapContainer, {
      center: { 
        lat: props.activeRoute.startLocation.latitude, 
        lng: props.activeRoute.startLocation.longitude 
      },
      zoom: 12,
      mapId: "ENVIGO_DRIVER_MAP"
    })
    mapInstance.value = map

    // Dibujar la ruta si existe polyline
    if (props.activeRoute.optimization?.overview_polyline) {
      const decodedPath = geometry.encoding.decodePath(props.activeRoute.optimization.overview_polyline)
      
      const routePolyline = new maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: "#2563eb",
        strokeOpacity: 0.8,
        strokeWeight: 5,
      })
      routePolyline.setMap(map)
    }

    // Agregar marcadores
    addRouteMarkers(maps)
    
    // Ajustar vista
    fitBounds()

  } catch (error) {
    console.error("❌ Error inicializando mapa:", error)
    mapContainer.innerHTML = "❌ Error al cargar mapa."
  }
}

const addRouteMarkers = (maps) => {
  if (!props.activeRoute || !mapInstance.value) return

  // Limpiar marcadores existentes
  routeMarkers.value.forEach(marker => marker.setMap(null))
  routeMarkers.value = []

  // Marcador de inicio
  const startMarker = new maps.marker.AdvancedMarkerElement({
    map: mapInstance.value,
    position: {
      lat: props.activeRoute.startLocation.latitude,
      lng: props.activeRoute.startLocation.longitude
    },
    title: "Inicio: " + props.activeRoute.startLocation.address,
    content: buildCustomMarker("🏢", "#4f46e5")
  })
  routeMarkers.value.push(startMarker)

  // Marcadores de paradas
  props.activeRoute.orders.forEach((order, idx) => {
    if (order.order?.location?.latitude && order.order?.location?.longitude) {
      const marker = new maps.marker.AdvancedMarkerElement({
        map: mapInstance.value,
        position: {
          lat: order.order.location.latitude,
          lng: order.order.location.longitude
        },
        title: `Parada ${idx + 1}: ${order.order.customer_name || 'Cliente'}`,
        content: buildCustomMarker(
          order.sequenceNumber.toString(), 
          getMarkerColor(order.deliveryStatus)
        )
      })
      routeMarkers.value.push(marker)
    }
  })

  // Marcador de fin
  const endMarker = new maps.marker.AdvancedMarkerElement({
    map: mapInstance.value,
    position: {
      lat: props.activeRoute.endLocation.latitude,
      lng: props.activeRoute.endLocation.longitude
    },
    title: "Fin: " + props.activeRoute.endLocation.address,
    content: buildCustomMarker("🏠", "#059669")
  })
  routeMarkers.value.push(endMarker)
}

const buildCustomMarker = (label, color = "#2563eb") => {
  const div = document.createElement("div")
  div.style.width = "32px"
  div.style.height = "32px"
  div.style.borderRadius = "50%"
  div.style.backgroundColor = color
  div.style.color = "white"
  div.style.display = "flex"
  div.style.alignItems = "center"
  div.style.justifyContent = "center"
  div.style.fontWeight = "bold"
  div.style.fontSize = "12px"
  div.style.border = "2px solid white"
  div.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)"
  div.textContent = label
  return div
}

const fitBounds = () => {
  if (!mapInstance.value || !props.activeRoute) return

  const bounds = new google.maps.LatLngBounds()
  
  // Agregar ubicación de inicio
  bounds.extend({
    lat: props.activeRoute.startLocation.latitude,
    lng: props.activeRoute.startLocation.longitude
  })
  
  // Agregar todas las paradas
  props.activeRoute.orders.forEach(order => {
    if (order.order?.location?.latitude && order.order?.location?.longitude) {
      bounds.extend({
        lat: order.order.location.latitude,
        lng: order.order.location.longitude
      })
    }
  })
  
  // Agregar ubicación de fin
  bounds.extend({
    lat: props.activeRoute.endLocation.latitude,
    lng: props.activeRoute.endLocation.longitude
  })
  
  mapInstance.value.fitBounds(bounds, 50)
}

const centerOnStop = (stop, index) => {
  if (!mapInstance.value || !stop.order?.location) return
  
  mapInstance.value.setCenter({
    lat: stop.order.location.latitude,
    lng: stop.order.location.longitude
  })
  mapInstance.value.setZoom(16)
}

const centerOnCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('Tu navegador no soporta geolocalización')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const currentPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      if (mapInstance.value) {
        mapInstance.value.setCenter(currentPos)
        mapInstance.value.setZoom(16)

        // Actualizar marcador de ubicación actual
        if (currentLocationMarker.value) {
          currentLocationMarker.value.setMap(null)
        }

        currentLocationMarker.value = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstance.value,
          position: currentPos,
          title: "Mi ubicación actual",
          content: buildCustomMarker("📍", "#ef4444")
        })
      }
    },
    (error) => {
      console.error('Error obteniendo ubicación:', error)
      alert('No se pudo obtener tu ubicación')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  )
}

const navigateToNext = () => {
  if (!nextStop.value?.order?.location) return
  
  const { latitude, longitude } = nextStop.value.order.location
  
  // Detectar plataforma
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  
  let mapsUrl
  
  if (isIOS) {
    mapsUrl = `maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`
  } else if (isAndroid) {
    mapsUrl = `google.navigation:q=${latitude},${longitude}`
  } else {
    mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
  }
  
  window.open(mapsUrl, '_blank')
}

// Funciones auxiliares
const getMarkerColor = (status) => {
  const colorMap = {
    'pending': '#6b7280',
    'in_progress': '#f59e0b',
    'delivered': '#16a34a',
    'failed': '#ef4444'
  }
  return colorMap[status] || '#6b7280'
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': 'Pendiente',
    'in_progress': 'En progreso',
    'delivered': 'Entregado',
    'failed': 'Fallido'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status) => {
  const classMap = {
    'pending': 'bg-gray-100 text-gray-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'delivered': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

const formatDistance = (meters) => {
  if (!meters) return '0 km'
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`
}

const formatDuration = (seconds) => {
  if (!seconds) return '0 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}

// Watchers
watch(() => props.activeRoute, (newRoute) => {
  if (newRoute) {
    nextTick(() => {
      initializeMap()
    })
  }
})

// Lifecycle
onMounted(() => {
  if (props.activeRoute) {
    initializeMap()
  }
})
</script>