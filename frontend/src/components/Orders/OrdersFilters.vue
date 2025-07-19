<!-- frontend/src/components/Orders/OrdersFilters.vue -->
<template>
  <div class="filters-container">
    <!-- Filtros principales -->
    <div class="filters-main">
      <div class="filters-row">
        <!-- Status Filter -->
        <div class="filter-group">
          <label class="filter-label">Estado</label>
          <select 
            v-model="localFilters.status" 
            @change="emitChange" 
            class="filter-select status-select"
          >
            <option value="">📋 Todos los estados</option>
            <option value="pending">⏳ Pendientes</option>
            <option value="processing">⚙️ Procesando</option>
            <option value="ready_for_pickup">📦 Listos para Retiro</option>
            <option value="shipped">🚚 En Tránsito</option>
            <option value="delivered">✅ Entregados</option>
            <option value="cancelled">❌ Cancelados</option>
          </select>
        </div>

        <!-- Channel Filter -->
        <div class="filter-group">
          <label class="filter-label">Canal</label>
          <select 
            v-model="localFilters.channel_id" 
            @change="emitChange" 
            class="filter-select channel-select"
          >
            <option value="">🏪 Todos los canales</option>
            <option 
              v-for="channel in channels" 
              :key="channel._id" 
              :value="channel._id"
            >
              {{ getChannelIcon(channel.channel_type) }} {{ channel.channel_name }}
            </option>
          </select>
        </div>

        <!-- Commune Filter -->
<div class="filter-group">
  <label class="filter-label">Comunas</label>
  <select 
    v-model="filters.shipping_commune" 
    @change="handleFilterChange('shipping_commune', filters.shipping_commune)"
    multiple
    class="filter-select commune-select"
  >
    <option 
      v-for="commune in availableCommunes" 
      :key="commune" 
      :value="commune"
    >
      {{ commune }}
    </option>
  </select>
  
  <!-- Mostrar comunas seleccionadas -->
  <div v-if="filters.shipping_commune.length > 0" class="selected-communes">
    <span 
      v-for="commune in filters.shipping_commune" 
      :key="commune"
      class="commune-tag"
    >
      {{ commune }}
      <button 
        @click="removeCommune(commune)"
        class="remove-commune"
      >
        ×
      </button>
    </span>
  </div>
