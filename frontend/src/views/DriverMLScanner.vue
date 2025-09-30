<template>
  
  <div class="ml-scanner-container">
    
    <!-- ==================== HEADER DEL SCANNER ==================== -->
    <div v-if="!isAccessGranted" class="access-screen">
      <div class="access-card">
        <div class="access-header">
          <h1>📦 Scanner ML - enviGo</h1>
          <p>Acceso para Repartidores</p>
        </div>
        
        <div class="access-form">
          <h2>🔐 Ingresa la contraseña</h2>
          
          <div class="input-group">
            <label>Contraseña del Scanner:</label>
            <input 
              v-model="accessPassword"
              type="password" 
              placeholder="Contraseña del día"
              class="access-input"
              @keyup.enter="verifyAccess"
              autofocus
            />
          </div>
          
          <button 
            @click="verifyAccess" 
            :disabled="!accessPassword || isVerifyingAccess"
            class="access-button"
          >
            <span v-if="!isVerifyingAccess">🔓 Acceder al Scanner</span>
            <span v-else>⏳ Verificando...</span>
          </button>
          
          <div class="access-help">
            <p>💡 <strong>Contacta a tu supervisor</strong> para obtener la contraseña del día</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SCANNER PRINCIPAL (SOLO SI TIENE ACCESO) ==================== -->
    <div v-if="isAccessGranted">
      
      <!-- Agregar botón de logout al header existente -->
      <div class="scanner-header">
        <div class="header-content">
          <div class="logo-section">
            <h1>📦 Scanner ML - enviGo</h1>
            <p>Escanea etiquetas de MercadoLibre</p>
          </div>
          <div class="header-actions">
            <div class="session-info" v-if="selectedClient">
              <span class="client-name">{{ selectedClient.name }}</span>
              <span class="scan-count">{{ scannedOrders.length }} escaneados</span>
            </div>
            <button @click="logout" class="logout-button">
              🚪 Salir
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== PASO 1: SELECCIÓN DE CLIENTE ==================== -->
      <div v-if="!selectedClient" class="client-selection">
        <div class="selection-card">
          <h2>🏢 Seleccionar Cliente</h2>
          <p>Elige para qué cliente vas a recolectar paquetes:</p>
          
          <!-- Buscador de Clientes -->
          <div class="search-container">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input 
                v-model="clientSearch" 
                @input="filterClients"
                type="text" 
                placeholder="Buscar cliente por nombre o email..." 
                class="client-search"
                autofocus
              />
              <button 
                v-if="clientSearch" 
                @click="clearSearch" 
                class="clear-search"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Lista de Clientes -->
          <div class="clients-list">
            <div 
              v-for="client in filteredClients" 
              :key="client.id"
              @click="selectClient(client)"
              class="client-card"
              :class="{ 'client-hover': true }"
            >
              <div class="client-avatar">
                {{ client.name.charAt(0).toUpperCase() }}
              </div>
              <div class="client-info">
                <h3>{{ client.name }}</h3>
                <p>{{ client.email }}</p>
                <div class="client-meta">
                  <span class="client-type">{{ client.type || 'Cliente' }}</span>
                  <span v-if="client.phone" class="client-phone">📞 {{ client.phone }}</span>
                </div>
              </div>
              <div class="client-arrow">
                <span>➜</span>
              </div>
            </div>

            <!-- Estado vacío -->
            <div v-if="filteredClients.length === 0" class="empty-clients">
              <div class="empty-icon">🔍</div>
              <h3>No se encontraron clientes</h3>
              <p v-if="clientSearch">
                No hay clientes que coincidan con "{{ clientSearch }}"
              </p>
              <p v-else>
                No tienes clientes registrados aún.
              </p>
            </div>
          </div>

          <!-- Loading clientes -->
          <div v-if="loadingClients" class="loading-clients">
            <div class="spinner-small"></div>
            <span>Cargando clientes...</span>
          </div>
        </div>
      </div>

      <!-- ==================== PASO 2: INTERFACE DE SCANNER ==================== -->
      <div v-if="selectedClient && !showResults" class="scanner-interface">
        
        <!-- Barra de Acciones -->
        <div class="action-bar">
          <button @click="changeClient" class="btn-secondary">
            ⬅️ Cambiar Cliente
          </button>
          <div class="action-center">
            <span class="current-client">
              <strong>Cliente:</strong> {{ selectedClient.name }}
            </span>
          </div>
          <button 
            @click="showResultsList" 
            class="btn-info"
            :disabled="scannedOrders.length === 0"
          >
            📋 Ver Resultados ({{ scannedOrders.length }})
          </button>
        </div>

        <!-- Área Principal del Scanner -->
        <div class="scanner-main-area">
          
          <!-- Card del Scanner -->
          <div class="scanner-card">
            <div class="scanner-header-card">
              <h3>📸 Capturar Etiqueta Completa</h3>
              <p>Toma una foto de toda la etiqueta de MercadoLibre</p>
            </div>
            
            <!-- Área de captura tipo CamScanner -->
            <div class="capture-container">
              <div class="capture-area">
                
                <!-- Video para vista previa -->
                <video 
                  ref="videoElement" 
                  class="capture-video" 
                  autoplay 
                  playsinline
                  muted
                  v-show="isScanning"
                ></video>
                
                <!-- Overlay para guiar la captura -->
                <div class="capture-overlay" v-show="isScanning">
                  <div class="capture-frame">
                    <div class="frame-corners">
                      <div class="corner top-left"></div>
                      <div class="corner top-right"></div>
                      <div class="corner bottom-left"></div>
                      <div class="corner bottom-right"></div>
                    </div>
                    <div class="capture-instructions">
                      <p>📦 Coloca la etiqueta dentro del marco</p>
                      <p>Asegúrate que se vea completa y legible</p>
                    </div>
                  </div>
                </div>

                <!-- Imagen capturada para revisión -->
                <div v-if="capturedImage" class="captured-preview">
                  <img :src="capturedImage" alt="Etiqueta capturada" class="preview-image" />
                  <div class="preview-actions">
                    <button @click="retakePhoto" class="btn-secondary">
                      🔄 Tomar otra
                    </button>
                    <button @click="processCapturedImage" class="btn-primary" :disabled="isProcessing">
                      <span v-if="!isProcessing">✨ Procesar Etiqueta</span>
                      <span v-else>⏳ Extrayendo datos...</span>
                    </button>
                  </div>
                </div>

                <!-- Mensaje cuando no hay cámara -->
                <div v-if="!isScanning && !capturedImage" class="no-camera-message">
                  <div class="camera-icon">📷</div>
                  <p>Presiona "Iniciar Cámara" para comenzar</p>
                </div>
              </div>
            </div>

            <!-- Controles de captura -->
            <div class="capture-controls">
              <button 
                @click="startCamera" 
                v-if="!isScanning && !capturedImage"
                class="btn-primary capture-btn"
              >
                📷 Iniciar Cámara
              </button>
              
              <div v-if="isScanning" class="camera-actions">
                <button @click="capturePhoto" class="btn-capture">
                  📸 Capturar
                </button>
                <button @click="stopCamera" class="btn-secondary">
                  🛑 Cancelar
                </button>
              </div>
            </div>
          </div>
          <!-- FIN scanner-card -->

          <!-- Sidebar con información -->
          <div class="scanner-sidebar">
            
            <!-- Último Código Escaneado -->
            <div v-if="lastScanned" class="last-scanned-card">
              <h3>✅ Último Escaneado</h3>
              <div class="scanned-details">
                <div class="barcode-display">
                  <span class="barcode-label">Código:</span>
                  <code class="barcode-value">{{ lastScanned.barcode }}</code>
                </div>
                <div class="status-display">
                  <span class="status-badge" :class="lastScanned.status">
                    {{ getStatusText(lastScanned.status) }}
                  </span>
                </div>
                <div class="timestamp-display">
                  {{ formatTime(lastScanned.timestamp) }}
                </div>
              </div>
            </div>

            <!-- Estadísticas de la Sesión -->
            <div class="session-stats-card">
              <h3>📊 Sesión Actual</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-number">{{ scannedOrders.length }}</span>
                  <span class="stat-label">Total</span>
                </div>
                <div class="stat-item success">
                  <span class="stat-number">{{ getStatusCount('created') }}</span>
                  <span class="stat-label">Creados</span>
                </div>
                <div class="stat-item warning">
                  <span class="stat-number">{{ getStatusCount('duplicate') }}</span>
                  <span class="stat-label">Duplicados</span>
                </div>
                <div class="stat-item error">
                  <span class="stat-number">{{ getStatusCount('invalid') }}</span>
                  <span class="stat-label">Inválidos</span>
                </div>
              </div>
            </div>

            <!-- Tips de Uso -->
            <div class="tips-card">
              <h3>💡 Tips</h3>
              <ul class="tips-list">
                <li>Mantén el código bien iluminado</li>
                <li>Asegúrate que esté enfocado</li>
                <li>Evita reflejos en la etiqueta</li>
                <li>Mantén el teléfono estable</li>
              </ul>
            </div>
          </div>
          <!-- FIN scanner-sidebar -->
        </div>
        <!-- FIN scanner-main-area -->
      </div>
      <!-- FIN scanner-interface -->

      <!-- ==================== PASO 3: VISTA DE RESULTADOS ==================== -->
      <div v-if="showResults" class="results-view">
        
        <!-- Header de Resultados -->
        <div class="results-header">
          <button @click="backToScanner" class="btn-secondary">
            ⬅️ Seguir Escaneando
          </button>
          <div class="results-title-section">
            <h2>📋 Pedidos Escaneados</h2>
            <span class="results-count">{{ scannedOrders.length }} códigos procesados</span>
          </div>
          <button 
            @click="finalizeSession" 
            class="btn-success"
            :disabled="getStatusCount('created') === 0"
          >
            ✅ Finalizar Sesión
          </button>
        </div>

        <!-- Resumen de la Sesión -->
        <div class="session-summary">
          <div class="summary-card">
            <h3>📈 Resumen de la Sesión</h3>
            <div class="summary-stats">
              <div class="summary-item total">
                <span class="number">{{ scannedOrders.length }}</span>
                <span class="label">Códigos Escaneados</span>
              </div>
              <div class="summary-item success">
                <span class="number">{{ getStatusCount('created') }}</span>
                <span class="label">Pedidos Creados</span>
              </div>
              <div class="summary-item warning">
                <span class="number">{{ getStatusCount('duplicate') }}</span>
                <span class="label">Duplicados</span>
              </div>
              <div class="summary-item error">
                <span class="number">{{ getStatusCount('invalid') }}</span>
                <span class="label">Inválidos</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de Resultados -->
        <div class="results-list">
          <div 
            v-for="(order, index) in scannedOrders" 
            :key="order.barcode"
            class="result-card"
            :class="order.status"
          >
            <div class="result-index">
              {{ scannedOrders.length - index }}
            </div>
            <div class="result-content">
              <div class="result-main">
                <div class="barcode-info">
                  <code class="result-barcode">{{ order.barcode }}</code>
                  <span class="result-timestamp">{{ formatTime(order.timestamp) }}</span>
                </div>
                <div class="result-status">
                  <span class="status-badge" :class="order.status">
                    {{ getStatusText(order.status) }}
                  </span>
                </div>
              </div>
              <div v-if="order.order_id && order.status === 'created'" class="result-actions">
                <button 
                  @click="viewOrder(order.order_id)" 
                  class="btn-view-order"
                >
                  👁️ Ver Pedido
                </button>
              </div>
            </div>
          </div>

          <!-- Estado vacío -->
          <div v-if="scannedOrders.length === 0" class="empty-results">
            <div class="empty-icon">📦</div>
            <h3>No hay códigos escaneados</h3>
            <p>Los códigos que escanees aparecerán aquí</p>
          </div>
        </div>
      </div>
      <!-- FIN results-view -->
    </div>
    <!-- FIN isAccessGranted -->

    <!-- ==================== OVERLAY DE LOADING ==================== -->
    <div v-if="isProcessing" class="loading-overlay">
      <div class="loading-card">
        <div class="loading-content">
          <div class="spinner"></div>
          <h3>Procesando código...</h3>
          <p>Analizando imagen y creando pedido</p>
          <div class="loading-progress">
            <div class="progress-bar"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== NOTIFICACIONES TOAST ==================== -->
    <div class="toast-container">
      <!-- Los toasts se manejan por el servicio de toast -->
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { scannerService } from '../services/scanner.service'
import { useToast } from 'vue-toastification';

