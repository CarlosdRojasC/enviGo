
<template>
  <div class="page-container">
    <!-- Header con estadísticas y acciones -->
    <AdminOrdersHeader 
      :is-exporting="isExporting"
      :stats="orderStats"
      :additional-stats="additionalStats"
      @export="exportOrders"
      @create-order="openCreateOrderModal"
      @bulk-upload="openBulkUploadModal"
      @quick-action="handleQuickAction"
    />

    <!-- Filtros avanzados -->
    <AdminOrdersFilters
      v-model:filters="filters"
      :companies="companies"
      :available-communes="availableCommunes"
      :loading="loadingOrders"
      @filter-changed="handleFilterChange"
      @reset-filters="resetFilters"
    />

    <!-- Acciones masivas -->
    <AdminOrdersBulkActions
      v-if="selectedOrders.length > 0"
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

    <!-- Tabla principal -->
    <AdminOrdersTable
      :orders="orders"
      :companies="companies"
      :loading="loadingOrders"
      :pagination="pagination"
      :selected-orders="selectedOrders"
      :select-all-checked="selectAllChecked"
      :select-all-indeterminate="selectAllIndeterminate"
      @select-order="toggleOrderSelection"
      @select-all="toggleSelectAll"
      @view-details="openOrderDetailsModal"
      @update-status="openUpdateStatusModal"
      @assign-driver="handleOpenAssignModal"
      @page-change="goToPage"
      @page-size-change="changePageSize"
    />

    <!-- Modales -->
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
      v-model:bulkUploadCompanyId="bulkUploadCompanyId"
      :selected-file="selectedFile"
      :upload-feedback="uploadFeedback"
      :upload-status="uploadStatus"
      :is-uploading="isUploading"
      :available-drivers="availableDrivers"
      :loading-drivers="loadingDrivers"
      v-model:selectedDriverId="selectedDriverId"
      :is-assigning="isAssigning"
      :selected-orders="selectedOrderObjects"
      v-model:bulkSelectedDriverId="bulkSelectedDriverId"
      :is-bulk-assigning="isBulkAssigning"
      :bulk-assignment-completed="bulkAssignmentCompleted"
      :bulk-assignment-results="bulkAssignmentResults"
      :bulk-assignment-finished="bulkAssignmentFinished"
      :bulk-progress-percentage="bulkProgressPercentage"
      @close-details="showOrderDetailsModal = false"
      @close-update-status="showUpdateStatusModal = false"
      @status-updated="handleStatusUpdate"
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
    />

    <!-- Notificaciones Toast (si no están globales) -->
    <Teleport to="body">
      <div v-if="showNotification" class="notification-overlay">
        <!-- Notificaciones personalizadas si es necesario -->
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount,onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

// Composables
import { useOrdersData } from '../composables/useOrdersData'
import { useOrdersFilters } from '../composables/useOrdersFilters'
import { useOrdersSelection } from '../composables/useOrdersSelection'
import { useOrdersModals } from '../composables/useOrdersModals'
import { useDriverAssignment } from '../composables/useDriverAssignment'
import { useBulkUpload } from '../composables/useBulkUpload'
import { useOrdersActions } from '../composables/useOrdersActions'

// Componentes
import AdminOrdersHeader from '../components/AdminOrders/AdminOrdersHeader.vue'
import AdminOrdersFilters from '../components/AdminOrders/AdminOrdersFilters.vue'
import AdminOrdersBulkActions from '../components/AdminOrders/AdminOrdersBulkActions.vue'
import AdminOrdersTable from '../components/AdminOrders/AdminOrdersTable.vue'
import AdminOrdersModals from '../components/AdminOrders/AdminOrdersModals.vue'

// ==================== SETUP ====================
const route = useRoute()
const router = useRouter()
const toast = useToast()

// ==================== COMPOSABLES ====================

// Datos principales
const {
  orders,
  companies,
  pagination,
  loadingOrders,
  fetchOrders,
  fetchCompanies,
  goToPage,
  changePageSize,
  getOrdersStats,
  refreshOrders,
  updateOrderLocally,
  getCompanyName
} = useOrdersData()

// Filtros
const {
  filters,
  availableCommunes,
  handleFilterChange,
  resetFilters,
  setFilter,
  exportFilters,
  hasActiveFilters
} = useOrdersFilters(orders, fetchOrders)

// Selección múltiple
const {
  selectedOrders,
  selectedOrderObjects,
  selectAllChecked,
  selectAllIndeterminate,
  selectedCount,
  selectionStats,
  toggleOrderSelection,
  toggleSelectAll,
  clearSelection,
  selectOrdersByCriteria,
  validateSelection,
  cleanupSelection
} = useOrdersSelection(orders)

