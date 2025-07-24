<!-- frontend/src/components/Orders/OrderTableRow.vue -->
<template>
  <div class="table-section">
    <!-- SOLUCIÓN AL DOBLE SCROLL: Contenedor único sin overflow-x -->
    <div class="table-container">
      <table class="orders-table">
        <!-- HEADER - Igual que AdminOrdersTable -->
        <thead>
          <tr>
            <th class="col-checkbox">
              <input 
                type="checkbox" 
                :checked="selectAllChecked"
                :indeterminate="selectAllIndeterminate"
                @change="$emit('toggle-select-all')"
                class="select-all-checkbox"
              />
            </th>
            <th class="col-order">Pedido</th>
            <th class="col-customer">Cliente</th>
            <th class="col-address">Dirección</th>
            <th class="col-status">Estado</th>
            <th class="col-tracking">Seguimiento</th>
            <th class="col-amount">Monto</th>
            <th class="col-date">Fechas</th>
            <th class="col-actions">Acciones</th>
          </tr>
        </thead>

        <!-- BODY -->
        <tbody>
          <!-- LOADING STATE -->
          <tr v-if="loading" class="loading-row">
            <td colspan="9" class="loading-state">
              <div class="loading-spinner"></div>
              <span>Cargando pedidos...</span>
            </td>
          </tr>

          <!-- EMPTY STATE -->
          <tr v-else-if="orders.length === 0" class="empty-row">
            <td colspan="9" class="empty-state">
              <div class="empty-icon">📦</div>
              <p class="empty-title">No hay pedidos disponibles</p>
              <p class="empty-subtitle">Crea tu primer pedido o sincroniza desde tus canales de venta</p>
              <button 
                v-if="showCreateButton" 
                @click="$emit('create-order')" 
                class="create-order-btn"
              >
                ➕ Crear Primer Pedido
              </button>
            </td>
          </tr>

          <!-- ORDER ROWS - Con funcionalidades de empresa -->
          <tr 
            v-for="order in orders" 
            :key="order._id"
            class="order-row"
            :class="{ 
              'selected': isOrderSelected(order),
              'in-transit': isInTransit(order),
              'ready-for-pickup': order.status === 'ready_for_pickup'
            }"
          >
            <!-- CHECKBOX -->
            <td class="col-checkbox">
              <input 
                type="checkbox" 
                :checked="isOrderSelected(order)"
                @change="$emit('toggle-selection', order)"
                :disabled="!isOrderSelectable(order)"
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

            <!-- CUSTOMER -->
            <td class="col-customer">
              <div class="customer-info">
                <div class="customer-name">{{ order.customer_name }}</div>
                <div class="customer-contact">
                  <div v-if="order.customer_email" class="customer-email">
                    <span class="contact-icon">📧</span> {{ order.customer_email }}
                  </div>
                  <div v-if="order.customer_phone" class="customer-phone">
                    <span class="contact-icon">📱</span> {{ order.customer_phone }}
                  </div>
                </div>
              </div>
            </td>

            <!-- ADDRESS -->
            <td class="col-address">
              <div class="address-info">
                <div class="address-main">{{ order.shipping_address?.street }}</div>
                <div class="address-details">
                  <span class="commune">{{ order.shipping_address?.commune }}</span>
                  <span v-if="order.shipping_address?.apartment" class="apartment">
                    , {{ order.shipping_address.apartment }}
                  </span>
                </div>
              </div>
            </td>

            <!-- STATUS - Con estados específicos de empresa -->
            <td class="col-status">
              <div class="status-container">
                <span class="status-badge" :class="getStatusClass(order.status)">
                  {{ getStatusText(order.status) }}
                </span>
                <div v-if="order.status_updated_at" class="status-time">
                  {{ formatStatusTime(order.status_updated_at) }}
                </div>
              </div>
            </td>

            <!-- TRACKING - Funcionalidad específica de empresas -->
            <td class="col-tracking">
              <div class="tracking-container">
                <!-- En tránsito con tracking -->
                <div v-if="hasTrackingInfo(order)" class="tracking-active">
                  <button 
                    @click="$emit('track-live', order)" 
                    class="track-live-btn"
                    title="Ver ubicación en tiempo real"
                  >
                    📍 En vivo
                  </button>
                  <div class="tracking-info">
                    <span class="driver-name">{{ order.driver_name }}</span>
                    <span class="eta">ETA: {{ order.estimated_arrival }}</span>
                  </div>
                </div>
                
                <!-- Prueba de entrega disponible -->
                <div v-else-if="hasProofOfDelivery(order)" class="proof-available">
                  <button 
                    @click="$emit('view-proof', order)" 
                    class="proof-btn"
                    title="Ver prueba de entrega"
                  >
                    📸 Prueba
                  </button>
                  <div class="delivery-info">
                    <span class="delivery-time">{{ formatDeliveryTime(order.delivered_at) }}</span>
                  </div>
                </div>
                
                <!-- Sin tracking -->
                <div v-else class="no-tracking">
                  <span class="tracking-status">Sin seguimiento</span>
                </div>
              </div>
            </td>

            <!-- AMOUNT -->
            <td class="col-amount">
              <div class="amount-info">
                <div class="total-amount">${{ formatAmount(order.total_amount) }}</div>
                <div v-if="order.shipping_cost" class="shipping-cost">
                  Envío: ${{ formatAmount(order.shipping_cost) }}
                </div>
              </div>
            </td>

            <!-- DATES -->
            <td class="col-date">
              <div class="date-info">
                <div class="date-creation">
                  <span class="date-label">Creado:</span>
                  <span class="date-value">{{ formatDate(order.created_at) }}</span>
                </div>
                <div v-if="order.delivery_date" class="date-delivery">
                  <span class="date-label">Entrega:</span>
                  <span class="date-value">{{ formatDate(order.delivery_date) }}</span>
                </div>
              </div>
            </td>

            <!-- ACTIONS - Específicas de empresa -->
            <td class="col-actions">
              <div class="action-buttons">
                <button 
                  @click="$emit('view-details', order)" 
                  class="btn-table-action view"
                  title="Ver detalles"
                >
                  👁️
                </button>
                
                <!-- Acción principal según estado -->
                <button 
                  v-if="getActionButton(order).show"
                  @click="$emit('handle-action', { action: getActionButton(order).action, order })"
                  :class="['btn-table-action', getActionButton(order).class]"
                  :title="getActionButton(order).title"
                >
                  {{ getActionButton(order).icon }} {{ getActionButton(order).text }}
                </button>

                <!-- Dropdown de más acciones -->
                <div class="action-dropdown">
                  <button class="btn-table-action more" title="Más opciones">
                    ⋮
                  </button>
                  <div class="dropdown-menu">
                    <button @click="$emit('view-tracking', order)" class="dropdown-item">
                      📍 Ver seguimiento
                    </button>
                    <button @click="$emit('contact-support', order)" class="dropdown-item">
                      💬 Contactar soporte
                    </button>
                    <div class="dropdown-divider"></div>
                    <button @click="duplicateOrder(order)" class="dropdown-item">
                      📋 Duplicar
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PAGINATION - Igual que AdminOrdersTable -->
    <div v-if="pagination && pagination.totalPages > 1" class="pagination-section">
      <div class="pagination-info">
        <span>
          Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
          de {{ pagination.total }} pedidos
        </span>
        
        <div class="page-size-selector">
          <label>Mostrar:</label>
          <select 
            :value="pagination.limit" 
            @change="$emit('change-page-size', $event.target.value)"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      
      <div class="pagination-controls">
        <button 
          @click="$emit('go-to-page', 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn"
        >
          ⏮️
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.page - 1)" 
          :disabled="pagination.page <= 1"
          class="page-btn"
        >
          ← Anterior
        </button>
        
        <div class="page-numbers">
          <button
            v-for="page in getVisiblePages()"
            :key="page"
            @click="page !== '...' && $emit('go-to-page', page)"
            :class="['page-btn', { active: page === pagination.page, disabled: page === '...' }]"
            :disabled="page === '...'"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="$emit('go-to-page', pagination.page + 1)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn"
        >
          Siguiente →
        </button>
        
        <button 
          @click="$emit('go-to-page', pagination.totalPages)" 
          :disabled="pagination.page >= pagination.totalPages"
          class="page-btn"
        >
          ⏭️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  orders: { type: Array, default: () => [] },
  selectedOrders: { type: Array, default: () => [] },
  selectAllChecked: Boolean,
  selectAllIndeterminate: Boolean,
  loading: Boolean,
  pagination: Object,
  showCreateButton: Boolean,
  hasTrackingInfo: Function,
  hasProofOfDelivery: Function,
  getActionButton: Function
})

