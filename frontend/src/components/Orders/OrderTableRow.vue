<template>

  <tr 
    class="hover:bg-gray-50 transition-colors" 
    :class="rowClasses"
    @click="handleRowClick"
  >
    <!-- Checkbox Column -->
    <td class="col-checkbox" @click.stop>
      <input 
        type="checkbox"
        :checked="selected"
        :disabled="!selectable"
        @change="$emit('toggle-selection')"
        class="order-checkbox"
      />
    </td>

    <!-- Order Number Column -->
    <td class="col-order">
      <div class="order-info">
        <div class="order-number">#{{ order.order_number }}</div>
        <div class="order-id">ID: {{ order._id?.slice(-6) || 'N/A' }}</div>
        <div v-if="order.external_order_id" class="external-id">
          Ext: {{ order.external_order_id.slice(-8) }}
        </div>
      </div>
    </td>

    <!-- Customer Column -->
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

    <!-- Address Column -->
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

    <!-- Status Column - ACTUALIZADO para mostrar info de Circuit -->
    <td class="col-status">
      <div class="status-container">
        <span class="status-badge" :class="getStatusClass(order.status)">
          {{ getStatusName(order.status) }}
        </span>
        
        <!-- ACTUALIZADO: Circuit Driver Info -->
        <div v-if="order.circuit_driver_id || order.driver_info?.name" class="driver-info">
          <span class="driver-icon">👨‍💼</span>
          <span class="driver-name">
            {{ order.driver_info?.name || getCircuitDriverName(order.circuit_driver_id) }}
          </span>
          <div v-if="order.circuit_plan_id" class="circuit-plan-info">
            <span class="plan-icon">📋</span>
            <span class="plan-id">Plan: {{ order.circuit_plan_id.slice(-6) }}</span>
          </div>
        </div>
      </div>
    </td>

    <!-- ACTUALIZADO: Tracking Column para Circuit -->
    <td class="col-tracking">
      <div class="tracking-container">
        <!-- Delivered - Show Proof -->
        <div v-if="order.status === 'delivered' || order.status === 'invoiced'" class="tracking-section delivered">
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
        
        <!-- ACTUALIZADO: Live Tracking con Circuit -->
        <div v-else-if="hasLiveCircuitTracking" class="tracking-section live">
          <button 
            @click.stop="$emit('track-live')" 
            class="tracking-btn live-btn"
            title="Ver tracking en vivo con Circuit"
          >
            📍 Live Circuit
          </button>
          <div class="tracking-status">
            <span class="status-icon live-dot"></span>
            <span class="status-text">En Vivo</span>
          </div>
        </div>
        
        <!-- ACTUALIZADO: General Tracking con Circuit -->
        <div v-else-if="hasGeneralCircuitTracking" class="tracking-section general">
          <button 
            @click.stop="$emit('view-tracking')" 
            class="tracking-btn general-btn"
            title="Ver seguimiento del pedido en Circuit"
          >
            📍 Seguimiento
          </button>
          <div class="tracking-status">
            <span class="status-icon">📦</span>
            <span class="status-text">{{ getCircuitStatusText() }}</span>
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

    <!-- Amount Column -->
    <td class="col-amount">
      <div class="amount-info">
        <div class="total-amount">${{ formatCurrency(order.total_amount || order.shipping_cost) }}</div>
        <div v-if="order.shipping_cost && order.total_amount" class="shipping-cost">
          Envío: ${{ formatCurrency(order.shipping_cost) }}
        </div>
      </div>
    </td>

    <!-- Date Column -->
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

    <!-- ACTUALIZADO: Actions Column con opciones de Circuit -->
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
            <!-- ACTUALIZADO: Circuit Live Tracking -->
            <button 
              v-if="hasLiveCircuitTracking" 
              @click="$emit('track-live')"
              class="dropdown-item"
            >
              🚚 Tracking Circuit Live
            </button>
            
            <!-- ACTUALIZADO: Circuit General Tracking -->
            <button 
              v-if="hasGeneralCircuitTracking && order.status !== 'delivered'" 
              @click="$emit('view-tracking')"
              class="dropdown-item"
            >
              📍 Ver Seguimiento Circuit
            </button>
            
            <!-- NUEVO: Ver Plan de Circuit -->
            <button 
              v-if="order.circuit_plan_id" 
              @click="$emit('view-circuit-plan')"
              class="dropdown-item"
            >
              📋 Ver Plan Circuit
            </button>
            
            <!-- Proof of Delivery -->
            <button 
              v-if="hasProofOfDelivery" 
              @click="$emit('view-proof')"
              class="dropdown-item"
            >
              📸 Prueba de Entrega
            </button>
            
            <!-- NUEVO: Sync con Circuit -->
            <button 
              v-if="order.circuit_plan_id || order.circuit_driver_id" 
              @click="$emit('sync-circuit')"
              class="dropdown-item"
            >
              🔄 Sync Circuit
            </button>
            
            <!-- Contact Support -->
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
  'view-circuit-plan',
  'sync-circuit',
  'contact-support'
])

// ACTUALIZADO: Computed properties para Circuit
const rowClasses = computed(() => {
  const classes = []
  
  if (props.selected) classes.push('selected')
  if (!props.selectable) classes.push('non-selectable')
  if (props.order.status === 'delivered') classes.push('delivered-row')
  if (props.order.status === 'shipped') classes.push('shipped-row')
  
  // ACTUALIZADO: Circuit tracking indicators
  if (props.order.circuit_tracking_url) classes.push('live-tracking-row')
  if (props.order.circuit_plan_id) classes.push('circuit-plan-row')
  
  if (props.order.status === 'warehouse_received') classes.push('warehouse-received-row')
  if (props.order.status === 'invoiced') classes.push('invoiced-row')
  if (isUrgent.value) classes.push('urgent-row')
  
  return classes.join(' ')
})

// ACTUALIZADO: Live tracking con Circuit
const hasLiveCircuitTracking = computed(() => {
  return props.order.circuit_tracking_url || 
         (props.order.status === 'shipped' && 
          props.order.circuit_plan_id && 
          props.order.circuit_driver_id)
})

// ACTUALIZADO: General tracking con Circuit
const hasGeneralCircuitTracking = computed(() => {
  return props.order.status !== 'delivered' && 
         (props.order.circuit_driver_id || 
          props.order.circuit_plan_id ||
          props.order.circuit_stop_id ||
          ['processing', 'shipped', 'ready_for_pickup'].includes(props.order.status))
})

const hasProofOfDelivery = computed(() => {
  if (props.order.status !== 'delivered') return false
  
  return props.order.proof_of_delivery?.photo_url || 
         props.order.proof_of_delivery?.signature_url ||
         props.order.podUrls?.length > 0 ||
         props.order.signatureUrl ||
         props.order.circuit_plan_id // Circuit también puede tener proof
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
function getCircuitDriverName(circuitDriverId) {
  if (!circuitDriverId) return 'Sin conductor'
  // Aquí podrías tener una store o prop con la lista de conductores
  return `Conductor #${circuitDriverId.slice(-6)}`
}

function getCircuitStatusText() {
  if (props.order.circuit_driver_id && props.order.status === 'shipped') {
    return 'En Ruta'
  }
  if (props.order.circuit_plan_id && !props.order.circuit_driver_id) {
    return 'Plan Creado'
  }
  if (props.order.circuit_driver_id) {
    return 'Asignado'
  }
  return 'Disponible'
}
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

</script>