export default {
  name: 'MLScanner',
  setup() {
    const router = useRouter()
    const toast = useToast();

    // ==================== NUEVAS VARIABLES DE ACCESO ====================

    const isAccessGranted = ref(false)
    const accessPassword = ref('')
    const isVerifyingAccess = ref(false)

    // ==================== REFS REACTIVOS ====================
    
    // Estado general
    const isInitialized = ref(false)
    const isProcessing = ref(false)
    const loadingClients = ref(false)


// Imagen capturada
const capturedImage = ref(null)

    // Clientes
    const clients = ref([])
    const filteredClients = ref([])
    const clientSearch = ref('')
    const selectedClient = ref(null)
    
    // Scanner
    const isScanning = ref(false)
    const videoElement = ref(null)
    const fileInput = ref(null)
    let scannerInterval = null
    let mediaStream = null
    
    // Pedidos escaneados
    const scannedOrders = ref([])
    const lastScanned = ref(null)
    const showResults = ref(false)

    // ==================== COMPUTED PROPERTIES ====================
    
    const sessionStats = computed(() => ({
      total: scannedOrders.value.length,
      created: scannedOrders.value.filter(o => o.status === 'created').length,
      duplicates: scannedOrders.value.filter(o => o.status === 'duplicate').length,
      invalid: scannedOrders.value.filter(o => o.status === 'invalid').length
    }))

    const canFinalize = computed(() => 
      sessionStats.value.created > 0
    )

    // ==================== MÉTODOS PRINCIPALES ====================

    /**
     * Inicializar el scanner al montar el componente
     */
    async function initializeScanner() {
      try {
        console.log('🚀 Inicializando ML Scanner...')
        isInitialized.value = false
        await loadClients()
        isInitialized.value = true
        toast.success('Scanner ML iniciado correctamente')

      } catch (error) {
        console.error('❌ Error inicializando scanner:', error)
        toast.error('Error inicializando el scanner')
      }
    }

    /**
     * Cargar lista de clientes disponibles
     */
    async function loadClients() {
      try {
        loadingClients.value = true
        console.log('📋 Cargando clientes...')

        const response = await scannerService.getCompanyClients()
        
        if (response.data.success) {
          clients.value = response.data.data || []
          filteredClients.value = clients.value
          
          console.log(`✅ ${clients.value.length} clientes cargados`)
          
          if (clients.value.length === 0) {
            toast.warning('No hay clientes registrados')
          }
        } else {
          throw new Error(response.data.message || 'Error cargando clientes')
        }

      } catch (error) {
        console.error('❌ Error cargando clientes:', error)
        toast.error('Error cargando lista de clientes')
        clients.value = []
        filteredClients.value = []
      } finally {
        loadingClients.value = false
      }
    }
    

    // ==================== GESTIÓN DE CLIENTES ====================

    /**
     * Filtrar clientes por búsqueda
     */
    function filterClients() {
      const search = clientSearch.value.toLowerCase().trim()
      
      if (!search) {
        filteredClients.value = clients.value
        return
      }

      filteredClients.value = clients.value.filter(client => 
        client.name.toLowerCase().includes(search) ||
        client.email.toLowerCase().includes(search) ||
        (client.phone && client.phone.includes(search))
      )

      console.log(`🔍 Filtro "${search}": ${filteredClients.value.length} resultados`)
    }

    /**
     * Limpiar búsqueda de clientes
     */
    function clearSearch() {
      clientSearch.value = ''
      filteredClients.value = clients.value
    }

    /**
     * Seleccionar cliente para escanear
     */
    function selectClient(client) {
      selectedClient.value = client
      console.log('👤 Cliente seleccionado:', client.name)
      toast.success(`Cliente seleccionado: ${client.name}`)
      
      // Reset de estado de escaneo
      scannedOrders.value = []
      lastScanned.value = null
      showResults.value = false
    }

    /**
     * Cambiar cliente (volver a la selección)
     */
    function changeClient() {
      // Confirmar si hay órdenes escaneadas
      if (scannedOrders.value.length > 0) {
        const confirm = window.confirm(
          `¿Estás seguro? Tienes ${scannedOrders.value.length} códigos escaneados que se perderán.`
        )
        if (!confirm) return
      }

      // Reset completo
      selectedClient.value = null
      scannedOrders.value = []
      lastScanned.value = null
      showResults.value = false
      stopScanning()
      
      toast.info('Selecciona un nuevo cliente')
    }
// ==================== NUEVOS MÉTODOS DE ACCESO ====================

    /**
     * Verificar contraseña de acceso
     */
    async function verifyAccess() {
      try {
        isVerifyingAccess.value = true
        
        // Por ahora, contraseña hardcodeada (luego la haremos dinámica)
        const correctPassword = 'envigo2025'
        
        if (accessPassword.value === correctPassword) {
          isAccessGranted.value = true
          localStorage.setItem('scanner_access', 'granted')
          toast.success('¡Acceso concedido! Bienvenido al scanner')
          await initializeScanner()
        } else {
          toast.error('Contraseña incorrecta')
          accessPassword.value = ''
        }
        
      } catch (error) {
        console.error('❌ Error verificando acceso:', error)
        toast.error('Error verificando acceso')
      } finally {
        isVerifyingAccess.value = false
      }
    }

    /**
     * Verificar si ya tiene acceso guardado
     */
    function checkExistingAccess() {
      const savedAccess = localStorage.getItem('scanner_access')
      if (savedAccess === 'granted') {
        isAccessGranted.value = true
        console.log('✅ Acceso previamente concedido')
        return true
      }
      return false
    }

    /**
     * Cerrar sesión del scanner
     */
    function logout() {
      isAccessGranted.value = false
      accessPassword.value = ''
      localStorage.removeItem('scanner_access')
      
      // Reset del estado del scanner
      selectedClient.value = null
      scannedOrders.value = []
      lastScanned.value = null
      showResults.value = false
      stopScanning()
      
      toast.info('Has salido del scanner')
    }
    // ==================== FUNCIONALIDAD DEL SCANNER ====================

    /**
     * Iniciar la cámara para escanear
     */
 /**
 * Iniciar cámara para captura (no para scanning continuo)
 */
async function startCamera() {
  try {
    console.log('📷 Iniciando cámara para captura...')
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1440, min: 480 } // Mejor resolución para OCR
      } 
    })
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      mediaStream = stream
      isScanning.value = true
      toast.success('📷 Cámara lista - Coloca la etiqueta en el marco')
    }

  } catch (error) {
    console.error('❌ Error accediendo a la cámara:', error)
    toast.error('No se pudo acceder a la cámara')
  }
}

