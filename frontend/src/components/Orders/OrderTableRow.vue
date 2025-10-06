<template>
  <tr
    class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    :class="{
      'bg-indigo-50 dark:bg-indigo-900/20': selected,
      'bg-green-50 dark:bg-green-900/10': order.status === 'delivered',
      'bg-yellow-50 dark:bg-yellow-900/10': order.status === 'pending',
      'bg-red-50 dark:bg-red-900/10': isUrgent
    }"
  >
    <!-- Checkbox -->
    <td class="p-4 text-center">
      <input
        type="checkbox"
        :checked="selected"
        :disabled="!selectable"
        @change="$emit('toggle-selection')"
        class="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </td>

    <!-- Pedido -->
    <td class="p-4">
      <div class="font-medium text-gray-900 dark:text-white">
        #{{ order.order_number }}
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        ID: {{ order._id?.slice(-6) || 'N/A' }}
      </div>
      <div v-if="order.external_order_id" class="text-xs text-gray-500 dark:text-gray-400">
        Ext: {{ order.external_order_id.slice(-8) }}
      </div>
    </td>

    <!-- Cliente -->
    <td class="p-4">
      <div class="font-medium text-gray-900 dark:text-white">{{ order.customer_name }}</div>
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1 mt-1">
        <div v-if="order.customer_email" class="flex items-center gap-1">
          <span class="material-icons text-xs">email</span>
          {{ truncateText(order.customer_email, 25) }}
        </div>
        <div v-if="order.customer_phone" class="flex items-center gap-1">
          <span class="material-icons text-xs">phone</span>
          {{ formatPhone(order.customer_phone) }}
        </div>
      </div>
    </td>

    <!-- Dirección -->
    <td class="p-4 hidden lg:table-cell">
      <div class="text-gray-900 dark:text-white">{{ order.shipping_address }}</div>
      <div v-if="order.shipping_commune" class="text-xs text-gray-500 dark:text-gray-400">
        {{ order.shipping_commune }}
      </div>
    </td>

    <!-- Estado -->
    <td class="p-4">
      <span
        class="px-3 py-1 text-xs font-semibold rounded-full"
        :class="getStatusBadgeClass(order.status)"
      >
        {{ getStatusName(order.status) }}
      </span>
      <div
        v-if="order.driver_info?.name"
        class="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
      >
        <span class="material-icons text-xs">local_shipping</span>
        {{ order.driver_info.name }}
      </div>
    </td>

    <!-- Tracking -->
    <td class="p-4 hidden md:table-cell text-center">
      <template v-if="order.status === 'delivered' || order.status === 'invoiced'">
        <button
          @click.stop="$emit('view-proof')"
          class="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-800 transition"
          title="Ver prueba de entrega"
        >
          📸 Prueba
        </button>
      </template>

      <template v-else-if="hasGeneralTracking || order.shipday_order_id">
        <button
          @click.stop="$emit('view-tracking', order)"
          class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-800 transition"
          title="Ver seguimiento"
        >
          📍 Seguimiento
        </button>
      </template>

      <template v-else>
        <span
          class="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-semibold"
        >
          ❓ Sin info
        </span>
      </template>
    </td>

    <!-- Monto -->
    <td class="p-4 text-right">
      <div class="font-semibold text-indigo-600 dark:text-indigo-400">
        {{ formatCurrency(order.total_amount || 0) }}
      </div>
      <div v-if="order.shipping_cost" class="text-xs text-gray-500 dark:text-gray-400">
        Envío: {{ formatCurrency(order.shipping_cost) }}
      </div>
    </td>

    <!-- Fechas -->
    <td class="p-4 hidden md:table-cell">
      <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div><span class="font-semibold">Creado:</span> {{ formatDate(order.order_date) }}</div>
        <div v-if="order.delivery_date">
          <span class="font-semibold">Entrega:</span> {{ formatDate(order.delivery_date) }}
        </div>
        <div v-if="isUrgent" class="text-red-500 font-semibold flex items-center gap-1">
          ⚡ Urgente
        </div>
      </div>
    </td>

    <!-- Acciones -->
    <td class="p-4 text-center">
      <div class="flex items-center justify-center gap-2">
        <!-- Ver -->
        <button
          @click="$emit('view-details')"
          class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
          title="Ver detalles"
        >
          <span class="material-icons text-base">visibility</span>
        </button>

        <!-- Listo -->
        <button
          v-if="order.status === 'pending'"
          @click="$emit('mark-ready')"
          class="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
          title="Marcar como listo"
        >
          <span class="material-icons text-base">check_circle</span>
        </button>

        <!-- Más opciones -->
        <div class="relative group">
          <button
            class="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Más acciones"
          >
            <span class="material-icons text-base">more_vert</span>
          </button>

          <!-- Dropdown -->
          <div
            class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10"
          >
            <button
              v-if="hasLiveTracking"
              @click="$emit('track-live')"
              class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              🚚 Tracking en Vivo
            </button>

            <button
              v-if="hasGeneralTracking && order.status !== 'delivered'"
              @click="$emit('view-tracking')"
              class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              📍 Ver Seguimiento
            </button>

            <button
              v-if="hasProofOfDelivery"
              @click="$emit('view-proof', order)"
              class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              📸 Prueba de Entrega
            </button>

            <button
              v-if="canContactSupport"
              @click="$emit('contact-support')"
              class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              💬 Contactar Soporte
            </button>

            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>

            <button
              @click="copyOrderNumber"
              class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
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
  order: Object,
  selected: Boolean,
  selectable: Boolean
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

const hasLiveTracking = computed(() =>
  props.order.shipday_tracking_url ||
  (props.order.status === 'shipped' && props.order.shipday_order_id)
)

const hasGeneralTracking = computed(() =>
  props.order.status !== 'delivered' &&
  (props.order.shipday_driver_id ||
    props.order.shipday_order_id ||
    ['processing', 'shipped'].includes(props.order.status))
)

const hasProofOfDelivery = computed(() => {
  if (props.order.status !== 'delivered') return false
  return (
    props.order.proof_of_delivery?.photo_url ||
    props.order.proof_of_delivery?.signature_url ||
    props.order.podUrls?.length > 0 ||
    props.order.signatureUrl ||
    props.order.shipday_order_id
  )
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

// ========== Utility Methods ==========
function truncateText(text, maxLength) {
  return text?.length > maxLength ? text.slice(0, maxLength) + '…' : text
}
function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 9
    ? `+56 ${cleaned.substring(0, 1)} ${cleaned.substring(1, 5)} ${cleaned.substring(5)}`
    : phone
}
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount || 0)
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
    warehouse_received: 'Bodega'
  }
  return names[status] || status
}
function getStatusBadgeClass(status) {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    ready_for_pickup: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    invoiced: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
  }
  return classes[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

async function copyOrderNumber() {
  try {
    await navigator.clipboard.writeText(props.order.order_number)
  } catch (err) {
    console.error('Error copiando número de pedido:', err)
  }
}
</script>
