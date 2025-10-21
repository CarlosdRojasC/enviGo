<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 class="text-2xl font-bold text-gray-900">Historial de Entregas</h2>
      <div class="flex items-center space-x-3">
        <select 
          v-model="periodFilter" 
          @change="loadHistory"
          class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="today">Hoy</option>
          <option value="yesterday">Ayer</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="all">Todo el historial</option>
        </select>
        <button 
          @click="loadHistory"
          :disabled="isLoading"
          class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          Actualizar
        </button>
      </div>
    </div>

    <!-- Estadísticas del período -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-blue-600">{{ stats.total }}</div>
        <div class="text-sm text-gray-500">Total</div>
      </div>
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-green-600">{{ stats.delivered }}</div>
        <div class="text-sm text-gray-500">Entregados</div>
      </div>
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-red-600">{{ stats.failed }}</div>
        <div class="text-sm text-gray-500">Fallidos</div>
      </div>
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-purple-600">{{ stats.earnings.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) }}</div>
        <div class="text-sm text-gray-500">Ganancias</div>
      </div>
    </div>

    <!-- Buscador -->
    <div class="relative">
      <input 
        v-model="searchQuery"
        type="text"
        placeholder="Buscar en historial por cliente, dirección, número..."
        class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <button 
        v-if="searchQuery"
        @click="searchQuery = ''"
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        <svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Cargando historial...</span>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else-if="filteredHistory.length === 0 && searchQuery" class="text-center py-12">
      <div class="text-6xl mb-4">🔍</div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No se encontraron entregas</h3>
      <p class="text-gray-600">Intenta con otros términos de búsqueda</p>
      <button 
        @click="searchQuery = ''"
        class="mt-3 text-blue-600 hover:text-blue-800 font-medium"
      >
        Limpiar búsqueda
      </button>
    </div>

    <div v-else-if="deliveryHistory.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📚</div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Sin historial</h3>
      <p class="text-gray-600">No hay entregas en el período seleccionado</p>
    </div>

    <!-- Lista de historial agrupada por fecha -->
    <div v-else class="space-y-6">
      <div v-for="(group, date) in groupedHistory" :key="date" class="space-y-3">
        <!-- Encabezado de fecha -->
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">{{ formatGroupDate(date) }}</h3>
          <span class="text-sm text-gray-500">{{ group.length }} entregas</span>
        </div>

        <!-- Entregas del día -->
        <div class="space-y-3">
          <div 
            v-for="delivery in group" 
            :key="delivery.order._id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-start space-x-3 flex-1">
                <!-- Estado visual -->
                <div 
                  class="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                  :class="{
                    'bg-green-500': delivery.deliveryStatus === 'delivered',
                    'bg-red-500': delivery.deliveryStatus === 'failed',
                    'bg-gray-400': delivery.deliveryStatus === 'cancelled'
                  }"
                ></div>

                <!-- Información principal -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <h4 class="font-medium text-gray-900 truncate">
                      {{ delivery.order.customer_name || 'Cliente' }}
                    </h4>
                    <span class="text-xs text-gray-500 ml-2">
                      {{ formatTime(delivery.completedAt) }}
                    </span>
                  </div>
                  
                  <div class="space-y-1">
                    <p class="text-sm text-gray-900 font-mono">
                      #{{ delivery.order.order_number || delivery.order._id.slice(-6) }}
                    </p>
                    <p class="text-sm text-gray-600 truncate">
                      {{ delivery.order.shipping_address }}
                    </p>
                  </div>

                  <!-- Estado y detalles -->
                  <div class="mt-2 flex items-center justify-between">
                    <span 
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-green-100 text-green-800': delivery.deliveryStatus === 'delivered',
                        'bg-red-100 text-red-800': delivery.deliveryStatus === 'failed',
                        'bg-gray-100 text-gray-800': delivery.deliveryStatus === 'cancelled'
                      }"
                    >
                      {{ getStatusText(delivery.deliveryStatus) }}
                      <span v-if="delivery.deliveryStatus === 'delivered'">
                        - {{ delivery.deliveryProof?.recipientName || 'Sin receptor' }}
                      </span>
                    </span>

                    <!-- Acciones -->
                    <div class="flex items-center space-x-2">
                      <button 
                        v-if="delivery.deliveryStatus === 'delivered'"
                        @click="viewDeliveryProof(delivery)"
                        class="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Ver prueba
                      </button>
                      <button 
                        v-if="delivery.order.customer_phone"
                        @click="callCustomer(delivery.order.customer_phone)"
                        class="text-green-600 hover:text-green-800 text-sm"
                      >
                        Llamar
                      </button>
                    </div>
                  </div>

                  <!-- Comentarios si los hay -->
                  <div v-if="delivery.deliveryProof?.comments" class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    {{ delivery.deliveryProof.comments }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de prueba de entrega -->
    <div v-if="showProofModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h3 class="text-lg font-semibold">Prueba de Entrega</h3>
          <button @click="showProofModal = false" class="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div v-if="selectedProof" class="p-6 space-y-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium">{{ selectedProof.order.customer_name }}</h4>
            <p class="text-sm text-gray-600">{{ selectedProof.order.shipping_address }}</p>
            <p class="text-xs text-gray-500 mt-1">
              #{{ selectedProof.order.order_number || selectedProof.order._id.slice(-6) }}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Recibido por:</label>
            <p class="text-gray-900">{{ selectedProof.deliveryProof.recipientName }}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega:</label>
            <p class="text-gray-900">{{ formatDateTime(selectedProof.completedAt) }}</p>
          </div>
          
          <!-- Múltiples fotos -->
          <div v-if="selectedProof.deliveryProof.photos && selectedProof.deliveryProof.photos.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">Fotos de entrega:</label>
            <div class="grid grid-cols-2 gap-2">
              <img 
                v-for="(photo, index) in selectedProof.deliveryProof.photos" 
                :key="index"
                :src="photo" 
                :alt="`Prueba de entrega ${index + 1}`" 
                class="w-full h-32 object-cover rounded-lg border cursor-pointer"
                @click="openImageModal(photo)"
              >
            </div>
          </div>
          
          <!-- Foto única (compatibilidad) -->
          <div v-else-if="selectedProof.deliveryProof.photo">
            <label class="block text-sm font-medium text-gray-700 mb-1">Foto de entrega:</label>
            <img 
              :src="selectedProof.deliveryProof.photo" 
              alt="Prueba de entrega" 
              class="w-full h-48 object-cover rounded-lg border cursor-pointer"
              @click="openImageModal(selectedProof.deliveryProof.photo)"
            >
          </div>
          
          <div v-if="selectedProof.deliveryProof.comments">
            <label class="block text-sm font-medium text-gray-700 mb-1">Comentarios:</label>
            <p class="text-gray-900 text-sm bg-gray-50 p-3 rounded">{{ selectedProof.deliveryProof.comments }}</p>
          </div>

          <div v-if="selectedProof.deliveryProof.location">
            <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación de entrega:</label>
            <button 
              @click="openLocationMap(selectedProof.deliveryProof.location)"
              class="text-blue-600 hover:text-blue-800 text-sm"
            >
              Ver en mapa
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de imagen ampliada -->
    <div v-if="showImageModal" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" @click="showImageModal = false">
      <div class="max-w-4xl max-h-full">
        <img :src="selectedImage" alt="Imagen ampliada" class="max-w-full max-h-full object-contain">
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../../services/api'

// Props
const props = defineProps({
  driverId: {
    type: String,
    default: null
  }
})

// Reactive data
const deliveryHistory = ref([])
const isLoading = ref(false)
const periodFilter = ref('week')
const searchQuery = ref('')
const showProofModal = ref(false)
const selectedProof = ref(null)
const showImageModal = ref(false)
const selectedImage = ref('')

// Computed
const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) return deliveryHistory.value
  
  const query = searchQuery.value.toLowerCase().trim()
  return deliveryHistory.value.filter(delivery => {
    const orderNumber = delivery.order.order_number || ''
    const orderId = delivery.order._id || ''
    const customerName = delivery.order.customer_name || ''
    const shippingAddress = delivery.order.shipping_address || ''
    const recipientName = delivery.deliveryProof?.recipientName || ''
    
    return orderNumber.toLowerCase().includes(query) ||
           orderId.toLowerCase().includes(query) ||
           customerName.toLowerCase().includes(query) ||
           shippingAddress.toLowerCase().includes(query) ||
           recipientName.toLowerCase().includes(query)
  })
})

