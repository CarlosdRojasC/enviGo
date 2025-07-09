<template>
  <div class="admin-orders-container">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">📦</span>
          Gestión de Pedidos
        </h1>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-number">{{ orders.length }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ selectedOrders.length }}</span>
            <span class="stat-label">Seleccionados</span>
          </div>
        </div>
      </div>
      
      <div class="header-actions">
        <button @click="showCreateOrderModal = true" class="btn-action btn-primary">
          <span class="btn-icon">➕</span>
          Nuevo Pedido
        </button>
        <button @click="showBulkUploadModal = true" class="btn-action btn-secondary">
          <span class="btn-icon">📁</span>
          Subida Masiva
        </button>
        <button @click="exportOrders" :disabled="isExporting" class="btn-action btn-export">
          <span class="btn-icon">📊</span>
          {{ isExporting ? 'Exportando...' : 'Exportar Excel' }}
        </button>
        <button @click="fetchOrders" class="btn-action btn-refresh">
          <span class="btn-icon">🔄</span>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Advanced Filters Section -->
    <div class="filters-section">
      <div class="filters-header">
        <h3>🔍 Filtros Avanzados</h3>
        <button @click="clearAllFilters" class="btn-clear-filters">
          <span class="btn-icon">🗑️</span>
          Limpiar Filtros
        </button>
      </div>
      
      <div class="filters-grid">
        <div class="filter-group">
          <label class="filter-label">Empresa</label>
          <select v-model="filters.company_id" @change="fetchOrders" class="filter-select">
            <option value="">Todas las empresas</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Estado</label>
          <select v-model="filters.status" @change="fetchOrders" class="filter-select">
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="processing">Procesando</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Comuna</label>
          <select v-model="filters.shipping_commune" @change="fetchOrders" class="filter-select commune-filter">
            <option value="">Todas las comunas</option>
            <option v-for="commune in availableCommunes" :key="commune" :value="commune">
              {{ commune }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Desde</label>
          <input 
            v-model="filters.date_from" 
            @change="fetchOrders" 
            type="date" 
            class="filter-input"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label">Hasta</label>
          <input 
            v-model="filters.date_to" 
            @change="fetchOrders" 
            type="date" 
            class="filter-input"
          />
        </div>

        <div class="filter-group filter-search">
          <label class="filter-label">Búsqueda</label>
          <div class="search-wrapper">
            <input 
              v-model="filters.search" 
              @input="debounceSearch"
              type="text" 
              placeholder="Cliente, número de pedido, dirección..." 
              class="filter-input search-input"
            />
            <span class="search-icon">🔍</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Section -->
    <Transition name="slide-down">
      <div v-if="selectedOrders.length > 0" class="bulk-actions-section">
        <div class="bulk-actions-header">
          <div class="bulk-selection-info">
            <span class="selection-count">
              {{ selectedOrders.length }} pedido{{ selectedOrders.length !== 1 ? 's' : '' }} seleccionado{{ selectedOrders.length !== 1 ? 's' : '' }}
            </span>
            <span class="selection-details">
              de {{ orders.filter(order => !order.shipday_order_id).length }} disponibles para selección
            </span>
          </div>
          
          <div class="bulk-actions">
            <button @click="openBulkAssignModal" class="btn-bulk-assign">
              <span class="btn-icon">🚚</span>
              Asignar Conductor
            </button>
            <button @click="bulkUpdateStatus" class="btn-bulk-update">
              <span class="btn-icon">📝</span>
              Cambiar Estado
            </button>
            <button @click="clearSelection" class="btn-clear-selection">
              <span class="btn-icon">✖️</span>
              Limpiar Selección
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Orders Table Section -->
    <div class="content-section">
      <div class="table-header">
        <div class="table-title">
          <h3>📋 Lista de Pedidos</h3>
          <span class="orders-count">{{ pagination.total }} pedidos total</span>
        </div>
        <div class="table-controls">
          <div class="view-options">
            <button 
              @click="viewMode = 'table'" 
              :class="['view-btn', { active: viewMode === 'table' }]"
            >
              📊 Tabla
            </button>
            <button 
              @click="viewMode = 'cards'" 
              :class="['view-btn', { active: viewMode === 'cards' }]"
            >
              🎴 Tarjetas
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingOrders" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando pedidos...</p>
      </div>

      <!-- Table View -->
      <div v-else-if="viewMode === 'table'" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="checkbox-column">
                <input 
                  type="checkbox"
                  :checked="selectAllChecked"
                  :indeterminate="selectAllIndeterminate"
                  @change="toggleSelectAll"
                  class="checkbox-input master-checkbox"
                />
              </th>
              <th class="sortable-header" @click="sortBy('order_number')">
                Número
                <span class="sort-indicator">⇅</span>
              </th>
              <th class="sortable-header" @click="sortBy('customer_name')">
                Cliente
                <span class="sort-indicator">⇅</span>
              </th>
              <th>Estado</th>
              <th>Comuna</th>
              <th class="sortable-header" @click="sortBy('total_amount')">
                Total
                <span class="sort-indicator">⇅</span>
              </th>
              <th class="sortable-header" @click="sortBy('order_date')">
                Fecha
                <span class="sort-indicator">⇅</span>
              </th>
              <th>Empresa</th>
              <th>Conductor</th>
              <th class="actions-column">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="order in orders" 
              :key="order._id"
              :class="['order-row', { 
                'selected-row': selectedOrders.includes(order._id),
                'highlighted-row': highlightedOrderId === order._id
              }]"
            >
              <td class="checkbox-column">
                <input 
                  v-if="!order.shipday_order_id"
                  type="checkbox"
                  :value="order._id"
                  v-model="selectedOrders"
                  class="checkbox-input"
                />
                <span v-else class="checkbox-disabled" title="Este pedido ya está en Shipday">🔒</span>
              </td>
              
              <td class="order-number-cell">
                <div class="order-number-wrapper">
                  <span class="order-number">#{{ order.order_number }}</span>
                  <span v-if="order.shipday_order_id" class="shipday-badge">
                    Shipday: {{ order.shipday_order_id }}
                  </span>
                </div>
              </td>
              
              <td class="customer-cell">
                <div class="customer-info">
                  <span class="customer-name">{{ order.customer_name || 'Sin nombre' }}</span>
                  <span class="customer-phone">{{ order.customer_phone || 'Sin teléfono' }}</span>
                </div>
              </td>
              
              <td class="status-cell">
                <span :class="['status-badge', `status-${order.status}`]">
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>
              
              <td class="commune-cell">
                <span :class="['commune-badge', order.shipping_commune ? 'commune-filled' : 'commune-empty']">
                  {{ order.shipping_commune || 'Sin comuna' }}
                </span>
              </td>
              
              <td class="amount-cell">
                <span class="amount">{{ formatCurrency(order.total_amount) }}</span>
              </td>
              
              <td class="date-cell">
                <div class="date-info">
                  <span class="date">{{ formatDate(order.order_date) }}</span>
                  <span class="time">{{ formatTime(order.order_date) }}</span>
                </div>
              </td>
              
              <td class="company-cell">
                <div class="company-info">
                  <span class="company-name">{{ getCompanyName(order.company_id) }}</span>
                </div>
              </td>
              
              <td class="driver-cell">
                <span v-if="order.assigned_driver" class="driver-assigned">
                  👨‍💼 {{ order.assigned_driver }}
                </span>
                <span v-else class="driver-unassigned">Sin asignar</span>
              </td>
              
              <td class="actions-cell">
                <div class="actions-menu">
                  <button @click="viewOrderDetails(order)" class="action-btn action-view">
                    <span class="btn-icon">👁️</span>
                    Ver
                  </button>
                  
                  <div class="actions-dropdown">
                    <button class="action-btn action-more">⋮</button>
                    <div class="dropdown-menu">
                      <button @click="openUpdateStatusModal(order)" class="dropdown-item">
                        <span class="item-icon">📝</span>
                        Cambiar Estado
                      </button>
                      
                      <button 
                        v-if="!order.shipday_order_id" 
                        @click="createShipdayOrder(order)" 
                        class="dropdown-item"
                      >
                        <span class="item-icon">🚀</span>
                        Enviar a Shipday
                      </button>
                      
                      <button 
                        v-if="!order.shipday_order_id" 
                        @click="openAssignModal(order)" 
                        class="dropdown-item"
                      >
                        <span class="item-icon">🚚</span>
                        Asignar Conductor
                      </button>
                      
                      <button 
                        v-if="order.status === 'delivered'" 
                        @click="viewProofOfDelivery(order)" 
                        class="dropdown-item"
                      >
                        <span class="item-icon">📸</span>
                        Ver Prueba Entrega
                      </button>
                      
                      <div class="dropdown-divider"></div>
                      
                      <button @click="debugOrder(order)" class="dropdown-item debug-item">
                        <span class="item-icon">🔧</span>
                        Debug Info
                      </button>
                      
                      <button @click="deleteOrder(order)" class="dropdown-item danger-item">
                        <span class="item-icon">🗑️</span>
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

      <!-- Cards View -->
      <div v-else-if="viewMode === 'cards'" class="cards-container">
        <div 
          v-for="order in orders" 
          :key="order._id"
          :class="['order-card', { 
            'selected-card': selectedOrders.includes(order._id),
            'highlighted-card': highlightedOrderId === order._id
          }]"
        >
          <div class="card-header">
            <div class="card-title">
              <input 
                v-if="!order.shipday_order_id"
                type="checkbox"
                :value="order._id"
                v-model="selectedOrders"
                class="card-checkbox"
              />
              <span class="order-number">#{{ order.order_number }}</span>
              <span :class="['status-badge', `status-${order.status}`]">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>
            <div class="card-actions">
              <button @click="viewOrderDetails(order)" class="card-action-btn">👁️</button>
              <button class="card-action-btn">⋮</button>
            </div>
          </div>
          
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">Cliente:</span>
              <span class="field-value">{{ order.customer_name || 'Sin nombre' }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">Comuna:</span>
              <span class="field-value">{{ order.shipping_commune || 'Sin comuna' }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">Total:</span>
              <span class="field-value amount">{{ formatCurrency(order.total_amount) }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">Fecha:</span>
              <span class="field-value">{{ formatDate(order.order_date) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="orders.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No hay pedidos</h3>
        <p>No se encontraron pedidos con los filtros actuales.</p>
        <button @click="clearAllFilters" class="btn-action btn-primary">
          Limpiar Filtros
        </button>
      </div>

      <!-- Pagination -->
      <div v-if="orders.length > 0" class="pagination-section">
        <div class="pagination-info">
          <span>
            Mostrando {{ ((pagination.page - 1) * pagination.limit) + 1 }} a 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
            de {{ pagination.total }} pedidos
          </span>
        </div>
        
        <div class="pagination-controls">
          <button 
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="page-btn"
          >
            ← Anterior
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="page in getVisiblePages()"
              :key="page"
              @click="changePage(page)"
              :class="['page-number', { active: page === pagination.page }]"
            >
              {{ page }}
            </button>
          </div>
          
          <button 
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="page-btn"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Update Status Modal -->
    <Modal v-model="showUpdateStatusModal" title="Actualizar Estado del Pedido" width="500px">
      <UpdateOrderStatus 
        v-if="selectedOrder"
        :order="selectedOrder"
        @close="showUpdateStatusModal = false"
        @updated="onOrderUpdated"
      />
    </Modal>

    <!-- Order Details Modal -->
    <Modal v-model="showOrderDetailsModal" title="Detalles del Pedido" width="800px">
      <OrderDetails 
        v-if="selectedOrder"
        :order="selectedOrder"
        @close="showOrderDetailsModal = false"
      />
    </Modal>

    <!-- Create Order Modal -->
    <Modal v-model="showCreateOrderModal" title="Crear Nuevo Pedido" width="900px">
      <form @submit.prevent="createOrder" class="create-order-form">
        <div class="form-grid">
          <!-- Customer Information -->
          <div class="form-section">
            <h4>👤 Información del Cliente</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Nombre Completo *</label>
                <input v-model="newOrder.customer_name" type="text" required />
              </div>
              <div class="form-group">
                <label>Teléfono *</label>
                <input v-model="newOrder.customer_phone" type="tel" required />
              </div>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="newOrder.customer_email" type="email" />
            </div>
          </div>

          <!-- Shipping Information -->
          <div class="form-section">
            <h4>📍 Información de Envío</h4>
            <div class="form-group">
              <label>Dirección Completa *</label>
              <textarea v-model="newOrder.shipping_address" required></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Comuna *</label>
                <input v-model="newOrder.shipping_commune" type="text" required />
              </div>
              <div class="form-group">
                <label>Región</label>
                <input v-model="newOrder.shipping_state" type="text" />
              </div>
            </div>
          </div>

          <!-- Financial Information -->
          <div class="form-section">
            <h4>💰 Información Financiera</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Monto Total *</label>
                <input v-model.number="newOrder.total_amount" type="number" step="0.01" required />
              </div>
              <div class="form-group">
                <label>Costo de Envío</label>
                <input v-model.number="newOrder.shipping_cost" type="number" step="0.01" />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" @click="showCreateOrderModal = false" class="btn-cancel">
            Cancelar
          </button>
          <button type="submit" :disabled="isCreatingOrder" class="btn-save">
            {{ isCreatingOrder ? 'Creando...' : 'Crear Pedido' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Other existing modals... -->
    <!-- (Bulk Upload, Assign Driver, Bulk Assign modals remain the same) -->
  
<Modal v-model="showBulkUploadModal" title="Subida Masiva de Pedidos" width="600px">
  <div class="bulk-upload-content">
     <div class="form-group">
        <label for="bulk-company-select">Asignar pedidos a la empresa:</label>
        <select id="bulk-company-select" v-model="bulkUploadCompanyId" required>
            <option disabled value="">-- Seleccione una empresa --</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
                {{ company.name }}
            </option>
        </select>
    </div>
    <p>Sube un archivo Excel para crear múltiples pedidos a la vez. Asegúrate de que el archivo siga la plantilla requerida.</p>
    <div class="template-download-section">
        <a href="#" @click.prevent="downloadTemplate" class="download-template-link">
            ⬇️ Descargar Plantilla de Ejemplo
        </a>
    </div>
    
    <div class="form-group">
      <label for="file-upload" class="file-upload-label">Seleccionar archivo Excel</label>
      <input id="file-upload" type="file" @change="handleFileSelect" accept=".xlsx, .xls" />
    </div>
    
    <div v-if="selectedFile" class="file-name">
      Archivo seleccionado: {{ selectedFile.name }}
    </div>
    
    <div v-if="uploadFeedback" class="upload-feedback" :class="uploadStatus">
      {{ uploadFeedback }}
    </div>

    <div class="modal-actions">
      <button @click="showBulkUploadModal = false" class="btn-cancel">Cerrar</button>
      
      <button @click="handleBulkUpload" 
              :disabled="!selectedFile || isUploading" 
              class="btn-save">
        {{ isUploading ? 'Subiendo...' : 'Iniciar Subida' }}
      </button>
    </div>
    </div>
</Modal>

    <!-- Modal de asignación individual (existente) -->
    <Modal v-model="showAssignModal" title="Asignar Conductor" width="500px">
      <div v-if="selectedOrder">
        <p>Asignando pedido <strong>#{{ selectedOrder.order_number }}</strong> a un conductor de Shipday.</p>
        
        <div class="debug-section">
          <button @click="debugDrivers" class="btn-debug" type="button">
            🔍 Debug Conductores
          </button>
        </div>
        
        <div v-if="loadingDrivers" class="loading-state">Cargando conductores...</div>
        
        <div v-else class="form-group">
          <label>Conductor Disponible</label>
          <select v-model="selectedDriverId">
            <option disabled value="">-- Selecciona un conductor --</option>
            <option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id">
              {{ driver.name }} ({{ driver.email }}) - {{ driver.isActive ? 'Activo' : 'Inactivo' }}
            </option>
          </select>
          
          <div v-if="selectedDriverId" class="driver-info">
            <p><strong>Conductor seleccionado:</strong></p>
            <pre>{{ JSON.stringify(availableDrivers.find(d => d.id === selectedDriverId), null, 2) }}</pre>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showAssignModal = false" class="btn-cancel">Cancelar</button>
          <button @click="confirmAssignment" :disabled="!selectedDriverId || isAssigning" class="btn-save">
            {{ isAssigning ? 'Asignando...' : 'Confirmar Asignación' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- NUEVO: Modal de asignación masiva -->
    <Modal v-model="showBulkAssignModal" title="Asignación Masiva de Conductor" width="600px">
      <div class="bulk-assign-content">
        <div class="selection-summary">
          <h4>📋 Pedidos seleccionados ({{ selectedOrders.length }})</h4>
          <div class="selected-orders-list">
            <div v-for="orderId in selectedOrders" :key="orderId" class="selected-order-item">
              {{ getOrderById(orderId)?.order_number }} - {{ getOrderById(orderId)?.customer_name }}
            </div>
          </div>
        </div>

        <div class="driver-selection">
          <div v-if="loadingDrivers" class="loading-state">Cargando conductores...</div>
          
          <div v-else class="form-group">
            <label>Conductor para asignar a todos los pedidos</label>
            <select v-model="bulkSelectedDriverId">
              <option disabled value="">-- Selecciona un conductor --</option>
              <option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id">
                {{ driver.name }} ({{ driver.email }}) - {{ driver.isActive ? 'Activo' : 'Inactivo' }}
              </option>
            </select>
          </div>

          <div v-if="bulkSelectedDriverId" class="bulk-driver-info">
            <p><strong>Se asignará:</strong> {{ availableDrivers.find(d => d.id === bulkSelectedDriverId)?.name }}</p>
          </div>
        </div>

        <!-- Progreso de asignación masiva -->
        <div v-if="isBulkAssigning" class="bulk-progress">
          <h4>Progreso de asignación:</h4>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: bulkProgressPercentage + '%' }"></div>
          </div>
          <p>{{ bulkAssignmentCompleted }} / {{ selectedOrders.length }} pedidos procesados</p>
          
          <div v-if="bulkAssignmentResults.length > 0" class="results-preview">
            <div v-for="result in bulkAssignmentResults.slice(-3)" :key="result.orderId" class="result-item">
              <span :class="result.success ? 'success-icon' : 'error-icon'">
                {{ result.success ? '✅' : '❌' }}
              </span>
              {{ result.orderNumber }}: {{ result.message }}
            </div>
          </div>
        </div>

        <!-- Resultados finales -->
        <div v-if="bulkAssignmentFinished" class="bulk-results">
          <h4>📊 Resultados de la asignación masiva:</h4>
          <div class="results-summary">
            <div class="result-stat success">
              <span class="stat-number">{{ bulkAssignmentResults.filter(r => r.success).length }}</span>
              <span class="stat-label">Exitosos</span>
            </div>
            <div class="result-stat error">
              <span class="stat-number">{{ bulkAssignmentResults.filter(r => !r.success).length }}</span>
              <span class="stat-label">Fallidos</span>
            </div>
          </div>

          <div v-if="bulkAssignmentResults.filter(r => !r.success).length > 0" class="error-details">
            <h5>❌ Pedidos que fallaron:</h5>
            <div v-for="result in bulkAssignmentResults.filter(r => !r.success)" :key="result.orderId" class="error-item">
              <strong>{{ result.orderNumber }}:</strong> {{ result.message }}
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeBulkAssignModal" class="btn-cancel">
            {{ isBulkAssigning ? 'Cerrar después de completar' : 'Cerrar' }}
          </button>
          <button 
            v-if="!isBulkAssigning && !bulkAssignmentFinished"
            @click="confirmBulkAssignment" 
            :disabled="!bulkSelectedDriverId" 
            class="btn-save">
            🚚 Asignar {{ selectedOrders.length }} pedidos
          </button>
        </div>
      </div>
    </Modal>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiService } from '../services/api';
import { shipdayService } from '../services/shipday';
import Modal from '../components/Modal.vue';
import UpdateOrderStatus from '../components/UpdateOrderStatus.vue';
import OrderDetails from '../components/OrderDetails.vue';

// Router and Route
const route = useRoute();
const router = useRouter();

// Core data
const orders = ref([]);
const companies = ref([]);
const availableCommunes = ref([]);

// Pagination and filters
const pagination = ref({ 
  page: 1, 
  limit: 15, 
  total: 0, 
  totalPages: 1 
});

const filters = ref({ 
  company_id: '', 
  status: '', 
  shipping_commune: '', 
  date_from: '', 
  date_to: '', 
  search: '' 
});

// UI State
const loadingOrders = ref(true);
const isExporting = ref(false);
const viewMode = ref('table'); // 'table' or 'cards'
const sortField = ref('order_date');
const sortDirection = ref('desc');
const highlightedOrderId = ref(null);

// Modal states
const showUpdateStatusModal = ref(false);
const showOrderDetailsModal = ref(false);
const showCreateOrderModal = ref(false);
const showBulkUploadModal = ref(false);
const showAssignModal = ref(false);
const showBulkAssignModal = ref(false);

// Form states
const isCreatingOrder = ref(false);
const selectedOrder = ref(null);
const newOrder = ref({});

// Bulk upload
const bulkUploadCompanyId = ref('');
const selectedFile = ref(null);
const isUploading = ref(false);
const uploadFeedback = ref('');
const uploadStatus = ref('');

// Driver assignment
const availableDrivers = ref([]);
const loadingDrivers = ref(false);
const selectedDriverId = ref('');
const isAssigning = ref(false);

// Bulk selection and assignment
const selectedOrders = ref([]);
const bulkSelectedDriverId = ref('');
const isBulkAssigning = ref(false);
const bulkAssignmentCompleted = ref(0);
const bulkAssignmentResults = ref([]);
const bulkAssignmentFinished = ref(false);

// Debounce timer for search
let searchTimeout = null;

// Computed properties
const selectAllChecked = computed(() => {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  return selectableOrders.length > 0 && 
         selectableOrders.every(order => selectedOrders.value.includes(order._id));
});

const selectAllIndeterminate = computed(() => {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  const selectedCount = selectableOrders.filter(order => 
    selectedOrders.value.includes(order._id)
  ).length;
  return selectedCount > 0 && selectedCount < selectableOrders.length;
});

const bulkProgressPercentage = computed(() => {
  if (selectedOrders.value.length === 0) return 0;
  return (bulkAssignmentCompleted.value / selectedOrders.value.length) * 100;
});

// Watchers
watch(() => route.query.highlight, (newValue) => {
  if (newValue) {
    highlightedOrderId.value = newValue;
    // Remove highlight after 3 seconds
    setTimeout(() => {
      highlightedOrderId.value = null;
    }, 3000);
  }
}, { immediate: true });

// Lifecycle
onMounted(() => {
  fetchCompanies();
  fetchOrders();
  fetchAvailableCommunes();
});

// Core functions
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
    
    const { data } = await apiService.orders.getAll(params); 
    orders.value = data.orders; 
    pagination.value = data.pagination;
    
    // Clear selection when changing pages or filters
    selectedOrders.value = [];
  } catch (error) { 
    console.error('Error fetching orders:', error); 
    showNotification('Error al cargar pedidos', 'error');
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
    
    const { data } = await apiService.orders.getAvailableCommunes(params);
    availableCommunes.value = data.communes || [];
  } catch (error) {
    console.error('Error fetching communes:', error);
  }
}

// Utility functions
function getStatusLabel(status) {
  const statusLabels = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };
  return statusLabels[status] || status;
}

function getCompanyName(companyId) {
  const company = companies.value.find(c => c._id === companyId);
  return company ? company.name : 'Sin empresa';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount || 0);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-CL');
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Search and filtering
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchOrders();
  }, 500);
}

function clearAllFilters() {
  filters.value = {
    company_id: '',
    status: '',
    shipping_commune: '',
    date_from: '',
    date_to: '',
    search: ''
  };
  fetchOrders();
}

// Sorting
function sortBy(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
  fetchOrders();
}

// Pagination
function changePage(page) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page;
    fetchOrders();
  }
}

