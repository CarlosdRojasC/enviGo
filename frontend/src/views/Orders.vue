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
  @generate-labels="handleGenerateLabels"
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
<Modal 
  v-model="showLabelsModal" 
  :title="`🏷️ Generar Etiquetas - ${selectedOrders.length} pedidos`" 
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
  <div class="format-selector">
    <label>Formato de etiqueta:</label>
    <select v-model="selectedFormat" class="format-dropdown">
      <option value="rectangular">📄 Rectangular (A4)</option>
      <option value="square">⬜ Cuadrada (50x50mm)</option>
      <option value="zebra">🦓 Zebra ZPL</option>
    </select>
  </div>
  
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
const selectedFormat = ref('rectangular') // Formato por defecto

// ✅ NUEVO: Estado para modal de etiquetas
const showLabelsModal = ref(false)
const generatingLabels = ref(false)
const showLabelsPreviewModal = ref(false)
const labelsToPreview = ref([])
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
function createSquareLabelHTML(labels) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiquetas Cuadradas enviGo</title>
  <style>
    @page {
      size: A4;
      margin: 5mm;
    }
    
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    
    .labels-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3mm;
      padding: 5mm;
    }
    
    .square-label {
      width: 45mm;
      height: 45mm;
      border: 2px solid #8BC53F;
      border-radius: 6px;
      padding: 2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      background: white;
      position: relative;
      overflow: hidden;
    }
    
    .square-label::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
    }
    
    .label-header-square {
      text-align: center;
      border-bottom: 1px solid #8BC53F;
      padding-bottom: 1mm;
      margin-bottom: 1mm;
    }
    
    .company-logo-square {
      width: 15mm;
      height: auto;
      max-height: 6mm;
      margin: 0 auto 1mm;
      display: block;
    }
    
    .company-name-square {
      font-size: 10px;
      font-weight: bold;
      color: #8BC53F;
      margin: 0;
    }
    
    .envigo-code-square {
      background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
      color: white;
      font-size: 8px;
      font-weight: bold;
      padding: 1mm;
      border-radius: 3px;
      text-align: center;
      margin: 1mm 0;
    }
    
    .label-info-square {
      flex: 1;
      font-size: 7px;
      line-height: 1.2;
    }
    
    .info-item-square {
      margin: 0.5mm 0;
      display: flex;
      flex-direction: column;
    }
    
    .info-label-square {
      font-weight: 600;
      color: #8BC53F;
      font-size: 6px;
      text-transform: uppercase;
    }
    
    .info-value-square {
      color: #2C2C2C;
      font-weight: 500;
      word-wrap: break-word;
    }
    
    @media print {
      body { 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="labels-grid">
    ${labels.map(label => `
      <div class="square-label">
        <div class="label-header-square">
          <img src="data:image/png;base64,${getLogoBase64()}" alt="enviGo" class="company-logo-square" />
          <div class="company-name-square">enviGo</div>
        </div>
        
        <div class="envigo-code-square">${label.unique_code}</div>
        
        <div class="label-info-square">
          <div class="info-item-square">
            <span class="info-label-square">Pedido</span>
            <span class="info-value-square">#${label.order_number}</span>
          </div>
          
          <div class="info-item-square">
            <span class="info-label-square">Cliente</span>
            <span class="info-value-square">${label.customer_name}</span>
          </div>
          
          <div class="info-item-square">
            <span class="info-label-square">Comuna</span>
            <span class="info-value-square">${label.shipping_commune}</span>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`
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
    toast.warning('Selecciona al menos un pedido')
    return
  }

  const validOrders = selectedOrders.value.filter(orderId => {
    const order = orders.value.find(o => o._id === orderId)
    return order && ['pending', 'ready_for_pickup'].includes(order.status)
  })

  if (validOrders.length === 0) {
    toast.error('Los pedidos seleccionados no son válidos para generar etiquetas')
    return
  }

  generatingLabels.value = true
  
  try {
    const response = await apiService.labels.generateBulk(validOrders)
    
    toast.success(`${response.data.total} etiquetas generadas exitosamente`)
    
    // Actualizar pedidos localmente
    response.data.labels.forEach(label => {
      const orderIndex = orders.value.findIndex(o => o._id === label.order_id)
      if (orderIndex !== -1) {
        orders.value[orderIndex].envigo_label = {
          unique_code: label.unique_code,
          generated_at: new Date()
        }
      }
    })

    // ✅ CAMBIO: Mostrar vista previa en lugar de preguntar
    labelsToPreview.value = response.data.labels
    showLabelsPreviewModal.value = true
    clearSelection()
    
  } catch (error) {
    console.error('Error generando etiquetas:', error)
    toast.error('Error generando etiquetas: ' + (error.response?.data?.error || error.message))
  } finally {
    generatingLabels.value = false
  }
}
function createPrintableLabelsHTML(labels) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiquetas enviGo - ${labels.length} etiquetas</title>
  <style>
        @page {
      size: A4;
      margin: 5mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.3;
      color: #2C2C2C;
      background: white;
    }
    
    .labels-container {
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }
    
    .label {
      width: 190mm;
      height: 65mm;
      border: 2px solid #8BC53F;
      border-radius: 8px;
      padding: 4mm;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      background: white;
      position: relative;
      overflow: hidden;
    }
    
    /* Diseño con gradiente sutil */
    .label::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
    }
    
    .label-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #8BC53F;
      padding-bottom: 3mm;
      margin-bottom: 3mm;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    
    .company-logo {
      width: 25mm;
      height: auto;
      max-height: 12mm;
    }
    
    .company-info {
      display: flex;
      flex-direction: column;
    }
    
    .company-name {
      font-size: 16px;
      font-weight: 800;
      color: #8BC53F;
      margin: 0;
    }
    
    .company-tagline {
      font-size: 8px;
      color: #64748B;
      margin: 0;
      font-weight: 500;
    }
    
    .envigo-code {
      background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
      color: white;
      font-size: 14px;
      font-weight: bold;
      padding: 2mm 4mm;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(139, 197, 63, 0.3);
    }
    
    .label-content {
      display: flex;
      flex: 1;
      gap: 5mm;
    }
    
    .order-section {
      flex: 1.2;
      background: #F8FAFC;
      padding: 3mm;
      border-radius: 6px;
      border-left: 3px solid #8BC53F;
    }
    
    .address-section {
      flex: 1;
      background: #F0F9FF;
      padding: 3mm;
      border-radius: 6px;
      border-left: 3px solid #3B82F6;
    }
    
    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #2C2C2C;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-line {
      margin: 1.5mm 0;
      font-size: 9px;
      display: flex;
      align-items: flex-start;
    }
    
    .info-label {
      display: inline-block;
      width: 18mm;
      font-weight: 600;
      color: #64748B;
      margin-right: 2mm;
    }
    
    .info-value {
      color: #2C2C2C;
      font-weight: 500;
      flex: 1;
    }
    
    .address-text {
      font-size: 9px;
      line-height: 1.4;
      color: #2C2C2C;
      font-weight: 500;
    }
    
    .notes-section {
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 1px dashed #8BC53F;
      background: #FFFBEB;
      padding: 2mm;
      border-radius: 4px;
    }
    
    .notes-title {
      font-size: 8px;
      font-weight: 600;
      color: #92400E;
      margin-bottom: 1mm;
    }
    
    .notes-text {
      font-size: 8px;
      color: #78350F;
      font-style: italic;
      line-height: 1.3;
    }
    
    /* Salto de página cada 3 etiquetas para mejor distribución */
    .label:nth-child(3n) {
      page-break-after: always;
    }
    
    @media print {
      body { 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="labels-container">
    ${labels.map(label => `
      <div class="label">
        <div class="label-header">
  <div class="logo-section">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFoGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI1LTA3LTIyPC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPmE1NTVlYjQzLTA5OGItNDA1OS1iYjNmLWM0MzMwYTg0ZTA2NzwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6Q29udGFpbnNBaUdlbmVyYXRlZENvbnRlbnQ9J2h0dHBzOi8vY2FudmEuY29tL2V4cG9ydCc+CiAgPENvbnRhaW5zQWlHZW5lcmF0ZWRDb250ZW50OkNvbnRhaW5zQWlHZW5lcmF0ZWRDb250ZW50PlllczwvQ29udGFpbnNBaUdlbmVyYXRlZENvbnRlbnQ6Q29udGFpbnNBaUdlbmVyYXRlZENvbnRlbnQ+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOmRjPSdodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyc+CiAgPGRjOnRpdGxlPgogICA8cmRmOkFsdD4KICAgIDxyZGY6bGkgeG1sOmxhbmc9J3gtZGVmYXVsdCc+RW52aWdvIExvZ28gLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPkNhcmxvcyBEYW5pZWw8L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSAoUmVuZGVyZXIpIGRvYz1EQUdzc2hBLWlpTSB1c2VyPVVBRk1zSFZ2TjdBIGJyYW5kPUJBRk1zRGVmNTJJIHRlbXBsYXRlPTwveG1wOkNyZWF0b3JUb29sPgogPC9yZGY6RGVzY3JpcHRpb24+CjwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9J3InPz7svFX/AAEM0UlEQVR4nOzdebRlZXnn8d/zvHvvc84da6awGEpUVDRERRYSURQ1thpUdGE6CbYujVPHMXYkRmOXodskphuH1WowGtuYOKAtNkZCAAEHBAplkEEoKKx5vHVv1R3OsPf7Pk//se+tKgz9R7cUVez6fdaqqlt1q849Z6916nvfvd93vwIiIiJ6zJPD/QSIiIjo18egExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw6ERFRAzDoREREDcCgExERNQCDTkRE1AAMOhERUQMw6ERERA3AoBMRETUAg05ERNQADDoREVEDMOhEREQNwKATERE1AINORETUAAw60dHn/+V974fsWRDRIyoc7idARIecANBf89/zm3+iIxzfpETNJQCwasmqYmpuanm0tFIEx6qEk2KKyxxYHFTHIMgAuJtXDp+2ZNNZls2KyNayqjYGzXZL8p0rjz9m76ZNmxZG7By5Ex1hGHSiZhEAfsEFF+hll152QoV0hqX0QsCfLSLLIFgEaMcduWr99hcRiCjcDSKAuwPQpNDS3GdFMekpbYT62pTsxqLI13a73T0Hf73D9FqJ6CAMOlEzyMolK2VqZqpV5K1T+1Xvje7+Knc/FgBU1d3dAEAkiIhAVeEOiAAppfmwH/gvwQ0uIsjzXMxN67/j0czvg9lXW0Xr22UqN+R5Xs7OzgKAHZZXTkQAGHSiJpAlQ0vGe6n3kpjS70L8+QCWqSrMfH707AKIAy7u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c58/42H+/1+zfT+fw/V+HInH38PtP+ExiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IEI9BBCCKEHItBDCCGEHohADyGEEHogAj2EEELogQj0EEIIoQci0EMIIYQeiEAPIYQQeiACPYQQQuiBCPQQQgihByLQQwghhB6IQA8hhBB6IAI9hBBC6IH/H8o0+5CA89C1AAAAAElFTkSuQmCC" alt="enviGo" class="company-logo" />
    <div class="company-info">
      <div class="company-name">enviGo</div>
      <div class="company-tagline">Logistics & Delivery</div>
    </div>
  </div>
  <div class="envigo-code">${label.unique_code}</div>
</div>
        <div class="label-content">
          <div class="order-info">
            <div class="info-line">
              <strong>Pedido:</strong> #${label.order_number}
            </div>
            <div class="info-line">
              <strong>Cliente:</strong> ${label.customer_name}
            </div>
            <div class="info-line">
              <strong>Teléfono:</strong> ${label.customer_phone || 'No disponible'}
            </div>
            <div class="info-line">
              <strong>Monto:</strong> ${label.total_amount ? new Intl.NumberFormat('es-CL').format(label.total_amount) : 'N/A'}
            </div>
            ${label.notes ? `
              <div class="notes">
                <strong>Notas:</strong> ${label.notes}
              </div>
            ` : ''}
          </div>
          <div class="address-info">
            <div class="info-line">
              <strong>Dirección:</strong>
            </div>
            <div class="address-text">
              ${label.shipping_address}<br>
              ${label.shipping_commune}<br>
              ${label.shipping_state || 'Región Metropolitana'}
            </div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`
}
function printLabelsFromPreview() {
  if (labelsToPreview.value.length === 0) return
  
  console.log('🖨️ Imprimiendo etiquetas directamente:', labelsToPreview.value.length)
  
  // ✅ Crear elemento de impresión en el DOM actual
  const printContent = createPrintableLabelsHTML(labelsToPreview.value)
  
  // ✅ Crear iframe oculto para impresión
  const printFrame = document.createElement('iframe')
  printFrame.style.position = 'absolute'
  printFrame.style.left = '-9999px'
  printFrame.style.top = '-9999px'
  printFrame.style.width = '0px'
  printFrame.style.height = '0px'
  
  document.body.appendChild(printFrame)
  
  try {
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document
    frameDoc.open()
    frameDoc.write(printContent)
    frameDoc.close()
    
    // ✅ Imprimir directamente cuando esté listo
    printFrame.onload = () => {
      setTimeout(() => {
        printFrame.contentWindow.focus()
        printFrame.contentWindow.print()
        
        // ✅ Limpiar después de imprimir
        setTimeout(() => {
          document.body.removeChild(printFrame)
        }, 1000)
      }, 500)
    }
    
    // ✅ Marcar etiquetas como impresas
    labelsToPreview.value.forEach(label => {
      markLabelAsPrinted(label.order_id)
    })
    
    toast.success(`✅ ${labelsToPreview.value.length} etiquetas enviadas a impresión`)
    showLabelsPreviewModal.value = false
    
  } catch (error) {
    console.error('❌ Error en impresión:', error)
    toast.error('Error al preparar impresión')
    document.body.removeChild(printFrame)
  }
}
function printLabelsDirectly() {
  if (labelsToPreview.value.length === 0) return
  
  // ✅ Ocultar temporalmente el contenido de la página
  const originalContents = document.body.innerHTML
  const printContent = createPrintableLabelsHTML(labelsToPreview.value)
  
  // ✅ Reemplazar el contenido temporalmente
  document.body.innerHTML = printContent
  
  // ✅ Imprimir directamente
  window.print()
  
  // ✅ Restaurar el contenido original después de imprimir
  setTimeout(() => {
    document.body.innerHTML = originalContents
    
    // ✅ Reactivar Vue (importante después de cambiar innerHTML)
    location.reload() // Opción simple pero efectiva
  }, 1000)
  
  // ✅ Marcar como impresas
  labelsToPreview.value.forEach(label => {
    markLabelAsPrinted(label.order_id)
  })
  
  toast.success(`✅ ${labelsToPreview.value.length} etiquetas enviadas a impresión`)
  showLabelsPreviewModal.value = false
}

// ✅ Generar etiquetas directamente
async function generateLabelsDirectly(orderIds) {
  generatingLabels.value = true
  
  try {
    const response = await apiService.labels.generateBulk(orderIds)
    
    toast.success(`${response.data.total} etiquetas generadas exitosamente`)
    
    // Actualizar pedidos localmente
    response.data.labels.forEach(label => {
      const orderIndex = orders.value.findIndex(o => o._id === label.order_id)
      if (orderIndex !== -1) {
        orders.value[orderIndex].envigo_label = {
          unique_code: label.unique_code,
          generated_at: new Date()
        }
      }
    })

    // Preguntar si quiere imprimir
    if (confirm(`¿Deseas imprimir las ${response.data.total} etiquetas generadas?`)) {
      printLabels(response.data.labels)
    }

    // Limpiar selección
    selectedOrders.value = []
    
  } catch (error) {
    console.error('Error generando etiquetas:', error)
    toast.error('Error generando etiquetas: ' + (error.response?.data?.error || error.message))
  } finally {
    generatingLabels.value = false
  }
}

// ✅ Imprimir etiquetas generadas
function printLabels(labels) {
  let printContent = `
    <html>
      <head>
        <title>Etiquetas enviGo - ${labels.length} etiquetas</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; }
          .label { 
            width: 180mm; 
            height: 60mm; 
            border: 2px solid #000; 
            margin-bottom: 10mm; 
            padding: 5mm; 
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
          }
          .label-header { 
            text-align: center; 
            border-bottom: 1px solid #000; 
            padding-bottom: 3mm;
            margin-bottom: 3mm;
          }
          .company-name { font-size: 16px; font-weight: bold; }
          .envigo-code { 
            font-size: 20px; 
            font-weight: bold; 
            color: #dc2626; 
            margin: 2mm 0;
          }
          .label-content { 
            display: flex; 
            justify-content: space-between;
            flex: 1;
          }
          .order-info { flex: 1; }
          .info-line { margin: 1mm 0; }
        </style>
      </head>
      <body>
  `

  labels.forEach(label => {
    printContent += `
      <div class="label">
        <div class="label-header">
          <div class="company-name">enviGo</div>
          <div class="envigo-code">${label.unique_code}</div>
        </div>
        <div class="label-content">
          <div class="order-info">
            <div class="info-line"><strong>Pedido:</strong> #${label.order_number}</div>
            <div class="info-line"><strong>Cliente:</strong> ${label.customer_name}</div>
            <div class="info-line"><strong>Teléfono:</strong> ${label.customer_phone || 'No disponible'}</div>
            <div class="info-line"><strong>Dirección:</strong> ${label.shipping_address}</div>
            <div class="info-line"><strong>Comuna:</strong> ${label.shipping_commune}</div>
            ${label.notes ? `<div class="info-line"><strong>Notas:</strong> ${label.notes}</div>` : ''}
          </div>
        </div>
      </div>
    `
  })

  printContent += `</body></html>`

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  printWindow.document.write(printContent)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()

  // Marcar como impresas
  labels.forEach(label => {
    markLabelAsPrinted(label.order_id)
  })
}

// ✅ Marcar etiqueta como impresa
async function markLabelAsPrinted(orderId) {
  try {
    await apiService.labels.markPrinted(orderId)
  } catch (error) {
    console.error('Error marcando etiqueta como impresa:', error)
  }
}

// ✅ Manejar cierre del modal
function closeLabelsModal() {
  showLabelsModal.value = false
}

// ✅ Callback cuando se generan etiquetas desde el modal
function onLabelsGenerated(labels) {
  toast.success(`${labels.length} etiquetas generadas exitosamente`)
  
  // Actualizar pedidos localmente
  labels.forEach(label => {
    const orderIndex = orders.value.findIndex(o => o._id === label.order_id)
    if (orderIndex !== -1) {
      orders.value[orderIndex].envigo_label = {
        unique_code: label.unique_code,
        generated_at: new Date()
      }
    }
  })

  closeLabelsModal()
  selectedOrders.value = []
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

/* ==================== ESTILOS MEJORADOS PARA SELECTOR DE CANAL ==================== */

.section-description {
  color: #64748b; /* Slate 500 */
  font-size: 14px;
  margin-top: -8px;
  margin-bottom: 16px;
}

/* Container for the pickup point selection */
.pickup-point-group {
  background-color: #f8fafc; /* Slate 50 */
  border: 1px solid #e2e8f0; /* Slate 200 */
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.pickup-point-group label {
  font-size: 12px;
  font-weight: 600;
  color: #475569; /* Slate 600 */
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

/* Skeleton loader for a better loading UX */
.channel-loading-skeleton {
  height: 50px;
  width: 100%;
  border-radius: 8px;
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: pulse-bg 1.5s infinite ease-in-out;
}

@keyframes pulse-bg {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}


/* Warning message for when no channels are available */
.no-channels-warning {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #fffbeb; /* Amber 50 */
  border: 1px solid #fcd34d; /* Amber 300 */
  border-radius: 8px;
  color: #92400e; /* Amber 800 */
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-content {
  flex: 1;
}

.warning-content p {
  margin: 0 0 10px 0;
  line-height: 1.5;
}

.warning-content strong {
  color: #78350f; /* Amber 900 */
}

.btn-link {
  background: none;
  border: none;
  color: #2563eb; /* Blue 600 */
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  font-weight: 600;
  transition: color 0.2s ease;
}

.btn-link:hover {
  color: #1d4ed8; /* Blue 700 */
  text-decoration: underline;
}

/* Modern custom select dropdown */
.channel-selector {
  appearance: none;
  background-color: #ffffff;
  border: 1px solid #cbd5e1; /* Slate 300 */
  border-radius: 8px;
  padding: 12px 40px 12px 16px;
  font-size: 16px;
  width: 100%;
  cursor: pointer;
  color: #1e293b; /* Slate 800 */
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1.5em 1.5em;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.channel-selector:hover {
  border-color: #94a3b8; /* Slate 400 */
}

.channel-selector:focus {
  outline: none;
  border-color: #4f46e5; /* Indigo 600 */
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.channel-selector:disabled {
  background-color: #f1f5f9; /* Slate 100 */
  cursor: not-allowed;
  opacity: 0.7;
}

/* Preview of the selected channel */
.channel-preview {
  margin-top: 16px;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.channel-info-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0; /* Slate 200 */
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.channel-icon {
  font-size: 28px;
  line-height: 1;
}

.channel-details {
  flex: 1;
}

.channel-name {
  font-weight: 600;
  color: #1e293b; /* Slate 800 */
  font-size: 16px;
}

.channel-type {
  color: #64748b; /* Slate 500 */
  font-size: 12px;
  font-weight: 500;
}

.channel-meta {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0; /* Slate 200 */
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569; /* Slate 600 */
}

.meta-icon {
  font-size: 14px;
}

.meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0ea5e9; /* Sky 500 */
}

.help-text {
  font-size: 13px;
  color: #64748b; /* Slate 500 */
  margin-top: 12px;
  display: block;
}


.orders-page {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
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

/* ✅ NUEVOS: Estilos para modal de etiquetas */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-large {
  background: white;
  border-radius: 12px;
  width: 95vw;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #f1f5f9;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.modal-subtitle {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.modal-close {
  background: rgba(255,255,255,0.2);
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: white;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(255,255,255,0.3);
}

.modal-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
/* ✅ ESTILOS CORREGIDOS PARA MODAL DE ETIQUETAS */
.labels-preview-container {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 20px;
}

.preview-info h4 {
  margin: 0 0 4px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.preview-info p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.preview-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* ✅ Grid de etiquetas mejorado */
.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.label-preview-card {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.label-preview-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.label-mini-preview {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
  font-size: 12px;
}

.label-header-mini {
  text-align: center;
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.company-name-mini {
  font-weight: bold;
  font-size: 14px;
  color: #1f2937;
}

.envigo-code-mini {
  font-size: 16px;
  font-weight: bold;
  color: #dc2626;
  margin-top: 4px;
  padding: 4px 8px;
  background: #fef2f2;
  border-radius: 4px;
  display: inline-block;
}

.label-content-mini {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label-info-item {
  font-size: 11px;
  line-height: 1.3;
  color: #374151;
}

.label-info-item strong {
  color: #1f2937;
  display: inline-block;
  width: 50px;
  font-weight: 600;
}

.btn-single-print {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-single-print:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

/* ✅ Responsive design mejorado */
@media (max-width: 768px) {
  .labels-grid {
    grid-template-columns: 1fr;
    max-height: 40vh;
  }
  
  .preview-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .preview-actions {
    justify-content: stretch;
  }
  
  .btn {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .label-preview-card {
    padding: 12px;
  }
  
  .label-mini-preview {
    padding: 8px;
    font-size: 11px;
  }
  
  .btn-single-print {
    padding: 6px 10px;
    font-size: 11px;
  }
}

/* ✅ Estados de carga */
.labels-grid:empty::after {
  content: 'No hay etiquetas para mostrar';
  display: block;
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 40px;
  grid-column: 1 / -1;
}

/* ✅ Accesibilidad */
.btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.label-preview-card:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
</style>