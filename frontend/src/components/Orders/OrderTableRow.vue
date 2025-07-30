<!-- frontend/src/components/Orders/OrderTableRow.vue -->
<template>
  <tr 
    class="order-row" 
    :class="rowClasses"
    @click="handleRowClick"
  >
    <!-- Checkbox Column - Estilo AdminOrdersTable -->
    <td class="col-checkbox" @click.stop>
      <input 
        type="checkbox"
        :checked="selected"
        :disabled="!selectable"
        @change="$emit('toggle-selection')"
        class="order-checkbox"
      />
    </td>

    <!-- Order Number Column - Estilo AdminOrdersTable -->
    <td class="col-order">
      <div class="order-info">
        <div class="order-number">#{{ order.order_number }}</div>
        <div class="order-id">ID: {{ order._id?.slice(-6) || 'N/A' }}</div>
        <div v-if="order.external_order_id" class="external-id">
          Ext: {{ order.external_order_id.slice(-8) }}
        </div>
      </div>
    </td>

    <!-- Customer Column - Estilo AdminOrdersTable -->
    <td class="col-customer">
      <div class="customer-info">
        <div class="customer-name">{{ order.customer_name }}</div>
        <div class="customer-contact">
          <div v-if="order.customer_phone" class="customer-phone">
            <span class="contact-icon">📱</span> {{ formatPhone(order.customer_phone) }}
          </div>
          <div v-if="order.customer_email" class="customer-email">
            <span class="contact-icon">📧</span> {{ truncateText(order.customer_email, 25) }}
          </div>
        </div>
      </div>
    </td>

    <!-- Address Column - Estilo AdminOrdersTable -->
    <td class="col-address">
      <div class="address-info">
        <div class="address-main">{{ order.shipping_address }}</div>
        <div class="address-details">
          <span v-if="order.shipping_commune" class="commune">{{ order.shipping_commune }}</span>
          <span v-if="order.shipping_city && order.shipping_city !== order.shipping_commune" class="city">
            , {{ order.shipping_city }}
          </span>
        </div>
      </div>
    </td>

    <!-- Status Column - Manteniendo driver info -->
    <td class="col-status">
      <div class="status-container">
        <span class="status-badge" :class="getStatusClass(order.status)">
          {{ getStatusName(order.status) }}
        </span>
        <!-- Driver Info - Funcionalidad específica mantenida -->
        <div v-if="order.driver_info?.name" class="driver-info">
          <span class="driver-icon">👨‍💼</span>
          <span class="driver-name">{{ order.driver_info.name }}</span>
        </div>
      </div>
    </td>

    <!-- Tracking Column - Funcionalidad específica mantenida -->
    <td class="col-tracking">
  <div class="tracking-container">
    <!-- Delivered - Show Proof -->
    <div v-if="order.status === 'delivered'" class="tracking-section delivered">
      <button 
        @click.stop="$emit('view-proof')" 
        class="tracking-btn proof-btn"
        title="Ver prueba de entrega"
      >
        📸 Prueba
      </button>
      <div class="tracking-status">
        <span class="status-icon">✅</span>
        <span class="status-text">Entregado</span>
      </div>
    </div>
    
    <!-- Tiene tracking disponible - Botón genérico "Seguimiento" -->
    <div v-else-if="hasGeneralTracking || order.shipday_order_id" class="tracking-section general">
      <button 
        @click.stop="$emit('view-tracking')" 
        class="tracking-btn general-btn"
        title="Ver seguimiento del pedido"
      >
        📍 Seguimiento
      </button>
      <div class="tracking-status">
        <span class="status-icon">📦</span>
        <span class="status-text">Disponible</span>
      </div>
    </div>
    
    <!-- No Tracking -->
    <div v-else class="tracking-section none">
      <div class="no-tracking">
        <span class="no-tracking-icon">❓</span>
        <span class="no-tracking-text">Sin info</span>
      </div>
    </div>
  </div>
