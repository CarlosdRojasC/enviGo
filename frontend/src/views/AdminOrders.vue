<template>
  <div class="admin-orders-container">
    <!-- Header mejorado -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">📊</span>
          Gestión Global de Pedidos
        </h1>
        <div class="header-stats">
          <div class="stat-chip">
            <span class="stat-value">{{ pagination.total || 0 }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-chip" v-if="selectedOrders.length > 0">
            <span class="stat-value">{{ selectedOrders.length }}</span>
            <span class="stat-label">Seleccionados</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button @click="refreshOrders" class="btn-action btn-ghost" :disabled="loadingOrders">
          <span class="btn-icon">🔄</span>
          {{ loadingOrders ? 'Actualizando...' : 'Actualizar' }}
        </button>
        <button @click="openCreateOrderModal" class="btn-action btn-secondary">
          <span class="btn-icon">➕</span>
          Crear Pedido
        </button>
        <div class="action-group">
          <button @click="openBulkUploadModal" class="btn-action btn-secondary">
            <span class="btn-icon">📁</span>
            Subida Masiva
          </button>
          <button @click="exportOrders" class="btn-action btn-primary" :disabled="isExporting">
            <span class="btn-icon">📊</span>
            {{ isExporting ? 'Exportando...' : 'Exportar' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Filtros mejorados -->
    <div class="filters-section">
      <div class="filters-header">
        <h3>Filtros de Búsqueda</h3>
        <div class="filters-actions">
          <button @click="clearFilters" class="btn-clear-filters">Limpiar Filtros</button>
          <button @click="toggleAdvancedFilters" class="btn-toggle-filters">
            {{ showAdvancedFilters ? 'Ocultar' : 'Más Filtros' }}
            <span class="toggle-icon">{{ showAdvancedFilters ? '▼' : '▶' }}</span>
          </button>
        </div>
      </div>
      
      <!-- Filtros básicos -->
      <div class="filters-row filters-basic">
        <div class="filter-group">
          <label>Empresa</label>
          <select v-model="filters.company_id" @change="applyFilters" class="filter-select">
            <option value="">Todas las Empresas</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }} ({{ getCompanyOrderCount(company._id) }})
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Estado</label>
          <select v-model="filters.status" @change="applyFilters" class="filter-select">
            <option value="">Todos los estados</option>
            <option value="pending">🟡 Pendientes</option>
            <option value="processing">🔵 Procesando</option>
            <option value="shipped">🟠 Enviados</option>
            <option value="delivered">🟢 Entregados</option>
            <option value="cancelled">🔴 Cancelados</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Comuna</label>
          <select v-model="filters.shipping_commune" @change="applyFilters" class="filter-select">
            <option value="">Todas las Comunas</option>
            <option v-for="commune in availableCommunes" :key="commune" :value="commune">
              {{ commune }} ({{ getCommuneOrderCount(commune) }})
            </option>
          </select>
        </div>
        
        <div class="filter-group search-group">
          <label>Búsqueda</label>
          <div class="search-input-container">
            <input 
              type="text" 
              v-model="filters.search" 
              @input="debounceSearch"
              placeholder="Buscar pedido, cliente, dirección..."
              class="search-input"
            />
            <span class="search-icon">🔍</span>
          </div>
        </div>
      </div>
      
      <!-- Filtros avanzados -->
      <div v-if="showAdvancedFilters" class="filters-row filters-advanced">
        <div class="filter-group">
          <label>Fecha Desde</label>
          <input type="date" v-model="filters.date_from" @change="applyFilters" class="filter-input" />
        </div>
        
        <div class="filter-group">
          <label>Fecha Hasta</label>
          <input type="date" v-model="filters.date_to" @change="applyFilters" class="filter-input" />
        </div>
        
        <div class="filter-group">
          <label>Monto Mínimo</label>
          <input type="number" v-model="filters.min_amount" @change="applyFilters" 
                 placeholder="$0" class="filter-input" />
        </div>
        
        <div class="filter-group">
          <label>Monto Máximo</label>
          <input type="number" v-model="filters.max_amount" @change="applyFilters" 
                 placeholder="Sin límite" class="filter-input" />
        </div>
        
        <div class="filter-group">
          <label>Con Conductor</label>
          <select v-model="filters.has_driver" @change="applyFilters" class="filter-select">
            <option value="">Ambos</option>
            <option value="true">Con conductor asignado</option>
            <option value="false">Sin conductor asignado</option>
          </select>
        </div>
      </div>
      
      <!-- Resumen de filtros activos -->
      <div v-if="activeFiltersCount > 0" class="active-filters-summary">
        <span class="active-filters-label">Filtros activos ({{ activeFiltersCount }}):</span>
        <div class="active-filters-chips">
          <span v-if="filters.company_id" class="filter-chip">
            Empresa: {{ getCompanyName(filters.company_id) }}
            <button @click="clearFilter('company_id')" class="chip-remove">×</button>
          </span>
          <span v-if="filters.status" class="filter-chip">
            Estado: {{ getStatusName(filters.status) }}
            <button @click="clearFilter('status')" class="chip-remove">×</button>
          </span>
          <span v-if="filters.shipping_commune" class="filter-chip">
            Comuna: {{ filters.shipping_commune }}
            <button @click="clearFilter('shipping_commune')" class="chip-remove">×</button>
          </span>
          <span v-if="filters.search" class="filter-chip">
            Búsqueda: "{{ filters.search }}"
            <button @click="clearFilter('search')" class="chip-remove">×</button>
          </span>
        </div>
      </div>
    </div>

    <!-- Acciones masivas mejoradas -->
    <div v-if="selectedOrders.length > 0" class="bulk-actions-bar">
      <div class="bulk-selection-info">
        <span class="selection-count">
          <span class="count-number">{{ selectedOrders.length }}</span>
          pedido{{ selectedOrders.length !== 1 ? 's' : '' }} seleccionado{{ selectedOrders.length !== 1 ? 's' : '' }}
        </span>
        <button @click="clearSelection" class="btn-clear-selection">Limpiar selección</button>
      </div>
      
      <div class="bulk-actions">
        <button @click="openBulkAssignModal" class="btn-bulk-action btn-assign" 
                :disabled="!canAssignSelected">
          <span class="btn-icon">🚚</span>
          Asignar Conductor
        </button>
        <button @click="openBulkStatusModal" class="btn-bulk-action btn-status">
          <span class="btn-icon">📝</span>
          Cambiar Estado
        </button>
        <button @click="exportSelected" class="btn-bulk-action btn-export">
          <span class="btn-icon">📊</span>
          Exportar Seleccionados
        </button>
      </div>
    </div>

    <!-- Tabla mejorada -->
    <div class="orders-section">
      <div v-if="loadingOrders" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando pedidos...</p>
      </div>
      
      <div v-else-if="orders.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No se encontraron pedidos</h3>
        <p>{{ hasActiveFilters ? 'Prueba ajustando los filtros de búsqueda' : 'Crea tu primer pedido para comenzar' }}</p>
        <button v-if="!hasActiveFilters" @click="openCreateOrderModal" class="btn-action btn-primary">
          Crear Primer Pedido
        </button>
      </div>
      
      <div v-else class="table-container">
        <table class="orders-table">
          <thead>
            <tr>
              <th class="checkbox-column">
                <label class="checkbox-container">
                  <input 
                    type="checkbox" 
                    :checked="selectAllChecked"
                    :indeterminate="selectAllIndeterminate"
                    @change="toggleSelectAll"
                    :disabled="!hasSelectableOrders"
                  />
                  <span class="checkmark"></span>
                </label>
              </th>
              <th class="sortable" @click="sortBy('order_number')">
                Pedido
                <span class="sort-indicator" :class="getSortClass('order_number')">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('company_id')">
                Empresa
                <span class="sort-indicator" :class="getSortClass('company_id')">⇅</span>
              </th>
              <th>Cliente</th>
              <th class="sortable" @click="sortBy('shipping_commune')">
                Comuna
                <span class="sort-indicator" :class="getSortClass('shipping_commune')">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('order_date')">
                Fechas
                <span class="sort-indicator" :class="getSortClass('order_date')">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('status')">
                Estado
                <span class="sort-indicator" :class="getSortClass('status')">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('shipping_cost')">
                Costo
                <span class="sort-indicator" :class="getSortClass('shipping_cost')">⇅</span>
              </th>
              <th>Conductor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order._id" 
                class="order-row"
                :class="{
                  'selected': selectedOrders.includes(order._id),
                  'has-driver': order.shipday_order_id,
                  'delivered': order.status === 'delivered',
                  'cancelled': order.status === 'cancelled'
                }">
              <td class="checkbox-column">
                <label class="checkbox-container" v-if="!order.shipday_order_id">
                  <input 
                    type="checkbox" 
                    :value="order._id"
                    v-model="selectedOrders"
                  />
                  <span class="checkmark"></span>
                </label>
                <span v-else class="checkbox-disabled" title="Ya tiene conductor asignado">🚚</span>
              </td>
              
              <td class="order-number-cell">
                <div class="order-number">{{ order.order_number }}</div>
                <div class="order-id">ID: {{ order.external_order_id }}</div>
              </td>
              
              <td class="company-cell">
                <div class="company-info">
                  <div class="company-name">{{ order.company_id?.name || 'Sin empresa' }}</div>
                  <div class="company-price">${{ formatCurrency(order.company_id?.price_per_order || 0) }}/envío</div>
                </div>
              </td>
              
              <td class="customer-cell">
                <div class="customer-info">
                  <div class="customer-name">{{ order.customer_name }}</div>
                  <div class="customer-contact">
                    <span v-if="order.customer_email" class="contact-item">📧 {{ order.customer_email }}</span>
                    <span v-if="order.customer_phone" class="contact-item">📱 {{ order.customer_phone }}</span>
                  </div>
                  <div class="shipping-address">{{ order.shipping_address }}</div>
                </div>
              </td>
              
              <td class="commune-cell">
                <span class="commune-badge" :class="getCommuneClass(order.shipping_commune)">
                  {{ order.shipping_commune || 'Sin comuna' }}
                </span>
              </td>
              
              <td class="date-cell">
                <div class="date-creation">
                  <span class="date-label">Creado:</span>
                  <span class="date-value">{{ formatDate(order.order_date, true) }}</span>
                </div>
                <div v-if="order.delivery_date" class="date-delivery">
                  <span class="date-label">Entregado:</span>
                  <span class="date-value">{{ formatDate(order.delivery_date, true) }}</span>
                </div>
                <div v-if="order.updated_at" class="date-updated">
                  <span class="date-label">Actualizado:</span>
                  <span class="date-value">{{ formatDate(order.updated_at, true) }}</span>
                </div>
              </td>
              
              <td class="status-cell">
                <span class="status-badge" :class="order.status">
                  <span class="status-icon">{{ getStatusIcon(order.status) }}</span>
                  {{ getStatusName(order.status) }}
                </span>
              </td>
              
              <td class="cost-cell">
                <div class="cost-info">
                  <div class="shipping-cost">${{ formatCurrency(order.shipping_cost) }}</div>
                  <div class="total-amount">${{ formatCurrency(order.total_amount) }} total</div>
                </div>
              </td>
              
              <td class="driver-cell">
                <div v-if="order.driver_info?.name" class="driver-info">
                  <div class="driver-name">{{ order.driver_info.name }}</div>
                  <div class="driver-status">{{ order.driver_info.status || 'Asignado' }}</div>
                </div>
                <div v-else-if="order.shipday_order_id" class="driver-pending">
                  <span class="driver-status">Shipday: {{ order.shipday_order_id }}</span>
                </div>
                <span v-else class="no-driver">Sin asignar</span>
              </td>
              
              <td class="actions-cell">
                <div class="action-buttons">
                  <button @click="openOrderDetailsModal(order)" class="btn-table-action view" title="Ver detalles">
                    👁️
                  </button>
                  <button @click="openUpdateStatusModal(order)" class="btn-table-action edit" title="Cambiar estado">
                    📝
                  </button>
                  <button 
                    @click="openAssignModal(order)" 
                    class="btn-table-action assign" 
                    :disabled="order.shipday_order_id"
                    :title="order.shipday_order_id ? 'Ya tiene conductor asignado' : 'Asignar conductor'">
                    🚚
                  </button>
                  <div class="action-dropdown">
                    <button class="btn-table-action more" @click="toggleActionMenu(order._id)">
                      ⋯
                    </button>
                    <div v-if="activeActionMenu === order._id" class="action-menu">
                      <button @click="debugOrder(order)" class="action-menu-item">
                        🔍 Debug
                      </button>
                      <button @click="duplicateOrder(order)" class="action-menu-item">
                        📋 Duplicar
                      </button>
                      <button v-if="order.shipday_tracking_url" @click="openTrackingUrl(order)" class="action-menu-item">
                        📍 Tracking
                      </button>
                      <button @click="downloadProofOfDelivery(order)" class="action-menu-item" 
                              :disabled="order.status !== 'delivered'">
                        📄 Prueba de Entrega
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Paginación mejorada -->
      <div v-if="pagination.totalPages > 1" class="pagination-container">
        <div class="pagination-info">
          Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
          de {{ pagination.total }} pedidos
        </div>
        
        <div class="pagination">
          <button @click="goToPage(1)" :disabled="pagination.page === 1" class="btn-page">
            ⏮️
          </button>
          <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page === 1" class="btn-page">
            ◀️
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="page in visiblePages" 
              :key="page"
              @click="goToPage(page)"
              class="btn-page"
              :class="{ active: page === pagination.page }"
            >
              {{ page }}
            </button>
          </div>
          
          <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page === pagination.totalPages" class="btn-page">
            ▶️
          </button>
          <button @click="goToPage(pagination.totalPages)" :disabled="pagination.page === pagination.totalPages" class="btn-page">
            ⏭️
          </button>
        </div>
        
        <div class="pagination-controls">
          <select v-model="pagination.limit" @change="changePageSize" class="page-size-select">
            <option value="10">10 por página</option>
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Modales existentes mejorados -->
    
    <!-- Modal de creación de pedido -->
    <Modal v-if="showCreateOrderModal" @close="showCreateOrderModal = false">
      <div class="modal-content create-order-modal">
        <h2>Crear Pedido Manual</h2>
        <form @submit.prevent="createOrder" class="order-form">
          <div class="form-row">
            <div class="form-group">
              <label>Empresa *</label>
              <select v-model="newOrder.company_id" required class="form-input">
                <option value="">Seleccionar empresa</option>
                <option v-for="company in companies" :key="company._id" :value="company._id">
                  {{ company.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Comuna *</label>
              <select v-model="newOrder.shipping_commune" required class="form-input">
                <option value="">Seleccionar comuna</option>
                <option v-for="commune in availableCommunes" :key="commune" :value="commune">
                  {{ commune }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Nombre del Cliente *</label>
              <input type="text" v-model="newOrder.customer_name" required class="form-input" />
            </div>
            <div class="form-group">
              <label>Email del Cliente</label>
              <input type="email" v-model="newOrder.customer_email" class="form-input" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Teléfono del Cliente</label>
              <input type="tel" v-model="newOrder.customer_phone" class="form-input" />
            </div>
            <div class="form-group">
              <label>Documento del Cliente</label>
              <input type="text" v-model="newOrder.customer_document" class="form-input" />
            </div>
          </div>
          
          <div class="form-group">
            <label>Dirección de Envío *</label>
            <textarea v-model="newOrder.shipping_address" required class="form-input" rows="2"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Monto Total *</label>
              <input type="number" v-model="newOrder.total_amount" required min="0" step="0.01" class="form-input" />
            </div>
            <div class="form-group">
              <label>Costo de Envío</label>
              <input type="number" v-model="newOrder.shipping_cost" min="0" step="0.01" class="form-input" />
            </div>
          </div>
          
          <div class="form-group">
            <label>Notas del Pedido</label>
            <textarea v-model="newOrder.notes" class="form-input" rows="3"></textarea>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="showCreateOrderModal = false" class="btn-secondary">
              Cancelar
            </button>
            <button type="submit" :disabled="isCreatingOrder" class="btn-primary">
              {{ isCreatingOrder ? 'Creando...' : 'Crear Pedido' }}
            </button>
          </div>
        </form>
      </div>
    </Modal>

    <!-- Modal de asignación masiva mejorado -->
    <Modal v-if="showBulkAssignModal" @close="closeBulkAssignModal">
      <div class="modal-content bulk-assign-modal">
        <h2>Asignación Masiva de Conductor</h2>
        
        <!-- Resumen de selección -->
        <div class="selection-summary">
          <h4>Pedidos Seleccionados ({{ selectedOrders.length }})</h4>
          <div class="selected-orders-preview">
            <div v-for="orderId in selectedOrders.slice(0, 5)" :key="orderId" class="selected-order-item">
              {{ getOrderById(orderId)?.order_number || orderId }}
            </div>
            <div v-if="selectedOrders.length > 5" class="more-orders">
              +{{ selectedOrders.length - 5 }} más...
            </div>
          </div>
        </div>
        
        <!-- Selector de conductor -->
        <div class="driver-selection">
          <h4>Seleccionar Conductor</h4>
          <div v-if="loadingDrivers" class="loading-drivers">
            Cargando conductores disponibles...
          </div>
          <select v-else v-model="bulkSelectedDriverId" class="form-input">
            <option value="">Seleccionar conductor</option>
            <option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id">
              {{ driver.name }} - {{ driver.email }} ({{ driver.isOnShift ? 'En turno' : 'Fuera de turno' }})
            </option>
          </select>
        </div>
        
        <!-- Progreso de asignación -->
        <div v-if="isBulkAssigning" class="assignment-progress">
          <h4>Progreso de Asignación</h4>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: bulkProgressPercentage + '%' }"></div>
          </div>
          <div class="progress-text">
            {{ bulkAssignmentCompleted }} de {{ selectedOrders.length }} completados ({{ Math.round(bulkProgressPercentage) }}%)
          </div>
        </div>
        
        <!-- Resultados -->
        <div v-if="bulkAssignmentResults.length > 0" class="assignment-results">
          <h4>Resultados de Asignación</h4>
          <div class="results-summary">
            <div class="result-stat success">
              ✅ {{ bulkAssignmentResults.filter(r => r.success).length }} exitosos
            </div>
            <div class="result-stat error">
              ❌ {{ bulkAssignmentResults.filter(r => !r.success).length }} fallidos
            </div>
          </div>
          
          <div v-if="bulkAssignmentResults.filter(r => !r.success).length > 0" class="failed-assignments">
            <h5>Asignaciones Fallidas:</h5>
            <div v-for="result in bulkAssignmentResults.filter(r => !r.success)" :key="result.orderId" class="failed-item">
              {{ result.orderNumber }}: {{ result.error }}
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeBulkAssignModal" class="btn-secondary">
            {{ bulkAssignmentFinished ? 'Cerrar' : 'Cancelar' }}
          </button>
          <button 
            v-if="!isBulkAssigning && !bulkAssignmentFinished"
            @click="confirmBulkAssignment" 
            :disabled="!bulkSelectedDriverId" 
            class="btn-primary">
            Asignar {{ selectedOrders.length }} pedidos
          </button>
        </div>
      </div>
    </Modal>

    <!-- Otros modales existentes -->
    <UpdateOrderStatus 
      v-if="showUpdateStatusModal"
      :order="selectedOrder"
      @close="showUpdateStatusModal = false"
      @updated="handleOrderUpdated"
    />
    
    <OrderDetails 
      v-if="showOrderDetailsModal"
      :order="selectedOrder"
      @close="showOrderDetailsModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { apiService } from '../services/api';
import { shipdayService } from '../services/shipday';
import Modal from '../components/Modal.vue';
import UpdateOrderStatus from '../components/UpdateOrderStatus.vue';
import OrderDetails from '../components/OrderDetails.vue';

// Estado de datos
const orders = ref([]);
const companies = ref([]);
const availableCommunes = ref([]);
const pagination = ref({ page: 1, limit: 25, total: 0, totalPages: 1 });

// Estado de filtros mejorado
const filters = ref({
  company_id: '',
  status: '',
  shipping_commune: '',
  date_from: '',
  date_to: '',
  search: '',
  min_amount: '',
  max_amount: '',
  has_driver: ''
});

const showAdvancedFilters = ref(false);
const sortField = ref('order_date');
const sortDirection = ref('desc');

// Estado de UI
const loadingOrders = ref(true);
const isExporting = ref(false);
const activeActionMenu = ref(null);

// Estado de modales
const showCreateOrderModal = ref(false);
const showUpdateStatusModal = ref(false);
const showOrderDetailsModal = ref(false);
const showBulkUploadModal = ref(false);
const showBulkAssignModal = ref(false);
const showBulkStatusModal = ref(false);

// Estado de pedido seleccionado
const selectedOrder = ref(null);

// Estado de creación
const isCreatingOrder = ref(false);
const newOrder = ref({});

// Estado de selección masiva
const selectedOrders = ref([]);

// Estado de asignación
const availableDrivers = ref([]);
const loadingDrivers = ref(false);
const selectedDriverId = ref('');
const isAssigning = ref(false);
const bulkSelectedDriverId = ref('');
const isBulkAssigning = ref(false);
const bulkAssignmentCompleted = ref(0);
const bulkAssignmentResults = ref([]);
const bulkAssignmentFinished = ref(false);

// Computed properties mejorados
const activeFiltersCount = computed(() => {
  return Object.values(filters.value).filter(value => value !== '').length;
});

const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

const hasSelectableOrders = computed(() => {
  return orders.value.some(order => !order.shipday_order_id);
});

const canAssignSelected = computed(() => {
  return selectedOrders.value.length > 0 && selectedOrders.value.every(orderId => {
    const order = orders.value.find(o => o._id === orderId);
    return order && !order.shipday_order_id;
  });
});

const selectAllChecked = computed(() => {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  return selectableOrders.length > 0 && selectableOrders.every(order => selectedOrders.value.includes(order._id));
});

const selectAllIndeterminate = computed(() => {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  const selectedCount = selectableOrders.filter(order => selectedOrders.value.includes(order._id)).length;
  return selectedCount > 0 && selectedCount < selectableOrders.length;
});

const bulkProgressPercentage = computed(() => {
  if (selectedOrders.value.length === 0) return 0;
  return (bulkAssignmentCompleted.value / selectedOrders.value.length) * 100;
});

const visiblePages = computed(() => {
  const current = pagination.value.page;
  const total = pagination.value.totalPages;
  const delta = 2;
  
  const range = [];
  const rangeWithDots = [];
  
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  
  if (current - delta > 2) {
    rangeWithDots.push(1, '...');
  } else {
    rangeWithDots.push(1);
  }
  
  rangeWithDots.push(...range);
  
  if (current + delta < total - 1) {
    rangeWithDots.push('...', total);
  } else {
    rangeWithDots.push(total);
  }
  
  return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
});

// Watchers
watch(() => filters.value.company_id, () => {
  fetchAvailableCommunes();
});

// Debounce para búsqueda
let searchTimeout;
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    fetchOrders();
  }, 500);
}

