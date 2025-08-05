// frontend/src/composables/useNotifications.js
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import wsManager from '../services/websocket.service'
import toast from '../services/toast.service'
import apiService from '../services/api'

const notifications = ref([])
const unreadCount = ref(0)
const isConnected = ref(false)
const isInitialized = ref(false)

export function useNotifications() {
  const authStore = useAuthStore()
  const router = useRouter()

  // ==================== COMPUTED ====================
  
  const unreadNotifications = computed(() => 
    notifications.value.filter(n => !n.read)
  )

  const recentNotifications = computed(() => 
    notifications.value.slice(0, 5)
  )

  // ==================== MÉTODOS PRINCIPALES ====================

  /**
   * Inicializar el sistema de notificaciones
   * Solo se ejecuta en rutas autenticadas
   */
  function initializeNotifications() {
    if (isInitialized.value || !authStore.isLoggedIn) return

    console.log('🔔 Inicializando sistema de notificaciones...')
    
    // Cargar notificaciones existentes
    loadNotifications()
    
    // Configurar WebSocket solo si estamos autenticados
    setupWebSocketListeners()
    
    // Conectar WebSocket
    connectWebSocket()
    
    isInitialized.value = true
  }

  /**
   * Desactivar notificaciones (para landing page o logout)
   */
  function disableNotifications() {
    if (!isInitialized.value) return

    console.log('🔕 Desactivando sistema de notificaciones...')
    
    // Desconectar WebSocket
    wsManager.disconnect()
    
    // Limpiar listeners
    removeWebSocketListeners()
    
    // Reset estado
    notifications.value = []
    unreadCount.value = 0
    isConnected.value = false
    isInitialized.value = false
  }

  // ==================== WEBSOCKET ====================

  function setupWebSocketListeners() {
    // ✅ NUEVA ORDEN (solo para admins)
    wsManager.on('new_order_notification', handleNewOrderNotification)
    
    // ✅ ACTUALIZACIÓN DE ORDEN
    wsManager.on('order_status_changed', handleOrderStatusChanged)
    
    // ✅ ESTADO DE CONEXIÓN
    wsManager.on('connected', handleConnection)
    wsManager.on('disconnected', handleDisconnection)
    wsManager.on('error', handleConnectionError)
  }

  function removeWebSocketListeners() {
    wsManager.off('new_order_notification', handleNewOrderNotification)
    wsManager.off('order_status_changed', handleOrderStatusChanged)
    wsManager.off('connected', handleConnection)
    wsManager.off('disconnected', handleDisconnection)
    wsManager.off('error', handleConnectionError)
  }

  function connectWebSocket() {
    if (authStore.isLoggedIn && !isConnected.value) {
      wsManager.connect()
    }
  }

  // ==================== HANDLERS ====================

  function handleNewOrderNotification(data) {
    if (!authStore.isAdmin) return

    console.log('🆕 Nueva orden recibida:', data)
    
    // Añadir a notificaciones
    addNotification({
      id: `order_${data.order_id}_${Date.now()}`,
      type: 'new_order',
      title: 'Nueva Orden',
      message: `Pedido ${data.order_number} recibido desde ${data.channel_name}`,
      order_id: data.order_id,
      order_number: data.order_number,
      created_at: new Date(),
      read: false,
      data: data
    })

    // Toast discreto
    toast.success(`🆕 ${data.order_number} - ${data.channel_name}`, {
      timeout: 5000,
      onClick: () => navigateToOrder(data.order_id)
    })
  }

  function handleOrderStatusChanged(data) {
    console.log('🔄 Estado de orden cambió:', data)
    
    // Añadir notificación
    addNotification({
      id: `status_${data.order_id}_${Date.now()}`,
      type: 'order_update',
      title: 'Pedido Actualizado',
      message: `${data.order_number} cambió a: ${getStatusLabel(data.status)}`,
      order_id: data.order_id,
      order_number: data.order_number,
      created_at: new Date(),
      read: false,
      data: data
    })

    // Actualizar vistas sin toast invasivo
    window.dispatchEvent(new CustomEvent('orderUpdated', { detail: data }))
  }

  function handleConnection() {
    isConnected.value = true
    console.log('✅ Notificaciones conectadas')
    
    // Solo mostrar en primera conexión
    if (!wsManager._hasShownFirstConnection) {
      toast.success('📡 Notificaciones activadas', { timeout: 3000 })
      wsManager._hasShownFirstConnection = true
    }
  }

  function handleDisconnection() {
    isConnected.value = false
    console.log('❌ Notificaciones desconectadas')
    
    toast.warning('⚠️ Notificaciones desconectadas', { 
      timeout: 4000,
      onClick: () => wsManager.connect()
    })
  }

  function handleConnectionError(error) {
    console.error('❌ Error en notificaciones:', error)
    toast.error('❌ Error en notificaciones', { timeout: 5000 })
  }

  // ==================== GESTIÓN DE NOTIFICACIONES ====================

  async function loadNotifications() {
    try {
      const response = await apiService.notifications.getAll({
        page: 1,
        limit: 20
      })
      
      notifications.value = response.data.notifications || []
      updateUnreadCount()
      
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    }
  }

  function addNotification(notification) {
    // Evitar duplicados
    const exists = notifications.value.find(n => n.id === notification.id)
    if (exists) return

    // Añadir al inicio
    notifications.value.unshift(notification)
    
    // Limitar cantidad
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }
    
    updateUnreadCount()
  }

  async function markAsRead(notificationId) {
    try {
      await apiService.notifications.markAsRead(notificationId)
      
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification) {
        notification.read = true
        updateUnreadCount()
      }
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)
    }
  }

  async function markAllAsRead() {
    try {
      await apiService.notifications.markAllAsRead()
      
      notifications.value.forEach(n => n.read = true)
      updateUnreadCount()
      
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch (error) {
      console.error('Error marcando todas como leídas:', error)
    }
  }

  function updateUnreadCount() {
    unreadCount.value = notifications.value.filter(n => !n.read).length
  }

  // ==================== UTILIDADES ====================

  function navigateToOrder(orderId) {
    if (orderId) {
      router.push(`/app/orders?highlight=${orderId}`)
    }
  }

  function getStatusLabel(status) {
    const labels = {
      'pending': 'Pendiente',
      'confirmed': 'Confirmado',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    }
    return labels[status] || status
  }

  function getNotificationIcon(type) {
    const icons = {
      'new_order': '🆕',
      'order_update': '📦',
      'delivery': '🚚',
      'sync': '🔄',
      'error': '❌',
      'success': '✅'
    }
    return icons[type] || '🔔'
  }

  // ==================== LIFECYCLE ====================

  function setupRouterGuards() {
    // Inicializar en rutas autenticadas
    router.afterEach((to) => {
      if (to.meta.requiresAuth && authStore.isLoggedIn) {
        initializeNotifications()
      } else {
        disableNotifications()
      }
    })
  }

  return {
    // Estado
    notifications: readonly(notifications),
    unreadNotifications,
    recentNotifications,
    unreadCount: readonly(unreadCount),
    isConnected: readonly(isConnected),
    isInitialized: readonly(isInitialized),
    
    // Métodos
    initializeNotifications,
    disableNotifications,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    setupRouterGuards,
    getNotificationIcon,
    navigateToOrder
  }
}