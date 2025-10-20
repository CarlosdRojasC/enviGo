<template>
  <div class="space-y-6">
    <!-- Sin rutas asignadas -->
    <div v-if="!activeRoute && !isLoading" class="text-center py-12">
      <div class="max-w-md mx-auto">
        <div class="text-6xl mb-4">🚚</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Sin rutas asignadas</h3>
        <p class="text-gray-600 mb-6">Esperando que el administrador te asigne una ruta...</p>
        <button 
          @click="$emit('refresh')"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          🔄 Verificar rutas
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Cargando ruta activa...</span>
      </div>
    </div>

    <!-- Ruta activa -->
    <div v-if="activeRoute" class="space-y-6">
      <!-- Estado de la ruta -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            Ruta #{{ activeRoute._id.slice(-6).toUpperCase() }}
          </h3>
          <span 
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            :class="getStatusBadgeClass(activeRoute.status)"
          >
            {{ getStatusText(activeRoute.status) }}
          </span>
        </div>

        <!-- Información básica -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ activeRoute.orders?.length || 0 }}</div>
            <div class="text-sm text-gray-600">Entregas totales</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ completedCount }}</div>
            <div class="text-sm text-gray-600">Completadas</div>
          </div>
        </div>

        <!-- Progreso -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-600">Progreso de entregas</span>
            <span class="text-sm font-medium">{{ routeProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${routeProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- Acciones principales -->
        <div class="space-y-3">
          <button 
            v-if="activeRoute.status === 'assigned'"
            @click="$emit('start-route')"
            class="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>🚀</span>
            <span>Iniciar Ruta</span>
          </button>
          
          <div v-if="activeRoute.status === 'in_progress'" class="grid grid-cols-2 gap-3">
            <button 
              @click="openNextDelivery"
              :disabled="!hasNextDelivery"
              class="bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>📦</span>
              <span>Siguiente</span>
            </button>
            
            <button 
              @click="$emit('open-map')"
              class="bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>🗺️</span>
              <span>Ver Mapa</span>
            </button>
          </div>

          <div v-if="activeRoute.status === 'completed'" class="text-center py-4">
            <div class="text-4xl mb-2">🎉</div>
            <h4 class="text-lg font-semibold text-green-600 mb-1">¡Ruta Completada!</h4>
            <p class="text-gray-600">Todas las entregas han sido realizadas exitosamente.</p>
          </div>
        </div>
      </div>

      <!-- Próxima entrega (si está en progreso) -->
      <div v-if="activeRoute.status === 'in_progress' && nextDelivery" class="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
        <h4 class="text-lg font-semibold text-orange-800 mb-3 flex items-center space-x-2">
          <span>🎯</span>
          <span>Próxima Entrega</span>
        </h4>
        
        <div class="space-y-3">
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold">
              {{ nextDelivery.sequenceNumber }}
            </div>
            <div class="flex-1">
              <h5 class="font-medium text-gray-900">{{ nextDelivery.order.customer_name || 'Cliente' }}</h5>
              <p class="text-sm text-gray-600">{{ nextDelivery.order.shipping_address || 'Sin dirección' }}</p>
              <p class="text-xs text-gray-500 mt-1">
                Pedido #{{ nextDelivery.order.order_number || nextDelivery.order._id.slice(-6) }}
              </p>
            </div>
          </div>
          
          <div class="flex space-x-3">
            <button 
              v-if="nextDelivery.deliveryStatus === 'pending'"
              @click="$emit('mark-in-progress', nextDelivery)"
              class="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              🚀 Iniciar Entrega
            </button>
            
            <button 
              v-if="nextDelivery.deliveryStatus === 'in_progress'"
              @click="$emit('open-delivery', nextDelivery)"
              class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              ✅ Confirmar Entrega
            </button>
            
            <button 
              @click="openMapsApp"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              📍 Navegar
            </button>
          </div>
        </div>
      </div>

      <!-- Estadísticas de la ruta -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg p-4 text-center shadow-sm">
          <div class="text-2xl font-bold text-blue-600">{{ formatDistance(activeRoute.optimization?.totalDistance) }}</div>
          <div class="text-sm text-gray-600">Distancia total</div>
        </div>
        <div class="bg-white rounded-lg p-4 text-center shadow-sm">
          <div class="text-2xl font-bold text-green-600">{{ formatDuration(activeRoute.optimization?.totalDuration) }}</div>
          <div class="text-sm text-gray-600">Tiempo estimado</div>
        </div>
        <div class="bg-white rounded-lg p-4 text-center shadow-sm">
          <div class="text-2xl font-bold text-orange-600">{{ completedCount }}</div>
          <div class="text-sm text-gray-600">Completadas</div>
        </div>
        <div class="bg-white rounded-lg p-4 text-center shadow-sm">
          <div class="text-2xl font-bold text-gray-600">{{ pendingCount }}</div>
          <div class="text-sm text-gray-600">Pendientes</div>
        </div>
      </div>

      <!-- Resumen de entregas recientes -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h4 class="text-lg font-semibold text-gray-900 mb-4">Últimas Entregas</h4>
        
        <div v-if="recentDeliveries.length === 0" class="text-center py-8 text-gray-500">
          <div class="text-3xl mb-2">📦</div>
          <p>Aún no has realizado entregas en esta ruta</p>
        </div>
        
        <div v-else class="space-y-3">
          <div 
            v-for="delivery in recentDeliveries.slice(0, 3)" 
            :key="delivery.order._id"
            class="flex items-center space-x-3 p-3 bg-green-50 rounded-lg"
          >
            <div class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
              ✓
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ delivery.order.customer_name || 'Cliente' }}</p>
              <p class="text-sm text-gray-600">{{ delivery.order.shipping_address || 'Sin dirección' }}</p>
            </div>
            <div class="text-xs text-gray-500">
              {{ formatTime(delivery.deliveredAt) }}
            </div>
          </div>
          
          <button 
            v-if="recentDeliveries.length > 3"
            @click="$emit('view-all-deliveries')"
            class="w-full text-center py-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todas las entregas ({{ recentDeliveries.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

// Emits
const emit = defineEmits([
  'start-route',
  'refresh',
  'open-delivery',
  'mark-in-progress',
  'open-map',
  'view-all-deliveries'
])

// Computed properties
const routeProgress = computed(() => {
  if (!props.activeRoute?.orders?.length) return 0
  const completed = props.activeRoute.orders.filter(o => o.deliveryStatus === 'delivered').length
  return Math.round((completed / props.activeRoute.orders.length) * 100)
})

const completedCount = computed(() => {
  return props.activeRoute?.orders?.filter(o => o.deliveryStatus === 'delivered').length || 0
})

const pendingCount = computed(() => {
  return props.activeRoute?.orders?.filter(o => o.deliveryStatus === 'pending').length || 0
})

const sortedOrders = computed(() => {
  if (!props.activeRoute?.orders) return []
  return [...props.activeRoute.orders].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
})

const nextDelivery = computed(() => {
  return sortedOrders.value.find(o => o.deliveryStatus === 'pending' || o.deliveryStatus === 'in_progress')
})

const hasNextDelivery = computed(() => {
  return !!nextDelivery.value
})

const recentDeliveries = computed(() => {
  return sortedOrders.value
    .filter(o => o.deliveryStatus === 'delivered')
    .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))
})

