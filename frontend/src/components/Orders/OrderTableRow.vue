<!-- frontend/src/components/Orders/OrderTableRow.vue -->
<template>
  <tr 
    class="order-row" 
    :class="rowClasses"
    @click="handleRowClick"
  >
    <!-- Checkbox Column -->
    <td class="col-checkbox" @click.stop>
      <div class="checkbox-container">
        <input 
          type="checkbox"
          :checked="selected"
          :disabled="!selectable"
          @change="$emit('toggle-selection')"
          class="row-checkbox"
          :class="{ 'disabled': !selectable }"
        />
      </div>
    </td>

    <!-- Order Number Column -->
    <td class="col-order">
      <div class="order-info">
        <div class="order-number-wrapper">
          <span class="order-number">#{{ order.order_number }}</span>
          <div class="order-badges">
            <span 
              v-if="order.channel_id" 
              class="channel-badge" 
              :class="getChannelClass(order.channel_id.channel_type)"
              :title="order.channel_id.channel_name"
            >
              {{ getChannelIcon(order.channel_id.channel_type) }}
            </span>
            <span 
              v-if="order.priority && order.priority !== 'normal'" 
              class="priority-badge" 
              :class="order.priority"
            >
              {{ getPriorityIcon(order.priority) }}
            </span>
          </div>
        </div>
        <div v-if="order.external_order_id" class="external-id">
          {{ order.external_order_id }}
        </div>
      </div>
    </td>

    <!-- Customer Column -->
    <td class="col-customer">
      <div class="customer-info">
        <div class="customer-name" :title="order.customer_name">
          {{ truncateText(order.customer_name, 20) }}
        </div>
        <div v-if="order.customer_phone" class="customer-contact">
          <span class="contact-icon">📱</span>
          <span class="phone-number">{{ formatPhone(order.customer_phone) }}</span>
        </div>
        <div v-if="order.customer_email" class="customer-email" :title="order.customer_email">
          <span class="contact-icon">📧</span>
          <span class="email">{{ truncateText(order.customer_email, 25) }}</span>
        </div>
      </div>
    </td>

    <!-- Address Column -->
    <td class="col-address">
      <div class="address-info">
        <div class="address-text" :title="order.shipping_address">
          {{ truncateText(order.shipping_address, 35) }}
        </div>
        <div class="address-details">
          <span v-if="order.shipping_commune" class="commune-tag">
            📍 {{ order.shipping_commune }}
          </span>
          <span v-if="order.shipping_city && order.shipping_city !== order.shipping_commune" class="city-text">
            {{ order.shipping_city }}
          </span>
        </div>
      </div>
    </td>

    <!-- Status Column -->
    <td class="col-status">
      <div class="status-info">
        <span class="status-badge" :class="getStatusClass(order.status)">
          <span class="status-icon">{{ getStatusIcon(order.status) }}</span>
          <span class="status-text">{{ getStatusName(order.status) }}</span>
        </span>
        
        <!-- Driver Info -->
        <div v-if="order.driver_info?.name" class="driver-info">
          <span class="driver-icon">👨‍💼</span>
          <span class="driver-name">{{ order.driver_info.name }}</span>
        </div>
        
        <!-- Shipday Status -->
        <div v-if="order.shipday_order_id" class="shipday-status">
          <span class="shipday-icon">🚚</span>
          <span class="shipday-text">En Shipday</span>
        </div>
      </div>
    </td>

    <!-- Tracking Column -->
    <td class="col-tracking">
      <div class="tracking-info">
        <!-- Priority 1: Delivered - Show Proof of Delivery -->
        <div v-if="order.status === 'delivered'" class="tracking-action delivered">
          <button 
            @click.stop="$emit('view-proof')" 
            class="tracking-btn proof-btn"
            title="Ver prueba de entrega"
          >
            <span class="btn-icon">📸</span>
            <span class="btn-text">Prueba</span>
          </button>
          <div class="delivery-indicator">
            <span class="delivery-icon">✅</span>
            <span class="delivery-text">Entregado</span>
          </div>
        </div>
        
        
        <!-- Priority 3: General Tracking -->
        <div v-else-if="hasGeneralTracking" class="tracking-action general">
          <button 
            @click.stop="$emit('view-tracking')" 
            class="tracking-btn tracking-btn-general"
            title="Ver seguimiento"
          >
            <span class="btn-icon">🚚</span>
            <span class="btn-text">Seguimiento</span>
          </button>
          <div class="tracking-indicator">
            <span class="tracking-icon">📦</span>
            <span class="tracking-text">Disponible</span>
          </div>
        </div>
        
        <!-- Priority 4: No Tracking -->
        <div v-else class="tracking-action none">
          <div class="no-tracking">
            <span class="no-tracking-icon">❓</span>
            <span class="no-tracking-text">Sin info</span>
          </div>
        </div>
      </div>
    </td>

    <!-- Amount Column -->
    <td class="col-amount">
      <div class="amount-info">
        <div class="total-amount">
          ${{ formatCurrency(order.total_amount || order.shipping_cost) }}
        </div>
        <div v-if="order.shipping_cost && order.total_amount" class="shipping-cost">
          Envío: ${{ formatCurrency(order.shipping_cost) }}
        </div>
      </div>
    </td>

    <!-- Date Column -->
    <td class="col-date">
      <div class="date-info">
        <div class="order-date">
          <span class="date-icon">📅</span>
          <span class="date-text">{{ formatDate(order.order_date) }}</span>
        </div>
        <div v-if="order.delivery_date" class="delivery-date">
          <span class="delivery-date-icon">✅</span>
          <span class="delivery-date-text">{{ formatDate(order.delivery_date) }}</span>
        </div>
        <div v-if="isUrgent" class="urgent-indicator">
          <span class="urgent-icon">⚡</span>
          <span class="urgent-text">Urgente</span>
        </div>
      </div>
    </td>

    <!-- Actions Column -->
    <td class="col-actions" @click.stop>
      <div class="actions-menu">
        <!-- Primary Actions -->
        <div class="primary-actions">
          <!-- Mark as Ready (only for pending orders) -->
          <button 
            v-if="order.status === 'pending'" 
            @click="$emit('mark-ready')" 
            class="action-btn ready-btn"
            title="Marcar como listo para retiro"
          >
            ✔️
          </button>
          
          <!-- View Details -->
          <button 
            @click="$emit('view-details')" 
            class="action-btn details-btn"
            title="Ver detalles del pedido"
          >
            👁️
          </button>
        </div>

        <!-- Secondary Actions Menu -->
        <div class="secondary-actions">
          <div class="dropdown">
            <button class="dropdown-toggle" title="Más acciones">
              ⋮
            </button>
            <div class="dropdown-menu">
              <!-- Live Tracking -->
              <button 
                v-if="order.status === 'shipped'" 
                @click="$emit('track-live')"
                class="dropdown-item"
              >
                🚚 Tracking en Vivo
              </button>
              
              <!-- General Tracking -->
              <button 
                v-if="hasGeneralTracking && order.status !== 'delivered'" 
                @click="$emit('view-tracking')"
                class="dropdown-item"
              >
                📍 Ver Seguimiento
              </button>
              
              <!-- Proof of Delivery -->
              <button 
                v-if="hasProofOfDelivery" 
                @click="$emit('view-proof')"
                class="dropdown-item"
              >
                📸 Prueba de Entrega
              </button>
              
              <!-- Contact Support -->
              <button 
                v-if="canContactSupport" 
                @click="$emit('contact-support')"
                class="dropdown-item"
              >
                💬 Contactar Soporte
              </button>
              
              <!-- Divider -->
              <div class="dropdown-divider"></div>
              
              <!-- Copy Order Number -->
              <button 
                @click="copyOrderNumber"
                class="dropdown-item"
              >
                📋 Copiar #Pedido
              </button>
              
              <!-- Share Order -->
              <button 
                @click="shareOrder"
                class="dropdown-item"
              >
                📤 Compartir
              </button>
            </div>
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
    cancelled: '❌'
  }
  return icons[status] || '📦'
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    processing: 'Procesando',
    ready_for_pickup: 'Listo',
    shipped: 'En Tránsito',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
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
.order-row {
  transition: all 0.2s ease;
  cursor: pointer;
}

