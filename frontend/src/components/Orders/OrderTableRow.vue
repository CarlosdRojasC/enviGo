<template>
  <tr
    :data-order-id="order._id"
    class="group border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-150"
  >
    <!-- Selección -->
    <td class="px-4 py-3 text-center">
      <input
        type="checkbox"
        :checked="isSelected"
        @change="$emit('toggle-selection', order)"
        class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
    </td>

    <!-- Número de pedido -->
    <td class="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
      #{{ order.order_number }}
    </td>

    <!-- Cliente -->
    <td class="px-4 py-3 text-gray-700 truncate max-w-[180px]">
      {{ order.customer_name || '—' }}
    </td>

    <!-- Comuna -->
    <td class="px-4 py-3 text-gray-700 whitespace-nowrap">
      {{ order.shipping_commune || '—' }}
    </td>

    <!-- Estado -->
    <td class="px-4 py-3">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        :class="statusClasses(order.status)"
      >
        <component :is="statusIcon(order.status)" class="w-4 h-4" />
        {{ getStatusName(order.status) }}
      </span>
    </td>

    <!-- Monto -->
    <td class="px-4 py-3 text-gray-800 font-semibold">
      ${{ formatPrice(order.total_amount) }}
    </td>

    <!-- Acciones -->
    <td class="px-4 py-3 text-right">
      <div class="flex items-center justify-end gap-2">
        <!-- Ver detalles -->
        <button
          class="p-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition"
          @click="$emit('view-details', order)"
          title="Ver detalles"
        >
          <Info class="w-4 h-4" />
        </button>

        <!-- Tracking -->
        <button
          v-if="hasTracking(order)"
          class="p-2 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition"
          @click="$emit('view-tracking', order)"
          title="Ver tracking"
        >
          <Truck class="w-4 h-4" />
        </button>

        <!-- Prueba de entrega -->
        <button
          v-if="hasProof(order)"
          class="p-2 rounded-md hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition"
          @click="$emit('view-proof', order)"
          title="Ver prueba de entrega"
        >
          <Camera class="w-4 h-4" />
        </button>

        <!-- Marcar como listo -->
        <button
          v-if="order.status === 'pending'"
          class="p-2 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition"
          @click="$emit('mark-ready', order)"
          title="Marcar como listo"
        >
          <CheckCircle class="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { Info, Truck, Camera, CheckCircle, Clock, PackageCheck, Ban } from 'lucide-vue-next'

defineProps({
  order: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
})

defineEmits([
  'toggle-selection',
  'view-details',
  'view-tracking',
  'view-proof',
  'mark-ready',
])

// ============================
// Métodos de apoyo
// ============================

function formatPrice(amount) {
  if (!amount && amount !== 0) return '—'
  return new Intl.NumberFormat('es-CL').format(amount)
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    ready_for_pickup: 'Listo para Retiro',
    warehouse_received: 'En Bodega',
    processing: 'Procesando',
    shipped: 'En Ruta',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }
  return names[status] || status
}

function statusClasses(status) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    case 'ready_for_pickup':
      return 'bg-sky-50 text-sky-700 border border-sky-200'
    case 'processing':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 'shipped':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200'
  }
}

function statusIcon(status) {
  switch (status) {
    case 'pending':
      return Clock
    case 'ready_for_pickup':
      return PackageCheck
    case 'shipped':
      return Truck
    case 'delivered':
      return CheckCircle
    case 'cancelled':
      return Ban
    default:
      return Clock
  }
}

// Simples validadores para mostrar iconos solo si hay info disponible
function hasTracking(order) {
  return !!(
    order.shipday_tracking_url ||
    order.shipday_order_id ||
    ['processing', 'shipped'].includes(order.status)
  )
}

function hasProof(order) {
  return !!(
    order.proof_of_delivery?.photo_url ||
    order.proof_of_delivery?.signature_url ||
    order.podUrls?.length > 0
  )
}
</script>
