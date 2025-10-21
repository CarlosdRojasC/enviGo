<!-- frontend/src/driver/components/PickupScanner.vue - Scanner QR con sonidos -->
<template>
  <div class="pickup-scanner p-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Scanner de Recogidas</h1>
      <p class="text-gray-600">
        Escanea los códigos QR para procesar múltiples paquetes rápidamente
      </p>
    </div>

    <!-- 🔊 Control de Sonido -->
    <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-blue-800">Sonidos de confirmación:</span>
        <button 
          @click="toggleSound"
          :class="['px-3 py-1 rounded-full text-sm font-medium transition-colors', 
                   soundEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700']"
        >
          <span class="mr-1">{{ soundEnabled ? '🔊' : '🔇' }}</span>
          {{ soundEnabled ? 'Activado' : 'Silenciado' }}
        </button>
      </div>
      <p class="text-xs text-blue-600 mt-1">
        {{ soundEnabled ? 'Escucharás un "beep" cuando se escanee exitosamente' : 'Los sonidos están desactivados' }}
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
        
        <!-- Estado de procesamiento con efecto visual -->
        <div v-if="isProcessing" class="absolute bottom-4 left-4 right-4">
          <div :class="['text-white px-4 py-2 rounded-lg text-center transition-all duration-300',
                       processingSuccess ? 'bg-green-600 bg-opacity-90' : 'bg-blue-600 bg-opacity-90']">
            <div v-if="!processingSuccess" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            <span v-if="processingSuccess" class="text-2xl mr-2">✅</span>
            {{ processingSuccess ? '¡Procesado!' : `Procesando: ${currentCode}` }}
          </div>
        </div>

        <!-- 🎯 Indicador visual de escaneo exitoso -->
        <div v-if="scanSuccess" class="absolute inset-0 bg-green-500 bg-opacity-30 flex items-center justify-center pointer-events-none">
          <div class="text-white text-6xl animate-bounce">✅</div>
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
          <li v-if="soundEnabled">• 🔊 Escucharás un "beep" al escanear exitosamente</li>
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

    <!-- 🔊 Elementos de audio (ocultos) -->
    <audio ref="successSound" preload="auto">
      <source :src="successSoundUrl" type="audio/mpeg">
      <source :src="successSoundUrlOgg" type="audio/ogg">
    </audio>
    
    <audio ref="errorSound" preload="auto">
      <source :src="errorSoundUrl" type="audio/mpeg">
      <source :src="errorSoundUrlOgg" type="audio/ogg">
    </audio>

    <!-- Notificación -->
    <div v-if="notification" 
         :class="['fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300', notificationClass]">
      <span v-if="notification.type === 'success'" class="mr-2">🔊</span>
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
const processingSuccess = ref(false)
const scanSuccess = ref(false)
const currentCode = ref('')
const manualCode = ref('')
const recentScans = ref([])
const notification = ref(null)

// 🔊 Estados de audio
const soundEnabled = ref(true)
const successSound = ref(null)
const errorSound = ref(null)

// URLs de sonidos (puedes usar sonidos en línea o locales)
const successSoundUrl = ref('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCDuFyfDdiyAEG3LN9+WCRA') // Sonido de éxito simple
const successSoundUrlOgg = ref('data:audio/ogg;base64,T2dnUwACAAAAAAAAAADqnjMlAAAAALvDuUsBHgF2b3JiaXMAAAAAAUAfAABAHwAAQB8AABAAAABfAQ==') // Fallback OGG

const errorSoundUrl = ref('data:audio/wav;base64,UklGRj4DAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRoDAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj') // Sonido de error
const errorSoundUrlOgg = ref('data:audio/ogg;base64,T2dnUwACAAAAAAAAAADqnjMlAAAAABYbR8sBHgF2b3JiaXMAAAAAAUAfAABAHwAAQB8AAEAfAAA=') // Fallback OGG error

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

// 🔊 Métodos de audio
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  localStorage.setItem('scanner_sound_enabled', soundEnabled.value.toString())
  
  if (soundEnabled.value) {
    showNotification('Sonidos activados 🔊', 'success')
    playSuccessSound() // Sonido de prueba
  } else {
    showNotification('Sonidos desactivados 🔇', 'warning')
  }
}

