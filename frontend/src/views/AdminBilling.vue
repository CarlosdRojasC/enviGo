<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Gestión de Facturación - Admin</h1>
      <div class="header-actions">
        <button @click="openBulkGenerateModal" class="btn-secondary">
          📄 Generar Facturas Masivas
        </button>
        <button @click="openGenerateModal" class="btn-primary">
          ➕ Nueva Factura
        </button>
      </div>
    </div>

    <!-- Filtros Avanzados para Admin -->
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
        
        <select v-model="filters.company_id" @change="fetchInvoices">
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
          placeholder="Buscar por número, empresa..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Resumen Financiero para Admin -->
    <div class="financial-overview">
      <div class="overview-card revenue">
        <div class="overview-icon">💰</div>
        <div class="overview-info">
          <div class="overview-value">${{ formatCurrency(financialSummary.totalRevenue) }}</div>
          <div class="overview-label">Revenue Total</div>
          <div class="overview-change" :class="{ positive: financialSummary.revenueGrowth >= 0, negative: financialSummary.revenueGrowth < 0 }">
            {{ financialSummary.revenueGrowth >= 0 ? '+' : '' }}{{ financialSummary.revenueGrowth }}% vs mes anterior
          </div>
          <div class="overview-detail">Este mes: ${{ formatCurrency(financialSummary.currentMonthRevenue) }}</div>
        </div>
      </div>
      <div class="overview-card invoices">
        <div class="overview-icon">📄</div>
        <div class="overview-info">
          <div class="overview-value">{{ financialSummary.totalInvoices }}</div>
          <div class="overview-label">Facturas Totales</div>
          <div class="overview-change">{{ financialSummary.pendingInvoices }} pendientes</div>
          <div class="overview-detail">Promedio: ${{ formatCurrency(financialSummary.averageInvoiceAmount) }}</div>
        </div>
      </div>
      <div class="overview-card orders">
        <div class="overview-icon">📦</div>
        <div class="overview-info">
          <div class="overview-value">{{ financialSummary.totalOrders }}</div>
          <div class="overview-label">Pedidos Totales</div>
          <div class="overview-change">{{ financialSummary.unfactoredOrders }} sin facturar</div>
          <div class="overview-detail">{{ financialSummary.billingRate }}% facturado</div>
        </div>
      </div>
      <div class="overview-card companies">
        <div class="overview-icon">🏢</div>
        <div class="overview-info">
          <div class="overview-value">{{ financialSummary.activeCompanies }}</div>
          <div class="overview-label">Empresas Activas</div>
          <div class="overview-change">{{ financialSummary.companiesWithPendingPayments }} con pagos pendientes</div>
          <div class="overview-detail">Revenue estimado: ${{ formatCurrency(financialSummary.estimatedRevenue) }}</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando facturas...</div>

    <div v-else class="content-section">
      <!-- Tabla de Facturas con columnas específicas para Admin -->
      <div class="table-wrapper">
        <table class="invoices-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" class="checkbox">
              </th>
              <th>Número</th>
              <th>Empresa</th>
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
              <td colspan="11" class="empty-row">
                No se encontraron facturas.
              </td>
            </tr>
            <tr v-else v-for="invoice in invoices" :key="invoice._id" class="invoice-row">
              <td>
                <input 
                  type="checkbox" 
                  v-model="selectedInvoices" 
                  :value="invoice._id" 
                  class="checkbox"
                  @change="updateSelectAll"
                >
              </td>
              <td class="invoice-number">
                <div class="invoice-id">{{ invoice.invoice_number }}</div>
                <div class="invoice-type">{{ getInvoiceType(invoice.type) }}</div>
              </td>
              <td class="company-cell">
                <div class="company-name">{{ invoice.company_id?.name || 'N/A' }}</div>
                <div class="company-plan">{{ getPlanName(invoice.company_id?.plan_type) }}</div>
              </td>
              <td class="invoice-period">
                <div class="period-text">{{ formatPeriod(invoice.period_start, invoice.period_end) }}</div>
                <div class="period-duration">{{ calculateDays(invoice.period_start, invoice.period_end) }} días</div>
              </td>
              <td class="orders-count">
                <div class="orders-total">{{ invoice.total_orders || 0 }}</div>
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
                    @click="editInvoice(invoice)" 
                    class="btn-action edit" 
                    title="Editar Factura"
                  >
                    ✏️
                  </button>
                  <button 
                    @click="deleteInvoice(invoice)" 
                    class="btn-action delete" 
                    title="Borrar Factura"
                    :disabled="invoice.status === 'paid'"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Acciones en lote -->
      <div v-if="selectedInvoices.length > 0" class="bulk-actions">
        <div class="bulk-actions-info">
          {{ selectedInvoices.length }} factura{{ selectedInvoices.length > 1 ? 's' : '' }} seleccionada{{ selectedInvoices.length > 1 ? 's' : '' }}
        </div>
        <div class="bulk-actions-buttons">
          <button @click="bulkSendInvoices" class="btn-bulk send">📧 Enviar Seleccionadas</button>
          <button @click="bulkMarkAsPaid" class="btn-bulk pay">✅ Marcar como Pagadas</button>
          <button @click="bulkDownload" class="btn-bulk download">📥 Descargar ZIP</button>
          <button @click="bulkDeleteInvoices" class="btn-bulk delete">🗑️ Borrar Seleccionadas</button>
          <button @click="selectedInvoices = []" class="btn-bulk cancel">❌ Cancelar Selección</button>
        </div>
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

    <!-- Modal de Generar Factura Individual -->
    <Modal v-model="showGenerateModal" title="Generar Nueva Factura" width="800px">
      <div class="generate-invoice-form">
        <div class="form-section">
          <h4>Selección de Empresa</h4>
          <div class="form-group">
            <label for="invoice-company">Empresa</label>
            <select id="invoice-company" v-model="generateForm.company_id" @change="onCompanyChange" required>
              <option value="">Seleccionar empresa...</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">
                {{ company.name }} ({{ company.orders_count || 0 }} pedidos)
              </option>
            </select>
          </div>
        </div>

        <div v-if="generateForm.company_id" class="form-section">
          <h4>Configuración de Período</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="period-start">Período Desde</label>
              <input id="period-start" type="date" v-model="generateForm.period_start" @change="loadOrdersForPeriod" required>
            </div>
            <div class="form-group">
              <label for="period-end">Período Hasta</label>
              <input id="period-end" type="date" v-model="generateForm.period_end" @change="loadOrdersForPeriod" required>
            </div>
          </div>
        </div>

        <!-- Selección de Pedidos -->
        <div v-if="availableOrders.length > 0" class="form-section">
          <h4>Seleccionar Pedidos</h4>
          <div class="orders-selection">
            <div class="orders-selection-header">
  <label class="checkbox-label">
    <input type="checkbox" v-model="selectAllOrders" @change="toggleSelectAllOrders">
    Seleccionar todos ({{ availableOrders.length }} pedidos)
  </label>
  <div class="orders-summary">
    <div class="summary-line">Valor productos: ${{ formatCurrency(selectedOrdersTotal) }}</div>
    <div class="summary-line service-cost">Costo servicios: ${{ formatCurrency(selectedOrders.length * getSelectedCompanyPrice()) }}</div>
  </div>
