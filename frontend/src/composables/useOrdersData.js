// composables/useOrdersData.js
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import { useAuthStore } from '../store/auth'

export function useOrdersData() {
  const toast = useToast()
  const auth = useAuthStore() // ← AGREGAR ESTO
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

// Cache y auto-refresh
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

  // ==================== METHODS ====================
  
  /**
   * Fetch all companies
   */
  async function fetchCompanies() {
    try {
      const { data } = await apiService.companies.getAll()
      companies.value = data || []
      console.log('🏢 Empresas cargadas:', companies.value.length)
    } catch (error) {
      console.error('❌ Error fetching companies:', error)
      toast.error('Error al cargar las empresas')
      companies.value = []
    }
  }

  /**
   * Fetch orders with filters and pagination
   */
  async function fetchOrders(filters = {}) {
    try {
      loadingOrders.value = true
      
      const params = {
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...filters
      }
      
      
      console.log('📊 Fetching orders with params:', params)
      
      const { data } = await apiService.orders.getAll(params)

        dataCache.value.lastFetch = Date.now()
        dataCache.value.lastFilters = { ...params }
        
        // Calcular stats
        calculateAdditionalStats()
        
        console.log(`✅ Loaded ${orders.value.length} orders`)
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
      
      console.log('✅ Orders loaded:', {
        count: orders.value.length,
        total: pagination.value.total,
        page: pagination.value.page,
        totalPages: pagination.value.totalPages
      })
      
    } catch (error) {
      console.error('❌ Error fetching orders:', error)
      toast.error('Error al cargar los pedidos')
      orders.value = []
      pagination.value.total = 0
      pagination.value.totalPages = 1
    } finally {
      loadingOrders.value = false
      loadingStates.value.fetching = false
    }
  }
async function fetchChannels() {
  try {
    if (!companyId.value) {
      console.warn('⚠️ No company ID available for fetching channels')
      return
    }

    console.log('🏪 Fetching channels for company:', companyId.value)
    
    const { data } = await apiService.channels.getByCompany(companyId.value)
    channels.value = data || []
    
    console.log(`✅ Loaded ${channels.value.length} channels`)
    
  } catch (err) {
    console.error('❌ Error fetching channels:', err)
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
      fetchOrders()
      console.log('📄 Changed to page:', page)
    }
  }

  /**
   * Change page size
   */
  function changePageSize(newLimit) {
    pagination.value.limit = parseInt(newLimit)
    pagination.value.page = 1 // Reset to first page
    fetchOrders()
    console.log('📏 Changed page size to:', newLimit)
  }

  /**
   * Refresh current page
   */
  function refreshOrders() {
    return fetchOrders()
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
    console.log('✅ Orden actualizada localmente:', updatedOrder.order_number)
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
      console.log('🗑️ Order removed locally:', orderId)
    }
  }

  /**
   * Add order to local state
   */
  function addOrderLocally(order) {
    orders.value.unshift(order) // Add to beginning
    pagination.value.total += 1
    console.log('➕ Order added locally:', order._id)
  }

  // ==================== COMPUTED HELPERS ====================
  
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

  function startAutoRefresh(intervalMinutes = 5) {
  stopAutoRefresh()
  dataCache.value.autoRefreshInterval = setInterval(() => {
    if (!loadingStates.value.fetching) {
      refreshOrders()
    }
  }, intervalMinutes * 60 * 1000)
}

function stopAutoRefresh() {
  if (dataCache.value.autoRefreshInterval) {
    clearInterval(dataCache.value.autoRefreshInterval)
    dataCache.value.autoRefreshInterval = null
  }
}

// Calcular estadísticas adicionales
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

