<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
    <!-- Acciones rápidas -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2">
        <button
          @click="$emit('refresh')"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span class="material-icons text-base">refresh</span>
          <span>Actualizar</span>
        </button>

        <button
          v-if="selectedOrders.length > 0"
          @click="$emit('bulk-assign')"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span class="material-icons text-base">person_add</span>
          <span>Asignar ({{ selectedOrders.length }})</span>
        </button>
      </div>

      <div class="flex gap-2">
        <button
          @click="$emit('bulk-export')"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <span class="material-icons text-base">file_download</span>
          <span>Exportar</span>
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <th class="p-4 text-left w-10">
              <input
                type="checkbox"
                :checked="selectAllChecked"
                :indeterminate.prop="selectAllIndeterminate"
                @change="$emit('select-all')"
                class="rounded text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th class="p-4 text-left">Pedido</th>
            <th class="p-4 text-left">Cliente</th>
            <th class="p-4 text-left hidden lg:table-cell">Dirección</th>
            <th class="p-4 text-left">Estado</th>
            <th class="p-4 text-left hidden md:table-cell">Tracking</th>
            <th class="p-4 text-left">Monto</th>
            <th class="p-4 text-left hidden md:table-cell">Fecha</th>
            <th class="p-4 text-center">Acciones</th>
          </tr>
        </thead>

        <tbody v-if="!loading && orders.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
          <OrderTableRow
            v-for="order in orders"
            :key="order._id"
            :order="order"
            :selected="isOrderSelected(order)"
            @toggle-selection="$emit('select-order', order)"
            @view-details="$emit('view-details', order)"
            @mark-ready="$emit('mark-ready', order)"
            @view-tracking="$emit('view-tracking', order)"
          />
        </tbody>

        <!-- Estado cargando -->
        <tbody v-else-if="loading">
          <tr>
            <td colspan="9" class="p-12 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p class="text-gray-500 dark:text-gray-400">Cargando pedidos...</p>
              </div>
            </td>
          </tr>
        </tbody>

        <!-- Estado vacío -->
        <tbody v-else>
          <tr>
            <td colspan="9" class="p-12 text-center">
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Mostrando {{ startItem }} a {{ endItem }} de {{ pagination.total }} pedidos
          </span>

          <div class="flex items-center gap-2">
            <label>Mostrar:</label>
            <select
              :value="pagination.limit"
              @change="$emit('page-size-change', Number($event.target.value))"
              class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>por página</span>
          </div>
        </div>

        <!-- Controles de paginación -->
        <div class="flex items-center gap-1">
          <button
            @click="$emit('page-change', 1)"
            :disabled="pagination.page <= 1"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            ⏮️
          </button>

          <button
            @click="$emit('page-change', pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            ◀️
          </button>

          <template v-for="page in visiblePages" :key="page">
            <button
              @click="$emit('page-change', page)"
              :class="[
                'px-3 py-1 rounded-md text-sm',
                page === pagination.page
                  ? 'bg-indigo-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              ]"
            >
              {{ page }}
            </button>
          </template>

          <button
            @click="$emit('page-change', pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            ▶️
          </button>

          <button
            @click="$emit('page-change', pagination.totalPages)"
            :disabled="pagination.page >= pagination.totalPages"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            ⏭️
          </button>
        </div>

        <div class="flex items-center gap-2 text-sm">
          <label>Ir a página:</label>
          <input
            type="number"
            :min="1"
            :max="pagination.totalPages"
            :value="pagination.page"
            @keyup.enter="goToPage($event.target.value)"
            class="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center"
          />
          <span>de {{ pagination.totalPages }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import OrderTableRow from './OrderTableRow.vue'

const props = defineProps({
  orders: Array,
  loading: Boolean,
  pagination: Object,
  selectedOrders: Array,
  selectAllChecked: Boolean,
  selectAllIndeterminate: Boolean
})

const emit = defineEmits([
  'select-order', 'select-all', 'view-details', 'mark-ready',
  'view-tracking', 'page-change', 'page-size-change',
  'bulk-assign', 'bulk-export', 'refresh', 'create-order'
])

const startItem = computed(() => Math.max(1, ((props.pagination.page - 1) * props.pagination.limit) + 1))
const endItem = computed(() => Math.min(props.pagination.page * props.pagination.limit, props.pagination.total))

const visiblePages = computed(() => {
  const current = props.pagination.page
  const total = props.pagination.totalPages
  const delta = 2
  const range = []
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i)
  if (current - delta > 2) range.unshift('...')
  if (current + delta < total - 1) range.push('...')
  range.unshift(1)
  if (total > 1) range.push(total)
  return range
})

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
