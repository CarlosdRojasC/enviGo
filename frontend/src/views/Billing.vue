<template>
  <div class="company-billing-page">
    <!-- Alert de facturas pendientes -->
    <div v-if="pendingInvoices.length > 0" class="pending-alert">
      <div class="alert-content">
        <div class="alert-icon">⚠️</div>
        <div class="alert-text">
          <h3 class="alert-title">Tienes {{ pendingInvoices.length }} factura(s) pendiente(s)</h3>
          <p class="alert-description">
            Total por pagar: <strong>${{ formatCurrency(totalPendingAmount) }}</strong>
            | Próximo vencimiento: {{ getNextDueDate() }}
          </p>
        </div>
        <div class="alert-actions">
          <button @click="scrollToInvoices" class="alert-btn secondary">
            Ver Facturas
          </button>
          <button @click="payAllPending" class="alert-btn primary">
            💳 Pagar Ahora
          </button>
        </div>
      </div>
    </div>

    <!-- Header con métricas -->
    <div class="billing-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <span class="title-icon">💰</span>
            Mi Facturación
          </h1>
          <p class="page-subtitle">
            Gestiona tus facturas, pagos y revisa tu historial financiero
          </p>
        </div>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button @click="requestInvoice" class="action-btn secondary">
            <span class="btn-icon">📧</span>
            Solicitar Factura
          </button>
          <button @click="downloadTaxReport" class="action-btn secondary">
            <span class="btn-icon">📊</span>
            Reporte Tributario
          </button>
          <button @click="setupAutoPay" class="action-btn primary">
            <span class="btn-icon">⚡</span>
            Configurar Auto-pago
          </button>
        </div>
      </div>

      <!-- Métricas Dashboard -->
      <div class="metrics-dashboard">
        <div class="metric-card pending">
          <div class="metric-header">
            <div class="metric-icon">⏰</div>
            <div class="metric-badge" v-if="pendingInvoices.length > 0">
              {{ pendingInvoices.length }}
            </div>
          </div>
          <div class="metric-content">
            <div class="metric-value">${{ formatCurrency(metrics.pendingAmount) }}</div>
            <div class="metric-label">Monto Pendiente</div>
            <div class="metric-detail">{{ pendingInvoices.length }} facturas</div>
          </div>
        </div>
        
        <div class="metric-card paid">
          <div class="metric-header">
            <div class="metric-icon">✅</div>
          </div>
          <div class="metric-content">
            <div class="metric-value">${{ formatCurrency(metrics.paidAmount) }}</div>
            <div class="metric-label">Total Pagado</div>
            <div class="metric-detail">Este año</div>
          </div>
        </div>
        
        <div class="metric-card orders">
          <div class="metric-header">
            <div class="metric-icon">📦</div>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.ordersThisMonth }}</div>
            <div class="metric-label">Pedidos Facturados</div>
            <div class="metric-detail">Este mes</div>
          </div>
        </div>
        
        <div class="metric-card pricing">
          <div class="metric-header">
            <div class="metric-icon">💵</div>
          </div>
          <div class="metric-content">
            <div class="metric-value">${{ formatCurrency(metrics.pricePerOrder) }}</div>
            <div class="metric-label">Precio por Pedido</div>
            <div class="metric-detail">+ IVA: ${{ formatCurrency(metrics.ivaPerOrder) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Próxima factura estimada -->
    <div v-if="nextInvoiceEstimate" class="next-invoice-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">📋</span>
          Próxima Factura Estimada
        </h2>
        <div class="section-actions">
          <span class="estimate-period">{{ formatEstimatePeriod() }}</span>
        </div>
      </div>
      
      <div class="estimate-card">
        <div class="estimate-progress">
          <div class="progress-info">
            <span class="progress-label">Progreso del mes</span>
            <span class="progress-value">{{ nextInvoiceEstimate.monthProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: nextInvoiceEstimate.monthProgress + '%' }"
            ></div>
          </div>
        </div>
        
        <div class="estimate-details">
          <div class="estimate-item">
            <span class="estimate-label">Pedidos estimados:</span>
            <span class="estimate-value">{{ nextInvoiceEstimate.ordersCount }} pedidos</span>
          </div>
          <div class="estimate-item">
            <span class="estimate-label">Subtotal estimado:</span>
            <span class="estimate-value">${{ formatCurrency(nextInvoiceEstimate.subtotal) }}</span>
          </div>
          <div class="estimate-item">
            <span class="estimate-label">IVA (19%):</span>
            <span class="estimate-value">${{ formatCurrency(nextInvoiceEstimate.iva) }}</span>
          </div>
          <div class="estimate-item total">
            <span class="estimate-label">Total estimado:</span>
            <span class="estimate-value">${{ formatCurrency(nextInvoiceEstimate.total) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico de gastos -->
    <div class="spending-chart-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">📈</span>
          Tendencia de Gastos
        </h2>
        <div class="chart-controls">
          <select v-model="chartPeriod" class="chart-select">
            <option value="6months">Últimos 6 meses</option>
            <option value="year">Último año</option>
            <option value="2years">Últimos 2 años</option>
          </select>
        </div>
      </div>
      
      <div class="chart-container">
        <div class="chart-placeholder">
          <div class="chart-icon">📊</div>
          <p>Gráfico de tendencia de gastos</p>
          <small>Se mostraría aquí un gráfico de líneas con Chart.js</small>
        </div>
      </div>
    </div>

    <!-- Lista de facturas -->
    <div ref="invoicesSection" class="invoices-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">📄</span>
          Mis Facturas ({{ filteredInvoices.length }})
        </h2>
        
        <div class="invoices-controls">
          <div class="filter-group">
            <label class="filter-label">Estado:</label>
            <select v-model="invoiceFilter" class="filter-select">
              <option value="">Todas</option>
              <option value="sent">Pendientes</option>
              <option value="paid">Pagadas</option>
              <option value="overdue">Vencidas</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Período:</label>
            <select v-model="periodFilter" class="filter-select">
              <option value="">Todos</option>
              <option value="current">Mes actual</option>
              <option value="last">Mes anterior</option>
              <option value="quarter">Último trimestre</option>
            </select>
          </div>
          
          <button @click="exportInvoices" class="export-btn">
            <span class="btn-icon">📥</span>
            Exportar
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando facturas...</p>
      </div>

      <!-- Facturas Grid -->
      <div v-else-if="filteredInvoices.length > 0" class="invoices-grid">
        <div 
          v-for="invoice in filteredInvoices" 
          :key="invoice._id"
          class="invoice-card"
          :class="[invoice.status, { urgent: isUrgent(invoice) }]"
        >
          <div class="invoice-header">
            <div class="invoice-number">
              <span class="invoice-id">{{ invoice.invoice_number }}</span>
              <span class="invoice-status" :class="invoice.status">
                {{ getStatusIcon(invoice.status) }} {{ getStatusText(invoice.status) }}
              </span>
            </div>
            <div class="invoice-amount">
              <span class="amount-value">${{ formatCurrency(invoice.total_amount) }}</span>
            </div>
          </div>
          
          <div class="invoice-details">
            <div class="detail-row">
              <span class="detail-label">Período:</span>
              <span class="detail-value">{{ formatPeriod(invoice) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Pedidos:</span>
              <span class="detail-value">{{ invoice.total_orders }} pedidos</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Fecha emisión:</span>
              <span class="detail-value">{{ formatDate(invoice.created_at) }}</span>
            </div>
            <div v-if="invoice.due_date && invoice.status === 'sent'" class="detail-row">
              <span class="detail-label">Vencimiento:</span>
              <span class="detail-value" :class="{ urgent: isUrgent(invoice) }">
                {{ formatDate(invoice.due_date) }}
                <span v-if="getDaysUntilDue(invoice) <= 3" class="urgency-badge">
                  {{ getDaysUntilDue(invoice) === 0 ? 'Hoy' : `${getDaysUntilDue(invoice)} días` }}
                </span>
              </span>
            </div>
            <div v-if="invoice.paid_date && invoice.status === 'paid'" class="detail-row">
              <span class="detail-label">Fecha pago:</span>
              <span class="detail-value">{{ formatDate(invoice.paid_date) }}</span>
            </div>
          </div>
          
          <div class="invoice-actions">
            <button @click="downloadInvoice(invoice._id)" class="invoice-btn secondary">
              <span class="btn-icon">📄</span>
              Descargar PDF
            </button>
            
            <button 
              v-if="invoice.status === 'sent'" 
              @click="payInvoice(invoice)"
              class="invoice-btn primary"
            >
              <span class="btn-icon">💳</span>
              Pagar Ahora
            </button>
            
            <button 
              v-else-if="invoice.status === 'paid'" 
              @click="viewPaymentDetails(invoice)"
              class="invoice-btn success"
            >
              <span class="btn-icon">✅</span>
              Ver Pago
            </button>
            
            <button 
              v-if="invoice.status === 'overdue'" 
              @click="contactSupport(invoice)"
              class="invoice-btn warning"
            >
              <span class="btn-icon">💬</span>
              Contactar
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">📄</div>
        <h3 class="empty-title">No hay facturas</h3>
        <p class="empty-description">
          {{ invoiceFilter ? 'No hay facturas que coincidan con los filtros' : 'Aún no tienes facturas generadas' }}
        </p>
        <button v-if="!invoiceFilter" @click="requestInvoice" class="empty-action-btn">
          <span class="btn-icon">📧</span>
          Solicitar Primera Factura
        </button>
      </div>
    </div>

    <!-- Configuración de pagos -->
    <div class="payment-config-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">⚙️</span>
          Configuración de Pagos
        </h2>
      </div>
      
      <div class="config-cards">
        <div class="config-card">
          <div class="config-icon">💳</div>
          <div class="config-content">
            <h3 class="config-title">Métodos de Pago</h3>
            <p class="config-description">Configura tus tarjetas y cuentas bancarias</p>
            <button @click="managePaymentMethods" class="config-btn">
              Gestionar Métodos
            </button>
          </div>
        </div>
        
        <div class="config-card">
          <div class="config-icon">⚡</div>
          <div class="config-content">
            <h3 class="config-title">Pago Automático</h3>
            <p class="config-description">Automatiza el pago de tus facturas</p>
            <button @click="setupAutoPay" class="config-btn">
              {{ autoPayEnabled ? 'Configurado' : 'Configurar' }}
            </button>
          </div>
        </div>
        
        <div class="config-card">
          <div class="config-icon">📧</div>
          <div class="config-content">
            <h3 class="config-title">Notificaciones</h3>
            <p class="config-description">Recibe alertas de nuevas facturas</p>
            <button @click="configureNotifications" class="config-btn">
              Configurar Alertas
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'

// State
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const invoices = ref([])
const invoiceFilter = ref('')
const periodFilter = ref('')
const chartPeriod = ref('6months')
const autoPayEnabled = ref(false)
const invoicesSection = ref(null)

// Metrics (placeholder data)
const metrics = ref({
  pendingAmount: 340000,
  paidAmount: 2110000,
  ordersThisMonth: 45,
  pricePerOrder: 2500,
  ivaPerOrder: 475
})

// Next invoice estimate (placeholder)
const nextInvoiceEstimate = ref({
  ordersCount: 38,
  monthProgress: 65,
  subtotal: 95000,
  iva: 18050,
  total: 113050,
  period: {
    start: new Date(2025, 6, 1),
    end: new Date(2025, 6, 31)
  }
})

// Computed properties
const pendingInvoices = computed(() => 
  invoices.value.filter(invoice => ['sent', 'overdue'].includes(invoice.status))
)

const totalPendingAmount = computed(() =>
  pendingInvoices.value.reduce((sum, invoice) => sum + invoice.total_amount, 0)
)

const filteredInvoices = computed(() => {
  let filtered = invoices.value

  if (invoiceFilter.value) {
    filtered = filtered.filter(invoice => invoice.status === invoiceFilter.value)
  }

  if (periodFilter.value) {
    const now = new Date()
    switch (periodFilter.value) {
      case 'current':
        filtered = filtered.filter(invoice => {
          const invoiceDate = new Date(invoice.created_at)
          return invoiceDate.getMonth() === now.getMonth() && 
                 invoiceDate.getFullYear() === now.getFullYear()
        })
        break
      case 'last':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
        filtered = filtered.filter(invoice => {
          const invoiceDate = new Date(invoice.created_at)
          return invoiceDate.getMonth() === lastMonth.getMonth() && 
                 invoiceDate.getFullYear() === lastMonth.getFullYear()
        })
        break
      case 'quarter':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3)
        filtered = filtered.filter(invoice => 
          new Date(invoice.created_at) >= threeMonthsAgo
        )
        break
    }
  }

  return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

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

function formatEstimatePeriod() {
  const period = nextInvoiceEstimate.value.period
  const start = period.start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return start.charAt(0).toUpperCase() + start.slice(1)
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
    sent: 'Pendiente',
    paid: 'Pagada',
    overdue: 'Vencida'
  }
  return texts[status] || status
}

function getNextDueDate() {
  if (pendingInvoices.value.length === 0) return 'N/A'
  
  const nextDue = pendingInvoices.value
    .filter(invoice => invoice.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0]
  
  if (!nextDue) return 'N/A'
  
  const daysUntil = getDaysUntilDue(nextDue)
  if (daysUntil === 0) return 'Hoy'
  if (daysUntil === 1) return 'Mañana'
  return `${daysUntil} días`
}

function getDaysUntilDue(invoice) {
  if (!invoice.due_date) return null
  const now = new Date()
  const due = new Date(invoice.due_date)
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24))
}

function isUrgent(invoice) {
  if (invoice.status !== 'sent') return false
  const daysUntil = getDaysUntilDue(invoice)
  return daysUntil !== null && daysUntil <= 3
}

function scrollToInvoices() {
  nextTick(() => {
    invoicesSection.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

// Placeholder functions (implement functionality later)
function payAllPending() {
  toast.info('Función en desarrollo: Pagar todas las facturas pendientes')
}

function requestInvoice() {
  toast.info('Función en desarrollo: Solicitar factura')
}

function downloadTaxReport() {
  toast.info('Función en desarrollo: Descargar reporte tributario')
}

function setupAutoPay() {
  toast.info('Función en desarrollo: Configurar auto-pago')
}

function exportInvoices() {
  toast.info('Función en desarrollo: Exportar facturas')
}

function downloadInvoice(invoiceId) {
  toast.info(`Función en desarrollo: Descargar factura ${invoiceId}`)
}

function payInvoice(invoice) {
  toast.info(`Función en desarrollo: Pagar factura ${invoice.invoice_number}`)
}

function viewPaymentDetails(invoice) {
  toast.info(`Función en desarrollo: Ver detalles de pago de ${invoice.invoice_number}`)
}

function contactSupport(invoice) {
  toast.info(`Función en desarrollo: Contactar soporte para ${invoice.invoice_number}`)
}

function managePaymentMethods() {
  toast.info('Función en desarrollo: Gestionar métodos de pago')
}

function configureNotifications() {
  toast.info('Función en desarrollo: Configurar notificaciones')
}

// Mock data for development
onMounted(() => {
  // Simulated invoices data
  invoices.value = [
    {
      _id: '1',
      invoice_number: 'INV-202507-0001',
      period_start: '2025-06-01',
      period_end: '2025-06-30',
      total_orders: 60,
      total_amount: 121975,
      status: 'sent',
      created_at: '2025-07-01',
      due_date: '2025-07-20'
    },
    {
      _id: '2',
      invoice_number: 'INV-202506-0001',
      period_start: '2025-05-01',
      period_end: '2025-05-31',
      total_orders: 89,
      total_amount: 211820,
      status: 'paid',
      created_at: '2025-06-01',
      paid_date: '2025-06-15'
    },
    {
      _id: '3',
      invoice_number: 'INV-202505-0001',
      period_start: '2025-04-01',
      period_end: '2025-04-30',
      total_orders: 45,
      total_amount: 89250,
      status: 'paid',
      created_at: '2025-05-01',
      paid_date: '2025-05-10'
    }
  ]

  loading.value = false
})
</script>

<style scoped>
.company-billing-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 24px;
}

/* Pending Alert */
.pending-alert {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px rgba(245, 158, 11, 0.1);
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.alert-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.alert-text {
  flex: 1;
}

.alert-title {
  font-size: 18px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 4px 0;
}

.alert-description {
  font-size: 14px;
  color: #b45309;
  margin: 0;
}

.alert-actions {
  display: flex;
  gap: 8px;
}

.alert-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.alert-btn.primary {
  background: #f59e0b;
  color: white;
}

.alert-btn.primary:hover {
  background: #d97706;
}

.alert-btn.secondary {
  background: white;
  color: #92400e;
  border: 1px solid #f59e0b;
}

.alert-btn.secondary:hover {
  background: #fef3c7;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.metric-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s;
  position: relative;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-card.pending {
  border-left: 4px solid #f59e0b;
}

.metric-card.paid {
  border-left: 4px solid #10b981;
}

.metric-card.orders {
  border-left: 4px solid #3b82f6;
}

.metric-card.pricing {
  border-left: 4px solid #8b5cf6;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.metric-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-badge {
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.metric-content {
  text-align: left;
}

.metric-value {
  font-size: 28px;
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

.metric-detail {
  font-size: 12px;
  color: #9ca3af;
}

/* Sections */
.next-invoice-section,
.spending-chart-section,
.invoices-section,
.payment-config-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
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

.section-actions {
  display: flex;
  gap: 12px;
}

.estimate-period {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Next Invoice Estimate */
.estimate-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  background: #f9fafb;
}

.estimate-progress {
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  color: #6b7280;
}

.progress-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.estimate-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.estimate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
}

.estimate-item.total {
  border-bottom: none;
  border-top: 2px solid #3b82f6;
  padding-top: 16px;
  font-weight: 600;
}

.estimate-label {
  font-size: 14px;
  color: #6b7280;
}

.estimate-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.estimate-item.total .estimate-value {
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
}

/* Chart */
.chart-controls {
  display: flex;
  gap: 12px;
}

.chart-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.chart-container {
  height: 300px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
}

.chart-placeholder {
  text-align: center;
  color: #6b7280;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Invoices Controls */
.invoices-controls {
  display: flex;
  align-items: center;
  gap: 16px;
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
  min-width: 120px;
}

.export-btn {
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

.export-btn:hover {
  background: #e5e7eb;
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

/* Invoices Grid */
.invoices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.invoice-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  background: white;
}

.invoice-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.invoice-card.sent {
  border-left: 4px solid #f59e0b;
}

.invoice-card.paid {
  border-left: 4px solid #10b981;
}

.invoice-card.overdue {
  border-left: 4px solid #ef4444;
}

.invoice-card.urgent {
  border-color: #ef4444;
  box-shadow: 0 0 0 1px #fee2e2;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.invoice-number {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invoice-id {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.invoice-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.invoice-status.sent {
  background: #fef3c7;
  color: #92400e;
}

.invoice-status.paid {
  background: #d1fae5;
  color: #065f46;
}

.invoice-status.overdue {
  background: #fee2e2;
  color: #991b1b;
}

.invoice-amount {
  text-align: right;
}

.amount-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.invoice-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.detail-value.urgent {
  color: #ef4444;
  font-weight: 600;
}

.urgency-badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 8px;
}

.invoice-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.invoice-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  justify-content: center;
  min-width: 100px;
}

.invoice-btn.primary {
  background: #3b82f6;
  color: white;
}

.invoice-btn.primary:hover {
  background: #2563eb;
}

.invoice-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.invoice-btn.secondary:hover {
  background: #e5e7eb;
}

.invoice-btn.success {
  background: #10b981;
  color: white;
}

.invoice-btn.success:hover {
  background: #059669;
}

.invoice-btn.warning {
  background: #f59e0b;
  color: white;
}

.invoice-btn.warning:hover {
  background: #d97706;
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

/* Payment Config */
.config-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.config-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.2s;
}

.config-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.config-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.config-content {
  flex: 1;
}

.config-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.config-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.config-btn {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.config-btn:hover {
  background: #2563eb;
}

/* Responsive */
@media (max-width: 1200px) {
  .metrics-dashboard {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .estimate-details {
    grid-template-columns: 1fr;
  }
  
  .invoices-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .company-billing-page {
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
    padding: 10px 8px;
    font-size: 12px;
  }
  
  .alert-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .alert-actions {
    width: 100%;
    justify-content: center;
  }
  
  .metrics-dashboard {
    grid-template-columns: 1fr;
  }
  
  .metric-card {
    padding: 20px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .invoices-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .invoices-grid {
    grid-template-columns: 1fr;
  }
  
  .invoice-actions {
    flex-direction: column;
  }
  
  .invoice-btn {
    flex: none;
  }
  
  .config-cards {
    grid-template-columns: 1fr;
  }
  
  .chart-controls {
    flex-direction: column;
  }
  
  .chart-select {
    width: 100%;
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
  
  .metric-value {
    font-size: 20px;
  }
  
  .invoice-card {
    padding: 16px;
  }
  
  .invoice-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .invoice-amount {
    text-align: left;
  }
  
  .amount-value {
    font-size: 18px;
  }
  
  .estimate-card {
    padding: 16px;
  }
  
  .chart-container {
    height: 200px;
  }
  
  .chart-icon {
    font-size: 32px;
  }
}
</style>