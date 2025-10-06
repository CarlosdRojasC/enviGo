<template>
  <div class="orders-header-tailwind">
    <div class="relative z-10 flex items-start justify-between mb-6 md:flex-col md:items-stretch md:gap-4 sm:gap-3">
      <div class="flex-1">
        <h1 class="flex items-center gap-3 m-0 mb-2 text-3xl font-bold text-shadow-md lg:text-2xl md:text-xl">
          <span class="text-4xl opacity-90 drop-shadow-md lg:text-3xl md:text-2xl">📦</span>
          {{ title }}
        </h1>
        <p v-if="subtitle" class="m-0 text-base font-normal opacity-90 md:text-sm">{{ subtitle }}</p>
      </div>
      
      <div class="relative z-10 flex flex-wrap items-center gap-3 md:justify-center sm:flex-col sm:w-full sm:gap-2">
        <button 
          @click="$emit('refresh')" 
          :disabled="loading" 
          :class="{ 'opacity-60': loading }"
          class="action-btn-tailwind bg-white/15 text-white"
        >
          <span class="text-base">{{ loading ? '⏳' : '🔄' }}</span>
          <span class="font-semibold">Actualizar</span>
        </button>
        
        <button 
          @click="$emit('export')" 
          class="action-btn-tailwind bg-white/15 text-white"
          :disabled="exporting"
          title="Exportar pedidos a Excel"
        >
          <span class="text-base">{{ exporting ? '⏳' : '📤' }}</span>
          <span class="font-semibold">
            {{ exporting ? 'Exportando...' : 'Exportar' }}
          </span>
        </button>
        
        <button 
          v-if="showCreateButton"
          @click="$emit('create-order')" 
          class="action-btn-tailwind bg-[#6BA428] border-[#6BA428] text-white hover:enabled:bg-[#7AB32E] hover:enabled:border-[#7AB32E]"
        >
          <span class="text-base">➕</span>
          <span class="font-semibold">Nuevo</span>
        </button>
        <button 
          @click="$emit('bulk-upload')" 
          class="action-btn-tailwind bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:enabled:shadow-blue-500/30"
          title="Subir múltiples pedidos desde Excel"
        >
          <span class="text-base">⬆️</span>
          <span class="font-semibold">Subida</span>
        </button>
        <button 
          @click="$emit('request-collection')" 
          class="action-btn-tailwind bg-gradient-to-br from-sky-500 to-cyan-600 text-white hover:enabled:shadow-sky-500/30"
          title="Solicitar que recojan tus paquetes"
        >
          <span class="text-base">📦</span>
          <span class="font-semibold">Colecta</span>
        </button>
      </div>
    </div>

    <div class="relative z-10 grid gap-4 mb-5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] lg:gap-3.5 md:grid-cols-2 md:gap-3 sm:grid-cols-1 sm:gap-2.5">
      <div class="stat-card-tailwind bg-white/25 border-2 border-white/40 lg:col-span-1">
        <div class="flex items-center gap-2 mb-3">
          <span class="stat-icon-tailwind">📊</span>
          <span class="stat-label-tailwind">Total Pedidos</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-4xl font-bold leading-none text-shadow-sm lg:text-3xl md:text-2xl">{{ formatNumber(stats.total) }}</span>
          <span v-if="previousStats?.total" class="self-start px-1.5 py-0.5 mt-1 text-xs font-semibold rounded-md" :class="getChangeClass('total')">
            {{ getChangeText('total') }}
          </span>
        </div>
      </div>

      <div class="stat-card-tailwind" :class="getStatusClass('pending')">
        <div class="flex items-center gap-2 mb-3">
          <span class="stat-icon-tailwind">⏳</span>
          <span class="stat-label-tailwind">Pendientes</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="stat-number-tailwind">{{ formatNumber(stats.pending) }}</span>
          <span class="stat-percentage-tailwind">{{ getPercentage(stats.pending, stats.total) }}%</span>
        </div>
      </div>
      <div class="stat-card-tailwind" :class="getStatusClass('warehouse_received')">
        <div class="flex items-center gap-2 mb-3">
          <span class="stat-icon-tailwind">🏭</span>
          <span class="stat-label-tailwind">En Bodega</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="stat-number-tailwind">{{ formatNumber(stats.warehouse_received) }}</span>
          <span class="stat-percentage-tailwind">{{ getPercentage(stats.warehouse_received, stats.total) }}%</span>
        </div>
      </div>
      <div class="stat-card-tailwind" :class="getStatusClass('shipped')">
        <div class="flex items-center gap-2 mb-3">
          <span class="stat-icon-tailwind">🚚</span>
          <span class="stat-label-tailwind">En Tránsito</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="stat-number-tailwind">{{ formatNumber(stats.shipped) }}</span>
          <span class="stat-percentage-tailwind">{{ getPercentage(stats.shipped, stats.total) }}%</span>
        </div>
      </div>
      <div class="stat-card-tailwind" :class="getStatusClass('delivered')">
        <div class="flex items-center gap-2 mb-3">
          <span class="stat-icon-tailwind">✅</span>
          <span class="stat-label-tailwind">Entregados</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="stat-number-tailwind">{{ formatNumber(stats.delivered) }}</span>
          <span class="stat-percentage-tailwind">{{ getPercentage(stats.delivered, stats.total) }}%</span>
        </div>
      </div>
    </div>

    <div v-if="lastUpdate" class="relative z-10 flex items-center justify-between pt-4 text-sm opacity-90 border-t border-white/20 md:flex-col md:items-start md:gap-3 sm:text-xs">
      <span class="flex items-center gap-1.5">
        <span class="text-xs">🕒</span>
        Última actualización: {{ formatLastUpdate(lastUpdate) }}
      </span>
      <button v-if="autoRefresh" @click="$emit('toggle-auto-refresh')" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/20 border border-white/30 rounded-lg backdrop-blur-md transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/80">
        <span class="animate-spin">🔄</span>
        Auto-refresh activo
      </button>
    </div>
  </div>