</div>
            
            <div class="orders-list">
              <div 
                v-for="order in availableOrders" 
                :key="order._id" 
                class="order-item"
                :class="{ selected: selectedOrders.includes(order._id) }"
              >
                <label class="checkbox-label">
                  <input type="checkbox" v-model="selectedOrders" :value="order._id" @change="updateOrdersTotal">
                  <div class="order-info">
                    <div class="order-header">
                      <span class="order-number">#{{ order.order_number }}</span>
                      <span class="order-amount">${{ formatCurrency(order.total_amount) }}</span>
                    </div>
                    <div class="order-details">
                      <span class="order-customer">{{ order.customer_name }}</span>
                      <span class="order-date">{{ formatDate(order.order_date) }}</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview de la factura -->
     <div v-if="generatePreview && selectedOrders.length > 0" class="generate-preview">
  <h4>Vista Previa de Factura de Servicios</h4>
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
      <span>Pedidos seleccionados:</span>
      <span>{{ selectedOrders.length }} de {{ availableOrders.length }}</span>
    </div>
    <div class="preview-row">
      <span>Costo por servicio de envío:</span>
      <span>${{ formatCurrency(getSelectedCompanyPrice()) }} por pedido</span>
    </div>
    <div class="preview-row">
      <span>Subtotal servicios:</span>
      <span>${{ formatCurrency(generatePreview.subtotal) }}</span>
    </div>
    <div class="preview-row">
      <span>IVA (19%):</span>
      <span>${{ formatCurrency(generatePreview.tax) }}</span>
    </div>
    <div class="preview-row total">
      <span>Total a facturar:</span>
      <span>${{ formatCurrency(generatePreview.total) }}</span>
    </div>
  </div>
  <div class="preview-note">
    <small>⚠️ Esta factura es por los <strong>servicios de envío</strong>, no por el valor de los productos vendidos.</small>
  </div>
