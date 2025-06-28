<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">
        {{ isAdmin ? 'Facturas del Sistema' : 'Mis Facturas' }}
      </h1>
      <div class="header-actions">
        <button @click="generateInvoice" class="btn-primary" :disabled="generating">
          {{ generating ? 'Generando...' : '📄 Generar Factura' }}
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters-grid">
        <select v-model="filters.status" @change="fetchInvoices">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="paid">Pagada</option>
          <option value="overdue">Vencida</option>
          <option value="cancelled">Cancelada</option>
        </select>
        
        <select v-if="isAdmin" v-model="filters.company_id" @change="fetchInvoices">
          <option value="">Todas las empresas</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
        
        <select v-model="filters.period" @change="fetchInvoices">
          <option value="">Todos los períodos</option>
          <option value="current">Mes actual</option>
          <option value="last">Mes anterior</option>
          <option value="quarter">Último trimestre</option>
          <option value="year">Último año</option>
        </select>
        
        <input 
          type="text" 
          v-model="filters.search" 
          @input="debounceSearch"
          placeholder="Buscar por número o empresa..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Resumen de Facturación -->
    <div class="billing-summary">
      <div class="summary-card">
        <div class="summary-icon">📄</div>
        <div class="summary-info">
          <div class="summary-value">{{ invoiceSummary.total }}</div>
          <div class="summary-label">Total Facturas</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">💰</div>
        <div class="summary-info">
          <div class="summary-value">${{ formatCurrency(invoiceSummary.totalAmount) }}</div>
          <div class="summary-label">Monto Total</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">✅</div>
        <div class="summary-info">
          <div class="summary-value">{{ invoiceSummary.paid }}</div>
          <div class="summary-label">Pagadas</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">⏰</div>
        <div class="summary-info">
          <div class="summary-value">{{ invoiceSummary.pending }}</div>
          <div class="summary-label">Pendientes</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando facturas...</div>

    <div v-else class="content-section">
      <div class="table-wrapper">
        <table class="invoices-table">
          <thead>
            <tr>
              <th>Número</th>
              <th v-if="isAdmin">Empresa</th>
              <th>Período</th>
              <th>Pedidos</th>
              <th>Subtotal</th>
              <th>IVA</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha Emisión</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="invoices.length === 0">
              <td :colspan="isAdmin ? 11 : 10" class="empty-row">
                No se encontraron facturas.
              </td>
            </tr>
            <tr v-else v-for="invoice in invoices" :key="invoice._id" class="invoice-row">
              <td class="invoice-number">
                <div class="invoice-id">{{ invoice.invoice_number }}</div>
                <div class="invoice-type">{{ getInvoiceType(invoice.type) }}</div>
              </td>
              <td v-if="isAdmin" class="company-name">{{ invoice.company?.name || 'N/A' }}</td>
              <td class="invoice-period">
                <div class="period-text">{{ formatPeriod(invoice.period_start, invoice.period_end) }}</div>
                <div class="period-duration">{{ calculateDays(invoice.period_start, invoice.period_end) }} días</div>
              </td>
              <td class="orders-count">
                <div class="orders-total">{{ invoice.orders_count || 0 }}</div>
                <div class="orders-detail">pedidos</div>
              </td>
              <td class="amount-subtotal">${{ formatCurrency(invoice.subtotal) }}</td>
              <td class="amount-tax">${{ formatCurrency(invoice.tax_amount) }}</td>
              <td class="amount-total">
                <div class="total-amount">${{ formatCurrency(invoice.total_amount) }}</div>
              </td>
              <td class="invoice-status">
                <span class="status-badge" :class="invoice.status">
                  {{ getStatusText(invoice.status) }}
                </span>
              </td>
              <td class="issue-date">{{ formatDate(invoice.issue_date) }}</td>
              <td class="due-date">
                <div class="due-date-text">{{ formatDate(invoice.due_date) }}</div>
                <div class="due-indicator" :class="getDueStatus(invoice.due_date, invoice.status)">
                  {{ getDueText(invoice.due_date, invoice.status) }}
                </div>
              </td>
              <td class="invoice-actions">
                <div class="action-buttons">
                  <button @click="viewInvoice(invoice)" class="btn-action view" title="Ver Factura">
                    👁️
                  </button>
                  <button @click="downloadInvoice(invoice)" class="btn-action download" title="Descargar PDF">
                    📥
                  </button>
                  <button 
                    v-if="invoice.status === 'draft'" 
                    @click="sendInvoice(invoice)" 
                    class="btn-action send" 
                    title="Enviar Factura"
                  >
                    📧
                  </button>
                  <button 
                    v-if="invoice.status !== 'paid' && invoice.status !== 'cancelled'"
                    @click="markAsPaid(invoice)" 
                    class="btn-action pay" 
                    title="Marcar como Pagada"
                  >
                    ✅
                  </button>
                  <button 
                    v-if="isAdmin && invoice.status === 'draft'"
                    @click="cancelInvoice(invoice)" 
                    class="btn-action cancel" 
                    title="Cancelar Factura"
                  >
                    ❌
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="page-btn">
          ← Anterior
        </button>
        <span class="page-info">
          Página {{ pagination.page }} de {{ pagination.totalPages }}
        </span>
        <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages" class="page-btn">
          Siguiente →
        </button>
      </div>
    </div>

    <!-- Modal de Vista de Factura -->
    <Modal v-model="showInvoiceModal" :title="`Factura ${selectedInvoice?.invoice_number}`" width="800px">
      <div v-if="selectedInvoice" class="invoice-preview">
        <!-- Encabezado de la Factura -->
        <div class="invoice-header">
          <div class="invoice-company-info">
            <h3>enviGo</h3>
            <p>Sistema de Gestión de Envíos</p>
            <p>RUT: 12.345.678-9</p>
            <p>Dirección: Santiago, Chile</p>
          </div>
          <div class="invoice-details">
            <h2>{{ getInvoiceType(selectedInvoice.type) }}</h2>
            <p><strong>Número:</strong> {{ selectedInvoice.invoice_number }}</p>
            <p><strong>Fecha:</strong> {{ formatDate(selectedInvoice.issue_date) }}</p>
            <p><strong>Vencimiento:</strong> {{ formatDate(selectedInvoice.due_date) }}</p>
          </div>
        </div>

        <!-- Información del Cliente -->
        <div class="invoice-client">
          <h4>Facturar a:</h4>
          <div class="client-info">
            <p><strong>{{ selectedInvoice.company?.name }}</strong></p>
            <p>RUT: {{ selectedInvoice.company?.rut || 'No disponible' }}</p>
            <p>{{ selectedInvoice.company?.address || 'Dirección no disponible' }}</p>
            <p>{{ selectedInvoice.company?.contact_email || 'Email no disponible' }}</p>
          </div>
        </div>

        <!-- Detalle de Servicios -->
        <div class="invoice-details-section">
          <h4>Detalle de Servicios</h4>
          <table class="invoice-detail-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Período</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Procesamiento de Pedidos</td>
                <td>{{ formatPeriod(selectedInvoice.period_start, selectedInvoice.period_end) }}</td>
                <td>{{ selectedInvoice.orders_count }} pedidos</td>
                <td>${{ formatCurrency(selectedInvoice.price_per_order) }}</td>
                <td>${{ formatCurrency(selectedInvoice.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totales -->
        <div class="invoice-totals">
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${{ formatCurrency(selectedInvoice.subtotal) }}</span>
            </div>
            <div class="total-row">
              <span>IVA (19%):</span>
              <span>${{ formatCurrency(selectedInvoice.tax_amount) }}</span>
            </div>
            <div class="total-row final">
              <span>Total a Pagar:</span>
              <span>${{ formatCurrency(selectedInvoice.total_amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Información de Pago -->
        <div class="payment-info">
          <h4>Información de Pago</h4>
          <p>Banco: Banco de Chile</p>
          <p>Cuenta Corriente: 123-456-789</p>
          <p>RUT: 12.345.678-9</p>
          <p>Email: facturacion@envigo.cl</p>
        </div>

        <!-- Acciones del Modal -->
        <div class="invoice-modal-actions">
          <button @click="downloadInvoice(selectedInvoice)" class="btn-secondary">
            📥 Descargar PDF
          </button>
          <button 
            v-if="selectedInvoice.status === 'draft'" 
            @click="sendInvoice(selectedInvoice)" 
            class="btn-primary"
          >
            📧 Enviar por Email
          </button>
          <button 
            v-if="selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled'"
            @click="markAsPaid(selectedInvoice)" 
            class="btn-success"
          >
            ✅ Marcar como Pagada
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de Generar Factura -->
    <Modal v-model="showGenerateModal" title="Generar Nueva Factura" width="600px">
      <div class="generate-invoice-form">
        <div class="form-group" v-if="isAdmin">
          <label for="invoice-company">Empresa</label>
          <select id="invoice-company" v-model="generateForm.company_id" required>
            <option value="">Seleccionar empresa...</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="period-start">Período Desde</label>
            <input id="period-start" type="date" v-model="generateForm.period_start" required>
          </div>
          <div class="form-group">
            <label for="period-end">Período Hasta</label>
            <input id="period-end" type="date" v-model="generateForm.period_end" required>
          </div>
        </div>

        <div class="form-group">
          <label for="invoice-type">Tipo de Documento</label>
          <select id="invoice-type" v-model="generateForm.type">
            <option value="invoice">Factura</option>
            <option value="proforma">Factura Proforma</option>
            <option value="credit_note">Nota de Crédito</option>
          </select>
        </div>

        <!-- Preview de la factura a generar -->
        <div v-if="generatePreview" class="generate-preview">
          <h4>Vista Previa</h4>
          <div class="preview-content">
            <div class="preview-row">
              <span>Empresa:</span>
              <span>{{ getSelectedCompanyName() }}</span>
            </div>
            <div class="preview-row">
              <span>Período:</span>
              <span>{{ formatPeriod(generateForm.period_start, generateForm.period_end) }}</span>
            </div>
            <div class="preview-row">
              <span>Pedidos estimados:</span>
              <span>{{ generatePreview.estimated_orders }} pedidos</span>
            </div>
            <div class="preview-row">
              <span>Subtotal:</span>
              <span>${{ formatCurrency(generatePreview.subtotal) }}</span>
            </div>
            <div class="preview-row">
              <span>IVA:</span>
              <span>${{ formatCurrency(generatePreview.tax) }}</span>
            </div>
            <div class="preview-row total">
              <span>Total:</span>
              <span>${{ formatCurrency(generatePreview.total) }}</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showGenerateModal = false" class="btn-cancel">Cancelar</button>
          <button @click="confirmGenerateInvoice" :disabled="!canGenerate" class="btn-save">
            Generar Factura
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import Modal from '../components/Modal.vue'

const auth = useAuthStore()

// Estado principal
const invoices = ref([])
const companies = ref([])
const loading = ref(true)
const generating = ref(false)

// Modales
const showInvoiceModal = ref(false)
const showGenerateModal = ref(false)
const selectedInvoice = ref(null)

// Filtros
const filters = ref({
  status: '',
  company_id: '',
  period: '',
  search: ''
})

// Paginación
const pagination = ref({
  page: 1,
  limit: 15,
  total: 0,
  totalPages: 1
})

// Formulario de generación
const generateForm = ref({
  company_id: '',
  period_start: '',
  period_end: '',
  type: 'invoice'
})

// Computed properties
const isAdmin = computed(() => auth.user?.role === 'admin')

const invoiceSummary = computed(() => {
  const summary = {
    total: invoices.value.length,
    totalAmount: 0,
    paid: 0,
    pending: 0
  }
  
  invoices.value.forEach(invoice => {
    summary.totalAmount += invoice.total_amount || 0
    if (invoice.status === 'paid') summary.paid++
    if (['sent', 'overdue'].includes(invoice.status)) summary.pending++
  })
  
  return summary
})

const generatePreview = computed(() => {
  if (!generateForm.value.company_id || !generateForm.value.period_start || !generateForm.value.period_end) {
    return null
  }
  
  const company = companies.value.find(c => c._id === generateForm.value.company_id)
  if (!company) return null
  
  // Calcular días del período
  const startDate = new Date(generateForm.value.period_start)
  const endDate = new Date(generateForm.value.period_end)
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  
  // Estimar pedidos basado en el promedio diario
  const avgOrdersPerDay = (company.orders_this_month || 10) / 30
  const estimated_orders = Math.round(avgOrdersPerDay * days)
  
  const subtotal = estimated_orders * (company.price_per_order || 0)
  const tax = Math.round(subtotal * 0.19)
  const total = subtotal + tax
  
  return {
    estimated_orders,
    subtotal,
    tax,
    total
  }
})

const canGenerate = computed(() => {
  return generateForm.value.period_start && 
         generateForm.value.period_end && 
         (isAdmin.value ? generateForm.value.company_id : true)
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchInvoices(),
    isAdmin.value ? fetchCompanies() : null
  ])
})

// Watchers
watch(() => generateForm.value.company_id, () => {
  // Reset fechas cuando cambia la empresa
  generateForm.value.period_start = ''
  generateForm.value.period_end = ''
})

// Funciones principales
async function fetchInvoices() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    }
    
    // Si no es admin, solo sus facturas
    if (!isAdmin.value) {
      params.company_id = auth.user?.company_id || auth.user?.company?._id
    }
    
    const { data } = await apiService.invoices?.getAll(params) || { data: generateMockInvoices() }
    
    invoices.value = data.invoices || data
    pagination.value = data.pagination || { page: 1, limit: 15, total: data.length, totalPages: 1 }
    
  } catch (error) {
    console.error('Error fetching invoices:', error)
    // Generar datos mock para demo
    invoices.value = generateMockInvoices()
  } finally {
    loading.value = false
  }
}

async function fetchCompanies() {
  if (!isAdmin.value) return
  
  try {
    const { data } = await apiService.companies.getAll()
    companies.value = data
  } catch (error) {
    console.error('Error fetching companies:', error)
  }
}

function generateMockInvoices() {
  const mockInvoices = []
  const currentCompany = auth.user?.company_id || 'company1'
  
  for (let i = 1; i <= 10; i++) {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - i)
    startDate.setDate(1)
    
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0)
    
    const ordersCount = Math.floor(Math.random() * 50) + 10
    const pricePerOrder = 400 + Math.floor(Math.random() * 300)
    const subtotal = ordersCount * pricePerOrder
    const taxAmount = Math.round(subtotal * 0.19)
    
    const statuses = ['paid', 'sent', 'overdue', 'draft']
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    mockInvoices.push({
      _id: `invoice_${i}`,
      invoice_number: `INV-2024-${String(i).padStart(4, '0')}`,
      company: {
        _id: isAdmin.value ? `company_${i % 3 + 1}` : currentCompany,
        name: isAdmin.value ? [`TechStore ${i}`, `E-commerce Plus ${i}`, `Digital Sales ${i}`][i % 3] : 'Mi Empresa',
        rut: `12.345.67${i}-K`,
        address: 'Las Condes, Santiago',
        contact_email: `contacto${i}@empresa.cl`
      },
      type: 'invoice',
      period_start: startDate.toISOString(),
      period_end: endDate.toISOString(),
      orders_count: ordersCount,
      price_per_order: pricePerOrder,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount,
      status: status,
      issue_date: new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  }
  
  return mockInvoices.reverse()
}

// Funciones de acciones
async function generateInvoice() {
  if (isAdmin.value) {
    // Admin puede elegir empresa
    showGenerateModal.value = true
  } else {
    // Company owner genera para su empresa
    generateForm.value.company_id = auth.user?.company_id || auth.user?.company?._id
    
    // Sugerir período del mes anterior
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0)
    
    generateForm.value.period_start = startDate.toISOString().split('T')[0]
    generateForm.value.period_end = endDate.toISOString().split('T')[0]
    
    showGenerateModal.value = true
  }
}

