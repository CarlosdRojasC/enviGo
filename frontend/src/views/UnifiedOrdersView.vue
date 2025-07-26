<template>
  <div class="unified-orders-view">
    <!-- ==================== HEADER DINÁMICO ==================== -->
    <AdminOrdersHeader 
      v-if="isAdmin"
      :is-exporting="isExporting"
      :stats="orderStats"
      :additional-stats="finalAdditionalStats"
      @export="exportOrders"
      @create-order="openCreateOrderModal"
      @bulk-upload="openBulkUploadModal"
      @quick-action="handleQuickAction"
    />
    
    <OrdersHeader 
      v-else
      title="Mis Pedidos"
      :stats="orderStats"
      :additional-stats="finalAdditionalStats"
      :loading="loadingOrders || refreshing"
      :exporting="loadingStates?.exporting || false"
      :last-update="lastUpdate"
      :auto-refresh="autoRefreshEnabled"
      @refresh="handleRefresh"
      @export="handleExport"
      @create-order="handleCreateOrder"
      @toggle-auto-refresh="toggleAutoRefresh"
    />

    <!-- ==================== FILTROS UNIFICADOS ==================== -->
    <UnifiedOrdersFilters
      :filters="filters"
      :advanced-filters="advancedFilters"
      :filters-u-i="filtersUI"
      :companies="isAdmin ? companies : []"
      :channels="channels"
      :available-communes="availableCommunes"
      :filter-presets="filterPresets"
      :active-filters-count="activeFiltersCount"
      :is-admin="isAdmin"
      :company-id="companyId" 
      :loading="loadingOrders"
      @filter-change="handleFilterChange"
      @advanced-filter-change="updateAdvancedFilter"
      @reset-filters="resetFilters"
      @toggle-advanced="toggleAdvancedFilters"
      @apply-preset="applyPreset"
      @add-commune="addCommune"
      @remove-commune="removeCommune"
    />

    <!-- ==================== ACCIONES MASIVAS (Solo Admin) ==================== -->
    <AdminOrdersBulkActions
      v-if="isAdmin && selectedOrders.length > 0"
      :selected-count="selectedOrders.length"
      :selected-orders="selectedOrderObjects"
      :selection-summary="selectionSummary"
      :companies="companies"
      @bulk-assign="handleOpenBulkAssignModal"
      @bulk-status-change="handleBulkStatusChange"
      @bulk-export="handleBulkExport"
      @bulk-print="handleBulkPrint"
      @clear-selection="clearSelection"
    />

    <!-- ==================== TABLA UNIFICADA ==================== -->
    <AdminOrdersTable
      v-if="isAdmin"
      :orders="orders"
      :companies="companies"
      :loading="loadingOrders"
      :pagination="pagination"
      :selected-orders="selectedOrders"
      :select-all-checked="selectAllChecked"
      :select-all-indeterminate="selectAllIndeterminate"
      @toggle-order-selection="toggleOrderSelection"
      @toggle-select-all="toggleSelectAll"
      @clear-selection="clearSelection"
      @view-details="openOrderDetailsModal"
      @update-status="openUpdateStatusModal"
      @assign-driver="handleAssignDriver"
      @track-order="handleTrackOrder"
      @view-proof="handleViewProof"
      @warehouse-received="handleWarehouseReceived"
      @mark-assigned="handleMarkAssigned"
      @go-to-page="goToPage"
      @change-page-size="changePageSize"
    />

    <OrdersTable
      v-else
      :orders="orders"
      :selected-orders="selectedOrders"
      :select-all-checked="selectAllChecked"
      :select-all-indeterminate="selectAllIndeterminate"
      :loading="loadingOrders"
      :pagination="pagination"
      @toggle-selection="toggleOrderSelection"
      @toggle-select-all="toggleSelectAll"
      @clear-selection="clearSelection"
      @view-details="openOrderDetailsModal"
      @mark-ready="markAsReady"
      @track-live="openLiveTracking"
      @view-tracking="openTrackingModal"
      @view-proof="showProofOfDelivery"
      @handle-action="handleActionButton"
      @contact-support="contactSupport"
      @bulk-mark-ready="handleBulkMarkReady"
      @generate-manifest="generateManifest"
    />

    <!-- ==================== PAGINACIÓN ==================== -->
    <div v-if="pagination.total > 0" class="pagination-container">
      <div class="pagination-info">
        Mostrando {{ pagination.from }}-{{ pagination.to }} de {{ pagination.total }} pedidos
      </div>
      <div class="pagination-controls">
        <button 
          @click="goToPage(pagination.current_page - 1)" 
          :disabled="pagination.current_page <= 1"
          class="pagination-btn"
        >
          ← Anterior
        </button>
        <span class="page-info">
          Página {{ pagination.current_page }} de {{ pagination.last_page }}
        </span>
        <button 
          @click="goToPage(pagination.current_page + 1)" 
          :disabled="pagination.current_page >= pagination.last_page"
          class="pagination-btn"
        >
          Siguiente →
        </button>
      </div>
    </div>
    <!-- ==================== MODALES ADMIN ==================== -->
   <template v-if="isAdmin">
      <!-- ✅ USAR EL COMPONENTE UNIFICADO QUE YA EXISTE - CORREGIDO -->
      <AdminOrdersModals
        :show-details="showOrderDetailsModal"
        :show-update-status="showUpdateStatusModal"
        :show-create="showCreateOrderModal"
        :show-bulk-upload="showBulkUploadModal"
        :show-assign="showAssignModal"
        :show-bulk-assign="showBulkAssignModal"
        :selected-order="selectedOrder"
        :companies="companies"
        :new-order="newOrder"
        :is-creating="isCreatingOrder"
        :bulk-upload-company-id="bulkUpload?.bulkUploadCompanyId || ''"
        :selected-file="bulkUpload?.selectedFile || null"
        :upload-feedback="bulkUpload?.uploadFeedback || ''"
        :upload-status="bulkUpload?.uploadStatus || ''"
        :is-uploading="bulkUpload?.isUploading || false"
        :available-drivers="driverAssignment?.availableDrivers || []"
        :loading-drivers="driverAssignment?.loadingDrivers || false"
        :selected-driver-id="driverAssignment?.selectedDriverId || ''"
        :is-assigning="driverAssignment?.isAssigning || false"
        :selected-orders="selectedOrderObjects"
        :bulk-selected-driver-id="driverAssignment?.bulkSelectedDriverId || ''"
        :is-bulk-assigning="driverAssignment?.isBulkAssigning || false"
        :bulk-assignment-completed="driverAssignment?.bulkAssignmentCompleted || 0"
        :bulk-assignment-results="driverAssignment?.bulkAssignmentResults || []"
        :bulk-assignment-finished="driverAssignment?.bulkAssignmentFinished || false"
        :bulk-progress-percentage="driverAssignment?.bulkProgressPercentage || 0"
        @close-details="showOrderDetailsModal = false"
        @close-update-status="showUpdateStatusModal = false"
        @status-updated="handleStatusUpdateSuccess"
        @close-create="showCreateOrderModal = false"
        @create-order="handleCreateOrder"
        @close-bulk-upload="showBulkUploadModal = false"
        @file-selected="handleFileSelect"
        @bulk-upload="handleBulkUpload"
        @download-template="downloadTemplate"
        @close-assign="showAssignModal = false"
        @confirm-assignment="confirmAssignment"
        @close-bulk-assign="closeBulkAssignModal"
        @confirm-bulk-assignment="confirmBulkAssignment"
        @update:bulk-upload-company-id="updateBulkUploadCompanyId"
        @update:selected-driver-id="updateSelectedDriverId"
        @update:bulk-selected-driver-id="updateBulkSelectedDriverId"
      />
    </template>

    <!-- ==================== MODALES CLIENTE ==================== -->
    <template v-else>
      <!-- Modal de tracking en tiempo real -->
      <Modal 
  v-model="showTrackingModal"
  title="🚚 Tracking - Pedido"
  width="700px"