</td>

    <!-- Amount Column - Estilo AdminOrdersTable -->
    <td class="col-amount">
      <div class="amount-info">
        <div class="total-amount">${{ formatCurrency(order.total_amount || order.shipping_cost) }}</div>
        <div v-if="order.shipping_cost && order.total_amount" class="shipping-cost">
          Envío: ${{ formatCurrency(order.shipping_cost) }}
        </div>
      </div>
    </td>

    <!-- Date Column - Estilo AdminOrdersTable -->
    <td class="col-date">
      <div class="date-info">
        <div class="date-creation">
          <span class="date-label">Creado:</span>
          <span class="date-value">{{ formatDate(order.order_date) }}</span>
        </div>
        <div v-if="order.delivery_date" class="date-delivery">
          <span class="date-label">Entrega:</span>
          <span class="date-value">{{ formatDate(order.delivery_date) }}</span>
        </div>
        <div v-if="isUrgent" class="urgent-indicator">
          <span class="urgent-icon">⚡</span>
          <span class="urgent-text">Urgente</span>
        </div>
      </div>
    </td>

    <!-- Actions Column - Estilo AdminOrdersTable -->
    <td class="col-actions" @click.stop>
      <div class="action-buttons">
        <!-- Primary Actions -->
        <button 
          @click="$emit('view-details')" 
          class="btn-action view"
          title="Ver detalles"
        >
          👁️
        </button>
        
        <button 
          v-if="order.status === 'pending'" 
          @click="$emit('mark-ready')" 
          class="btn-action ready"
          title="Marcar como listo"
        >
          ✔️
        </button>

        <!-- Dropdown Menu -->
        <div class="action-dropdown">
          <button class="btn-action more" title="Más opciones">
            ⋮
          </button>
          <div class="dropdown-menu">
            <button 
              v-if="hasLiveTracking" 
              @click="$emit('track-live')"
              class="dropdown-item"
            >
              🚚 Tracking en Vivo
            </button>
            
            <button 
              v-if="hasGeneralTracking && order.status !== 'delivered'" 
              @click="$emit('view-tracking')"
              class="dropdown-item"
            >
              📍 Ver Seguimiento
            </button>
            
            <button 
              v-if="hasProofOfDelivery" 
              @click="$emit('view-proof')"
              class="dropdown-item"
            >
              📸 Prueba de Entrega
            </button>
            
            <button 
              v-if="canContactSupport" 
              @click="$emit('contact-support')"
              class="dropdown-item"
            >
              💬 Contactar Soporte
            </button>
            
            <div class="dropdown-divider"></div>
            
            <button 
              @click="copyOrderNumber"
              class="dropdown-item"
            >
              📋 Copiar #Pedido
            </button>
          </div>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  selectable: {
    type: Boolean,
    default: true
  }
})

defineEmits([
  'toggle-selection',
  'view-details',
  'mark-ready',
  'track-live',
  'view-tracking',
  'view-proof',
  'contact-support'
])

// Computed properties
const rowClasses = computed(() => {
  const classes = []
  
  if (props.selected) classes.push('selected')
  if (!props.selectable) classes.push('non-selectable')
  if (props.order.status === 'delivered') classes.push('delivered-row')
  if (props.order.status === 'shipped') classes.push('shipped-row')
  if (props.order.shipday_tracking_url) classes.push('live-tracking-row')
  if (props.order.status === 'warehouse_received') classes.push('warehouse-received-row')
  if (isUrgent.value) classes.push('urgent-row')
  
  return classes.join(' ')
})

const hasLiveTracking = computed(() => {
  return props.order.shipday_tracking_url || 
         (props.order.status === 'shipped' && props.order.shipday_order_id)
})

const hasGeneralTracking = computed(() => {
  return props.order.status !== 'delivered' && 
         (props.order.shipday_driver_id || 
          props.order.shipday_order_id ||
          ['processing', 'shipped'].includes(props.order.status))
})

const hasProofOfDelivery = computed(() => {
  if (props.order.status !== 'delivered') return false
  
  return props.order.proof_of_delivery?.photo_url || 
         props.order.proof_of_delivery?.signature_url ||
         props.order.podUrls?.length > 0 ||
         props.order.signatureUrl ||
         props.order.shipday_order_id
})

const canContactSupport = computed(() => {
  if (props.order.status === 'delivered') {
    const deliveryDate = new Date(props.order.delivery_date)
    const now = new Date()
    const daysDiff = (now - deliveryDate) / (1000 * 60 * 60 * 24)
    return daysDiff <= 7
  }
  return ['pending', 'processing', 'shipped'].includes(props.order.status)
})

const isUrgent = computed(() => {
  const orderDate = new Date(props.order.order_date)
  const now = new Date()
  const daysDiff = (now - orderDate) / (1000 * 60 * 60 * 24)
  
  // Consider urgent if pending for more than 2 days
  return props.order.status === 'pending' && daysDiff > 2
})

// Methods
function handleRowClick() {
  // Optional: emit row click for details view
  // $emit('view-details')
}

function truncateText(text, maxLength) {
  if (!text) return 'N/A'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

function formatPhone(phone) {
  if (!phone) return ''
  // Format Chilean phone numbers
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `+56 ${cleaned.substring(0, 1)} ${cleaned.substring(1, 5)} ${cleaned.substring(5)}`
  }
  return phone
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

function getChannelIcon(channelType) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🏪',
    mercadolibre: '🛒',
    manual: '📝',
    api: '🔗'
  }
  return icons[channelType] || '🏬'
}

function getChannelClass(channelType) {
  return `channel-${channelType}`
}

function getPriorityIcon(priority) {
  const icons = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  }
  return icons[priority] || ''
}

