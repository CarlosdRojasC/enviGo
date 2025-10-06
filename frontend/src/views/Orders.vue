<template>

  <div class="font-sans p-6">
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
  @generate-labels="handleGenerateLabels"
  @create-order="handleCreateOrder"
  @go-to-page="goToPage"
  @change-page-size="changePageSize"
  @sort="handleSort"
  @view-circuit-plan="viewCircuitPlan"
  @sync-circuit="syncCircuitOrder"
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
  @readyToPrint="printManifest"
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
<Modal 
  v-model="showLabelsModal" 
  :title="`🏷️ Generar Etiquetas - ${(selectedOrders?.length || 0)} pedidos`" 
  width="800px"
>
  <LabelGenerator 
    :selected-order-ids="selectedOrders"
    @labels-generated="onLabelsGenerated"
    @close="showLabelsModal = false"
  />
</Modal>
<!-- Modal de Vista Previa de Etiquetas -->
<Modal 
  v-model="showLabelsPreviewModal" 
  title="🖨️ Vista Previa de Etiquetas" 
  width="900px"
>
  <div class="labels-preview-container">
    <div class="preview-header">
      <div class="preview-info">
        <h4>{{ labelsToPreview.length }} etiqueta(s) generada(s)</h4>
        <p>Revisa las etiquetas antes de imprimir</p>
      </div>
      <div class="preview-actions">
        <button @click="printLabelsFromPreview" class="btn btn-primary">
          🖨️ Imprimir Todas
        </button>
        <button @click="printLabelsDirectly" class="btn btn-print-direct" title="Impresión directa (sin ventana adicional)">
          ⚡ Imprimir Directo
        </button>
        <button @click="showLabelsPreviewModal = false" class="btn btn-secondary">
          Cerrar
        </button>
      </div>
    </div>
    
    <div class="labels-grid">
      <div 
        v-for="label in labelsToPreview" 
        :key="label.order_id"
        class="label-preview-card"
      >
        <div class="label-mini-preview">
          <div class="label-header-mini">
            <div class="company-name-mini">enviGo</div>
            <div class="envigo-code-mini">{{ label.unique_code }}</div>
          </div>
          <div class="label-content-mini">
            <div class="label-info-item">
              <strong>Pedido:</strong> #{{ label.order_number }}
            </div>
            <div class="label-info-item">
              <strong>Cliente:</strong> {{ label.customer_name }}
            </div>
            <div class="label-info-item">
              <strong>Teléfono:</strong> {{ label.customer_phone || 'No disponible' }}
            </div>
            <div class="label-info-item">
              <strong>Dirección:</strong> {{ label.shipping_address }}
            </div>
            <div class="label-info-item">
              <strong>Comuna:</strong> {{ label.shipping_commune }}
            </div>
            <div v-if="label.notes" class="label-info-item">
              <strong>Notas:</strong> {{ label.notes }}
            </div>
          </div>
        </div>
        <button 
          @click="printSingleLabelFromPreview(label)" 
          class="btn-single-print"
          title="Imprimir solo esta etiqueta"
        >
          🖨️ Individual
        </button>
      </div>
    </div>
  </div>
</Modal>

  </div>
  

</template>

