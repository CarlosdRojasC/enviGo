<template>
  <div class="driver-scanner">
    <!-- Header fijo -->
    <div class="fixed-header">
      <h1>📦 Scanner ML - EnviGo</h1>
      <div v-if="currentStep > 1" class="client-info">
        Cliente: <strong>{{ selectedClient?.name }}</strong>
      </div>
    </div>

    <!-- Paso 1: Selección de cliente -->
    <div v-if="currentStep === 1" class="step-container">
      <div class="step-header">
        <h2>👥 Seleccionar Cliente</h2>
        <p>Busca y selecciona el cliente que va a retirar</p>
      </div>

      <!-- Buscador -->
      <div class="search-container">
        <input 
          v-model="searchQuery"
          @input="searchClients"
          type="text"
          placeholder="🔍 Buscar cliente..."
          class="search-input"
        >
      </div>

      <!-- Lista de clientes -->
      <div class="clients-list">
        <div v-if="loadingClients" class="loading">
          Cargando clientes...
        </div>
        
        <div v-else-if="filteredClients.length === 0" class="no-results">
          {{ searchQuery ? 'No se encontraron clientes' : 'No hay clientes disponibles' }}
        </div>
        
        <div 
          v-else
          v-for="client in filteredClients" 
          :key="client.id"
          @click="selectClient(client)"
          class="client-card"
        >
          <div class="client-info">
            <h3>{{ client.name }}</h3>
            <p>{{ client.email }}</p>
            <p v-if="client.phone">📞 {{ client.phone }}</p>
          </div>
          <div class="select-arrow">▶️</div>
        </div>
      </div>
    </div>

    <!-- Paso 2: Nombre del repartidor -->
    <div v-if="currentStep === 2" class="step-container">
      <div class="step-header">
        <h2>👤 Información del Repartidor</h2>
        <p>Cliente: <strong>{{ selectedClient.name }}</strong></p>
      </div>

      <div class="driver-form">
        <input 
          v-model="driverName"
          type="text"
          placeholder="Tu nombre completo"
          class="driver-input"
          @keyup.enter="startSession"
        >
        
        <button 
          @click="startSession"
          :disabled="!driverName.trim() || startingSession"
          class="btn-start"
        >
          {{ startingSession ? 'Iniciando...' : '🚀 Empezar a Recolectar' }}
        </button>
      </div>

      <button @click="goBack" class="btn-back">← Cambiar Cliente</button>
    </div>

    <!-- Paso 3: Escaneo -->
    <div v-if="currentStep === 3" class="step-container">
      <div class="scan-header">
        <h2>📱 Escanear Etiquetas</h2>
        <div class="scan-stats">
          <span class="count">{{ scannedCount }} códigos</span>
          <span class="status">{{ sessionStatus }}</span>
        </div>
      </div>

      <!-- Input de escaneo -->
      <div class="scan-input-container">
        <input 
          ref="scanInput"
          v-model="currentScan"
          @keyup.enter="processScan"
          type="text"
          placeholder="📱 Escanea o ingresa código..."
          class="scan-input"
          :disabled="processing"
        >
        <button 
          @click="processScan"
          :disabled="!currentScan.trim() || processing"
          class="btn-scan"
        >
          {{ processing ? '⏳' : '✅' }}
        </button>
      </div>

      <!-- Lista de códigos escaneados -->
      <div class="scanned-list">
        <div v-if="scannedLabels.length === 0" class="no-scans">
          No hay códigos escaneados aún
        </div>
        
        <div 
          v-else
          v-for="(label, index) in scannedLabels" 
          :key="label.id"
          class="scan-item"
        >
          <div class="scan-info">
            <span class="scan-number">#{{ index + 1 }}</span>
            <span class="scan-code">{{ label.barcode_value }}</span>
            <span class="scan-time">{{ formatTime(label.scanned_at) }}</span>
          </div>
          <button 
            @click="removeScan(label.id)"
            class="btn-remove"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="scan-actions">
        <button 
          @click="finalizeSession"
          :disabled="scannedLabels.length === 0 || finalizing"
          class="btn-finalize"
        >
          {{ finalizing ? 'Procesando...' : `✅ Finalizar (${scannedCount})` }}
        </button>
        
        <button @click="cancelSession" class="btn-cancel">
          ❌ Cancelar
        </button>
      </div>
    </div>

    <!-- Paso 4: Resultados -->
    <div v-if="currentStep === 4" class="step-container">
      <div class="results-header">
        <h2>🎉 Proceso Completado</h2>
        <div class="results-summary">
          <div class="result-stat">
            <span class="number">{{ results.created_count }}</span>
            <span class="label">Pedidos Creados</span>
          </div>
          <div class="result-stat" v-if="results.error_count > 0">
            <span class="number error">{{ results.error_count }}</span>
            <span class="label">Errores</span>
          </div>
        </div>
      </div>

      <!-- Pedidos creados -->
      <div v-if="results.created_orders.length > 0" class="created-orders">
        <h3>✅ Pedidos Creados</h3>
        <div 
          v-for="order in results.created_orders" 
          :key="order.order_id"
          class="order-item"
        >
          <span class="order-number">{{ order.order_number }}</span>
          <span class="order-barcode">{{ order.barcode }}</span>
        </div>
      </div>

      <!-- Errores -->
      <div v-if="results.errors.length > 0" class="errors-list">
        <h3>❌ Errores</h3>
        <div 
          v-for="error in results.errors" 
          :key="error.barcode"
          class="error-item"
        >
          <span class="error-barcode">{{ error.barcode }}</span>
          <span class="error-message">{{ error.error }}</span>
        </div>
      </div>

      <!-- Acciones finales -->
      <div class="final-actions">
        <button @click="startNewSession" class="btn-new">
          🔄 Nueva Sesión
        </button>
        <button @click="goToDashboard" class="btn-dashboard">
          📊 Ver Dashboard
        </button>
      </div>
    </div>

    <!-- Toast de errores/mensajes -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'DriverMLScanner',
  data() {
    return {
      currentStep: 1,
      
      // Paso 1: Clientes
      clients: [],
      filteredClients: [],
      searchQuery: '',
      loadingClients: false,
      selectedClient: null,
      
      // Paso 2: Repartidor
      driverName: '',
      startingSession: false,
      
      // Paso 3: Escaneo
      sessionId: null,
      currentScan: '',
      scannedLabels: [],
      processing: false,
      finalizing: false,
      sessionStatus: 'Activo',
      
      // Paso 4: Resultados
      results: null,
      
      // UI
      toastMessage: '',
      toastType: 'info'
    }
  },
  computed: {
    scannedCount() {
      return this.scannedLabels.length
    }
  },
  async mounted() {
    await this.loadClients()
    
    // Auto-focus en input de escaneo cuando llegue al paso 3
    this.$watch('currentStep', (newStep) => {
      if (newStep === 3) {
        this.$nextTick(() => {
          this.$refs.scanInput?.focus()
        })
      }
    })
  },
  methods: {
    // ==================== PASO 1: CLIENTES ====================
    async loadClients() {
      this.loadingClients = true
      try {
        const token = this.getDriverToken()
        const response = await fetch(`/api/driver-scanner/clients?token=${token}`)
        const data = await response.json()
        
        if (data.success) {
          this.clients = data.clients
          this.filteredClients = data.clients
        } else {
          this.showToast('Error cargando clientes', 'error')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error')
      } finally {
        this.loadingClients = false
      }
    },

    searchClients() {
      if (!this.searchQuery.trim()) {
        this.filteredClients = this.clients
        return
      }
      
      const query = this.searchQuery.toLowerCase()
      this.filteredClients = this.clients.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)
      )
    },

    selectClient(client) {
      this.selectedClient = client
      this.currentStep = 2
    },

    // ==================== PASO 2: REPARTIDOR ====================
    goBack() {
      this.currentStep = 1
      this.selectedClient = null
      this.driverName = ''
    },

    async startSession() {
      if (!this.driverName.trim()) return
      
      this.startingSession = true
      try {
        const token = this.getDriverToken()
        const response = await fetch(`/api/driver-scanner/start-session?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: this.selectedClient.id,
            driver_name: this.driverName.trim()
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          this.sessionId = data.session.id
          this.currentStep = 3
          this.showToast('Sesión iniciada', 'success')
        } else {
          this.showToast(data.error || 'Error iniciando sesión', 'error')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error')
      } finally {
        this.startingSession = false
      }
    },

    // ==================== PASO 3: ESCANEO ====================
    async processScan() {
      if (!this.currentScan.trim() || this.processing) return
      
      this.processing = true
      try {
        const token = this.getDriverToken()
        const response = await fetch(`/api/driver-scanner/scan-label?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionId,
            barcode_value: this.currentScan.trim()
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          this.scannedLabels = data.session.labels
          this.currentScan = ''
          this.showToast('Código agregado', 'success')
          
          // Auto-focus para siguiente escaneo
          this.$nextTick(() => {
            this.$refs.scanInput?.focus()
          })
        } else {
          this.showToast(data.error || 'Error procesando código', 'error')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error')
      } finally {
        this.processing = false
      }
    },

    async removeScan(labelId) {
      try {
        const token = this.getDriverToken()
        const response = await fetch(`/api/driver-scanner/remove-scan/${this.sessionId}/${labelId}?token=${token}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        
        if (data.success) {
          this.scannedLabels = data.session.labels
          this.showToast('Código eliminado', 'info')
        } else {
          this.showToast(data.error || 'Error eliminando código', 'error')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error')
      }
    },

    async finalizeSession() {
      if (this.scannedLabels.length === 0 || this.finalizing) return
      
      this.finalizing = true
      this.sessionStatus = 'Finalizando...'
      
      try {
        const token = this.getDriverToken()
        const response = await fetch(`/api/driver-scanner/finalize-session?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionId
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          this.results = data.results
          this.currentStep = 4
          this.showToast(`${data.results.created_count} pedidos creados`, 'success')
        } else {
          this.showToast(data.error || 'Error finalizando sesión', 'error')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error')
      } finally {
        this.finalizing = false
        this.sessionStatus = 'Activo'
      }
    },

    cancelSession() {
      if (confirm('¿Seguro que quieres cancelar? Se perderán todos los códigos escaneados.')) {
        this.resetToStart()
      }
    },

    // ==================== PASO 4: RESULTADOS ====================
    startNewSession() {
      this.resetToStart()
    },

    goToDashboard() {
      // Redirigir al dashboard principal o cerrar
      window.location.href = '/dashboard'
    },

    // ==================== UTILIDADES ====================
    resetToStart() {
      this.currentStep = 1
      this.selectedClient = null
      this.driverName = ''
      this.sessionId = null
      this.currentScan = ''
      this.scannedLabels = []
      this.results = null
      this.sessionStatus = 'Activo'
    },

    getDriverToken() {
      // Obtener token de URL o localStorage
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('token') || localStorage.getItem('driver_token') || 'demo_token'
    },

    formatTime(dateString) {
      const date = new Date(dateString)
      return date.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    },

    showToast(message, type = 'info') {
      this.toastMessage = message
      this.toastType = type
      
      setTimeout(() => {
        this.toastMessage = ''
      }, 3000)
    }
  }
}
</script>

