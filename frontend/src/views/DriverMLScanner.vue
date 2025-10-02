<template>
  <div class="label-scanner">
    <!-- Paso 1: Login -->
    <div v-if="!accessGranted" class="login-screen">
      <div class="login-card">
        <div class="logo">
          <div class="logo-icon">📦</div>
          <h1>Scanner ML</h1>
          <p>enviGo</p>
        </div>
        <input 
          v-model="password" 
          type="password" 
          placeholder="Contraseña de acceso"
          @keyup.enter="login"
          autofocus
        />
        <button @click="login" class="btn-primary">
          {{ loggingIn ? 'Verificando...' : 'Acceder' }}
        </button>
        <p class="help-text">Contacta a tu supervisor para obtener la contraseña</p>
      </div>
    </div>

    <!-- Paso 2: Selección de cliente -->
    <div v-else-if="!selectedClient" class="client-select">
      <div class="header">
        <h2>Selecciona Cliente</h2>
        <button @click="logout" class="btn-logout">Salir</button>
      </div>
      
      <input 
        v-model="search"
        type="text"
        placeholder="Buscar cliente..."
        class="search-input"
      />
      
      <div class="clients-list">
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
        
        <div v-if="loadingClients" class="loading">Cargando clientes...</div>
        <div v-if="!loadingClients && filteredClients.length === 0" class="empty">
          No se encontraron clientes
        </div>
      </div>
    </div>

    <!-- Paso 3: Scanner -->
    <div v-else class="scanner">
      <div class="header">
        <div>
          <h2>{{ selectedClient.name }}</h2>
          <span class="badge">{{ results.length }} escaneados</span>
        </div>
        <button @click="changeClient" class="btn-logout">Cambiar</button>
      </div>

      <!-- Área de cámara -->
      <div class="camera-area">
        <video 
          v-if="scanning" 
          ref="video" 
          autoplay 
          playsinline
          muted
        ></video>
        
        <img 
          v-else-if="capturedImage" 
          :src="capturedImage" 
          alt="Etiqueta"
        />
        
        <div v-else class="idle">
          <div class="camera-icon">📷</div>
          <p>Presiona para iniciar la cámara</p>
        </div>

        <!-- Overlay para guiar la captura -->
        <div v-if="scanning" class="scan-guide">
          <div class="frame">
            <div class="corner tl"></div>
            <div class="corner tr"></div>
            <div class="corner bl"></div>
            <div class="corner br"></div>
          </div>
          <p class="instruction">Coloca la etiqueta dentro del marco</p>
        </div>
      </div>

      <!-- Botones -->
      <div class="buttons">
        <button 
          v-if="!scanning && !capturedImage" 
          @click="startCamera"
          class="btn-primary btn-large"
        >
          📷 Iniciar Cámara
        </button>

        <button 
          v-if="scanning" 
          @click="capture"
          class="btn-primary btn-large"
        >
          📸 Capturar
        </button>

        <button 
          v-if="scanning" 
          @click="stopCamera"
          class="btn-secondary"
        >
          Cancelar
        </button>

        <button 
          v-if="capturedImage" 
          @click="process"
          class="btn-success btn-large"
          :disabled="processing"
        >
          {{ processing ? '⏳ Procesando...' : '✨ Procesar' }}
        </button>

        <button 
          v-if="capturedImage" 
          @click="retake"
          class="btn-secondary"
        >
          🔄 Otra foto
        </button>
      </div>

      <!-- Último resultado -->
      <div v-if="lastResult" class="last-result">
        <h3>Último escaneado</h3>
        <div class="result-info">
          <p><strong>{{ lastResult.customer_name }}</strong></p>
          <p>{{ lastResult.address }}</p>
          <p>{{ lastResult.commune }}</p>
          <span :class="['status', lastResult.status]">
            {{ getStatusText(lastResult.status) }}
          </span>
        </div>
      </div>

      <!-- Botón ver resultados -->
      <button 
        v-if="results.length > 0"
        @click="showResults = true"
        class="btn-results"
      >
        Ver todos ({{ results.length }})
      </button>
    </div>

    <!-- Modal de resultados -->
    <div v-if="showResults" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Resultados ({{ results.length }})</h2>
          <button @click="showResults = false" class="btn-close">✕</button>
        </div>
        
        <div class="results-list">
          <div 
            v-for="(r, i) in results" 
            :key="i"
            class="result-item"
            :class="r.status"
          >
            <div class="result-number">{{ results.length - i }}</div>
            <div class="result-details">
              <p><strong>{{ r.customer_name }}</strong></p>
              <p>{{ r.address }} - {{ r.commune }}</p>
              <span :class="['status-badge', r.status]">
                {{ getStatusText(r.status) }}
              </span>
            </div>
          </div>
        </div>
        
        <button @click="showResults = false" class="btn-primary">
          Cerrar
        </button>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="processing" class="loading-overlay">
      <div class="spinner"></div>
      <p>Procesando etiqueta con OCR...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

