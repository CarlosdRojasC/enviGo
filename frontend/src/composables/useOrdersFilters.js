// frontend/src/composables/useOrdersFilters.js - VERSIÓN CORREGIDA
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'

/**
 * 🔧 COMPOSABLE UNIFICADO PARA FILTROS DE PEDIDOS - FIXED
 */
export function useOrdersFilters(orders, fetchOrders, options = {}) {
  const auth = useAuthStore()
  
  // ==================== CONFIGURACIÓN AUTOMÁTICA ====================
  const mode = options.mode || (auth.user?.role === 'admin' ? 'admin' : 'company')
  const isAdmin = computed(() => mode === 'admin')
  
  // ==================== ESTADO PRINCIPAL - INICIALIZACIÓN COMPLETA ====================
  
  /**
   * Filtros básicos - INICIALIZACIÓN SEGURA
   */
  const filters = ref({
    status: '',
    shipping_commune: [],
    date_from: '',
    date_to: '',
    search: '',
    company_id: isAdmin.value ? '' : (auth.user?.company_id || ''),
    channel_id: '',
    amount_min: '',
    amount_max: ''
  })

  /**
   * Filtros avanzados - INICIALIZACIÓN COMPLETA
   */
  const advancedFilters = ref({
    priority: '',
    shipday_status: '',
    customer_email: '',
    order_number: '',
    external_order_id: '',
    has_tracking: '',
    has_proof: '',
    driver_assigned: '',
    created_by: isAdmin.value ? '' : (auth.user?._id || ''),
    last_updated_hours: '',
    payment_status: '',
    delivery_window: ''
  })

  /**
   * Estado de la UI - SIEMPRE INICIALIZADO
   */
  const filtersUI = ref({
    showAdvanced: false,
    activePreset: null,
    communeSearch: '',
    showCommuneDropdown: false,
    // Propiedades adicionales para compatibilidad
    savedPresets: [],
    lastAppliedFilters: null,
    isInitialized: true
  })

  // ==================== TIMEOUT REFS ====================
  let filterTimeout = null

  // ==================== PRESETS INTELIGENTES ====================
  const filterPresets = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    const weekStart = getWeekStart().toISOString().split('T')[0]
    
    const basePresets = [
      {
        id: 'today',
        name: 'Hoy',
        icon: '📅',
        description: 'Pedidos creados hoy',
        filters: { date_from: today, date_to: today }
      },
      {
        id: 'pending',
        name: 'Pendientes',
        icon: '⏳',
        description: 'Pedidos pendientes',
        filters: { status: 'pending' }
      },
      {
        id: 'ready',
        name: 'Listos',
        icon: '📦',
        description: 'Listos para recoger',
        filters: { status: 'ready_for_pickup' }
      },
      {
        id: 'this_week',
        name: 'Esta Semana',
        icon: '📊',
        description: 'Pedidos de esta semana',
        filters: { date_from: weekStart, date_to: today }
      }
    ]

    if (isAdmin.value) {
      basePresets.push(
        {
          id: 'unassigned',
          name: 'Sin Asignar',
          icon: '🚚',
          description: 'No asignados a Shipday',
          filters: { shipday_status: 'not_assigned' }
        },
        {
          id: 'high_value',
          name: 'Alto Valor',
          icon: '💰',
          description: 'Pedidos > $50.000',
          filters: { amount_min: '50000' }
        }
      )
    } else {
      basePresets.push(
        {
          id: 'delivered',
          name: 'Entregados',  
          icon: '✅',
          description: 'Pedidos entregados',
          filters: { status: 'delivered' }
        },
        {
          id: 'in_transit',
          name: 'En Tránsito',
          icon: '🚛', 
          description: 'Pedidos en camino',
          filters: { status: 'shipped' }
        }
      )
    }

    return basePresets
  })

  // ==================== COMPUTED PROPERTIES ====================

  /**
   * Comunas disponibles desde pedidos
   */
  const availableCommunes = computed(() => {
    if (!orders?.value?.length) return []
    
    const communes = new Set()
    
    orders.value.forEach(order => {
      let commune = order.shipping_commune
      
      if (commune != null && commune !== undefined) {
        if (Array.isArray(commune)) {
          commune = commune.length > 0 ? commune[0] : null
        }
        
        if (typeof commune === 'string' && commune.trim()) {
          communes.add(commune.trim())
        }
      }
    })
    
    return Array.from(communes).sort()
  })

  /**
   * Comunas filtradas para dropdown
   */
  const filteredCommunes = computed(() => {
    const search = filtersUI.value.communeSearch.toLowerCase()
    const selected = filters.value.shipping_commune || []
    
    return availableCommunes.value.filter(commune =>
      !selected.includes(commune) &&
      commune.toLowerCase().includes(search)
    )
  })

  /**
   * Contador de filtros activos
   */
  const activeFiltersCount = computed(() => {
    let count = 0
    
    Object.entries(filters.value).forEach(([key, value]) => {
      if (key === 'shipping_commune') {
        if (Array.isArray(value) && value.length > 0) count++
      } else if (key === 'company_id' && !isAdmin.value) {
        // No contar company_id para usuarios no admin
        return
      } else if (value !== '' && value !== null && value !== undefined) {
        count++
      }
    })
    
    if (filtersUI.value.showAdvanced) {
      Object.values(advancedFilters.value).forEach(value => {
        if (value !== '' && value !== null && value !== undefined) count++
      })
    }
    
    return count
  })

  /**
   * Verificar si hay filtros activos
   */
  const hasActiveFilters = computed(() => activeFiltersCount.value > 0)

  /**
   * Todos los filtros combinados
   */
  const allFilters = computed(() => ({
    ...filters.value,
    ...(filtersUI.value.showAdvanced ? advancedFilters.value : {})
  }))

  // ==================== CORE METHODS ====================

  /**
   * 🎯 Aplicar filtros
   */
  function applyFilters() {
    console.log(`🎯 [${mode.toUpperCase()}] Applying filters:`, filters.value)
    
    const cleanFilters = {}
    
    Object.entries(filters.value).forEach(([key, value]) => {
      if (key === 'shipping_commune') {
        if (Array.isArray(value) && value.length > 0) {
          cleanFilters[key] = value.join(',')
        }
      } else if (key === 'company_id' && !isAdmin.value) {
        cleanFilters[key] = auth.user?.company_id || value
      } else if (value !== '' && value !== null && value !== undefined) {
        cleanFilters[key] = value
      }
    })
    
    if (filtersUI.value.showAdvanced) {
      Object.entries(advancedFilters.value).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          cleanFilters[key] = value
        }
      })
    }
    
    console.log(`📡 [${mode.toUpperCase()}] Sending filters:`, cleanFilters)
    
    // Guardar filtros aplicados
    filtersUI.value.lastAppliedFilters = { ...cleanFilters }
    
    // Llamar función de fetch
    if (fetchOrders && typeof fetchOrders === 'function') {
      fetchOrders(cleanFilters)
    }
  }

  /**
   * 🔄 Manejar cambio de filtro
   */