<script>

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
const printManifest = ref(false);
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
const isGeneratingLabels = ref(false)
const showLabelsModal = ref(false)
const generatingLabels = ref(false)
const showLabelsPreviewModal = ref(false)
const labelsToPreview = ref([])
// ✅
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
    const response = await apiService.channels.getChannels(companyId)

    
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
    

  
    // Preparar datos del pedido
    const orderData = {
      ...newOrder.value,
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
async function printManifestDirectly(manifestId) {
  try {
    const url = `${import.meta.env.VITE_API_BASE_URL}/manifests/${manifestId}`;
    
    // Pedimos el manifiesto
    const response = await axios.get(url, {
      responseType: 'arraybuffer' // 👈 sirve para PDF y HTML
    });

    // Detectar tipo de contenido
    const contentType = response.headers['content-type'];

    if (contentType.includes('application/pdf')) {
      // 👉 Caso PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(blob);

      const printWindow = window.open(pdfUrl, '_blank', 'width=900,height=700');
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else if (contentType.includes('text/html')) {
      // 👉 Caso HTML
      const decoder = new TextDecoder('utf-8');
      const html = decoder.decode(response.data);

      const printWindow = window.open('', '_blank', 'width=900,height=700');
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else {
      throw new Error(`Tipo de contenido no soportado: ${contentType}`);
    }
  } catch (error) {
    console.error('❌ Error al imprimir manifiesto:', error);
    toast.error('Error al imprimir manifiesto');
  }
}
async function viewManifest(manifest) {
  const manifestUrl = `/app/manifest/${manifest._id}`;
  window.open(manifestUrl, '_blank', 'width=900,height=700');
}



async function generateManifestAndMarkReady() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona al menos un pedido');
    return;
  }

  const confirmMsg = `¿Deseas generar el manifiesto y marcar ${selectedOrders.value.length} pedido(s) como "Listo para Retiro"?\n\nEl manifiesto se imprimirá automáticamente.`;
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

    // 3. ✅ IMPRIMIR DIRECTAMENTE
viewManifest({ _id: manifest.manifest.id });

    toast.success(`✅ Manifiesto ${manifest.manifest.manifest_number} creado e impreso`);
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
  // Tracking en vivo con Circuit
  if (order.circuit_tracking_url || 
      (order.circuit_plan_id && order.circuit_driver_id && order.status === 'shipped')) {
    return true
  }
  
  // Tracking básico con Circuit
  if (order.circuit_plan_id || order.circuit_driver_id || order.circuit_stop_id) {
    return true
  }
  
  // Estados que pueden tener tracking
  return ['processing', 'shipped', 'ready_for_pickup'].includes(order.status)
}
async function loadCircuitDrivers() {
  try {
    console.log('👨‍💼 Cargando conductores de Circuit...')
    const response = await apiService.circuit.getDrivers()
    
    if (response.data?.drivers) {
      // Agregar a availableDrivers si existe esa variable
      availableDrivers.value = response.data.drivers.map(driver => ({
        id: driver.id,
        circuit_id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        is_active: driver.is_active,
        is_available: driver.is_available,
        is_on_route: driver.is_on_route,
        vehicle_type: driver.vehicle_type
      }))
      
      console.log(`✅ ${availableDrivers.value.length} conductores Circuit cargados`)
    }
    
  } catch (error) {
    console.error('❌ Error cargando conductores de Circuit:', error)
    // No mostrar error al usuario, es información adicional
  }
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
/**
 * Ver plan de Circuit
 */
async function viewCircuitPlan(order) {
  if (!order.circuit_plan_id) {
    toast.warning('Esta orden no tiene un plan de Circuit asociado')
    return
  }
  
  try {
    console.log('📋 Abriendo plan de Circuit:', order.circuit_plan_id)
    
    // Opción 1: Abrir en nueva pestaña (si tienes una URL de Circuit)
    // const circuitUrl = `https://app.getcircuit.com/plans/${order.circuit_plan_id}`
    // window.open(circuitUrl, '_blank')
    
    // Opción 2: Mostrar modal con detalles del plan
    const planResponse = await apiService.circuit.getPlan(order.circuit_plan_id)
    
    // Aquí podrías mostrar un modal con los detalles del plan
    // Por ahora, mostrar información básica
    const planInfo = planResponse.data
    
    const planDetails = `
Plan ID: ${planInfo.id || order.circuit_plan_id}
Estado: ${planInfo.status || 'Desconocido'}
Conductor: ${planInfo.driver?.name || 'No asignado'}
Paradas: ${planInfo.stops?.length || 0}
Fecha: ${planInfo.date || 'No especificada'}
    `.trim()
    
    // Mostrar en alert por ahora (puedes reemplazar con un modal mejor)
    alert(`Detalles del Plan Circuit:\n\n${planDetails}`)
    
  } catch (error) {
    console.error('❌ Error obteniendo plan de Circuit:', error)
    toast.error('Error al obtener información del plan de Circuit')
  }
}

/**
 * Sincronizar con Circuit
 */
async function syncCircuitOrder(order) {
  if (!order.circuit_plan_id && !order.circuit_driver_id) {
    toast.warning('Esta orden no está conectada con Circuit')
    return
  }
  
  try {
    console.log('🔄 Sincronizando orden con Circuit:', order.order_number)
    
    const orderRow = document.querySelector(`[data-order-id="${order._id}"]`)
    if (orderRow) {
      orderRow.classList.add('syncing-circuit')
    }
    
    // Opción 1: Endpoint específico de sync (si lo tienes)
    // await apiService.circuit.syncOrder(order._id)
    
    // Opción 2: Refrescar datos de la orden y del plan
    const [orderResponse, planResponse] = await Promise.allSettled([
      apiService.orders.getById(order._id),
      order.circuit_plan_id ? apiService.circuit.getPlan(order.circuit_plan_id) : Promise.resolve(null)
    ])
    
    if (orderResponse.status === 'fulfilled') {
      updateOrderLocally(orderResponse.value.data)
      console.log('✅ Datos de orden actualizados desde Circuit')
    }
    
    if (planResponse.status === 'fulfilled' && planResponse.value) {
      console.log('✅ Datos del plan Circuit actualizados:', planResponse.value.data)
    }
    
    toast.success(`Orden ${order.order_number} sincronizada con Circuit`)
    
  } catch (error) {
    console.error('❌ Error sincronizando con Circuit:', error)
    toast.error('Error al sincronizar con Circuit')
  } finally {
    const orderRow = document.querySelector(`[data-order-id="${order._id}"]`)
    if (orderRow) {
      orderRow.classList.remove('syncing-circuit')
    }
  }
}
async function openLiveTracking(order) {
  console.log('📍 Abriendo tracking Circuit para:', order.order_number, {
    has_circuit_url: !!order.circuit_tracking_url,
    has_plan_id: !!order.circuit_plan_id,
    has_driver: !!order.circuit_driver_id,
    status: order.status
  })
  
  // 1. Si ya tiene URL de tracking directo de Circuit
  if (order.circuit_tracking_url) {
    console.log('✅ Abriendo URL de tracking Circuit:', order.circuit_tracking_url)
    window.open(order.circuit_tracking_url, '_blank')
    return
  }
  
  // 2. Si tiene plan_id pero no URL, intentar obtener tracking
  if (order.circuit_plan_id) {
    try {
      const orderRow = document.querySelector(`[data-order-id="${order._id}"]`)
      if (orderRow) {
        orderRow.classList.add('refreshing-tracking')
      }
      
      const trackingResponse = await apiService.circuit.getPlanTracking(order.circuit_plan_id)
      
      if (trackingResponse.data?.tracking_url) {
        console.log('✅ URL de tracking obtenida de Circuit:', trackingResponse.data.tracking_url)
        
        // Actualizar orden localmente
        const updatedOrder = { ...order, circuit_tracking_url: trackingResponse.data.tracking_url }
        updateOrderLocally(updatedOrder)
        
        window.open(trackingResponse.data.tracking_url, '_blank')
      } else {
        console.log('⚠️ No hay URL de tracking disponible en Circuit')
        toast.warning('El plan de Circuit aún no tiene tracking disponible')
        openTrackingModal(order)
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo tracking de Circuit:', error)
      toast.error('Error obteniendo información de tracking de Circuit')
    } finally {
      const orderRow = document.querySelector(`[data-order-id="${order._id}"]`)
      if (orderRow) {
        orderRow.classList.remove('refreshing-tracking')
      }
    }
    return
  }
  
  // 3. Si no tiene datos de Circuit, abrir modal básico
  if (['processing', 'ready_for_pickup'].includes(order.status)) {
    console.log('ℹ️ Orden sin datos de Circuit, abriendo modal básico')
    openTrackingModal(order)
    return
  }
  
  // 4. Sin tracking disponible
  console.log('❌ No hay tracking disponible para esta orden')
  toast.warning('No hay información de tracking disponible para este pedido')
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
  window.location.href = `mailto:contacto@envigo.cl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  showSupportModal.value = false
}

function whatsappSupport(order) {
  const message = `Hola, tengo una consulta sobre mi pedido #${order.order_number}. Estado: ${getStatusName(order.status)}`
  const whatsappNumber = '56986147420'
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank')
  showSupportModal.value = false
}

function callSupport(order) {
  const phoneNumber = '+56986147420'
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

// ✅ NUEVO: Manejar generación de etiquetas
async function handleGenerateLabels() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona al menos un pedido para generar etiquetas.');
    return;
  }

  isGeneratingLabels.value = true;
  
  try {
    // 1. Llama a la API para generar los códigos de las etiquetas
    const response = await apiService.labels.generateBulk(selectedOrders.value);
    const generatedLabels = response.data.labels || [];

    if (generatedLabels.length === 0) {
      toast.warning('No se generaron nuevas etiquetas. Los pedidos podrían ya tener una.');
      clearSelection();
      return;
    }

    toast.success(`${generatedLabels.length} etiquetas generadas. Preparando PDF...`);
    
    // Actualiza los datos en la UI
    const generatedOrderIds = [];
    generatedLabels.forEach(label => {
      generatedOrderIds.push(label.order_id);
      const order = orders.value.find(o => o._id === label.order_id);
      if (order) {
        order.envigo_label = {
          unique_code: label.unique_code,
          generated_at: new Date().toISOString()
        };
      }
    });

    // 2. Llama al nuevo endpoint de PDF masivo con los IDs de las etiquetas recién generadas
    await printBulkLabelsPDF(generatedOrderIds);

    clearSelection();

  } catch (error) {
    console.error('Error en el proceso de generar e imprimir etiquetas:', error);
    toast.error('Ocurrió un error: ' + (error.response?.data?.error || error.message));
  } finally {
    isGeneratingLabels.value = false;
  }
}
async function printBulkLabelsPDF(orderIds) {
  if (!orderIds || orderIds.length === 0) return;

  try {
    const response = await apiService.labels.printBulkLabelsPDF(orderIds);
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    window.open(pdfUrl, '_blank');
    URL.revokeObjectURL(pdfUrl);

    // Marca todas las etiquetas como impresas de una sola vez
    await Promise.all(orderIds.map(id => markLabelAsPrinted(id)));

  } catch (error) {
    console.error('Error al imprimir PDF masivo:', error);
    toast.error('No se pudo generar el PDF masivo para impresión.');
  }
}

/**
 * Helper para marcar una etiqueta como impresa en el backend y la UI.
 * (Esta función ahora es correcta y no dará el error 'not defined')
 */
async function markLabelAsPrinted(orderId) {
  try {
    await apiService.labels.markPrinted(orderId);
    const order = orders.value.find(o => o._id === orderId);
    if (order && order.envigo_label) {
      order.envigo_label.printed_count = (order.envigo_label.printed_count || 0) + 1;
    }
  } catch (error) {
    // No mostramos error al usuario por esto, solo lo logueamos
    console.error(`Error marcando como impresa la orden ${orderId}:`, error);
  }
}

/**
 * ✅ AÑADE ESTA FUNCIÓN HELPER
 * Se encarga de pedir e imprimir un único PDF.
 */
async function printSingleLabelPDF(orderId, uniqueCode) {
  try {
    const response = await apiService.labels.printLabelPDF(orderId);
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    window.open(pdfUrl, '_blank');
    URL.revokeObjectURL(pdfUrl);

    await markLabelAsPrinted(orderId);
  } catch (error) {
    console.error(`Error al imprimir etiqueta ${uniqueCode}:`, error);
    toast.error(`No se pudo imprimir la etiqueta ${uniqueCode}.`);
  }
}
function getChannelDisplayName(channel) {
  const typeLabels = {
    'shopify': '🛍️ Shopify',
    'woocommerce': '🏪 WooCommerce', 
    'mercadolibre': '🛒 MercadoLibre',
    'general_store': '🏬 Tienda General',
    'jumpseller': '📦 Jumpseller',
  }
  
  const typeLabel = typeLabels[channel.channel_type] || '📦'
  return `${typeLabel} - ${channel.channel_name}`
}

function getChannelIcon(channelType) {
  const icons = {
    'shopify': '🛍️',
    'woocommerce': '🏪',
    'mercadolibre': '🛒', 
    'general_store': '🏬',
    'jumpseller': '📦',
  }
  return icons[channelType] || '📦'
}

function getChannelTypeName(channelType) {
  const names = {
    'shopify': 'Shopify Store',
    'woocommerce': 'WooCommerce',
    'mercadolibre': 'MercadoLibre',
    'general_store': 'Tienda General',
    'jumpseller': 'Jumpseller',
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
  // Cargar conductores de Circuit
  await loadCircuitDrivers()

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