// Modales
const {
  showOrderDetailsModal,
  showUpdateStatusModal,
  showCreateOrderModal,
  showBulkUploadModal,
  showAssignModal,
  showBulkAssignModal,
  selectedOrder,
  newOrder,
  isCreatingOrder,
  openOrderDetailsModal,
  openUpdateStatusModal,
  openCreateOrderModal,
  openBulkUploadModal,
  openAssignModal,
  closeAllModals,
  validateNewOrder,
  openBulkAssignModal,
  resetNewOrderForm
} = useOrdersModals()

// Asignación de conductores
const {
  availableDrivers,
  loadingDrivers,
  selectedDriverId,
  isAssigning,
  bulkSelectedDriverId,
  isBulkAssigning,
  bulkAssignmentCompleted,
  bulkAssignmentResults,
  bulkAssignmentFinished,
  bulkProgressPercentage,
  assignmentSummary,
  confirmAssignment,
  confirmBulkAssignment,
  closeBulkAssignModal,
  fetchAvailableDrivers
} = useDriverAssignment(selectedOrderObjects, fetchOrders) 

// Upload masivo
const {
  bulkUploadCompanyId,
  selectedFile,
  uploadFeedback,
  uploadStatus,
  isUploading,
  handleFileSelect,
  handleBulkUpload,
  downloadTemplate,
  resetUploadState
} = useBulkUpload(fetchOrders)

// Acciones generales
const {
  isExporting,
  exportOrders,
  handleCreateOrder,
  handleStatusUpdate,
  deleteOrder,
  duplicateOrder,
  formatCurrency,
  formatDate,
  getStatusName,
  getCommuneClass,
  debugOrder
} = useOrdersActions(newOrder, isCreatingOrder, fetchOrders)

// ==================== LOCAL STATE ====================
const showNotification = ref(false)
const isInitialLoad = ref(true)

// ⚡ TIEMPO REAL: Estado para actualización automática
const lastUpdateTime = ref(new Date())
const autoRefreshEnabled = ref(true)
const pendingUpdates = ref(new Set()) // IDs de órdenes con actualizaciones pendientes

// ==================== COMPUTED ====================

/**
 * Estadísticas de pedidos para el header
 */
const orderStats = computed(() => {
  return getOrdersStats()
})

/**
 * Estadísticas adicionales para el header
 */
const additionalStats = computed(() => {
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
 * Resumen de la selección para acciones masivas
 */
const selectionSummary = computed(() => {
  if (selectedOrderObjects.value.length === 0) return null

  const totalValue = selectedOrderObjects.value.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  const companies = new Set(selectedOrderObjects.value.map(order => 
    typeof order.company_id === 'object' ? order.company_id._id : order.company_id
  )).size
  const communes = new Set(selectedOrderObjects.value.map(order => order.shipping_commune)).size

  return {
    totalValue,
    companies,
    communes
  }
})

// ==================== WATCHERS ====================

/**
 * Watch route query parameters for initial filters
 */
watch(() => route.query, (newQuery) => {
  if (isInitialLoad.value && newQuery.company_id) {
    setFilter('company_id', newQuery.company_id)
  }
}, { immediate: true })

/**
 * Watch for URL changes and update filters accordingly
 */
watch(filters, (newFilters) => {
  // Update URL query params without navigation
  const query = { ...route.query }
  
  Object.keys(newFilters).forEach(key => {
    if (newFilters[key]) {
      query[key] = newFilters[key]
    } else {
      delete query[key]
    }
  })
  
  router.replace({ query })
}, { deep: true })

/**
 * Cleanup selection when orders change
 */
watch(orders, () => {
  cleanupSelection()
})

// ==================== METHODS ====================

/**
 * Handle quick actions from header
 */
function handleQuickAction(action) {
  switch (action) {
    case 'refresh':
      refreshOrders()
      toast.info('Datos actualizados')
      break
      
    case 'pending-today':
      const today = new Date().toISOString().split('T')[0]
      setFilter('date_from', today)
      setFilter('date_to', today)
      setFilter('status', 'pending')
      break
      
    case 'ready-pickup':
      resetFilters()
      setFilter('status', 'ready_for_pickup')
      break
      
    case 'unassigned':
      resetFilters()
      // This would need custom filtering logic
      break
      
    case 'bulk-status':
      if (selectedOrders.value.length === 0) {
        toast.warning('Selecciona pedidos primero')
        return
      }
      // Open bulk status change modal/dropdown
      break
      
    case 'reports':
      // Navigate to reports page or open reports modal
      router.push('/admin/reports')
      break
      
    default:
      console.log('Acción rápida no implementada:', action)
  }
}

/**
 * Handle bulk status change
 */
async function handleBulkStatusChange(newStatus) {
  const validation = validateSelection()
  if (!validation.valid) {
    toast.error(validation.message)
    return
  }

  const confirmed = confirm(
    `¿Cambiar estado de ${selectedOrders.value.length} pedidos a "${getStatusName(newStatus)}"?`
  )
  
  if (!confirmed) return

  try {
    // Implementation would depend on your API
    // This is a placeholder for bulk status update
    const promises = selectedOrderObjects.value.map(order => 
      handleStatusUpdate({ orderId: order._id, newStatus })
    )
    
    await Promise.all(promises)
    toast.success(`Estado actualizado para ${selectedOrders.value.length} pedidos`)
    clearSelection()
    
  } catch (error) {
    console.error('Error in bulk status change:', error)
    toast.error('Error al cambiar estado masivo')
  }
}

/**
 * Handle bulk export
 */
function handleBulkExport() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona pedidos para exportar')
    return
  }

  const orderIds = selectedOrders.value
  exportOrders({ order_ids: orderIds })
}

