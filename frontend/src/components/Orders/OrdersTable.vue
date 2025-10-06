<!-- frontend/src/components/Orders/OrdersTable.vue -->
<template>
  <div class="bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
    <!-- Bulk Actions Bar -->
    <div 
      v-if="selectedOrders.length > 0" 
      class="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b border-white/10 flex-shrink-0"
    >
      <div class="flex items-center gap-4">
        <span class="font-semibold text-sm">
          {{ selectedOrders.length }} pedido{{ selectedOrders.length !== 1 ? 's' : '' }} 
          seleccionado{{ selectedOrders.length !== 1 ? 's' : '' }}
        </span>
        <button 
          @click="$emit('clear-selection')" 
          class="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
        >
          ✕ Limpiar selección
        </button>
      </div>
      
      <div class="flex gap-3">
        <button 
          @click="$emit('generate-manifest')" 
          class="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 rounded-lg font-semibold text-sm backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          📋 Marcar como listos
        </button>
        
        <button 
          @click="$emit('generate-labels')" 
          :disabled="!canGenerateLabels"
          class="flex items-center gap-2 px-4 py-2.5 bg-purple-500/20 border border-purple-500/30 rounded-lg font-semibold text-sm backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          🏷️ Generar Etiquetas ({{ selectedOrders.length }})
        </button>
        
        <button 
          @click="$emit('bulk-export')" 
          class="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 rounded-lg font-semibold text-sm backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          📊 Exportar Selección
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 px-5 text-center">
      <div class="flex flex-col items-center gap-5">
        <div class="w-12 h-12 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-gray-500 text-base m-0">Cargando pedidos...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="py-20 px-5 text-center">
      <div class="max-w-md mx-auto">
        <div class="text-6xl mb-5 opacity-60">📦</div>
        <h3 class="text-2xl font-semibold text-gray-700 mb-3">No hay pedidos</h3>
        <p class="text-gray-500 text-base leading-relaxed mb-6">
          {{ emptyMessage || 'No se encontraron pedidos con los filtros actuales.' }}
        </p>
        <button 
          v-if="showCreateButton" 
          @click="$emit('create-order')" 
          class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300"
        >
          ➕ Crear Primer Pedido
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto min-h-[400px] bg-white">
      <table class="w-full border-collapse text-sm bg-white">
        <thead class="bg-slate-50 sticky top-0 z-10">
          <tr>
            <!-- Checkbox -->
            <th class="w-[60px] text-center px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap">
              <div class="flex flex-col items-center gap-1">
                <input 
                  type="checkbox" 
                  :checked="selectAllChecked"
                  :indeterminate="selectAllIndeterminate"
                  @change="$emit('toggle-select-all')"
                  class="w-4 h-4 cursor-pointer"
                />
                <span class="text-[10px] text-gray-500 font-medium">Todo</span>
              </div>
            </th>

            <!-- Pedido -->
            <th 
              @click="$emit('sort', 'order_number')"
              class="w-[140px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-all duration-200"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">Pedido</span>
                <span class="text-xs opacity-50 hover:opacity-100 transition-opacity duration-200">⇅</span>
              </div>
            </th>

            <!-- Cliente -->
            <th 
              @click="$emit('sort', 'customer_name')"
              class="w-[180px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-all duration-200"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">Cliente</span>
                <span class="text-xs opacity-50 hover:opacity-100 transition-opacity duration-200">⇅</span>
              </div>
            </th>

            <!-- Dirección -->
            <th class="w-[220px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap">
              <span class="font-semibold">Dirección</span>
            </th>

            <!-- Estado -->
            <th 
              @click="$emit('sort', 'status')"
              class="w-[140px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-all duration-200"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">Estado</span>
                <span class="text-xs opacity-50 hover:opacity-100 transition-opacity duration-200">⇅</span>
              </div>
            </th>

            <!-- Seguimiento -->
            <th class="w-[140px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap">
              <span class="font-semibold">Seguimiento</span>
            </th>

            <!-- Monto -->
            <th 
              @click="$emit('sort', 'total_amount')"
              class="w-[120px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-all duration-200"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">Monto</span>
                <span class="text-xs opacity-50 hover:opacity-100 transition-opacity duration-200">⇅</span>
              </div>
            </th>

            <!-- Fecha -->
            <th 
              @click="$emit('sort', 'order_date')"
              class="w-[120px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-all duration-200"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">Fecha</span>
                <span class="text-xs opacity-50 hover:opacity-100 transition-opacity duration-200">⇅</span>
              </div>
            </th>

            <!-- Acciones -->
            <th class="w-[140px] px-3 py-4 text-left font-semibold text-slate-600 border-b-2 border-slate-200 text-xs whitespace-nowrap">
              <span class="font-semibold">Acciones</span>
            </th>
          </tr>
        </thead>
        
        <tbody>
          <OrderTableRow
            v-for="order in orders"
            :key="order._id"
            :order="order"
            :selected="selectedOrders.includes(order._id)"
            :selectable="isOrderSelectable(order)"
            @toggle-selection="$emit('toggle-selection', order)"
            @view-details="$emit('view-details', order)"
            @mark-ready="$emit('mark-ready', order)"
            @track-live="$emit('track-live', order)"
            @view-tracking="$emit('view-tracking', order)"
            @view-proof="$emit('view-proof', order)"
            @contact-support="$emit('contact-support', order)"
            @generate-labels="$emit('generate-labels', order)"
          />
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex justify-between items-center px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200">
      <div class="flex items-center gap-4">
        <span class="text-gray-600 text-sm font-medium">
          Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
          de {{ pagination.total }} pedidos
        </span>
        
        <select 
          :value="pagination.limit" 
          @change="$emit('change-page-size', $event.target.value)"
          class="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 cursor-pointer transition-all duration-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="15">15 por página</option>
          <option value="25">25 por página</option>
          <option value="30">30 por página</option>
          <option value="50">50 por página</option>
        </select>
      </div>
      
      <div v-if="pagination.totalPages > 1" class="flex items-center gap-2">
        <button 
          @click="$emit('go-to-page', 1)" 
          :disabled="pagination.page <= 1"
          title="Primera página"
          class="flex items-center justify-center px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-xs font-medium min-w-[40px] cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          ⏮️
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.page - 1)" 
          :disabled="pagination.page <= 1"
          class="flex items-center justify-center px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-xs font-medium min-w-[40px] cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          ← Anterior
        </button>
        
        <div class="flex gap-1 mx-2">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="$emit('go-to-page', page)"
            :class="[
              'flex items-center justify-center w-10 h-10 border rounded-lg text-sm font-medium cursor-pointer transition-all duration-300',
              page === pagination.page
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5'
            ]"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="$emit('go-to-page', pagination.page + 1)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="flex items-center justify-center px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-xs font-medium min-w-[40px] cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Siguiente →
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.totalPages)" 
          :disabled="pagination.page >= pagination.totalPages"
          title="Última página"
          class="flex items-center justify-center px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-xs font-medium min-w-[40px] cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          ⏭️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import OrderTableRow from './OrderTableRow.vue'

