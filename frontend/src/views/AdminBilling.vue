<template>
  <div class="billing-admin-page">
    <!-- Header con métricas principales -->
    <div class="billing-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <span class="title-icon">💰</span>
            Facturación Administrativa
          </h1>
          <p class="page-subtitle">
            Gestiona facturas, pagos y genera reportes financieros
          </p>
        </div>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button @click="openGenerateModal" class="action-btn primary">
            <span class="btn-icon">⚡</span>
            Generar Facturas
          </button>
          <button @click="sendAllDraftInvoices" class="action-btn success">
            <span class="btn-icon">📤</span>
            Enviar Pendientes
          </button>
          <button @click="exportReport" class="action-btn secondary">
            <span class="btn-icon">📊</span>
            Exportar Reporte
          </button>
        </div>
      </div>

      <!-- Métricas Dashboard -->
      <div class="metrics-dashboard">
        <div class="metric-card revenue">
          <div class="metric-icon">💰</div>
          <div class="metric-content">
            <div class="metric-value">${{ formatCurrency(metrics.totalRevenue) }}</div>
            <div class="metric-label">Ingresos Totales</div>
            <div class="metric-change positive">+12% vs mes anterior</div>
          </div>
        </div>
        
        <div class="metric-card invoices">
          <div class="metric-icon">📋</div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.totalInvoices }}</div>
            <div class="metric-label">Facturas Generadas</div>
            <div class="metric-change positive">+5 este mes</div>
          </div>
        </div>
        
        <div class="metric-card pending">
          <div class="metric-icon">⏰</div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.pendingInvoices }}</div>
            <div class="metric-label">Facturas Pendientes</div>
            <div class="metric-amount">${{ formatCurrency(metrics.pendingAmount) }}</div>
          </div>
        </div>
        
        <div class="metric-card companies">
          <div class="metric-icon">🏢</div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.activeCompanies }}</div>
            <div class="metric-label">Empresas Activas</div>
            <div class="metric-change">{{ metrics.companiesWithDebt }} con deuda</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros y Búsqueda -->
    <div class="filters-section">
      <div class="filters-container">
        <div class="search-group">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              v-model="filters.search" 
              type="text" 
              placeholder="Buscar por número de factura..."
              class="search-input"
              @input="debouncedSearch"
            />
          </div>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Empresa:</label>
          <select v-model="filters.company" class="filter-select">
            <option value="">Todas las empresas</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Estado:</label>
          <div class="status-filter-chips">
            <button 
              v-for="status in statusOptions" 
              :key="status.value"
              @click="toggleStatusFilter(status.value)"
              class="status-chip"
              :class="{ active: filters.statuses.includes(status.value), [status.value]: true }"
            >
              {{ status.icon }} {{ status.label }}
            </button>
          </div>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Período:</label>
          <select v-model="filters.period" class="filter-select">
            <option value="">Todos los períodos</option>
            <option value="current">Mes actual</option>
            <option value="last">Mes anterior</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Este año</option>
          </select>
        </div>
        
        <button @click="clearFilters" class="clear-filters-btn">
          <span class="btn-icon">✨</span>
          Limpiar
        </button>
      </div>
    </div>

    <!-- Tabla de Facturas -->
    <div class="invoices-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">📄</span>
          Facturas ({{ filteredInvoices.length }})
        </h2>
        
        <!-- Acciones masivas -->
        <div class="bulk-actions" v-if="selectedInvoices.length > 0">
          <span class="selected-count">{{ selectedInvoices.length }} seleccionadas</span>
          <button @click="bulkSendInvoices" class="bulk-btn send">
            📤 Enviar Todas
          </button>
          <button @click="bulkMarkAsPaid" class="bulk-btn paid">
            ✅ Marcar Pagadas
          </button>
          <button @click="bulkDelete" class="bulk-btn delete">
            🗑️ Eliminar
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando facturas...</p>
      </div>

      <!-- Tabla -->
      <div v-else-if="filteredInvoices.length > 0" class="invoices-table-container">
        <table class="invoices-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input 
                  type="checkbox" 
                  @change="toggleSelectAll"
                  :checked="allSelected"
                  class="checkbox-input"
                />
              </th>
              <th>Factura</th>
              <th>Empresa</th>
              <th>Período</th>
              <th>Pedidos</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="invoice in paginatedInvoices" 
              :key="invoice._id"
              class="invoice-row"
              :class="{ selected: selectedInvoices.includes(invoice._id) }"
            >
              <td class="checkbox-col">
                <input 
                  type="checkbox" 
                  :value="invoice._id"
                  v-model="selectedInvoices"
                  class="checkbox-input"
                />
              </td>
              
              <td class="invoice-number">
                <div class="invoice-id">
                  <span class="invoice-text">{{ invoice.invoice_number }}</span>
                  <button @click="viewInvoiceDetails(invoice)" class="view-details-btn">
                    👁️
                  </button>
                </div>
              </td>
              
              <td class="company-cell">
                <div class="company-info">
                  <span class="company-name">{{ invoice.company_id?.name }}</span>
                  <span class="company-email">{{ invoice.company_id?.email }}</span>
                </div>
              </td>
              
              <td class="period-cell">
                <div class="period-info">
                  <span class="period-text">{{ formatPeriod(invoice) }}</span>
                  <span class="period-days">{{ getPeriodDuration(invoice) }} días</span>
                </div>
              </td>
              
              <td class="orders-cell">
                <div class="orders-info">
                  <span class="orders-count">{{ invoice.total_orders }}</span>
                  <span class="orders-label">pedidos</span>
                </div>
              </td>
              
              <td class="amount-cell">
                <div class="amount-info">
                  <span class="amount-total">${{ formatCurrency(invoice.total_amount) }}</span>
                  <span class="amount-detail">
                    Subtotal: ${{ formatCurrency(invoice.subtotal) }}
                  </span>
                </div>
              </td>
              
              <td class="status-cell">
                <div class="status-badge-container">
                  <span class="status-badge" :class="invoice.status">
                    {{ getStatusIcon(invoice.status) }} {{ getStatusText(invoice.status) }}
                  </span>
                  <span v-if="invoice.status === 'sent'" class="due-date">
                    Vence: {{ formatDate(invoice.due_date) }}
                  </span>
                </div>
              </td>
              
              <td class="date-cell">
                <div class="date-info">
                  <span class="date-text">{{ formatDate(invoice.created_at) }}</span>
                  <span class="date-relative">{{ getRelativeDate(invoice.created_at) }}</span>
                </div>
              </td>
              
              <td class="actions-cell">
                <div class="action-buttons">
                  <!-- Enviar (solo draft) -->
                  <button 
                    v-if="invoice.status === 'draft'" 
                    @click="sendInvoice(invoice._id)"
                    class="action-btn send"
                    title="Enviar a cliente"
                  >
                    📤
                  </button>
                  
                  <!-- Marcar como pagada (solo sent/overdue) -->
                  <button 
                    v-if="['sent', 'overdue'].includes(invoice.status)" 
                    @click="markAsPaid(invoice._id)"
                    class="action-btn paid"
                    title="Marcar como pagada"
                  >
                    ✅
                  </button>
                  
                  <!-- Descargar PDF -->
                  <button 
                    @click="downloadInvoice(invoice._id)"
                    class="action-btn download"
                    title="Descargar PDF"
                  >
                    📄
                  </button>
                  
                  <!-- Eliminar (solo draft) -->
                  <button 
                    v-if="invoice.status === 'draft'" 
                    @click="deleteInvoice(invoice._id)"
                    class="action-btn delete"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                  
                  <!-- Más opciones -->
                  <button 
                    @click="showInvoiceMenu(invoice)"
                    class="action-btn more"
                    title="Más opciones"
                  >
                    ⋯
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">📄</div>
        <h3 class="empty-title">No hay facturas</h3>
        <p class="empty-description">
          {{ filters.hasActiveFilters ? 'No hay facturas que coincidan con los filtros' : 'Aún no se han generado facturas' }}
        </p>
        <button v-if="!filters.hasActiveFilters" @click="openGenerateModal" class="empty-action-btn">
          <span class="btn-icon">⚡</span>
          Generar Primera Factura
        </button>
      </div>

      <!-- Paginación -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          ← Anterior
        </button>
        
        <div class="pagination-numbers">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            @click="goToPage(page)"
            class="pagination-number"
            :class="{ active: page === currentPage }"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Siguiente →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'