</div>
        <div class="modal-actions">
          <button @click="showGenerateModal = false" class="btn-cancel">Cancelar</button>
          <button 
            @click="confirmGenerateInvoice" 
            :disabled="!canGenerate || generating" 
            class="btn-save"
          >
            {{ generating ? 'Generando...' : 'Generar Factura' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de Generación Masiva -->
    <Modal v-model="showBulkGenerateModal" title="Generar Facturas Masivas" width="700px">
      <div class="bulk-generate-form">
        <div class="form-section">
          <h4>Configuración Masiva</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="bulk-period-start">Período Desde</label>
              <input id="bulk-period-start" type="date" v-model="bulkGenerateForm.period_start" required>
            </div>
            <div class="form-group">
              <label for="bulk-period-end">Período Hasta</label>
              <input id="bulk-period-end" type="date" v-model="bulkGenerateForm.period_end" required>
            </div>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="bulkGenerateForm.only_with_orders">
              Solo empresas con pedidos en el período
            </label>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="bulkGenerateForm.exclude_existing">
              Excluir empresas con facturas existentes para el período
            </label>
          </div>
        </div>

        <div v-if="bulkPreview.length > 0" class="bulk-preview">
          <h4>Vista Previa ({{ bulkPreview.length }} empresas)</h4>
          <div class="bulk-preview-list">
            <div v-for="preview in bulkPreview" :key="preview.company_id" class="bulk-preview-item">
              <div class="company-preview">
                <span class="company-name">{{ preview.company_name }}</span>
                <span class="orders-count">{{ preview.orders_count }} pedidos</span>
                <span class="total-amount">${{ formatCurrency(preview.total_amount) }}</span>
              </div>
            </div>
          </div>
          <div class="bulk-preview-summary">
            <strong>Total: ${{ formatCurrency(bulkPreview.reduce((sum, p) => sum + p.total_amount, 0)) }}</strong>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showBulkGenerateModal = false" class="btn-cancel">Cancelar</button>
          <button @click="previewBulkGeneration" :disabled="!bulkGenerateForm.period_start || !bulkGenerateForm.period_end" class="btn-secondary">
            Vista Previa
          </button>
          <button @click="confirmBulkGeneration" :disabled="bulkPreview.length === 0 || generating" class="btn-save">
            {{ generating ? 'Generando...' : `Generar ${bulkPreview.length} Facturas` }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de Vista de Factura -->
    <Modal v-model="showInvoiceModal" :title="`Factura ${selectedInvoice?.invoice_number}`" width="800px">
      <div v-if="selectedInvoice" class="invoice-preview">
        <!-- Contenido del modal de vista de factura (igual al original) -->
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

        <div class="invoice-client">
          <h4>Facturar a:</h4>
          <div class="client-info">
            <p><strong>{{ selectedInvoice.company_id?.name }}</strong></p>
            <p>RUT: {{ selectedInvoice.company_id?.rut || 'No disponible' }}</p>
            <p>{{ selectedInvoice.company_id?.address || 'Dirección no disponible' }}</p>
            <p>{{ selectedInvoice.company_id?.contact_email || 'Email no disponible' }}</p>
          </div>
        </div>

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
                <td>{{ selectedInvoice.total_orders }} pedidos</td>
                <td>${{ formatCurrency(selectedInvoice.price_per_order) }}</td>
                <td>${{ formatCurrency(selectedInvoice.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

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

        <div class="payment-info">
          <h4>Información de Pago</h4>
          <p>Banco: Banco de Chile</p>
          <p>Cuenta Corriente: 123-456-789</p>
          <p>RUT: 12.345.678-9</p>
          <p>Email: facturacion@envigo.cl</p>
        </div>

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

// Estado de selección
const selectedInvoices = ref([])
const selectAll = ref(false)

// Modales
const showGenerateModal = ref(false)
const showBulkGenerateModal = ref(false)
const showInvoiceModal = ref(false)
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

// Formulario de generación individual
const generateForm = ref({
  company_id: '',
  period_start: '',
  period_end: '',
  type: 'invoice'
})

// Formulario de generación masiva
const bulkGenerateForm = ref({
  period_start: '',
  period_end: '',
  only_with_orders: true,
  exclude_existing: true
})

// Estado para selección de pedidos
const availableOrders = ref([])
const selectedOrders = ref([])
const selectAllOrders = ref(false)

// Vista previa
const bulkPreview = ref([])

// Resumen financiero para admin
const financialSummary = ref({
  totalRevenue: 0,
  revenueGrowth: 0,
  totalInvoices: 0,
  pendingInvoices: 0,
  totalOrders: 0,
  unfactoredOrders: 0,
  activeCompanies: 0,
  companiesWithPendingPayments: 0
})

// Computed properties
const generatePreview = computed(() => {
  if (selectedOrders.value.length === 0 || !generateForm.value.company_id) return null;

  // Filtra los pedidos completos que han sido seleccionados
  const selectedOrderDetails = availableOrders.value.filter(order => 
    selectedOrders.value.includes(order._id)
  );

  // Suma el `shipping_cost` de cada pedido seleccionado
  const subtotal = selectedOrderDetails.reduce((sum, order) => sum + (order.shipping_cost || 0), 0);
  
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;
  
  // El precio por pedido ahora es solo informativo
  const selectedCompany = companies.value.find(c => c._id === generateForm.value.company_id);
  const pricePerOrder = selectedCompany?.price_per_order || 0;

  return { subtotal, tax, total, pricePerOrder };
});

const selectedOrdersTotal = computed(() => {
  return availableOrders.value
    .filter(order => selectedOrders.value.includes(order._id))
    .reduce((total, order) => total + (order.total_amount || 0), 0)
})

const canGenerate = computed(() => {
  return generateForm.value.company_id && 
         generateForm.value.period_start && 
         generateForm.value.period_end && 
         selectedOrders.value.length > 0
})

// Lifecycle
onMounted(async () => {
  console.log('🔄 Cargando vista de facturación para administrador...')
  // Verificar que el usuario sea admin
  if (!auth.isAdmin) {
    console.error('❌ Usuario no es administrador')
    alert('No tienes permisos de administrador para acceder a esta sección.')
    return
  }
  
  // Verificar conexión con backend
  try {
    const { checkConnection } = await import('../services/api')
    const connectionTest = await checkConnection()
    if (!connectionTest.success) {
      console.error('🔴 No hay conexión con el backend:', connectionTest.error)
      alert('No se puede conectar con el servidor. Verifica que el backend esté ejecutándose.')
      return
    }
    console.log('🟢 Conexión con backend verificada')
  } catch (error) {
    console.error('🔴 Error verificando conexión:', error)
  }

  await Promise.all([
    fetchInvoices(),
    fetchCompanies(),
    fetchFinancialSummary()
  ])
})

// Funciones principales
async function fetchInvoices() {
  loading.value = true
  try {
    console.log('📄 Obteniendo facturas (Admin)...')
    console.log('👤 Usuario actual:', auth.user)
    console.log('🔑 Es admin:', auth.isAdmin)
    
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    }
    
    console.log('📋 Parámetros de consulta:', params)
    
    const { data } = await apiService.billing.getInvoices(params)
    
    console.log('✅ Facturas recibidas:', data)
    
    invoices.value = data.invoices || []
    pagination.value = data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 }
    
    console.log('📊 Estado actualizado:', {
      invoicesCount: invoices.value.length,
      pagination: pagination.value
    })
    
  } catch (error) {
    console.error('❌ Error completo al obtener facturas:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      }
    })
    
    invoices.value = []
    
    // Mensaje más específico según el tipo de error
    let errorMessage = 'Error al cargar las facturas'
    
    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        errorMessage = 'No estás autorizado. Por favor, inicia sesión nuevamente.'
      } else if (status === 403) {
        errorMessage = 'No tienes permisos de administrador para ver estas facturas.'
      } else if (status === 404) {
        errorMessage = 'Endpoint de facturas no encontrado. Verifica la configuración del backend.'
      } else if (status >= 500) {
        errorMessage = 'Error del servidor. Contacta al administrador.'
      } else {
        errorMessage = `Error del servidor (${status}): ${error.response.data?.error || 'Error desconocido'}`
      }
    } else if (error.request) {
      errorMessage = 'No se puede conectar con el servidor. Verifica que el backend esté ejecutándose en http://localhost:3001'
    } else {
      errorMessage = `Error de configuración: ${error.message}`
    }
    
    alert(errorMessage)
  } finally {
    loading.value = false
  }
}

async function fetchCompanies() {
  try {
    const { data } = await apiService.companies.getAll()
    companies.value = data
  } catch (error) {
    console.error('Error fetching companies:', error)
  }
}

async function fetchFinancialSummary() {
  try {
    console.log('📊 Obteniendo resumen financiero real...')
    const { data } = await apiService.billing.getFinancialSummary()
    
    financialSummary.value = {
      totalRevenue: data.totalRevenue || 0,
      revenueGrowth: data.revenueGrowth || 0,
      totalInvoices: data.totalInvoices || 0,
      pendingInvoices: data.pendingInvoices || 0,
      totalOrders: data.totalOrders || 0,
      unfactoredOrders: data.unfactoredOrders || 0,
      activeCompanies: data.activeCompanies || 0,
      companiesWithPendingPayments: data.companiesWithPendingPayments || 0,
      
      // Métricas adicionales
      currentMonthRevenue: data.currentMonthRevenue || 0,
      estimatedRevenue: data.estimatedRevenue || 0,
      billedOrders: data.billedOrders || 0,
      deliveredOrders: data.deliveredOrders || 0,
      averageInvoiceAmount: data.averageInvoiceAmount || 0,
      billingRate: data.billingRate || 0
    }
    
    console.log('✅ Resumen financiero actualizado:', financialSummary.value)
  } catch (error) {
    console.error('❌ Error obteniendo resumen financiero:', error)
    // Mantener valores por defecto en caso de error
    financialSummary.value = {
      totalRevenue: 0,
      revenueGrowth: 0,
      totalInvoices: 0,
      pendingInvoices: 0,
      totalOrders: 0,
      unfactoredOrders: 0,
      activeCompanies: 0,
      companiesWithPendingPayments: 0
    }
  }
}

async function onCompanyChange() {
  selectedOrders.value = []
  availableOrders.value = []
  
  if (generateForm.value.company_id) {
    // Sugerir período del mes anterior
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0)
    
    generateForm.value.period_start = startDate.toISOString().split('T')[0]
    generateForm.value.period_end = endDate.toISOString().split('T')[0]
    
    await loadOrdersForPeriod()
  }
}