// Methods
const openNextDelivery = () => {
  if (nextDelivery.value) {
    emit('open-delivery', nextDelivery.value)
  }
}

const openMapsApp = () => {
  if (!nextDelivery.value?.order?.location) return
  
  showNavigationOptions(nextDelivery.value)
}

// Función para mostrar opciones de navegación
const showNavigationOptions = (orderItem) => {
  const { latitude, longitude } = orderItem.order.location
  const address = orderItem.order.shipping_address || ''
  const customerName = orderItem.order.customer_name || 'Cliente'
  
  // Crear modal de opciones
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
  modal.innerHTML = `
    <div class="bg-white rounded-xl max-w-sm w-full p-6">
      <div class="text-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Navegar a:</h3>
        <p class="text-sm font-medium text-gray-800">${customerName}</p>
        <p class="text-xs text-gray-600">${address}</p>
      </div>
      
      <div class="space-y-3">
        <button onclick="openNavigation('google', ${latitude}, ${longitude}, '${encodeURIComponent(address)}')" 
                class="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
          <span>🗺️</span>
          <span>Google Maps</span>
        </button>
        
        <button onclick="openNavigation('waze', ${latitude}, ${longitude}, '${encodeURIComponent(address)}')" 
                class="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2">
          <span>🚗</span>
          <span>Waze</span>
        </button>
        
        <button onclick="openNavigation('apple', ${latitude}, ${longitude}, '${encodeURIComponent(address)}')" 
                class="w-full bg-gray-800 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors flex items-center justify-center space-x-2">
          <span>🍎</span>
          <span>Apple Maps</span>
        </button>
        
        <button onclick="closeNavigationModal()" 
                class="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Función global para abrir navegación
  window.openNavigation = (app, lat, lng, addr) => {
    let url = ''
    
    switch (app) {
      case 'google':
        // Google Maps con dirección y coordenadas
        if (addr) {
          url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`
        } else {
          url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
        }
        break
        
      case 'waze':
        // Waze con coordenadas
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        break
        
      case 'apple':
        // Apple Maps con dirección
        if (addr) {
          url = `maps://maps.apple.com/?daddr=${encodeURIComponent(addr)}&dirflg=d`
        } else {
          url = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
        }
        break
    }
    
    if (url) {
      window.open(url, '_blank')
    }
    
    closeNavigationModal()
  }
  
  // Función global para cerrar modal
  window.closeNavigationModal = () => {
    modal.remove()
    delete window.openNavigation
    delete window.closeNavigationModal
  }
  
  // Cerrar al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeNavigationModal()
    }
  })
}

const getStatusText = (status) => {
  const statusMap = {
    'assigned': 'Asignada',
    'in_progress': 'En Progreso',
    'completed': 'Completada',
    'cancelled': 'Cancelada'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status) => {
  const classMap = {
    'assigned': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
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

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>