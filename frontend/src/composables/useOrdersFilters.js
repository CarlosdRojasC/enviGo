// frontend/src/composables/useOrdersFilters.js - VERSIÓN UNIFICADA ESTILO ADMIN
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'

/**
 * 🔧 COMPOSABLE UNIFICADO PARA FILTROS DE PEDIDOS
 * Basado en el estilo AdminOrdersFilters pero funciona para ambos casos
 * 
 * @param {Object} orders - Ref de pedidos activos
 * @param {Function} fetchOrders - Función para obtener pedidos
 * @param {Object} options - Configuración adicional
 * @returns {Object} - API del composable
 */
export function useOrdersFilters(orders, fetchOrders, options = {}) {
  const auth = useAuthStore()
  
  // ==================== CONFIGURACIÓN AUTOMÁTICA ====================
  const mode = options.mode || (auth.user?.role === 'admin' ? 'admin' : 'company')
  const isAdmin = computed(() => mode === 'admin')
  
  // ==================== ESTADO PRINCIPAL ====================
  
  /**
   * Filtros básicos - formato unificado
   */
  const filters = ref({
    // Filtros comunes
    status: '',
    shipping_commune: [], // Array para múltiples comunas (estilo admin)
    date_from: '',
    date_to: '',
    search: '',
    
    // Filtros específicos de admin
    company_id: isAdmin.value ? '' : auth.user?.company_id || '',
    channel_id: '',
    
    // Filtros de rango
    amount_min: '',
    amount_max: ''
  })

  /**
   * Filtros avanzados - completos como en Admin
   */
  const advancedFilters = ref({
    priority: '',
    shipday_status: '', // assigned, not_assigned, with_driver, without_driver
    customer_email: '',
    order_number: '',
    external_order_id: '',
    has_tracking: '',
    has_proof: '',
    driver_assigned: '',
    
    // Filtros adicionales para admin
    created_by: isAdmin.value ? '' : auth.user?._id,
    last_updated_hours: '', // Últimas X horas
    payment_status: '',
    delivery_window: '' // morning, afternoon, evening
  })

  /**
   * Estado de la UI
   */
  const filtersUI = ref({
    showAdvanced: false,
    activePreset: null,
    communeSearch: '',
    showCommuneDropdown: false
  })

  // ==================== PRESETS INTELIGENTES ====================
  
  /**
   * Presets dinámicos según el rol
   */
  const filterPresets = computed(() => {
    const basePresets = [
      {
        id: 'today',
        name: 'Hoy',
        icon: '📅',
        description: 'Pedidos creados hoy',
        filters: {
          date_from: new Date().toISOString().split('T')[0],
          date_to: new Date().toISOString().split('T')[0]
        }
      },
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
        id: 'this_week',
        name: 'Esta Semana',
        icon: '📊',
        description: 'Pedidos de esta semana',
        filters: {
          date_from: getWeekStart().toISOString().split('T')[0],
          date_to: new Date().toISOString().split('T')[0]
        }
      }
    ]

    // Presets adicionales para admin
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
        },
        {
          id: 'urgent',
          name: 'Urgentes',
          icon: '🚨',
          description: 'Prioridad alta',
          filters: { priority: 'Alta' }
        }
      )
    } else {
      // Presets específicos para company users
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
   * Comunas disponibles desde los pedidos actuales + API
   */
  const availableCommunes = computed(() => {
    if (!orders.value?.length) return []
    
    const communes = new Set()
    
    // Extraer comunas de pedidos actuales
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
   * Cuenta de filtros activos
   */
  const activeFiltersCount = computed(() => {
    let count = 0
    
    // Contar filtros básicos
    Object.entries(filters.value).forEach(([key, value]) => {
      if (key === 'shipping_commune') {
        if (Array.isArray(value) && value.length > 0) count++
      } else if (key === 'company_id' && !isAdmin.value) {
        // No contar company_id para usuarios no admin (es automático)
        return
      } else if (value !== '' && value !== null && value !== undefined) {
        count++
      }
    })
    
    // Contar filtros avanzados
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
   * Todos los filtros combinados para export
   */
  const allFilters = computed(() => ({
    ...filters.value,
    ...advancedFilters.value
  }))

  /**
   * Resumen de filtros activos
   */
  const filterSummary = computed(() => {
    const summary = []
    
    if (filters.value.company_id && isAdmin.value) {
      summary.push(`Empresa: ${getCompanyName(filters.value.company_id)}`)
    }
    
    if (filters.value.status) {
      summary.push(`Estado: ${getStatusDisplayName(filters.value.status)}`)
    }
    
    if (filters.value.shipping_commune?.length) {
      summary.push(`Comunas: ${filters.value.shipping_commune.join(', ')}`)
    }
    
    if (filters.value.date_from) {
      summary.push(`Desde: ${formatDate(filters.value.date_from)}`)
    }
    
    if (filters.value.date_to) {
      summary.push(`Hasta: ${formatDate(filters.value.date_to)}`)
    }
    
    if (filters.value.search) {
      summary.push(`Búsqueda: "${filters.value.search}"`)
    }
    
    return summary
  })

  // ==================== CORE METHODS ====================

  /**
   * 🎯 Aplicar filtros con debounce inteligente
   */
  function applyFilters() {
    console.log(`🎯 [${mode.toUpperCase()}] Applying filters:`, filters.value)
    
    const cleanFilters = {}
    
    // Procesar filtros básicos
    Object.entries(filters.value).forEach(([key, value]) => {
      if (key === 'shipping_commune') {
        // Convertir array de comunas a string separado por comas
        if (Array.isArray(value) && value.length > 0) {
          cleanFilters[key] = value.join(',')
        }
      } else if (key === 'company_id' && !isAdmin.value) {
        // Para usuarios no admin, siempre incluir su company_id
        cleanFilters[key] = auth.user?.company_id || value
      } else if (value !== '' && value !== null && value !== undefined) {
        cleanFilters[key] = value
      }
    })
    
    // Incluir filtros avanzados si están activos
    if (filtersUI.value.showAdvanced) {
      Object.entries(advancedFilters.value).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          cleanFilters[key] = value
        }
      })
    }
    
    console.log(`📡 [${mode.toUpperCase()}] Sending filters to API:`, cleanFilters)
    fetchOrders(cleanFilters)
  }

  /**
   * 🔄 Manejar cambio de filtro con debounce
   */
  let filterTimeout
  function handleFilterChange(key, value) {
    console.log(`🔄 [${mode.toUpperCase()}] Filter changed:`, { key, value })
    
    // Actualizar el filtro
    if (key in filters.value) {
      filters.value[key] = value
    } else if (key in advancedFilters.value) {
      advancedFilters.value[key] = value
    }
    
    // Aplicar debounce para búsqueda y comunas
    if (key === 'search' || key === 'shipping_commune' || key === 'customer_email') {
      clearTimeout(filterTimeout)
      filterTimeout = setTimeout(() => {
        applyFilters()
      }, 500)
    } else {
      // Otros filtros se aplican inmediatamente
      applyFilters()
    }
  }

  /**
   * 🎨 Aplicar preset de filtros
   */
  function applyPreset(presetId) {
    console.log(`🎨 [${mode.toUpperCase()}] Applying preset:`, presetId)
    
    const preset = filterPresets.value.find(p => p.id === presetId)
    if (!preset) {
      console.warn('❌ Preset no encontrado:', presetId)
      return
    }
    
    // Resetear filtros
    resetFilters(false) // No aplicar automáticamente
    
    // Aplicar filtros del preset
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
   * 🧹 Resetear todos los filtros
   */
  function resetFilters(applyImmediately = true) {
    console.log(`🧹 [${mode.toUpperCase()}] Resetting filters`)
    
    // Resetear filtros básicos
    filters.value = {
      status: '',
      shipping_commune: [],
      date_from: '',
      date_to: '',
      search: '',
      company_id: isAdmin.value ? '' : auth.user?.company_id || '',
      channel_id: '',
      amount_min: '',
      amount_max: ''
    }
    
    // Resetear filtros avanzados
    Object.keys(advancedFilters.value).forEach(key => {
      advancedFilters.value[key] = ''
    })
    
    // Resetear UI
    filtersUI.value.activePreset = null
    filtersUI.value.communeSearch = ''
    filtersUI.value.showCommuneDropdown = false
    
    if (applyImmediately) {
      applyFilters()
    }
  }

  // ==================== FILTROS AVANZADOS ====================

  /**
   * 🔧 Toggle filtros avanzados
   */
  function toggleAdvancedFilters() {
    filtersUI.value.showAdvanced = !filtersUI.value.showAdvanced
    console.log(`🔧 [${mode.toUpperCase()}] Advanced filters:`, filtersUI.value.showAdvanced ? 'ON' : 'OFF')
  }

  /**
   * ⚙️ Actualizar filtro avanzado
   */
  function updateAdvancedFilter(key, value) {
    console.log(`⚙️ [${mode.toUpperCase()}] Advanced filter changed:`, { key, value })
    
    if (key in advancedFilters.value) {
      advancedFilters.value[key] = value
      
      // Aplicar con debounce para campos de texto
      if (typeof value === 'string' && ['customer_email', 'order_number'].includes(key)) {
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

  /**
   * ➕ Agregar comuna
   */
  function addCommune(commune) {
    console.log(`➕ [${mode.toUpperCase()}] Adding commune:`, commune)
    
    if (!filters.value.shipping_commune.includes(commune)) {
      filters.value.shipping_commune.push(commune)
      filtersUI.value.communeSearch = ''
      filtersUI.value.showCommuneDropdown = false
      applyFilters()
    }
  }

  /**
   * ➖ Remover comuna
   */
  function removeCommune(commune) {
    console.log(`➖ [${mode.toUpperCase()}] Removing commune:`, commune)
    
    filters.value.shipping_commune = filters.value.shipping_commune.filter(
      c => c !== commune
    )
    applyFilters()
  }

  /**
   * 🔄 Toggle comuna
   */
  function toggleCommune(commune) {
    if (filters.value.shipping_commune.includes(commune)) {
      removeCommune(commune)
    } else {
      addCommune(commune)
    }
  }

  // ==================== BÚSQUEDA AVANZADA ====================

  /**
   * 🔍 Búsqueda con debounce
   */
  function handleSearch(searchTerm) {
    handleFilterChange('search', searchTerm)
  }

  /**
   * 🔍 Búsqueda directa sin debounce
   */
  function applySearch(searchTerm) {
    filters.value.search = searchTerm
    applyFilters()
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Obtener inicio de la semana
   */
  function getWeekStart() {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Lunes como inicio
    return new Date(now.setDate(diff))
  }

  /**
   * Obtener nombre de empresa
   */
  function getCompanyName(companyId) {
    // Esta función debería venir del contexto o ser inyectada
    return `Empresa ${companyId}`
  }

  /**
   * Obtener nombre de estado para display
   */
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

  /**
   * Formatear fecha para display
   */
  function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  /**
   * Validar rango de fechas
   */
  function validateDateRange() {
    if (filters.value.date_from && filters.value.date_to) {
      return new Date(filters.value.date_from) <= new Date(filters.value.date_to)
    }
    return true
  }

  // ==================== WATCHERS ====================

  // Validar fechas cuando cambian
  watch(
    [() => filters.value.date_from, () => filters.value.date_to],
    () => {
      if (!validateDateRange()) {
        console.warn('⚠️ Rango de fechas inválido')
      }
    }
  )

  // Limpiar preset activo cuando se modifica un filtro manualmente
  watch(
    filters,
    () => {
      if (filtersUI.value.activePreset) {
        filtersUI.value.activePreset = null
      }
    },
    { deep: true }
  )

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
    filterSummary,
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
    
    // Legacy methods para compatibilidad
    setFilter: (key, value) => handleFilterChange(key, value),
    getFilter: (key) => filters.value[key] || advancedFilters.value[key],
    exportFilters: () => ({ ...allFilters.value }),
    importFilters: (newFilters) => {
      Object.entries(newFilters).forEach(([key, value]) => {
        handleFilterChange(key, value)
      })
    },
    clearAllFilters: () => resetFilters(),
    
    // Métodos de UI
    handleFilterObjectChange: (newFilters) => {
      Object.entries(newFilters).forEach(([key, value]) => {
        handleFilterChange(key, value)
      })
    },
    
    // Funciones específicas para comunas (compatibilidad)
    fetchAvailableCommunes: () => {
      console.log('🏘️ Available communes updated from orders')
    }
  }
}