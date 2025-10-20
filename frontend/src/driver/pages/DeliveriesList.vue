<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 class="text-2xl font-bold text-gray-900">Mis Entregas</h2>
      <div class="flex items-center space-x-4 w-full sm:w-auto">
        <select 
          v-model="statusFilter" 
          class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 sm:flex-none"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="in_progress">En progreso</option>
          <option value="delivered">Entregados</option>
          <option value="failed">Fallidos</option>
        </select>
      </div>
    </div>

    <!-- Buscador -->
    <div class="relative">
      <input 
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por número, cliente, dirección, teléfono..."
        class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <button 
        v-if="searchQuery"
        @click="clearSearch"
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        <svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-gray-600">{{ stats.total }}</div>
        <div class="text-sm text-gray-500">Total</div>
      </div>
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-yellow-600">{{ stats.pending }}</div>
        <div class="text-sm text-gray-500">Pendientes</div>
      </div>
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-blue-600">{{ stats.inProgress }}</div>
        <div class="text-sm text-gray-500">En progreso</div>
      </div>
      <div class="bg-white rounded-lg p-4 text-center shadow-sm">
        <div class="text-2xl font-bold text-green-600">{{ stats.delivered }}</div>
        <div class="text-sm text-gray-500">Entregados</div>
      </div>
    </div>

    <!-- Resultados de búsqueda -->
    <div v-if="searchQuery && filteredOrders.length !== props.orders.length" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-blue-800">
          Mostrando {{ filteredOrders.length }} de {{ props.orders.length }} entregas
        </span>
        <button 
          @click="clearSearch"
          class="text-blue-600 hover:text-blue-800 font-medium"
        >
          Limpiar búsqueda
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Cargando entregas...</span>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else-if="filteredOrders.length === 0 && searchQuery" class="text-center py-12">
      <div class="text-6xl mb-4">🔍</div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No se encontraron entregas</h3>
      <p class="text-gray-600">Intenta con otros términos de búsqueda</p>
      <button 
        @click="clearSearch"
        class="mt-3 text-blue-600 hover:text-blue-800 font-medium"
      >
        Limpiar búsqueda
      </button>
    </div>

    <!-- Sin entregas -->
    <div v-else-if="!orders.length" class="text-center py-12">
      <div class="text-6xl mb-4">📦</div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Sin entregas</h3>
      <p class="text-gray-600">No tienes entregas asignadas en este momento.</p>
    </div>

    <!-- Lista de entregas -->
    <div v-else class="space-y-4">
      <div 
        v-for="order in filteredOrders" 
        :key="order.order._id"
        class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
      >
        <div class="p-6">
          <div class="flex items-start justify-between">
            <!-- Información principal -->
            <div class="flex items-start space-x-4 flex-1">
              <!-- Número de secuencia -->
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                :class="getSequenceNumberColor(order.deliveryStatus)"
              >
                {{ order.sequenceNumber }}
              </div>

              <!-- Detalles del pedido -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-lg font-semibold text-gray-900 truncate">
                    {{ order.order.customer_name || 'Cliente' }}
                  </h3>
                  <span 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-3"
                    :class="getStatusBadgeClass(order.deliveryStatus)"
                  >
                    {{ getStatusText(order.deliveryStatus) }}
                  </span>
                </div>
                
                <div class="space-y-1">
                  <!-- Número de orden destacado -->
                  <p class="text-gray-900 text-sm font-mono font-medium flex items-center">
                    <span class="mr-2">📋</span>
                    #{{ order.order.order_number || order.order._id.slice(-6) }}
                  </p>
                  
                  <p class="text-gray-600 text-sm flex items-center">
                    <span class="mr-2">📍</span>
                    {{ order.order.shipping_address || 'Sin dirección' }}
                  </p>
                  
                  <p v-if="order.order.customer_phone" class="text-gray-500 text-xs flex items-center">
                    <span class="mr-2">📞</span>
                    {{ order.order.customer_phone }}
                  </p>
                </div>

                <!-- Información de entrega (si está completada) -->
                <div v-if="order.deliveryStatus === 'delivered' && order.deliveryProof" class="mt-3 p-3 bg-green-50 rounded-lg">
                  <div class="flex items-center justify-between text-sm">
                    <div>
                      <p class="font-medium text-green-800">
                        Entregado a: {{ order.deliveryProof.recipientName }}
                      </p>
                      <p class="text-green-600 text-xs">
                        {{ formatDateTime(order.deliveredAt) }}
                      </p>
                    </div>
                    <button 
                      @click="viewDeliveryProof(order)"
                      class="text-green-700 hover:text-green-900"
                    >
                      👁️
                    </button>
                  </div>
                </div>

                <!-- Comentarios (si los hay) -->
                <div v-if="order.deliveryProof?.comments" class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  <strong>Comentarios:</strong> {{ order.deliveryProof.comments }}
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <!-- Botón para iniciar entrega -->
            <button 
              v-if="order.deliveryStatus === 'pending' && isCurrentDelivery(order)"
              @click="$emit('mark-in-progress', order)"
              class="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>🚀</span>
              <span>Iniciar Entrega</span>
            </button>
            
            <!-- Botón para confirmar entrega -->
            <button 
              v-if="order.deliveryStatus === 'in_progress'"
              @click="$emit('select-delivery', order)"
              class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>✅</span>
              <span>Confirmar Entrega</span>
            </button>
            
            <!-- Navegación -->
            <button 
              v-if="order.deliveryStatus !== 'delivered'"
              @click="navigateToAddress(order)"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>📍</span>
              <span class="hidden sm:inline">Navegar</span>
              <span class="sm:hidden">Nav</span>
            </button>
            
            <!-- Llamar al cliente -->
            <button 
              v-if="order.order.customer_phone"
              @click="callCustomer(order.order.customer_phone)"
              class="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>📞</span>
              <span class="hidden sm:inline">Llamar</span>
              <span class="sm:hidden">Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de prueba de entrega (si se necesita ver) -->
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
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Recibido por:</label>
            <p class="text-gray-900">{{ selectedProof.deliveryProof.recipientName }}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega:</label>
            <p class="text-gray-900">{{ formatDateTime(selectedProof.deliveredAt) }}</p>
          </div>
          
          <!-- Mostrar múltiples fotos si existen -->
          <div v-if="selectedProof.deliveryProof.photos && selectedProof.deliveryProof.photos.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">Fotos de entrega:</label>
            <div class="grid grid-cols-2 gap-2">
              <img 
                v-for="(photo, index) in selectedProof.deliveryProof.photos" 
                :key="index"
                :src="photo" 
                :alt="`Prueba de entrega ${index + 1}`" 
                class="w-full h-32 object-cover rounded-lg border"
              >
            </div>
          </div>
          
          <!-- Foto única (compatibilidad) -->
          <div v-else-if="selectedProof.deliveryProof.photo">
            <label class="block text-sm font-medium text-gray-700 mb-1">Foto de entrega:</label>
            <img 
              :src="selectedProof.deliveryProof.photo" 
              alt="Prueba de entrega" 
              class="w-full h-48 object-cover rounded-lg border"
            >
          </div>
          
          <div v-if="selectedProof.deliveryProof.comments">
            <label class="block text-sm font-medium text-gray-700 mb-1">Comentarios:</label>
            <p class="text-gray-900 text-sm bg-gray-50 p-3 rounded">{{ selectedProof.deliveryProof.comments }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  orders: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['select-delivery', 'mark-in-progress'])