// Funciones de inicialización
onMounted(() => {
  fetchCompanies();
  fetchOrders();
  fetchAvailableCommunes();
});

async function fetchCompanies() {
  try {
    const { data } = await apiService.companies.getAll();
    companies.value = data;
  } catch (error) {
    console.error("Error fetching companies:", error);
  }
}

async function fetchOrders() {
  loadingOrders.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
      ...filters.value
    };
    
    // Limpiar parámetros vacíos
    Object.keys(params).forEach(key => {
      if (params[key] === '') delete params[key];
    });
    
    const { data } = await apiService.orders.getAll(params);
    orders.value = data.orders;
    pagination.value = data.pagination;
    
    // Limpiar selección si cambiamos de página o filtros
    selectedOrders.value = [];
    activeActionMenu.value = null;
  } catch (error) {
    console.error('Error fetching orders:', error);
    alert('Error al cargar pedidos');
  } finally {
    loadingOrders.value = false;
  }
}

async function fetchAvailableCommunes() {
  try {
    const params = {};
    if (filters.value.company_id) {
      params.company_id = filters.value.company_id;
    }
    
    const { data } = await apiService.communes.getAvailable(params);
    availableCommunes.value = data.communes || [];
  } catch (error) {
    console.error('Error fetching communes:', error);
  }
}

