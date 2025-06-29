<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Mis Facturas</h1>
      <div class="header-actions">
        <button @click="requestInvoice" class="btn-secondary">
          📄 Solicitar Factura
        </button>
        <button @click="exportInvoices" class="btn-primary" :disabled="loading">
          📊 Exportar Facturas
        </button>
      </div>
    </div>

    <!-- Filtros Simples para Company -->
    <div class="filters-section">
      <div class="filters-grid">
        <select v-model="filters.status" @change="fetchInvoices">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="paid">Pagada</option>
          <option value="overdue">Vencida</option>
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
          placeholder="Buscar por número de factura..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Resumen de Facturación para Company -->
    <div class="billing-summary">
      <div class="summary-card pending">
        <div class="summary-icon">⏰</div>
        <div class="summary-info">
          <div class="summary-value">${{ formatCurrency(invoiceSummary.pendingAmount) }}</div>
          <div class="summary-label">Monto Pendiente</div>
          <div class="summary-detail">{{ invoiceSummary.pendingCount }} factura{{ invoiceSummary.pendingCount !== 1 ? 's' : '' }}</div>
        </div>
      </div>
      
      <div class="summary-card paid">
        <div class="summary-icon">✅</div>
        <div class="summary-info">
          <div class="summary-value">${{ formatCurrency(invoiceSummary.paidAmount) }}</div>
          <div class="summary-label">Total Pagado</div>
          <div class="summary-detail">{{ invoiceSummary.paidCount }} factura{{ invoiceSummary.paidCount !== 1 ? 's' : '' }}</div>
        </div>
      </div>
      
      <div class="summary-card orders">
        <div class="summary-icon">📦</div>
        <div class="summary-info">
          <div class="summary-value">{{ invoiceSummary.totalOrders }}</div>
          <div class="summary-label">Pedidos Facturados</div>
          <div class="summary-detail">Este mes: {{ invoiceSummary.ordersThisMonth }}</div>
        </div>
      </div>
      
      <div class="summary-card rate">
        <div class="summary-icon">💰</div>
        <div class="summary-info">
          <div class="summary-value">${{ formatCurrency(currentPricing.pricePerOrder) }}</div>
          <div class="summary-label">Precio por Pedido</div>
          <div class="summary-detail">+ IVA: ${{ formatCurrency(currentPricing.ivaPerOrder) }}</div>
        </div>
      </div>
    </div>

    <!-- Información de Facturación Actual -->
    <div class="current-billing-info">
      <div class="billing-info-card">
        <h3>Información de Facturación</h3>
        <div class="billing-details">
          <div class="billing-row">
            <span class="label">Plan Actual:</span>
            <span class="value">
              <span class="plan-badge" :class="currentPricing.planType">
                {{ getPlanName(currentPricing.planType) }}
              </span>
            </span>
          </div>
          <div class="billing-row">
            <span class="label">Precio Base por Pedido:</span>
            <span class="value">${{ formatCurrency(currentPricing.pricePerOrder) }}</span>
          </div>
          <div class="billing-row">
            <span class="label">IVA por Pedido (19%):</span>
            <span class="value">${{ formatCurrency(currentPricing.ivaPerOrder) }}</span>
          </div>
          <div class="billing-row total">
            <span class="label">Total por Pedido:</span>
            <span class="value">${{ formatCurrency(currentPricing.totalPerOrder) }}</span>
          </div>
          <div class="billing-row">
            <span class="label">Ciclo de Facturación:</span>
            <span class="value">{{ getBillingCycleName(currentPricing.billingCycle) }}</span>
          </div>
        </div>
      </div>

      <div class="next-invoice-preview">
        <h3>Próxima Factura Estimada</h3>
        <div class="preview-content">
          <div class="preview-period">
            <span class="period-label">Período:</span>
            <span class="period-value">{{ nextInvoicePeriod }}</span>
          </div>
          <div class="preview-orders">
            <span class="orders-label">Pedidos hasta ahora:</span>
            <span class="orders-value">{{ nextInvoiceEstimate.ordersCount }} pedidos</span>
          </div>
          <div class="preview-amounts">
            <div class="amount-row">
              <span>Subtotal:</span>
              <span>${{ formatCurrency(nextInvoiceEstimate.subtotal) }}</span>
            </div>
            <div class="amount-row">
              <span>IVA:</span>
              <span>${{ formatCurrency(nextInvoiceEstimate.iva) }}</span>
            </div>
            <div class="amount-row total">
              <span>Total Estimado:</span>
              <span>${{ formatCurrency(nextInvoiceEstimate.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando facturas...</div>

    <div v-else class="content-section">
      <!-- Tabla de Facturas Simplificada para Company -->
      <div class="table-wrapper">
        <table class="invoices-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Período</th>
              <th>Pedidos</th>
              <th>Subtotal</th>
              <th>IVA</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="invoices.length === 0">
              <td colspan="9" class="empty-row">
                No tienes facturas aún. Las facturas se generan automáticamente al final de cada mes.
              </td>
            </tr>
            <tr v-else v-for="invoice in invoices" :key="invoice._id" class="invoice-row">
              <td class="invoice-number">
                <div class="invoice-id">{{ invoice.invoice_number }}</div>
                <div class="invoice-date">{{ formatDate(invoice.issue_date) }}</div>
              </td>
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
                    v-if="invoice.status === 'sent' || invoice.status === 'overdue'"
                    @click="reportPayment(invoice)" 
                    class="btn-action pay" 
                    title="Reportar Pago"
                  >
                    💳
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
    <Modal v-model="showInvoiceModal" :title="`Factura ${selectedInvoice?.invoice_number}`" width="700px">
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
            <h2>Factura</h2>
            <p><strong>Número:</strong> {{ selectedInvoice.invoice_number }}</p>
            <p><strong>Fecha:</strong> {{ formatDate(selectedInvoice.issue_date) }}</p>
            <p><strong>Vencimiento:</strong> {{ formatDate(selectedInvoice.due_date) }}</p>
          </div>
        </div>

        <!-- Información del Cliente -->
        <div class="invoice-client">
          <h4>Facturar a:</h4>
          <div class="client-info">
            <p><strong>{{ companyInfo.name }}</strong></p>
            <p>RUT: {{ companyInfo.rut || 'No disponible' }}</p>
            <p>{{ companyInfo.address || 'Dirección no disponible' }}</p>
            <p>{{ companyInfo.contactEmail || 'Email no disponible' }}</p>
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
            v-if="selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue'"
            @click="reportPayment(selectedInvoice)" 
            class="btn-primary"
          >
            💳 Reportar Pago
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de Solicitar Factura -->
    <Modal v-model="showRequestModal" title="Solicitar Nueva Factura" width="500px">
      <div class="request-invoice-form">
        <div class="form-section">
          <h4>Período a Facturar</h4>
          <p class="form-description">
            Solicita una factura para un período específico de pedidos.
          </p>
          
          <div class="form-row">
            <div class="form-group">
              <label for="request-period-start">Período Desde</label>
              <input id="request-period-start" type="date" v-model="requestForm.period_start" required>
            </div>
            <div class="form-group">
              <label for="request-period-end">Período Hasta</label>
              <input id="request-period-end" type="date" v-model="requestForm.period_end" required>
            </div>
          </div>

          <div class="form-group">
            <label for="request-notes">Notas Adicionales (Opcional)</label>
            <textarea 
              id="request-notes"
              v-model="requestForm.notes"
              placeholder="Especifica cualquier detalle adicional para la factura..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- Preview de la solicitud -->
        <div v-if="requestPreview" class="request-preview">
          <h4>Vista Previa de Solicitud</h4>
          <div class="preview-content">
            <div class="preview-row">
              <span>Período:</span>
              <span>{{ formatPeriod(requestForm.period_start, requestForm.period_end) }}</span>
            </div>
            <div class="preview-row">
              <span>Pedidos estimados:</span>
              <span>{{ requestPreview.estimatedOrders }} pedidos</span>
            </div>
            <div class="preview-row">
              <span>Monto estimado:</span>
              <span>${{ formatCurrency(requestPreview.estimatedAmount) }}</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showRequestModal = false" class="btn-cancel">Cancelar</button>
          <button @click="submitInvoiceRequest" :disabled="!canRequest || requesting" class="btn-save">
            {{ requesting ? 'Enviando...' : 'Enviar Solicitud' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de Reportar Pago -->
    <Modal v-model="showPaymentModal" title="Reportar Pago de Factura" width="500px">
      <div v-if="selectedInvoice" class="payment-report-form">
        <div class="payment-info-section">
          <h4>Factura: {{ selectedInvoice.invoice_number }}</h4>
          <p>Monto Total: ${{ formatCurrency(selectedInvoice.total_amount) }}</p>
        </div>

        <div class="form-group">
          <label for="payment-date">Fecha de Pago</label>
          <input id="payment-date" type="date" v-model="paymentForm.payment_date" required>
        </div>

        <div class="form-group">
          <label for="payment-method">Método de Pago</label>
          <select id="payment-method" v-model="paymentForm.payment_method" required>
            <option value="">Seleccionar método...</option>
            <option value="bank_transfer">Transferencia Bancaria</option>
            <option value="check">Cheque</option>
            <option value="cash">Efectivo</option>
            <option value="credit_card">Tarjeta de Crédito</option>
          </select>
        </div>

        <div class="form-group">
          <label for="payment-reference">Referencia de Pago</label>
          <input 
            id="payment-reference"
            type="text" 
            v-model="paymentForm.payment_reference"
            placeholder="Número de transferencia, cheque, etc."
          >
        </div>

        <div class="form-group">
          <label for="payment-notes">Notas Adicionales</label>
          <textarea 
            id="payment-notes"
            v-model="paymentForm.notes"
            placeholder="Información adicional sobre el pago..."
            rows="3"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button @click="showPaymentModal = false" class="btn-cancel">Cancelar</button>
          <button @click="submitPaymentReport" :disabled="!canReportPayment || reportingPayment" class="btn-save">
            {{ reportingPayment ? 'Reportando...' : 'Reportar Pago' }}
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
const loading = ref(true)

// Modales
const showInvoiceModal = ref(false)
const showRequestModal = ref(false)
const showPaymentModal = ref(false)
const selectedInvoice = ref(null)

// Estado de acciones
const requesting = ref(false)
const reportingPayment = ref(false)

// Filtros
const filters = ref({
  status: '',
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

// Formularios
const requestForm = ref({
  period_start: '',
  period_end: '',
  notes: ''
})

const paymentForm = ref({
  payment_date: '',
  payment_method: '',
  payment_reference: '',
  notes: ''
})

// Información de la empresa y precios
const companyInfo = ref({
  name: '',
  rut: '',
  address: '',
  contactEmail: ''
})

const currentPricing = ref({
  planType: 'basic',
  pricePerOrder: 500,
  ivaPerOrder: 95,
  totalPerOrder: 595,
  billingCycle: 'monthly'
})

// Computed properties
const invoiceSummary = computed(() => {
  const summary = {
    pendingAmount: 0,
    pendingCount: 0,
    paidAmount: 0,
    paidCount: 0,
    totalOrders: 0,
    ordersThisMonth: 0
  }
  
  invoices.value.forEach(invoice => {
    if (['sent', 'overdue'].includes(invoice.status)) {
      summary.pendingAmount += invoice.total_amount || 0
      summary.pendingCount++
    }
    if (invoice.status === 'paid') {
      summary.paidAmount += invoice.total_amount || 0
      summary.paidCount++
    }
    summary.totalOrders += invoice.orders_count || 0
  })
  
  // Calcular pedidos de este mes
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  summary.ordersThisMonth = invoices.value
    .filter(invoice => {
      const invoiceDate = new Date(invoice.period_end)
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear
    })
    .reduce((total, invoice) => total + (invoice.orders_count || 0), 0)
  
  return summary
})

const nextInvoicePeriod = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  return formatPeriod(start.toISOString(), end.toISOString())
})

const nextInvoiceEstimate = ref({
  ordersCount: 0,
  subtotal: 0,
  iva: 0,
  total: 0
});

async function fetchNextInvoiceEstimate() {
  try {
    const { data } = await apiService.billing.getNextInvoiceEstimate();
    nextInvoiceEstimate.value = data;
  } catch (error) {
    console.error("Error fetching next invoice estimate:", error);
    // Opcional: resetear en caso de error
    nextInvoiceEstimate.value = { ordersCount: 0, subtotal: 0, iva: 0, total: 0 };
  }
}
const requestPreview = computed(() => {
  if (!requestForm.value.period_start || !requestForm.value.period_end) {
    return null
  }
  
  // Estimar pedidos basado en el período
  const startDate = new Date(requestForm.value.period_start)
  const endDate = new Date(requestForm.value.period_end)
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  
  const estimatedOrders = Math.round((invoiceSummary.value.ordersThisMonth / 30) * days)
  const estimatedAmount = estimatedOrders * currentPricing.value.totalPerOrder
  
  return {
    estimatedOrders,
    estimatedAmount
  }
})

const canRequest = computed(() => {
  return requestForm.value.period_start && requestForm.value.period_end
})

const canReportPayment = computed(() => {
  return paymentForm.value.payment_date && paymentForm.value.payment_method
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchInvoices(),
    fetchCompanyInfo(),
    fetchCurrentPricing(),
    fetchNextInvoiceEstimate()
  ])
})

// Funciones principales
async function fetchInvoices() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      company_id: auth.user?.company_id || auth.user?.company?._id,
      ...filters.value
    }
    
    const { data } = await apiService.billing?.getInvoices(params) || { data: generateMockInvoicesCompany() }
    
    invoices.value = data.invoices || data
    pagination.value = data.pagination || { page: 1, limit: 15, total: data.length, totalPages: 1 }
    
  } catch (error) {
    console.error('Error fetching invoices:', error)
    // invoices.value = generateMockInvoicesCompany()

    // AÑADE UN MANEJO DE ERROR REAL:
    invoices.value = []
    alert('Error al cargar tus facturas desde el servidor.')
  } finally {
    loading.value = false
  }
}

