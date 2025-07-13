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
      @contact-support="contactSupport"
      @bulk-mark-ready="handleBulkMarkReady"
      @generate-manifest="generateManifestAndMarkReady"
      @bulk-export="handleBulkExport"
      @create-order="handleCreateOrder"
      @go-to-page="goToPage"
      @change-page-size="changePageSize"
      @sort="handleSort"
    />

    <!-- Modales existentes (mantener tal como están) -->
    <Modal v-model="showOrderDetailsModal" :title="`Pedido #${selectedOrder?.order_number}`" width="800px">
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
    </Modal>

    <Modal v-model="showTrackingModal" :title="`🚚 Tracking - Pedido #${selectedTrackingOrder?.order_number}`"
      width="700px">
      <OrderTracking 
        v-if="selectedTrackingOrder" 
        :order-id="selectedTrackingOrder._id" 
        @support-contact="handleTrackingSupport"
        @show-proof="handleShowProof"
      />
    </Modal>

    <Modal v-model="showProofModal" :title="`📋 Prueba de Entrega - #${selectedProofOrder?.order_number}`"
      width="700px">
      <div v-if="loadingOrderDetails" class="loading-state">
        <div class="loading-spinner"></div>
      </div>
      <ProofOfDelivery v-else-if="selectedProofOrder" :order="selectedProofOrder" />
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

// Estados de modales (mantener los existentes)
const selectedOrder = ref(null)
const showOrderDetailsModal = ref(false)
const selectedTrackingOrder = ref(null)
const showTrackingModal = ref(false)
const selectedProofOrder = ref(null)
const showProofModal = ref(false)
const supportOrder = ref(null)
const showSupportModal = ref(false)

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

function openLiveTracking(order) {
  if (order.shipday_tracking_url) {
    window.open(order.shipday_tracking_url, '_blank')
    console.log('📍 Abriendo tracking en vivo:', order.order_number)
  } else {
    toast.warning('No hay URL de tracking disponible')
  }
}

function openTrackingModal(order) {
  selectedTrackingOrder.value = order
  showTrackingModal.value = true
  console.log('🚚 Abriendo modal de tracking:', order.order_number)
}

function showProofOfDelivery(order) {
  selectedProofOrder.value = order
  showProofModal.value = true
  console.log('📸 Mostrando prueba de entrega:', order.order_number)
}

async function openOrderDetailsModal(order) {
  selectedOrder.value = null
  showOrderDetailsModal.value = true
  loadingOrderDetails.value = true
  
  try {
    const { data } = await apiService.orders.getById(order._id)
    selectedOrder.value = data
  } catch (error) {
    console.error("Error al obtener detalles del pedido:", error)
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
  selectedProofOrder.value = proofData.order
  showProofModal.value = true
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

// ==================== LIFECYCLE ====================

onMounted(async () => {
  try {
    await Promise.all([
      fetchOrders(),
      fetchChannels()
    ])
    lastUpdate.value = Date.now()
  } catch (error) {
    console.error('Error al inicializar Orders:', error)
    toast.error('Error al cargar la página')
  }
})

onBeforeUnmount(() => {
  if (autoRefreshEnabled.value) {
    stopAutoRefresh()
  }
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
</style>