// Funciones de filtros
function applyFilters() {
  pagination.value.page = 1;
  fetchOrders();
}

function clearFilters() {
  Object.keys(filters.value).forEach(key => {
    filters.value[key] = '';
  });
  pagination.value.page = 1;
  fetchOrders();
}

function clearFilter(filterKey) {
  filters.value[filterKey] = '';
  applyFilters();
}

function toggleAdvancedFilters() {
  showAdvancedFilters.value = !showAdvancedFilters.value;
}

// Funciones de ordenamiento
function sortBy(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
  fetchOrders();
}

function getSortClass(field) {
  if (sortField.value !== field) return '';
  return sortDirection.value === 'asc' ? 'asc' : 'desc';
}

// Funciones de selección
function toggleSelectAll() {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  
  if (selectAllChecked.value) {
    // Deseleccionar todos
    selectedOrders.value = selectedOrders.value.filter(orderId => 
      !selectableOrders.find(order => order._id === orderId)
    );
  } else {
    // Seleccionar todos los que no están ya seleccionados
    const newSelections = selectableOrders
      .filter(order => !selectedOrders.value.includes(order._id))
      .map(order => order._id);
    selectedOrders.value.push(...newSelections);
  }
}

function clearSelection() {
  selectedOrders.value = [];
}

