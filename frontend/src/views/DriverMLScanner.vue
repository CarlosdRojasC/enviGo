<template>
  <div class="driver-scanner">
    <!-- 🔐 Pantalla de verificación de acceso -->
    <div v-if="checking" class="auth-screen">
      <div class="auth-container">
        <div class="auth-loading">
          <div class="spinner"></div>
          <h2>🔐 Verificando acceso...</h2>
          <p>Validando credenciales del sistema</p>
        </div>
      </div>
    </div>

    <!-- ❌ Pantalla de error de autenticación -->
    <div v-else-if="!isAuthenticated" class="auth-screen">
      <div class="auth-container">
        <div class="auth-error">
          <div class="error-icon">🚫</div>
          <h2>Acceso Denegado</h2>
          <p class="error-message">{{ authError }}</p>
          <div class="auth-actions">
            <button @click="verifyAccess" class="btn-retry">
              🔄 Reintentar
            </button>
            <button @click="clearStoredToken" class="btn-clear">
              🗑️ Limpiar Datos
            </button>
          </div>
          <div class="auth-help">
            <p><strong>💡 ¿Cómo obtener acceso?</strong></p>
            <ul>
              <li>Contacta al administrador del sistema</li>
              <li>Solicita un nuevo link de acceso</li>
              <li>Verifica tu conexión a internet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ Aplicación principal (cuando está autenticado) -->
    <div v-else class="scanner-app">
      <!-- Header fijo -->
      <div class="fixed-header">
        <div class="header-content">
          <h1>📦 Scanner ML - EnviGo</h1>
          <div v-if="currentStep > 1" class="client-info">
            Cliente: <strong>{{ selectedClient?.name }}</strong>
          </div>
        </div>
        <!-- Indicador de progreso -->
        <div class="progress-indicator">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(currentStep / 4) * 100}%` }"
            ></div>
          </div>
          <div class="step-labels">
            <span :class="{ active: currentStep >= 1 }">👥</span>
            <span :class="{ active: currentStep >= 2 }">👤</span>
            <span :class="{ active: currentStep >= 3 }">📱</span>
            <span :class="{ active: currentStep >= 4 }">🎉</span>
          </div>
        </div>
      </div>

      <!-- 📋 PASO 1: Selección de cliente -->
      <div v-if="currentStep === 1" class="step-container">
        <div class="step-header">
          <h2>👥 Seleccionar Cliente</h2>
          <p>Busca y selecciona el cliente que va a retirar</p>
        </div>

        <!-- Buscador optimizado -->
        <div class="search-container">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              ref="searchInput"
              v-model="searchQuery"
              @input="searchClients"
              type="text"
              placeholder="Buscar cliente por nombre o email..."
              class="search-input"
              autocomplete="off"
            >
            <button 
              v-if="searchQuery" 
              @click="clearSearch"
              class="clear-search"
            >
              ❌
            </button>
          </div>
        </div>

        <!-- Lista de clientes -->
        <div class="clients-list">
          <div v-if="loadingClients" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Cargando clientes...</p>
          </div>
          
          <div v-else-if="filteredClients.length === 0" class="no-results">
            <div class="no-results-icon">🔍</div>
            <h3>{{ searchQuery ? 'Sin resultados' : 'No hay clientes' }}</h3>
            <p>{{ searchQuery ? 'Intenta con otros términos de búsqueda' : 'No hay clientes disponibles en el sistema' }}</p>
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
                {{ getClientInitials(client.name) }}
              </div>
              <div class="client-info">
                <h3>{{ client.name }}</h3>
                <p class="client-email">{{ client.email }}</p>
                <p v-if="client.phone" class="client-phone">📞 {{ client.phone }}</p>
              </div>
              <div class="select-arrow">▶️</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 👤 PASO 2: Información del repartidor -->
      <div v-if="currentStep === 2" class="step-container">
        <div class="step-header">
          <h2>👤 Información del Repartidor</h2>
          <div class="selected-client-info">
            <span class="label">Cliente seleccionado:</span>
            <span class="client-name">{{ selectedClient.name }}</span>
          </div>
        </div>

        <div class="driver-form">
          <div class="input-group">
            <label for="driverName">Tu nombre completo:</label>
            <input 
              id="driverName"
              ref="driverInput"
              v-model="driverName"
              type="text"
              placeholder="Ej: Juan Pérez"
              class="driver-input"
              @keyup.enter="startSession"
              autocomplete="name"
            >
          </div>
          
          <button 
            @click="startSession"
            :disabled="!driverName.trim() || startingSession"
            class="btn-start"
          >
            <span class="btn-icon">{{ startingSession ? '⏳' : '🚀' }}</span>
            <span class="btn-text">{{ startingSession ? 'Iniciando sesión...' : 'Empezar a Recolectar' }}</span>
          </button>
        </div>

        <button @click="goBack" class="btn-back">
          <span class="btn-icon">←</span>
          <span class="btn-text">Cambiar Cliente</span>
        </button>
      </div>

      <!-- 📱 PASO 3: Escaneo -->
      <div v-if="currentStep === 3" class="step-container">
        <div class="scan-header">
          <h2>📱 Escanear Etiquetas</h2>
          <div class="scan-stats">
            <div class="stat-item">
              <span class="stat-number">{{ scannedCount }}</span>
              <span class="stat-label">códigos</span>
            </div>
            <div class="stat-item">
              <span class="status-indicator" :class="sessionStatusClass"></span>
              <span class="stat-label">{{ sessionStatus }}</span>
            </div>
          </div>
        </div>

        <!-- Input de escaneo optimizado -->
        <div class="scan-input-container">
          <div class="scan-input-wrapper">
            <span class="scan-icon">📱</span>
            <input 
              ref="scanInput"
              v-model="currentScan"
              @keyup.enter="processScan"
              @paste="handlePaste"
              type="text"
              placeholder="Escanea o ingresa código ML..."
              class="scan-input"
              :disabled="processing"
              autocomplete="off"
            >
            <button 
              @click="processScan"
              :disabled="!currentScan.trim() || processing"
              class="btn-scan"
            >
              {{ processing ? '⏳' : '✅' }}
            </button>
          </div>
          
          <!-- Indicador de última acción -->
          <div v-if="lastScanResult" class="last-scan-result" :class="lastScanResult.type">
            <span class="result-icon">{{ lastScanResult.icon }}</span>
            <span class="result-text">{{ lastScanResult.message }}</span>
          </div>
        </div>

        <!-- Lista de códigos escaneados -->
        <div class="scanned-list">
          <div v-if="scannedLabels.length === 0" class="no-scans">
            <div class="no-scans-icon">📱</div>
            <h3>Listo para escanear</h3>
            <p>Escanea o ingresa el primer código para comenzar</p>
          </div>
          
          <div v-else class="scanned-items">
            <div class="list-header">
              <h3>Códigos escaneados ({{ scannedCount }})</h3>
              <button 
                v-if="scannedLabels.length > 1"
                @click="clearAllScans"
                class="btn-clear-all"
              >
                🗑️ Limpiar todo
              </button>
            </div>
            
            <div 
              v-for="(label, index) in scannedLabels" 
              :key="label.id"
              class="scan-item"
              :class="{ recent: isRecentScan(label) }"
            >
              <div class="scan-number">
                #{{ index + 1 }}
              </div>
              <div class="scan-info">
                <span class="scan-code">{{ label.barcode_value }}</span>
                <span class="scan-time">{{ formatTime(label.scanned_at) }}</span>
              </div>
              <button 
                @click="removeScan(label.id)"
                class="btn-remove"
                :title="`Eliminar código ${label.barcode_value}`"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="scan-actions">
          <button 
            @click="finalizeSession"
            :disabled="scannedLabels.length === 0 || finalizing"
            class="btn-finalize"
          >
            <span class="btn-icon">{{ finalizing ? '⏳' : '✅' }}</span>
            <span class="btn-text">{{ finalizing ? 'Procesando...' : `Finalizar (${scannedCount})` }}</span>
          </button>
          
          <button @click="cancelSession" class="btn-cancel">
            <span class="btn-icon">❌</span>
            <span class="btn-text">Cancelar</span>
          </button>
        </div>
      </div>

      <!-- 🎉 PASO 4: Resultados -->
      <div v-if="currentStep === 4" class="step-container">
        <div class="results-header">
          <div class="results-icon">🎉</div>
          <h2>Proceso Completado</h2>
          <div class="results-summary">
            <div class="result-stat success">
              <span class="number">{{ results.created_count }}</span>
              <span class="label">Pedidos Creados</span>
            </div>
            <div v-if="results.error_count > 0" class="result-stat error">
              <span class="number">{{ results.error_count }}</span>
              <span class="label">Errores</span>
            </div>
            <div class="result-stat info">
              <span class="number">{{ scannedCount }}</span>
              <span class="label">Total Escaneados</span>
            </div>
          </div>
        </div>

        <!-- Pedidos creados exitosamente -->
        <div v-if="results.created_orders.length > 0" class="created-orders">
          <h3>✅ Pedidos Creados Exitosamente</h3>
          <div class="orders-list">
            <div 
              v-for="order in results.created_orders" 
              :key="order.order_id"
              class="order-item"
            >
              <div class="order-info">
                <span class="order-number">{{ order.order_number }}</span>
                <span class="order-barcode">{{ order.barcode }}</span>
              </div>
              <div class="order-status">✅</div>
            </div>
          </div>
        </div>

        <!-- Errores encontrados -->
        <div v-if="results.errors.length > 0" class="errors-list">
          <h3>❌ Códigos con Errores</h3>
          <div class="errors-items">
            <div 
              v-for="error in results.errors" 
              :key="error.barcode"
              class="error-item"
            >
              <div class="error-info">
                <span class="error-barcode">{{ error.barcode }}</span>
                <span class="error-message">{{ error.error }}</span>
              </div>
              <div class="error-status">❌</div>
            </div>
          </div>
        </div>

        <!-- Resumen detallado -->
        <div class="detailed-summary">
          <h3>📊 Resumen Detallado</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Cliente:</span>
              <span class="summary-value">{{ selectedClient.name }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Repartidor:</span>
              <span class="summary-value">{{ driverName }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Fecha:</span>
              <span class="summary-value">{{ formatDateTime(new Date()) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Duración:</span>
              <span class="summary-value">{{ getSessionDuration() }}</span>
            </div>
          </div>
        </div>

        <!-- Acciones finales -->
        <div class="final-actions">
          <button @click="startNewSession" class="btn-new">
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Nueva Sesión</span>
          </button>
          <button @click="goToDashboard" class="btn-dashboard">
            <span class="btn-icon">📊</span>
            <span class="btn-text">Ver Dashboard</span>
          </button>
          <button @click="shareResults" class="btn-share">
            <span class="btn-icon">📤</span>
            <span class="btn-text">Compartir</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 🔔 Toast de notificaciones -->
    <transition name="toast">
      <div v-if="toastMessage" class="toast" :class="toastType">
        <span class="toast-icon">{{ getToastIcon(toastType) }}</span>
        <span class="toast-text">{{ toastMessage }}</span>
        <button @click="dismissToast" class="toast-close">×</button>
      </div>
    </transition>

    <!-- 🌐 Indicador de conectividad -->
    <div v-if="!isOnline" class="offline-indicator">
      📡 Sin conexión - Los datos se guardarán al reconectar
    </div>
  </div>
</template>

<script>
export default {
  name: 'DriverMLScanner',
  data() {
    return {
      currentStep: 1,
      
      // 🔐 Estado de autenticación
      isAuthenticated: false,
      authError: null,
      checking: true,
      
      // 👥 Paso 1: Clientes
      clients: [],
      filteredClients: [],
      searchQuery: '',
      loadingClients: false,
      selectedClient: null,
      
      // 👤 Paso 2: Repartidor
      driverName: '',
      startingSession: false,
      
      // 📱 Paso 3: Escaneo
      sessionId: null,
      sessionStartTime: null,
      currentScan: '',
      scannedLabels: [],
      processing: false,
      finalizing: false,
      sessionStatus: 'Activo',
      lastScanResult: null,
      
      // 🎉 Paso 4: Resultados
      results: null,
      
      // 🔔 UI y estado
      toastMessage: '',
      toastType: 'info',
      isOnline: navigator.onLine,
      
      // ⏱️ Timers y intervalos
      autoFocusTimer: null,
      toastTimer: null
    }
  },

  computed: {
    scannedCount() {
      return this.scannedLabels.length
    },

    sessionStatusClass() {
      return {
        'status-active': this.sessionStatus === 'Activo',
        'status-processing': this.sessionStatus === 'Procesando',
        'status-finalizing': this.sessionStatus === 'Finalizando...'
      }
    }
  },

  async mounted() {
    // 🔄 Configurar listeners globales
    this.setupGlobalListeners()
    
    // 🔐 Verificar acceso antes de cargar la app
    await this.verifyAccess()
    
    // ✅ Si está autenticado, cargar datos iniciales
    if (this.isAuthenticated) {
      await this.loadClients()
      this.setupAutoFocus()
    }
  },

  beforeUnmount() {
    // 🧹 Limpiar timers y listeners
    this.cleanup()
  },

  methods: {
    // ==================== 🔐 AUTENTICACIÓN ====================
    
    async verifyAccess() {
      this.checking = true
      this.authError = null
      
      try {
        const token = this.getDriverToken()
        
        if (!token) {
          throw new Error('No se encontró token de acceso válido')
        }
        
        const response = await fetch(`/api/driver-scanner/verify-access?token=${encodeURIComponent(token)}`)
        const data = await response.json()
        
        if (data.valid) {
          this.isAuthenticated = true
          console.log('✅ Acceso verificado:', data.system_info?.name || 'Sistema')
        } else {
          throw new Error(data.error || 'Token inválido o expirado')
        }
        
      } catch (error) {
        console.error('❌ Error de autenticación:', error)
        this.authError = error.message
        this.isAuthenticated = false
      } finally {
        this.checking = false
      }
    },

    getDriverToken() {
      // 🔍 Buscar token en múltiples fuentes (orden de prioridad)
      
      // 1️⃣ URL parameter (prioridad alta para links directos)
      const urlParams = new URLSearchParams(window.location.search)
      const tokenFromUrl = urlParams.get('token')
      
      if (tokenFromUrl) {
        // 💾 Guardar token en localStorage para uso futuro
        localStorage.setItem('driver_scanner_token', tokenFromUrl)
        
        // 🧹 Limpiar URL por seguridad (no bloquear si falla)
        this.cleanUrlToken()
        
        return tokenFromUrl
      }
      
      // 2️⃣ localStorage (sesiones guardadas)
      const tokenFromStorage = localStorage.getItem('driver_scanner_token')
      if (tokenFromStorage) {
        return tokenFromStorage
      }
      
      // 3️⃣ Variable de entorno del frontend (si está configurada)
      const tokenFromEnv = process.env.VUE_APP_DRIVER_SCANNER_TOKEN
      if (tokenFromEnv) {
        return tokenFromEnv
      }
      
      return null
    },

    cleanUrlToken() {
      try {
        const url = new URL(window.location)
        url.searchParams.delete('token')
        
        // ✨ Solo actualizar si realmente cambió algo
        if (window.location.search !== url.search) {
          window.history.replaceState({}, '', url.toString())
        }
      } catch (error) {
        console.warn('⚠️ No se pudo limpiar URL:', error)
      }
    },

    clearStoredToken() {
      localStorage.removeItem('driver_scanner_token')
      this.isAuthenticated = false
      this.authError = 'Datos de acceso eliminados. Solicita un nuevo link.'
    },

    handleAuthError() {
      this.clearStoredToken()
      this.authError = 'Sesión expirada. Por favor, obtén un nuevo link de acceso.'
      this.isAuthenticated = false
      this.currentStep = 1
    },

    // ==================== 🌐 REQUESTS AUTENTICADOS ====================
    
    async makeAuthenticatedRequest(url, options = {}) {
      const token = this.getDriverToken()
      
      if (!token) {
        throw new Error('401: No hay token disponible')
      }
      
      // 🔗 Agregar token como query parameter (como espera el backend)
      const separator = url.includes('?') ? '&' : '?'
      const urlWithToken = `${url}${separator}token=${encodeURIComponent(token)}`
      
      const response = await fetch(urlWithToken, options)
      
      if (response.status === 401) {
        throw new Error('401: Token inválido o expirado')
      }
      
      return response
    },

    async apiRequest(url, options = {}) {
      try {
        return await this.makeAuthenticatedRequest(url, options)
      } catch (error) {
        if (error.message.includes('401')) {
          this.handleAuthError()
        }
        throw error
      }
    },

    // ==================== 👥 PASO 1: CLIENTES ====================
    
    async loadClients() {
      this.loadingClients = true
      try {
        const response = await this.apiRequest('/api/driver-scanner/clients')
        const data = await response.json()
        
        if (data.success) {
          this.clients = data.clients
          this.filteredClients = data.clients
        } else {
          this.showToast('Error cargando clientes', 'error')
        }
      } catch (error) {
        if (!error.message.includes('401')) {
          console.error('Error:', error)
          this.showToast('Error de conexión', 'error')
        }
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
        client.email.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query))
      )
    },

    clearSearch() {
      this.searchQuery = ''
      this.filteredClients = this.clients
      this.$nextTick(() => {
        this.$refs.searchInput?.focus()
      })
    },

    getClientInitials(name) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },

    selectClient(client) {
      this.selectedClient = client
      this.currentStep = 2
      this.$nextTick(() => {
        this.setupAutoFocus()
      })
    },

    // ==================== 👤 PASO 2: REPARTIDOR ====================
    
    goBack() {
      this.currentStep = 1
      this.selectedClient = null
      this.driverName = ''
      this.$nextTick(() => {
        this.setupAutoFocus()
      })
    },

    async startSession() {
      if (!this.driverName.trim()) {
        this.showToast('Por favor ingresa tu nombre', 'warning')
        return
      }
      
      this.startingSession = true
      try {
        const response = await this.apiRequest('/api/driver-scanner/start-session', {
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
          this.sessionStartTime = new Date()
          this.currentStep = 3
          this.showToast('Sesión iniciada correctamente', 'success')
          
          // 🎯 Focus inmediato en el input de escaneo
          this.$nextTick(() => {
            this.setupAutoFocus()
          })
        } else {
          this.showToast(data.error || 'Error iniciando sesión', 'error')
        }
      } catch (error) {
        if (!error.message.includes('401')) {
          console.error('Error:', error)
          this.showToast('Error de conexión', 'error')
        }
      } finally {
        this.startingSession = false
      }
    },

    // ==================== 📱 PASO 3: ESCANEO ====================
    
    async processScan() {
      if (!this.currentScan.trim() || this.processing) return
      
      const barcode = this.currentScan.trim()
      
      // 🔍 Validación básica de código ML
      if (!this.isValidMLCode(barcode)) {
        this.showScanResult('error', '❌', 'Código no válido para MercadoLibre')
        this.currentScan = ''
        this.maintainFocus()
        return
      }
      
      // 🚫 Verificar duplicados
      if (this.isDuplicateCode(barcode)) {
        this.showScanResult('warning', '⚠️', 'Código ya escaneado')
        this.currentScan = ''
        this.maintainFocus()
        return
      }
      
      this.processing = true
      try {
        const response = await this.apiRequest('/api/driver-scanner/scan-label', {
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
          this.showScanResult('success', '✅', `Código #${this.scannedCount} agregado`)
          
          // 🔊 Feedback haptic en móviles
          this.triggerHapticFeedback()
        } else {
          this.showScanResult('error', '❌', data.error || 'Error procesando código')
        }
      } catch (error) {
        if (!error.message.includes('401')) {
          console.error('Error:', error)
          this.showScanResult('error', '❌', 'Error de conexión')
        }
      } finally {
        this.processing = false
        this.maintainFocus()
      }
    },

    handlePaste(event) {
      // 📋 Manejar códigos pegados desde clipboard
      const pastedText = event.clipboardData.getData('text').trim()
      
      if (pastedText && this.isValidMLCode(pastedText)) {
        this.currentScan = pastedText
        this.$nextTick(() => {
          this.processScan()
        })
      }
    },

    isValidMLCode(code) {
      // 🔍 Validación básica de códigos ML
      // ML usa códigos como: MLM1234567890, MLA1234567890, etc.
      const mlPattern = /^ML[A-Z]\d{9,12}$/i
      return mlPattern.test(code) || code.length >= 8 // Flexibilidad para otros formatos
    },

    isDuplicateCode(code) {
      return this.scannedLabels.some(label => label.barcode_value === code)
    },

    showScanResult(type, icon, message) {
      this.lastScanResult = { type, icon, message }
      
      // 🕐 Auto-limpiar después de 3 segundos
      setTimeout(() => {
        if (this.lastScanResult?.message === message) {
          this.lastScanResult = null
        }
      }, 3000)
    },

    async removeScan(labelId) {
      try {
        const response = await this.apiRequest(`/api/driver-scanner/remove-scan/${this.sessionId}/${labelId}`, {
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
        if (!error.message.includes('401')) {
          console.error('Error:', error)
          this.showToast('Error de conexión', 'error')
        }
      }
    },

    clearAllScans() {
      if (confirm(`¿Eliminar todos los ${this.scannedCount} códigos escaneados?`)) {
        // 🔄 Llamar API para limpiar todos
        this.scannedLabels.forEach(label => {
          this.removeScan(label.id)
        })
      }
    },

    isRecentScan(label) {
      // 🕐 Marcar como reciente si fue escaneado en los últimos 5 segundos
      const scanTime = new Date(label.scanned_at)
      const now = new Date()
      return (now - scanTime) < 5000
    },

    async finalizeSession() {
      if (this.scannedLabels.length === 0 || this.finalizing) return
      
      if (!confirm(`¿Finalizar sesión con ${this.scannedCount} códigos?`)) {
        return
      }
      
      this.finalizing = true
      this.sessionStatus = 'Finalizando...'
      
      try {
        const response = await this.apiRequest('/api/driver-scanner/finalize-session', {
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
            'success'
          )
          
          // 🔊 Feedback de finalización
          this.triggerHapticFeedback('heavy')
        } else {
          this.showToast(data.error || 'Error finalizando sesión', 'error')
        }
      } catch (error) {
        if (!error.message.includes('401')) {
          console.error('Error:', error)
          this.showToast('Error de conexión', 'error')
        }
      } finally {
        this.finalizing = false
        this.sessionStatus = 'Activo'
      }
    },

    cancelSession() {
      if (confirm('¿Seguro que quieres cancelar? Se perderán todos los códigos escaneados.')) {
        this.resetToStart()
        this.showToast('Sesión cancelada', 'info')
      }
    },

    // ==================== 🎉 PASO 4: RESULTADOS ====================
    
    startNewSession() {
      this.resetToStart()
      this.showToast('Iniciando nueva sesión', 'info')
    },

    goToDashboard() {
      // 📊 Redirigir al dashboard principal
      window.location.href = '/dashboard'
    },

    async shareResults() {
      const summary = this.generateResultsSummary()
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Resumen de Recolección - EnviGo',
            text: summary,
            url: window.location.origin
          })
        } catch (error) {
          console.log('Share cancelled or failed')
        }
      } else {
        // 📋 Fallback: copiar al clipboard
        try {
          await navigator.clipboard.writeText(summary)
          this.showToast('Resumen copiado al portapapeles', 'success')
        } catch (error) {
          console.error('Error copying to clipboard:', error)
          this.showToast('Error copiando resumen', 'error')
        }
      }
    },

    generateResultsSummary() {
      const { created_count, error_count } = this.results
      const duration = this.getSessionDuration()
      
      return `📦 Resumen de Recolección - EnviGo
      
👤 Repartidor: ${this.driverName}
👥 Cliente: ${this.selectedClient.name}
📅 Fecha: ${this.formatDateTime(new Date())}
⏱️ Duración: ${duration}

📊 Resultados:
✅ Pedidos creados: ${created_count}
❌ Errores: ${error_count}
📱 Total escaneados: ${this.scannedCount}

🎯 Eficiencia: ${Math.round((created_count / this.scannedCount) * 100)}%`
    },

    // ==================== 🛠️ UTILIDADES ====================
    
    resetToStart() {
      this.currentStep = 1
      this.selectedClient = null
      this.driverName = ''
      this.sessionId = null
      this.sessionStartTime = null
      this.currentScan = ''
      this.scannedLabels = []
      this.results = null
      this.sessionStatus = 'Activo'
      this.lastScanResult = null
      
      this.$nextTick(() => {
        this.setupAutoFocus()
      })
    },

    setupAutoFocus() {
      // 🔄 Limpiar timer anterior
      if (this.autoFocusTimer) {
        clearTimeout(this.autoFocusTimer)
      }
      
      // ⏱️ Auto-focus inteligente según el paso actual
      this.autoFocusTimer = setTimeout(() => {
        try {
          if (this.currentStep === 1) {
            // 🔍 Focus en buscador de clientes
            this.$refs.searchInput?.focus()
          } else if (this.currentStep === 2) {
            // 👤 Focus en nombre del conductor
            this.$refs.driverInput?.focus()
          } else if (this.currentStep === 3) {
            // 📱 Focus en input de escaneo
            this.$refs.scanInput?.focus()
          }
        } catch (error) {
          console.warn('⚠️ Error en auto-focus:', error)
        }
      }, 100)
    },

    maintainFocus() {
      // 🎯 Mantener focus en input de escaneo siempre
      this.$nextTick(() => {
        if (this.currentStep === 3) {
          this.$refs.scanInput?.focus()
        }
      })
    },

    setupGlobalListeners() {
      // 🌐 Detectar cambios de conectividad
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      
      // ⌨️ Listener global para teclas
      window.addEventListener('keydown', this.handleGlobalKeydown)
    },

    handleOnline() {
      this.isOnline = true
      this.showToast('Conexión restaurada', 'success')
    },

    handleOffline() {
      this.isOnline = false
      this.showToast('Sin conexión a internet', 'warning')
    },

    handleGlobalKeydown(event) {
      // 🔧 Teclas de utilidad global
      if (event.key === 'Escape') {
        this.dismissToast()
      }
      
      // 📱 En paso de escaneo, cualquier tecla enfoca el input
      if (this.currentStep === 3 && event.target !== this.$refs.scanInput) {
        if (event.key.length === 1 || event.key === 'Backspace') {
          this.$refs.scanInput?.focus()
        }
      }
    },

    triggerHapticFeedback(intensity = 'light') {
      // 📳 Feedback haptic en dispositivos compatibles
      if (navigator.vibrate) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [50, 50, 50]
        }
        navigator.vibrate(patterns[intensity] || patterns.light)
      }
    },

    // ==================== 🕐 FORMATEO Y TIEMPO ====================
    
    formatTime(dateString) {
      const date = new Date(dateString)
      return date.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    },

    formatDateTime(date) {
      return date.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    getSessionDuration() {
      if (!this.sessionStartTime) return '0 min'
      
      const now = new Date()
      const diff = now - this.sessionStartTime
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      
      if (minutes > 0) {
        return `${minutes} min ${seconds} seg`
      }
      return `${seconds} seg`
    },

    // ==================== 🔔 TOAST Y NOTIFICACIONES ====================
    
    showToast(message, type = 'info') {
      this.toastMessage = message
      this.toastType = type
      
      // 🕐 Auto-dismiss después de tiempo variable según tipo
      const durations = {
        success: 3000,
        info: 4000,
        warning: 5000,
        error: 6000
      }
      
      if (this.toastTimer) {
        clearTimeout(this.toastTimer)
      }
      
      this.toastTimer = setTimeout(() => {
        this.dismissToast()
      }, durations[type] || 4000)
    },

    dismissToast() {
      this.toastMessage = ''
      if (this.toastTimer) {
        clearTimeout(this.toastTimer)
        this.toastTimer = null
      }
    },

    getToastIcon(type) {
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      }
      return icons[type] || 'ℹ️'
    },

    // ==================== 🧹 CLEANUP ====================
    
    cleanup() {
      // 🔄 Limpiar todos los timers
      if (this.autoFocusTimer) {
        clearTimeout(this.autoFocusTimer)
      }
      if (this.toastTimer) {
        clearTimeout(this.toastTimer)
      }
      
      // 🌐 Remover event listeners
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
      window.removeEventListener('keydown', this.handleGlobalKeydown)
    }
  }
}
</script>