function getVisiblePages() {
  const current = pagination.value.page;
  const total = pagination.value.totalPages;
  const delta = 2;
  
  let start = Math.max(1, current - delta);
  let end = Math.min(total, current + delta);
  
  // Adjust range to always show 5 pages when possible
  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(total, start + 4);
    } else {
      start = Math.max(1, end - 4);
    }
  }
  
  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
}

// Selection functions
function toggleSelectAll() {
  const selectableOrders = orders.value.filter(order => !order.shipday_order_id);
  
  if (selectAllChecked.value) {
    // Deselect all selectable orders from current page
    selectedOrders.value = selectedOrders.value.filter(id => 
      !selectableOrders.some(order => order._id === id)
    );
  } else {
    // Select all selectable orders from current page
    selectableOrders.forEach(order => {
      if (!selectedOrders.value.includes(order._id)) {
        selectedOrders.value.push(order._id);
      }
    });
  }
}

function clearSelection() {
  selectedOrders.value = [];
}

function getOrderById(orderId) {
  return orders.value.find(order => order._id === orderId);
}

// Modal functions
function viewOrderDetails(order) {
  selectedOrder.value = order;
  showOrderDetailsModal.value = true;
}

function openUpdateStatusModal(order) {
  selectedOrder.value = order;
  showUpdateStatusModal.value = true;
}