// Funciones de paginación
function goToPage(page) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page;
    fetchOrders();
  }
}

function changePageSize() {
  pagination.value.page = 1;
  fetchOrders();
}

// Funciones de UI
function refreshOrders() {
  fetchOrders();
}

function toggleActionMenu(orderId) {
  activeActionMenu.value = activeActionMenu.value === orderId ? null : orderId;
}

// Funciones de modales
function openCreateOrderModal() {
  newOrder.value = {
    company_id: '',
    shipping_commune: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_document: '',
    shipping_address: '',
    total_amount: '',
    shipping_cost: '',
    notes: ''
  };
  showCreateOrderModal.value = true;
}

function openOrderDetailsModal(order) {
  selectedOrder.value = order;
  showOrderDetailsModal.value = true;
}

function openUpdateStatusModal(order) {
  selectedOrder.value = order;
  showUpdateStatusModal.value = true;
}

async function openAssignModal(order) {
  selectedOrder.value = order;
  selectedDriverId.value = '';
  await loadDrivers();
  // Aquí podrías abrir un modal de asignación individual si lo necesitas
}

async function openBulkAssignModal() {
  if (selectedOrders.value.length === 0) {
    alert('Selecciona al menos un pedido para asignar');
    return;
  }
  
  bulkSelectedDriverId.value = '';
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  bulkAssignmentFinished.value = false;
  
  await loadDrivers();
  showBulkAssignModal.value = true;
}

