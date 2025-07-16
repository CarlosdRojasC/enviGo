<template>
  <div class="orders-page">
    <!-- Header con estadísticas moderno -->
    <OrdersHeader 
      title="Mis Pedidos"
      :stats="orderStats"
      :additional-stats="additionalStats"
      :loading="loadingOrders || refreshing"
      :exporting="loadingStates?.exporting || false"
      :last-update="lastUpdate"
      :auto-refresh="autoRefreshEnabled"
      @refresh="handleRefresh"
      @export="handleExport"
      @create-order="handleCreateOrder"
      @toggle-auto-refresh="toggleAutoRefresh"
    />

    <!-- Filtros modernos -->
    <OrdersFilters
      :filters="filters"
      :advanced-filters="advancedFilters"
      :channels="channels"
      :available-communes="availableCommunes"
      :presets="filterPresets"
      :show-advanced="filtersUI?.showAdvanced || false"
      :active-count="activeFiltersCount"
      @filter-change="handleFilterChange"
      @advanced-change="updateAdvancedFilter"
      @apply-preset="applyPreset"
      @toggle-advanced="toggleAdvancedFilters"
      @search="debouncedSearch"
      @clear-all="clearAllFilters"
    />

    <!-- Tabla moderna -->
    <OrdersTable
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
  @generate-manifest="generateManifestAndMarkReady"
  @bulk-export="handleBulkExport"
  @create-order="handleCreateOrder"
  @go-to-page="goToPage"
  @change-page-size="changePageSize"
  @sort="handleSort"
  :has-tracking-info="hasTrackingInfo"
  :has-proof-of-delivery="hasProofOfDelivery"
  :get-action-button="getActionButton"
    />

    <!-- Modales existentes (mantener tal como están) -->
    <Modal v-model="showOrderDetailsModal" :title="`Pedido #${selectedOrder?.order_number}`" width="800px">
  <div v-if="loadingOrderDetails" class="loading-state">
    <div class="loading-spinner"></div>
    <p>Cargando detalles del pedido...</p>
  </div>
  <OrderDetails v-else-if="selectedOrder" :order="selectedOrder" />
</Modal>

<Modal v-model="showTrackingModal" :title="`🚚 Tracking - Pedido #${selectedTrackingOrder?.order_number}`" width="700px">
  <OrderTracking 
    ref="orderTrackingRef"
    v-if="selectedTrackingOrder" 
    :order-id="selectedTrackingOrder._id" 
    :order-number="selectedTrackingOrder.order_number"
    @support-contact="handleTrackingSupport"
    @show-proof="handleShowProof"
    @close="showTrackingModal = false"
  />
</Modal>

    <Modal v-model="showProofModal" :title="`📋 Prueba de Entrega - #${selectedProofOrder?.order_number}`" width="700px">
  <div v-if="loadingOrderDetails" class="loading-state">
    <div class="loading-spinner"></div>
    <p>Cargando prueba de entrega...</p>
  </div>
  <div v-else-if="!selectedProofOrder" class="error-state">
    <p>❌ No se pudo cargar la información de la prueba de entrega</p>
    <button @click="showProofModal = false" class="btn btn-secondary">Cerrar</button>
  </div>
  <ProofOfDelivery v-else :order="selectedProofOrder" />
</Modal>

    <!-- Modal de soporte -->
    <Modal v-model="showSupportModal" title="💬 Contactar Soporte" width="500px">
  <div v-if="supportOrder" class="support-form">
    <div class="support-order-info">
      <h4>Pedido: #{{ supportOrder.order_number }}</h4>
      <p>Cliente: {{ supportOrder.customer_name }}</p>
      <p>Estado: {{ getStatusName(supportOrder.status) }}</p>
    </div>

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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import { useToast } from 'vue-toastification'

// Componentes importados
import Modal from '../components/Modal.vue'
import OrderDetails from '../components/OrderDetails.vue'
import OrderTracking from '../components/OrderTracking.vue'
import ProofOfDelivery from '../components/ProofOfDelivery.vue'

