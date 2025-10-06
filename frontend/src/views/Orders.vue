<!-- frontend/src/views/Orders.vue - TAILWIND VERSION -->
<template>
  <div class="min-h-screen bg-gray-50 p-6">
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
      @bulk-upload="openBulkUploadModal" 
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
    />

    <!-- Modal: Detalles del Pedido -->
    <Modal
      :show="showOrderDetailsModal"
      title="Detalles del Pedido"
      size="large"
      @close="closeOrderDetailsModal"
    >
      <OrderDetails
        v-if="selectedOrder"
        :order="selectedOrder"
        @close="closeOrderDetailsModal"
      />
    </Modal>

    <!-- Modal: Tracking -->
    <Modal
      :show="showTrackingModal"
      title="Seguimiento del Pedido"
      size="large"
      @close="closeTrackingModal"
    >
      <OrderTracking
        v-if="selectedOrder"
        :order="selectedOrder"
        @close="closeTrackingModal"
      />
    </Modal>

    <!-- Modal: Proof of Delivery -->
    <Modal
      :show="showProofModal"
      title="Prueba de Entrega"
      size="large"
      @close="closeProofModal"
    >
      <ProofOfDelivery
        v-if="selectedOrder"
        :order="selectedOrder"
        @close="closeProofModal"
      />
    </Modal>

    <!-- Modal: Crear Pedido -->
    <Modal
      :show="showCreateOrderModal"
      title="Crear Nuevo Pedido"
      size="xlarge"
      @close="closeCreateOrderModal"
    >
      <div class="space-y-6">
        <form @submit.prevent="createNewOrder" class="space-y-6">
          <!-- Selección de Canal -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">📡</span>
              Canal de Venta
            </h4>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Canal <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="newOrder.channel_id"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Seleccionar Canal --</option>
                  <option 
                    v-for="channel in availableChannels" 
                    :key="channel._id" 
                    :value="channel._id"
                  >
                    {{ channel.channel_name }} ({{ channel.channel_type }})
                  </option>
                </select>
              </div>

              <!-- Info del canal seleccionado -->
              <div v-if="selectedChannelInfo" class="bg-white border border-gray-200 rounded-lg p-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-2xl">
                    📡
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-900">{{ selectedChannelInfo.channel_name }}</p>
                    <p class="text-sm text-gray-500">{{ getChannelTypeName(selectedChannelInfo.channel_type) }}</p>
                  </div>
                </div>
                <div v-if="selectedChannelInfo.store_url" class="mt-3 text-sm text-gray-600">
                  <span class="font-medium">🌐 URL:</span> {{ selectedChannelInfo.store_url }}
                </div>
              </div>

              <p class="text-sm text-gray-600">
                💡 El conductor recibirá las instrucciones de retiro para este canal específico
              </p>
            </div>
          </div>

          <!-- Información del Cliente -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">👤</span>
              Información del Cliente
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Cliente <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newOrder.customer_name"
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email del Cliente
                </label>
                <input
                  v-model="newOrder.customer_email"
                  type="email"
                  placeholder="cliente@email.com"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono del Cliente
                </label>
                <input
                  v-model="newOrder.customer_phone"
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Dirección de Entrega -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">📍</span>
              Dirección de Entrega
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Dirección Completa <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newOrder.shipping_address"
                  type="text"
                  required
                  placeholder="Av. Providencia 1234, Depto 567"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Comuna <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newOrder.shipping_commune"
                  type="text"
                  required
                  placeholder="Providencia"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Región
                </label>
                <input
                  v-model="newOrder.shipping_state"
                  type="text"
                  placeholder="Región Metropolitana"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Información del Pedido -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">📦</span>
              Información del Pedido
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Número de Pedido <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newOrder.order_number"
                  type="text"
                  required
                  placeholder="PED-001"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Monto Total <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="newOrder.total_amount"
                  type="number"
                  required
                  min="0"
                  placeholder="15000"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Costo de Envío
                </label>
                <input
                  v-model.number="newOrder.shipping_cost"
                  type="number"
                  min="0"
                  placeholder="2500"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div class="md:col-span-3">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Notas / Instrucciones de Entrega
                </label>
                <textarea
                  v-model="newOrder.notes"
                  rows="3"
                  placeholder="Instrucciones especiales para el conductor..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              @click="closeCreateOrderModal"
              :disabled="creatingOrder"
              class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="creatingOrder"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span v-if="creatingOrder" class="material-icons animate-spin text-lg">refresh</span>
              <span v-else class="text-lg">💾</span>
              {{ creatingOrder ? 'Creando...' : 'Crear Pedido' }}
            </button>
          </div>
        </form>
      </div>
    </Modal>

    <!-- Modal: Bulk Upload -->
    <Modal
      :show="showBulkUploadModal"
      title="Carga Masiva de Pedidos"
      size="large"
      @close="closeBulkUploadModal"
    >
      <div class="space-y-6">
        <!-- Instrucciones -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span class="text-xl">ℹ️</span>
            Instrucciones
          </h4>
          <ol class="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Descarga la plantilla CSV haciendo clic en el botón</li>
            <li>Completa los datos de tus pedidos en el archivo</li>
            <li>Guarda el archivo y súbelo usando el botón de carga</li>
            <li>Revisa los resultados y confirma la importación</li>
          </ol>
        </div>

        <!-- Descarga plantilla -->
        <div class="flex justify-center">
          <button
            @click="downloadBulkTemplate"
            :disabled="downloadingTemplate"
            class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span class="text-xl">📥</span>
            {{ downloadingTemplate ? 'Generando...' : 'Descargar Plantilla CSV' }}
          </button>
        </div>

        <!-- Subida de archivo -->
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            ref="bulkFileInput"
            accept=".csv,.xlsx,.xls"
            @change="handleBulkFileSelect"
            class="hidden"
          />
          
          <div v-if="!selectedBulkFile" @click="$refs.bulkFileInput.click()" class="cursor-pointer">
            <span class="text-5xl mb-4 block">📄</span>
            <p class="text-lg font-medium text-gray-700 mb-2">
              Haz clic para seleccionar archivo
            </p>
            <p class="text-sm text-gray-500">
              Formatos soportados: CSV, XLSX, XLS
            </p>
          </div>

          <div v-else class="space-y-4">
            <div class="flex items-center justify-center gap-3">
              <span class="text-4xl">✅</span>
              <div class="text-left">
                <p class="font-medium text-gray-900">{{ selectedBulkFile.name }}</p>
                <p class="text-sm text-gray-500">{{ (selectedBulkFile.size / 1024).toFixed(2) }} KB</p>
              </div>
            </div>
            <button
              @click="clearBulkFile"
              class="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Cambiar archivo
            </button>
          </div>
        </div>

        <!-- Feedback -->
        <div v-if="bulkUploadFeedback" 
          :class="[
            'p-4 rounded-lg',
            bulkUploadStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            bulkUploadStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          ]"
        >
          {{ bulkUploadFeedback }}
        </div>

        <!-- Botones -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            @click="closeBulkUploadModal"
            :disabled="isBulkUploading"
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            @click="handleBulkUpload"
            :disabled="!selectedBulkFile || isBulkUploading"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="isBulkUploading" class="material-icons animate-spin text-lg">refresh</span>
            <span v-else class="text-lg">📤</span>
            {{ isBulkUploading ? 'Procesando...' : 'Importar Pedidos' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal: Manifiesto -->
    <ManifestModal
      v-if="showManifestModal"
      :selected-orders="selectedOrders"
      @close="closeManifestModal"
      @manifest-generated="handleManifestGenerated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import { useToast } from 'vue-toastification'

// Componentes
import Modal from '../components/Modal.vue'
import OrderDetails from '../components/OrderDetails.vue'
import OrderTracking from '../components/OrderTracking.vue'
import ProofOfDelivery from '../components/ProofOfDelivery.vue'
import OrdersHeader from '../components/Orders/OrdersHeader.vue'
import OrdersTable from '../components/Orders/OrdersTable.vue'
import UnifiedOrdersFilters from '../components/UnifiedOrdersFilters.vue'
import ManifestModal from '../components/ManifestModal.vue'

// Composables
import { useOrdersData } from '../composables/useOrdersData'
import { useOrdersFilters } from '../composables/useOrdersFilters'
import { useOrdersSelection } from '../composables/useOrdersSelection'

const toast = useToast()
const router = useRouter()
const auth = useAuthStore()

// ==================== COMPOSABLES ====================

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

const {
  filters,
  advancedFilters,
  filtersUI,
  filterPresets,
  activeFiltersCount,
  availableCommunes,
  applyFilters,
  updateFilter,
  updateAdvancedFilter,
  resetFilters,
  toggleAdvancedFilters,
  applyPreset,
  addCommune,
  removeCommune
} = useOrdersFilters()

const {
  selectedOrders,
  selectAllChecked,
  selectAllIndeterminate,
  toggleOrderSelection,
  toggleSelectAll,
  clearSelection,
  isOrderSelected
} = useOrdersSelection(orders)

// ==================== ESTADO ====================

// Modales
const showOrderDetailsModal = ref(false)
const showTrackingModal = ref(false)
const showProofModal = ref(false)
const showCreateOrderModal = ref(false)
const showBulkUploadModal = ref(false)
const showManifestModal = ref(false)

// Pedido seleccionado
const selectedOrder = ref(null)

// Crear pedido
const creatingOrder = ref(false)
const availableChannels = ref([])
const newOrder = ref({
  channel_id: '',
  order_number: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  shipping_address: '',
  shipping_commune: '',
  shipping_state: '',
  total_amount: 0,
  shipping_cost: 0,
  notes: ''
})

// Bulk upload
const selectedBulkFile = ref(null)
const bulkFileInput = ref(null)
const isBulkUploading = ref(false)
const downloadingTemplate = ref(false)
const bulkUploadFeedback = ref('')
const bulkUploadStatus = ref('')

// Auto refresh
const autoRefreshEnabled = ref(false)
const lastUpdate = ref(Date.now())

// ==================== COMPUTED ====================

const orderStats = computed(() => ({
  total: orders.value.length,
  pending: orders.value.filter(o => o.status === 'pending').length,
  ready_for_pickup: orders.value.filter(o => o.status === 'ready_for_pickup').length,
  processing: orders.value.filter(o => o.status === 'processing').length,
  shipped: orders.value.filter(o => o.status === 'shipped').length,
  delivered: orders.value.filter(o => o.status === 'delivered').length,
  cancelled: orders.value.filter(o => o.status === 'cancelled').length
}))

const allFilters = computed(() => ({
  ...filters.value,
  ...advancedFilters.value
}))

const selectedChannelInfo = computed(() => {
  if (!newOrder.value.channel_id) return null
  return availableChannels.value.find(channel => channel._id === newOrder.value.channel_id)
})

// ==================== MÉTODOS ====================

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
    toast.success('✅ Exportación completada')
  } catch (error) {
    toast.error('Error al exportar pedidos')
  }
}

