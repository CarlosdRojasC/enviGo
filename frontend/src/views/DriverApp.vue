<template>
  <div class="driver-app min-h-screen bg-gray-100">
    <!-- Header con navegación -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {{ driverInitials }}
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ driverName }}</h2>
              <p class="text-sm text-gray-500 flex items-center space-x-2">
                <span :class="connectionStatus === 'online' ? 'text-green-600' : 'text-red-600'">
                  {{ connectionStatus === 'online' ? '🟢 En línea' : '🔴 Sin conexión' }}
                </span>
              </p>
            </div>
          </div>
          
          <div class="flex items-center space-x-3">
            <button 
              @click="refreshData" 
              class="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              :disabled="isLoading"
            >
              <span v-if="isLoading">🔄</span>
              <span v-else>🔄</span>
            </button>
            
            <button 
              v-if="hasOfflineData"
              @click="syncOfflineData" 
              class="p-2 text-orange-500 hover:text-orange-700 rounded-full hover:bg-orange-50 transition-colors"
              :disabled="isSyncing"
            >
              <span v-if="isSyncing">🔄</span>
              <span v-else>⚠️</span>
            </button>

            <button 
              @click="currentView = 'settings'" 
              class="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            >
              ⚙️
            </button>

            <button 
              @click="logout" 
              class="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
            >
              🚪
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Navegación inferior (móvil first) -->
    <nav class="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10 md:relative md:border-t-0 md:border-b">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-around md:justify-start md:space-x-8">
          <button 
            @click="currentView = 'active-route'"
            :class="currentView === 'active-route' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-4 text-sm font-medium transition-colors rounded-lg"
          >
            <span class="text-xl mb-1">🚚</span>
            <span>Mi Ruta</span>
          </button>
          
          <button 
            @click="currentView = 'deliveries'"
            :class="currentView === 'deliveries' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-4 text-sm font-medium transition-colors rounded-lg"
          >
            <span class="text-xl mb-1">📦</span>
            <span>Entregas</span>
          </button>
          
          <button 
            @click="currentView = 'map'"
            :class="currentView === 'map' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-4 text-sm font-medium transition-colors rounded-lg"
            :disabled="!activeRoute"
          >
            <span class="text-xl mb-1">🗺️</span>
            <span>Mapa</span>
          </button>
          
          <button 
            @click="currentView = 'history'"
            :class="currentView === 'history' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-4 text-sm font-medium transition-colors rounded-lg"
          >
            <span class="text-xl mb-1">📚</span>
            <span>Historial</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Contenido principal -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
      <!-- Vista: Ruta Activa -->
      <ActiveRoute 
        v-if="currentView === 'active-route'"
        :active-route="activeRoute"
        :is-loading="isLoading"
        @start-route="startRoute"
        @refresh="refreshData"
        @open-delivery="openDeliveryProof"
        @mark-in-progress="markInProgress"
      />

      <!-- Vista: Lista de Entregas -->
      <DeliveriesList 
        v-if="currentView === 'deliveries'"
        :orders="sortedOrders"
        :is-loading="isLoading"
        @select-delivery="openDeliveryProof"
        @mark-in-progress="markInProgress"
      />

      <!-- Vista: Mapa -->
      <RouteMap 
        v-if="currentView === 'map'"
        :active-route="activeRoute"
        :is-loading="isLoading"
      />

      <!-- Vista: Historial -->
      <!-- <DeliveryHistory 
        v-if="currentView === 'history'"
        :driver-id="driverId"
      /> -->

      <!-- Vista: Configuración -->
      <!-- <DriverSettings 
        v-if="currentView === 'settings'"
        @logout="logout"
        @back="currentView = 'active-route'"
      /> -->
    </main>

    <!-- Modal de Prueba de Entrega -->
    <DeliveryProofModal 
      v-if="showDeliveryProof"
      :selected-order="selectedOrder"
      :is-submitting="isSubmitting"
      @close="closeDeliveryProof"
      @confirm="confirmDelivery"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '../services/api'

// Componentes
import ActiveRoute from '../driver/pages/ActiveRoute.vue'
import DeliveriesList from '../driver/pages/DeliveriesList.vue'
import RouteMap from '../driver/pages/RouteMap.vue'
import DeliveryHistory from '../components/driver/DeliveryHistory.vue'
import DriverSettings from '../components/driver/DriverSettings.vue'
import DeliveryProofModal from '../driver/pages/DeliveryProofModal.vue'

const router = useRouter()

// Estado principal
const currentView = ref('active-route')
const activeRoute = ref(null)
const isLoading = ref(false)
const connectionStatus = ref('online')
const showDeliveryProof = ref(false)
const selectedOrder = ref(null)
const isSyncing = ref(false)
const isSubmitting = ref(false)

// Datos del conductor
const driverId = ref(null)
const driverName = ref('Conductor')
const driverInitials = computed(() => {
  return driverName.value.split(' ').map(n => n[0]).join('').toUpperCase()
})

// Datos offline
const offlineUpdates = ref([])

// Computed properties
const sortedOrders = computed(() => {
  if (!activeRoute.value?.orders) return []
  return [...activeRoute.value.orders].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
})

const hasOfflineData = computed(() => {
  return offlineUpdates.value.length > 0
})