/**
 * Handle bulk print
 */
function handleBulkPrint() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona pedidos para imprimir')
    return
  }

  // Implementation for printing labels
  toast.info('Función de impresión en desarrollo')
}

/**
 * Handle errors globally
 */
function handleError(error, context = 'Operación') {
  console.error(`Error en ${context}:`, error)
  
  let message = `Error en ${context.toLowerCase()}`
  
  if (error.response?.data?.message) {
    message = error.response.data.message
  } else if (error.message) {
    message = error.message
  }
  
  toast.error(message)
}

/**
 * Refresh data periodically (optional)
 */
function startPeriodicRefresh() {
  // Refresh every 5 minutes
  setInterval(() => {
    if (!document.hidden) {
      refreshOrders()
    }
  }, 5 * 60 * 1000)
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + R: Refresh
  if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
    event.preventDefault()
    refreshOrders()
    return
  }
  
  // Escape: Clear selection or close modals
  if (event.key === 'Escape') {
    if (showOrderDetailsModal.value || showCreateOrderModal.value || 
        showBulkUploadModal.value || showAssignModal.value || 
        showBulkAssignModal.value || showUpdateStatusModal.value) {
      closeAllModals()
    } else if (selectedOrders.value.length > 0) {
      clearSelection()
    }
  }
  
  // Ctrl/Cmd + A: Select all
  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    event.preventDefault()
    toggleSelectAll()
  }
}
/**
 * ⚡ ACTUALIZACIÓN AUTOMÁTICA EN TIEMPO REAL
 * Maneja las actualizaciones de órdenes via WebSocket
 */
function handleOrderUpdate(event) {
  const { orderId, orderNumber, newStatus, eventType, companyId } = event.detail
  
  console.log('🔄 [AdminOrders] Actualizando orden en tiempo real:', {
    orderNumber,
    newStatus,
    eventType,
    orderId
  })
  
  // Buscar la orden en la lista actual
  const orderIndex = orders.value.findIndex(order => 
    order._id === orderId || order.order_number === orderNumber
  )
  
  if (orderIndex !== -1) {
    // ✅ Orden encontrada - actualizar localmente
    const existingOrder = orders.value[orderIndex]
    
    // Actualizar campos básicos
    existingOrder.status = newStatus
    existingOrder.updated_at = new Date().toISOString()
    
    // Actualizar campos específicos según el evento
    switch (eventType) {
      case 'driver_assigned':
        // La información del conductor se actualizará en la próxima carga
        pendingUpdates.value.add(orderId)
        break
        
      case 'picked_up':
        existingOrder.pickup_time = new Date().toISOString()
        break
        
      case 'delivered':
        existingOrder.delivery_date = new Date().toISOString()
        existingOrder.status = 'delivered'
        break
        
      case 'proof_uploaded':
        // Marcar que tiene prueba de entrega
        existingOrder.has_proof_of_delivery = true
        break
    }
    
    // Actualizar tiempo de última actualización
    lastUpdateTime.value = new Date()
    
    // Log para debugging
    console.log(`✅ [AdminOrders] Orden ${orderNumber} actualizada localmente:`, {
      newStatus: existingOrder.status,
      eventType,
      timestamp: existingOrder.updated_at
    })
    
    // Mostrar indicador visual temporal (opcional)
    showOrderUpdateIndicator(orderId)
    
  } else {
    // ❓ Orden no encontrada en la lista actual
    console.log(`🔄 [AdminOrders] Orden ${orderNumber} no encontrada en lista actual`)
    
    // Verificar si la orden debería estar en la lista actual según filtros
    if (shouldOrderBeInCurrentView(companyId, newStatus)) {
      console.log('📥 [AdminOrders] Orden debería estar en vista actual, recargando...')
      refreshOrders()
    }
  }
}

