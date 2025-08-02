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
    this.heartbeatTimeout = null
    
    // 🆕 Cola para mensajes pendientes cuando está desconectado
    this.messageQueue = []
    
    // 🆕 Gestión de notificaciones push
    this.pushSubscription = null
    this.notificationPermission = 'default'
    
    // Event listeners
    this.eventListeners = new Map()
    
    // Estado reactivo mejorado
    this.state = {
      connected: false,
      connecting: false,
      error: null,
      lastMessage: null,
      lastPing: null,
      connectionQuality: 'unknown', // 🆕 good, poor, unknown
      stats: {
        messagesReceived: 0,
        messagesSent: 0,
        connectionTime: null,
        reconnections: 0,
        avgLatency: 0
      }
    }
  }

  // 🆕 Inicializar notificaciones push
  async initializePushNotifications() {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notificaciones no soportadas en este navegador')
      return false
    }

    // Verificar permisos
    this.notificationPermission = Notification.permission
    
    if (this.notificationPermission === 'default') {
      this.notificationPermission = await Notification.requestPermission()
    }

    if (this.notificationPermission === 'granted') {
      console.log('✅ Permisos de notificación concedidos')
      
      // Registrar Service Worker si no está registrado
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('✅ Service Worker registrado:', registration)
          
          // Suscribirse a push notifications si es posible
          await this.subscribeToPush(registration)
          
        } catch (error) {
          console.error('❌ Error registrando Service Worker:', error)
        }
      }
      
      return true
    }

    console.warn('⚠️ Permisos de notificación denegados')
    return false
  }

  // 🆕 Suscribirse a push notifications
  async subscribeToPush(registration) {
    try {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.warn('⚠️ VAPID public key no configurada')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(vapidPublicKey)
      })

      this.pushSubscription = subscription
      
      // Enviar suscripción al servidor
      await this.sendPushSubscriptionToServer(subscription)
      
      console.log('✅ Suscrito a push notifications')
      
    } catch (error) {
      console.error('❌ Error suscribiéndose a push:', error)
    }
  }

  // 🆕 Enviar suscripción al servidor
  async sendPushSubscriptionToServer(subscription) {
    try {
      const authStore = useAuthStore()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/push-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      })

      if (!response.ok) {
        throw new Error('Error enviando suscripción al servidor')
      }

      console.log('✅ Suscripción push enviada al servidor')
      
    } catch (error) {
      console.error('❌ Error enviando suscripción:', error)
    }
  }

  // Conectar al WebSocket con autenticación (mejorado)
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

  // Event handlers (mejorados)
  onOpen(event) {
    console.log('✅ WS: Conectado exitosamente')
    this.state.connected = true
    this.state.connecting = false
    this.state.error = null
    this.state.stats.connectionTime = new Date()
    this.state.connectionQuality = 'good'
    this.reconnectAttempts = 0
    this.isConnecting = false
    
    // 🆕 Procesar cola de mensajes pendientes
    this.processMessageQueue()
    
    // Iniciar ping mejorado
    this.startPing()
    
    // Emitir evento de conexión
    this.emit('connected', { timestamp: new Date() })
  }

  onMessage(event) {
    try {
      const message = JSON.parse(event.data)
      this.state.stats.messagesReceived++
      this.state.lastMessage = message
      
      // 🆕 Calcular latencia si es un pong
      if (message.type === 'pong' && this.lastPingTime) {
        const latency = Date.now() - this.lastPingTime
        this.updateLatency(latency)
      }
      
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
    this.state.connectionQuality = 'unknown'
    this.stopPing()
    
    // Emitir evento de desconexión
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      timestamp: new Date()
    })
    
    // Reintentar conexión si no fue intencional
    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.state.stats.reconnections++
      this.scheduleReconnect()
    }
  }

  onError(error) {
    console.error('❌ WS: Error:', error)
    this.state.error = error.message || 'Error de conexión WebSocket'
    this.state.connecting = false
    this.state.connectionQuality = 'poor'
    
    // Emitir evento de error
    this.emit('error', { error, timestamp: new Date() })
  }

  // Manejar mensajes específicos (mejorado)
  handleMessage(message) {
    const { type, data } = message

    switch (type) {
      case 'connection_established':
        console.log('🎉 WS: Conexión establecida:', data.message)
        this.emit('connection_established', data)
        break
        
      case 'pong':
        this.state.lastPing = new Date()
        // Limpiar timeout de heartbeat
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout)
          this.heartbeatTimeout = null
        }
        break
        
      case 'order_status_changed':
        this.handleOrderStatusChanged(data)
        break
        
      case 'new_order':
        this.handleNewOrder(data)
        break
        
      case 'driver_location_update': // 🆕
        this.handleDriverLocationUpdate(data)
        break
        
      case 'system_notification': // 🆕
        this.handleSystemNotification(data)
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
        console.log(`ℹ️ WS: Mensaje tipo '${type}':`, data)
    }
    
    // Emitir evento genérico
    this.emit('message', message)
    this.emit(type, data)
  }

  // Handlers específicos mejorados
  handleOrderStatusChanged(data) {
    console.log('📦 Orden actualizada:', data)
    
    const notificationConfig = this.getNotificationConfig(data.type, data)
    
    // 🆕 Crear notificación del navegador si está permitido
    this.createBrowserNotification({
      title: notificationConfig.title,
      body: data.message,
      icon: '/favicon.png',
      tag: `order-${data.order_number}`,
      data: {
        order_id: data.order_id,
        order_number: data.order_number,
        type: 'order_update'
      }
    })

    this.emit('order_notification', {
      ...notificationConfig,
      data: data,
      timestamp: new Date()
    })
  }

  handleNewOrder(data) {
    console.log('🆕 Nueva orden:', data)
    
    // 🆕 Notificación del navegador para nuevas órdenes
    this.createBrowserNotification({
      title: 'Nueva Orden Recibida',
      body: data.message,
      icon: '/favicon.png',
      tag: `new-order-${data.order_number}`,
      requireInteraction: true // Requiere interacción del usuario
    })
    
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

  // 🆕 Handler para ubicación del conductor
  handleDriverLocationUpdate(data) {
    this.emit('driver_location_update', {
      order_id: data.order_id,
      driver_id: data.driver_id,
      location: data.location,
      timestamp: new Date()
    })
  }

  // 🆕 Handler para notificaciones del sistema
  handleSystemNotification(data) {
    this.createBrowserNotification({
      title: data.title || 'Notificación del Sistema',
      body: data.message,
      icon: '/favicon.png',
      tag: 'system-notification'
    })

    this.emit('system_notification', {
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      priority: data.priority || 'normal',
      timestamp: new Date()
    })
  }

  // 🆕 Crear notificación del navegador
  createBrowserNotification(options) {
    if (this.notificationPermission !== 'granted') return

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        badge: options.badge || '/badge.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      })

      notification.onclick = () => {
        window.focus()
        
        // Navegar según el tipo de notificación
        if (options.data?.type === 'order_update' && options.data?.order_id) {
          // Aquí puedes usar Vue Router para navegar
          // this.$router.push(`/orders/${options.data.order_id}`)
          window.location.href = `/#/orders/${options.data.order_id}`
        }
        
        notification.close()
      }

      // Auto-cerrar después de 8 segundos
      setTimeout(() => notification.close(), 8000)
      
    } catch (error) {
      console.error('❌ Error creando notificación:', error)
    }
  }

  // 🆕 Obtener configuración de notificación
  getNotificationConfig(type, data) {
    const configs = {
      driver_assigned: {
        title: 'Conductor Asignado',
        type: 'info',
        duration: 6000,
        icon: '👨‍💼'
      },
      picked_up: {
        title: 'Pedido en Camino',
        type: 'info',
        duration: 6000,
        icon: '🚚'
      },
      delivered: {
        title: '¡Pedido Entregado!',
        type: 'success',
        duration: 8000,
        icon: '✅'
      },
      failed: {
        title: 'Fallo en Entrega',
        type: 'error',
        duration: 10000,
        icon: '❌'
      },
      proof_uploaded: {
        title: 'Prueba de Entrega',
        type: 'info',
        duration: 6000,
        icon: '📸'
      }
    }

    return configs[type] || {
      title: 'Actualización de Pedido',
      type: 'info',
      duration: 5000,
      icon: '📦'
    }
  }

  // Métodos públicos mejorados
  send(type, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data })
      this.ws.send(message)
      this.state.stats.messagesSent++
      return true
    } else {
      // 🆕 Añadir a cola si no está conectado
      this.messageQueue.push({ type, data })
      console.warn('⚠️ WS: Mensaje añadido a cola, no conectado')
      return false
    }
  }

  // 🆕 Procesar cola de mensajes
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.state.connected) {
      const { type, data } = this.messageQueue.shift()
      this.send(type, data)
    }
  }

  // 🆕 Calcular latencia promedio
  updateLatency(latency) {
    if (this.state.stats.avgLatency === 0) {
      this.state.stats.avgLatency = latency
    } else {
      this.state.stats.avgLatency = (this.state.stats.avgLatency + latency) / 2
    }

    // Actualizar calidad de conexión
    if (latency < 100) {
      this.state.connectionQuality = 'good'
    } else if (latency < 500) {
      this.state.connectionQuality = 'fair'
    } else {
      this.state.connectionQuality = 'poor'
    }
  }

  // Utilidades mejoradas
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now()
        this.send('ping')
        
        // 🆕 Timeout para detectar pérdida de conexión
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('⚠️ No se recibió pong, conexión perdida')
          this.ws.close()
        }, 10000)
      }
    }, 30000)
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++
    
    // 🆕 Backoff exponencial
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Máximo 30 segundos
    )
    
    console.log(`🔄 WS: Reintentando conexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay/1000}s`)
    
    setTimeout(() => {
      if (!this.state.connected && !this.isConnecting) {
        this.connect()
      }
    }, delay)
  }

  // 🆕 Métodos para push notifications
  async requestNotificationPermission() {
    return await this.initializePushNotifications()
  }

  // 🆕 Utilidad para convertir VAPID key
  urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  disconnect() {
    if (this.ws) {
      this.stopPing()
      this.ws.close(1000, 'Disconnected by user')
      this.ws = null
    }
  }

  // Getters
  get isConnected() {
    return this.state.connected
  }

  get connectionState() {
    return this.state
  }
}

// Singleton instance
const wsManager = new WebSocketManager()

export default wsManager

// Composable mejorado para usar en componentes Vue
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
    subscribeToCompany: (companyId) => wsManager.subscribeToCompany(companyId),
    
    // 🆕 Nuevos métodos
    requestNotificationPermission: () => wsManager.requestNotificationPermission(),
    initializePushNotifications: () => wsManager.initializePushNotifications()
  }
}