// Nuevos componentes modernos
import OrdersHeader from '../components/Orders/OrdersHeader.vue'
import OrdersFilters from '../components/Orders/OrdersFilters.vue'
import OrdersTable from '../components/Orders/OrdersTable.vue'

// Composables (asumiendo que ya los extendiste)
import { useOrdersData } from '../composables/useOrdersData'
import { useOrdersFilters } from '../composables/useOrdersFilters'
import { useOrdersSelection } from '../composables/useOrdersSelection'

const toast = useToast()
const router = useRouter()
const auth = useAuthStore()

// ==================== COMPOSABLES ====================

// Datos principales
const {
  orders,
  channels,
  pagination,
  loading: loadingOrders,
  refreshing,
  additionalStats,
  loadingStates,
  fetchOrders,
  fetchChannels,
  goToPage,
  changePageSize,
  refreshOrders,
  markOrderAsReady,
  markMultipleAsReady,
  exportOrders,
  startAutoRefresh,
  stopAutoRefresh,
  updateOrderLocally
} = useOrdersData()

// Filtros
const {
  filters,
  advancedFilters,
  filtersUI,
  filterPresets,
  allFilters,
  activeFiltersCount,
  availableCommunes,
  applyPreset,
  toggleAdvancedFilters,
  updateAdvancedFilter,
  debouncedSearch,
  handleFilterChange,
  clearAllFilters
} = useOrdersFilters(orders, fetchOrders)

// Selección múltiple
const {
  selectedOrders,
  selectAllChecked,
  selectAllIndeterminate,
  selectedCount,
  selectedOrderObjects,
  toggleOrderSelection,
  toggleSelectAll,
  clearSelection
} = useOrdersSelection(orders)

// ==================== ESTADO LOCAL ====================

const user = computed(() => auth.user)
const lastUpdate = ref(Date.now())
const autoRefreshEnabled = ref(false)
const loadingOrderDetails = ref(false)
const orderTrackingRef = ref(null)

// Estados de modales (mantener los existentes)
const selectedOrder = ref(null)
const showOrderDetailsModal = ref(false)
const selectedTrackingOrder = ref(null)
const showTrackingModal = ref(false)
const selectedProofOrder = ref(null)
const showProofModal = ref(false)
const supportOrder = ref(null)
const showSupportModal = ref(false)

// ⚡ TIEMPO REAL: Estado para actualización automática
const realTimeEnabled = ref(true)
const lastOrderUpdate = ref(null)
const pendingOrderUpdates = ref(new Map()) // orderId -> updateData
const orderUpdateQueue = ref([]) // Cola de notificaciones para mostrar

// ==================== COMPUTED ====================

/**
 * Estadísticas para el header
 */
const orderStats = computed(() => ({
  total: orders.value.length,
  pending: orders.value.filter(o => o.status === 'pending').length,
  processing: orders.value.filter(o => o.status === 'processing').length,
  shipped: orders.value.filter(o => o.status === 'shipped').length,
  delivered: orders.value.filter(o => o.status === 'delivered').length,
  cancelled: orders.value.filter(o => o.status === 'cancelled').length,
  ready_for_pickup: orders.value.filter(o => o.status === 'ready_for_pickup').length
}))

// ==================== MÉTODOS DEL HEADER ====================

async function handleRefresh() {
  try {
    await refreshOrders(allFilters.value)
    lastUpdate.value = Date.now()
    
    // Limpiar actualizaciones pendientes después del refresh
    pendingOrderUpdates.value.clear()
    orderUpdateQueue.value = []
    
    toast.success('Pedidos actualizados')
  } catch (error) {
    toast.error('Error al actualizar pedidos')
  }
}

async function handleExport() {
  try {
    await exportOrders('excel', allFilters.value)
    toast.success('Exportación completada')
  } catch (error) {
    toast.error('Error al exportar pedidos')
  }
}

function handleCreateOrder() {
  // Navegar a crear pedido o abrir modal
  router.push('/orders/create')
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    startAutoRefresh(5) // cada 5 minutos
    toast.info('Auto-actualización activada (cada 5 min)')
  } else {
    stopAutoRefresh()
    toast.info('Auto-actualización desactivada')
  }
}

