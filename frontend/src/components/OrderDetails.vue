<template>
  <div v-if="order" class="text-sm">
    <div class="grid grid-cols-2 gap-4">
      <!-- Header: Información del Cliente -->
      <div class="col-span-2 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-md">
        <h4 class="m-0 text-indigo-900 text-sm font-semibold">Información del Cliente</h4>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Cliente:</span>
        <span class="text-gray-600">{{ order.customer_name }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Email:</span>
        <span class="text-gray-600">{{ order.customer_email || 'No disponible' }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Teléfono:</span>
        <span class="text-gray-600">{{ order.customer_phone || 'No disponible' }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Documento:</span>
        <span class="text-gray-600">{{ order.customer_document || 'No disponible' }}</span>
      </div>
      
      <!-- Header: Dirección de Envío -->
      <div class="col-span-2 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-md">
        <h4 class="m-0 text-indigo-900 text-sm font-semibold">Dirección de Envío</h4>
      </div>
      
      <div class="col-span-2 flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Dirección:</span>
        <span class="text-gray-600">{{ order.shipping_address || 'No especificada' }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Comuna:</span>
        <span class="bg-blue-100 px-2 py-1 rounded font-semibold text-blue-900">
          {{ formatCommune(order.shipping_commune) }}
        </span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Región:</span>
        <span class="text-gray-600">{{ order.shipping_state || 'Región Metropolitana' }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Código Postal:</span>
        <span class="text-gray-600">{{ order.shipping_zip || 'No especificado' }}</span>
      </div>
      
      <!-- Header: Detalles del Pedido -->
      <div class="col-span-2 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-md">
        <h4 class="m-0 text-indigo-900 text-sm font-semibold">Detalles del Pedido</h4>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Canal de Venta:</span>
        <span class="text-gray-600">{{ order.channel_id?.channel_name }} ({{ order.channel_id?.channel_type }})</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">ID Externo:</span>
        <span class="text-gray-600">{{ order.external_order_id }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Monto Total:</span>
        <span class="text-gray-600">${{ formatCurrency(order.total_amount) }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Costo de Envío:</span>
        <span class="text-gray-600">${{ formatCurrency(order.shipping_cost) }}</span>
      </div>
      
      <div class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Fecha de Creación:</span>
        <span class="text-gray-600">{{ formatDate(order.order_date) }}</span>
      </div>
      
      <div v-if="order.delivery_date" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Fecha de Entrega:</span>
        <span class="text-gray-600">{{ formatDate(order.delivery_date) }}</span>
      </div>

      <!-- Información de Logística -->
      <template v-if="hasLogisticsInfo">
        <div class="col-span-2 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-md">
          <h4 class="m-0 text-indigo-900 text-sm font-semibold">Información de Logística</h4>
        </div>
        
        <div v-if="order.priority" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
          <span class="font-semibold text-gray-700 mb-1 text-xs">Prioridad:</span>
          <span :class="getPriorityClasses(order.priority)">{{ order.priority }}</span>
        </div>
        
        <div v-if="order.serviceTime" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
          <span class="font-semibold text-gray-700 mb-1 text-xs">Tiempo de Servicio:</span>
          <span class="text-gray-600">{{ order.serviceTime }} minutos</span>
        </div>
        
        <div v-if="order.timeWindowStart || order.timeWindowEnd" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
          <span class="font-semibold text-gray-700 mb-1 text-xs">Ventana Horaria:</span>
          <span class="text-gray-600">{{ formatTimeWindow(order.timeWindowStart, order.timeWindowEnd) }}</span>
        </div>
        
        <div v-if="order.load1Packages" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
          <span class="font-semibold text-gray-700 mb-1 text-xs">N° Paquetes:</span>
          <span class="text-gray-600">{{ order.load1Packages }}</span>
        </div>
        
        <div v-if="order.load2WeightKg" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
          <span class="font-semibold text-gray-700 mb-1 text-xs">Peso Total:</span>
          <span class="text-gray-600">{{ order.load2WeightKg }} kg</span>
        </div>
      </template>

      <!-- Información de Shipday -->
      <template v-if="hasShipdayInfo">
        <div class="col-span-2 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-md">
          <h4 class="m-0 text-indigo-900 text-sm font-semibold">Estado en Shipday</h4>
        </div>
        
        <div v-if="order.shipday_order_id" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
          <span class="font-semibold text-gray-700 mb-1 text-xs">ID en Shipday:</span>
          <span class="font-mono bg-gray-100 px-2 py-1 rounded text-[11px]">{{ order.shipday_order_id }}</span>
        </div>
        
        <div v-if="order.shipday_driver_id" class="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
          <span class="font-semibold text-gray-700 mb-1 text-xs">Conductor Asignado:</span>
          <span class="bg-emerald-100 px-2 py-1 rounded font-semibold text-emerald-900">
            🚚 {{ order.driver_info?.name || 'Conductor asignado' }}
          </span>
        </div>
      </template>

      <!-- Notas -->
      <div class="col-span-2 flex flex-col bg-gray-50 p-3 rounded-md border border-gray-200">
        <span class="font-semibold text-gray-700 mb-1 text-xs">Notas:</span>
        <span class="text-gray-600">{{ order.notes || 'Sin notas.' }}</span>
      </div>
    </div>
  </div>
  
  <div v-else class="text-center py-10 text-gray-500">
    Cargando detalles del pedido...
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  order: { type: Object, default: null }
});

const hasLogisticsInfo = computed(() => {
  return props.order && (
    props.order.priority || 
    props.order.serviceTime || 
    props.order.timeWindowStart || 
    props.order.timeWindowEnd || 
    props.order.load1Packages || 
    props.order.load2WeightKg
  );
});

const hasShipdayInfo = computed(() => {
  return props.order && (
    props.order.shipday_order_id || 
    props.order.shipday_driver_id
  );
});

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'No disponible';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCommune(commune) {
  if (!commune) return 'No especificada'
  
  if (Array.isArray(commune)) {
    return commune.length > 0 ? commune.join(', ') : 'No especificada'
  }
  
  if (typeof commune === 'string') {
    return commune.trim() || 'No especificada'
  }
  
  return String(commune) || 'No especificada'
}

function getPriorityClasses(priority) {
  const priorityLower = priority?.toLowerCase();
  
  if (priorityLower === 'alta' || priorityLower === 'high') {
    return 'bg-red-100 text-red-900 px-1.5 py-0.5 rounded font-semibold';
  }
  if (priorityLower === 'baja' || priorityLower === 'low') {
    return 'bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded';
  }
  return 'bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded';
}

function formatTimeWindow(start, end) {
  if (!start && !end) return 'No especificada';
  if (start && end) return `${start} - ${end}`;
  if (start) return `Desde ${start}`;
  if (end) return `Hasta ${end}`;
  return 'No especificada';
}
</script>

<style scoped>
/* Solo responsive overrides */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
  
  .col-span-2 {
    grid-column: span 1;
  }
}
</style>