>
  <OrderTracking 
    :order="selectedTrackingOrder" 
    ref="orderTrackingRef"
    @close="showTrackingModal = false"
    @support="handleTrackingSupport"
    @show-proof="handleShowProof"
  />
</Modal>

      <!-- Modal de prueba de entrega -->
                <Modal 
            v-model="showProofModal"
            :title="`📋 Prueba de Entrega - #${selectedProofOrder?.order_number || ''}`"
            width="700px"
            >
            <div v-if="loadingOrderDetails" class="loading-container">
                <div class="loading-spinner"></div>
                <p>Cargando prueba de entrega...</p>
            </div>
            <ProofOfDelivery 
                v-else-if="selectedProofOrder"
                :order="selectedProofOrder"
            />
            <div v-else>
                <p>Error: No se pudo cargar la información</p>
            </div>
            </Modal>

      <!-- Modal de soporte -->
      <Modal 
  v-model="showSupportModal"
  title="💬 Contactar Soporte"
  width="500px"
>
  <div v-if="supportOrder" class="support-modal">
    <h3>Contactar Soporte</h3>
    <p><strong>Pedido:</strong> {{ supportOrder?.order_number }}</p>
    <p><strong>Cliente:</strong> {{ supportOrder?.customer_name }}</p>
    <p><strong>Estado:</strong> {{ getStatusName(supportOrder?.status) }}</p>
    
    <div class="support-options">
      <button @click="emailSupport(supportOrder)" class="support-option">
        📧 Enviar Email
      </button>
      <button @click="whatsappSupport(supportOrder)" class="support-option">
        💬 WhatsApp
      </button>
      <button @click="callSupport(supportOrder)" class="support-option">
        📞 Llamar
      </button>
    </div>
  </div>
</Modal>
    </template>

    <!-- ==================== MODAL COMPARTIDO ==================== -->
    <!-- Modal de detalles (ambos roles) -->
    <Modal v-model="showOrderDetailsModal" @close="showOrderDetailsModal = false">
      <OrderDetails 
        :order="selectedOrder" 
        :is-admin="isAdmin"
        :loading="loadingOrderDetails"
        @update="handleOrderUpdate" 
      />
    </Modal>

    <!-- Notificaciones Toast (si no están globales) -->
    <Teleport to="body" v-if="showNotification && isAdmin">
      <div class="notification-overlay">
        <!-- Notificaciones personalizadas para admin -->
      </div>
    </Teleport>
  </div>
</template>
<script setup>
// ==================== IMPORTS ====================
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useToast } from 'vue-toastification'

// ==================== SERVICIOS ====================
import { apiService } from '../services/api'
import { emitter } from '../services/eventBus.service'
import { logger } from '../services/logger.service'

// ==================== COMPONENTES COMUNES ====================
import Modal from '../components/Modal.vue'
import OrderDetails from '../components/OrderDetails.vue'
import OrderTracking from '../components/OrderTracking.vue'
import ProofOfDelivery from '../components/ProofOfDelivery.vue'

// ✅ COMPONENTE DE ADMIN (YA EXISTE)
import AdminOrdersHeader from '../components/AdminOrders/AdminOrdersHeader.vue'
import AdminOrdersTable from '../components/AdminOrders/AdminOrdersTable.vue'
import AdminOrdersBulkActions from '../components/AdminOrders/AdminOrdersBulkActions.vue'

// ✅ COMPONENTE UNIFICADO DE MODALES (YA EXISTE)
import AdminOrdersModals from '../components/AdminOrders/AdminOrdersModals.vue'

// ✅ COMPONENTE ESPECÍFICO QUE SÍ EXISTE
import UpdateOrderStatus from '../components/UpdateOrderStatus.vue'

// ==================== COMPONENTES DE CLIENTE ====================
import OrdersHeader from '../components/Orders/OrdersHeader.vue'
import OrdersTable from '../components/Orders/OrdersTable.vue'

// ==================== COMPONENTE UNIFICADO ====================
import UnifiedOrdersFilters from '../components/UnifiedOrdersFilters.vue'

// ==================== COMPOSABLES COMUNES ====================
import { useOrdersData } from '../composables/useOrdersData'
import { useOrdersFilters } from '../composables/useOrdersFilters'
import { useOrdersSelection } from '../composables/useOrdersSelection'
import { useOrdersModals } from '../composables/useOrdersModals'

// ==================== COMPOSABLES ESPECÍFICOS DE ADMIN ====================
import { useDriverAssignment } from '../composables/useDriverAssignment'
import { useBulkUpload } from '../composables/useBulkUpload'
import { useOrdersActions } from '../composables/useOrdersActions'

// ==================== SETUP BÁSICO ====================
const router = useRouter()
const route = useRoute()
const toast = useToast()
const auth = useAuthStore()

// ==================== COMPUTED PROPERTIES PRINCIPALES ====================
const isAdmin = computed(() => auth.isAdmin)
const user = computed(() => auth.user)

// ==================== COMPOSABLES INITIALIZATION ====================

// ✅ DATOS PRINCIPALES (COMÚN)
const {
  orders,
  companies,
  channels,
  pagination,
  loadingOrders,
  refreshing,
  additionalStats,
  loadingStates,
  companyId,
  fetchOrders,
  fetchChannels,
  fetchCompanies,
  goToPage,
  changePageSize,
  getOrdersStats,
  refreshOrders,
  updateOrderLocally,
  getCompanyName,
  markAsWarehouseReceived,
  markAsAssigned,
  markOrderAsReady,
  markMultipleAsReady,
  exportOrders,
  startAutoRefresh,
  stopAutoRefresh
} = useOrdersData()

// ✅ FILTROS (COMÚN)
const {
  filters,
  advancedFilters,
  filtersUI,
  filterPresets,
  availableCommunes,
  activeFiltersCount,
  handleFilterChange,
  resetFilters,
  toggleAdvancedFilters,
  updateAdvancedFilter,
  applyPreset,
  addCommune,
  removeCommune,
  fetchAvailableCommunes,
  setFilter,
  exportFilters,
  hasActiveFilters,
  validateDateRange,
  applyFilters
} = useOrdersFilters(orders, fetchOrders, { mode: computed(() => isAdmin.value ? 'admin' : 'client') })

// ✅ SELECCIÓN MÚLTIPLE (COMÚN)
const {
  selectedOrders,
  selectedOrderObjects,
  selectAllChecked,
  selectAllIndeterminate,
  selectedCount,
  selectionStats,
  selectionSummary,
  toggleOrderSelection,
  toggleSelectAll,
  clearSelection,
  selectOrdersByCriteria,
  validateSelection,
  cleanupSelection
} = useOrdersSelection(orders, { mode: computed(() => isAdmin.value ? 'admin' : 'client') })

// ✅ MODALES (COMÚN)
const {
  // Admin modals
  showCreateOrderModal,
  showBulkUploadModal,
  showBulkAssignModal,
  showAssignModal,
  showUpdateStatusModal,
  
  // Client modals
  showTrackingModal,
  showProofModal,
  showSupportModal,
  
  // Shared modals
  showOrderDetailsModal,
  
  // Selected items
  selectedOrder,
  selectedTrackingOrder,
  selectedProofOrder,
  supportOrder,
  newOrder,
  isCreatingOrder,
  
  // Modal actions
  openOrderDetailsModal: openOrderDetailsModalBase,
  openCreateOrderModal,
  openBulkUploadModal,
  openUpdateStatusModal,
  openTrackingModal: openTrackingModalBase,
  openLiveTracking: openLiveTrackingBase,
  showProofOfDelivery: showProofOfDeliveryBase,
  contactSupport: contactSupportBase,
  closeAllModals,
  resetCreateOrder
} = useOrdersModals()