<style scoped>
/* ==================== VARIABLES Y RESET ==================== */
:root {
  --primary-color: #3b82f6;
  --primary-dark: #1d4ed8;
  --success-color: #10b981;
  --success-dark: #047857;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --transition: all 0.2s ease;
}

* {
  box-sizing: border-box;
}

/* ==================== LAYOUT PRINCIPAL ==================== */
.driver-scanner {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  padding-bottom: 80px;
  position: relative;
  overflow-x: hidden;
}

/* ==================== 🔐 PANTALLAS DE AUTENTICACIÓN ==================== */
.auth-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.auth-container {
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px 30px;
  box-shadow: var(--shadow-lg);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

/* Estados de autenticación */
.auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--gray-200);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.error-icon {
  font-size: 3rem;
  color: var(--error-color);
}

.auth-error h2 {
  color: var(--gray-800);
  margin: 0;
  font-size: 1.5rem;
}

.error-message {
  color: var(--gray-600);
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
}

.auth-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-retry, .btn-clear {
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-retry {
  background: var(--primary-color);
  color: white;
}

.btn-retry:hover {
  background: var(--primary-dark);
}

.btn-clear {
  background: var(--gray-200);
  color: var(--gray-700);
}

.btn-clear:hover {
  background: var(--gray-300);
}

.auth-help {
  margin-top: 24px;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  text-align: left;
}

.auth-help p {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: var(--gray-800);
}

.auth-help ul {
  margin: 0;
  padding-left: 20px;
  color: var(--gray-600);
  font-size: 0.9rem;
}

.auth-help li {
  margin-bottom: 4px;
}

/* ==================== 📱 APLICACIÓN PRINCIPAL ==================== */
.scanner-app {
  position: relative;
  z-index: 1;
}

/* Header fijo mejorado */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--gray-200);
  z-index: 100;
  box-shadow: var(--shadow-md);
}