/**
 * Capturar foto de la etiqueta
 */
function capturePhoto() {
  try {
    if (!videoElement.value || !isScanning.value) return

    // Crear canvas para capturar
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    // Configurar tamaño del canvas
    const videoWidth = videoElement.value.videoWidth
    const videoHeight = videoElement.value.videoHeight
    
    canvas.width = videoWidth
    canvas.height = videoHeight
    
    // Dibujar frame actual
    context.drawImage(videoElement.value, 0, 0, videoWidth, videoHeight)
    
    // Convertir a imagen base64
    capturedImage.value = canvas.toDataURL('image/jpeg', 0.9)
    
    // Detener cámara después de capturar
    stopCamera()
    
    toast.success('📸 Etiqueta capturada - Revisa y procesa')
    
  } catch (error) {
    console.error('❌ Error capturando foto:', error)
    toast.error('Error capturando la foto')
  }
}

/**
 * Detener cámara
 */
function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  
  if (videoElement.value) {
    videoElement.value.srcObject = null
  }
  
  isScanning.value = false
}

/**
 * Tomar otra foto (reset)
 */
function retakePhoto() {
  capturedImage.value = null
  toast.info('Toma una nueva foto de la etiqueta')
}
    /**
     * Capturar frame del video y analizar
     */
    async function captureAndAnalyzeFrame() {
      try {
        if (!videoElement.value || !isScanning.value || isProcessing.value) return

        // Crear canvas para capturar frame
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        // Configurar dimensiones
        const videoWidth = videoElement.value.videoWidth
        const videoHeight = videoElement.value.videoHeight
        
        if (videoWidth === 0 || videoHeight === 0) return
        
        canvas.width = videoWidth
        canvas.height = videoHeight
        
        // Dibujar frame actual
        context.drawImage(videoElement.value, 0, 0, videoWidth, videoHeight)
        
        // Convertir a blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            await processImage(blob)
          }
        }, 'image/jpeg', 0.8)
        
      } catch (error) {
        console.error('❌ Error capturando frame:', error)
      }
    }

    /**
     * Procesar imagen subida manualmente
     */
    async function processImageUpload(event) {
      const file = event.target.files[0]
      
      if (!file) return
      
      console.log('📁 Procesando imagen subida:', file.name)
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen válida')
        return
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen es muy grande (máximo 5MB)')
        return
      }
      
      await processImage(file)
      
      // Limpiar input
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }
/**
 * Procesar imagen capturada con OCR
 */
