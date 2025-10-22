<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
    <!-- Filtros Principales -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Empresa (solo admin) -->
        <div v-if="isAdmin">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Empresa
          </label>
          <select
            :value="filters.company_id"
            @change="updateFilter('company_id', $event.target.value)"
            :disabled="loading"
            class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
          >
            <option value="">Todas las empresas</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <!-- Estado -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estado
          </label>
          <select
            :value="filters.status"
            @change="updateFilter('status', $event.target.value)"
            :disabled="loading"
            class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="processing">Procesando</option>
            <option value="ready_for_pickup">Listo para recoger</option>
            <option value="picked_up">Retirado</option>
            <option value="warehouse_received">Recibido en bodega</option>
            <option value="assigned">Asignado</option>
            <option value="shipped">Enviado</option>
            <option value="out_for_delivery">En entrega</option>
            <option value="delivered">Entregado</option>
            <option value="invoiced">Facturado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        <!-- Comuna (Multi-select) -->
        <div class="relative" ref="communeDropdownRef">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Comuna
          </label>
          <button
            @click="toggleCommuneDropdown"
            :disabled="loading"
            class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50 flex items-center justify-between"
          >
            <span class="truncate">
              {{ selectedCommunesText }}
            </span>
            <span class="material-icons text-base">
              {{ showCommuneDropdown ? 'expand_less' : 'expand_more' }}
            </span>
          </button>

          <!-- Selected communes chips -->
          <div v-if="filters.shipping_commune.length > 0" class="flex flex-wrap gap-1 mt-2">
            <span
              v-for="commune in filters.shipping_commune"
              :key="commune"
              class="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-xs font-medium"
            >
              {{ commune }}
              <button
                @click="removeCommune(commune)"
                class="hover:text-indigo-900 dark:hover:text-indigo-100"
              >
                <span class="material-icons text-xs">close</span>
              </button>
            </span>
          </div>

          <!-- Dropdown -->
          <div
            v-if="showCommuneDropdown"
            class="absolute z-[100] mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-h-80 overflow-hidden"
          >
            <div class="p-2 border-b border-gray-200 dark:border-gray-700">
              <div class="relative">
                <span class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  search
                </span>
                <input
                  v-model="communeSearch"
                  type="text"
                  placeholder="Buscar comuna..."
                  class="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  @click.stop
                />
              </div>
            </div>
            <div class="max-h-60 overflow-y-auto">
              <button
                v-for="commune in filteredCommunesNormalized"
                :key="commune"
                @click="addCommune(commune)"
                :disabled="filters.shipping_commune.includes(commune)"
                class="w-full px-4 py-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white transition-colors"
              >
                {{ commune }}
              </button>
              <div v-if="filteredCommunesNormalized.length === 0" class="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay comunas disponibles
              </div>
            </div>
          </div>
        </div>

        <!-- Fechas -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rango de Fechas
          </label>
          <div class="flex items-center gap-2">
            <input
              type="date"
              :value="filters.date_from"
              @change="updateFilter('date_from', $event.target.value)"
              :disabled="loading"
              class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
            />
            <span class="text-gray-500 dark:text-gray-400">-</span>
            <input
              type="date"
              :value="filters.date_to"
              @change="updateFilter('date_to', $event.target.value)"
              :disabled="loading"
              class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Barra de Búsqueda -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div class="relative max-w-2xl mx-auto">
        <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          search
        </span>
        <input
  :value="filters.search"
  @input="onSearchInput" type="text"
  placeholder="Buscar por número de pedido, cliente, email, teléfono..."
  :disabled="loading"
            class="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white disabled:opacity-50"

/>
        <button
          v-if="filters.search"
          @click="updateFilter('search', '')"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <span class="material-icons text-base text-gray-500 dark:text-gray-400">close</span>
        </button>
      </div>
    </div>

    <!-- Filtros Activos -->
    <div v-if="activeFiltersCount > 0" class="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ activeFiltersCount }} filtro(s) activo(s):
          </span>

          <!-- Chips de filtros -->
          <span
            v-if="filters.company_id && isAdmin"
            class="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold">Empresa:</span>
            {{ getCompanyName(filters.company_id) }}
            <button
              @click="updateFilter('company_id', '')"
              class="hover:text-red-600 dark:hover:text-red-400"
            >
              <span class="material-icons text-xs">close</span>
            </button>
          </span>

          <span
            v-if="filters.status"
            class="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold">Estado:</span>
            {{ getStatusDisplayName(filters.status) }}
            <button
              @click="updateFilter('status', '')"
              class="hover:text-red-600 dark:hover:text-red-400"
            >
              <span class="material-icons text-xs">close</span>
            </button>
          </span>

          <span
            v-if="filters.date_from"
            class="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold">Desde:</span>
            {{ formatDate(filters.date_from) }}
            <button
              @click="updateFilter('date_from', '')"
              class="hover:text-red-600 dark:hover:text-red-400"
            >
              <span class="material-icons text-xs">close</span>
            </button>
          </span>

          <span
            v-if="filters.date_to"
            class="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold">Hasta:</span>
            {{ formatDate(filters.date_to) }}
            <button
              @click="updateFilter('date_to', '')"
              class="hover:text-red-600 dark:hover:text-red-400"
            >
              <span class="material-icons text-xs">close</span>
            </button>
          </span>

          <span
            v-if="filters.search"
            class="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold">Búsqueda:</span>
            "{{ filters.search.substring(0, 20) }}{{ filters.search.length > 20 ? '...' : '' }}"
            <button
              @click="updateFilter('search', '')"
              class="hover:text-red-600 dark:hover:text-red-400"
            >
              <span class="material-icons text-xs">close</span>
            </button>
          </span>
        </div>

        <button
          @click="resetFilters"
          :disabled="loading"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <span class="material-icons text-base">clear_all</span>
          <span>Limpiar Filtros</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// ==================== PROPS ====================