async function confirmGenerateInvoice() {
  generating.value = true
  try {
    const invoiceData = {
      ...generateForm.value,
      orders_count: generatePreview.value?.estimated_orders || 0,
      subtotal: generatePreview.value?.subtotal || 0,
      tax_amount: generatePreview.value?.tax || 0,
      total_amount: generatePreview.value?.total || 0
    }
    
    // Simular creación de factura
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // En producción sería:
    // await apiService.invoices.create(invoiceData)
    
    alert('Factura generada exitosamente')
    showGenerateModal.value = false
    resetGenerateForm()
    await fetchInvoices()
    
  } catch (error) {
    alert(`Error al generar factura: ${error.message}`)
  } finally {
    generating.value = false
  }
}

function resetGenerateForm() {
  generateForm.value = {
    company_id: '',
    period_start: '',
    period_end: '',
    type: 'invoice'
  }
}

async function viewInvoice(invoice) {
  selectedInvoice.value = invoice
  showInvoiceModal.value = true
}

async function downloadInvoice(invoice) {
  try {
    // Simular descarga de PDF
    const link = document.createElement('a')
    link.href = '#'
    link.download = `${invoice.invoice_number}.pdf`
    
    // En producción sería:
    // const response = await apiService.invoices.downloadPDF(invoice._id)
    // const blob = new Blob([response.data], { type: 'application/pdf' })
    // const url = window.URL.createObjectURL(blob)
    // link.href = url
    
    alert(`Descargando factura ${invoice.invoice_number}`)
    // link.click()
    
  } catch (error) {
    alert(`Error al descargar factura: ${error.message}`)
  }
}

