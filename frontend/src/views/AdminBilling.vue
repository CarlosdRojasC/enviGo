<template>
  <div class="admin-billing-page">
    <!-- Header mejorado -->
    <div class="billing-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <span class="title-icon">💰</span>
            Centro de Facturación
            <span class="beta-badge">PRO</span>
          </h1>
          <p class="page-subtitle">
            Gestión avanzada de facturación y finanzas empresariales
          </p>
        </div>
        
        <div class="header-actions">
          <button @click="refreshData" class="action-btn secondary" :disabled="loading">
            <span class="btn-icon">🔄</span>
            {{ loading ? 'Actualizando...' : 'Actualizar' }}
          </button>
          <button @click="openBulkGenerateModal" class="action-btn secondary">
            <span class="btn-icon">⚡</span>
            Generar Masivo
          </button>
          <button @click="openGenerateModal" class="action-btn primary">
            <span class="btn-icon">+</span>
            Nueva Factura
          </button>
        </div>
      </div>

      <!-- Métricas mejoradas -->
   <div class="metrics-dashboard">
  <!-- Tarjeta de Ingresos con tendencias mejoradas -->
  <div class="metric-card revenue">
    <div class="metric-header">
      <div class="metric-icon">💰</div>
      <!-- Mostrar tendencia tanto positiva como negativa -->
      <div 
        class="metric-trend" 
        :class="{
          'positive': metrics.revenueGrowth > 0,
          'negative': metrics.revenueGrowth < 0,
          'neutral': metrics.revenueGrowth === 0
        }"
        v-if="metrics.revenueGrowth !== undefined"
      >
        <span class="trend-icon">
          {{ metrics.revenueGrowth > 0 ? '📈' : metrics.revenueGrowth < 0 ? '📉' : '➡️' }}
        </span>
        <span>{{ Math.abs(metrics.revenueGrowth).toFixed(1) }}%</span>
      </div>
    </div>
    <div class="metric-content">
      <div class="metric-value">${{ formatCurrency(metrics.totalRevenue || 0) }}</div>
      <div class="metric-label">Ingresos Totales</div>
      <div class="metric-detail">
        Este mes: ${{ formatCurrency(metrics.currentMonthRevenue || 0) }}
        <span 
          class="growth-indicator"
          :class="{
            'positive': metrics.revenueGrowth > 0,
            'negative': metrics.revenueGrowth < 0
          }"
          v-if="metrics.revenueGrowth !== undefined && metrics.revenueGrowth !== 0"
        >
          ({{ metrics.revenueGrowth > 0 ? '+' : '' }}{{ metrics.revenueGrowth.toFixed(1) }}% vs mes anterior)
        </span>
      </div>
    </div>
  </div>
  
  <!-- Tarjeta de Monto Pendiente -->
  <div class="metric-card pending">
    <div class="metric-header">
      <div class="metric-icon">⏰</div>
      <div class="metric-alert" v-if="(metrics.overdueInvoices || 0) > 0">
        {{ metrics.overdueInvoices }}
      </div>
    </div>
    <div class="metric-content">
      <div class="metric-value">${{ formatCurrency(metrics.pendingAmount || 0) }}</div>
      <div class="metric-label">Monto Pendiente</div>
      <div class="metric-detail">{{ metrics.pendingInvoices || 0 }} facturas</div>
    </div>
  </div>
  
  <!-- Tarjeta de Facturas Generadas -->
  <div class="metric-card invoices">
    <div class="metric-header">
      <div class="metric-icon">📄</div>
      <div class="metric-badge">{{ metrics.newInvoicesThisMonth || 0 }}</div>
    </div>
    <div class="metric-content">
      <div class="metric-value">{{ metrics.totalInvoices || 0 }}</div>
      <div class="metric-label">Facturas Generadas</div>
      <div class="metric-detail">Promedio: ${{ formatCurrency(metrics.averageInvoiceAmount || 0) }}</div>
    </div>
  </div>
  
  <!-- Tarjeta de Pedidos Sin Facturar -->
  <div class="metric-card orders">
    <div class="metric-header">
      <div class="metric-icon">📦</div>
      <div class="metric-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: billingRate + '%' }"></div>
        </div>
      </div>
    </div>
    <div class="metric-content">
      <div class="metric-value">{{ metrics.unfactoredOrders || 0 }}</div>
      <div class="metric-label">Pedidos Sin Facturar</div>
      <div class="metric-detail">{{ billingRate }}% facturado</div>
    </div>
  </div>