// ✅ COMPOSABLES ESPECÍFICOS DE ADMIN (CONDICIONAL)
let driverAssignment = null
let bulkUpload = null
let ordersActions = null
let isExporting = ref(false)

if (isAdmin.value) {
  // Asignación de conductores (solo admin)
  driverAssignment = useDriverAssignment(selectedOrderObjects, fetchOrders)
  
  // Upload masivo (solo admin)  
  bulkUpload = useBulkUpload(fetchOrders)
  
  // Acciones generales (admin)
  ordersActions = useOrdersActions(orders, newOrder, isCreatingOrder, fetchOrders)
  isExporting = ordersActions.isExporting
}
// ==================== ESTADO LOCAL ====================
const lastUpdate = ref(Date.now())
const autoRefreshEnabled = ref(false)
const orderTrackingRef = ref(null)

// ✅ ESTADO ESPECÍFICO DE ADMIN
const showNotification = ref(false)
const isInitialLoad = ref(true)
const pendingUpdates = ref(new Set())

// ✅ ESTADO ESPECÍFICO DE CLIENTE
const loadingOrderDetails = ref(false)
const realTimeEnabled = ref(true)
const lastOrderUpdate = ref(null)
const pendingOrderUpdates = ref(new Map())
const orderUpdateQueue = ref([])

// ✅ ESTADO PARA DEBUGGING
const debugMode = ref(false)

// ==================== COMPUTED PROPERTIES ====================

/**
 * ✅ ESTADÍSTICAS DE PEDIDOS
 */
const orderStats = computed(() => {
  if (isAdmin.value) {
    return getOrdersStats()
  } else {
    // Stats para cliente
    return {
      total: orders.value.length,
      pending: orders.value.filter(o => o.status === 'pending').length,
      ready: orders.value.filter(o => o.status === 'ready_for_pickup').length,
      assigned: orders.value.filter(o => o.status === 'assigned').length,
      shipped: orders.value.filter(o => o.status === 'shipped').length,
      delivered: orders.value.filter(o => o.status === 'delivered').length
    }
  }
})

/**
 * ✅ ESTADÍSTICAS ADICIONALES PARA ADMIN
 */
const adminAdditionalStats = computed(() => {
  if (!isAdmin.value) return {}
  
  const stats = orderStats.value
  const totalValue = orders.value.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  const averageValue = stats.total > 0 ? totalValue / stats.total : 0
  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0
  const shipdayOrders = orders.value.filter(order => order.shipday_order_id).length

  return {
    totalValue,
    averageValue,
    deliveryRate,
    shipdayOrders
  }
})

/**
 * ✅ ESTADÍSTICAS ADICIONALES PARA CLIENTE
 */
const clientAdditionalStats = computed(() => {
  if (isAdmin.value) return {}
  
  const totalValue = orders.value.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  const recentOrders = orders.value.filter(order => {
    const orderDate = new Date(order.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return orderDate >= weekAgo
  }).length
  
  return {
    totalValue,
    recentOrders,
    hasTracking: orders.value.filter(o => o.shipday_order_id).length,
    readyForPickup: orders.value.filter(o => o.status === 'ready_for_pickup').length
  }
})

/**
 * ✅ COMPUTED FINAL PARA ESTADÍSTICAS ADICIONALES
 */
const finalAdditionalStats = computed(() => {
  return isAdmin.value ? adminAdditionalStats.value : clientAdditionalStats.value
})

/**
 * ✅ COMUNAS FILTRADAS (ADMIN)
 */
const filteredCommunes = computed(() => {
  if (!isAdmin.value) return []
  
  const currentSelection = Array.isArray(filters.value.shipping_commune) 
    ? filters.value.shipping_commune 
    : []
  
  return availableCommunes.value.filter(commune =>
    !currentSelection.includes(commune)
  ).sort()
})


// ==================== MÉTODOS OVERRIDES PARA UNIFICAR COMPORTAMIENTO ====================

/**
 * ✅ OVERRIDE: Open Order Details Modal
 */
async function openOrderDetailsModal(order) {
  console.log('📋 Abriendo detalles para:', order.order_number)
  
  selectedOrder.value = null
  loadingOrderDetails.value = true
  showOrderDetailsModal.value = true
  
  try {
    const { data } = await apiService.orders.getById(order._id)
    selectedOrder.value = data
    console.log('✅ Detalles del pedido cargados')
  } catch (error) {
    console.error('❌ Error cargando detalles:', error)
    showOrderDetailsModal.value = false
    toast.error('Error al cargar detalles del pedido')
  } finally {
    loadingOrderDetails.value = false
  }
}

/**
 * ✅ OVERRIDE: Open Tracking Modal
 */
function openTrackingModal(order) {
  console.log('📍 Abriendo tracking para:', order.order_number)
  selectedTrackingOrder.value = order
  showTrackingModal.value = true
}

/**
 * ✅ OVERRIDE: Open Live Tracking
 */
async function openLiveTracking(order) {
  console.log('🔴 Abriendo tracking en vivo para:', order.order_number)
  
  if (!order.shipday_order_id) {
    toast.warning('Este pedido aún no tiene información de tracking disponible')
    return
  }
  
  try {
    // Obtener información fresca del tracking
    const { data } = await apiService.orders.getById(order._id)
    selectedTrackingOrder.value = data
    showTrackingModal.value = true
    
    // Si hay referencia al componente de tracking, activar modo live
    await nextTick()
    if (orderTrackingRef.value) {
      orderTrackingRef.value.enableLiveMode()
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo tracking:', error)
    toast.error('Error obteniendo información de tracking')
  }
}

/**
 * ✅ OVERRIDE: Show Proof of Delivery
 */
async function showProofOfDelivery(order) {
  console.log('📸 Cargando prueba de entrega para:', order.order_number)
  
  selectedProofOrder.value = null
  loadingOrderDetails.value = true
  showProofModal.value = true

  try {
    // Obtener datos completos y frescos del pedido
    const { data } = await apiService.orders.getById(order._id)
    selectedProofOrder.value = data
    
    console.log('✅ Prueba de entrega cargada:', data.proof_of_delivery)
    
  } catch (error) {
    console.error('❌ Error cargando prueba de entrega:', error)
    toast.error('No se pudo cargar la información de la entrega')
    showProofModal.value = false
  } finally {
    loadingOrderDetails.value = false
  }
}

/**
 * ✅ OVERRIDE: Contact Support
 */
function contactSupport(order) {
  console.log('📞 Contactando soporte para:', order.order_number)
  supportOrder.value = order
  showSupportModal.value = true
}
// ==================== MÉTODOS ESPECÍFICOS DE ADMIN ====================

/**
 * ✅ CREAR NUEVO PEDIDO (ADMIN)
 */
async function handleCreateOrder(orderData) {
  try {
    console.log('➕ Creando nuevo pedido:', orderData)
    isCreatingOrder.value = true
    
    const response = await apiService.orders.create(orderData)
    
    await refreshOrders()
    toast.success('Pedido creado exitosamente')
    resetCreateOrder()
    
    console.log('✅ Pedido creado:', response.data)
  } catch (error) {
    console.error('❌ Error creando pedido:', error)
    toast.error('Error al crear el pedido')
  } finally {
    isCreatingOrder.value = false
  }
}

/**
 * ✅ BULK UPLOAD METHODS (ADMIN)
 */
async function handleFileSelect(file) {
  if (!bulkUpload) return
  bulkUpload.handleFileSelect(file)
}

async function handleBulkUpload() {
  if (!bulkUpload) return
  
  try {
    await bulkUpload.handleBulkUpload()
    await refreshOrders()
    showBulkUploadModal.value = false
    toast.success('Archivo procesado exitosamente')
  } catch (error) {
    console.error('❌ Error en bulk upload:', error)
    toast.error('Error procesando archivo')
  }
}

async function downloadTemplate() {
  if (!bulkUpload) return
  
  try {
    await bulkUpload.downloadTemplate()
  } catch (error) {
    console.error('❌ Error descargando template:', error)
    toast.error('Error descargando plantilla')
  }
}

async function handleBulkUploadSuccess() {
  console.log('📁 Subida masiva exitosa')
  await refreshOrders()
  toast.success('Pedidos cargados exitosamente')
  showBulkUploadModal.value = false
}

/**
 * ✅ DRIVER ASSIGNMENT METHODS (ADMIN)
 */
async function handleOpenBulkAssignModal() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona pedidos para asignar')
    return
  }
  
  console.log('🚚 Abriendo asignación masiva para:', selectedOrders.value.length, 'pedidos')
  
  if (driverAssignment) {
    await driverAssignment.fetchAvailableDrivers()
    showBulkAssignModal.value = true
  }
}

