<template>
  <div class="scanner-app">
    
    <!-- PANTALLA DE ACCESO -->
    <div v-if="!isAccessGranted" class="access-screen">
      <div class="access-container">
        <div class="logo">
          <div class="logo-icon">📦</div>
          <h1>Scanner ML</h1>
          <p>enviGo</p>
        </div>
        
        <div class="access-form">
          <input 
            v-model="accessPassword"
            type="password" 
            placeholder="Contraseña de acceso"
            @keyup.enter="verifyAccess"
            autofocus
          />
          
          <button 
            @click="verifyAccess" 
            :disabled="!accessPassword || isVerifyingAccess"
            class="btn-primary"
          >
            {{ isVerifyingAccess ? 'Verificando...' : 'Acceder' }}
          </button>
          
          <p class="help-text">Contacta a tu supervisor para obtener la contraseña</p>
        </div>
      </div>
    </div>

    <!-- APP PRINCIPAL -->
    <div v-if="isAccessGranted" class="scanner-main">
      
      <!-- HEADER FIJO -->
      <header class="app-header">
        <div class="header-left">
          <h1>Scanner ML</h1>
          <span v-if="selectedClient" class="client-badge">{{ selectedClient.name }}</span>
        </div>
        <button @click="logout" class="btn-logout">Salir</button>
      </header>

      <!-- SELECCIÓN DE CLIENTE -->
      <div v-if="!selectedClient" class="client-select">
        <h2>Selecciona Cliente</h2>
        
        <input 
          v-model="clientSearch"
          type="text"
          placeholder="Buscar cliente..."
          class="search-input"
        />
        
        <div class="clients-grid">
          <div 
            v-for="client in filteredClients" 
            :key="client.id"
            @click="selectClient(client)"
            class="client-card"
          >
            <div class="client-avatar">{{ client.name.charAt(0) }}</div>
            <div class="client-info">
              <h3>{{ client.name }}</h3>
              <p>{{ client.email }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- SCANNER ACTIVO -->
      <div v-if="selectedClient && !showResults" class="scanner-active">
        
        <!-- Stats header -->
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-number">{{ scannedOrders.length }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat success">
            <span class="stat-number">{{ getStatusCount('created') }}</span>
            <span class="stat-label">Creados</span>
          </div>
          <div class="stat warning">
            <span class="stat-number">{{ getStatusCount('duplicate') }}</span>
            <span class="stat-label">Duplicados</span>
          </div>
        </div>

        <!-- Área de captura -->
        <div class="capture-zone">
          
          <!-- Video preview -->
          <div v-if="isScanning" class="video-container">
            <video 
              ref="videoElement" 
              autoplay 
              playsinline
              muted
            ></video>
            <div class="scan-frame">
              <div class="corner tl"></div>
              <div class="corner tr"></div>
              <div class="corner bl"></div>
              <div class="corner br"></div>
              <p class="scan-instruction">Coloca la etiqueta aquí</p>
            </div>
          </div>

          <!-- Imagen capturada -->
          <div v-if="capturedImage" class="preview-container">
            <img :src="capturedImage" alt="Etiqueta" />
          </div>

          <!-- Estado inicial -->
          <div v-if="!isScanning && !capturedImage" class="idle-state">
            <div class="camera-icon">📷</div>
            <p>Presiona para iniciar</p>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="action-buttons">
          <button 
            v-if="!isScanning && !capturedImage"
            @click="startCamera"
            class="btn-primary btn-large"
          >
            📷 Iniciar Cámara
          </button>

          <template v-if="isScanning">
            <button @click="capturePhoto" class="btn-primary btn-large">
              📸 Capturar
            </button>
            <button @click="stopCamera" class="btn-secondary">
              Cancelar
            </button>
          </template>

          <template v-if="capturedImage">
            <button 
              @click="processCapturedImage" 
              :disabled="isProcessing"
              class="btn-primary btn-large"
            >
              {{ isProcessing ? '⏳ Procesando...' : '✨ Procesar' }}
            </button>
            <button @click="retakePhoto" class="btn-secondary">
              🔄 Tomar otra
            </button>
          </template>
        </div>

        <!-- Último escaneado -->
        <div v-if="lastScanned" class="last-scan">
          <h3>Último escaneado</h3>
          <div class="scan-details">
            <code>{{ lastScanned.shipping_number }}</code>
            <span :class="['status', lastScanned.status]">
              {{ getStatusText(lastScanned.status) }}
            </span>
          </div>
        </div>

        <!-- Botón ver resultados -->
        <button 
          v-if="scannedOrders.length > 0"
          @click="showResultsList"
          class="btn-results"
        >
          Ver {{ scannedOrders.length }} resultados
        </button>
      </div>

      <!-- RESULTADOS -->
      <div v-if="showResults" class="results-screen">
        <div class="results-header">
          <button @click="backToScanner" class="btn-back">← Volver</button>
          <h2>Resultados</h2>
          <button 
            @click="finalizeSession"
            :disabled="getStatusCount('created') === 0"
            class="btn-finalize"
          >
            Finalizar
          </button>
        </div>

        <div class="results-list">
          <div 
            v-for="(order, index) in scannedOrders" 
            :key="order.shipping_number"
            class="result-item"
            :class="order.status"
          >
            <div class="result-number">{{ scannedOrders.length - index }}</div>
            <div class="result-content">
              <code>{{ order.shipping_number }}</code>
              <span class="result-status">{{ getStatusText(order.status) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="isProcessing" class="loading-overlay">
      <div class="spinner"></div>
      <p>Procesando etiqueta...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { scannerService } from '../services/scanner.service'
import { useToast } from 'vue-toastification'

const router = useRouter()
const toast = useToast()

// Estados
const isAccessGranted = ref(false)
const accessPassword = ref('')
const isVerifyingAccess = ref(false)
const isProcessing = ref(false)
const isScanning = ref(false)
const showResults = ref(false)

// Datos
const clients = ref([])
const filteredClients = ref([])
const clientSearch = ref('')
const selectedClient = ref(null)
const scannedOrders = ref([])
const lastScanned = ref(null)
const capturedImage = ref(null)

// Refs
const videoElement = ref(null)
let mediaStream = null

// Computed
const sessionStats = computed(() => ({
  total: scannedOrders.value.length,
  created: scannedOrders.value.filter(o => o.status === 'created').length,
  duplicates: scannedOrders.value.filter(o => o.status === 'duplicate').length
}))

// Métodos de acceso
async function verifyAccess() {
  isVerifyingAccess.value = true
  
  if (accessPassword.value === 'envigo2025') {
    isAccessGranted.value = true
    localStorage.setItem('scanner_access', 'granted')
    toast.success('Acceso concedido')
    await loadClients()
  } else {
    toast.error('Contraseña incorrecta')
    accessPassword.value = ''
  }
  
  isVerifyingAccess.value = false
}

function logout() {
  isAccessGranted.value = false
  localStorage.removeItem('scanner_access')
  selectedClient.value = null
  scannedOrders.value = []
  stopCamera()
  toast.info('Sesión cerrada')
}

// Cargar clientes
async function loadClients() {
  try {
    const response = await scannerService.getCompanyClients()
    if (response.data.success) {
      clients.value = response.data.data
      filteredClients.value = clients.value
    }
  } catch (error) {
    toast.error('Error cargando clientes')
  }
}

// Selección de cliente
function selectClient(client) {
  selectedClient.value = client
  scannedOrders.value = []
  lastScanned.value = null
  toast.success(`Cliente: ${client.name}`)
}

// Cámara
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1440 }
      } 
    })
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      mediaStream = stream
      isScanning.value = true
      toast.success('Cámara lista')
    }
  } catch (error) {
    toast.error('No se pudo acceder a la cámara')
  }
}