function closeBulkAssignModal() {
  showBulkAssignModal.value = false;
  if (bulkAssignmentFinished.value) {
    fetchOrders(); // Refrescar para ver los cambios
  }
}

function openBulkStatusModal() {
  // Implementar modal de cambio de estado masivo
  alert('Funcionalidad de cambio de estado masivo en desarrollo');
}

// Funciones de acciones
async function createOrder() {
  if (!newOrder.value.company_id) {
    alert("Por favor, seleccione una empresa.");
    return;
  }
  
  if (!newOrder.value.shipping_commune) {
    alert("Por favor, seleccione la comuna.");
    return;
  }
  
  if (!newOrder.value.customer_name) {
    alert("Por favor, ingrese el nombre del cliente.");
    return;
  }
  
  if (!newOrder.value.shipping_address) {
    alert("Por favor, ingrese la dirección de envío.");
    return;
  }
  
  if (!newOrder.value.total_amount || newOrder.value.total_amount <= 0) {
    alert("Por favor, ingrese un monto total válido.");
    return;
  }
  
  isCreatingOrder.value = true;
  try {
    const channelsResponse = await apiService.channels.getByCompany(newOrder.value.company_id);
    if (!channelsResponse.data || channelsResponse.data.length === 0) {
      alert("La empresa seleccionada no tiene canales. Configure uno primero.");
      return;
    }
    
    const orderData = {
      ...newOrder.value,
      channel_id: channelsResponse.data[0]._id,
      order_number: `MANUAL-${Date.now()}`,
      external_order_id: `manual-admin-${Date.now()}`,
      total_amount: parseFloat(newOrder.value.total_amount) || 0,
      shipping_cost: parseFloat(newOrder.value.shipping_cost) || 0,
    };
    
    await apiService.orders.create(orderData);
    alert('Pedido manual creado con éxito.');
    showCreateOrderModal.value = false;
    await fetchOrders();
  } catch (error) {
    console.error('Error creando pedido:', error);
    alert(`Error al crear pedido: ${error.response?.data?.error || error.message}`);
  } finally {
    isCreatingOrder.value = false;
  }
}