const playSuccessSound = () => {
  if (!soundEnabled.value) return
  
  try {
    // Intentar reproducir el sonido nativo del navegador
    playBeepSound()
    
    // Fallback: usar el elemento audio
    if (successSound.value) {
      successSound.value.currentTime = 0
      successSound.value.play().catch(console.warn)
    }
  } catch (error) {
    console.warn('No se pudo reproducir sonido de éxito:', error)
  }
}

const playErrorSound = () => {
  if (!soundEnabled.value) return
  
  try {
    // Sonido de error más grave
    playBeepSound(400, 200) // Frecuencia más baja, duración más corta
    
    // Fallback: usar el elemento audio
    if (errorSound.value) {
      errorSound.value.currentTime = 0
      errorSound.value.play().catch(console.warn)
    }
  } catch (error) {
    console.warn('No se pudo reproducir sonido de error:', error)
  }
}

const playBeepSound = (frequency = 800, duration = 200) => {
  try {
    // Crear contexto de audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Crear oscilador
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Configurar sonido
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    
    // Configurar volumen con fade out
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)
    
    // Reproducir
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration / 1000)
    
  } catch (error) {
    console.warn('No se pudo generar beep:', error)
  }
}

// Métodos principales (sin cambios en la lógica, solo agregar sonidos)
const startScanning = async () => {
  try {
    showScanner.value = true
    isScanning.value = true
    sessionStats.value.startTime = Date.now()
    
    await requestCameraPermission()
    
  } catch (error) {
    console.error('Error iniciando scanner:', error)
    showNotification('Error al iniciar la cámara', 'error')
    playErrorSound()
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
    playErrorSound()
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
  if (!code || typeof code !== 'string' || code.trim() === '') return

  let cleanCode = code.trim()
  currentCode.value = cleanCode
  isProcessing.value = true
  processingSuccess.value = false

  try {
    console.log('📦 Procesando QR escaneado:', cleanCode)

    // 🔍 1️⃣ Intentar detectar si es JSON (Mercado Libre)
    let parsed
    try {
      parsed = JSON.parse(cleanCode)
    } catch (e) {
      parsed = null
    }

    // Si es un QR JSON de Mercado Libre, usar el campo "id" como código
    if (parsed && parsed.id) {
      console.log('🟡 QR de Mercado Libre detectado:', parsed)
      cleanCode = parsed.id.toString()
    }

    // 2️⃣ Llamar al backend (buscar por order_number, external_order_id o ml_shipping_id)
    const response = await apiService.pickupScanner.scanPackage(cleanCode)

    if (response.data.success) {
      const packageData = response.data.package

      // 🎉 Éxito visual y sonoro
      processingSuccess.value = true
      scanSuccess.value = true
      playSuccessSound()

      sessionStats.value.scanned++
      updateSessionRate()

      recentScans.value.unshift(packageData)
      if (recentScans.value.length > 10) recentScans.value = recentScans.value.slice(0, 10)

      loadTodayStats()
      emit('package-scanned', packageData)

      showNotification(`✅ ${packageData.order_number} - ${packageData.customer_name}`, 'success')

      setTimeout(() => (scanSuccess.value = false), 1000)
      setTimeout(() => {
        currentCode.value = ''
        isProcessing.value = false
        processingSuccess.value = false
      }, 1500)
    } else {
      throw new Error(response.data.error || 'Error desconocido')
    }

  } catch (error) {
    console.error('❌ Error procesando QR:', error)
    playErrorSound()

    sessionStats.value.errors++
    const errorMessage = error.response?.data?.error || error.message || 'Error al procesar'

    showNotification(`❌ ${errorMessage}`, 'error')

    setTimeout(() => {
      currentCode.value = ''
      isProcessing.value = false
      processingSuccess.value = false
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
  
  // 🔊 Cargar preferencia de sonido del localStorage
  const savedSoundPreference = localStorage.getItem('scanner_sound_enabled')
  if (savedSoundPreference !== null) {
    soundEnabled.value = savedSoundPreference === 'true'
  }
})

onBeforeUnmount(() => {
  stopScanning()
})
</script>