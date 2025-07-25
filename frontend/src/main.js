import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import Toast, { useToast } from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import wsManager from './services/websocket.service'
import './assets/css/variables.css'

// Importar tu store de auth
import { useAuthStore } from './store/auth'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 4,
  newestOnTop: true,
  timeout: 5000
})

// ==================== WEBSOCKET AUTO-CONNECT ====================

// Auto-conectar cuando el usuario esté autenticado
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // Si el usuario está autenticado y el WebSocket no está conectado
  if (authStore.isLoggedIn && !wsManager.isConnected) {
    // Solo mostrar log una vez
    if (!wsManager._autoConnectAttempted) {
      console.log('🔄 Conectando notificaciones en tiempo real para:', authStore.user?.email)
      wsManager._autoConnectAttempted = true
    }
    wsManager.connect()
  }
  
  // Si el usuario no está autenticado y el WebSocket está conectado
  if (!authStore.isLoggedIn && wsManager.isConnected) {
    console.log('🔌 Desconectando notificaciones...')
    wsManager.disconnect()
    wsManager._autoConnectAttempted = false
  }
  
  next()
})

// ==================== NOTIFICACIONES PUSH AUTOMÁTICAS ====================

const toast = useToast()
let notificationsConfigured = false

function setupOrderNotifications() {
  if (notificationsConfigured) return
  notificationsConfigured = true

  // 🔔 NOTIFICACIONES DE CAMBIOS DE ESTADO DE PEDIDOS
  wsManager.on('order_notification', (notification) => {
    console.log('📦 Cambio de estado:', notification)
    
    // Configurar toast según el tipo de evento
    const toastConfig = {
      timeout: 6000,
      closeOnClick: true,
      draggable: true,
      pauseOnHover: true
    }

    // Diferentes estilos según el evento
    switch (notification.data?.type) {
      case 'driver_assigned':
        toast.info(`👨‍💼 ${notification.message}`, {
          ...toastConfig,
          timeout: 5000
        })
        break
        
      case 'picked_up':
        toast.info(`🚚 ${notification.message}`, {
          ...toastConfig,
          timeout: 5000
        })
        break
        
      case 'delivered':
        toast.success(`✅ ${notification.message}`, {
          ...toastConfig,
          timeout: 8000 // Más tiempo para entregas
        })
        break
        
      case 'proof_uploaded':
        toast.info(`📸 ${notification.message}`, {
          ...toastConfig,
          timeout: 6000
        })
        break
        
      default:
        toast.info(`📦 ${notification.message}`, toastConfig)
    }
  })

  // 🆕 NOTIFICACIONES DE NUEVAS ÓRDENES (solo para admins)
  wsManager.on('new_order_notification', (notification) => {
    const authStore = useAuthStore()
    
    if (authStore.isAdmin) {
      console.log('🆕 Nueva orden:', notification)
      
      toast.success(`🆕 ${notification.message}`, {
        timeout: 7000,
        closeOnClick: true,
        draggable: true
      })
    }
  })

  // ⚡ EVENTO PARA ACTUALIZAR VISTAS EN TIEMPO REAL
  wsManager.on('order_status_changed', (data) => {
    console.log('🔄 Orden actualizada - disparando refresh:', data)
    
    // Emitir evento global para que los componentes se actualicen
    window.dispatchEvent(new CustomEvent('orderUpdated', {
      detail: {
        orderId: data.order_id,
        orderNumber: data.order_number,
        newStatus: data.status,
        companyId: data.company_id,
        eventType: data.eventType
      }
    }))
  })

  // 🔗 NOTIFICACIONES DE CONEXIÓN (discretas)
  wsManager.on('connected', () => {
    console.log('✅ Sistema de notificaciones conectado')
    
    // Solo mostrar toast la primera vez
    if (!wsManager._firstConnectionShown) {
      wsManager._firstConnectionShown = true
      toast.success('📡 Notificaciones en tiempo real activadas', {
        timeout: 3000,
        closeOnClick: true
      })
    }
  })

  wsManager.on('disconnected', () => {
    console.log('❌ Sistema de notificaciones desconectado')
    
    toast.warning('⚠️ Notificaciones desconectadas', {
      timeout: 4000,
      closeOnClick: true
    })
  })

  wsManager.on('error', (error) => {
    console.error('❌ Error en notificaciones:', error)
    
    toast.error('❌ Error en el sistema de notificaciones', {
      timeout: 5000
    })
  })
}

// Configurar las notificaciones una sola vez
setupOrderNotifications()

app.mount('#app')