async function loadDrivers() {
  loadingDrivers.value = true;
  try {
    const { data } = await shipdayService.getDrivers();
    availableDrivers.value = data.drivers || [];
  } catch (error) {
    console.error('Error loading drivers:', error);
    alert('Error al cargar conductores');
  } finally {
    loadingDrivers.value = false;
  }
}

async function confirmBulkAssignment() {
  if (!bulkSelectedDriverId.value) {
    alert('Selecciona un conductor');
    return;
  }
  
  isBulkAssigning.value = true;
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  
  for (const orderId of selectedOrders.value) {
    const order = orders.value.find(o => o._id === orderId);
    if (!order) continue;
    
    try {
      await shipdayService.assignDriver(order.shipday_order_id || orderId, bulkSelectedDriverId.value);
      bulkAssignmentResults.value.push({
        orderId,
        orderNumber: order.order_number,
        success: true
      });
    } catch (error) {
      bulkAssignmentResults.value.push({
        orderId,
        orderNumber: order.order_number,
        success: false,
        error: error.message
      });
    }
    
    bulkAssignmentCompleted.value++;
  }
  
  isBulkAssigning.value = false;
  bulkAssignmentFinished.value = true;
}

async function exportOrders() {
  isExporting.value = true;
  try {
    const params = { ...filters.value };
    await apiService.orders.export(params);
    alert('Exportación completada');
  } catch (error) {
    console.error('Error exporting orders:', error);
    alert('Error al exportar pedidos');
  } finally {
    isExporting.value = false;
  }
}

