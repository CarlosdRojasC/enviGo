<template>
  <div class="ml-scanner-container">
    
    <!-- ==================== HEADER DEL SCANNER ==================== -->
    <div class="scanner-header">
      <div class="header-content">
        <div class="logo-section">
          <h1>📦 Scanner ML - enviGo</h1>
          <p>Escanea etiquetas de MercadoLibre</p>
        </div>
        <div class="session-info" v-if="selectedClient">
          <span class="client-name">{{ selectedClient.name }}</span>
          <span class="scan-count">{{ scannedOrders.length }} escaneados</span>
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
            <h3>📱 Escanear Códigos de Barras</h3>
            <p>Acerca el código de barras de MercadoLibre a la cámara</p>
          </div>
          
          <!-- Video Scanner -->
          <div class="video-container">
            <video 
              ref="videoElement" 
              class="scanner-video" 
              autoplay 
              playsinline
              muted
            ></video>
            
            <!-- Overlay del Scanner -->
            <div class="scanner-overlay">
              <div class="scan-frame">
                <div class="scan-corners">
                  <div class="corner top-left"></div>
                  <div class="corner top-right"></div>
                  <div class="corner bottom-left"></div>
                  <div class="corner bottom-right"></div>
                </div>
                <div class="scan-line" :class="{ active: isScanning }"></div>
              </div>
              <div class="scan-instructions">
                <p v-if="!isScanning">Presiona "Iniciar Cámara" para comenzar</p>
                <p v-else>Mantén el código dentro del marco</p>
              </div>
            </div>

            <!-- Mensaje cuando no hay video -->
            <div v-if="!isScanning" class="no-video-message">
              <div class="camera-icon">📷</div>
              <p>Cámara desactivada</p>
            </div>
          </div>

          <!-- Controles del Scanner -->
          <div class="scanner-controls">
            <button 
              @click="startScanning" 
              :disabled="isScanning || isProcessing" 
              class="btn-primary scanner-btn"
            >
              <span v-if="!isScanning">📷 Iniciar Cámara</span>
              <span v-else>📷 Escaneando...</span>
            </button>
            
            <button 
              @click="stopScanning" 
              :disabled="!isScanning" 
              class="btn-secondary scanner-btn"
            >
              🛑 Parar Cámara
            </button>
          </div>

          <!-- Separador -->
          <div class="scanner-divider">
            <span>O</span>
          </div>

          <!-- Upload Manual -->
          <div class="upload-section">
            <h4>📷 Sube una foto del código</h4>
            <div class="upload-area">
              <input 
                ref="fileInput"
                @change="processImageUpload" 
                type="file" 
                accept="image/*" 
                capture="environment"
                class="file-input-hidden"
                id="file-upload"
              />
              <label for="file-upload" class="upload-button">
                <span class="upload-icon">📁</span>
                <span>Seleccionar Imagen</span>
              </label>
              <p class="upload-hint">JPG, PNG o similar</p>
            </div>
          </div>
        </div>

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
      </div>
    </div>

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
<script>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { scannerService } from '../services/scanner.service'
import { useToast } from 'vue-toastification';

export default {
  name: 'MLScanner',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const toast = useToast();
    // ==================== REFS REACTIVOS ====================
    
    // Estado general
    const isInitialized = ref(false)
    const isProcessing = ref(false)
    const loadingClients = ref(false)
    
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
        
        // Verificar autenticación
        if (!authStore.isLoggedIn) {
          toast.error('Debes estar autenticado para usar el scanner')
          router.push('/login')
          return
        }

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

    // ==================== FUNCIONALIDAD DEL SCANNER ====================

    /**
     * Iniciar la cámara para escanear
     */
    async function startScanning() {
      try {
        console.log('📷 Iniciando cámara...')
        
        // Solicitar permisos de cámara
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Cámara trasera
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
          } 
        })
        
        // Asignar stream al video
        if (videoElement.value) {
          videoElement.value.srcObject = stream
          mediaStream = stream
          isScanning.value = true

          // Esperar a que el video esté listo
          await nextTick()
          
          // Iniciar loop de detección
          startScanningLoop()
          
          toast.success('📷 Cámara iniciada - Enfoca el código de barras')
        }

      } catch (error) {
        console.error('❌ Error accediendo a la cámara:', error)
        
        let errorMessage = 'No se pudo acceder a la cámara'
        
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permisos de cámara denegados'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No se encontró cámara disponible'
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Cámara no soportada por el navegador'
        }
        
        toast.error(errorMessage)
      }
    }

    /**
     * Detener la cámara
     */
    function stopScanning() {
      console.log('🛑 Deteniendo cámara...')
      
      // Detener interval de scanning
      if (scannerInterval) {
        clearInterval(scannerInterval)
        scannerInterval = null
      }
      
      // Detener stream de video
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          track.stop()
          console.log('🔴 Track detenido:', track.kind)
        })
        mediaStream = null
      }
      
      // Limpiar video element
      if (videoElement.value) {
        videoElement.value.srcObject = null
      }
      
      isScanning.value = false
      toast.info('Cámara detenida')
    }

    /**
     * Loop principal de detección de códigos
     */
    function startScanningLoop() {
      // Intervalo cada segundo para capturar frames
      scannerInterval = setInterval(() => {
        if (isScanning.value && !isProcessing.value) {
          captureAndAnalyzeFrame()
        }
      }, 1000)
      
      console.log('🔄 Loop de scanning iniciado')
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
      await initializeScanner()
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
      
      // Métodos de scanner
      startScanning,
      stopScanning,
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