function handleFilterChange(newFilters) {
  Object.keys(newFilters).forEach(key => {
    updateFilter(key, newFilters[key])
  })
  applyFilters()
}

function handleSort(sortConfig) {
  console.log('Sort:', sortConfig)
  // Implementar ordenamiento
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    startAutoRefresh()
    toast.success('Actualización automática activada')
  } else {
    stopAutoRefresh()
    toast.info('Actualización automática desactivada')
  }
}

// Crear pedido
async function handleCreateOrder() {
  showCreateOrderModal.value = true
  await loadAvailableChannels()
}

async function loadAvailableChannels() {
  try {
    await fetchChannels()
    availableChannels.value = channels.value
  } catch (error) {
    console.error('Error loading channels:', error)
  }
}

async function createNewOrder() {
  if (!newOrder.value.channel_id) {
    toast.error('Debes seleccionar un canal')
    return
  }

  creatingOrder.value = true
  try {
    await apiService.orders.create({
      ...newOrder.value,
      company_id: companyId.value
    })
    
    toast.success('✅ Pedido creado exitosamente')
    closeCreateOrderModal()
    await refreshOrders(allFilters.value)
  } catch (error) {
    console.error('Error creating order:', error)
    toast.error('Error al crear el pedido')
  } finally {
    creatingOrder.value = false
  }
}