function onOrderUpdated() {
  showUpdateStatusModal.value = false;
  fetchOrders();
  showNotification('Estado del pedido actualizado correctamente', 'success');
}

// Order management functions
async function createOrder() {
  if (!newOrder.value.customer_name || !newOrder.value.customer_phone || 
      !newOrder.value.shipping_address || !newOrder.value.total_amount) {
    showNotification('Por favor, completa todos los campos obligatorios', 'error');
    return;
  }

  isCreatingOrder.value = true;
  try {
    await apiService.orders.create(newOrder.value);
    showCreateOrderModal.value = false;
    newOrder.value = {};
    fetchOrders();
    showNotification('Pedido creado exitosamente', 'success');
  } catch (error) {
    console.error('Error creating order:', error);
    showNotification('Error al crear el pedido', 'error');
  } finally {
    isCreatingOrder.value = false;
  }
}

async function deleteOrder(order) {
  if (!confirm(`¿Estás seguro de que quieres eliminar el pedido #${order.order_number}?`)) {
    return;
  }

  try {
    await apiService.orders.delete(order._id);
    fetchOrders();
    showNotification('Pedido eliminado correctamente', 'success');
  } catch (error) {
    console.error('Error deleting order:', error);
    showNotification('Error al eliminar el pedido', 'error');
  }
}

