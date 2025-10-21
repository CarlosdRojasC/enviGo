<!-- frontend/src/driver/components/PickupScanner.vue - Scanner QR real -->
<template>
  <div class="pickup-scanner p-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Scanner de Recogidas</h1>
      <p class="text-gray-600">
        Escanea los códigos QR para procesar múltiples paquetes rápidamente
      </p>
    </div>

    <!-- Botón principal de escaneo -->
    <div class="text-center mb-8">
      <button 
        @click="startScanning"
        :disabled="isScanning"
        class="w-full py-6 bg-green-600 text-white rounded-2xl text-xl font-semibold hover:bg-green-700 transition-colors shadow-lg disabled:bg-gray-400"
      >
        <span class="text-3xl block mb-2">📱</span>
        {{ isScanning ? 'Escaneando...' : 'Iniciar Scanner QR' }}
      </button>
    </div>

    <!-- Scanner activo -->
    <div v-if="showScanner" class="mb-8">
      <div class="bg-black rounded-2xl overflow-hidden relative">
        <!-- Video feed -->
        <video 
          ref="videoElement"
          autoplay
          muted
          playsinline
          class="w-full h-80 object-cover"
        ></video>
        
        <!-- Canvas para capturar frames (oculto) -->
        <canvas 
          ref="canvasElement"
          class="hidden"
        ></canvas>
        
        <!-- Overlay con marco de escaneo -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="relative">
            <!-- Marco de escaneo grande -->
            <div class="w-64 h-64 border-2 border-green-400 rounded-lg relative bg-transparent">
              <!-- Esquinas animadas -->
              <div class="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-400 animate-pulse"></div>
              <div class="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-400 animate-pulse"></div>
              <div class="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-400 animate-pulse"></div>
              <div class="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-400 animate-pulse"></div>
              
              <!-- Líneas de escaneo -->
              <div class="absolute top-1/4 left-0 w-full h-0.5 bg-green-400 animate-pulse"></div>
              <div class="absolute top-1/2 left-0 w-full h-0.5 bg-green-400 animate-pulse delay-200"></div>
              <div class="absolute top-3/4 left-0 w-full h-0.5 bg-green-400 animate-pulse delay-400"></div>
            </div>
            
            <!-- Instrucciones -->
            <p class="text-white text-center mt-4 font-medium drop-shadow-lg">
              Enfoca el código QR dentro del marco
            </p>
            <p class="text-green-300 text-center text-sm mt-1 drop-shadow-lg">
              Distancia: 15-25cm
            </p>
          </div>
        </div>
        
        <!-- Controles de cámara -->
        <div class="absolute top-4 right-4 flex space-x-2">
          <button 
            @click="toggleFlash"
            class="p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-colors"
            v-if="flashSupported"
          >
            {{ flashOn ? '🔦' : '💡' }}
          </button>
          <button 
            @click="switchCamera"
            class="p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-colors"
          >
            🔄
          </button>
        </div>
        
        <!-- Botón para cerrar -->
        <div class="absolute top-4 left-4">
          <button 
            @click="stopScanning"
            class="p-3 bg-red-600 bg-opacity-80 text-white rounded-full hover:bg-opacity-100 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <!-- Estado de procesamiento -->
        <div v-if="isProcessing" class="absolute bottom-4 left-4 right-4">
          <div class="bg-blue-600 bg-opacity-90 text-white px-4 py-2 rounded-lg text-center">
            <div class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Procesando: {{ currentCode }}
          </div>
        </div>
      </div>
      
      <!-- Instrucciones detalladas -->
      <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 class="font-medium text-blue-900 mb-2">Tips para mejor escaneo:</h4>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• Mantén el teléfono estable a 15-25cm del QR</li>
          <li>• Asegúrate de tener buena iluminación</li>
          <li>• El QR debe estar completamente dentro del marco</li>
          <li>• Si no funciona, usa el flash o cambia de cámara</li>
        </ul>
      </div>
    </div>

    <!-- Entrada manual como backup -->
    <div class="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h3 class="font-medium text-gray-900 mb-3">Backup - Código manual:</h3>
      <div class="flex gap-2">
        <input 
          v-model="manualCode"
          type="text"
          placeholder="Solo si el scanner no funciona"
          class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          @keyup.enter="processManualCode"
          :disabled="isProcessing"
        >
        <button 
          @click="processManualCode"
          :disabled="!manualCode.trim() || isProcessing"
          class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Procesar
        </button>
      </div>
    </div>

    <!-- Resumen de sesión -->
    <div v-if="sessionStats.scanned > 0" class="mb-8 p-4 bg-green-50 rounded-xl border border-green-200">
      <h3 class="font-medium text-green-900 mb-2">Sesión actual:</h3>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-green-600">{{ sessionStats.scanned }}</div>
          <div class="text-sm text-green-600">Escaneados</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-red-600">{{ sessionStats.errors }}</div>
          <div class="text-sm text-red-600">Errores</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-blue-600">{{ sessionStats.rate }}</div>
          <div class="text-sm text-blue-600">paq/min</div>
        </div>
      </div>
    </div>

    <!-- Últimos escaneos -->
    <div v-if="recentScans.length > 0" class="mb-8">
      <h3 class="font-medium text-gray-900 mb-3">Últimos procesados:</h3>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        <div 
          v-for="scan in recentScans" 
          :key="scan.order_id"
          class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div class="flex-1">
            <p class="font-bold text-green-800">{{ scan.order_number }}</p>
            <p class="text-sm text-green-600">{{ scan.customer_name }}</p>
          </div>
          <div class="text-xs text-green-500">
            {{ formatTime(scan.pickup_time) }}
          </div>
          <span class="text-green-500 text-xl ml-2">✅</span>
        </div>
      </div>
    </div>

    <!-- Estadísticas del día -->
    <div class="grid grid-cols-2 gap-4">
      <div class="p-4 bg-blue-50 rounded-xl text-center">
        <div class="text-2xl font-bold text-blue-600">{{ todayStats.count }}</div>
        <div class="text-sm text-blue-600">Total de hoy</div>
      </div>
      <div class="p-4 bg-purple-50 rounded-xl text-center">
        <div class="text-2xl font-bold text-purple-600">{{ todayStats.companies }}</div>
        <div class="text-sm text-purple-600">Empresas</div>
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