async function processCapturedImage() {
  if (!capturedImage.value) return

  try {
    isProcessing.value = true
    console.log('🔄 Procesando etiqueta con OCR...')

    // Convertir base64 a blob
    const response = await fetch(capturedImage.value)
    const blob = await response.blob()

    // Crear FormData
    const formData = new FormData()
    formData.append('image', blob, 'etiqueta-ml.jpg')
    formData.append('client_id', selectedClient.value.id)

    // Enviar al backend para OCR
    const result = await scannerService.processMLLabel(formData)
    
    if (result.data.success) {
      const extractedData = result.data.data
      
      // Crear objeto de orden escaneada
      const scannedOrder = {
        shipping_number: extractedData.shipping_number,
        status: extractedData.status,
        order_id: extractedData.order_id || null,
        timestamp: new Date(),
        client_name: selectedClient.value.name,
        client_id: selectedClient.value.id,
        extracted_data: extractedData
      }
      
      // Agregar a la lista
      scannedOrders.value.unshift(scannedOrder)
      lastScanned.value = scannedOrder
      
      // Feedback según el resultado
      if (extractedData.status === 'created') {
        toast.success(`✅ Pedido creado: ${extractedData.customer_name} - ${extractedData.commune}`)
      } else if (extractedData.status === 'duplicate') {
        toast.warning(`⚠️ Envío ya existe: ${extractedData.shipping_number}`)
      } else if (extractedData.status === 'invalid') {
        toast.error(`❌ No se pudo extraer información válida`)
      }
      
      // Reset para siguiente captura
      capturedImage.value = null
      
    } else {
      toast.error(result.data.message || 'Error procesando etiqueta')
    }
    
  } catch (error) {
    console.error('❌ Error procesando etiqueta:', error)
    toast.error('Error procesando la etiqueta')
  } finally {
    isProcessing.value = false
  }
}
    /**
     * Procesar imagen (capturada o subida)
     */
    async function processImage(imageBlob) {
      if (isProcessing.value) {
        console.log('⏳ Ya hay un procesamiento en curso')
        return
      }

      try {
        isProcessing.value = true
        console.log('🔄 Procesando imagen...')

        // Crear FormData
        const formData = new FormData()
        formData.append('image', imageBlob, 'barcode-scan.jpg')
        formData.append('client_id', selectedClient.value.id)

        // Enviar al backend
        const response = await scannerService.processMLBarcode(formData)
        
        console.log('📊 Respuesta del scanner:', response.data)

        if (response.data.success) {
          const scanResult = response.data.data
          
          // Crear objeto de orden escaneada
          const scannedOrder = {
            barcode: scanResult.barcode,
            status: scanResult.status,
            order_id: scanResult.order_id || null,
            timestamp: new Date(),
            client_name: selectedClient.value.name,
            client_id: selectedClient.value.id
          }
          
          // Agregar a la lista (más reciente primero)
          scannedOrders.value.unshift(scannedOrder)
          lastScanned.value = scannedOrder
          
          // Feedback según el estado
          handleScanResult(scanResult)
          
        } else {
          console.error('❌ Error del scanner:', response.data.message)
          toast.error(response.data.message || 'Error procesando código de barras')
        }
        
      } catch (error) {
        console.error('❌ Error procesando imagen:', error)
        
        let errorMessage = 'Error procesando código de barras'
        
        if (error.response?.status === 413) {
          errorMessage = 'Imagen muy grande'
        } else if (error.response?.status === 415) {
          errorMessage = 'Formato de imagen no soportado'
        }
        
        toast.error(errorMessage)
      } finally {
        isProcessing.value = false
      }
    }

    /**
     * Manejar resultado del escaneo
     */
    function handleScanResult(scanResult) {
      const { barcode, status } = scanResult
      
      switch (status) {
        case 'created':
          toast.success(`✅ Pedido creado: ${barcode}`)
          // Parar scanning automáticamente para evitar duplicados
          if (isScanning.value) {
            setTimeout(() => {
              // Pequeña pausa antes de seguir escaneando
            }, 2000)
          }
          break
          
        case 'duplicate':
          toast.warning(`⚠️ Código ya existe: ${barcode}`)
          break
          
        case 'invalid':
          toast.error(`❌ Código inválido: ${barcode}`)
          break
          
        default:
          toast.info(`ℹ️ Código procesado: ${barcode}`)
      }
    }

    // ==================== GESTIÓN DE RESULTADOS ====================

    /**
     * Mostrar vista de resultados
     */
    function showResultsList() {
      if (scannedOrders.value.length === 0) {
        toast.warning('No hay códigos escaneados para mostrar')
        return
      }
      
      showResults.value = true
      stopScanning()
      console.log('📋 Mostrando resultados:', scannedOrders.value.length)
    }

    /**
     * Volver al scanner desde resultados
     */
    function backToScanner() {
      showResults.value = false
      console.log('📱 Volviendo al scanner')
    }

    /**
     * Finalizar sesión y guardar resultados
     */
    async function finalizeSession() {
      try {
        if (!canFinalize.value) {
          toast.error('No hay pedidos creados para finalizar')
          return
        }

        const confirm = window.confirm(
          `¿Finalizar sesión?\n\n` +
          `• ${sessionStats.value.created} pedidos creados\n` +
          `• ${sessionStats.value.duplicates} duplicados\n` +
          `• ${sessionStats.value.invalid} inválidos\n\n` +
          `Los pedidos creados se guardarán en el sistema.`
        )
        
        if (!confirm) return

        console.log('✅ Finalizando sesión...')
        isProcessing.value = true

        // Preparar datos de la sesión
        const sessionData = {
          client_id: selectedClient.value.id,
          client_name: selectedClient.value.name,
          scanned_orders: scannedOrders.value,
          session_summary: {
            total_scanned: sessionStats.value.total,
            created: sessionStats.value.created,
            duplicates: sessionStats.value.duplicates,
            invalid: sessionStats.value.invalid,
            started_at: scannedOrders.value[scannedOrders.value.length - 1]?.timestamp,
            finished_at: new Date()
          }
        }

        // Enviar al backend
        const response = await scannerService.finalizeSession(sessionData)
        
        if (response.data.success) {
          toast.success(
            `✅ Sesión finalizada correctamente\n` +
            `${sessionStats.value.created} pedidos creados`
          )
          
          // Redirigir a órdenes
          router.push('/orders?filter=ml_scanner')
        } else {
          throw new Error(response.data.message || 'Error finalizando sesión')
        }
        
      } catch (error) {
        console.error('❌ Error finalizando sesión:', error)
        toast.error('Error finalizando la sesión')
      } finally {
        isProcessing.value = false
      }
    }

    /**
     * Ver pedido específico
     */
    function viewOrder(orderId) {
      if (!orderId) return
      
      console.log('👁️ Viendo pedido:', orderId)
      router.push(`/orders/${orderId}`)
    }

    // ==================== UTILIDADES ====================

    /**
     * Obtener texto del estado
     */
    function getStatusText(status) {
      const statusMap = {
        'created': '✅ Creado',
        'duplicate': '⚠️ Duplicado',
        'invalid': '❌ Inválido',
        'processing': '⏳ Procesando'
      }
      return statusMap[status] || status
    }

    /**
     * Contar órdenes por estado
     */
    function getStatusCount(status) {
      return scannedOrders.value.filter(order => order.status === status).length
    }

    /**
     * Formatear tiempo
     */
    function formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    /**
     * Formatear fecha completa
     */
    function formatDateTime(timestamp) {
      return new Date(timestamp).toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // ==================== LIFECYCLE HOOKS ====================

    onMounted(async () => {
      console.log('🚀 MLScanner montado')
        // Verificar si ya tiene acceso antes de inicializar
      if (checkExistingAccess()) {
        await initializeScanner()
      }
    })

    onUnmounted(() => {
      console.log('🔴 MLScanner desmontado')
      
      // Cleanup
      stopScanning()
      
      if (scannerInterval) {
        clearInterval(scannerInterval)
      }
      
      console.log('🧹 Cleanup completado')
    })

    // ==================== RETURN (EXPOSING TO TEMPLATE) ====================

    return {
      // Nuevas variables de acceso
      isAccessGranted,
      accessPassword,
      isVerifyingAccess,
      verifyAccess,
      logout,

      // Estado general
      isInitialized,
      isProcessing,
      loadingClients,
      
      // Clientes
      clients,
      filteredClients,
      clientSearch,
      selectedClient,
      
      // Scanner
      isScanning,
      videoElement,
      fileInput,
      
      // Pedidos
      scannedOrders,
      lastScanned,
      showResults,
      
      // Computed
      sessionStats,
      canFinalize,
      
      // Métodos de clientes
      filterClients,
      clearSearch,
      selectClient,
      changeClient,

// Captura de imagen
capturedImage,
      
     // Métodos de scanner
startCamera,
capturePhoto,
stopCamera,
retakePhoto,
processCapturedImage,
processImageUpload,
      
      // Métodos de resultados
      showResultsList,
      backToScanner,
      finalizeSession,
      viewOrder,
      
      // Utilidades
      getStatusText,
      getStatusCount,
      formatTime,
      formatDateTime
    }
  }
}
</script>
<style scoped>
/* ==================== VARIABLES CSS ==================== */
:root {
  --envigo-primary: #8BC53F;
  --envigo-primary-dark: #7BA82F;
  --envigo-primary-light: #A4D65E;
  --envigo-gradient: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  
  --color-success: #10b981;
  --color-success-bg: #dcfce7;
  --color-success-text: #166534;
  
  --color-warning: #f59e0b;
  --color-warning-bg: #fef3c7;
  --color-warning-text: #92400e;
  
  --color-error: #ef4444;
  --color-error-bg: #fecaca;
  --color-error-text: #991b1b;
  
  --color-info: #3b82f6;
  --color-info-bg: #dbeafe;
  --color-info-text: #1e40af;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  
  --text-primary: #1a202c;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  
  --border-light: #e2e8f0;
  --border-medium: #cbd5e0;
  
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.15);
  --shadow-envigo: 0 4px 12px rgba(139, 197, 63, 0.3);
  
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
}

