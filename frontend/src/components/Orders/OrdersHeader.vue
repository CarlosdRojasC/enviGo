<!-- frontend/src/components/Orders/OrdersHeader.vue -->
<template>
  <div class="orders-header">
    <!-- Título y acciones principales -->
    <div class="header-top">
      <div class="title-section">
        <h1 class="page-title">
          <span class="title-icon">📦</span>
          {{ title }}
        </h1>
        <p class="page-subtitle" v-if="subtitle">{{ subtitle }}</p>
      </div>
      
      <div class="header-actions">
        <button 
          @click="$emit('refresh')" 
          :disabled="loading" 
          class="action-btn refresh-btn"
          :class="{ 'loading': loading }"
        >
          <span class="btn-icon">{{ loading ? '⏳' : '🔄' }}</span>
          <span class="btn-text">Actualizar</span>
        </button>
        
        <button 
          @click="$emit('export')" 
          :disabled="exporting"
          class="action-btn export-btn"
          :class="{ 'loading': exporting }"
        >
          <span class="btn-icon">{{ exporting ? '⏳' : '📊' }}</span>
          <span class="btn-text">Exportar</span>
        </button>
        
        <button 
          v-if="showCreateButton"
          @click="$emit('create-order')" 
          class="action-btn create-btn"
        >
          <span class="btn-icon">➕</span>
          <span class="btn-text">Nuevo Pedido</span>
        </button>
      </div>
    </div>

    <!-- Estadísticas principales -->
    <div class="stats-grid">
      <!-- Estadística principal -->
      <div class="stat-card primary">
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
      <div class="stat-card" :class="getStatusClass('pending')">
        <div class="stat-header">
          <span class="stat-icon">⏳</span>
          <span class="stat-label">Pendientes</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.pending) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.pending, stats.total) }}%</span>
        </div>
      </div>

      <div class="stat-card" :class="getStatusClass('processing')">
        <div class="stat-header">
          <span class="stat-icon">⚙️</span>
          <span class="stat-label">Procesando</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.processing) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.processing, stats.total) }}%</span>
        </div>
      </div>

      <div class="stat-card" :class="getStatusClass('shipped')">
        <div class="stat-header">
          <span class="stat-icon">🚚</span>
          <span class="stat-label">En Tránsito</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.shipped) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.shipped, stats.total) }}%</span>
        </div>
      </div>

      <div class="stat-card" :class="getStatusClass('delivered')">
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
      <div v-if="additionalStats" class="stat-card revenue">
        <div class="stat-header">
          <span class="stat-icon">💰</span>
          <span class="stat-label">Ingresos Totales</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">${{ formatCurrency(additionalStats.totalRevenue) }}</span>
          <span class="stat-detail">Promedio: ${{ formatCurrency(additionalStats.averageOrderValue) }}</span>
        </div>
      </div>

      <div v-if="additionalStats" class="stat-card performance">
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
    delivered: 'success'
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

<style scoped>
.orders-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Header Top */
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 36px;
  opacity: 0.9;
}

.page-subtitle {
  font-size: 16px;
  opacity: 0.8;
  margin: 0;
  font-weight: 400;
}

/* Actions */
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 120px;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.refresh-btn.loading {
  background: rgba(255, 255, 255, 0.1);
}

.export-btn {
  background: rgba(16, 185, 129, 0.2);
  color: white;
}

.create-btn {
  background: rgba(59, 130, 246, 0.2);
  color: white;
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-weight: 600;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.15);
}

.stat-card.primary {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  grid-column: span 2;
}

.stat-card.warning { border-left: 4px solid #f59e0b; }
.stat-card.info { border-left: 4px solid #3b82f6; }
.stat-card.purple { border-left: 4px solid #8b5cf6; }
.stat-card.success { border-left: 4px solid #10b981; }
.stat-card.revenue { border-left: 4px solid #f59e0b; }
.stat-card.performance { border-left: 4px solid #06b6d4; }

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-icon {
  font-size: 20px;
  opacity: 0.9;
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.stat-card.primary .stat-number {
  font-size: 36px;
}

.stat-percentage,
.stat-detail {
  font-size: 12px;
  opacity: 0.8;
  font-weight: 500;
}

.stat-change {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
  align-self: flex-start;
}

.stat-change.positive {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.stat-change.negative {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.stat-change.neutral {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}

/* Progress Bar */
.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #06b6d4);
  border-radius: 2px;
  transition: width 1s ease;
}

/* Update Info */
.update-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 14px;
  opacity: 0.8;
}

.update-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.update-icon {
  font-size: 12px;
}

.auto-refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.auto-refresh-btn:hover {
  background: rgba(16, 185, 129, 0.3);
}

.refresh-icon.animate {
  animation: rotate 2s linear infinite;
}

/* Animations */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
  
  .stat-card.primary {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .orders-header {
    padding: 20px;
  }
  
  .header-top {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .action-btn {
    min-width: 100px;
    padding: 10px 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .stat-number {
    font-size: 24px;
  }
  
  .update-info {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>