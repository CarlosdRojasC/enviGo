<template>
  <div class="table-section">
    <div class="table-container">
      <table class="orders-table">
        <!-- HEADER -->
        <thead>
          <tr>
            <th class="col-checkbox">
              <input 
                type="checkbox" 
                :checked="selectAllChecked"
                :indeterminate="selectAllIndeterminate"
                @change="$emit('select-all')"
                class="select-all-checkbox"
              />
            </th>
            <th class="col-order">Pedido</th>
            <th class="col-company">Empresa</th>
            <th class="col-customer">Cliente</th>
            <th class="col-address">Dirección</th>
            <th class="col-commune">Comuna</th>
            <th class="col-amount">Monto</th>
            <th class="col-status">Estado</th>
            <th class="col-date">Fechas</th>
            <th class="col-shipday">Shipday</th>
            <th class="col-actions">Acciones</th>
          </tr>
        </thead>

        <!-- BODY -->
        <tbody>
          <!-- LOADING STATE -->
          <tr v-if="loading" class="loading-row">
            <td colspan="11" class="loading-state">
              <div class="loading-spinner"></div>
              <span>Cargando pedidos...</span>
            </td>
          </tr>

          <!-- EMPTY STATE -->
          <tr v-else-if="orders.length === 0" class="empty-row">
            <td colspan="11" class="empty-state">
              <div class="empty-icon">📦</div>
              <p class="empty-title">No hay pedidos disponibles</p>
              <p class="empty-subtitle">Intenta ajustar los filtros o crear un nuevo pedido</p>
            </td>
          </tr>

          <!-- ORDER ROWS -->
          <tr 
            v-for="order in orders" 
            :key="order._id"
            class="order-row"
            :class="{ 
              'selected': isOrderSelected(order),
              'shipday-assigned': !!order.shipday_order_id 
            }"
          >
            <!-- CHECKBOX -->
            <td class="col-checkbox">
              <input 
                type="checkbox" 
                :checked="isOrderSelected(order)"
                @change="$emit('select-order', order)"
                :disabled="order.status !== 'pending' && order.status !== 'ready_for_pickup'"
                class="order-checkbox"
              />
            </td>

            <!-- ORDER NUMBER -->
            <td class="col-order">
              <div class="order-info">
                <div class="order-number">{{ order.order_number }}</div>
                <div class="order-id">ID: {{ order._id.slice(-6) }}</div>
                <div v-if="order.external_order_id" class="external-id">
                  Ext: {{ order.external_order_id.slice(-8) }}
                </div>
              </div>
            </td>

            <!-- COMPANY -->
            <td class="col-company">
              <div class="company-info">
                <div class="company-name">
                  {{ getCompanyName(order.company_id) }}
                </div>
                <div v-if="order.channel_id" class="channel-info">
                  Canal: {{ getChannelName(order.channel_id) }}
                </div>
              </div>
            </td>

            <!-- CUSTOMER -->
            <td class="col-customer">
              <div class="customer-info">
                <div class="customer-name">{{ order.customer_name }}</div>
                <div class="customer-contact">
                  <div v-if="order.customer_email" class="customer-email">
                    <span class="contact-icon">📧</span>
                    {{ order.customer_email }}
                  </div>
                  <div v-if="order.customer_phone" class="customer-phone">
                    <span class="contact-icon">📱</span>
                    {{ order.customer_phone }}
                  </div>
                </div>
              </div>
            </td>

            <!-- ADDRESS -->
            <td class="col-address">
              <div class="address-info">
                <div class="address-text">{{ order.shipping_address }}</div>
                <div v-if="order.shipping_state" class="address-state">
                  {{ order.shipping_state }}
                </div>
              </div>
            </td>

            <!-- COMMUNE -->
            <td class="col-commune">
              <div class="commune-cell">
                <span 
                  v-if="order.shipping_commune" 
                  class="commune-badge" 
                  :class="getCommuneClass(order.shipping_commune)"
                >
                  {{ order.shipping_commune }}
                </span>
                <span v-else class="commune-badge commune-empty">
                  Sin comuna
                </span>
              </div>
            </td>

            <!-- AMOUNT -->
            <td class="col-amount">
              <div class="amount-info">
                <div class="total-amount">{{ formatCurrency(order.total_amount) }}</div>
                <div v-if="order.shipping_cost" class="shipping-cost">
                  Envío: {{ formatCurrency(order.shipping_cost) }}
                </div>
              </div>
            </td>

            <!-- STATUS -->
            <td class="col-status">
              <span class="status-badge" :class="`status-${order.status}`">
                {{ getStatusName(order.status) }}
              </span>
              <div v-if="order.priority && order.priority !== 'Normal'" class="priority-badge">
                🔥 {{ order.priority }}
              </div>
            </td>

            <!-- DATES -->
            <td class="col-date">
              <div class="date-info">
                <div class="date-created">
                  <span class="date-label">Creado:</span>
                  <span class="date-value">{{ formatDate(order.created_at) }}</span>
                </div>
                <div v-if="order.updated_at !== order.created_at" class="date-updated">
                  <span class="date-label">Actualizado:</span>
                  <span class="date-value">{{ formatDate(order.updated_at) }}</span>
                </div>
                <div v-if="order.delivery_date" class="date-delivered">
                  <span class="date-label">Entregado:</span>
                  <span class="date-value">{{ formatDate(order.delivery_date, true) }}</span>
                </div>
              </div>
            </td>

            <!-- SHIPDAY STATUS -->
            <td class="col-shipday">
              <div class="shipday-info">
                <div v-if="order.shipday_order_id" class="shipday-assigned">
                  <div class="shipday-id">
                    <span class="shipday-badge active">
                      📦 {{ order.shipday_order_id.slice(-6) }}
                    </span>
                  </div>
                  <div v-if="order.driver_id" class="driver-assigned">
                    <span class="driver-badge">
                      🚚 Conductor asignado
                    </span>
                  </div>
                  <div v-else class="driver-pending">
                    <span class="driver-badge pending">
                      ⏳ Sin conductor
                    </span>
                  </div>
                </div>
                <div v-else class="shipday-pending">
                  <span class="shipday-badge pending">
                    📋 Sin asignar
                  </span>
                </div>
              </div>
            </td>

            <!-- ACTIONS -->
            <td class="col-actions">
              <div class="action-buttons">
                <button 
                  @click="$emit('view-details', order)" 
                  class="btn-action view"
                  title="Ver detalles del pedido"
                >
                  <span class="action-icon">👁️</span>
                  <span class="action-text">Ver</span>
                </button>

                <button 
                  @click="$emit('update-status', order)" 
                  class="btn-action edit"
                  title="Actualizar estado del pedido"
                >
                  <span class="action-icon">✏️</span>
                  <span class="action-text">Estado</span>
                </button>

                <button 
                  @click="$emit('assign-driver', order)" 
                  class="btn-action assign"
                 :disabled="order.status !== 'pending' && order.status !== 'ready_for_pickup'"
                 :title="['pending', 'ready_for_pickup'].includes(order.status) ? 'Asignar conductor' : 'No se puede asignar en este estado'"
                >
                  <span class="action-icon">🚚</span>
                  <span class="action-text">Asignar</span>
                </button>

                <div class="action-dropdown">
                  <button class="btn-action more" title="Más acciones">
                    <span class="action-icon">⋮</span>
                  </button>
                  <div class="dropdown-menu">
                    <button @click="debugOrder(order)" class="dropdown-item">
                      <span class="action-icon">🐛</span>
                      Debug
                    </button>
                    <button @click="duplicateOrder(order)" class="dropdown-item">
                      <span class="action-icon">📋</span>
                      Duplicar
                    </button>
                    <button @click="deleteOrder(order)" class="dropdown-item danger">
                      <span class="action-icon">🗑️</span>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PAGINATION -->
    <div class="pagination-section">
      <div class="pagination-info">
        <span class="results-info">
          Mostrando {{ startItem }} a {{ endItem }} de {{ pagination.total }} pedidos
        </span>
        <div class="page-size-selector">
          <label>Mostrar:</label>
          <select :value="pagination.limit" @change="$emit('page-size-change', $event.target.value)">
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>por página</span>
        </div>
      </div>

      <div class="pagination-controls">
        <button 
          @click="$emit('page-change', 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn first"
          title="Primera página"
        >
          ⏮️
        </button>

        <button 
          @click="$emit('page-change', pagination.page - 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn prev"
          title="Página anterior"
        >
          ◀️ Anterior
        </button>

        <div class="page-numbers">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            @click="$emit('page-change', page)"
            class="page-btn number"
            :class="{ active: page === pagination.page }"
          >
            {{ page }}
          </button>
        </div>

        <button 
          @click="$emit('page-change', pagination.page + 1)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn next"
          title="Página siguiente"
        >
          Siguiente ▶️
        </button>

        <button 
          @click="$emit('page-change', pagination.totalPages)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn last"
          title="Última página"
        >
          ⏭️
        </button>
      </div>

      <div class="pagination-jump">
        <label>Ir a página:</label>
        <input 
          type="number" 
          :min="1" 
          :max="pagination.totalPages"
          :value="pagination.page"
          @keyup.enter="goToPage($event.target.value)"
          class="page-input"
        />
        <span>de {{ pagination.totalPages }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// ==================== PROPS ====================
const props = defineProps({
  orders: {
    type: Array,
    required: true
  },
  companies: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
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
  }
})