/* ==================== BASE STYLES ==================== */
.ml-scanner-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--text-primary);
  line-height: 1.5;
}

* {
  box-sizing: border-box;
}

/* ==================== HEADER DEL SCANNER ==================== */
.scanner-header {
  background: var(--envigo-gradient);
  color: white;
  padding: 1.5rem 1rem;
  box-shadow: var(--shadow-envigo);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.logo-section h1 {
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.025em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo-section p {
  opacity: 0.9;
  margin: 0;
  font-size: 14px;
  font-weight: 400;
}

.session-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.client-name {
  font-weight: 600;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.scan-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* ==================== SELECCIÓN DE CLIENTE ==================== */
.client-selection {
  max-width: 700px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.selection-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 2.5rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
}

.selection-card h2 {
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  font-weight: 700;
  font-size: 24px;
}

.selection-card > p {
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
  font-size: 16px;
}

/* Buscador */
.search-container {
  margin: 1.5rem 0 2rem 0;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  z-index: 2;
  color: var(--text-secondary);
  font-size: 16px;
}

.client-search {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 2px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-normal);
  outline: none;
}

.client-search::placeholder {
  color: var(--text-tertiary);
}

.client-search:focus {
  border-color: var(--envigo-primary);
  box-shadow: 0 0 0 3px rgba(139, 197, 63, 0.1);
}

.clear-search {
  position: absolute;
  right: 12px;
  background: var(--text-tertiary);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clear-search:hover {
  background: var(--text-secondary);
  transform: scale(1.1);
}

/* Lista de Clientes */
.clients-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

/* Scrollbar personalizado */
.clients-list::-webkit-scrollbar {
  width: 6px;
}

.clients-list::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.clients-list::-webkit-scrollbar-thumb {
  background: var(--border-medium);
  border-radius: 3px;
}

.clients-list::-webkit-scrollbar-thumb:hover {
  background: var(--envigo-primary);
}

.client-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.client-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(139, 197, 63, 0.1), transparent);
  transition: left 0.5s ease;
}

.client-card:hover {
  border-color: var(--envigo-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-envigo);
  background: white;
}

.client-card:hover::before {
  left: 100%;
}

.client-avatar {
  width: 48px;
  height: 48px;
  background: var(--envigo-gradient);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  margin-right: 16px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.client-info {
  flex: 1;
  min-width: 0;
}

.client-info h3 {
  margin: 0 0 4px 0;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-info p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.client-type {
  background: var(--envigo-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.client-phone {
  color: var(--text-tertiary);
  font-size: 12px;
}

.client-arrow {
  color: var(--envigo-primary);
  font-size: 20px;
  font-weight: bold;
  margin-left: 12px;
  flex-shrink: 0;
  transition: transform var(--transition-normal);
}

.client-card:hover .client-arrow {
  transform: translateX(4px);
}

/* Estado vacío de clientes */
.empty-clients {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 1rem;
}

.empty-clients h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 18px;
}

.empty-clients p {
  margin: 0;
  font-size: 14px;
}

/* Loading clientes */
.loading-clients {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 2rem;
  color: var(--text-secondary);
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-top: 2px solid var(--envigo-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ==================== INTERFACE DEL SCANNER ==================== */
.scanner-interface {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

/* Barra de acciones */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
}

.action-center {
  flex: 1;
  text-align: center;
}

.current-client {
  color: var(--text-secondary);
  font-size: 14px;
}

.current-client strong {
  color: var(--text-primary);
}

/* Área principal del scanner */
.scanner-main-area {
  display: grid;
  gap: 2rem;
  grid-template-columns: 2fr 1fr;
  align-items: start;
}

/* Card del scanner */
.scanner-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
}

.scanner-header-card {
  text-align: center;
  margin-bottom: 2rem;
}

.scanner-header-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.scanner-header-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Contenedor del video */
.video-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto 2rem auto;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000;
  box-shadow: var(--shadow-md);
}

.scanner-video {
  width: 100%;
  height: 300px;
  object-fit: cover;
  display: block;
}

/* Overlay del scanner */
.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.2);
}

.scan-frame {
  position: relative;
  width: 80%;
  height: 60%;
  border: 2px solid rgba(139, 197, 63, 0.8);
  border-radius: 8px;
}

.scan-corners {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid var(--envigo-primary);
}

.corner.top-left {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.corner.top-right {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
}

.corner.bottom-left {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
}

.corner.bottom-right {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
}

.scan-line {
  position: absolute;
  top: 50%;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--envigo-primary);
  transform: translateY(-50%);
  opacity: 0;
  box-shadow: 0 0 10px var(--envigo-primary);
}

.scan-line.active {
  animation: scanAnimation 2s linear infinite;
}

@keyframes scanAnimation {
  0% {
    transform: translateY(-100px);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(100px);
    opacity: 0;
  }
}

.scan-instructions {
  margin-top: 1rem;
  text-align: center;
  color: white;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(5px);
}

/* Mensaje sin video */
.no-video-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.camera-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

/* Controles del scanner */
.scanner-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 2rem;
}

.scanner-btn {
  min-width: 140px;
}

/* Divisor */
.scanner-divider {
  position: relative;
  text-align: center;
  margin: 2rem 0;
  color: var(--text-tertiary);
}

.scanner-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-light);
  z-index: 1;
}