// ==================== MÉTODOS DE ACCIONES MASIVAS ====================

async function handleBulkMarkReady() {
  try {
    const pendingOrders = selectedOrderObjects.value.filter(o => o.status === 'pending')
    if (pendingOrders.length === 0) {
      toast.warning('No hay pedidos pendientes seleccionados')
      return
    }

    await markMultipleAsReady(pendingOrders.map(o => o._id))
    clearSelection()
    toast.success(`${pendingOrders.length} pedidos marcados como listos`)
  } catch (error) {
    toast.error('Error al marcar pedidos como listos')
  }
}

async function generateManifestAndMarkReady() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona al menos un pedido')
    return
  }

  const confirmMsg = `¿Deseas generar el manifiesto y marcar ${selectedOrders.value.length} pedido(s) como "Listo para Retiro"?`
  if (!confirm(confirmMsg)) return

  try {
    // 1. Marcar pedidos como listos
    await markMultipleAsReady(selectedOrders.value)

    // 2. Generar manifiesto
    const ids = selectedOrders.value.join(',')
    const routeData = router.resolve({ name: 'PickupManifest', query: { ids } })
    const newWindow = window.open(routeData.href, '_blank')

    if (!newWindow) {
      toast.error('No se pudo abrir el manifiesto. Habilita las ventanas emergentes.')
      return
    }

    // 3. Limpiar selección
    clearSelection()

    toast.success('✅ Pedidos marcados como listos y manifiesto generado exitosamente')
  } catch (error) {
    console.error('❌ Error al generar manifiesto:', error)
    toast.error('Error al procesar los pedidos')
  }
}

async function handleBulkExport() {
  try {
    const orderIds = selectedOrders.value
    await exportOrders('excel', { order_ids: orderIds })
    toast.success(`Exportación de ${orderIds.length} pedidos completada`)
  } catch (error) {
    toast.error('Error al exportar selección')
  }
}

// ==================== MÉTODOS DE TABLA ====================

function handleSort(column) {
  // Implementar lógica de ordenamiento
  console.log('Sorting by:', column)
  // Aquí puedes implementar la lógica de ordenamiento
}

// ==================== MÉTODOS DE PEDIDOS INDIVIDUALES ====================

async function markAsReady(order) {
  try {
    await markOrderAsReady(order)
    // El composable ya actualiza localmente
  } catch (error) {
    // El composable ya maneja el error
  }
}

// ==================== MÉTODOS DE TRACKING Y MODALES ====================
/**
 * Verificar si una orden tiene tracking disponible
 */
function hasTrackingInfo(order) {
  // Usar la función del componente OrderTracking si está disponible
  if (orderTrackingRef.value?.hasTrackingInfo) {
    return orderTrackingRef.value.hasTrackingInfo(order)
  }
  
  // Fallback: lógica básica
  if (order.status === 'delivered') return false
  return !!(
    order.shipday_tracking_url ||
    order.shipday_driver_id || 
    order.shipday_order_id ||
    ['processing', 'shipped'].includes(order.status)
  )
}

/**
 * Verificar si una orden tiene prueba de entrega
 */
function hasProofOfDelivery(order) {
  if (orderTrackingRef.value?.orderHasProofOfDelivery) {
    return orderTrackingRef.value.orderHasProofOfDelivery(order)
  }
  
  // Fallback: lógica básica - MEJORADA
  if (order.status !== 'delivered') return false
  return !!(
    order.proof_of_delivery?.photo_url || 
    order.proof_of_delivery?.signature_url ||
    order.podUrls?.length > 0 ||
    order.signatureUrl ||
    order.has_proof_of_delivery || // Agregar este campo adicional
    order.delivery_date // Si tiene fecha de entrega, probablemente tenga prueba
  )
}
/**
 * Obtener configuración del botón de acción
 */