function closeCreateOrderModal() {
  showCreateOrderModal.value = false
  newOrder.value = {
    channel_id: '',
    order_number: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    shipping_commune: '',
    shipping_state: '',
    total_amount: 0,
    shipping_cost: 0,
    notes: ''
  }
}

function getChannelTypeName(type) {
  const types = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    mercadolibre: 'Mercado Libre',
    manual: 'Manual'
  }
  return types[type] || type
}

// Modales
function openOrderDetailsModal(order) {
  selectedOrder.value = order
  showOrderDetailsModal.value = true
}

function closeOrderDetailsModal() {
  showOrderDetailsModal.value = false
  selectedOrder.value = null
}

function openTrackingModal(order) {
  selectedOrder.value = order
  showTrackingModal.value = true
}

function closeTrackingModal() {
  showTrackingModal.value = false
  selectedOrder.value = null
}

function openLiveTracking(order) {
  console.log('Open live tracking:', order)
  // Implementar
}

function showProofOfDelivery(order) {
  selectedOrder.value = order
  showProofModal.value = true
}

function closeProofModal() {
  showProofModal.value = false
  selectedOrder.value = null
}

// Acciones
async function markAsReady(order) {
  try {
    await markOrderAsReady(order._id)
    toast.success('Pedido marcado como listo')
  } catch (error) {
    toast.error('Error al marcar pedido')
  }
}

