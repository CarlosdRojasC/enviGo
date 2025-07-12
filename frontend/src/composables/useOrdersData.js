// composables/useOrdersData.js
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'

export function useOrdersData() {
  const toast = useToast()
  
  // ==================== STATE ====================
  const orders = ref([])
  const companies = ref([])
  const loadingOrders = ref(true)
  const pagination = ref({ 
    page: 1, 
    limit: 15, 
    total: 0, 
    totalPages: 1 
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
  function updateOrderLocally(orderId, updates) {
    const index = orders.value.findIndex(order => order._id === orderId)
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...updates }
      console.log('🔄 Order updated locally:', orderId, updates)
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
    const processing = orders.value.filter(o => o.status === 'processing').length
    const shipped = orders.value.filter(o => o.status === 'shipped').length
    const delivered = orders.value.filter(o => o.status === 'delivered').length
    const cancelled = orders.value.filter(o => o.status === 'cancelled').length
    const ready_for_pickup = orders.value.filter(o => o.status === 'ready_for_pickup').length
    
    return {
      total,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      ready_for_pickup
    }
  }

  // ==================== RETURN ====================
  return {
    // State
    orders,
    companies,
    loadingOrders,
    pagination,
    
    // Methods
    fetchOrders,
    fetchCompanies,
    goToPage,
    changePageSize,
    refreshOrders,
    getCompanyName,
    getOrderById,
    updateOrderLocally,
    removeOrderLocally,
    addOrderLocally,
    getOrdersStats
  }
}