const props = defineProps({
  orders: {
    type: Array,
    required: true
  },
  selectedOrders: {
    type: Array,
    default: () => []
  },
  selectAllChecked: {
    type: Boolean,
    default: false
  },
  selectAllIndeterminate: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    required: true,
    default: () => ({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1
    })
  },
  emptyMessage: {
    type: String,
    default: ''
  },
  showCreateButton: {
    type: Boolean,
    default: true
  }
})

defineEmits([
  'toggle-selection',
  'toggle-select-all',
  'clear-selection',
  'view-details',
  'mark-ready',
  'track-live',
  'view-tracking',
  'view-proof',
  'generate-labels',
  'contact-support',
  'bulk-mark-ready',
  'generate-manifest',
  'bulk-export',
  'create-order',
  'sort',
  'go-to-page',
  'change-page-size'
])

const canGenerateLabels = computed(() => {
  if (props.selectedOrders.length === 0) return false
  
  return props.selectedOrders.every(orderId => {
    const order = props.orders.find(o => o._id === orderId)
    return order && ['pending', 'ready_for_pickup','warehouse_received'].includes(order.status)
  })
})

const visiblePages = computed(() => {
  const current = props.pagination.page
  const total = props.pagination.totalPages
  const delta = 2
  
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)
  
  if (end - start < delta * 2) {
    if (start === 1) {
      end = Math.min(total, start + delta * 2)
    } else {
      start = Math.max(1, end - delta * 2)
    }
  }
  
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

function isOrderSelectable(order) {
  return !order.shipday_order_id && ['pending', 'ready_for_pickup', 'warehouse_received'].includes(order.status)
}
</script>

<style scoped>
/* Responsive overrides - solo para casos que Tailwind no cubre nativamente */
@media (max-width: 1024px) {
  .bg-gradient-to-r.from-blue-600 {
    padding: 1rem;
  }
  
  .flex.gap-3 {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }
  
  .flex.gap-3 > button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  table {
    min-width: 800px;
  }
  
  th:nth-child(3),
  th:nth-child(4) {
    display: none;
  }
  
  .flex.gap-1.mx-2 {
    display: none;
  }
  
  button[title="Primera página"],
  button[title="Última página"] {
    display: none;
  }
}

@media (max-width: 480px) {
  th:nth-child(6) {
    display: none;
  }
}

/* Print styles */
@media print {
  .bg-gradient-to-r {
    display: none !important;
  }
  
  .rounded-xl {
    box-shadow: none;
    border: 1px solid #000;
  }
  
  thead {
    background: #f5f5f5 !important;
    color: #000 !important;
  }
}
</style>