.scanner-divider span {
  background: var(--bg-primary);
  padding: 0 1rem;
  position: relative;
  z-index: 2;
  font-weight: 500;
}

/* Sección de upload */
.upload-section {
  text-align: center;
}

.upload-section h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.upload-area {
  border: 2px dashed var(--envigo-primary);
  border-radius: var(--radius-md);
  padding: 2rem 1rem;
  background: rgba(139, 197, 63, 0.05);
  transition: all var(--transition-normal);
  cursor: pointer;
}

.upload-area:hover {
  background: rgba(139, 197, 63, 0.1);
  border-color: var(--envigo-primary-dark);
}

.file-input-hidden {
  display: none;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--envigo-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  border: none;
}

.upload-button:hover {
  background: var(--envigo-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-envigo);
}

.upload-icon {
  font-size: 16px;
}

.upload-hint {
  margin: 0.5rem 0 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

/* ==================== SIDEBAR DEL SCANNER ==================== */
.scanner-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Último código escaneado */
.last-scanned-card {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
  border-left: 4px solid var(--envigo-primary);
}

.last-scanned-card h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.scanned-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.barcode-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.barcode-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.barcode-value {
  font-family: 'Courier New', monospace;
  background: var(--bg-tertiary);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  word-break: break-all;
}

.status-display {
  display: flex;
  justify-content: center;
}

.timestamp-display {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
}

/* Estadísticas de sesión */
.session-stats-card {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
}

.session-stats-card h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
}