async function confirmBulkAssignment() {
  if (!driverAssignment) return
  
  try {
    await driverAssignment.confirmBulkAssignment()
    await refreshOrders()
    clearSelection()
    showBulkAssignModal.value = false
    toast.success('Asignación masiva completada')
  } catch (error) {
    console.error('❌ Error en asignación masiva:', error)
    toast.error('Error en asignación masiva')
  }
}

async function confirmAssignment() {
  if (!driverAssignment) return
  
  try {
    await driverAssignment.confirmAssignment()
    await refreshOrders()
    showAssignModal.value = false
    toast.success('Conductor asignado exitosamente')
  } catch (error) {
    console.error('❌ Error en asignación:', error)
    toast.error('Error al asignar conductor')
  }
}

function closeBulkAssignModal() {
  showBulkAssignModal.value = false
  if (driverAssignment) {
    driverAssignment.resetBulkAssignment()
  }
}

async function handleBulkAssignSuccess() {
  await refreshOrders()
  clearSelection()
  showBulkAssignModal.value = false
  toast.success('Asignación masiva completada exitosamente')
}

async function handleAssignSuccess() {
  await refreshOrders()
  showAssignModal.value = false
  toast.success('Conductor asignado exitosamente')
}

/**
 * ✅ BULK ACTIONS (ADMIN)
 */
async function handleBulkStatusChange(statusData) {
  try {
    console.log('🔄 Cambiando estado masivo:', statusData)
    
    const promises = selectedOrders.value.map(orderId =>
      apiService.orders.updateStatus(orderId, statusData.status)
    )
    
    await Promise.all(promises)
    await refreshOrders()
    
    toast.success(`Estado actualizado para ${selectedOrders.value.length} pedidos`)
    clearSelection()
    
  } catch (error) {
    console.error('❌ Error en cambio de estado masivo:', error)
    toast.error('Error al cambiar estado masivo')
  }
}

async function handleBulkExport() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona pedidos para exportar')
    return
  }
  
  try {
    console.log('📤 Exportando pedidos:', selectedOrders.value.length)
    if (ordersActions) {
      await ordersActions.exportOrders({ order_ids: selectedOrders.value })
    }
  } catch (error) {
    console.error('❌ Error en exportación masiva:', error)
    toast.error('Error al exportar pedidos')
  }
}

async function handleBulkPrint() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona pedidos para imprimir')
    return
  }
  
  console.log('🖨️ Imprimiendo pedidos:', selectedOrders.value.length)
  toast.info('Función de impresión en desarrollo')
}

/**
 * ✅ INDIVIDUAL ORDER ACTIONS (ADMIN)
 */
async function handleAssignDriver(order, driverId) {
  try {
    console.log('🎯 Asignando conductor:', { order: order.order_number, driverId })
    
    await apiService.orders.assignDriver(order._id, driverId)
    await refreshOrders()
    
    toast.success(`Conductor asignado al pedido ${order.order_number}`)
    
  } catch (error) {
    console.error('❌ Error asignando conductor:', error)
    toast.error('Error al asignar conductor')
  }
}

async function handleTrackOrder(order) {
  console.log('📍 Admin viendo tracking de:', order.order_number)
  selectedTrackingOrder.value = order
  showTrackingModal.value = true
}

async function handleViewProof(order) {
  console.log('📸 Admin viendo prueba de:', order.order_number)
  await showProofOfDelivery(order)
}

async function handleWarehouseReceived(order) {
  try {
    console.log('📦 Marcando como recibido en bodega:', order.order_number)
    await markAsWarehouseReceived(order._id)
    
    // Actualizar localmente
    const updatedOrder = { ...order, status: 'warehouse_received' }
    updateOrderLocally(updatedOrder)
    
    toast.success('Pedido marcado como recibido en bodega')
  } catch (error) {
    console.error('❌ Error marcando como recibido:', error)
    toast.error('Error al marcar como recibido en bodega')
  }
}

async function handleMarkAssigned(order) {
  try {
    console.log('🚚 Marcando como asignado:', order.order_number)
    await markAsAssigned(order._id)
    
    // Actualizar localmente
    const updatedOrder = { ...order, status: 'assigned' }
    updateOrderLocally(updatedOrder)
    
    toast.success('Pedido marcado como asignado')
  } catch (error) {
    console.error('❌ Error marcando como asignado:', error)
    toast.error('Error al marcar como asignado')
  }
}

async function handleStatusUpdateSuccess(updatedOrder) {
  updateOrderLocally(updatedOrder)
  showUpdateStatusModal.value = false
  toast.success('Estado actualizado exitosamente')
}

/**
 * ✅ QUICK ACTIONS (ADMIN)
 */
async function handleQuickAction(action) {
  console.log('⚡ Acción rápida:', action)
  
  switch (action) {
    case 'refresh':
      await refreshOrders()
      break
    case 'export_all':
      if (ordersActions) {
        await ordersActions.exportOrders()
      }
      break
    case 'clear_filters':
      resetFilters()
      break
    default:
      console.warn('⚠️ Acción rápida no reconocida:', action)
  }
}

// ==================== MÉTODOS ESPECÍFICOS DE CLIENTE ====================

/**
 * ✅ REFRESH Y AUTO-REFRESH (CLIENTE)
 */
async function handleRefresh() {
  console.log('🔄 Cliente refrescando datos')
  lastUpdate.value = Date.now()
  await refreshOrders()
  toast.success('Datos actualizados')
}

async function handleExport() {
  try {
    console.log('📤 Cliente exportando pedidos')
    await exportOrders()
  } catch (error) {
    console.error('❌ Error en exportación de cliente:', error)
    toast.error('Error al exportar pedidos')
  }
}

async function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  
  if (autoRefreshEnabled.value) {
    console.log('⏰ Activando auto-refresh')
    startAutoRefresh()
    toast.info('Auto-actualización activada')
  } else {
    console.log('⏸️ Desactivando auto-refresh')
    stopAutoRefresh()
    toast.info('Auto-actualización desactivada')
  }
}

/**
 * ✅ ORDER ACTIONS (CLIENTE)
 */
