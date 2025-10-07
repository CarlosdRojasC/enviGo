// composables/useOrdersFilters.js - OPTIMIZADO CON DEBOUNCE Y CACHE
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import { logger } from '../services/logger.service'

// ✅ HELPER PARA DEBOUNCE (sin necesidad de lodash)
function debounce(fn, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function useOrdersFilters(orders, fetchOrders, options = {}) {
  const toast = useToast()
  
  // ==================== CONFIGURACIÓN ====================
  const CONFIG = {
    SEARCH_DEBOUNCE: 800,        // 800ms para búsqueda
    FILTER_DEBOUNCE: 500,        // 500ms para filtros normales
    CACHE_DURATION: 30000,       // 30 segundos
    COMMUNES_CACHE_DURATION: 5 * 60 * 1000  // 5 minutos para comunas
  }
  
  // ==================== STATE ====================
  const filters = ref({
    company_id: '',
    status: '',
    shipping_commune: [],
    date_from: '',
    date_to: '',
    search: '',
    channel_id: '',
    amount_min: '',
    amount_max: '',
    priority: '',
    shipday_status: '',
    customer_email: '',
    order_number: '',
    has_tracking: ''
  })

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

  const filtersUI = ref({
    showAdvanced: false,
    activePreset: null,
    savedPresets: []
  })

  const availableCommunes = ref([])
  const loadingCommunes = ref(false)
  
  // ✅ NUEVO: Cache para comunas
  const communesCache = ref({
    data: [],
    timestamp: null,
    companyId: null
  })

  // ✅ NUEVO: Cache para filtros aplicados
  const filtersCache = new Map()
  const lastAppliedFilters = ref(null)

  // ==================== COMPUTED ====================
  
  const activeFiltersCount = computed(() => {
    return Object.values(filters.value).filter(value => 
      value !== '' && 
      value !== null && 
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0)
    ).length
  })

  const hasActiveFilters = computed(() => {
    return activeFiltersCount.value > 0
  })

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
   * ✅ CARGAR COMUNAS CON CACHE
   */
  async function fetchAvailableCommunes(companyId = null) {
    try {
      // ✅ VERIFICAR CACHE PRIMERO
      const now = Date.now()
      const cacheValid = 
        communesCache.value.timestamp &&
        (now - communesCache.value.timestamp < CONFIG.COMMUNES_CACHE_DURATION) &&
        communesCache.value.companyId === companyId

      if (cacheValid && communesCache.value.data.length > 0) {
        logger.dev('📦 Using cached communes data')
        availableCommunes.value = communesCache.value.data
        return
      }

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
        
        // ✅ GUARDAR EN CACHE
        communesCache.value = {
          data: response.data.communes,
          timestamp: Date.now(),
          companyId: companyId
        }
        
        logger.success('✅ Communes loaded and cached:', availableCommunes.value.length)
      } else {
        availableCommunes.value = []
        logger.warn('⚠️ No communes data received:', response.data)
      }
      
    } catch (error) {
      logger.error('❌ Error fetching communes:', error)
      availableCommunes.value = []
      
      if (error.response?.status === 401) {
        toast.error('Error de autenticación al cargar comunas')
      }
    } finally {
      loadingCommunes.value = false
    }
  }

  /**
   * ✅ APPLY FILTERS CON CACHE Y DEDUPLICACIÓN
   */
  function applyFiltersInternal() {
    logger.debug('🎯 Applying filters:', filters.value)
    
    const cleanFilters = {}
    
    Object.entries(filters.value).forEach(([key, value]) => {
      if (key === 'shipping_commune') {
        if (Array.isArray(value) && value.length > 0) {
          cleanFilters[key] = value.join(',')
        }
      } else if (value !== '' && value !== null && value !== undefined) {
        cleanFilters[key] = value
      }
    })
    
    // ✅ VERIFICAR SI LOS FILTROS CAMBIARON
    const filtersKey = JSON.stringify(cleanFilters)
    const lastFiltersKey = JSON.stringify(lastAppliedFilters.value || {})
    
    if (filtersKey === lastFiltersKey) {
      logger.dev('⏭️ Filters unchanged, skipping request')
      return
    }
    
    // ✅ VERIFICAR CACHE
    const cached = filtersCache.get(filtersKey)
    if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION)) {
      logger.dev('📦 Using cached filter results')
      // No hacer request, los datos ya están en orders.value
      return
    }
    
    logger.debug('📡 Sending filters to backend:', cleanFilters)
    lastAppliedFilters.value = cleanFilters
    
    // Llamar fetchOrders con los filtros limpios
    if (fetchOrders) {
      fetchOrders(cleanFilters).then(() => {
        // ✅ GUARDAR EN CACHE DESPUÉS DEL REQUEST
        filtersCache.set(filtersKey, {
          timestamp: Date.now()
        })
      })
    }
  }

  // ✅ CREAR VERSIONES DEBOUNCED
  const debouncedApplyFilters = debounce(applyFiltersInternal, CONFIG.FILTER_DEBOUNCE)
  const debouncedApplyFiltersSearch = debounce(applyFiltersInternal, CONFIG.SEARCH_DEBOUNCE)

  /**
   * ✅ HANDLE FILTER CHANGE CON DEBOUNCE INTELIGENTE
   */
  const handleFilterChange = async (key, value) => {
    logger.dev(`🔄 handleFilterChange: ${key} = ${value}`)
    
    // ✅ VALIDAR ObjectIds
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
    
    // ✅ SI CAMBIA LA EMPRESA, RECARGAR COMUNAS (sin debounce, pero con cache)
    if (key === 'company_id') {
      logger.dev('🏢 Company filter changed, reloading communes...')
      await fetchAvailableCommunes(cleanValue || null)
    }
    
    logger.debug('🧹 Filtros después del cambio:', filters.value)
    
    // ✅ APLICAR DEBOUNCE SEGÚN EL TIPO DE FILTRO
    if (key === 'search') {
      // Búsqueda tiene más delay
      debouncedApplyFiltersSearch()
    } else {
      // Filtros normales tienen menos delay
      debouncedApplyFilters()
    }
  }

  /**
   * ✅ RESET FILTERS
   */
  const resetFilters = async () => {
    logger.dev('🧹 Limpiando todos los filtros...')
    
    Object.keys(filters.value).forEach(key => {
      if (Array.isArray(filters.value[key])) {
        filters.value[key] = []
      } else {
        filters.value[key] = ''
      }
    })
    
    Object.keys(advancedFilters.value).forEach(key => {
      advancedFilters.value[key] = ''
    })
    
    logger.dev('✅ Filtros limpiados:', filters.value)
    
    // ✅ LIMPIAR CACHE
    filtersCache.clear()
    lastAppliedFilters.value = null
    
    // Aplicar inmediatamente sin debounce al resetear
    applyFiltersInternal()
    toast.success('Filtros limpiados correctamente')
  }

  /**
   * Set individual filter
   */
  const setFilter = (key, value) => {
    if (key in filters.value) {
      filters.value[key] = value
      
      // ✅ APLICAR CON DEBOUNCE
      if (key === 'search') {
        debouncedApplyFiltersSearch()
      } else {
        debouncedApplyFilters()
      }
    }
  }

  const getFilter = (key) => {
    return filters.value[key]
  }

  const exportFilters = () => {
    return { ...filters.value }
  }

  function toggleAdvancedFilters() {
    filtersUI.value.showAdvanced = !filtersUI.value.showAdvanced
    logger.debug('🔧 Advanced filters toggled:', filtersUI.value.showAdvanced)
  }

  /**
   * ✅ UPDATE ADVANCED FILTER CON DEBOUNCE
   */
  function updateAdvancedFilter(key, value) {
    if (key in advancedFilters.value) {
      advancedFilters.value[key] = value
      debouncedApplyFilters() // ✅ CON DEBOUNCE
    }
  }

  function applyPreset(presetId) {
    const preset = filterPresets.value.find(p => p.id === presetId)
    if (!preset) return
    
    logger.dev('🎯 Applying preset:', preset.name)
    
    // Resetear filtros
    Object.keys(filters.value).forEach(key => {
      if (Array.isArray(filters.value[key])) {
        filters.value[key] = []
      } else {
        filters.value[key] = ''
      }
    })
    
    // Aplicar filtros del preset
    Object.entries(preset.filters).forEach(([key, value]) => {
      if (key in filters.value) {
        filters.value[key] = value
      }
      if (key in advancedFilters.value) {
        advancedFilters.value[key] = value
      }
    })
    
    filtersUI.value.activePreset = presetId
    
    // ✅ APLICAR INMEDIATAMENTE SIN DEBOUNCE PARA PRESETS
    applyFiltersInternal()
    
    setTimeout(() => {
      filtersUI.value.activePreset = null
    }, 3000)
  }

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
   * ✅ Agregar comuna con debounce
   */
  function addCommune(commune) {
    logger.dev('🏘️ Agregando comuna:', commune)
    
    if (!filters.value.shipping_commune.includes(commune)) {
      filters.value.shipping_commune.push(commune)
      logger.debug('✅ Comunas actuales:', filters.value.shipping_commune)
      debouncedApplyFilters() // ✅ CON DEBOUNCE
    } else {
      logger.debug('⚠️ Comuna ya existe:', commune)
    }
  }

  /**
   * ✅ Remover comuna con debounce
   */
  function removeCommune(communeToRemove) {
    logger.dev('❌ Removiendo comuna:', communeToRemove)
    
    filters.value.shipping_commune = filters.value.shipping_commune.filter(
      commune => commune !== communeToRemove
    )
    
    logger.debug('📊 Comunas restantes:', filters.value.shipping_commune)
    debouncedApplyFilters() // ✅ CON DEBOUNCE
  }

  function toggleCommune(commune) {
    const index = filters.value.shipping_commune.indexOf(commune)
    if (index === -1) {
      addCommune(commune)
    } else {
      removeCommune(commune)
    }
  }

  // ==================== WATCHERS ====================
  
  // ✅ ELIMINAR WATCHER QUE DUPLICABA REQUESTS
  // El handleFilterChange ya maneja el cambio de company_id
  
  // Validate date range when dates change
  watch(
    [() => filters.value.date_from, () => filters.value.date_to],
    () => {
      if (!validateDateRange()) {
        logger.warn('⚠️ Invalid date range detected')
      }
    }
  )

  // ==================== CLEANUP ====================
  
  /**
   * ✅ FUNCIÓN PARA LIMPIAR CACHE VIEJO
   */
  function cleanupCache() {
    const now = Date.now()
    
    for (const [key, value] of filtersCache.entries()) {
      if (now - value.timestamp > CONFIG.CACHE_DURATION) {
        filtersCache.delete(key)
      }
    }
  }
  
  // Limpiar cache cada minuto
  setInterval(cleanupCache, 60000)

  // ==================== RETURN ====================
  return {
    // STATE
    filters,
    advancedFilters,
    filtersUI,
    availableCommunes,
    loadingCommunes,
    
    // COMPUTED
    activeFiltersCount,
    hasActiveFilters,
    filterPresets,
    allFilters,
    
    // METHODS PRINCIPALES
    handleFilterChange,
    resetFilters,
    setFilter,
    getFilter,
    exportFilters,
    
    // FUNCIONES AUXILIARES
    fetchAvailableCommunes,
    validateDateRange,
    applyFilters: debouncedApplyFilters, // ✅ EXPONER VERSIÓN DEBOUNCED
    
    // PRESETS Y UI
    toggleAdvancedFilters,
    updateAdvancedFilter,
    applyPreset,
    
    // FUNCIONES PARA COMUNAS
    addCommune,
    removeCommune,
    toggleCommune
  }
}