// Importar jsQR - necesitarás instalarlo: npm install jsqr
import jsQR from 'jsqr'

const emit = defineEmits(['package-scanned'])

// Estados principales
const showScanner = ref(false)
const isScanning = ref(false)
const isProcessing = ref(false)
const currentCode = ref('')
const manualCode = ref('')
const recentScans = ref([])
const notification = ref(null)

// Estados de cámara
const cameraPermission = ref(false)
const scannerError = ref('')
const flashOn = ref(false)
const flashSupported = ref(false)
const facingMode = ref('environment')

// Estadísticas
const todayStats = ref({ count: 0, companies: 0 })
const sessionStats = ref({ scanned: 0, errors: 0, rate: 0, startTime: null })

// Referencias
const videoElement = ref(null)
const canvasElement = ref(null)
let stream = null
let scanningInterval = null

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

// Métodos principales
const startScanning = async () => {
  try {
    showScanner.value = true
    isScanning.value = true
    sessionStats.value.startTime = Date.now()
    
    await requestCameraPermission()
    
  } catch (error) {
    console.error('Error iniciando scanner:', error)
    showNotification('Error al iniciar la cámara', 'error')
    stopScanning()
  }
}

const stopScanning = () => {
  showScanner.value = false
  isScanning.value = false
  
  // Limpiar recursos
  if (scanningInterval) {
    clearInterval(scanningInterval)
    scanningInterval = null
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  
  cameraPermission.value = false
  flashOn.value = false
}

const requestCameraPermission = async () => {
  try {
    const constraints = {
      video: {
        facingMode: facingMode.value,
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        focusMode: 'continuous'
      }
    }
    
    stream = await navigator.mediaDevices.getUserMedia(constraints)
    cameraPermission.value = true
    
    await nextTick()
    initCamera()
    
  } catch (error) {
    console.error('Error accediendo a la cámara:', error)
    scannerError.value = 'No se pudo acceder a la cámara'
    showNotification('Error de cámara. Usa el ingreso manual.', 'error')
  }
}

const initCamera = () => {
  if (videoElement.value && stream) {
    videoElement.value.srcObject = stream
    
    // Verificar soporte de flash
    const track = stream.getVideoTracks()[0]
    if (track) {
      const capabilities = track.getCapabilities()
      flashSupported.value = !!capabilities.torch
    }
    
    videoElement.value.onloadedmetadata = () => {
      startQRDetection()
    }
  }
}

const startQRDetection = () => {
  if (scanningInterval) clearInterval(scanningInterval)
  
  scanningInterval = setInterval(() => {
    detectQRCode()
  }, 300) // Escanear cada 300ms
}

const detectQRCode = () => {
  if (!videoElement.value || !canvasElement.value || isProcessing.value) return
  
  const video = videoElement.value
  const canvas = canvasElement.value
  const context = canvas.getContext('2d')
  
  // Configurar canvas con el tamaño del video
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  if (canvas.width === 0 || canvas.height === 0) return
  
  // Capturar frame del video
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  // Obtener datos de imagen
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  
  // Detectar QR con jsQR
  const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert"
  })
  
  if (qrCode && qrCode.data) {
    console.log('QR detectado:', qrCode.data)
    processQRCode(qrCode.data)
  }
}

