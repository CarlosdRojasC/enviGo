<!-- frontend/src/driver/components/QRScannerModal.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900">📱 Escanear Código QR</h3>
        <button 
          @click="$emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>
      </div>

      <div class="p-4 space-y-4">
        <!-- Selector de ruta activa -->
        <div v-if="activePickupRoutes.length > 1" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            Selecciona la recogida activa:
          </label>
          <select 
            v-model="selectedRouteId"
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Seleccionar recogida...</option>
            <option 
              v-for="route in activePickupRoutes" 
              :key="route._id" 
              :value="route._id"
            >
              {{ route.company?.name }} - {{ route.pickup_address }}
            </option>
          </select>
        </div>

        <!-- Información de la ruta seleccionada -->
        <div v-if="selectedRoute" class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 class="font-medium text-green-800">🏢 {{ selectedRoute.company?.name }}</h4>
          <p class="text-sm text-green-700">📍 {{ selectedRoute.pickup_address }}</p>
          <p class="text-sm text-green-700">
            📦 Recogidos: {{ selectedRoute.collected_packages || 0 }}/{{ selectedRoute.expected_packages || 0 }}
          </p>
        </div>

        <!-- Scanner de cámara -->
        <div v-if="selectedRoute" class="space-y-4">
          <!-- Permisos de cámara -->
          <div v-if="!cameraPermission" class="text-center py-8">
            <div class="text-4xl mb-4">📷</div>
            <p class="text-gray-600 mb-4">
              Necesitamos acceso a la cámara para escanear códigos QR
            </p>
            <button 
              @click="requestCameraPermission"
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Permitir Cámara
            </button>
          </div>

          <!-- Error de cámara -->
          <div v-else-if="scannerError" class="text-center py-8">
            <div class="text-4xl mb-4 text-red-500">❌</div>
            <p class="text-red-600 mb-4">{{ scannerError }}</p>
            <button 
              @click="requestCameraPermission"
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Reintentar
            </button>
          </div>

          <!-- Scanner activo -->
          <div v-else-if="cameraPermission" class="space-y-4">
            <div class="relative bg-black rounded-lg overflow-hidden">
              <video 
                ref="videoElement"
                autoplay
                muted
                playsinline
                class="w-full h-64 object-cover"
              ></video>
              
              <!-- Overlay del scanner -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="relative">
                  <!-- Marco de escaneo -->
                  <div class="w-48 h-48 border-2 border-green-400 rounded-lg relative">
                    <!-- Esquinas del marco -->
                    <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 -translate-x-2 -translate-y-2"></div>
                    <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 translate-x-2 -translate-y-2"></div>
                    <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 -translate-x-2 translate-y-2"></div>
                    <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 translate-x-2 translate-y-2"></div>
                    
                    <!-- Línea de escaneo animada -->
                    <div class="absolute top-0 left-0 w-full h-1 bg-green-400 animate-pulse" 
                         :style="{ animationDelay: scanLineDelay + 'ms' }"></div>
                  </div>
                  
                  <!-- Texto de instrucción -->
                  <p class="text-white text-center mt-4 font-medium drop-shadow-lg">
                    Enfoca el código QR de la etiqueta
                  </p>
                </div>
              </div>
            </div>

            <!-- Estado de escaneo -->
            <div v-if="isScanning" class="text-center">
              <div class="animate-spin text-2xl mb-2">🔄</div>
              <p class="text-sm text-gray-600">Escaneando...</p>
            </div>
          </div>

          <!-- Input manual como alternativa -->
          <div class="border-t border-gray-200 pt-4">
            <h4 class="text-sm font-medium text-gray-700 mb-3">
              O ingresa el código manualmente:
            </h4>
            <div class="flex gap-2">
              <input 
                v-model="manualCode"
                type="text"
                placeholder="Código de seguimiento"
                class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                @keyup.enter="processManualCode"
                :disabled="isProcessing"
              >
              <button 
                @click="processManualCode"
                :disabled="!manualCode.trim() || isProcessing || !selectedRoute"
                class="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {{ isProcessing ? '⏳' : '✅' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Mensaje cuando no hay rutas activas -->
        <div v-if="activePickupRoutes.length === 0" class="text-center py-8">
          <div class="text-4xl mb-4">📭</div>
          <p class="text-gray-600 mb-4">
            No tienes recogidas en progreso
          </p>
          <p class="text-sm text-gray-500">
            Debes iniciar una recogida primero
          </p>
        </div>

        <!-- Historial de escaneos recientes -->
        <div v-if="recentScans.length > 0" class="border-t border-gray-200 pt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-3">
            Últimos escaneos:
          </h4>
          <div class="space-y-2 max-h-32 overflow-y-auto">
            <div 
              v-for="scan in recentScans" 
              :key="scan.code"
              class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{{ scan.code }}</p>
                <p class="text-xs text-gray-500">{{ scan.time }}</p>
              </div>
              <span class="text-green-500 text-sm">✅</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = defineProps({
  pickupRoutes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'package-scanned'])