async function markAsReady(orderId) {
  try {
    console.log('📦 Marcando como listo:', orderId)
    await markOrderAsReady(orderId)
    
    // Actualizar el pedido localmente
    const order = orders.value.find(o => o._id === orderId)
    if (order) {
      order.status = 'ready_for_pickup'
      updateOrderLocally(order)
    }
    
    toast.success('Pedido marcado como listo para recoger')
    
  } catch (error) {
    console.error('❌ Error marcando como listo:', error)
    toast.error('Error al marcar pedido como listo')
  }
}

async function handleActionButton(action, order) {
  console.log('🎬 Acción de cliente:', { action, order: order.order_number })
  
  switch (action) {
    case 'mark_ready':
      await markAsReady(order._id)
      break
    case 'view_tracking':
      openTrackingModal(order)
      break
    case 'view_proof':
      await showProofOfDelivery(order)
      break
    case 'contact_support':
      contactSupport(order)
      break
    default:
      console.warn('⚠️ Acción no reconocida:', action)
  }
}

async function handleBulkMarkReady() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona pedidos para marcar como listos')
    return
  }
  
  try {
    console.log('📦 Marcando múltiples como listos:', selectedOrders.value.length)
    await markMultipleAsReady(selectedOrders.value)
    
    toast.success(`${selectedOrders.value.length} pedidos marcados como listos`)
    clearSelection()
    
  } catch (error) {
    console.error('❌ Error marcando múltiples como listos:', error)
    toast.error('Error al marcar pedidos como listos')
  }
}

/**
 * ✅ MANIFEST GENERATION (CLIENTE)
 */
async function generateManifest() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona pedidos para generar manifiesto')
    return
  }
  
  try {
    console.log('📋 Generando manifiesto para:', selectedOrders.value.length, 'pedidos')
    
    const response = await apiService.orders.generateManifest({
      orderIds: selectedOrders.value
    })
    
    // Verificar el tipo de respuesta
    let blob
    if (response.data instanceof Blob) {
      blob = response.data
    } else {
      blob = new Blob([response.data], { type: 'application/pdf' })
    }
    
    // Descargar archivo
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `manifiesto_${new Date().toISOString().split('T')[0]}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    toast.success('Manifiesto generado y descargado exitosamente')
    clearSelection()
    
  } catch (error) {
    console.error('❌ Error generando manifiesto:', error)
    
    if (error.response?.status === 404) {
      toast.error('No se encontraron pedidos para el manifiesto')
    } else {
      toast.error('Error al generar manifiesto')
    }
  }
}

/**
 * ✅ TRACKING INTEGRATION (CLIENTE)
 */
function handleTrackingSupport(supportData) {
  console.log('📞 Soporte desde tracking:', supportData)
  
  showTrackingModal.value = false
  supportOrder.value = {
    _id: supportData.orderId,
    order_number: supportData.orderNumber,
    customer_name: supportData.customerName,
    status: selectedTrackingOrder.value?.status || 'unknown'
  }
  showSupportModal.value = true
}

function handleShowProof(proofData) {
  console.log('📸 Mostrando prueba desde tracking:', proofData)
  
  showTrackingModal.value = false
  selectedProofOrder.value = proofData.order
  showProofModal.value = true
}
// ==================== MÉTODOS DE SOPORTE (CLIENTE) ====================

/**
 * ✅ ENVIAR EMAIL DE SOPORTE
 */
async function emailSupport(order) {
  try {
    console.log('📧 Enviando email de soporte para:', order.order_number)
    
    const subject = `Soporte para pedido ${order.order_number}`
    const body = `Hola,\n\nNecesito ayuda con mi pedido ${order.order_number}.\n\nDetalles del pedido:\n- Estado: ${getStatusName(order.status)}\n- Cliente: ${order.customer_name}\n- Dirección: ${order.shipping_address}\n- Comuna: ${order.shipping_commune}\n\nGracias.`
    
    const mailtoLink = `mailto:soporte@envigo.cl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink, '_blank')
    
    showSupportModal.value = false
    toast.success('Cliente de email abierto')
    
  } catch (error) {
    console.error('❌ Error abriendo email:', error)
    toast.error('Error al abrir cliente de email')
  }
}

/**
 * ✅ CONTACTAR POR WHATSAPP
 */
async function whatsappSupport(order) {
  try {
    console.log('💬 Contactando WhatsApp para:', order.order_number)
    
    const message = `Hola, necesito ayuda con mi pedido ${order.order_number}. Estado actual: ${getStatusName(order.status)}. Dirección: ${order.shipping_address}, ${order.shipping_commune}.`
    const phoneNumber = '56912345678' // Número de soporte de EnviGo
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    showSupportModal.value = false
    toast.success('WhatsApp abierto')
    
  } catch (error) {
    console.error('❌ Error abriendo WhatsApp:', error)
    toast.error('Error al abrir WhatsApp')
  }
}

/**
 * ✅ LLAMAR A SOPORTE
 */
async function callSupport(order) {
  try {
    console.log('📞 Iniciando llamada para:', order.order_number)
    
    const phoneNumber = '+56912345678' // Número de soporte
    const telLink = `tel:${phoneNumber}`
    
    // En dispositivos móviles, esto iniciará la llamada
    window.open(telLink, '_self')
    
    showSupportModal.value = false
    toast.success('Iniciando llamada a soporte')
    
  } catch (error) {
    console.error('❌ Error iniciando llamada:', error)
    toast.error('Error al iniciar llamada')
  }
}

// ==================== REAL-TIME UPDATES (CLIENTE) ====================

/**
 * ✅ CONFIGURAR ACTUALIZACIONES EN TIEMPO REAL
 */
function setupRealTimeUpdates() {
  if (!realTimeEnabled.value) return
  
  console.log('⚡ Configurando actualizaciones en tiempo real')
  
  // Escuchar eventos de WebSocket
  if (window.ws) {
    window.ws.addEventListener('message', handleWebSocketMessage)
  }
  
  // Auto-refresh cada 30 segundos
  setInterval(() => {
    if (realTimeEnabled.value && !document.hidden) {
      console.log('🔄 Auto-refresh de cliente')
      refreshOrders()
      lastUpdate.value = Date.now()
    }
  }, 30000)
}

/**
 * ✅ MANEJAR MENSAJES WEBSOCKET
 */
function handleWebSocketMessage(event) {
  try {
    const data = JSON.parse(event.data)
    
    if (data.type === 'order_update' && data.order) {
      console.log('📡 Actualización de pedido recibida:', data.order.order_number)
      
      // Actualizar pedido en la lista
      updateOrderLocally(data.order)
      
      // Mostrar notificación si es relevante
      if (data.order.company_id === companyId.value) {
        showOrderUpdateNotification(data.order)
      }
    }
    
  } catch (error) {
    console.error('❌ Error procesando mensaje WebSocket:', error)
  }
}

/**
 * ✅ MOSTRAR NOTIFICACIÓN DE ACTUALIZACIÓN
 */
function showOrderUpdateNotification(order) {
  const statusMessages = {
    assigned: '🚚 Conductor asignado',
    shipped: '📦 En ruta de entrega',
    delivered: '✅ Entregado',
    cancelled: '❌ Cancelado'
  }
  
  const message = statusMessages[order.status] || '🔄 Estado actualizado'
  toast.info(`${message}: ${order.order_number}`)
}

/**
 * ✅ LIMPIAR ACTUALIZACIONES EN TIEMPO REAL
 */
function cleanupRealTimeUpdates() {
  if (window.ws) {
    window.ws.removeEventListener('message', handleWebSocketMessage)
  }
  realTimeEnabled.value = false
}

// ==================== MÉTODOS COMPARTIDOS ====================

/**
 * ✅ MANEJAR ACTUALIZACIÓN DE PEDIDO
 */