</div>
    </div>

    <!-- Filtros avanzados -->
    <div class="filters-section">
      <div class="filters-container">
        <div class="search-wrapper">
          <input 
            v-model="filters.search" 
            type="text" 
            placeholder="Buscar facturas..." 
            class="search-input"
            @input="debouncedSearch"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <select v-model="filters.company" class="filter-select">
          <option value="">Todas las empresas</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
        
        <select v-model="filters.status" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="paid">Pagada</option>
          <option value="overdue">Vencida</option>
        </select>
        
        <select v-model="filters.period" class="filter-select">
          <option value="">Todos los períodos</option>
          <option value="this_month">Este mes</option>
          <option value="last_month">Mes anterior</option>
          <option value="this_quarter">Este trimestre</option>
          <option value="this_year">Este año</option>
        </select>
        
        <button @click="clearFilters" class="filter-clear-btn">
          <span>✕</span>
          Limpiar
        </button>
      </div>
    </div>

    <!-- Gráfico de ingresos -->
    <div class="chart-section" v-if="!loading">
      <h3 class="chart-title">
        <span class="chart-icon">📊</span>
        Tendencia de Ingresos
      </h3>
      <div class="chart-wrapper">
        <canvas ref="revenueChartCanvas"></canvas>
      </div>
    </div>

    <!-- Tabla de facturas mejorada -->
    <div class="invoices-section">
      <div class="section-header">
        <h3 class="section-title">
          <span class="section-icon">📄</span>
          Facturas
          <span class="results-count">({{ filteredInvoices.length }})</span>
        </h3>
        
        <!-- Acciones masivas -->
        <div class="bulk-actions" v-if="selectedInvoices.length > 0">
          <span class="selection-info">{{ selectedInvoices.length }} seleccionadas</span>
          <div class="bulk-buttons">
            <button @click="bulkMarkAsPaid" class="bulk-btn success">
              ✅ Marcar Pagadas
            </button>
            <button @click="bulkDownload" class="bulk-btn secondary">
              📥 Descargar PDFs
            </button>
            <button @click="bulkDelete" class="bulk-btn danger">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
      
      <div class="table-wrapper">
        <table class="invoices-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input 
                  type="checkbox" 
                  @change="toggleSelectAll"
                  :checked="allSelected"
                  :indeterminate="someSelected"
                />
              </th>
              <th @click="setSortBy('invoice_number')" class="sortable">
                Factura
                <span class="sort-indicator" v-if="sortBy === 'invoice_number'">
                  {{ sortOrder === 'desc' ? '↓' : '↑' }}
                </span>
              </th>
              <th @click="setSortBy('company_name')" class="sortable">
                Empresa
                <span class="sort-indicator" v-if="sortBy === 'company_name'">
                  {{ sortOrder === 'desc' ? '↓' : '↑' }}
                </span>
              </th>
              <th @click="setSortBy('period_start')" class="sortable">
                Período
                <span class="sort-indicator" v-if="sortBy === 'period_start'">
                  {{ sortOrder === 'desc' ? '↓' : '↑' }}
                </span>
              </th>
              <th @click="setSortBy('total_orders')" class="sortable">
                Pedidos
                <span class="sort-indicator" v-if="sortBy === 'total_orders'">
                  {{ sortOrder === 'desc' ? '↓' : '↑' }}
                </span>
              </th>
              <th @click="setSortBy('total_amount')" class="sortable">
                Monto
                <span class="sort-indicator" v-if="sortBy === 'total_amount'">
                  {{ sortOrder === 'desc' ? '↓' : '↑' }}
                </span>
              </th>
              <th @click="setSortBy('status')" class="sortable">
                Estado
                <span class="sort-indicator" v-if="sortBy === 'status'">
                  {{ sortOrder === 'desc' ? '↓' : '↑' }}
                </span>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="loading-state">
                <div class="loading-spinner"></div>
                Cargando facturas...
              </td>
            </tr>
            <tr v-else-if="filteredInvoices.length === 0">
              <td colspan="8" class="empty-state">
                <div class="empty-icon">📄</div>
                <p>No hay facturas para mostrar</p>
                <button @click="openGenerateModal" class="empty-action-btn">
                  Crear primera factura
                </button>
              </td>
            </tr>
            <tr 
              v-for="invoice in paginatedInvoices" 
              :key="invoice._id"
              class="invoice-row"
              :class="{ 
                selected: selectedInvoices.includes(invoice._id),
                urgent: isUrgentInvoice(invoice)
              }"
            >
              <td class="checkbox-col">
                <input 
                  type="checkbox" 
                  :value="invoice._id"
                  v-model="selectedInvoices"
                />
              </td>
              <td class="invoice-number-cell">
                <div class="invoice-number">{{ invoice.invoice_number }}</div>
                <div class="invoice-date">{{ formatDate(invoice.created_at) }}</div>
              </td>
              <td class="company-cell">
                <div class="company-name">{{ invoice.company_id?.name || 'N/A' }}</div>
                <div class="company-email">{{ invoice.company_id?.email || '' }}</div>
              </td>
              <td class="period-cell">
                <div class="period-text">{{ formatPeriod(invoice.period_start, invoice.period_end) }}</div>
                <div class="period-duration">{{ getPeriodDuration(invoice) }} días</div>
              </td>
              <td class="orders-cell">
                <div class="orders-count">{{ invoice.total_orders }}</div>
                <div class="orders-label">pedidos</div>
              </td>
              <td class="amount-cell">
                <div class="amount-total">${{ formatCurrency(invoice.total_amount) }}</div>
                <div class="amount-breakdown">
                  <span class="amount-detail">Sub: ${{ formatCurrency(invoice.subtotal) }}</span>
                  <span class="amount-detail">IVA: ${{ formatCurrency(invoice.tax_amount) }}</span>
                </div>
              </td>
              <td class="status-cell">
                <span class="status-badge" :class="invoice.status">
                  {{ getStatusIcon(invoice.status) }} {{ getStatusText(invoice.status) }}
                </span>
                <div v-if="invoice.due_date && invoice.status === 'sent'" class="due-info">
                  Vence: {{ formatDate(invoice.due_date) }}
                </div>
              </td>
              <td class="actions-cell">
  <div class="action-buttons">
    <button 
      v-if="invoice.status === 'pending_confirmation'"
      @click="confirmPayment(invoice._id)"
      class="action-btn confirm"
      title="Confirmar Pago Recibido"
    >
      ✅
    </button>
    
    <button v-if="invoice.status === 'draft'" @click="sendInvoice(invoice._id)" class="action-btn send" title="Enviar">📤</button>
    <button @click="downloadInvoice(invoice._id)" class="action-btn download" title="Descargar PDF">📄</button>
    <button @click="viewInvoice(invoice)" class="action-btn view" title="Ver detalles">👁️</button>
    <button @click="deleteInvoice(invoice._id)" class="action-btn delete" title="Eliminar">🗑️</button>
  </div>