async function handleBulkMarkReady() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona al menos un pedido')
    return
  }

  try {
    await markMultipleAsReady(selectedOrders.value.map(o => o._id))
    toast.success(`${selectedOrders.value.length} pedidos marcados como listos`)
    clearSelection()
  } catch (error) {
    toast.error('Error en la operación masiva')
  }
}

async function handleBulkExport() {
  if (selectedOrders.value.length === 0) {
    toast.warning('Selecciona al menos un pedido')
    return
  }

  try {
    await exportOrders('excel', {
      order_ids: selectedOrders.value.map(o => o._id)
    })
    toast.success('Exportación completada')
  } catch (error) {
    toast.error('Error al exportar')
  }
}

function handleGenerateLabels() {
  console.log('Generate labels for:', selectedOrders.value)
  // Implementar
}

function generateManifestAndMarkReady() {
  showManifestModal.value = true
}

function closeManifestModal() {
  showManifestModal.value = false
}

function handleManifestGenerated() {
  closeManifestModal()
  clearSelection()
  refreshOrders(allFilters.value)
}

function handleActionButton(action) {
  console.log('Action:', action)
}

function contactSupport() {
  toast.info('Función de soporte próximamente')
}

// Bulk upload
function openBulkUploadModal() {
  showBulkUploadModal.value = true
}

function closeBulkUploadModal() {
  showBulkUploadModal.value = false
  selectedBulkFile.value = null
  bulkUploadFeedback.value = ''
  bulkUploadStatus.value = ''
}

function handleBulkFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    toast.error('Archivo muy grande. Máximo 10MB')
    return
  }

  selectedBulkFile.value = file
  bulkUploadFeedback.value = ''
  bulkUploadStatus.value = ''
}

function clearBulkFile() {
  selectedBulkFile.value = null
  if (bulkFileInput.value) {
    bulkFileInput.value.value = ''
  }
}

async function downloadBulkTemplate() {
  downloadingTemplate.value = true
  try {
    const templateData = [
      ['Número de Pedido*', 'Nombre Cliente*', 'Email', 'Teléfono', 'Dirección*', 'Comuna*', 'Región', 'Monto Total*', 'Costo Envío', 'Notas'],
      ['PED-001', 'Juan Pérez', 'juan@email.com', '+56912345678', 'Av. Providencia 1234', 'Providencia', 'RM', '15000', '2500', 'Entregar en recepción']
    ]

    const csvContent = templateData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla_pedidos.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    toast.success('Plantilla descargada')
  } catch (error) {
    toast.error('Error al generar plantilla')
  } finally {
    downloadingTemplate.value = false
  }
}

async function handleBulkUpload() {
  if (!selectedBulkFile.value) {
    toast.error('Selecciona un archivo')
    return
  }

  isBulkUploading.value = true
  bulkUploadFeedback.value = 'Procesando archivo...'
  bulkUploadStatus.value = 'processing'

  try {
    const formData = new FormData()
    formData.append('file', selectedBulkFile.value)

    const { data } = await apiService.orders.bulkUpload(formData)

    const successful = data.database?.success || 0
    const failed = data.database?.failed || 0

    bulkUploadFeedback.value = `Completado: ${successful} pedidos creados`
    if (failed > 0) {
      bulkUploadFeedback.value += `, ${failed} fallaron`
    }

    bulkUploadStatus.value = failed > 0 ? 'partial' : 'success'
    
    if (successful > 0) {
      await refreshOrders(allFilters.value)
    }
  } catch (error) {
    bulkUploadFeedback.value = 'Error al procesar el archivo'
    bulkUploadStatus.value = 'error'
    toast.error('Error en la carga masiva')
  } finally {
    isBulkUploading.value = false
  }
}

// ==================== LIFECYCLE ====================

onMounted(async () => {
  console.log('🚀 Orders montado')
  await Promise.all([
    fetchOrders(allFilters.value),
    fetchChannels()
  ])
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
/* Material Icons */
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>