const toast = useToast()
const API_URL = import.meta.env.VITE_API_BASE_URL

const password = ref('')
const accessGranted = ref(false)
const loggingIn = ref(false)
const clients = ref([])
const loadingClients = ref(false)
const search = ref('')
const selectedClient = ref(null)
const scanning = ref(false)
const capturedImage = ref(null)
const processing = ref(false)
const results = ref([])
const lastResult = ref(null)
const showResults = ref(false)
const video = ref(null)
let stream = null

const filteredClients = computed(() => {
  if (!search.value) return clients.value
  const s = search.value.toLowerCase()
  return clients.value.filter(c => 
    c.name.toLowerCase().includes(s) || 
    c.email.toLowerCase().includes(s)
  )
})

async function login() {
  loggingIn.value = true
  setTimeout(() => {
    if (password.value === 'envigo2025') {
      accessGranted.value = true
      localStorage.setItem('scanner_access', 'granted')
      toast.success('Acceso concedido')
      loadClients()
    } else {
      toast.error('Contraseña incorrecta')
      password.value = ''
    }
    loggingIn.value = false
  }, 500)
}

async function loadClients() {
  loadingClients.value = true
  try {
    const res = await axios.get(`${API_URL}/driver-scanner/clients`)
    // Asegúrate de que res.data.data es un array antes de asignarlo
    if (Array.isArray(res.data.data)) {
      clients.value = res.data.data
    } else {
      // Si no es un array, asigna un array vacío para evitar errores
      clients.value = []
      console.error('La respuesta de la API para los clientes no es un array:', res.data)
      toast.error('Error: formato de datos de clientes incorrecto')
    }
  } catch (error) {
    clients.value = [] // También asigna un array vacío en caso de error
    toast.error('Error cargando clientes')
    console.error('Error en la llamada a la API de clientes:', error)
  } finally {
    loadingClients.value = false
  }
}
function selectClient(client) {
  selectedClient.value = client
  results.value = []
  lastResult.value = null
  toast.success(`Cliente: ${client.name}`)
}

function changeClient() {
  if (results.value.length > 0) {
    if (!confirm(`¿Cambiar cliente? Se perderán ${results.value.length} resultados`)) {
      return
    }
  }
  selectedClient.value = null
  results.value = []
  lastResult.value = null
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1440 }
      }
    })
    video.value.srcObject = stream
    scanning.value = true
    toast.success('Cámara lista')
  } catch (error) {
    toast.error('No se pudo acceder a la cámara')
  }
}

function capture() {
  const canvas = document.createElement('canvas')
  canvas.width = video.value.videoWidth
  canvas.height = video.value.videoHeight
  canvas.getContext('2d').drawImage(video.value, 0, 0)
  capturedImage.value = canvas.toDataURL('image/jpeg', 0.95)
  
  stopCamera()
  toast.success('Foto capturada')
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  scanning.value = false
}

