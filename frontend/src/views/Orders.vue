<template>
  <div class="px-6 py-6 max-w-[1600px] mx-auto font-sans bg-slate-50">
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
      @request-collection="openCollectionModal"
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

    <!-- Modales existentes -->
    <Modal v-model="showOrderDetailsModal" :title="`Pedido #${selectedOrder?.order_number}`" width="800px">
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
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
      <div v-if="loadingOrderDetails" class="flex flex-col items-center justify-center py-10 text-gray-500">
        <div class="w-8 h-8 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      </div>
      <ProofOfDelivery v-else-if="selectedProofOrder" :order="selectedProofOrder" />
    </Modal>

    <!-- Modal de soporte -->
    <Modal v-model="showSupportModal" title="💬 Contactar Soporte" width="500px">
      <div v-if="supportOrder" class="p-5">
        <div class="bg-gray-50 p-4 rounded-xl mb-5 border border-gray-200">
          <h4 class="m-0 mb-2 text-gray-800 text-base font-semibold">Pedido: #{{ supportOrder.order_number }}</h4>
          <p class="my-1 text-gray-600 text-sm">Cliente: {{ supportOrder.customer_name }}</p>
          <p class="my-1 text-gray-600 text-sm">Estado: {{ getStatusName(supportOrder.status) }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <button 
            @click="emailSupport(supportOrder)" 
            class="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl cursor-pointer transition-all duration-300 text-sm font-medium text-gray-700 hover:border-indigo-600 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/15"
          >
            📧 Enviar Email
          </button>
          <button 
            @click="whatsappSupport(supportOrder)" 
            class="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl cursor-pointer transition-all duration-300 text-sm font-medium text-gray-700 hover:border-indigo-600 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/15"
          >
            💬 WhatsApp
          </button>
          <button 
            @click="callSupport(supportOrder)" 
            class="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl cursor-pointer transition-all duration-300 text-sm font-medium text-gray-700 hover:border-indigo-600 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/15"
          >
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

    <!-- Modal Crear Pedido -->
    <Modal v-model="showCreateOrderModal" title="➕ Crear Nuevo Pedido" width="800px">
      <div v-if="showCreateOrderModal" class="max-h-[70vh] overflow-y-auto p-5">
        <form @submit.prevent="handleCreateOrderSubmit">
          <!-- Canal de Retiro -->
          <div class="mb-6 border border-slate-200 rounded-lg p-5">
            <h4 class="m-0 mb-4 text-gray-800 text-base font-semibold">🏪 Canal de Retiro</h4>
            <p class="text-slate-500 text-sm -mt-2 mb-4">Selecciona dónde el conductor retirará este pedido</p>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col col-span-2">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">
                  Punto de Retiro<span class="text-red-500"> *</span>
                </label>
                
                <!-- Loading state -->
                <div v-if="loadingChannels" class="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div class="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span class="text-sm text-slate-600">Cargando canales...</span>
                </div>
                
                <!-- No channels available -->
                <div v-else-if="!availableChannels.length" class="flex gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800">
                  <div class="text-2xl flex-shrink-0 mt-0.5">⚠️</div>
                  <div class="flex-1">
                    <p class="m-0 mb-2.5 leading-relaxed">
                      <strong class="text-amber-900">No hay canales configurados</strong>
                    </p>
                    <p class="m-0 mb-2.5 leading-relaxed">Tu empresa necesita tener al menos un canal configurado para crear pedidos.</p>
                    <button 
                      type="button" 
                      @click="redirectToChannels" 
                      class="bg-transparent border-none text-blue-600 no-underline cursor-pointer text-sm p-0 font-semibold transition-colors hover:text-blue-700 hover:underline"
                    >
                      → Configurar canales ahora
                    </button>
                  </div>
                </div>
                
                <!-- Channel selector -->
                <select 
                  v-else
                  v-model="newOrder.channel_id" 
                  required
                  class="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 pr-10 text-base w-full cursor-pointer text-slate-800 transition-all duration-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-[url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2020%2020%27%3e%3cpath%20stroke=%27%2364748b%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%271.5%27%20d=%27M6%208l4%204%204-4%27/%3e%3c/svg%3e')] bg-no-repeat bg-[right_1rem_center] bg-[length:1.5em_1.5em] hover:border-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
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
                <div v-if="selectedChannelInfo" class="mt-4 animate-[fadeIn_0.5s_ease-out]">
                  <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div class="flex items-center gap-3 mb-3">
                      <span class="text-[28px] leading-none">{{ getChannelIcon(selectedChannelInfo.channel_type) }}</span>
                      <div class="flex-1">
                        <div class="font-semibold text-slate-800 text-base">{{ selectedChannelInfo.channel_name }}</div>
                        <div class="text-slate-500 text-xs font-medium">{{ getChannelTypeName(selectedChannelInfo.channel_type) }}</div>
                      </div>
                    </div>
                    <div v-if="selectedChannelInfo.store_url" class="pt-2 border-t border-dashed border-slate-200">
                      <div class="flex items-center gap-2 text-sm text-slate-600">
                        <span class="text-sm">🌐</span>
                        <span class="overflow-hidden text-ellipsis whitespace-nowrap text-sky-500">{{ selectedChannelInfo.store_url }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <small class="text-xs text-slate-500 mt-3 block">
                  💡 El conductor recibirá las instrucciones de retiro para este canal específico
                </small>
              </div>
            </div>
          </div>

          <!-- Información del Cliente -->
          <div class="mb-6 border border-slate-200 rounded-lg p-5">
            <h4 class="m-0 mb-4 text-gray-800 text-base font-semibold">👤 Información del Cliente</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">
                  Nombre del Cliente<span class="text-red-500"> *</span>
                </label>
                <input 
                  v-model="newOrder.customer_name" 
                  type="text" 
                  required 
                  placeholder="Juan Pérez"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">Email del Cliente</label>
                <input 
                  v-model="newOrder.customer_email" 
                  type="email" 
                  placeholder="cliente@email.com"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">Teléfono del Cliente</label>
                <input 
                  v-model="newOrder.customer_phone" 
                  type="tel" 
                  placeholder="+56 9 1234 5678"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          <!-- Dirección de Entrega -->
          <div class="mb-6 border border-slate-200 rounded-lg p-5">
            <h4 class="m-0 mb-4 text-gray-800 text-base font-semibold">📍 Dirección de Entrega</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col col-span-2">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">
                  Dirección Completa<span class="text-red-500"> *</span>
                </label>
                <input 
                  v-model="newOrder.shipping_address" 
                  type="text" 
                  required 
                  placeholder="Av. Providencia 1234, Dpto 567"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">
                  Comuna<span class="text-red-500"> *</span>
                </label>
                <input 
                  v-model="newOrder.shipping_commune" 
                  type="text" 
                  required 
                  placeholder="Providencia"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">Región</label>
                <input 
                  v-model="newOrder.shipping_state" 
                  type="text" 
                  value="Región Metropolitana"
                  placeholder="Región Metropolitana"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          <!-- Información del Pedido -->
          <div class="mb-6 border border-slate-200 rounded-lg p-5">
            <h4 class="m-0 mb-4 text-gray-800 text-base font-semibold">📦 Información del Pedido</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">
                  Número de Pedido<span class="text-red-500"> *</span>
                </label>
                <input 
                  v-model="newOrder.order_number" 
                  type="text" 
                  required 
                  placeholder="Ej: PED-001, #12345, ORDER-ABC"
                  maxlength="50"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <small class="text-xs text-gray-600 mt-1 italic">Ingresa tu número de pedido interno</small>
              </div>
              
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">ID Externo (Opcional)</label>
                <input 
                  v-model="newOrder.external_order_id" 
                  type="text" 
                  placeholder="ID de tu sistema de ventas"
                  maxlength="100"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <small class="text-xs text-gray-600 mt-1 italic">ID de tu tienda online, sistema POS, etc.</small>
              </div>
              
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">
                  Monto Total<span class="text-red-500"> *</span>
                </label>
                <input 
                  v-model.number="newOrder.total_amount" 
                  type="number" 
                  required 
                  min="0" 
                  step="0.01"
                  placeholder="15000"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <small class="text-xs text-gray-600 mt-1 italic">Valor total del pedido en pesos</small>
              </div>
              
              <div class="flex flex-col">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">Costo de Envío</label>
                <input 
                  v-model.number="newOrder.shipping_cost" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="2500"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <small class="text-xs text-gray-600 mt-1 italic">Costo del despacho (opcional)</small>
              </div>
              
              <div class="flex flex-col col-span-2">
                <label class="mb-1.5 font-medium text-gray-700 text-sm">Notas del Pedido</label>
                <textarea 
                  v-model="newOrder.notes" 
                  rows="3"
                  placeholder="Instrucciones especiales para la entrega..."
                  maxlength="500"
                  class="px-3 py-2.5 border border-gray-300 rounded-md text-sm w-full box-border focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                ></textarea>
                <small class="text-xs text-gray-600 mt-1 italic">Información adicional para el delivery</small>
              </div>
            </div>
          </div>

          <!-- Botones -->
          <div class="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-200">
            <button 
              type="button" 
              @click="closeCreateOrderModal" 
              class="bg-gray-100 text-gray-700 border border-gray-300 px-5 py-2.5 rounded-md font-medium cursor-pointer hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="isCreatingOrder" 
              class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none px-5 py-2.5 rounded-md font-medium cursor-pointer hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300"
            >
              {{ isCreatingOrder ? '⏳ Creando...' : '💾 Crear Pedido' }}
            </button>
          </div>
        </form>
      </div>
    </Modal>

    <!-- Modal de Etiquetas (se mantiene igual con Tailwind inline donde sea posible) -->
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

    <!-- Modal de Subida Masiva -->
    <BulkUploadModal
      :show="showBulkUploadModal"
      :selected-file="selectedBulkFile"
      :downloading-template="downloadingTemplate"
      :is-uploading="isBulkUploading"
      :upload-feedback="bulkUploadFeedback"
      :upload-status="bulkUploadStatus"
      @close="closeBulkUploadModal"
      @download-template="downloadBulkTemplate"
      @file-selected="handleBulkFileSelect"
      @clear-file="clearBulkFile"
      @upload="handleBulkUpload"
    />

    <!-- Modal de Colección -->
    <CollectionRequestModal
      :show="showCollectionModal"
      :company-name="auth.user?.company?.name || 'Tu empresa'"
      :company-address="auth.user?.company?.address || 'Dirección no disponible'"
      :is-requesting="isRequestingCollection"
      @close="showCollectionModal = false"
      @submit="handleCollectionRequest"
    />
  </div>
</template>

<script setup>
// ... (todo el script se mantiene exactamente igual, sin cambios)
</script>

<style scoped>
/* Animación para fadeIn del channel preview */
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

/* Responsive overrides solo para grid columns en mobile */
@media (max-width: 768px) {
  .grid.grid-cols-2 {
    grid-template-columns: 1fr;
  }
}

/* Print styles */
@media print {
  .px-6 {
    background: white;
    padding: 0;
  }
}
</style>