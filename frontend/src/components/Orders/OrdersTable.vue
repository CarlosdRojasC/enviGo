<template>

  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
          @click="$emit('generate-manifest')" 
          class="bulk-btn manifest-btn"
        >
          📋 Marcar como listos
        </button>
        <button 
    @click="$emit('generate-labels')" 
    class="bulk-btn labels-btn"
    :disabled="!canGenerateLabels"
  >
    🏷️ Generar Etiquetas ({{ selectedOrders.length }})
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
    <div v-else class="overflow-x-auto">
      <table class="orders-table">
        <thead class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" @click="$emit('sort', 'order_number')">
              <div class="header-content">
                <span class="header-text">Pedido</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" @click="$emit('sort', 'customer_name')" >
              <div class="header-content">
                <span class="header-text">Cliente</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <span class="header-text">Dirección</span>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" @click="$emit('sort', 'status')">
              <div class="header-content">
                <span class="header-text">Estado</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" >
              <span class="header-text">Seguimiento</span>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" @click="$emit('sort', 'total_amount')" >
              <div class="header-content">
                <span class="header-text">Monto</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" @click="$emit('sort', 'order_date')" >
              <div class="header-content">
                <span class="header-text">Fecha</span>
                <span class="sort-icon">⇅</span>
              </div>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <span class="header-text">Acciones</span>
            </th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-100">
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
            @generate-labels="$emit('generate-labels', order)"
          />
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-container">
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
      
      <div v-if="pagination.totalPages > 1" class="pagination-controls">
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
  'generate-labels',
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

const canGenerateLabels = computed(() => {
  if (props.selectedOrders.length === 0) return false
  
  // Verificar que todos los pedidos seleccionados sean válidos para etiquetas
  return props.selectedOrders.every(orderId => {
    const order = props.orders.find(o => o._id === orderId)
    return order && ['pending', 'ready_for_pickup','warehouse_received'].includes(order.status)
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
  return !order.shipday_order_id && ['pending', 'ready_for_pickup', 'warehouse_received'].includes(order.status)
}

</script>