// Export function
async function exportOrders() {
  isExporting.value = true;
  try {
    const params = { ...filters.value, export: true };
    const response = await apiService.orders.export(params);
    
    // Download the file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    showNotification('Archivo exportado correctamente', 'success');
  } catch (error) {
    console.error('Error exporting orders:', error);
    showNotification('Error al exportar los pedidos', 'error');
  } finally {
    isExporting.value = false;
  }
}

// Shipday integration
async function createShipdayOrder(order) {
  try {
    const response = await apiService.orders.createInShipday(order._id);
    showNotification('Pedido enviado a Shipday correctamente', 'success');
    fetchOrders();
  } catch (error) {
    console.error('Error creating Shipday order:', error);
    showNotification(`Error al enviar a Shipday: ${error.response?.data?.error || error.message}`, 'error');
  }
}

// Driver assignment functions
async function fetchAvailableDrivers() {
  loadingDrivers.value = true;
  try {
    const response = await shipdayService.getDrivers();
    const allDrivers = response.data?.data || response.data || [];
    availableDrivers.value = allDrivers.filter(driver => driver.isActive);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    showNotification('Error al cargar los conductores desde Shipday', 'error');
  } finally {
    loadingDrivers.value = false;
  }
}

async function openAssignModal(order) {
  selectedOrder.value = order;
  showAssignModal.value = true;
  selectedDriverId.value = '';
  
  if (availableDrivers.value.length === 0) {
    await fetchAvailableDrivers();
  }
}

