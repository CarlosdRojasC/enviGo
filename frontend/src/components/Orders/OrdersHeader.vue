<!-- frontend/src/components/Orders/OrdersHeader.vue -->
<template>
  <!-- Header Superior -->
  <div class="bg-white border-b border-gray-200 px-6 py-4 mb-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span class="text-3xl">📦</span>
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      
      <div class="flex gap-3">
        <button 
          @click="$emit('refresh')" 
          :disabled="loading"
          class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
        >
          <span class="text-lg">{{ loading ? '⏳' : '🔄' }}</span>
          Actualizar
        </button>
        
        <button 
          @click="$emit('export')"
          :disabled="isExporting"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all"
        >
          <span class="text-lg">{{ isExporting ? '⏳' : '📥' }}</span>
          {{ isExporting ? 'Exportando...' : 'Exportar' }}
        </button>
        
        <button 
          v-if="showCreateButton"
          @click="$emit('create-order')"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all"
        >
          <span class="text-lg">➕</span>
          Nuevo Pedido
        </button>
        
        <button 
          @click="$emit('bulk-upload')"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
        >
          <span class="text-lg">⬆️</span>
          Subida Masiva
        </button>
        
        <button 
          @click="$emit('request-collection')"
          class="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-all"
        >
          <span class="text-lg">📦</span>
          Solicitar Colecta
        </button>
      </div>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="px-6 mb-6">
    <div class="grid grid-cols-5 gap-4">
      <!-- Total -->
      <div class="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
            📊
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.total) }}</div>
            <div class="text-sm text-gray-500">Total Pedidos</div>
          </div>
        </div>
      </div>

      <!-- Pendientes -->
      <div class="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">
            ⏳
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.pending) }}</div>
            <div class="text-sm text-gray-500">Pendientes</div>
            <div class="text-xs text-amber-600 font-medium">{{ getPercentage(stats.pending, stats.total) }}%</div>
          </div>
        </div>
      </div>

      <!-- En Bodega -->
      <div class="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
            🏭
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.warehouse_received || 0) }}</div>
            <div class="text-sm text-gray-500">En Bodega</div>
            <div class="text-xs text-purple-600 font-medium">{{ getPercentage(stats.warehouse_received || 0, stats.total) }}%</div>
          </div>
        </div>
      </div>

      <!-- En Tránsito -->
      <div class="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
            🚚
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.shipped) }}</div>
            <div class="text-sm text-gray-500">En Tránsito</div>
            <div class="text-xs text-blue-600 font-medium">{{ getPercentage(stats.shipped, stats.total) }}%</div>
          </div>
        </div>
      </div>

      <!-- Entregados -->
      <div class="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
            ✅
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ formatNumber(stats.delivered) }}</div>
            <div class="text-sm text-gray-500">Entregados</div>
            <div class="text-xs text-green-600 font-medium">{{ getPercentage(stats.delivered, stats.total) }}%</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Metrics Bar -->
  <div v-if="additionalStats" class="px-6 mb-6">
    <div class="bg-gray-900 rounded-xl p-4 grid grid-cols-4 gap-6">
      <div class="flex items-center gap-3">
        <span class="text-2xl">💰</span>
        <div>
          <div class="text-white text-sm">Valor Total</div>
          <div class="text-white text-xl font-bold">${{ formatCurrency(additionalStats.totalRevenue) }}</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <span class="text-2xl">📊</span>
        <div>
          <div class="text-white text-sm">Promedio por Pedido</div>
          <div class="text-white text-xl font-bold">${{ formatCurrency(additionalStats.averageOrderValue) }}</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <span class="text-2xl">⏱️</span>
        <div>
          <div class="text-white text-sm">Tasa de Entrega</div>
          <div class="text-white text-xl font-bold">{{ Math.round(additionalStats.deliveryRate) }}%</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <span class="text-2xl">💵</span>
        <div>
          <div class="text-white text-sm">Ingresos Totales</div>
          <div class="text-white text-xl font-bold">${{ formatCurrency(additionalStats.totalRevenue) }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Update Info -->
  <div v-if="lastUpdate" class="px-6 mb-6">
    <div class="flex items-center justify-between text-sm text-gray-500">
      <span class="flex items-center gap-2">
        <span class="text-xs">🕒</span>
        Última actualización: {{ formatLastUpdate(lastUpdate) }}
      </span>
      <button 
        v-if="autoRefresh"
        @click="$emit('toggle-auto-refresh')"
        class="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium"
      >
        <span class="animate-spin">🔄</span>
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
      cancelled: 0,
      warehouse_received: 0
    })
  },
  additionalStats: {
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
/* Minimal styles - Tailwind handles everything */
</style>