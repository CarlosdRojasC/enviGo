// frontend/src/main.js - VERSIÓN CORREGIDA SIN ERRORES

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import wsManager from './services/websocket.service'
import './assets/css/variables.css'
import './assets/css/toast-styles.css'
import './assets/styles/tailwind.css'
import VueGoogleMaps from '@fawmi/vue-google-maps'
import { setOptions } from "@googlemaps/js-api-loader";

// ==================== CREAR APP ====================
const app = createApp(App)

// ⚠️ ORDEN IMPORTANTE: PINIA PRIMERO
app.use(pinia)
app.use(router)
app.use(Toast, {
  transition: 'Vue-Toastification__slideBlurred',
  maxToasts: 3,
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
app.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyBVQvkWQXe-E4AkFXKu0Yx86RCQpUTbwcg',
  },
})
setOptions({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: "weekly",
  libraries: ["maps", "geometry", "marker"],
});

// ==================== MONTAR APP PRIMERO ====================
app.mount('#app')

// ⚠️ DESPUÉS DEL MOUNT: IMPORTAR STORES Y CONFIGURAR NOTIFICACIONES
import { useAuthStore } from './store/auth'

const toast = useToast()
let notificationsConfigured = false
let currentRouteType = 'public' // 'public' o 'authenticated'

// Función para verificar si estamos en una ruta autenticada
function isAuthenticatedRoute(route) {
  return route.meta?.requiresAuth === true || route.path.startsWith('/app')
}

// ==================== GUARDS SEGUROS ====================

// Guard que maneja WebSocket de forma segura
router.beforeEach((to, from, next) => {
  // Intentar obtener el store de forma segura
  let authStore
  try {
    authStore = useAuthStore()
  } catch (error) {
    console.warn('⚠️ Store no disponible aún, navegación sin notificaciones')
    next()
    return
  }
  
  const willBeInAuthRoute = isAuthenticatedRoute(to)
  const wasInAuthRoute = isAuthenticatedRoute(from)
  
  // Actualizar tipo de ruta actual
  currentRouteType = willBeInAuthRoute ? 'authenticated' : 'public'
  
  // ✅ CONECTAR: Usuario autenticado + entrando a ruta autenticada + no conectado
  if (authStore.isLoggedIn && willBeInAuthRoute && !wsManager.isConnected) {
    console.log('🔄 Conectando notificaciones para:', to.path)
    wsManager.connect()
    setupNotifications()
  }
  
  // ❌ DESCONECTAR: Sale de rutas autenticadas o no está autenticado
  if ((!authStore.isLoggedIn || !willBeInAuthRoute) && wsManager.isConnected) {
    console.log('🔌 Desconectando notificaciones:', !authStore.isLoggedIn ? 'logout' : 'ruta pública')
    wsManager.disconnect()
    cleanupNotifications()
  }
  
  next()
})

// Guard adicional para manejar logout
router.afterEach((to) => {
  setTimeout(() => {
    try {
      const authStore = useAuthStore()
      
      if (!authStore.isLoggedIn && wsManager.isConnected) {
        console.log('👤 Usuario deslogueado detectado, desconectando...')
        wsManager.disconnect()
        cleanupNotifications()
      }
    } catch (error) {
      // Store no disponible, ignorar
    }
  }, 100) // Pequeño delay para asegurar que el store esté actualizado
})

// ==================== CONFIGURACIÓN DE NOTIFICACIONES ====================