async function fetchCompanyInfo() {
  try {
    const companyId = auth.user?.company_id || auth.user?.company?._id
    if (companyId) {
      const { data } = await apiService.companies.getById(companyId)
      companyInfo.value = {
        name: data.name,
        rut: data.rut,
        address: data.address,
        contactEmail: data.contact_email
      }
    }
  } catch (error) {
    console.error('Error fetching company info:', error)
    // Usar datos del usuario
    companyInfo.value = {
      name: auth.user?.company?.name || 'Mi Empresa',
      rut: '12.345.678-9',
      address: 'Santiago, Chile',
      contactEmail: auth.user?.email || 'contacto@empresa.cl'
    }
  }
}

async function fetchCurrentPricing() {
  try {
    const companyId = auth.user?.company_id || auth.user?.company?._id
    if (companyId) {
      const { data } = await apiService.companies.getById(companyId)
      const pricePerOrder = data.price_per_order || 500
      currentPricing.value = {
        planType: data.plan_type || 'basic',
        pricePerOrder: pricePerOrder,
        ivaPerOrder: Math.round(pricePerOrder * 0.19),
        totalPerOrder: pricePerOrder + Math.round(pricePerOrder * 0.19),
        billingCycle: data.billing_cycle || 'monthly'
      }
    }
  } catch (error) {
    console.error('Error fetching pricing:', error)
  }
}