async function handleOrderUpdate(updatedOrder) {
  console.log('🔄 Actualizando pedido:', updatedOrder.order_number)
  updateOrderLocally(updatedOrder)
  showOrderDetailsModal.value = false
  toast.success('Pedido actualizado')
}

// ==================== UTILITY METHODS ====================

/**
 * ✅ OBTENER NOMBRE DE ESTADO
 */
function getStatusName(status) {
  const statusNames = {
    pending: 'Pendiente',
    processing: 'Procesando',
    ready_for_pickup: 'Listo para recoger',
    warehouse_received: 'En bodega',
    assigned: 'Asignado',
    shipped: 'En tránsito',
    out_for_delivery: 'En ruta de entrega',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  }
  return statusNames[status] || status
}

/**
 * ✅ FORMATEAR FECHA DE PEDIDO
 */
function formatOrderDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * ✅ FORMATEAR MONEDA
 */
function formatOrderCurrency(amount) {
  if (!amount) return '$0'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(amount)
}

/**
 * ✅ KEYBOARD SHORTCUTS (ADMIN)
 */
function handleKeyboardShortcuts(event) {
  if (!isAdmin.value) return
  
  // Ctrl/Cmd + A = Seleccionar todos
  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    event.preventDefault()
    if (selectedOrders.value.length === 0) {
      toggleSelectAll()
    } else {
      clearSelection()
    }
  }
  
  // Escape = Limpiar selección
  if (event.key === 'Escape') {
    clearSelection()
    closeAllModals()
  }
  
  // F5 = Refresh
  if (event.key === 'F5') {
    event.preventDefault()
    refreshOrders()
  }
}

/**
 * ✅ REFRESH PERIÓDICO (ADMIN)
 */
function startPeriodicRefresh() {
  console.log('⏰ Iniciando refresh periódico (5 min)')
  setInterval(() => {
    if (!document.hidden) {
      console.log('🔄 Refresh periódico activado')
      refreshOrders()
    }
  }, 5 * 60 * 1000)
}

/**
 * ✅ MANEJO DE ERRORES
 */
function handleError(error, context = 'Operación') {
  console.error(`❌ Error en ${context}:`, error)
  
  let message = `Error en ${context.toLowerCase()}`
  
  if (error.response?.data?.message) {
    message = error.response.data.message
  } else if (error.message) {
    message = error.message
  }
  
  toast.error(message)
}

// ==================== LIFECYCLE ====================

onMounted(async () => {
  console.log(`🚀 UnifiedOrdersView montada para ${isAdmin.value ? 'ADMIN' : 'CLIENTE'}`)
  
  try {
    // ✅ CARGA INICIAL COMÚN
    const commonPromises = [
      fetchOrders(),
      fetchChannels(),
      fetchAvailableCommunes()
    ]
    
    // ✅ CARGA ESPECÍFICA POR ROL
    if (isAdmin.value) {
      // Admin: cargar empresas y configurar funcionalidades admin
      commonPromises.push(fetchCompanies())
      
      // Configurar atajos de teclado para admin
      document.addEventListener('keydown', handleKeyboardShortcuts)
      
      // Iniciar refresh periódico para admin
      if (process.env.NODE_ENV === 'production') {
        startPeriodicRefresh()
      }
      
    } else {
      // Cliente: configurar tiempo real y auto-refresh
      setupRealTimeUpdates()
      
      // Configurar auto-refresh más frecuente para cliente
      if (autoRefreshEnabled.value) {
        startAutoRefresh()
      }
    }
    
    // Ejecutar cargas en paralelo
    await Promise.all(commonPromises)
    
    console.log('✅ Datos iniciales cargados exitosamente')
    
    // ✅ POST-CARGA ESPECÍFICA
    if (isAdmin.value) {
      // Marcar como no es carga inicial
      setTimeout(() => {
        isInitialLoad.value = false
      }, 1000)
      
      // Cargar drivers disponibles si hay composable
      if (driverAssignment) {
        await driverAssignment.fetchAvailableDrivers()
      }
    }
    
  } catch (error) {
    console.error('❌ Error cargando datos iniciales:', error)
    toast.error('Error al cargar los datos iniciales')
  }
})

onBeforeUnmount(() => {
  console.log('🔄 Limpiando UnifiedOrdersView...')
  
  // Cleanup común
  if (autoRefreshEnabled.value) {
    stopAutoRefresh()
  }
  
  // Cleanup específico por rol
  if (isAdmin.value) {
    // Cleanup admin
    document.removeEventListener('keydown', handleKeyboardShortcuts)
    
    // Cleanup composables de admin
    if (bulkUpload) {
      bulkUpload.resetUploadState()
    }
    
  } else {
    // Cleanup cliente
    cleanupRealTimeUpdates()
  }
  
  // Cerrar todos los modales
  closeAllModals()
})

onUnmounted(() => {
  console.log('🗑️ UnifiedOrdersView desmontada')
})

// ==================== HANDLERS PARA v-model UPDATES ====================

/**
 * ✅ UPDATE BULK UPLOAD COMPANY ID
 */
function updateBulkUploadCompanyId(value) {
  if (bulkUpload && bulkUpload.bulkUploadCompanyId) {
    bulkUpload.bulkUploadCompanyId.value = value
  }
}

/**
 * ✅ UPDATE SELECTED DRIVER ID
 */
function updateSelectedDriverId(value) {
  if (driverAssignment && driverAssignment.selectedDriverId) {
    driverAssignment.selectedDriverId.value = value
  }
}

/**
 * ✅ UPDATE BULK SELECTED DRIVER ID
 */
function updateBulkSelectedDriverId(value) {
  if (driverAssignment && driverAssignment.bulkSelectedDriverId) {
    driverAssignment.bulkSelectedDriverId.value = value
  }
}
// ==================== WATCHERS ====================

// ✅ WATCH PARA ROUTE QUERY (ADMIN)
watch(() => route.query, (newQuery) => {
  if (isAdmin.value && isInitialLoad.value && newQuery.company_id) {
    console.log('🔄 Aplicando filtro inicial desde URL:', newQuery.company_id)
    setFilter('company_id', newQuery.company_id)
  }
}, { immediate: true })

// ✅ WATCH PARA ACTUALIZAR URL (ADMIN)
watch(filters, (newFilters) => {
  if (!isAdmin.value) return
  
  const query = { ...route.query }
  
  Object.keys(newFilters).forEach(key => {
    if (newFilters[key]) {
      query[key] = newFilters[key]
    } else {
      delete query[key]
    }
  })
  
  console.log('📍 Actualizando URL con filtros')
  router.replace({ query })
}, { deep: true })

// ✅ WATCH PARA CLEANUP DE SELECCIÓN
watch(orders, () => {
  console.log('📋 Orders actualizadas, limpiando selección')
  cleanupSelection()
})

// ✅ WATCH PARA DEBUG DE COMPANIES (ADMIN)
watch(() => companies.value, (newCompanies) => {
  if (!isAdmin.value) return
  console.log('🏢 Companies actualizadas:', {
    count: newCompanies.length,
    companies: newCompanies.map(c => ({ id: c._id, name: c.name }))
  })
}, { immediate: true })

// ✅ WATCH PARA DEBUG DE CHANNELS
watch(() => channels.value, (newChannels) => {
  console.log('🏪 Channels actualizadas:', {
    count: newChannels.length,
    channels: newChannels.map(c => ({ 
      id: c._id, 
      name: c.channel_name, 
      type: c.channel_type,
      company: c.company_name || c.company_id 
    }))
  })
}, { immediate: true })

