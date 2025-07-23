<!-- BillingTestWidget.vue - Crear en src/components/ -->
<template>
  <div class="billing-test-widget">
    <div class="widget-header">
      <h3 class="widget-title">
        🧪 Test de Facturación Mejorada
        <span class="company-name" v-if="selectedCompany">
          - {{ selectedCompany.name }}
        </span>
      </h3>
      
      <!-- Selector de empresa (solo para admin) -->
      <div v-if="auth.isAdmin" class="company-selector">
        <select v-model="selectedCompanyId" @change="onCompanyChange">
          <option value="">Seleccionar empresa...</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando datos de prueba...</p>
    </div>

    <div v-else-if="!selectedCompanyId" class="no-selection">
      <p>{{ auth.isAdmin ? 'Selecciona una empresa para continuar' : 'Cargando datos de tu empresa...' }}</p>
    </div>

    <div v-else class="test-sections">
      
      <!-- Sección 1: Estadísticas del Dashboard -->
      <div class="test-section">
        <h4 class="section-title">📊 1. Estadísticas del Dashboard</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Pedidos por Facturar</div>
            <div class="stat-value">{{ dashboardStats.invoiceableOrders || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Ingresos del Mes</div>
            <div class="stat-value">${{ formatCurrency(dashboardStats.monthlyRevenue?.total_revenue || 0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tasa de Facturación</div>
            <div class="stat-value">{{ dashboardStats.billingRate || 0 }}%</div>
          </div>
        </div>
        <button @click="loadDashboardStats" class="test-btn" :disabled="loadingStats">
          {{ loadingStats ? 'Cargando...' : '🔄 Refrescar Estadísticas' }}
        </button>
      </div>

      <!-- Sección 2: Pedidos Facturables -->
      <div class="test-section">
        <h4 class="section-title">📦 2. Pedidos Listos para Facturar</h4>
        <div class="orders-summary">
          <p><strong>Total:</strong> {{ invoiceableOrders.length }} pedidos</p>
          <p><strong>Monto Total:</strong> ${{ formatCurrency(ordersSummary.total_amount || 0) }}</p>
          <p v-if="ordersSummary.date_range?.from"><strong>Rango:</strong> 
            {{ formatDate(ordersSummary.date_range.from) }} - {{ formatDate(ordersSummary.date_range.to) }}
          </p>
        </div>
        
        <div class="orders-list" v-if="invoiceableOrders.length > 0">
          <div v-for="order in invoiceableOrders.slice(0, 5)" :key="order._id" class="order-item">
            <div class="order-info">
              <span class="order-number">{{ order.order_number }}</span>
              <span class="order-customer">{{ order.customer_name }}</span>
            </div>
            <div class="order-details">
              <span class="order-date">{{ formatDate(order.delivery_date) }}</span>
              <span class="order-amount">${{ formatCurrency(order.shipping_cost) }}</span>
            </div>
          </div>
          <div v-if="invoiceableOrders.length > 5" class="more-orders">
            ... y {{ invoiceableOrders.length - 5 }} pedidos más
          </div>
        </div>

        <div class="test-actions">
          <button @click="loadInvoiceableOrders" class="test-btn" :disabled="loadingOrders">
            {{ loadingOrders ? 'Cargando...' : '🔄 Cargar Pedidos' }}
          </button>
          <button 
            @click="selectAllOrders" 
            class="test-btn secondary" 
            :disabled="invoiceableOrders.length === 0"
          >
            ✅ Seleccionar Todos ({{ selectedOrderIds.length }})
          </button>
        </div>
      </div>

      <!-- Sección 3: Generar Factura de Prueba -->
      <div class="test-section">
        <h4 class="section-title">📄 3. Generar Factura de Prueba</h4>
        <div class="invoice-form">
          <div class="form-row">
            <label>Período Inicio:</label>
            <input type="date" v-model="invoiceForm.period_start" />
          </div>
          <div class="form-row">
            <label>Período Fin:</label>
            <input type="date" v-model="invoiceForm.period_end" />
          </div>
          <div class="form-row">
            <label>Pedidos Seleccionados:</label>
            <span class="selected-count">{{ selectedOrderIds.length }} de {{ invoiceableOrders.length }}</span>
          </div>
        </div>

        <div class="test-actions">
          <button 
            @click="generateTestInvoice" 
            class="test-btn primary" 
            :disabled="selectedOrderIds.length === 0 || generatingInvoice"
          >
            {{ generatingInvoice ? 'Generando...' : '💰 Generar Factura Mejorada' }}
          </button>
          <button 
            @click="generateWithOldMethod" 
            class="test-btn secondary" 
            :disabled="selectedOrderIds.length === 0 || generatingInvoice"
          >
            🔄 Comparar con Método Original
          </button>
        </div>
      </div>

      <!-- Sección 4: Resultados -->
      <div class="test-section" v-if="testResults.length > 0">
        <h4 class="section-title">📋 4. Resultados de Pruebas</h4>
        <div class="results-list">
          <div v-for="(result, index) in testResults" :key="index" class="result-item" :class="result.type">
            <div class="result-time">{{ result.timestamp }}</div>
            <div class="result-message">{{ result.message }}</div>
            <div v-if="result.data" class="result-data">
              <pre>{{ JSON.stringify(result.data, null, 2) }}</pre>
            </div>
          </div>
        </div>
        <button @click="clearResults" class="test-btn danger">🗑️ Limpiar Resultados</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';

// --- ESTADO ---
const auth = useAuthStore();
const toast = useToast();

const loading = ref(true);
const loadingStats = ref(false);
const loadingOrders = ref(false);
const generatingInvoice = ref(false);

// --- DATOS ---
const companies = ref([]);
const selectedCompanyId = ref('');
const dashboardStats = ref({});
const invoiceableOrders = ref([]);
const ordersSummary = ref({});
const selectedOrderIds = ref([]);
const testResults = ref([]);

// --- FORMULARIO ---
const invoiceForm = ref({
  period_start: '',
  period_end: ''
});

// --- COMPUTED ---
const selectedCompany = computed(() => 
  companies.value.find(c => c._id === selectedCompanyId.value)
);

// --- MÉTODOS ---
async function loadInitialData() {
  loading.value = true;
  try {
    if (auth.isAdmin) {
      const { data } = await apiService.companies.getAll();
      companies.value = data;
    } else {
      selectedCompanyId.value = auth.user.company_id;
      await loadCompanyData();
    }
  } catch (error) {
    addResult('error', 'Error cargando datos iniciales', error.message);
  } finally {
    loading.value = false;
  }
}

async function onCompanyChange() {
  if (selectedCompanyId.value) {
    await loadCompanyData();
  }
}

async function loadCompanyData() {
  await Promise.all([
    loadDashboardStats(),
    loadInvoiceableOrders()
  ]);
  setDefaultDates();
}

async function loadDashboardStats() {
  loadingStats.value = true;
  try {
    const { data } = await apiService.billing.getDashboardStats(selectedCompanyId.value);
    dashboardStats.value = data;
    addResult('success', '📊 Estadísticas cargadas correctamente', {
      invoiceable_orders: data.invoiceableOrders,
      monthly_revenue: data.monthlyRevenue?.total_revenue,
      billing_rate: data.billingRate
    });
  } catch (error) {
    addResult('error', 'Error cargando estadísticas', error.message);
    console.error('Error cargando estadísticas:', error);
  } finally {
    loadingStats.value = false;
  }
}

async function loadInvoiceableOrders() {
  loadingOrders.value = true;
  try {
    const { data } = await apiService.billing.getInvoiceableOrders(selectedCompanyId.value);
    invoiceableOrders.value = data.orders;
    ordersSummary.value = data.summary;
    selectedOrderIds.value = []; // Limpiar selección
    addResult('success', `📦 ${data.orders.length} pedidos facturables cargados`, {
      total_orders: data.summary.total_orders,
      total_amount: data.summary.total_amount
    });
  } catch (error) {
    addResult('error', 'Error cargando pedidos facturables', error.message);
    console.error('Error cargando pedidos:', error);
  } finally {
    loadingOrders.value = false;
  }
}

function selectAllOrders() {
  if (selectedOrderIds.value.length === invoiceableOrders.value.length) {
    selectedOrderIds.value = [];
    toast.info('Selección limpiada');
  } else {
    selectedOrderIds.value = invoiceableOrders.value.map(order => order._id);
    toast.success(`${selectedOrderIds.value.length} pedidos seleccionados`);
  }
}

async function generateTestInvoice() {
  if (!validateInvoiceForm()) return;

  generatingInvoice.value = true;
  try {
    const invoiceData = {
      company_id: selectedCompanyId.value,
      order_ids: selectedOrderIds.value,
      period_start: invoiceForm.value.period_start,
      period_end: invoiceForm.value.period_end
    };

    console.log('🧪 Probando facturación mejorada:', invoiceData);

    const { data } = await apiService.billing.generateInvoiceImproved(invoiceData);
    
    addResult('success', '💰 Factura generada con método mejorado', {
      invoice_number: data.invoice.invoice_number,
      total_orders: data.orders_invoiced || data.orders_added,
      method: 'improved'
    });

    toast.success(`✅ Factura ${data.invoice.invoice_number} generada correctamente`);
    
    // Refrescar datos
    await loadCompanyData();
    
  } catch (error) {
    addResult('error', 'Error generando factura mejorada', error.response?.data?.error || error.message);
    toast.error(error.response?.data?.error || 'Error generando factura');
  } finally {
    generatingInvoice.value = false;
  }
}

async function generateWithOldMethod() {
  if (!validateInvoiceForm()) return;

  generatingInvoice.value = true;
  try {
    const invoiceData = {
      company_id: selectedCompanyId.value,
      order_ids: selectedOrderIds.value,
      period_start: invoiceForm.value.period_start,
      period_end: invoiceForm.value.period_end
    };

    console.log('🔄 Probando facturación original:', invoiceData);

    const { data } = await apiService.billing.generateInvoice(invoiceData);
    
    addResult('info', '🔄 Factura generada con método original', {
      invoice_number: data.invoice.invoice_number,
      method: 'original'
    });

    toast.success(`✅ Factura ${data.invoice.invoice_number} generada (método original)`);
    
    // Refrescar datos
    await loadCompanyData();
    
  } catch (error) {
    addResult('error', 'Error con método original', error.response?.data?.error || error.message);
    toast.error(error.response?.data?.error || 'Error generando factura');
  } finally {
    generatingInvoice.value = false;
  }
}

function validateInvoiceForm() {
  if (!invoiceForm.value.period_start || !invoiceForm.value.period_end) {
    toast.error('Debes seleccionar el período de facturación');
    return false;
  }
  
  if (selectedOrderIds.value.length === 0) {
    toast.error('Debes seleccionar al menos un pedido');
    return false;
  }
  
  return true;
}

function setDefaultDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  invoiceForm.value.period_start = firstDay.toISOString().split('T')[0];
  invoiceForm.value.period_end = lastDay.toISOString().split('T')[0];
}

function addResult(type, message, data = null) {
  testResults.value.unshift({
    type,
    message,
    data,
    timestamp: new Date().toLocaleTimeString()
  });
  
  // Limitar a 10 resultados
  if (testResults.value.length > 10) {
    testResults.value = testResults.value.slice(0, 10);
  }
}

function clearResults() {
  testResults.value = [];
  toast.info('Resultados limpiados');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL');
}

// --- CICLO DE VIDA ---
onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
/* ==================== WIDGET PRINCIPAL ==================== */
.billing-test-widget {
  background: white;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 20px;
  overflow: hidden;
}

.widget-header {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.widget-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.company-name {
  font-size: 14px;
  opacity: 0.9;
}

.company-selector select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.1);
  color: white;
  font-size: 14px;
}

/* ==================== ESTADOS ==================== */
.loading-state, .no-selection {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ==================== SECCIONES ==================== */
.test-sections {
  padding: 20px;
}

.test-section {
  margin-bottom: 32px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

/* ==================== ESTADÍSTICAS ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

/* ==================== PEDIDOS ==================== */
.orders-summary {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.orders-list {
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
}

.order-customer {
  font-size: 12px;
  color: #6b7280;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.order-date {
  font-size: 12px;
  color: #6b7280;
}

.order-amount {
  font-weight: 600;
  color: #059669;
}

.more-orders {
  padding: 12px 16px;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

/* ==================== FORMULARIO ==================== */
.invoice-form {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.form-row label {
  font-weight: 500;
  color: #374151;
}

.form-row input {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.selected-count {
  font-weight: 600;
  color: #3b82f6;
}

/* ==================== BOTONES ==================== */
.test-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.test-btn {
  padding: 10px 16px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-btn.primary {
  background: #3b82f6;
  color: white;
}

.test-btn.primary:hover:not(:disabled) {
  background: #2563eb;
}

.test-btn.secondary {
  background: #6b7280;
  color: white;
}

.test-btn.secondary:hover:not(:disabled) {
  background: #4b5563;
}

.test-btn.danger {
  background: #ef4444;
  color: white;
}

.test-btn.danger:hover:not(:disabled) {
  background: #dc2626;
}

.test-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.test-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

/* ==================== RESULTADOS ==================== */
.results-list {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 4px solid;
}

.result-item.success {
  background: #f0fdf4;
  border-color: #22c55e;
}

.result-item.error {
  background: #fef2f2;
  border-color: #ef4444;
}

.result-item.info {
  background: #eff6ff;
  border-color: #3b82f6;
}

.result-time {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.result-message {
  font-weight: 500;
  margin-bottom: 8px;
}

.result-data {
  background: rgba(0,0,0,0.05);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
}

.result-data pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>