async function confirmAssignment() {
  if (!selectedDriverId.value) {
    showNotification('Por favor, selecciona un conductor', 'error');
    return;
  }
  
  isAssigning.value = true;
  try {
    await apiService.orders.assignDriver(selectedOrder.value._id, selectedDriverId.value);
    showAssignModal.value = false;
    fetchOrders();
    showNotification('Conductor asignado exitosamente', 'success');
  } catch (error) {
    console.error('Error assigning driver:', error);
    showNotification(`Error al asignar conductor: ${error.response?.data?.error || error.message}`, 'error');
  } finally {
    isAssigning.value = false;
  }
}

// Bulk assignment functions
async function openBulkAssignModal() {
  if (selectedOrders.value.length === 0) {
    showNotification('Por favor, selecciona al menos un pedido', 'error');
    return;
  }
  
  showBulkAssignModal.value = true;
  bulkSelectedDriverId.value = '';
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  bulkAssignmentFinished.value = false;
  isBulkAssigning.value = false;
  
  if (availableDrivers.value.length === 0) {
    await fetchAvailableDrivers();
  }
}

async function confirmBulkAssignment() {
  if (!bulkSelectedDriverId.value) {
    showNotification('Por favor, selecciona un conductor', 'error');
    return;
  }
  
  if (selectedOrders.value.length === 0) {
    showNotification('No hay pedidos seleccionados', 'error');
    return;
  }
  
  isBulkAssigning.value = true;
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  
  const driver = availableDrivers.value.find(d => d.id === bulkSelectedDriverId.value);
  
  for (const orderId of selectedOrders.value) {
    try {
      await apiService.orders.assignDriver(orderId, bulkSelectedDriverId.value);
      bulkAssignmentResults.value.push({
        orderId,
        success: true,
        message: `Asignado a ${driver?.name || 'conductor'}`
      });
    } catch (error) {
      console.error(`Error assigning driver to order ${orderId}:`, error);
      bulkAssignmentResults.value.push({
        orderId,
        success: false,
        message: error.response?.data?.error || error.message
      });
    }
    
    bulkAssignmentCompleted.value++;
    
    // Small delay to show progress
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  bulkAssignmentFinished.value = true;
  fetchOrders();
  
  const successCount = bulkAssignmentResults.value.filter(r => r.success).length;
  const failCount = bulkAssignmentResults.value.length - successCount;
  
  if (failCount === 0) {
    showNotification(`¡Todos los ${successCount} pedidos fueron asignados exitosamente!`, 'success');
  } else {
    showNotification(`${successCount} pedidos asignados, ${failCount} fallaron. Revisa los detalles.`, 'warning');
  }
}

function closeBulkAssignModal() {
  showBulkAssignModal.value = false;
  
  if (bulkAssignmentFinished.value) {
    const successfulOrderIds = bulkAssignmentResults.value
      .filter(r => r.success)
      .map(r => r.orderId);
    
    selectedOrders.value = selectedOrders.value.filter(id => 
      !successfulOrderIds.includes(id)
    );
  }
  
  // Reset states
  bulkSelectedDriverId.value = '';
  bulkAssignmentCompleted.value = 0;
  bulkAssignmentResults.value = [];
  bulkAssignmentFinished.value = false;
  isBulkAssigning.value = false;
}

// Bulk status update
async function bulkUpdateStatus() {
  if (selectedOrders.value.length === 0) {
    showNotification('Por favor, selecciona al menos un pedido', 'error');
    return;
  }
  
  const newStatus = prompt('Ingresa el nuevo estado (pending, processing, shipped, delivered, cancelled):');
  if (!newStatus) return;
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    showNotification('Estado no válido', 'error');
    return;
  }
  
  try {
    await apiService.orders.bulkUpdateStatus(selectedOrders.value, newStatus);
    fetchOrders();
    clearSelection();
    showNotification(`Estado actualizado para ${selectedOrders.value.length} pedidos`, 'success');
  } catch (error) {
    console.error('Error updating status:', error);
    showNotification('Error al actualizar el estado', 'error');
  }
}

