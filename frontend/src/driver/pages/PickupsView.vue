<!-- frontend/src/driver/pages/PickupsView.vue -->
<template>
  <div class="pickups-view">
    <!-- Header con acciones -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">🚚 Mis Recogidas</h1>
        <p class="text-sm text-gray-600 mt-1">
          Escanea los códigos QR de las etiquetas para marcar como recogidos
        </p>
      </div>
      
      <div class="flex space-x-2">
        <button 
          @click="$emit('refresh-pickups')"
          :disabled="isLoading"
          class="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <span v-if="isLoading">🔄</span>
          <span v-else>🔄</span>
          <span class="ml-1 hidden sm:inline">Actualizar</span>
        </button>
        
        <button 
          @click="$emit('scan-qr')"
          class="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <span class="text-lg mr-2">📱</span>
          <span>Escanear QR</span>
        </button>
      </div>
    </div>

    <!-- Estado de carga -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="animate-spin text-4xl mb-4">🔄</div>
        <p class="text-gray-600">Cargando recogidas...</p>
      </div>
    </div>

    <!-- Lista de rutas de recogida -->
    <div v-else-if="pickupRoutes.length > 0" class="space-y-4">
      <div 
        v-for="route in pickupRoutes" 
        :key="route._id"
        class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <!-- Header de la tarjeta -->
        <div class="p-4 border-b border-gray-100">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                🏢 {{ route.company?.name || 'Empresa no disponible' }}
              </h3>
              <div class="mt-2 space-y-1">
                <p class="text-sm text-gray-600 flex items-center">
                  📍 {{ route.pickup_address }}
                </p>
                <p class="text-sm text-gray-600 flex items-center">
                  📅 {{ formatDate(route.pickup_date) }}
                  <span v-if="route.pickup_time_slot" class="ml-2">
                    ⏰ {{ route.pickup_time_slot }}
                  </span>
                </p>
              </div>
            </div>
            
            <div class="flex flex-col items-end space-y-2">
              <span :class="getStatusBadgeClass(route.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                {{ getStatusText(route.status) }}
              </span>
              
              <div class="text-right text-sm">
                <div class="text-gray-600">
                  Esperados: <span class="font-medium">{{ route.expected_packages || 0 }}</span>
                </div>
                <div class="text-green-600 font-medium">
                  Recogidos: <span class="text-lg">{{ route.collected_packages || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contenido de la tarjeta -->
        <div class="p-4">
          <!-- Notas de la recogida -->
          <div v-if="route.notes" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-sm text-yellow-800">
              <span class="font-medium">📝 Notas:</span> {{ route.notes }}
            </p>
          </div>

          <!-- Lista de paquetes escaneados -->
          <div v-if="route.scanned_packages && route.scanned_packages.length > 0" class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
              ✅ Paquetes escaneados ({{ route.scanned_packages.length }})
            </h4>
            
            <div class="space-y-2 max-h-32 overflow-y-auto">
              <div 
                v-for="pkg in route.scanned_packages" 
                :key="pkg.order_id"
                class="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded-lg"
              >
                <div class="flex-1">
                  <p class="text-sm font-medium text-green-800">
                    {{ pkg.tracking_code }}
                  </p>
                  <p class="text-xs text-green-600">
                    {{ pkg.customer_name }}
                  </p>
                </div>
                <div class="text-xs text-green-600">
                  {{ formatTime(pkg.scanned_at) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Progreso visual -->
          <div v-if="route.expected_packages > 0" class="mb-4">
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-gray-600">Progreso de recogida</span>
              <span class="text-sm font-medium text-gray-900">
                {{ Math.round((route.collected_packages || 0) / route.expected_packages * 100) }}%
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-green-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: Math.min((route.collected_packages || 0) / route.expected_packages * 100, 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex gap-2 pt-2">
            <button 
              v-if="route.status === 'pending'"
              @click="$emit('start-pickup', route)"
              class="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🚀 Iniciar Recogida
            </button>
            
            <button 
              v-if="route.status === 'in_progress'"
              @click="$emit('scan-qr')"
              class="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📱 Escanear Paquetes
            </button>
            
            <button 
              v-if="route.status === 'in_progress' && (route.collected_packages || 0) > 0"
              @click="$emit('complete-pickup', route)"
              class="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              ✅ Completar
            </button>
            
            <button 
              v-if="route.status === 'completed'"
              disabled
              class="flex-1 flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              ✅ Completada
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else class="text-center py-12">
      <div class="text-6xl mb-4">📭</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No tienes recogidas asignadas
      </h3>
      <p class="text-gray-600 mb-4">
        Las recogidas aparecerán aquí cuando se te asignen
      </p>
      <button 
        @click="$emit('refresh-pickups')"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        🔄 Actualizar
      </button>
    </div>

    <!-- Información de ayuda -->
    <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 class="font-medium text-blue-900 mb-2 flex items-center">
        💡 ¿Cómo funcionan las recogidas?
      </h4>
      <div class="text-sm text-blue-800 space-y-1">
        <p>• <strong>Inicia la recogida</strong> cuando llegues a la ubicación</p>
        <p>• <strong>Escanea los códigos QR</strong> de cada etiqueta de paquete</p>
        <p>• <strong>Completa la recogida</strong> cuando hayas terminado</p>
        <p>• Los paquetes cambian automáticamente a "Recogido" al escanearlos</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

defineProps({
  pickupRoutes: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'start-pickup',
  'complete-pickup', 
  'scan-qr',
  'refresh-pickups'
])

// Métodos auxiliares
const formatDate = (date) => {
  if (!date) return 'Fecha no disponible'
  return new Date(date).toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': 'Pendiente',
    'in_progress': 'En Progreso',
    'completed': 'Completada',
    'cancelled': 'Cancelada'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status) => {
  const classes = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}
</script>