</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Paginación -->
      <div class="pagination" v-if="totalPages > 1">
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

    <!-- Modales -->
    <Modal v-model="showGenerateModal" title="Generar Nueva Factura" width="800px">
      <BillingTestWidget 
        :companies="companies"
        @close="showGenerateModal = false"
        @generated="handleInvoiceGenerated"
      />
    </Modal>
    
    <Modal v-model="showBulkGenerateModal" title="Generar Facturas Masivas" width="900px">
      <BulkGenerateForm 
        :companies="companies"
        @close="showBulkGenerateModal = false"
        @generated="handleBulkGenerated"
      />
    </Modal>
    
    <Modal v-model="showInvoiceModal" title="Detalles de Factura" width="700px">
      <InvoiceDetails 
        :invoice="selectedInvoice"
        @close="showInvoiceModal = false"
        @updated="handleInvoiceUpdated"
      />
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import { Chart, registerables } from 'chart.js';
import { nextTick } from 'vue';
import Modal from '../components/Modal.vue';
import BulkGenerateForm from '../components/billing/BulkGenerateForm.vue';
import InvoiceDetails from '../components/billing/InvoiceDetails.vue';
import BillingTestWidget from '../components/BillingTestWidget.vue';

Chart.register(...registerables);

// --- ESTADO ---
const auth = useAuthStore();
const toast = useToast();
const loading = ref(true);