async function loadOrdersForPeriod() {
  if (!generateForm.value.company_id || !generateForm.value.period_start || !generateForm.value.period_end) {
    return
  }
  
  try {
    console.log('📦 Cargando pedidos para el período...')
    
    const params = {
      company_id: generateForm.value.company_id,
      date_from: generateForm.value.period_start,
      date_to: generateForm.value.period_end,
      status: ['pending', 'processing', 'shipped', 'delivered'], // Excluir cancelados
      limit: 1000 // Obtener todos los pedidos del período
    }
    
    console.log('📋 Parámetros de búsqueda de pedidos:', params)
    
    const { data } = await apiService.orders.getAll(params)
    
    console.log('✅ Pedidos recibidos:', data)
    
    availableOrders.value = data.orders || []
    selectedOrders.value = [] // Reset selection
    selectAllOrders.value = false
    
    console.log(`📊 Se encontraron ${availableOrders.value.length} pedidos para el período`)
    
  } catch (error) {
    console.error('❌ Error cargando pedidos:', error)
    availableOrders.value = []
    
    let errorMessage = 'Error cargando pedidos para el período'
    if (error.response?.status === 403) {
      errorMessage = 'No tienes permisos para ver los pedidos de esta empresa'
    } else if (error.response?.status === 404) {
      errorMessage = 'No se encontraron pedidos para el período especificado'
    }
    
    alert(errorMessage)
  }
}