/**
 * Determinar si una orden debería estar en la vista actual según filtros
 */
function shouldOrderBeInCurrentView(companyId, status) {
  // Si hay filtro de empresa y no coincide, no debería estar
  if (filters.value.company_id && filters.value.company_id !== companyId) {
    return false
  }
  
  // Si hay filtro de estado y no coincide, no debería estar
  if (filters.value.status && filters.value.status !== status) {
    return false
  }
  
  // Por defecto, asumir que sí debería estar
  return true
}

/**
 * Mostrar indicador visual de actualización (opcional)
 */
function showOrderUpdateIndicator(orderId) {
  // Agregar clase CSS temporal para highlight
  const orderElement = document.querySelector(`[data-order-id="${orderId}"]`)
  if (orderElement) {
    orderElement.classList.add('order-updated')
    setTimeout(() => {
      orderElement.classList.remove('order-updated')
    }, 3000)
  }
}

/**
 * Refrescar órdenes que tienen actualizaciones pendientes
 */
async function refreshPendingUpdates() {
  if (pendingUpdates.value.size === 0) return
  
  console.log(`🔄 [AdminOrders] Refrescando ${pendingUpdates.value.size} órdenes con actualizaciones pendientes`)
  
  try {
    // Obtener detalles actualizados de las órdenes pendientes
    const orderIds = Array.from(pendingUpdates.value)
    
    // Aquí deberías hacer una llamada a tu API para obtener detalles específicos
    // Por ahora, hacemos un refresh completo más inteligente
    await refreshOrders()
    
    // Limpiar actualizaciones pendientes
    pendingUpdates.value.clear()
    
  } catch (error) {
    console.error('❌ [AdminOrders] Error refrescando actualizaciones pendientes:', error)
  }
}

/**
 * Toggle para habilitar/deshabilitar auto-refresh
 */
function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  
  if (autoRefreshEnabled.value) {
    toast.success('🔄 Actualización automática activada')
  } else {
    toast.info('⏸️ Actualización automática pausada')
  }
}
/**
 * handleOpenBulkAssignModal
 */
function handleOpenBulkAssignModal() {
  console.log('Solicitando apertura de modal masivo...');
  fetchAvailableDrivers(); // Carga los conductores
  openBulkAssignModal();   // Abre el modal
}
/**
 * Orquesta la apertura del modal de asignación individual
 */
function handleOpenAssignModal(order) {
  console.log('Solicitando apertura de modal individual...');
  fetchAvailableDrivers(); // Carga los conductores
  openAssignModal(order);  // Abre el modal con el pedido correcto
}
// ==================== LIFECYCLE ====================

onMounted(async () => {
  try {
    // Load initial data
    await Promise.all([
      fetchCompanies(),
      fetchOrders()
    ])
    
    // Setup additional features
    startPeriodicRefresh()
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts)

     // ⚡ NUEVO: Setup real-time updates
    console.log('🔗 [AdminOrders] Configurando actualizaciones en tiempo real')
    
    // Escuchar actualizaciones de órdenes via WebSocket
    window.addEventListener('orderUpdated', handleOrderUpdate)
    
    // Refrescar actualizaciones pendientes cada 30 segundos
    setInterval(() => {
      if (autoRefreshEnabled.value) {
        refreshPendingUpdates()
      }
    }, 30000)
    
    isInitialLoad.value = false
    
  } catch (error) {
    handleError(error, 'Carga inicial')
  }
})

// Cleanup
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyboardShortcuts)

  // ⚡ NUEVO: Cleanup real-time listeners
  console.log('🧹 [AdminOrders] Limpiando listeners de tiempo real')
  window.removeEventListener('orderUpdated', handleOrderUpdate)
})
</script>

<style scoped>
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
/* ⚡ NUEVOS ESTILOS para indicadores de actualización en tiempo real */
.order-updated {
  background-color: #fef3c7 !important;
  border-left: 4px solid #f59e0b !important;
  animation: updateGlow 3s ease-out;
}

@keyframes updateGlow {
  0% {
    background-color: #fef3c7;
    transform: scale(1.02);
  }
  50% {
    background-color: #fde68a;
  }
  100% {
    background-color: transparent;
    transform: scale(1);
  }
}

.real-time-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.real-time-indicator.disabled {
  background: #6b7280;
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>