// Proof of delivery
function viewProofOfDelivery(order) {
  // Navigate to proof of delivery component or open modal
  router.push(`/proof-of-delivery/${order._id}`);
}

// Debug functions
async function debugOrder(order) {
  try {
    const response = await apiService.orders.debugShipday(order._id);
    console.log('Debug Info:', response.data);
    
    const debugInfo = response.data.debug_info;
    const validations = debugInfo.validations;
    const companyData = debugInfo.company_data;
    const orderData = debugInfo.order_basics;
    
    alert(`
🔍 DEBUG ORDEN: ${orderData.order_number}

📊 DATOS BÁSICOS:
• Cliente: ${orderData.customer_name || 'NO DEFINIDO'}
• Dirección: ${orderData.shipping_address || 'NO DEFINIDA'}
• Total: ${orderData.total_amount || orderData.shipping_cost || 0}

🏢 DATOS EMPRESA:
• ID: ${companyData.company_id || 'NO DEFINIDO'}
• Nombre: ${companyData.company_name || 'NO DEFINIDO'}
• Teléfono: ${companyData.company_phone || 'NO DEFINIDO'}

✅ VALIDACIONES:
• Tiene empresa: ${validations.has_company ? '✅' : '❌'}
• Nombre empresa: ${validations.has_company_name ? '✅' : '❌'}
• Nombre no vacío: ${validations.company_name_not_empty ? '✅' : '❌'}
• Todo OK: ${validations.all_required_fields_ok ? '✅' : '❌'}

🚀 NOMBRE RESTAURANTE FINAL: 
"${validations.restaurant_name_final}"

Ver consola para detalles completos.
    `);
  } catch (error) {
    console.error('Error in debug:', error);
    showNotification(`Error: ${error.response?.data?.error || error.message}`, 'error');
  }
}

// Notification system (you'll need to implement this based on your notification component)
function showNotification(message, type = 'info') {
  // Implementation depends on your notification system
  // For now, using alert as fallback
  if (type === 'error') {
    alert(`❌ ${message}`);
  } else if (type === 'success') {
    alert(`✅ ${message}`);
  } else if (type === 'warning') {
    alert(`⚠️ ${message}`);
  } else {
    alert(`ℹ️ ${message}`);
  }
}

// File upload functions
async function downloadTemplate() {
  try {
    const response = await apiService.orders.downloadImportTemplate();
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_importacion_pedidos.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading template:", error);
    showNotification('No se pudo descargar la plantilla', 'error');
  }
}

function handleFileSelect(event) {
  selectedFile.value = event.target.files[0];
}

async function uploadBulkOrders() {
  if (!selectedFile.value) {
    showNotification('Por favor, selecciona un archivo', 'error');
    return;
  }
  
  if (!bulkUploadCompanyId.value) {
    showNotification('Por favor, selecciona una empresa', 'error');
    return;
  }
  
  isUploading.value = true;
  uploadStatus.value = 'uploading';
  
  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('company_id', bulkUploadCompanyId.value);
    
    const response = await apiService.orders.bulkUpload(formData);
    
    uploadStatus.value = 'success';
    uploadFeedback.value = `✅ ${response.data.created_count} pedidos creados exitosamente`;
    
    setTimeout(() => {
      showBulkUploadModal.value = false;
      fetchOrders();
    }, 2000);
    
  } catch (error) {
    console.error('Error uploading file:', error);
    uploadStatus.value = 'error';
    uploadFeedback.value = `❌ Error: ${error.response?.data?.error || error.message}`;
  } finally {
    isUploading.value = false;
  }
}
</script>

<style scoped>
/* Variables CSS */
:root {
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --secondary-color: #10b981;
  --secondary-hover: #059669;
  --danger-color: #ef4444;
  --danger-hover: #dc2626;
  --warning-color: #f59e0b;
  --warning-hover: #d97706;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --transition: all 0.2s ease;
}

/* Base Container */
.admin-orders-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background: #f8fafc;
  min-height: 100vh;
  padding: 24px;
}

/* Header Section */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  background: white;
  padding: 24px;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-200);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 700;
  color: var(--gray-800);
  margin: 0;
}

.title-icon {
  font-size: 28px;
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: var(--gray-50);
  border-radius: var(--border-radius);
  border: 1px solid var(--gray-200);
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* Buttons */
.btn-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: var(--border-radius);
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: var(--transition);
  white-space: nowrap;
  text-decoration: none;
}

.btn-icon {
  font-size: 16px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--secondary-color);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--secondary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-export {
  background: var(--warning-color);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-export:hover:not(:disabled) {
  background: var(--warning-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-refresh {
  background: var(--gray-100);
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
}

.btn-refresh:hover:not(:disabled) {
  background: var(--gray-200);
  transform: translateY(-1px);
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Filters Section */
.filters-section {
  background: white;
  padding: 24px;
  border-radius: var(--border-radius-lg);
  margin-bottom: 24px;
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-sm);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters-header h3 {
  margin: 0;
  color: var(--gray-800);
  font-size: 18px;
  font-weight: 600;
}

.btn-clear-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--gray-100);
  color: var(--gray-600);
  border: 1px solid var(--gray-300);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition);
}

.btn-clear-filters:hover {
  background: var(--gray-200);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-search {
  grid-column: span 2;
}

.filter-label {
  font-weight: 500;
  color: var(--gray-700);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select,
.filter-input {
  padding: 12px;
  border: 1px solid var(--gray-300);
  border-radius: var(--border-radius);
  font-size: 14px;
  background: white;
  transition: var(--transition);
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.commune-filter {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: var(--primary-color);
}

.search-wrapper {
  position: relative;
}

.search-input {
  padding-right: 40px;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  font-size: 16px;
}

/* Bulk Actions Section */
.bulk-actions-section {
  background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%);
  color: white;
  padding: 20px 24px;
  border-radius: var(--border-radius-lg);
  margin-bottom: 24px;
  box-shadow: var(--shadow-lg);
}

.bulk-actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.bulk-selection-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selection-count {
  font-weight: 700;
  font-size: 18px;
}

.selection-details {
  font-size: 14px;
  opacity: 0.9;
}

.bulk-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-bulk-assign,
.btn-bulk-update,
.btn-clear-selection {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: var(--transition);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-bulk-assign,
.btn-bulk-update {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-bulk-assign:hover,
.btn-bulk-update:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-clear-selection {
  background: transparent;
  color: white;
}

.btn-clear-selection:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Content Section */
.content-section {
  background: white;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--gray-200);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--gray-200);
  background: var(--gray-50);
}

.table-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-800);
}

.orders-count {
  background: var(--primary-color);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.table-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.view-options {
  display: flex;
  background: var(--gray-200);
  border-radius: var(--border-radius);
  padding: 2px;
}

.view-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: calc(var(--border-radius) - 2px);
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition);
  color: var(--gray-600);
}