async function exportSelected() {
  if (selectedOrders.value.length === 0) {
    alert('Selecciona pedidos para exportar');
    return;
  }
  
  try {
    await apiService.orders.exportSelected(selectedOrders.value);
    alert('Exportación de seleccionados completada');
  } catch (error) {
    console.error('Error exporting selected orders:', error);
    alert('Error al exportar pedidos seleccionados');
  }
}

function debugOrder(order) {
  console.log('🔍 Debug de pedido:', order);
  alert(`Debug del pedido ${order.order_number}. Ver consola para detalles.`);
}

function duplicateOrder(order) {
  newOrder.value = {
    company_id: order.company_id._id || order.company_id,
    shipping_commune: order.shipping_commune,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    customer_document: order.customer_document,
    shipping_address: order.shipping_address,
    total_amount: order.total_amount,
    shipping_cost: order.shipping_cost,
    notes: order.notes
  };
  openCreateOrderModal();
}

function openTrackingUrl(order) {
  if (order.shipday_tracking_url) {
    window.open(order.shipday_tracking_url, '_blank');
  }
}

function downloadProofOfDelivery(order) {
  if (order.status !== 'delivered') {
    alert('El pedido debe estar entregado para descargar la prueba de entrega');
    return;
  }
  
  // Implementar descarga de prueba de entrega
  alert('Funcionalidad de descarga de prueba de entrega en desarrollo');
}

function handleOrderUpdated() {
  showUpdateStatusModal.value = false;
  fetchOrders();
}

// Funciones auxiliares
function getOrderById(orderId) {
  return orders.value.find(order => order._id === orderId);
}

function getCompanyName(companyId) {
  const company = companies.value.find(c => c._id === companyId);
  return company ? company.name : 'Empresa Desconocida';
}

function getCompanyOrderCount(companyId) {
  return orders.value.filter(order => 
    (order.company_id?._id || order.company_id) === companyId
  ).length;
}

function getCommuneOrderCount(commune) {
  return orders.value.filter(order => order.shipping_commune === commune).length;
}

function getCommuneClass(commune) {
  // Agregar clases CSS según la comuna
  if (!commune) return 'commune-none';
  
  // Comunas de enviGo (podrías obtener esta lista desde una API)
  const envigoCommunes = ['Las Condes', 'Vitacura', 'Providencia', 'Santiago', 'Ñuñoa'];
  return envigoCommunes.includes(commune) ? 'commune-envigo' : 'commune-other';
}

function getStatusIcon(status) {
  const icons = {
    pending: '🟡',
    processing: '🔵',
    shipped: '🟠',
    delivered: '🟢',
    cancelled: '🔴'
  };
  return icons[status] || '⚪';
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };
  return names[status] || status;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatDate(dateString, includeTime = false) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Santiago'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('es-CL', options);
}
</script>

<style scoped>
/* Estilos base */
.admin-orders-container {
  padding: 24px;
  background-color: #f8fafc;
  min-height: 100vh;
}