const processQRCode = async (code) => {
  if (isProcessing.value) return
  
  // Validar código
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return
  }
  
  const cleanCode = code.trim()
  currentCode.value = cleanCode
  isProcessing.value = true
  
  try {
    console.log('Procesando QR:', cleanCode)
    
    const response = await apiService.pickupScanner.scanPackage(cleanCode)
    
    if (response.data.success) {
      const packageData = response.data.package
      
      // Actualizar estadísticas de sesión
      sessionStats.value.scanned++
      updateSessionRate()
      
      // Agregar a escaneos recientes
      recentScans.value.unshift(packageData)
      if (recentScans.value.length > 10) {
        recentScans.value = recentScans.value.slice(0, 10)
      }
      
      // Actualizar estadísticas
      loadTodayStats()
      
      // Emitir evento
      emit('package-scanned', packageData)
      
      showNotification(`${packageData.order_number} - ${packageData.customer_name}`, 'success')
      
      // Breve pausa antes de continuar escaneando
      setTimeout(() => {
        currentCode.value = ''
        isProcessing.value = false
      }, 1500)
      
    }
    
  } catch (error) {
    console.error('Error procesando QR:', error)
    
    sessionStats.value.errors++
    
    let errorMessage = 'Error al procesar'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    showNotification(errorMessage, 'error')
    
    setTimeout(() => {
      currentCode.value = ''
      isProcessing.value = false
    }, 2000)
  }
}

const processManualCode = () => {
  const code = manualCode.value.trim()
  if (code) {
    processQRCode(code)
    manualCode.value = ''
  }
}

const toggleFlash = async () => {
  if (stream && flashSupported.value) {
    const track = stream.getVideoTracks()[0]
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

const switchCamera = async () => {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
  await requestCameraPermission()
}

const updateSessionRate = () => {
  if (sessionStats.value.startTime) {
    const minutes = (Date.now() - sessionStats.value.startTime) / 60000
    sessionStats.value.rate = minutes > 0 ? Math.round(sessionStats.value.scanned / minutes) : 0
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
  }, 3000)
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
  stopScanning()
})
</script>