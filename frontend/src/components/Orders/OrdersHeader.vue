<template>

  <div class="flex items-start justify-between mb-6">
    <!-- Título y acciones principales -->
    <div class="w-full flex items-start justify-between gap-4">
      <div class="text-2xl font-bold text-gray-900">
        <h1 class="text-2xl font-bold text-gray-900">
          <span class="text-2xl font-bold text-gray-900">📦</span>
          {{ title }}
        </h1>
        <p class="text-sm text-gray-500" v-if="subtitle">{{ subtitle }}</p>
      </div>
      
      <div class="flex items-center flex-wrap gap-2">
        <button 
          @click="$emit('refresh')" 
          :disabled="loading" 
          class="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          :class="{ 'loading': loading }"
        >
          <span class="btn-icon">{{ loading ? '⏳' : '🔄' }}</span>
          <span class="btn-text">Actualizar</span>
        </button>
        
        <button 
  @click="$emit('export')" 
  class="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  :disabled="isExporting"
  title="Exportar pedidos a Excel"
>
  <span class="btn-icon">{{ isExporting ? '⏳' : '📤' }}</span>
  <span class="btn-text">
    {{ isExporting ? 'Exportando...' : 'Exportar Pedidos' }}
  </span>
</button>
        
        <button 
          v-if="showCreateButton"
          @click="$emit('create-order')" 
          class="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <span class="btn-icon">➕</span>
          <span class="btn-text">Nuevo Pedido</span>
        </button>
      </div>
    </div>

    <!-- Estadísticas principales -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full">
      <!-- Estadística principal -->
      <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div class="stat-header">
          <span class="stat-icon">📊</span>
          <span class="stat-label">Total Pedidos</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.total) }}</span>
          <span v-if="previousStats?.total" class="stat-change" :class="getChangeClass('total')">
            {{ getChangeText('total') }}
          </span>
        </div>
      </div>

      <!-- Estadísticas secundarias -->
      <div class="rounded-lg border border-gray-200 bg-white p-4" :class="getStatusClass('pending')">
        <div class="stat-header">
          <span class="stat-icon">⏳</span>
          <span class="stat-label">Pendientes</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.pending) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.pending, stats.total) }}%</span>
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4" :class="getStatusClass('warehouse_received')">
        <div class="stat-header">
          <span class="stat-icon">🏭</span>
          <span class="stat-label">En Bodega</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.warehouse_received) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.warehouse_received, stats.total) }}%</span>
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4" :class="getStatusClass('shipped')">
        <div class="stat-header">
          <span class="stat-icon">🚚</span>
          <span class="stat-label">En Tránsito</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.shipped) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.shipped, stats.total) }}%</span>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4" :class="getStatusClass('delivered')">
        <div class="stat-header">
          <span class="stat-icon">✅</span>
          <span class="stat-label">Entregados</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.delivered) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.delivered, stats.total) }}%</span>
        </div>
      </div>

      <!-- Estadísticas adicionales si están disponibles -->
      <div v-if="additionalStats" class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="stat-header">
          <span class="stat-icon">💰</span>
          <span class="stat-label">Ingresos Totales</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">${{ formatCurrency(additionalStats.totalRevenue) }}</span>
          <span class="stat-detail">Promedio: ${{ formatCurrency(additionalStats.averageOrderValue) }}</span>
        </div>
      </div>

      <div v-if="additionalStats" class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="stat-header">
          <span class="stat-icon">📈</span>
          <span class="stat-label">Tasa de Entrega</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ Math.round(additionalStats.deliveryRate) }}%</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: additionalStats.deliveryRate + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Información de actualización -->
    <div class="update-info" v-if="lastUpdate">
      <span class="update-text">
        <span class="update-icon">🕒</span>
        Última actualización: {{ formatLastUpdate(lastUpdate) }}
      </span>
      <button v-if="autoRefresh" @click="$emit('toggle-auto-refresh')" class="auto-refresh-btn">
        <span class="refresh-icon animate">🔄</span>
        Auto-refresh activo
      </button>
    </div>
  </div>

</template>

<script setup>

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

function getStatusClass(status) {
  const classes = {
    pending: 'warning',
    processing: 'info', 
    shipped: 'purple',
    delivered: 'success',
    warehouse_received: 'purple',
  }
  return classes[status] || 'default'
}

function getChangeClass(metric) {
  if (!props.previousStats) return ''
  const current = props.stats[metric]
  const previous = props.previousStats[metric]
  if (current > previous) return 'positive'
  if (current < previous) return 'negative'
  return 'neutral'
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
