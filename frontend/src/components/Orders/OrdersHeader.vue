<!-- frontend/src/components/Orders/OrdersHeader.vue -->
<template>
  <div class="relative bg-gradient-to-br from-[#0d446f] to-[#243678] rounded-2xl p-6 mb-6 text-white shadow-[0_10px_25px_rgba(139,197,63,0.2)] overflow-hidden">
    <!-- Overlay gradient -->
    <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 pointer-events-none"></div>
    
    <!-- Header Top Section -->
    <div class="relative z-10 flex justify-between items-start mb-6 max-md:flex-col max-md:gap-4">
      <div class="flex-1">
        <h1 class="text-[32px] font-bold m-0 mb-2 flex items-center gap-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] max-md:text-2xl max-sm:text-xl">
          <span class="text-4xl opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] max-md:text-[28px] max-sm:text-2xl">📦</span>
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-base opacity-90 m-0 font-normal max-md:text-sm max-sm:text-[13px]">{{ subtitle }}</p>
      </div>
      
      <div class="relative z-10 flex gap-3 items-center flex-wrap max-md:justify-center max-sm:flex-col max-sm:w-full max-sm:gap-2">
        <button 
          @click="$emit('refresh')" 
          :disabled="loading" 
          class="group relative flex items-center justify-center gap-2 px-5 py-3 border border-white/30 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-300 backdrop-blur-sm min-w-[120px] overflow-hidden bg-white/15 hover:bg-white/20 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:border-white/50 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none active:translate-y-0 max-md:min-w-[110px] max-md:px-[18px] max-md:py-2.5 max-sm:w-full max-sm:max-w-none max-sm:px-4 max-sm:py-3"
          :class="{ 'bg-white/10': loading }"
        >
          <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 -z-10"></div>
          <span class="text-base">{{ loading ? '⏳' : '🔄' }}</span>
          <span class="font-semibold">Actualizar</span>
        </button>
        
        <button 
          @click="$emit('export')" 
          class="group relative flex items-center justify-center gap-2 px-5 py-3 border border-white/30 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-300 backdrop-blur-sm min-w-[120px] overflow-hidden bg-white/15 hover:bg-white/20 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:border-white/50 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none active:translate-y-0 max-md:min-w-[110px] max-md:px-[18px] max-md:py-2.5 max-sm:w-full max-sm:max-w-none max-sm:px-4 max-sm:py-3"
          :disabled="isExporting"
          title="Exportar pedidos a Excel"
        >
          <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 -z-10"></div>
          <span class="text-base">{{ isExporting ? '⏳' : '📤' }}</span>
          <span class="font-semibold">
            {{ isExporting ? 'Exportando...' : 'Exportar Pedidos' }}
          </span>
        </button>
        
        <button 
          v-if="showCreateButton"
          @click="$emit('create-order')" 
          class="group relative flex items-center justify-center gap-2 px-5 py-3 border border-[#6BA428] rounded-xl font-semibold text-sm cursor-pointer transition-all duration-300 backdrop-blur-sm min-w-[120px] overflow-hidden bg-[#6BA428] hover:bg-[#7AB32E] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:border-[#7AB32E] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none active:translate-y-0 max-md:min-w-[110px] max-md:px-[18px] max-md:py-2.5 max-sm:w-full max-sm:max-w-none max-sm:px-4 max-sm:py-3"
        >
          <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 -z-10"></div>
          <span class="text-base">➕</span>
          <span class="font-semibold">Nuevo Pedido</span>
        </button>
        
        <button 
          @click="$emit('bulk-upload')" 
          class="group relative flex items-center justify-center gap-2 px-5 py-3 border border-white/30 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-300 backdrop-blur-sm min-w-[120px] overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(59,130,246,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none active:translate-y-0 max-md:min-w-[110px] max-md:px-[18px] max-md:py-2.5 max-sm:w-full max-sm:max-w-none max-sm:px-4 max-sm:py-3"
          title="Subir múltiples pedidos desde Excel"
        >
          <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 -z-10"></div>
          <span class="text-base">⬆️</span>
          <span class="font-semibold">Subida Masiva</span>
        </button>
        
        <button 
          @click="$emit('request-collection')" 
          class="group relative flex items-center justify-center gap-2 px-5 py-3 border border-white/30 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-300 backdrop-blur-sm min-w-[120px] overflow-hidden bg-gradient-to-br from-sky-500 to-sky-700 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(14,165,233,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none active:translate-y-0 max-md:min-w-[110px] max-md:px-[18px] max-md:py-2.5 max-sm:w-full max-sm:max-w-none max-sm:px-4 max-sm:py-3"
          title="Solicitar que recojan tus paquetes"
        >
          <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 -z-10"></div>
          <span class="text-base">📦</span>
          <span class="font-semibold">Solicitar Colecta</span>
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="relative z-10 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-5 max-md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] max-md:gap-3.5 max-sm:grid-cols-2 max-sm:gap-3 max-[480px]:grid-cols-1 max-[480px]:gap-2.5">
      <!-- Primary Stat Card -->
      <div class="relative col-span-2 bg-white/25 backdrop-blur-[15px] border-2 border-white/40 rounded-2xl p-5 transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:bg-white/30 hover:border-white/45 max-md:col-span-1 max-md:p-[18px] max-sm:p-4 max-[480px]:p-3.5">
        <div class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 max-md:text-lg max-sm:text-base">📊</span>
          <span class="text-sm font-medium opacity-95 max-md:text-[13px] max-sm:text-xs">Total Pedidos</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-4xl font-bold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 max-md:text-[32px] max-sm:text-[28px] max-[480px]:text-[26px]">{{ formatNumber(stats.total) }}</span>
          <span v-if="previousStats?.total" class="text-xs px-1.5 py-0.5 rounded-md font-semibold self-start" :class="getChangeClasses('total')">
            {{ getChangeText('total') }}
          </span>
        </div>
      </div>

      <!-- Secondary Stat Cards -->
      <div class="stat-card-warning">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 max-md:text-lg max-sm:text-base">⏳</span>
          <span class="text-sm font-medium opacity-95 max-md:text-[13px] max-sm:text-xs">Pendientes</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[28px] font-bold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 max-md:text-[26px] max-sm:text-2xl max-[480px]:text-[22px]">{{ formatNumber(stats.pending) }}</span>
          <span class="text-xs opacity-85 font-medium max-sm:text-[11px]">{{ getPercentage(stats.pending, stats.total) }}%</span>
        </div>
      </div>

      <div class="stat-card-purple">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 max-md:text-lg max-sm:text-base">🏭</span>
          <span class="text-sm font-medium opacity-95 max-md:text-[13px] max-sm:text-xs">En Bodega</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[28px] font-bold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 max-md:text-[26px] max-sm:text-2xl max-[480px]:text-[22px]">{{ formatNumber(stats.warehouse_received) }}</span>
          <span class="text-xs opacity-85 font-medium max-sm:text-[11px]">{{ getPercentage(stats.warehouse_received, stats.total) }}%</span>
        </div>
      </div>

      <div class="stat-card-purple">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 max-md:text-lg max-sm:text-base">🚚</span>
          <span class="text-sm font-medium opacity-95 max-md:text-[13px] max-sm:text-xs">En Tránsito</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[28px] font-bold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 max-md:text-[26px] max-sm:text-2xl max-[480px]:text-[22px]">{{ formatNumber(stats.shipped) }}</span>
          <span class="text-xs opacity-85 font-medium max-sm:text-[11px]">{{ getPercentage(stats.shipped, stats.total) }}%</span>
        </div>
      </div>

      <div class="stat-card-success">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 max-md:text-lg max-sm:text-base">✅</span>
          <span class="text-sm font-medium opacity-95 max-md:text-[13px] max-sm:text-xs">Entregados</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[28px] font-bold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 max-md:text-[26px] max-sm:text-2xl max-[480px]:text-[22px]">{{ formatNumber(stats.delivered) }}</span>
          <span class="text-xs opacity-85 font-medium max-sm:text-[11px]">{{ getPercentage(stats.delivered, stats.total) }}%</span>
        </div>
      </div>

      <!-- Additional Stats -->
      <div v-if="additionalStats" class="stat-card-revenue">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 max-md:text-lg max-sm:text-base">💰</span>
          <span class="text-sm font-medium opacity-95 max-md:text-[13px] max-sm:text-xs">Ingresos Totales</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[28px] font-bold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 max-md:text-[26px] max-sm:text-2xl max-[480px]:text-[22px]">${{ formatCurrency(additionalStats.totalRevenue) }}</span>
          <span class="text-xs opacity-85 font-medium max-sm:text-[11px]">Promedio: ${{ formatCurrency(additionalStats.averageOrderValue) }}</span>
        </div>
      </div>

      <div v-if="additionalStats" class="stat-card-performance">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-110 max-md:text-lg max-sm:text-base">📈</span>
          <span class="text-sm font-medium opacity-95 max-md:text-[13px] max-sm:text-xs">Tasa de Entrega</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[28px] font-bold leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 max-md:text-[26px] max-sm:text-2xl max-[480px]:text-[22px]">{{ Math.round(additionalStats.deliveryRate) }}%</span>
          <div class="w-full h-1 bg-white/25 rounded-sm overflow-hidden mt-2">
            <div class="h-full bg-gradient-to-r from-white to-white/80 rounded-sm transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.3)]" :style="{ width: additionalStats.deliveryRate + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Update Info -->
    <div v-if="lastUpdate" class="relative z-10 flex justify-between items-center pt-4 border-t border-white/20 text-sm opacity-90 max-md:flex-col max-md:gap-3 max-md:items-start max-sm:pt-3 max-sm:text-xs">
      <span class="flex items-center gap-1.5">
        <span class="text-xs">🕒</span>
        Última actualización: {{ formatLastUpdate(lastUpdate) }}
      </span>
      <button 
        v-if="autoRefresh" 
        @click="$emit('toggle-auto-refresh')" 
        class="flex items-center gap-1.5 bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-300 backdrop-blur-sm hover:bg-white/30 hover:-translate-y-0.5 max-md:self-center max-sm:px-2 max-sm:py-1 max-sm:text-[11px]"
      >
        <span class="animate-spin-slow">🔄</span>
        Auto-refresh activo
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Mis Pedidos'
  },
  subtitle: {
    type: String,
    default: ''
  },
  stats: {
    type: Object,
    required: true,
    default: () => ({
      total: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    })
  },
  additionalStats: {
    type: Object,
    default: null
  },
  previousStats: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  isExporting: {
    type: Boolean,
    default: false
  },
  showCreateButton: {
    type: Boolean,
    default: true
  },
  lastUpdate: {
    type: [Date, String, Number],
    default: null
  },
  autoRefresh: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'refresh',
  'export', 
  'create-order',
  'bulk-upload',
  'request-collection',
  'toggle-auto-refresh'
])

