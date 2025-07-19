// composables/useOrdersFilters.js - VERSIÓN LIMPIA
import { ref, computed, watch } from 'vue'
import { apiService } from '../services/api'

export function useOrdersFilters(orders, fetchOrders) {
  // ==================== STATE ====================
  const filters = ref({
    company_id: '',
    status: '',
    shipping_commune: [], // Array para múltiples comunas
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
    
    const communes = new Set()
    
    try {
      orders.value.forEach(order => {
        let commune = order.shipping_commune
        
        // Verificar y normalizar el tipo de dato
        if (commune != null && commune !== undefined) {
          // Si es array, convertir a string
          if (Array.isArray(commune)) {
            commune = commune.length > 0 ? commune.join(', ') : ''
          }
          // Si no es string, convertir
          else if (typeof commune !== 'string') {
            commune = String(commune)
          }
          
          // Solo agregar si es válido
          if (commune.trim() !== '' && commune !== 'null' && commune !== 'undefined') {
            communes.add(commune.trim())
          }
        }
      })
    } catch (error) {
      console.error('❌ Error procesando comunas:', error)
      return []
    }
    
    return Array.from(communes).sort()
  })

  /**
   * Active filters count (for UI feedback) - CORREGIDO
   */
  const activeFiltersCount = computed(() => {
    return Object.values(filters.value).filter(value => {
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value !== '' && value !== null && value !== undefined
    }).length
  })

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = computed(() => {
    return activeFiltersCount.value > 0
  })

  /**
   * Todos los filtros combinados - CORREGIDO
   */
  const allFilters = computed(() => {
    const basic = Object.fromEntries(
      Object.entries(filters.value).filter(([_, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0
        }
        return value !== '' && value !== null && value !== undefined
      })
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
   * Handle filter changes with debouncing for search - ÚNICA VERSIÓN
   */
function handleFilterChange(filterKey, value) {
  console.log('🔍 Filter changing:', { filterKey, value, isArray: Array.isArray(value) });

  filters.value[filterKey] = value;

  // Si el filtro es de búsqueda O de comuna, aplica un retraso
  // para permitir que el usuario siga escribiendo o seleccionando.
  if (filterKey === 'search' || filterKey === 'shipping_commune') {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyFilters();
    }, 500); // 500ms de espera
  } else {
    // Los otros filtros (como estado o fecha) se aplican al instante.
    applyFilters();
  }
}

  /**
   * Apply filters to orders - CORREGIDO
   */
function applyFilters() {
    console.log('🎯 Applying filters:', filters.value);
    
    const cleanFilters = {};
    
    Object.entries(filters.value).forEach(([key, value]) => {
      // ESTA ES LA LÓGICA CLAVE
      if (key === 'shipping_commune') {
        // Convierte el array de comunas en un string separado por comas
        if (Array.isArray(value) && value.length > 0) {
          cleanFilters[key] = value.join(','); 
        }
      } else if (value !== '' && value !== null && value !== undefined) {
        cleanFilters[key] = value;
      }
    });
    
    console.log('📡 Sending filters to backend:', cleanFilters);
    // Asumimos que fetchOrders está definido en este composable y usa estos filtros
    fetchOrders(cleanFilters);
  }

  /**
   * Reset all filters - CORREGIDO
   */
  function resetFilters() {
    filters.value = {
      company_id: '',
      status: '',
      shipping_commune: [], // Array vacío
      date_from: '',
      date_to: '',
      search: ''
    }
    
    // Resetear filtros avanzados también
    Object.keys(advancedFilters.value).forEach(key => {
      advancedFilters.value[key] = ''
    })
    
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
   * Aplicar preset - CORREGIDO
   */
  function applyPreset(presetId) {
    const preset = filterPresets.value.find(p => p.id === presetId)
    if (!preset) return
    
    // Resetear filtros correctamente
    filters.value = {
      company_id: '',
      status: '',
      shipping_commune: [], // ← CORREGIDO: Array, no string
      date_from: '',
      date_to: '',
      search: ''
    }
    
    Object.keys(advancedFilters.value).forEach(key => {
      advancedFilters.value[key] = ''
    })
    
    // Aplicar preset
    Object.entries(preset.filters).forEach(([key, value]) => {
      if (key in filters.value) filters.value[key] = value
      if (key in advancedFilters.value) advancedFilters.value[key] = value
    })
    
    applyFilters()
  }

  /**
   * Búsqueda con debounce - SIMPLIFICADO
   */
  function handleSearch(searchTerm) {
    handleFilterChange('search', searchTerm) // Reutilizar la función principal
  }

  /**
   * Búsqueda directa sin debounce
   */
  function applySearch(searchTerm) {
    filters.value.search = searchTerm
    applyFilters()
  }

  // ==================== FUNCIONES PARA MÚLTIPLES COMUNAS ====================

  /**
   * Agregar comuna al filtro
   */
  function addCommune(commune) {
    console.log('🏘️ Agregando comuna:', commune)
    
    if (!filters.value.shipping_commune.includes(commune)) {
      filters.value.shipping_commune.push(commune)
      console.log('✅ Comunas actuales:', filters.value.shipping_commune)
      applyFilters()
    } else {
      console.log('⚠️ Comuna ya existe:', commune)
    }
  }

  /**
   * Remover comuna del filtro
   */
  function removeCommune(communeToRemove) {
    console.log('❌ Removiendo comuna:', communeToRemove)
    
    filters.value.shipping_commune = filters.value.shipping_commune.filter(
      commune => commune !== communeToRemove
    )
    
    console.log('📊 Comunas restantes:', filters.value.shipping_commune)
    applyFilters()
  }

  /**
   * Toggle comuna (agregar si no está, remover si está)
   */
  function toggleCommune(commune) {
    const index = filters.value.shipping_commune.indexOf(commune)
    if (index === -1) {
      addCommune(commune)
    } else {
      removeCommune(commune)
    }
  }

  // ==================== FUNCIONES AUXILIARES ====================

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
    
    if (Array.isArray(filters.value.shipping_commune) && filters.value.shipping_commune.length > 0) {
      summary.push(`Comunas: ${filters.value.shipping_commune.join(', ')}`)
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

  /**
   * Toggle filtros avanzados
   */
  function toggleAdvancedFilters() {
    filtersUI.value.showAdvanced = !filtersUI.value.showAdvanced
  }

  /**
   * Actualizar filtro avanzado
   */
  function updateAdvancedFilter(key, value) {
    if (key in advancedFilters.value) {
      advancedFilters.value[key] = value
      applyFilters()
    }
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
    advancedFilters,
    filtersUI,
    allFilters,
    filterPresets,
    
    // Computed
    availableCommunes,
    activeFiltersCount,
    hasActiveFilters,
    
    // Methods principales
    handleFilterChange,
    handleSearch,
    applyFilters,
    resetFilters,
    setFilter,
    getFilter,
    
    // Funciones auxiliares
    fetchAvailableCommunes,
    validateDateRange,
    getFilterSummary,
    exportFilters,
    importFilters,
    
    // Presets y UI
    applyPreset,
    toggleAdvancedFilters,
    updateAdvancedFilter,
    applySearch,
    
    // Funciones para comunas
    addCommune,
    removeCommune,
    toggleCommune
  }
}