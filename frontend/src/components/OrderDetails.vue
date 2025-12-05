<template>
  <div v-if="order" class="space-y-6 p-2">
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-bold text-gray-800">Pedido #{{ order.order_number }}</h3>
          <p class="text-sm text-gray-500">ID Externo: {{ order.external_order_id }}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span :class="['px-3 py-1 text-sm font-semibold rounded-full', getStatusBadgeClass(order.status)]">
            {{ getStatusName(order.status) }}
          </span>
          <span v-if="order.priority" :class="getPriorityClasses(order.priority)">
            {{ order.priority }}
          </span>
        </div>
      </div>

      <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="flex items-start gap-3">
          <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
            <span class="material-icons">local_shipping</span>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conductor Asignado</p>
            <template v-if="order.driver_info || order.delivered_by_driver">
              <p class="font-medium text-gray-900">
                {{ order.driver_info?.name || order.delivered_by_driver?.driver_name || 'Sin nombre' }}
              </p>
              <p class="text-sm text-gray-600">
                {{ order.driver_info?.phone || order.delivered_by_driver?.driver_phone || 'Sin teléfono' }}
              </p>
              <p class="text-sm text-gray-600">
                {{ order.driver_info?.email || order.delivered_by_driver?.driver_email || '' }}
              </p>
            </template>
            <p v-else class="text-sm text-gray-400 italic">No asignado aún</p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="p-2 bg-purple-50 rounded-lg text-purple-600">
            <span class="material-icons">event</span>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Línea de Tiempo</p>
            <p class="text-sm text-gray-700">
              <span class="font-medium">Creado:</span> {{ formatDate(order.created_at) }}
            </p>
            <p v-if="order.pickup_time" class="text-sm text-gray-700">
              <span class="font-medium">Retirado:</span> {{ formatDate(order.pickup_time) }}
            </p>
            <p v-if="order.delivery_date" class="text-sm text-green-700 font-medium">
              <span class="font-medium">Entregado:</span> {{ formatDate(order.delivery_date) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h4 class="flex items-center gap-2 text-gray-800 font-semibold mb-3">
          <span class="material-icons text-gray-400">person</span>
          Datos del Cliente
        </h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between border-b border-gray-50 pb-2">
            <span class="text-gray-500">Nombre:</span>
            <span class="font-medium text-gray-900 text-right">{{ order.customer_name }}</span>
          </div>
          <div class="flex justify-between border-b border-gray-50 pb-2">
            <span class="text-gray-500">Email:</span>
            <span class="text-gray-900 text-right break-all">{{ order.customer_email || '-' }}</span>
          </div>
          <div class="flex justify-between border-b border-gray-50 pb-2">
            <span class="text-gray-500">Teléfono:</span>
            <span class="text-gray-900 text-right">{{ order.customer_phone || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Canal:</span>
            <span class="text-gray-900 text-right">{{ order.channel_id?.channel_name || 'Desconocido' }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 relative group hover:border-indigo-200 transition-colors">
        <div class="flex justify-between items-center mb-3">
          <h4 class="flex items-center gap-2 text-gray-800 font-semibold">
            <span class="material-icons text-gray-400">place</span>
            Dirección de Envío
          </h4>
          
          <button 
            v-if="['pending', 'warehouse_received', 'picked_up', 'ready_for_pickup'].includes(order.status)"
            @click="$emit('edit-order', order)"
            class="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
            title="Editar dirección y datos"
          >
            <span class="material-icons text-lg">edit</span>
          </button>
        </div>

        <div class="space-y-2 text-sm">
          <p class="font-medium text-gray-900 text-lg leading-snug">{{ order.shipping_address }}</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span class="px-2 py-1 bg-gray-100 rounded text-gray-600 text-xs font-medium border border-gray-200">
              {{ formatCommune(order.shipping_commune) }}
            </span>
            <span v-if="order.shipping_state" class="px-2 py-1 bg-gray-100 rounded text-gray-600 text-xs font-medium border border-gray-200">
              {{ order.shipping_state }}
            </span>
          </div>
          <p v-if="order.notes" class="mt-3 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-xs border border-yellow-100 flex gap-2 items-start">
            <span class="material-icons text-sm mt-0.5">sticky_note_2</span>
            <span><strong>Notas:</strong> {{ order.notes }}</span>
          </p>
        </div>
      </div>
    </div>

    <div v-if="order.proof_of_delivery || order.status === 'delivered'" class="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
      <div class="p-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
        <span class="material-icons text-green-600">verified</span>
        <h4 class="font-bold text-green-900">Prueba de Entrega (POD)</h4>
      </div>
      
      <div class="p-4" v-if="order.proof_of_delivery">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="flex flex-col">
            <span class="text-xs text-gray-500 uppercase font-bold">Recibido por</span>
            <span class="font-medium text-gray-900 flex items-center gap-2">
              <span class="material-icons text-gray-400 text-sm">person</span>
              {{ order.proof_of_delivery.recipient_name || 'No especificado' }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs text-gray-500 uppercase font-bold">Hora de Entrega</span>
            <span class="font-medium text-gray-900 flex items-center gap-2">
              <span class="material-icons text-gray-400 text-sm">schedule</span>
              {{ formatDate(order.proof_of_delivery.timestamp || order.delivery_date) }}
            </span>
          </div>
        </div>

        <div v-if="order.proof_of_delivery.photo_urls && order.proof_of_delivery.photo_urls.length > 0">
          <p class="text-xs text-gray-500 uppercase font-bold mb-2">Fotografías</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div 
              v-for="(photo, index) in order.proof_of_delivery.photo_urls" 
              :key="index"
              class="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
            >
              <img 
                :src="photo" 
                class="w-full h-full object-cover transition-transform hover:scale-105 cursor-pointer"
                @click="openImage(photo)"
                alt="Prueba de entrega"
              />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
            </div>
          </div>
        </div>

        <div v-if="order.proof_of_delivery.signature_url" class="mt-4">
          <p class="text-xs text-gray-500 uppercase font-bold mb-2">Firma Digital</p>
          <div class="p-2 bg-white border border-gray-200 rounded-lg inline-block">
            <img :src="order.proof_of_delivery.signature_url" class="h-24 w-auto object-contain opacity-90" alt="Firma" />
          </div>
        </div>
      </div>
      <div v-else class="p-8 text-center text-gray-500 italic">
        El pedido está marcado como entregado pero no hay detalles de prueba de entrega disponibles.
      </div>
    </div>

    <div class="bg-gray-50 rounded-xl border border-gray-200 p-4 flex justify-between items-center">
      <div>
        <span class="text-gray-500 text-sm font-medium">Monto Total</span>
        <p class="text-2xl font-bold text-indigo-600">{{ formatCurrency(order.total_amount) }}</p>
      </div>
      <div class="text-right">
        <span class="text-gray-500 text-sm font-medium">Costo Envío</span>
        <p class="text-lg font-semibold text-gray-700">{{ formatCurrency(order.shipping_cost) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// AGREGAMOS 'edit' A LOS EMITS
const emit = defineEmits(['edit-order'])

const props = defineProps({
  order: { type: Object, required: true }
})

function openImage(url) {
  window.open(url, '_blank');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'No disponible';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatCommune(commune) {
  if (Array.isArray(commune)) return commune.join(', ');
  return commune || 'No especificada';
}

function getStatusName(status) {
  const map = {
    pending: 'Pendiente',
    ready_for_pickup: 'Listo para retiro',
    picked_up: 'Retirado',
    warehouse_received: 'En Bodega',
    out_for_delivery: 'En Ruta',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    failed: 'Fallido',
    invoiced: 'Facturado'
  };
  return map[status] || status;
}

function getStatusBadgeClass(status) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    ready_for_pickup: 'bg-purple-100 text-purple-800',
    picked_up: 'bg-indigo-100 text-indigo-800',
    warehouse_received: 'bg-blue-100 text-blue-800',
    out_for_delivery: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800'
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityClasses(priority) {
  const p = priority?.toLowerCase();
  if (p === 'alta' || p === 'high') return 'px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800';
  return 'px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600';
}
</script>