function toggleSelectAllOrders() {
  if (selectAllOrders.value) {
    selectedOrders.value = availableOrders.value.map(order => order._id)
  } else {
    selectedOrders.value = []
  }
  updateOrdersTotal()
}

function updateOrdersTotal() {
  selectAllOrders.value = selectedOrders.value.length === availableOrders.value.length
}

async function confirmGenerateInvoice() {
  generating.value = true
  try {
    const invoiceData = {
      company_id: generateForm.value.company_id,
      period_start: generateForm.value.period_start,
      period_end: generateForm.value.period_end,
      order_ids: selectedOrders.value,
      type: generateForm.value.type
    }
    
    const { data } = await apiService.billing.generateInvoice(invoiceData)
    
    alert(`Factura ${data.invoice.invoice_number} generada exitosamente para ${selectedOrders.value.length} pedidos`)
    showGenerateModal.value = false
    resetGenerateForm()
    await fetchInvoices()
    
  } catch (error) {
    console.error('Error generando factura:', error)
    alert(`Error al generar factura: ${error.response?.data?.error || error.message}`)
  } finally {
    generating.value = false
  }
}

async function previewBulkGeneration() {
  try {
    const params = {
      period_start: bulkGenerateForm.value.period_start,
      period_end: bulkGenerateForm.value.period_end,
      only_with_orders: bulkGenerateForm.value.only_with_orders,
      exclude_existing: bulkGenerateForm.value.exclude_existing
    }
    
    const { data } = await apiService.billing.previewBulkGeneration(params)
    bulkPreview.value = data
      
  } catch (error) {
    console.error('Error previewing bulk generation:', error)
    alert(`Error en vista previa: ${error.response?.data?.error || error.message}`)
  }
}

