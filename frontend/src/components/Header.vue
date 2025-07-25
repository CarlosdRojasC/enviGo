<!-- frontend/src/components/Header.vue - VERSIÓN CORREGIDA -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api' // ← Importación corregida
import { useEnvigoToast } from '../services/toast.service'
import wsManager from '../services/websocket.service'
import UtilsService, { useDebouncedSearch, useCache } from '../services/utils.service'

// ==================== SETUP ====================
const emit = defineEmits(['toggle-mobile-menu'])
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useEnvigoToast()
const utils = UtilsService

// ==================== REFS ====================
const userMenuRef = ref(null)

// ==================== ESTADO REACTIVO ====================
const isScrolled = ref(false)
const showNotifications = ref(false)
const showUserMenu = ref(false)
const notifications = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMoreNotifications = ref(true)
const hasNewNotifications = ref(false)
const currentPage = ref(1)

// Búsqueda global
const showSearch = ref(true)
const searchQuery = ref('')
const searchFocused = ref(false)
const searchResults = ref([])
const searchLoading = ref(false)

// Stats dinámicas en header
const quickStats = ref([])

// Connection status
const isConnected = ref(false)
const lastPingTime = ref(null)

// ==================== CACHE INSTANCES ====================
const notificationsCache = useCache(30000) // 30 segundos
const statsCache = useCache(60000) // 1 minuto
const searchCache = useCache(180000) // 3 minutos

// ==================== DEBOUNCED FUNCTIONS ====================
const { search: debouncedSearch } = useDebouncedSearch(async () => {
  await handleSearch()
}, 300)

// ==================== COMPUTED ====================
const pageTitle = computed(() => {
  const routeNames = {
    'Dashboard': 'Dashboard',
    'AdminDashboard': 'Panel Administrativo',
    'Orders': 'Mis Pedidos',
    'AdminOrders': 'Gestión Global de Pedidos',
    'Channels': 'Canales de Venta',
    'AdminChannels': 'Todos los Canales',
    'Billing': 'Facturación',
    'AdminBilling': 'Facturación Global',
    'AdminCompanies': 'Gestión de Empresas',
    'AdminDrivers': 'Gestión de Conductores',
    'AdminCommunes': 'Gestión de Comunas'
  }
  
  return routeNames[route.name] || 'enviGo'
})

const breadcrumbs = computed(() => {
  const crumbs = []
  
  if (auth.isAdmin) {
    crumbs.push({ name: 'Admin', path: '/app/admin/dashboard' })
  } else {
    crumbs.push({ name: 'Inicio', path: '/app/dashboard' })
  }
  
  if (route.name !== 'Dashboard' && route.name !== 'AdminDashboard') {
    crumbs.push({ name: pageTitle.value, path: null })
  }
  
  return crumbs
})

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

const displayNotifications = computed(() => {
  return notifications.value.slice(0, currentPage.value * 10)
})

const groupedResults = computed(() => {
  const groups = utils.groupOrdersBy(searchResults.value, 'type')
  
  return Object.entries(groups).map(([type, items]) => ({
    type,
    label: getSearchCategoryLabel(type),
    items
  }))
})

const connectionStatusClass = computed(() => ({
  connected: isConnected.value,
  disconnected: !isConnected.value,
  warning: isConnected.value && lastPingTime.value && (Date.now() - lastPingTime.value) > 60000
}))

const connectionStatusText = computed(() => {
  if (!isConnected.value) return 'Desconectado'
  if (lastPingTime.value && (Date.now() - lastPingTime.value) > 60000) return 'Reconectando...'
  return 'En línea'
})

// ==================== MÉTODOS MEJORADOS ====================

/**
 * Cargar notificaciones con manejo de errores mejorado
 */
