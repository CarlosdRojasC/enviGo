<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
    <!-- Acciones Rápidas -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <button
            @click="handleRefresh"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span class="material-icons text-base">refresh</span>
            <span>Actualizar</span>
          </button>

          <button
            v-if="selectedOrders.length > 0"
            @click="handleBulkAssign"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span class="material-icons text-base">person_add</span>
            <span>Asignar ({{ selectedOrders.length }})</span>
          </button>

          <button
            @click="handleReports"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span class="material-icons text-base">assessment</span>
            <span>Reportes</span>
          </button>
        </div>

        <div class="flex gap-2">
          <button
            @click="handleBulkExport"
            :disabled="selectedOrders.length === 0"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <span class="material-icons text-base">file_download</span>
            <span>Exportar {{ selectedOrders.length > 0 ? `(${selectedOrders.length})` : '' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <th class="p-4 text-left">
              <input
                type="checkbox"
                :checked="selectAllChecked"
                :indeterminate.prop="selectAllIndeterminate"
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
            <th class="p-4 text-left">Shipday</th>
            <th class="p-4 text-left">Acciones</th>
          </tr>
        </thead>
        
        <tbody v-if="!loading && orders.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="order in orders"
            :key="order._id"
            class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            :class="{ 'bg-indigo-50 dark:bg-indigo-900/20': isOrderSelected(order) }"
          >
            <!-- Checkbox -->
            <td class="p-4">
              <input
                type="checkbox"
                :checked="isOrderSelected(order)"
                @change="$emit('select-order', order)"
                class="rounded text-indigo-600 focus:ring-indigo-500"
              />
            </td>
            
            <!-- Pedido -->
            <td class="p-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ order.order_number }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ID: {{ order._id.slice(-6) }}
              </div>
              <div v-if="order.external_order_id" class="text-xs text-gray-500 dark:text-gray-400">
                Ext: {{ order.external_order_id.slice(-8) }}
              </div>
            </td>
            
            <!-- Empresa -->
            <td class="p-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ getCompanyName(order.company_id) }}
              </div>
              <div v-if="order.channel_id" class="text-xs text-gray-500 dark:text-gray-400">
                Canal: {{ getChannelName(order.channel_id) }}
              </div>
            </td>
            
            <!-- Cliente -->
            <td class="p-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ order.customer_name }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div v-if="order.customer_email" class="flex items-center gap-1">
                  <span class="material-icons text-xs">email</span>
                  {{ order.customer_email }}
                </div>
                <div v-if="order.customer_phone" class="flex items-center gap-1">
                  <span class="material-icons text-xs">phone</span>
                  {{ order.customer_phone }}
                </div>
              </div>
            </td>
            
            <!-- Dirección -->
            <td class="p-4">
              <div class="text-gray-900 dark:text-white">
                {{ order.shipping_address }}
              </div>
              <div v-if="order.shipping_state" class="text-xs text-gray-500 dark:text-gray-400">
                {{ order.shipping_state }}
              </div>
            </td>
            
            <!-- Comuna -->
            <td class="p-4">
              <span 
                v-if="order.shipping_commune"
                :class="[
                  'px-3 py-1 text-xs font-semibold rounded-full',
                  getCommuneClass(order.shipping_commune)
                ]"
              >
                {{ order.shipping_commune }}
              </span>
              <span v-else class="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                Sin comuna
              </span>
            </td>
            
            <!-- Monto -->
            <td class="p-4">
              <div class="font-semibold text-indigo-600 dark:text-indigo-400">
                {{ formatCurrency(order.total_amount) }}
              </div>
              <div v-if="order.shipping_cost" class="text-xs text-gray-500 dark:text-gray-400">
                Envío: {{ formatCurrency(order.shipping_cost) }}
              </div>
            </td>
            
            <!-- Estado -->
            <td class="p-4">
              <span
                :class="[
                  'px-3 py-1 text-xs font-semibold rounded-full',
                  getStatusBadgeClass(order.status)
                ]"
              >
                {{ getStatusName(order.status) }}
              </span>
              <div v-if="order.priority && order.priority !== 'Normal'" class="mt-1">
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                  🔥 {{ order.priority }}
                </span>
              </div>
            </td>
            
            <!-- Fechas -->
            <td class="p-4">
              <div class="text-xs space-y-1">
                <div class="text-gray-900 dark:text-white">
                  <span class="text-gray-500 dark:text-gray-400">Creado:</span>
                  {{ formatDate(order.created_at) }}
                </div>
                <div v-if="order.updated_at !== order.created_at" class="text-gray-500 dark:text-gray-400">
                  <span>Actualizado:</span>
                  {{ formatDate(order.updated_at) }}
                </div>
                <div v-if="order.delivery_date" class="text-green-600 dark:text-green-400">
                  <span>Entregado:</span>
                  {{ formatDate(order.delivery_date, true) }}
                </div>
              </div>
            </td>
            
            <!-- Shipday -->
            <td class="p-4">
              <div v-if="order.shipday_order_id" class="space-y-1">
                <div class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-semibold">
                  📦 {{ order.shipday_order_id.slice(-6) }}
                </div>
                <div v-if="order.shipday_driver_id" class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-semibold">
                  🚚 {{ order.driver_info?.name || 'Conductor asignado' }}
                </div>
                <div v-else class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs font-semibold">
                  ⏳ Sin conductor
                </div>
              </div>
              <div v-else class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs font-semibold">
                📋 Sin asignar
              </div>
            </td>
            
            <!-- Acciones -->
            <td class="p-4">
              <div class="flex items-center gap-1">
                <!-- Ver -->
                <button
                  @click="$emit('view-details', order)"
                  class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Ver detalles del pedido"
                >
                  <span class="material-icons text-base">visibility</span>
                </button>
                
                <!-- Estado -->
                <button
                  @click="$emit('update-status', order)"
                  class="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                  title="Actualizar estado del pedido"
                >
                  <span class="material-icons text-base">edit</span>
                </button>
                
                <!-- Asignar -->
                <button
                  @click="$emit('assign-driver', order)"
                  class="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                  :title="['pending', 'ready_for_pickup', 'warehouse_received'].includes(order.status) ? 'Asignar conductor' : 'No se puede asignar en este estado'"
                >
                  <span class="material-icons text-base">local_shipping</span>
                </button>

                <!-- Entregar -->
                <button
                  v-if="shouldShowDeliverButton(order)"
                  @click="$emit('mark-delivered', order)"
                  class="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                  title="Marcar como entregado con prueba fotográfica"
                >
                  <span class="material-icons text-base">done_all</span>
                </button>

                <!-- Menú dropdown -->
                <div class="relative group">
                  <button
                    class="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Más acciones"
                  >
                    <span class="material-icons text-base">more_vert</span>
                  </button>
                  
                  <!-- Dropdown Menu -->
                  <div class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      @click="debugOrder(order)"
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg"
                    >
                      <span class="material-icons text-base">bug_report</span>
                      <span>Debug</span>
                    </button>
                    
                    <button
                      @click="duplicateOrder(order)"
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span class="material-icons text-base">content_copy</span>
                      <span>Duplicar</span>
                    </button>
                    
                    <button
                      v-if="getChannelType(order.channel_id) === 'mercadolibre' && order.external_order_id"
                      @click="downloadLabel(order.external_order_id)"
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span class="material-icons text-base">description</span>
                      <span>Descargar Etiqueta</span>
                    </button>
                    
                    <button
                      @click="$emit('delete-order', order._id)"
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors last:rounded-b-lg"
                    >
                      <span class="material-icons text-base">delete</span>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
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
                <span class="text-6xl">📦</span>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">No hay pedidos disponibles</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Intenta ajustar los filtros o crear un nuevo pedido</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
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
              @change="$emit('page-size-change', $event.target.value)"
              class="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>por página</span>
          </div>
        </div>
        
        <!-- Controles de paginación -->
        <div class="flex items-center gap-2">
          <button
            @click="$emit('page-change', 1)"
            :disabled="pagination.page <= 1"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Primera página"
          >
            <span class="material-icons">first_page</span>
          </button>
          
          <button
            @click="$emit('page-change', pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página anterior"
          >
            <span class="material-icons">chevron_left</span>
          </button>
          
          <template v-for="page in visiblePages" :key="page">
            <button
              @click="$emit('page-change', page)"
              :class="[
                'px-4 py-2 text-sm rounded-lg transition-colors',
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
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página siguiente"
          >
            <span class="material-icons">chevron_right</span>
          </button>
          
          <button
            @click="$emit('page-change', pagination.totalPages)"
            :disabled="pagination.page >= pagination.totalPages"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Última página"
          >
            <span class="material-icons">last_page</span>
          </button>
        </div>

        <!-- Ir a página -->
        <div class="flex items-center gap-2 text-sm">
          <label class="text-gray-600 dark:text-gray-400">Ir a página:</label>
          <input
            type="number"
            :min="1"
            :max="pagination.totalPages"
            :value="pagination.page"
            @keyup.enter="goToPage($event.target.value)"
            class="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-center"
          />
          <span class="text-gray-600 dark:text-gray-400">de {{ pagination.totalPages }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../../services/api'

// ==================== PROPS ====================
const props = defineProps({
  orders: {
    type: Array,
    required: true
  },
  companies: {
    type: Array,
    required: true
  },
  channels: {
    type: Array,
    default: () => []
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

// ==================== EMITS ====================
const emit = defineEmits([
  'select-order',
  'select-all',
  'view-details',
  'update-status',
  'assign-driver',
  'mark-delivered',
  'delete-order',
  'page-change',
  'page-size-change',
  'refresh',
  'bulk-assign',
  'bulk-export',
  'reports'
])

// ==================== COMPOSABLES ====================
const toast = useToast()

// ==================== COMPUTED ====================

/**
 * Calculate start item number for pagination display
 */
const startItem = computed(() => {
  return Math.max(1, ((props.pagination.page - 1) * props.pagination.limit) + 1)
})

/**
 * Calculate end item number for pagination display
 */
const endItem = computed(() => {
  return Math.min(props.pagination.page * props.pagination.limit, props.pagination.total)
})

/**
 * Calculate visible page numbers for pagination
 */
const visiblePages = computed(() => {
  const current = props.pagination.page
  const total = props.pagination.totalPages
  const delta = 2 // Number of pages to show on each side
  
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)
  
  // Adjust if we're near the beginning or end
  if (current <= delta + 1) {
    end = Math.min(total, delta * 2 + 1)
  }
  if (current >= total - delta) {
    start = Math.max(1, total - delta * 2)
  }
  
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// ==================== METHODS ====================

/**
 * Check if order is selected
 */
function isOrderSelected(order) {
  return props.selectedOrders.includes(order._id)
}

function handleRefresh() {
  console.log('🔄 Refresh button clicked')
  emit('refresh')
}

function handleBulkExport() {
  if (props.selectedOrders.length === 0) {
    toast.warning('Selecciona pedidos para exportar')
    return
  }
  console.log('📤 Bulk export button clicked:', props.selectedOrders.length)
  emit('bulk-export')
}

function handleReports() {
  console.log('📊 Reports button clicked')
  toast.info('Función de reportes en desarrollo')
  emit('reports')
}

/**
 * Get company name by ID or object
 */
function getCompanyName(companyId) {
  if (!companyId) return 'Sin empresa'
  
  // Handle both string ID and populated object
  if (typeof companyId === 'object' && companyId.name) {
    return companyId.name
  }
  
  const company = props.companies.find(c => c._id === companyId)
  return company?.name || 'Empresa no encontrada'
}

/**
 * Check if order status allows marking as delivered
 */
function shouldShowDeliverButton(order) {
  // Estados que permiten marcar como entregado
  const deliverableStatuses = [
    'out_for_delivery',
    'assigned',
    'shipped',           // Enviado
    'processing',        // Procesando
    'ready_for_pickup'   // Listo para recoger
  ]
  
  return deliverableStatuses.includes(order.status)
}

/**
 * Get channel name from channel ID or object
 */
function getChannelName(channelId) {
  // Si channelId es un objeto poblado
  if (typeof channelId === 'object' && channelId?.channel_name) {
    return channelId.channel_name
  }
  
  // Si channelId es un objeto poblado pero con 'name' (por si acaso)
  if (typeof channelId === 'object' && channelId?.name) {
    return channelId.name
  }
  
  // Si solo tenemos el ID, buscar en la lista de canales
  if (typeof channelId === 'string' && props.channels) {
    const channel = props.channels.find(c => c._id === channelId)
    return channel?.channel_name || 'Canal desconocido'
  }
  
  return 'Canal'
}

/**
 * Get channel type from channel ID or object
 */
function getChannelType(channelId) {
  // Si viene populado como objeto
  if (typeof channelId === 'object' && channelId?.channel_type) {
    return channelId.channel_type
  }

  // Si solo viene el ID, buscar en la lista de canales
  if (typeof channelId === 'string' && props.channels) {
    const channel = props.channels.find(c => c._id === channelId)
    return channel?.channel_type || null
  }

  return null
}

/**
 * Format currency for Chilean Peso
 */
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '$0'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount)
}

/**
 * Format date with optional time
 */
function formatDate(dateStr, withTime = false) {
  if (!dateStr) return 'N/A'
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }
  
  if (withTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  
  return new Date(dateStr).toLocaleString('es-CL', options)
}

/**
 * Get status display name in Spanish
 */
function getStatusName(status) {
  const statusMap = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    invoiced: 'Facturado',
    cancelled: 'Cancelado',
    ready_for_pickup: 'Listo para recoger',
    out_for_delivery: 'En Entrega',
    warehouse_received: 'Recibido en bodega',
    assigned: 'Asignado',
    pickup: 'Retirado'
  }
  return statusMap[status] || status
}

/**
 * Get status badge Tailwind classes
 */
function getStatusBadgeClass(status) {
  const classes = {
    pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    processing: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    ready_for_pickup: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    warehouse_received: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
    assigned: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200',
    shipped: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    out_for_delivery: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    delivered: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    invoiced: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
    cancelled: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    pickup: 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200'

  }
  return classes[status] || 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
}

/**
 * Get commune badge Tailwind classes
 */
function getCommuneClass(commune) {
  if (!commune || commune === 'Sin comuna') return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
  
  const importantCommunes = [
    'Las Condes', 'Vitacura', 'Providencia', 'Ñuñoa', 'Santiago',
    'La Florida', 'Peñalolén', 'Macul', 'San Miguel', 'Quinta Normal'
  ]
  
  const isImportant = importantCommunes.some(important => 
    commune.toLowerCase().includes(important.toLowerCase())
  )
  
  return isImportant 
    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
}

/**
 * Go to specific page number
 */
function goToPage(page) {
  const pageNumber = parseInt(page)
  if (pageNumber >= 1 && pageNumber <= props.pagination.totalPages) {
    emit('page-change', pageNumber)
  }
}

/**
 * Debug order - log to console
 */
function debugOrder(order) {
  console.group('🐛 Order Debug')
  console.log('Order:', order)
  console.log('Company:', getCompanyName(order.company_id))
  console.log('Channel:', getChannelName(order.channel_id))
  console.log('Status:', getStatusName(order.status))
  console.groupEnd()
  toast.info('Información del pedido en la consola')
}

/**
 * Duplicate order - placeholder for future implementation
 */
function duplicateOrder(order) {
  console.log('📋 Duplicate order:', order._id)
  toast.info('Función de duplicar en desarrollo')
}

/**
 * Download Mercado Libre shipping label
 */
async function downloadLabel(externalOrderId) {
  try {
    toast.info('Descargando etiqueta...')
    
    const response = await apiService.orders.downloadLabel(externalOrderId)

    if (!response.headers['content-type'].includes('application/pdf')) {
      console.error('❌ El backend no devolvió un PDF:', response.headers['content-type'])
      toast.error('El backend no devolvió un PDF')
      return
    }

    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    
    toast.success('Etiqueta descargada')
  } catch (err) {
    console.error('Error descargando etiqueta:', err)
    toast.error('No se pudo descargar la etiqueta')
  }
}
</script>

<style scoped>
.material-icons {
  font-size: 1.25rem;
  font-family: 'Material Icons';
}

/* Hover effect for dropdown menu */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

.group:hover .group-hover\:visible {
  visibility: visible;
}
</style>