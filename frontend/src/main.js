// frontend/src/main.js - VERSIÓN MEJORADA

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import wsManager from './services/websocket.service'
import './assets/css/variables.css'
import './assets/css/toast-styles.css'
import { useAuthStore } from './store/auth'

// ==================== CREAR APP ====================
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Toast, {
  transition: 'Vue-Toastification__slideBlurred',
  maxToasts: 3, // Reducido para menos invasivo
  newestOnTop: true,
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  position: 'top-right',
  toastClassName: 'envigo-toast',
  bodyClassName: 'envigo-toast-body'
})

// ==================== SISTEMA DE NOTIFICACIONES INTELIGENTE ====================

const toast = useToast()
let notificationsConfigured = false
let isInAuthenticatedRoute = false

// Función para verificar si estamos en una ruta autenticada
function isAuthenticatedRoute(route) {
  return route.meta?.requiresAuth === true || route.path.startsWith('/app')
}

// Guard para manejar WebSocket de forma inteligente
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const wasInAuthRoute = isInAuthenticatedRoute(from)
  const willBeInAuthRoute = isAuthenticatedRoute(to)
  
  isInAuthenticatedRoute = willBeInAuthRoute
  
  // ✅ CONECTAR: Usuario autenticado + ruta autenticada + no conectado
  if (authStore.isLoggedIn && willBeInAuthRoute && !wsManager.isConnected) {
    console.log('🔄 Conectando notificaciones para ruta autenticada:', to.path)
    wsManager.connect()
    setupOrderNotifications()
  }
  
  // ❌ DESCONECTAR: Sale de rutas autenticadas o no está autenticado
  if ((!authStore.isLoggedIn || !willBeInAuthRoute) && wsManager.isConnected) {
    console.log('🔌 Desconectando notificaciones:', !authStore.isLoggedIn ? 'no autenticado' : 'ruta pública')
    wsManager.disconnect()
    resetNotifications()
  }
  
  next()
})

// ==================== CONFIGURACIÓN DE NOTIFICACIONES ====================

function setupOrderNotifications() {
  if (notificationsConfigured) return
  notificationsConfigured = true

  console.log('🔔 Configurando sistema de notificaciones...')

  // 📦 NOTIFICACIONES DE CAMBIOS DE ESTADO
  wsManager.on('order_notification', (notification) => {
    // Solo mostrar si estamos en ruta autenticada
    if (!isInAuthenticatedRoute) return
    
    console.log('📦 Cambio de estado:', notification)
    
    const toastConfig = {
      timeout: 6000,
      closeOnClick: true,
      draggable: true,
      pauseOnHover: true
    }

    switch (notification.data?.type) {
      case 'driver_assigned':
        toast.info(`👨‍💼 ${notification.message}`, { ...toastConfig, timeout: 5000 })
        break
      case 'picked_up':
        toast.info(`🚚 ${notification.message}`, { ...toastConfig, timeout: 5000 })
        break
      case 'delivered':
        toast.success(`✅ ${notification.message}`, { ...toastConfig, timeout: 8000 })
        break
      case 'proof_uploaded':
        toast.info(`📸 ${notification.message}`, { ...toastConfig, timeout: 6000 })
        break
      default:
        toast.info(`📦 ${notification.message}`, toastConfig)
    }
  })

  // 🆕 NUEVAS ÓRDENES (solo admins + rutas autenticadas)
  wsManager.on('new_order_notification', (notification) => {
    if (!isInAuthenticatedRoute) return
    
    const authStore = useAuthStore()
    if (!authStore.isAdmin) return

    console.log('🆕 Nueva orden:', notification)
    toast.success(`🆕 ${notification.message}`, {
      timeout: 7000,
      closeOnClick: true,
      draggable: true
    })
  })

  // ⚡ ACTUALIZACIÓN DE VISTAS (sin toast)
  wsManager.on('order_status_changed', (data) => {
    console.log('🔄 Orden actualizada:', data.order_number)
    
    // Solo emitir evento, sin toast invasivo
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

  // 🔗 CONEXIÓN (muy discreto)
  wsManager.on('connected', () => {
    console.log('✅ Sistema de notificaciones conectado')
    
    // Solo mostrar si estamos en ruta autenticada y es primera vez
    if (isInAuthenticatedRoute && !wsManager._firstConnectionShown) {
      wsManager._firstConnectionShown = true
      toast.success('📡 Notificaciones activadas', {
        timeout: 3000,
        closeOnClick: true
      })
    }
  })

  wsManager.on('disconnected', () => {
    console.log('❌ Sistema de notificaciones desconectado')
    
    // Solo mostrar warning si estábamos en ruta autenticada
    if (isInAuthenticatedRoute) {
      toast.warning('⚠️ Notificaciones desconectadas', {
        timeout: 4000,
        closeOnClick: true
      })
    }
  })

  wsManager.on('error', (error) => {
    console.error('❌ Error en notificaciones:', error)
    
    if (isInAuthenticatedRoute) {
      toast.error('❌ Error en notificaciones', { timeout: 5000 })
    }
  })
}

// Función para limpiar configuración
function resetNotifications() {
  notificationsConfigured = false
  wsManager._firstConnectionShown = false
  
  // Remover listeners (opcional, para limpiar memoria)
  wsManager.removeAllListeners('order_notification')
  wsManager.removeAllListeners('new_order_notification') 
  wsManager.removeAllListeners('order_status_changed')
  wsManager.removeAllListeners('connected')
  wsManager.removeAllListeners('disconnected')
  wsManager.removeAllListeners('error')
}

// ==================== MONTAR APP ====================
app.mount('#app')

console.log('✅ Aplicación iniciada con notificaciones inteligentes')