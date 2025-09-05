<!-- frontend/src/components/UnifiedOrdersFilters.vue - COMPONENTE UNIFICADO ESTILO ADMIN -->
<template>
  <div class="filters-container">
    <!-- MAIN FILTERS ROW -->
    <div class="filters-main">
      <div class="filters-row">
        <!-- Company Filter (Solo para Admin) -->
        <div v-if="isAdmin" class="filter-group">
          <label class="filter-label">Empresa</label>
          <select 
            :value="filters.company_id" 
            @change="updateFilter('company_id', $event.target.value)"
            class="filter-select"
            :disabled="loading"
          >
            <option value="">Todas las empresas</option>
            <option 
              v-for="company in companies" 
              :key="company._id" 
              :value="company._id"
            >
              {{ company.name }}
            </option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="filter-group">
          <label class="filter-label">Estado</label>
          <select 
            :value="filters.status" 
            @change="updateFilter('status', $event.target.value)"
            class="filter-select"
            :disabled="loading"
          >
            <option value="">Todos los estados</option>
            <option value="pending">⏳ Pendiente</option>
            <option value="processing">⚙️ Procesando</option>
            <option value="ready_for_pickup">📦 Listo para recoger</option>
            <option value="warehouse_received">🏬 Recibido en bodega</option>
            <option value="assigned">🚚 Asignado</option>
            <option value="shipped">🚛 Enviado</option>
            <option value="delivered">✅ Entregado</option>
            <option value="cancelled">❌ Cancelado</option>
          </select>
        </div>

        <!-- Commune Filter with Multiselect -->
        <div class="filter-group">
          <label class="filter-label">Comunas</label>
          <div class="multiselect-container" ref="communeContainer">
            <div class="multiselect-input" @click="toggleCommuneDropdown">
              <div v-if="filters.shipping_commune.length === 0" class="placeholder">
                Seleccionar comunas...
              </div>
              <div v-else class="selected-communes">
                <span 
                  v-for="commune in filters.shipping_commune.slice(0, 2)" 
                  :key="commune"
                  class="commune-tag"
                >
                  {{ commune }}
                  <button @click.stop="removeCommune(commune)" class="tag-remove">×</button>
                </span>
                <span v-if="filters.shipping_commune.length > 2" class="more-count">
                  +{{ filters.shipping_commune.length - 2 }} más
                </span>
              </div>
              <span class="dropdown-arrow">{{ showCommuneDropdown ? '▲' : '▼' }}</span>
            </div>
            
            <div v-if="showCommuneDropdown" class="multiselect-dropdown">
              <div class="dropdown-search">
                <input 
                  v-model="communeSearch"
                  type="text"
                  placeholder="Buscar comuna..."
                  class="search-input-small"
                  @click.stop
                />
              </div>
              <div class="dropdown-options">
                <div 
                  v-for="commune in filteredCommunes" 
                  :key="commune"
                  @click="addCommune(commune)"
                  class="dropdown-option"
                >
                  {{ commune }}
                </div>
                <div v-if="filteredCommunes.length === 0" class="dropdown-empty">
                  No hay comunas disponibles
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Date Range Filter -->
        <div class="filter-group date-range">
          <label class="filter-label">Rango de Fechas</label>
          <div class="date-inputs">
            <input 
              type="date" 
              :value="filters.date_from" 
              @change="updateFilter('date_from', $event.target.value)"
              class="filter-input date-input"
              :disabled="loading"
            />
            <span class="date-separator">hasta</span>
            <input 
              type="date" 
              :value="filters.date_to" 
              @change="updateFilter('date_to', $event.target.value)"
              class="filter-input date-input"
              :disabled="loading"
            />
          </div>
        </div>

        <!-- Channel Filter (Solo para Admin) -->
        <div v-if="isAdmin" class="filter-group">
          <label class="filter-label">Canal</label>
          <select 
            :value="filters.channel_id" 
            @change="updateFilter('channel_id', $event.target.value)"
            class="filter-select"
            :disabled="loading"
          >
            <option value="">Todos los canales</option>
            <option 
              v-for="channel in channels" 
              :key="channel._id" 
              :value="channel._id"
            >
              {{ getChannelIcon(channel.channel_type) }} {{ channel.channel_name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- SEARCH ROW -->
    <div class="search-row">
      <div class="search-container">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            :value="filters.search"
            @input="updateFilter('search', $event.target.value)"
            type="text"
            placeholder="Buscar por número de pedido, cliente, email..."
            class="search-input"
            :disabled="loading"
          />
          <button 
            v-if="filters.search" 
            @click="updateFilter('search', '')"
            class="clear-search-btn"
            title="Limpiar búsqueda"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- ACTIVE FILTERS & ACTIONS -->
    <div v-if="activeFiltersCount > 0" class="filter-actions-row">
      <div class="active-filters-summary">
        <span class="active-count">
          {{ activeFiltersCount }} filtro{{ activeFiltersCount !== 1 ? 's' : '' }} activo{{ activeFiltersCount !== 1 ? 's' : '' }}:
        </span>
        
        <div class="filter-tags">
          <span v-if="filters.company_id && isAdmin" class="filter-tag">
            <span class="tag-label">Empresa:</span>
            <span class="tag-value">{{ getCompanyName(filters.company_id) }}</span>
            <button @click="updateFilter('company_id', '')" class="tag-remove">✕</button>
          </span>
          
          <span v-if="filters.status" class="filter-tag">
            <span class="tag-label">Estado:</span>
            <span class="tag-value">{{ getStatusDisplayName(filters.status) }}</span>
            <button @click="updateFilter('status', '')" class="tag-remove">✕</button>
          </span>
          
          <span v-if="filters.shipping_commune.length" class="filter-tag">
            <span class="tag-label">Comuna(s):</span>
            <span class="tag-value">{{ filters.shipping_commune.join(', ') }}</span>
            <button @click="updateFilter('shipping_commune', [])" class="tag-remove">✕</button>
          </span>
          
          <span v-if="filters.date_from" class="filter-tag">
            <span class="tag-label">Desde:</span>
            <span class="tag-value">{{ formatDate(filters.date_from) }}</span>
            <button @click="updateFilter('date_from', '')" class="tag-remove">✕</button>
          </span>
          
          <span v-if="filters.date_to" class="filter-tag">
            <span class="tag-label">Hasta:</span>
            <span class="tag-value">{{ formatDate(filters.date_to) }}</span>
            <button @click="updateFilter('date_to', '')" class="tag-remove">✕</button>
          </span>
          
          <span v-if="filters.search" class="filter-tag">
            <span class="tag-label">Búsqueda:</span>
            <span class="tag-value">"{{ filters.search.substring(0, 20) }}{{ filters.search.length > 20 ? '...' : '' }}"</span>
            <button @click="updateFilter('search', '')" class="tag-remove">✕</button>
          </span>
        </div>
      </div>

      <!-- Filter Actions -->
      <div class="filter-actions">
        <button 
          @click="resetFilters" 
          class="btn-filter-action reset"
          :disabled="loading || activeFiltersCount === 0"
          title="Limpiar todos los filtros"
        >
          <span class="action-icon">🗑️</span>
          <span class="action-text">Limpiar Filtros</span>
        </button>
        
        <button 
          @click="toggleAdvancedFilters" 
          class="btn-filter-action toggle"
          :class="{ active: showAdvancedFilters }"
          title="Mostrar filtros avanzados"
        >
          <span class="action-icon">⚙️</span>
          <span class="action-text">Avanzado</span>
          <span class="toggle-icon">{{ showAdvancedFilters ? '▲' : '▼' }}</span>
        </button>
      </div>
    </div>

    <!-- ADVANCED FILTERS (COLLAPSIBLE) -->
    <transition name="slide-down">
      <div v-if="showAdvancedFilters" class="advanced-filters">
        <div class="advanced-filters-header">
          <h4 class="advanced-title">
            <span class="advanced-icon">⚙️</span>
            Filtros Avanzados
          </h4>
        </div>
        
        <div class="advanced-filters-grid">
          <!-- Order Amount Range -->
          <div class="advanced-filter-group">
            <label class="filter-label">Monto del Pedido</label>
            <div class="range-inputs">
              <input 
                type="number" 
                :value="filters.amount_min" 
                @input="updateFilter('amount_min', $event.target.value)"
                placeholder="Mínimo"
                class="filter-input range-input"
                min="0"
                step="1000"
                :disabled="loading"
              />
              <span class="range-separator">a</span>
              <input 
                type="number" 
                :value="filters.amount_max" 
                @input="updateFilter('amount_max', $event.target.value)"
                placeholder="Máximo"
                class="filter-input range-input"
                min="0"
                step="1000"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- Priority Filter -->
          <div class="advanced-filter-group">
            <label class="filter-label">Prioridad</label>
            <select 
              :value="advancedFilters.priority" 
              @change="updateAdvancedFilter('priority', $event.target.value)"
              class="filter-select"
              :disabled="loading"
            >
              <option value="">Todas las prioridades</option>
              <option value="Baja">🟢 Baja</option>
              <option value="Normal">🟡 Normal</option>
              <option value="Alta">🔴 Alta</option>
            </select>
          </div>

          <!-- Shipday Status Filter (Solo Admin) -->
          <div v-if="isAdmin" class="advanced-filter-group">
            <label class="filter-label">Estado en Shipday</label>
            <select 
              :value="advancedFilters.shipday_status" 
              @change="updateAdvancedFilter('shipday_status', $event.target.value)"
              class="filter-select"
              :disabled="loading"
            >
              <option value="">Todos</option>
              <option value="assigned">✅ Asignados a Shipday</option>
              <option value="not_assigned">❌ No asignados</option>
              <option value="with_driver">🚚 Con conductor asignado</option>
              <option value="without_driver">🚫 Sin conductor</option>
            </select>
          </div>

          <!-- Customer Email Filter -->
          <div class="advanced-filter-group">
            <label class="filter-label">Email del Cliente</label>
            <input 
              type="email" 
              :value="advancedFilters.customer_email" 
              @input="updateAdvancedFilter('customer_email', $event.target.value)"
              placeholder="Buscar por email..."
              class="filter-input"
              :disabled="loading"
            />
          </div>

          <!-- Order Number Filter -->
          <div class="advanced-filter-group">
            <label class="filter-label">Número de Pedido</label>
            <input 
              type="text" 
              :value="advancedFilters.order_number" 
              @input="updateAdvancedFilter('order_number', $event.target.value)"
              placeholder="Ej: ORD-001"
              class="filter-input"
              :disabled="loading"
            />
          </div>

          <!-- Has Tracking Filter -->
          <div class="advanced-filter-group">
            <label class="filter-label">Con Seguimiento</label>
            <select 
              :value="advancedFilters.has_tracking" 
              @change="updateAdvancedFilter('has_tracking', $event.target.value)"
              class="filter-select"
              :disabled="loading"
            >
              <option value="">Todos</option>
              <option value="yes">✅ Con seguimiento</option>
              <option value="no">❌ Sin seguimiento</option>
            </select>
          </div>
        </div>
      </div>
    </transition>

    <!-- FILTER PRESETS -->
    <div class="filter-presets">
      <div class="presets-header">
        <span class="presets-label">
          <span class="presets-icon">⭐</span>
          Filtros Rápidos:
        </span>
      </div>
      
      <div class="presets-buttons">
        <button 
          v-for="preset in filterPresets" 
          :key="preset.id"
          @click="applyPreset(preset.id)"
          class="preset-btn"
          :class="{ active: activePreset === preset.id }"
          :title="preset.description"
        >
          <span class="preset-icon">{{ preset.icon }}</span>
          <span class="preset-name">{{ preset.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// ==================== PROPS ====================
const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  advancedFilters: {
    type: Object,
    required: true
  },
  filtersUI: {
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
  filteredCommunes: {
    type: Array,
    default: () => []
  },
  filterPresets: {
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
  },
   companyId: {
    type: String,
    default: null
  }
})

// ==================== EMITS ====================
const emit = defineEmits([
  'filter-change',
  'advanced-filter-change',
  'reset-filters',
  'toggle-advanced',
  'apply-preset',
  'add-commune',
  'remove-commune'
])

// ==================== STATE ====================
const communeContainer = ref(null)
const communeSearch = ref('')
const showCommuneDropdown = ref(false)

// ==================== COMPUTED ====================
const showAdvancedFilters = computed(() => props.filtersUI.showAdvanced)
const activePreset = computed(() => props.filtersUI.activePreset)

const filteredCommunes = computed(() => {
  if (!communeSearch.value) {
    return props.availableCommunes
  }
  return props.availableCommunes.filter(commune => 
    commune.toLowerCase().includes(communeSearch.value.toLowerCase())
  )
})
// ==================== METHODS ====================

/**
 * Update basic filter
 */
function updateFilter(key, value) {
  emit('filter-change', key, value)
}

/**
 * Update advanced filter
 */
function updateAdvancedFilter(key, value) {
  emit('advanced-filter-change', key, value)
}

/**
 * Reset all filters
 */
function resetFilters() {
  emit('reset-filters')
}

/**
 * Toggle advanced filters
 */
function toggleAdvancedFilters() {
  emit('toggle-advanced')
}

/**
 * Apply preset
 */
function applyPreset(presetId) {
  emit('apply-preset', presetId)
}

/**
 * Add commune to selection
 */
function addCommune(commune) {
  emit('add-commune', commune)
  communeSearch.value = ''
  showCommuneDropdown.value = false
}

/**
 * Remove commune from selection
 */
function removeCommune(commune) {
  emit('remove-commune', commune)
}

/**
 * Toggle commune dropdown
 */
function toggleCommuneDropdown() {
  showCommuneDropdown.value = !showCommuneDropdown.value
}

/**
 * Close commune dropdown when clicking outside
 */
function handleClickOutside(event) {
  if (communeContainer.value && !communeContainer.value.contains(event.target)) {
    showCommuneDropdown.value = false
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get company name by ID
 */
function getCompanyName(companyId) {
  const company = props.companies.find(c => c._id === companyId)
  return company?.name || 'Empresa Desconocida'
}

/**
 * Get status display name
 */
function getStatusDisplayName(status) {
  const statusNames = {
    'pending': 'Pendiente',
    'processing': 'Procesando',
    'ready_for_pickup': 'Listo',
    'assigned': 'Asignado',
    'out_for_delivery': 'En Entrega',
    'warehouse_received': 'Recibido en Bodega',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  }
  return statusNames[status] || status
}

/**
 * Get channel icon
 */
function getChannelIcon(channelType) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🏪',
    mercadolibre: '🛒',
    manual: '📝'
  }
  return icons[channelType] || '🏬'
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-CL')
}

// Observador que reacciona cuando la prop `companyId` se recibe o cambia.
watch(() => props.companyId, (newId) => {
  if (newId) {
    // Si se recibe un ID de compañía, se lo pasamos al filtro interno.
    // Esto asegura que todas las búsquedas futuras incluyan este ID.
    updateFilter('company_id', newId);
  }
}, { immediate: true }); // `immediate: true` hace que se ejecute al montar el componente.

// ==================== LIFECYCLE ====================
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
   if (!props.isAdmin && props.companyId) {
     updateFilter('company_id', props.companyId);
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ==================== CONTAINER ==================== */
.filters-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

/* ==================== MAIN FILTERS ==================== */
.filters-main {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group.date-range {
  min-width: 280px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.filter-select,
.filter-input {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  transition: all 0.3s ease;
  outline: none;
}

.filter-select:focus,
.filter-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

.filter-select:hover,
.filter-input:hover {
  border-color: #cbd5e1;
}

.filter-select:disabled,
.filter-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== DATE RANGE ==================== */
.date-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-input {
  flex: 1;
  min-width: 0;
}

.date-separator {
  color: #6b7280;
  font-weight: 500;
  font-size: 12px;
}

/* ==================== MULTISELECT COMMUNES ==================== */
.multiselect-container {
  position: relative;
}

.multiselect-input {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.multiselect-input:hover {
  border-color: #cbd5e1;
}

.multiselect-input:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.placeholder {
  color: #6b7280;
  font-size: 14px;
}

.selected-communes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.commune-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.tag-remove:hover {
  background: #c7d2fe;
}

.more-count {
  padding: 4px 8px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.dropdown-arrow {
  color: #6b7280;
  font-size: 12px;
  margin-left: 8px;
}

.multiselect-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 4px;
  max-height: 200px;
  overflow: hidden;
}

.dropdown-search {
  padding: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.search-input-small {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.search-input-small:focus {
  border-color: #6366f1;
}

.dropdown-options {
  max-height: 150px;
  overflow-y: auto;
}

.dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s ease;
}

.dropdown-option:hover {
  background: #f8fafc;
}

.dropdown-empty {
  padding: 16px 12px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
  font-style: italic;
}

/* ==================== SEARCH ROW ==================== */
.search-row {
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #f1f5f9;
}

.search-container {
  max-width: 600px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  font-size: 16px;
  color: #6b7280;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 16px 16px 16px 48px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  transition: all 0.3s ease;
  outline: none;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

/* ==================== FILTER ACTIONS ROW ==================== */
.filter-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 16px;
}

.active-filters-summary {
  flex: 1;
  min-width: 0;
}

.active-count {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  display: block;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
}

.tag-label {
  font-weight: 500;
  color: #6b7280;
}

.tag-value {
  font-weight: 600;
  color: #1f2937;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.btn-filter-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-filter-action:hover:not(:disabled) {
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.btn-filter-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-filter-action.reset {
  border-color: #fca5a5;
  color: #dc2626;
}

.btn-filter-action.reset:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #f87171;
}

.btn-filter-action.toggle.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.toggle-icon {
  font-size: 12px;
  margin-left: 4px;
}

.action-icon {
  font-size: 14px;
}

/* ==================== ADVANCED FILTERS ==================== */
.advanced-filters {
  padding: 20px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.advanced-filters-header {
  margin-bottom: 16px;
}

.advanced-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.advanced-icon {
  font-size: 18px;
}

.advanced-filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.advanced-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-input {
  flex: 1;
  min-width: 0;
}

.range-separator {
  color: #6b7280;
  font-weight: 500;
  font-size: 12px;
}

/* ==================== FILTER PRESETS ==================== */
.filter-presets {
  padding: 16px 24px;
  background: #f1f5f9;
}

.presets-header {
  margin-bottom: 12px;
}

.presets-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.presets-icon {
  font-size: 16px;
}

.presets-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  transform: translateY(-1px);
}

.preset-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.preset-icon {
  font-size: 14px;
}

.preset-name {
  font-weight: 600;
}

/* ==================== ANIMATIONS ==================== */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 500px;
  opacity: 1;
  transform: translateY(0);
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 768px) {
  .filters-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .filter-actions-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-tags {
    justify-content: center;
  }
  
  .filter-actions {
    justify-content: center;
  }
  
  .advanced-filters-grid {
    grid-template-columns: 1fr;
  }
  
  .date-inputs {
    flex-direction: column;
    gap: 8px;
  }
  
  .date-separator {
    display: none;
  }
}

@media (max-width: 480px) {
  .filters-main,
  .search-row,
  .filter-actions-row,
  .advanced-filters,
  .filter-presets {
    padding: 16px;
  }
  
  .filter-select,
  .filter-input,
  .search-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
</style>