const handleFilterChange = async (key, value) => {
  console.log(`🔄 handleFilterChange: ${key} = ${value} (tipo: ${typeof value})`)
  
  // ✅ VALIDAR ObjectIds antes de aplicar
  if ((key === 'company_id' || key === 'channel_id') && value && value !== '') {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/
    if (!objectIdRegex.test(value)) {
      console.error(`❌ ${key} inválido:`, value)
      toast.error(`ID de ${key === 'company_id' ? 'empresa' : 'canal'} inválido`)
      return
    }
  }
  
  // ✅ LIMPIAR VALOR
  const cleanValue = value === '' || value === 'undefined' || value === 'null' ? '' : value
  
  // ✅ APLICAR FILTRO
  if (cleanValue === '' || cleanValue === null || cleanValue === undefined) {
    delete filters.value[key]
  } else {
    filters.value[key] = cleanValue
  }
  
  // ✅ DEBUG
  console.log('🧹 Filtros después del cambio:', filters.value)
  
  // ✅ RESETEAR PAGINACIÓN Y REFRESCAR
  try {
    await fetchOrders(filters.value)
  } catch (error) {
    console.error('❌ Error aplicando filtros:', error)
    toast.error('Error aplicando filtros: ' + error.message)
  }
}

  /**
   * 🎨 Aplicar preset
   */
  function applyPreset(presetId) {
    console.log(`🎨 [${mode.toUpperCase()}] Applying preset:`, presetId)
    
    const preset = filterPresets.value.find(p => p.id === presetId)
    if (!preset) {
      console.warn('❌ Preset not found:', presetId)
      return
    }
    
    resetFilters(false)
    
    Object.entries(preset.filters).forEach(([key, value]) => {
      if (key in filters.value) {
        filters.value[key] = value
      } else if (key in advancedFilters.value) {
        advancedFilters.value[key] = value
      }
    })
    
    filtersUI.value.activePreset = presetId
    applyFilters()
  }

  /**
   * 🧹 Resetear filtros
   */