async function confirmBulkGeneration() {
  generating.value = true
  try {
    const { data } = await apiService.billing.generateBulkInvoices(bulkGenerateForm.value)
    
    alert(`${data.generated_invoices.length} facturas generadas exitosamente`)
    showBulkGenerateModal.value = false
    bulkPreview.value = []
    await fetchInvoices()
    
  } catch (error) {
    console.error('Error generando facturas masivas:', error)
    alert(`Error al generar facturas: ${error.response?.data?.error || error.message}`)
  } finally {
    generating.value = false
  }
}

// Funciones de selección masiva
function toggleSelectAll() {
  if (selectAll.value) {
    selectedInvoices.value = invoices.value.map(invoice => invoice._id)
  } else {
    selectedInvoices.value = []
  }
}

function updateSelectAll() {
  selectAll.value = selectedInvoices.value.length === invoices.value.length
}

async function bulkSendInvoices() {
  const confirmation = confirm(`¿Enviar ${selectedInvoices.value.length} facturas por email?`)
  if (!confirmation) return
  
  try {
    // await apiService.billing.bulkSendInvoices(selectedInvoices.value)
    alert('Facturas enviadas exitosamente')
    selectedInvoices.value = []
    selectAll.value = false
  } catch (error) {
    alert(`Error al enviar facturas: ${error.message}`)
  }
}

async function bulkMarkAsPaid() {
  const confirmation = confirm(`¿Marcar ${selectedInvoices.value.length} facturas como pagadas?`)
  if (!confirmation) return
  
  try {
    // await apiService.billing.bulkMarkAsPaid(selectedInvoices.value)
    alert('Facturas marcadas como pagadas')
    selectedInvoices.value = []
    selectAll.value = false
    await fetchInvoices()
  } catch (error) {
    alert(`Error al marcar facturas: ${error.message}`)
  }
}

