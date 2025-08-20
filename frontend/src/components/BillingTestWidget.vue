<template>
  <div class="billing-test-widget">
    <div class="widget-header">
      <h3 class="widget-title">
        Facturación Mejorada
        <span class="company-name" v-if="selectedCompany">
          - {{ selectedCompany.name }}
        </span>
      </h3>
      
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
      <p>Cargando datos...</p>
    </div>

    <div v-else-if="!selectedCompanyId" class="no-selection">
      <p>{{ auth.isAdmin ? 'Selecciona una empresa para continuar' : 'Cargando datos de tu empresa...' }}</p>
    </div>

    <div v-else class="test-sections">
      
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

      <div class="test-section">
        <h4 class="section-title">📦 2. Pedidos Listos para Facturar</h4>
        
        <div class="invoice-form date-filter-form">
          <div class="form-row">
            <label>Período Inicio:</label>
            <input type="date" v-model="invoiceForm.period_start" />
          </div>
          <div class="form-row">
            <label>Período Fin:</label>
            <input type="date" v-model="invoiceForm.period_end" />
          </div>
           <button @click="loadInvoiceableOrders" class="test-btn" :disabled="loadingOrders">
            {{ loadingOrders ? 'Cargando...' : '🔎 Filtrar por Fecha' }}
          </button>
        </div>

        <div class="orders-summary">
          <p><strong>Mostrando:</strong> {{ invoiceableOrders.length }} pedidos</p>
          <p><strong>Monto Total:</strong> ${{ formatCurrency(ordersSummary.total_amount || 0) }}</p>
        </div>
        
        <div class="orders-list" v-if="invoiceableOrders.length > 0">
          <div v-for="order in invoiceableOrders" :key="order._id" class="order-item">
            <input 
              type="checkbox"
              :value="order._id"
              :checked="selectedOrderIds.includes(order._id)"
              @change="toggleOrderSelection(order._id)"
              class="order-checkbox"
            />
            <div class="order-info">
              <span class="order-number">{{ order.order_number }}</span>
              <span class="order-customer">{{ order.customer_name }}</span>
            </div>
            <div class="order-details">
              <span class="order-date">{{ formatDate(order.delivery_date) }}</span>
              <span class="order-amount">${{ formatCurrency(order.shipping_cost) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-orders">
          <p>No se encontraron pedidos para el rango de fechas seleccionado.</p>
        </div>

        <div class="test-actions">
          <button 
            @click="selectAllOrders" 
            class="test-btn secondary" 
            :disabled="invoiceableOrders.length === 0"
          >
            {{ selectedOrderIds.length === invoiceableOrders.length ? '❌ Deseleccionar Todos' : '✅ Seleccionar Todos' }}
             ({{ selectedOrderIds.length }})
          </button>
        </div>
      </div>

      <div class="test-section">
        <h4 class="section-title">📄 3. Generar Factura</h4>
        <div class="invoice-form">
          <div class="form-row">
            <label>Período de Factura:</label>
            <span>{{ formatDate(invoiceForm.period_start) }} - {{ formatDate(invoiceForm.period_end) }}</span>
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
        </div>
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
  setDefaultDates(); 
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
  selectedOrderIds.value = []; 
  if (selectedCompanyId.value) {
    await loadCompanyData();
  } else {
    invoiceableOrders.value = [];
    ordersSummary.value = {};
    dashboardStats.value = {};
  }
}

async function loadCompanyData() {
  await Promise.all([
    loadDashboardStats(),
    loadInvoiceableOrders()
  ]);
}

async function loadDashboardStats() {
  if (!selectedCompanyId.value) return;
  loadingStats.value = true;
  try {
    const { data } = await apiService.billing.getDashboardStats(selectedCompanyId.value);
    dashboardStats.value = data;
    addResult('success', '📊 Estadísticas cargadas', {});
  } catch (error) {
    addResult('error', 'Error cargando estadísticas', error.message);
    console.error('Error cargando estadísticas:', error);
  } finally {
    loadingStats.value = false;
  }
}

// ** FUNCIÓN CORREGIDA PARA ENVIAR PARÁMETROS CORRECTAMENTE **
async function loadInvoiceableOrders() {
  if (!selectedCompanyId.value) return;
  if (!invoiceForm.value.period_start || !invoiceForm.value.period_end) {
      toast.error('Debes seleccionar un rango de fechas válido.');
      return;
  }
    
  loadingOrders.value = true;
  try {
    // 1. Preparamos los parámetros de consulta (query params)
    const params = {
      // El company_id también debe ir aquí para que el backend lo reciba en req.query
      company_id: selectedCompanyId.value, 
      startDate: invoiceForm.value.period_start,
      endDate: invoiceForm.value.period_end
    };
    
    // 2. La llamada a la API ahora solo pasa un objeto de configuración con los 'params'
    // Tu apiService se encargará de construir la URL: /invoiceable-orders?company_id=...&startDate=...
    const { data } = await apiService.billing.getInvoiceableOrders({ params });
    
    invoiceableOrders.value = data.orders;
    ordersSummary.value = data.summary;
    selectedOrderIds.value = []; 
    
    if (data.orders.length > 0) {
      toast.success(`${data.orders.length} pedidos cargados para el período.`);
    } else {
      toast.info('No se encontraron pedidos para las fechas seleccionadas.');
    }

  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    addResult('error', 'Error cargando pedidos facturables', errorMessage);
    console.error('Error cargando pedidos:', error);
    toast.error('No se pudieron cargar los pedidos.');
  } finally {
    loadingOrders.value = false;
  }
}

function toggleOrderSelection(orderId) {
  const index = selectedOrderIds.value.indexOf(orderId);
  if (index > -1) {
    selectedOrderIds.value.splice(index, 1);
  } else {
    selectedOrderIds.value.push(orderId);
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

    const { data } = await apiService.billing.generateInvoiceImproved(invoiceData);
    
    addResult('success', '💰 Factura generada con método mejorado', {
      invoice_number: data.invoice.invoice_number,
      total_orders: data.orders_invoiced || data.orders_added,
      method: 'improved'
    });

    toast.success(`✅ Factura ${data.invoice.invoice_number} generada correctamente`);
    
    await loadCompanyData(); 
    
  } catch (error) {
    addResult('error', 'Error generando factura', error.response?.data?.error || error.message);
    toast.error(error.response?.data?.error || 'Error generando factura');
  } finally {
    generatingInvoice.value = false;
  }
}

function validateInvoiceForm() {
  if (selectedOrderIds.value.length === 0) {
    toast.error('Debes seleccionar al menos un pedido para facturar');
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
    type, message, data,
    timestamp: new Date().toLocaleTimeString()
  });
  if (testResults.value.length > 10) {
    testResults.value = testResults.value.slice(0, 10);
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

// ** FUNCIÓN CORREGIDA PARA EVITAR "INVALID DATE" **
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  
  const date = new Date(dateStr); // Intenta crear la fecha directamente
  
  // Verifica si la fecha es válida
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  return date.toLocaleDateString('es-CL', {
    timeZone: 'UTC', // Usar UTC para consistencia
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// --- CICLO DE VIDA ---
onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
/* Estilos sin cambios */
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

.widget-title { font-size: 18px; font-weight: 600; margin: 0; }
.company-name { font-size: 14px; opacity: 0.9; }

.company-selector select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.1);
  color: white;
  font-size: 14px;
}
.company-selector select option { color: black; }

.loading-state, .no-selection { text-align: center; padding: 40px; color: #6b7280; }
.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

.test-sections { padding: 20px; }
.test-section {
  margin-bottom: 32px; padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}
.section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 16px 0; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 16px; }
.stat-card { background: white; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
.stat-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 700; color: #1f2937; }

.orders-summary { background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
.orders-list { background: white; border-radius: 8px; margin-bottom: 16px; max-height: 250px; overflow-y: auto; border: 1px solid #e5e7eb; }
.no-orders { text-align: center; color: #6b7280; padding: 20px; }

.order-item { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; gap: 12px; }
.order-checkbox { width: 18px; height: 18px; }
.order-info { flex-grow: 1; display: flex; flex-direction: column; gap: 4px; }
.order-number { font-weight: 600; color: #1f2937; }
.order-customer { font-size: 12px; color: #6b7280; }
.order-details { display: flex; flex-direction: column; gap: 4px; text-align: right; }
.order-date { font-size: 12px; color: #6b7280; }
.order-amount { font-weight: 600; color: #059669; }

.invoice-form { background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
.date-filter-form { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.form-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; }
.form-row label { font-weight: 500; color: #374151; }
.form-row input[type="date"] { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.selected-count { font-weight: 600; color: #3b82f6; }

.test-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.test-btn {
  padding: 10px 16px; border-radius: 6px; border: none; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
  background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
}
.test-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.test-btn:hover:not(:disabled) { background: #e5e7eb; }

.test-btn.primary { background: #3b82f6; color: white; }
.test-btn.primary:hover:not(:disabled) { background: #2563eb; }

.test-btn.secondary { background: #6b7280; color: white; }
.test-btn.secondary:hover:not(:disabled) { background: #4b5563; }
</style>