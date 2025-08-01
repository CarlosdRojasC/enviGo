<!-- frontend/src/components/Orders/OrdersTable.vue -->
<template>
  <div class="orders-table-container">
    <!-- Table Header with Bulk Actions -->
    <div v-if="selectedOrders.length > 0" class="bulk-actions-bar">
      <div class="bulk-selection-info">
        <span class="selection-count">{{ selectedOrders.length }} pedido{{ selectedOrders.length !== 1 ? 's' : '' }} seleccionado{{ selectedOrders.length !== 1 ? 's' : '' }}</span>
        <button @click="$emit('clear-selection')" class="clear-selection-btn">
          ✕ Limpiar selección
        </button>
      </div>
      
      <div class="bulk-actions">
        <button 
          @click="$emit('bulk-mark-ready')" 
          class="bulk-btn ready-btn"
          :disabled="!canMarkAsReady"
        >
          📦 Marcar como Listos
        </button>
        
        <button 
          @click="$emit('generate-manifest')" 
          class="bulk-btn manifest-btn"
        >
          📋 Generar Manifiesto
        </button>
        
        <button 
          @click="$emit('bulk-export')" 
          class="bulk-btn export-btn"
        >
          📊 Exportar Selección
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">Cargando pedidos...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="empty-container">
      <div class="empty-content">
        <div class="empty-icon">📦</div>
        <h3 class="empty-title">No hay pedidos</h3>
        <p class="empty-description">
          {{ emptyMessage || 'No se encontraron pedidos con los filtros actuales.' }}
        </p>
        <button 
          v-if="showCreateButton" 
          @click="$emit('create-order')" 
          class="create-order-btn"
        >
          ➕ Crear Primer Pedido
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="table-wrapper">
      <table class="orders-table">
        <thead class="table-header">
          <tr>
            <th class="col-checkbox">
              <div class="checkbox-wrapper">
                <input 
                  type="checkbox" 
                  :checked="selectAllChecked"
                  :indeterminate="selectAllIndeterminate"
                  @change="$emit('toggle-select-all')"
                  class="select-all-checkbox"
                />
                <span class="checkbox-label">Todo</span>
              </div>
            </th>
            <th class="col-order sortable" @click="$emit('sort', 'order_number')">
              <div class="header-content">
                <span class="header-text">Pedido</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="col-customer sortable" @click="$emit('sort', 'customer_name')">
              <div class="header-content">
                <span class="header-text">Cliente</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="col-address">
              <span class="header-text">Dirección</span>
            </th>
            <th class="col-status sortable" @click="$emit('sort', 'status')">
              <div class="header-content">
                <span class="header-text">Estado</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="col-tracking">
              <span class="header-text">Seguimiento</span>
            </th>
            <th class="col-amount sortable" @click="$emit('sort', 'total_amount')">
              <div class="header-content">
                <span class="header-text">Monto</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="col-date sortable" @click="$emit('sort', 'order_date')">
              <div class="header-content">
                <span class="header-text">Fecha</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="col-actions">
              <span class="header-text">Acciones</span>
            </th>
          </tr>
        </thead>
        
        <tbody class="table-body">
          <OrderTableRow
            v-for="order in orders"
            :key="order._id"
            :order="order"
            :selected="selectedOrders.includes(order._id)"
            :selectable="isOrderSelectable(order)"
            @toggle-selection="$emit('toggle-selection', order)"
            @view-details="$emit('view-details', order)"
            @mark-ready="$emit('mark-ready', order)"
            @track-live="$emit('track-live', order)"
            @view-tracking="$emit('view-tracking', order)"
            @view-proof="$emit('view-proof', order)"
            @contact-support="$emit('contact-support', order)"
          />
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="pagination-container">
      <div class="pagination-info">
        <span class="info-text">
          Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
          de {{ pagination.total }} pedidos
        </span>
        
        <select 
  :value="pagination.limit" 
  @change="$emit('change-page-size', $event.target.value)"
  class="page-size-select"
>
  <option value="15">15 por página</option>
  <option value="25">25 por página</option>
  <option value="30">30 por página</option>
  <option value="50">50 por página</option>
