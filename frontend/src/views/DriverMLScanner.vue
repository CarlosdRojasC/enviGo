<template>
  <div id="app">
    <!-- Loading Screen -->
    <div v-if="loading" class="loading-screen">
      <div class="loading-content">
        <div class="spinner"></div>
        <h2>Verificando acceso...</h2>
        <p>Validando credenciales del sistema</p>
      </div>
    </div>

    <!-- Error Screen -->
    <div v-else-if="error" class="error-screen">
      <div class="error-content">
        <div class="error-icon">🚫</div>
        <h2>Acceso Denegado</h2>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="checkAccess" class="btn btn-primary">
            🔄 Reintentar
          </button>
          <button @click="clearData" class="btn btn-secondary">
            🗑️ Limpiar Datos
          </button>
        </div>
      </div>
    </div>

    <!-- Main App -->
    <div v-else class="main-app">
      <!-- Header -->
      <header class="app-header">
        <h1>📦 Scanner ML - EnviGo</h1>
        <div v-if="selectedClient" class="client-info">
          Cliente: <strong>{{ selectedClient.name }}</strong>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="`width: ${(currentStep / 4) * 100}%`"></div>
        </div>
      </header>

      <!-- Step 1: Seleccionar Cliente -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="step-header">
          <h2>👥 Seleccionar Cliente</h2>
          <p>Busca y selecciona el cliente que va a retirar</p>
        </div>

        <div class="search-box">
          <input 
            v-model="searchQuery"
            @input="filterClients"
            type="text"
            placeholder="Buscar cliente por nombre o email..."
            class="search-input"
          >
        </div>

        <div class="clients-list">
          <div v-if="loadingClients" class="loading-state">
            <div class="spinner small"></div>
            <p>Cargando clientes...</p>
          </div>
          
          <div v-else-if="filteredClients.length === 0" class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>{{ searchQuery ? 'Sin resultados' : 'No hay clientes' }}</h3>
            <p>{{ searchQuery ? 'Intenta con otros términos' : 'No hay clientes disponibles' }}</p>
          </div>
          
          <div v-else class="clients-grid">
            <div 
              v-for="client in filteredClients" 
              :key="client.id"
              @click="selectClient(client)"
              class="client-card"
              :class="{ selected: selectedClient?.id === client.id }"
            >
              <div class="client-avatar">
                {{ getInitials(client.name) }}
              </div>
              <div class="client-info">
                <h3>{{ client.name }}</h3>
                <p>{{ client.email }}</p>
                <p v-if="client.phone">📞 {{ client.phone }}</p>
              </div>
              <div class="select-arrow">▶</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Info del Repartidor -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="step-header">
          <h2>👤 Información del Repartidor</h2>
          <div class="selected-client">
            Cliente: <strong>{{ selectedClient.name }}</strong>
          </div>
        </div>

        <div class="form-container">
          <div class="form-group">
            <label for="driverName">Tu nombre completo:</label>
            <input 
              id="driverName"
              v-model="driverName"
              type="text"
              placeholder="Ej: Juan Pérez"
              class="form-input"
              @keyup.enter="startSession"
            >
          </div>
          
          <button 
            @click="startSession"
            :disabled="!driverName.trim() || startingSession"
            class="btn btn-primary btn-large"
          >
            {{ startingSession ? '⏳ Iniciando...' : '🚀 Empezar a Recolectar' }}
          </button>
          
          <button @click="goBack" class="btn btn-secondary">
            ← Cambiar Cliente
          </button>
        </div>
      </div>

      <!-- Step 3: Escaneo -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="scan-header">
          <h2>📱 Escanear Etiquetas</h2>
          <div class="scan-stats">
            <div class="stat">
              <span class="number">{{ scannedLabels.length }}</span>
              <span class="label">códigos</span>
            </div>
            <div class="stat">
              <span class="status-dot active"></span>
              <span class="label">Activo</span>
            </div>
          </div>
        </div>

        <div class="scan-input-section">
          <div class="input-group">
            <input 
              ref="scanInput"
              v-model="currentScan"
              @keyup.enter="processScan"
              type="text"
              placeholder="Escanea o ingresa código ML..."
              class="scan-input"
              :disabled="processing"
            >
            <button 
              @click="processScan"
              :disabled="!currentScan.trim() || processing"
              class="btn btn-primary"
            >
              {{ processing ? '⏳' : '✅' }}
            </button>
          </div>
          
          <div v-if="lastResult" class="scan-result" :class="lastResult.type">
            {{ lastResult.icon }} {{ lastResult.message }}
          </div>
        </div>

        <div class="scanned-list">
          <div v-if="scannedLabels.length === 0" class="empty-state">
            <div class="empty-icon">📱</div>
            <h3>Listo para escanear</h3>
            <p>Escanea o ingresa el primer código</p>
          </div>
          
          <div v-else class="scanned-items">
            <div class="list-header">
              <h3>Códigos escaneados ({{ scannedLabels.length }})</h3>
              <button 
                v-if="scannedLabels.length > 1"
                @click="clearAllScans"
                class="btn btn-danger btn-small"
              >
                🗑️ Limpiar
              </button>
            </div>
            
            <div 
              v-for="(label, index) in scannedLabels" 
              :key="label.id"
              class="scan-item"
            >
              <div class="scan-number">#{{ index + 1 }}</div>
              <div class="scan-info">
                <span class="code">{{ label.barcode_value }}</span>
                <span class="time">{{ formatTime(label.scanned_at) }}</span>
              </div>
              <button 
                @click="removeScan(label.id)"
                class="btn-remove"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        <div class="scan-actions">
          <button 
            @click="finalizeSession"
            :disabled="scannedLabels.length === 0 || finalizing"
            class="btn btn-success btn-large"
          >
            {{ finalizing ? '⏳ Procesando...' : `✅ Finalizar (${scannedLabels.length})` }}
          </button>
          
          <button @click="cancelSession" class="btn btn-danger">
            ❌ Cancelar
          </button>
        </div>
      </div>

      <!-- Step 4: Resultados -->
      <div v-if="currentStep === 4" class="step-content">
        <div class="results-header">
          <div class="results-icon">🎉</div>
          <h2>Proceso Completado</h2>
          <div class="results-summary">
            <div class="result-stat success">
              <span class="number">{{ results?.created_count || 0 }}</span>
              <span class="label">Creados</span>
            </div>
            <div v-if="results?.error_count > 0" class="result-stat error">
              <span class="number">{{ results.error_count }}</span>
              <span class="label">Errores</span>
            </div>
          </div>
        </div>

        <div v-if="results?.created_orders?.length > 0" class="results-section">
          <h3>✅ Pedidos Creados</h3>
          <div class="orders-list">
            <div 
              v-for="order in results.created_orders" 
              :key="order.order_id"
              class="order-item"
            >
              <span class="order-number">{{ order.order_number }}</span>
              <span class="order-barcode">{{ order.barcode }}</span>
              <span class="order-status">✅</span>
            </div>
          </div>
        </div>

        <div class="final-actions">
          <button @click="startNewSession" class="btn btn-primary btn-large">
            🔄 Nueva Sesión
          </button>
          <button @click="shareSummary" class="btn btn-secondary">
            📤 Compartir
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div v-if="toast.message" class="toast" :class="toast.type">
      <span>{{ toast.icon }} {{ toast.message }}</span>
      <button @click="clearToast" class="toast-close">×</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DriverMLScanner',
  data() {
    return {
      // Estado general
      loading: true,
      error: null,
      currentStep: 1,
      
      // Clientes
      clients: [],
      filteredClients: [],
      selectedClient: null,
      searchQuery: '',
      loadingClients: false,
      
      // Repartidor
      driverName: '',
      startingSession: false,
      
      // Sesión de escaneo
      sessionId: null,
      currentScan: '',
      scannedLabels: [],
      processing: false,
      finalizing: false,
      lastResult: null,
      
      // Resultados
      results: null,
      
      // UI
      toast: { message: '', type: 'info', icon: 'ℹ️' }
    }
  },

  async mounted() {
    await this.checkAccess()
  },

  methods: {
    // ==================== AUTENTICACIÓN ====================
    
    async checkAccess() {
      this.loading = true
      this.error = null
      
      try {
        const token = this.getToken()
        
        if (!token) {
          throw new Error('No se encontró token de acceso válido')
        }
        
        // PRIMER FIX: usar URL completa hasta que se arregle el backend
        const response = await fetch(`https://envigo-backend-production.up.railway.app/api/driver-scanner/verify-access?token=${token}`)
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (data.valid) {
          this.loading = false
          await this.loadClients()
          this.showToast('Acceso verificado correctamente', 'success', '✅')
        } else {
          throw new Error(data.error || 'Token inválido')
        }
        
      } catch (error) {
        console.error('Error de autenticación:', error)
        this.error = error.message
        this.loading = false
      }
    },

    getToken() {
      // 1. URL parameter
      const urlParams = new URLSearchParams(window.location.search)
      const tokenFromUrl = urlParams.get('token')
      
      if (tokenFromUrl) {
        localStorage.setItem('driver_scanner_token', tokenFromUrl)
        // Limpiar URL
        const url = new URL(window.location)
        url.searchParams.delete('token')
        window.history.replaceState({}, '', url.toString())
        return tokenFromUrl
      }
      
      // 2. localStorage
      return localStorage.getItem('driver_scanner_token')
    },

    clearData() {
      localStorage.removeItem('driver_scanner_token')
      this.error = null
      this.checkAccess()
    },

    // ==================== CLIENTES ====================
    
    async loadClients() {
      this.loadingClients = true
      try {
        const token = this.getToken()
        const response = await fetch(`https://envigo-backend-production.up.railway.app/api/driver-scanner/clients?token=${token}`)
        const data = await response.json()
        
        if (data.success) {
          this.clients = data.clients
          this.filteredClients = data.clients
        } else {
          this.showToast('Error cargando clientes', 'error', '❌')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error', '❌')
      } finally {
        this.loadingClients = false
      }
    },

    filterClients() {
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

    getInitials(name) {
      return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    },

    selectClient(client) {
      this.selectedClient = client
      this.currentStep = 2
      this.$nextTick(() => {
        document.getElementById('driverName')?.focus()
      })
    },

    // ==================== SESIÓN ====================
    
    goBack() {
      this.currentStep = 1
      this.selectedClient = null
      this.driverName = ''
    },

    async startSession() {
      if (!this.driverName.trim()) {
        this.showToast('Ingresa tu nombre', 'error', '⚠️')
        return
      }
      
      this.startingSession = true
      try {
        const token = this.getToken()
        const response = await fetch(`https://envigo-backend-production.up.railway.app/api/driver-scanner/start-session?token=${token}`, {
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
          this.showToast('Sesión iniciada', 'success', '✅')
          
          this.$nextTick(() => {
            this.$refs.scanInput?.focus()
          })
        } else {
          this.showToast(data.error || 'Error iniciando sesión', 'error', '❌')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error', '❌')
      } finally {
        this.startingSession = false
      }
    },

    // ==================== ESCANEO ====================
    
    async processScan() {
      if (!this.currentScan.trim() || this.processing) return
      
      const barcode = this.currentScan.trim()
      
      // Validación simple
      if (!this.isValidCode(barcode)) {
        this.showScanResult('error', '❌', 'Código no válido')
        this.currentScan = ''
        return
      }
      
      // Verificar duplicados
      if (this.scannedLabels.some(label => label.barcode_value === barcode)) {
        this.showScanResult('warning', '⚠️', 'Código ya escaneado')
        this.currentScan = ''
        return
      }
      
      this.processing = true
      try {
        const token = this.getToken()
        const response = await fetch(`https://envigo-backend-production.up.railway.app/api/driver-scanner/scan-label?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionId,
            barcode_value: barcode
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          this.scannedLabels = data.session.labels
          this.currentScan = ''
          this.showScanResult('success', '✅', `Código #${this.scannedLabels.length} agregado`)
        } else {
          this.showScanResult('error', '❌', data.error || 'Error procesando código')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showScanResult('error', '❌', 'Error de conexión')
      } finally {
        this.processing = false
        this.$nextTick(() => {
          this.$refs.scanInput?.focus()
        })
      }
    },

    isValidCode(code) {
      // Validación simple: 8-25 caracteres alfanuméricos
      const clean = code.trim()
      return clean.length >= 8 && clean.length <= 25 && /^[A-Z0-9]+$/i.test(clean)
    },

    showScanResult(type, icon, message) {
      this.lastResult = { type, icon, message }
      setTimeout(() => {
        if (this.lastResult?.message === message) {
          this.lastResult = null
        }
      }, 3000)
    },

    async removeScan(labelId) {
      try {
        const token = this.getToken()
        const response = await fetch(`https://envigo-backend-production.up.railway.app/api/driver-scanner/remove-scan/${this.sessionId}/${labelId}?token=${token}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        
        if (data.success) {
          this.scannedLabels = data.session.labels
          this.showToast('Código eliminado', 'info', 'ℹ️')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error eliminando código', 'error', '❌')
      }
    },

    clearAllScans() {
      if (confirm(`¿Eliminar todos los ${this.scannedLabels.length} códigos?`)) {
        this.scannedLabels.forEach(label => {
          this.removeScan(label.id)
        })
      }
    },

    async finalizeSession() {
      if (this.scannedLabels.length === 0) return
      
      if (!confirm(`¿Finalizar sesión con ${this.scannedLabels.length} códigos?`)) {
        return
      }
      
      this.finalizing = true
      try {
        const token = this.getToken()
        const response = await fetch(`https://envigo-backend-production.up.railway.app/api/driver-scanner/finalize-session?token=${token}`, {
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
          
          const { created_count, error_count } = data.results
          this.showToast(
            `✅ ${created_count} pedidos creados${error_count > 0 ? `, ${error_count} errores` : ''}`, 
            'success', '✅'
          )
        } else {
          this.showToast(data.error || 'Error finalizando sesión', 'error', '❌')
        }
      } catch (error) {
        console.error('Error:', error)
        this.showToast('Error de conexión', 'error', '❌')
      } finally {
        this.finalizing = false
      }
    },

    cancelSession() {
      if (confirm('¿Cancelar sesión? Se perderán todos los códigos.')) {
        this.resetSession()
        this.showToast('Sesión cancelada', 'info', 'ℹ️')
      }
    },

    // ==================== RESULTADOS ====================
    
    startNewSession() {
      this.resetSession()
      this.showToast('Iniciando nueva sesión', 'info', 'ℹ️')
    },

    async shareSummary() {
      const summary = `📦 Resumen - EnviGo\n\n👤 Repartidor: ${this.driverName}\n👥 Cliente: ${this.selectedClient.name}\n✅ Pedidos: ${this.results.created_count}\n❌ Errores: ${this.results.error_count}`
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Resumen de Recolección - EnviGo',
            text: summary
          })
        } catch (error) {
          console.log('Share cancelled')
        }
      } else {
        try {
          await navigator.clipboard.writeText(summary)
          this.showToast('Resumen copiado', 'success', '✅')
        } catch (error) {
          console.error('Error copying:', error)
        }
      }
    },

    resetSession() {
      this.currentStep = 1
      this.selectedClient = null
      this.driverName = ''
      this.sessionId = null
      this.currentScan = ''
      this.scannedLabels = []
      this.results = null
      this.lastResult = null
    },

    // ==================== UTILIDADES ====================
    
    formatTime(dateString) {
      return new Date(dateString).toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    },

    showToast(message, type = 'info', icon = 'ℹ️') {
      this.toast = { message, type, icon }
      
      setTimeout(() => {
        this.clearToast()
      }, type === 'error' ? 5000 : 3000)
    },

    clearToast() {
      this.toast = { message: '', type: 'info', icon: 'ℹ️' }
    }
  }
}
</script>

