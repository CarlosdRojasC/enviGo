<template>
  <div class="header-section">
    <!-- MAIN HEADER -->
    <div class="header-main">
      <div class="header-title-area">
        <h1 class="page-title">
          <span class="title-icon">📦</span>
          Pedidos Globales
        </h1>
        <p class="page-subtitle">
          Gestión centralizada de todos los pedidos del sistema
        </p>
      </div>

      <!-- HEADER ACTIONS -->
      <div class="header-actions">
        <button 
          @click="$emit('create-order')" 
          class="btn-header create"
          title="Crear un nuevo pedido manualmente"
        >
          <span class="btn-icon">➕</span>
          <span class="btn-text">Crear Pedido</span>
        </button>

        <button 
          @click="$emit('bulk-upload')" 
          class="btn-header upload"
          title="Subir múltiples pedidos desde Excel"
        >
          <span class="btn-icon">⬆️</span>
          <span class="btn-text">Subida Masiva</span>
        </button>

        <button 
          @click="$emit('export')" 
          class="btn-header export"
          :disabled="isExporting"
          title="Exportar pedidos para OptiRoute"
        >
          <span class="btn-icon">{{ isExporting ? '⏳' : '📤' }}</span>
          <span class="btn-text">
            {{ isExporting ? 'Exportando...' : 'Exportar OptiRoute' }}
          </span>
        </button>
      </div>
    </div>

    <!-- STATISTICS ROW -->
    <div class="header-stats" v-if="stats">
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.total || 0 }}</div>
            <div class="stat-label">Total Pedidos</div>
          </div>
        </div>

        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.pending || 0 }}</div>
            <div class="stat-label">Pendientes</div>
          </div>
        </div>

            <div class="stat-card assigned" v-if="stats.assigned > 0">
      <div class="stat-icon">👨‍💼</div>
      <div class="stat-content">
        <div class="stat-number">{{ stats.assigned || 0 }}</div>
        <div class="stat-label">Asignados</div>
      </div>
    </div>
        <div class="stat-card out-for-delivery" v-if="stats.out_for_delivery > 0">
      <div class="stat-icon">🚚</div>
      <div class="stat-content">
        <div class="stat-number">{{ stats.out_for_delivery || 0 }}</div>
        <div class="stat-label">En Ruta</div>
      </div>
    </div>


        <div class="stat-card ready">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.ready_for_pickup || 0 }}</div>
            <div class="stat-label">Listos</div>
          </div>
        </div>
        <div class="stat-card warehouse" v-if="stats.warehouse_received > 0">
      <div class="stat-icon">🏭</div>
      <div class="stat-content">
        <div class="stat-number">{{ stats.warehouse_received || 0 }}</div>
        <div class="stat-label">En Bodega</div>
      </div>
    </div>

        <div class="stat-card shipped">
          <div class="stat-icon">🚚</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.shipped || 0 }}</div>
            <div class="stat-label">Enviados</div>
          </div>
        </div>

        <div class="stat-card delivered">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.delivered || 0 }}</div>
            <div class="stat-label">Entregados</div>
          </div>
        </div>
      </div>

      <!-- ADDITIONAL METRICS -->
      <div class="additional-metrics" v-if="additionalStats">
        <div class="metric-item">
          <span class="metric-icon">💰</span>
          <span class="metric-label">Valor Total:</span>
          <span class="metric-value">{{ formatCurrency(additionalStats.totalValue) }}</span>
        </div>

        <div class="metric-item">
          <span class="metric-icon">📈</span>
          <span class="metric-label">Promedio por Pedido:</span>
          <span class="metric-value">{{ formatCurrency(additionalStats.averageValue) }}</span>
        </div>

        <div class="metric-item">
          <span class="metric-icon">🎯</span>
          <span class="metric-label">Tasa de Entrega:</span>
          <span class="metric-value">{{ additionalStats.deliveryRate }}%</span>
        </div>

        <div class="metric-item">
          <span class="metric-icon">🚛</span>
          <span class="metric-label">En Shipday:</span>
          <span class="metric-value">{{ additionalStats.shipdayOrders || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- QUICK ACTIONS BAR -->
    <div class="quick-actions-bar">
      <div class="quick-actions-label">
        <span class="actions-icon">⚡</span>
        <span>Acciones Rápidas:</span>
      </div>

      <div class="quick-actions-buttons">
        <button 
          @click="$emit('quick-action', 'refresh')"
          class="quick-btn refresh"
          title="Actualizar datos"
        >
          <span class="quick-icon">🔄</span>
          <span class="quick-text">Actualizar</span>
        </button>

        <button 
          @click="$emit('quick-action', 'pending-today')"
          class="quick-btn filter"
          title="Ver pedidos pendientes de hoy"
        >
          <span class="quick-icon">📅</span>
          <span class="quick-text">Pendientes Hoy</span>
        </button>

        <button 
          @click="$emit('quick-action', 'ready-pickup')"
          class="quick-btn filter"
          title="Ver pedidos listos para recoger"
        >
          <span class="quick-icon">📦</span>
          <span class="quick-text">Listos</span>
        </button>

        <button 
          @click="$emit('quick-action', 'unassigned')"
          class="quick-btn filter"
          title="Ver pedidos sin asignar a Shipday"
        >
          <span class="quick-icon">🚚</span>
          <span class="quick-text">Sin Asignar</span>
        </button>

        <div class="quick-actions-divider"></div>

        <button 
          @click="$emit('quick-action', 'bulk-status')"
          class="quick-btn action"
          title="Actualizar estado de múltiples pedidos"
        >
          <span class="quick-icon">📝</span>
          <span class="quick-text">Cambio Masivo</span>
        </button>

        <button 
          @click="$emit('quick-action', 'reports')"
          class="quick-btn action"
          title="Ver reportes y análisis"
        >
          <span class="quick-icon">📊</span>
          <span class="quick-text">Reportes</span>
        </button>
      </div>
    </div>

    <!-- LOADING OVERLAY -->
    <div v-if="isExporting" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <span class="loading-text">Exportando pedidos...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// ==================== PROPS ====================
const props = defineProps({
  isExporting: {
    type: Boolean,
    default: false
  },
  stats: {
    type: Object,
    default: null
  },
  additionalStats: {
    type: Object,
    default: null
  }
})

// ==================== EMITS ====================
const emit = defineEmits([
  'export',
  'create-order',
  'bulk-upload',
  'quick-action'
])

// ==================== COMPUTED ====================

/**
 * Calculate completion percentage for progress bars
 */
const completionRate = computed(() => {
  if (!props.stats || props.stats.total === 0) return 0
  return Math.round((props.stats.delivered / props.stats.total) * 100)
})

// ==================== METHODS ====================

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '$0'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount)
}
</script>

