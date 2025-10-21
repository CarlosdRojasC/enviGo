<!-- frontend/src/driver/components/PickupScanner.vue - Versión mejorada -->
<template>
  <div class="pickup-scanner p-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Scanner de Recogidas</h1>
      <p class="text-gray-600">
        Escanea el código QR o ingresa el número de pedido manualmente
      </p>
    </div>

    <!-- Entrada manual PRIMERA (más fácil) -->
    <div class="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <h3 class="font-medium text-blue-900 mb-3">Ingresa el número de pedido:</h3>
      <div class="flex gap-2">
        <input 
          v-model="manualCode"
          type="text"
          placeholder="Ej: P1808"
          class="flex-1 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
          @keyup.enter="processManualCode"
          :disabled="isProcessing"
          autofocus
        >
        <button 
          @click="processManualCode"
          :disabled="!manualCode.trim() || isProcessing"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {{ isProcessing ? 'Procesando...' : 'Procesar' }}
        </button>
      </div>
      <p class="text-sm text-blue-600 mt-2">
        El código está impreso debajo del QR en la etiqueta
      </p>
    </div>

    <!-- Botón de escaneo QR (secundario) -->
    <div class="text-center mb-8">
      <p class="text-gray-600 mb-4">O si prefieres escanear:</p>
      <button 
        @click="showScanner = true"
        class="w-full py-4 bg-green-600 text-white rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
      >
        <span class="text-2xl block mb-1">📱</span>
        Escanear Código QR
      </button>
    </div>

    <!-- Historial de escaneos recientes -->
    <div v-if="recentScans.length > 0" class="mb-8">
      <h3 class="font-medium text-gray-900 mb-3">Últimos escaneos:</h3>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div 
          v-for="scan in recentScans" 
          :key="scan.order_id"
          class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div class="flex-1">
            <p class="font-bold text-green-800 text-lg">{{ scan.order_number }}</p>
            <p class="text-sm text-green-600">{{ scan.customer_name || 'Cliente no especificado' }}</p>
            <p class="text-xs text-green-500">{{ formatTime(scan.pickup_time) }}</p>
          </div>
          <span class="text-green-500 text-xl">✅</span>
        </div>
      </div>
    </div>

    <!-- Estadísticas del día -->
    <div class="grid grid-cols-2 gap-4">
      <div class="p-4 bg-blue-50 rounded-xl text-center">
        <div class="text-2xl font-bold text-blue-600">{{ todayStats.count }}</div>
        <div class="text-sm text-blue-600">Recogidos hoy</div>
      </div>
      <div class="p-4 bg-purple-50 rounded-xl text-center">
        <div class="text-2xl font-bold text-purple-600">{{ todayStats.companies }}</div>
        <div class="text-sm text-purple-600">Empresas</div>
      </div>
    </div>

    <!-- Modal del Scanner MEJORADO -->
    <div v-if="showScanner" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">Scanner QR</h3>
          <button 
            @click="closeScanner"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div class="p-4">
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

          <!-- Scanner activo MEJORADO -->
          <div v-else-if="cameraPermission" class="space-y-4">
            <div class="relative bg-black rounded-lg overflow-hidden">
              <video 
                ref="videoElement"
                autoplay
                muted
                playsinline
                class="w-full h-80 object-cover"
              ></video>
              
              <!-- Marco de escaneo más grande -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="relative">
                  <!-- Marco más grande para mejor escaneo -->
                  <div class="w-56 h-56 border-2 border-green-400 rounded-lg relative bg-transparent">
                    <!-- Esquinas más prominentes -->
                    <div class="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400"></div>
                    <div class="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400"></div>
                    <div class="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400"></div>
                    <div class="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400"></div>
                    
                    <!-- Línea de escaneo animada -->
                    <div class="absolute top-0 left-0 w-full h-1 bg-green-400 animate-pulse opacity-70"></div>
                    <div class="absolute top-1/2 left-0 w-full h-0.5 bg-green-400 animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              <!-- Controles de cámara -->
              <div class="absolute bottom-4 left-4 right-4 flex justify-center space-x-4">
                <button 
                  @click="toggleFlash"
                  class="p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                >
                  <span v-if="flashOn">🔦</span>
                  <span v-else>💡</span>
                </button>
                <button 
                  @click="switchCamera"
                  class="p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                >
                  🔄
                </button>
              </div>
            </div>

            <!-- Instrucciones mejoradas -->
            <div class="text-center space-y-2">
              <p class="text-gray-700 font-medium">
                Enfoca el código QR de la etiqueta
              </p>
              <p class="text-sm text-gray-500">
                Mantén el teléfono a 10-15cm de distancia
              </p>
              <p class="text-xs text-gray-400">
                Si no funciona, usa el código impreso debajo del QR
              </p>
            </div>

            <!-- Estado de escaneo -->
            <div v-if="isScanning" class="text-center">
              <div class="animate-spin text-2xl mb-2">🔄</div>
              <p class="text-sm text-gray-600">Escaneando...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notificación -->
    <div v-if="notification" 
         :class="['fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300', notificationClass]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { apiService } from '../../services/api'