function capturePhoto() {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  canvas.width = videoElement.value.videoWidth
  canvas.height = videoElement.value.videoHeight
  
  context.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
  capturedImage.value = canvas.toDataURL('image/jpeg', 0.95)
  
  stopCamera()
  toast.success('Foto capturada')
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  isScanning.value = false
}

function retakePhoto() {
  capturedImage.value = null
}

async function processCapturedImage() {
  if (!capturedImage.value) return

  try {
    isProcessing.value = true

    const response = await fetch(capturedImage.value)
    const blob = await response.blob()

    const formData = new FormData()
    formData.append('image', blob, 'etiqueta-ml.jpg')
    formData.append('client_id', selectedClient.value.id)

    const result = await scannerService.processMLLabel(formData)
    
    if (result.data.success) {
      const data = result.data.data
      
      scannedOrders.value.unshift({
        shipping_number: data.shipping_number,
        status: data.status,
        timestamp: new Date(),
        ...data
      })
      
      lastScanned.value = scannedOrders.value[0]
      
      if (data.status === 'created') {
        toast.success(`Pedido creado: ${data.customer_name}`)
      } else if (data.status === 'duplicate') {
        toast.warning('Envío duplicado')
      } else {
        toast.error('Datos incompletos')
      }
      
      capturedImage.value = null
    } else {
      toast.error('Error procesando etiqueta')
    }
  } catch (error) {
    toast.error('Error de conexión')
  } finally {
    isProcessing.value = false
  }
}