async function sendInvoice(invoice) {
  const confirmation = confirm(`¿Enviar la factura ${invoice.invoice_number} por email?`)
  if (!confirmation) return
  
  try {
    // await apiService.invoices.send(invoice._id)
    
    // Simular envío
    invoice.status = 'sent'
    alert('Factura enviada por email exitosamente')
    
  } catch (error) {
    alert(`Error al enviar factura: ${error.message}`)
  }
}

async function markAsPaid(invoice) {
  const confirmation = confirm(`¿Marcar la factura ${invoice.invoice_number} como pagada?`)
  if (!confirmation) return
  
  try {
    // await apiService.invoices.markAsPaid(invoice._id)
    
    // Simular pago
    invoice.status = 'paid'
    alert('Factura marcada como pagada')
    
  } catch (error) {
    alert(`Error al marcar factura como pagada: ${error.message}`)
  }
}

async function cancelInvoice(invoice) {
  const confirmation = confirm(`¿Cancelar la factura ${invoice.invoice_number}? Esta acción no se puede deshacer.`)
  if (!confirmation) return
  
  try {
    // await apiService.invoices.cancel(invoice._id)
    
    // Simular cancelación
    invoice.status = 'cancelled'
    alert('Factura cancelada')
    
  } catch (error) {
    alert(`Error al cancelar factura: ${error.message}`)
  }
}

