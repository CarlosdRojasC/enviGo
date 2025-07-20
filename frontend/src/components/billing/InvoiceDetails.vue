<template>
  <div class="invoice-details">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando detalles de la factura...</p>
    </div>

    <div v-else-if="invoiceData" class="details-content">
      <!-- Header de la factura -->
      <div class="invoice-header">
        <div class="header-main">
          <h3 class="invoice-title">
            <span class="invoice-icon">📄</span>
            {{ invoiceData.invoice_number }}
          </h3>
          <div class="status-section">
            <span class="status-badge" :class="invoiceData.status">
              {{ getStatusIcon(invoiceData.status) }} {{ getStatusText(invoiceData.status) }}
            </span>
            <div class="status-actions">
              <button 
                v-if="invoiceData.status === 'draft'" 
                @click="sendInvoice"
                class="status-btn send"
                :disabled="actionLoading"
              >
                📤 Enviar
              </button>
              <button 
                v-if="['sent', 'overdue'].includes(invoiceData.status)" 
                @click="markAsPaid"
                class="status-btn paid"
                :disabled="actionLoading"
              >
                ✅ Marcar Pagada
              </button>
            </div>
          </div>
        </div>
        
        <div class="header-actions">
          <button @click="downloadPDF" class="action-btn secondary" :disabled="actionLoading">
            <span class="btn-icon">📥</span>
            Descargar PDF
          </button>
          <button @click="duplicateInvoice" class="action-btn secondary" :disabled="actionLoading">
            <span class="btn-icon">📋</span>
            Duplicar
          </button>
          <button @click="toggleEditMode" class="action-btn primary">
            <span class="btn-icon">{{ editMode ? '👁️' : '✏️' }}</span>
            {{ editMode ? 'Ver' : 'Editar' }}
          </button>
        </div>
      </div>

      <!-- Información general -->
      <div class="info-section">
        <div class="info-grid">
          <div class="info-group">
            <h4 class="group-title">
              <span class="group-icon">🏢</span>
              Información de la Empresa
            </h4>
            <div class="info-items">
              <div class="info-item">
                <span class="info-label">Empresa:</span>
                <span class="info-value">{{ invoiceData.company_id?.name || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">{{ invoiceData.company_id?.email || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">RUT:</span>
                <span class="info-value">{{ invoiceData.company_id?.rut || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Precio por pedido:</span>
                <span class="info-value">${{ formatCurrency(invoiceData.company_id?.price_per_order || 0) }}</span>
              </div>
            </div>
          </div>

          <div class="info-group">
            <h4 class="group-title">
              <span class="group-icon">📅</span>
              Fechas
            </h4>
            <div class="info-items">
              <div class="info-item">
                <span class="info-label">Período:</span>
                <span class="info-value">{{ formatPeriod() }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fecha de emisión:</span>
                <span class="info-value">{{ formatDate(invoiceData.created_at) }}</span>
              </div>
              <div class="info-item" v-if="invoiceData.sent_at">
                <span class="info-label">Fecha de envío:</span>
                <span class="info-value">{{ formatDate(invoiceData.sent_at) }}</span>
              </div>
              <div class="info-item" v-if="invoiceData.due_date">
                <span class="info-label">Fecha de vencimiento:</span>
                <span class="info-value" :class="{ urgent: isOverdue() }">
                  {{ formatDate(invoiceData.due_date) }}
                  <span v-if="isOverdue()" class="overdue-indicator">
                    (Vencida hace {{ getDaysOverdue() }} días)
                  </span>
                </span>
              </div>
              <div class="info-item" v-if="invoiceData.paid_date">
                <span class="info-label">Fecha de pago:</span>
                <span class="info-value">{{ formatDate(invoiceData.paid_date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen financiero -->
      <div class="financial-section">
        <h4 class="section-title">
          <span class="section-icon">💰</span>
          Resumen Financiero
        </h4>
        
        <div class="financial-summary">
          <div class="summary-stats">
            <div class="stat-item">
              <div class="stat-icon">📦</div>
              <div class="stat-content">
                <div class="stat-value">{{ invoiceData.total_orders || 0 }}</div>
                <div class="stat-label">Pedidos Facturados</div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">💵</div>
              <div class="stat-content">
                <div class="stat-value">${{ formatCurrency(invoiceData.subtotal || 0) }}</div>
                <div class="stat-label">Subtotal</div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">🧾</div>
              <div class="stat-content">
                <div class="stat-value">${{ formatCurrency(invoiceData.tax_amount || 0) }}</div>
                <div class="stat-label">IVA (19%)</div>
              </div>
            </div>
            
            <div class="stat-item highlight">
              <div class="stat-icon">💎</div>
              <div class="stat-content">
                <div class="stat-value">${{ formatCurrency(invoiceData.total_amount || 0) }}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de pedidos -->
      <div class="orders-section">
        <div class="section-header">
          <h4 class="section-title">
            <span class="section-icon">📦</span>
            Pedidos Incluidos
            <span class="orders-count">({{ ordersList.length }})</span>
          </h4>
          
          <div class="orders-filters">
            <input 
              v-model="ordersSearch" 
              type="text" 
              placeholder="Buscar pedido..."
              class="search-input"
            />
            <select v-model="ordersStatusFilter" class="filter-select">
              <option value="">Todos los estados</option>
              <option value="delivered">Entregados</option>
              <option value="failed">Fallidos</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>

        <div class="orders-table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Costo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingOrders">
                <td colspan="7" class="loading-row">
                  <div class="loading-spinner small"></div>
                  Cargando pedidos...
                </td>
              </tr>
              <tr v-else-if="filteredOrders.length === 0">
                <td colspan="7" class="empty-row">
                  No hay pedidos {{ ordersSearch || ordersStatusFilter ? 'que coincidan con los filtros' : 'en esta factura' }}
                </td>
              </tr>
              <tr v-for="order in paginatedOrders" :key="order._id" class="order-row">
                <td class="order-number">
                  <span class="number-text">#{{ order.order_number }}</span>
                </td>
                <td class="customer-info">
                  <div class="customer-name">{{ order.customer_name || 'N/A' }}</div>
                  <div class="customer-phone">{{ order.customer_phone || '' }}</div>
                </td>
                <td class="address-info">
                  <div class="address-line">{{ order.shipping_address?.street || 'N/A' }}</div>
                  <div class="address-commune">{{ order.shipping_address?.commune || '' }}</div>
                </td>
                <td class="order-status">
                  <span class="status-badge" :class="order.status">
                    {{ getOrderStatusText(order.status) }}
                  </span>
                </td>
                <td class="order-date">
                  <div class="date-main">{{ formatDate(order.created_at) }}</div>
                  <div class="date-relative">{{ getRelativeDate(order.created_at) }}</div>
                </td>
                <td class="order-cost">
                  <span class="cost-amount">${{ formatCurrency(order.shipping_cost || 0) }}</span>
                </td>
                <td class="order-actions">
                  <button @click="viewOrderDetails(order)" class="order-action-btn view">
                    👁️
                  </button>
                  <button @click="trackOrder(order)" class="order-action-btn track">
                    📍
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación de pedidos -->
        <div class="orders-pagination" v-if="totalOrderPages > 1">
          <button 
            @click="orderPage--" 
            :disabled="orderPage === 1"
            class="pagination-btn"
          >
            ← Anterior
          </button>
          
          <div class="pagination-info">
            Página {{ orderPage }} de {{ totalOrderPages }}
            ({{ filteredOrders.length }} pedidos)
          </div>
          
          <button 
            @click="orderPage++" 
            :disabled="orderPage === totalOrderPages"
            class="pagination-btn"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <!-- Notas y observaciones -->
      <div class="notes-section" v-if="editMode || invoiceData.notes">
        <h4 class="section-title">
          <span class="section-icon">📝</span>
          Notas
        </h4>
        
        <div v-if="editMode" class="notes-edit">
          <textarea 
            v-model="editableNotes" 
            class="notes-textarea"
            rows="4"
            placeholder="Agregar notas internas o comentarios sobre esta factura..."
          ></textarea>
          <div class="notes-actions">
            <button @click="saveNotes" class="save-notes-btn" :disabled="actionLoading">
              <span class="btn-icon">💾</span>
              Guardar Notas
            </button>
          </div>
        </div>
        
        <div v-else-if="invoiceData.notes" class="notes-display">
          <p class="notes-text">{{ invoiceData.notes }}</p>
        </div>
        
        <div v-else class="notes-empty">
          <p class="empty-text">No hay notas para esta factura</p>
        </div>
      </div>

      <!-- Historial de actividad -->
      <div class="activity-section">
        <h4 class="section-title">
          <span class="section-icon">📋</span>
          Historial de Actividad
        </h4>
        
        <div class="activity-timeline">
          <div 
            v-for="activity in activityLog" 
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon" :class="activity.type">
              {{ getActivityIcon(activity.type) }}
            </div>
            <div class="activity-content">
              <div class="activity-header">
                <span class="activity-title">{{ activity.title }}</span>
                <span class="activity-time">{{ formatDateTime(activity.timestamp) }}</span>
              </div>
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-user" v-if="activity.user">
                Por: {{ activity.user }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="cancelAction">
      <div class="confirm-modal" @click.stop>
        <div class="confirm-header">
          <h4 class="confirm-title">{{ confirmAction.title }}</h4>
        </div>
        <div class="confirm-body">
          <p class="confirm-message">{{ confirmAction.message }}</p>
        </div>
        <div class="confirm-actions">
          <button @click="cancelAction" class="btn-cancel">
            Cancelar
          </button>
          <button 
            @click="executeAction" 
            class="btn-confirm"
            :class="confirmAction.type"
            :disabled="actionLoading"
          >
            {{ actionLoading ? 'Procesando...' : confirmAction.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../../services/api'

// Props y emits
const props = defineProps({
  invoice: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

// Estado
const toast = useToast()
const loading = ref(true)
const actionLoading = ref(false)
const loadingOrders = ref(false)
const invoiceData = ref(null)
const ordersList = ref([])
const editMode = ref(false)
const editableNotes = ref('')

// Filtros y paginación de pedidos
const ordersSearch = ref('')
const ordersStatusFilter = ref('')
const orderPage = ref(1)
const ordersPerPage = ref(10)

// Modal de confirmación
const showConfirmModal = ref(false)
const confirmAction = ref({})

// Computed
const filteredOrders = computed(() => {
  let filtered = ordersList.value

  if (ordersSearch.value) {
    const search = ordersSearch.value.toLowerCase()
    filtered = filtered.filter(order =>
      order.order_number?.toLowerCase().includes(search) ||
      order.customer_name?.toLowerCase().includes(search) ||
      order.shipping_address?.street?.toLowerCase().includes(search)
    )
  }

  if (ordersStatusFilter.value) {
    filtered = filtered.filter(order => order.status === ordersStatusFilter.value)
  }

  return filtered
})

const paginatedOrders = computed(() => {
  const start = (orderPage.value - 1) * ordersPerPage.value
  return filteredOrders.value.slice(start, start + ordersPerPage.value)
})

const totalOrderPages = computed(() => 
  Math.ceil(filteredOrders.value.length / ordersPerPage.value)
)

const activityLog = computed(() => {
  if (!invoiceData.value) return []
  
  const activities = []
  
  // Actividad de creación
  activities.push({
    id: 'created',
    type: 'created',
    title: 'Factura creada',
    description: 'La factura fue generada automáticamente',
    timestamp: invoiceData.value.created_at,
    user: 'Sistema'
  })
  
  // Actividad de envío
  if (invoiceData.value.sent_at) {
    activities.push({
      id: 'sent',
      type: 'sent',
      title: 'Factura enviada',
      description: 'La factura fue enviada por email al cliente',
      timestamp: invoiceData.value.sent_at,
      user: 'Sistema'
    })
  }
  
  // Actividad de pago
  if (invoiceData.value.paid_date) {
    activities.push({
      id: 'paid',
      type: 'paid',
      title: 'Pago recibido',
      description: 'La factura fue marcada como pagada',
      timestamp: invoiceData.value.paid_date,
      user: 'Admin'
    })
  }
  
  // Ordenar por fecha más reciente primero
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

// Métodos principales
async function loadInvoiceDetails() {
  loading.value = true
  
  try {
    const { data } = await apiService.billing.getInvoiceDetails(props.invoice._id)
    invoiceData.value = data
    editableNotes.value = data.notes || ''
    
    await loadOrdersList()
    
  } catch (error) {
    console.error('Error loading invoice details:', error)
    toast.error('Error cargando detalles de la factura')
  } finally {
    loading.value = false
  }
}

async function loadOrdersList() {
  if (!invoiceData.value) return
  
  loadingOrders.value = true
  
  try {
    const { data } = await apiService.billing.getInvoiceOrders(invoiceData.value._id)
    ordersList.value = data || []
  } catch (error) {
    console.error('Error loading orders:', error)
    toast.error('Error cargando lista de pedidos')
    ordersList.value = []
  } finally {
    loadingOrders.value = false
  }
}

function toggleEditMode() {
  editMode.value = !editMode.value
  if (editMode.value) {
    editableNotes.value = invoiceData.value.notes || ''
  }
}

async function saveNotes() {
  actionLoading.value = true
  
  try {
    await apiService.billing.updateInvoiceNotes(invoiceData.value._id, {
      notes: editableNotes.value
    })
    
    invoiceData.value.notes = editableNotes.value
    editMode.value = false
    
    toast.success('Notas guardadas correctamente')
    emit('updated')
    
  } catch (error) {
    console.error('Error saving notes:', error)
    toast.error('Error guardando las notas')
  } finally {
    actionLoading.value = false
  }
}

// Acciones de la factura
function sendInvoice() {
  showConfirmModal.value = true
  confirmAction.value = {
    type: 'send',
    title: 'Enviar Factura',
    message: `¿Estás seguro de enviar la factura ${invoiceData.value.invoice_number} por email a ${invoiceData.value.company_id?.email}?`,
    confirmText: 'Enviar',
    action: 'send'
  }
}

function markAsPaid() {
  showConfirmModal.value = true
  confirmAction.value = {
    type: 'paid',
    title: 'Marcar como Pagada',
    message: `¿Confirmas que la factura ${invoiceData.value.invoice_number} por $${formatCurrency(invoiceData.value.total_amount)} ha sido pagada?`,
    confirmText: 'Marcar Pagada',
    action: 'mark_paid'
  }
}

async function downloadPDF() {
  actionLoading.value = true
  
  try {
    const response = await apiService.billing.downloadInvoice(invoiceData.value._id)
    
    // Crear enlace de descarga
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoiceData.value.invoice_number}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('PDF descargado correctamente')
    
  } catch (error) {
    console.error('Error downloading PDF:', error)
    toast.error('Error descargando el PDF')
  } finally {
    actionLoading.value = false
  }
}

async function duplicateInvoice() {
  actionLoading.value = true
  
  try {
    const { data } = await apiService.billing.duplicateInvoice(invoiceData.value._id)
    
    toast.success(`Factura duplicada: ${data.invoice_number}`)
    emit('updated')
    
  } catch (error) {
    console.error('Error duplicating invoice:', error)
    toast.error('Error duplicando la factura')
  } finally {
    actionLoading.value = false
  }
}

async function executeAction() {
  actionLoading.value = true
  
  try {
    switch (confirmAction.value.action) {
      case 'send':
        await apiService.billing.sendInvoice(invoiceData.value._id)
        invoiceData.value.status = 'sent'
        invoiceData.value.sent_at = new Date().toISOString()
        toast.success('Factura enviada correctamente')
        break
        
      case 'mark_paid':
        await apiService.billing.markAsPaid(invoiceData.value._id)
        invoiceData.value.status = 'paid'
        invoiceData.value.paid_date = new Date().toISOString()
        toast.success('Factura marcada como pagada')
        break
    }
    
    emit('updated')
    
  } catch (error) {
    console.error('Error executing action:', error)
    toast.error('Error ejecutando la acción')
  } finally {
    actionLoading.value = false
    showConfirmModal.value = false
  }
}

function cancelAction() {
  showConfirmModal.value = false
  confirmAction.value = {}
}

// Acciones de pedidos
function viewOrderDetails(order) {
  toast.info(`Abriendo detalles del pedido #${order.order_number}`)
  // Implementar navegación a detalles del pedido
}

function trackOrder(order) {
  toast.info(`Abriendo tracking del pedido #${order.order_number}`)
  // Implementar navegación a tracking del pedido
}

// Métodos de utilidad
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-CL')
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleString('es-CL')
}

function formatPeriod() {
  if (!invoiceData.value?.period_start || !invoiceData.value?.period_end) return 'N/A'
  
  const start = new Date(invoiceData.value.period_start).toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: 'short' 
  })
  const end = new Date(invoiceData.value.period_end).toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: 'short' 
  })
  
  return `${start} - ${end}`
}

function getRelativeDate(dateStr) {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} semanas`
  return `Hace ${Math.floor(diff / 30)} meses`
}

function isOverdue() {
  if (!invoiceData.value?.due_date || invoiceData.value.status === 'paid') return false
  return new Date(invoiceData.value.due_date) < new Date()
}

function getDaysOverdue() {
  if (!isOverdue()) return 0
  const dueDate = new Date(invoiceData.value.due_date)
  const now = new Date()
  return Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24))
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

function getStatusIcon(status) {
  const icons = {
    draft: '⚪',
    sent: '🟨',
    paid: '🟩',
    overdue: '🟧'
  }
  return icons[status] || '❓'
}

function getOrderStatusText(status) {
  const texts = {
    pending: 'Pendiente',
    assigned: 'Asignado',
    picked_up: 'Recogido',
    in_transit: 'En tránsito',
    delivered: 'Entregado',
    failed: 'Fallido'
  }
  return texts[status] || status
}

function getActivityIcon(type) {
  const icons = {
    created: '🆕',
    sent: '📧',
    paid: '💰',
    updated: '✏️',
    deleted: '🗑️'
  }
  return icons[type] || '📋'
}

// Watchers
watch(() => [ordersSearch.value, ordersStatusFilter.value], () => {
  orderPage.value = 1
})

// Lifecycle
onMounted(() => {
  loadInvoiceDetails()
})
</script>

<style scoped>
.invoice-details {
  max-width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Header de la factura */
.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.header-main {
  flex: 1;
}

.invoice-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.invoice-icon {
  font-size: 28px;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
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

.status-actions {
  display: flex;
  gap: 8px;
}

.status-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn.send {
  background: #3b82f6;
  color: white;
}

.status-btn.send:hover:not(:disabled) {
  background: #2563eb;
}

.status-btn.paid {
  background: #10b981;
  color: white;
}

.status-btn.paid:hover:not(:disabled) {
  background: #059669;
}

.status-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.action-btn.primary:hover:not(:disabled) {
  background: #2563eb;
}

.action-btn.secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

/* Información general */
.info-section {
  margin-bottom: 32px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.info-group {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-icon {
  font-size: 18px;
}

.info-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
  text-align: right;
}

.info-value.urgent {
  color: #dc2626;
}

.overdue-indicator {
  font-size: 12px;
  color: #dc2626;
  font-weight: 500;
}

/* Sección financiera */
.financial-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 20px;
}

.financial-summary {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.stat-item.highlight {
  border-color: #3b82f6;
  background: #eff6ff;
}

.stat-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 50%;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Sección de pedidos */
.orders-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
}

.orders-count {
  font-size: 14px;
  color: #6b7280;
  font-weight: 400;
}

.orders-filters {
  display: flex;
  gap: 12px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 200px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.orders-table-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.orders-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.orders-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.order-row:hover {
  background: #f9fafb;
}

.order-number .number-text {
  font-weight: 600;
  color: #3b82f6;
}

.customer-info .customer-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.customer-info .customer-phone {
  font-size: 12px;
  color: #6b7280;
}

.address-info .address-line {
  color: #1f2937;
  margin-bottom: 2px;
}

.address-info .address-commune {
  font-size: 12px;
  color: #6b7280;
}

.order-status .status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.order-status .status-badge.delivered {
  background: #d1fae5;
  color: #065f46;
}

.order-status .status-badge.failed {
  background: #fee2e2;
  color: #dc2626;
}

.order-status .status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.order-date .date-main {
  color: #1f2937;
  margin-bottom: 2px;
}

.order-date .date-relative {
  font-size: 12px;
  color: #6b7280;
}

.order-cost .cost-amount {
  font-weight: 600;
  color: #1f2937;
}

.order-actions {
  display: flex;
  gap: 4px;
}

.order-action-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.order-action-btn:hover {
  background: #f3f4f6;
}

.order-action-btn.view {
  color: #3b82f6;
  border-color: #3b82f6;
}

.order-action-btn.track {
  color: #10b981;
  border-color: #10b981;
}

.loading-row,
.empty-row {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-style: italic;
}

.loading-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* Paginación de pedidos */
.orders-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.pagination-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
}

/* Sección de notas */
.notes-section {
  margin-bottom: 32px;
}

.notes-edit .notes-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 12px;
}

.notes-edit .notes-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.notes-actions {
  display: flex;
  justify-content: flex-end;
}

.save-notes-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.save-notes-btn:hover:not(:disabled) {
  background: #059669;
}

.save-notes-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notes-display .notes-text {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  color: #374151;
  line-height: 1.5;
  margin: 0;
}

.notes-empty .empty-text {
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 16px;
}

/* Historial de actividad */
.activity-section {
  margin-bottom: 32px;
}

.activity-timeline {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.activity-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.activity-item:last-child {
  margin-bottom: 0;
}

.activity-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.activity-icon.created {
  background: #dbeafe;
  color: #1e40af;
}

.activity-icon.sent {
  background: #fef3c7;
  color: #d97706;
}

.activity-icon.paid {
  background: #d1fae5;
  color: #065f46;
}

.activity-content {
  flex: 1;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.activity-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.activity-time {
  font-size: 12px;
  color: #6b7280;
}

.activity-description {
  color: #374151;
  font-size: 14px;
  margin-bottom: 2px;
}

.activity-user {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

/* Modal de confirmación */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 90%;
  overflow: hidden;
}

.confirm-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.confirm-body {
  padding: 16px 24px 20px;
}

.confirm-message {
  color: #374151;
  line-height: 1.5;
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px 20px;
  background: #f9fafb;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-confirm {
  border: none;
  color: white;
}

.btn-confirm.send {
  background: #3b82f6;
}

.btn-confirm.send:hover:not(:disabled) {
  background: #2563eb;
}

.btn-confirm.paid {
  background: #10b981;
}

.btn-confirm.paid:hover:not(:disabled) {
  background: #059669;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .invoice-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .status-section {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .status-actions {
    align-self: stretch;
    justify-content: center;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .orders-filters {
    justify-content: center;
  }
  
  .search-input {
    width: 100%;
  }
  
  .orders-table {
    min-width: 600px;
  }
  
  .orders-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .orders-pagination {
    flex-direction: column;
    gap: 12px;
  }
  
  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .activity-icon {
    align-self: flex-start;
  }
  
  .confirm-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .invoice-title {
    font-size: 20px;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  
  .action-btn {
    font-size: 12px;
    padding: 8px 12px;
  }
  
  .info-group {
    padding: 16px;
  }
  
  .financial-summary {
    padding: 16px;
  }
  
  .stat-item {
    padding: 12px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .order-actions {
    flex-direction: column;
    gap: 2px;
  }
  
  .order-action-btn {
    width: 100%;
    padding: 6px 8px;
  }
}
</style>