function getActionButton(order) {
  if (orderTrackingRef.value?.getActionButton) {
    return orderTrackingRef.value.getActionButton(order)
  }
  
  // Fallback: lógica básica MEJORADA
  if (order.status === 'delivered') {
    return {
      type: 'proof',
      label: 'Ver Prueba de Entrega',
      icon: '📸',
      class: 'btn-success',
      available: true // Siempre disponible para pedidos entregados
    }
  }
  
  if (['processing', 'shipped'].includes(order.status)) {
    return {
      type: 'tracking',
      label: 'Tracking en Vivo',
      icon: '📍',
      class: 'btn-primary',
      available: hasTrackingInfo(order)
    }
  }
  
  return { type: 'none', available: false }
}


async function openLiveTracking(order) {
  console.log('📍 Intentando abrir tracking para orden:', order.order_number)
  
  // Usar la función del componente si está disponible
  if (orderTrackingRef.value?.openLiveTrackingFromExternal) {
    await orderTrackingRef.value.openLiveTrackingFromExternal(order, updateOrderLocally)
    return
  }
  
  // Fallback: lógica básica
  if (order.shipday_tracking_url) {
    console.log('✅ Abriendo tracking URL directa:', order.shipday_tracking_url)
    window.open(order.shipday_tracking_url, '_blank')
  } else if (order.shipday_order_id) {
    console.log('⚠️ No hay tracking URL, intentando refrescar datos...')
    try {
      const { data } = await apiService.orders.getById(order._id)
      
      if (data.shipday_tracking_url) {
        console.log('✅ URL obtenida después de refresh:', data.shipday_tracking_url)
        // Actualizar orden localmente
        updateOrderLocally(data)
        window.open(data.shipday_tracking_url, '_blank')
      } else {
        toast.warning('No se encontró URL de tracking. El pedido puede no estar asignado a un conductor aún.')
      }
    } catch (error) {
      console.error('❌ Error refrescando orden:', error)
      toast.error('Error obteniendo información de tracking')
    }
  } else {
    toast.warning('No hay información de tracking disponible')
  }
}
function openTrackingModal(order) {
  console.log('🚚 Abriendo modal de tracking:', order.order_number)
  selectedTrackingOrder.value = order
  showTrackingModal.value = true
}

async function showProofOfDelivery(order) {
  console.log('📸 Abriendo modal de prueba de entrega:', order.order_number)
  
  // Resetear estados
  selectedProofOrder.value = null
  loadingOrderDetails.value = true
  showProofModal.value = true
  
  try {
    // Obtener datos actualizados de la orden
    const { data } = await apiService.orders.getById(order._id)
    
    // Asignar la orden actualizada
    selectedProofOrder.value = data
    
    console.log('✅ Datos de prueba de entrega cargados:', {
      orderId: data._id,
      orderNumber: data.order_number,
      hasProof: data.proof_of_delivery,
      podUrls: data.podUrls,
      signatureUrl: data.signatureUrl,
      deliveryDate: data.delivery_date
    })
    
  } catch (error) {
    console.error('❌ Error cargando prueba de entrega:', error)
    toast.error('Error al cargar la prueba de entrega')
    showProofModal.value = false
  } finally {
    loadingOrderDetails.value = false
  }
}

async function openOrderDetailsModal(order) {
  console.log('📋 Abriendo detalles de orden:', order.order_number)
  
  selectedOrder.value = null
  showOrderDetailsModal.value = true
  loadingOrderDetails.value = true
  
  try {
    const { data } = await apiService.orders.getById(order._id)
    selectedOrder.value = data
  } catch (error) {
    console.error("❌ Error al obtener detalles del pedido:", error)
    showOrderDetailsModal.value = false
    toast.error('Error al cargar detalles del pedido')
  } finally {
    loadingOrderDetails.value = false
  }
}

function contactSupport(order) {
  supportOrder.value = order
  showSupportModal.value = true
}

function handleTrackingSupport(supportData) {
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
  showTrackingModal.value = false
  // Usar el método corregido
  showProofOfDelivery(proofData.order)
}

// ==================== MÉTODOS DE SOPORTE ====================

