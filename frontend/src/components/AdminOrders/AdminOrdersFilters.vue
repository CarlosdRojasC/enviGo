<template>
  <div class="filters-section">
    <!-- MAIN FILTERS ROW -->
    <div class="filters-row">
      <!-- Company Filter -->
      <div class="filter-group">
        <label class="filter-label">Empresa</label>
        <select 
          :value="filters.company_id" 
          @change="updateFilter('company_id', $event.target.value)"
          class="filter-select"
          :disabled="loading"
        >
          <option value="">Todas las Empresas</option>
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
          <option value="pending">Pendientes</option>
          <option value="ready_for_pickup">Listos para Retiro</option>
          <option value="picked_up">Retirados</option>
          <option value="warehouse_received">Recibidos en Bodega</option>
          <option value="processing">Procesando</option>
          <option value="shipped">Enviados</option>
          <option value="delivered">Entregados</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      <!-- Commune Filter -->
      <div class="filter-group">
        <label class="filter-label">Comuna(s)</label>
        <div class="multiselect-container" @click="focusCommuneInput">
          <div class="multiselect-tags">
            <span v-for="commune in filters.shipping_commune" :key="commune" class="tag">
              {{ commune }}
              <button @click.stop="removeCommune(commune)" class="tag-remove">×</button>
            </span>
            <input
              ref="communeInput"
              type="text"
              v-model="communeSearch"
              @focus="showCommuneDropdown = true"
              @blur="closeCommuneDropdown"
              placeholder="Seleccionar comunas..."
              class="multiselect-input"
            />
          </div>
          <transition name="slide-down">
            <div v-if="showCommuneDropdown" class="multiselect-dropdown">
              <div
                v-for="commune in filteredCommunes"
                :key="commune"
                @mousedown.prevent="addCommune(commune)"
                class="dropdown-item"
              >
                {{ commune }}
              </div>
              <div v-if="filteredCommunes.length === 0 && communeSearch" class="dropdown-empty">
                No se encontraron coincidencias.
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- Date From -->
      <div class="filter-group">
        <label class="filter-label">Fecha Desde</label>
        <input 
          type="date" 
          :value="filters.date_from" 
          @change="updateFilter('date_from', $event.target.value)"
          class="filter-input date-input"
          :disabled="loading"
        />
      </div>

      <!-- Date To -->
      <div class="filter-group">
        <label class="filter-label">Fecha Hasta</label>
        <input 
          type="date" 
          :value="filters.date_to" 
          @change="updateFilter('date_to', $event.target.value)"
          class="filter-input date-input"
          :disabled="loading"
          :min="filters.date_from"
        />
      </div>
    </div>

    <!-- SEARCH ROW -->
    <div class="search-row">
      <div class="search-group">
        <label class="filter-label">Buscar</label>
        <div class="search-input-container">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            :value="filters.search" 
            @input="updateFilter('search', $event.target.value)"
            placeholder="Buscar por pedido, cliente, dirección o comuna..."
            class="search-input"
            :disabled="loading"
          />
          <button 
            v-if="filters.search" 
            @click="updateFilter('search', '')"
            class="clear-search-btn"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- FILTER ACTIONS & STATUS -->
    <div class="filter-actions-row">
      <!-- Active Filters Summary -->
      <div class="active-filters" v-if="activeFiltersCount > 0">
        <span class="active-filters-label">
          <span class="filter-icon">🎯</span>
          {{ activeFiltersCount }} filtro{{ activeFiltersCount !== 1 ? 's' : '' }} activo{{ activeFiltersCount !== 1 ? 's' : '' }}:
        </span>
        
        <div class="filter-tags">
          <span v-if="filters.company_id" class="filter-tag">
            <span class="tag-label">Empresa:</span>
            <span class="tag-value">{{ getCompanyName(filters.company_id) }}</span>
            <button @click="updateFilter('company_id', '')" class="tag-remove">✕</button>
          </span>
          
          <span v-if="filters.status" class="filter-tag">
            <span class="tag-label">Estado:</span>
            <span class="tag-value">{{ getStatusDisplayName(filters.status) }}</span>
            <button @click="updateFilter('status', '')" class="tag-remove">✕</button>
          </span>
          
