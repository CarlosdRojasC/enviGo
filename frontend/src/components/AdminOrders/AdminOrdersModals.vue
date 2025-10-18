<template>
  <div class="modals-container">
      <Modal 
      :model-value="showDetails" 
      @update:model-value="(value) => !value && $emit('close-details')"
      :title="`Detalles del Pedido #${selectedOrder?.order_number}`" 
      width="900px"
      class="order-details-modal"
    >
      <OrderDetails 
        v-if="selectedOrder" 
        :order="selectedOrder" 
        @close="$emit('close-details')"
      />
    </Modal>
    <Modal 
      :model-value="showUpdateStatus" 
      @update:model-value="(value) => !value && $emit('close-update-status')"
      title="Actualizar Estado del Pedido" 
      width="600px"
      class="update-status-modal"
    >
      <UpdateOrderStatus 
        v-if="selectedOrder" 
        :order="selectedOrder" 
        @close="$emit('close-update-status')"
        @status-updated="$emit('status-updated', $event)"
      />
    </Modal>

   <Modal 
      :model-value="showCreate" 
      @update:model-value="(value) => !value && $emit('close-create')"
      title="Crear Nuevo Pedido Manual" 
      width="1000px"
      class="create-order-modal"
    >
      <div class="create-order-content">
        <form @submit.prevent="$emit('create-order')" class="order-form">
          
          <!-- SECCIÓN: Información de la Empresa (Solo Admin) -->
          <div class="form-section">
            <div class="section-header">
              <h4 class="section-title">
                <span class="section-icon">🏢</span>
                Información de la Empresa
              </h4>
            </div>
            
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label required">Empresa</label>
                <select 
                  v-model="newOrder.company_id" 
                  @change="handleCompanyChange"
                  class="form-select" 
                  required
                >
                  <option value="" disabled>Seleccione una empresa...</option>
                  <option 
                    v-for="company in companies" 
                    :key="company._id" 
                    :value="company._id"
                  >
                    {{ company.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- 🆕 NUEVA SECCIÓN: Selección de Canal/Punto de Retiro -->
          <div class="form-section" v-if="newOrder.company_id">
            <div class="section-header">
              <h4 class="section-title">
                <span class="section-icon">🏪</span>
                Canal de Retiro
              </h4>
              <p class="section-description">
                Selecciona dónde el conductor retirará este pedido
              </p>
            </div>
            
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label required">Punto de Retiro *</label>
                
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
                    <p>Esta empresa necesita tener al menos un canal configurado para crear pedidos.</p>
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
                  class="form-select channel-selector" 
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
                      <div class="meta-item" v-if="selectedChannelInfo.pickup_address">
                        <span class="meta-icon">📍</span>
                        <span class="meta-text">{{ selectedChannelInfo.pickup_address }}</span>
                      </div>
                      <div class="meta-item" v-if="selectedChannelInfo.pickup_hours">
                        <span class="meta-icon">🕒</span>
                        <span class="meta-text">{{ selectedChannelInfo.pickup_hours }}</span>
                      </div>
                      <div class="meta-item" v-if="selectedChannelInfo.contact_phone">
                        <span class="meta-icon">📞</span>
                        <span class="meta-text">{{ selectedChannelInfo.contact_phone }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <small class="form-help">
                  💡 El conductor recibirá las instrucciones de retiro para este canal específico
                </small>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h4 class="section-title">
                <span class="section-icon">👤</span>
                Información del Cliente
              </h4>
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required">Nombre del Cliente</label>
                <input 
                  v-model="newOrder.customer_name" 
                  type="text" 
                  class="form-input"
                  required 
                  placeholder="Juan Pérez"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Email del Cliente</label>
                <input 
                  v-model="newOrder.customer_email" 
                  type="email" 
                  class="form-input"
                  placeholder="juan@email.com"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Teléfono del Cliente</label>
                <input 
                  v-model="newOrder.customer_phone" 
                  type="tel" 
                  class="form-input"
                  placeholder="+56912345678"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h4 class="section-title">
                <span class="section-icon">📍</span>
                Información de Envío
              </h4>
            </div>
            
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label required">Dirección de Envío</label>
                <input 
                  v-model="newOrder.shipping_address" 
                  type="text" 
                  class="form-input"
                  required 
                  placeholder="Av. Providencia 123, Depto 45"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label required">Comuna</label>
                <input 
                  v-model="newOrder.shipping_commune" 
                  type="text" 
                  class="form-input"
                  required 
                  placeholder="Providencia"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Región</label>
                <input 
                  v-model="newOrder.shipping_state" 
                  type="text" 
                  class="form-input"
                  placeholder="Región Metropolitana"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h4 class="section-title">
                <span class="section-icon">💰</span>
                Información Financiera
              </h4>
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required">Monto Total</label>
                <div class="input-with-prefix">
                  <span class="input-prefix">$</span>
                  <input 
                    v-model.number="newOrder.total_amount" 
                    type="number" 
                    class="form-input"
                    required 
                    min="0"
                    step="1000"
                    placeholder="25000"
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Costo de Envío</label>
                <div class="input-with-prefix">
                  <span class="input-prefix">$</span>
                  <input 
                    v-model.number="newOrder.shipping_cost" 
                    type="number" 
                    class="form-input"
                    min="0"
                    step="500"
                    placeholder="3000"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="form-section">
            <div class="section-header">
              <h4 class="section-title">
                <span class="section-icon">📝</span>
                Notas Adicionales
              </h4>
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Instrucciones Especiales</label>
              <textarea 
                v-model="newOrder.notes" 
                class="form-textarea"
                rows="3"
                placeholder="Entregar en recepción, llamar antes de llegar, etc."
              ></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button 
              type="button" 
              @click="$emit('close-create')" 
              class="btn-modal cancel"
            >
              <span class="btn-icon">❌</span>
              <span class="btn-text">Cancelar</span>
            </button>
            
            <button 
              type="submit" 
              :disabled="isCreating" 
              class="btn-modal save"
            >
              <span class="btn-icon">{{ isCreating ? '⏳' : '💾' }}</span>
              <span class="btn-text">{{ isCreating ? 'Creando...' : 'Guardar Pedido' }}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>

 <Modal 
      :model-value="showBulkUpload" 
      @update:model-value="(value) => !value && $emit('close-bulk-upload')"
      title="Subida Masiva de Pedidos" 
      width="700px"
      class="bulk-upload-modal"
    >
      <div class="bulk-upload-content">
        <div class="upload-section">
          <div class="section-header">
            <h4 class="section-title">
              <span class="section-icon">🏢</span>
              Seleccionar Empresa
            </h4>
          </div>
          
          <div class="form-group">
            <label class="form-label required">Asignar pedidos a la empresa:</label>
            <select 
              :value="bulkUploadCompanyId" 
              @change="$emit('update:bulkUploadCompanyId', $event.target.value)"
              class="form-select" 
              required
            >
              <option value="" disabled>-- Seleccione una empresa --</option>
              <option 
                v-for="company in companies" 
                :key="company._id" 
                :value="company._id"
              >
                {{ company.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="upload-section">
          <div class="section-header">
            <h4 class="section-title">
              <span class="section-icon">📋</span>
              Plantilla de Importación
            </h4>
          </div>
          
          <div class="template-info">
            <p class="template-description">
              Descarga la plantilla de Excel con el formato requerido para la importación masiva de pedidos.
            </p>
            
            <button 
              @click="$emit('download-template')" 
              class="btn-template-download"
            >
              <span class="btn-icon">⬇️</span>
              <span class="btn-text">Descargar Plantilla de Ejemplo</span>
            </button>
          </div>
        </div>

        <div class="upload-section">
          <div class="section-header">
            <h4 class="section-title">
              <span class="section-icon">📁</span>
              Subir Archivo
            </h4>
          </div>
          
          <div class="file-upload-area">
            <div class="file-upload-zone" :class="{ 'has-file': selectedFile }">
              <input 
                type="file" 
                @change="$emit('file-selected', $event)" 
                accept=".xlsx,.xls"
                class="file-input"
                id="bulk-file-input"
              />
              
              <label for="bulk-file-input" class="file-upload-label">
                <div class="upload-icon">📤</div>
                <div class="upload-text">
                  <span class="upload-title">
                    {{ selectedFile ? 'Cambiar archivo' : 'Seleccionar archivo Excel' }}
                  </span>
                  <span class="upload-subtitle">
                    Formatos soportados: .xlsx, .xls (máximo 10MB)
                  </span>
                </div>
              </label>
            </div>
            
            <div v-if="selectedFile" class="file-info">
              <div class="file-details">
                <span class="file-icon">📄</span>
                <div class="file-meta">
                  <span class="file-name">{{ selectedFile.name }}</span>
                  <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
                </div>
                <button 
                  @click="clearSelectedFile" 
                  class="file-remove"
                  title="Remover archivo"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="uploadFeedback" class="upload-feedback" :class="uploadStatus">
          <div class="feedback-icon">
            {{ uploadStatus === 'processing' ? '⏳' : 
                uploadStatus === 'success' ? '✅' : 
                uploadStatus === 'error' ? '❌' : 'ℹ️' }}
          </div>
          <div class="feedback-content">
            <div class="feedback-message">{{ uploadFeedback }}</div>
            <div v-if="isUploading" class="feedback-progress">
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            @click="$emit('close-bulk-upload')" 
            class="btn-modal cancel"
          >
            <span class="btn-icon">❌</span>
            <span class="btn-text">Cerrar</span>
          </button>
          
          <button 
            @click="$emit('bulk-upload')" 
            :disabled="!selectedFile || isUploading || !bulkUploadCompanyId" 
            class="btn-modal save"
          >
            <span class="btn-icon">{{ isUploading ? '⏳' : '⬆️' }}</span>
            <span class="btn-text">{{ isUploading ? 'Subiendo...' : 'Iniciar Subida' }}</span>
          </button>
        </div>
      </div>
    </Modal>

 <Modal 
      :model-value="showAssign" 
      @update:model-value="(value) => !value && $emit('close-assign')"
      title="Asignar Conductor" 
      width="600px"
      class="assign-modal"
    >
      <div class="assign-content" v-if="selectedOrder">
        <div class="assign-section">
          <div class="order-summary">
            <div class="summary-header">
              <h4 class="summary-title">
                <span class="summary-icon">📦</span>
                Pedido a Asignar
              </h4>
            </div>
            
            <div class="order-details-card">
              <div class="order-info-row">
                <span class="info-label">Número:</span>
                <span class="info-value">#{{ selectedOrder.order_number }}</span>
              </div>
              <div class="order-info-row">
                <span class="info-label">Cliente:</span>
                <span class="info-value">{{ selectedOrder.customer_name }}</span>
              </div>
              <div class="order-info-row">
                <span class="info-label">Dirección:</span>
                <span class="info-value">{{ selectedOrder.shipping_address }}</span>
              </div>
              <div class="order-info-row">
                <span class="info-label">Comuna:</span>
                <span class="info-value">{{ selectedOrder.shipping_commune }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="assign-section">
          <div class="driver-selection">
            <div class="section-header">
              <h4 class="section-title">
                <span class="section-icon">🚚</span>
                Seleccionar Conductor
              </h4>
            </div>
            
            <div v-if="loadingDrivers" class="loading-state">
              <div class="loading-spinner"></div>
              <span class="loading-text">Cargando conductores disponibles...</span>
            </div>
            
            <div v-else-if="availableDrivers.length === 0" class="empty-drivers">
              <div class="empty-icon">👤</div>
              <p class="empty-message">No hay conductores disponibles en este momento</p>
            </div>
            
            <div v-else class="driver-list">
              <div class="form-group">
                <label class="form-label">Conductor Disponible</label>
                <select 
                  :value="selectedDriverId" 
                  @change="$emit('update:selectedDriverId', $event.target.value)"
                  class="form-select driver-select"
                >
                  <option value="" disabled>-- Selecciona un conductor --</option>
                  <option 
  v-for="driver in availableDrivers" 
  :key="driver._id" 
  :value="driver._id"
>
  {{ driver.full_name }} ({{ driver.email }}) - {{ driver.is_active ? 'Activo' : 'Inactivo' }}
</option>
                </select>
              </div>
              
              <div v-if="selectedDriverId" class="selected-driver-info">
                <div class="driver-card">
                  <div class="driver-header">
                    <span class="driver-icon">👤</span>
                    <span class="driver-name">{{ getSelectedDriver()?.name }}</span>
                    <span class="driver-status" :class="{ active: getSelectedDriver()?.isActive }">
                      {{ getSelectedDriver()?.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  
                  <div class="driver-details">
                    <div class="driver-detail">
                      <span class="detail-label">Email:</span>
                      <span class="detail-value">{{ getSelectedDriver()?.email }}</span>
                    </div>
                    <div class="driver-detail" v-if="getSelectedDriver()?.phone">
                      <span class="detail-label">Teléfono:</span>
                      <span class="detail-value">{{ getSelectedDriver()?.phone }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            @click="$emit('close-assign')" 
            class="btn-modal cancel"
          >
            <span class="btn-icon">❌</span>
            <span class="btn-text">Cancelar</span>
          </button>
          
          <button 
            @click="$emit('confirm-assignment', selectedOrder._id)"
            :disabled="!selectedDriverId || isAssigning" 
            class="btn-modal save"
          >
            <span class="btn-icon">{{ isAssigning ? '⏳' : '🚚' }}</span>
            <span class="btn-text">{{ isAssigning ? 'Asignando...' : 'Confirmar Asignación' }}</span>
          </button>
        </div>
      </div>
    </Modal>

     <Modal 
      :model-value="showBulkAssign" 
      @update:model-value="(value) => !value && $emit('close-bulk-assign')"
      title="Asignación Masiva" 
      width="800px"
      class="bulk-assign-modal"
    >
      <div class="bulk-assign-content">
        <div class="bulk-section">
          <div class="section-header">
            <h4 class="section-title">
              <span class="section-icon">📋</span>
              Pedidos Seleccionados ({{ selectedOrders.length }})
            </h4>
          </div>
          
          <div class="selected-orders-summary">
            <div class="orders-grid">
              <div 
                v-for="order in selectedOrders.slice(0, 6)" 
                :key="order._id || order"
                class="order-summary-card"
              >
                <div class="order-number">#{{ getOrderNumber(order) }}</div>
                <div class="order-customer">{{ getOrderCustomer(order) }}</div>
                <div class="order-address">{{ getOrderAddress(order) }}</div>
              </div>
              
              <div v-if="selectedOrders.length > 6" class="more-orders-card">
                <div class="more-icon">⋯</div>
                <div class="more-text">y {{ selectedOrders.length - 6 }} pedidos más</div>
              </div>
            </div>
          </div>
        </div>

        <div class="bulk-section">
          <div class="section-header">
            <h4 class="section-title">
              <span class="section-icon">🚚</span>
              Conductor para Asignación Masiva
            </h4>
          </div>
          
          <div v-if="loadingDrivers" class="loading-state">
            <div class="loading-spinner"></div>
            <span class="loading-text">Cargando conductores disponibles...</span>
          </div>
          
          <div v-else class="bulk-driver-selection">
            <div class="form-group">
              <label class="form-label">Seleccionar Conductor</label>
              <select 
                :value="bulkSelectedDriverId" 
                @change="$emit('update:bulkSelectedDriverId', $event.target.value)"
                class="form-select driver-select"
              >
                <option value="" disabled>-- Selecciona un conductor --</option>
                <option 
  v-for="driver in availableDrivers" 
  :key="driver._id" 
  :value="driver._id"
>
  {{ driver.full_name }} ({{ driver.email }}) - {{ driver.is_active ? 'Activo' : 'Inactivo' }}
</option>
              </select>
            </div>
            
            <div v-if="bulkSelectedDriverId" class="bulk-driver-preview">
              <div class="assignment-preview">
                <div class="preview-icon">🎯</div>
                <div class="preview-text">
                  <strong>{{ getBulkSelectedDriver()?.name }}</strong> será asignado a 
                  <strong>{{ selectedOrders.length }}</strong> pedidos
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isBulkAssigning" class="bulk-section">
          <div class="section-header">
            <h4 class="section-title">
              <span class="section-icon">⚡</span>
              Progreso de Asignación
            </h4>
          </div>
          
          <div class="assignment-progress">
            <div class="progress-header">
              <span class="progress-label">Procesando pedidos...</span>
              <span class="progress-counter">{{ bulkAssignmentCompleted }} / {{ selectedOrders.length }}</span>
            </div>
            
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: bulkProgressPercentage + '%' }"
                ></div>
              </div>
              <span class="progress-percentage">{{ Math.round(bulkProgressPercentage) }}%</span>
            </div>
            
            <div v-if="bulkAssignmentResults.length > 0" class="recent-results">
              <div class="results-header">Últimos resultados:</div>
              <div class="results-list">
                <div 
                  v-for="result in bulkAssignmentResults.slice(-3)" 
                  :key="result.orderId"
                  class="result-item"
                  :class="{ success: result.success, error: !result.success }"
                >
                  <span class="result-icon">{{ result.success ? '✅' : '❌' }}</span>
                  <span class="result-order">{{ result.orderNumber }}</span>
                  <span class="result-message">{{ result.message || (result.success ? 'Asignado' : 'Error') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="bulkAssignmentFinished" class="bulk-section">
          <div class="section-header">
            <h4 class="section-title">
              <span class="section-icon">📊</span>
              Resultados de Asignación
            </h4>
          </div>
          
          <div class="assignment-results">
            <div class="results-summary">
              <div class="result-stat success">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                  <div class="stat-number">{{ getSuccessfulAssignments() }}</div>
                  <div class="stat-label">Exitosos</div>
                </div>
              </div>
              
              <div class="result-stat error">
                <div class="stat-icon">❌</div>
                <div class="stat-content">
                  <div class="stat-number">{{ getFailedAssignments() }}</div>
                  <div class="stat-label">Fallidos</div>
                </div>
              </div>
            </div>
            
            <div v-if="getFailedAssignments() > 0" class="failed-assignments">
              <div class="failed-header">
                <span class="failed-icon">⚠️</span>
                <span class="failed-title">Asignaciones que fallaron:</span>
              </div>
              
              <div class="failed-list">
                <div 
                  v-for="result in getFailedResults()" 
                  :key="result.orderId"
                  class="failed-item"
                >
                  <span class="failed-order">#{{ result.orderNumber }}</span>
                  <span class="failed-error">{{ result.error || result.message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            @click="$emit('close-bulk-assign')" 
            class="btn-modal cancel"
          >
            <span class="btn-icon">❌</span>
            <span class="btn-text">
              {{ bulkAssignmentFinished ? 'Cerrar' : 'Cancelar' }}
            </span>
          </button>
          <button
    v-if="!isBulkAssigning && !bulkAssignmentFinished"
    @click="optimizeAssignedOrders"
    :disabled="!bulkSelectedDriverId || selectedOrders.length === 0 || isOptimizing"
    class="btn-modal save"
    style="background: linear-gradient(135deg, #8b5cf6, #6d28d9);"
  >
    <span class="btn-icon">{{ isOptimizing ? '⏳' : '✨' }}</span>
    <span class="btn-text">
      {{ isOptimizing ? 'Optimizando...' : 'Optimizar Ruta' }}
    </span>
  </button>
          <button 
            v-if="!isBulkAssigning && !bulkAssignmentFinished"
            @click="$emit('confirm-bulk-assignment')" 
            :disabled="!bulkSelectedDriverId" 
            class="btn-modal save"
          >
            <span class="btn-icon">🚚</span>
            <span class="btn-text">Asignar {{ selectedOrders.length }} pedidos</span>
          </button>
        </div>
      </div>
    </Modal>
    <DeliveryProofModal
  :model-value="showDeliveryProof"
  @update:model-value="(value) => !value && $emit('close-delivery-proof')"
  :order="selectedOrder"
  @submit="handleDeliverySubmit"
/>
  </div>
  
</template>

<script setup>
import Modal from '../Modal.vue'
import { ref, computed, watch } from 'vue'
import OrderDetails from '../OrderDetails.vue'
import UpdateOrderStatus from '../UpdateOrderStatus.vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification';
import { apiService } from '../../services/api'
import DeliveryProofModal from './DeliveryProofModal.vue'

// ==================== PROPS ====================
const props = defineProps({
  // Modal visibility
  showDetails: Boolean,
  showUpdateStatus: Boolean,
  showCreate: Boolean,
  showBulkUpload: Boolean,
  showAssign: Boolean,
  showBulkAssign: Boolean,
  showDeliveryProof: Boolean,
  
  // Data
  selectedOrder: Object,
  companies: Array,
  newOrder: Object,
  isCreating: Boolean,
  
  // Bulk upload
  bulkUploadCompanyId: String,
  selectedFile: Object,
  uploadFeedback: String,
  uploadStatus: String,
  isUploading: Boolean,
  
  // Driver assignment
  availableDrivers: Array,
  loadingDrivers: Boolean,
  selectedDriverId: String,
  isAssigning: Boolean,
  
  // Bulk assignment
  selectedOrders: Array,
  bulkSelectedDriverId: String,
  isBulkAssigning: Boolean,
  bulkAssignmentCompleted: Number,
  bulkAssignmentResults: Array,
  bulkAssignmentFinished: Boolean,
  bulkProgressPercentage: Number
})

// ==================== EMITS ====================
// FIXED: Declare the 'update:*' events to properly communicate with the parent.
const emit = defineEmits([
  'close-details',
  'close-update-status',
  'status-updated',
  'close-create',
  'create-order',
  'close-bulk-upload',
  'file-selected',
  'bulk-upload',
  'download-template',
  'close-assign',
  'confirm-assignment',
  'close-bulk-assign',
  'confirm-bulk-assignment',
  'update:bulkUploadCompanyId',
  'update:selectedDriverId',
  'update:bulkSelectedDriverId',
  'close-delivery-proof',
  'confirm-delivery'
])
const router = useRouter()
const toast = useToast()

const availableChannels = ref([])
const loadingChannels = ref(false)


const selectedChannelInfo = computed(() => {
  if (!props.newOrder.channel_id) return null
  return availableChannels.value.find(channel => channel._id === props.newOrder.channel_id)
})

const isFormValid = computed(() => {
  return props.newOrder.company_id && 
         props.newOrder.channel_id && // ✅ NUEVA VALIDACIÓN
         props.newOrder.customer_name && 
         props.newOrder.shipping_address &&
         props.newOrder.shipping_commune &&
         props.newOrder.total_amount > 0
})
// Función para manejar el envío de la prueba
const handleDeliverySubmit = (proofData) => {
  emit('confirm-delivery', proofData)
}
// ==================== METHODS ====================
// ==================== MÉTODOS (Agregar estos) ====================
async function handleCompanyChange() {
  console.log('🏢 Company changed to:', props.newOrder.company_id)
  
  // Reset channel selection
  props.newOrder.channel_id = ''
  availableChannels.value = []
  
  if (!props.newOrder.company_id) return
  
  await loadCompanyChannels(props.newOrder.company_id)
}

async function loadCompanyChannels(companyId) {
  loadingChannels.value = true
  
  try {
    console.log('🔍 Loading channels for company:', companyId)
    
    const response = await apiService.channels.getByCompany(companyId)
    
    // Extract channels from response
    let channels = []
    if (response?.data?.data && Array.isArray(response.data.data)) {
      channels = response.data.data
    } else if (response?.data && Array.isArray(response.data)) {
      channels = response.data
    }
    
    console.log('📡 Channels loaded:', channels)
    
    availableChannels.value = channels.filter(channel => channel.is_active)
    
    if (availableChannels.value.length === 0) {
      toast.warning('Esta empresa no tiene canales configurados')
    } else {
      toast.success(`${availableChannels.value.length} canales cargados`)
    }
    
  } catch (error) {
    console.error('❌ Error loading channels:', error)
    toast.error('Error al cargar los canales de la empresa')
    availableChannels.value = []
  } finally {
    loadingChannels.value = false
  }
}

function getChannelDisplayName(channel) {
  const typeLabels = {
    'shopify': '🛍️ Shopify',
    'woocommerce': '🏪 WooCommerce', 
    'mercadolibre': '🛒 MercadoLibre',
    'general_store': '🏬 Tienda General',
    'Jumpseller': '🛒 Jumpseller',
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
    'jumpseller': '🛒'
  }
  return icons[channelType] || '📦'
}

function getChannelTypeName(channelType) {
  const names = {
    'shopify': 'Shopify Store',
    'woocommerce': 'WooCommerce',
    'mercadolibre': 'MercadoLibre',
    'general_store': 'Tienda General',
    'jumpseller': 'Jumpseller'
  }
  return names[channelType] || channelType
}

function redirectToChannels() {
  router.push('/app/admin/channels')
  emit('close-create')
  toast.info('Redirigiendo a la configuración de canales...')
}
/**
 * Clear selected file
 */
function clearSelectedFile() {
  // Reset file input
  const fileInput = document.getElementById('bulk-file-input')
  if (fileInput) {
    fileInput.value = ''
  }
  
  // Emit event to clear file in parent
  emit('file-selected', { target: { files: [] } })
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get selected driver info
 */
function getSelectedDriver() {
  return props.availableDrivers.find(driver => driver._id === props.selectedDriverId)
}

/**
 * Get bulk selected driver info
 */
function getBulkSelectedDriver() {
  return props.availableDrivers.find(driver => driver._id === props.bulkSelectedDriverId)
}

/**
 * Get order number (handle both object and ID)
 */
function getOrderNumber(order) {
  if (typeof order === 'object') {
    return order.order_number
  }
  // If it's just an ID, we'd need to find the order in a list
  return 'N/A'
}

/**
 * Get order customer (handle both object and ID)
 */
function getOrderCustomer(order) {
  if (typeof order === 'object') {
    return order.customer_name
  }
  return 'N/A'
}

/**
 * Get order address (handle both object and ID)
 */
function getOrderAddress(order) {
  if (typeof order === 'object') {
    return order.shipping_address
  }
  return 'N/A'
}

/**
 * Get successful assignments count
 */
function getSuccessfulAssignments() {
  return props.bulkAssignmentResults.filter(result => result.success).length
}

/**
 * Get failed assignments count
 */
function getFailedAssignments() {
  return props.bulkAssignmentResults.filter(result => !result.success).length
}

/**
 * Get failed results
 */
function getFailedResults() {
  return props.bulkAssignmentResults.filter(result => !result.success)
}
// ==================== OPTIMIZACIÓN DE RUTA ====================
const isOptimizing = ref(false)

async function optimizeAssignedOrders() {
  if (!props.bulkSelectedDriverId) {
    toast.error('Selecciona un conductor primero')
    return
  }

  if (!props.selectedOrders || props.selectedOrders.length === 0) {
    toast.error('Selecciona pedidos para optimizar')
    return
  }

  try {
    isOptimizing.value = true
    toast.info('🚀 Optimizando ruta...')

    const payload = {
      startLocation: {
        latitude: -33.4569,
        longitude: -70.6483,
        address: 'Bodega Central, Santiago'
      },
      endLocation: {
        latitude: -33.4172,
        longitude: -70.5476,
        address: 'Casa del Conductor'
      },
      orderIds: props.selectedOrders.map(o => o._id || o.id),
      driverId: props.bulkSelectedDriverId,
      preferences: {
        avoidTolls: false,
        avoidHighways: false,
        prioritizeTime: true
      }
    }

    console.log('🧭 Enviando payload a /routes/optimize:', payload)
    const response = await apiService.routes.optimize(payload)
    const result = response.data.data

    if (!result) throw new Error('No se recibió respuesta de optimización')

    toast.success(`✅ Ruta optimizada correctamente`)

    // Abrir la ruta optimizada en nueva pestaña
    if (confirm('¿Deseas ver la ruta optimizada ahora?')) {
      window.open(`/routes/${result.routePlan._id}`, '_blank')
    }

  } catch (error) {
    console.error('❌ Error optimizando ruta:', error)
    toast.error(
      error.response?.data?.message ||
      error.message ||
      'Error al optimizar la ruta'
    )
  } finally {
    isOptimizing.value = false
  }
}

// ==================== WATCHERS (Agregar este) ====================
watch(() => props.newOrder?.company_id, (newCompanyId) => {
  if (newCompanyId) {
    handleCompanyChange()
  } else {
    // Reset when no company is selected
    availableChannels.value = []
    if (props.newOrder) {
      props.newOrder.channel_id = ''
    }
  }
})
</script>

<style scoped>
/* ==================== AGREGAR AL FINAL DEL <style scoped> ==================== */

/* ESTILOS PARA EL SELECTOR DE CANAL */
.section-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
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

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.form-help {
  color: #6b7280;
  font-size: 12px;
  margin-top: 6px;
  display: block;
}
/* ==================== FORM STYLES ==================== */
.create-order-content,
.bulk-upload-content,
.assign-content,
.bulk-assign-content {
  max-height: 80vh;
  overflow-y: auto;
  padding: 0;
}

.form-section,
.upload-section,
.assign-section,
.bulk-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-of-type,
.upload-section:last-of-type,
.assign-section:last-of-type,
.bulk-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.section-icon {
  font-size: 20px;
}

.section-description {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  align-items: start;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-label.required::after {
  content: ' *';
  color: #dc2626;
}

.form-input,
.form-select,
.form-textarea {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-weight: 500;
  z-index: 1;
}

.input-with-prefix .form-input {
  padding-left: 32px;
}

/* ==================== FILE UPLOAD STYLES ==================== */
.file-upload-area {
  margin-bottom: 20px;
}

.file-upload-zone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  background: #f9fafb;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-upload-zone:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.file-upload-zone.has-file {
  border-color: #10b981;
  background: #ecfdf5;
}

.file-input {
  display: none;
}

.file-upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.upload-icon {
  font-size: 48px;
  opacity: 0.7;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upload-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.upload-subtitle {
  font-size: 14px;
  color: #6b7280;
}

.file-info {
  margin-top: 16px;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.file-icon {
  font-size: 24px;
}

.file-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-weight: 500;
  color: #1f2937;
}

.file-size {
  font-size: 12px;
  color: #6b7280;
}

.file-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.2s;
}

.file-remove:hover {
  background: #fecaca;
}

/* ==================== UPLOAD FEEDBACK ==================== */
.upload-feedback {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.upload-feedback.processing {
  background: #dbeafe;
  border: 1px solid #93c5fd;
}

.upload-feedback.success {
  background: #d1fae5;
  border: 1px solid #86efac;
}

.upload-feedback.error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
}

.feedback-icon {
  font-size: 20px;
  margin-top: 2px;
}

.feedback-content {
  flex: 1;
}

.feedback-message {
  color: #1f2937;
  font-size: 14px;
  line-height: 1.5;
}

.feedback-progress {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 100%; }
  100% { width: 0%; }
}

/* ==================== TEMPLATE DOWNLOAD ==================== */
.template-info {
  text-align: center;
  padding: 24px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.template-description {
  margin: 0 0 16px 0;
  color: #6b7280;
  line-height: 1.5;
}

.btn-template-download {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-template-download:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* ==================== ORDER SUMMARY STYLES ==================== */
.order-summary {
  margin-bottom: 24px;
}

.summary-header {
  margin-bottom: 16px;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.summary-icon {
  font-size: 18px;
}

.order-details-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.order-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.order-info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #6b7280;
}

.info-value {
  color: #1f2937;
  font-weight: 500;
}

/* ==================== DRIVER SELECTION STYLES ==================== */
.driver-selection {
  margin-bottom: 24px;
}

.driver-select {
  width: 100%;
  margin-bottom: 16px;
}

.selected-driver-info {
  margin-top: 16px;
}

.driver-card {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.driver-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.driver-icon {
  font-size: 20px;
}

.driver-name {
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.driver-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  background: #fee2e2;
  color: #991b1b;
}

.driver-status.active {
  background: #d1fae5;
  color: #065f46;
}

.driver-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.driver-detail {
  display: flex;
  gap: 8px;
}

.detail-label {
  font-weight: 500;
  color: #6b7280;
  min-width: 60px;
}

.detail-value {
  color: #1f2937;
}

/* ==================== BULK ASSIGNMENT STYLES ==================== */
.selected-orders-summary {
  margin-bottom: 24px;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.order-summary-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.order-customer {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 2px;
}

.order-address {
  font-size: 12px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-orders-card {
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.more-icon {
  font-size: 24px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.more-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.bulk-driver-selection {
  margin-bottom: 24px;
}

.bulk-driver-preview {
  margin-top: 16px;
}

.assignment-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ecfdf5;
  border: 1px solid #86efac;
  border-radius: 8px;
}

.preview-icon {
  font-size: 24px;
}

.preview-text {
  color: #065f46;
  font-size: 14px;
}

/* ==================== PROGRESS STYLES ==================== */
.assignment-progress {
  margin-bottom: 24px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-weight: 500;
  color: #1f2937;
}

.progress-counter {
  font-weight: 600;
  color: #3b82f6;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
}

.progress-percentage {
  font-weight: 600;
  color: #1f2937;
  min-width: 40px;
  text-align: right;
}

.recent-results {
  background: #f8fafc;
  border-radius: 6px;
  padding: 12px;
}

.results-header {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.result-item.success {
  background: #d1fae5;
  color: #065f46;
}

.result-item.error {
  background: #fee2e2;
  color: #991b1b;
}

.result-icon {
  font-size: 14px;
}

.result-order {
  font-weight: 500;
  min-width: 80px;
}

.result-message {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== RESULTS STYLES ==================== */
.assignment-results {
  margin-bottom: 24px;
}

.results-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.result-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid;
}

.result-stat.success {
  background: #ecfdf5;
  border-color: #86efac;
}

.result-stat.error {
  background: #fef2f2;
  border-color: #fca5a5;
}

.stat-icon {
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.failed-assignments {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 16px;
}

.failed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.failed-icon {
  font-size: 18px;
}

.failed-title {
  font-weight: 600;
  color: #991b1b;
}

.failed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.failed-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.failed-order {
  font-weight: 500;
  color: #991b1b;
  min-width: 80px;
}

.failed-error {
  flex: 1;
  color: #7f1d1d;
  font-size: 14px;
}

/* ==================== LOADING & EMPTY STATES ==================== */
.loading-state,
.empty-drivers {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f1f5f9;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #6b7280;
  font-weight: 500;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-message {
  color: #6b7280;
  margin: 0;
}

/* ==================== MODAL ACTIONS ==================== */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 0 0;
  border-top: 1px solid #e5e7eb;
  margin-top: 32px;
}

.btn-modal {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modal.cancel {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-modal.cancel:hover {
  background: #e5e7eb;
}

.btn-modal.save {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.btn-modal.save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-modal.save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 16px;
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .orders-grid {
    grid-template-columns: 1fr;
  }
  
  .results-summary {
    grid-template-columns: 1fr;
  }
  
  .order-info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .modal-actions {
    flex-direction: column-reverse;
  }
  
  .btn-modal {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .create-order-content,
  .bulk-upload-content,
  .assign-content,
  .bulk-assign-content {
    padding: 0 8px;
  }
  
  .file-upload-zone {
    padding: 24px 16px;
  }
  
  .upload-icon {
    font-size: 36px;
  }
  
  .section-title {
    font-size: 16px;
  }
  
  .btn-text {
    display: none;
  }
  
  .assignment-preview {
    flex-direction: column;
    text-align: center;
  }
}
</style>