// Funciones de utilidad
function getInvoiceType(type) {
  const types = {
    invoice: 'Factura',
    proforma: 'Factura Proforma',
    credit_note: 'Nota de Crédito'
  }
  return types[type] || 'Factura'
}

function getStatusText(status) {
  const statuses = {
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
    overdue: 'Vencida',
    cancelled: 'Cancelada'
  }
  return statuses[status] || status
}

function getDueStatus(dueDate, status) {
  if (status === 'paid') return 'paid'
  if (status === 'cancelled') return 'cancelled'
  
  const now = new Date()
  const due = new Date(dueDate)
  
  if (due < now) return 'overdue'
  if (due - now < 7 * 24 * 60 * 60 * 1000) return 'due-soon'
  return 'ok'
}

function getDueText(dueDate, status) {
  if (status === 'paid') return 'Pagada'
  if (status === 'cancelled') return 'Cancelada'
  
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return `Vencida ${Math.abs(diffDays)} días`
  if (diffDays === 0) return 'Vence hoy'
  if (diffDays <= 7) return `Vence en ${diffDays} días`
  return 'En plazo'
}

function formatPeriod(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const startStr = start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  const endStr = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  
  return `${startStr} - ${endStr}`
}

function calculateDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function getSelectedCompanyName() {
  if (!generateForm.value.company_id) return 'Seleccionar empresa'
  const company = companies.value.find(c => c._id === generateForm.value.company_id)
  return company?.name || 'Empresa no encontrada'
}