.header-content {
  padding: 16px 20px;
}

.fixed-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--gray-800);
  text-align: center;
  font-weight: 700;
}

.client-info {
  margin-top: 8px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--gray-500);
}

/* Indicador de progreso */
.progress-indicator {
  padding: 0 20px 16px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--gray-200);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--success-color));
  transition: width 0.3s ease;
  border-radius: 2px;
}

.step-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-labels span {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-200);
  color: var(--gray-400);
  font-size: 1rem;
  transition: var(--transition);
}

.step-labels span.active {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

/* Container principal */
.step-container {
  margin-top: 140px;
  padding: 20px;
  min-height: calc(100vh - 140px);
}

/* ==================== 👥 PASO 1: CLIENTES ==================== */
.step-header {
  text-align: center;
  margin-bottom: 30px;
}

.step-header h2 {
  color: white;
  margin: 0 0 8px 0;
  font-size: 1.8rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.step-header p {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 1.1rem;
}

/* Buscador optimizado */
.search-container {
  margin-bottom: 24px;
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
  color: var(--gray-400);
}

.search-input {
  width: 100%;
  padding: 16px 20px 16px 48px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  background: white;
  box-shadow: var(--shadow-md);
  transition: var(--transition);
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), var(--shadow-lg);
}

.clear-search {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--gray-400);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.clear-search:hover {
  background: var(--gray-100);
}

/* Lista de clientes */
.clients-list {
  max-height: 60vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
  color: white;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.no-results {
  text-align: center;
  color: white;
  padding: 40px 20px;
}

.no-results-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.7;
}

.no-results h3 {
  margin: 0 0 8px 0;
  font-size: 1.3rem;
}

.no-results p {
  margin: 0;
  opacity: 0.8;
  font-size: 1rem;
}

.clients-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.client-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-md);
  border: 2px solid transparent;
}

