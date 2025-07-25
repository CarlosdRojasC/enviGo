// frontend/src/composables/useOrdersData.js - VERSIÓN UNIFICADA Y OPTIMIZADA
import { ref, computed, watch, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import { useAuthStore } from '../store/auth'

/**
 * 🔧 COMPOSABLE UNIFICADO PARA DATOS DE PEDIDOS
 * Funciona tanto para AdminOrders como para Orders normales
 * 
 * @param {Object} options - Configuración del composable
 * @param {String} options.mode - 'admin' | 'company' (auto-detectado si no se proporciona)
 * @param {String} options.companyId - ID de empresa específica (solo para admin)
 * @returns {Object} - API del composable
 */
export function useOrdersData(options = {}) {
  const toast = useToast()
  const auth = useAuthStore()

  // ==================== CONFIGURACIÓN AUTOMÁTICA ====================
  const mode = options.mode || (auth.user?.role === 'admin' ? 'admin' : 'company')
  const companyId = computed(() => {
    if (mode === 'admin') {
      return options.companyId || null // Admin puede filtrar por empresa específica
    }
    return auth.user?.company_id || auth.user?.company?._id
  })

  // ==================== ESTADO REACTIVO ====================
  const orders = ref([])
  const companies = ref([]) // Solo para admin
  const channels = ref([])
  const drivers = ref([]) // Para asignación
  
  // Estados de carga
  const loadingStates = ref({
    orders: true,
    companies: false,
    channels: false,
    drivers: false,
    refreshing: false,
    updating: false,
    exporting: false
  })

  // Paginación unificada
  const pagination = ref({ 
    page: 1, 
    limit: mode === 'admin' ? 25 : 15, // Admin ve más pedidos por página
    total: 0, 
    totalPages: 1 
  })

  // Cache inteligente
  const cache = ref({
    lastFetch: null,
    lastFilters: null,
    autoRefreshInterval: null,
    data: new Map() // Cache por filtros
  })

  // Estadísticas calculadas
  const stats = ref({
    total: 0,
    pending: 0,
    processing: 0,
    ready_for_pickup: 0,
    assigned: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    deliveryRate: 0
  })

  // ==================== COMPUTED PROPERTIES ====================

  /**
   * Indica si estamos en modo administrador
   */
  const isAdmin = computed(() => mode === 'admin')

  /**
   * Loading principal (para compatibilidad)
   */
  const loadingOrders = computed(() => loadingStates.value.orders)
  const loading = computed(() => loadingStates.value.orders)
  const refreshing = computed(() => loadingStates.value.refreshing)

  /**
   * Estadísticas para el header
   */
  const orderStats = computed(() => ({
    total: stats.value.total,
    pending: stats.value.pending,
    processing: stats.value.processing,
    delivered: stats.value.delivered,
    cancelled: stats.value.cancelled
  }))

  /**
   * Estadísticas adicionales
   */
  const additionalStats = computed(() => ({
    totalRevenue: stats.value.totalRevenue,
    averageOrderValue: stats.value.averageOrderValue,
    deliveryRate: stats.value.deliveryRate,
    pendingRate: stats.value.total > 0 ? Math.round((stats.value.pending / stats.value.total) * 100) : 0,
    shipdayOrders: orders.value.filter(order => order.shipday_order_id).length
  }))

  /**
   * Identificador único de usuario para permisos
   */
  const user = computed(() => auth.user)

  // ==================== CORE METHODS ====================

  /**
   * 📊 Obtener pedidos con filtros y paginación
   */
 /**
 * Fetch orders with filters and pagination
 */
async function fetchOrders(filters = {}) {
  try {
     // 🔍 DEBUG TEMPORAL - QUITA ESTO DESPUÉS
    console.group('🚨 DEBUG FETCHORDERS')
    console.log('Filtros recibidos:', filters)
    
    // Buscar valores problemáticos
    Object.entries(filters).forEach(([key, value]) => {
      if ((key === 'company_id' || key === 'channel_id') && value) {
        console.log(`🔍 Verificando ${key}:`, {
          value,
          type: typeof value,
          length: value.length,
          isValidObjectId: /^[0-9a-fA-F]{24}$/.test(value),
          charCodes: value.split('').map(c => c.charCodeAt(0))
        })
        
        if (!/^[0-9a-fA-F]{24}$/.test(value)) {
          console.error(`🚨 ESTE ES EL PROBLEMA: ${key} = "${value}"`)
          console.error('Valor inválido detectado, detener ejecución')
          console.groupEnd()
          throw new Error(`Invalid ObjectId for ${key}: "${value}"`)
        }
      }
    })
    console.groupEnd()
    
    loadingOrders.value = true
    loadingStates.value.fetching = true

    // ✅ LIMPIAR Y VALIDAR FILTROS ANTES DE ENVIAR
    const cleanedFilters = cleanAndValidateFilters(filters)
    
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...cleanedFilters
    }
    
    console.log('📊 Fetching orders with cleaned params:', params)
    
    const { data } = await apiService.orders.getAll(params)

    dataCache.value.lastFetch = Date.now()
    dataCache.value.lastFilters = { ...params }
    
    // Handle different API response formats
    if (data.orders) {
      // Format: { orders: [...], pagination: {...} }
      orders.value = data.orders
      pagination.value = {
        ...pagination.value,
        ...data.pagination
      }
    } else if (Array.isArray(data)) {
      // Format: [orders...] (simple array)
      orders.value = data
      pagination.value.total = data.length
      pagination.value.totalPages = Math.ceil(data.length / pagination.value.limit)
    } else {
      // Other formats
      orders.value = data.data || []
      pagination.value = {
        ...pagination.value,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / pagination.value.limit)
      }
    }
    
    // Calcular stats
    calculateAdditionalStats()
    
    console.log('✅ Orders loaded:', {
      count: orders.value.length,
      total: pagination.value.total,
      page: pagination.value.page,
      totalPages: pagination.value.totalPages
    })
    
  } catch (error) {
    console.error('❌ Error fetching orders:', error)
    
    // Debug del error específico
    if (error.response?.data?.details) {
      console.error('Error details:', error.response.data.details)
    }
    
    toast.error('Error al cargar los pedidos: ' + (error.response?.data?.error || error.message))
    orders.value = []
    pagination.value.total = 0
    pagination.value.totalPages = 1
  } finally {
    loadingOrders.value = false
    loadingStates.value.fetching = false
  }
}