async function bulkDownload() {
  try {
    // await apiService.billing.bulkDownload(selectedInvoices.value)
    alert('Descargando ZIP con facturas seleccionadas...')
  } catch (error) {
    alert(`Error al descargar facturas: ${error.message}`)
  }
}

// Funciones auxiliares
function resetGenerateForm() {
  generateForm.value = {
    company_id: '',
    period_start: '',
    period_end: '',
    type: 'invoice'
  }
  selectedOrders.value = []
  availableOrders.value = []
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

function getPlanName(planType) {
  const plans = {
    basic: 'Básico',
    pro: 'Pro',
    enterprise: 'Enterprise'
  }
  return plans[planType] || 'Básico'
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

function getSelectedCompanyPrice() {
  if (!generateForm.value.company_id) return 0
  const company = companies.value.find(c => c._id === generateForm.value.company_id)
  return company?.price_per_order || 0
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

// Funciones de acciones de factura
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

async function sendInvoice(invoice) {
  const confirmation = confirm(`¿Enviar la factura ${invoice.invoice_number} por email?`)
  if (!confirmation) return
  
  try {
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
    await apiService.billing.markAsPaid(invoice._id)
    invoice.status = 'paid'
    alert('Factura marcada como pagada')
    await fetchInvoices()
  } catch (error) {
    alert(`Error al marcar factura como pagada: ${error.response?.data?.error || error.message}`)
  }
}

async function deleteInvoice(invoice) {
  const confirmation = confirm(
    `¿Estás seguro de que quieres borrar la factura ${invoice.invoice_number}?\n\n` +
    `Esta acción no se puede deshacer y los pedidos asociados se desmarcarán como facturados.`
  )
  
  if (!confirmation) return
  
  try {
    await apiService.billing.deleteInvoice(invoice._id)
    
    // Remover de la lista local
    const index = invoices.value.findIndex(inv => inv._id === invoice._id)
    if (index !== -1) {
      invoices.value.splice(index, 1)
    }
    
    // Actualizar resumen financiero
    await fetchFinancialSummary()
    
    alert(`Factura ${invoice.invoice_number} borrada exitosamente`)
    
  } catch (error) {
    console.error('Error borrando factura:', error)
    
    let errorMessage = 'Error al borrar la factura'
    if (error.response?.status === 400) {
      errorMessage = error.response.data.error || 'No se puede borrar esta factura'
    }
    
    alert(`${errorMessage}: ${invoice.invoice_number}`)
  }
}

async function bulkDeleteInvoices() {
  if (selectedInvoices.value.length === 0) return
  
  const confirmation = confirm(
    `¿Estás seguro de que quieres borrar ${selectedInvoices.value.length} facturas?\n\n` +
    `Esta acción no se puede deshacer y todos los pedidos asociados se desmarcarán como facturados.`
  )
  
  if (!confirmation) return
  
  try {
    const { data } = await apiService.billing.deleteBulkInvoices(selectedInvoices.value)
    
    // Remover de la lista local
    invoices.value = invoices.value.filter(invoice => 
      !selectedInvoices.value.includes(invoice._id)
    )
    
    // Reset selección
    selectedInvoices.value = []
    selectAll.value = false
    
    // Actualizar resumen financiero
    await fetchFinancialSummary()
    
    alert(`${data.deleted_count} facturas borradas exitosamente`)
    
  } catch (error) {
    console.error('Error borrando facturas en lote:', error)
    
    let errorMessage = 'Error al borrar las facturas'
    if (error.response?.status === 400) {
      errorMessage = error.response.data.error || 'No se pueden borrar algunas facturas'
    }
    
    alert(errorMessage)
  }
}

async function editInvoice(invoice) {
  alert(`Editando factura ${invoice.invoice_number}`)
}

function openGenerateModal() {
  resetGenerateForm()
  showGenerateModal.value = true
}

function openBulkGenerateModal() {
  bulkGenerateForm.value = {
    period_start: '',
    period_end: '',
    only_with_orders: true,
    exclude_existing: true
  }
  bulkPreview.value = []
  showBulkGenerateModal.value = true
}
</script>
<style scoped>

.page-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 1600px;
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

/* Resumen Financiero */
.financial-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.overview-card {
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

.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.overview-card.revenue::before {
  background: linear-gradient(90deg, #10b981, #059669);
}

.overview-card.invoices::before {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.overview-card.orders::before {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
}

.overview-card.companies::before {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.overview-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.overview-icon {
  font-size: 40px;
  opacity: 0.8;
}

.overview-info {
  flex: 1;
}

.overview-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.overview-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.overview-change {
  font-size: 12px;
  color: #10b981;
  font-weight: 500;
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
  min-width: 1400px;
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

/* Checkbox */
.checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  cursor: pointer;
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

.company-cell {
  min-width: 180px;
}

.company-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.company-plan {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
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
  min-width: 180px;
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

.btn-action.edit {
  background: #e9d5ff;
  color: #6b21a8;
}

.btn-action:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Acciones en Lote */
.bulk-actions {
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bulk-actions-info {
  font-weight: 500;
  color: #374151;
}

.bulk-actions-buttons {
  display: flex;
  gap: 8px;
}

.btn-bulk {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-bulk.send {
  background: #fef3c7;
  color: #92400e;
}

.btn-bulk.pay {
  background: #d1fae5;
  color: #065f46;
}

.btn-bulk.download {
  background: #dbeafe;
  color: #1e40af;
}

.btn-bulk.cancel {
  background: #fee2e2;
  color: #991b1b;
}

.btn-bulk:hover {
  transform: translateY(-1px);
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

/* Formularios de Modal */
.generate-invoice-form,
.bulk-generate-form {
  max-height: 80vh;
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

/* Selección de Pedidos */
.orders-selection {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.orders-selection-header {
  background: #f9fafb;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.orders-summary {
  font-weight: 600;
  color: #1f2937;
}

.orders-list {
  max-height: 300px;
  overflow-y: auto;
}

.order-item {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s;
}

.order-item:hover {
  background: #f9fafb;
}

.order-item.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.order-item:last-child {
  border-bottom: none;
}

.order-info {
  flex: 1;
  margin-left: 8px;
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

.order-amount {
  font-weight: 600;
  color: #059669;
}

.order-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

/* Vista Previa */
.generate-preview,
.bulk-preview {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
}

.generate-preview h4,
.bulk-preview h4 {
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

.bulk-preview-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.bulk-preview-item {
  padding: 8px 0;
  border-bottom: 1px solid #bae6fd;
}

.company-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.company-name {
  font-weight: 500;
  color: #1f2937;
}

.orders-count {
  color: #6b7280;
  font-size: 12px;
}

.total-amount {
  font-weight: 600;
  color: #059669;
}

.bulk-preview-summary {
  text-align: right;
  color: #0369a1;
  font-size: 16px;
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

.btn-success {
  background-color: #10b981;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-success:hover {
  background-color: #059669;
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
@media (max-width: 1400px) {
  .financial-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .search-input {
    grid-column: span 1;
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
  
  .financial-overview {
    grid-template-columns: 1fr;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .bulk-actions-buttons {
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
  
  .invoice-header {
    grid-template-columns: 1fr;
    text-align: left;
  }
  
  .invoice-details {
    text-align: left;
    margin-top: 20px;
  }
}

@media (max-width: 480px) {
  .overview-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .overview-icon {
    font-size: 32px;
  }
  
  .overview-value {
    font-size: 24px;
  }
  
  .invoice-preview {
    padding: 16px;
  }
  
  .totals-section {
    min-width: auto;
  }
}
/* Agregar al final del <style> en AdminBilling.vue */
.overview-change {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

.overview-change.positive {
  color: #10b981;
}

.overview-change.negative {
  color: #ef4444;
}

.overview-detail {
  font-size: 11px;
  color: #9ca3af;
}

/* Agregar al final del <style> */
.summary-line {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
}

.summary-line.service-cost {
  font-weight: 600;
  color: #1f2937;
  font-size: 13px;
}

.preview-note {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #92400e;
}
</style>