function emailSupport(order) {
  const subject = `Consulta sobre Pedido #${order.order_number}`
  const body = `Hola,\n\nTengo una consulta sobre mi pedido #${order.order_number}.\n\nDetalles:\n- Cliente: ${order.customer_name}\n- Estado: ${getStatusName(order.status)}\n\nMi consulta es:\n\n[Describe tu consulta aquí]\n\nGracias.`
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  showSupportModal.value = false
}

function whatsappSupport(order) {
  const message = `Hola, tengo una consulta sobre mi pedido #${order.order_number}. Estado: ${getStatusName(order.status)}`
  const whatsappNumber = '56912345678'
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank')
  showSupportModal.value = false
}

function callSupport(order) {
  const phoneNumber = '+56912345678'
  window.location.href = `tel:${phoneNumber}`
  showSupportModal.value = false
}

// ==================== MÉTODOS UTILITARIOS ====================

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    processing: 'Procesando',
    ready_for_pickup: 'Listo para Retiro',
    shipped: 'En Tránsito',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  }
  return names[status] || status
}
async function handleActionButton(order) {
  const action = getActionButton(order)
  
  if (!action.available) {
    console.log('❌ Acción no disponible para orden:', order.order_number)
    return
  }

  switch (action.type) {
    case 'proof':
      showProofOfDelivery(order)
      break
    case 'tracking':
      await openLiveTracking(order)
      break
    default:
      console.log('❌ Tipo de acción desconocido:', action.type)
  }
}


/**
 * ⚡ ACTUALIZACIÓN AUTOMÁTICA EN TIEMPO REAL
 * Maneja las actualizaciones de órdenes via WebSocket para empresas
 */
function handleOrderUpdate(event) {
  const { orderId, orderNumber, newStatus, eventType, companyId } = event.detail
  
  // Verificar que la orden pertenece a esta empresa
  if (companyId && auth.user?.company_id && companyId !== auth.user.company_id) {
    console.log('🔒 [Orders] Orden de otra empresa, ignorando:', orderNumber)
    return
  }
  
  console.log('🔄 [Orders] Actualizando orden en tiempo real:', {
    orderNumber,
    newStatus,
    eventType,
    orderId,
    companyMatches: !companyId || companyId === auth.user?.company_id
  })
  
  // Buscar la orden en la lista actual
  const orderIndex = orders.value.findIndex(order => 
    order._id === orderId || order.order_number === orderNumber
  )
  
  if (orderIndex !== -1) {
    // ✅ Orden encontrada - actualizar localmente
    const existingOrder = orders.value[orderIndex]
    const previousStatus = existingOrder.status
    
    // Actualizar campos básicos
    existingOrder.status = newStatus
    existingOrder.updated_at = new Date().toISOString()
    
    // Actualizar campos específicos según el evento
    switch (eventType) {
      case 'driver_assigned':
        console.log('👨‍💼 [Orders] Conductor asignado:', orderNumber)
        // Marcar para actualizar datos completos más tarde
        pendingOrderUpdates.value.set(orderId, { 
          type: 'driver_assigned', 
          timestamp: Date.now() 
        })
        break
        
      case 'picked_up':
        console.log('🚚 [Orders] Pedido recogido:', orderNumber)
        existingOrder.pickup_time = new Date().toISOString()
        
        // Si hay modal de tracking abierto para esta orden, actualizarlo
        if (selectedTrackingOrder.value?._id === orderId) {
          refreshTrackingModal()
        }
        break
        
      case 'delivered':
        console.log('✅ [Orders] Pedido entregado:', orderNumber)
        existingOrder.delivery_date = new Date().toISOString()
        existingOrder.status = 'delivered'
        
        // Marcar para obtener prueba de entrega
        pendingOrderUpdates.value.set(orderId, { 
          type: 'delivered', 
          timestamp: Date.now() 
        })
        break
        
      case 'proof_uploaded':
        console.log('📸 [Orders] Prueba de entrega subida:', orderNumber)
        existingOrder.has_proof_of_delivery = true
        
        // Si hay modal de prueba abierto para esta orden, actualizarlo
        if (selectedProofOrder.value?._id === orderId) {
          refreshProofModal()
        }
        break
    }
    
    // Registrar la actualización
    lastOrderUpdate.value = {
      orderId,
      orderNumber,
      previousStatus,
      newStatus,
      eventType,
      timestamp: new Date()
    }
    
    // Agregar a cola de notificaciones si cambió el estado
    if (previousStatus !== newStatus) {
      orderUpdateQueue.value.push({
        id: Date.now(),
        orderId,
        orderNumber,
        previousStatus,
        newStatus,
        eventType,
        timestamp: new Date()
      })
      
      // Mostrar notificación visual temporal
      showOrderUpdateIndicator(orderId, eventType)
    }
    
    console.log(`✅ [Orders] Orden ${orderNumber} actualizada localmente:`, {
      from: previousStatus,
      to: newStatus,
      eventType
    })
    
  } else {
    // ❓ Orden no encontrada en la lista actual
    console.log(`🔄 [Orders] Orden ${orderNumber} no encontrada en lista actual`)
    
    // Si es una nueva orden o debería estar en la vista, recargar
    if (shouldOrderBeInCurrentView(newStatus)) {
      console.log('📥 [Orders] Recargando lista para incluir orden actualizada...')
      handleRefresh()
    }
  }
}