const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  companies: {
    type: Array,
    default: () => []
  },
  channels: {
    type: Array,
    default: () => []
  },
  availableCommunes: {
    type: Array,
    default: () => []
  },
  activeFiltersCount: {
    type: Number,
    default: 0
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// ==================== EMITS ====================
const emit = defineEmits([
  'filter-change',
  'reset-filters',
  'add-commune',
  'remove-commune'
])

// ==================== STATE ====================
const showCommuneDropdown = ref(false)
const communeSearch = ref('')
const communeDropdownRef = ref(null)
const searchTimeout = null

// ==================== COMPUTED ====================

/**
 * Normalize communes to Title Case and remove duplicates
 */
const normalizedCommunes = computed(() => {
  if (!props.availableCommunes || props.availableCommunes.length === 0) {
    return []
  }

  const uniqueCommunesMap = new Map()

  props.availableCommunes.forEach(commune => {
    if (!commune || typeof commune !== 'string') return

    // Clave de normalización (minúsculas, sin espacios Y SIN ACENTOS)
    const normalizedKey = commune
      .toLowerCase()
      .trim()
      .normalize('NFD') // <-- AÑADE ESTA LÍNEA
      .replace(/[\u0300-\u036f]/g, '') // <-- Y ESTA LÍNEA

    // Si la comuna aún no está en nuestro mapa, la agregamos
    if (!uniqueCommunesMap.has(normalizedKey)) {
      // Valor formateado (convertir a Title Case)
      const formattedValue = commune
        .trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      uniqueCommunesMap.set(normalizedKey, formattedValue)
    }
  })

  // Obtener los valores del mapa, filtrarlos y ordenarlos.
  return Array.from(uniqueCommunesMap.values())
    .filter(c => c) 
    .sort() 
})

/**
 * Filter communes based on search
 */
const filteredCommunesNormalized = computed(() => {
  if (!communeSearch.value) {
    return normalizedCommunes.value
  }
  
  const search = communeSearch.value.toLowerCase()
  return normalizedCommunes.value.filter(commune =>
    commune.toLowerCase().includes(search)
  )
})

/**
 * Selected communes display text
 */
const selectedCommunesText = computed(() => {
  if (props.filters.shipping_commune.length === 0) {
    return 'Todas las comunas'
  }
  
  if (props.filters.shipping_commune.length === 1) {
    return props.filters.shipping_commune[0]
  }
  
  return `${props.filters.shipping_commune.length} comunas seleccionadas`
})

// ==================== METHODS ====================

/**
 * Update filter value
 */
function updateFilter(key, value) {
  emit('filter-change', key, value)
}
/**
 * Maneja el input de búsqueda con un debounce de 500ms
 */
function onSearchInput(event) {
  // Limpia el temporizador anterior cada vez que se presiona una tecla
  clearTimeout(searchTimeout)

  // Establece un nuevo temporizador
  searchTimeout = setTimeout(() => {
    // Esta función solo se ejecutará 500ms después de que el usuario deje de escribir
    updateFilter('search', event.target.value)
  }, 1000) // Puedes ajustar el tiempo (en ms) como prefieras
}

/**
 * Reset all filters
 */
function resetFilters() {
  emit('reset-filters')
}

/**
 * Toggle commune dropdown
 */
function toggleCommuneDropdown() {
  showCommuneDropdown.value = !showCommuneDropdown.value
  if (showCommuneDropdown.value) {
    communeSearch.value = ''
  }
}

/**
 * Add commune to filter
 */
function addCommune(commune) {
  emit('add-commune', commune)
  // No cerrar el dropdown para permitir múltiples selecciones
}

/**
 * Remove commune from filter
 */
function removeCommune(commune) {
  emit('remove-commune', commune)
}

/**
 * Get company name by ID
 */
function getCompanyName(companyId) {
  const company = props.companies.find(c => c._id === companyId)
  return company?.name || 'N/A'
}

/**
 * Get status display name
 */
function getStatusDisplayName(status) {
  const statusMap = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    invoiced: 'Facturado',
    cancelled: 'Cancelado',
    ready_for_pickup: 'Listo para recoger',
    out_for_delivery: 'En Entrega',
    warehouse_received: 'Recibido en bodega',
    assigned: 'Asignado',
    picked_up: 'Retirado'
  }
  return statusMap[status] || status
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Close dropdown when clicking outside
 */
function handleClickOutside(event) {
  if (communeDropdownRef.value && !communeDropdownRef.value.contains(event.target)) {
    showCommuneDropdown.value = false
  }
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch for filter changes to close dropdown
watch(() => props.filters.shipping_commune, () => {
  // Opcionalmente cerrar el dropdown después de agregar una comuna
  // showCommuneDropdown.value = false
})
</script>

<style scoped>
.material-icons {
  font-size: 1.25rem;
  font-family: 'Material Icons';
}
</style>