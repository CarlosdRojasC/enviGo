// frontend/src/main.js - COMPATIBLE CON CHART.JS

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import wsManager from './services/websocket.service'
import './assets/css/variables.css'
import './assets/css/toast-styles.css'

// ==================== CREAR APP ====================
const app = createApp(App)

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

// ==================== MONTAR APP ====================
app.mount('#app')

// ==================== DESPUÉS DEL MOUNT: CONFIGURAR NOTIFICACIONES ====================

// ⚠️ DELAY PARA ASEGURAR QUE TODO ESTÉ LISTO
setTimeout(() => {
  setupNotificationSystem()
}, 100)

function setupNotificationSystem() {
  // Importar store después del mount
  import('./store/auth').then(({ useAuthStore }) => {
    
    const toast = useToast()
    let notificationsConfigured = false
    let currentRouteType = 'public'

    // Función para verificar rutas autenticadas
    function isAuthenticatedRoute(route) {
      return route.meta?.requiresAuth === true || route.path.startsWith('/app')
    }

    // ==================== ROUTER GUARDS ====================
    
    router.beforeEach((to, from, next) => {
      try {
        const authStore = useAuthStore()
        const willBeInAuthRoute = isAuthenticatedRoute(to)
        
        currentRouteType = willBeInAuthRoute ? 'authenticated' : 'public'
        
        // ✅ CONECTAR: Usuario autenticado + entrando a ruta autenticada
        if (authStore.isLoggedIn && willBeInAuthRoute && !wsManager.isConnected) {
          console.log('🔄 Conectando notificaciones para:', to.path)
          wsManager.connect()
          setupNotifications()
        }
        
        // ❌ DESCONECTAR: Sale de rutas autenticadas o logout
        if ((!authStore.isLoggedIn || !willBeInAuthRoute) && wsManager.isConnected) {
          console.log('🔌 Desconectando notificaciones')
          wsManager.disconnect()
          cleanupNotifications()
        }
        
      } catch (error) {
        console.warn('⚠️ Error en router guard:', error)
      }
      
      next()
    })

    // ==================== CONFIGURACIÓN DE NOTIFICACIONES ====================

    function setupNotifications() {
      if (notificationsConfigured) return
      notificationsConfigured = true

      console.log('🔔 Configurando notificaciones...')

      // 📦 NOTIFICACIONES DE CAMBIO DE ESTADO
      wsManager.on('order_notification', (notification) => {
        if (currentRouteType !== 'authenticated') return
        
        console.log('📦 Notificación de orden:', notification)
        
        const toastConfig = {
          timeout: notification.duration || 6000,
          closeOnClick: true,
          draggable: true,
          pauseOnHover: true
        }

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
            // Compatibilidad con formato anterior
            const icon = getIconForType(notification.data?.type)
            toast.info(`${icon} ${notification.message}`, toastConfig)
        }
      })

      // 🆕 NUEVAS ÓRDENES (solo admins)
      wsManager.on('new_order_notification', (notification) => {
        if (currentRouteType !== 'authenticated') return
        
        try {
          const authStore = useAuthStore()
          if (!authStore.isAdmin) return
        } catch (error) {
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
      wsManager.on('connected', () => {
        console.log('✅ Notificaciones conectadas')
        
        if (currentRouteType === 'authenticated' && !wsManager._firstToastShown) {
          wsManager._firstToastShown = true
          toast.success('📡 Notificaciones activadas', {
            timeout: 3000,
            closeOnClick: true
          })
        }
      })

      wsManager.on('disconnected', (data) => {
        console.log('❌ Notificaciones desconectadas')
        
        if (currentRouteType === 'authenticated' && data.code !== 1000) {
          toast.warning('⚠️ Notificaciones desconectadas', {
            timeout: 4000,
            closeOnClick: true
          })
        }
      })

      wsManager.on('error', (data) => {
        console.error('❌ Error en notificaciones:', data.error)
        
        if (currentRouteType === 'authenticated') {
          toast.error('❌ Error en notificaciones', { timeout: 5000 })
        }
      })

      wsManager.on('server_error', (data) => {
        console.error('❌ Error del servidor:', data.message)
        
        if (currentRouteType === 'authenticated') {
          toast.error(`❌ ${data.message}`, { timeout: 6000 })
        }
      })
    }

    function cleanupNotifications() {
      if (!notificationsConfigured) return
      
      console.log('🧹 Limpiando notificaciones...')
      
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
      
      notificationsConfigured = false
      wsManager._firstToastShown = false
    }

    function getIconForType(type) {
      const icons = {
        'driver_assigned': '👨‍💼',
        'picked_up': '🚚',
        'delivered': '✅',
        'proof_uploaded': '📸'
      }
      return icons[type] || '📦'
    }

    // ==================== WATCH AUTH CHANGES ====================
    
    router.afterEach(() => {
      setTimeout(() => {
        try {
          const authStore = useAuthStore()
          
          if (!authStore.isLoggedIn && wsManager.isConnected) {
            console.log('👤 Usuario deslogueado, desconectando...')
            wsManager.disconnect()
            cleanupNotifications()
          }
        } catch (error) {
          // Store no disponible
        }
      }, 50)
    })

    console.log('✅ Sistema de notificaciones configurado')

  }).catch(error => {
    console.error('❌ Error configurando notificaciones:', error)
  })
}

console.log('✅ Aplicación iniciada')

// ==================== DEBUG HELPERS (DESARROLLO) ====================
if (import.meta.env.DEV) {
  window.wsManager = wsManager
  
  setTimeout(() => {
    window.debugNotifications = {
      wsState: () => wsManager.connectionState,
      testConnection: () => {
        if (wsManager.isConnected) {
          console.log('🔗 WebSocket conectado')
        } else {
          console.log('❌ WebSocket desconectado')
        }
      }
    }
  }, 500)
}