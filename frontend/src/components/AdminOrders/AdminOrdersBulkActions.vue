<template>
  <div class="bulk-actions-section">
    <div class="bulk-actions-container">
      <!-- SELECTION INFO -->
      <div class="selection-info">
        <div class="selection-count">
          <span class="count-icon">☑️</span>
          <span class="count-text">
            <strong>{{ selectedCount }}</strong> 
            pedido{{ selectedCount !== 1 ? 's' : '' }} seleccionado{{ selectedCount !== 1 ? 's' : '' }}
          </span>
        </div>
        
        <div class="selection-summary" v-if="selectionSummary">
          <div class="summary-item">
            <span class="summary-icon">💰</span>
            <span class="summary-label">Valor total:</span>
            <span class="summary-value">{{ formatCurrency(selectionSummary.totalValue) }}</span>
          </div>
          
          <div class="summary-item" v-if="selectionSummary.companies > 1">
            <span class="summary-icon">🏢</span>
            <span class="summary-label">Empresas:</span>
            <span class="summary-value">{{ selectionSummary.companies }}</span>
          </div>
          
          <div class="summary-item" v-if="selectionSummary.communes > 1">
            <span class="summary-icon">🏘️</span>
            <span class="summary-label">Comunas:</span>
            <span class="summary-value">{{ selectionSummary.communes }}</span>
          </div>
        </div>
      </div>

      <!-- BULK ACTIONS -->
      <div class="bulk-actions">
        <!-- Primary Actions -->
        <div class="primary-actions">
          <button 
            @click="$emit('bulk-assign')"
            class="bulk-btn primary assign"
            :disabled="!canAssignDrivers"
            title="Asignar conductor a todos los pedidos seleccionados"
          >
            <span class="btn-icon">🚚</span>
            <span class="btn-text">Asignar Conductor</span>
            <span class="btn-count">{{ assignableCount }}</span>
          </button>

          <div class="action-dropdown">
            <button class="bulk-btn primary dropdown-toggle">
              <span class="btn-icon">📝</span>
              <span class="btn-text">Cambiar Estado</span>
              <span class="dropdown-arrow">▼</span>
            </button>
            
            <div class="dropdown-menu">
              <button 
                @click="$emit('bulk-status-change', 'processing')"
                class="dropdown-item"
              >
                <span class="item-icon">⚙️</span>
                <span class="item-text">Marcar como Procesando</span>
              </button>
              
              <button 
                @click="$emit('bulk-status-change', 'ready_for_pickup')"
                class="dropdown-item"
              >
                <span class="item-icon">📦</span>
                <span class="item-text">Listo para Recoger</span>
              </button>
              <button 
                @click="$emit('bulk-status-change', 'warehouse_received')"
                class="dropdown-item"
              >
                <span class="item-icon">🏭</span>
                <span class="item-text">Marcar como Recibido</span>
              </button>
              <button 
                @click="$emit('bulk-status-change', 'shipped')"
                class="dropdown-item"
              >
                <span class="item-icon">🚚</span>
                <span class="item-text">Marcar como Enviado</span>
              </button>
              
              <div class="dropdown-divider"></div>
              
              <button 
                @click="$emit('bulk-status-change', 'cancelled')"
                class="dropdown-item danger"
              >
                <span class="item-icon">❌</span>
                <span class="item-text">Cancelar Pedidos</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Secondary Actions -->
        <div class="secondary-actions">
          <button 
            @click="$emit('bulk-export')"
            class="bulk-btn secondary export"
            title="Exportar pedidos seleccionados"
          >
            <span class="btn-icon">📤</span>
            <span class="btn-text">Exportar</span>
          </button>

          <button 
            @click="$emit('bulk-print')"
            class="bulk-btn secondary print"
            title="Imprimir etiquetas de envío"
          >
            <span class="btn-icon">🖨️</span>
            <span class="btn-text">Imprimir</span>
          </button>

          <div class="action-separator"></div>

          <button 
            @click="$emit('clear-selection')"
            class="bulk-btn secondary clear"
            title="Limpiar selección"
          >
            <span class="btn-icon">✕</span>
            <span class="btn-text">Limpiar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- BULK OPERATION STATUS -->
    <div v-if="bulkOperationStatus" class="bulk-status-bar" :class="bulkOperationStatus.type">
      <div class="status-content">
        <span class="status-icon">
          {{ bulkOperationStatus.type === 'loading' ? '⏳' : 
              bulkOperationStatus.type === 'success' ? '✅' : 
              bulkOperationStatus.type === 'error' ? '❌' : 'ℹ️' }}
        </span>
        
        <span class="status-message">{{ bulkOperationStatus.message }}</span>
        
        <div v-if="bulkOperationStatus.progress" class="status-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: bulkOperationStatus.progress + '%' }"
            ></div>
          </div>
          <span class="progress-text">{{ bulkOperationStatus.progress }}%</span>
        </div>
      </div>
      
      <button 
        v-if="bulkOperationStatus.dismissible"
        @click="dismissStatus"
        class="status-dismiss"
      >
        ✕
      </button>
    </div>

    <!-- SELECTION BREAKDOWN -->
    <div v-if="showBreakdown" class="selection-breakdown">
      <div class="breakdown-header">
        <h4 class="breakdown-title">
          <span class="title-icon">📊</span>
          Desglose de Selección
        </h4>
        <button @click="toggleBreakdown" class="breakdown-toggle">
          {{ showBreakdown ? '▲' : '▼' }}
        </button>
      </div>
      
      <div class="breakdown-content">
        <div class="breakdown-grid">
          <div class="breakdown-item">
            <span class="breakdown-label">Por Estado:</span>
            <div class="breakdown-values">
              <span v-for="(count, status) in statusBreakdown" :key="status" class="breakdown-value">
                <span class="status-badge" :class="`status-${status}`">{{ getStatusName(status) }}</span>
                <span class="status-count">{{ count }}</span>
              </span>
            </div>
          </div>
          
          <div class="breakdown-item" v-if="companyBreakdown">
            <span class="breakdown-label">Por Empresa:</span>
            <div class="breakdown-values">
              <span v-for="(count, companyId) in companyBreakdown" :key="companyId" class="breakdown-value">
                <span class="company-name">{{ getCompanyName(companyId) }}</span>
                <span class="company-count">{{ count }}</span>
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
  }
})