// Funciones de acciones
async function requestInvoice() {
  // Sugerir período del mes anterior
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0)
  
  requestForm.value = {
    period_start: startDate.toISOString().split('T')[0],
    period_end: endDate.toISOString().split('T')[0],
    notes: ''
  }
  
  showRequestModal.value = true
}

async function submitInvoiceRequest() {
  requesting.value = true
  try {
    const requestData = {
      company_id: auth.user?.company_id || auth.user?.company?._id,
      period_start: requestForm.value.period_start,
      period_end: requestForm.value.period_end,
      notes: requestForm.value.notes,
      estimated_orders: requestPreview.value?.estimatedOrders || 0,
      estimated_amount: requestPreview.value?.estimatedAmount || 0
    }
    
    // En producción sería:
    // await apiService.billing.requestInvoice(requestData)
    
    alert('Solicitud de factura enviada exitosamente. Recibirás la factura en 1-2 días hábiles.')
    showRequestModal.value = false
    resetRequestForm()
    
  } catch (error) {
    alert(`Error al enviar solicitud: ${error.message}`)
  } finally {
    requesting.value = false
  }
}

function resetRequestForm() {
  requestForm.value = {
    period_start: '',
    period_end: '',
    notes: ''
  }
}

async function reportPayment(invoice) {
  selectedInvoice.value = invoice
  paymentForm.value = {
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    payment_reference: '',
    notes: ''
  }
  showPaymentModal.value = true
}