</select>
      </div>
      
      <div class="pagination-controls">
        <button 
          @click="$emit('go-to-page', 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn first-btn"
          title="Primera página"
        >
          ⏮️
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.page - 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn prev-btn"
        >
          ← Anterior
        </button>
        
        <div class="page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="$emit('go-to-page', page)"
            class="page-number-btn"
            :class="{ 'active': page === pagination.page }"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="$emit('go-to-page', pagination.page + 1)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn next-btn"
        >
          Siguiente →
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.totalPages)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn last-btn"
          title="Última página"
        >
          ⏭️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import OrderTableRow from './OrderTableRow.vue'

const props = defineProps({
  orders: {
    type: Array,
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
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    required: true,
    default: () => ({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1
    })
  },
  emptyMessage: {
    type: String,
    default: ''
  },
  showCreateButton: {
    type: Boolean,
    default: true
  }
})

defineEmits([
  'toggle-selection',
  'toggle-select-all',
  'clear-selection',
  'view-details',
  'mark-ready',
  'track-live',
  'view-tracking',
  'view-proof',
  'contact-support',
  'bulk-mark-ready',
  'generate-manifest',
  'bulk-export',
  'create-order',
  'sort',
  'go-to-page',
  'change-page-size'
])

// Computed properties
const canMarkAsReady = computed(() => {
  return props.selectedOrders.some(orderId => {
    const order = props.orders.find(o => o._id === orderId)
    return order && order.status === 'pending'
  })
})

