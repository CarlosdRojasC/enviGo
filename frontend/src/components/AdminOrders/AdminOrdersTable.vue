<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
    <!-- Acciones Rápidas -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex flex-wrap items-center justify-between gap-3">
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

          <button
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span class="material-icons text-base">assessment</span>
            <span>Reportes</span>
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
    </div>

    <!-- Tabla -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <th class="p-4 text-left">
              <input
                type="checkbox"
                :checked="selectAllChecked"
                :indeterminate="selectAllIndeterminate"
                @change="$emit('select-all')"
                class="rounded text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th class="p-4 text-left">Pedido</th>
            <th class="p-4 text-left">Empresa</th>
            <th class="p-4 text-left">Cliente</th>
            <th class="p-4 text-left">Dirección</th>
            <th class="p-4 text-left">Comuna</th>
            <th class="p-4 text-left">Monto</th>
            <th class="p-4 text-left">Estado</th>
            <th class="p-4 text-left">Fechas</th>
            <th class="p-4 text-left">Conductor</th>
            <th class="p-4 text-left">Acciones</th>
          </tr>
        </thead>
        
        <tbody v-if="!loading && orders.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="order in orders"
            :key="order.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <!-- Checkbox -->
            <td class="p-4">
              <input
                type="checkbox"
                :checked="selectedOrders.includes(order.id)"
                @change="$emit('select-order', order.id)"
                class="rounded text-indigo-600 focus:ring-indigo-500"
              />
            </td>
            
            <!-- Pedido -->
            <td class="p-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ order.order_number || order.id }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ID: {{ order.id }}
              </div>
            </td>
            
            <!-- Empresa -->
            <td class="p-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ getCompanyName(order.company_id) }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ order.channel?.name || 'Sin canal' }}
              </div>
            </td>
            
            <!-- Cliente -->
            <td class="p-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ order.customer_name }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ order.customer_email }}
              </div>
            </td>
            
            <!-- Dirección -->
            <td class="p-4">
              <div class="text-gray-900 dark:text-white">
                {{ order.address }}
              </div>
              <div v-if="order.address_reference" class="text-xs text-gray-500 dark:text-gray-400">
                {{ order.address_reference }}
              </div>
            </td>
            
            <!-- Comuna -->
            <td class="p-4">
              <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {{ order.commune }}
              </span>
            </td>
            
            <!-- Monto -->
            <td class="p-4">
              <span class="font-semibold text-indigo-600 dark:text-indigo-400">
                ${{ formatNumber(order.total_amount) }}
              </span>
            </td>
            
            <!-- Estado -->
            <td class="p-4">
              <span
                :class="getStatusBadgeClass(order.status)"
                class="px-3 py-1 text-xs font-semibold rounded-full"
              >
                {{ getStatusLabel(order.status) }}
              </span>
            </td>
            
            <!-- Fechas -->
            <td class="p-4">
              <div class="text-xs">
                <div class="text-gray-900 dark:text-white">
                  Creado: {{ formatDate(order.created_at) }}
                </div>
                <div class="text-gray-500 dark:text-gray-400">
                  Act: {{ formatDate(order.updated_at) }}
                </div>
              </div>
            </td>
            
            <!-- Conductor -->
            <td class="p-4">
              <div v-if="order.driver" class="text-sm">
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ order.driver.name }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ order.driver.vehicle_plate }}
                </div>
              </div>
              <span v-else class="text-xs text-gray-500 dark:text-gray-400">
                Sin asignar
              </span>
            </td>
            
            <!-- Acciones -->
            <td class="p-4">
              <div class="flex items-center gap-1">
                <button
                  @click="$emit('view-details', order)"
                  class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Ver detalles"
                >
                  <span class="material-icons text-base">visibility</span>
                </button>
                
                <button
                  @click="$emit('edit-order', order)"
                  class="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                  title="Editar"
                >
                  <span class="material-icons text-base">edit</span>
                </button>
                
                <button
                  @click="$emit('assign-driver', order)"
                  class="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                  title="Asignar conductor"
                >
                  <span class="material-icons text-base">person_add</span>
                </button>

                <button
                  @click="$emit('delete-order', order)"
                  class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <span class="material-icons text-base">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
        
        <!-- Loading State -->
        <tbody v-else-if="loading">
          <tr>
            <td colspan="11" class="p-12 text-center">
              <div class="flex flex-col items-center gap-3">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p class="text-gray-500 dark:text-gray-400">Cargando pedidos...</p>
              </div>
            </td>
          </tr>
        </tbody>
        
        <!-- Empty State -->
        <tbody v-else>
          <tr>
            <td colspan="11" class="p-12 text-center">
              <div class="flex flex-col items-center gap-3">
                <span class="material-icons text-6xl text-gray-300 dark:text-gray-600">
                  inventory_2
                </span>
                <p class="text-gray-500 dark:text-gray-400">No se encontraron pedidos</p>
                <button
                  @click="$emit('reset-filters')"
                  class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                >
                  Limpiar filtros
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <span class="text-sm text-gray-600 dark:text-gray-400">
        Mostrando {{ pagination.from }}-{{ pagination.to }} de {{ pagination.total }} resultados
      </span>
      
      <div class="flex items-center gap-2">
        <button
          @click="$emit('go-to-page', pagination.current_page - 1)"
          :disabled="pagination.current_page === 1"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span class="material-icons">chevron_left</span>
        </button>
        
        <template v-for="page in paginationPages" :key="page">
          <button
            v-if="page !== '...'"
            @click="$emit('go-to-page', page)"
            :class="[
              'px-4 py-2 text-sm rounded-lg transition-colors',
              page === pagination.current_page
                ? 'bg-indigo-600 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            ]"
          >
            {{ page }}
          </button>
          <span v-else class="px-2 text-gray-500 dark:text-gray-400">...</span>
        </template>
        
        <button
          @click="$emit('go-to-page', pagination.current_page + 1)"
          :disabled="pagination.current_page === pagination.last_page"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span class="material-icons">chevron_right</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  orders: {
    type: Array,
    default: () => []
  },
  companies: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    default: () => ({
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
      total: 0
    })
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

const emit = defineEmits([
  'select-order',
  'select-all',
  'view-details',
  'edit-order',
  'assign-driver',
  'delete-order',
  'refresh',
  'bulk-assign',
  'bulk-export',
  'go-to-page',
  'reset-filters'
])

// Computed
const paginationPages = computed(() => {
  const pages = []
  const current = props.pagination.current_page
  const last = props.pagination.last_page
  
  if (last <= 7) {
    for (let i = 1; i <= last; i++) pages.push(i)
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...')
      pages.push(last)
    } else if (current >= last - 2) {
      pages.push(1)
      pages.push('...')
      for (let i = last - 3; i <= last; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(last)
    }
  }
  
  return pages
})

// Methods
function getCompanyName(companyId) {
  const company = props.companies.find(c => c.id === companyId)
  return company?.name || 'N/A'
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-CL').format(value || 0)
}

function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Pendiente',
    ready: 'Listo',
    assigned: 'Asignado',
    in_transit: 'En tránsito',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  }
  return labels[status] || status
}

function getStatusBadgeClass(status) {
  const classes = {
    pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    ready: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    assigned: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    in_transit: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
    delivered: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    cancelled: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  }
  return classes[status] || 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
}
</script>

<style scoped>
.material-icons {
  font-size: 1.25rem;
}
</style>