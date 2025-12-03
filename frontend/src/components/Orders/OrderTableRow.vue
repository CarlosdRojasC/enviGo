<!-- frontend/src/components/Orders/OrderTableRow.vue -->
<template>
  <tr 
    :class="[
      'border-b border-slate-200 transition-all duration-200 hover:bg-slate-50',
      {
        'bg-blue-50 border-blue-600': selected,
        'bg-green-50': order.status === 'delivered',
        'bg-blue-50': order.status === 'shipped',
        'border-l-4 border-l-amber-500': order.shipday_tracking_url,
        'border-l-4 border-l-red-500 bg-red-50': isUrgent,
        'bg-gray-50': order.status === 'warehouse_received',
      }
    ]"
    @click="handleRowClick"
  >
    <!-- Checkbox Column -->
    <td class="px-3 py-3 align-top" @click.stop>
      <input 
        type="checkbox"
        :checked="selected"
        :disabled="!selectable"
        @change="$emit('toggle-selection')"
        class="w-4 h-4 cursor-pointer"
      />
    </td>

    <!-- Order Number Column -->
    <td class="px-3 py-3 align-top">
      <div>
        <div class="font-semibold text-slate-800 mb-0.5">
          #{{ order.order_number }}
        </div>
        <div class="text-[11px] text-slate-500">
          ID: {{ order._id?.slice(-6) || 'N/A' }}
        </div>
        <div v-if="order.external_order_id" class="text-[11px] text-slate-500">
          Ext: {{ order.external_order_id.slice(-8) }}
        </div>
      </div>
    </td>

    <!-- Customer Column -->
    <td class="px-3 py-3 align-top">
      <div>
        <div class="font-medium text-slate-800 mb-1">
          {{ order.customer_name }}
        </div>
        <div class="flex flex-col gap-0.5">
          <div v-if="order.customer_phone" class="text-[11px] text-slate-500 flex items-center gap-1">
            <span class="text-[10px]">📱</span> 
            {{ formatPhone(order.customer_phone) }}
          </div>
          <div v-if="order.customer_email" class="text-[11px] text-slate-500 flex items-center gap-1">
            <span class="text-[10px]">📧</span> 
            {{ truncateText(order.customer_email, 25) }}
          </div>
        </div>
      </div>
    </td>

    <!-- Address Column -->
    <td class="px-3 py-3 align-top">
      <div>
        <div class="font-medium text-slate-800 mb-0.5">
          {{ order.shipping_address }}
        </div>
        <div class="text-[11px] text-slate-500">
          <span v-if="order.shipping_commune" class="font-medium">
            {{ order.shipping_commune }}
          </span>
          <span v-if="order.shipping_city && order.shipping_city !== order.shipping_commune">
            , {{ order.shipping_city }}
          </span>
        </div>
      </div>
    </td>

    <!-- Status Column -->
    <td class="px-3 py-3 align-top">
      <div class="flex flex-col gap-1">
        <span 
          :class="[
            'px-2 py-1 rounded-md text-[11px] font-semibold text-center w-fit',
            getStatusClasses(order.status)
          ]"
        >
          {{ getStatusName(order.status) }}
        </span>
        
        <!-- Driver Info -->
        <div v-if="order.driver_info?.name" class="flex items-center gap-1 text-[10px] text-slate-500">
          <span class="text-[10px]">👨‍💼</span>
          <span class="font-medium">{{ order.driver_info.name }}</span>
        </div>
      </div>
    </td>

    <!-- Tracking Column -->
    <td class="px-3 py-3 align-top">
      <div class="flex flex-col gap-1 items-center">
        <!-- Delivered - Show Proof -->
        <div v-if="order.status === 'delivered' || order.status === 'invoiced'" class="flex flex-col items-center gap-0.5">
          <button 
            @click.stop="$emit('view-proof')" 
            class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded border-none text-[10px] font-semibold cursor-pointer transition-all duration-200 flex items-center gap-1 hover:-translate-y-0.5 hover:shadow-sm"
            title="Ver prueba de entrega"
          >
            📸 Prueba
          </button>
          <div class="flex items-center gap-0.5 text-[9px] text-slate-500">
            <span>✅</span>
            <span>Entregado</span>
          </div>
        </div>
        
        <!-- Tiene tracking disponible -->
        <div v-else-if="hasGeneralTracking || order.shipday_order_id" class="flex flex-col items-center gap-0.5">
          <button 
            @click.stop="$emit('view-tracking')" 
            class="px-2 py-1 bg-blue-100 text-blue-700 rounded border-none text-[10px] font-semibold cursor-pointer transition-all duration-200 flex items-center gap-1 hover:-translate-y-0.5 hover:shadow-sm"
            title="Ver seguimiento del pedido"
          >
            📍 Seguimiento
          </button>
          <div class="flex items-center gap-0.5 text-[9px] text-slate-500">
            <span>📦</span>
            <span>Disponible</span>
          </div>
        </div>
        
        <!-- No Tracking -->
        <div v-else class="flex flex-col items-center gap-0.5">
          <div class="flex flex-col items-center gap-0.5 text-gray-400 text-[10px]">
            <span>❓</span>
            <span>Sin info</span>
          </div>
        </div>
      </div>
    </td>

    <!-- Amount Column -->
    <td class="px-3 py-3 align-top text-right">
      <div>
        <div class="font-semibold text-slate-800 mb-0.5">
          ${{ formatCurrency(order.total_amount || order.shipping_cost) }}
        </div>
        <div v-if="order.shipping_cost && order.total_amount" class="text-[11px] text-slate-500">
          Envío: ${{ formatCurrency(order.shipping_cost) }}
        </div>
      </div>
    </td>

    <!-- Date Column -->
    <td class="px-3 py-3 align-top">
      <div class="flex flex-col gap-1">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-medium text-gray-600">Creado:</span>
          <span class="text-[11px] text-gray-700">{{ formatDate(order.order_date) }}</span>
        </div>
        <div v-if="order.delivery_date" class="flex flex-col gap-0.5">
          <span class="text-[10px] font-medium text-gray-600">Entrega:</span>
          <span class="text-[11px] text-gray-700">{{ formatDate(order.delivery_date) }}</span>
        </div>
        <div v-if="isUrgent" class="flex items-center gap-0.5 text-red-500 text-[9px] font-semibold">
          <span>⚡</span>
          <span>Urgente</span>
        </div>
      </div>
    </td>

    <!-- Actions Column -->
    <td class="px-3 py-3 align-top" @click.stop>
      <div class="flex gap-2 items-center">
        <!-- View Button -->
        <button 
          @click="$emit('view-details')" 
          class="text-xs px-3 py-1.5 rounded-md border border-blue-200 bg-white text-blue-600 cursor-pointer transition-all duration-200 hover:bg-blue-50"
          title="Ver detalles"
        >
          👁️
        </button>
        
        <!-- Ready Button -->
        <button 
          v-if="order.status === 'pending'" 
          @click="$emit('mark-ready')" 
          class="text-xs px-3 py-1.5 rounded-md border border-emerald-200 bg-white text-emerald-600 cursor-pointer transition-all duration-200 hover:bg-emerald-50"
          title="Marcar como listo"
        >
          ✔️
        </button>

        <!-- Dropdown Menu -->
        <div class="relative group">
          <button 
            class="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white text-slate-500 cursor-pointer transition-all duration-200 hover:bg-slate-50"
            title="Más opciones"
          >
            ⋮
          </button>
          
          <!-- Dropdown Items -->
          <div class="absolute top-full right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[160px] hidden group-hover:block">
            <button 
              v-if="hasLiveTracking" 
              @click="$emit('track-live')"
              class="flex items-center gap-2 w-full px-3 py-2 border-none bg-transparent text-slate-500 text-xs cursor-pointer transition-colors hover:bg-slate-50"
            >
              🚚 Tracking en Vivo
            </button>
            
            <button 
              v-if="hasGeneralTracking && order.status !== 'delivered'" 
              @click="$emit('view-tracking')"
              class="flex items-center gap-2 w-full px-3 py-2 border-none bg-transparent text-slate-500 text-xs cursor-pointer transition-colors hover:bg-slate-50"
            >
              📍 Ver Seguimiento
            </button>
            
            <button 
              v-if="hasProofOfDelivery" 
              @click="$emit('view-proof')"
              class="flex items-center gap-2 w-full px-3 py-2 border-none bg-transparent text-slate-500 text-xs cursor-pointer transition-colors hover:bg-slate-50"
            >
              📸 Prueba de Entrega
            </button>
            
            <button 
              v-if="canContactSupport" 
              @click="$emit('contact-support')"
              class="flex items-center gap-2 w-full px-3 py-2 border-none bg-transparent text-slate-500 text-xs cursor-pointer transition-colors hover:bg-slate-50"
            >
              💬 Contactar Soporte
            </button>
            
            <div class="h-px bg-slate-200 my-1"></div>
            
            <button 
              @click="copyOrderNumber"
              class="flex items-center gap-2 w-full px-3 py-2 border-none bg-transparent text-slate-500 text-xs cursor-pointer transition-colors hover:bg-slate-50"
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
  
  return props.order.status === 'pending' && daysDiff > 2
})