// Reactive data
const statusFilter = ref('')
const searchQuery = ref('')
const showProofModal = ref(false)
const selectedProof = ref(null)

// Computed - Filtrar órdenes
const filteredOrders = computed(() => {
  let filtered = [...props.orders]
  
  // Filtrar por estado
  if (statusFilter.value) {
    filtered = filtered.filter(order => order.deliveryStatus === statusFilter.value)
  }
  
  // Filtrar por búsqueda
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(order => {
      const orderNumber = order.order.order_number || ''
      const orderId = order.order._id || ''
      const customerName = order.order.customer_name || ''
      const shippingAddress = order.order.shipping_address || ''
      const customerPhone = order.order.customer_phone || ''
      const sequenceNumber = order.sequenceNumber?.toString() || ''
      
      return orderNumber.toLowerCase().includes(query) ||
             orderId.toLowerCase().includes(query) ||
             customerName.toLowerCase().includes(query) ||
             shippingAddress.toLowerCase().includes(query) ||
             customerPhone.includes(query) ||
             sequenceNumber.includes(query)
    })
  }
  
  return filtered
})

const stats = computed(() => {
  const total = props.orders.length
  const pending = props.orders.filter(o => o.deliveryStatus === 'pending').length
  const inProgress = props.orders.filter(o => o.deliveryStatus === 'in_progress').length
  const delivered = props.orders.filter(o => o.deliveryStatus === 'delivered').length
  
  return { total, pending, inProgress, delivered }
})

// Methods
const clearSearch = () => {
  searchQuery.value = ''
}

const isCurrentDelivery = (order) => {
  // Lógica para determinar si es la entrega actual
  const pendingOrders = props.orders.filter(o => o.deliveryStatus === 'pending' || o.deliveryStatus === 'in_progress')
  return pendingOrders.length > 0 && pendingOrders[0].order._id === order.order._id
}

const navigateToAddress = (order) => {
  if (!order.order.location) {
    alert('No hay coordenadas disponibles para esta dirección')
    return
  }
  
  showNavigationOptions(order)
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
        if (addr) {
          url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`
        } else {
          url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
        }
        break
        
      case 'waze':
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        break
        
      case 'apple':
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

const callCustomer = (phone) => {
  window.location.href = `tel:${phone}`
}

const viewDeliveryProof = (order) => {
  selectedProof.value = order
  showProofModal.value = true
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': 'Pendiente',
    'in_progress': 'En progreso',
    'delivered': 'Entregado',
    'failed': 'Fallido',
    'cancelled': 'Cancelado'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status) => {
  const classMap = {
    'pending': 'bg-gray-100 text-gray-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'delivered': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

const getSequenceNumberColor = (status) => {
  const colorMap = {
    'pending': 'bg-gray-500',
    'in_progress': 'bg-yellow-500',
    'delivered': 'bg-green-500',
    'failed': 'bg-red-500',
    'cancelled': 'bg-gray-400'
  }
  return colorMap[status] || 'bg-gray-500'
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>