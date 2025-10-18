<template>
  <div class="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg mb-5 shadow-lg shadow-blue-500/20 animate-slideIn">
    <div class="flex flex-col lg:flex-row justify-between items-stretch lg:items-center px-6 py-4 gap-6">
      <!-- SELECTION INFO -->
      <div class="flex-1 min-w-[200px] text-center lg:text-left">
        <div class="flex items-center gap-2 mb-2 justify-center lg:justify-start">
          <span class="text-lg">☑️</span>
          <span class="text-base font-semibold">
            <strong>{{ selectedCount }}</strong> 
            pedido{{ selectedCount !== 1 ? 's' : '' }} seleccionado{{ selectedCount !== 1 ? 's' : '' }}
          </span>
        </div>
        
        <div v-if="selectionSummary" class="flex flex-wrap gap-4 text-sm opacity-90 justify-center lg:justify-start">
          <div class="flex items-center gap-1">
            <span class="text-sm">💰</span>
            <span class="text-white/80">Valor total:</span>
            <span class="font-semibold">{{ formatCurrency(selectionSummary.totalValue) }}</span>
          </div>
          
          <div v-if="selectionSummary.companies > 1" class="flex items-center gap-1">
            <span class="text-sm">🏢</span>
            <span class="text-white/80">Empresas:</span>
            <span class="font-semibold">{{ selectionSummary.companies }}</span>
          </div>
          
          <div v-if="selectionSummary.communes > 1" class="flex items-center gap-1">
            <span class="text-sm">🏘️</span>
            <span class="text-white/80">Comunas:</span>
            <span class="font-semibold">{{ selectionSummary.communes }}</span>
          </div>
        </div>
      </div>

      <!-- BULK ACTIONS -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <!-- Primary Actions -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button 
            @click="$emit('bulk-assign')"
            class="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-white/40 rounded-md bg-white/15 text-white text-sm font-medium transition-all hover:bg-white/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/15 disabled:hover:translate-y-0 active:scale-95"
            :disabled="!canAssignDrivers"
            :title="canAssignDrivers ? 'Asignar conductor a los pedidos aplicables' : 'Ningún pedido seleccionado puede ser asignado'"
          >
            <span class="text-base">🚚</span>
            <span>Asignar Conductor</span>
            <span class="bg-white/20 px-1.5 py-0.5 rounded-full text-xs font-semibold ml-1">
              {{ assignableCount }}
            </span>
          </button>
<select 
  :value="bulkDriverId" 
  @change="$emit('driver-selected', $event.target.value)"
  class="px-3 py-2 border border-white/40 rounded-md bg-white/15 text-white text-sm font-medium placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
>
  <option value="" class="text-gray-900">Seleccionar conductor</option>
  <option 
    v-for="driver in availableDrivers" 
    :key="driver._id" 
    :value="driver._id"
    class="text-gray-900"
  >
    {{ driver.full_name || driver.name }}
  </option>