const resetFilters = async () => {
  console.log('🧹 Limpiando todos los filtros...')
  
  // Limpiar todos los filtros
  Object.keys(filters.value).forEach(key => {
    delete filters.value[key]
  })
  
  console.log('✅ Filtros limpiados:', filters.value)
  
  try {
    await fetchOrders({})
    toast.success('Filtros limpiados correctamente')
  } catch (error) {
    console.error('❌ Error limpiando filtros:', error)
    toast.error('Error limpiando filtros')
  }
}

  /**
   * 🔧 Toggle filtros avanzados
   */
  function toggleAdvancedFilters() {
    filtersUI.value.showAdvanced = !filtersUI.value.showAdvanced
    console.log(`🔧 [${mode.toUpperCase()}] Advanced filters:`, filtersUI.value.showAdvanced)
  }

  /**
   * ⚙️ Actualizar filtro avanzado
   */
  function updateAdvancedFilter(key, value) {
    console.log(`⚙️ [${mode.toUpperCase()}] Advanced filter:`, { key, value })
    
    if (key in advancedFilters.value) {
      advancedFilters.value[key] = value
      
      if (['customer_email', 'order_number'].includes(key)) {
        clearTimeout(filterTimeout)
        filterTimeout = setTimeout(() => {
          applyFilters()
        }, 500)
      } else {
        applyFilters()
      }
    }
  }

  // ==================== GESTIÓN DE COMUNAS ====================

  function addCommune(commune) {
    if (!filters.value.shipping_commune.includes(commune)) {
      filters.value.shipping_commune.push(commune)
      filtersUI.value.communeSearch = ''
      filtersUI.value.showCommuneDropdown = false
      applyFilters()
    }
  }

  function removeCommune(commune) {
    filters.value.shipping_commune = filters.value.shipping_commune.filter(c => c !== commune)
    applyFilters()
  }

  function toggleCommune(commune) {
    if (filters.value.shipping_commune.includes(commune)) {
      removeCommune(commune)
    } else {
      addCommune(commune)
    }
  }

  // ==================== BÚSQUEDA ====================

  function handleSearch(searchTerm) {
    handleFilterChange('search', searchTerm)
  }

  function applySearch(searchTerm) {
    filters.value.search = searchTerm
    applyFilters()
  }

  // ==================== HELPER FUNCTIONS ====================

  function getWeekStart() {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff))
  }

  function getStatusDisplayName(status) {
    const statusNames = {
      'pending': 'Pendiente',
      'processing': 'Procesando', 
      'ready_for_pickup': 'Listo',
      'assigned': 'Asignado',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    }
    return statusNames[status] || status
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  function validateDateRange() {
    if (filters.value.date_from && filters.value.date_to) {
      return new Date(filters.value.date_from) <= new Date(filters.value.date_to)
    }
    return true
  }
  async function fetchAvailableCommunes() {
  try {
    console.log('🏘️ Fetching available communes...')
    
    const params = {}
    
    // Si hay filtro de empresa activo, aplicarlo
    if (filters.value.company_id) {
      params.company_id = filters.value.company_id
    }
    
    const { data } = await apiService.orders.getAvailableCommunes(params)
    
    if (data && data.communes) {
      availableCommunes.value = data.communes
      console.log('✅ Communes loaded:', availableCommunes.value.length)
    } else {
      availableCommunes.value = []
      console.warn('⚠️ No communes data received')
    }
    
  } catch (error) {
    console.error('❌ Error fetching communes:', error)
    availableCommunes.value = []
  }
}
  // ==================== WATCHERS ====================

  watch(
    [() => filters.value.date_from, () => filters.value.date_to],
    () => {
      if (!validateDateRange()) {
        console.warn('⚠️ Invalid date range')
      }
    }
  )

  watch(
    filters,
    () => {
      if (filtersUI.value.activePreset) {
        filtersUI.value.activePreset = null
      }
    },
    { deep: true }
  )

  // ==================== INICIALIZACIÓN ====================
  
  // Marcar como inicializado
  filtersUI.value.isInitialized = true
  console.log(`✅ [${mode.toUpperCase()}] OrdersFilters initialized`)

  // ==================== RETURN API ====================
  return {
    // Estado principal
    filters,
    advancedFilters,
    filtersUI,
    
    // Computed
    availableCommunes,
    filteredCommunes,
    activeFiltersCount,
    hasActiveFilters,
    allFilters,
    filterPresets,
    isAdmin,
    
    // Métodos principales
    applyFilters,
    handleFilterChange,
    resetFilters,
    applyPreset,
    
    // Filtros avanzados
    toggleAdvancedFilters,
    updateAdvancedFilter,
    
    // Gestión de comunas
    addCommune,
    removeCommune,
    toggleCommune,
    
    // Búsqueda
    handleSearch,
    applySearch,
    
    // Utilidades
    validateDateRange,
    getStatusDisplayName,
    formatDate,
    fetchAvailableCommunes,
    
    // Legacy methods (compatibilidad)
    setFilter: (key, value) => handleFilterChange(key, value),
    getFilter: (key) => filters.value[key] || advancedFilters.value[key],
    exportFilters: () => ({ ...allFilters.value }),
    clearAllFilters: () => resetFilters(),
    handleFilterObjectChange: (newFilters) => {
      Object.entries(newFilters).forEach(([key, value]) => {
        handleFilterChange(key, value)
      })
    },
  }
}