// Resultados
function showResultsList() {
  showResults.value = true
  stopCamera()
}

function backToScanner() {
  showResults.value = false
}

async function finalizeSession() {
  if (getStatusCount('created') === 0) {
    toast.error('No hay pedidos para finalizar')
    return
  }

  const confirm = window.confirm(`¿Finalizar con ${getStatusCount('created')} pedidos?`)
  if (!confirm) return

  toast.success('Sesión finalizada')
  router.push('/orders')
}

// Utilidades
function getStatusText(status) {
  const map = {
    'created': '✅ Creado',
    'duplicate': '⚠️ Duplicado',
    'invalid': '❌ Inválido'
  }
  return map[status] || status
}

function getStatusCount(status) {
  return scannedOrders.value.filter(o => o.status === status).length
}

// Lifecycle
onMounted(() => {
  if (localStorage.getItem('scanner_access') === 'granted') {
    isAccessGranted.value = true
    loadClients()
  }
})

onUnmounted(() => {
  stopCamera()
})

// Filtro de clientes
computed(() => {
  const search = clientSearch.value.toLowerCase()
  filteredClients.value = search
    ? clients.value.filter(c => c.name.toLowerCase().includes(search))
    : clients.value
})
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.scanner-app {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* === ACCESS SCREEN === */
.access-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.access-container {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 60px;
  margin-bottom: 10px;
}

.logo h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 5px;
}

.logo p {
  color: #666;
  font-size: 16px;
}

.access-form input {
  width: 100%;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  margin-bottom: 15px;
  transition: border-color 0.3s;
}

.access-form input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-primary {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.help-text {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin-top: 15px;
}

/* === APP HEADER === */
.app-header {
  background: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left h1 {
  font-size: 20px;
  color: #333;
  margin-bottom: 5px;
}

.client-badge {
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.btn-logout {
  padding: 8px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

/* === CLIENT SELECT === */
.client-select {
  padding: 20px;
}

.client-select h2 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  margin-bottom: 20px;
}

.clients-grid {
  display: grid;
  gap: 15px;
}

.client-card {
  background: white;
  padding: 15px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.client-card:active {
  transform: scale(0.98);
}

.client-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.client-info h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
}

.client-info p {
  font-size: 14px;
  color: #999;
}

/* === SCANNER ACTIVE === */
.scanner-active {
  padding: 20px;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.stat {
  background: white;
  padding: 15px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-number {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.stat.success .stat-number { color: #4caf50; }
.stat.warning .stat-number { color: #ff9800; }

/* === CAPTURE ZONE === */
.capture-zone {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  aspect-ratio: 4/3;
  position: relative;
}

.video-container,
.preview-container,
.idle-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-frame {
  position: absolute;
  inset: 20px;
  border: 2px dashed white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid white;
}

.corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
.corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
.corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
.corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }

.scan-instruction {
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
}

.preview-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.idle-state {
  flex-direction: column;
  color: #ccc;
}

.camera-icon {
  font-size: 60px;
  margin-bottom: 15px;
}

/* === ACTION BUTTONS === */
.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-large {
  flex: 1;
  padding: 18px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 12px;
}

.btn-secondary {
  padding: 15px 20px;
  background: #f5f5f5;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
}

/* === LAST SCAN === */
.last-scan {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.last-scan h3 {
  font-size: 14px;
  color: #999;
  margin-bottom: 10px;
}

.scan-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scan-details code {
  font-size: 16px;
  font-weight: 600;
}

.status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status.created { background: #e8f5e9; color: #4caf50; }
.status.duplicate { background: #fff3e0; color: #ff9800; }
.status.invalid { background: #ffebee; color: #f44336; }

/* === RESULTS === */
.btn-results {
  width: 100%;
  padding: 18px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.results-screen {
  padding: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-back,
.btn-finalize {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-back {
  background: #f5f5f5;
}

.btn-finalize {
  background: #4caf50;
  color: white;
}

.btn-finalize:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  background: white;
  padding: 15px;
  border-radius: 12px;
  display: flex;
  gap: 15px;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.result-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #666;
}

.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.result-content code {
  font-size: 14px;
  font-weight: 600;
}

.result-status {
  font-size: 12px;
}

/* === LOADING === */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: white;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .app-header {
    padding: 12px 15px;
  }
  
  .header-left h1 {
    font-size: 18px;
  }
  
  .scanner-active,
  .client-select,
  .results-screen {
    padding: 15px;
  }
}
</style>