<style scoped>
/* ==================== MAIN LAYOUT ==================== */
.header-section {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 32px 28px 24px;
  position: relative;
  z-index: 2;
}

/* ==================== TITLE AREA ==================== */
.header-title-area {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.title-icon {
  font-size: 36px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.page-subtitle {
  margin: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

/* ==================== HEADER ACTIONS ==================== */
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.btn-header:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-header:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-header.create:hover:not(:disabled) {
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: transparent;
}

.btn-header.upload:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-color: transparent;
}

.btn-header.export:hover:not(:disabled) {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border-color: transparent;
}

.btn-icon {
  font-size: 18px;
}

/* ==================== STATISTICS ==================== */
.header-stats {
  padding: 0 28px 24px;
  position: relative;
  z-index: 2;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 24px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: white;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Stat card specific colors */
.stat-card.total { border-left: 4px solid #10b981; }
.stat-card.pending { border-left: 4px solid #f59e0b; }
.stat-card.processing { border-left: 4px solid #3b82f6; }
.stat-card.ready { border-left: 4px solid #8b5cf6; }
.stat-card.shipped { border-left: 4px solid #6366f1; }
.stat-card.delivered { border-left: 4px solid #10b981; }

/* ==================== ADDITIONAL METRICS ==================== */
.additional-metrics {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
  gap: 16px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.metric-icon {
  font-size: 16px;
}

.metric-label {
  color: rgba(255, 255, 255, 0.7);
}

.metric-value {
  font-weight: 600;
  color: white;
}

/* ==================== QUICK ACTIONS ==================== */
.quick-actions-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 28px;
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.quick-actions-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}

.actions-icon {
  font-size: 16px;
}

.quick-actions-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: translateY(-1px);
}

.quick-icon {
  font-size: 14px;
}

.quick-actions-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

/* ==================== LOADING OVERLAY ==================== */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 1024px) {
  .header-main {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .additional-metrics {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .header-main {
    padding: 24px 20px 20px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .title-icon {
    font-size: 32px;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .btn-header {
    justify-content: center;
    width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .header-stats {
    padding: 0 20px 20px;
  }
  
  .quick-actions-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 16px 20px;
  }
  
  .quick-actions-buttons {
    justify-content: center;
  }
  
  .additional-metrics {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .btn-text,
  .quick-text {
    display: none;
  }
  
  .quick-actions-buttons {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 8px;
  }
  
  .quick-btn {
    flex-shrink: 0;
  }
}
</style>