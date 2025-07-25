// frontend/src/components/Header.vue - MEJORA PARA APERTURA DE MODALES

<template>
  <header class="app-header" :class="{ scrolled: isScrolled }">
    <div class="header-container">
      <!-- Left Section -->
      <div class="header-left">
        <button 
          @click="$emit('toggle-mobile-menu')" 
          class="mobile-menu-trigger md:hidden"
          aria-label="Abrir menú"
        >
          ☰
        </button>

        <div class="page-info">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <template v-for="(crumb, index) in breadcrumbs" :key="index">
              <router-link 
                v-if="crumb.path" 
                :to="crumb.path" 
                class="breadcrumb-link"
              >
                {{ crumb.name }}
              </router-link>
              <span v-else class="breadcrumb-current">{{ crumb.name }}</span>
              <span 
                v-if="index < breadcrumbs.length - 1" 
                class="breadcrumb-separator"
              >/</span>
            </template>
          </nav>
        </div>

        <div v-if="quickStats.length > 0" class="quick-stats">
          <div 
            v-for="stat in quickStats" 
            :key="stat.label"
            class="quick-stat-item"
            :class="{ updated: stat.updated }"
          >
            <span class="stat-icon">{{ stat.icon }}</span>
            <div>
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center Section - Search -->
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
          
          <div v-if="searchResults.length > 0 && searchFocused" class="search-results">
            <div class="search-category" v-for="category in groupedResults" :key="category.type">
              <div class="category-header">{{ category.label }}</div>
              <div 
                v-for="result in category.items" 
                :key="result.id"
                @click="selectSearchResult(result)"
                class="search-result-item"
                :title="`Clic para abrir ${result.type === 'orders' ? (auth.isAdmin ? 'detalles' : 'tracking') : 'detalles'} de ${result.title}`"
              >
                <span class="result-icon">{{ result.icon }}</span>
                <div class="result-content">
                  <div class="result-title">{{ result.title }}</div>
                  <div class="result-subtitle">{{ result.subtitle }}</div>
                </div>
                <span class="result-action">
                  {{ result.type === 'orders' ? (auth.isAdmin ? '👁️' : '🚚') : '→' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Section -->
      <div class="header-right">
        <div class="connection-status" :class="connectionStatusClass">
          <div class="status-dot" :class="{ pulsing: isConnected }"></div>
          <span class="status-text">{{ connectionStatusText }}</span>
        </div>

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
          
          <!-- Notifications Panel -->
          <div v-if="showNotifications" class="notifications-panel">
            <!-- Notifications content... -->
          </div>
        </div>

        <!-- User Menu -->
        <div class="user-profile" @click="toggleUserMenu">
          <div class="user-avatar">
            {{ auth.user?.name?.charAt(0) || 'U' }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ auth.user?.name || 'Usuario' }}</div>
            <div class="user-role">{{ formatRole(auth.user?.role) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de OrderDetails para Admin (cuando busca desde header) -->
    <Modal 
      v-model="showOrderDetailsFromSearch" 
      :title="`Detalles del Pedido #${selectedOrderFromSearch?.order_number}`" 
      width="900px"
      class="header-search-modal"
    >
      <OrderDetails 
        v-if="selectedOrderFromSearch" 
        :order="selectedOrderFromSearch" 
        :loading="loadingOrderFromSearch"
        @close="closeOrderDetailsFromSearch"
      />
    </Modal>

    <!-- Modal de OrderTracking para Company Users (cuando busca desde header) -->
    <Modal 
      v-model="showTrackingFromSearch" 
      :title="`🚚 Tracking - Pedido #${selectedOrderFromSearch?.order_number}`"
      width="700px"
      class="header-search-modal"
    >
      <OrderTracking 
        v-if="selectedOrderFromSearch" 
        :order-id="selectedOrderFromSearch._id" 
        :order-number="selectedOrderFromSearch.order_number"
        :loading="loadingOrderFromSearch"
        @close="closeTrackingFromSearch"
        @show-proof="handleShowProofFromSearch"
      />
    </Modal>

    <!-- Modal de Proof of Delivery (cuando viene desde tracking del header) -->
    <Modal 
      v-model="showProofFromSearch" 
      :title="`📋 Prueba de Entrega - #${selectedOrderFromSearch?.order_number}`"
      width="700px"
      class="header-search-modal"
    >
      <ProofOfDelivery 
        v-if="selectedOrderFromSearch && !loadingOrderFromSearch" 
        :order="selectedOrderFromSearch" 
      />
    </Modal>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import { useEnvigoToast } from '../services/toast.service'
import wsManager from '../services/websocket.service'
import UtilsService, { useDebouncedSearch, useCache } from '../services/utils.service'

// Componentes importados
import Modal from './Modal.vue'
import OrderDetails from './OrderDetails.vue'
import OrderTracking from './OrderTracking.vue'
import ProofOfDelivery from './ProofOfDelivery.vue'

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

// ==================== NUEVOS REFS PARA MODALES DESDE BÚSQUEDA ====================
const showOrderDetailsFromSearch = ref(false)
const showTrackingFromSearch = ref(false)
const showProofFromSearch = ref(false)
const selectedOrderFromSearch = ref(null)
const loadingOrderFromSearch = ref(false)

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

// ==================== MÉTODOS PRINCIPALES ====================

/**
 * 🔍 NUEVA FUNCIÓN MEJORADA: selectSearchResult
 * Ahora abre el modal apropiado según el rol del usuario y el tipo de resultado
 */
async function selectSearchResult(result) {
  console.log('🔍 [Header] Resultado seleccionado:', result)
  
  searchFocused.value = false
  
  try {
    // Si es un pedido, manejar según el rol del usuario
    if (result.type === 'orders') {
      await handleOrderSelection(result)
    } 
    // Si es otro tipo de resultado, usar la navegación tradicional
    else {
      if (result.route) {
        router.push(result.route)
      }
    }
    
  } catch (error) {
    console.error('❌ [Header] Error procesando resultado de búsqueda:', error)
    toast.error('Error al abrir el resultado seleccionado')
  } finally {
    // Limpiar búsqueda después de un momento
    setTimeout(() => {
      searchQuery.value = ''
      searchResults.value = []
    }, 100)
  }
}

/**
 * 🎯 NUEVA FUNCIÓN: Manejar selección de pedidos según rol
 */
async function handleOrderSelection(result) {
  console.log('📦 [Header] Manejando selección de pedido:', result.title)
  
  // Cargar datos completos del pedido
  loadingOrderFromSearch.value = true
  
  try {
    // Obtener datos completos del pedido
    const { data: fullOrder } = await apiService.orders.getById(result.order_id || result.id)
    selectedOrderFromSearch.value = fullOrder
    
    // Decidir qué modal abrir según el rol
    if (auth.isAdmin) {
      // Admin ve detalles completos
      showOrderDetailsFromSearch.value = true
      console.log('👨‍💼 [Header] Abriendo modal de detalles para admin')
    } else {
      // Company users ven tracking
      showTrackingFromSearch.value = true
      console.log('🏢 [Header] Abriendo modal de tracking para usuario empresa')
    }
    
  } catch (error) {
    console.error('❌ [Header] Error cargando pedido:', error)
    toast.error('No se pudo cargar la información del pedido')
  } finally {
    loadingOrderFromSearch.value = false
  }
}

/**
 * 🚪 NUEVAS FUNCIONES: Cerrar modales desde búsqueda
 */
function closeOrderDetailsFromSearch() {
  showOrderDetailsFromSearch.value = false
  selectedOrderFromSearch.value = null
  console.log('❌ [Header] Modal de detalles cerrado')
}

function closeTrackingFromSearch() {
  showTrackingFromSearch.value = false
  selectedOrderFromSearch.value = null
  console.log('❌ [Header] Modal de tracking cerrado')
}

function closeProofFromSearch() {
  showProofFromSearch.value = false
  console.log('❌ [Header] Modal de prueba de entrega cerrado')
}

/**
 * 📋 NUEVA FUNCIÓN: Manejar mostrar prueba de entrega desde tracking
 */
function handleShowProofFromSearch(proofData) {
  console.log('📋 [Header] Mostrando prueba de entrega desde tracking')
  showTrackingFromSearch.value = false
  showProofFromSearch.value = true
  // Los datos del pedido ya están en selectedOrderFromSearch
}

// ==================== FUNCIONES EXISTENTES (mantenidas) ====================

/**
 * Búsqueda global - VERSIÓN MEJORADA
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
    
    const response = await apiService.get('/search/global', {
      params: { q: query, limit: 10 }
    })
    
    const results = response.data.results || response.data.data || response.data || []
    
    // Enriquecer resultados con información adicional para orders
    const enrichedResults = results.map(result => {
      if (result.type === 'orders') {
        return {
          ...result,
          order_id: result.id, // Asegurar que tenemos order_id
          subtitle: `${result.subtitle} • ${auth.isAdmin ? 'Ver detalles' : 'Ver tracking'}`
        }
      }
      return result
    })
    
    searchResults.value = enrichedResults
    
    // Guardar en cache
    searchCache.set(cacheKey, enrichedResults)
    
  } catch (error) {
    console.error('❌ [Header] Error en búsqueda global:', error)
    searchResults.value = []
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

// ==================== FUNCIONES DE UTILIDAD ====================

function formatRole(role) {
  const roles = {
    'admin': 'Administrador',
    'company_owner': 'Propietario',
    'company_employee': 'Empleado'
  }
  return roles[role] || role
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

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

// ==================== LIFECYCLE ====================

onMounted(() => {
  // Setup event listeners y websockets
  document.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleClickOutside)
  
  console.log('🔍 [Header] Componente inicializado con búsqueda mejorada')
})

onUnmounted(() => {
  document.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
})

// ==================== EVENT HANDLERS ====================

const handleScroll = utils.createThrottledHandler(() => {
  isScrolled.value = window.scrollY > 10
}, 100)

function handleClickOutside(event) {
  if (!event.target.closest('.notifications-container')) {
    showNotifications.value = false
  }
  if (!event.target.closest('.user-profile')) {
    showUserMenu.value = false
  }
}

</script>

<style scoped>
/* Estilos existentes mantenidos... */

/* Nuevos estilos para modales desde búsqueda */
.header-search-modal :deep(.modal-container) {
  border-top: 3px solid #8BC53F;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 2px 8px;
}

.search-result-item:hover {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  transform: translateX(4px);
}

.result-action {
  color: #8BC53F;
  font-weight: 600;
  font-size: 1.1rem;
  transition: transform 0.2s ease;
}

.search-result-item:hover .result-action {
  transform: scale(1.2);
}

/* Indicador visual para tipos de pedidos */
.search-result-item[title*="detalles"] .result-icon::after {
  content: "👨‍💼";
  position: absolute;
  font-size: 0.6em;
  margin-left: -4px;
  margin-top: -4px;
}

.search-result-item[title*="tracking"] .result-icon::after {
  content: "🏢";
  position: absolute;
  font-size: 0.6em;
  margin-left: -4px;
  margin-top: -4px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #8BC53F;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
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

/* Header Center - Search */
.header-center {
  flex: 1;
  max-width: 400px;
  position: relative;
}

.global-search {
  position: relative;
  width: 100%;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #9ca3af;
  font-size: 1rem;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: white;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  outline: none;
  border-color: #8BC53F;
  box-shadow: 0 0 0 3px rgba(139, 197, 63, 0.1);
}

.clear-search {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s ease;
}

.clear-search:hover {
  color: #6b7280;
}

/* Search Results */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 50;
}

.search-category {
  border-bottom: 1px solid #f3f4f6;
}

.search-category:last-child {
  border-bottom: none;
}

.category-header {
  padding: 0.75rem 1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-result-item:hover {
  background: #f9fafb;
}

.result-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.875rem;
}

.result-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.result-action {
  color: #8BC53F;
  font-weight: 600;
}

/* Header Right */
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Connection Status */
.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

.connection-status.connected {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}

.connection-status.disconnected {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.connection-status.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
}

.status-dot.pulsing {
  background: #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Notifications */
.notifications-container {
  position: relative;
}

.notifications-trigger {
  position: relative;
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notifications-trigger:hover {
  background: #f3f4f6;
}

.notifications-trigger.active {
  background: #8BC53F;
  color: white;
}

.notification-icon {
  position: relative;
  font-size: 1.25rem;
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1;
}

.notification-badge.pulse {
  animation: badgePulse 1s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Notifications Panel Overlay */
.notifications-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 80px 20px 20px;
}

.notifications-panel {
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.notifications-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mark-all-read {
  background: none;
  border: none;
  color: #8BC53F;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.mark-all-read:hover:not(:disabled) {
  background: rgba(139, 197, 63, 0.1);
}

.mark-all-read:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.close-panel {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s ease;
}

.close-panel:hover {
  color: #374151;
}

.notifications-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.notifications-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #6b7280;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #8BC53F;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-notifications {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.notifications-list {
  max-height: 60vh;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item.unread {
  background: rgba(139, 197, 63, 0.05);
  border-left: 3px solid #8BC53F;
}

.notification-item.new {
  animation: notificationNew 0.5s ease-out;
}

@keyframes notificationNew {
  0% {
    background: rgba(139, 197, 63, 0.2);
    transform: translateX(-10px);
  }
  100% {
    background: rgba(139, 197, 63, 0.05);
    transform: translateX(0);
  }
}

.notification-icon-container {
  margin-right: 0.75rem;
  margin-top: 0.125rem;
}

.notification-type-icon {
  font-size: 1.125rem;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.notification-message {
  color: #6b7280;
  font-size: 0.8125rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.notification-order {
  background: rgba(139, 197, 63, 0.1);
  color: #8BC53F;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 500;
}

.notification-actions {
  margin-left: 0.5rem;
}

.mark-read-btn {
  background: #8BC53F;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.mark-read-btn:hover {
  background: #7AB32E;
}

.notifications-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.load-more-btn {
  width: 100%;
  background: none;
  border: 1px solid #d1d5db;
  color: #6b7280;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #8BC53F;
  color: #8BC53F;
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* User Profile */
.user-profile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-profile:hover {
  background: #f3f4f6;
}

.user-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #8BC53F;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.user-avatar.online {
  border: 2px solid #22c55e;
}

.user-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #dc2626;
  border: 2px solid white;
}

.user-status-dot.online {
  background: #22c55e;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.user-role {
  font-size: 0.75rem;
  color: #6b7280;
}

.user-dropdown-arrow {
  color: #9ca3af;
  font-size: 0.875rem;
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.user-profile:hover .user-dropdown-arrow {
  transform: rotate(180deg);
}

/* User Menu Dropdown */
.user-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  z-index: 50;
  min-width: 200px;
  overflow: hidden;
  animation: slideInDown 0.2s ease-out;
}

@keyframes slideInDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.875rem;
  color: #374151;
}

.user-menu-item:hover {
  background: #f3f4f6;
}

.user-menu-item.logout {
  color: #dc2626;
}

.user-menu-item.logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

.menu-icon {
  font-size: 1rem;
}

.menu-divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0;
}

/* Mobile Menu Button */
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mobile-menu-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .header-content {
    padding: 1rem 1.5rem;
    gap: 1.5rem;
  }
  
  .header-center {
    max-width: 300px;
  }
  
  .quick-stats {
    gap: 1rem;
  }
  
  .quick-stat-item {
    padding: 0.375rem 0.5rem;
  }
  
  .stat-value, .stat-label {
    font-size: 0.75rem;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 1rem;
    gap: 1rem;
  }
  
  .page-title {
    font-size: 1.25rem;
  }
  
  .header-center {
    display: none;
  }
  
  .quick-stats {
    display: none;
  }
  
  .user-info {
    display: none;
  }
  
  .connection-status .status-text {
    display: none;
  }
  
  .mobile-menu-btn {
    display: block;
  }
  
  .notifications-panel {
    width: 100%;
    max-width: none;
    margin: 0 10px;
  }
  
  .notifications-panel-overlay {
    padding: 60px 10px 10px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0.75rem;
  }
  
  .page-title {
    font-size: 1.125rem;
  }
  
  .breadcrumb {
    font-size: 0.75rem;
  }
  
  .header-right {
    gap: 0.5rem;
  }
  
  .notifications-panel-overlay {
    padding: 50px 5px 5px;
  }
}
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

</style>