// --- DATOS ---
const invoices = ref([]);
const companies = ref([]);
const selectedInvoices = ref([]);

// --- MÉTRICAS ---
const metrics = ref({
  totalRevenue: 0,
  revenueGrowth: 0,
  currentMonthRevenue: 0,
  pendingAmount: 0,
  totalInvoices: 0,
  pendingInvoices: 0,
  overdueInvoices: 0,
  newInvoicesThisMonth: 0,
  unfactoredOrders: 0,
  averageInvoiceAmount: 0,
  billedOrders: 0
});

// --- FILTROS Y PAGINACIÓN ---
const filters = ref({ search: '', company: '', status: '', period: '' });
const sortBy = ref('created_at');
const sortOrder = ref('desc');
const currentPage = ref(1);
const itemsPerPage = ref(10);

// --- ESTADO DE LA UI ---
const showGenerateModal = ref(false);
const showBulkGenerateModal = ref(false);
const showInvoiceModal = ref(false);
const selectedInvoice = ref(null);

// --- REFERENCIAS ---
const revenueChartCanvas = ref(null);
const revenueChart = ref(null);

// --- COMPUTED PROPERTIES ---
const filteredInvoices = computed(() => {
  let filtered = invoices.value;

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    filtered = filtered.filter(invoice =>
      invoice.invoice_number?.toLowerCase().includes(search) ||
      invoice.company_id?.name?.toLowerCase().includes(search)
    );
  }
  if (filters.value.company) {
    filtered = filtered.filter(invoice => invoice.company_id?._id === filters.value.company);
  }
  if (filters.value.status) {
    filtered = filtered.filter(invoice => invoice.status === filters.value.status);
  }
  // Añadir más lógica de filtrado si es necesario...
  
  return filtered;
});

const sortedInvoices = computed(() => {
    const sorted = [...filteredInvoices.value];
    sorted.sort((a, b) => {
        let aValue = a[sortBy.value];
        let bValue = b[sortBy.value];
        if (sortBy.value === 'company_name') {
            aValue = a.company_id?.name || '';
            bValue = b.company_id?.name || '';
        }
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        if (sortOrder.value === 'desc') {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
    });
    return sorted;
});

const paginatedInvoices = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return sortedInvoices.value.slice(start, start + itemsPerPage.value);
});

const totalPages = computed(() => Math.ceil(filteredInvoices.value.length / itemsPerPage.value));

const visiblePages = computed(() => {
  const pages = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, start + 4);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});


const allSelected = computed(() => paginatedInvoices.value.length > 0 && paginatedInvoices.value.every(invoice => selectedInvoices.value.includes(invoice._id)));
const someSelected = computed(() => selectedInvoices.value.length > 0 && !allSelected.value);