<span v-if="Array.isArray(filters.shipping_commune) && filters.shipping_commune.length" class="filter-tag">
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
          @click="$emit('reset-filters')" 
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
              :value="advancedFilters.amount_min" 
              @input="updateAdvancedFilter('amount_min', $event.target.value)"
              placeholder="Mínimo"
              class="filter-input range-input"
              min="0"
              step="1000"
            />
            <span class="range-separator">a</span>
            <input 
              type="number" 
              :value="advancedFilters.amount_max" 
              @input="updateAdvancedFilter('amount_max', $event.target.value)"
              placeholder="Máximo"
              class="filter-input range-input"
              min="0"
              step="1000"
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
          >
            <option value="">Todas las prioridades</option>
            <option value="Baja">Baja</option>
            <option value="Normal">Normal</option>
            <option value="Alta">Alta</option>
          </select>
        </div>

        <!-- Shipday Status Filter -->
        <div class="advanced-filter-group">
          <label class="filter-label">Estado en Shipday</label>
          <select 
            :value="advancedFilters.shipday_status" 
            @change="updateAdvancedFilter('shipday_status', $event.target.value)"
            class="filter-select"
          >
            <option value="">Todos</option>
            <option value="assigned">Asignados a Shipday</option>
            <option value="not_assigned">No asignados</option>
            <option value="with_driver">Con conductor asignado</option>
            <option value="without_driver">Sin conductor</option>
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
          />
        </div>
      </div>
    </div>

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
          @click="applyPreset('today')"
          class="preset-btn"
          title="Pedidos de hoy"
        >
          📅 Hoy
        </button>
        
        <button 
          @click="applyPreset('pending')"
          class="preset-btn"
          title="Pedidos pendientes"
        >
          ⏳ Pendientes
        </button>
        
        <button 
          @click="applyPreset('ready')"
          class="preset-btn"
          title="Listos para recoger"
        >
          📦 Listos
        </button>
        
        <button 
          @click="applyPreset('unassigned')"
          class="preset-btn"
          title="No asignados a Shipday"
        >
          🚚 Sin Asignar
        </button>
        
        <button 
          @click="applyPreset('this_week')"
          class="preset-btn"
          title="Esta semana"
        >
          📊 Esta Semana
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
  availableCommunes: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// ==================== EMITS ====================
const emit = defineEmits([
  'filter-changed',
  'reset-filters'
])

// ==================== STATE ====================
const showAdvancedFilters = ref(false)
const advancedFilters = ref({
  amount_min: '',
  amount_max: '',
  priority: '',
  shipday_status: '',
  customer_email: ''
})
const communeInput = ref(null);
const showCommuneDropdown = ref(false);
const communeSearch = ref('');

// ==================== COMPUTED ====================

/**
 * Count of active filters
 */
const activeFiltersCount = computed(() => {
  return Object.values(props.filters).filter(value => 
    value !== '' && value !== null && value !== undefined
  ).length
})
const filteredCommunes = computed(() => {
  const currentSelection = Array.isArray(props.filters.shipping_commune) ? props.filters.shipping_commune : [];
  return props.availableCommunes.filter(commune =>
    !currentSelection.includes(commune) &&
    commune.toLowerCase().includes(communeSearch.value.toLowerCase())
  ).sort();
});

// ==================== METHODS ====================

/**
 * Update filter value and emit change
 */
function updateFilter(key, value) {
  emit('filter-changed', key, value)
}
function addCommune(commune) {
  const currentSelection = Array.isArray(props.filters.shipping_commune) ? [...props.filters.shipping_commune] : [];
  if (!currentSelection.includes(commune)) {
    currentSelection.push(commune);
    emit('filter-changed', 'shipping_commune', currentSelection);
  }
  communeSearch.value = '';
}

function removeCommune(commune) {
  const currentSelection = Array.isArray(props.filters.shipping_commune) ? props.filters.shipping_commune.filter(c => c !== commune) : [];
  emit('filter-changed', 'shipping_commune', currentSelection);
}

function focusCommuneInput() {
  communeInput.value?.focus();
}

function closeCommuneDropdown() {
  setTimeout(() => { showCommuneDropdown.value = false; }, 200);
}

/**
 * Update advanced filter value
 */
function updateAdvancedFilter(key, value) {
  advancedFilters.value[key] = value
  // You could emit this too if you want real-time advanced filtering
  // emit('advanced-filter-changed', key, value)
}

/**
 * Toggle advanced filters visibility
 */
