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
        <div class="flex justify-around md:justify-start md:space-x-4">
          <button 
            @click="currentView = 'active-route'"
            :class="currentView === 'active-route' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-3 text-xs font-medium transition-colors rounded-lg"
          >
            <span class="text-lg mb-1">🚚</span>
            <span>Mi Ruta</span>
          </button>
          
          <button 
            @click="currentView = 'deliveries'"
            :class="currentView === 'deliveries' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-3 text-xs font-medium transition-colors rounded-lg"
          >
            <span class="text-lg mb-1">📦</span>
            <span>Entregas</span>
          </button>

          
          <button 
            @click="currentView = 'map'"
            :class="currentView === 'map' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-3 text-xs font-medium transition-colors rounded-lg"
            :disabled="!activeRoute"
          >
            <span class="text-lg mb-1">🗺️</span>
            <span>Mapa</span>
          </button>
          
          <button 
            @click="currentView = 'history'"
            :class="currentView === 'history' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'"
            class="flex flex-col items-center py-3 px-3 text-xs font-medium transition-colors rounded-lg"
          >
            <span class="text-lg mb-1">📚</span>
            <span>Historial</span>
          </button>
          <button 
        @click="currentView = 'pickup-scanner'"
        :class="currentView === 'pickup-scanner' ? 'text-green-600 bg-green-50' : 'text-gray-500'"
        class="flex flex-col items-center py-3 px-3 text-xs font-medium transition-colors rounded-lg"
      >
        <span class="text-lg mb-1">📱</span>
        <span>Scanner</span>
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
        :search-query="searchQuery"
        :status-filter="statusFilter"
        @select-delivery="openDeliveryProof"
        @mark-in-progress="markInProgress"
        @update-search="searchQuery = $event"
        @update-status-filter="statusFilter = $event"
      />

      <!-- Nueva Vista: Recogidas con QR -->
      <PickupScanner 
    v-if="currentView === 'pickup-scanner'"
    @package-scanned="handlePackageScanned"
  />

      <!-- Vista: Mapa -->
      <RouteMap 
        v-if="currentView === 'map'"
        :active-route="activeRoute"
        :is-loading="isLoading"
      />

      <!-- Vista: Historial -->
      <DeliveryHistory 
        v-if="currentView === 'history'"
        :driver-id="driverId"
      />
    </main>

    <!-- Modal de Prueba de Entrega -->
    <DeliveryProofModal 
      v-if="showDeliveryProof"
      :selected-order="selectedOrder"
      :is-submitting="isSubmitting"
      @close="closeDeliveryProof"
      @confirm="confirmDelivery"
    />


    <!-- Notificación Toast -->
    <div v-if="notification" 
         :class="['fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300', notificationClass]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '../services/api'

// Componentes existentes
import ActiveRoute from '../driver/pages/ActiveRoute.vue'
import DeliveriesList from '../driver/pages/DeliveriesList.vue'
import RouteMap from '../driver/pages/RouteMap.vue'
import DeliveryProofModal from '../driver/pages/DeliveryProofModal.vue'
import DeliveryHistory from '../driver/pages/DeliveryHistory.vue'

// Nuevos componentes para recogidas
import PickupScanner from '../driver/components/PickupScanner.vue'

const router = useRouter()

// Estado principal existente
const currentView = ref('active-route')
const activeRoute = ref(null)
const isLoading = ref(false)
const connectionStatus = ref('online')
const showDeliveryProof = ref(false)
const selectedOrder = ref(null)
const isSyncing = ref(false)
const isSubmitting = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')

// Nuevos estados para recogidas
const pickupRoutes = ref([])
const isPickupsLoading = ref(false)
const showQRScanner = ref(false)
const notification = ref(null)

// Datos del conductor
const driverId = ref(null)
const driverName = ref('Conductor')
const driverInitials = computed(() => {
  return driverName.value.split(' ').map(n => n[0]).join('').toUpperCase()
})

// Datos offline
const offlineUpdates = ref([])

// Computed properties existentes
const sortedOrders = computed(() => {
  if (!activeRoute.value?.orders) return []
  return [...activeRoute.value.orders].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
})

const hasOfflineData = computed(() => {
  return offlineUpdates.value.length > 0
})

// Nuevas computed properties para recogidas
const pendingPickupsCount = computed(() => {
  return pickupRoutes.value.filter(route => 
    route.status === 'pending' || route.status === 'in_progress'
  ).length
})