const emit = defineEmits(['package-scanned'])

// Estados
const showScanner = ref(false)
const cameraPermission = ref(false)
const scannerError = ref('')
const isProcessing = ref(false)
const isScanning = ref(false)
const manualCode = ref('')
const recentScans = ref([])
const notification = ref(null)
const todayStats = ref({ count: 0, companies: 0 })
const flashOn = ref(false)
const facingMode = ref('environment') // 'user' para frontal, 'environment' para trasera

// Referencias
const videoElement = ref(null)
let stream = null
let qrDetectionInterval = null

// Computed
const notificationClass = computed(() => {
  if (!notification.value) return ''
  const classes = {
    'success': 'bg-green-500',
    'error': 'bg-red-500',
    'warning': 'bg-yellow-500'
  }
  return classes[notification.value.type] || 'bg-gray-500'
})

// Métodos de cámara mejorados
const requestCameraPermission = async () => {
  try {
    scannerError.value = ''
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    // Configuración mejorada de la cámara
    const constraints = {
      video: {
        facingMode: facingMode.value,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        focusMode: 'continuous',
        exposureMode: 'continuous',
        whiteBalanceMode: 'continuous'
      }
    }
    
    stream = await navigator.mediaDevices.getUserMedia(constraints)
    cameraPermission.value = true
    await nextTick()
    initCamera()
    
  } catch (error) {
    console.error('Error accediendo a la cámara:', error)
    
    if (error.name === 'NotAllowedError') {
      scannerError.value = 'Permiso de cámara denegado. Permite el acceso e intenta de nuevo.'
    } else if (error.name === 'NotFoundError') {
      scannerError.value = 'No se encontró cámara. Usa el ingreso manual.'
    } else {
      scannerError.value = 'Error de cámara. Usa el ingreso manual como alternativa.'
    }
    
    cameraPermission.value = false
  }
}

const initCamera = () => {
  if (videoElement.value && stream) {
    videoElement.value.srcObject = stream
    
    videoElement.value.onloadedmetadata = () => {
      // Configurar calidad de video
      const track = stream.getVideoTracks()[0]
      if (track) {
        const capabilities = track.getCapabilities()
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
          })
        }
      }
      
      startQRDetection()
    }
  }
}

// Simulación de detección QR (en producción usar jsQR)
const startQRDetection = () => {
  if (qrDetectionInterval) {
    clearInterval(qrDetectionInterval)
  }
  
  // Simular detección cada segundo
  qrDetectionInterval = setInterval(() => {
    if (isScanning.value) return
    // Aquí iría la implementación real con jsQR
  }, 1000)
}

const toggleFlash = async () => {
  if (stream) {
    const track = stream.getVideoTracks()[0]
    if (track && track.getCapabilities().torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !flashOn.value }]
        })
        flashOn.value = !flashOn.value
      } catch (error) {
        console.error('Error controlando flash:', error)
      }
    }
  }
}

const switchCamera = async () => {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  await requestCameraPermission()
}

const closeScanner = () => {
  showScanner.value = false
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  if (qrDetectionInterval) {
    clearInterval(qrDetectionInterval)
  }
  cameraPermission.value = false
  flashOn.value = false
}

const processQRCode = async (code) => {
  if (isProcessing.value) return
  
  isProcessing.value = true
  isScanning.value = true
  
  try {
    console.log('Procesando código:', code)
    
    const response = await apiService.pickupScanner.scanPackage(code)
    
    if (response.data.success) {
      const packageData = response.data.package
      
      // Agregar a escaneos recientes
      recentScans.value.unshift(packageData)
      if (recentScans.value.length > 5) {
        recentScans.value = recentScans.value.slice(0, 5)
      }
      
      // Actualizar estadísticas
      loadTodayStats()
      
      // Emitir evento
      emit('package-scanned', packageData)
      
      showNotification(`Pedido ${packageData.order_number} recogido correctamente`, 'success')
      
      // Cerrar scanner y limpiar código manual
      closeScanner()
      manualCode.value = ''
    }
    
  } catch (error) {
    console.error('Error procesando código:', error)
    
    let errorMessage = 'Error al procesar el código'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    showNotification(errorMessage, 'error')
  } finally {
    isProcessing.value = false
    isScanning.value = false
  }
}

const processManualCode = () => {
  const code = manualCode.value.trim()
  if (code) {
    processQRCode(code)
  }
}

const loadTodayStats = async () => {
  try {
    const response = await apiService.pickupScanner.getStats('24h')
    todayStats.value = {
      count: response.data.stats.total_pickups || 0,
      companies: response.data.stats.companies_count || 0
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error)
  }
}

const showNotification = (message, type = 'info') => {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = null
  }, 4000)
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadTodayStats()
})

onBeforeUnmount(() => {
  closeScanner()
})
</script>