</div>

        <!-- Date Range -->
        <div class="filter-group date-range">
          <label class="filter-label">Rango de Fechas</label>
          <div class="date-inputs">
            <input 
              type="date" 
              v-model="localFilters.date_from" 
              @change="emitChange" 
              class="filter-input date-input"
              placeholder="Desde"
            />
            <span class="date-separator">—</span>
            <input 
              type="date" 
              v-model="localFilters.date_to" 
              @change="emitChange" 
              class="filter-input date-input"
              placeholder="Hasta"
            />
          </div>
        </div>

        <!-- Search -->
        <div class="filter-group search-group">
          <label class="filter-label">Búsqueda</label>
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              v-model="searchTerm" 
              @input="debouncedSearch" 
              placeholder="Buscar por #pedido, cliente, email..."
              class="filter-input search-input"
            />
            <button 
              v-if="searchTerm" 
              @click="clearSearch" 
              class="clear-search-btn"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Presets de filtros rápidos -->
    <div class="filter-presets" v-if="presets.length > 0">
      <div class="presets-header">
        <span class="presets-icon">⭐</span>
        <span class="presets-label">Filtros Rápidos:</span>
      </div>
      
      <div class="presets-buttons">
        <button 
          v-for="preset in presets" 
          :key="preset.id"
          @click="applyPreset(preset.id)"
          class="preset-btn"
          :class="{ 'active': isPresetActive(preset) }"
          :title="preset.description"
        >
          <span class="preset-icon">{{ preset.icon }}</span>
          <span class="preset-name">{{ preset.name }}</span>
        </button>
      </div>
    </div>

    <!-- Filtros avanzados toggle -->
    <div class="advanced-section">
      <div class="advanced-header">
        <button 
          @click="toggleAdvanced" 
          class="advanced-toggle-btn"
          :class="{ 'active': showAdvanced }"
        >
          <span class="toggle-icon">⚙️</span>
          <span class="toggle-text">Filtros Avanzados</span>
          <span class="toggle-arrow">{{ showAdvanced ? '▲' : '▼' }}</span>
        </button>
        
        <div class="filters-summary" v-if="activeCount > 0">
          <span class="active-badge">{{ activeCount }}</span>
          <span class="active-text">filtro{{ activeCount !== 1 ? 's' : '' }} activo{{ activeCount !== 1 ? 's' : '' }}</span>
          <button @click="clearAllFilters" class="clear-all-btn">
            Limpiar todo
          </button>
        </div>
      </div>

      <!-- Filtros avanzados colapsables -->
      <transition name="slide-down">
        <div v-if="showAdvanced" class="advanced-filters">
          <div class="advanced-row">
            <!-- Amount Range -->
            <div class="advanced-group">
              <label class="advanced-label">Rango de Monto</label>
              <div class="range-inputs">
                <div class="range-input-wrapper">
                  <span class="currency-symbol">$</span>
                  <input 
                    type="number" 
                    v-model="localAdvancedFilters.amount_min" 
                    @change="emitAdvancedChange"
                    placeholder="Mínimo" 
                    class="advanced-input amount-input"
                    min="0"
                    step="1000"
                  />
                </div>
                <span class="range-separator">—</span>
                <div class="range-input-wrapper">
                  <span class="currency-symbol">$</span>
                  <input 
                    type="number" 
                    v-model="localAdvancedFilters.amount_max" 
                    @change="emitAdvancedChange"
                    placeholder="Máximo" 
                    class="advanced-input amount-input"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
            </div>

            <!-- Customer Email -->
            <div class="advanced-group">
              <label class="advanced-label">Email del Cliente</label>
              <div class="email-input-wrapper">
                <span class="email-icon">📧</span>
                <input 
                  type="email" 
                  v-model="localAdvancedFilters.customer_email" 
                  @change="emitAdvancedChange"
                  placeholder="ejemplo@email.com" 
                  class="advanced-input email-input"
                />
              </div>
            </div>

            <!-- Order Number -->
            <div class="advanced-group">
              <label class="advanced-label">Número de Pedido</label>
              <div class="order-input-wrapper">
                <span class="order-icon">#</span>
                <input 
                  type="text" 
                  v-model="localAdvancedFilters.order_number" 
                  @change="emitAdvancedChange"
                  placeholder="Número específico" 
                  class="advanced-input order-input"
                />
              </div>
            </div>

            <!-- Tracking Status -->
            <div class="advanced-group">
              <label class="advanced-label">Estado de Tracking</label>
              <select 
                v-model="localAdvancedFilters.has_tracking" 
                @change="emitAdvancedChange"
                class="advanced-select tracking-select"
              >
                <option value="">Todos</option>
                <option value="yes">Con tracking</option>
                <option value="no">Sin tracking</option>
                <option value="live">Tracking en vivo</option>
              </select>
            </div>

            <!-- Proof of Delivery -->
            <div class="advanced-group">
              <label class="advanced-label">Prueba de Entrega</label>
              <select 
                v-model="localAdvancedFilters.has_proof" 
                @change="emitAdvancedChange"
                class="advanced-select proof-select"
              >
                <option value="">Todos</option>
                <option value="yes">Con prueba</option>
                <option value="no">Sin prueba</option>
                <option value="photo">Con foto</option>
                <option value="signature">Con firma</option>
              </select>
            </div>

            <!-- Priority -->
            <div class="advanced-group">
              <label class="advanced-label">Prioridad</label>
              <select 
                v-model="localAdvancedFilters.priority" 
                @change="emitAdvancedChange"
                class="advanced-select priority-select"
              >
                <option value="">Todas</option>
                <option value="high">🔴 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">🟢 Baja</option>
              </select>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  advancedFilters: {
    type: Object,
    required: true
  },
  channels: {
    type: Array,
    default: () => []
  },
  availableCommunes: {
    type: Array,
    default: () => []
  },
  presets: {
    type: Array,
    default: () => []
  },
  showAdvanced: {
    type: Boolean,
    default: false
  },
  activeCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'filter-change', 
  'advanced-change', 
  'apply-preset', 
  'toggle-advanced', 
  'search',
  'clear-all'
])

// Local reactive copies
const localFilters = ref({ ...props.filters, shipping_commune: Array.isArray(props.filters.shipping_commune) ? props.filters.shipping_commune : [] });const localAdvancedFilters = ref({ ...props.advancedFilters })
const searchTerm = ref(props.filters.search || '')

const communeInput = ref(null);
const showCommuneDropdown = ref(false);
const communeSearch = ref('');

const filteredCommunes = computed(() => {
  return props.availableCommunes.filter(commune =>
    !localFilters.value.shipping_commune.includes(commune) &&
    commune.toLowerCase().includes(communeSearch.value.toLowerCase())
  ).sort();
});

// Watch for external changes
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
  searchTerm.value = newFilters.search || ''
}, { deep: true })

watch(() => props.advancedFilters, (newFilters) => {
  localAdvancedFilters.value = { ...newFilters }
}, { deep: true })


function addCommune(commune) {
  if (!localFilters.value.shipping_commune.includes(commune)) {
    localFilters.value.shipping_commune.push(commune);
    communeSearch.value = '';
    emitChange();
  }
}

function removeCommune(communeToRemove) {
  localFilters.value.shipping_commune = localFilters.value.shipping_commune.filter(c => c !== communeToRemove);
  emitChange();
}
function focusInput() {
  communeInput.value?.focus();
}

function closeDropdown() {
  setTimeout(() => { showCommuneDropdown.value = false; }, 200);
}


// Methods
function emitChange() {
  emit('filter-change', { shipping_commune: localFilters.value.shipping_commune });
}

function emitAdvancedChange() {
  emit('advanced-change', localAdvancedFilters.value)
}

function toggleAdvanced() {
  emit('toggle-advanced')
}