// Exportar datos
async function exportOrders(format = 'excel', filters = {}) {
  loadingStates.value.exporting = true
  try {
    console.log('📤 Exportando pedidos para dashboard con filtros:', filters)
    
    // ✅ USAR LA NUEVA FUNCIÓN DE DASHBOARD
    const response = await apiService.orders.exportForDashboard(filters)
    
    if (!response || !response.data) {
      throw new Error('Respuesta vacía del servidor')
    }
    
    // Crear y descargar archivo
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Nombre del archivo más descriptivo
    const timestamp = new Date().toISOString().split('T')[0]
    const totalOrders = orders.value.length
    link.download = `pedidos_envigo_${timestamp}_${totalOrders}_pedidos.xlsx`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log('✅ Exportación de dashboard completada')
    toast.success(`✅ Exportación completada: ${totalOrders} pedidos descargados`)
    return response
    
  } catch (error) {
    console.error('❌ Error exportando pedidos:', error)
    
    // Manejo de errores más específico
    if (error.response?.status === 404) {
      toast.warning('No se encontraron pedidos para exportar con los filtros aplicados')
    } else if (error.response?.status === 403) {
      toast.error('No tienes permisos para exportar pedidos')
    } else if (error.response?.status === 500) {
      toast.error('Error interno del servidor. Contacta al soporte.')
    } else if (error.message?.includes('Network Error')) {
      toast.error('Error de conexión. Verifica tu internet.')
    } else {
      toast.error('Error al exportar pedidos: ' + (error.message || 'Error desconocido'))
    }
    
    throw error
  } finally {
    loadingStates.value.exporting = false
  }
}

// Obtener tendencias
async function getOrdersTrend(period = '30d') {
  try {
    const { data } = await apiService.orders.getTrend({ period })
    return data
  } catch (error) {
    console.error('Error fetching trend:', error)
    return []
  }
}


/**
 * Marcar múltiples pedidos como listos para retiro
 */
async function markMultipleAsReady(orderIds) {
  try {
    console.log('📦 Marcando múltiples pedidos como listos:', orderIds);
    
    const response = await apiService.orders.markMultipleAsReady(orderIds);
    
    // Actualizar estado local de cada pedido
    orderIds.forEach(orderId => {
      updateOrderLocally(orderId, { status: 'ready_for_pickup' });
    });
    
    console.log(`✅ ${orderIds.length} pedidos marcados como listos`);
    toast.success(`${orderIds.length} pedidos marcados como listos para retiro`);
    
    return response;
    
  } catch (error) {
    console.error('❌ Error marcando múltiples pedidos como listos:', error);
    toast.error('Error al marcar pedidos como listos');
    throw error;
  }
}

/**
 * Marcar un pedido individual como listo
 */
async function markOrderAsReady(order) {
  try {
    console.log('📦 Marcando pedido como listo:', order.order_number);
    
    await apiService.orders.markAsReady(order._id);
    
    // Actualizar estado local
    updateOrderLocally(order._id, { status: 'ready_for_pickup' });
    
    toast.success(`Pedido #${order.order_number} marcado como listo para retiro`);
    
  } catch (error) {
    console.error('❌ Error marcando pedido como listo:', error);
    toast.error('No se pudo actualizar el estado del pedido');
    throw error;
  }
}
// 📦 Marcar como recepcionado en bodega
const markAsWarehouseReceived = async (order) => {
  try {
    loadingOrders.value = true;
    
    const response = await apiService.orders.updateStatus(order._id, 'warehouse_received');
    
    updateOrderLocally({
      _id: order._id,
      status: 'warehouse_received',
      updated_at: new Date().toISOString()
    });
    
    toast.success(`📦 Pedido #${order.order_number} recepcionado en bodega`);
    return response.data;
  } catch (error) {
    console.error('Error marcando como recepcionado:', error);
    toast.error('❌ Error al recepcionar pedido');
    throw error;
  } finally {
    loadingOrders.value = false;
  }
};

// 🚚 Marcar como enviado
const markAsShipped = async (order) => {
  try {
    loadingOrders.value = true;
    
    const response = await apiService.orders.updateStatus(order._id, 'shipped');
    
    updateOrderLocally({
      _id: order._id,
      status: 'shipped',
      updated_at: new Date().toISOString()
    });
    
    toast.success(`🚚 Pedido #${order.order_number} salió para entrega`);
    return response.data;
  } catch (error) {
    console.error('Error marcando como enviado:', error);
    toast.error('❌ Error al enviar pedido');
    throw error;
  } finally {
    loadingOrders.value = false;
  }
};
  // ==================== RETURN ====================
  return {
    // State
    orders,
    companies,
    loadingOrders,
    pagination,
    loadingStates,
    additionalStats,
    channels,
  
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
    getOrdersTrend,
    calculateAdditionalStats,
    markMultipleAsReady,
    markOrderAsReady,
    markAsWarehouseReceived,
    markAsShipped
  }
}