const billingRate = computed(() => {
  const unfactored = metrics.value.unfactoredOrders || 0;
  const total = metrics.value.totalInvoices || 0;
  const totalFacturable = unfactored + total;
  
  if (totalFacturable === 0) return 0;
  
  return Math.round((total / totalFacturable) * 100);
});
// --- MÉTODOS ---
async function sendInvoice(invoiceId) {
  if (!confirm('¿Estás seguro de que quieres enviar esta factura al cliente? Esta acción no se puede deshacer.')) return;

  try {
    // Llama al nuevo endpoint que crearemos en el backend
    await apiService.billing.sendInvoice(invoiceId);
    toast.success('Factura enviada exitosamente.');
    
    // Vuelve a cargar los datos para que veas el cambio de estado de "Borrador" a "Enviada"
    await fetchInitialData(); 
  } catch (error) {
    console.error('Error sending invoice:', error);
    toast.error(error.message || 'No se pudo enviar la factura.');
  }
}
async function confirmPayment(invoiceId) {
  try {
    // Asumiendo que tienes un endpoint en tu apiService
    await apiService.billing.confirmPayment(invoiceId);
    toast.success('Pago confirmado exitosamente.');
    fetchInitialData(); // Refrescar los datos
  } catch (error) {
    toast.error(error.message || 'No se pudo confirmar el pago.');
  }
}

async function fetchInitialData() {
  console.log('🚀 AdminBilling: Iniciando carga de datos...');
  
  const startTime = performance.now();
  
  try {
    // Cargar datos en paralelo para mejor rendimiento
    await Promise.all([
      fetchFinancialSummary(),
      fetchInvoices(),
      fetchCompanies()
    ]);
    
    const endTime = performance.now();
    console.log(`✅ AdminBilling: Datos cargados en ${Math.round(endTime - startTime)}ms`);
    
  } catch (error) {
    console.error("❌ AdminBilling: Error crítico cargando datos:", error);
    toast.error("Error crítico al cargar el dashboard de facturación");
    throw error;
  }
}
// Método mejorado para obtener el resumen financiero
async function fetchFinancialSummary() {
  try {
    console.log('💰 AdminBilling: Obteniendo resumen financiero...');
    
    const { data } = await apiService.billing.getFinancialSummary();
    
    console.log('💰 AdminBilling: Datos recibidos:', data);
    
    // Asegurar que todos los campos necesarios existen con valores por defecto
    metrics.value = {
      totalRevenue: data.totalRevenue || 0,
      currentMonthRevenue: data.currentMonthRevenue || 0,
      revenueGrowth: data.revenueGrowth !== undefined ? data.revenueGrowth : 0,
      pendingAmount: data.pendingAmount || 0,
      totalInvoices: data.totalInvoices || 0,
      pendingInvoices: data.pendingInvoices || 0,
      overdueInvoices: data.overdueInvoices || 0,
      newInvoicesThisMonth: data.newInvoicesThisMonth || 0,
      unfactoredOrders: data.unfactoredOrders || 0,
      averageInvoiceAmount: data.averageInvoiceAmount || 0,
      monthlyRevenueData: data.monthlyRevenueData || []
    };
    
    console.log('💰 AdminBilling: Métricas procesadas:', {
      totalRevenue: metrics.value.totalRevenue,
      revenueGrowth: metrics.value.revenueGrowth,
      currentMonthRevenue: metrics.value.currentMonthRevenue
    });
    
    // Crear gráfico con datos válidos
    createRevenueChart(metrics.value.monthlyRevenueData);
    
  } catch (error) {
    console.error('❌ AdminBilling: Error obteniendo resumen financiero:', error);
    
    // Valores por defecto en caso de error
    metrics.value = {
      totalRevenue: 0,
      currentMonthRevenue: 0,
      revenueGrowth: 0,
      pendingAmount: 0,
      totalInvoices: 0,
      pendingInvoices: 0,
      overdueInvoices: 0,
      newInvoicesThisMonth: 0,
      unfactoredOrders: 0,
      averageInvoiceAmount: 0,
      monthlyRevenueData: []
    };
    
    toast.error('Error cargando métricas financieras. Mostrando datos por defecto.');
  }
}