const visiblePages = computed(() => {
  const current = props.pagination.page
  const total = props.pagination.totalPages
  const delta = 2 // Number of pages to show on each side
  
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)
  
  // Adjust if we're near the beginning or end
  if (end - start < delta * 2) {
    if (start === 1) {
      end = Math.min(total, start + delta * 2)
    } else {
      start = Math.max(1, end - delta * 2)
    }
  }
  
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// Methods
function isOrderSelectable(order) {
  // Define logic for which orders can be selected
  return !order.shipday_order_id && ['pending', 'ready_for_pickup'].includes(order.status)
}
</script>

<style scoped>
.orders-table-container {
  background: white;
  border-radius: 12px; /* Cambié de 16px a 12px como AdminOrdersTable */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Simplificado como AdminOrdersTable */
  display: flex;
  flex-direction: column;
  border: none; /* Quitar border */
  overflow: hidden; /* CRÍTICO: evita el scroll del contenedor */
  /* QUITAR max-height: 85vh; */
}
/* Bulk Actions Bar */
.bulk-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.bulk-selection-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selection-count {
  font-weight: 600;
  font-size: 14px;
}

.clear-selection-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-selection-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.bulk-actions {
  display: flex;
  gap: 12px;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.bulk-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.ready-btn {
  background: rgba(16, 185, 129, 0.2);
  color: white;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.manifest-btn {
  background: rgba(59, 130, 246, 0.2);
  color: white;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.export-btn {
  background: rgba(245, 158, 11, 0.2);
  color: white;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

/* Loading State */
.loading-container {
  padding: 80px 20px;
  text-align: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-container {
  padding: 80px 20px;
  text-align: center;
}

.empty-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.empty-description {
  color: #6b7280;
  font-size: 16px;
  line-height: 1.5;
  margin: 0 0 24px 0;
}

.create-order-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.create-order-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

/* Table Wrapper */
.table-wrapper {
  overflow-x: auto; /* Solo para móvil */
  min-height: 400px; /* Como AdminOrdersTable */
  background: white;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
}

/* Table Header */
.table-header th {
  background: #f8fafc; /* Color plano como AdminOrdersTable */
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #475569; /* Color como AdminOrdersTable */
  border-bottom: 2px solid #e2e8f0;
  font-size: 13px;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.table-header th.sortable {
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.table-header th.sortable:hover {
  background: #f1f5f9; /* Sin gradiente como AdminOrdersTable */
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-text {
  font-weight: 600;
}

.sort-icon {
  font-size: 12px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.sortable:hover .sort-icon {
  opacity: 1;
}

/* Checkbox Column */
.col-checkbox {
  width: 60px;
  text-align: center;
}

.checkbox-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.select-all-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
}

/* Column Widths */
.col-order { width: 140px; }
.col-customer { width: 180px; }
.col-address { width: 220px; }
.col-status { width: 140px; }
.col-tracking { width: 140px; }
.col-amount { width: 120px; }
.col-date { width: 120px; }
.col-actions { width: 140px; }

/* Table Body */
.table-body tr {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-body tr:hover {
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
  transform: scale(1.001);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.table-body tr:last-child {
  border-bottom: none;
}

/* Pagination */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.info-text {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.page-size-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-size-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
}

.page-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.page-numbers {
  display: flex;
  gap: 4px;
  margin: 0 8px;
}

.page-number-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-number-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.page-number-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: #6366f1;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .col-address { width: 180px; }
  .col-customer { width: 150px; }
}

@media (max-width: 1024px) {
  .orders-table-container {
    margin: 0 -16px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  
  .bulk-actions-bar,
  .pagination-container {
    padding: 16px;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .bulk-btn {
    width: 100%;
    justify-content: center;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 16px;
  }
  
  .pagination-info {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .table-wrapper {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
  }
  
  .orders-table {
    min-width: 800px;
  }
  
  .table-header th,
  .table-body td {
    padding: 12px 8px;
  }
  
  .col-address,
  .col-customer {
    display: none;
  }
  
  .page-numbers {
    display: none;
  }
  
  .pagination-controls {
    justify-content: center;
    gap: 12px;
  }
  
  .first-btn,
  .last-btn {
    display: none;
  }
}

@media (max-width: 480px) {
  .bulk-actions-bar {
    padding: 12px;
  }
  
  .bulk-selection-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .selection-count {
    font-size: 13px;
  }
  
  .orders-table {
    font-size: 12px;
  }
  
  .table-header th,
  .table-body td {
    padding: 8px 6px;
  }
  
  .col-tracking {
    display: none;
  }
}

/* Loading animation for table rows */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.loading-row {
  background: linear-gradient(
    90deg,
    #f0f0f0 0px,
    #e0e0e0 40px,
    #f0f0f0 80px
  );
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}

/* Accessibility improvements */
.orders-table-container:focus-within {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.select-all-checkbox:focus,
.page-btn:focus,
.page-number-btn:focus,
.page-size-select:focus {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* Print styles */
@media print {
  .bulk-actions-bar,
  .pagination-container {
    display: none;
  }
  
  .orders-table-container {
    box-shadow: none;
    border: 1px solid #000;
  }
  
  .table-header th {
    background: #f5f5f5 !important;
    color: #000 !important;
  }
}
.status-badge.status-warehouse_received {
  background: linear-gradient(135deg, #6f42c1, #8e44ad);
  color: white;
  border: none;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(111, 66, 193, 0.3);
}

/* Badge para En Ruta mejorado */
.status-badge.status-shipped {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: none;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
}
.status-badge.status-out_for_delivery {
  background: linear-gradient(135deg, #ffc107, #ffca2c);
  color: white;
  border: none;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(255, 193, 7, 0.3);
}
.status-badge.status-invoiced {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
  border: none;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(23, 162, 184, 0.3);
}

/* Animación sutil para estados activos */
.status-badge.status-warehouse_received,
.status-badge.status-shipped {
  animation: gentlePulse 4s infinite;
}

@keyframes gentlePulse {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.9;
    transform: scale(1.02);
  }
}

/* Filas con indicador visual sutil */
.order-row:has(.status-warehouse_received) {
  background: linear-gradient(90deg, rgba(111, 66, 193, 0.04), transparent);
  border-left: 3px solid #6f42c1;
}

.order-row:has(.status-shipped) {
  background: linear-gradient(90deg, rgba(40, 167, 69, 0.04), transparent);
  border-left: 3px solid #28a745;
}

/* Hover effect mejorado */
.order-row:hover .status-badge {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

/* Badge responsive */
@media (max-width: 768px) {
  .status-badge.status-warehouse_received,
  .status-badge.status-shipped {
    font-size: 10px;
    padding: 4px 10px;
  }
}
</style>