.client-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-color);
}

.client-card.selected {
  border-color: var(--primary-color);
  background: #f0f9ff;
}

.client-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  margin-right: 16px;
  flex-shrink: 0;
}

.client-info {
  flex: 1;
}

.client-info h3 {
  margin: 0 0 4px 0;
  color: var(--gray-800);
  font-size: 1.2rem;
  font-weight: 600;
}

.client-email {
  margin: 2px 0;
  color: var(--gray-500);
  font-size: 0.9rem;
}

.client-phone {
  margin: 2px 0;
  color: var(--gray-500);
  font-size: 0.85rem;
}

.select-arrow {
  font-size: 1.2rem;
  color: var(--primary-color);
  margin-left: 12px;
  transition: var(--transition);
}

.client-card:hover .select-arrow {
  transform: translateX(4px);
}

/* ==================== 👤 PASO 2: REPARTIDOR ==================== */
.selected-client-info {
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.selected-client-info .label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.client-name {
  color: white;
  font-weight: 600;
}

.driver-form {
  background: white;
  border-radius: var(--radius-lg);
  padding: 30px 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-lg);
}

.input-group {
  margin-bottom: 24px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--gray-700);
}

.driver-input {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  transition: var(--transition);
}

.driver-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Botones mejorados */
.btn-start {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, var(--success-color) 0%, var(--success-dark) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
}