</select>
          <div class="relative group">
            <button class="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-white/40 rounded-md bg-white/15 text-white text-sm font-medium transition-all hover:bg-white/20 w-full sm:w-auto">
              <span class="text-base">📝</span>
              <span>Cambiar Estado</span>
              <span class="text-xs ml-1">▼</span>
            </button>
            
            <div class="absolute top-full left-0 right-0 sm:left-auto sm:right-auto sm:min-w-[200px] bg-white rounded-lg shadow-xl z-50 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
              <button 
                @click="$emit('bulk-status-change', 'processing')"
                class="flex items-center gap-2 w-full px-4 py-3 border-none bg-transparent text-gray-700 text-sm cursor-pointer transition-colors hover:bg-gray-100 text-left"
              >
                <span class="text-base w-5 text-center">⚙️</span>
                <span>Marcar como Procesando</span>
              </button>
              
              <button 
                @click="$emit('bulk-status-change', 'ready_for_pickup')"
                class="flex items-center gap-2 w-full px-4 py-3 border-none bg-transparent text-gray-700 text-sm cursor-pointer transition-colors hover:bg-gray-100 text-left"
              >
                <span class="text-base w-5 text-center">📦</span>
                <span>Listo para Recoger</span>
              </button>

              <button 
                @click="$emit('bulk-status-change', 'warehouse_received')"
                class="flex items-center gap-2 w-full px-4 py-3 border-none bg-transparent text-gray-700 text-sm cursor-pointer transition-colors hover:bg-gray-100 text-left"
              >
                <span class="text-base w-5 text-center">🏭</span>
                <span>Marcar como Recibido</span>
              </button>

              <button 
                @click="$emit('bulk-status-change', 'shipped')"
                class="flex items-center gap-2 w-full px-4 py-3 border-none bg-transparent text-gray-700 text-sm cursor-pointer transition-colors hover:bg-gray-100 text-left"
              >
                <span class="text-base w-5 text-center">🚚</span>
                <span>Marcar como Enviado</span>
              </button>

              <button 
                @click="$emit('bulk-status-change', 'delivered')"
                class="flex items-center gap-2 w-full px-4 py-3 border-none bg-transparent text-gray-700 text-sm cursor-pointer transition-colors hover:bg-gray-100 text-left"
              >
                <span class="text-base w-5 text-center">✅</span>
                <span>Marcar como Entregado</span>
              </button>
              
              <div class="h-px bg-gray-200 my-1"></div>
              
              <button 
                @click="$emit('bulk-status-change', 'cancelled')"
                class="flex items-center gap-2 w-full px-4 py-3 border-none bg-transparent text-red-600 text-sm cursor-pointer transition-colors hover:bg-red-50 text-left"
              >
                <span class="text-base w-5 text-center">❌</span>
                <span>Cancelar Pedidos</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Secondary Actions -->
        <div class="flex items-center gap-2">
          <button 
            @click="$emit('bulk-export')"
            class="flex items-center justify-center gap-1.5 px-3 py-2 border border-white/20 rounded-md bg-white/5 text-white text-xs font-medium transition-all hover:bg-white/10 active:scale-95"
            title="Exportar pedidos seleccionados"
          >
            <span class="text-base">📤</span>
            <span class="hidden sm:inline">Exportar</span>
          </button>

          <button 
            @click="$emit('bulk-print')"
            class="flex items-center justify-center gap-1.5 px-3 py-2 border border-white/20 rounded-md bg-white/5 text-white text-xs font-medium transition-all hover:bg-white/10 active:scale-95"
            title="Imprimir etiquetas de envío"
          >
            <span class="text-base">🖨️</span>
            <span class="hidden sm:inline">Imprimir</span>
          </button>

          <div class="hidden md:block w-px h-6 bg-white/30 mx-2"></div>

          <button 
            @click="$emit('clear-selection')"
            class="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-300/30 rounded-md bg-white/5 text-red-200 text-xs font-medium transition-all hover:bg-red-600/20 hover:border-red-400 active:scale-95"
            title="Limpiar selección"
          >
            <span class="text-base">✕</span>
            <span class="hidden sm:inline">Limpiar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- BULK OPERATION STATUS -->
    <div 
      v-if="bulkOperationStatus" 
      class="flex justify-between items-center px-6 py-3 border-t border-white/10 transition-colors"
      :class="{
        'bg-black/10': !bulkOperationStatus.type || bulkOperationStatus.type === 'info',
        'bg-blue-500/20': bulkOperationStatus.type === 'loading',
        'bg-green-500/20': bulkOperationStatus.type === 'success',
        'bg-red-600/20': bulkOperationStatus.type === 'error'
      }"
    >
      <div class="flex items-center gap-3 flex-1">
        <span class="text-lg">
          {{ bulkOperationStatus.type === 'loading' ? '⏳' : 
             bulkOperationStatus.type === 'success' ? '✅' : 
             bulkOperationStatus.type === 'error' ? '❌' : 'ℹ️' }}
        </span>
        
        <span class="text-sm font-medium">{{ bulkOperationStatus.message }}</span>
        
        <div v-if="bulkOperationStatus.progress" class="flex items-center gap-2 ml-4">
          <div class="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              class="h-full bg-white transition-all duration-300 ease-out" 
              :style="{ width: bulkOperationStatus.progress + '%' }"
            ></div>
          </div>
          <span class="text-xs font-semibold min-w-[35px]">{{ bulkOperationStatus.progress }}%</span>
        </div>
      </div>
      
      <button 
        v-if="bulkOperationStatus.dismissible"
        @click="dismissStatus"
        class="bg-white/10 border-none text-white w-6 h-6 rounded-full cursor-pointer flex items-center justify-center text-xs transition-colors hover:bg-white/20 active:scale-95"
      >
        ✕
      </button>
    </div>

    <!-- SELECTION BREAKDOWN -->
    <div v-if="showBreakdown" class="border-t border-white/10 bg-black/10">
      <div 
        class="flex justify-between items-center px-6 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        @click="toggleBreakdown"
      >
        <h4 class="flex items-center gap-2 m-0 text-sm font-semibold">
          <span class="text-base">📊</span>
          Desglose de Selección
        </h4>
        <button class="bg-transparent border-none text-white text-xs cursor-pointer p-1">
          {{ showBreakdown ? '▲' : '▼' }}
        </button>
      </div>
      
      <div class="px-6 pb-4">
        <div class="grid gap-4">
          <div class="flex flex-col gap-2">
            <span class="text-xs font-medium text-white/80">Por Estado:</span>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="(count, status) in statusBreakdown" 
                :key="status" 
                class="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-xs"
              >
                <span 
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                  :class="getStatusClass(status)"
                >
                  {{ getStatusName(status) }}
                </span>
                <span class="bg-white/20 px-1 py-0.5 rounded-lg font-semibold text-[10px]">
                  {{ count }}
                </span>
              </span>
            </div>
          </div>
          
          <div v-if="companyBreakdown" class="flex flex-col gap-2">
            <span class="text-xs font-medium text-white/80">Por Empresa:</span>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="(count, companyId) in companyBreakdown" 
                :key="companyId" 
                class="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-xs"
              >
                <span class="font-medium">{{ getCompanyName(companyId) }}</span>
                <span class="bg-white/20 px-1 py-0.5 rounded-lg font-semibold text-[10px]">
                  {{ count }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ==================== PROPS ====================
const props = defineProps({
  selectedCount: {
    type: Number,
    required: true
  },
  selectedOrders: {
    type: Array,
    default: () => []
  },
  selectionSummary: {
    type: Object,
    default: null
  },
  bulkOperationStatus: {
    type: Object,
    default: null
  },
  companies: {
    type: Array,
    default: () => []
  },
  availableDrivers: {
  type: Array,
  default: () => []
},
bulkDriverId: {
  type: String,
  default: ''
},
hasAssignedOrders: {
  type: Boolean,
  default: false
}
})

// ==================== EMITS ====================
const emit = defineEmits([
  'bulk-assign',
  'bulk-status-change',
  'bulk-export',
  'bulk-print',
  'clear-selection',
  'dismiss-status',
  'optimize-route',
'driver-selected'
])

// ==================== STATE ====================
const showBreakdown = ref(false)

// ==================== COMPUTED ====================

/**
 * Count of orders that can be assigned to drivers
 */
const assignableCount = computed(() => {
  const nonAssignableStatuses = ['delivered', 'cancelled']
  return props.selectedOrders.filter(order => 
    !nonAssignableStatuses.includes(order.status)
  ).length
})

/**
 * Check if any orders can be assigned to drivers
 */
const canAssignDrivers = computed(() => {
  return assignableCount.value > 0
})

/**
 * Breakdown by status
 */
const statusBreakdown = computed(() => {
  const breakdown = {}
  props.selectedOrders.forEach(order => {
    breakdown[order.status] = (breakdown[order.status] || 0) + 1
  })
  return breakdown
})

/**
 * Breakdown by company
 */
const companyBreakdown = computed(() => {
  const breakdown = {}
  props.selectedOrders.forEach(order => {
    const companyId = typeof order.company_id === 'object' ? order.company_id._id : order.company_id
    breakdown[companyId] = (breakdown[companyId] || 0) + 1
  })
  return breakdown
})

// ==================== METHODS ====================

/**
 * Toggle breakdown visibility
 */
function toggleBreakdown() {
  showBreakdown.value = !showBreakdown.value
}

/**
 * Dismiss bulk operation status
 */
function dismissStatus() {
  emit('dismiss-status')
}

/**
 * Format currency
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
 * Get status display name
 */
function getStatusName(status) {
  const statusMap = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    out_for_delivery: 'En Entrega',
    delivered: 'Entregado',
    invoiced: 'Facturado',
    cancelled: 'Cancelado',
    ready_for_pickup: 'Listo',
    warehouse_received: 'Recibido'
  }
  return statusMap[status] || status
}

/**
 * Get status CSS class
 */
function getStatusClass(status) {
  const classMap = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    out_for_delivery: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    invoiced: 'bg-teal-100 text-teal-800',
    cancelled: 'bg-red-100 text-red-800',
    ready_for_pickup: 'bg-violet-100 text-violet-800',
    warehouse_received: 'bg-cyan-100 text-cyan-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get company name by ID
 */
function getCompanyName(companyId) {
  const company = props.companies.find(c => c._id === companyId)
  return company?.name || 'Empresa Desconocida'
}
</script>

<style scoped>
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}
</style>