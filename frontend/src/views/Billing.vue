<template>
  <div class="billing-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">💳</span>
          Mi Facturación
        </h1>
        <p class="page-subtitle">
          Revisa el historial de tus facturas, costos y estimaciones.
        </p>
      </div>
      <div class="header-actions">
        <button @click="refreshData" class="action-btn secondary" :disabled="loading">
          <span class="btn-icon">🔄</span>
          {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando tu información de facturación...</p>
    </div>

    <div v-else class="billing-content">
      <div class="summary-column">
        <div class="summary-card">
          <h3 class="card-title">Resumen de Facturas</h3>
          <div class="summary-item">
            <span class="summary-label">Monto Pendiente</span>
            <span class="summary-value pending">${{ formatCurrency(stats.pendingAmount) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Pagado (Histórico)</span>
            <span class="summary-value paid">${{ formatCurrency(stats.paidAmount) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Facturas Pendientes</span>
            <span class="summary-value">{{ stats.pendingCount }}</span>
          </div>
        </div>

        <div class="summary-card">
          <h3 class="card-title">Estimación Próxima Factura</h3>
          <p class="card-subtitle">Basado en pedidos del {{ nextInvoiceEstimate.period?.month }}/{{ nextInvoiceEstimate.period?.year }}</p>
          <div class="estimation-total">
            <span class="estimation-value">${{ formatCurrency(nextInvoiceEstimate.total) }}</span>
            <span class="estimation-label">Total Estimado</span>
          </div>
          <div class="estimation-details">
            <div class="detail-item">
              <span>Pedidos Entregados (este mes):</span>
              <span>{{ nextInvoiceEstimate.deliveredOrdersThisMonth }}</span>
            </div>
            <div class="detail-item">
              <span>Subtotal Estimado:</span>
              <span>${{ formatCurrency(nextInvoiceEstimate.subtotal) }}</span>
            </div>
          </div>
        </div>

        <div class="summary-card">
          <h3 class="card-title">Tu Plan Actual</h3>
          <div class="plan-details">
            <div class="detail-item">
              <span>Costo por Pedido:</span>
              <span class="plan-price">${{ formatCurrency(currentPricing.pricePerOrder) }}</span>
            </div>
            <div class="detail-item">
              <span>Ciclo de Facturación:</span>
              <span>{{ currentPricing.billingCycle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="history-column">
        <div class="invoices-list-card">
          <h3 class="card-title">Historial de Facturas</h3>
          <div class="table-wrapper">
            <table class="invoices-table">
              <thead>
                <tr>
                  <th>N° Factura</th>
                  <th>Período</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="invoices.length === 0">
                  <td colspan="5" class="empty-state">No tienes facturas generadas.</td>
                </tr>
                <tr v-for="invoice in invoices" :key="invoice._id" class="invoice-row">
                  <td>
                    <div class="invoice-number">{{ invoice.invoice_number }}</div>
                    <div class="invoice-date">{{ formatDate(invoice.created_at) }}</div>
                  </td>
                  <td>{{ formatPeriod(invoice.period_start, invoice.period_end) }}</td>
                  <td class="amount-cell">${{ formatCurrency(invoice.total_amount) }}</td>
                  <td>
                    <span class="status-badge" :class="invoice.status">
                      {{ getStatusText(invoice.status) }}
                    </span>
                  </td>
<td class="actions-cell">
  <button 
    v-if="['sent', 'overdue'].includes(invoice.status)"
    @click="requestConfirmation(invoice._id)" 
    class="action-btn-table notify" 
    title="Notificar Pago Realizado"
  >
    💸
  </button>
  
  <span v-if="invoice.status === 'pending_confirmation'" class="pending-tag">
    En Revisión
  </span>

  <button @click="downloadInvoice(invoice._id)" class="action-btn-table" title="Descargar PDF">
    📄
  </button>
  <button @click="viewInvoiceDetails(invoice)" class="action-btn-table" title="Ver Detalles">
    👁️
  </button>
</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <Modal v-model="showInvoiceModal" :title="`Detalles de Factura #${selectedInvoice?.invoice_number}`">
      <InvoiceDetails 
        v-if="selectedInvoice"
        :invoice="selectedInvoice"
        @close="showInvoiceModal = false"
      />
    </Modal>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';
import InvoiceDetails from '../components/billing/InvoiceDetails.vue';

// --- ESTADO ---
const auth = useAuthStore();
const toast = useToast();
const loading = ref(true);

// --- DATOS ---
const invoices = ref([]);
const stats = ref({
  pendingAmount: 0,
  paidAmount: 0,
  pendingCount: 0
});
const nextInvoiceEstimate = ref({
  total: 0,
  deliveredOrdersThisMonth: 0,
  subtotal: 0,
  period: {}
});
const currentPricing = ref({
  pricePerOrder: 0,
  billingCycle: 'Mensual'
});

// --- UI ---
const showInvoiceModal = ref(false);
const selectedInvoice = ref(null);


// --- MÉTODOS ---

async function requestConfirmation(invoiceId) {
  if (!confirm('¿Estás seguro de que quieres notificar que ya has pagado esta factura?')) return;
  
  try {
    // Asumiendo que tienes un endpoint en tu apiService
    await apiService.billing.requestConfirmation(invoiceId); 
    toast.success('Notificación de pago enviada.');
    fetchInitialData(); // Refrescar los datos para ver el cambio de estado
  } catch (error) {
    toast.error(error.message || 'No se pudo notificar el pago.');
  }
}


async function fetchInitialData() {
  loading.value = true;
  try {
    const companyId = auth.user?.company_id || auth.user?.company?._id;
    if (!companyId) {
      toast.error("Error: No se pudo identificar la empresa del usuario.");
      return;
    }
    
    // Ejecuta las llamadas a la API en paralelo
    await Promise.all([
      fetchBillingStats(companyId),
      fetchInvoices(companyId)
    ]);

  } catch (error) {
    toast.error("Error al cargar los datos de facturación.");
  } finally {
    loading.value = false;
  }
}

async function fetchBillingStats(companyId) {
  try {
    const { data } = await apiService.billing.getBillingStats(companyId);
    stats.value = data.invoiceSummary;
    nextInvoiceEstimate.value = data.nextInvoiceEstimate;
    currentPricing.value = data.currentPricing;
  } catch (error) {
    console.error("Error fetching billing stats:", error);
    toast.error("No se pudo cargar el resumen de facturación.");
  }
}

async function fetchInvoices(companyId) {
  try {
    const { data } = await apiService.billing.getInvoices({ company_id: companyId, limit: 10 });
    invoices.value = data.invoices || [];
  } catch (error) {
    console.error("Error fetching invoices:", error);
    toast.error("No se pudieron cargar las facturas.");
  }
}

async function downloadInvoice(invoiceId) {
  try {
    const response = await apiService.billing.downloadInvoice(invoiceId);
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    const invoice = invoices.value.find(inv => inv._id === invoiceId);
    link.setAttribute('download', `factura-${invoice?.invoice_number || invoiceId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Descarga de factura iniciada.');
  } catch (error) {
    toast.error('No se pudo descargar la factura.');
  }
}

function viewInvoiceDetails(invoice) {
  selectedInvoice.value = invoice;
  showInvoiceModal.value = true;
}

function refreshData() {
  fetchInitialData();
}

// --- FUNCIONES DE FORMATO ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPeriod(start, end) {
    if (!start || !end) return 'N/A';
    const startDate = new Date(start).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    const endDate = new Date(end).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    return `${startDate} - ${endDate}`;
}

function getStatusText(status) {
    const statuses = { 
        draft: 'Borrador', 
        sent: 'Enviada', 
        paid: 'Pagada', 
        overdue: 'Vencida',
        pending_confirmation: 'En Revisión' // <-- AÑADIR
    };
    return statuses[status] || status;
}

// --- CICLO DE VIDA ---
onMounted(() => {
  fetchInitialData();
});
</script>
<style scoped>
/* ==================== LAYOUT GENERAL ==================== */
.billing-page {
  padding: 24px;
  background-color: #f8fafc;
}

/* ==================== HEADER ==================== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 4px 0;
}
.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.action-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-btn:hover {
  background-color: #f3f4f6;
}

/* ==================== CONTENIDO ==================== */
.billing-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 32px;
}

.summary-column, .history-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-card, .invoices-list-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}
.card-subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: -12px 0 16px 0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.summary-item:last-child {
  border-bottom: none;
}
.summary-label { color: #6b7280; }
.summary-value { font-weight: 600; font-size: 18px; }
.summary-value.pending { color: #f59e0b; }
.summary-value.paid { color: #10b981; }

.estimation-total {
    text-align: center;
    padding: 20px;
    background: #f9fafb;
    border-radius: 12px;
    margin-bottom: 16px;
}
.estimation-value {
    font-size: 28px;
    font-weight: 700;
    color: #4f46e5;
    display: block;
}
.estimation-label {
    font-size: 14px;
    color: #6b7280;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
}
.plan-price { font-weight: 600; }

.table-wrapper {
  overflow-x: auto;
}
.invoices-table {
  width: 100%;
  border-collapse: collapse;
}
.invoices-table th, .invoices-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 14px;
}
.invoices-table th {
  background-color: #f9fafb;
  font-weight: 600;
  color: #6b7280;
}
.amount-cell { text-align: right; font-weight: 600; }
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.status-badge.draft { background-color: #f3f4f6; color: #374151; }
.status-badge.sent { background-color: #fef3c7; color: #92400e; }
.status-badge.paid { background-color: #d1fae5; color: #065f46; }
.status-badge.overdue { background-color: #fee2e2; color: #991b1b; }

.actions-cell {
  text-align: right;
}
.action-btn-table {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 18px;
  margin-left: 8px;
  color: #9ca3af;
  transition: color 0.2s;
}
.action-btn-table:hover {
  color: #374151;
}

.loading-container {
  text-align: center;
  padding: 64px;
}
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: #9ca3af;
    font-style: italic;
}

/* RESPONSIVE */
@media (max-width: 1024px) {
  .billing-content {
    grid-template-columns: 1fr;
  }
}
/* AÑADE ESTOS ESTILOS */
.action-btn-table.notify {
  color: #10b981; /* Verde */
}
.action-btn-table.notify:hover {
  color: #059669;
}

.pending-tag {
  font-size: 12px;
  font-weight: 500;
  color: #2563eb; /* Azul */
  background-color: #dbeafe;
  padding: 4px 8px;
  border-radius: 12px;
}

.status-badge.pending_confirmation { /* Para que el badge también tenga color */
  background-color: #dbeafe;
  color: #2563eb;
}
</style>