<style scoped>
/* ==================== VARIABLES ==================== */
:root {
  --primary: #667eea;
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-500: #6b7280;
  --gray-800: #1f2937;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --radius: 8px;
}

/* ==================== LAYOUT ==================== */
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ==================== PANTALLAS DE ESTADO ==================== */
.loading-screen,
.error-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.loading-content,
.error-content {
  background: white;
  border-radius: var(--radius);
  padding: 40px 30px;
  text-align: center;
  box-shadow: var(--shadow);
  max-width: 400px;
  width: 100%;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--gray-200);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.spinner.small {
  width: 24px;
  height: 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  color: var(--error);
  margin-bottom: 16px;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

/* ==================== MAIN APP ==================== */
.main-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 16px 20px;
  text-align: center;
  border-bottom: 1px solid var(--gray-200);
}

.app-header h1 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: var(--gray-800);
}

.client-info {
  font-size: 0.9rem;
  color: var(--gray-500);
  margin-bottom: 12px;
}

.progress-bar {
  height: 4px;
  background: var(--gray-200);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  transition: width 0.3s ease;
}

/* ==================== CONTENIDO DE PASOS ==================== */
.step-content {
  flex: 1;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.step-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.step-header h2 {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.step-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.selected-client {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  border-radius: var(--radius);
  margin-bottom: 20px;
}

/* ==================== BUSCADOR ==================== */
.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 16px 20px;
  border: none;
  border-radius: var(--radius);
  font-size: 1.1rem;
  box-shadow: var(--shadow);
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* ==================== LISTAS ==================== */
.clients-list,
.scanned-list {
  background: white;
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
  margin-bottom: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--gray-500);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.clients-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.client-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.client-card:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.client-card.selected {
  border-color: var(--primary);
  background: #f0f9ff;
}

.client-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 16px;
}

.client-info {
  flex: 1;
}

.client-info h3 {
  margin: 0 0 4px 0;
  color: var(--gray-800);
  font-size: 1.1rem;
}

.client-info p {
  margin: 2px 0;
  color: var(--gray-500);
  font-size: 0.9rem;
}

.select-arrow {
  font-size: 1.2rem;
  color: var(--primary);
  margin-left: 12px;
}

/* ==================== FORMULARIOS ==================== */
.form-container {
  background: white;
  border-radius: var(--radius);
  padding: 30px 24px;
  box-shadow: var(--shadow);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--gray-800);
}

