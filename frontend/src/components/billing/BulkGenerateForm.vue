<template>
  <div class="bulk-generate-form">
    <!-- Header -->
    <div class="form-header">
      <h3 class="form-title">
        <span class="title-icon">⚡</span>
        Generación Masiva de Facturas
      </h3>
      <p class="form-description">
        Genera múltiples facturas automáticamente para todas las empresas con pedidos sin facturar
      </p>
    </div>

    <!-- Configuración del período -->
    <div class="form-section">
      <h4 class="section-title">
        <span class="section-icon">📅</span>
        Período de Facturación
      </h4>
      
      <div class="period-config">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Fecha de inicio</label>
            <input 
              v-model="config.period_start" 
              type="date" 
              class="form-input"
              @change="loadPreview"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Fecha de fin</label>
            <input 
              v-model="config.period_end" 
              type="date" 
              class="form-input"
              @change="loadPreview"
              required
            />
          </div>
        </div>

        <div class="period-shortcuts">
          <button type="button" @click="setLastMonth" class="shortcut-btn">
            <span class="btn-icon">📊</span>
            Mes Anterior
          </button>
          <button type="button" @click="setLastQuarter" class="shortcut-btn">
            <span class="btn-icon">📈</span>
            Trimestre Anterior
          </button>
          <button type="button" @click="setCustomRange" class="shortcut-btn">
            <span class="btn-icon">🎯</span>
            Rango Personalizado
          </button>
        </div>
      </div>
    </div>

    <!-- Filtros de empresas -->
    <div class="form-section">
      <h4 class="section-title">
        <span class="section-icon">🏢</span>
        Selección de Empresas
      </h4>
      
      <div class="companies-filter">
        <div class="filter-header">
          <label class="checkbox-wrapper">
            <input 
              type="checkbox" 
              @change="toggleSelectAllCompanies"
              :checked="allCompaniesSelected"
              :indeterminate="someCompaniesSelected"
            />
            <span class="checkbox-custom"></span>
            <span class="checkbox-label">
              Seleccionar todas ({{ selectedCompanies.length }}/{{ eligibleCompanies.length }})
            </span>
          </label>
          
          <div class="filter-actions">
            <input 
              v-model="companySearch" 
              type="text" 
              placeholder="Buscar empresa..."
              class="search-input"
            />
            <select v-model="companyFilter" class="filter-select">
              <option value="">Todas</option>
              <option value="with_orders">Con pedidos</option>
              <option value="high_volume">Alto volumen</option>
              <option value="recent">Activas recientemente</option>
            </select>
          </div>
        </div>

        <div class="companies-grid" v-if="filteredCompanies.length > 0">
          <div 
            v-for="company in filteredCompanies" 
            :key="company._id"
            class="company-card"
            :class="{ selected: selectedCompanies.includes(company._id) }"
          >
            <label class="company-checkbox">
              <input 
                type="checkbox" 
                :value="company._id"
                v-model="selectedCompanies"
                @change="loadPreview"
              />
              <span class="checkbox-custom"></span>
            </label>
            
            <div class="company-info">
              <div class="company-header">
                <h5 class="company-name">{{ company.name }}</h5>
                <span class="company-orders-count">
                  {{ company.unfactored_orders_count || 0 }} pedidos
                </span>
              </div>
              
              <div class="company-details">
                <div class="detail-item">
                  <span class="detail-icon">💰</span>
                  <span class="detail-text">${{ formatCurrency(company.price_per_order || 0) }}/pedido</span>
                </div>
                <div class="detail-item">
                  <span class="detail-icon">📧</span>
                  <span class="detail-text">{{ company.email }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-icon">📊</span>
                  <span class="detail-text">
                    Estimado: ${{ formatCurrency(company.estimated_amount || 0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="loadingPreview" class="loading-companies">
          <div class="loading-spinner"></div>
          <p>Cargando empresas elegibles...</p>
        </div>

        <div v-else class="no-companies">
          <div class="empty-icon">🏢</div>
          <p>No hay empresas con pedidos sin facturar en este período</p>
          <button @click="loadPreview" class="retry-btn">
            Recargar
          </button>
        </div>
      </div>
    </div>

    <!-- Preview del proceso -->
    <div class="form-section" v-if="bulkPreview && selectedCompanies.length > 0">
      <h4 class="section-title">
        <span class="section-icon">📋</span>
        Resumen del Proceso
      </h4>
      
      <div class="bulk-preview">
        <div class="preview-stats">
          <div class="stat-card">
            <div class="stat-icon">🏢</div>
            <div class="stat-content">
              <div class="stat-value">{{ selectedCompanies.length }}</div>
              <div class="stat-label">Empresas</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">📦</div>
            <div class="stat-content">
              <div class="stat-value">{{ bulkPreview.total_orders }}</div>
              <div class="stat-label">Pedidos Total</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">📄</div>
            <div class="stat-content">
              <div class="stat-value">{{ selectedCompanies.length }}</div>
              <div class="stat-label">Facturas a Generar</div>
            </div>
          </div>
          
          <div class="stat-card highlight">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <div class="stat-value">${{ formatCurrency(bulkPreview.total_amount) }}</div>
              <div class="stat-label">Monto Total</div>
            </div>
          </div>
        </div>

        <div class="preview-details">
          <h5 class="details-title">Detalles por Empresa</h5>
          <div class="details-table">
            <div class="table-header">
              <span>Empresa</span>
              <span>Pedidos</span>
              <span>Monto</span>
            </div>
            
            <div 
              v-for="company in selectedCompanyDetails" 
              :key="company._id"
              class="table-row"
            >
              <span class="company-name">{{ company.name }}</span>
              <span class="orders-count">{{ company.unfactored_orders_count }}</span>
              <span class="amount">${{ formatCurrency(company.estimated_amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuración adicional -->
    <div class="form-section">
      <h4 class="section-title">
        <span class="section-icon">⚙️</span>
        Configuración
      </h4>
      
      <div class="config-options">
        <label class="checkbox-wrapper">
          <input 
            type="checkbox" 
            v-model="config.send_immediately"
          />
          <span class="checkbox-custom"></span>
          <span class="checkbox-label">Enviar todas las facturas inmediatamente por email</span>
        </label>
        
        <label class="checkbox-wrapper">
          <input 
            type="checkbox" 
            v-model="config.skip_zero_amount"
          />
          <span class="checkbox-custom"></span>
          <span class="checkbox-label">Omitir empresas sin pedidos o con monto $0</span>
        </label>
        
        <label class="checkbox-wrapper">
          <input 
            type="checkbox" 
            v-model="config.send_summary_report"
          />
          <span class="checkbox-custom"></span>
          <span class="checkbox-label">Enviar reporte resumen al completar</span>
        </label>
      </div>
      
      <div class="form-group">
        <label class="form-label">Notas para todas las facturas</label>
        <textarea 
          v-model="config.global_notes" 
          class="form-textarea"
          rows="3"
          placeholder="Notas que se incluirán en todas las facturas generadas..."
        ></textarea>
      </div>
    </div>

    <!-- Progreso de generación -->
    <div class="form-section" v-if="isGenerating">
      <h4 class="section-title">
        <span class="section-icon">⏳</span>
        Progreso de Generación
      </h4>
      
      <div class="generation-progress">
        <div class="progress-header">
          <span class="progress-text">
            Generando {{ generationProgress.current }} de {{ generationProgress.total }} facturas...
          </span>
          <span class="progress-percentage">
            {{ Math.round((generationProgress.current / generationProgress.total) * 100) }}%
          </span>
        </div>
        
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: (generationProgress.current / generationProgress.total) * 100 + '%' }"
          ></div>
        </div>
        
        <div class="progress-details">
          <div class="progress-status">
            <span class="status-item success">
              <span class="status-icon">✅</span>
              {{ generationProgress.success }} exitosas
            </span>
            <span class="status-item error" v-if="generationProgress.errors > 0">
              <span class="status-icon">❌</span>
              {{ generationProgress.errors }} errores
            </span>
          </div>
          
          <div class="current-company" v-if="generationProgress.current_company">
            Procesando: {{ generationProgress.current_company }}
          </div>
        </div>
      </div>
    </div>

    <!-- Resultados -->
    <div class="form-section" v-if="generationResults">
      <h4 class="section-title">
        <span class="section-icon">📊</span>
        Resultados
      </h4>
      
      <div class="results-summary">
        <div class="result-stats">
          <div class="result-stat success">
            <div class="result-icon">✅</div>
            <div class="result-content">
              <div class="result-value">{{ generationResults.success_count }}</div>
              <div class="result-label">Facturas Generadas</div>
            </div>
          </div>
          
          <div class="result-stat error" v-if="generationResults.error_count > 0">
            <div class="result-icon">❌</div>
            <div class="result-content">
              <div class="result-value">{{ generationResults.error_count }}</div>
              <div class="result-label">Errores</div>
            </div>
          </div>
          
          <div class="result-stat info">
            <div class="result-icon">💰</div>
            <div class="result-content">
              <div class="result-value">${{ formatCurrency(generationResults.total_generated_amount) }}</div>
              <div class="result-label">Monto Total Generado</div>
            </div>
          </div>
        </div>

        <div class="results-actions">
          <button @click="downloadSummaryReport" class="result-btn secondary">
            <span class="btn-icon">📥</span>
            Descargar Reporte
          </button>
          <button @click="viewGeneratedInvoices" class="result-btn primary">
            <span class="btn-icon">👁️</span>
            Ver Facturas Generadas
          </button>
        </div>

        <!-- Errores detallados -->
        <div class="error-details" v-if="generationResults.errors && generationResults.errors.length > 0">
          <h5 class="error-title">Errores Encontrados</h5>
          <div class="error-list">
            <div 
              v-for="error in generationResults.errors" 
              :key="error.company_id"
              class="error-item"
            >
              <div class="error-company">{{ error.company_name }}</div>
              <div class="error-message">{{ error.error_message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones del formulario -->
    <div class="form-actions">
      <button 
        type="button" 
        @click="$emit('close')" 
        class="btn-cancel"
        :disabled="isGenerating"
      >
        {{ isGenerating ? 'Generando...' : 'Cerrar' }}
      </button>
      
      <button 
        v-if="!generationResults"
        type="button"
        @click="startBulkGeneration" 
        :disabled="!canGenerate || isGenerating"
        class="btn-generate"
      >
        <span class="btn-icon">{{ isGenerating ? '⏳' : '⚡' }}</span>
        {{ isGenerating ? 'Generando...' : `Generar ${selectedCompanies.length} Facturas` }}
      </button>
      
      <button 
        v-else
        type="button"
        @click="resetForm" 
        class="btn-reset"
      >
        <span class="btn-icon">🔄</span>
        Generar Más
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../../services/api'

// Props y emits
const props = defineProps({
  companies: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'generated'])

// Estado
const toast = useToast()
const loadingPreview = ref(false)
const isGenerating = ref(false)
const eligibleCompanies = ref([])
const selectedCompanies = ref([])
const companySearch = ref('')
const companyFilter = ref('')

// Configuración
const config = ref({
  period_start: '',
  period_end: '',
  send_immediately: false,
  skip_zero_amount: true,
  send_summary_report: true,
  global_notes: ''
})

// Preview y resultados
const bulkPreview = ref(null)
const generationProgress = ref({
  current: 0,
  total: 0,
  success: 0,
  errors: 0,
  current_company: ''
})
const generationResults = ref(null)

// Computed
const filteredCompanies = computed(() => {
  let filtered = eligibleCompanies.value

  // Filtro por búsqueda
  if (companySearch.value) {
    const search = companySearch.value.toLowerCase()
    filtered = filtered.filter(company =>
      company.name.toLowerCase().includes(search) ||
      company.email.toLowerCase().includes(search)
    )
  }

  // Filtro por tipo
  switch (companyFilter.value) {
    case 'with_orders':
      filtered = filtered.filter(company => (company.unfactored_orders_count || 0) > 0)
      break
    case 'high_volume':
      filtered = filtered.filter(company => (company.unfactored_orders_count || 0) > 20)
      break
    case 'recent':
      // Filtrar por empresas con actividad reciente
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(company => 
        company.last_order_date && new Date(company.last_order_date) >= weekAgo
      )
      break
  }

  return filtered
})

const allCompaniesSelected = computed(() => 
  filteredCompanies.value.length > 0 && 
  filteredCompanies.value.every(company => selectedCompanies.value.includes(company._id))
)

const someCompaniesSelected = computed(() => 
  selectedCompanies.value.length > 0 && !allCompaniesSelected.value
)

const selectedCompanyDetails = computed(() =>
  eligibleCompanies.value.filter(company => 
    selectedCompanies.value.includes(company._id)
  )
)

const canGenerate = computed(() => 
  config.value.period_start && 
  config.value.period_end && 
  selectedCompanies.value.length > 0 &&
  !isGenerating.value
)

// Métodos
async function loadPreview() {
  if (!config.value.period_start || !config.value.period_end) {
    eligibleCompanies.value = []
    bulkPreview.value = null
    return
  }

  loadingPreview.value = true
  
  try {
    const { data } = await apiService.billing.getBulkGenerationPreview({
      period_start: config.value.period_start,
      period_end: config.value.period_end
    })
    
    eligibleCompanies.value = data.eligible_companies || []
    
    // Auto-seleccionar empresas con pedidos
    if (config.value.skip_zero_amount) {
      selectedCompanies.value = eligibleCompanies.value
        .filter(company => (company.unfactored_orders_count || 0) > 0)
        .map(company => company._id)
    }
    
    updateBulkPreview()
    
  } catch (error) {
    console.error('Error loading preview:', error)
    toast.error('Error cargando preview de generación masiva')
    eligibleCompanies.value = []
  } finally {
    loadingPreview.value = false
  }
}

function updateBulkPreview() {
  if (selectedCompanies.value.length === 0) {
    bulkPreview.value = null
    return
  }

  const selectedDetails = selectedCompanyDetails.value
  
  bulkPreview.value = {
    total_orders: selectedDetails.reduce((sum, company) => 
      sum + (company.unfactored_orders_count || 0), 0
    ),
    total_amount: selectedDetails.reduce((sum, company) => 
      sum + (company.estimated_amount || 0), 0
    )
  }
}

function toggleSelectAllCompanies() {
  if (allCompaniesSelected.value) {
    selectedCompanies.value = []
  } else {
    selectedCompanies.value = filteredCompanies.value.map(company => company._id)
  }
  updateBulkPreview()
}

function setLastMonth() {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  
  config.value.period_start = lastMonth.toISOString().split('T')[0]
  config.value.period_end = lastMonthEnd.toISOString().split('T')[0]
  
  loadPreview()
}

function setLastQuarter() {
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3)
  const lastQuarter = quarter === 0 ? 3 : quarter - 1
  const year = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear()
  
  const startMonth = lastQuarter * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0)
  
  config.value.period_start = start.toISOString().split('T')[0]
  config.value.period_end = end.toISOString().split('T')[0]
  
  loadPreview()
}

function setCustomRange() {
  // Por ahora solo mostramos un mensaje, podrías abrir un modal para selección avanzada
  toast.info('Selecciona las fechas manualmente en los campos de arriba')
}

async function startBulkGeneration() {
  if (!canGenerate.value) return

  isGenerating.value = true
  generationResults.value = null
  
  // Inicializar progreso
  generationProgress.value = {
    current: 0,
    total: selectedCompanies.value.length,
    success: 0,
    errors: 0,
    current_company: ''
  }

  try {
    const payload = {
      period_start: config.value.period_start,
      period_end: config.value.period_end,
      company_ids: selectedCompanies.value,
      send_immediately: config.value.send_immediately,
      skip_zero_amount: config.value.skip_zero_amount,
      global_notes: config.value.global_notes
    }

    // Simular progreso (en una implementación real, usarías WebSockets o polling)
    const results = await apiService.billing.generateBulkInvoices(payload)
    
    // Simular progreso paso a paso
    for (let i = 0; i < selectedCompanies.value.length; i++) {
      const company = selectedCompanyDetails.value[i]
      generationProgress.value.current = i + 1
      generationProgress.value.current_company = company.name
      
      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Simular éxito/error aleatorio para demo
      if (Math.random() > 0.1) { // 90% éxito
        generationProgress.value.success++
      } else {
        generationProgress.value.errors++
      }
    }
    
    generationResults.value = results.data
    
    toast.success(`Generación completada: ${generationProgress.value.success} facturas creadas`)
    emit('generated', generationProgress.value.success)
    
  } catch (error) {
    console.error('Error in bulk generation:', error)
    toast.error('Error en la generación masiva')
  } finally {
    isGenerating.value = false
    generationProgress.value.current_company = ''
  }
}

function resetForm() {
  generationResults.value = null
  generationProgress.value = {
    current: 0,
    total: 0,
    success: 0,
    errors: 0,
    current_company: ''
  }
  selectedCompanies.value = []
  bulkPreview.value = null
  
  // Sugerir nuevo período
  setLastMonth()
}

function downloadSummaryReport() {
  // Implementar descarga de reporte
  toast.info('Preparando reporte de descarga...')
}

function viewGeneratedInvoices() {
  // Implementar navegación a facturas generadas
  toast.info('Navegando a facturas generadas...')
  emit('close')
}

// Métodos de utilidad
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

// Watchers
watch(selectedCompanies, updateBulkPreview)

// Lifecycle
onMounted(() => {
  // Sugerir período del mes anterior al iniciar
  setLastMonth()
})
</script>

<style scoped>
.bulk-generate-form {
  max-width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.form-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.title-icon {
  font-size: 28px;
}

.form-description {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
  max-width: 600px;
  margin: 0 auto;
}

/* Secciones */
.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 20px;
}

/* Configuración de período */
.period-config .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-label.required::after {
  content: '*';
  color: #ef4444;
  margin-left: 4px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.3s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.period-shortcuts {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.shortcut-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.shortcut-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

/* Filtro de empresas */
.companies-filter {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

input[type="checkbox"]:checked + .checkbox-custom {
  background: #3b82f6;
  border-color: #3b82f6;
}

input[type="checkbox"]:checked + .checkbox-custom::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

input[type="checkbox"]:indeterminate + .checkbox-custom {
  background: #6b7280;
  border-color: #6b7280;
}

input[type="checkbox"]:indeterminate + .checkbox-custom::after {
  content: '−';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

input[type="checkbox"] {
  display: none;
}

.checkbox-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.filter-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 200px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

/* Grid de empresas */
.companies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.company-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  transition: all 0.2s;
  cursor: pointer;
}

.company-card:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.company-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.company-checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.company-info {
  flex: 1;
}

.company-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.company-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.company-orders-count {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.company-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.detail-icon {
  font-size: 11px;
}

.detail-text {
  flex: 1;
}

/* Estados de carga */
.loading-companies,
.no-companies {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.retry-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  margin-top: 12px;
}

/* Preview masivo */
.bulk-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.stat-card.highlight {
  border-color: #3b82f6;
  background: #eff6ff;
}

.stat-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 50%;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-details {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.details-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.details-table {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;
  padding: 12px 16px;
}

.table-header {
  background: #f9fafb;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  border-top: 1px solid #f3f4f6;
  font-size: 14px;
  color: #374151;
}

.table-row .company-name {
  font-weight: 500;
}

.table-row .orders-count {
  text-align: center;
}

.table-row .amount {
  text-align: right;
  font-weight: 600;
}

/* Configuración */
.config-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

/* Progreso de generación */
.generation-progress {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.progress-percentage {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.progress-status {
  display: flex;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.status-item.success {
  color: #065f46;
}

.status-item.error {
  color: #dc2626;
}

.status-icon {
  font-size: 12px;
}

.current-company {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

/* Resultados */
.results-summary {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.result-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.result-stat.success {
  border-color: #10b981;
  background: #f0fdf4;
}

.result-stat.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.result-stat.info {
  border-color: #3b82f6;
  background: #eff6ff;
}

.result-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.result-content {
  flex: 1;
}

.result-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 2px;
}

.result-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.result-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.result-btn.primary {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.result-btn.primary:hover {
  background: #2563eb;
}

.result-btn.secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.result-btn.secondary:hover {
  background: #f9fafb;
}

/* Errores detallados */
.error-details {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.error-title {
  font-size: 14px;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 12px 0;
}

.error-list {
  background: white;
  border: 1px solid #fecaca;
  border-radius: 6px;
  overflow: hidden;
}

.error-item {
  padding: 12px 16px;
  border-bottom: 1px solid #fecaca;
}

.error-item:last-child {
  border-bottom: none;
}

.error-company {
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 4px;
}

.error-message {
  font-size: 14px;
  color: #6b7280;
}

/* Acciones del formulario */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-generate,
.btn-reset {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-generate {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.btn-generate:hover:not(:disabled) {
  background: #2563eb;
}

.btn-reset {
  background: #10b981;
  color: white;
  border: 1px solid #10b981;
}

.btn-reset:hover {
  background: #059669;
}

.btn-cancel:disabled,
.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .period-config .form-row {
    grid-template-columns: 1fr;
  }
  
  .period-shortcuts {
    flex-direction: column;
  }
  
  .filter-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .filter-actions {
    justify-content: center;
  }
  
  .companies-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-stats {
    grid-template-columns: 1fr;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 2fr 1fr 1fr;
    gap: 8px;
    padding: 8px 12px;
  }
  
  .progress-details {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .result-stats {
    grid-template-columns: 1fr;
  }
  
  .results-actions {
    flex-direction: column;
  }
  
  .form-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .form-title {
    font-size: 20px;
    flex-direction: column;
    gap: 8px;
  }
  
  .section-title {
    font-size: 16px;
  }
  
  .company-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  
  .table-row .orders-count,
  .table-row .amount {
    text-align: left;
  }
}
</style>