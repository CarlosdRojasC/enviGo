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
<UnifiedOrdersFilters
  :filters="filters"
  :advanced-filters="advancedFilters"
  :filters-u-i="filtersUI"
  :companies="[]"
  :channels="channels"
  :available-communes="availableCommunes"
  :filter-presets="filterPresets"
  :active-filters-count="activeFiltersCount"
  :is-admin="false"
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
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
    </Modal>

<Modal v-model="showTrackingModal" :title="`🚚 Tracking - Pedido #${selectedTrackingOrder?.order_number}`"
  width="700px">
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
    <!-- Modal de Manifiesto -->
<ManifestModal 
  v-if="showManifestModal" 
  :manifestId="currentManifestId"
  @close="showManifestModal = false"
/>
<Modal v-model="showCreateOrderModal" title="➕ Crear Nuevo Pedido" width="800px">
  <div v-if="showCreateOrderModal" class="create-order-form">
    <form @submit.prevent="handleCreateOrderSubmit">
      <div class="form-section">
  <h4>🏪 Canal de Retiro</h4>
  <p class="section-description">Selecciona dónde el conductor retirará este pedido</p>
  
  <div class="form-grid">
    <div class="form-group full-width">
      <label class="required">Punto de Retiro</label>
      
      <!-- Loading state -->
      <div v-if="loadingChannels" class="channel-loading">
        <div class="loading-spinner"></div>
        <span>Cargando canales...</span>
      </div>
      
      <!-- No channels available -->
      <div v-else-if="!availableChannels.length" class="no-channels-warning">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <p><strong>No hay canales configurados</strong></p>
          <p>Tu empresa necesita tener al menos un canal configurado para crear pedidos.</p>
          <button 
            type="button" 
            @click="redirectToChannels" 
            class="btn-link"
          >
            → Configurar canales ahora
          </button>
        </div>
      </div>
      
      <!-- Channel selector -->
      <select 
        v-else
        v-model="newOrder.channel_id" 
        class="channel-selector" 
        required
      >
        <option value="" disabled>Selecciona dónde se retirará...</option>
        <option 
          v-for="channel in availableChannels" 
          :key="channel._id" 
          :value="channel._id"
        >
          {{ getChannelDisplayName(channel) }}
        </option>
      </select>
      
      <!-- Channel info preview -->
      <div v-if="selectedChannelInfo" class="channel-preview">
        <div class="channel-info-card">
          <div class="channel-header">
            <span class="channel-icon">{{ getChannelIcon(selectedChannelInfo.channel_type) }}</span>
            <div class="channel-details">
              <div class="channel-name">{{ selectedChannelInfo.channel_name }}</div>
              <div class="channel-type">{{ getChannelTypeName(selectedChannelInfo.channel_type) }}</div>
            </div>
          </div>
          <div class="channel-meta">
            <div class="meta-item" v-if="selectedChannelInfo.store_url">
              <span class="meta-icon">🌐</span>
              <span class="meta-text">{{ selectedChannelInfo.store_url }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <small class="help-text">
        💡 El conductor recibirá las instrucciones de retiro para este canal específico
      </small>
    </div>
  </div>
</div>
      <!-- Información del Cliente -->
      <div class="form-section">
        <h4>👤 Información del Cliente</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="required">Nombre del Cliente</label>
            <input 
              v-model="newOrder.customer_name" 
              type="text" 
              required 
              placeholder="Juan Pérez"
            />
          </div>
          
          <div class="form-group">
            <label>Email del Cliente</label>
            <input 
              v-model="newOrder.customer_email" 
              type="email" 
              placeholder="cliente@email.com"
            />
          </div>
          
          <div class="form-group">
            <label>Teléfono del Cliente</label>
            <input 
              v-model="newOrder.customer_phone" 
              type="tel" 
              placeholder="+56 9 1234 5678"
            />
          </div>
        </div>
      </div>

      <!-- Dirección de Entrega -->
      <div class="form-section">
        <h4>📍 Dirección de Entrega</h4>
        <div class="form-grid">
          <div class="form-group full-width">
            <label class="required">Dirección Completa</label>
            <input 
              v-model="newOrder.shipping_address" 
              type="text" 
              required 
              placeholder="Av. Providencia 1234, Dpto 567"
            />
          </div>
          
          <div class="form-group">
            <label class="required">Comuna</label>
            <input 
              v-model="newOrder.shipping_commune" 
              type="text" 
              required 
              placeholder="Providencia"
            />
          </div>
          
          <div class="form-group">
            <label>Región</label>
            <input 
              v-model="newOrder.shipping_state" 
              type="text" 
              value="Región Metropolitana"
              placeholder="Región Metropolitana"
            />
          </div>
        </div>
      </div>

      <!-- Información del Pedido -->
      <div class="form-section">
  <h4>📦 Información del Pedido</h4>
  <div class="form-grid">
    <div class="form-group">
      <label class="required">Número de Pedido</label>
      <input 
        v-model="newOrder.order_number" 
        type="text" 
        required 
        placeholder="Ej: PED-001, #12345, ORDER-ABC"
        maxlength="50"
      />
      <small class="help-text">Ingresa tu número de pedido interno</small>
    </div>
    
    <div class="form-group">
      <label>ID Externo (Opcional)</label>
      <input 
        v-model="newOrder.external_order_id" 
        type="text" 
        placeholder="ID de tu sistema de ventas"
        maxlength="100"
      />
      <small class="help-text">ID de tu tienda online, sistema POS, etc.</small>
    </div>
    
    <div class="form-group">
      <label class="required">Monto Total</label>
      <input 
        v-model.number="newOrder.total_amount" 
        type="number" 
        required 
        min="0" 
        step="0.01"
        placeholder="15000"
      />
      <small class="help-text">Valor total del pedido en pesos</small>
    </div>
    
    <div class="form-group">
      <label>Costo de Envío</label>
      <input 
        v-model.number="newOrder.shipping_cost" 
        type="number" 
        min="0" 
        step="0.01"
        placeholder="2500"
      />
      <small class="help-text">Costo del despacho (opcional)</small>
    </div>
    
    <div class="form-group full-width">
      <label>Notas del Pedido</label>
      <textarea 
        v-model="newOrder.notes" 
        rows="3"
        placeholder="Instrucciones especiales para la entrega..."
        maxlength="500"
      ></textarea>
      <small class="help-text">Información adicional para el delivery</small>
    </div>
  </div>
</div>

      <!-- Botones -->
      <div class="modal-actions">
        <button 
          type="button" 
          @click="closeCreateOrderModal" 
          class="btn-cancel"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          :disabled="isCreatingOrder" 
          class="btn-save"
        >
          {{ isCreatingOrder ? '⏳ Creando...' : '💾 Crear Pedido' }}
        </button>
      </div>
    </form>
  </div>
</Modal>
  </div>
  
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
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
import ExportDropdown from '../components/Orders/ExportDropdown.vue'
import UnifiedOrdersFilters from '../components/UnifiedOrdersFilters.vue'
import ManifestModal from '../components/ManifestModal.vue';



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
  companyId,
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
  applySearch,
  resetFilters,
  handleFilterChange,  // NUEVA FUNCIÓN
  clearAllFilters,
  fetchAvailableCommunes, // ✨ NECESITAMOS ESTA FUNCIÓN
  addCommune,
  removeCommune,
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
const showManifestModal = ref(false);
const currentManifestId = ref(null);
// ==================== NUEVO STATE PARA CANALES ====================
const availableChannels = ref([])
const loadingChannels = ref(false)
// Estados de modales (mantener los existentes)
const selectedOrder = ref(null)
const showOrderDetailsModal = ref(false)
const selectedTrackingOrder = ref(null)
const showTrackingModal = ref(false)
const selectedProofOrder = ref(null)
const showProofModal = ref(false)
const supportOrder = ref(null)
const showSupportModal = ref(false)
// Variables para crear pedido - AGREGAR ESTAS
const showCreateOrderModal = ref(false)
const newOrder = ref({})
const isCreatingOrder = ref(false)

// ⚡ TIEMPO REAL: Estado para actualización automática
const realTimeEnabled = ref(true)
const lastOrderUpdate = ref(null)
const pendingOrderUpdates = ref(new Map()) // orderId -> updateData
const orderUpdateQueue = ref([]) // Cola de notificaciones para mostrar

// ==================== COMPUTED ====================
// ==================== COMPUTED PARA CANALES ====================
const selectedChannelInfo = computed(() => {
  if (!newOrder.value.channel_id) return null
  return availableChannels.value.find(channel => channel._id === newOrder.value.channel_id)
})
/**
 * Estadísticas para el header
 */
const orderStats = computed(() => ({
 total: orders.value.length,
  pending: orders.value.filter(o => o.status === 'pending').length,
  ready_for_pickup: orders.value.filter(o => o.status === 'ready_for_pickup').length,
  warehouse_received: orders.value.filter(o => o.status === 'warehouse_received').length, // 🆕
  processing: orders.value.filter(o => o.status === 'processing').length,
  shipped: orders.value.filter(o => o.status === 'shipped').length,
  delivered: orders.value.filter(o => o.status === 'delivered').length,
  cancelled: orders.value.filter(o => o.status === 'cancelled').length
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

async function handleExport(exportConfig = {}) {
  try {
    const { type = 'excel', filters = {} } = exportConfig
    
    console.log('📤 Exportando pedidos:', { type, filters: allFilters.value })
    
    // Siempre usar la nueva exportación general
    await exportOrders('excel', allFilters.value)
    toast.success('✅ Exportación de pedidos completada')
    
  } catch (error) {
    console.error('❌ Error en handleExport:', error)
    toast.error('Error al exportar pedidos')
  }
}

function handleCreateOrder() {
  console.log('➕ Abriendo modal crear pedido')
  
  // Inicializar formulario
  newOrder.value = {
    channel_id: '',         // ✅ NUEVO
    order_number: '',       
    external_order_id: '',  
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    shipping_commune: '',
    shipping_state: 'Región Metropolitana',
    total_amount: 0,
    shipping_cost: 0,
    notes: ''
  }
  
  showCreateOrderModal.value = true
  
  // ✅ NUEVO: Cargar canales cuando abre el modal
  loadUserChannels()
}
// Función para cerrar modal - AGREGAR
function closeCreateOrderModal() {
  showCreateOrderModal.value = false
  newOrder.value = {}
  isCreatingOrder.value = false
}

// Función para crear pedido - AGREGAR
async function handleCreateOrderSubmit() {
  
   // Validación básica
  if (!newOrder.value.order_number?.trim()) {
    toast.warning('Por favor, ingrese el número de pedido')
    return
  }
  if (!newOrder.value.customer_name?.trim()) {
    toast.warning('Por favor, ingrese el nombre del cliente')
    return
  }
  
  if (!newOrder.value.shipping_address?.trim()) {
    toast.warning('Por favor, ingrese la dirección de envío')
    return
  }
  
  if (!newOrder.value.shipping_commune?.trim()) {
    toast.warning('Por favor, ingrese la comuna')
    return
  }
  
  if (!newOrder.value.total_amount || newOrder.value.total_amount <= 0) {
    toast.warning('Por favor, ingrese un monto total válido')
    return
  }
  // ✅ NUEVA VALIDACIÓN: Canal requerido
  if (!newOrder.value.channel_id) {
    toast.warning('Por favor, selecciona el canal de retiro')
    return
  }
  
  // Validación básica (mantener las existentes)
  if (!newOrder.value.order_number?.trim()) {
    toast.warning('Por favor, ingrese el número de pedido')
    return
  }
  
  isCreatingOrder.value = true
  
  try {
    console.log('➕ Creando pedido:', newOrder.value)
    
    // Verificar que la empresa tenga canales
    if (!channels.value || channels.value.length === 0) {
      toast.warning('Su empresa no tiene canales configurados. Configure uno primero en la sección Canales.')
      return
    }
    
    // Preparar datos del pedido
    const orderData = {
      ...newOrder.value,
      channel_id: newOrder.value.channel_id, // Usar el primer canal disponible
      order_number: newOrder.value.order_number,
      external_order_id: `manual-company-${Date.now()}`,
      order_date: new Date().toISOString(),
      status: 'pending'
    }
    
    console.log('📦 Datos del pedido a crear:', orderData)
    
    // Crear el pedido
    const response = await apiService.orders.create(orderData)
    
    console.log('✅ Pedido creado exitosamente:', response.data)
    toast.success(`✅ Pedido #${response.data.order_number} creado exitosamente`)
    
    // Cerrar modal y refrescar lista
    closeCreateOrderModal()
    await fetchOrders()
    
  } catch (error) {
    console.error('❌ Error creando pedido:', error)
    toast.error('Error al crear el pedido: ' + (error.response?.data?.error || error.message))
  } finally {
    isCreatingOrder.value = false
  }
}

function handleSearchEvent(newSearchTerm) {
  applySearch(newSearchTerm);
}

// Función que se llamará desde el evento @filter-change de OrdersFilters
function handleFilterChangeEvent(key, value) {
  handleFilterChange(key, value);
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
    toast.warning('Selecciona al menos un pedido');
    return;
  }

  const confirmMsg = `¿Deseas generar el manifiesto y marcar ${selectedOrders.value.length} pedido(s) como "Listo para Retiro"?`;
  if (!confirm(confirmMsg)) return;

  try {
    console.log('📋 Creando manifiesto guardado...');
    
    // 1. Crear manifiesto en la base de datos
    const response = await apiService.manifests.create(selectedOrders.value);
    const manifest = response.data;
    
    console.log('✅ Manifiesto creado:', manifest);
    
    // 2. Actualizar órdenes localmente
    orders.value.forEach(order => {
      if (selectedOrders.value.includes(order._id)) {
        order.status = 'ready_for_pickup';
        order.manifest_id = manifest.manifest.id;
        order.updated_at = new Date().toISOString();
      }
    });

// 3. ✅ NUEVO: Abrir modal en lugar de nueva pestaña
currentManifestId.value = manifest.manifest.id;
showManifestModal.value = true;
    
    toast.success(`✅ Manifiesto ${manifest.manifest.manifest_number} creado exitosamente`);
    clearSelection();

  } catch (error) {
    console.error('❌ Error creando manifiesto:', error);
    
    if (error.response?.status === 403) {
      toast.error('No tienes permisos para crear manifiestos');
    } else {
      toast.error('Error al crear el manifiesto');
    }
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
  
  // Fallback: lógica básica
  if (order.status !== 'delivered') return false
  return !!(
    order.proof_of_delivery?.photo_url || 
    order.proof_of_delivery?.signature_url ||
    order.podUrls?.length > 0 ||
    order.signatureUrl
  )
}

/**
 * Obtener configuración del botón de acción
 */
function getActionButton(order) {
  if (orderTrackingRef.value?.getActionButton) {
    return orderTrackingRef.value.getActionButton(order)
  }
  
  // Fallback: lógica básica
  if (order.status === 'delivered') {
    return {
      type: 'proof',
      label: 'Ver Prueba de Entrega',
      icon: '📸',
      class: 'btn-success',
      available: hasProofOfDelivery(order)
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
  selectedTrackingOrder.value = order
  showTrackingModal.value = true
  console.log('🚚 Abriendo modal de tracking:', order.order_number)
}

async function showProofOfDelivery(order) {
  selectedProofOrder.value = null;      // 1. Limpia el estado anterior
  loadingOrderDetails.value = true;   // 2. Activa el indicador de carga
  showProofModal.value = true;          // 3. Muestra el modal (que mostrará el spinner)

  try {
    // 4. Llama a la API para obtener los datos más recientes y completos
    const { data } = await apiService.orders.getById(order._id);
    
    // 5. Asigna los datos frescos para que el componente los muestre
    selectedProofOrder.value = data;
    console.log('✅ Prueba de entrega cargada para el modal:', data);

  } catch (error) {
    console.error('❌ Error cargando la prueba de entrega:', error);
    toast.error('No se pudo cargar la información de la entrega.');
    showProofModal.value = false; // Cierra el modal si hay un error
  } finally {
    loadingOrderDetails.value = false; // 6. Desactiva el indicador de carga
  }
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
    ready_for_pickup: 'Listo para Retiro',
    warehouse_received: '📦 En Bodega',      // 🆕 AGREGAR
    processing: 'Procesando',
    shipped: '🚚 En Ruta',                  // 🔧 MEJORAR con emoji
    delivered: '✅ Entregado',
    invoiced: '🧾 Facturado',
    cancelled: '❌ Cancelado'
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



// ==================== ✨ LÓGICA DE CARGA CORREGIDA ✨ ====================

// Este 'watch' es ahora el ÚNICO responsable de cargar datos
// que dependen del ID de la compañía.
watch(companyId, (newId, oldId) => {
  // Solo actuamos si el nuevo ID es válido y diferente al anterior (o si el anterior era nulo)
  if (newId && newId !== oldId) {
    console.log(`✅ ID de Compañía detectado: ${newId}. Cargando datos dependientes...`);

    // 1. Cargar canales para la compañía
    fetchChannels();
    
    // 2. Cargar las comunas disponibles para esa compañía
    fetchAvailableCommunes(newId);
  }
}, {
  immediate: true // Intenta ejecutar el watch en cuanto el componente se monta.
                  // Si el ID ya está en el store de auth, se ejecuta al instante.
                  // Si no, esperará hasta que el ID aparezca.
});
watch(filters, (newFilters) => {
  logger.dev('[Orders] 🕵️‍♂️ Filtros cambiaron, recargando datos...');
  
  // Reinicia la paginación a la página 1
  pagination.value.page = 1; 
  
  // Llama a la función principal para buscar con los nuevos filtros
  fetchOrders(newFilters);

}, { deep: true });

async function loadUserChannels() {
  console.log('🚀 [loadUserChannels] INICIANDO...')
  
  // ✅ USAR auth.companyId que SÍ funciona (no auth.user?.company_id)
  const companyId = auth.companyId
  
  console.log('👤 [loadUserChannels] Debug de usuario:', {
    user_exists: !!auth.user,
    user_role: auth.user?.role,
    company_id_from_computed: companyId,  // ✅ Este funciona
    company_id_from_user: auth.user?.company_id,  // ❌ Este es undefined
    auth_logged_in: auth.isLoggedIn
  })
  
  // ✅ USAR companyId en lugar de auth.user?.company_id
  if (!companyId) {
    console.log('❌ [loadUserChannels] No companyId found from computed')
    toast.warning('Error: No se pudo obtener la información de tu empresa')
    return
  }
  
  loadingChannels.value = true
  
  try {
    console.log(`🔍 [loadUserChannels] Cargando canales para empresa: ${companyId}`)
    
    // ✅ USAR companyId (no auth.user.company_id)
    const response = await apiService.companies.getChannels(companyId)
    
    console.log('📡 [loadUserChannels] Respuesta de la API:', response)
    
    // Procesar respuesta
    let allChannels = []
    
    if (response?.data?.data && Array.isArray(response.data.data)) {
      allChannels = response.data.data
      console.log('✅ [loadUserChannels] Formato correcto detectado')
    } else if (response?.data && Array.isArray(response.data)) {
      allChannels = response.data
      console.log('✅ [loadUserChannels] Formato alternativo detectado')
    } else {
      console.log('❓ [loadUserChannels] Formato inesperado:', response?.data)
      allChannels = []
    }
    
    console.log('📊 [loadUserChannels] Análisis de canales:', {
      total: allChannels.length,
      activos: allChannels.filter(c => c.is_active).length,
      inactivos: allChannels.filter(c => !c.is_active).length
    })
    
    // Filtrar canales activos y utilizables
    const usableChannels = allChannels.filter(channel => {
      const isActive = channel.is_active === true
      const hasName = channel.channel_name && channel.channel_name.trim() !== ''
      const belongsToCompany = channel.company_id?.toString() === companyId.toString()
      
      console.log(`🔍 [loadUserChannels] Evaluando canal "${channel.channel_name}":`, {
        id: channel._id,
        is_active: isActive,
        has_name: hasName,
        belongs_to_company: belongsToCompany,
        will_include: isActive && hasName && belongsToCompany
      })
      
      return isActive && hasName && belongsToCompany
    })
    
    availableChannels.value = usableChannels
    
    // Mensajes informativos según el resultado
    if (allChannels.length === 0) {
      console.log('⚠️ [loadUserChannels] No hay canales configurados')
      toast.warning('Tu empresa no tiene canales configurados')
    } else if (usableChannels.length === 0) {
      const inactiveCount = allChannels.filter(c => !c.is_active).length
      console.log('⚠️ [loadUserChannels] Canales no utilizables:', {
        total: allChannels.length,
        inactivos: inactiveCount
      })
      
      if (inactiveCount > 0) {
        toast.warning(`Tienes ${inactiveCount} canal(es) inactivo(s). Actívalos en la sección Canales.`)
      } else {
        toast.warning('No hay canales utilizables para crear pedidos')
      }
    } else {
      console.log('✅ [loadUserChannels] Canales utilizables cargados:', 
        usableChannels.map(c => `${c.channel_name} (${c.channel_type})`).join(', ')
      )
      toast.success(`${usableChannels.length} canal(es) disponible(s)`)
    }
    
  } catch (error) {
    console.error('❌ [loadUserChannels] Error completo:', {
      error: error,
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data,
      companyId_used: companyId
    })
    
    // Manejo de errores específicos con mensajes útiles
    if (error.response?.status === 404) {
      toast.error('No se encontraron canales para tu empresa')
    } else if (error.response?.status === 403) {
      toast.error('No tienes permisos para ver los canales de esta empresa')
    } else {
      toast.error('Error cargando canales: ' + (error.response?.data?.error || error.message))
    }
    
    availableChannels.value = []
  } finally {
    loadingChannels.value = false
    console.log('🏁 [loadUserChannels] FINALIZADO')
  }
}
function getChannelDisplayName(channel) {
  const typeLabels = {
    'shopify': '🛍️ Shopify',
    'woocommerce': '🏪 WooCommerce', 
    'mercadolibre': '🛒 MercadoLibre',
    'general_store': '🏬 Tienda General'
  }
  
  const typeLabel = typeLabels[channel.channel_type] || '📦'
  return `${typeLabel} - ${channel.channel_name}`
}

function getChannelIcon(channelType) {
  const icons = {
    'shopify': '🛍️',
    'woocommerce': '🏪',
    'mercadolibre': '🛒', 
    'general_store': '🏬'
  }
  return icons[channelType] || '📦'
}

function getChannelTypeName(channelType) {
  const names = {
    'shopify': 'Shopify Store',
    'woocommerce': 'WooCommerce',
    'mercadolibre': 'MercadoLibre',
    'general_store': 'Tienda General'
  }
  return names[channelType] || channelType
}

function redirectToChannels() {
  router.push('/app/channels')
  closeCreateOrderModal()
  toast.info('Redirigiendo a la configuración de canales...')
}

// ==================== LIFECYCLE ====================

onMounted(async () => {
  console.log('🚀 Orders.vue montado. Esperando ID de compañía para cargas secundarias...');

  try {
    // 1. Cargamos ÚNICAMENTE la lista de pedidos.
    // El backend ya debería saber qué pedidos mostrar basado en el token del usuario.
    await fetchOrders();
    lastUpdate.value = Date.now();
await fetchAvailableCommunes();
    // 2. Configuramos los listeners de tiempo real.
    // No dependen de que los canales o comunas estén cargados.
    window.addEventListener('orderUpdated', handleOrderUpdate);

  } catch (error) {
    console.error('❌ Error en la carga inicial de pedidos:', error);
    toast.error('Error al cargar la lista de pedidos.');
  }
});
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
/* ==================== ESTILOS PARA SELECTOR DE CANAL ==================== */

.section-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 16px 0;
  font-weight: normal;
}

.channel-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #6b7280;
}

.no-channels-warning {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  color: #92400e;
}

.warning-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-content p {
  margin: 0 0 8px 0;
}

.warning-content p:last-child {
  margin-bottom: 0;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  font-weight: 500;
}

.btn-link:hover {
  color: #1d4ed8;
}

.channel-selector {
  margin-bottom: 12px;
}

.channel-preview {
  margin-top: 12px;
}

.channel-info-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.channel-icon {
  font-size: 20px;
}

.channel-details {
  flex: 1;
}

.channel-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.channel-type {
  color: #6b7280;
  font-size: 12px;
}

.channel-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4b5563;
}

.meta-icon {
  font-size: 12px;
}

.meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.orders-page {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f8fafc;
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
/* Estilos para modal de crear pedido */
.create-order-form {
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
}

.form-section {
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-group input,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}
.help-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  font-style: italic;
}

.form-group input:focus + .help-text,
.form-group textarea:focus + .help-text {
  color: #3b82f6;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-save {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .btn-cancel,
  .btn-save {
    width: 100%;
  }
}
</style>