async function loadNotifications(page = 1, useCache = true) {
  const cacheKey = `notifications_${page}`
  
  // Verificar cache primero
  if (useCache) {
    const cached = notificationsCache.get(cacheKey)
    if (cached) {
      notifications.value = cached
      return
    }
  }

  try {
    loading.value = page === 1
    loadingMore.value = page > 1
    
    // Usar el nuevo método del apiService
    const response = await utils.retry(async () => {
      return await apiService.notifications.getAll({
        page,
        limit: 10,
        include_read: true
      })
    }, 2, 1000)
    
    const newNotifications = response.data.notifications || response.data.data || []
    
    if (page === 1) {
      notifications.value = newNotifications
    } else {
      notifications.value.push(...newNotifications)
    }
    
    hasMoreNotifications.value = response.data.hasMore || response.data.has_more || false
    currentPage.value = page
    
    // Guardar en cache
    notificationsCache.set(cacheKey, notifications.value)
    
    console.log(`📬 Notificaciones cargadas: ${newNotifications.length} (página ${page})`)
    
  } catch (error) {
    console.error('❌ Error cargando notificaciones:', error)
    
    if (page === 1) {
      // Si es la primera carga y falla, usar datos de ejemplo
      notifications.value = getExampleNotifications()
    }
    
    // Solo mostrar toast si no es un error de red conocido
    if (!error.response || error.response.status !== 404) {
      toast.error('Error al cargar notificaciones')
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/**
 * Búsqueda global mejorada
 */
async function handleSearch() {
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = []
    return
  }

  const query = searchQuery.value.trim()
  const cacheKey = `search_${query}`
  
  // Verificar cache
  const cached = searchCache.get(cacheKey)
  if (cached) {
    searchResults.value = cached
    return
  }

  try {
    searchLoading.value = true
    
    // Usar el nuevo método del apiService
    const response = await apiService.search.global(query, { limit: 10 })
    
    const results = response.data.results || response.data.data || []
    searchResults.value = results
    
    // Guardar en cache
    searchCache.set(cacheKey, results)
    
  } catch (error) {
    console.error('❌ Error en búsqueda global:', error)
    searchResults.value = []
    
    if (!error.response || error.response.status !== 404) {
      toast.error('Error en la búsqueda')
    }
  } finally {
    searchLoading.value = false
  }
}

/**
 * Manejar input de búsqueda
 */
function handleSearchInput() {
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = []
    searchLoading.value = false
    return
  }
  
  searchLoading.value = true
  debouncedSearch()
}

/**
 * Cargar stats del dashboard
 */
async function loadQuickStats() {
  if (!['Dashboard', 'Orders'].includes(route.name)) {
    quickStats.value = []
    return
  }

  const cacheKey = `stats_${route.name}`
  
  // Verificar cache
  const cached = statsCache.get(cacheKey)
  if (cached) {
    quickStats.value = cached
    return
  }

  try {
    const response = await utils.retry(async () => {
      return await apiService.dashboard.getStats()
    }, 2, 1000)
    
    const stats = response.data
    
    const newStats = [
      {
        key: 'today',
        icon: '📦',
        value: stats.ordersToday || stats.orders_today || 0,
        label: 'Hoy',
        updated: false
      },
      {
        key: 'month',
        icon: '📅',
        value: stats.monthlyOrders || stats.monthly_orders || 0,
        label: 'Este mes',
        updated: false
      },
      {
        key: 'delivered',
        icon: '✅',
        value: stats.deliveredTotal || stats.delivered_total || 0,
        label: 'Entregados',
        updated: false
      }
    ]
    
    quickStats.value = newStats
    
    // Guardar en cache
    statsCache.set(cacheKey, newStats)
    
  } catch (error) {
    console.error('❌ Error cargando stats rápidas:', error)
    quickStats.value = []
    
    // No mostrar toast para este error, es secundario
  }
}

/**
 * Marcar notificación como leída
 */
async function markAsRead(notificationId) {
  const notification = notifications.value.find(n => n.id === notificationId)
  if (!notification) return
  
  // Optimistic update
  const originalState = { read: notification.read, isNew: notification.isNew }
  notification.read = true
  notification.isNew = false
  
  try {
    await apiService.notifications.markAsRead(notificationId)
    
    // Limpiar cache para recargar datos frescos
    notificationsCache.clear()
    console.log(`✅ Notificación marcada como leída: ${notificationId}`)
    
  } catch (error) {
    console.error('❌ Error marcando notificación como leída:', error)
    
    // Revertir optimistic update
    notification.read = originalState.read
    notification.isNew = originalState.isNew
    
    toast.error('Error al marcar notificación como leída')
  }
}

/**
 * Marcar todas como leídas
 */
async function markAllAsRead() {
  const unreadNotifications = notifications.value.filter(n => !n.read)
  if (unreadNotifications.length === 0) return
  
  // Optimistic update
  const originalStates = unreadNotifications.map(n => ({
    id: n.id,
    read: n.read,
    isNew: n.isNew
  }))
  
  unreadNotifications.forEach(notification => {
    notification.read = true
    notification.isNew = false
  })
  
  try {
    await apiService.notifications.markAllAsRead()
    
    // Limpiar cache
    notificationsCache.clear()
    toast.success('✅ Todas las notificaciones marcadas como leídas')
    
  } catch (error) {
    console.error('❌ Error marcando todas como leídas:', error)
    
    // Revertir optimistic update
    originalStates.forEach(({ id, read, isNew }) => {
      const notification = notifications.value.find(n => n.id === id)
      if (notification) {
        notification.read = read
        notification.isNew = isNew
      }
    })
    
    toast.error('Error al marcar todas como leídas')
  }
}

/**
 * Configurar WebSocket
 */
function setupWebSocket() {
  // Solo configurar si wsManager está disponible
  if (!wsManager) {
    console.warn('⚠️ WebSocket manager no disponible')
    return
  }

  // Estado de conexión
  wsManager.on('connected', () => {
    isConnected.value = true
    lastPingTime.value = Date.now()
    console.log('🔔 Header: WebSocket conectado')
  })
  
  wsManager.on('disconnected', () => {
    isConnected.value = false
    console.log('🔔 Header: WebSocket desconectado')
  })
  
  wsManager.on('error', (error) => {
    console.error('🔔 Header: Error WebSocket:', error)
    isConnected.value = false
  })
  
  wsManager.on('pong', () => {
    lastPingTime.value = Date.now()
  })
  
  // Notificaciones en tiempo real
  wsManager.on('order_notification', (data) => {
    addRealTimeNotification({
      id: `rt_${Date.now()}_${Math.random()}`,
      type: 'order',
      title: data.title,
      message: data.message,
      order_id: data.data?.order_id,
      order_number: data.data?.order_number,
      created_at: new Date(),
      read: false,
      isNew: true
    })
    
    hasNewNotifications.value = true
    notificationsCache.clear()
  })
  
  wsManager.on('new_order_notification', (data) => {
    addRealTimeNotification({
      id: `rt_${Date.now()}_${Math.random()}`,
      type: 'new_order',
      title: data.title,
      message: data.message,
      order_id: data.data?.order_id,
      order_number: data.data?.order_number,
      created_at: new Date(),
      read: false,
      isNew: true
    })
    
    hasNewNotifications.value = true
    notificationsCache.clear()
  })

  // Stats updates en tiempo real
  wsManager.on('stats_update', (data) => {
    updateQuickStats(data)
  })
}

/**
 * Resto de métodos permanecen igual...
 */
function updateQuickStats(data) {
  let hasUpdates = false
  
  quickStats.value.forEach(stat => {
    if (data[stat.key] !== undefined && data[stat.key] !== stat.value) {
      stat.value = data[stat.key]
      stat.updated = true
      hasUpdates = true
      
      setTimeout(() => {
        stat.updated = false
      }, 2000)
    }
  })
  
  if (hasUpdates) {
    statsCache.clear()
  }
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function goToProfile() {
  router.push('/app/profile')
  showUserMenu.value = false
}

function goToSettings() {
  router.push('/app/settings')
  showUserMenu.value = false
}

async function handleLogout() {
  try {
    await auth.logout()
    
    // Limpiar todos los caches
    notificationsCache.clear()
    statsCache.clear()
    searchCache.clear()
    
    router.push('/login')
    toast.success('Sesión cerrada correctamente')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
    toast.error('Error al cerrar sesión')
  }
}

function loadMoreNotifications() {
  if (!loadingMore.value && hasMoreNotifications.value) {
    loadNotifications(currentPage.value + 1, false)
  }
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  
  if (showNotifications.value) {
    loadNotifications(1, false)
    hasNewNotifications.value = false
  }
}

function handleNotificationClick(notification) {
  if (!notification.read) {
    markAsRead(notification.id)
  }
  
  if (notification.order_id) {
    router.push(`/app/orders?search=${notification.order_number}`)
    showNotifications.value = false
  } else if (notification.channel_id) {
    router.push(`/app/channels`)
    showNotifications.value = false
  }
}

function selectSearchResult(result) {
  searchFocused.value = false
  searchQuery.value = result.title
  
  if (result.route) {
    router.push(result.route)
  }
  
  setTimeout(() => {
    searchQuery.value = ''
    searchResults.value = []
  }, 100)
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  searchLoading.value = false
}

function handleSearchBlur() {
  setTimeout(() => {
    searchFocused.value = false
  }, 200)
}

function addRealTimeNotification(notification) {
  notifications.value.unshift(notification)
  
  setTimeout(() => {
    const notif = notifications.value.find(n => n.id === notification.id)
    if (notif) notif.isNew = false
  }, 3000)
  
  if (notifications.value.length > 50) {
    notifications.value = notifications.value.slice(0, 50)
  }
}

// Throttled scroll handler
const handleScroll = utils.createThrottledHandler(() => {
  isScrolled.value = window.scrollY > 10
}, 100)

function handleClickOutside(event) {
  if (!event.target.closest('.notifications-container') && 
      !event.target.closest('.notifications-panel-overlay')) {
    showNotifications.value = false
  }
  if (!event.target.closest('.user-profile')) {
    showUserMenu.value = false
  }
}

function formatRole(role) {
  const roles = {
    'admin': 'Administrador',
    'company_owner': 'Propietario',
    'company_employee': 'Empleado'
  }
  return roles[role] || role
}

function getNotificationIcon(type) {
  const icons = {
    'order': '📦',
    'new_order': '🆕',
    'delivery': '🚚',
    'error': '❌',
    'success': '✅',
    'warning': '⚠️',
    'info': 'ℹ️',
    'sync': '🔄'
  }
  return icons[type] || '📬'
}

function getSearchCategoryLabel(type) {
  const labels = {
    'orders': 'Pedidos',
    'customers': 'Clientes',
    'channels': 'Canales',
    'companies': 'Empresas'
  }
  return labels[type] || type
}

function getExampleNotifications() {
  return [
    {
      id: '1',
      type: 'order',
      title: 'Pedido Entregado',
      message: 'El pedido #ORD-001 ha sido entregado exitosamente',
      order_number: 'ORD-001',
      created_at: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
      isNew: false
    },
    {
      id: '2',
      type: 'new_order',
      title: 'Nuevo Pedido',
      message: 'Nuevo pedido recibido desde Shopify',
      order_number: 'ORD-002',
      created_at: new Date(Date.now() - 1000 * 60 * 60),
      read: false,
      isNew: false
    },
    {
      id: '3',
      type: 'sync',
      title: 'Sincronización Completada',
      message: 'Canal "Mi Tienda" sincronizado: 5 pedidos importados',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: true,
      isNew: false
    }
  ]
}

// ==================== WATCHERS ====================
watch(() => route.name, () => {
  loadQuickStats()
})

// Cleanup cuando se cambia de usuario
watch(() => auth.user?.id, () => {
  notificationsCache.clear()
  statsCache.clear()
  searchCache.clear()
  notifications.value = []
  quickStats.value = []
  
  if (auth.user?.id) {
    nextTick(() => {
      loadNotifications()
      loadQuickStats()
    })
  }
})

// ==================== LIFECYCLE ====================
onMounted(async () => {
  console.log('🔔 Header dinámico montado')
  
  // Configurar eventos con throttling
  window.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('click', handleClickOutside)
  
  // Cargar datos iniciales
  await nextTick()
  
  // Verificar que el usuario esté autenticado antes de cargar datos
  if (auth.user?.id) {
    loadNotifications()
    loadQuickStats()
  }
  
  // Configurar WebSocket
  setupWebSocket()
  
  // Auto-refresh con intervalos más inteligentes
  const statsInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && auth.user?.id) {
      loadQuickStats()
    }
  }, 5 * 60 * 1000) // 5 minutos
  
  const notificationsInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && !showNotifications.value && auth.user?.id) {
      loadNotifications(1, false)
    }
  }, 2 * 60 * 1000) // 2 minutos
  
  // Listener para visibility change (optimización)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && auth.user?.id) {
      // Refrescar datos cuando la tab vuelve a estar visible
      loadNotifications(1, false)
      loadQuickStats()
    }
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  onUnmounted(() => {
    clearInterval(statsInterval)
    clearInterval(notificationsInterval)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
  
  // Limpiar caches
  notificationsCache.clear()
  statsCache.clear()
  searchCache.clear()
  
  console.log('🔔 Header dinámico desmontado')
})
</script>

