// composables/useOrdersFilters.js
import { ref, computed, watch } from 'vue'
import { apiService } from '../services/api'

export function useOrdersFilters(orders, fetchOrders) {
  // ==================== STATE ====================
  const filters = ref({
    company_id: '',
    status: '',
    shipping_commune: [],
    date_from: '',
    date_to: '',
    search: ''
  })

  // Filtros avanzados
const advancedFilters = ref({
  amount_min: '',
  amount_max: '',
  customer_email: '',
  order_number: '',
  external_order_id: '',
  has_tracking: '',
  has_proof: '',
  priority: ''
})

// Estado de UI
const filtersUI = ref({
  showAdvanced: false,
  savedPresets: []
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
  // Todos los filtros combinados
const allFilters = computed(() => {
  const basic = Object.fromEntries(
    Object.entries(filters.value).filter(([_, value]) => value !== '')
  )
  const advanced = Object.fromEntries(
    Object.entries(advancedFilters.value).filter(([_, value]) => value !== '')
  )
  return { ...basic, ...advanced }
})

// Presets predefinidos
const filterPresets = computed(() => [
  {
    id: 'today',
    name: 'Hoy',
    icon: '📅',
    filters: {
      date_from: new Date().toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0]
    }
  },
  {
    id: 'pending',
    name: 'Pendientes',
    icon: '⏳',
    filters: { status: 'pending' }
  },
  {
    id: 'week',
    name: 'Esta Semana',
    icon: '📊',
    filters: {
      date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0]
    }
  },
  {
    id: 'ready',
    name: 'Listos',
    icon: '📦',
    filters: { status: 'ready_for_pickup' }
  }
])

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
    const activeFilters = JSON.parse(JSON.stringify(filters.value));
    
    if (activeFilters.shipping_commune && activeFilters.shipping_commune.length > 0) {
      activeFilters.shipping_commune = activeFilters.shipping_commune.join(',');
    } else {
      delete activeFilters.shipping_commune;
    }
    
    // Reiniciar a la primera página con cada nuevo filtro
    fetchOrders(1, activeFilters); 
  }

  /**
   * Reset all filters
   */
  function resetFilters() {
    filters.value = {
      company_id: '',
      status: '',
      shipping_commune: [], // <--- CAMBIO: Resetear como array vacío
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
// Aplicar preset
function applyPreset(presetId) {
  const preset = filterPresets.value.find(p => p.id === presetId)
  if (!preset) return
  
  // Resetear filtros
  Object.keys(filters.value).forEach(key => filters.value[key] = '')
  Object.keys(advancedFilters.value).forEach(key => advancedFilters.value[key] = '')
  
  // Aplicar preset
  Object.entries(preset.filters).forEach(([key, value]) => {
    if (key in filters.value) filters.value[key] = value
    if (key in advancedFilters.value) advancedFilters.value[key] = value
  })
  
  applyFilters()
}

// Toggle filtros avanzados
function toggleAdvancedFilters() {
  filtersUI.value.showAdvanced = !filtersUI.value.showAdvanced
}

// Actualizar filtro avanzado
function updateAdvancedFilter(key, value) {
  if (key in advancedFilters.value) {
    advancedFilters.value[key] = value
    applyFilters()
  }
}

  function applySearch(searchTerm) {
    if (filters.value.search !== searchTerm) {
      filters.value.search = searchTerm;
    }
    applyFilters();
  }

// Búsqueda con mejor debounce
    function handleFilterChange(filterKey, value) {
    filters.value[filterKey] = value;
    applyFilters();
  }
    function handleSearch(searchTerm) {
    filters.value.search = searchTerm;
    applyFilters();
  }

  // ==================== RETURN ====================
  return {
    // State
    filters,
    advancedFilters,
    filtersUI,
    allFilters,
    filterPresets,
  
    
    // Computed
    availableCommunes,
    activeFiltersCount,
    hasActiveFilters,
    
    // Methods
    handleFilterChange,
    handleSearch,
    applyFilters,
    resetFilters,
    setFilter,
    getFilter,
    fetchAvailableCommunes,
    validateDateRange,
    getFilterSummary,
    exportFilters,
    importFilters,
    applyPreset,
    toggleAdvancedFilters,
    updateAdvancedFilter,
    applySearch
  }
}