.form-input {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* ==================== ESCANEO ==================== */
.scan-header {
  background: white;
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: var(--shadow);
}

.scan-header h2 {
  margin: 0 0 16px 0;
  color: var(--gray-800);
  font-size: 1.5rem;
}

.scan-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  align-items: center;
}

.stat {
  text-align: center;
}

.stat .number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--success);
}

.stat .label {
  font-size: 0.85rem;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}

.status-dot.active {
  background: var(--success);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.scan-input-section {
  background: white;
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: var(--shadow);
}

.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.scan-input {
  flex: 1;
  padding: 16px 20px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  font-size: 1.1rem;
  font-family: monospace;
  transition: all 0.2s ease;
}

.scan-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.scan-result {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 500;
}

.scan-result.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.scan-result.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.scan-result.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.scanned-items {
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--gray-200);
}

.list-header h3 {
  margin: 0;
  color: var(--gray-800);
  font-size: 1.1rem;
}

.scan-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--gray-100);
}

.scan-item:last-child {
  border-bottom: none;
}

.scan-number {
  width: 40px;
  height: 32px;
  background: var(--gray-100);
  color: var(--gray-500);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 16px;
}

.scan-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scan-info .code {
  font-family: monospace;
  font-size: 0.95rem;
  color: var(--gray-800);
  font-weight: 500;
}