.order-row:hover {
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
}

.order-row.selected {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  border-left: 4px solid #6366f1;
}

.order-row.delivered-row {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

.order-row.shipped-row {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.order-row.live-tracking-row {
  border-left: 3px solid #f59e0b;
}

.order-row.urgent-row {
  border-left: 3px solid #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.order-row.non-selectable {
  opacity: 0.7;
}

.order-row td {
  padding: 16px 12px;
  vertical-align: top;
  border-bottom: 1px solid #f1f5f9;
}

/* Checkbox Column */
.checkbox-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.row-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.row-checkbox.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Order Info */
.order-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-number-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-number {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
}

.order-badges {
  display: flex;
  gap: 4px;
}

.channel-badge {
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  background: #f3f4f6;
}

.channel-shopify { background: #e0f2fe; }
.channel-woocommerce { background: #f3e8ff; }
.channel-mercadolibre { background: #fef3c7; }
.channel-manual { background: #f0fdf4; }

.priority-badge {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 50%;
}

.external-id {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
}

/* Customer Info */
.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.customer-contact,
.customer-email {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;
}

.contact-icon {
  font-size: 10px;
}

/* Address Info */
.address-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.address-text {
  color: #374151;
  font-size: 13px;
  line-height: 1.3;
}

.address-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.commune-tag {
  font-size: 10px;
  color: #0369a1;
  background: #e0f2fe;
  padding: 2px 6px;
  border-radius: 8px;
  display: inline-block;
  align-self: flex-start;
}

.city-text {
  font-size: 10px;
  color: #6b7280;
}

/* Status Info */
.status-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-processing { background: #dbeafe; color: #1e40af; }
.status-ready_for_pickup { background: #e9d5ff; color: #6b21a8; }
.status-shipped { background: #e9d5ff; color: #6b21a8; }
.status-delivered { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fee2e2; color: #991b1b; }
.status-w
.status-icon {
  font-size: 12px;
}

.driver-info,
.shipday-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #6b7280;
}

/* Tracking Info */
.tracking-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tracking-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tracking-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
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

.tracking-btn-general {
  background: #dbeafe;
  color: #1e40af;
}

.tracking-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-icon.live-pulse {
  animation: pulse 1s infinite;
}

.delivery-indicator,
.live-indicator,
.tracking-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: #6b7280;
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

/* Amount Info */
.amount-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.total-amount {
  font-weight: 700;
  color: #059669;
  font-size: 14px;
}

.shipping-cost {
  font-size: 10px;
  color: #6b7280;
}

/* Date Info */
.date-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.order-date,
.delivery-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.date-icon,
.delivery-date-icon {
  font-size: 10px;
}

.delivery-date {
  color: #059669;
  font-size: 10px;
}

.urgent-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ef4444;
  font-size: 9px;
  font-weight: 600;
}

/* Actions Menu */
.actions-menu {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.primary-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.ready-btn {
  background: #dcfce7;
  color: #166534;
}

.details-btn {
  background: #f3f4f6;
  color: #374151;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Dropdown Menu */
.dropdown {
  position: relative;
}

.dropdown-toggle {
  width: 24px;
  height: 32px;
  border: none;
  background: #f9fafb;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.dropdown-toggle:hover {
  background: #f3f4f6;
  color: #374151;
}

.dropdown:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 180px;
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s ease;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dropdown-item:hover {
  background: #f9fafb;
}

.dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .order-row td {
    padding: 12px 8px;
  }
  
  .customer-contact,
  .customer-email {
    display: none;
  }
  
  .address-details {
    display: none;
  }
  
  .dropdown-menu {
    left: auto;
    right: 0;
  }
}

@media (max-width: 768px) {
  .col-customer,
  .col-address {
    display: none;
  }
  
  .actions-menu {
    flex-direction: column;
    gap: 2px;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .dropdown-menu {
    min-width: 160px;
  }
}

@media (max-width: 480px) {
  .col-tracking {
    display: none;
  }
  
  .order-row td {
    padding: 8px 6px;
  }
  
  .order-number {
    font-size: 12px;
  }
  
  .status-badge {
    padding: 4px 6px;
    font-size: 10px;
  }
  
  .total-amount {
    font-size: 12px;
  }
}

/* Accessibility */
.order-row:focus-within {
  outline: 2px solid #6366f1;
  outline-offset: -2px;
}

.row-checkbox:focus,
.action-btn:focus,
.dropdown-toggle:focus {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* Print styles */
@media print {
  .actions-menu,
  .dropdown {
    display: none;
  }
  
  .order-row {
    background: white !important;
    border: none !important;
  }
  
  .status-badge {
    background: #f5f5f5 !important;
    color: #000 !important;
  }
}
</style>