// ✅ WATCH PARA DEBUG DE COMMUNES
watch(() => availableCommunes.value, (newCommunes) => {
  console.log('🏘️ Available communes actualizadas:', {
    count: newCommunes.length,
    communes: newCommunes.slice(0, 10) // Solo las primeras 10
  })
}, { immediate: true })

// ✅ WATCH PARA COMPANY CHANGES (ADMIN)
watch(() => filters.value.company_id, (newCompanyId) => {
  if (isAdmin.value && newCompanyId) {
    console.log('🏢 Company filter changed, actualizando datos dependientes')
    fetchAvailableCommunes(newCompanyId)
  }
})

// ✅ WATCH PARA REAL-TIME UPDATES (CLIENTE)
watch(() => realTimeEnabled.value, (enabled) => {
  if (!isAdmin.value) {
    if (enabled) {
      console.log('⚡ Activando actualizaciones en tiempo real')
      setupRealTimeUpdates()
    } else {
      console.log('⏸️ Desactivando actualizaciones en tiempo real')
      cleanupRealTimeUpdates()
    }
  }
})

// ✅ WATCH PARA AUTO-REFRESH CHANGES (CLIENTE)
watch(() => autoRefreshEnabled.value, (enabled) => {
  if (!isAdmin.value) {
    if (enabled) {
      console.log('⏰ Auto-refresh activado')
      startAutoRefresh()
    } else {
      console.log('⏸️ Auto-refresh desactivado')
      stopAutoRefresh()
    }
  }
})

// ✅ WATCH PARA ROLE CHANGES (SEGURIDAD)
watch(() => isAdmin.value, (newIsAdmin, oldIsAdmin) => {
  if (newIsAdmin !== oldIsAdmin) {
    console.log('🔄 Rol cambió, recargando vista:', { from: oldIsAdmin ? 'admin' : 'client', to: newIsAdmin ? 'admin' : 'client' })
    // Recargar la página para evitar problemas de estado
    window.location.reload()
  }
})

// ==================== DEBUG FUNCTIONS ====================

/**
 * ✅ DEBUG CURRENT STATE
 */
function debugCurrentState() {
  console.group('🔍 UnifiedOrdersView - Current State Debug')
  
  console.log('User:', {
    isAdmin: isAdmin.value,
    role: auth.user?.role,
    company: auth.user?.company_id
  })
  
  if (isAdmin.value) {
    console.log('Admin Data:', {
      companies: {
        loaded: companies.value.length > 0,
        count: companies.value.length,
        data: companies.value.slice(0, 3) // Primeras 3 para no saturar
      },
      driverAssignment: !!driverAssignment,
      bulkUpload: !!bulkUpload,
      ordersActions: !!ordersActions
    })
  } else {
    console.log('Client Data:', {
      realTimeEnabled: realTimeEnabled.value,
      autoRefreshEnabled: autoRefreshEnabled.value,
      lastUpdate: lastUpdate.value,
      companyId: companyId.value
    })
  }
  
  console.log('Channels:', {
    loaded: channels.value.length > 0,
    count: channels.value.length,
    data: channels.value.slice(0, 3)
  })
  
  console.log('Available Communes:', {
    loaded: availableCommunes.value.length > 0,
    count: availableCommunes.value.length,
    data: availableCommunes.value.slice(0, 5)
  })
  
  console.log('Orders:', {
    loaded: orders.value.length > 0,
    count: orders.value.length,
    selected: selectedOrders.value.length,
    stats: orderStats.value
  })
  
  console.log('Filters:', filters.value)
  
  console.log('Modals State:', {
    orderDetails: showOrderDetailsModal.value,
    tracking: showTrackingModal.value,
    proof: showProofModal.value,
    support: showSupportModal.value,
    ...(isAdmin.value && {
      createOrder: showCreateOrderModal.value,
      bulkUpload: showBulkUploadModal.value,
      bulkAssign: showBulkAssignModal.value,
      assign: showAssignModal.value,
      updateStatus: showUpdateStatusModal.value
    })
  })
  
  console.groupEnd()
}

/**
 * ✅ DEBUG COMPOSABLES STATE
 */
function debugComposables() {
  console.group('🔍 Composables Debug')
  
  if (isAdmin.value) {
    if (driverAssignment) {
      console.log('Driver Assignment:', {
        availableDrivers: driverAssignment.availableDrivers?.value?.length || 0,
        loadingDrivers: driverAssignment.loadingDrivers?.value,
        selectedDriverId: driverAssignment.selectedDriverId?.value,
        isAssigning: driverAssignment.isAssigning?.value
      })
    }
    
    if (bulkUpload) {
      console.log('Bulk Upload:', {
        selectedFile: !!bulkUpload.selectedFile?.value,
        isUploading: bulkUpload.isUploading?.value,
        uploadStatus: bulkUpload.uploadStatus?.value
      })
    }
    
    if (ordersActions) {
      console.log('Orders Actions:', {
        isExporting: ordersActions.isExporting?.value
      })
    }
  }
  
  console.groupEnd()
}

/**
 * ✅ FORCE REFRESH ALL DATA
 */
async function forceRefreshAll() {
  console.log('🔄 Forzando refresh completo...')
  
  try {
    const promises = [
      fetchOrders(),
      fetchChannels(),
      fetchAvailableCommunes()
    ]
    
    if (isAdmin.value) {
      promises.push(fetchCompanies())
    }
    
    await Promise.all(promises)
    
    console.log('✅ Refresh completo exitoso')
    toast.success('Datos actualizados completamente')
  } catch (error) {
    console.error('❌ Error en refresh completo:', error)
    toast.error('Error actualizando datos')
  }
}

/**
 * ✅ RESET COMPLETE STATE
 */
function resetCompleteState() {
  console.log('🧹 Reseteando estado completo...')
  
  // Reset filters
  resetFilters()
  
  // Clear selection
  clearSelection()
  
  // Close all modals
  closeAllModals()
  
  // Reset local state
  lastUpdate.value = Date.now()
  loadingOrderDetails.value = false
  
  if (isAdmin.value) {
    isInitialLoad.value = true
    pendingUpdates.value.clear()
  } else {
    pendingOrderUpdates.value.clear()
    orderUpdateQueue.value = []
  }
  
  console.log('✅ Estado reseteado')
  toast.success('Estado de la vista reseteado')
}

// ==================== DEVELOPMENT HELPERS ====================

// Exponer funciones de debug en development
if (process.env.NODE_ENV === 'development') {
  window.debugUnifiedOrdersView = {
    debugCurrentState,
    debugComposables,
    forceRefreshAll,
    resetCompleteState,
    
    // Acceso directo a estados importantes
    get isAdmin() { return isAdmin.value },
    get orders() { return orders.value },
    get filters() { return filters.value },
    get selectedOrders() { return selectedOrders.value },
    
    // Funciones de utilidad
    selectOrder: (orderId) => {
      if (!selectedOrders.value.includes(orderId)) {
        toggleOrderSelection(orderId)
      }
    },
    clearAll: () => {
      clearSelection()
      resetFilters()
    }
  }
  
  console.log('🛠️ Debug helpers disponibles en window.debugUnifiedOrdersView')
}

// ==================== ERROR BOUNDARIES ====================

/**
 * ✅ GLOBAL ERROR HANDLER
 */
function setupGlobalErrorHandling() {
  // Manejar errores no capturados
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection en UnifiedOrdersView:', event.reason)
    handleError(event.reason, 'Operación asíncrona')
    event.preventDefault()
  })
  
  // Manejar errores de JavaScript
  window.addEventListener('error', (event) => {
    console.error('❌ JavaScript error en UnifiedOrdersView:', event.error)
    handleError(event.error, 'JavaScript')
  })
}