/**
 * Determinar si una orden debería estar en la vista actual
 */
function shouldOrderBeInCurrentView(status) {
  // Si hay filtro de estado y no coincide, no debería estar
  if (filters.value.status && filters.value.status !== status) {
    return false
  }
  
  // Por defecto, las órdenes de esta empresa deberían estar
  return true
}

/**
 * Mostrar indicador visual de actualización
 */
function showOrderUpdateIndicator(orderId, eventType) {
  // Buscar el elemento en la tabla
  const orderRow = document.querySelector(`[data-order-id="${orderId}"]`)
  if (orderRow) {
    // Agregar clase de actualización
    orderRow.classList.add('order-updated', `update-${eventType}`)
    
    // Remover después de 4 segundos
    setTimeout(() => {
      orderRow.classList.remove('order-updated', `update-${eventType}`)
    }, 4000)
  }
}

/**
 * Refrescar modal de tracking si está abierto
 */
async function refreshTrackingModal() {
  if (!selectedTrackingOrder.value || !showTrackingModal.value) return
  
  try {
    console.log('🔄 [Orders] Refrescando modal de tracking...')
    const { data } = await apiService.orders.getById(selectedTrackingOrder.value._id)
    selectedTrackingOrder.value = data
    
    // Si el componente de tracking tiene método de refresh, llamarlo
    if (orderTrackingRef.value?.refreshTracking) {
      orderTrackingRef.value.refreshTracking()
    }
  } catch (error) {
    console.error('❌ [Orders] Error refrescando tracking modal:', error)
  }
}

/**
 * Refrescar modal de prueba de entrega si está abierto
 */
async function refreshProofModal() {
  if (!selectedProofOrder.value || !showProofModal.value) return
  
  try {
    console.log('🔄 [Orders] Refrescando modal de prueba de entrega...')
    const { data } = await apiService.orders.getById(selectedProofOrder.value._id)
    selectedProofOrder.value = data
  } catch (error) {
    console.error('❌ [Orders] Error refrescando proof modal:', error)
  }
}
/**
 * Procesar actualizaciones pendientes
 */
async function processPendingUpdates() {
  if (pendingOrderUpdates.value.size === 0) return
  
  console.log(`🔄 [Orders] Procesando ${pendingOrderUpdates.value.size} actualizaciones pendientes...`)
  
  const updates = Array.from(pendingOrderUpdates.value.entries())
  pendingOrderUpdates.value.clear()
  
  for (const [orderId, updateData] of updates) {
    try {
      console.log(`📡 [Orders] Obteniendo datos actualizados para orden ${orderId}...`)
      const { data: updatedOrder } = await apiService.orders.getById(orderId)
      
      // Actualizar la orden en la lista local
      updateOrderLocally(updatedOrder)
      
      console.log(`✅ [Orders] Orden ${updatedOrder.order_number} actualizada con datos completos`)
      
    } catch (error) {
      console.error(`❌ [Orders] Error actualizando orden ${orderId}:`, error)
    }
  }
}

