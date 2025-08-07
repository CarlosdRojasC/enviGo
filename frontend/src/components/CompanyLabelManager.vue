<!-- frontend/src/components/CompanyLabelManager.vue - TEMPLATE COMPLETO -->
<template>
  <div class="label-manager">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="title">🏷️ Etiquetas enviGo</h2>
          <p class="subtitle">Genera códigos únicos para tus paquetes</p>
        </div>
        <div class="header-right">
          <div class="stats-summary" v-if="stats">
            <div class="stat-item">
              <span class="stat-number">{{ stats.orders_with_labels }}</span>
              <span class="stat-label">Con Etiqueta</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ stats.labels_printed }}</span>
              <span class="stat-label">Impresas</span>
            </div>
          </div>
          <button @click="refreshData" class="btn btn-secondary" :disabled="loading">
            🔄 Actualizar
          </button>
        </div>
      </div>
    </div>

    <!-- Pestañas -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'pending' }]"
        @click="activeTab = 'pending'"
      >
        Sin Etiqueta ({{ pendingOrders.length }})
      </button>
      <button 
        :class="['tab', { active: activeTab === 'generated' }]"
        @click="activeTab = 'generated'"
      >
        Con Etiqueta ({{ labeledOrders.length }})
      </button>
      <button 
        :class="['tab', { active: activeTab === 'print' }]"
        @click="activeTab = 'print'"
      >
        Imprimir Masivo
      </button>
    </div>

    <!-- Contenido: Pedidos sin etiqueta -->
    <div v-if="activeTab === 'pending'" class="tab-content">
      <div class="section-header">
        <h3>Pedidos sin Código enviGo</h3>
        <div class="bulk-actions" v-if="selectedPendingIds.length > 0">
          <button 
            @click="generateBulkCodes" 
            :disabled="loading"
            class="btn btn-primary"
          >
            {{ loading ? '⏳ Generando...' : `🏷️ Generar ${selectedPendingIds.length} Códigos` }}
          </button>
        </div>
      </div>

      <div v-if="pendingOrders.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <h4>¡Excelente!</h4>
        <p>Todos tus pedidos ya tienen códigos enviGo generados</p>
      </div>

      <div v-else class="orders-grid">
        <div class="grid-header">
          <label class="checkbox-container">
            <input 
              type="checkbox" 
              :checked="allPendingSelected"
              @change="toggleSelectAllPending"
            >
            <span class="checkmark"></span>
            Seleccionar todos
          </label>
        </div>

        <div 
          v-for="order in pendingOrders" 
          :key="order._id"
          class="order-card"
          :class="{ selected: selectedPendingIds.includes(order._id) }"
        >
          <label class="order-checkbox">
            <input 
              type="checkbox" 
              :value="order._id"
              v-model="selectedPendingIds"
            >
            <span class="checkmark"></span>
          </label>

          <div class="order-info">
            <div class="order-header">
              <span class="order-number">#{{ order.order_number }}</span>
              <span class="order-status" :class="order.status">{{ getStatusText(order.status) }}</span>
            </div>
            <div class="order-details">
              <div class="detail-line">
                <strong>Cliente:</strong> {{ order.customer_name }}
              </div>
              <div class="detail-line">
                <strong>Comuna:</strong> {{ order.shipping_commune }}
              </div>
              <div class="detail-line">
                <strong>Fecha:</strong> {{ formatDate(order.order_date) }}
              </div>
            </div>
          </div>

          <div class="order-actions">
            <button 
              @click="generateSingleCode(order._id)" 
              :disabled="loading"
              class="btn btn-sm btn-primary"
            >
              🏷️ Generar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenido: Pedidos con etiqueta -->
    <div v-if="activeTab === 'generated'" class="tab-content">
      <div class="section-header">
        <h3>Pedidos con Código enviGo</h3>
        <div class="search-bar">
          <input 
            type="text" 
            v-model="searchCode" 
            placeholder="Buscar por código o cliente..."
            class="search-input"
          >
        </div>
      </div>

      <div v-if="filteredLabeledOrders.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h4>No se encontraron pedidos</h4>
        <p>Genera códigos enviGo para tus pedidos pendientes</p>
      </div>

      <div v-else class="labeled-orders-grid">
        <div 
          v-for="order in filteredLabeledOrders" 
          :key="order._id"
          class="labeled-order-card"
        >
          <div class="card-header">
            <div class="envigo-code">{{ order.envigo_label?.unique_code }}</div>
            <div class="print-status" v-if="order.envigo_label?.printed_count > 0">
              🖨️ {{ order.envigo_label.printed_count }}x
            </div>
          </div>

          <div class="card-content">
            <div class="order-info">
              <div class="info-row">
                <span class="label">Pedido:</span>
                <span class="value">#{{ order.order_number }}</span>
              </div>
              <div class="info-row">
                <span class="label">Cliente:</span>
                <span class="value">{{ order.customer_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">Teléfono:</span>
                <span class="value">{{ order.customer_phone || 'No disponible' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Dirección:</span>
                <span class="value">{{ order.shipping_address }}</span>
              </div>
              <div class="info-row">
                <span class="label">Comuna:</span>
                <span class="value">{{ order.shipping_commune }}</span>
              </div>
            </div>

            <div class="card-actions">
              <button 
                @click="printSingleLabel(order)" 
                class="btn btn-sm btn-secondary"
              >
                🖨️ Imprimir
              </button>
              <button 
                @click="copyCode(order.envigo_label.unique_code)" 
                class="btn btn-sm btn-outline"
              >
                📋 Copiar Código
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenido: Imprimir masivo -->
    <div v-if="activeTab === 'print'" class="tab-content">
      <div class="print-section">
        <h3>Impresión Masiva de Etiquetas</h3>
        <p>Selecciona los pedidos que deseas imprimir en lote:</p>

        <div class="filters">
          <div class="filter-group">
            <label>Estado:</label>
            <select v-model="printFilters.status">
              <option value="">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="ready_for_pickup">Listos para Recoger</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Comuna:</label>
            <select v-model="printFilters.commune">
              <option value="">Todas</option>
              <option v-for="commune in availableCommunes" :key="commune" :value="commune">
                {{ commune }}
              </option>
            </select>
          </div>
          <button @click="applyPrintFilters" class="btn btn-secondary">
            🔍 Filtrar
          </button>
        </div>

        <div v-if="printableOrders.length > 0" class="printable-orders">
          <div class="selection-header">
            <label class="checkbox-container">
              <input 
                type="checkbox" 
                :checked="allPrintableSelected"
                @change="toggleSelectAllPrintable"
              >
              <span class="checkmark"></span>
              Seleccionar todos ({{ selectedPrintIds.length }}/{{ printableOrders.length }})
            </label>
            
            <button 
              v-if="selectedPrintIds.length > 0"
              @click="printBulkLabels" 
              class="btn btn-primary"
            >
              🖨️ Imprimir {{ selectedPrintIds.length }} Etiquetas
            </button>
          </div>

          <div class="compact-orders-grid">
            <div 
              v-for="order in printableOrders" 
              :key="order._id"
              class="compact-order-item"
              :class="{ selected: selectedPrintIds.includes(order._id) }"
            >
              <label class="compact-checkbox">
                <input 
                  type="checkbox" 
                  :value="order._id"
                  v-model="selectedPrintIds"
                >
                <span class="checkmark"></span>
              </label>
              
              <div class="compact-info">
                <div class="compact-header">
                  <span class="compact-code">{{ order.envigo_label?.unique_code }}</span>
                  <span class="compact-number">#{{ order.order_number }}</span>
                </div>
                <div class="compact-details">
                  {{ order.customer_name }} • {{ order.shipping_commune }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import apiService from '../services/api'

const toast = useToast()

// ==================== ESTADO REACTIVO ====================
const loading = ref(false)
const loadingMessage = ref('')
const activeTab = ref('pending')
const allOrders = ref([])
const stats = ref(null)

const selectedPendingIds = ref([])
const selectedPrintIds = ref([])
const searchCode = ref('')

const printFilters = ref({
  status: '',
  commune: ''
})
const printableOrders = ref([])

// ==================== COMPUTED PROPERTIES ====================
const pendingOrders = computed(() => {
  return allOrders.value.filter(order => !order.envigo_label?.unique_code)
})

const labeledOrders = computed(() => {
  return allOrders.value.filter(order => order.envigo_label?.unique_code)
})

const filteredLabeledOrders = computed(() => {
  if (!searchCode.value) return labeledOrders.value
  
  const search = searchCode.value.toLowerCase()
  return labeledOrders.value.filter(order => 
    order.envigo_label?.unique_code?.toLowerCase().includes(search) ||
    order.customer_name?.toLowerCase().includes(search) ||
    order.order_number?.toLowerCase().includes(search)
  )
})

const availableCommunes = computed(() => {
  const communes = new Set()
  labeledOrders.value.forEach(order => {
    if (order.shipping_commune) {
      communes.add(order.shipping_commune)
    }
  })
  return Array.from(communes).sort()
})

const allPendingSelected = computed(() => {
  return pendingOrders.value.length > 0 && 
         selectedPendingIds.value.length === pendingOrders.value.length
})

const allPrintableSelected = computed(() => {
  return printableOrders.value.length > 0 && 
         selectedPrintIds.value.length === printableOrders.value.length
})

// ==================== LIFECYCLE & DATA LOADING ====================
onMounted(() => {
  loadData()
})

watch(activeTab, () => {
  if (activeTab.value === 'print') {
    applyPrintFilters()
  }
})

async function loadData() {
  loading.value = true
  loadingMessage.value = 'Cargando pedidos...'
  try {
    await Promise.all([
      loadOrders(),
      loadStats()
    ])
  } finally {
    loading.value = false
  }
}

async function loadOrders() {
  try {
    const response = await apiService.orders.getAll({
      status: ['pending', 'ready_for_pickup', 'out_for_delivery'],
      limit: 500
    })
    allOrders.value = response.data.orders || []
  } catch (error) {
    toast.error('Error cargando pedidos')
  }
}

async function loadStats() {
  try {
    const response = await apiService.labels.getStats()
    stats.value = response.data.stats
  } catch (error) {
    console.error('Error cargando estadísticas:', error)
  }
}

function refreshData() {
  loadData()
}

// ==================== GENERACIÓN DE CÓDIGOS (SIN CAMBIOS) ====================
async function generateSingleCode(orderId) {
  loading.value = true
  loadingMessage.value = 'Generando código enviGo...'
  try {
    const response = await apiService.labels.generateCode(orderId)
    const orderIndex = allOrders.value.findIndex(o => o._id === orderId)
    if (orderIndex !== -1) {
      allOrders.value[orderIndex].envigo_label = {
        unique_code: response.data.label.unique_code,
        generated_at: response.data.label.generated_at,
        printed_count: 0
      }
    }
    toast.success(`Código generado: ${response.data.label.unique_code}`)
    await loadStats()
  } catch (error) {
    toast.error('Error generando código: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

async function generateBulkCodes() {
  if (selectedPendingIds.value.length === 0) return toast.warning('Selecciona al menos un pedido')
  loading.value = true
  loadingMessage.value = `Generando ${selectedPendingIds.value.length} códigos...`
  try {
    const response = await apiService.labels.generateBulk(selectedPendingIds.value)
    response.data.labels.forEach(label => {
      const orderIndex = allOrders.value.findIndex(o => o._id === label.order_id)
      if (orderIndex !== -1) {
        allOrders.value[orderIndex].envigo_label = {
          unique_code: label.unique_code,
          generated_at: new Date(),
          printed_count: 0
        }
      }
    })
    selectedPendingIds.value = []
    toast.success(`${response.data.total} códigos generados`)
    await loadStats()
  } catch (error) {
    toast.error('Error generando códigos: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

// ==================== MÉTODOS DE IMPRESIÓN (NUEVA LÓGICA) ====================
async function printSingleLabel(order) {
  if (!order.envigo_label?.unique_code) {
    toast.error('Este pedido no tiene una etiqueta generada.');
    return;
  }
  loading.value = true;
  loadingMessage.value = 'Generando etiqueta PDF...';
  try {
    // Llama al backend para obtener el PDF
    const response = await apiService.labels.printLabelPDF(order._id);
    // Crea una URL para el archivo recibido
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    // Abre el PDF en una nueva pestaña
    window.open(pdfUrl, '_blank');
    
    // Libera la memoria
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);

    await markAsPrinted(order._id);
    toast.success(`Etiqueta ${order.envigo_label.unique_code} lista para imprimir.`);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    toast.error('No se pudo generar el PDF. Revisa la consola.');
  } finally {
    loading.value = false;
  }
}

async function printBulkLabels() {
    if (selectedPrintIds.value.length === 0) {
        toast.warning('Selecciona al menos una etiqueta para imprimir.');
        return;
    }
    toast.info(`Iniciando impresión de ${selectedPrintIds.value.length} etiquetas...`);
    
    // Para la impresión masiva, simplemente llamamos a la función individual
    // una por una con una pequeña pausa para no bloquear el navegador.
    for (const orderId of selectedPrintIds.value) {
        const order = allOrders.value.find(o => o._id === orderId);
        if (order) {
            await printSingleLabel(order);
            await new Promise(resolve => setTimeout(resolve, 300)); // Pausa de 300ms
        }
    }
    selectedPrintIds.value = [];
}

// **IMPORTANTE**: Ya no necesitas la función `generateLabelHTML`, la puedes borrar.

// ==================== MÉTODOS DE SELECCIÓN Y FILTROS ====================
function toggleSelectAllPending() {
  if (allPendingSelected.value) {
    selectedPendingIds.value = []
  } else {
    selectedPendingIds.value = pendingOrders.value.map(o => o._id)
  }
}

function toggleSelectAllPrintable() {
  if (allPrintableSelected.value) {
    selectedPrintIds.value = []
  } else {
    selectedPrintIds.value = printableOrders.value.map(o => o._id)
  }
}

function applyPrintFilters() {
  let filtered = labeledOrders.value
  if (printFilters.value.status) {
    filtered = filtered.filter(order => order.status === printFilters.value.status)
  }
  if (printFilters.value.commune) {
    filtered = filtered.filter(order => order.shipping_commune === printFilters.value.commune)
  }
  printableOrders.value = filtered
  selectedPrintIds.value = []
}

// ==================== MÉTODOS AUXILIARES ====================
async function markAsPrinted(orderId) {
  try {
    await apiService.labels.markPrinted(orderId)
    const orderIndex = allOrders.value.findIndex(o => o._id === orderId)
    if (orderIndex !== -1 && allOrders.value[orderIndex].envigo_label) {
      if (!allOrders.value[orderIndex].envigo_label.printed_count) {
        allOrders.value[orderIndex].envigo_label.printed_count = 0
      }
      allOrders.value[orderIndex].envigo_label.printed_count++
      allOrders.value[orderIndex].envigo_label.last_printed_at = new Date()
    }
    await loadStats()
  } catch (error) {
    console.error('Error marcando como impresa:', error)
  }
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    toast.success(`Código copiado: ${code}`)
  }).catch(() => {
    toast.error('Error copiando código')
  })
}

// ==================== FUNCIONES UTILITARIAS ====================
function getStatusText(status) {
  const statuses = {
    pending: 'Pendiente',
    ready_for_pickup: 'Listo para Recoger',
    out_for_delivery: 'En Camino',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    warehouse_received: 'En Bodega',
    shipped: 'Enviado'
  }
  return statuses[status] || status
}

function formatDate(dateStr) {
  if (!dateStr) return 'Sin fecha'
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    return 'Fecha inválida'
  }
}
</script>

<style scoped>
/* ==================== LAYOUT PRINCIPAL ==================== */
.label-manager {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;
}

/* ==================== HEADER ==================== */
.header {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-left {
  flex: 1;
}

.title {
  font-size: 1.8rem;
  color: #1f2937;
  margin-bottom: 4px;
  font-weight: 700;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* ==================== ESTADÍSTICAS HEADER ==================== */
.stats-summary {
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
}

/* ==================== NAVEGACIÓN POR PESTAÑAS ==================== */
.tabs {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tab {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  border-radius: 8px;
  transition: all 0.3s ease;
  text-align: center;
}

.tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

/* ==================== CONTENIDO DE PESTAÑAS ==================== */
.tab-content {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-height: 500px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f1f5f9;
}

.section-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #1f2937;
  font-weight: 600;
}

/* ==================== BÚSQUEDA ==================== */
.search-bar {
  flex: 1;
  max-width: 300px;
  margin-left: 20px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* ==================== ESTADOS VACÍOS ==================== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.7;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}
/* CSS PARTE 2 - BOTONES Y ACCIONES */

/* ==================== SISTEMA DE BOTONES ==================== */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  line-height: 1.4;
}

.btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

/* Variantes de botones */
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-outline:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

/* Tamaños de botones */
.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 4px;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
}

/* Estados de botones */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn:disabled:hover {
  background: initial;
  border-color: initial;
}

/* ==================== ACCIONES MASIVAS ==================== */
.bulk-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bulk-actions .btn {
  white-space: nowrap;
}

/* ==================== ACCIONES DE PEDIDOS ==================== */
.order-actions {
  margin-left: 16px;
  display: flex;
  gap: 8px;
}

.card-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-actions .btn {
  flex: 1;
  min-width: 0;
}

/* ==================== LOADING Y ESTADOS ==================== */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: white;
  backdrop-filter: blur(2px);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

/* ==================== INDICADORES DE ESTADO ==================== */
.print-status {
  font-size: 0.9rem;
  opacity: 0.9;
  background: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.order-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.order-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.order-status.ready_for_pickup {
  background: #dbeafe;
  color: #1e40af;
}

.order-status.out_for_delivery {
  background: #fde68a;
  color: #d97706;
}

.order-status.delivered {
  background: #d1fae5;
  color: #065f46;
}

.order-status.cancelled {
  background: #fee2e2;
  color: #dc2626;
}
/* CSS PARTE 3 - GRIDS Y TARJETAS DE PEDIDOS */

/* ==================== GRID DE PEDIDOS PENDIENTES ==================== */
.orders-grid {
  display: grid;
  gap: 16px;
}

.grid-header {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
}

.order-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: white;
}

.order-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.order-card.selected {
  border-color: #667eea;
  background: #f0f4ff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.order-info {
  flex: 1;
  margin-left: 16px;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.order-number {
  font-weight: bold;
  color: #1f2937;
  font-size: 1rem;
}

.order-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 4px;
  font-size: 14px;
  color: #4b5563;
}

.detail-line {
  display: flex;
  gap: 6px;
}

.detail-line strong {
  color: #374151;
  font-weight: 600;
}

/* ==================== GRID DE ETIQUETAS GENERADAS ==================== */
.labeled-orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.labeled-order-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  transition: all 0.3s ease;
}

.labeled-order-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.envigo-code {
  font-size: 1.2rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.card-content {
  padding: 16px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  align-items: flex-start;
  gap: 8px;
}

.info-row .label {
  font-weight: 500;
  color: #6b7280;
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
}

.info-row .value {
  color: #1f2937;
  flex: 1;
  font-size: 14px;
  word-break: break-word;
}

/* ==================== GRID COMPACTO PARA IMPRESIÓN ==================== */
.compact-orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.compact-order-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  transition: all 0.3s ease;
}

.compact-order-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.compact-order-item.selected {
  border-color: #667eea;
  background: #f0f4ff;
}

.compact-info {
  flex: 1;
  margin-left: 12px;
}

.compact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.compact-code {
  font-weight: bold;
  color: #667eea;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.compact-number {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.compact-details {
  font-size: 13px;
  color: #4b5563;
}

/* ==================== HEADERS DE SECCIÓN ==================== */
.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
/* CSS PARTE 4 - CHECKBOXES, FILTROS Y ELEMENTOS ESPECIALES */

/* ==================== SISTEMA DE CHECKBOXES ==================== */
.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
  user-select: none;
}

.order-checkbox,
.compact-checkbox {
  margin-right: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.compact-checkbox {
  margin-right: 12px;
}

/* Checkbox personalizado */
input[type="checkbox"] {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  margin-right: 8px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

input[type="checkbox"]:hover {
  border-color: #667eea;
}

input[type="checkbox"]:checked {
  background: #667eea;
  border-color: #667eea;
}

input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  color: white;
  font-size: 12px;
  font-weight: bold;
  top: -1px;
  left: 2px;
  line-height: 1;
}

input[type="checkbox"]:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.checkmark {
  /* Elemento visual adicional si se necesita */
  display: none;
}

/* ==================== SISTEMA DE FILTROS ==================== */
.filters {
  display: flex;
  gap: 16px;
  align-items: end;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 120px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  transition: border-color 0.3s ease;
}

.filter-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* ==================== SECCIÓN DE IMPRESIÓN ==================== */
.print-section {
  padding: 0;
}

.print-section h3 {
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  color: #1f2937;
  font-weight: 600;
}

.print-section > p {
  margin: 0 0 20px 0;
  color: #6b7280;
  font-size: 1rem;
}

.printable-orders {
  margin-top: 20px;
}

/* ==================== ELEMENTOS DESTACADOS ==================== */
.envigo-code {
  position: relative;
}

.envigo-code::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -2px;
  right: -4px;
  bottom: -2px;
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
  z-index: -1;
}

/* Efecto de hover para códigos */
.compact-code:hover,
.envigo-code:hover {
  text-shadow: 0 0 8px rgba(255,255,255,0.8);
}

/* ==================== BADGES Y ETIQUETAS ==================== */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-info {
  background: #dbeafe;
  color: #1e40af;
}

.badge-danger {
  background: #fee2e2;
  color: #dc2626;
}

/* ==================== SEPARADORES Y DIVIDERS ==================== */
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
  margin: 20px 0;
}

.divider-vertical {
  width: 1px;
  background: linear-gradient(180deg, transparent, #e5e7eb, transparent);
  margin: 0 20px;
}

/* ==================== ANIMACIONES ESPECIALES ==================== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.order-card,
.labeled-order-card,
.compact-order-item {
  animation: fadeInUp 0.3s ease-out;
}

/* Delay progresivo para animaciones */
.order-card:nth-child(1) { animation-delay: 0.05s; }
.order-card:nth-child(2) { animation-delay: 0.1s; }
.order-card:nth-child(3) { animation-delay: 0.15s; }
.order-card:nth-child(4) { animation-delay: 0.2s; }
.order-card:nth-child(5) { animation-delay: 0.25s; }
/* CSS PARTE 5 - RESPONSIVE Y MEDIA QUERIES FINALES */

/* ==================== RESPONSIVE DESIGN ==================== */

/* Tablet y pantallas medianas */
@media (max-width: 1024px) {
  .label-manager {
    padding: 16px;
  }
  
  .labeled-orders-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  
  .compact-orders-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .stats-summary {
    flex: 1;
  }
}

/* Móviles y pantallas pequeñas */
@media (max-width: 768px) {
  .label-manager {
    padding: 12px;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
  
  .tabs {
    flex-direction: column;
    padding: 8px;
  }
  
  .tab {
    width: 100%;
    text-align: center;
    margin-bottom: 4px;
  }
  
  .tab:last-child {
    margin-bottom: 0;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .search-bar {
    max-width: none;
    margin-left: 0;
    width: 100%;
  }
  
  .order-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .order-checkbox {
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .order-info {
    margin-left: 0;
    width: 100%;
  }
  
  .order-details {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .order-actions {
    margin-left: 0;
    width: 100%;
  }
  
  .order-actions .btn {
    flex: 1;
  }
  
  .labeled-orders-grid,
  .compact-orders-grid {
    grid-template-columns: 1fr;
  }
  
  .filters {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .selection-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .selection-header .btn {
    width: 100%;
  }
  
  .card-actions {
    flex-direction: column;
  }
  
  .card-actions .btn {
    width: 100%;
  }
  
  .bulk-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .bulk-actions .btn {
    width: 100%;
  }
}

/* Pantallas muy pequeñas */
@media (max-width: 480px) {
  .label-manager {
    padding: 8px;
  }
  
  .header {
    padding: 16px;
  }
  
  .tab-content {
    padding: 16px;
  }
  
  .title {
    font-size: 1.3rem;
  }
  
  .stats-summary {
    gap: 16px;
  }
  
  .stat-number {
    font-size: 1.3rem;
  }
  
  .stat-label {
    font-size: 0.8rem;
  }
  
  .order-card {
    padding: 12px;
  }
  
  .labeled-order-card .card-content {
    padding: 12px;
  }
  
  .compact-order-item {
    padding: 10px;
  }
  
  .envigo-code {
    font-size: 1rem;
  }
  
  .info-row .label {
    width: 70px;
    font-size: 12px;
  }
  
  .info-row .value {
    font-size: 13px;
  }
}

/* ==================== MODO IMPRESIÓN ==================== */
@media print {
  .label-manager {
    background: white;
    padding: 0;
  }
  
  .header,
  .tabs,
  .section-header,
  .bulk-actions,
  .order-actions,
  .card-actions,
  .filters,
  .selection-header,
  .loading-overlay {
    display: none !important;
  }
  
  .tab-content {
    box-shadow: none;
    border: none;
    padding: 0;
  }
  
  .order-card,
  .labeled-order-card {
    break-inside: avoid;
    box-shadow: none;
    margin-bottom: 20px;
  }
}

/* ==================== MODO OSCURO (OPCIONAL) ==================== */
@media (prefers-color-scheme: dark) {
  .label-manager {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .header,
  .tab-content,
  .order-card,
  .labeled-order-card {
    background: #374151;
    border-color: #4b5563;
  }
  
  .title {
    color: #f9fafb;
  }
  
  .subtitle {
    color: #d1d5db;
  }
  
  .tab {
    color: #d1d5db;
  }
  
  .tab:hover {
    background: #4b5563;
    color: #f9fafb;
  }
  
  .search-input,
  .filter-group select {
    background: #4b5563;
    border-color: #6b7280;
    color: #f9fafb;
  }
  
  .order-number,
  .info-row .value {
    color: #f9fafb;
  }
  
  .info-row .label {
    color: #d1d5db;
  }
}

/* ==================== ACCESIBILIDAD ==================== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .spinner {
    animation: none;
  }
}

/* Focus visible para mejor accesibilidad */
.btn:focus-visible,
input[type="checkbox"]:focus-visible,
.search-input:focus-visible,
select:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

/* ==================== UTILIDADES FINALES ==================== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-break {
  word-wrap: break-word;
  word-break: break-word;
}

/* Fin de estilos */
</style>