// ==================== EMITS ====================
const emit = defineEmits([
  'select-order',
  'select-all',
  'view-details',
  'update-status',
  'assign-driver',
  'page-change',
  'page-size-change'
])

// ==================== COMPUTED ====================

/**
 * Calculate start item number for pagination display
 */
const startItem = computed(() => {
  return Math.max(1, ((props.pagination.page - 1) * props.pagination.limit) + 1)
})

/**
 * Calculate end item number for pagination display
 */
const endItem = computed(() => {
  return Math.min(props.pagination.page * props.pagination.limit, props.pagination.total)
})

/**
 * Calculate visible page numbers for pagination
 */
const visiblePages = computed(() => {
  const current = props.pagination.page
  const total = props.pagination.totalPages
  const delta = 2 // Number of pages to show on each side
  
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)
  
  // Adjust if we're near the beginning or end
  if (current <= delta + 1) {
    end = Math.min(total, delta * 2 + 1)
  }
  if (current >= total - delta) {
    start = Math.max(1, total - delta * 2)
  }
  
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// ==================== METHODS ====================

/**
 * Check if order is selected
 */
function isOrderSelected(order) {
  return props.selectedOrders.includes(order._id)
}

/**
 * Get company name by ID or object
 */
function getCompanyName(companyId) {
  if (!companyId) return 'Sin empresa'
  
  // Handle both string ID and populated object
  if (typeof companyId === 'object' && companyId.name) {
    return companyId.name
  }
  
  const company = props.companies.find(c => c._id === companyId)
  return company?.name || 'Empresa no encontrada'
}

/**
 * Get channel name (placeholder - would need channels data)
 */
function getChannelName(channelId) {
  if (typeof channelId === 'object' && channelId.name) {
    return channelId.name
  }
  return 'Canal'
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
 * Format date
 */
function formatDate(dateStr, withTime = false) {
  if (!dateStr) return 'N/A'
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }
  
  if (withTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  
  return new Date(dateStr).toLocaleString('es-CL', options)
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
    ready_for_pickup: 'Listo para recoger'
  }
  return statusMap[status] || status
}

/**
 * Get commune CSS class
 */
function getCommuneClass(commune) {
  if (!commune || commune === 'Sin comuna') return 'commune-empty'
  
  const importantCommunes = [
    'Las Condes', 'Vitacura', 'Providencia', 'Ñuñoa', 'Santiago',
    'La Florida', 'Peñalolén', 'Macul', 'San Miguel', 'Quinta Normal'
  ]
  
  const isImportant = importantCommunes.some(important => 
    commune.toLowerCase().includes(important.toLowerCase())
  )
  
  return isImportant ? 'commune-important' : 'commune-filled'
}

/**
 * Go to specific page
 */
function goToPage(page) {
  const pageNumber = parseInt(page)
  if (pageNumber >= 1 && pageNumber <= props.pagination.totalPages) {
    emit('page-change', pageNumber)
  }
}

/**
 * Debug order (placeholder)
 */
function debugOrder(order) {
  console.group('🐛 Order Debug')
  console.log('Order:', order)
  console.groupEnd()
}

/**
 * Duplicate order (placeholder)
 */
function duplicateOrder(order) {
  console.log('📋 Duplicate order:', order._id)
}

/**
 * Delete order (placeholder)
 */
function deleteOrder(order) {
  if (confirm(`¿Eliminar pedido ${order.order_number}?`)) {
    console.log('🗑️ Delete order:', order._id)
  }
}
</script>

<style scoped>
/* ==================== TABLE LAYOUT ==================== */
.table-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
  min-height: 400px;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

/* ==================== TABLE HEADER ==================== */
.orders-table thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.orders-table th {
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 10;
}

/* Column widths */
.col-checkbox { width: 40px; }
.col-order { width: 140px; }
.col-company { width: 150px; }
.col-customer { width: 180px; }
.col-address { width: 200px; }
.col-commune { width: 120px; }
.col-amount { width: 120px; }
.col-status { width: 120px; }
.col-date { width: 160px; }
.col-shipday { width: 140px; }
.col-actions { width: 160px; }

/* ==================== TABLE BODY ==================== */
.orders-table tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.orders-table tbody tr:hover {
  background: #f1f5f9;
}

.orders-table tbody tr.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.orders-table tbody tr.shipday-assigned {
  background: #f0fdf4;
}

.orders-table td {
  padding: 12px;
  vertical-align: top;
}

/* ==================== LOADING & EMPTY STATES ==================== */
.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f1f5f9;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.empty-subtitle {
  color: #64748b;
}

/* ==================== CELL CONTENT ==================== */

/* Order Info */
.order-info .order-number {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.order-info .order-id,
.order-info .external-id {
  font-size: 11px;
  color: #64748b;
}

/* Company Info */
.company-info .company-name {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
}

.company-info .channel-info {
  font-size: 11px;
  color: #64748b;
}

/* Customer Info */
.customer-info .customer-name {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 6px;
}

.customer-contact div {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 2px;
}

.contact-icon {
  margin-right: 4px;
}

/* Address Info */
.address-info .address-text {
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.4;
}

.address-info .address-state {
  font-size: 11px;
  color: #64748b;
}

/* Amount Info */
.amount-info .total-amount {
  font-weight: 600;
  color: #059669;
  margin-bottom: 4px;
}

.amount-info .shipping-cost {
  font-size: 11px;
  color: #64748b;
}

/* Date Info */
.date-info div {
  margin-bottom: 4px;
  font-size: 11px;
}

.date-label {
  color: #64748b;
  margin-right: 4px;
}

.date-value {
  color: #1e293b;
}

/* ==================== BADGES ==================== */

/* Status Badges */
.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-processing { background: #dbeafe; color: #1e40af; }
.status-shipped { background: #e9d5ff; color: #6b21a8; }
.status-delivered { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fee2e2; color: #991b1b; }
.status-ready_for_pickup { background: #ddd6fe; color: #5b21b6; }

/* Priority Badge */
.priority-badge {
  margin-top: 4px;
  font-size: 10px;
  color: #dc2626;
  font-weight: 600;
}

/* Commune Badges */
.commune-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.commune-filled {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.commune-important {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.commune-empty {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

/* Shipday Badges */
.shipday-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.shipday-badge.active {
  background: #dcfce7;
  color: #166534;
}

.shipday-badge.pending {
  background: #f1f5f9;
  color: #64748b;
}

.driver-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  margin-top: 4px;
}

.driver-badge:not(.pending) {
  background: #dcfce7;
  color: #166534;
}

.driver-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

/* ==================== ACTION BUTTONS ==================== */
.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action.view { color: #3b82f6; border-color: #93c5fd; }
.btn-action.view:hover { background: #dbeafe; }

.btn-action.edit { color: #8b5cf6; border-color: #c4b5fd; }
.btn-action.edit:hover { background: #ede9fe; }

.btn-action.assign { color: #059669; border-color: #6ee7b7; }
.btn-action.assign:hover:not(:disabled) { background: #d1fae5; }

.btn-action.more { color: #64748b; }
.btn-action.more:hover { background: #f1f5f9; }

/* Action Dropdown */
.action-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 20;
  min-width: 120px;
  display: none;
}

.action-dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-item.danger {
  color: #dc2626;
}

.dropdown-item.danger:hover {
  background: #fee2e2;
}

/* ==================== PAGINATION ==================== */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 16px;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #64748b;
  font-size: 14px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-selector select {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.pagination-jump {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
}

.page-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
}

/* ==================== CHECKBOXES ==================== */
.select-all-checkbox,
.order-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.select-all-checkbox:disabled,
.order-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 1400px) {
  .col-address { display: none; }
  .action-text { display: none; }
}

@media (max-width: 1200px) {
  .col-company { display: none; }
  .customer-contact { display: none; }
}

@media (max-width: 1000px) {
  .col-date { display: none; }
  .orders-table {
    font-size: 12px;
  }
}

@media (max-width: 800px) {
  .col-shipday { display: none; }
  .pagination-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .pagination-controls {
    justify-content: center;
  }
  
  .pagination-jump {
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .orders-table th,
  .orders-table td {
    padding: 8px 4px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
  
  .btn-action {
    font-size: 10px;
    padding: 4px 6px;
  }
}
</style>