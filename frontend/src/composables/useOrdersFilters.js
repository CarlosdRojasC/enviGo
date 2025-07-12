// composables/useOrdersFilters.js
import { ref, computed, watch } from 'vue'
import { apiService } from '../services/api'

export function useOrdersFilters(orders, fetchOrders) {
  // ==================== STATE ====================
  const filters = ref({
    company_id: '',
    status: '',
    shipping_commune: '',
    date_from: '',
    date_to: '',
    search: ''
  })

  // Search debounce
  let searchTimeout

  // ==================== COMPUTED ====================
  
  /**
   * Available communes from current orders and API
   */
  const availableCommunes = computed(() => {
    if (!orders.value?.length) return []
    
    const communes = new Set(
      orders.value
        .map(order => order.shipping_commune)
        .filter(commune => commune && commune.trim() !== '')
    )
    
    return Array.from(communes).sort()
  })

  /**
   * Active filters count (for UI feedback)
   */
  const activeFiltersCount = computed(() => {
    return Object.values(filters.value).filter(value => 
      value !== '' && value !== null && value !== undefined
    ).length
  })

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = computed(() => {
    return activeFiltersCount.value > 0
  })

  // ==================== METHODS ====================

  /**
   * Handle filter changes with debouncing for search
   */
  function handleFilterChange(filterKey, value) {
    filters.value[filterKey] = value
    
    if (filterKey === 'search') {
      // Debounce search input
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        applyFilters()
      }, 500)
    } else {
      // Apply immediately for other filters
      applyFilters()
    }
    
    console.log('🔍 Filter changed:', { [filterKey]: value })
  }

  /**
   * Apply filters to orders
   */
  function applyFilters() {
    console.log('🎯 Applying filters:', filters.value)
    fetchOrders(filters.value)
  }

  /**
   * Reset all filters
   */
  function resetFilters() {
    filters.value = {
      company_id: '',
      status: '',
      shipping_commune: '',
      date_from: '',
      date_to: '',
      search: ''
    }
    
    console.log('🔄 Filters reset')
    applyFilters()
  }

  /**
   * Set specific filter programmatically
   */
  function setFilter(key, value) {
    if (key in filters.value) {
      filters.value[key] = value
      applyFilters()
    }
  }

  /**
   * Get current filter value
   */
  function getFilter(key) {
    return filters.value[key]
  }

  /**
   * Fetch available communes from API
   */
  async function fetchAvailableCommunes() {
    try {
      console.log('🏘️ Fetching available communes...')
      
      const params = {}
      
      // If company filter is active, apply it to communes too
      if (filters.value.company_id) {
        params.company_id = filters.value.company_id
      }
      
      const { data } = await apiService.orders.getAvailableCommunes(params)
      const apiCommunes = data.communes || []
      
      console.log('✅ API Communes loaded:', apiCommunes.length)
      
      return apiCommunes
      
    } catch (error) {
      console.error('❌ Error fetching communes:', error)
      
      // Fallback: extract communes from current orders
      if (orders.value.length > 0) {
        console.log('📍 Using fallback communes from current orders')
        return availableCommunes.value
      }
      
      return []
    }
  }

  /**
   * Validate date range
   */
  function validateDateRange() {
    if (filters.value.date_from && filters.value.date_to) {
      const fromDate = new Date(filters.value.date_from)
      const toDate = new Date(filters.value.date_to)
      
      if (fromDate > toDate) {
        console.warn('⚠️ Invalid date range: from date is after to date')
        return false
      }
    }
    return true
  }

  /**
   * Get filter summary for display
   */
  function getFilterSummary() {
    const summary = []
    
    if (filters.value.company_id) {
      summary.push(`Empresa: ${filters.value.company_id}`)
    }
    
    if (filters.value.status) {
      summary.push(`Estado: ${filters.value.status}`)
    }
    
    if (filters.value.shipping_commune) {
      summary.push(`Comuna: ${filters.value.shipping_commune}`)
    }
    
    if (filters.value.date_from) {
      summary.push(`Desde: ${filters.value.date_from}`)
    }
    
    if (filters.value.date_to) {
      summary.push(`Hasta: ${filters.value.date_to}`)
    }
    
    if (filters.value.search) {
      summary.push(`Búsqueda: "${filters.value.search}"`)
    }
    
    return summary
  }

  /**
   * Export current filters for external use
   */
  function exportFilters() {
    return { ...filters.value }
  }

  /**
   * Import filters from external source
   */
  function importFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    applyFilters()
  }

  // ==================== WATCHERS ====================
  
  // Watch for company change to refresh communes
  watch(
    () => filters.value.company_id,
    (newCompanyId) => {
      if (newCompanyId) {
        console.log('🏢 Company filter changed, refreshing communes')
        fetchAvailableCommunes()
      }
    }
  )

  // Validate date range when dates change
  watch(
    [() => filters.value.date_from, () => filters.value.date_to],
    () => {
      if (!validateDateRange()) {
        console.warn('⚠️ Invalid date range detected')
      }
    }
  )

  // ==================== RETURN ====================
  return {
    // State
    filters,
    
    // Computed
    availableCommunes,
    activeFiltersCount,
    hasActiveFilters,
    
    // Methods
    handleFilterChange,
    applyFilters,
    resetFilters,
    setFilter,
    getFilter,
    fetchAvailableCommunes,
    validateDateRange,
    getFilterSummary,
    exportFilters,
    importFilters
  }
}