// State
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const invoices = ref([])
const companies = ref([])
const selectedInvoices = ref([])

// Filters
const filters = ref({
  search: '',
  company: '',
  statuses: [],
  period: ''
})

// Pagination
const currentPage = ref(1)
const itemsPerPage = 15

// Metrics (placeholder data)
const metrics = ref({
  totalRevenue: 2450000,
  totalInvoices: 45,
  pendingInvoices: 8,
  pendingAmount: 340000,
  activeCompanies: 12,
  companiesWithDebt: 3
})

// Status options for filters
const statusOptions = [
  { value: 'draft', label: 'Borrador', icon: '⚪' },
  { value: 'sent', label: 'Enviada', icon: '🟨' },
  { value: 'paid', label: 'Pagada', icon: '🟩' },
  { value: 'overdue', label: 'Vencida', icon: '🟧' }
]

// Computed properties
const filteredInvoices = computed(() => {
  let filtered = invoices.value

  if (filters.value.search) {
    filtered = filtered.filter(invoice => 
      invoice.invoice_number.toLowerCase().includes(filters.value.search.toLowerCase())
    )
  }

  if (filters.value.company) {
    filtered = filtered.filter(invoice => 
      invoice.company_id?._id === filters.value.company
    )
  }

  if (filters.value.statuses.length > 0) {
    filtered = filtered.filter(invoice => 
      filters.value.statuses.includes(invoice.status)
    )
  }

  return filtered
})