// ==================== EMITS ====================
const emit = defineEmits([
  'bulk-assign',
  'bulk-status-change',
  'bulk-export',
  'bulk-print',
  'clear-selection'
])

// ==================== STATE ====================
const showBreakdown = ref(false)

// ==================== COMPUTED ====================

/**
 * Count of orders that can be assigned to drivers
 */
const assignableCount = computed(() => {
   return props.selectedOrders.filter(order => 
    ['pending', 'ready_for_pickup'].includes(order.status)
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
  // Emit event to parent to clear status
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
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    ready_for_pickup: 'Listo'
  }
  return statusMap[status] || status
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
/* ==================== MAIN LAYOUT ==================== */
.bulk-actions-section {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  animation: slideIn 0.3s ease-out;
}

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

.bulk-actions-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  gap: 24px;
}

/* ==================== SELECTION INFO ==================== */
.selection-info {
  flex: 1;
  min-width: 200px;
}

.selection-count {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.count-icon {
  font-size: 18px;
}

.count-text {
  font-size: 16px;
  font-weight: 600;
}

.selection-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  opacity: 0.9;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-icon {
  font-size: 14px;
}

.summary-label {
  color: rgba(255, 255, 255, 0.8);
}

.summary-value {
  font-weight: 600;
}

/* ==================== BULK ACTIONS ==================== */
.bulk-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.primary-actions,
.secondary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.bulk-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-btn.primary {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.bulk-btn.primary.assign:hover:not(:disabled) {
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: transparent;
}

.bulk-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  font-size: 13px;
  padding: 8px 12px;
}

.bulk-btn.secondary.clear {
  color: #fca5a5;
  border-color: rgba(252, 165, 165, 0.3);
}

.bulk-btn.secondary.clear:hover {
  background: rgba(220, 38, 38, 0.2);
  border-color: #f87171;
}

.btn-icon {
  font-size: 16px;
}

.btn-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
}

/* ==================== DROPDOWN ==================== */
.action-dropdown {
  position: relative;
}

.dropdown-toggle {
  position: relative;
}

.dropdown-arrow {
  font-size: 12px;
  margin-left: 4px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 50;
  min-width: 200px;
  margin-top: 8px;
  display: none;
  animation: dropdownIn 0.2s ease-out;
}

.action-dropdown:hover .dropdown-menu {
  display: block;
  animation: dropdownIn 0.2s ease-out;
  
}

@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item.danger {
  color: #dc2626;
}

.dropdown-item.danger:hover {
  background: #fee2e2;
}

.dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.item-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.action-separator {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 8px;
}

/* ==================== BULK STATUS BAR ==================== */
.bulk-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.bulk-status-bar.loading {
  background: rgba(59, 130, 246, 0.2);
}

.bulk-status-bar.success {
  background: rgba(16, 185, 129, 0.2);
}

.bulk-status-bar.error {
  background: rgba(220, 38, 38, 0.2);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.status-icon {
  font-size: 18px;
}

.status-message {
  font-size: 14px;
  font-weight: 500;
}

.status-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.progress-bar {
  width: 100px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: white;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  min-width: 35px;
}

.status-dismiss {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.2s;
}

.status-dismiss:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ==================== SELECTION BREAKDOWN ==================== */
.selection-breakdown {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  cursor: pointer;
}

.breakdown-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.title-icon {
  font-size: 16px;
}

.breakdown-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
}

.breakdown-content {
  padding: 0 24px 16px;
}

.breakdown-grid {
  display: grid;
  gap: 16px;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.breakdown-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.breakdown-value {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 12px;
}

.status-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-processing { background: #dbeafe; color: #1e40af; }
.status-shipped { background: #e9d5ff; color: #6b21a8; }
.status-delivered { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fee2e2; color: #991b1b; }
.status-ready_for_pickup { background: #ddd6fe; color: #5b21b6; }

.status-count,
.company-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 10px;
}

.company-name {
  font-weight: 500;
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 1024px) {
  .bulk-actions-container {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .selection-info {
    text-align: center;
  }
  
  .bulk-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .selection-summary {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .bulk-actions-container {
    padding: 12px 16px;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  
  .primary-actions,
  .secondary-actions {
    justify-content: center;
    width: 100%;
  }
  
  .bulk-btn {
    flex: 1;
    justify-content: center;
  }
  
  .action-separator {
    display: none;
  }
  
  .breakdown-header,
  .breakdown-content {
    padding-left: 16px;
    padding-right: 16px;
  }
}

@media (max-width: 480px) {
  .btn-text {
    display: none;
  }
  
  .bulk-btn {
    min-width: 44px;
    justify-content: center;
  }
  
  .selection-summary {
    flex-direction: column;
    gap: 8px;
  }
  
  .breakdown-values {
    justify-content: center;
  }
}
</style>