<style scoped>
/* ==================== ESTILOS MÓVIL-FIRST ==================== */
.driver-scanner {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding-bottom: 80px;
}

/* Header fijo */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.fixed-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
  text-align: center;
}

.client-info {
  margin-top: 8px;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
}

/* Container principal */
.step-container {
  margin-top: 100px;
  padding: 20px;
  min-height: calc(100vh - 100px);
}

/* ==================== PASO 1: CLIENTES ==================== */
.step-header {
  text-align: center;
  margin-bottom: 30px;
}

.step-header h2 {
  color: white;
  margin: 0 0 8px 0;
  font-size: 1.8rem;
}

.step-header p {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 1.1rem;
}

.search-container {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 16px 20px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  outline: none;
  box-shadow: 0 2px 20px rgba(59, 130, 246, 0.3);
}

.clients-list {
  max-height: 60vh;
  overflow-y: auto;
}

.loading, .no-results {
  text-align: center;
  color: white;
  padding: 40px 20px;
  font-size: 1.1rem;
}

.client-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.client-card:hover,
.client-card:active {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.client-info {
  flex: 1;
}

.client-info h3 {
  margin: 0 0 4px 0;
  color: #1f2937;
  font-size: 1.2rem;
}

.client-info p {
  margin: 2px 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.select-arrow {
  font-size: 1.2rem;
  color: #3b82f6;
}

/* ==================== PASO 2: REPARTIDOR ==================== */
.driver-form {
  background: white;
  border-radius: 16px;
  padding: 30px 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.driver-input {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1.1rem;
  margin-bottom: 20px;
  transition: border-color 0.2s ease;
}

.driver-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn-start {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
}

.btn-start:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-back {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ==================== PASO 3: ESCANEO ==================== */
.scan-header {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.scan-header h2 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 1.5rem;
}

.scan-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count {
  font-size: 1.2rem;
  font-weight: 600;
  color: #059669;
}

.status {
  font-size: 0.9rem;
  color: #6b7280;
}

.scan-input-container {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.scan-input {
  flex: 1;
  padding: 16px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1.1rem;
  background: white;
}

.scan-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn-scan {
  padding: 16px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  cursor: pointer;
  min-width: 60px;
}

.btn-scan:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scanned-list {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  max-height: 40vh;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.no-scans {
  text-align: center;
  color: #9ca3af;
  padding: 40px 20px;
  font-style: italic;
}

.scan-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.scan-item:last-child {
  border-bottom: none;
}

.scan-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scan-number {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 600;
}

.scan-code {
  font-family: monospace;
  font-size: 0.9rem;
  color: #1f2937;
  font-weight: 500;
}

.scan-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

.btn-remove {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-remove:hover {
  background: #fee2e2;
}

.scan-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-finalize {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.3rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-finalize:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(5, 150, 105, 0.4);
}

.btn-finalize:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-cancel {
  width: 100%;
  padding: 14px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 2px solid #fecaca;
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* ==================== PASO 4: RESULTADOS ==================== */
.results-header {
  background: white;
  border-radius: 16px;
  padding: 30px 20px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.results-header h2 {
  margin: 0 0 20px 0;
  color: #059669;
  font-size: 1.8rem;
}

.results-summary {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.result-stat {
  text-align: center;
}

.result-stat .number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #059669;
}

.result-stat .number.error {
  color: #dc2626;
}

.result-stat .label {
  font-size: 0.9rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.created-orders, .errors-list {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.created-orders h3, .errors-list h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 1.2rem;
}

.order-item, .error-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.order-item:last-child, .error-item:last-child {
  border-bottom: none;
}

.order-number {
  font-weight: 600;
  color: #059669;
}

.order-barcode, .error-barcode {
  font-family: monospace;
  font-size: 0.85rem;
  color: #6b7280;
}

.error-message {
  font-size: 0.85rem;
  color: #dc2626;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.final-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-new, .btn-dashboard {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-new {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
}

.btn-dashboard {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-dashboard:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ==================== TOAST ==================== */
.toast {
  position: fixed;
  bottom: 30px;
  left: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 12px;
  color: white;
  font-weight: 500;
  text-align: center;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.toast.success {
  background: #059669;
}

.toast.error {
  background: #dc2626;
}

.toast.info {
  background: #3b82f6;
}

@keyframes slideUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 480px) {
  .step-container {
    padding: 16px;
  }
  
  .results-summary {
    gap: 20px;
  }
  
  .result-stat .number {
    font-size: 1.5rem;
  }
  
  .scan-input-container {
    flex-direction: column;
  }
  
  .btn-scan {
    width: 100%;
  }
}

/* ==================== MODO OSCURO ==================== */
@media (prefers-color-scheme: dark) {
  .fixed-header {
    background: rgba(31, 41, 55, 0.95);
    border-bottom-color: #374151;
  }
  
  .fixed-header h1 {
    color: #f9fafb;
  }
  
  .client-info {
    color: #d1d5db;
  }
}
</style>