function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    ready_for_pickup: '📦',
    shipped: '🚚',
    delivered: '✅',
    cancelled: '❌',
    warehouse_received: '🏭',
    out_for_delivery: '📦',
  }
  return icons[status] || '📦'
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    processing: 'Procesando',
    ready_for_pickup: 'Listo',
    shipped: 'En Tránsito',
    out_for_delivery: 'En Entrega',
    delivered: 'Entregado',
    invoiced: 'Facturado',
    cancelled: 'Cancelado',
    warehouse_received: 'Recibido en Bodega'
  }
  return names[status] || status
}

function getStatusClass(status) {
  return `status-${status}`
}

async function copyOrderNumber() {
  try {
    await navigator.clipboard.writeText(props.order.order_number)
    // You might want to show a toast notification here
  } catch (err) {
    console.error('Failed to copy order number:', err)
  }
}

function shareOrder() {
  if (navigator.share) {
    navigator.share({
      title: `Pedido #${props.order.order_number}`,
      text: `Cliente: ${props.order.customer_name}\nEstado: ${getStatusName(props.order.status)}`,
      url: window.location.href
    })
  } else {
    // Fallback to copying link
    copyOrderNumber()
  }
}
</script>

<style scoped>
/* ==================== ROW STYLES - Como AdminOrdersTable ==================== */
.order-row {
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.order-row:hover {
  background: #f1f5f9;
}

.order-row.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.order-row.delivered-row {
  background: #f0fdf4;
}

.order-row.shipped-row {
  background: #eff6ff;
}

.order-row.live-tracking-row {
  border-left: 3px solid #f59e0b;
}

.order-row.urgent-row {
  border-left: 3px solid #ef4444;
  background: #fef2f2;
}

.order-row td {
  padding: 12px;
  vertical-align: top;
}

/* ==================== CHECKBOX - Como AdminOrdersTable ==================== */
.order-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* ==================== ORDER INFO - Como AdminOrdersTable ==================== */
.order-info .order-number {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.order-info .order-id,
.order-info .external-id {
  font-size: 11px;
  color: #64748b;
}

/* ==================== CUSTOMER INFO - Como AdminOrdersTable ==================== */
.customer-info .customer-name {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
}

.customer-contact {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-phone,
.customer-email {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.contact-icon {
  font-size: 10px;
}

/* ==================== ADDRESS INFO - Como AdminOrdersTable ==================== */
.address-info .address-main {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 2px;
}

.address-details {
  font-size: 11px;
  color: #64748b;
}

.commune {
  font-weight: 500;
}

/* ==================== STATUS - Como AdminOrdersTable ==================== */
.status-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  width: fit-content;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-processing { background: #dbeafe; color: #1e40af; }
.status-ready_for_pickup { background: #e9d5ff; color: #6b21a8; }
.status-shipped { background: #dcfce7; color: #166534; }
.status-delivered { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fee2e2; color: #991b1b; }

.driver-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #64748b;
}

.driver-icon {
  font-size: 10px;
}

.driver-name {
  font-weight: 500;
}

/* ==================== TRACKING - Funcionalidad específica mejorada ==================== */
.tracking-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.tracking-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.tracking-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.proof-btn {
  background: #d1fae5;
  color: #065f46;
}

.live-btn {
  background: #fed7aa;
  color: #9a3412;
  animation: pulse 2s infinite;
}

.general-btn {
  background: #dbeafe;
  color: #1e40af;
}

.tracking-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tracking-status {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: #64748b;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.no-tracking {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #9ca3af;
  font-size: 10px;
}

/* ==================== AMOUNT - Como AdminOrdersTable ==================== */
.amount-info {
  text-align: right;
}

.total-amount {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.shipping-cost {
  font-size: 11px;
  color: #64748b;
}

/* ==================== DATE - Como AdminOrdersTable ==================== */
.date-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-creation,
.date-delivery {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.date-label {
  font-size: 10px;
  font-weight: 500;
  color: #6b7280;
}

.date-value {
  font-size: 11px;
  color: #374151;
}

.urgent-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ef4444;
  font-size: 9px;
  font-weight: 600;
}

/* ==================== ACTIONS - Como AdminOrdersTable ==================== */
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-action {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action.view {
  color: #3b82f6;
  border-color: #bfdbfe;
}

.btn-action.view:hover {
  background: #eff6ff;
}

.btn-action.ready {
  color: #059669;
  border-color: #6ee7b7;
}

.btn-action.ready:hover {
  background: #d1fae5;
}

.btn-action.more {
  color: #64748b;
}

.btn-action.more:hover {
  background: #f1f5f9;
}

/* ==================== DROPDOWN - Como AdminOrdersTable ==================== */
.action-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 20;
  min-width: 160px;
  display: none;
}

.action-dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}

/* ==================== ANIMATIONS ==================== */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1024px) {
  .order-row td {
    padding: 12px 8px;
  }
  
  .customer-contact {
    display: none;
  }
  
  .address-details {
    display: none;
  }
}

@media (max-width: 768px) {
  .col-customer,
  .col-address {
    display: none;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .col-tracking {
    display: none;
  }
  
  .order-row td {
    padding: 8px 6px;
  }
}
</style>