.btn-start:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-back {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-md);
  font-size: 1rem;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
}

/* ==================== 📱 PASO 3: ESCANEO ==================== */
.scan-header {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: var(--shadow-md);
}

.scan-header h2 {
  margin: 0 0 16px 0;
  color: var(--gray-800);
  font-size: 1.5rem;
  font-weight: 700;
}

.scan-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  align-items: center;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--success-color);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}

.status-indicator.status-active {
  background: var(--success-color);
  animation: pulse 2s infinite;
}

.status-indicator.status-processing {
  background: var(--warning-color);
}

.status-indicator.status-finalizing {
  background: var(--primary-color);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Input de escaneo optimizado */
.scan-input-container {
  margin-bottom: 20px;
}

.scan-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.scan-icon {
  position: absolute;
  left: 16px;
  z-index: 2;
  color: var(--gray-400);
  font-size: 1.2rem;
}

.scan-input {
  flex: 1;
  padding: 18px 20px 18px 52px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  background: white;
  transition: var(--transition);
  font-family: monospace;
}

.scan-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-scan {
  margin-left: 12px;
  padding: 18px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.2rem;
  cursor: pointer;
  min-width: 70px;
  transition: var(--transition);
}

.btn-scan:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.btn-scan:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Resultado de último escaneo */
.last-scan-result {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  animation: slideDown 0.3s ease;
}

.last-scan-result.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.last-scan-result.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.last-scan-result.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

@keyframes slideDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Lista de códigos escaneados */
.scanned-list {
  background: white;
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 20px;
  max-height: 50vh;
  overflow-y: auto;
  box-shadow: var(--shadow-md);
}

.no-scans {
  text-align: center;
  color: var(--gray-400);
  padding: 40px 20px;
}

.no-scans-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.7;
}