.scan-info .time {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.btn-remove {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: var(--radius);
  padding: 8px 12px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn-remove:hover {
  background: #fecaca;
  transform: scale(1.05);
}

/* ==================== RESULTADOS ==================== */
.results-header {
  background: white;
  border-radius: var(--radius);
  padding: 32px 24px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: var(--shadow);
}

.results-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.results-header h2 {
  margin: 0 0 24px 0;
  color: var(--success);
  font-size: 1.8rem;
}

.results-summary {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.result-stat {
  text-align: center;
  padding: 16px;
  border-radius: var(--radius);
  min-width: 100px;
}

.result-stat.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.result-stat.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.result-stat .number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.result-stat.success .number {
  color: var(--success);
}

.result-stat.error .number {
  color: var(--error);
}

.result-stat .label {
  font-size: 0.85rem;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-section {
  background: white;
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow);
}

.results-section h3 {
  margin: 0 0 16px 0;
  color: var(--gray-800);
  font-size: 1.2rem;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--gray-100);
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.order-number {
  font-weight: 600;
  color: var(--success);
}

.order-barcode {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--gray-500);
}

.order-status {
  font-size: 1.2rem;
}

/* ==================== ACCIONES ==================== */
.scan-actions,
.final-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  padding: 14px 20px;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-secondary {
  background: var(--gray-200);
  color: var(--gray-800);
}

.btn-success {
  background: var(--success);
  color: white;
}

.btn-danger {
  background: var(--error);
  color: white;
}

.btn-large {
  padding: 18px 24px;
  font-size: 1.2rem;
}

.btn-small {
  padding: 8px 12px;
  font-size: 0.85rem;
}

/* ==================== TOAST ==================== */
.toast {
  position: fixed;
  bottom: 30px;
  left: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: var(--radius);
  color: white;
  font-weight: 500;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow);
}

.toast.success {
  background: var(--success);
}

.toast.error {
  background: var(--error);
}

.toast.warning {
  background: var(--warning);
}

.toast.info {
  background: var(--primary);
}

.toast-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  margin-left: 12px;
  opacity: 0.8;
}

.toast-close:hover {
  opacity: 1;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 640px) {
  .step-content {
    padding: 16px;
  }
  
  .app-header {
    padding: 12px 16px;
  }
  
  .input-group {
    flex-direction: column;
    gap: 12px;
  }
  
  .scan-stats {
    gap: 24px;
  }
  
  .results-summary {
    gap: 16px;
  }
  
  .result-stat .number {
    font-size: 1.5rem;
  }
  
  .error-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .toast {
    left: 12px;
    right: 12px;
    bottom: 20px;
  }
}
</style>