// Métodos principales
const refreshData = async () => {
  await checkForActiveRoute()
}

const checkForActiveRoute = async () => {
  isLoading.value = true
  try {
    console.log('🔍 Verificando ruta activa del conductor...')
    
    const response = await apiService.routes.getActiveRoute()
    console.log('📡 Respuesta del servidor:', response.data)
    
    if (response.data.success && response.data.data) {
      activeRoute.value = response.data.data
      driverName.value = activeRoute.value.driver?.full_name || activeRoute.value.driver?.name || 'Conductor'
      driverId.value = activeRoute.value.driver?._id
      
      console.log('✅ Ruta activa encontrada:', {
        routeId: activeRoute.value._id,
        status: activeRoute.value.status,
        ordersCount: activeRoute.value.orders?.length || 0,
        driverName: driverName.value
      })
    } else {
      console.log('ℹ️ No hay rutas activas asignadas')
      activeRoute.value = null
    }
  } catch (error) {
    console.error('❌ Error obteniendo ruta activa:', error)
    
    if (error.response?.status === 401) {
      alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
      logout()
      return
    }
    
    if (connectionStatus.value === 'online') {
      alert(`Error al obtener la ruta activa: ${error.message || 'Error desconocido'}`)
    }
  } finally {
    isLoading.value = false
  }
}

const startRoute = async () => {
  try {
    console.log('🚀 Iniciando ruta:', activeRoute.value._id)
    
    const response = await apiService.routes.startRoute(activeRoute.value._id)
    console.log('✅ Ruta iniciada:', response.data)
    
    await checkForActiveRoute()
    alert('¡Ruta iniciada! Puedes comenzar con las entregas.')
  } catch (error) {
    console.error('❌ Error iniciando ruta:', error)
    alert(`Error al iniciar la ruta: ${error.message || 'Error desconocido'}`)
  }
}

const markInProgress = async (orderItem) => {
  try {
    if (connectionStatus.value === 'online') {
      await apiService.routes.updateOrderStatus(
        activeRoute.value._id, 
        orderItem.order._id, 
        'in_progress'
      )
      await checkForActiveRoute()
    } else {
      // Guardar para sincronización offline
      addOfflineUpdate(orderItem.order._id, 'status_update', {
        status: 'in_progress'
      })
      orderItem.deliveryStatus = 'in_progress'
    }
  } catch (error) {
    console.error('❌ Error actualizando estado:', error)
    alert('Error al actualizar el estado')
  }
}

const openDeliveryProof = (orderItem) => {
  selectedOrder.value = orderItem
  showDeliveryProof.value = true
}

const closeDeliveryProof = () => {
  showDeliveryProof.value = false
  selectedOrder.value = null
}

const confirmDelivery = async (deliveryData) => {
  isSubmitting.value = true
  
  try {
    const deliveryProof = {
      ...deliveryData,
      timestamp: new Date().toISOString()
    }
    
    if (connectionStatus.value === 'online') {
      await apiService.routes.updateOrderStatus(
        activeRoute.value._id,
        selectedOrder.value.order._id,
        'delivered',
        deliveryProof
      )
      await checkForActiveRoute()
    } else {
      // Guardar para sincronización offline
      addOfflineUpdate(selectedOrder.value.order._id, 'status_update', {
        status: 'delivered',
        deliveryProof
      })
      selectedOrder.value.deliveryStatus = 'delivered'
    }
    
    closeDeliveryProof()
    alert('¡Entrega confirmada correctamente!')
  } catch (error) {
    console.error('❌ Error confirmando entrega:', error)
    alert('Error al confirmar la entrega')
  } finally {
    isSubmitting.value = false
  }
}

// Funciones auxiliares para offline
const addOfflineUpdate = (orderId, type, data) => {
  offlineUpdates.value.push({
    orderId,
    type,
    data,
    timestamp: Date.now()
  })
  localStorage.setItem('driverOfflineUpdates', JSON.stringify(offlineUpdates.value))
}

const loadOfflineUpdates = () => {
  const saved = localStorage.getItem('driverOfflineUpdates')
  if (saved) {
    offlineUpdates.value = JSON.parse(saved)
  }
}

const syncOfflineData = async () => {
  if (!hasOfflineData.value || !activeRoute.value) return
  
  isSyncing.value = true
  try {
    await apiService.routes.syncOfflineUpdates(activeRoute.value._id, offlineUpdates.value)
    offlineUpdates.value = []
    localStorage.removeItem('driverOfflineUpdates')
    await checkForActiveRoute()
    alert('Datos sincronizados correctamente')
  } catch (error) {
    console.error('❌ Error sincronizando:', error)
    alert('Error al sincronizar datos')
  } finally {
    isSyncing.value = false
  }
}

const updateConnectionStatus = () => {
  connectionStatus.value = navigator.onLine ? 'online' : 'offline'
}

const logout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}

// Lifecycle
onMounted(() => {
  checkForActiveRoute()
  loadOfflineUpdates()
  updateConnectionStatus()
  
  // Listen for connection changes
  window.addEventListener('online', updateConnectionStatus)
  window.addEventListener('offline', updateConnectionStatus)
  
  // Check for active route periodically
  setInterval(checkForActiveRoute, 30000) // Every 30 seconds
})
</script>