.no-scans h3 {
  margin: 0 0 8px 0;
  color: var(--gray-600);
  font-size: 1.2rem;
}

.no-scans p {
  margin: 0;
  font-size: 0.95rem;
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
  font-weight: 600;
}

.btn-clear-all {
  padding: 6px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  cursor: pointer;
  transition: var(--transition);
}

.btn-clear-all:hover {
  background: #fecaca;
}

.scan-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--gray-100);
  transition: var(--transition);
}

.scan-item:last-child {
  border-bottom: none;
}

.scan-item.recent {
  background: linear-gradient(90deg, #f0f9ff, transparent);
  margin: 0 -20px;
  padding: 16px 20px;
  border-radius: var(--radius-sm);
}

.scan-number {
  width: 40px;
  height: 32px;
  background: var(--gray-100);
  color: var(--gray-600);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 16px;
  flex-shrink: 0;
}

.scan-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scan-code {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.95rem;
  color: var(--gray-800);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.scan-time {
  font-size: 0.75rem;
  color: var(--gray-400);
}

.btn-remove {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  cursor: pointer;
  font-size: 1rem;
  transition: var(--transition);
  margin-left: 12px;
}

.btn-remove:hover {
  background: #fecaca;
  transform: scale(1.05);
}

/* Botones de acción */
.scan-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-finalize {
  width: 100%;
  padding: 20px;
  background: linear-gradient(135deg, var(--success-color) 0%, var(--success-dark) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.3rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-finalize:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(5, 150, 105, 0.4);
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
  border-radius: var(--radius-md);
  font-size: 1rem;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-cancel:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #f87171;
}

/* ==================== 🎉 PASO 4: RESULTADOS ==================== */
.results-header {
  background: white;
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.results-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.results-header h2 {
  margin: 0 0 24px 0;
  color: var(--success-color);
  font-size: 1.8rem;
  font-weight: 700;
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
  border-radius: var(--radius-md);
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

.result-stat.info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.result-stat .number {
  display: block;
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.result-stat.success .number {
  color: var(--success-color);
}

.result-stat.error .number {
  color: var(--error-color);
}

.result-stat.info .number {
  color: var(--primary-color);
}

.result-stat .label {
  font-size: 0.85rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

/* Listas de resultados */
.created-orders, .errors-list {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-md);
}

.created-orders h3, .errors-list h3 {
  margin: 0 0 16px 0;
  color: var(--gray-800);
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.orders-list, .errors-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item, .error-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  border: 1px solid var(--gray-200);
}

.order-info, .error-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-number {
  font-weight: 600;
  color: var(--success-color);
  font-size: 1rem;
}

.order-barcode, .error-barcode {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
  color: var(--gray-500);
}

.error-message {
  font-size: 0.85rem;
  color: var(--error-color);
  margin-top: 4px;
}

.order-status, .error-status {
  font-size: 1.2rem;
  margin-left: 12px;
}

/* Resumen detallado */
.detailed-summary {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-md);
}

.detailed-summary h3 {
  margin: 0 0 16px 0;
  color: var(--gray-800);
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 0.85rem;
  color: var(--gray-500);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 1rem;
  color: var(--gray-800);
  font-weight: 600;
}

/* Acciones finales */
.final-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-new, .btn-dashboard, .btn-share {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-new {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
}

.btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.btn-dashboard {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-dashboard:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
}

.btn-share {
  background: var(--gray-100);
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
}

.btn-share:hover {
  background: var(--gray-200);
  border-color: var(--gray-400);
}

/* ==================== 🔔 TOAST MEJORADOS ==================== */
.toast {
  position: fixed;
  bottom: 30px;
  left: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  color: white;
  font-weight: 500;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(10px);
}

.toast.success {
  background: linear-gradient(135deg, var(--success-color), var(--success-dark));
}

.toast.error {
  background: linear-gradient(135deg, var(--error-color), #dc2626);
}

.toast.warning {
  background: linear-gradient(135deg, var(--warning-color), #d97706);
}

.toast.info {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
}

.toast-icon {
  font-size: 1.2rem;
}

.toast-text {
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.8;
}

.toast-close:hover {
  opacity: 1;
}

/* Animación del toast */
.toast-enter-active {
  animation: toastSlideUp 0.4s ease;
}

.toast-leave-active {
  animation: toastSlideDown 0.3s ease;
}

@keyframes toastSlideUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes toastSlideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100px);
    opacity: 0;
  }
}

/* ==================== 🌐 INDICADOR OFFLINE ==================== */
.offline-indicator {
  position: fixed;
  bottom: 100px;
  left: 20px;
  right: 20px;
  background: var(--warning-color);
  color: white;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  text-align: center;
  font-weight: 500;
  z-index: 999;
  box-shadow: var(--shadow-md);
  animation: slideUp 0.3s ease;
}

/* ==================== 📱 RESPONSIVE DESIGN ==================== */
@media (max-width: 640px) {
  .step-container {
    padding: 16px;
    margin-top: 120px;
  }
  
  .fixed-header {
    padding: 12px 16px;
  }
  
  .progress-indicator {
    padding: 0 16px 12px;
  }
  
  .step-labels span {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }
  
  .results-summary {
    gap: 16px;
  }
  
  .result-stat .number {
    font-size: 1.8rem;
  }
  
  .scan-input-wrapper {
    flex-direction: column;
    gap: 12px;
  }
  
  .scan-input {
    padding-left: 20px;
  }
  
  .scan-icon {
    display: none;
  }
  
  .btn-scan {
    width: 100%;
    margin-left: 0;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .scan-stats {
    gap: 24px;
  }
  
  .auth-container {
    padding: 30px 20px;
  }
  
  .auth-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-retry, .btn-clear {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .step-container {
    padding: 12px;
  }
  
  .fixed-header h1 {
    font-size: 1.3rem;
  }
  
  .step-header h2 {
    font-size: 1.5rem;
  }
  
  .client-card {
    padding: 16px;
  }
  
  .client-avatar {
    width: 40px;
    height: 40px;
    margin-right: 12px;
  }
  
  .driver-form {
    padding: 24px 20px;
  }
  
  .scan-header {
    padding: 20px;
  }
  
  .scanned-list {
    padding: 16px;
  }
  
  .toast {
    left: 12px;
    right: 12px;
    bottom: 20px;
  }
  
  .offline-indicator {
    left: 12px;
    right: 12px;
    bottom: 80px;
  }
}

/* ==================== 🌓 MODO OSCURO ==================== */
@media (prefers-color-scheme: dark) {
  :root {
    --gray-50: #1f2937;
    --gray-100: #374151;
    --gray-200: #4b5563;
    --gray-300: #6b7280;
    --gray-400: #9ca3af;
    --gray-500: #d1d5db;
    --gray-600: #e5e7eb;
    --gray-700: #f3f4f6;
    --gray-800: #f9fafb;
    --gray-900: #ffffff;
  }
  
  .fixed-header {
    background: rgba(31, 41, 55, 0.95);
    border-bottom-color: var(--gray-200);
  }
  
  .auth-container {
    background: var(--gray-100);
    color: var(--gray-800);
  }
  
  .client-card, .driver-form, .scan-header, .scanned-list, 
  .created-orders, .errors-list, .detailed-summary, .results-header {
    background: var(--gray-100);
    color: var(--gray-800);
  }
  
  .search-input, .driver-input, .scan-input {
    background: var(--gray-50);
    border-color: var(--gray-200);
    color: var(--gray-800);
  }
  
  .no-results, .step-header h2, .step-header p {
    color: rgba(255, 255, 255, 0.9);
  }
}

/* ==================== 🎯 UTILIDADES ==================== */
.btn-icon {
  font-size: 1.1em;
}

.btn-text {
  font-weight: inherit;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Focus visible para accesibilidad */
*:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Selección de texto */
::selection {
  background: var(--primary-color);
  color: white;
}

/* Scrollbar personalizada */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--gray-100);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* Animaciones adicionales */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Clases de utilidad */
.animate-fade-in {
  animation: fadeIn 0.3s ease;
}

.animate-slide-up {
  animation: slideUp 0.3s ease;
}

/* Estados de hover mejorados */
@media (hover: hover) {
  .client-card:hover .client-avatar {
    transform: scale(1.05);
  }
  
  .scan-item:hover {
    background: var(--gray-50);
    border-radius: var(--radius-sm);
    margin: 0 -8px;
    padding: 16px 8px;
  }
}

/* Preload de fuentes */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  src: local('Inter');
}

/* Print styles */
@media print {
  .driver-scanner {
    background: white !important;
    color: black !important;
  }
  
  .fixed-header {
    position: static !important;
    box-shadow: none !important;
  }
  
  .toast, .offline-indicator {
    display: none !important;
  }
}
</style>