// composables/useOrdersData.js
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import { useAuthStore } from '../store/auth'
import { logger } from '../services/logger.service'

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
    limit: 15, 
    total: 0, 
    totalPages: 1 
  })
  
  const loadingStates = ref({
    fetching: false,
    refreshing: false,
    updating: false,
    exporting: false
  })

  // ✅ Cache y auto-refresh DEFINIDO CORRECTAMENTE
  const dataCache = ref({
    lastFetch: null,
    lastFilters: null,
    autoRefreshInterval: null
  })

  // Estadísticas adicionales
  const additionalStats = ref({
    totalRevenue: 0,
    averageOrderValue: 0,
    deliveryRate: 0,
    pendingRate: 0
  })

  // ==================== COMPUTED ====================

  /**
   * Usuario actual para permisos
   */
  const user = computed(() => auth.user)

  /**
   * ID de empresa del usuario
   */
  const companyId = computed(() => {
    return user.value?.company_id || user.value?.company?._id
  })

  // ==================== HELPER FUNCTIONS ====================
  
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
          logger.error(`❌ ${key} inválido ignorado:`, value)
          return // Skip este filtro inválido
        }
      }
      
      // ✅ VALIDACIÓN PARA FECHAS
      if (key === 'date_from' || key === 'date_to') {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          logger.error(`❌ ${key} fecha inválida ignorada:`, value)
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
    
    logger.debug('🧹 Filtros limpiados:', logger.sanitize(cleaned))
    return cleaned
  }

  // ==================== METHODS ====================
  
  /**
   * Fetch all companies
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
   * ✅ Fetch orders with filters and pagination - CORREGIDA
   */
  async function fetchOrders(filters = {}) {
    try {
      loadingOrders.value = true
      loadingStates.value.fetching = true

      // ✅ LIMPIAR Y VALIDAR FILTROS ANTES DE ENVIAR
      const cleanedFilters = cleanAndValidateFilters(filters)
      
      const params = {
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...cleanedFilters
      }
      
      logger.debug('📊 Fetching orders with cleaned params:', logger.sanitize(params))
      
      const { data } = await apiService.orders.getAll(params)

      // ✅ ACTUALIZAR CACHE
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
      
      // ✅ CALCULAR ESTADÍSTICAS
      calculateAdditionalStats()
      
      logger.success('✅ Orders loaded:', {
        count: orders.value.length,
        total: pagination.value.total,
        page: pagination.value.page,
        totalPages: pagination.value.totalPages
      })
      
    } catch (error) {
      logger.error('❌ Error fetching orders:', error.message)
      
      // Debug del error específico
      if (error.response?.data?.details) {
        logger.debug('Error details:', error.response.data.details)
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
   * Fetch channels for company
   */
  async function fetchChannels() {
    try {
      if (!companyId.value) {
        logger.warn('⚠️ No company ID available for fetching channels')
        return
      }

      logger.dev('🏪 Fetching channels for company:', companyId.value)
      
      const { data } = await apiService.channels.getByCompany(companyId.value)
      channels.value = data || []
      
      logger.success(`✅ Loaded ${channels.value.length} channels`)
      
    } catch (err) {
      logger.error('❌ Error fetching channels:', err.message)
      // No mostramos toast aquí porque es información secundaria
      channels.value = []
    }
  }

  /**
   * Change page
   */
  function goToPage(page) {
    if (page >= 1 && page <= pagination.value.totalPages) {
      pagination.value.page = page
      fetchOrders(dataCache.value.lastFilters || {})
      logger.dev('📄 Changed to page:', page)
    }
  }

  /**
   * Change page size
   */
  function changePageSize(newLimit) {
    pagination.value.limit = parseInt(newLimit)
    pagination.value.page = 1 // Reset to first page
    fetchOrders(dataCache.value.lastFilters || {})
    logger.dev('📏 Changed page size to:', newLimit)
  }

  /**
   * Refresh current page
   */
  function refreshOrders() {
    return fetchOrders(dataCache.value.lastFilters || {})
  }

  /**
   * Get company name by ID
   */
  function getCompanyName(companyId) {
    if (!companyId) return 'Sin empresa'
    
    // Handle both string ID and populated object
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
   * Update order in local state (optimistic update)
   */
  function updateOrderLocally(updatedOrder) {
    const index = orders.value.findIndex(o => o._id === updatedOrder._id)
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...updatedOrder }
      logger.dev('✅ Orden actualizada localmente:', updatedOrder.order_number)
    }
  }

  /**
   * Remove order from local state
   */
  function removeOrderLocally(orderId) {
    const index = orders.value.findIndex(order => order._id === orderId)
    if (index !== -1) {
      orders.value.splice(index, 1)
      pagination.value.total = Math.max(0, pagination.value.total - 1)
      logger.dev('🗑️ Order removed locally:', orderId)
    }
  }

  /**
   * Add order to local state
   */
  function addOrderLocally(order) {
    orders.value.unshift(order) // Add to beginning
    pagination.value.total += 1
    logger.dev('➕ Order added locally:', order._id)
  }

  /**
   * Get statistics from current orders
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
   * Start auto refresh
   */
  function startAutoRefresh(intervalMinutes = 5) {
    stopAutoRefresh()
    dataCache.value.autoRefreshInterval = setInterval(() => {
      if (!loadingStates.value.fetching) {
        refreshOrders()
      }
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Stop auto refresh
   */
  function stopAutoRefresh() {
    if (dataCache.value.autoRefreshInterval) {
      clearInterval(dataCache.value.autoRefreshInterval)
      dataCache.value.autoRefreshInterval = null
    }
  }

  /**
   * Calculate additional statistics
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
   * Mark multiple orders as ready
   */
  async function markMultipleAsReady(orderIds) {
    try {
      loadingStates.value.updating = true
      
      // Implementar lógica de marcado múltiple
      for (const orderId of orderIds) {
        await apiService.orders.updateStatus(orderId, 'ready_for_pickup')
        updateOrderLocally({ _id: orderId, status: 'ready_for_pickup' })
      }
      
      toast.success(`${orderIds.length} pedidos marcados como listos`)
    } catch (error) {
      logger.error('Error marking multiple as ready:', error.message)
      toast.error('Error al marcar pedidos como listos')
    } finally {
      loadingStates.value.updating = false
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
    dataCache, // ✅ INCLUIR EN EL RETURN
  
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
    markAsShipped
  }
}