/**
 * Limpiar cola de notificaciones antiguas
 */
function cleanupNotificationQueue() {
  const now = Date.now()
  const QUEUE_CLEANUP_TIME = 30000 // 30 segundos
  
  orderUpdateQueue.value = orderUpdateQueue.value.filter(notification => 
    now - notification.timestamp.getTime() < QUEUE_CLEANUP_TIME
  )
}

/**
 * Toggle para habilitar/deshabilitar tiempo real
 */
function toggleRealTime() {
  realTimeEnabled.value = !realTimeEnabled.value
  
  if (realTimeEnabled.value) {
    toast.success('⚡ Actualizaciones en tiempo real activadas')
  } else {
    toast.info('⏸️ Actualizaciones en tiempo real pausadas')
    pendingOrderUpdates.value.clear()
    orderUpdateQueue.value = []
  }
}

/**
 * Obtener estadísticas de tiempo real
 */
const realTimeStats = computed(() => ({
  enabled: realTimeEnabled.value,
  lastUpdate: lastOrderUpdate.value,
  pendingUpdates: pendingOrderUpdates.value.size,
  recentNotifications: orderUpdateQueue.value.length,
  connectionTime: lastUpdate.value
}))
// ==================== LIFECYCLE ====================

onMounted(async () => {
  try {
    // Carga inicial existente
    await Promise.all([
      fetchOrders(),
      fetchChannels()
    ])
    lastUpdate.value = Date.now()
    
    // ⚡ NUEVO: Setup real-time updates
    console.log('🔗 [Orders] Configurando actualizaciones en tiempo real para empresa:', auth.user?.company_id)
    
    // Escuchar actualizaciones de órdenes via WebSocket
    window.addEventListener('orderUpdated', handleOrderUpdate)
    
    // Procesar actualizaciones pendientes cada 20 segundos
    setInterval(() => {
      if (realTimeEnabled.value) {
        processPendingUpdates()
      }
    }, 20000)
    
    // Limpiar cola de notificaciones cada minuto
    setInterval(() => {
      cleanupNotificationQueue()
    }, 60000)
    
    console.log('✅ [Orders] Sistema de tiempo real configurado')
    
  } catch (error) {
    console.error('Error al inicializar Orders:', error)
    toast.error('Error al cargar la página')
  }
})
onBeforeUnmount(() => {
  // Cleanup existente
  if (autoRefreshEnabled.value) {
    stopAutoRefresh()
  }
  
  // ⚡ NUEVO: Cleanup real-time listeners
  console.log('🧹 [Orders] Limpiando listeners de tiempo real')
  window.removeEventListener('orderUpdated', handleOrderUpdate)
  
  // Limpiar estado
  pendingOrderUpdates.value.clear()
  orderUpdateQueue.value = []
})
</script>

<style scoped>
.orders-page {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f8fafc;
  min-height: 100vh;
}

/* Loading States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Support Modal Styles */
.support-form {
  padding: 20px;
}

.support-order-info {
  background: #f9fafb;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
}

.support-order-info h4 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.support-order-info p {
  margin: 4px 0;
  color: #6b7280;
  font-size: 14px;
}

