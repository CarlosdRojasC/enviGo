<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
    
    <!-- Loading State -->
    <div v-if="loading" class="p-12 text-center">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p class="text-gray-500 dark:text-gray-400">Cargando pedidos...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="p-12 text-center">
      <div class="flex flex-col items-center gap-3">
        <span class="text-6xl">📦</span>
        <p class="text-lg font-semibold text-gray-900 dark:text-white">No hay pedidos disponibles</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Intenta ajustar los filtros o crear un nuevo pedido</p>
        <button 
          @click="$emit('create-order')"
          class="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          ➕ Crear Pedido
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <!-- Checkbox -->
            <th class="px-4 py-3 text-center w-12">
              <input 
                type="checkbox" 
                :checked="selectAllChecked"
                :indeterminate.prop="selectAllIndeterminate"
                @change="$emit('select-all')"
                class="w-4 h-4 cursor-pointer"
              />
            </th>
            
            <!-- Pedido -->
            <th class="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" @click="$emit('sort', 'order_number')">
              <div class="flex items-center gap-2">
                <span>Pedido</span>
                <span class="text-xs opacity-50">⇅</span>
              </div>
            </th>
            
            <!-- Cliente -->
            <th class="px-4 py-3 text-left">Cliente</th>
            
            <!-- Dirección -->
            <th class="px-4 py-3 text-left hidden lg:table-cell">Dirección</th>
            
            <!-- Comuna -->
            <th class="px-4 py-3 text-left">Comuna</th>
            
            <!-- Monto -->
            <th class="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" @click="$emit('sort', 'total_amount')">
              <div class="flex items-center gap-2">
                <span>Monto</span>
                <span class="text-xs opacity-50">⇅</span>
              </div>
            </th>
            
            <!-- Estado -->
            <th class="px-4 py-3 text-left">Estado</th>
            
            <!-- Fecha -->
            <th class="px-4 py-3 text-left hidden md:table-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" @click="$emit('sort', 'order_date')">
              <div class="flex items-center gap-2">
                <span>Fecha</span>
                <span class="text-xs opacity-50">⇅</span>
              </div>
            </th>
            
            <!-- Tracking -->
            <th class="px-4 py-3 text-left hidden xl:table-cell">Tracking</th>
            
            <!-- Acciones -->
            <th class="px-4 py-3 text-center">Acciones</th>
          </tr>
        </thead>

        <tbody>
          <OrderTableRow
            v-for="order in orders"
            :key="order._id"
            :order="order"
            :is-selected="isOrderSelected(order)"
            @select="$emit('select-order', order._id)"
            @view-details="$emit('view-details', order)"
            @mark-ready="$emit('mark-ready', order)"
            @view-tracking="$emit('view-tracking', order)"
          />
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <!-- Info de resultados -->
          <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Mostrando {{ startItem }} a {{ endItem }} de {{ pagination.total }} pedidos
            </span>
            
            <div class="flex items-center gap-2">
              <label>Mostrar:</label>
              <select
                :value="pagination.limit"
                @change="$emit('page-size-change', Number($event.target.value))"
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
          </div>

          <!-- Controles de paginación -->
          <div class="flex items-center gap-2">
            <button 
              @click="$emit('page-change', 1)" 
              :disabled="pagination.page <= 1"
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Primera página"
            >
              ⏮️
            </button>

            <button 
              @click="$emit('page-change', pagination.page - 1)" 
              :disabled="pagination.page <= 1"
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ◀️
            </button>

            <div class="hidden sm:flex items-center gap-1">
              <button 
                v-for="page in visiblePages" 
                :key="page"
                @click="page !== '...' && $emit('page-change', page)"
                :disabled="page === '...'"
                class="px-3 py-1 border rounded-md text-sm transition-colors"
                :class="page === pagination.page 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
              >
                {{ page }}
              </button>
            </div>

            <button 
              @click="$emit('page-change', pagination.page + 1)" 
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ▶️
            </button>

            <button 
              @click="$emit('page-change', pagination.totalPages)" 
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Última página"
            >
              ⏭️
            </button>
          </div>

          <!-- Ir a página -->
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <label>Ir a:</label>
            <input 
              type="number" 
              :min="1" 
              :max="pagination.totalPages"
              :value="pagination.page"
              @keyup.enter="goToPage($event.target.value)"
              class="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-center"
            />
            <span>de {{ pagination.totalPages }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import OrderTableRow from './OrderTableRow.vue'

// Props
const props = defineProps({
  orders: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
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
  }
})

// Emits
const emit = defineEmits([
  'select-order',
  'select-all',
  'view-details',
  'mark-ready',
  'view-tracking',
  'page-change',
  'page-size-change',
  'sort',
  'create-order'
])

// Computed
const startItem = computed(() => {
  return Math.max(1, ((props.pagination.page - 1) * props.pagination.limit) + 1)
})

const endItem = computed(() => {
  return Math.min(props.pagination.page * props.pagination.limit, props.pagination.total)
})

const visiblePages = computed(() => {
  const current = props.pagination.page
  const total = props.pagination.totalPages
  const delta = 2

  const range = []
  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) {
    range.push(i)
  }

  if (current - delta > 2) {
    range.unshift('...')
  }
  if (current + delta < total - 1) {
    range.push('...')
  }

  range.unshift(1)
  if (total > 1) range.push(total)

  return range
})

// Methods
function isOrderSelected(order) {
  return props.selectedOrders.includes(order._id)
}

function goToPage(value) {
  const page = parseInt(value)
  if (page >= 1 && page <= props.pagination.totalPages) {
    emit('page-change', page)
  }
}
</script>