.view-btn.active {
  background: white;
  color: var(--gray-800);
  box-shadow: var(--shadow-sm);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--gray-500);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--gray-200);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Table Styles */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid var(--gray-200);
}

.data-table th {
  background: var(--gray-50);
  font-weight: 600;
  color: var(--gray-700);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: var(--transition);
}

.sortable-header:hover {
  background: var(--gray-100);
}

.sort-indicator {
  margin-left: 4px;
  color: var(--gray-400);
  font-size: 10px;
}

.checkbox-column {
  width: 50px;
  text-align: center;
}

.actions-column {
  width: 120px;
}

.checkbox-input,
.master-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.checkbox-disabled {
  color: var(--gray-400);
  font-size: 16px;
}

/* Table Row Styles */
.order-row {
  transition: var(--transition);
  cursor: pointer;
}

.order-row:hover {
  background: var(--gray-50);
}

.selected-row {
  background: linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%);
  border-left: 4px solid var(--primary-color);
}

.highlighted-row {
  background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);
  animation: highlight-fade 3s ease-out;
}

@keyframes highlight-fade {
  0% { background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%); }
  100% { background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%); }
}

/* Cell Styles */
.order-number-cell {
  font-weight: 600;
}

.order-number-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-number {
  color: var(--gray-800);
  font-size: 15px;
}

.shipday-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.customer-cell {
  min-width: 180px;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-name {
  font-weight: 500;
  color: var(--gray-800);
}

.customer-phone {
  font-size: 12px;
  color: var(--gray-500);
}

.status-cell {
  text-align: center;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-pending {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #f59e0b;
}

.status-processing {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border: 1px solid #3b82f6;
}

.status-shipped {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4338ca;
  border: 1px solid #6366f1;
}

.status-delivered {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid #10b981;
}

.status-cancelled {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border: 1px solid #ef4444;
}

.commune-cell {
  text-align: center;
}

.commune-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.commune-badge.commune-filled {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border: 1px solid #3b82f6;
}

.commune-badge.commune-empty {
  background: var(--gray-100);
  color: var(--gray-500);
  border: 1px solid var(--gray-300);
  font-style: italic;
}

.amount-cell {
  text-align: right;
  font-weight: 600;
  color: var(--gray-800);
}

.amount {
  font-size: 15px;
}

.date-cell {
  min-width: 120px;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date {
  font-weight: 500;
  color: var(--gray-800);
}

.time {
  font-size: 11px;
  color: var(--gray-500);
}

.company-cell {
  min-width: 150px;
}

.company-info {
  display: flex;
  flex-direction: column;
}

.company-name {
  font-weight: 500;
  color: var(--gray-700);
  font-size: 13px;
}

.driver-cell {
  text-align: center;
}

.driver-assigned {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #10b981;
}

.driver-unassigned {
  color: var(--gray-500);
  font-style: italic;
  font-size: 12px;
}

/* Actions Menu */
.actions-cell {
  position: relative;
}

.actions-menu {
  display: flex;
  gap: 4px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: var(--transition);
}

.action-view {
  background: var(--primary-color);
  color: white;
}

.action-view:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.action-more {
  background: var(--gray-100);
  color: var(--gray-600);
  padding: 6px 8px;
}

.action-more:hover {
  background: var(--gray-200);
}

.actions-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 180px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: var(--transition);
}

.actions-dropdown:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--gray-700);
  transition: var(--transition);
  text-align: left;
}

.dropdown-item:hover {
  background: var(--gray-50);
}

.dropdown-item.debug-item {
  color: var(--warning-color);
}

.dropdown-item.danger-item {
  color: var(--danger-color);
}

.dropdown-item.danger-item:hover {
  background: #fef2f2;
}

.dropdown-divider {
  height: 1px;
  background: var(--gray-200);
  margin: 4px 0;
}

.item-icon {
  font-size: 14px;
}

/* Cards View */
.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 24px;
}

.order-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--border-radius-lg);
  padding: 20px;
  transition: var(--transition);
  cursor: pointer;
}

.order-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.selected-card {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.highlighted-card {
  border-color: var(--warning-color);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  animation: card-highlight 3s ease-out;
}

@keyframes card-highlight {
  0% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-color);
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-action-btn {
  padding: 6px;
  border: none;
  background: var(--gray-100);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
}

.card-action-btn:hover {
  background: var(--gray-200);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-label {
  font-weight: 500;
  color: var(--gray-600);
  font-size: 13px;
}

.field-value {
  color: var(--gray-800);
  font-weight: 500;
}

.field-value.amount {
  color: var(--primary-color);
  font-weight: 600;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: var(--gray-600);
  font-size: 20px;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: var(--gray-500);
  font-size: 14px;
}

/* Pagination */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
}

.pagination-info {
  color: var(--gray-600);
  font-size: 14px;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid var(--gray-300);
  background: white;
  color: var(--gray-700);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
}

.page-btn:hover:not(:disabled) {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gray-300);
  background: white;
  color: var(--gray-700);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
}

.page-number:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

.page-number.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Modal Styles */
.create-order-form {
  max-height: 70vh;
  overflow-y: auto;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  padding: 20px;
  border: 1px solid var(--gray-200);
  border-radius: var(--border-radius);
  background: var(--gray-50);
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: var(--gray-800);
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-weight: 500;
  color: var(--gray-700);
  font-size: 13px;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 12px;
  border: 1px solid var(--gray-300);
  border-radius: var(--border-radius);
  font-size: 14px;
  transition: var(--transition);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 0 0 0;
  border-top: 1px solid var(--gray-200);
  margin-top: 24px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid var(--gray-300);
  background: white;
  color: var(--gray-700);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 500;
  transition: var(--transition);
}

.btn-cancel:hover {
  background: var(--gray-50);
}

.btn-save {
  padding: 10px 20px;
  border: none;
  background: var(--primary-color);
  color: white;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 500;
  transition: var(--transition);
}