.support-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.support-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.support-option:hover {
  border-color: #6366f1;
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .orders-page {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .orders-page {
    padding: 12px;
    background: white;
  }
}

@media (max-width: 480px) {
  .orders-page {
    padding: 8px;
  }
  
  .support-options {
    gap: 8px;
  }
  
  .support-option {
    padding: 12px;
    font-size: 13px;
  }
}

/* Accessibility */
.orders-page:focus-within {
  outline: none;
}

/* Print styles */
@media print {
  .orders-page {
    background: white;
    padding: 0;
  }
}
/* ⚡ TIEMPO REAL: Indicadores visuales de actualización */
.order-updated {
  animation: orderUpdateGlow 4s ease-out;
  position: relative;
  z-index: 1;
}

.order-updated.update-driver_assigned {
  border-left: 4px solid #3b82f6 !important;
  background: linear-gradient(90deg, #dbeafe, transparent) !important;
}

.order-updated.update-picked_up {
  border-left: 4px solid #8b5cf6 !important;
  background: linear-gradient(90deg, #e9d5ff, transparent) !important;
}

.order-updated.update-delivered {
  border-left: 4px solid #10b981 !important;
  background: linear-gradient(90deg, #d1fae5, transparent) !important;
}

.order-updated.update-proof_uploaded {
  border-left: 4px solid #f59e0b !important;
  background: linear-gradient(90deg, #fef3c7, transparent) !important;
}

@keyframes orderUpdateGlow {
  0% {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
  }
  25% {
    background-opacity: 0.8;
  }
  50% {
    transform: scale(1.01);
  }
  75% {
    background-opacity: 0.4;
  }
  100% {
    transform: scale(1);
    box-shadow: none;
    background-opacity: 0;
  }
}

/* Indicador de tiempo real en el header */
.real-time-status {
  position: fixed;
  top: 80px;
  right: 20px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.real-time-status:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
}

.real-time-status.disabled {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
}

.real-time-status.disabled:hover {
  box-shadow: 0 6px 16px rgba(107, 114, 128, 0.5);
}

.pulse-indicator {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: realtimePulse 2s infinite;
}

.real-time-status.disabled .pulse-indicator {
  animation: none;
  opacity: 0.6;
}

@keyframes realtimePulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
  }
  50% { 
    opacity: 0.4; 
    transform: scale(1.2); 
  }
}

.real-time-stats {
  font-size: 10px;
  opacity: 0.9;
  margin-left: 4px;
}

/* Notificaciones flotantes de actualización */
.order-notification {
  position: fixed;
  top: 120px;
  right: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1001;
  max-width: 300px;
  animation: slideInFromRight 0.4s ease-out;
}

.order-notification.driver-assigned {
  border-left: 4px solid #3b82f6;
}

.order-notification.picked-up {
  border-left: 4px solid #8b5cf6;
}

.order-notification.delivered {
  border-left: 4px solid #10b981;
}

.order-notification.proof-uploaded {
  border-left: 4px solid #f59e0b;
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.notification-text {
  flex: 1;
}

.notification-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.notification-message {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.3;
}

.notification-time {
  color: #9ca3af;
  font-size: 10px;
  margin-top: 4px;
}

/* Mejoras para modales cuando se actualizan */
.modal-updating {
  position: relative;
}

.modal-updating::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981);
  background-size: 200% 100%;
  animation: modalUpdateProgress 2s ease-in-out;
  z-index: 1;
}

@keyframes modalUpdateProgress {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Estados de carga mejorados */
.updating-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #f3f4f6;
  border-radius: 16px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.updating-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Responsive design para indicadores */
@media (max-width: 768px) {
  .real-time-status {
    top: 60px;
    right: 12px;
    padding: 6px 12px;
    font-size: 11px;
  }
  
  .order-notification {
    top: 100px;
    right: 12px;
    max-width: 280px;
    padding: 10px 12px;
  }
  
  .notification-title {
    font-size: 13px;
  }
  
  .notification-message {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .real-time-status {
    position: relative;
    top: auto;
    right: auto;
    margin: 8px 0;
    align-self: flex-start;
  }
  
  .order-notification {
    top: 80px;
    right: 8px;
    left: 8px;
    max-width: none;
  }
}

/* Accesibilidad */
.real-time-status:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.order-updated:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

/* Modo de contraste alto */
@media (prefers-contrast: high) {
  .order-updated {
    border-width: 3px !important;
  }
  
  .real-time-status {
    border: 2px solid white;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  padding: 20px;
  text-align: center;
  color: #dc3545;
}

.support-form {
  padding: 20px;
}

.support-order-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.support-order-info h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.support-order-info p {
  margin: 4px 0;
  color: #666;
}

.support-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.support-option {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.support-option:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}
</style>