function setupNotifications() {
  if (notificationsConfigured) return
  notificationsConfigured = true

  console.log('🔔 Configurando notificaciones...')

  // 📦 NOTIFICACIONES DE CAMBIO DE ESTADO
  wsManager.on('order_notification', (notification) => {
    // Solo mostrar si estamos en ruta autenticada
    if (currentRouteType !== 'authenticated') return
    
    console.log('📦 Notificación de orden:', notification)
    
    const toastConfig = {
      timeout: notification.duration || 6000,
      closeOnClick: true,
      draggable: true,
      pauseOnHover: true
    }

    // Mostrar toast según el tipo
    switch (notification.type) {
      case 'success':
        toast.success(`${notification.icon || '✅'} ${notification.message}`, toastConfig)
        break
      case 'info':
        toast.info(`${notification.icon || '📦'} ${notification.message}`, toastConfig)
        break
      case 'warning':
        toast.warning(`${notification.icon || '⚠️'} ${notification.message}`, toastConfig)
        break
      default:
        // Fallback para formato antiguo
        const icon = getIconForType(notification.data?.type)
        toast.info(`${icon} ${notification.message}`, toastConfig)
    }
  })

  // 🆕 NUEVAS ÓRDENES (solo admins)
  wsManager.on('new_order_notification', (notification) => {
    if (currentRouteType !== 'authenticated') return
    
    // Verificar admin de forma segura
    try {
      const authStore = useAuthStore()
      if (!authStore.isAdmin) return
    } catch (error) {
      console.warn('⚠️ No se pudo verificar rol de admin')
      return
    }

    console.log('🆕 Nueva orden para admin:', notification)
    
    toast.success(`${notification.icon || '🆕'} ${notification.message}`, {
      timeout: notification.duration || 7000,
      closeOnClick: true,
      draggable: true,
      onClick: () => {
        if (notification.data?.order_id) {
          window.dispatchEvent(new CustomEvent('navigateToOrder', {
            detail: { orderId: notification.data.order_id }
          }))
        }
      }
    })
  })

  // ⚡ ACTUALIZACIÓN DE VISTAS (sin toast)
  wsManager.on('order_status_changed', (data) => {
    console.log('🔄 Orden actualizada:', data.order_number || data.orderNumber)
    
    // Solo emitir evento para actualizar UI, sin toast
    window.dispatchEvent(new CustomEvent('orderUpdated', {
      detail: {
        orderId: data.order_id || data.orderId,
        orderNumber: data.order_number || data.orderNumber,
        newStatus: data.status || data.newStatus,
        companyId: data.company_id || data.companyId,
        eventType: data.eventType || data.type
      }
    }))
  })

  // 🔗 ESTADO DE CONEXIÓN (discreto)
  wsManager.on('connected', (data) => {
    console.log('✅ Notificaciones conectadas')
    
    // Solo mostrar toast en primera conexión y si estamos en ruta autenticada
    if (currentRouteType === 'authenticated' && !wsManager._firstToastShown) {
      wsManager._firstToastShown = true
      toast.success('📡 Notificaciones activadas', {
        timeout: 3000,
        closeOnClick: true
      })
    }
  })

  wsManager.on('disconnected', (data) => {
    console.log('❌ Notificaciones desconectadas:', data.reason || 'Sin razón')
    
    // Solo mostrar warning si estábamos en ruta autenticada y no fue logout
    if (currentRouteType === 'authenticated' && data.code !== 1000) {
      toast.warning('⚠️ Notificaciones desconectadas', {
        timeout: 4000,
        closeOnClick: true,
        onClick: () => {
          // Intentar reconectar
          try {
            const authStore = useAuthStore()
            if (authStore.isLoggedIn) {
              wsManager.connect()
            }
          } catch (error) {
            console.warn('No se pudo reconectar: store no disponible')
          }
        }
      })
    }
  })

  wsManager.on('error', (data) => {
    console.error('❌ Error en notificaciones:', data.error)
    
    if (currentRouteType === 'authenticated') {
      toast.error('❌ Error en notificaciones', { 
        timeout: 5000,
        closeOnClick: true
      })
    }
  })

  // Handle server errors
  wsManager.on('server_error', (data) => {
    console.error('❌ Error del servidor:', data.message)
    
    if (currentRouteType === 'authenticated') {
      toast.error(`❌ ${data.message}`, { timeout: 6000 })
    }
  })
}

// ==================== CLEANUP ====================

function cleanupNotifications() {
  if (!notificationsConfigured) return
  
  console.log('🧹 Limpiando notificaciones...')
  
  // Remover todos los listeners que configuramos
  const eventsToClean = [
    'order_notification',
    'new_order_notification',
    'order_status_changed',
    'connected',
    'disconnected',
    'error',
    'server_error'
  ]
  
  eventsToClean.forEach(event => {
    try {
      wsManager.off(event, () => {})
    } catch (error) {
      // Ignorar errores de cleanup
    }
  })
  
  // Reset flags
  notificationsConfigured = false
  wsManager._firstToastShown = false
}

// ==================== UTILIDADES ====================

function getIconForType(type) {
  const icons = {
    'driver_assigned': '👨‍💼',
    'picked_up': '🚚',
    'delivered': '✅',
    'proof_uploaded': '📸'
  }
  return icons[type] || '📦'
}

// ==================== LOGS ====================
console.log('✅ Aplicación iniciada con notificaciones inteligentes')

// ==================== DEBUG HELPERS (DESARROLLO) ====================
if (import.meta.env.DEV) {
  window.wsManager = wsManager
  window.debugNotifications = {
    currentRouteType: () => currentRouteType,
    isConfigured: () => notificationsConfigured,
    wsState: () => wsManager.connectionState,
    listeners: () => wsManager.eventListeners,
    testAuth: () => {
      try {
        const authStore = useAuthStore()
        return {
          isLoggedIn: authStore.isLoggedIn,
          user: authStore.user,
          isAdmin: authStore.isAdmin
        }
      } catch (error) {
        return { error: error.message }
      }
    }
  }
  
  console.log('🔧 Debug helpers disponibles:', Object.keys(window.debugNotifications))
}