/**
 * ✅ FUNCIÓN AUXILIAR PARA LIMPIAR Y VALIDAR FILTROS
 */
function cleanAndValidateFilters(filters) {
  const cleaned = {}
  
  Object.entries(filters).forEach(([key, value]) => {
    // Eliminar valores vacíos, null, undefined, "undefined", "null"
    if (value === '' || 
        value === null || 
        value === undefined || 
        value === 'undefined' || 
        value === 'null' ||
        (Array.isArray(value) && value.length === 0)) {
      return // Skip este filtro
    }
    
    // ✅ VALIDACIÓN ESPECÍFICA PARA OBJECTIDS
    if (key === 'company_id' || key === 'channel_id') {
      const objectIdRegex = /^[0-9a-fA-F]{24}$/
      if (!objectIdRegex.test(value)) {
        console.error(`❌ ${key} inválido ignorado:`, value)
        return // Skip este filtro inválido
      }
    }
    
    // ✅ VALIDACIÓN PARA FECHAS
    if (key === 'date_from' || key === 'date_to') {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        console.error(`❌ ${key} fecha inválida ignorada:`, value)
        return // Skip fecha inválida
      }
    }
    
    // ✅ VALIDACIÓN PARA ARRAYS DE COMUNAS
    if (key === 'shipping_commune' && Array.isArray(value)) {
      // Convertir array a string separado por comas para el backend
      const validCommunes = value.filter(c => c && c.trim())
      if (validCommunes.length > 0) {
        cleaned[key] = validCommunes.join(',')
      }
      return
    }
    
    // ✅ VALIDACIÓN PARA STRING DE COMUNAS
    if (key === 'shipping_commune' && typeof value === 'string') {
      const communes = value.split(',').map(c => c.trim()).filter(c => c)
      if (communes.length > 0) {
        cleaned[key] = communes.join(',')
      }
      return
    }
    
    // ✅ AGREGAR FILTRO VÁLIDO
    cleaned[key] = value
  })
  
  console.log('🧹 Filtros limpiados:', cleaned)
  return cleaned
}