const notificationClass = computed(() => {
  if (!notification.value) return ''
  
  const classes = {
    'success': 'bg-green-500',
    'error': 'bg-red-500',
    'warning': 'bg-yellow-500',
    'info': 'bg-blue-500'
  }
  
  return classes[notification.value.type] || 'bg-gray-500'
})

// Métodos existentes
const refreshData = async () => {
  await checkForActiveRoute(true)
  await loadPickupRoutes()
}

const checkForActiveRoute = async (preserveSearchState = false) => {
  isLoading.value = !preserveSearchState
  
  try {
    console.log('🔍 Verificando ruta activa del conductor...')
    
    const savedSearchQuery = preserveSearchState ? searchQuery.value : ''
    const savedStatusFilter = preserveSearchState ? statusFilter.value : ''
    
    const response = await apiService.routes.getActiveRoute()
    console.log('📡 Respuesta del servidor:', response.data)
    
    if (response.data.success && response.data.data) {
      activeRoute.value = response.data.data
      driverName.value = activeRoute.value.driver?.full_name || activeRoute.value.driver?.name || 'Conductor'
      driverId.value = activeRoute.value.driver?._id
      
      if (preserveSearchState) {
        searchQuery.value = savedSearchQuery
        statusFilter.value = savedStatusFilter
      }
      
      console.log('✅ Ruta activa encontrada:', {
        routeId: activeRoute.value._id,
        status: activeRoute.value.status,
        ordersCount: activeRoute.value.orders?.length || 0,
        driverName: driverName.value,
        preservedState: preserveSearchState
      })
    } else {
      console.log('ℹ️ No hay rutas activas asignadas')
      activeRoute.value = null
    }
  } catch (error) {
    console.error('❌ Error obteniendo ruta activa:', error)
    
    if (error.response?.status === 401) {
      showNotification('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'error')
      logout()
      return
    }
    
    if (connectionStatus.value === 'online') {
      showNotification(`Error al obtener la ruta activa: ${error.message || 'Error desconocido'}`, 'error')
    }
  } finally {
    isLoading.value = false
  }
}

// Nuevos métodos para recogidas
const loadPickupRoutes = async () => {
  isPickupsLoading.value = true
  
  try {
    console.log('🔍 Cargando rutas de recogida...')
    // 🆕 Corregir la llamada API
    const response = await apiService.pickups.getByDriver()
    
    pickupRoutes.value = response.data.pickups || []
    
    console.log('✅ Rutas de recogida cargadas:', {
      count: pickupRoutes.value.length,
      pending: pickupRoutes.value.filter(r => r.status === 'pending').length,
      inProgress: pickupRoutes.value.filter(r => r.status === 'in_progress').length
    })
    
  } catch (error) {
    console.error('❌ Error cargando rutas de recogida:', error)
    showNotification('Error al cargar las rutas de recogida', 'error')
  } finally {
    isPickupsLoading.value = false
  }
}


const handlePackageScanned = async (scanData) => {
  try {
    console.log('📱 Procesando paquete escaneado:', scanData)
    
    const { code } = scanData
    
    // 🆕 Usar el servicio pickupScanner
    const response = await apiService.pickupScanner.scanPackage(code)
    
    if (response.data.success) {
      const packageData = response.data.package
      showNotification(`Paquete ${packageData.tracking_code} recogido correctamente`, 'success')
      
      // Recargar las recogidas para actualizar los contadores
      await loadPickupRoutes()
    }
    
  } catch (error) {
    console.error('❌ Error procesando paquete escaneado:', error)
    
    let errorMessage = 'Error al procesar el código escaneado'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    showNotification(errorMessage, 'error')
  }
}

// Métodos existentes (sin cambios)
const startRoute = async () => {
  try {
    console.log('🚀 Iniciando ruta:', activeRoute.value._id)
    
    const response = await apiService.routes.startRoute(activeRoute.value._id)
    console.log('✅ Ruta iniciada:', response.data)
    
    await checkForActiveRoute()
    showNotification('¡Ruta iniciada! Puedes comenzar con las entregas.', 'success')
  } catch (error) {
    console.error('❌ Error iniciando ruta:', error)
    showNotification(`Error al iniciar la ruta: ${error.message || 'Error desconocido'}`, 'error')
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
      addOfflineUpdate(orderItem.order._id, 'status_update', {
        status: 'in_progress'
      })
      orderItem.deliveryStatus = 'in_progress'
    }
  } catch (error) {
    console.error('❌ Error actualizando estado:', error)
    showNotification('Error al actualizar el estado', 'error')
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
    console.log('📦 Confirmando entrega con datos:', {
      orderId: selectedOrder.value.order._id,
      recipientName: deliveryData.recipientName,
      photosCount: deliveryData.photos?.length || 0,
      hasLocation: !!deliveryData.location,
      hasComments: !!deliveryData.comments
    })
    
    const deliveryProof = {
      photos: deliveryData.photos || [],
      recipientName: deliveryData.recipientName,
      comments: deliveryData.comments || '',
      location: deliveryData.location,
      timestamp: new Date().toISOString(),
      deliveryMethod: 'driver_app'
    }
    
    if (connectionStatus.value === 'online') {
      console.log('🌐 Modo online: enviando al servidor...')
      
      const formData = new FormData()
      formData.append('recipient_name', deliveryProof.recipientName)
      formData.append('notes', deliveryProof.comments)
      
      if (deliveryProof.photos && deliveryProof.photos.length > 0) {
        deliveryProof.photos.forEach((photoBase64, index) => {
          try {
            const base64Data = photoBase64.split(',')[1]
            const byteCharacters = atob(base64Data)
            const byteArrays = []
            
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
              const slice = byteCharacters.slice(offset, offset + 512)
              const byteNumbers = new Array(slice.length)
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i)
              }
              const byteArray = new Uint8Array(byteNumbers)
              byteArrays.push(byteArray)
            }
            
            const blob = new Blob(byteArrays, { type: 'image/jpeg' })
            const file = new File([blob], `delivery_photo_${index + 1}.jpg`, { type: 'image/jpeg' })
            
            formData.append('photos', file)
            console.log(`📸 Foto ${index + 1} agregada al FormData`)
          } catch (error) {
            console.error(`❌ Error procesando foto ${index + 1}:`, error)
          }
        })
      }
      
      if (deliveryProof.location) {
        formData.append('latitude', deliveryProof.location.latitude)
        formData.append('longitude', deliveryProof.location.longitude)
        formData.append('accuracy', deliveryProof.location.accuracy)
      }
      
      await apiService.routes.updateOrderStatus(
        activeRoute.value._id,
        selectedOrder.value.order._id,
        'delivered',
        deliveryProof
      )
      
      console.log('✅ Entrega confirmada en el servidor')
      await checkForActiveRoute()
      
    } else {
      console.log('📴 Modo offline: guardando para sincronización...')
      
      addOfflineUpdate(selectedOrder.value.order._id, 'delivery_confirmation', {
        status: 'delivered',
        deliveryProof
      })
      
      selectedOrder.value.deliveryStatus = 'delivered'
      selectedOrder.value.deliveryProof = deliveryProof
      
      console.log('💾 Entrega guardada offline')
    }
    
    closeDeliveryProof()
    
    const message = connectionStatus.value === 'online' 
      ? '¡Entrega confirmada correctamente!' 
      : 'Entrega guardada. Se sincronizará cuando tengas conexión.'
    
    showNotification(message, 'success')
    
  } catch (error) {
    console.error('❌ Error confirmando entrega:', error)
    
    let errorMessage = 'Error al confirmar la entrega'
    
    if (error.response?.status === 413) {
      errorMessage = 'Las fotos son demasiado grandes. Intenta con imágenes más pequeñas.'
    } else if (error.response?.status === 400) {
      errorMessage = error.response.data?.error || 'Datos de entrega inválidos'
    } else if (error.message?.includes('Network')) {
      errorMessage = 'Error de conexión. Intenta nuevamente.'
    }
    
    showNotification(errorMessage, 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Función para mostrar notificaciones
const showNotification = (message, type = 'info') => {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = null
  }, 4000)
}

// Funciones auxiliares para offline (sin cambios)
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
    showNotification('Datos sincronizados correctamente', 'success')
  } catch (error) {
    console.error('❌ Error sincronizando:', error)
    showNotification('Error al sincronizar datos', 'error')
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
  checkForActiveRoute(false)
  loadPickupRoutes()
  loadOfflineUpdates()
  updateConnectionStatus()
  
  window.addEventListener('online', updateConnectionStatus)
  window.addEventListener('offline', updateConnectionStatus)
})
</script>