// Métodos de formateo
function formatNumber(number) {
  return new Intl.NumberFormat('es-CL').format(number || 0)
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

function getPercentage(value, total) {
  if (!total || total === 0) return 0
  return Math.round((value / total) * 100)
}

function getChangeClasses(metric) {
  if (!props.previousStats) return ''
  const current = props.stats[metric]
  const previous = props.previousStats[metric]
  if (current > previous) return 'bg-white/20 text-white border border-white/30'
  if (current < previous) return 'bg-red-500/20 text-red-200 border border-red-500/30'
  return 'bg-white/15 text-gray-200 border border-white/20'
}

function getChangeText(metric) {
  if (!props.previousStats) return ''
  const current = props.stats[metric]
  const previous = props.previousStats[metric]
  const diff = current - previous
  if (diff > 0) return `+${diff}`
  return diff.toString()
}

function formatLastUpdate(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`
  return date.toLocaleDateString('es-CL')
}
</script>

<style scoped>
/* Stat card base styles with borders */
.stat-card-warning,
.stat-card-purple,
.stat-card-success,
.stat-card-revenue,
.stat-card-performance {
  @apply relative bg-white/15 backdrop-blur-[15px] border border-white/25 rounded-2xl p-5 transition-all duration-300 overflow-hidden;
  @apply hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:bg-white/20 hover:border-white/35;
  @apply max-md:p-[18px] max-sm:p-4 max-[480px]:p-3.5;
}

.stat-card-warning::before,
.stat-card-purple::before,
.stat-card-success::before,
.stat-card-revenue::before,
.stat-card-performance::before {
  content: '';
  @apply absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white/40 to-transparent;
  animation: shimmer 3s infinite;
}

.stat-card-warning {
  @apply border-l-4 border-l-amber-500;
}

.stat-card-purple {
  @apply border-l-4 border-l-purple-500;
}

.stat-card-success {
  @apply border-l-4 border-l-[#6BA428];
}

.stat-card-revenue {
  @apply border-l-4 border-l-amber-500;
}

.stat-card-performance {
  @apply border-l-4 border-l-[#A4D65E];
}

/* Animations */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-shimmer {
  animation: shimmer 3s infinite;
}

.animate-spin-slow {
  animation: spin-slow 2s linear infinite;
}

/* Focus states for accessibility */
button:focus {
  @apply outline-2 outline-white/80 outline-offset-2;
}

/* Print styles */
@media print {
  .orders-header {
    @apply bg-[#8BC53F] shadow-none break-inside-avoid;
  }
  
  button {
    @apply hidden;
  }
  
  .stat-card-warning,
  .stat-card-purple,
  .stat-card-success,
  .stat-card-revenue,
  .stat-card-performance {
    @apply bg-[#8BC53F]/10 border border-[#8BC53F];
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    @apply transition-none;
  }
  
  .animate-shimmer,
  .animate-spin-slow {
    animation: none;
  }
}
</style>