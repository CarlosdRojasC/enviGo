// frontend/src/services/websocket.service.js
import { useAuthStore } from '../store/auth'

class WebSocketManager {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 5000
    this.isConnecting = false
    this.pingInterval = null
    
    // Event listeners
    this.eventListeners = new Map()
    
    // Estado reactivo
    this.state = {
      connected: false,
      connecting: false,
      error: null,
      lastMessage: null,
      stats: {
        messagesReceived: 0,
        connectionTime: null
      }
    }
  }

  // Conectar al WebSocket con autenticación
  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔗 WS: Ya conectado')
      return
    }

    const authStore = useAuthStore()
    if (!authStore.token) {
      console.error('❌ WS: No hay token de autenticación')
      this.emit('error', { message: 'No hay token de autenticación' })
      return
    }

    this.state.connecting = true
    this.state.error = null
    this.isConnecting = true

    try {
      const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3001'}/ws?token=${authStore.token}`
      console.log('🔗 WS: Conectando como', authStore.user?.email, authStore.user?.role)
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = this.onOpen.bind(this)
      this.ws.onmessage = this.onMessage.bind(this)
      this.ws.onclose = this.onClose.bind(this)
      this.ws.onerror = this.onError.bind(this)
      
    } catch (error) {
      console.error('❌ WS: Error creating connection:', error)
      this.state.connecting = false
      this.state.error = error.message
      this.isConnecting = false
    }
  }

  // Event handlers
  onOpen(event) {
    console.log('✅ WS: Conectado exitosamente')
    this.state.connected = true
    this.state.connecting = false
    this.state.error = null
    this.state.stats.connectionTime = new Date()
    this.reconnectAttempts = 0
    this.isConnecting = false
    
    // Iniciar ping
    this.startPing()
    
    // Emitir evento de conexión
    this.emit('connected', { timestamp: new Date() })
  }

  onMessage(event) {
    try {
      const message = JSON.parse(event.data)
      this.state.stats.messagesReceived++
      this.state.lastMessage = message
      
      // Manejar diferentes tipos de mensajes
      this.handleMessage(message)
      
    } catch (error) {
      console.error('❌ WS: Error parsing message:', error)
    }
  }