// Funciones de navegación y filtros
function goToPage(page) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page
    fetchInvoices()
  }
}

let searchTimeout
function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    fetchInvoices()
  }, 500)
}
</script>

<style scoped>
.page-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary, .btn-success {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover {
  background-color: #059669;
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Filtros */
.filters-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: center;
}

.filters-grid select,
.filters-grid input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-input {
  grid-column: span 2;
}

/* Resumen de Facturación */
.billing-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.summary-icon {
  font-size: 32px;
  opacity: 0.8;
}

.summary-info {
  flex: 1;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

/* Tabla de Facturas */
.content-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.invoices-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.invoices-table th,
.invoices-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 14px;
}

.invoices-table th {
  background: #f9fafb;
  font-weight: 600;
  font-size: 12px;
  color: #374151;
  position: sticky;
  top: 0;
}

.invoice-row:hover {
  background: #f9fafb;
}

/* Estilos específicos por columna */
.invoice-number {
  min-width: 120px;
}

.invoice-id {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.invoice-type {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
}

.company-name {
  font-weight: 500;
  color: #1f2937;
  min-width: 150px;
}

.invoice-period {
  min-width: 180px;
}

.period-text {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.period-duration {
  font-size: 11px;
  color: #6b7280;
}

.orders-count {
  text-align: center;
  min-width: 80px;
}

.orders-total {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.orders-detail {
  font-size: 11px;
  color: #6b7280;
}

.amount-subtotal,
.amount-tax,
.amount-total {
  text-align: right;
  font-weight: 600;
  min-width: 100px;
}

.amount-total {
  color: #1f2937;
}

.total-amount {
  font-size: 16px;
  font-weight: 700;
}

.invoice-status {
  min-width: 100px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.draft {
  background: #f3f4f6;
  color: #374151;
}

.status-badge.sent {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.paid {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.overdue {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.cancelled {
  background: #f3f4f6;
  color: #6b7280;
}

.issue-date,
.due-date {
  min-width: 120px;
  font-size: 13px;
}

.due-date-text {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.due-indicator {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.due-indicator.ok {
  color: #10b981;
}

.due-indicator.due-soon {
  color: #f59e0b;
}

.due-indicator.overdue {
  color: #ef4444;
}

.due-indicator.paid {
  color: #10b981;
}

.due-indicator.cancelled {
  color: #6b7280;
}

/* Acciones */
.invoice-actions {
  min-width: 150px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-action {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action.view {
  background: #dbeafe;
  color: #1e40af;
}

.btn-action.download {
  background: #d1fae5;
  color: #065f46;
}

.btn-action.send {
  background: #fef3c7;
  color: #92400e;
}

.btn-action.pay {
  background: #d1fae5;
  color: #065f46;
}

.btn-action.cancel {
  background: #fee2e2;
  color: #991b1b;
}

.btn-action:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Paginación */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.page-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.page-btn:hover {
  background: #2563eb;
}

.page-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.page-info {
  color: #6b7280;
  font-size: 14px;
}

/* Modal de Vista de Factura */
.invoice-preview {
  max-height: 80vh;
  overflow-y: auto;
}

.invoice-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.invoice-company-info h3 {
  font-size: 24px;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.invoice-company-info p {
  margin: 2px 0;
  color: #6b7280;
  font-size: 14px;
}

.invoice-details {
  text-align: right;
}

.invoice-details h2 {
  font-size: 28px;
  color: #4f46e5;
  margin: 0 0 16px 0;
}

.invoice-details p {
  margin: 4px 0;
  font-size: 14px;
}

.invoice-client {
  margin-bottom: 30px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
}

.invoice-client h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
}

.client-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #374151;
}

.invoice-details-section {
  margin-bottom: 30px;
}

.invoice-details-section h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
}

.invoice-detail-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.invoice-detail-table th,
.invoice-detail-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.invoice-detail-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.invoice-detail-table td:last-child,
.invoice-detail-table th:last-child {
  text-align: right;
}

.invoice-totals {
  margin-bottom: 30px;
  display: flex;
  justify-content: flex-end;
}

.totals-section {
  min-width: 300px;
  background: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.total-row.final {
  border-top: 2px solid #d1d5db;
  margin-top: 12px;
  padding-top: 16px;
  font-weight: 700;
  font-size: 18px;
  color: #1f2937;
}

.payment-info {
  background: #eff6ff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  margin-bottom: 30px;
}

.payment-info h4 {
  margin: 0 0 12px 0;
  color: #1e40af;
}

.payment-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #3b82f6;
}

.invoice-modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

/* Modal de Generar Factura */
.generate-invoice-form {
  max-height: 70vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.generate-preview {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
}

.generate-preview h4 {
  margin: 0 0 12px 0;
  color: #0369a1;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
}

.preview-row.total {
  border-top: 1px solid #bae6fd;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 600;
  color: #0369a1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-save {
  padding: 10px 20px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-cancel {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-cancel:hover {
  background-color: #d1d5db;
}

.btn-save {
  background-color: #4f46e5;
  color: white;
}

.btn-save:hover {
  background-color: #4338ca;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Estados de carga y vacío */
.loading,
.empty-row {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-style: italic;
}

/* Responsive */
@media (max-width: 1200px) {
  .search-input {
    grid-column: span 1;
  }
  
  .billing-summary {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .invoice-header {
    grid-template-columns: 1fr;
    text-align: left;
  }
  
  .invoice-details {
    text-align: left;
    margin-top: 20px;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .billing-summary {
    grid-template-columns: 1fr;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .invoices-table {
    font-size: 12px;
  }
  
  .invoices-table th,
  .invoices-table td {
    padding: 8px 12px;
  }
  
  .action-buttons {
    gap: 2px;
  }
  
  .btn-action {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .invoice-modal-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .summary-card {
    flex-direction: column;
    text-align: center;
  }
  
  .summary-icon {
    font-size: 24px;
  }
  
  .invoice-preview {
    padding: 16px;
  }
  
  .totals-section {
    min-width: auto;
  }
}
</style>