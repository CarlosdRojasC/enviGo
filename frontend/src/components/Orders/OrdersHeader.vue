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
  class="action-btn export-btn"
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
      <div class="stat-card" :class="getStatusClass('warehouse_received')">
        <div class="stat-header">
          <span class="stat-icon">🏭</span>
          <span class="stat-label">En Bodega</span>
        </div>
        <div class="stat-content">
          <span class="stat-number">{{ formatNumber(stats.warehouse_received) }}</span>
          <span class="stat-percentage">{{ getPercentage(stats.warehouse_received, stats.total) }}%</span>
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

<style scoped>
/* ==================== ORDERS HEADER BASE ==================== */
.orders-header {
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 10px 25px rgba(139, 197, 63, 0.2);
  position: relative;
  overflow: hidden;
}

.orders-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

/* ==================== HEADER TOP SECTION ==================== */
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
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
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-icon {
  font-size: 36px;
  opacity: 0.9;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.page-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
}

/* ==================== HEADER ACTIONS ==================== */
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  position: relative;
  z-index: 1;
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
  border: 1px solid rgba(255, 255, 255, 0.3);
  min-width: 120px;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  transition: left 0.3s ease;
  z-index: -1;
}

.action-btn:hover:not(:disabled)::before {
  left: 0;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-btn:active {
  transform: translateY(0) !important;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.refresh-btn.loading {
  background: rgba(255, 255, 255, 0.1);
}

.export-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.create-btn {
  background: #6BA428;
  color: white;
  border-color: #6BA428;
}

.create-btn:hover:not(:disabled) {
  background: #7AB32E;
  border-color: #7AB32E;
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-weight: 600;
}

/* ==================== STATS GRID ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.25);
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 3s infinite;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
}

.stat-card:hover .stat-icon {
  transform: scale(1.1);
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-number {
  transform: scale(1.05);
  transition: transform 0.3s ease;
}

.stat-card.primary {
  background: rgba(255, 255, 255, 0.25);
  border: 2px solid rgba(255, 255, 255, 0.4);
  grid-column: span 2;
}

/* ==================== STAT CARD TYPES ==================== */
.stat-card.warning { 
  border-left: 4px solid #f59e0b; 
}

.stat-card.info { 
  border-left: 4px solid #3b82f6; 
}

.stat-card.purple { 
  border-left: 4px solid #8b5cf6; 
}

.stat-card.success { 
  border-left: 4px solid #6BA428; 
}

.stat-card.revenue { 
  border-left: 4px solid #f59e0b; 
}

.stat-card.performance { 
  border-left: 4px solid #A4D65E; 
}

/* ==================== STAT CARD CONTENT ==================== */
.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-icon {
  font-size: 20px;
  opacity: 0.95;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.95;
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
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card.primary .stat-number {
  font-size: 36px;
}

.stat-percentage,
.stat-detail {
  font-size: 12px;
  opacity: 0.85;
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
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.stat-change.negative {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.stat-change.neutral {
  background: rgba(255, 255, 255, 0.15);
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* ==================== PROGRESS BAR ==================== */
.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0.8));
  border-radius: 2px;
  transition: width 1s ease;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}

/* ==================== UPDATE INFO ==================== */
.update-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 14px;
  opacity: 0.9;
  position: relative;
  z-index: 1;
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
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.auto-refresh-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.refresh-icon.animate {
  animation: rotate 2s linear infinite;
}

/* ==================== ANIMATIONS ==================== */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==================== RESPONSIVE DESIGN ==================== */

/* Tablet - 1024px and down */
@media (max-width: 1024px) {
  .orders-header {
    padding: 20px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
  }
  
  .stat-card.primary {
    grid-column: span 1;
  }
  
  .stat-card {
    padding: 18px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .title-icon {
    font-size: 32px;
  }
  
  .action-btn {
    min-width: 110px;
    padding: 10px 18px;
  }
  
  .stat-number {
    font-size: 26px;
  }
  
  .stat-card.primary .stat-number {
    font-size: 32px;
  }
}

/* Mobile Landscape - 768px and down */
@media (max-width: 768px) {
  .orders-header {
    padding: 20px;
    border-radius: 12px;
  }
  
  .header-top {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .action-btn {
    min-width: 100px;
    padding: 10px 16px;
    flex: 1;
    max-width: 140px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .title-icon {
    font-size: 28px;
  }
  
  .page-subtitle {
    font-size: 14px;
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
  
  .stat-card.primary .stat-number {
    font-size: 28px;
  }
  
  .stat-icon {
    font-size: 18px;
  }
  
  .stat-label {
    font-size: 13px;
  }
  
  .stat-percentage,
  .stat-detail {
    font-size: 11px;
  }
  
  .update-info {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .auto-refresh-btn {
    align-self: center;
  }
}

/* Mobile Portrait - 480px and down */
@media (max-width: 480px) {
  .orders-header {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .header-top {
    gap: 12px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .title-icon {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 13px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .stat-card {
    padding: 14px;
  }
  
  .stat-number {
    font-size: 22px;
  }
  
  .stat-card.primary .stat-number {
    font-size: 26px;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }
  
  .action-btn {
    width: 100%;
    max-width: none;
    padding: 12px 16px;
  }
  
  .update-info {
    padding-top: 12px;
    font-size: 12px;
  }
  
  .auto-refresh-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
}

/* Small Mobile - 320px and down */
@media (max-width: 320px) {
  .orders-header {
    padding: 12px;
    border-radius: 8px;
  }
  
  .page-title {
    font-size: 18px;
    gap: 8px;
  }
  
  .title-icon {
    font-size: 20px;
  }
  
  .action-btn {
    padding: 10px 12px;
    font-size: 13px;
    min-width: auto;
  }
  
  .btn-text {
    font-size: 12px;
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .stat-card.primary .stat-number {
    font-size: 24px;
  }
  
  .stat-icon {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .stat-percentage,
  .stat-detail {
    font-size: 10px;
  }
}

/* ==================== LANDSCAPE ORIENTATION ==================== */
@media (max-height: 500px) and (orientation: landscape) {
  .orders-header {
    padding: 16px;
  }
  
  .header-top {
    margin-bottom: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .stats-grid {
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .stat-card {
    padding: 14px;
  }
  
  .update-info {
    padding-top: 12px;
  }
}

/* ==================== HIGH DPI DISPLAYS ==================== */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .orders-header {
    box-shadow: 0 10px 25px rgba(139, 197, 63, 0.25);
  }
  
  .stat-card:hover {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
}

/* ==================== DARK MODE SUPPORT ==================== */
@media (prefers-color-scheme: dark) {
  .orders-header {
    box-shadow: 0 10px 25px rgba(139, 197, 63, 0.3);
  }
  
  .stat-card {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .stat-card:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}

/* ==================== REDUCED MOTION ==================== */
@media (prefers-reduced-motion: reduce) {
  .orders-header,
  .stat-card,
  .action-btn,
  .auto-refresh-btn {
    transition: none;
  }
  
  .stat-card::before {
    animation: none;
  }
  
  .refresh-icon.animate {
    animation: none;
  }
  
  .stat-card:hover .stat-icon,
  .stat-card:hover .stat-number {
    transform: none;
  }
}

/* ==================== PRINT STYLES ==================== */
@media print {
  .orders-header {
    background: #8BC53F !important;
    box-shadow: none;
    break-inside: avoid;
  }
  
  .orders-header::before {
    display: none;
  }
  
  .header-actions {
    display: none;
  }
  
  .auto-refresh-btn {
    display: none;
  }
  
  .stat-card {
    background: rgba(139, 197, 63, 0.1) !important;
    border: 1px solid #8BC53F !important;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ==================== ACCESSIBILITY IMPROVEMENTS ==================== */
@media (prefers-contrast: high) {
  .orders-header {
    background: linear-gradient(135deg, #7AB32E 0%, #8BC53F 100%);
  }
  
  .stat-card {
    border: 2px solid rgba(255, 255, 255, 0.5);
  }
  
  .action-btn {
    border: 2px solid rgba(255, 255, 255, 0.5);
  }
}

/* ==================== FOCUS STATES ==================== */
.action-btn:focus,
.auto-refresh-btn:focus {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

.stat-card:focus-within {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
}

/* ==================== HOVER STATES FOR NON-TOUCH DEVICES ==================== */
@media (hover: hover) and (pointer: fine) {
  .action-btn:hover {
    transform: translateY(-2px);
  }
  
  .stat-card:hover {
    transform: translateY(-4px);
  }
  
  .auto-refresh-btn:hover {
    transform: translateY(-1px);
  }
}
</style>