async function submitPaymentReport() {
  reportingPayment.value = true
  try {
    const paymentData = {
      invoice_id: selectedInvoice.value._id,
      payment_date: paymentForm.value.payment_date,
      payment_method: paymentForm.value.payment_method,
      payment_reference: paymentForm.value.payment_reference,
      notes: paymentForm.value.notes,
      amount: selectedInvoice.value.total_amount
    }
    
    // En producción sería:
    // await apiService.billing.reportPayment(paymentData)
    
    alert('Reporte de pago enviado exitosamente. Validaremos el pago y actualizaremos el estado de la factura.')
    showPaymentModal.value = false
    
    // Actualizar estado local
    selectedInvoice.value.status = 'paid'
    const invoiceIndex = invoices.value.findIndex(inv => inv._id === selectedInvoice.value._id)
    if (invoiceIndex !== -1) {
      invoices.value[invoiceIndex].status = 'paid'
    }
    
  } catch (error) {
    alert(`Error al reportar pago: ${error.message}`)
  } finally {
    reportingPayment.value = false
  }
}

async function exportInvoices() {
  try {
    // Crear CSV con facturas de la empresa
    const csvData = invoices.value.map(invoice => ({
      'Número Factura': invoice.invoice_number,
      'Fecha Emisión': formatDate(invoice.issue_date),
      'Período Inicio': formatDate(invoice.period_start),
      'Período Fin': formatDate(invoice.period_end),
      'Pedidos': invoice.orders_count || 0,
      'Subtotal': invoice.subtotal || 0,
      'IVA': invoice.tax_amount || 0,
      'Total': invoice.total_amount || 0,
      'Estado': getStatusText(invoice.status),
      'Fecha Vencimiento': formatDate(invoice.due_date)
    }))
    
    const csv = convertToCSV(csvData)
    downloadCSV(csv, `facturas_${companyInfo.value.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    
  } catch (error) {
    alert('Error al exportar facturas')
  }
}

// Funciones de vista
async function viewInvoice(invoice) {
  selectedInvoice.value = invoice
  showInvoiceModal.value = true
}

async function downloadInvoice(invoice) {
  try {
    // Mostrar indicador de carga
    const downloadingMessage = `Generando PDF de factura ${invoice.invoice_number}...`
    console.log(downloadingMessage)
    
    // Llamar al API para descargar la factura
    const response = await apiService.billing.downloadInvoice(invoice._id)
    
    // Crear blob y descargar
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `factura-${invoice.invoice_number}.pdf`
    
    // Agregar al DOM, hacer click y remover
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Limpiar URL del objeto
    window.URL.revokeObjectURL(url)
    
    console.log(`✅ Factura ${invoice.invoice_number} descargada exitosamente`)
    
  } catch (error) {
    console.error('Error al descargar factura:', error)
    
    let errorMessage = 'Error al descargar la factura'
    
    if (error.response) {
      // El servidor respondió con un código de error
      if (error.response.status === 404) {
        errorMessage = 'Factura no encontrada'
      } else if (error.response.status === 403) {
        errorMessage = 'No tienes permisos para descargar esta factura'
      } else if (error.response.data instanceof Blob) {
        // Leer el error del blob
        try {
          const errorText = await error.response.data.text()
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
      }
    } else if (error.request) {
      errorMessage = 'Error de conexión. Verifica tu internet.'
    }
    
    alert(`${errorMessage}: ${invoice.invoice_number}`)
  }
}

// Funciones auxiliares
function generateMockInvoicesCompany() {
  const mockInvoices = []
  const companyId = auth.user?.company_id || 'company1'
  
  for (let i = 1; i <= 8; i++) {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - i)
    startDate.setDate(1)
    
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0)
    
    const ordersCount = Math.floor(Math.random() * 50) + 10
    const pricePerOrder = currentPricing.value.pricePerOrder
    const subtotal = ordersCount * pricePerOrder
    const taxAmount = Math.round(subtotal * 0.19)
    
    const statuses = ['paid', 'sent', 'overdue', 'paid', 'paid'] // Más facturas pagadas
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    mockInvoices.push({
      _id: `invoice_${i}`,
      invoice_number: `INV-2024-${String(i).padStart(4, '0')}`,
      company_id: companyId,
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

// Funciones de utilidad
function getPlanName(planType) {
  const plans = {
    basic: 'Básico',
    pro: 'Pro',
    enterprise: 'Enterprise'
  }
  return plans[planType] || 'Básico'
}

function getBillingCycleName(cycle) {
  const cycles = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    annual: 'Anual'
  }
  return cycles[cycle] || 'Mensual'
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

// Funciones de exportación
function convertToCSV(data) {
  if (!data || data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      }).join(',')
    )
  ].join('\n')
  
  return csvContent
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
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

.btn-primary, .btn-secondary {
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.summary-card.pending::before {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.summary-card.paid::before {
  background: linear-gradient(90deg, #10b981, #059669);
}

.summary-card.orders::before {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.summary-card.rate::before {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.summary-icon {
  font-size: 36px;
  opacity: 0.8;
}

.summary-info {
  flex: 1;
}

.summary-value {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.summary-detail {
  font-size: 12px;
  color: #9ca3af;
}

/* Información de Facturación Actual */
.current-billing-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 30px;
}

.billing-info-card,
.next-invoice-preview {
  background: white;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.billing-info-card h3,
.next-invoice-preview h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.billing-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.billing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.billing-row:not(:last-child) {
  border-bottom: 1px solid #f3f4f6;
}

.billing-row.total {
  border-top: 2px solid #e5e7eb;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 600;
  color: #1f2937;
}

.billing-row .label {
  color: #6b7280;
  font-weight: 500;
}

.billing-row .value {
  color: #1f2937;
  font-weight: 500;
}

.plan-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.plan-badge.basic {
  background: #f3f4f6;
  color: #374151;
}

.plan-badge.pro {
  background: #dbeafe;
  color: #1e40af;
}

.plan-badge.enterprise {
  background: #d1fae5;
  color: #065f46;
}

/* Preview de Próxima Factura */
.preview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-period,
.preview-orders {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.period-label,
.orders-label {
  color: #6b7280;
  font-weight: 500;
}

.period-value,
.orders-value {
  color: #1f2937;
  font-weight: 600;
}

.preview-amounts {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
  color: #3b82f6;
}

.amount-row.total {
  border-top: 1px solid #bae6fd;
  margin-top: 8px;
  padding-top: 8px;
  font-weight: 600;
  color: #1e40af;
}

/* Tabla */
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
  min-width: 1000px;
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
  min-width: 140px;
}

.invoice-id {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.invoice-date {
  font-size: 11px;
  color: #6b7280;
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
  min-width: 120px;
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

.btn-action.pay {
  background: #fef3c7;
  color: #92400e;
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

/* Formularios de Modal */
.request-invoice-form,
.payment-report-form {
  max-height: 70vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.form-description {
  margin: 0 0 16px 0;
  color: #6b7280;
  font-size: 14px;
}

.payment-info-section {
  background: #f0f9ff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #bae6fd;
}

.payment-info-section h4 {
  margin: 0 0 8px 0;
  color: #1e40af;
}

.payment-info-section p {
  margin: 0;
  color: #3b82f6;
  font-weight: 500;
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
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Vista Previa */
.request-preview {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
}

.request-preview h4 {
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
  color: #3b82f6;
}

/* Acciones del Modal */
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
  .current-billing-info {
    grid-template-columns: 1fr;
  }
  
  .search-input {
    grid-column: span 1;
  }
  
  .billing-summary {
    grid-template-columns: repeat(2, 1fr);
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
  
  .invoice-header {
    grid-template-columns: 1fr;
    text-align: left;
  }
  
  .invoice-details {
    text-align: left;
    margin-top: 20px;
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
    gap: 12px;
  }
  
  .summary-icon {
    font-size: 28px;
  }
  
  .summary-value {
    font-size: 22px;
  }
  
  .invoice-preview {
    padding: 16px;
  }
  
  .totals-section {
    min-width: auto;
  }
}
</style>