.stat-item.success {
  background: var(--color-success-bg);
  border-color: var(--color-success);
}

.stat-item.warning {
  background: var(--color-warning-bg);
  border-color: var(--color-warning);
}

.stat-item.error {
  background: var(--color-error-bg);
  border-color: var(--color-error);
}

.stat-number {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-item.success .stat-number {
  color: var(--color-success-text);
}

.stat-item.warning .stat-number {
  color: var(--color-warning-text);
}

.stat-item.error .stat-number {
  color: var(--color-error-text);
}

.stat-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-top: 4px;
}

/* Tips card */
.tips-card {
  background: linear-gradient(135deg, rgba(139, 197, 63, 0.1) 0%, rgba(164, 214, 94, 0.1) 100%);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  border: 1px solid rgba(139, 197, 63, 0.2);
}

.tips-card h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tips-list li {
  position: relative;
  padding-left: 20px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.4;
}

.tips-list li::before {
  content: '💡';
  position: absolute;
  left: 0;
  top: 0;
  font-size: 12px;
}

/* ==================== VISTA DE RESULTADOS ==================== */
.results-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

/* Header de resultados */
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);
  gap: 1rem;
}

.results-title-section {
  flex: 1;
  text-align: center;
}

.results-title-section h2 {
  margin: 0 0 0.25rem 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 700;
}

.results-count {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Resumen de sesión */
.session-summary {
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--envigo-gradient);
  color: white;
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-envigo);
}