// Configurar manejo de errores en mount
onMounted(() => {
  setupGlobalErrorHandling()
})
</script>
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
/* ==================== VARIABLES ENVIGO ==================== */
:root {
  --primary: #8BC53F;
  --primary-dark: #7AB32E;
  --secondary: #A4D65E;
  --accent: #6BA428;
  --gradient: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  --shadow-green: 0 4px 12px rgba(139, 197, 63, 0.15);
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ==================== LAYOUT PRINCIPAL ==================== */
.unified-orders-view {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: #f8fafc;
  animation: fadeInUp 0.6s ease-out;
    font-family: var(--font-family);
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.unified-orders-view * {
  font-family: inherit;
}

/* ==================== PAGINACIÓN CON TEMA ENVIGO ==================== */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 20px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(139, 197, 63, 0.2);
  position: relative;
}

.pagination-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient);
  border-radius: 12px 12px 0 0;
}

.pagination-info {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination-btn {
  padding: 10px 16px;
  border: 1px solid rgba(139, 197, 63, 0.3);
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  font-size: 14px;
  position: relative;
  overflow: hidden;
  letter-spacing: -0.01em;
}
.pagination-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--gradient);
  transition: left 0.3s ease;
  z-index: -1;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-green);
}

.pagination-btn:hover:not(:disabled)::before {
  left: 0;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f1f5f9;
  color: #94a3b8;
  border-color: #e2e8f0;
}

.page-info {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(139, 197, 63, 0.1) 0%, rgba(164, 214, 94, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(139, 197, 63, 0.2);
  letter-spacing: -0.01em;
}

/* ==================== MODAL DE SOPORTE CON TEMA ENVIGO ==================== */
.support-modal {
  padding: 32px;
  max-width: 480px;
  background: white;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.support-modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient);
}

.support-modal h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  letter-spacing: -0.02em;
}

.support-modal p {
  margin: 12px 0;
  color: #4b5563;
  font-size: 16px;
  line-height: 1.6;
  letter-spacing: -0.01em;
}

.support-modal p strong {
  color: #1f2937;
  font-weight: 600;
}

.support-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.support-option {
  padding: 16px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  letter-spacing: -0.01em;
}

.support-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--gradient);
  transition: left 0.3s ease;
  z-index: -1;
}

.support-option:hover {
  border-color: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: var(--shadow-green);
}

.support-option:hover::before {
  left: 0;
}

.support-option:active {
  transform: translateY(0);
}

/* Bordes específicos para cada opción de soporte */
.support-option:nth-child(1) {
  border-left: 4px solid #dc2626;
}

.support-option:nth-child(2) {
  border-left: 4px solid #16a34a;
}

.support-option:nth-child(3) {
  border-left: 4px solid #2563eb;
}

/* ==================== NOTIFICACIONES ==================== */
.notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

/* ==================== LOADING STATES CON TEMA ENVIGO ==================== */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 12px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(139, 197, 63, 0.2);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ==================== ANIMACIONES Y TRANSICIONES ==================== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Animación suave para modales */
.modal-enter-active, .modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Animación para elementos que aparecen */
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Pulso para elementos importantes con colores EnviGo */
.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(139, 197, 63, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(139, 197, 63, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(139, 197, 63, 0);
  }
}

/* ==================== ESTADOS DE HOVER Y FOCUS ==================== */

/* Estados de focus mejorados con colores EnviGo */
*:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Mejoras de accesibilidad */
.support-option:focus,
.pagination-btn:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Estados de error */
.error-state {
  border-color: #dc2626 !important;
  background-color: #fef2f2;
  color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 14px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Estados de éxito con colores EnviGo */
.success-state {
  border-color: var(--primary) !important;
  background-color: rgba(139, 197, 63, 0.1);
  color: var(--accent);
}

/* ==================== ESTADOS DE CONEXIÓN TIEMPO REAL ==================== */
.real-time-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  z-index: 1000;
  transition: all 0.3s ease;
}

.real-time-indicator.connected {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.real-time-indicator.disconnected {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.real-time-indicator.connecting {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

/* ==================== SCROLL PERSONALIZADO CON TEMA ENVIGO ==================== */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--gradient);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--accent) 100%);
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 1024px) {
  .unified-orders-view {
    padding: 16px;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .unified-orders-view {
    padding: 12px;
  }
  
  .support-modal {
    padding: 24px;
    max-width: 90vw;
  }
  
  .support-modal h3 {
    font-size: 20px;
  }
  
  .support-option {
    padding: 14px 16px;
    font-size: 15px;
  }
  
  .pagination-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .unified-orders-view {
    padding: 8px;
  }
  
  .pagination-container {
    padding: 16px;
  }
  
  .pagination-info {
    font-size: 13px;
  }
  
  .page-info {
    font-size: 13px;
  }
  
  .support-options {
    gap: 8px;
  }
  
  .support-option {
    padding: 12px 14px;
    font-size: 14px;
  }
}

/* ==================== DARK MODE SUPPORT ==================== */
@media (prefers-color-scheme: dark) {
  .unified-orders-view {
    background: #0f172a;
    color: #e2e8f0;
  }
  
  .pagination-container {
    background: #1e293b;
    border-color: rgba(139, 197, 63, 0.3);
  }
  
  .pagination-btn {
    background: #1e293b;
    color: #e2e8f0;
    border-color: rgba(139, 197, 63, 0.3);
  }
  
  .pagination-btn:hover:not(:disabled) {
    background: var(--gradient);
    border-color: var(--primary);
  }
  
  .pagination-btn:disabled {
    background: #0f172a;
    color: #64748b;
  }
  
  .support-modal {
    background: #1e293b;
    color: #e2e8f0;
  }
  
  .support-modal h3 {
    color: #f1f5f9;
  }
  
  .support-option {
    background: #1e293b;
    border-color: rgba(139, 197, 63, 0.3);
    color: #e2e8f0;
  }
  
  .support-option:hover {
    background: var(--gradient);
  }
}

/* ==================== PRINT STYLES ==================== */
@media print {
  .unified-orders-view {
    padding: 0;
    background: white;
  }
  
  .pagination-container,
  .support-modal {
    display: none;
  }
  
  /* Asegurar que el contenido se imprima correctamente */
  * {
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
  }
}

/* ==================== UTILIDADES ADICIONALES ==================== */

/* Clases de utilidad para estados específicos */
.is-loading {
  position: relative;
  pointer-events: none;
}

.is-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.is-disabled {
  opacity: 0.6;
  pointer-events: none;
  cursor: not-allowed;
}

.is-hidden {
  display: none !important;
}

.is-visible {
  display: block !important;
}

/* Texto truncado */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== ACCESIBILIDAD MEJORADA ==================== */

/* Reducir movimiento para usuarios que lo prefieren */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Alto contraste */
@media (prefers-contrast: high) {
  .pagination-btn,
  .support-option {
    border-width: 2px;
    border-color: #000;
  }
  
  .pagination-btn:hover,
  .support-option:hover {
    background: #000;
    color: #fff;
  }
}

/* Mejoras para lectores de pantalla */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Indicadores de estado para lectores de pantalla */
.status-indicator {
  position: relative;
}

.status-indicator::after {
  content: attr(aria-label);
  position: absolute;
  left: -9999px;
}

/* ==================== PERFORMANCE OPTIMIZATIONS ==================== */

/* Will-change para elementos que van a cambiar */
.pagination-btn,
.support-option {
  will-change: transform, box-shadow;
}

/* Contenedores que van a hacer scroll */
.scroll-container {
  will-change: scroll-position;
}

/* GPU acceleration para animaciones suaves */
.animated-element {
  transform: translateZ(0);
  backface-visibility: hidden;
}
</style>