/**
 * ✅ FUNCIÓN AUXILIAR PARA DEBUG DE FILTROS
 */
function debugFilters(filters, context = 'Filtros') {
  console.group(`🔍 ${context} Debug:`)
  
  Object.entries(filters).forEach(([key, value]) => {
    console.log(`${key}:`, {
      value,
      type: typeof value,
      isArray: Array.isArray(value),
      isEmpty: value === '' || value === null || value === undefined,
      isValidObjectId: (key === 'company_id' || key === 'channel_id') ? /^[0-9a-fA-F]{24}$/.test(value) : 'N/A'
    })
    
    if ((key === 'company_id' || key === 'channel_id') && value) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(value)
      if (!isValidObjectId) {
        console.error(`❌ ${key} INVÁLIDO:`, {
          value,
          type: typeof value,
          length: value.length
        })
      }
    }
  })
  
  console.groupEnd()
}

  /**
   * 🏢 Obtener empresas (solo para admin)
   */
  async function fetchCompanies() {
    if (mode !== 'admin') return

    try {
      loadingStates.value.companies = true
      console.log('🏢 [ADMIN] Fetching companies...')
      
      const { data } = await apiService.companies.getAll()
      companies.value = data || []
      
      console.log(`✅ [ADMIN] Companies loaded: ${companies.value.length}`)
    } catch (error) {
      handleError(error, 'Error al cargar empresas')
      companies.value = []
    } finally {
      loadingStates.value.companies = false
    }
  }

  /**
   * 🏪 Obtener canales de venta
   */
  async function fetchChannels() {
    try {
      loadingStates.value.channels = true
      
      let channelsData = []
      
      if (mode === 'admin') {
        // Admin obtiene todos los canales
        const { data } = await apiService.channels.getAll()
        channelsData = data || []
      } else if (companyId.value) {
        // Company obtiene solo sus canales
        const { data } = await apiService.channels.getByCompany(companyId.value)
        channelsData = data?.data || data || []
      }
      
      channels.value = channelsData
      console.log(`🏪 [${mode.toUpperCase()}] Channels loaded: ${channels.value.length}`)
      
    } catch (error) {
      handleError(error, 'Error al cargar canales')
      channels.value = []
    } finally {
      loadingStates.value.channels = false
    }
  }

  /**
   * 🚚 Obtener conductores disponibles (solo para admin)
   */
  async function fetchDrivers() {
    if (mode !== 'admin') return

    try {
      loadingStates.value.drivers = true
      const { data } = await apiService.drivers.getAvailable()
      drivers.value = data || []
      console.log(`🚚 [ADMIN] Drivers loaded: ${drivers.value.length}`)
    } catch (error) {
      handleError(error, 'Error al cargar conductores')
      drivers.value = []
    } finally {
      loadingStates.value.drivers = false
    }
  }

  // ==================== PAGINATION METHODS ====================

  /**
   * 📄 Ir a página específica
   */
  function goToPage(page) {
    if (page >= 1 && page <= pagination.value.totalPages) {
      pagination.value.page = page
      // fetchOrders se llamará automáticamente por el watcher
    }
  }

  /**
   * 📊 Cambiar tamaño de página
   */
  function changePageSize(newLimit) {
    pagination.value.limit = parseInt(newLimit)
    pagination.value.page = 1 // Reset a primera página
    // fetchOrders se llamará automáticamente por el watcher
  }

  // ==================== ORDER ACTIONS ====================

  /**
   * 🔄 Refrescar pedidos
   */
  async function refreshOrders() {
    loadingStates.value.refreshing = true
    cache.value.data.clear() // Limpiar cache para forzar refresh
    
    try {
      await fetchOrders(cache.value.lastFilters || {})
    } finally {
      loadingStates.value.refreshing = false
    }
  }

  /**
   * ✅ Marcar pedido como listo
   */
  async function markOrderAsReady(order) {
    try {
      loadingStates.value.updating = true
      
      const response = await apiService.orders.updateStatus(order._id, 'ready_for_pickup')
      
      // Actualización optimista
      updateOrderLocally({
        _id: order._id,
        status: 'ready_for_pickup',
        updated_at: new Date().toISOString()
      })
      
      toast.success(`✅ Pedido #${order.order_number} marcado como listo`)
      return response.data
      
    } catch (error) {
      handleError(error, 'Error al marcar pedido como listo')
      throw error
    } finally {
      loadingStates.value.updating = false
    }
  }

  /**
   * ✅ Marcar múltiples pedidos como listos
   */
  async function markMultipleAsReady(orderIds) {
    try {
      loadingStates.value.updating = true
      
      const promises = orderIds.map(id => 
        apiService.orders.updateStatus(id, 'ready_for_pickup')
      )
      
      await Promise.all(promises)
      
      // Actualización optimista de todos los pedidos
      orderIds.forEach(id => {
        updateOrderLocally({
          _id: id,
          status: 'ready_for_pickup',
          updated_at: new Date().toISOString()
        })
      })
      
      toast.success(`✅ ${orderIds.length} pedidos marcados como listos`)
      
    } catch (error) {
      handleError(error, 'Error al marcar pedidos como listos')
      throw error
    } finally {
      loadingStates.value.updating = false
    }
  }

  /**
   * 📊 Exportar pedidos
   */
  async function exportOrders(format = 'excel', filters = {}) {
    try {
      loadingStates.value.exporting = true
      console.log(`📊 [${mode.toUpperCase()}] Exporting orders:`, { format, filters })
      
      // En modo company, siempre incluir company_id
      if (mode === 'company' && companyId.value) {
        filters.company_id = companyId.value
      }
      
      const response = await apiService.orders.export(format, filters)
      
      // Crear y descargar archivo
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pedidos_${Date.now()}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('📊 Exportación completada')
      
    } catch (error) {
      handleError(error, 'Error al exportar pedidos')
      throw error
    } finally {
      loadingStates.value.exporting = false
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * 🔄 Actualizar pedido localmente (sin API call)
   */
  function updateOrderLocally(updatedOrder) {
    const index = orders.value.findIndex(order => order._id === updatedOrder._id)
    if (index !== -1) {
      // Merge con datos existentes
      orders.value[index] = { ...orders.value[index], ...updatedOrder }
      calculateStats() // Recalcular estadísticas
      console.log(`🔄 Order ${updatedOrder._id} updated locally`)
    }
  }

  /**
   * ➕ Añadir pedido localmente
   */
  function addOrderLocally(newOrder) {
    orders.value.unshift(newOrder)
    pagination.value.total += 1
    calculateStats()
    console.log(`➕ Order ${newOrder._id} added locally`)
  }

  /**
   * ➖ Remover pedido localmente
   */
  function removeOrderLocally(orderId) {
    const index = orders.value.findIndex(order => order._id === orderId)
    if (index !== -1) {
      orders.value.splice(index, 1)
      pagination.value.total -= 1
      calculateStats()
      console.log(`➖ Order ${orderId} removed locally`)
    }
  }

  /**
   * 🔍 Obtener pedido por ID
   */
  function getOrderById(orderId) {
    return orders.value.find(order => order._id === orderId)
  }

  /**
   * 🏢 Obtener nombre de empresa (para admin)
   */
  function getCompanyName(companyId) {
    if (mode !== 'admin') return 'Mi Empresa'
    
    const company = companies.value.find(c => c._id === companyId)
    return company?.name || 'Empresa Desconocida'
  }

  // ==================== AUTO-REFRESH ====================

  /**
   * ▶️ Iniciar actualización automática
   */
  function startAutoRefresh(intervalMs = 60000) { // 1 minuto por defecto
    stopAutoRefresh() // Limpiar intervalo existente
    
    cache.value.autoRefreshInterval = setInterval(() => {
      if (!document.hidden && orders.value.length > 0) {
        console.log('🔄 Auto-refreshing orders...')
        refreshOrders()
      }
    }, intervalMs)
    
    console.log(`▶️ Auto-refresh started (${intervalMs}ms interval)`)
  }

  /**
   * ⏹️ Detener actualización automática
   */
  function stopAutoRefresh() {
    if (cache.value.autoRefreshInterval) {
      clearInterval(cache.value.autoRefreshInterval)
      cache.value.autoRefreshInterval = null
      console.log('⏹️ Auto-refresh stopped')
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Manejar respuesta de la API
   */
  function handleApiResponse(data) {
    if (data.orders) {
      // Formato: { orders: [...], pagination: {...} }
      orders.value = data.orders
      if (data.pagination) {
        pagination.value = { ...pagination.value, ...data.pagination }
      }
    } else if (Array.isArray(data)) {
      // Formato: [orders...] (array simple)
      orders.value = data
      pagination.value.total = data.length
      pagination.value.totalPages = Math.ceil(data.length / pagination.value.limit)
    } else {
      // Otros formatos
      orders.value = data.data || []
      pagination.value = {
        ...pagination.value,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / pagination.value.limit)
      }
    }
  }

  /**
   * Calcular estadísticas de los pedidos
   */
  function calculateStats() {
    const statusCounts = orders.value.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      acc.totalRevenue += order.total_amount || 0
      return acc
    }, { totalRevenue: 0 })

    stats.value = {
      total: orders.value.length,
      pending: statusCounts.pending || 0,
      processing: statusCounts.processing || 0,
      ready_for_pickup: statusCounts.ready_for_pickup || 0,
      assigned: statusCounts.assigned || 0,
      shipped: statusCounts.shipped || 0,
      delivered: statusCounts.delivered || 0,
      cancelled: statusCounts.cancelled || 0,
      totalRevenue: statusCounts.totalRevenue,
      averageOrderValue: orders.value.length > 0 ? statusCounts.totalRevenue / orders.value.length : 0,
      deliveryRate: orders.value.length > 0 ? Math.round(((statusCounts.delivered || 0) / orders.value.length) * 100) : 0
    }
  }

  /**
   * Generar clave de cache
   */
  function generateCacheKey(filters, pagination) {
    return `${JSON.stringify(filters)}_${pagination.page}_${pagination.limit}`
  }

  /**
   * Verificar si debe usar cache
   */
  function shouldUseCache(cacheKey) {
    const cached = cache.value.data.get(cacheKey)
    if (!cached) return false
    
    const now = Date.now()
    const cacheAge = now - cached.timestamp
    return cacheAge < 30000 // 30 segundos
  }

  /**
   * Manejo unificado de errores
   */
  function handleError(error, defaultMessage = 'Error en operación') {
    console.error(`❌ [${mode.toUpperCase()}] ${defaultMessage}:`, error)
    
    let message = defaultMessage
    
    if (error.response?.data?.message) {
      message = error.response.data.message
    } else if (error.message) {
      message = error.message
    }
    
    toast.error(message)
  }

  // ==================== WATCHERS ====================

  // Auto-refetch cuando cambia la paginación
  watch(
    [() => pagination.value.page, () => pagination.value.limit],
    () => {
      if (cache.value.lastFetch) {
        fetchOrders(cache.value.lastFilters || {})
      }
    }
  )

  // ==================== LIFECYCLE ====================

  // Limpiar al desmontar
  onUnmounted(() => {
    stopAutoRefresh()
    cache.value.data.clear()
  })

  // ==================== RETURN API ====================
  return {
    // Estado principal
    orders,
    companies,
    channels,
    drivers,
    pagination,
    stats,
    
    // Estados de carga
    loadingOrders,
    loading,
    refreshing,
    loadingStates,
    
    // Computed
    isAdmin,
    user,
    companyId,
    orderStats,
    additionalStats,
    
    // Métodos principales
    fetchOrders,
    fetchCompanies,
    fetchChannels,
    fetchDrivers,
    refreshOrders,
    
    // Paginación
    goToPage,
    changePageSize,
    
    // Acciones de pedidos
    markOrderAsReady,
    markMultipleAsReady,
    exportOrders,
    
    // Utilidades
    updateOrderLocally,
    addOrderLocally,
    removeOrderLocally,
    getOrderById,
    getCompanyName,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
    
    // Legacy methods (para compatibilidad con código existente)
    getOrdersStats: () => orderStats.value,
    calculateAdditionalStats: calculateStats,
    markAsWarehouseReceived: (order) => markOrderAsReady(order), // Alias
    markAsAssigned: (order) => markOrderAsReady(order), // Alias
    markAsShipped: (order) => markOrderAsReady(order) // Alias
  }
}