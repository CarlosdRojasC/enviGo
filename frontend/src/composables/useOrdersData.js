// composables/useOrdersData.js - OPTIMIZADO PARA EVITAR 429
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import { useAuthStore } from '../store/auth'
import { logger } from '../services/logger.service'

// ✅ CONFIGURACIÓN GLOBAL
const CONFIG = {
  CACHE_DURATION: 30000,              // 30 segundos
  AUTO_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutos (era muy agresivo antes)
  REQUEST_COOLDOWN: 1000,             // 1 segundo mínimo entre requests
  CHANNELS_CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
}

// ✅ CACHE GLOBAL (compartido entre instancias del composable)
const ordersCache = new Map()
const channelsCache = ref({
  data: [],
  timestamp: null,
  companyId: null
})

// ✅ RATE LIMITER
let lastRequestTime = 0
let pendingRequest = null

// ✅ HELPER PARA DEBOUNCE
function debounce(fn, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function useOrdersData() {
  const toast = useToast()
  const auth = useAuthStore()
  
  // ==================== STATE ====================
  const orders = ref([])
  const channels = ref([])
  const companies = ref([])
  const loadingOrders = ref(true)
  const pagination = ref({ 
    page: 1, 
    limit: 30, 
    total: 0, 
    totalPages: 1 
  })
  const lastAppliedFilters = ref({})
  
  const loadingStates = ref({
    fetching: false,
    refreshing: false,
    updating: false,
    exporting: false,
    markingReady: false
  })

  const dataCache = ref({
    lastFetch: null,
    lastFilters: null,
    autoRefreshInterval: null
  })

  const additionalStats = ref({
    totalRevenue: 0,
    averageOrderValue: 0,
    deliveryRate: 0,
    pendingRate: 0
  })

  // ==================== COMPUTED ====================

  const user = computed(() => auth.user)

  const companyId = computed(() => {
    if (auth.user && auth.user.company_id) {
      return auth.user.company_id
    }
    if (auth.user && auth.user.company && auth.user.company._id) {
      return auth.user.company._id
    }
    return null
  })

  // ==================== HELPER FUNCTIONS ====================
  
  /**
   * ✅ VERIFICAR SI PUEDE HACER REQUEST (RATE LIMITING)
   */
  function canMakeRequest() {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    
    if (timeSinceLastRequest < CONFIG.REQUEST_COOLDOWN) {
      logger.warn(`⏱️ Request cooldown: esperando ${CONFIG.REQUEST_COOLDOWN - timeSinceLastRequest}ms`)
      return false
    }
    
    return true
  }

  /**
   * ✅ ESPERAR COOLDOWN SI ES NECESARIO
   */
  async function waitForCooldown() {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    
    if (timeSinceLastRequest < CONFIG.REQUEST_COOLDOWN) {
      const waitTime = CONFIG.REQUEST_COOLDOWN - timeSinceLastRequest
      logger.dev(`⏳ Esperando ${waitTime}ms para cooldown`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  /**
   * ✅ GENERAR CACHE KEY
   */
  function getCacheKey(filters = {}) {
    const cleanFilters = { ...filters, page: pagination.value.page, limit: pagination.value.limit }
    
    Object.keys(cleanFilters).forEach(key => {
      if (cleanFilters[key] === '' || 
          cleanFilters[key] === null || 
          cleanFilters[key] === undefined ||
          (Array.isArray(cleanFilters[key]) && cleanFilters[key].length === 0)) {
        delete cleanFilters[key]
      }
    })
    
    return JSON.stringify(cleanFilters)
  }

  /**
   * ✅ VERIFICAR CACHE
   */
  function getCachedOrders(cacheKey) {
    const cached = ordersCache.get(cacheKey)
    
    if (!cached) return null
    
    const age = Date.now() - cached.timestamp
    
    if (age > CONFIG.CACHE_DURATION) {
      logger.dev('🗑️ Cache expirado, eliminando')
      ordersCache.delete(cacheKey)
      return null
    }
    
    logger.dev(`📦 Cache hit! Edad: ${Math.round(age / 1000)}s`)
    return cached.data
  }

  /**
   * ✅ GUARDAR EN CACHE
   */
  function setCachedOrders(cacheKey, data) {
    ordersCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
    
    logger.dev(`💾 Pedidos cacheados`)
  }

  /**
   * ✅ LIMPIAR CACHE VIEJO
   */
  function cleanupOldCache() {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, value] of ordersCache.entries()) {
      if (now - value.timestamp > CONFIG.CACHE_DURATION) {
        ordersCache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      logger.dev(`🧹 Limpiadas ${cleaned} entradas de cache antiguas`)
    }
  }

  /**
   * Limpiar y validar filtros
   */
  function cleanAndValidateFilters(filters) {
    const cleaned = {}
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === '' || 
          value === null || 
          value === undefined || 
          value === 'undefined' || 
          value === 'null' ||
          (Array.isArray(value) && value.length === 0)) {
        return
      }
      
      if (key === 'company_id' || key === 'channel_id') {
        const objectIdRegex = /^[0-9a-fA-F]{24}$/
        if (!objectIdRegex.test(value)) {
          logger.error(`❌ ${key} inválido ignorado:`, value)
          return
        }
      }
      
      if (key === 'date_from' || key === 'date_to') {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          logger.error(`❌ ${key} fecha inválida ignorada:`, value)
          return
        }
      }
      
      if (key === 'shipping_commune' && Array.isArray(value)) {
        const validCommunes = value.filter(c => c && c.trim())
        if (validCommunes.length > 0) {
          cleaned[key] = validCommunes.join(',')
        }
        return
      }
      
      if (key === 'shipping_commune' && typeof value === 'string') {
        const communes = value.split(',').map(c => c.trim()).filter(c => c)
        if (communes.length > 0) {
          cleaned[key] = communes.join(',')
        }
        return
      }
      
      cleaned[key] = value
    })
    
    logger.debug('🧹 Filtros limpiados:', logger.sanitize(cleaned))
    return cleaned
  }

  // ==================== METHODS ====================

  /**
   * ✅ FETCH ORDERS CON CACHE Y DEDUPLICACIÓN
   */
  async function fetchOrders(params = {}, options = {}) {
    const { force = false, skipCache = false } = options
    
    // ✅ GENERAR CACHE KEY
    const cacheKey = getCacheKey(params)
    
    // ✅ VERIFICAR CACHE PRIMERO (si no es forzado)
    if (!force && !skipCache) {
      const cached = getCachedOrders(cacheKey)
      if (cached) {
        orders.value = cached.orders || []
        pagination.value = cached.pagination || pagination.value
        additionalStats.value = cached.stats || additionalStats.value
        logger.success('✅ Usando pedidos cacheados')
        return Promise.resolve({ data: cached })
      }
    }

    // ✅ SI HAY UN REQUEST PENDIENTE CON LOS MISMOS FILTROS, REUTILIZARLO
    if (pendingRequest && pendingRequest.cacheKey === cacheKey) {
      logger.dev('⏳ Reutilizando request pendiente')
      return pendingRequest.promise
    }

    // ✅ RATE LIMITING
    await waitForCooldown()

    loadingOrders.value = true
    loadingStates.value.fetching = true
    lastAppliedFilters.value = params

    // Crear promise del request
    const requestPromise = (async () => {
      try {
        lastRequestTime = Date.now()
        
        const cleanedFilters = cleanAndValidateFilters(params)
        
        const queryParams = {
          page: pagination.value.page,
          limit: pagination.value.limit,
          ...cleanedFilters
        }
        
        logger.debug('📊 Fetching orders con params limpios:', logger.sanitize(queryParams))
        
        const { data } = await apiService.orders.getAll(queryParams)

        // ✅ ACTUALIZAR CACHE TIMESTAMP
        dataCache.value.lastFetch = Date.now()
        dataCache.value.lastFilters = { ...params }
        
        // Manejar diferentes formatos de respuesta
        if (data.orders) {
          orders.value = data.orders
          pagination.value = {
            ...pagination.value,
            ...data.pagination
          }
        } else if (Array.isArray(data)) {
          orders.value = data
          pagination.value.total = data.length
          pagination.value.totalPages = Math.ceil(data.length / pagination.value.limit)
        } else {
          orders.value = data.data || []
          pagination.value = {
            ...pagination.value,
            total: data.total || 0,
            totalPages: Math.ceil((data.total || 0) / pagination.value.limit)
          }
        }
        
        calculateAdditionalStats()
        
        // ✅ GUARDAR EN CACHE
        const cacheData = {
          orders: orders.value,
          pagination: pagination.value,
          stats: additionalStats.value
        }
        setCachedOrders(cacheKey, cacheData)
        
        logger.success('✅ Pedidos cargados:', {
          count: orders.value.length,
          total: pagination.value.total,
          page: pagination.value.page,
          totalPages: pagination.value.totalPages
        })
        
        return { data }
        
      } catch (error) {
        logger.error('❌ Error fetching orders:', error.message)
        
        // ✅ MANEJO ESPECÍFICO DE 429
        if (error.response?.status === 429) {
          toast.error('⚠️ Demasiadas solicitudes. Espera un momento...')
          await new Promise(resolve => setTimeout(resolve, 5000))
        } else if (error.response?.status === 401) {
          toast.error('Sesión expirada. Inicia sesión nuevamente.')
        } else {
          toast.error('Error al cargar pedidos: ' + (error.response?.data?.error || error.message))
        }
        
        orders.value = []
        pagination.value.total = 0
        pagination.value.totalPages = 1
        
        throw error
        
      } finally {
        loadingOrders.value = false
        loadingStates.value.fetching = false
        pendingRequest = null
      }
    })()

    // Guardar request pendiente
    pendingRequest = {
      cacheKey,
      promise: requestPromise
    }

    return requestPromise
  }

  /**
   * ✅ FETCH CHANNELS CON CACHE
   */
  async function fetchChannels() {
    if (!companyId.value) {
      logger.warn('⚠️ No hay ID de compañía, esperando...')
      return
    }

    // ✅ VERIFICAR CACHE
    const now = Date.now()
    const cacheValid = 
      channelsCache.value.timestamp &&
      (now - channelsCache.value.timestamp < CONFIG.CHANNELS_CACHE_DURATION) &&
      channelsCache.value.companyId === companyId.value

    if (cacheValid && channelsCache.value.data.length > 0) {
      logger.dev('📦 Usando canales cacheados')
      channels.value = channelsCache.value.data
      return
    }

    try {
      logger.dev('🏪 Cargando canales para compañía:', companyId.value)
      
      const { data } = await apiService.channels.getByCompany(companyId.value)
      channels.value = data?.data || data || []
      
      // ✅ GUARDAR EN CACHE
      channelsCache.value = {
        data: channels.value,
        timestamp: Date.now(),
        companyId: companyId.value
      }
      
      logger.success(`✅ Canales cargados: ${channels.value.length}`)
      
    } catch (err) {
      logger.error('❌ Error cargando canales:', err.message)
      channels.value = []
    }
  }

  /**
   * Fetch companies
   */
  async function fetchCompanies() {
    try {
      const { data } = await apiService.companies.getAll()
      companies.value = data || []
      logger.success('🏢 Empresas cargadas:', companies.value.length)
    } catch (error) {
      logger.error('❌ Error fetching companies:', error.message)
      toast.error('Error al cargar las empresas')
      companies.value = []
    }
  }

  /**
   * ✅ GO TO PAGE (reutiliza cache)
   */
  function goToPage(page) {
    if (page >= 1 && page <= pagination.value.totalPages) {
      pagination.value.page = page
      fetchOrders(lastAppliedFilters.value)
    }
  }

  /**
   * ✅ CHANGE PAGE SIZE (limpia cache porque cambia estructura)
   */
  function changePageSize(newLimit) {
    pagination.value.limit = parseInt(newLimit)
    pagination.value.page = 1
    
    // ✅ LIMPIAR CACHE porque cambió el límite
    ordersCache.clear()
    
    fetchOrders(lastAppliedFilters.value, { skipCache: true })
  }

  /**
   * ✅ REFRESH ORDERS (limpia cache)
   */
  function refreshOrders() {
    const filtersToUse = dataCache.value.lastFilters || lastAppliedFilters.value || {}
    
    // ✅ LIMPIAR CACHE AL REFRESCAR
    const cacheKey = getCacheKey(filtersToUse)
    ordersCache.delete(cacheKey)
    
    return fetchOrders(filtersToUse, { force: true, skipCache: true })
  }

  /**
   * Get company name by ID
   */
  function getCompanyName(companyId) {
    if (!companyId) return 'Sin empresa'
    
    if (typeof companyId === 'object' && companyId.name) {
      return companyId.name
    }
    
    const company = companies.value.find(c => c._id === companyId)
    return company?.name || 'Empresa no encontrada'
  }

  /**
   * Get order by ID
   */
  function getOrderById(orderId) {
    return orders.value.find(order => order._id === orderId)
  }

  /**
   * ✅ UPDATE ORDER LOCALLY (invalida cache)
   */
  function updateOrderLocally(updatedOrder) {
    const index = orders.value.findIndex(o => o._id === updatedOrder._id)
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...updatedOrder }
      logger.dev('✅ Orden actualizada localmente:', updatedOrder.order_number)
      
      // ✅ INVALIDAR CACHE
      ordersCache.clear()
    }
  }

  /**
   * Remove order locally
   */
  function removeOrderLocally(orderId) {
    const index = orders.value.findIndex(order => order._id === orderId)
    if (index !== -1) {
      orders.value.splice(index, 1)
      pagination.value.total = Math.max(0, pagination.value.total - 1)
      logger.dev('🗑️ Order removed locally:', orderId)
      
      // ✅ INVALIDAR CACHE
      ordersCache.clear()
    }
  }

  /**
   * Add order locally
   */
  function addOrderLocally(order) {
    orders.value.unshift(order)
    pagination.value.total += 1
    logger.dev('➕ Order added locally:', order._id)
    
    // ✅ INVALIDAR CACHE
    ordersCache.clear()
  }

  /**
   * Get statistics
   */
  function getOrdersStats() {
    const total = orders.value.length
    const pending = orders.value.filter(o => o.status === 'pending').length
    const ready_for_pickup = orders.value.filter(o => o.status === 'ready_for_pickup').length
    const warehouse_received = orders.value.filter(o => o.status === 'warehouse_received').length
    const shipped = orders.value.filter(o => o.status === 'shipped').length
    const delivered = orders.value.filter(o => o.status === 'delivered').length
    const cancelled = orders.value.filter(o => o.status === 'cancelled').length
    
    return {
      total,
      pending,
      ready_for_pickup,
      warehouse_received,
      shipped,
      delivered,
      cancelled
    }
  }

  /**
   * ✅ START AUTO REFRESH (5 MINUTOS en lugar de 30 segundos)
   */
  function startAutoRefresh(intervalMinutes = 5) {
    stopAutoRefresh()
    
    const intervalMs = intervalMinutes * 60 * 1000
    
    logger.dev(`🔄 Iniciando auto-refresh cada ${intervalMinutes} minutos`)
    
    dataCache.value.autoRefreshInterval = setInterval(() => {
      if (!loadingStates.value.fetching) {
        logger.dev('🔄 Auto-refrescando pedidos...')
        refreshOrders()
      }
    }, intervalMs)
  }

  /**
   * Stop auto refresh
   */
  function stopAutoRefresh() {
    if (dataCache.value.autoRefreshInterval) {
      clearInterval(dataCache.value.autoRefreshInterval)
      dataCache.value.autoRefreshInterval = null
      logger.dev('⏸️ Auto-refresh detenido')
    }
  }

  /**
   * Calculate stats
   */
  function calculateAdditionalStats() {
    const total = orders.value.length
    if (total === 0) return
    
    const totalRevenue = orders.value.reduce((sum, order) => sum + (order.total_amount || 0), 0)
    const delivered = orders.value.filter(o => o.status === 'delivered').length
    const pending = orders.value.filter(o => o.status === 'pending').length
    
    additionalStats.value = {
      totalRevenue,
      averageOrderValue: totalRevenue / total,
      deliveryRate: (delivered / total) * 100,
      pendingRate: (pending / total) * 100
    }
  }

  /**
   * Export orders
   */
  async function exportOrders(filters = {}) {
    try {
      loadingStates.value.exporting = true
      await apiService.orders.exportForDashboard(filters)
      toast.success('Export iniciado')
    } catch (error) {
      logger.error('Error exporting orders:', error.message)
      toast.error('Error al exportar pedidos')
    } finally {
      loadingStates.value.exporting = false
    }
  }

  /**
   * Mark multiple as ready
   */
  async function markMultipleAsReady(orderIds) {
    if (!orderIds || orderIds.length === 0) {
      throw new Error('No se especificaron pedidos para marcar como listos')
    }

    loadingStates.value.markingReady = true
    
    try {
      logger.dev(`📦 Marcando ${orderIds.length} pedidos como listos...`)
      
      const response = await apiService.orders.markMultipleAsReady(orderIds)
      
      const { updatedCount, foundPending, updated_orders } = response.data
      
      if (updated_orders && updated_orders.length > 0) {
        updated_orders.forEach(updatedOrder => {
          updateOrderLocally({
            _id: updatedOrder.id,
            status: 'ready_for_pickup',
            updated_at: new Date().toISOString()
          })
        })
      }
      
      if (updatedCount > 0) {
        toast.success(`✅ ${updatedCount} pedidos marcados como listos`)
      }
      
      if (foundPending < orderIds.length) {
        toast.warning(`⚠️ ${orderIds.length - foundPending} pedidos no pudieron ser marcados`)
      }
      
      return response.data
      
    } catch (error) {
      logger.error('❌ Error marcando pedidos:', error)
      
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos')
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Error al marcar pedidos')
      } else {
        throw new Error('Error al marcar pedidos como listos')
      }
    } finally {
      loadingStates.value.markingReady = false
    }
  }

  /**
   * Mark single order as ready
   */
  async function markOrderAsReady(order) {
    try {
      loadingStates.value.updating = true
      
      const response = await apiService.orders.updateStatus(order._id, 'ready_for_pickup')
      
      updateOrderLocally({
        _id: order._id,
        status: 'ready_for_pickup',
        updated_at: new Date().toISOString()
      })
      
      toast.success(`🏭 Pedido #${order.order_number} marcado como listo`)
      return response.data
    } catch (error) {
      logger.error('Error marking as ready:', error.message)
      toast.error('❌ Error al marcar como listo')
      throw error
    } finally {
      loadingStates.value.updating = false
    }
  }

  /**
   * Mark as warehouse received
   */
  async function markAsWarehouseReceived(order) {
    try {
      loadingStates.value.updating = true
      
      const response = await apiService.orders.updateStatus(order._id, 'warehouse_received')
      
      updateOrderLocally({
        _id: order._id,
        status: 'warehouse_received',
        updated_at: new Date().toISOString()
      })
      
      toast.success(`📦 Pedido #${order.order_number} recibido en bodega`)
      return response.data
    } catch (error) {
      logger.error('Error marking as warehouse received:', error.message)
      toast.error('❌ Error al marcar como recibido')
      throw error
    } finally {
      loadingStates.value.updating = false
    }
  }

  /**
   * Mark as shipped
   */
  async function markAsShipped(order) {
    try {
      loadingStates.value.updating = true
      
      const response = await apiService.orders.updateStatus(order._id, 'shipped')
      
      updateOrderLocally({
        _id: order._id,
        status: 'shipped',
        updated_at: new Date().toISOString()
      })
      
      toast.success(`🚚 Pedido #${order.order_number} salió para entrega`)
      return response.data
    } catch (error) {
      logger.error('Error marcando como enviado:', error.message)
      toast.error('❌ Error al enviar pedido')
      throw error
    } finally {
      loadingStates.value.updating = false
    }
  }

  // ==================== CLEANUP ====================
  
  // Limpiar cache viejo cada 2 minutos
  const cleanupInterval = setInterval(cleanupOldCache, 2 * 60 * 1000)

  function cleanup() {
    stopAutoRefresh()
    clearInterval(cleanupInterval)
  }

  // ==================== RETURN ====================
  return {
    // State
    orders,
    companies,
    channels,
    loadingOrders,
    pagination,
    loadingStates,
    additionalStats,
    dataCache,
  
    // Computed
    user,           
    companyId, 

    // Methods
    fetchOrders,
    fetchChannels,
    fetchCompanies,
    goToPage,
    changePageSize,
    refreshOrders,
    getCompanyName,
    getOrderById,
    updateOrderLocally,
    removeOrderLocally,
    addOrderLocally,
    getOrdersStats,
    startAutoRefresh,
    stopAutoRefresh,
    exportOrders,
    calculateAdditionalStats,
    markMultipleAsReady,
    markOrderAsReady,
    markAsWarehouseReceived,
    markAsShipped,
    cleanup // ✅ AGREGAR
  }
}