<!-- El template permanece igual que en la versión anterior -->
<template>
  <header class="header" :class="{ 'header-scrolled': isScrolled }">
    <div class="header-content">
      <!-- Left Section - Breadcrumbs y título dinámico -->
      <div class="header-left">
        <div class="page-info">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <div class="breadcrumb" v-if="breadcrumbs.length > 0">
            <span v-for="(crumb, index) in breadcrumbs" :key="index">
              <router-link v-if="crumb.path" :to="crumb.path" class="breadcrumb-link">
                {{ crumb.name }}
              </router-link>
              <span v-else class="breadcrumb-current">{{ crumb.name }}</span>
              <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
            </span>
          </div>
        </div>
        
        <!-- Estadísticas rápidas dinámicas -->
        <div class="quick-stats" v-if="quickStats.length > 0">
          <div 
            v-for="stat in quickStats" 
            :key="stat.key" 
            class="quick-stat-item"
            :class="{ updated: stat.updated }"
          >
            <span class="stat-icon">{{ stat.icon }}</span>
            <span class="stat-value">{{ utils.formatNumber(stat.value) }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Center Section - Barra de búsqueda global -->
      <div class="header-center">
        <div class="global-search" v-if="showSearch">
          <div class="search-input-container">
            <i class="search-icon">🔍</i>
            <input
              v-model="searchQuery"
              @input="handleSearchInput"
              @focus="searchFocused = true"
              @blur="handleSearchBlur"
              class="search-input"
              placeholder="Buscar pedidos, canales, clientes..."
              autocomplete="off"
            />
            <div v-if="searchLoading" class="search-loading">
              <div class="loading-spinner"></div>
            </div>
            <button v-else-if="searchQuery" @click="clearSearch" class="clear-search">×</button>
          </div>
          
          <!-- Resultados de búsqueda -->
          <div v-if="searchResults.length > 0 && searchFocused" class="search-results">
            <div class="search-category" v-for="category in groupedResults" :key="category.type">
              <div class="category-header">{{ category.label }}</div>
              <div 
                v-for="result in category.items" 
                :key="result.id"
                @click="selectSearchResult(result)"
                class="search-result-item"
              >
                <span class="result-icon">{{ result.icon }}</span>
                <div class="result-content">
                  <div class="result-title">{{ result.title }}</div>
                  <div class="result-subtitle">{{ result.subtitle }}</div>
                </div>
                <span class="result-action">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Section - Notificaciones y usuario -->
      <div class="header-right">
        <!-- Estado de conexión en tiempo real -->
        <div class="connection-status" :class="connectionStatusClass">
          <div class="status-dot" :class="{ pulsing: isConnected }"></div>
          <span class="status-text">{{ connectionStatusText }}</span>
        </div>

        <!-- Notificaciones -->
        <div class="notifications-container">
          <button 
            @click="toggleNotifications" 
            class="notifications-trigger"
            :class="{ active: showNotifications }"
          >
            <div class="notification-icon">
              <i class="icon">🔔</i>
              <span v-if="unreadCount > 0" class="notification-badge" :class="{ pulse: hasNewNotifications }">
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </div>
          </button>

          <!-- Panel de notificaciones -->
          <teleport to="body">
            <div 
              v-if="showNotifications" 
              class="notifications-panel-overlay"
              @click="showNotifications = false"
            >
              <div class="notifications-panel" @click.stop>
                <div class="notifications-header">
                  <h3>Notificaciones</h3>
                  <div class="header-actions">
                    <button @click="markAllAsRead" class="mark-all-read" :disabled="unreadCount === 0">
                      Marcar todas como leídas
                    </button>
                    <button @click="showNotifications = false" class="close-panel">×</button>
                  </div>
                </div>
                
                <div class="notifications-content">
                  <div v-if="loading" class="notifications-loading">
                    <div class="loading-spinner"></div>
                    <span>Cargando notificaciones...</span>
                  </div>
                  
                  <div v-else-if="notifications.length === 0" class="no-notifications">
                    <i class="empty-icon">🔕</i>
                    <p>No hay notificaciones</p>
                  </div>
                  
                  <div v-else class="notifications-list">
                    <div 
                      v-for="notification in displayNotifications" 
                      :key="notification.id"
                      class="notification-item"
                      :class="{ 
                        unread: !notification.read, 
                        [notification.type]: true,
                        new: notification.isNew 
                      }"
                      @click="handleNotificationClick(notification)"
                    >
                      <div class="notification-icon-container">
                        <span class="notification-type-icon">{{ getNotificationIcon(notification.type) }}</span>
                      </div>
                      
                      <div class="notification-content">
                        <div class="notification-title">{{ notification.title }}</div>
                        <div class="notification-message">{{ notification.message }}</div>
                        <div class="notification-meta">
                          <span class="notification-time">{{ utils.formatRelativeDate(notification.created_at) }}</span>
                          <span v-if="notification.order_number" class="notification-order">
                            #{{ notification.order_number }}
                          </span>
                        </div>
                      </div>
                      
                      <div class="notification-actions">
                        <button 
                          v-if="!notification.read" 
                          @click.stop="markAsRead(notification.id)"
                          class="mark-read-btn"
                          title="Marcar como leída"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="hasMoreNotifications" class="notifications-footer">
                    <button @click="loadMoreNotifications" class="load-more-btn" :disabled="loadingMore">
                      {{ loadingMore ? 'Cargando...' : 'Ver más notificaciones' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </teleport>
        </div>

        <!-- Perfil de usuario -->
        <div class="user-profile" @click="toggleUserMenu" ref="userMenuRef">
          <div class="user-avatar" :class="{ online: isConnected }">
            {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
            <div class="user-status-dot" :class="{ online: isConnected }"></div>
          </div>
          <div class="user-info">
            <span class="user-name">{{ auth.user?.full_name }}</span>
            <span class="user-role">{{ formatRole(auth.user?.role) }}</span>
          </div>
          <div class="user-dropdown-arrow">⌄</div>
          
          <!-- User Menu Dropdown -->
          <div v-if="showUserMenu" class="user-menu-dropdown">
            <div class="user-menu-item" @click="goToProfile">
              <i class="menu-icon">👤</i>
              <span>Mi Perfil</span>
            </div>
            <div class="user-menu-item" @click="goToSettings">
              <i class="menu-icon">⚙️</i>
              <span>Configuración</span>
            </div>
            <hr class="menu-divider">
            <div class="user-menu-item logout" @click="handleLogout">
              <i class="menu-icon">🚪</i>
              <span>Cerrar Sesión</span>
            </div>
          </div>
        </div>

        <!-- Botón de menú móvil -->
        <button class="mobile-menu-btn" @click="$emit('toggle-mobile-menu')">
          <i class="hamburger-icon">☰</i>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Header base */
.header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-scrolled {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-bottom-color: #d1d5db;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  gap: 2rem;
}

/* Header Left */
.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.page-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  line-height: 1.2;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.breadcrumb-link {
  color: #8BC53F;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: #7AB32E;
}

.breadcrumb-current {
  color: #374151;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #d1d5db;
  margin: 0 0.25rem;
}

/* Quick Stats */
.quick-stats {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.quick-stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(139, 197, 63, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(139, 197, 63, 0.2);
  transition: all 0.3s ease;
}

.quick-stat-item.updated {
  animation: statUpdate 0.6s ease-out;
}

@keyframes statUpdate {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); background: rgba(139, 197, 63, 0.2); }
  100% { transform: scale(1); }
}

.stat-icon {
  font-size: 1rem;
}

.stat-value {
  font-weight: 700;
  color: #1f2937;
  font-size: 0.875rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

/* El resto de los estilos CSS permanecen igual que en la versión anterior */
/* ... (todos los demás estilos del header) */

/* Estilo adicional para loading de búsqueda */
.search-loading {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

.search-loading .loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #8BC53F;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>