// Método mejorado para crear el gráfico de ingresos
function createRevenueChart(data) {
  if (revenueChart) {
    revenueChart.destroy();
    revenueChart = null;
  }
  
  if (!revenueChartCanvas.value) {
    console.log('⚠️ AdminBilling: Canvas no disponible para el gráfico');
    return;
  }
  
  // Datos por defecto si no hay información
  const chartData = data && data.length > 0 ? data : [
    { month: 'Sin datos', revenue: 0 }
  ];
  
  console.log('📊 AdminBilling: Creando gráfico con datos:', chartData);
  
  try {
    const ctx = revenueChartCanvas.value.getContext('2d');
    
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.map(item => item.month),
        datasets: [{
          label: 'Ingresos por Envío',
          data: chartData.map(item => item.revenue || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3b82f6',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            titleColor: '#f9fafb',
            bodyColor: '#f9fafb',
            borderColor: '#3b82f6',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return `Ingresos: $${formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + formatCurrency(value);
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
    
    console.log('✅ AdminBilling: Gráfico creado exitosamente');
  } catch (error) {
    console.error('❌ AdminBilling: Error creando gráfico:', error);
  }
}


async function fetchInvoices() {
  try {
    const { data } = await apiService.billing.getInvoices({
        page: currentPage.value,
        limit: itemsPerPage.value,
        ...filters.value // Envía los filtros al backend
    });
    invoices.value = data.invoices || [];
  } catch (error) {
    console.error('Error fetching invoices:', error);
    toast.error('No se pudieron cargar las facturas.');
  }
}

async function fetchCompanies() {
  try {
    const { data } = await apiService.companies.getAll();
    companies.value = data;
  } catch (error) {
    console.error('Error fetching companies:', error);
  }
}
// --- ACCIONES DE BOTONES Y EVENTOS ---

async function refreshData() {
  console.log('🔄 AdminBilling: Refrescando todos los datos...');
  
  loading.value = true;
  
  try {
    await fetchInitialData();
    
    // Pequeño delay para mostrar el indicador de carga
    await new Promise(resolve => setTimeout(resolve, 300));
    
    toast.success('✅ Datos actualizados correctamente');
    
    // Debug opcional
    if (process.env.NODE_ENV === 'development') {
      debugFinancialData();
    }
    
  } catch (error) {
    console.error('❌ AdminBilling: Error refrescando datos:', error);
    toast.error('Error actualizando los datos');
  } finally {
    loading.value = false;
  }
}

function openGenerateModal() {
  showGenerateModal.value = true;
}

function openBulkGenerateModal() {
  showBulkGenerateModal.value = true;
}

function viewInvoice(invoice) {
  selectedInvoice.value = invoice;
  showInvoiceModal.value = true;
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
    toast.success('Descarga iniciada.');
  } catch (error) {
    console.error('Error downloading invoice:', error);
    toast.error('No se pudo descargar la factura.');
  }
}

async function deleteInvoice(invoiceId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta factura? Los pedidos asociados se desmarcarán como facturados.')) return;
    try {
        await apiService.billing.deleteInvoice(invoiceId);
        toast.success('Factura eliminada correctamente.');
        await fetchInitialData(); // Refresca todos los datos
    } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error(error.message || 'No se pudo eliminar la factura.');
    }
}

// --- MANEJO DE MODALES ---

function handleInvoiceGenerated() {
  showGenerateModal.value = false;
  toast.success('Factura generada exitosamente.');
  fetchInitialData();
}

function handleBulkGenerated() {
  showBulkGenerateModal.value = false;
  toast.success('Facturas masivas generadas.');
  fetchInitialData();
}

function handleInvoiceUpdated() {
  showInvoiceModal.value = false;
  toast.success('Factura actualizada.');
  fetchInvoices(); // Solo refresca las facturas
}

// --- UTILIDADES DE FORMATO Y LÓGICA ---

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL');
}

function formatPeriod(start, end) {
  if (!start || !end) return 'N/A';
  const startDate = new Date(start).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  const endDate = new Date(end).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  return `${startDate} - ${endDate}`;
}

function getPeriodDuration(invoice) {
    if (!invoice.period_start || !invoice.period_end) return 0;
    const start = new Date(invoice.period_start);
    const end = new Date(invoice.period_end);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function getStatusText(status) {
  const texts = {
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
    overdue: 'Vencida',
    pending_confirmation: 'En Revisión' // <-- AÑADIR
  };
  return texts[status] || status;
}

function getStatusIcon(status) {
    const icons = {
    draft: '⚪',
    sent: '🟡',
    paid: '🟢',
    overdue: '🔴',
    pending_confirmation: '🔵' // <-- AÑADIR
  };
  return icons[status] || '❓';
}

function isUrgentInvoice(invoice) {
    if (invoice.status === 'overdue') return true;
    if (invoice.status === 'sent' && invoice.due_date) {
        const daysUntilDue = Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 3;
    }
    return false;
}

// --- LÓGICA DE TABLA Y FILTROS ---
function setSortBy(field) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortBy.value = field;
    sortOrder.value = 'desc';
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function toggleSelectAll() {
    if (allSelected.value) {
        selectedInvoices.value = [];
    } else {
        selectedInvoices.value = paginatedInvoices.value.map(invoice => invoice._id);
    }
}

function clearFilters() {
    filters.value = { search: '', company: '', status: '', period: '' };
}

let searchTimeout;
function debouncedSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage.value = 1;
        fetchInvoices();
    }, 500);
}

// --- CICLO DE VIDA ---
onMounted(() => {
  if (auth.isAdmin) {
    fetchInitialData();
  } else {
    toast.error('Acceso denegado. Se requieren permisos de administrador.');
    // Idealmente, aquí redirigirías al usuario a otra página
  }
});

onUnmounted(() => {
  if (revenueChart.value) { // <-- CAMBIA revenueChart por revenueChart.value
        revenueChart.value.destroy(); // <-- CAMBIA revenueChart por revenueChart.value
    }
});

// Watcher para recargar facturas cuando cambian los filtros
watch(filters, debouncedSearch, { deep: true });
</script>

<style scoped>
/* Layout principal */
.admin-billing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%);
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.billing-header {
  background: white;
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  position: relative;
  overflow: hidden;
}

.billing-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ef4444, #10b981);
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
  font-size: 36px;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 16px;
  letter-spacing: -0.025em;
}

.title-icon {
  font-size: 40px;
}

.beta-badge {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.page-subtitle {
  font-size: 18px;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
}

.action-btn.secondary {
  background: #f8fafc;
  color: #374151;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.action-btn.secondary:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Métricas Dashboard */
.metrics-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.metric-card.revenue {
  border-left: 4px solid #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.metric-card.pending {
  border-left: 4px solid #ef4444;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.metric-card.invoices {
  border-left: 4px solid #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.metric-card.orders {
  border-left: 4px solid #8b5cf6;
  background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.metric-icon {
  font-size: 28px;
  line-height: 1;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
}

.metric-trend.positive {
  background: #dcfce7;
  color: #166534;
}

.metric-badge {
  background: #3b82f6;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  min-width: 20px;
  text-align: center;
}

.metric-alert {
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  min-width: 20px;
  text-align: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.metric-progress {
  width: 60px;
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
  background: linear-gradient(90deg, #10b981, #3b82f6);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metric-content {
  text-align: left;
}

.metric-value {
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1;
}

.metric-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 8px;
}

.metric-detail {
  font-size: 12px;
  color: #9ca3af;
}

/* Filtros */
.filters-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filters-container {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  background: #f9fafb;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #6b7280;
}

.filter-select {
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-clear-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

/* Gráfico */
.chart-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-icon {
  font-size: 20px;
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

/* Sección de facturas */
.invoices-section {
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.section-header {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  font-size: 24px;
}

.results-count {
  font-size: 16px;
  color: #6b7280;
  font-weight: 400;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 12px 16px;
}

.selection-info {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn.success {
  background: #10b981;
  color: white;
}

.bulk-btn.success:hover {
  background: #059669;
}

.bulk-btn.secondary {
  background: #6b7280;
  color: white;
}

.bulk-btn.secondary:hover {
  background: #4b5563;
}

.bulk-btn.danger {
  background: #ef4444;
  color: white;
}

.bulk-btn.danger:hover {
  background: #dc2626;
}

/* Tabla */
.table-wrapper {
  overflow-x: auto;
}

.invoices-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.invoices-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.invoices-table th.sortable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.invoices-table th.sortable:hover {
  background: #f3f4f6;
}

.sort-indicator {
  font-size: 12px;
  color: #3b82f6;
  margin-left: 4px;
}

.invoice-row {
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s;
}

.invoice-row:hover {
  background: #f9fafb;
}

.invoice-row.selected {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.invoice-row.urgent {
  border-left: 4px solid #ef4444;
}

.invoices-table td {
  padding: 16px;
  vertical-align: top;
  border-bottom: 1px solid #f3f4f6;
}

.checkbox-col {
  width: 50px;
}

.invoice-number-cell {
  min-width: 150px;
}

.invoice-number {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.invoice-date {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.company-cell {
  min-width: 200px;
}

.company-name {
  font-weight: 600;
  color: #1f2937;
}

.company-email {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.period-cell {
  min-width: 120px;
}

.period-text {
  font-weight: 500;
  color: #1f2937;
}

.period-duration {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.orders-cell {
  min-width: 80px;
  text-align: center;
}

.orders-count {
  font-weight: 700;
  font-size: 16px;
  color: #1f2937;
}

.orders-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.amount-cell {
  min-width: 140px;
  text-align: right;
}

.amount-total {
  font-weight: 700;
  font-size: 16px;
  color: #1f2937;
}

.amount-breakdown {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 4px;
}

.amount-detail {
  font-size: 11px;
  color: #6b7280;
}

.status-cell {
  min-width: 120px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
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
  color: #d97706;
}

.status-badge.paid {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.overdue {
  background: #fee2e2;
  color: #dc2626;
}

.due-info {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.actions-cell {
  min-width: 200px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.action-btn.send {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.action-btn.send:hover {
  background: #2563eb;
}

.action-btn.paid {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.action-btn.paid:hover {
  background: #059669;
}

.action-btn.download {
  background: #6b7280;
  color: white;
  border-color: #6b7280;
}

.action-btn.download:hover {
  background: #4b5563;
}

.action-btn.view {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.action-btn.view:hover {
  background: #d97706;
}

.action-btn.delete {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.action-btn.delete:hover {
  background: #dc2626;
}

/* Estados de carga y vacío */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
  color: #d1d5db;
}

.empty-action-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 16px;
  transition: all 0.2s;
}

.empty-action-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Paginación */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
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
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 40px;
  text-align: center;
}

.pagination-number:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.pagination-number.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* Responsive */
@media (max-width: 1024px) {
  .admin-billing-page {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
  }
  
  .metrics-dashboard {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-wrapper {
    min-width: auto;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 28px;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
  
  .metrics-dashboard {
    grid-template-columns: 1fr;
  }
  
  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .invoices-table {
    min-width: 800px;
  }
  
  .invoices-table th,
  .invoices-table td {
    padding: 12px 8px;
    font-size: 13px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .action-btn {
    width: 100%;
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .admin-billing-page {
    padding: 12px;
  }
  
  .billing-header {
    padding: 20px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .metric-card {
    padding: 16px;
  }
  
  .filters-section {
    padding: 16px;
  }
  
  .chart-section {
    padding: 16px;
  }
  
  .chart-wrapper {
    height: 200px;
  }
}
/* AÑADE ESTOS ESTILOS */
.action-btn.confirm {
  background: #2563eb; /* Azul */
  color: white;
  border-color: #2563eb;
}
.action-btn.confirm:hover {
  background: #1d4ed8;
}

.status-badge.pending_confirmation {
  background: #dbeafe; /* Azul claro */
  color: #1e40af; /* Azul oscuro */
}

.invoice-row.pending_confirmation { /* Para resaltar toda la fila */
    background: #eff6ff;
    border-left: 4px solid #2563eb;
}
</style>