// Methods
function handleRowClick() {
  // Optional: emit row click for details view
}

function truncateText(text, maxLength) {
  if (!text) return 'N/A'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

function formatPhone(phone) {
  if (!phone) return ''
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
    failed: 'Entrega Fallida',
    out_for_delivery: 'En Entrega',
    delivered: 'Entregado',
    invoiced: 'Facturado',
    cancelled: 'Cancelado',
    warehouse_received: 'Recibido en Bodega'
  }
  return names[status] || status
}

function getStatusClasses(status) {
  const classes = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    ready_for_pickup: 'bg-purple-100 text-purple-800',
    shipped: 'bg-green-100 text-green-800',
    out_for_delivery: 'bg-yellow-100 text-yellow-800',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-800 font-bold',
    warehouse_received: 'bg-gray-100 text-gray-700',
    invoiced: 'bg-amber-50 text-amber-700'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

async function copyOrderNumber() {
  try {
    await navigator.clipboard.writeText(props.order.order_number)
  } catch (err) {
    console.error('Failed to copy order number:', err)
  }
}
</script>

<style scoped>
/* Responsive overrides solo para casos que Tailwind no cubre nativamente */
@media (max-width: 1024px) {
  td:nth-child(3) .flex.flex-col.gap-0\.5 {
    display: none;
  }
  
  td:nth-child(4) .text-\[11px\] {
    display: none;
  }
}

@media (max-width: 768px) {
  td:nth-child(3),
  td:nth-child(4) {
    display: none;
  }
  
  .flex.gap-2.items-center {
    flex-direction: column;
    gap: 0.25rem;
  }
}

@media (max-width: 480px) {
  td:nth-child(6) {
    display: none;
  }
  
  td {
    padding: 0.5rem 0.375rem;
  }
}

/* Animation para pulse effect */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-slow {
  animation: pulse 2s infinite;
}
</style>