const groupedHistory = computed(() => {
  const grouped = {}
  
  filteredHistory.value.forEach(delivery => {
    const date = new Date(delivery.completedAt).toDateString()
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(delivery)
  })
  
  // Ordenar grupos por fecha (más reciente primero)
  const sortedGrouped = {}
  Object.keys(grouped)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach(key => {
      sortedGrouped[key] = grouped[key].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    })
  
  return sortedGrouped
})

const stats = computed(() => {
  const delivered = filteredHistory.value.filter(d => d.deliveryStatus === 'delivered').length
  const failed = filteredHistory.value.filter(d => d.deliveryStatus === 'failed').length
  const total = filteredHistory.value.length
  
  // Calcular ganancias estimadas (esto dependerá de tu modelo de negocio)
  const earnings = delivered * 1500 // Ejemplo: 1500 CLP por entrega exitosa
  
  return { delivered, failed, total, earnings }
})

// Methods
const loadHistory = async () => {
  isLoading.value = true
  
  try {
    // Calcular fechas basadas en el filtro
    const { startDate, endDate } = getDateRange(periodFilter.value)
    
    // Llamar a tu API para obtener el historial
    const response = await apiService.routes.getDriverHistory(props.driverId, {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'completed' // Solo entregas completadas (delivered, failed, etc.)
    })
    
    deliveryHistory.value = response.data.deliveries || []
    
    console.log(`Historial cargado: ${deliveryHistory.value.length} entregas`)
    
  } catch (error) {
    console.error('Error cargando historial:', error)
    // En caso de error, usar datos mock para desarrollo
    loadMockHistory()
  } finally {
    isLoading.value = false
  }
}