const paginatedInvoices = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredInvoices.value.slice(start, end)
})

const totalPages = computed(() => 
  Math.ceil(filteredInvoices.value.length / itemsPerPage)
)

const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const allSelected = computed(() => 
  paginatedInvoices.value.length > 0 && 
  paginatedInvoices.value.every(invoice => selectedInvoices.value.includes(invoice._id))
)

// Methods
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatPeriod(invoice) {
  const start = new Date(invoice.period_start).toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short' 
  })
  const end = new Date(invoice.period_end).toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short' 
  })
  return `${start} - ${end}`
}

function getPeriodDuration(invoice) {
  const start = new Date(invoice.period_start)
  const end = new Date(invoice.period_end)
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}

function getRelativeDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} semanas`
  return `Hace ${Math.floor(diff / 30)} meses`
}

function getStatusIcon(status) {
  const icons = {
    draft: '⚪',
    sent: '🟨', 
    paid: '🟩',
    overdue: '🟧'
  }
  return icons[status] || '❓'
}

function getStatusText(status) {
  const texts = {
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
    overdue: 'Vencida'
  }
  return texts[status] || status
}

function toggleStatusFilter(status) {
  const index = filters.value.statuses.indexOf(status)
  if (index > -1) {
    filters.value.statuses.splice(index, 1)
  } else {
    filters.value.statuses.push(status)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedInvoices.value = []
  } else {
    selectedInvoices.value = paginatedInvoices.value.map(invoice => invoice._id)
  }
}

function clearFilters() {
  filters.value = {
    search: '',
    company: '',
    statuses: [],
    period: ''
  }
  currentPage.value = 1
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Placeholder functions (implement functionality later)
function openGenerateModal() {
  toast.info('Función en desarrollo: Generar Facturas')
}

function sendAllDraftInvoices() {
  toast.info('Función en desarrollo: Enviar Todas las Pendientes')
}

function exportReport() {
  toast.info('Función en desarrollo: Exportar Reporte')
}

function sendInvoice(invoiceId) {
  toast.info(`Función en desarrollo: Enviar factura ${invoiceId}`)
}

function markAsPaid(invoiceId) {
  toast.info(`Función en desarrollo: Marcar como pagada ${invoiceId}`)
}

function downloadInvoice(invoiceId) {
  toast.info(`Función en desarrollo: Descargar ${invoiceId}`)
}

function deleteInvoice(invoiceId) {
  toast.info(`Función en desarrollo: Eliminar ${invoiceId}`)
}

function viewInvoiceDetails(invoice) {
  toast.info(`Función en desarrollo: Ver detalles de ${invoice.invoice_number}`)
}

function showInvoiceMenu(invoice) {
  toast.info(`Función en desarrollo: Menú de ${invoice.invoice_number}`)
}

function bulkSendInvoices() {
  toast.info(`Función en desarrollo: Enviar ${selectedInvoices.value.length} facturas`)
}

function bulkMarkAsPaid() {
  toast.info(`Función en desarrollo: Marcar ${selectedInvoices.value.length} como pagadas`)
}

function bulkDelete() {
  toast.info(`Función en desarrollo: Eliminar ${selectedInvoices.value.length} facturas`)
}

// Mock data for development
onMounted(() => {
  // Simulated invoices data
  invoices.value = [
    {
      _id: '1',
      invoice_number: 'INV-202507-0001',
      company_id: { _id: 'comp1', name: 'Arumi Shopify', email: 'contacto@arumi.cl' },
      period_start: '2025-06-01',
      period_end: '2025-06-30',
      total_orders: 60,
      subtotal: 102500,
      tax_amount: 19475,
      total_amount: 121975,
      status: 'sent',
      created_at: '2025-07-01',
      due_date: '2025-08-01'
    },
    {
      _id: '2', 
      invoice_number: 'INV-202507-0002',
      company_id: { _id: 'comp2', name: 'Tech Solutions', email: 'admin@techsol.cl' },
      period_start: '2025-06-01',
      period_end: '2025-06-30',
      total_orders: 25,
      subtotal: 45000,
      tax_amount: 8550,
      total_amount: 53550,
      status: 'draft',
      created_at: '2025-07-02',
      due_date: '2025-08-02'
    },
    {
      _id: '3',
      invoice_number: 'INV-202507-0003', 
      company_id: { _id: 'comp3', name: 'Fashion Store', email: 'billing@fashion.cl' },
      period_start: '2025-05-01',
      period_end: '2025-05-31',
      total_orders: 89,
      subtotal: 178000,
      tax_amount: 33820,
      total_amount: 211820,
      status: 'paid',
      created_at: '2025-06-01',
      due_date: '2025-07-01'
    }
  ]

  companies.value = [
    { _id: 'comp1', name: 'Arumi Shopify' },
    { _id: 'comp2', name: 'Tech Solutions' },
    { _id: 'comp3', name: 'Fashion Store' }
  ]

  loading.value = false
})
</script>

<style scoped>
.billing-admin-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 24px;
}

/* Header */
.billing-header {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 36px;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.action-btn.primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.action-btn.success {
  background: #10b981;
  color: white;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
}

.action-btn.success:hover {
  background: #059669;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-btn.secondary:hover {
  background: #e5e7eb;
}

/* Metrics Dashboard */
.metrics-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metric-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-card.revenue {
  border-left: 4px solid #10b981;
}

.metric-card.invoices {
  border-left: 4px solid #3b82f6;
}

.metric-card.pending {
  border-left: 4px solid #f59e0b;
}

.metric-card.companies {
  border-left: 4px solid #8b5cf6;
}

.metric-icon {
  font-size: 40px;
  width: 64px;
  height: 64px;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.metric-change {
  font-size: 12px;
  font-weight: 500;
}

.metric-change.positive {
  color: #10b981;
}

.metric-amount {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 600;
}

/* Filters */
.filters-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.filters-container {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.search-group {
  flex: 1;
  min-width: 300px;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  min-width: 140px;
}

.status-filter-chips {
  display: flex;
  gap: 8px;
}

.status-chip {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.status-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-chip.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.status-chip.draft {
  border-color: #9ca3af;
}

.status-chip.draft.active {
  background: #9ca3af;
}

.status-chip.sent {
  border-color: #f59e0b;
}

.status-chip.sent.active {
  background: #f59e0b;
}

.status-chip.paid {
  border-color: #10b981;
}

.status-chip.paid.active {
  background: #10b981;
}

.status-chip.overdue {
  border-color: #ef4444;
}

.status-chip.overdue.active {
  background: #ef4444;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
}

/* Invoices Section */
.invoices-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 24px;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.selected-count {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.bulk-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn.send {
  background: #dbeafe;
  color: #1e40af;
}

.bulk-btn.send:hover {
  background: #bfdbfe;
}

.bulk-btn.paid {
  background: #d1fae5;
  color: #065f46;
}

.bulk-btn.paid:hover {
  background: #a7f3d0;
}

.bulk-btn.delete {
  background: #fee2e2;
  color: #991b1b;
}

.bulk-btn.delete:hover {
  background: #fecaca;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Table */
.invoices-table-container {
  overflow-x: auto;
}

.invoices-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.invoices-table th {
  background: #f9fafb;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.invoices-table th.checkbox-col {
  width: 40px;
  text-align: center;
}

.invoices-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.invoice-row {
  transition: background-color 0.2s;
}

.invoice-row:hover {
  background: #f9fafb;
}

.invoice-row.selected {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.checkbox-col {
  text-align: center;
  width: 40px;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.invoice-id {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-text {
  font-weight: 600;
  color: #1f2937;
}

.view-details-btn {
  padding: 4px;
  border: none;
  background: #f3f4f6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.view-details-btn:hover {
  background: #e5e7eb;
}

.company-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.company-name {
  font-weight: 500;
  color: #1f2937;
}

.company-email {
  font-size: 12px;
  color: #6b7280;
}

.period-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.period-text {
  font-weight: 500;
  color: #1f2937;
}

.period-days {
  font-size: 12px;
  color: #6b7280;
}

.orders-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.orders-count {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.orders-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.amount-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.amount-total {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.amount-detail {
  font-size: 12px;
  color: #6b7280;
}

.status-badge-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.draft {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge.sent {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.paid {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.overdue {
  background: #fee2e2;
  color: #991b1b;
}

.due-date {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 500;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-text {
  font-weight: 500;
  color: #1f2937;
}

.date-relative {
  font-size: 12px;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.send {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn.send:hover {
  background: #bfdbfe;
  transform: scale(1.1);
}

.action-btn.paid {
  background: #d1fae5;
  color: #065f46;
}

.action-btn.paid:hover {
  background: #a7f3d0;
  transform: scale(1.1);
}

.action-btn.download {
  background: #f3f4f6;
  color: #374151;
}

.action-btn.download:hover {
  background: #e5e7eb;
  transform: scale(1.1);
}

.action-btn.delete {
  background: #fee2e2;
  color: #991b1b;
}

.action-btn.delete:hover {
  background: #fecaca;
  transform: scale(1.1);
}

.action-btn.more {
  background: #f3f4f6;
  color: #6b7280;
}

.action-btn.more:hover {
  background: #e5e7eb;
  transform: scale(1.1);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.empty-description {
  font-size: 16px;
  margin: 0 0 32px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-action-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-numbers {
  display: flex;
  gap: 4px;
}

.pagination-number {
  width: 36px;
  height: 36px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-number:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.pagination-number.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* Responsive */
@media (max-width: 1200px) {
  .metrics-dashboard {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-container {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .search-group {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .billing-admin-page {
    padding: 16px;
  }
  
  .billing-header {
    padding: 24px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
  }
  
  .quick-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .action-btn {
    flex: 1;
    justify-content: center;
  }
  
  .metrics-dashboard {
    grid-template-columns: 1fr;
  }
  
  .metric-card {
    padding: 20px;
  }
  
  .metric-icon {
    font-size: 32px;
    width: 48px;
    height: 48px;
  }
  
  .metric-value {
    font-size: 24px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .bulk-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .invoices-table {
    font-size: 12px;
  }
  
  .invoices-table th,
  .invoices-table td {
    padding: 8px 12px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .pagination-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .pagination-number {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }
  
  .title-icon {
    font-size: 28px;
  }
  
  .quick-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .metric-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .invoices-table-container {
    margin: 0 -24px;
  }
  
  .invoices-table {
    font-size: 11px;
  }
  
  .status-filter-chips {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .status-chip {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>