/* Header mejorado */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.title-icon {
  font-size: 32px;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #3b82f6;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-group {
  display: flex;
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-ghost {
  background: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-ghost:hover:not(:disabled) {
  background: #f8fafc;
}

.btn-icon {
  font-size: 16px;
}

/* Filtros mejorados */
.filters-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  overflow: hidden;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.filters-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.filters-actions {
  display: flex;
  gap: 12px;
}

.btn-clear-filters, .btn-toggle-filters {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-filters:hover, .btn-toggle-filters:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.toggle-icon {
  margin-left: 4px;
  font-size: 12px;
}

.filters-row {
  display: grid;
  gap: 16px;
  padding: 20px 24px;
}

.filters-basic {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.filters-advanced {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.filter-select, .filter-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s ease;
}

.filter-select:focus, .filter-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-group {
  min-width: 250px;
}

.search-input-container {
  position: relative;
}

.search-input {
  width: 100%;
  padding-right: 40px;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

/* Filtros activos */
.active-filters-summary {
  padding: 16px 24px;
  background: #fef3c7;
  border-top: 1px solid #f59e0b;
}

.active-filters-label {
  font-size: 13px;
  font-weight: 500;
  color: #92400e;
  margin-bottom: 8px;
  display: block;
}

.active-filters-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #fbbf24;
  color: #92400e;
  border-radius: 4px;
  font-size: 12px;
}

.chip-remove {
  background: none;
  border: none;
  color: #92400e;
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  margin-left: 4px;
}

/* Barra de acciones masivas */
.bulk-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e40af;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bulk-selection-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.count-number {
  font-weight: 700;
  font-size: 18px;
}

.btn-clear-selection {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.bulk-actions {
  display: flex;
  gap: 12px;
}

.btn-bulk-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-assign {
  background: #16a34a;
  color: white;
}

.btn-assign:hover:not(:disabled) {
  background: #15803d;
}

.btn-status {
  background: #8b5cf6;
  color: white;
}

.btn-status:hover:not(:disabled) {
  background: #7c3aed;
}

.btn-export {
  background: #f59e0b;
  color: white;
}

.btn-export:hover:not(:disabled) {
  background: #d97706;
}

/* Tabla mejorada */
.orders-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: #6b7280;
  margin: 0 0 24px 0;
}

.table-container {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th {
  background: #f8fafc;
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.orders-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.orders-table th.sortable:hover {
  background: #f1f5f9;
}

.sort-indicator {
  margin-left: 4px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.sort-indicator.asc::after {
  content: '↑';
  opacity: 1;
}

.sort-indicator.desc::after {
  content: '↓';
  opacity: 1;
}

.checkbox-disabled {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 12px;
  opacity: 0.5;
}

.orders-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.order-row {
  transition: background-color 0.2s ease;
}

.order-row:hover {
  background-color: #f8fafc;
}

.order-row.selected {
  background-color: #eff6ff;
}

.order-row.has-driver {
  border-left: 4px solid #16a34a;
}

.order-row.delivered {
  background-color: #f0fdf4;
}

.order-row.cancelled {
  background-color: #fef2f2;
  opacity: 0.7;
}

/* Estilos de celdas específicas */
.order-number-cell {
  min-width: 140px;
}

.order-number {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.order-id {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.company-cell {
  min-width: 160px;
}

.company-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.company-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 13px;
}

.company-price {
  font-size: 11px;
  color: #059669;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 12px;
  display: inline-block;
  width: fit-content;
}

.customer-cell {
  min-width: 200px;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 13px;
}

.customer-contact {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-item {
  font-size: 11px;
  color: #64748b;
}

.shipping-address {
  font-size: 11px;
  color: #64748b;
  line-height: 1.3;
  margin-top: 4px;
}

.commune-cell {
  min-width: 120px;
}

.commune-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
}

.commune-badge.commune-envigo {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.commune-badge.commune-other {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.commune-badge.commune-none {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.date-cell {
  min-width: 140px;
  font-size: 11px;
}

.date-creation, .date-delivery, .date-updated {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.date-label {
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-value {
  color: #374151;
  margin-top: 1px;
}

.status-cell {
  min-width: 110px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.processing {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.shipped {
  background: #fed7aa;
  color: #9a3412;
}

.status-badge.delivered {
  background: #dcfce7;
  color: #166534;
}

.status-badge.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-icon {
  font-size: 14px;
}

.cost-cell {
  min-width: 100px;
  text-align: right;
}

.cost-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shipping-cost {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.total-amount {
  font-size: 11px;
  color: #64748b;
}

.driver-cell {
  min-width: 130px;
}

.driver-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.driver-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 12px;
}

.driver-status {
  font-size: 10px;
  color: #059669;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 10px;
  text-align: center;
}

.driver-pending .driver-status {
  color: #1e40af;
  background: #dbeafe;
}

.no-driver {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

.actions-cell {
  min-width: 140px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
}

.btn-table-action {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
}

.btn-table-action:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.btn-table-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-table-action.view:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-table-action.edit:hover:not(:disabled) {
  background: #8b5cf6;
  color: white;
  border-color: #8b5cf6;
}

.btn-table-action.assign:hover:not(:disabled) {
  background: #16a34a;
  color: white;
  border-color: #16a34a;
}

.action-dropdown {
  position: relative;
}

.btn-table-action.more {
  font-weight: bold;
}

.action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 20;
  min-width: 140px;
  overflow: hidden;
}

.action-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.action-menu-item:hover:not(:disabled) {
  background: #f3f4f6;
}

.action-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Paginación mejorada */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #fafbfc;
}

.pagination-info {
  font-size: 14px;
  color: #64748b;
}

.pagination {
  display: flex;
  gap: 4px;
  align-items: center;
}

.btn-page {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 40px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-page:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-page.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.page-numbers {
  display: flex;
  gap: 2px;
}

.page-size-select {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

/* Modales mejorados */
.modal-content {
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.create-order-modal {
  max-width: 700px;
}

.bulk-assign-modal {
  max-width: 500px;
}

.order-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

/* Asignación masiva */
.selection-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.selection-summary h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 16px;
}

.selected-orders-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 100px;
  overflow-y: auto;
}

.selected-order-item {
  background: #e0e7ff;
  color: #3730a3;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.more-orders {
  background: #f3f4f6;
  color: #6b7280;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-style: italic;
}

.driver-selection {
  margin-bottom: 20px;
}

.driver-selection h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 16px;
}

.loading-drivers {
  padding: 20px;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

.assignment-progress {
  margin-bottom: 20px;
}

.assignment-progress h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 16px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
}

.assignment-results {
  margin-bottom: 20px;
}

.assignment-results h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 16px;
}

.results-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.result-stat {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.result-stat.success {
  background: #dcfce7;
  color: #166534;
}

.result-stat.error {
  background: #fee2e2;
  color: #991b1b;
}

.failed-assignments {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
}

.failed-assignments h5 {
  margin: 0 0 8px 0;
  color: #991b1b;
  font-size: 14px;
}

.failed-item {
  font-size: 12px;
  color: #7f1d1d;
  margin-bottom: 4px;
}

/* Responsive */
@media (max-width: 1200px) {
  .filters-basic {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .header-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-group {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .admin-orders-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 20px;
  }
  
  .filters-basic, .filters-advanced {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .bulk-actions {
    justify-content: center;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 16px;
  }
  
  .table-container {
    font-size: 12px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 8px 6px;
  }
  
  /* Ocultar algunas columnas en móvil */
  .orders-table th:nth-child(6),
  .orders-table td:nth-child(6),
  .orders-table th:nth-child(9),
  .orders-table td:nth-child(9) {
    display: none;
  }
}
</style>