const loadMockHistory = () => {
  // Datos mock para desarrollo
  const mockDeliveries = []
  const statuses = ['delivered', 'failed']
  
  for (let i = 0; i < 20; i++) {
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))
    
    mockDeliveries.push({
      order: {
        _id: `mock_${i}`,
        order_number: `ORD-${1000 + i}`,
        customer_name: `Cliente ${i + 1}`,
        shipping_address: `Dirección de ejemplo ${i + 1}, Santiago`,
        customer_phone: '+56912345678'
      },
      deliveryStatus: statuses[Math.floor(Math.random() * statuses.length)],
      completedAt: date.toISOString(),
      deliveryProof: {
        recipientName: `Receptor ${i + 1}`,
        comments: Math.random() > 0.5 ? `Comentario de entrega ${i + 1}` : '',
        photos: ['data:image/jpeg;base64,mock_photo_data'],
        location: {
          latitude: -33.4489 + (Math.random() - 0.5) * 0.1,
          longitude: -70.6693 + (Math.random() - 0.5) * 0.1
        }
      }
    })
  }
  
  deliveryHistory.value = mockDeliveries
}

const getDateRange = (period) => {
  const now = new Date()
  const startDate = new Date()
  const endDate = new Date()
  
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      startDate.setDate(now.getDate() - 1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(now.getDate() - 1)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'week':
      startDate.setDate(now.getDate() - 7)
      break
    case 'month':
      startDate.setMonth(now.getMonth() - 1)
      break
    case 'all':
      startDate.setFullYear(now.getFullYear() - 1)
      break
  }
  
  return { startDate, endDate }
}

const viewDeliveryProof = (delivery) => {
  selectedProof.value = delivery
  showProofModal.value = true
}

const openImageModal = (imageUrl) => {
  selectedImage.value = imageUrl
  showImageModal.value = true
}

const openLocationMap = (location) => {
  const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
  window.open(url, '_blank')
}

const callCustomer = (phone) => {
  window.location.href = `tel:${phone}`
}

const getStatusText = (status) => {
  const statusMap = {
    'delivered': 'Entregado',
    'failed': 'Fallido',
    'cancelled': 'Cancelado'
  }
  return statusMap[status] || status
}

const formatGroupDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoy'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer'
  } else {
    return date.toLocaleDateString('es-CL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
}

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadHistory()
})
</script>