.btn-save:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .admin-orders-container {
    padding: 16px;
  }
  
  .filters-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  
  .filter-search {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .bulk-actions-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .table-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .pagination-section {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .data-table {
    font-size: 12px;
  }
  
  .data-table th,
  .data-table td {
    padding: 8px;
  }
  
  .cards-container {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* Print Styles */
@media print {
  .admin-orders-container {
    background: white;
    padding: 0;
  }
  
  .page-header,
  .filters-section,
  .bulk-actions-section,
  .pagination-section {
    display: none;
  }
  
  .content-section {
    box-shadow: none;
    border: none;
  }
  
  .actions-column,
  .checkbox-column {
    display: none;
  }
}
/* Estilos base existentes */
.page-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; }
.header-actions { display: flex; gap: 12px; }
.btn-action { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; transition: background-color 0.2s ease; }
.btn-primary { background-color: #10b981; color: white; }
.btn-primary:hover:not(:disabled) { background-color: #059669; }
.btn-primary:disabled { background-color: #6ee7b7; cursor: not-allowed; }
.btn-secondary { background-color: #4f46e5; color: white; }
.btn-secondary:hover { background-color: #4338ca; }
.filters-section { background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e5e7eb; }
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.filters select, .filters input { padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.search-input { grid-column: span 2; }

/* Estilos para filtro de comuna */
.commune-filter {
  background-color: #f0f9ff;
  border-color: #0ea5e9;
}

.commune-cell {
  text-align: center;
}

.commune-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.commune-badge.commune-filled {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.commune-badge.commune-important {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
  font-weight: 600;
}

.commune-badge.commune-empty {
  background-color: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  font-style: italic;
}

/* NUEVO: Estilos para selección masiva */
.bulk-actions-section {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.bulk-actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.selection-count {
  font-weight: 600;
  font-size: 16px;
}

.bulk-actions {
  display: flex;
  gap: 12px;
}

.btn-bulk-assign {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-bulk-assign:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-clear-selection {
  background-color: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-selection:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.content-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: 12px; color: #374151; }

/* NUEVO: Estilos para checkboxes y selección */
.checkbox-column {
  width: 50px;
  text-align: center;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #6366f1;
}

.selected-row {
  background-color: #f0f9ff;
  border-left: 4px solid #6366f1;
}

.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid #e5e7eb; }
.page-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.page-btn:disabled { background: #d1d5db; cursor: not-allowed; }
.loading-row, .empty-row { text-align: center; padding: 40px; color: #6b7280; font-style: italic; }
.order-form, .bulk-upload-content { max-height: 70vh; overflow-y: auto; padding: 10px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; margin-bottom: 16px; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group.section-header { background-color: #eef2ff; border-color: #c7d2fe; padding: 8px 12px; border-radius: 6px; margin-top: 10px; margin-bottom: 20px; grid-column: 1 / -1; }
.section-header h4 { margin: 0; color: #4338ca; font-size: 14px; font-weight: 600; }
.form-group label { margin-bottom: 8px; font-weight: 500; color: #374151; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
.btn-cancel { background-color: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 6px; }
.btn-save { background-color: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; }
.btn-save:disabled { background-color: #9ca3af; cursor: not-allowed; }
.bulk-upload-content p { color: #6b7280; margin-bottom: 16px; }
.file-upload-label { font-weight: 500; }
.file-name { margin-top: 8px; font-style: italic; color: #6b7280; }
.upload-feedback { margin-top: 16px; padding: 10px; border-radius: 6px; text-align: center; font-weight: 500; }
.upload-feedback.success { background-color: #d1fae5; color: #065f46; }
.upload-feedback.error { background-color: #fee2e2; color: #991b1b; }
.upload-feedback.processing { background-color: #dbeafe; color: #1e40af; }
.date-cell { font-size: 12px; white-space: nowrap; }
.date-label { font-weight: 500; color: #6b7280; }
.date-creation { margin-bottom: 4px; }
.action-buttons { display: flex; gap: 8px; }
.btn-table-action { font-size: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: white; cursor: pointer; transition: all 0.2s ease; }
.btn-table-action.view { color: #3b82f6; border-color: #bfdbfe; }
.btn-table-action.view:hover { background-color: #3b82f6; color: white; }
.btn-table-action.edit { color: #8b5cf6; border-color: #ddd6fe; }
.btn-table-action.edit:hover { background-color: #8b5cf6; color: white; }
.btn-table-action.assign { color: #16a34a; border-color: #86efac; }
.btn-table-action.assign:hover:not(:disabled) { background-color: #16a34a; color: white; }
.btn-table-action.debug { color: #8b5cf6; border-color: #ddd6fe; }
.btn-table-action.debug:hover { background-color: #8b5cf6; color: white; }
.btn-table-action:disabled { background-color: #e5e7eb; color: #9ca3af; cursor: not-allowed; border-color: #d1d5db; }
.loading-state { text-align: center; padding: 20px; color: #6b7280; }
.debug-section { margin-bottom: 16px; padding: 12px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef; }
.btn-debug { background-color: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.btn-debug:hover { background-color: #7c3aed; }
.driver-info { margin-top: 12px; padding: 8px; background-color: #f1f5f9; border-radius: 4px; font-size: 11px; }
.driver-info pre { margin: 0; white-space: pre-wrap; word-break: break-all; }

/* NUEVO: Estilos para modal de asignación masiva */
.bulk-assign-content {
  max-height: 80vh;
  overflow-y: auto;
}

.selection-summary {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.selection-summary h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 16px;
}

.selected-orders-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background-color: white;
}

.selected-order-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #475569;
}

.selected-order-item:last-child {
  border-bottom: none;
}

.driver-selection {
  margin-bottom: 24px;
}

.bulk-driver-info {
  margin-top: 12px;
  padding: 12px;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  color: #065f46;
  font-weight: 500;
}

.bulk-progress {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.bulk-progress h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  transition: width 0.3s ease;
}

.results-preview {
  margin-top: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 14px;
  color: #475569;
}

.success-icon {
  color: #059669;
}

.error-icon {
  color: #dc2626;
}

.bulk-results {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.bulk-results h4 {
  margin: 0 0 16px 0;
  color: #1e293b;
}

.results-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.result-stat {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 6px;
}

.result-stat.success {
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.result-stat.error {
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.result-stat.success .stat-number {
  color: #059669;
}

.result-stat.error .stat-number {
  color: #dc2626;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.error-details {
  margin-top: 16px;
}

.error-details h5 {
  margin: 0 0 8px 0;
  color: #dc2626;
  font-size: 14px;
}

.error-item {
  padding: 8px 12px;
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #991b1b;
}

.error-item:last-child {
  margin-bottom: 0;
}
</style>