function applyPreset(presetId) {
  emit('apply-preset', presetId)
}

function clearAllFilters() {
  // Clear local filters
  Object.keys(localFilters.value).forEach(key => {
    localFilters.value[key] = ''
  })
  Object.keys(localAdvancedFilters.value).forEach(key => {
    localAdvancedFilters.value[key] = ''
  })
  searchTerm.value = ''
  
  emit('clear-all')
}

function clearSearch() {
  searchTerm.value = ''
  debouncedSearch()
}

// Debounced search
let searchTimeout
function debouncedSearch() {
  // Cancela el timeout anterior si el usuario sigue escribiendo
  clearTimeout(searchTimeout);

  // Establece un nuevo timeout de 500ms
  searchTimeout = setTimeout(() => {
    // Cuando el tiempo pasa, emite el evento 'search' al componente padre
    emit('search', searchTerm.value);
  }, 500); 
}

// Utility functions
function getChannelIcon(channelType) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🏪',
    mercadolibre: '🛒',
    manual: '📝'
  }
  return icons[channelType] || '🏬'
}

function isPresetActive(preset) {
  // Check if current filters match preset filters
  return Object.entries(preset.filters).every(([key, value]) => {
    return localFilters.value[key] === value
  })
}

watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters, shipping_commune: Array.isArray(newFilters.shipping_commune) ? newFilters.shipping_commune : [] };
}, { deep: true });

watch(() => props.filters.search, (newSearchValue) => {
  if (searchTerm.value !== newSearchValue) {
    searchTerm.value = newSearchValue;
  }
});
</script>

<style scoped>
.filters-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

/* Main Filters */
.filters-main {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group.search-group {
  grid-column: span 2;
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

/* Date Range */
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
  font-size: 16px;
}

/* Search Input */
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
  padding-left: 48px;
  padding-right: 40px;
  width: 100%;
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
  font-size: 12px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

/* Filter Presets */
.filter-presets {
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.presets-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.presets-icon {
  font-size: 16px;
}

.presets-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.presets-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.preset-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.preset-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.preset-icon {
  font-size: 14px;
}

.preset-name {
  font-weight: 600;
}

/* Advanced Section */
.advanced-section {
  background: white;
}

.advanced-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.advanced-toggle-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #6366f1;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.advanced-toggle-btn:hover {
  background: #f0f9ff;
}

.advanced-toggle-btn.active {
  background: #e0e7ff;
  color: #4f46e5;
}

.toggle-icon {
  font-size: 16px;
}

.toggle-arrow {
  font-size: 12px;
  transition: transform 0.3s ease;
}

.advanced-toggle-btn.active .toggle-arrow {
  transform: rotate(180deg);
}

.filters-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.active-badge {
  background: #6366f1;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 50%;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.active-text {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.clear-all-btn {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-all-btn:hover {
  background: #fecaca;
}

/* Advanced Filters */
.advanced-filters {
  padding: 24px;
  background: #fafbfc;
}

.advanced-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.advanced-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.advanced-label {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.advanced-input,
.advanced-select {
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s ease;
  outline: none;
}

.advanced-input:focus,
.advanced-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

/* Range Inputs */
.range-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-input-wrapper {
  position: relative;
  flex: 1;
}

.currency-symbol {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 600;
  font-size: 14px;
}

.amount-input {
  padding-left: 32px;
}

.range-separator {
  color: #9ca3af;
  font-weight: 500;
}

/* Email Input */
.email-input-wrapper {
  position: relative;
}

.email-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.email-input {
  padding-left: 36px;
}

/* Order Input */
.order-input-wrapper {
  position: relative;
}

.order-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 600;
}

.order-input {
  padding-left: 32px;
}

/* Slide Animation */
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
  max-height: 300px;
  opacity: 1;
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 1024px) {
  .filters-row {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .filter-group.search-group {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .filters-container {
    margin: 0 -16px 24px -16px;
    border-radius: 0;
  }
  
  .filters-main,
  .filter-presets,
  .advanced-header,
  .advanced-filters {
    padding: 16px;
  }
  
  .filters-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .date-inputs {
    flex-direction: column;
    gap: 8px;
  }
  
  .date-separator {
    display: none;
  }
  
  .presets-buttons {
    gap: 8px;
  }
  
  .preset-btn {
    font-size: 12px;
    padding: 8px 12px;
  }
  
  .advanced-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .advanced-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .filters-summary {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .search-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .filter-select,
  .filter-input,
  .advanced-input,
  .advanced-select {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
/* NUEVOS ESTILOS para el multiselect de comunas */
.multiselect-container {
  position: relative;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 6px;
  cursor: text;
}
.multiselect-selected-tags {
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
}
.multiselect-input {
  border: none;
  outline: none;
  flex-grow: 1;
  padding: 6px;
  font-size: 14px;
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
}

.filter-select[multiple] {
  min-height: 80px;
}

.selected-communes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.commune-tag {
  background: #e0e7ff;
  color: #3730a3;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.remove-commune {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  margin-left: 4px;
}

.remove-commune:hover {
  color: #ef4444;
}
</style>