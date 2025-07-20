<template>
  <div class="generate-invoice-form">
    <form @submit.prevent="handleSubmit">
      <!-- Selección de empresa -->
      <div class="form-section">
        <h4 class="section-title">
          <span class="section-icon">🏢</span>
          Información de la Empresa
        </h4>
        
        <div class="form-group">
          <label class="form-label required">Empresa</label>
          <select 
            v-model="form.company_id" 
            @change="onCompanyChange"
            class="form-select"
            required
          >
            <option value="">Seleccionar empresa</option>
            <option 
              v-for="company in companies" 
              :key="company._id" 
              :value="company._id"
            >
              {{ company.name }} - ${{ formatCurrency(company.price_per_order || 0) }}/pedido
            </option>
          </select>
        </div>

        <div v-if="selectedCompany" class="company-info">
          <div class="info-item">
            <span class="info-label">Email:</span>
            <span class="info-value">{{ selectedCompany.email }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Precio por pedido:</span>
            <span class="info-value">${{ formatCurrency(selectedCompany.price_per_order || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Pedidos sin facturar:</span>
            <span class="info-value">{{ availableOrders.length }}</span>
          </div>
        </div>
      </div>

      <!-- Período de facturación -->
      <div class="form-section">
        <h4 class="section-title">
          <span class="section-icon">📅</span>
          Período de Facturación
        </h4>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Fecha de inicio</label>
            <input 
              v-model="form.period_start" 
              type="date" 
              class="form-input"
              @change="loadAvailableOrders"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Fecha de fin</label>
            <input 
              v-model="form.period_end" 
              type="date" 
              class="form-input"
              @change="loadAvailableOrders"
              required
            />
          </div>
        </div>

        <div class="period-shortcuts">
          <button type="button" @click="setLastMonth" class="shortcut-btn">
            Mes Anterior
          </button>
          <button type="button" @click="setCurrentMonth" class="shortcut-btn">
            Mes Actual
          </button>
          <button type="button" @click="setLastQuarter" class="shortcut-btn">
            Trimestre Anterior
          </button>
        </div>
      </div>

      <!-- Selección de pedidos -->
      <div class="form-section" v-if="availableOrders.length > 0">
        <h4 class="section-title">
          <span class="section-icon">📦</span>
          Pedidos a Facturar
          <span class="orders-count">({{ availableOrders.length }} disponibles)</span>
        </h4>
        
        <div class="orders-selection">
          <div class="selection-header">
            <label class="checkbox-wrapper">
              <input 
                type="checkbox" 
                @change="toggleSelectAll"
                :checked="allOrdersSelected"
                :indeterminate="someOrdersSelected"
              />
              <span class="checkbox-custom"></span>
              <span class="checkbox-label">
                Seleccionar todos ({{ selectedOrders.length }}/{{ availableOrders.length }})
              </span>
            </label>
            
            <div class="selection-actions">
              <button type="button" @click="selectByStatus('delivered')" class="select-btn">
                Solo Entregados
              </button>
              <button type="button" @click="selectByDateRange" class="select-btn">
                Por Fecha
              </button>
            </div>
          </div>

          <div class="orders-list">
            <div 
              v-for="order in paginatedOrders" 
              :key="order._id"
              class="order-item"
              :class="{ selected: selectedOrders.includes(order._id) }"
            >
              <label class="order-checkbox">
                <input 
                  type="checkbox" 
                  :value="order._id"
                  v-model="selectedOrders"
                />
                <span class="checkbox-custom"></span>
              </label>
              
              <div class="order-info">
                <div class="order-header">
                  <span class="order-number">#{{ order.order_number }}</span>
                  <span class="order-status" :class="order.status">
                    {{ getOrderStatusText(order.status) }}
                  </span>
                </div>
                
                <div class="order-details">
                  <span class="order-detail">
                    <span class="detail-icon">📍</span>
                    {{ order.shipping_address?.commune || 'Sin comuna' }}
                  </span>
                  <span class="order-detail">
                    <span class="detail-icon">📅</span>
                    {{ formatDate(order.created_at) }}
                  </span>
                  <span class="order-detail">
                    <span class="detail-icon">💰</span>
                    ${{ formatCurrency(order.shipping_cost || 0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Paginación de pedidos -->
          <div class="orders-pagination" v-if="totalOrderPages > 1">
            <button 
              @click="orderPage--" 
              :disabled="orderPage === 1"
              class="pagination-btn"
            >
              ←
            </button>
            <span class="pagination-info">
              {{ orderPage }} / {{ totalOrderPages }}
            </span>
            <button 
              @click="orderPage++" 
              :disabled="orderPage === totalOrderPages"
              class="pagination-btn"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <!-- Preview de la factura -->
      <div class="form-section" v-if="invoicePreview">
        <h4 class="section-title">
          <span class="section-icon">📄</span>
          Preview de la Factura
        </h4>
        
        <div class="invoice-preview">
          <div class="preview-header">
            <div class="preview-item">
              <span class="preview-label">Empresa:</span>
              <span class="preview-value">{{ selectedCompany?.name }}</span>
            </div>
            <div class="preview-item">
              <span class="preview-label">Período:</span>
              <span class="preview-value">{{ formatPeriod() }}</span>
            </div>
            <div class="preview-item">
              <span class="preview-label">Pedidos seleccionados:</span>
              <span class="preview-value">{{ selectedOrders.length }}</span>
            </div>
          </div>
          
          <div class="preview-amounts">
            <div class="amount-row">
              <span class="amount-label">Subtotal:</span>
              <span class="amount-value">${{ formatCurrency(invoicePreview.subtotal) }}</span>
            </div>
            <div class="amount-row">
              <span class="amount-label">IVA (19%):</span>
              <span class="amount-value">${{ formatCurrency(invoicePreview.tax) }}</span>
            </div>
            <div class="amount-row total">
              <span class="amount-label">Total:</span>
              <span class="amount-value">${{ formatCurrency(invoicePreview.total) }}</span>
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
        
        <div class="form-group">
          <label class="checkbox-wrapper">
            <input 
              type="checkbox" 
              v-model="form.send_immediately"
            />
            <span class="checkbox-custom"></span>
            <span class="checkbox-label">Enviar factura inmediatamente por email</span>
          </label>
        </div>
        
        <div class="form-group">
          <label class="form-label">Notas adicionales</label>
          <textarea 
            v-model="form.notes" 
            class="form-textarea"
            rows="3"
            placeholder="Notas internas o comentarios adicionales..."
          ></textarea>
        </div>
      </div>

      <!-- Acciones del formulario -->
      <div class="form-actions">
        <button type="button" @click="$emit('close')" class="btn-cancel">
          Cancelar
        </button>
        <button 
          type="submit" 
          :disabled="!canGenerate || isGenerating"
          class="btn-generate"
        >
          <span class="btn-icon">{{ isGenerating ? '⏳' : '⚡' }}</span>
          {{ isGenerating ? 'Generando...' : 'Generar Factura' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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
const isGenerating = ref(false)
const availableOrders = ref([])
const selectedOrders = ref([])
const orderPage = ref(1)
const ordersPerPage = ref(10)

// Formulario
const form = ref({
  company_id: '',
  period_start: '',
  period_end: '',
  send_immediately: false,
  notes: ''
})

// Computed
const selectedCompany = computed(() => 
  props.companies.find(c => c._id === form.value.company_id)
)

const paginatedOrders = computed(() => {
  const start = (orderPage.value - 1) * ordersPerPage.value
  return availableOrders.value.slice(start, start + ordersPerPage.value)
})

const totalOrderPages = computed(() => 
  Math.ceil(availableOrders.value.length / ordersPerPage.value)
)

const allOrdersSelected = computed(() => 
  availableOrders.value.length > 0 && 
  availableOrders.value.every(order => selectedOrders.value.includes(order._id))
)

const someOrdersSelected = computed(() => 
  selectedOrders.value.length > 0 && !allOrdersSelected.value
)

const invoicePreview = computed(() => {
  if (selectedOrders.value.length === 0 || !selectedCompany.value) return null

  const selectedOrderDetails = availableOrders.value.filter(order =>
    selectedOrders.value.includes(order._id)
  )

  const subtotal = selectedOrderDetails.reduce((sum, order) => 
    sum + (order.shipping_cost || 0), 0
  )
  
  const tax = Math.round(subtotal * 0.19)
  const total = subtotal + tax

  return { subtotal, tax, total }
})

const canGenerate = computed(() => 
  form.value.company_id && 
  form.value.period_start && 
  form.value.period_end && 
  selectedOrders.value.length > 0
)

// Métodos
async function onCompanyChange() {
  selectedOrders.value = []
  availableOrders.value = []
  orderPage.value = 1
  
  if (form.value.company_id) {
    // Sugerir período del mes anterior
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    
    form.value.period_start = lastMonth.toISOString().split('T')[0]
    form.value.period_end = lastMonthEnd.toISOString().split('T')[0]
    
    await loadAvailableOrders()
  }
}

async function loadAvailableOrders() {
  if (!form.value.company_id || !form.value.period_start || !form.value.period_end) {
    availableOrders.value = []
    return
  }

  try {
    const { data } = await apiService.billing.getAvailableOrders({
      company_id: form.value.company_id,
      period_start: form.value.period_start,
      period_end: form.value.period_end
    })
    
    availableOrders.value = data || []
    selectedOrders.value = []
    orderPage.value = 1
    
    if (availableOrders.value.length === 0) {
      toast.warning('No hay pedidos sin facturar en este período')
    }
  } catch (error) {
    console.error('Error loading available orders:', error)
    toast.error('Error cargando pedidos disponibles')
    availableOrders.value = []
  }
}

function toggleSelectAll() {
  if (allOrdersSelected.value) {
    selectedOrders.value = []
  } else {
    selectedOrders.value = availableOrders.value.map(order => order._id)
  }
}

function selectByStatus(status) {
  selectedOrders.value = availableOrders.value
    .filter(order => order.status === status)
    .map(order => order._id)
    
  if (selectedOrders.value.length === 0) {
    toast.info(`No hay pedidos con estado "${status}"`)
  }
}

function selectByDateRange() {
  // Lógica para seleccionar por rango de fechas
  // Por simplicidad, selecciona los últimos 7 días
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  selectedOrders.value = availableOrders.value
    .filter(order => new Date(order.created_at) >= weekAgo)
    .map(order => order._id)
}

function setLastMonth() {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  
  form.value.period_start = lastMonth.toISOString().split('T')[0]
  form.value.period_end = lastMonthEnd.toISOString().split('T')[0]
  
  loadAvailableOrders()
}

function setCurrentMonth() {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  form.value.period_start = currentMonth.toISOString().split('T')[0]
  form.value.period_end = currentMonthEnd.toISOString().split('T')[0]
  
  loadAvailableOrders()
}

function setLastQuarter() {
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3)
  const lastQuarter = quarter === 0 ? 3 : quarter - 1
  const year = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear()
  
  const startMonth = lastQuarter * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0)
  
  form.value.period_start = start.toISOString().split('T')[0]
  form.value.period_end = end.toISOString().split('T')[0]
  
  loadAvailableOrders()
}

async function handleSubmit() {
  if (!canGenerate.value) return

  isGenerating.value = true
  
  try {
    const payload = {
      company_id: form.value.company_id,
      period_start: form.value.period_start,
      period_end: form.value.period_end,
      order_ids: selectedOrders.value,
      send_immediately: form.value.send_immediately,
      notes: form.value.notes
    }

    const { data } = await apiService.billing.generateInvoice(payload)
    
    toast.success('Factura generada exitosamente')
    emit('generated', data)
    
  } catch (error) {
    console.error('Error generating invoice:', error)
    toast.error('Error generando la factura')
  } finally {
    isGenerating.value = false
  }
}

// Métodos de utilidad
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-CL')
}

function formatPeriod() {
  if (!form.value.period_start || !form.value.period_end) return 'N/A'
  
  const start = new Date(form.value.period_start).toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: 'short' 
  })
  const end = new Date(form.value.period_end).toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: 'short' 
  })
  
  return `${start} - ${end}`
}

function getOrderStatusText(status) {
  const texts = {
    pending: 'Pendiente',
    assigned: 'Asignado',
    picked_up: 'Recogido',
    in_transit: 'En tránsito',
    delivered: 'Entregado',
    failed: 'Fallido'
  }
  return texts[status] || status
}

// Watchers
watch(() => [form.value.period_start, form.value.period_end], () => {
  if (form.value.company_id) {
    loadAvailableOrders()
  }
})
</script>

<style scoped>
.generate-invoice-form {
  max-width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Secciones del formulario */
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

.orders-count {
  font-size: 14px;
  color: #6b7280;
  font-weight: 400;
}

/* Grupos de formulario */
.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
.form-select,
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
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Información de empresa */
.company-info {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

/* Shortcuts de período */
.period-shortcuts {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.shortcut-btn {
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.shortcut-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

/* Selección de pedidos */
.orders-selection {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.selection-header {
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

.selection-actions {
  display: flex;
  gap: 8px;
}

.select-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Lista de pedidos */
.orders-list {
  max-height: 400px;
  overflow-y: auto;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s;
}

.order-item:hover {
  background: #f9fafb;
}

.order-item.selected {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.order-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.order-info {
  flex: 1;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
}

.order-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.order-status.delivered {
  background: #d1fae5;
  color: #065f46;
}

.order-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.order-status.in_transit {
  background: #dbeafe;
  color: #1e40af;
}

.order-details {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.order-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.detail-icon {
  font-size: 11px;
}

/* Paginación de pedidos */
.orders-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.pagination-btn {
  padding: 6px 10px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

/* Preview de factura */
.invoice-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.preview-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.preview-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.preview-amounts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.amount-row.total {
  border-top: 2px solid #e5e7eb;
  padding-top: 12px;
  font-weight: 700;
  font-size: 16px;
}

.amount-label {
  color: #6b7280;
}

.amount-value {
  color: #1f2937;
  font-weight: 600;
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
.btn-generate {
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

.btn-cancel:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-generate {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.btn-generate:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .period-shortcuts {
    flex-direction: column;
  }
  
  .selection-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .selection-actions {
    justify-content: center;
  }
  
  .preview-header {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-cancel,
  .btn-generate {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .order-details {
    flex-direction: column;
    gap: 4px;
  }
  
  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>