function toggleAdvancedFilters() {
  showAdvancedFilters.value = !showAdvancedFilters.value
}

/**
 * Apply preset filters
 */
function applyPreset(preset) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  switch (preset) {
    case 'today':
      updateFilter('date_from', today)
      updateFilter('date_to', today)
      break
      
    case 'pending':
      updateFilter('status', 'pending')
      break
      
    case 'ready':
      updateFilter('status', 'ready_for_pickup')
      break
      
    case 'unassigned':
      // This would need custom logic in the parent component
      // For now, just clear other filters
      emit('reset-filters')
      break
      
    case 'this_week':
      updateFilter('date_from', weekAgo)
      updateFilter('date_to', today)
      break
  }
}

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
  const statusMap = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    ready_for_pickup: 'Listo para recoger',
    warehouse_received: 'Recibido en Bodega',
    picked_up: 'Retirado'
  }
  return statusMap[status] || status
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-CL')
}
</script>

<style scoped>
/* ==================== MAIN LAYOUT ==================== */
.filters-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  overflow: hidden;
}

/* ==================== FILTERS ROW ==================== */
.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.filter-select,
.filter-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-select:disabled,
.filter-input:disabled {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.commune-filter {
  background-color: #f0f9ff;
  border-color: #0ea5e9;
}

.date-input {
  color-scheme: light;
}

.filter-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.note-icon {
  font-size: 14px;
}

/* ==================== SEARCH ROW ==================== */
.search-row {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.search-group {
  max-width: 600px;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-size: 16px;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 12px;
  width: 20px;
  height: 20px;
  border: none;
  background: #e5e7eb;
  color: #6b7280;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.clear-search-btn:hover {
  background: #d1d5db;
  color: #374151;
}

/* ==================== FILTER ACTIONS ROW ==================== */
.filter-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  gap: 16px;
  flex-wrap: wrap;
}

.active-filters {
  flex: 1;
  min-width: 300px;
}

.active-filters-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.filter-icon {
  font-size: 16px;
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
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 12px;
  color: #1e40af;
}

.tag-label {
  font-weight: 500;
}

.tag-value {
  color: #1d4ed8;
}

.tag-remove {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
  border-radius: 2px;
  transition: all 0.2s;
}

.tag-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-filter-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-filter-action:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-filter-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-filter-action.reset {
  color: #dc2626;
  border-color: #fca5a5;
}

.btn-filter-action.reset:hover:not(:disabled) {
  background: #fee2e2;
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

/* ==================== ADVANCED FILTERS ==================== */
.advanced-filters {
  padding: 20px;
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
}

.range-separator {
  color: #6b7280;
  font-weight: 500;
}

/* ==================== FILTER PRESETS ==================== */
.filter-presets {
  padding: 16px 20px;
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
  font-weight: 500;
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
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  transform: translateY(-1px);
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 768px) {
  .filters-row {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }
  
  .search-row {
    padding: 12px 16px;
  }
  
  .filter-actions-row {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px;
  }
  
  .active-filters {
    min-width: auto;
  }
  
  .filter-actions {
    justify-content: center;
  }
  
  .advanced-filters-grid {
    grid-template-columns: 1fr;
  }
  
  .presets-buttons {
    justify-content: center;
  }
  
  .action-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .filter-tags {
    justify-content: center;
  }
  
  .range-inputs {
    flex-direction: column;
    align-items: stretch;
  }
  
  .range-separator {
    text-align: center;
  }
}
.multiselect-container {
  position: relative;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px;
  cursor: text;
  min-height: 42px; /* Misma altura que otros inputs */
  transition: border-color 0.2s, box-shadow 0.2s;
}

.multiselect-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.multiselect-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  display: flex;
  align-items: center;
  background: #e0e7ff;
  color: #4f46e5;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}
.tag-remove {
  background: none;
  border: none;
  color: #4f46e5;
  margin-left: 6px;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}
.multiselect-input {
  border: none;
  outline: none;
  flex-grow: 1;
  padding: 6px;
  font-size: 14px;
  min-width: 150px;
}
.multiselect-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  margin-top: 4px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.dropdown-item {
  padding: 10px 12px;
  cursor: pointer;
}
.dropdown-item:hover {
  background: #f1f5f9;
}
.dropdown-empty {
  padding: 10px 12px;
  color: #6b7280;
  font-style: italic;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease-out;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>