function retake() {
  capturedImage.value = null
}

async function process() {
  processing.value = true
  
  try {
    const blob = await fetch(capturedImage.value).then(r => r.blob())
    const formData = new FormData()
    formData.append('image', blob, 'etiqueta.jpg')
    formData.append('client_id', selectedClient.value.id)
    
    const res = await axios.post(
      `${API_URL}/driver-scanner/process-ml-label`,
      formData
    )
    
    if (res.data.success) {
      const data = res.data.data
      
      if (data.status === 'created') {
        results.value.unshift(data)
        lastResult.value = data
        toast.success(`✅ Pedido creado: ${data.customer_name}`)
      } else if (data.status === 'duplicate') {
        results.value.unshift(data)
        lastResult.value = data
        toast.warning('⚠️ Envío duplicado')
      } else {
        results.value.unshift(data)
        lastResult.value = data
        toast.error('❌ Datos incompletos en la etiqueta')
      }
      
      capturedImage.value = null
    }
  } catch (error) {
    toast.error('Error procesando: ' + error.message)
  } finally {
    processing.value = false
  }
}

function logout() {
  if (results.value.length > 0) {
    if (!confirm(`¿Salir? Se perderán ${results.value.length} resultados`)) {
      return
    }
  }
  accessGranted.value = false
  selectedClient.value = null
  results.value = []
  localStorage.removeItem('scanner_access')
  toast.info('Sesión cerrada')
}

function getStatusText(status) {
  const map = {
    created: '✅ Creado',
    duplicate: '⚠️ Duplicado',
    invalid: '❌ Inválido'
  }
  return map[status] || status
}

onMounted(() => {
  if (localStorage.getItem('scanner_access')) {
    accessGranted.value = true
    loadClients()
  }
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.label-scanner {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Login */
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
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
  margin: 10px 0 5px;
}

.logo p {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.login-card input {
  width: 100%;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  margin-bottom: 15px;
}

.help-text {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin-top: 15px;
}

/* Clientes */
.client-select, .scanner {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
}

.badge {
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  margin-left: 10px;
}

.btn-logout {
  padding: 8px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  margin-bottom: 20px;
}

.clients-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.client-card {
  background: white;
  padding: 15px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
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
  margin: 0 0 5px 0;
  font-size: 16px;
}

.client-info p {
  margin: 0;
  font-size: 14px;
  color: #999;
}

/* Scanner */
.camera-area {
  background: black;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 20px;
}

.camera-area video,
.camera-area img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.idle {
  color: white;
  text-align: center;
}

.camera-icon {
  font-size: 60px;
  margin-bottom: 10px;
}

.scan-guide {
  position: absolute;
  inset: 20px;
  pointer-events: none;
}

.frame {
  width: 100%;
  height: 100%;
  border: 2px dashed white;
  border-radius: 12px;
  position: relative;
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

.instruction {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  white-space: nowrap;
}

.buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.buttons button {
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-success {
  background: #4caf50;
  color: white;
}

.btn-secondary {
  background: #f5f5f5;
}

.btn-large {
  flex: 1;
}

.btn-primary:disabled,
.btn-success:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.last-result {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.last-result h3 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #999;
}

.result-info p {
  margin: 5px 0;
}

.status {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 10px;
}

.status.created { background: #e8f5e9; color: #4caf50; }
.status.duplicate { background: #fff3e0; color: #ff9800; }
.status.invalid { background: #ffebee; color: #f44336; }

.btn-results {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 18px;
}

.results-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.result-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 10px;
  margin-bottom: 10px;
}

.result-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.result-details {
  flex: 1;
}

.result-details p {
  margin: 3px 0;
  font-size: 14px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 8px;
}

.status-badge.created { background: #e8f5e9; color: #4caf50; }
.status-badge.duplicate { background: #fff3e0; color: #ff9800; }
.status-badge.invalid { background: #ffebee; color: #f44336; }

/* Loading */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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

.loading, .empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}
</style>