onClose(event) {
  console.log('🔌 WS: Conexión cerrada:', event.code, event.reason)
  this.state.connected = false
  this.state.connecting = false
  this.stopPing()
  
  // Emitir evento de desconexión con más información
  this.emit('disconnected', { 
    code: event.code, 
    reason: event.reason,
    wasClean: event.wasClean,
    timestamp: new Date()
  })
  
  // Reintentar conexión solo si no fue intencional (código 1000 = cierre normal)
  if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
    this.scheduleReconnect()
  }
}

  onError(error) {
    console.error('❌ WS: Error:', error)
    this.state.error = error.message || 'Error de conexión WebSocket'
    this.state.connecting = false
    
    // Emitir evento de error
    this.emit('error', { error, timestamp: new Date() })
  }

  // Manejar mensajes específicos
 handleMessage(message) {
  const { type, data } = message

  switch (type) {
    case 'connection_established':
      console.log('🎉 WS: Conexión establecida:', data.message)
      this.emit('connection_established', data)
      break
      
    case 'pong':
      // Actualizar última respuesta de ping silenciosamente
      this.state.lastPing = new Date()
      // NO hacer console.log para pongs
      break
      
    case 'order_status_changed':
      this.handleOrderStatusChanged(data)
      break
      
    case 'new_order':
      this.handleNewOrder(data)
      break
      
    case 'permissions':
      this.emit('permissions_received', data)
      break
      
    case 'connection_stats':
      console.log('📊 WS: Estadísticas de conexión:', data)
      this.emit('connection_stats', data)
      break
      
    case 'error':
      console.error('❌ WS: Error del servidor:', data.message)
      this.emit('server_error', data)
      break
      
    default:
      // Solo mostrar log para tipos desconocidos
      console.log(`ℹ️ WS: Mensaje tipo '${type}':`, data)
  }
  
  // Emitir evento genérico (pero sin log adicional)
  this.emit('message', message)
  
  // Emitir evento específico por tipo
  this.emit(type, data)
}

  // Handlers específicos para notificaciones
  handleOrderStatusChanged(data) {
    console.log('📦 Orden actualizada:', data)
    
    // Determinar el tipo de notificación para mostrar
    let notificationConfig = {
      title: 'Actualización de Pedido',
      message: data.message,
      type: 'info',
      duration: 5000
    }

    switch (data.type) {
      case 'driver_assigned':
        notificationConfig = {
          title: 'Conductor Asignado',
          message: data.message,
          type: 'info',
          duration: 6000,
          icon: '👨‍💼'
        }
        break
        
      case 'picked_up':
        notificationConfig = {
          title: 'Pedido en Camino',
          message: data.message,
          type: 'info',
          duration: 6000,
          icon: '🚚'
        }
        break
        
      case 'delivered':
        notificationConfig = {
          title: '¡Pedido Entregado!',
          message: data.message,
          type: 'success',
          duration: 8000,
          icon: '✅'
        }
        break
        
      case 'proof_uploaded':
        notificationConfig = {
          title: 'Prueba de Entrega',
          message: data.message,
          type: 'info',
          duration: 6000,
          icon: '📸'
        }
        break
    }

    this.emit('order_notification', {
      ...notificationConfig,
      data: data,
      timestamp: new Date()
    })
  }

  handleNewOrder(data) {
    console.log('🆕 Nueva orden:', data)
    
    this.emit('new_order_notification', {
      title: 'Nueva Orden Recibida',
      message: data.message,
      type: 'success',
      duration: 7000,
      icon: '🆕',
      data: data,
      timestamp: new Date()
    })
  }

  // Métodos públicos
  send(type, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data })
      this.ws.send(message)
      return true
    } else {
      console.warn('⚠️ WS: No se puede enviar, no conectado')
      return false
    }
  }

  // Solicitar permisos del usuario
  getMyPermissions() {
    return this.send('get_my_permissions')
  }

  // Suscribirse a una empresa (solo admins)
  subscribeToCompany(companyId) {
    return this.send('subscribe_to_company', { companyId })
  }

  // Event listener system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event).add(callback)
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`❌ Error en event listener '${event}':`, error)
        }
      })
    }
  }

  // Utilidades
  startPing() {
    this.pingInterval = setInterval(() => {
      this.send('ping')
    }, 30000) // Cada 30 segundos
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++
    
    console.log(`🔄 WS: Reintentando conexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${this.reconnectInterval}ms`)
    
    setTimeout(() => {
      if (!this.state.connected && !this.isConnecting) {
        this.connect()
      }
    }, this.reconnectInterval)
  }

 disconnect() {
  console.log('🔌 WS: Desconectando...')
  
  if (this.ws) {
    this.stopPing()
    
    // Marcar como desconexión intencional
    this.ws.close(1000, 'Disconnected by user')
    this.ws = null
  }
  
  // Limpiar estado
  this.state.connected = false
  this.state.connecting = false
  this.reconnectAttempts = 0
  this.isConnecting = false
  
  // Reset flags
  this._firstConnectionShown = false
  this._firstToastShown = false
}

  // Getters
  get isConnected() {
    return this.state.connected
  }

  get connectionState() {
    return this.state
  }
  removeAllListeners(event) {
  if (event) {
    // Remover listeners específicos del evento
    this.eventListeners.delete(event)
  } else {
    // Remover todos los listeners
    this.eventListeners.clear()
  }
}

// Método para obtener información de debug
getDebugInfo() {
  return {
    isConnected: this.isConnected,
    reconnectAttempts: this.reconnectAttempts,
    state: this.state,
    listenersCount: this.eventListeners.size,
    events: Array.from(this.eventListeners.keys()),
    wsReadyState: this.ws?.readyState
  }
}
}

// Singleton instance
const wsManager = new WebSocketManager()

export default wsManager

// Composable para usar en componentes Vue
export function useWebSocket() {
  return {
    wsManager,
    state: wsManager.state,
    connect: () => wsManager.connect(),
    disconnect: () => wsManager.disconnect(),
    send: (type, data) => wsManager.send(type, data),
    on: (event, callback) => wsManager.on(event, callback),
    off: (event, callback) => wsManager.off(event, callback),
    getMyPermissions: () => wsManager.getMyPermissions(),
    subscribeToCompany: (companyId) => wsManager.subscribeToCompany(companyId)
  }
}