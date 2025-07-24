<!-- frontend/src/components/Orders/OrderTableRow.vue -->
<template>
  <div class="table-section">
    <!-- SOLUCIÓN AL DOBLE SCROLL: Contenedor único sin overflow-x -->
    <div class="table-container">
      <table class="orders-table">
        <!-- HEADER - Igual que AdminOrdersTable -->
        <thead>
          <tr>
            <th class="col-checkbox">
              <input 
                type="checkbox" 
                :checked="selectAllChecked"
                :indeterminate="selectAllIndeterminate"
                @change="$emit('toggle-select-all')"
                class="select-all-checkbox"
              />
            </th>
            <th class="col-order">Pedido</th>
            <th class="col-customer">Cliente</th>
            <th class="col-address">Dirección</th>
            <th class="col-status">Estado</th>
            <th class="col-tracking">Seguimiento</th>
            <th class="col-amount">Monto</th>
            <th class="col-date">Fechas</th>
            <th class="col-actions">Acciones</th>
          </tr>
        </thead>

        <!-- BODY -->
        <tbody>
          <!-- LOADING STATE -->
          <tr v-if="loading" class="loading-row">
            <td colspan="9" class="loading-state">
              <div class="loading-spinner"></div>
              <span>Cargando pedidos...</span>
            </td>
          </tr>

          <!-- EMPTY STATE -->
          <tr v-else-if="orders.length === 0" class="empty-row">
            <td colspan="9" class="empty-state">
              <div class="empty-icon">📦</div>
              <p class="empty-title">No hay pedidos disponibles</p>
              <p class="empty-subtitle">Crea tu primer pedido o sincroniza desde tus canales de venta</p>
              <button 
                v-if="showCreateButton" 
                @click="$emit('create-order')" 
                class="create-order-btn"
              >
                ➕ Crear Primer Pedido
              </button>
            </td>
          </tr>

          <!-- ORDER ROWS - Con funcionalidades de empresa -->
          <tr 
            v-for="order in orders" 
            :key="order._id"
            class="order-row"
            :class="{ 
              'selected': isOrderSelected(order),
              'in-transit': isInTransit(order),
              'ready-for-pickup': order.status === 'ready_for_pickup'
            }"
          >
            <!-- CHECKBOX -->
            <td class="col-checkbox">
              <input 
                type="checkbox" 
                :checked="isOrderSelected(order)"
                @change="$emit('toggle-selection', order)"
                :disabled="!isOrderSelectable(order)"
                class="order-checkbox"
              />
            </td>

            <!-- ORDER NUMBER -->
            <td class="col-order">
              <div class="order-info">
                <div class="order-number">{{ order.order_number }}</div>
                <div class="order-id">ID: {{ order._id.slice(-6) }}</div>
                <div v-if="order.external_order_id" class="external-id">
                  Ext: {{ order.external_order_id.slice(-8) }}
                </div>
              </div>
            </td>

            <!-- CUSTOMER -->
            <td class="col-customer">
              <div class="customer-info">
                <div class="customer-name">{{ order.customer_name }}</div>
                <div class="customer-contact">
                  <div v-if="order.customer_email" class="customer-email">
                    <span class="contact-icon">📧</span> {{ order.customer_email }}
                  </div>
                  <div v-if="order.customer_phone" class="customer-phone">
                    <span class="contact-icon">📱</span> {{ order.customer_phone }}
                  </div>
                </div>
              </div>
            </td>

            <!-- ADDRESS -->
            <td class="col-address">
              <div class="address-info">
                <div class="address-main">{{ order.shipping_address?.street }}</div>
                <div class="address-details">
                  <span class="commune">{{ order.shipping_address?.commune }}</span>
                  <span v-if="order.shipping_address?.apartment" class="apartment">
                    , {{ order.shipping_address.apartment }}
                  </span>
                </div>
              </div>
            </td>

            <!-- STATUS - Con estados específicos de empresa -->
            <td class="col-status">
              <div class="status-container">
                <span class="status-badge" :class="getStatusClass(order.status)">
                  {{ getStatusText(order.status) }}
                </span>
                <div v-if="order.status_updated_at" class="status-time">
                  {{ formatStatusTime(order.status_updated_at) }}
                </div>
              </div>
            </td>

            <!-- TRACKING - Funcionalidad específica de empresas -->
            <td class="col-tracking">
              <div class="tracking-container">
                <!-- En tránsito con tracking -->
                <div v-if="hasTrackingInfo(order)" class="tracking-active">
                  <button 
                    @click="$emit('track-live', order)" 
                    class="track-live-btn"
                    title="Ver ubicación en tiempo real"
                  >
                    📍 En vivo
                  </button>
                  <div class="tracking-info">
                    <span class="driver-name">{{ order.driver_name }}</span>
                    <span class="eta">ETA: {{ order.estimated_arrival }}</span>
                  </div>
                </div>
                
                <!-- Prueba de entrega disponible -->
                <div v-else-if="hasProofOfDelivery(order)" class="proof-available">
                  <button 
                    @click="$emit('view-proof', order)" 
                    class="proof-btn"
                    title="Ver prueba de entrega"
                  >
                    📸 Prueba
                  </button>
                  <div class="delivery-info">
                    <span class="delivery-time">{{ formatDeliveryTime(order.delivered_at) }}</span>
                  </div>
                </div>
                
                <!-- Sin tracking -->
                <div v-else class="no-tracking">
                  <span class="tracking-status">Sin seguimiento</span>
                </div>
              </div>
            </td>

            <!-- AMOUNT -->
            <td class="col-amount">
              <div class="amount-info">
                <div class="total-amount">${{ formatAmount(order.total_amount) }}</div>
                <div v-if="order.shipping_cost" class="shipping-cost">
                  Envío: ${{ formatAmount(order.shipping_cost) }}
                </div>
              </div>
            </td>

            <!-- DATES -->
            <td class="col-date">
              <div class="date-info">
                <div class="date-creation">
                  <span class="date-label">Creado:</span>
                  <span class="date-value">{{ formatDate(order.created_at) }}</span>
                </div>
                <div v-if="order.delivery_date" class="date-delivery">
                  <span class="date-label">Entrega:</span>
                  <span class="date-value">{{ formatDate(order.delivery_date) }}</span>
                </div>
              </div>
            </td>

            <!-- ACTIONS - Específicas de empresa -->
            <td class="col-actions">
              <div class="action-buttons">
                <button 
                  @click="$emit('view-details', order)" 
                  class="btn-table-action view"
                  title="Ver detalles"
                >
                  👁️
                </button>
                
                <!-- Acción principal según estado -->
                <button 
                  v-if="getActionButton(order).show"
                  @click="$emit('handle-action', { action: getActionButton(order).action, order })"
                  :class="['btn-table-action', getActionButton(order).class]"
                  :title="getActionButton(order).title"
                >
                  {{ getActionButton(order).icon }} {{ getActionButton(order).text }}
                </button>

                <!-- Dropdown de más acciones -->
                <div class="action-dropdown">
                  <button class="btn-table-action more" title="Más opciones">
                    ⋮
                  </button>
                  <div class="dropdown-menu">
                    <button @click="$emit('view-tracking', order)" class="dropdown-item">
                      📍 Ver seguimiento
                    </button>
                    <button @click="$emit('contact-support', order)" class="dropdown-item">
                      💬 Contactar soporte
                    </button>
                    <div class="dropdown-divider"></div>
                    <button @click="duplicateOrder(order)" class="dropdown-item">
                      📋 Duplicar
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PAGINATION - Igual que AdminOrdersTable -->
    <div v-if="pagination && pagination.totalPages > 1" class="pagination-section">
      <div class="pagination-info">
        <span>
          Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
          de {{ pagination.total }} pedidos
        </span>
        
        <div class="page-size-selector">
          <label>Mostrar:</label>
          <select 
            :value="pagination.limit" 
            @change="$emit('change-page-size', $event.target.value)"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      
      <div class="pagination-controls">
        <button 
          @click="$emit('go-to-page', 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn"
        >
          ⏮️
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.page - 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn"
        >
          ← Anterior
        </button>
        
        <div class="page-numbers">
          <button
            v-for="page in getVisiblePages()"
            :key="page"
            @click="page !== '...' && $emit('go-to-page', page)"
            :class="['page-btn', { active: page === pagination.page, disabled: page === '...' }]"
            :disabled="page === '...'"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="$emit('go-to-page', pagination.page + 1)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn"
        >
          Siguiente →
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.totalPages)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn"
        >
          ⏭️
        </button>
      </div>
    </div>
  </div>
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
    warehouse_received: '🏭'
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
.order-row.warehouse-received-row {
  background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
}

.order-row.live-tracking-row {
  border-left: 3px solid #f59e0b;
}

.order-row.urgent-row {
  border-left: 3px solid #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
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
.status-warehouse_received { background: linear-gradient(135deg, #6f42c1, #8e44ad); 
  color: white; 
  font-weight: 600; 
  text-transform: uppercase; 
  letter-spacing: 0.5px;
}
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