const emit = defineEmits([
  'toggle-selection', 'toggle-select-all', 'clear-selection',
  'view-details', 'mark-ready', 'track-live', 'view-tracking', 
  'view-proof', 'handle-action', 'contact-support',
  'bulk-mark-ready', 'generate-manifest', 'bulk-export',
  'create-order', 'go-to-page', 'change-page-size'
])

// Helper functions
const isOrderSelected = (order) => {
  return props.selectedOrders.some(selected => selected._id === order._id)
}

const isOrderSelectable = (order) => {
  return order.status === 'pending' || order.status === 'ready_for_pickup'
}

const isInTransit = (order) => {
  return order.status === 'in_transit' || order.status === 'out_for_delivery'
}

const getStatusClass = (status) => {
  const statusClasses = {
    'pending': 'status-pending',
    'ready_for_pickup': 'status-ready',
    'in_transit': 'status-transit',
    'out_for_delivery': 'status-delivery',
    'delivered': 'status-delivered',
    'cancelled': 'status-cancelled'
  }
  return statusClasses[status] || 'status-unknown'
}

const getStatusText = (status) => {
  const statusTexts = {
    'pending': 'Pendiente',
    'ready_for_pickup': 'Listo para recoger',
    'in_transit': 'En tránsito',
    'out_for_delivery': 'En camino',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  }
  return statusTexts[status] || 'Desconocido'
}

