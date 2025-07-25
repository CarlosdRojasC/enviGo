// composables/useOrdersFilters.js - VERSIÓN COMPLETA CORREGIDA
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import { logger } from '../services/logger.service'

export function useOrdersFilters(orders, fetchOrders, options = {}) {
  const toast = useToast()
  
  // ==================== STATE ====================
  const filters = ref({
    company_id: '',
    status: '',
    shipping_commune: [], // Array para múltiples comunas
    date_from: '',
    date_to: '',
    search: '',
    channel_id: '', // ✅ AGREGAR
    amount_min: '',
    amount_max: '',
    priority: '',
    shipday_status: '',
    customer_email: '',
    order_number: '',
    has_tracking: ''
  })

  // ✅ FILTROS AVANZADOS COMO REF SEPARADO
  const advancedFilters = ref({
    amount_min: '',
    amount_max: '',
    customer_email: '',
    order_number: '',
    external_order_id: '',
    has_tracking: '',
    has_proof: '',
    priority: '',
    shipday_status: ''
  })

  // ✅ UI DE FILTROS
  const filtersUI = ref({
    showAdvanced: false,
    activePreset: null,
    savedPresets: []
  })

  // ✅ ESTADO PARA COMUNAS DISPONIBLES
  const availableCommunes = ref([])
  const loadingCommunes = ref(false)

  // Search debounce
  let searchTimeout

  // ==================== COMPUTED ====================
  
  /**
   * Count active filters
   */
  const activeFiltersCount = computed(() => {
    return Object.values(filters.value).filter(value => 
      value !== '' && 
      value !== null && 
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0)
    ).length
  })

  /**
   * Check if has active filters
   */
  const hasActiveFilters = computed(() => {
    return activeFiltersCount.value > 0
  })

  /**
   * ✅ PRESETS DE FILTROS
   */
  const filterPresets = computed(() => [
    {
      id: 'pending',
      name: 'Pendientes',
      icon: '⏳',
      description: 'Pedidos pendientes de procesar',
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
      id: 'unassigned',
      name: 'Sin Asignar',
      icon: '🚚',
      description: 'No asignados a Shipday',
      filters: { shipday_status: 'not_assigned' }
    },
    {
      id: 'this_week',
      name: 'Esta Semana',
      icon: '📊',
      description: 'Pedidos de esta semana',
      filters: {
        date_from: getWeekStart(),
        date_to: getWeekEnd()
      }
    }
  ])

  /**
   * All filters combined (for export)
   */
  const allFilters = computed(() => {
    return { ...filters.value, ...advancedFilters.value }
  })

  // ==================== HELPER FUNCTIONS ====================
  
  function getWeekStart() {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    return startOfWeek.toISOString().split('T')[0]
  }

  function getWeekEnd() {
    const now = new Date()
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))
    return endOfWeek.toISOString().split('T')[0]
  }

  // ==================== METHODS ====================

  /**
   * ✅ CARGAR COMUNAS DISPONIBLES
   */
  async function fetchAvailableCommunes(companyId = null) {
    try {
      loadingCommunes.value = true
      logger.dev('🏘️ Fetching available communes for company:', companyId)
      
      const params = {}
      if (companyId) {
        params.company_id = companyId
      }
      
      const response = await apiService.orders.getAvailableCommunes(params)
      
      logger.debug('📡 Communes API response:', response)
      
      if (response.data && response.data.communes) {
        availableCommunes.value = response.data.communes
        logger.success('✅ Communes loaded:', availableCommunes.value.length)
      } else {
        availableCommunes.value = []
        logger.warn('⚠️ No communes data received:', response.data)
      }
      
    } catch (error) {
      logger.error('❌ Error fetching communes:', error)
      availableCommunes.value = []
      
      // Mostrar toast solo si es un error crítico
      if (error.response?.status === 401) {
        toast.error('Error de autenticación al cargar comunas')
      }
    } finally {
      loadingCommunes.value = false
    }
  }

  /**
   * ✅ HANDLE FILTER CHANGE CON VALIDACIÓN
   */
  const handleFilterChange = async (key, value) => {
    logger.dev(`🔄 handleFilterChange: ${key} = ${value} (tipo: ${typeof value})`)
    
    // ✅ VALIDAR ObjectIds antes de aplicar
    if ((key === 'company_id' || key === 'channel_id') && value && value !== '') {
      const objectIdRegex = /^[0-9a-fA-F]{24}$/
      if (!objectIdRegex.test(value)) {
        logger.error(`❌ ${key} inválido:`, value)
        toast.error(`ID de ${key === 'company_id' ? 'empresa' : 'canal'} inválido`)
        return
      }
    }
    
    // ✅ LIMPIAR VALOR
    const cleanValue = value === '' || value === 'undefined' || value === 'null' ? '' : value
    
    // ✅ APLICAR FILTRO
    if (cleanValue === '' || cleanValue === null || cleanValue === undefined) {
      if (Array.isArray(filters.value[key])) {
        filters.value[key] = []
      } else {
        filters.value[key] = ''
      }
    } else {
      filters.value[key] = cleanValue
    }
    
    // ✅ SI CAMBIA LA EMPRESA, RECARGAR COMUNAS
    if (key === 'company_id') {
      logger.dev('🏢 Company filter changed, reloading communes...')
      await fetchAvailableCommunes(cleanValue || null)
    }
    
    // ✅ DEBUG
    logger.debug('🧹 Filtros después del cambio:', filters.value)
    
    // ✅ APLICAR FILTROS
    applyFilters()
  }

  /**
   * Apply filters with debounce for search
   */
  function applyFilters() {
    logger.debug('🎯 Applying filters:', filters.value)
    
    const cleanFilters = {}
    
    Object.entries(filters.value).forEach(([key, value]) => {
      if (key === 'shipping_commune') {
        // Convertir array de comunas en string separado por comas
        if (Array.isArray(value) && value.length > 0) {
          cleanFilters[key] = value.join(',')
        }
      } else if (value !== '' && value !== null && value !== undefined) {
        cleanFilters[key] = value
      }
    })
    
    logger.debug('📡 Sending filters to backend:', cleanFilters)
    
    // Llamar fetchOrders con los filtros limpios
    if (fetchOrders) {
      fetchOrders(cleanFilters)
    }
  }

  /**
   * ✅ RESET FILTERS MEJORADO
   */
  const resetFilters = async () => {
    logger.dev('🧹 Limpiando todos los filtros...')
    
    // Limpiar filtros básicos
    Object.keys(filters.value).forEach(key => {
      if (Array.isArray(filters.value[key])) {
        filters.value[key] = []
      } else {
        filters.value[key] = ''
      }
    })
    
    // Limpiar filtros avanzados
    Object.keys(advancedFilters.value).forEach(key => {
      advancedFilters.value[key] = ''
    })
    
    logger.dev('✅ Filtros limpiados:', filters.value)
    
    applyFilters()
    toast.success('Filtros limpiados correctamente')
  }

  /**
   * Set individual filter
   */
  const setFilter = (key, value) => {
    if (key in filters.value) {
      filters.value[key] = value
      applyFilters()
    }
  }

  /**
   * Get individual filter
   */
  const getFilter = (key) => {
    return filters.value[key]
  }

  /**
   * Export current filters
   */
  const exportFilters = () => {
    return { ...filters.value }
  }

  /**
   * ✅ TOGGLE FILTROS AVANZADOS
   */
  function toggleAdvancedFilters() {
    filtersUI.value.showAdvanced = !filtersUI.value.showAdvanced
    logger.debug('🔧 Advanced filters toggled:', filtersUI.value.showAdvanced)
  }

  /**
   * ✅ UPDATE ADVANCED FILTER
   */
  function updateAdvancedFilter(key, value) {
    if (key in advancedFilters.value) {
      advancedFilters.value[key] = value
      applyFilters()
    }
  }

  /**
   * ✅ APPLY PRESET
   */
  function applyPreset(presetId) {
    const preset = filterPresets.value.find(p => p.id === presetId)
    if (!preset) return
    
    logger.dev('🎯 Applying preset:', preset.name)
    
    // Resetear filtros
    resetFilters()
    
    // Aplicar filtros del preset
    Object.entries(preset.filters).forEach(([key, value]) => {
      if (key in filters.value) {
        filters.value[key] = value
      }
      if (key in advancedFilters.value) {
        advancedFilters.value[key] = value
      }
    })
    
    // Marcar preset como activo
    filtersUI.value.activePreset = presetId
    
    applyFilters()
    
    // Limpiar preset activo después de 3 segundos
    setTimeout(() => {
      filtersUI.value.activePreset = null
    }, 3000)
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

  // ==================== FUNCIONES PARA MÚLTIPLES COMUNAS ====================

  /**
   * ✅ Agregar comuna al filtro
   */
  function addCommune(commune) {
    logger.dev('🏘️ Agregando comuna:', commune)
    
    if (!filters.value.shipping_commune.includes(commune)) {
      filters.value.shipping_commune.push(commune)
      logger.debug('✅ Comunas actuales:', filters.value.shipping_commune)
      applyFilters()
    } else {
      logger.debug('⚠️ Comuna ya existe:', commune)
    }
  }

  /**
   * ✅ Remover comuna del filtro
   */
  function removeCommune(communeToRemove) {
    logger.dev('❌ Removiendo comuna:', communeToRemove)
    
    filters.value.shipping_commune = filters.value.shipping_commune.filter(
      commune => commune !== communeToRemove
    )
    
    logger.debug('📊 Comunas restantes:', filters.value.shipping_commune)
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

  // ==================== WATCHERS ====================
  
  // Watch for company change to refresh communes
  watch(
    () => filters.value.company_id,
    (newCompanyId) => {
      if (newCompanyId) {
        logger.dev('🏢 Company filter changed, refreshing communes')
        fetchAvailableCommunes(newCompanyId)
      }
    }
  )

  // Validate date range when dates change
  watch(
    [() => filters.value.date_from, () => filters.value.date_to],
    () => {
      if (!validateDateRange()) {
        logger.warn('⚠️ Invalid date range detected')
      }
    }
  )

  // ==================== RETURN ====================
  return {
    // ✅ STATE
    filters,
    advancedFilters,      // ✅ AGREGAR
    filtersUI,           // ✅ AGREGAR
    availableCommunes,
    loadingCommunes,
    
    // ✅ COMPUTED
    activeFiltersCount,
    hasActiveFilters,
    filterPresets,       // ✅ AGREGAR
    allFilters,         // ✅ AGREGAR
    
    // ✅ METHODS PRINCIPALES
    handleFilterChange,
    resetFilters,
    setFilter,
    getFilter,
    exportFilters,
    
    // ✅ FUNCIONES AUXILIARES
    fetchAvailableCommunes,
    validateDateRange,
    applyFilters,
    
    // ✅ PRESETS Y UI
    toggleAdvancedFilters,  // ✅ AGREGAR
    updateAdvancedFilter,   // ✅ AGREGAR
    applyPreset,           // ✅ AGREGAR
    
    // ✅ FUNCIONES PARA COMUNAS
    addCommune,
    removeCommune,
    toggleCommune
  }
}