.summary-card h3 {
  margin: 0 0 1.5rem 0;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.summary-item {
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.summary-item.total {
  background: rgba(255, 255, 255, 0.25);
}

.summary-item .number {
  display: block;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.summary-item .label {
  font-size: 12px;
  opacity: 0.9;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* Lista de resultados */
.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.result-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--text-tertiary);
}

.result-card.created::before {
  background: var(--color-success);
}

.result-card.duplicate::before {
  background: var(--color-warning);
}

.result-card.invalid::before {
  background: var(--color-error);
}

.result-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.result-index {
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--text-secondary);
  margin-right: 16px;
  flex-shrink: 0;
  font-size: 14px;
}

.result-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.result-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.barcode-info {
  flex: 1;
}

.result-barcode {
  font-family: 'Courier New', monospace;
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.result-timestamp {
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
}

.result-status {
  flex-shrink: 0;
}

.result-actions {
  flex-shrink: 0;
}

.btn-view-order {
  padding: 6px 12px;
  background: var(--color-info);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.btn-view-order:hover {
  background: var(--color-info-text);
  transform: translateY(-1px);
}

/* Estado vacío de resultados */
.empty-results {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-secondary);
}

.empty-results .empty-icon {
  font-size: 64px;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-results h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 20px;
}

.empty-results p {
  margin: 0;
  font-size: 14px;
}

/* ==================== BADGES Y ESTADOS ==================== */
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
}

.status-badge.created {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.status-badge.duplicate {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}

.status-badge.invalid {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.status-badge.processing {
  background: var(--color-info-bg);
  color: var(--color-info-text);
  animation: pulse 2s infinite;
}

/* ==================== BOTONES ==================== */
.btn-primary,
.btn-secondary,
.btn-success,
.btn-info,
.btn-warning {
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  line-height: 1;
  white-space: nowrap;
}

.btn-primary {
  background: var(--envigo-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--envigo-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-envigo);
}

.btn-primary:disabled {
  background: var(--border-medium);
  color: var(--text-tertiary);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 2px solid var(--border-light);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--border-medium);
  color: var(--text-primary);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-success:disabled {
  background: var(--border-medium);
  color: var(--text-tertiary);
  cursor: not-allowed;
  transform: none;
}

.btn-info {
  background: var(--color-info);
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: var(--color-info-text);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-info:disabled {
  background: var(--border-medium);
  color: var(--text-tertiary);
  cursor: not-allowed;
  transform: none;
}

.btn-warning {
  background: var(--color-warning);
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

/* ==================== OVERLAY DE LOADING ==================== */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.loading-card {
  background: var(--bg-primary);
  padding: 3rem;
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
  max-width: 400px;
  margin: 1rem;
}

.loading-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.loading-content p {
  margin: 0 0 2rem 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-light);
  border-top: 4px solid var(--envigo-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 2rem;
}

.loading-progress {
  width: 100%;
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--envigo-gradient);
  border-radius: 2px;
  animation: progressAnimation 2s ease-in-out infinite;
}

@keyframes progressAnimation {
  0% {
    width: 0%;
    transform: translateX(-100%);
  }
  50% {
    width: 100%;
    transform: translateX(0%);
  }
  100% {
    width: 0%;
    transform: translateX(100%);
  }
}

/* ==================== ANIMACIONES ==================== */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scanner-card,
.last-scanned-card,
.session-stats-card,
.tips-card,
.result-card {
  animation: fadeIn 0.3s ease-out;
}

/* ==================== RESPONSIVE DESIGN ==================== */

/* Tablets */
@media (max-width: 968px) {
  .scanner-main-area {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .scanner-sidebar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .tips-card {
    grid-column: 1 / -1;
  }
}

/* Móviles */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .session-info {
    align-items: center;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 1rem;
  }
  
  .action-center {
    order: -1;
  }
  
  .scanner-sidebar {
    grid-template-columns: 1fr;
  }
  
  .scanner-card {
    padding: 1.5rem;
  }
  
  .results-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .summary-stats {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  
  .result-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 1rem;
  }
  
  .result-index {
    align-self: center;
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .result-content {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }
  
  .result-main {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .clients-list {
    max-height: 300px;
  }
  
  .client-card {
    padding: 12px;
  }
  
  .client-info h3 {
    font-size: 15px;
  }
  
  .client-info p {
    font-size: 13px;
  }
  
  .video-container {
    max-width: 100%;
  }
  
  .scanner-video {
    height: 250px;
  }
}

/* Móviles pequeños */
@media (max-width: 480px) {
  .ml-scanner-container {
    font-size: 14px;
  }
  
  .scanner-header {
    padding: 1rem;
  }
  
  .logo-section h1 {
    font-size: 20px;
  }
  
  .selection-card,
  .scanner-card {
    padding: 1rem;
  }
  
  .scanner-controls {
    flex-direction: column;
    gap: 8px;
  }
  
  .scanner-btn {
    min-width: auto;
    width: 100%;
  }
  
  .upload-area {
    padding: 1.5rem 1rem;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .summary-item .number {
    font-size: 24px;
  }
  
  .btn-primary,
  .btn-secondary,
  .btn-success,
  .btn-info {
    padding: 10px 16px;
    font-size: 13px;
  }
}

/* ==================== MODO OSCURO (OPCIONAL) ==================== */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a202c;
    --bg-secondary: #2d3748;
    --bg-tertiary: #4a5568;
    
    --text-primary: #f7fafc;
    --text-secondary: #e2e8f0;
    --text-tertiary: #a0aec0;
    
    --border-light: #4a5568;
    --border-medium: #718096;
  }
  
  .ml-scanner-container {
    background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
  }
  
  .scanner-video {
    border: 1px solid var(--border-light);
  }
  
  .no-video-message {
    background: var(--bg-tertiary);
  }
}

/* ==================== IMPRESIÓN ==================== */
@media print {
  .scanner-header,
  .action-bar,
  .scanner-controls,
  .upload-section,
  .loading-overlay {
    display: none !important;
  }
  
  .ml-scanner-container {
    background: white !important;
    color: black !important;
  }
  
  .results-view {
    margin: 0;
    padding: 1rem;
  }
  
  .result-card {
    break-inside: avoid;
    box-shadow: none !important;
    border: 1px solid #ddd !important;
  }
}

/* ==================== ACCESIBILIDAD ==================== */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  .scan-line {
    animation: none !important;
  }
  
  .spinner {
    animation: none !important;
    border-top-color: var(--envigo-primary) !important;
  }
}

/* Focus para navegación por teclado */
.btn-primary:focus,
.btn-secondary:focus,
.btn-success:focus,
.btn-info:focus,
.client-search:focus,
.client-card:focus,
.upload-button:focus {
  outline: 2px solid var(--envigo-primary);
  outline-offset: 2px;
}

/* Estados de hover solo en dispositivos que lo soportan */
@media (hover: hover) {
  .client-card:hover,
  .result-card:hover,
  .upload-area:hover {
    /* Los estilos hover ya están definidos arriba */
  }
}

/* ==================== UTILIDADES ==================== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.hidden {
  display: none !important;
}

.invisible {
  visibility: hidden;
}

.opacity-50 {
  opacity: 0.5;
}

.pointer-events-none {
  pointer-events: none;
}
</style>