const formatAmount = (amount) => {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const formatStatusTime = (date) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const formatDeliveryTime = (date) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const getVisiblePages = () => {
  if (!props.pagination) return []
  
  const { page: currentPage, totalPages } = props.pagination
  const delta = 2
  const range = []
  
  for (let i = Math.max(2, currentPage - delta); 
       i <= Math.min(totalPages - 1, currentPage + delta); 
       i++) {
    range.push(i)
  }
  
  if (currentPage - delta > 2) {
    range.unshift('...')
  }
  if (currentPage + delta < totalPages - 1) {
    range.push('...')
  }
  
  range.unshift(1)
  if (totalPages !== 1) {
    range.push(totalPages)
  }
  
  return range
}

const duplicateOrder = (order) => {
  console.log('📋 Duplicate order:', order._id)
  // Implementar lógica de duplicación
}
</script>

<style scoped>
/* ==================== TABLA PRINCIPAL - Mismo estilo que AdminOrdersTable ==================== */
.table-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-container {
  /* SOLUCIÓN AL DOBLE SCROLL: Solo overflow vertical cuando sea necesario */
  overflow-x: auto;
  min-height: 400px;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

/* ==================== HEADER - Idéntico a AdminOrdersTable ==================== */
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

/* Column widths - Ajustados para empresas */
.col-checkbox { width: 40px; }
.col-order { width: 140px; }
.col-customer { width: 180px; }
.col-address { width: 200px; }
.col-status { width: 120px; }
.col-tracking { width: 140px; }
.col-amount { width: 120px; }
.col-date { width: 160px; }
.col-actions { width: 160px; }

/* ==================== BODY - Mismo estilo que AdminOrdersTable ==================== */
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

.orders-table tbody tr.in-transit {
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
}

.orders-table tbody tr.ready-for-pickup {
  background: #fff7ed;
  border-left: 3px solid #f59e0b;
}

.orders-table td {
  padding: 12px;
  vertical-align: top;
}

/* ==================== ESTADOS DE LOADING Y EMPTY ==================== */
.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
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
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-subtitle {
  color: #6b7280;
  margin: 0 0 20px 0;
}

.create-order-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.create-order-btn:hover {
  background: #2563eb;
}

/* ==================== CONTENIDO DE CELDAS ==================== */

/* Order Info */
.order-info .order-number {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.order-info .order-id,
.order-info .external-id {
  font-size: 11px;
  color: #64748b;
}

/* Customer Info */
.customer-info .customer-name {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
}

.customer-contact {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-email,
.customer-phone {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.contact-icon {
  font-size: 10px;
}

/* Address Info */
.address-info .address-main {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 2px;
}

.address-details {
  font-size: 11px;
  color: #64748b;
}

.commune {
  font-weight: 500;
}

/* Status */
.status-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  width: fit-content;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-ready { background: #dbeafe; color: #1e40af; }
.status-transit { background: #dcfce7; color: #166534; }
.status-delivery { background: #f0fdf4; color: #15803d; }
.status-delivered { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fee2e2; color: #991b1b; }

.status-time {
  font-size: 10px;
  color: #64748b;
}
/* Tracking - FUNCIONALIDAD ESPECÍFICA DE EMPRESAS */
.tracking-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.track-live-btn {
  background: #22c55e;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.track-live-btn:hover {
  background: #16a34a;
}

.proof-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.proof-btn:hover {
  background: #2563eb;
}

.tracking-info,
.delivery-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.driver-name,
.eta,
.delivery-time {
  font-size: 10px;
  color: #64748b;
}

.no-tracking .tracking-status {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

/* Amount */
.amount-info {
  text-align: right;
}

.total-amount {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.shipping-cost {
  font-size: 11px;
  color: #64748b;
}

/* Date */
.date-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-creation,
.date-delivery {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.date-label {
  font-size: 10px;
  font-weight: 500;
  color: #6b7280;
}

.date-value {
  font-size: 11px;
  color: #374151;
}

/* Actions - Igual que AdminOrdersTable */
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-table-action {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-table-action.view {
  color: #3b82f6;
  border-color: #bfdbfe;
}

.btn-table-action.view:hover {
  background: #eff6ff;
}

.btn-table-action.ready {
  color: #059669;
  border-color: #6ee7b7;
}

.btn-table-action.ready:hover {
  background: #d1fae5;
}

.btn-table-action.track {
  color: #7c3aed;
  border-color: #c4b5fd;
}

.btn-table-action.track:hover {
  background: #f3f4f6;
}

.btn-table-action.more {
  color: #64748b;
}

.btn-table-action.more:hover {
  background: #f1f5f9;
}

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
  min-width: 160px;
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

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}

/* ==================== PAGINATION - Igual que AdminOrdersTable ==================== */
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

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1200px) {
  .col-address { width: 180px; }
  .col-customer { width: 150px; }
}

@media (max-width: 1024px) {
  .table-section {
    margin: 0 -16px;
    border-radius: 0;
  }
  
  .pagination-section {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .orders-table {
    min-width: 1000px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 12px 8px;
  }
  
  .col-address,
  .col-customer {
    display: none;
  }
  
  .page-numbers {
    display: none;
  }
}

@media (max-width: 480px) {
  .orders-table th,
  .orders-table td {
    padding: 8px 6px;
  }
  
  .col-tracking {
    display: none;
  }
  
  .orders-table {
    font-size: 12px;
  }
}

/* ==================== CHECKBOX STYLES ==================== */
.select-all-checkbox,
.order-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* ==================== ANIMACIONES ==================== */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>