</template>

<script setup>
// ... TU SCRIPT SETUP SE MANTIENE EXACTAMENTE IGUAL ...
import { computed, warn } from 'vue'

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
  exporting: {
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

// Actualizado para devolver clases de Tailwind directamente
function getStatusClass(status) {
  const classes = {
    pending: 'border-l-4 border-amber-400',
    processing: 'border-l-4 border-blue-400', 
    shipped: 'border-l-4 border-purple-400',
    delivered: 'border-l-4 border-green-400',
    warehouse_received: 'border-l-4 border-indigo-400',
  }
  return classes[status] || 'border-l-4 border-gray-400'
}

// Actualizado para devolver clases de Tailwind
function getChangeClass(metric) {
  if (!props.previousStats) return ''
  const current = props.stats[metric]
  const previous = props.previousStats[metric]
  if (current > previous) return 'bg-white/20 border border-white/30 text-white' // positive
  if (current < previous) return 'bg-red-500/20 border border-red-500/30 text-red-200' // negative
  return 'bg-white/10 border border-white/20 text-gray-200' // neutral
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
/* Estilos que son difíciles o imposibles de replicar solo con utilidades de Tailwind */
.orders-header-tailwind {
  @apply bg-gradient-to-br from-[#0d446f] to-[#243678] rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden motion-reduce:transition-none;
  @apply lg:p-5 md:rounded-xl;
}

/* Pseudo-elemento para el overlay sutil del header */
.orders-header-tailwind::before {
  content: '';
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  @apply absolute inset-0 pointer-events-none;
}

/* Base de los botones de acción con pseudo-elemento para el hover */
.action-btn-tailwind {
  @apply flex items-center justify-center gap-2 px-4 py-2.5 min-w-[100px] border rounded-xl text-sm cursor-pointer transition-all duration-300 backdrop-blur-md border-white/30 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-[#243678] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none active:transform-none motion-reduce:transition-none;
  @apply lg:px-3.5 lg:py-2 sm:w-full;
}

.action-btn-tailwind::before {
  content: '';
  background: rgba(255, 255, 255, 0.2);
  transition: left 0.3s ease;
  @apply absolute top-0 -left-full w-full h-full -z-10;
}
.action-btn-tailwind:hover:not(:disabled)::before {
  left: 0;
}
.action-btn-tailwind:hover:not(:disabled) {
  @apply -translate-y-0.5 shadow-xl shadow-black/20 border-white/50;
}

/* Tarjetas de estadísticas con pseudo-elemento para la animación de brillo */
.stat-card-tailwind {
  @apply bg-white/15 backdrop-blur-lg border border-white/25 rounded-2xl p-5 transition-all duration-300 relative overflow-hidden motion-reduce:transition-none lg:p-4;
}
.stat-card-tailwind:hover {
  @apply -translate-y-1 shadow-2xl shadow-black/30 bg-white/20 border-white/35;
}
.stat-card-tailwind::before {
  content: '';
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 3s infinite;
  @apply absolute top-0 left-0 right-0 h-0.5 motion-reduce:animate-none;
}

/* Estilos de texto reutilizables */
.stat-icon-tailwind {
  @apply text-xl opacity-95 drop-shadow-sm transition-transform duration-300 md:text-lg;
}
.stat-label-tailwind {
  @apply text-sm font-medium opacity-95 md:text-xs;
}
.stat-number-tailwind {
  @apply text-3xl font-bold leading-none text-shadow-sm transition-transform duration-300 lg:text-2xl md:text-xl;
}
.stat-percentage-tailwind {
  @apply text-xs font-medium opacity-85 md:text-[11px];
}

/* Efectos al hacer hover sobre la tarjeta */
.stat-card-tailwind:hover .stat-icon-tailwind,
.stat-card-tailwind:hover .stat-number-tailwind {
  @apply scale-105 motion-reduce:transform-none;
}
</style>