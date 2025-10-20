<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Confirmar Entrega</h3>
        <button 
          @click="$emit('close')" 
          class="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Información del pedido -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              {{ selectedOrder?.sequenceNumber }}
            </div>
            <div class="flex-1">
              <h4 class="font-medium text-gray-900">{{ selectedOrder?.order.customer_name || 'Cliente' }}</h4>
              <p class="text-sm text-gray-600 mt-1">{{ selectedOrder?.order.shipping_address || 'Sin dirección' }}</p>
              <p class="text-xs text-gray-500 mt-1">
                Pedido #{{ selectedOrder?.order.order_number || selectedOrder?.order._id?.slice(-6) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Nombre del receptor -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Nombre de quien recibe *
          </label>
          <input 
            v-model="deliveryForm.recipientName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Nombre completo de quien recibe"
            required
          >
          <p class="text-xs text-gray-500 mt-1">
            Ingresa el nombre de la persona que recibió el pedido
          </p>
        </div>

        <!-- Fotos de entrega - SECCIÓN MEJORADA -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Fotos de entrega * (máximo 5)
          </label>
          
          <!-- Botón para agregar fotos -->
          <div v-if="deliveryPhotos.length < 5" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors mb-4">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              multiple
              @change="handlePhotoCapture"
              class="hidden"
              ref="photoInput"
            >
            <div class="text-4xl mb-3">📷</div>
            <p class="text-gray-600 mb-4">
              {{ deliveryPhotos.length === 0 ? 'Toma fotos como prueba de entrega' : `Agregar más fotos (${deliveryPhotos.length}/5)` }}
            </p>
            <button 
              @click="$refs.photoInput.click()"
              type="button"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {{ deliveryPhotos.length === 0 ? 'Abrir Cámara' : 'Agregar Foto' }}
            </button>
          </div>

          <!-- Grid de fotos capturadas -->
          <div v-if="deliveryPhotos.length > 0" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">{{ deliveryPhotos.length }} foto{{ deliveryPhotos.length !== 1 ? 's' : '' }} seleccionada{{ deliveryPhotos.length !== 1 ? 's' : '' }}</span>
              <button 
                v-if="deliveryPhotos.length > 0"
                @click="clearAllPhotos"
                type="button"
                class="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Borrar todas
              </button>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div 
                v-for="(photo, index) in deliveryPhotos" 
                :key="index"
                class="relative group"
              >
                <img 
                  :src="photo" 
                  :alt="`Foto de entrega ${index + 1}`" 
                  class="w-full h-32 object-cover rounded-lg border border-gray-300"
                >
                <!-- Número de foto -->
                <div class="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {{ index + 1 }}
                </div>
                <!-- Botón eliminar -->
                <button 
                  @click="removePhoto(index)"
                  type="button"
                  class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition-colors opacity-90 group-hover:opacity-100"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ubicación (opcional) -->
        <div v-if="currentLocation" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <div class="text-blue-600 mt-0.5">📍</div>
            <div>
              <h5 class="text-sm font-medium text-blue-900">Ubicación registrada</h5>
              <p class="text-xs text-blue-700 mt-1">
                Lat: {{ currentLocation.latitude.toFixed(6) }}, 
                Lng: {{ currentLocation.longitude.toFixed(6) }}
              </p>
              <p class="text-xs text-blue-600 mt-1">
                Precisión: ±{{ currentLocation.accuracy }}m
              </p>
            </div>
          </div>
        </div>

        <!-- Comentarios adicionales -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Comentarios adicionales (opcional)
          </label>
          <textarea 
            v-model="deliveryForm.comments"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            placeholder="Observaciones, problemas encontrados, instrucciones especiales..."
          ></textarea>
        </div>

        <!-- Información adicional -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <div class="text-yellow-600 mt-0.5">⚠️</div>
            <div>
              <h5 class="text-sm font-medium text-yellow-900">Importante</h5>
              <ul class="text-xs text-yellow-800 mt-1 space-y-1">
                <li>• Puedes tomar hasta 5 fotos como prueba de entrega</li>
                <li>• Asegúrate de que las fotos muestren claramente el producto entregado</li>
                <li>• Verifica que el nombre del receptor sea correcto</li>
                <li>• Una vez confirmada, la entrega no se puede deshacer</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="flex space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <button 
          @click="$emit('close')"
          type="button"
          class="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button 
          @click="confirmDelivery"
          :disabled="!isFormValid || isSubmitting"
          type="button"
          class="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <span v-if="isSubmitting" class="animate-spin">🔄</span>
          <span v-else>✅</span>
          <span>{{ isSubmitting ? 'Guardando...' : 'Confirmar Entrega' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// Props
const props = defineProps({
  selectedOrder: {
    type: Object,
    required: true
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close', 'confirm'])

// Reactive data
const deliveryForm = ref({
  recipientName: '',
  comments: ''
})

// CAMBIO: Array de fotos en lugar de una sola
const deliveryPhotos = ref([])
const currentLocation = ref(null)

// Computed
const isFormValid = computed(() => {
  return deliveryForm.value.recipientName.trim() !== '' && deliveryPhotos.value.length > 0
})

// Methods
const handlePhotoCapture = (event) => {
  const files = Array.from(event.target.files)
  const remainingSlots = 5 - deliveryPhotos.value.length
  
  if (files.length > remainingSlots) {
    alert(`Solo puedes agregar ${remainingSlots} foto${remainingSlots !== 1 ? 's' : ''} más`)
    files.length = remainingSlots
  }

  files.forEach(file => {
    // Validar tamaño del archivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Una de las imágenes es demasiado grande. Por favor selecciona imágenes menores a 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      deliveryPhotos.value.push(e.target.result)
    }
    reader.readAsDataURL(file)
  })

  // Limpiar el input
  event.target.value = ''
}

const removePhoto = (index) => {
  deliveryPhotos.value.splice(index, 1)
}

const clearAllPhotos = () => {
  if (confirm('¿Estás seguro de que quieres borrar todas las fotos?')) {
    deliveryPhotos.value = []
  }
}

const confirmDelivery = () => {
  if (!isFormValid.value) return

  const deliveryData = {
    photos: deliveryPhotos.value, // CAMBIO: Enviar array de fotos
    recipientName: deliveryForm.value.recipientName.trim(),
    comments: deliveryForm.value.comments.trim(),
    location: currentLocation.value,
    timestamp: new Date().toISOString()
  }

  emit('confirm', deliveryData)
}

const getCurrentLocation = () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date().toISOString()
        }
        console.log('📍 Ubicación obtenida:', currentLocation.value)
      },
      (error) => {
        console.warn('⚠️ No se pudo obtener la ubicación:', error.message)
        // No es crítico, continúa sin ubicación
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    )
  }
}

const resetForm = () => {
  deliveryForm.value = {
    recipientName: '',
    comments: ''
  }
  deliveryPhotos.value = [] // CAMBIO: Limpiar array de fotos
  currentLocation.value = null
}

// Watchers
watch(() => props.selectedOrder, (newOrder) => {
  if (newOrder) {
    resetForm()
    getCurrentLocation()
    
    // Auto-llenar el nombre si hay información del cliente
    if (newOrder.order?.customer_name) {
      deliveryForm.value.recipientName = newOrder.order.customer_name
    }
  }
})

// Lifecycle
onMounted(() => {
  if (props.selectedOrder) {
    getCurrentLocation()
    
    // Auto-llenar el nombre si hay información del cliente
    if (props.selectedOrder.order?.customer_name) {
      deliveryForm.value.recipientName = props.selectedOrder.order.customer_name
    }
  }
})
</script>