// Estados del scanner
const cameraPermission = ref(false)
const scannerError = ref('')
const isScanning = ref(false)
const isProcessing = ref(false)
const manualCode = ref('')
const selectedRouteId = ref('')
const recentScans = ref([])
const scanLineDelay = ref(0)

// Referencias
const videoElement = ref(null)
let stream = null
let scanInterval = null

// Computed properties
const activePickupRoutes = computed(() => {
  return props.pickupRoutes.filter(route => route.status === 'in_progress')
})

const selectedRoute = computed(() => {
  if (!selectedRouteId.value) return null
  return activePickupRoutes.value.find(route => route._id === selectedRouteId.value)
})

// Auto-seleccionar ruta si solo hay una activa
watch(activePickupRoutes, (routes) => {
  if (routes.length === 1 && !selectedRouteId.value) {
    selectedRouteId.value = routes[0]._id
  }
}, { immediate: true })

// Solicitar permisos de cámara
const requestCameraPermission = async () => {
  try {
    scannerError.value = ''
    
    // Detener stream anterior si existe
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    // Solicitar nuevo stream
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment', // Cámara trasera preferida
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    })
    
    cameraPermission.value = true
    
    // Esperar al siguiente tick para que el video element esté disponible
    await nextTick()
    initCamera()
    
  } catch (error) {
    console.error('Error accediendo a la cámara:', error)
    
    if (error.name === 'NotAllowedError') {
      scannerError.value = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.'
    } else if (error.name === 'NotFoundError') {
      scannerError.value = 'No se encontró ninguna cámara disponible.'
    } else if (error.name === 'NotReadableError') {
      scannerError.value = 'La cámara está siendo usada por otra aplicación.'
    } else {
      scannerError.value = 'Error al acceder a la cámara: ' + error.message
    }
    
    cameraPermission.value = false
  }
}

// Inicializar cámara
const initCamera = () => {
  if (videoElement.value && stream) {
    videoElement.value.srcObject = stream
    
    videoElement.value.onloadedmetadata = () => {
      startQRDetection()
    }
  }
}

// Iniciar detección de QR (simulada - en producción usar jsQR)
const startQRDetection = () => {
  // Limpiar intervalo anterior
  if (scanInterval) {
    clearInterval(scanInterval)
  }
  
  // Simular animación de línea de escaneo
  scanLineDelay.value = Math.random() * 1000
  
  // En producción, aquí se usaría jsQR o una librería similar
  // para detectar códigos QR del stream de video
  scanInterval = setInterval(() => {
    if (isScanning.value) return
    
    // Simular detección (en producción esto sería real)
    simulateQRDetection()
  }, 500)
}

// Simular detección de QR (placeholder)
const simulateQRDetection = () => {
  // Este método sería reemplazado por la implementación real de jsQR
  // Por ahora es solo un placeholder para la estructura
}

// Procesar código QR detectado
const processQRCode = async (code) => {
  if (isProcessing.value || !selectedRoute.value) return
  
  isProcessing.value = true
  isScanning.value = true
  
  try {
    console.log('Procesando código QR:', code)
    
    // Emitir evento con el código escaneado
    emit('package-scanned', {
      code: code,
      routeId: selectedRoute.value._id,
      timestamp: new Date().toISOString()
    })
    
    // Agregar a historial de escaneos
    addToRecentScans(code)
    
    // Limpiar input manual
    manualCode.value = ''
    
  } catch (error) {
    console.error('Error procesando QR:', error)
  } finally {
    isProcessing.value = false
    isScanning.value = false
  }
}

// Procesar código manual
const processManualCode = () => {
  const code = manualCode.value.trim()
  if (code && selectedRoute.value) {
    processQRCode(code)
  }
}

// Agregar a escaneos recientes
const addToRecentScans = (code) => {
  const scan = {
    code,
    time: new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  recentScans.value.unshift(scan)
  
  // Mantener solo los últimos 5 escaneos
  if (recentScans.value.length > 5) {
    recentScans.value = recentScans.value.slice(0, 5)
  }
}

// Limpiar recursos
const cleanup = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  
  if (scanInterval) {
    clearInterval(scanInterval)
    scanInterval = null
  }
}

// Lifecycle
onMounted(() => {
  // Auto-solicitar permisos si ya hay rutas activas
  if (activePickupRoutes.value.length > 0) {
    requestCameraPermission()
  }
})

onBeforeUnmount(() => {
  cleanup()
})
</script>

<style scoped>
/* Animación personalizada para la línea de escaneo */
@keyframes scan-line {
  0% { transform: translateY(0); }
  50% { transform: translateY(190px); }
  100% { transform: translateY(0); }
}

.scan-line {
  animation: scan-line 2s ease-in-out infinite;
}
</style>