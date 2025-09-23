<template>
  <Modal 
    :model-value="show" 
    @update:model-value="(value) => !value && $emit('close')"
    title="Subida Masiva de Pedidos" 
    width="700px"
    class="bulk-upload-modal customer-modal"
  >
    <div class="bulk-upload-content">
      
      <!-- Sección de Información -->
      <div class="upload-section info-section">
        <div class="section-header">
          <h4 class="section-title">
            <span class="section-icon">ℹ️</span>
            Información Importante
          </h4>
        </div>
        
        <div class="info-card">
          <p class="info-text">
            La subida masiva te permite cargar múltiples pedidos de una vez usando un archivo Excel.
            Todos los pedidos serán asignados automáticamente a tu empresa.
          </p>
          <ul class="info-list">
            <li>Máximo 100 pedidos por archivo</li>
            <li>Tamaño máximo: 10MB</li>
            <li>Solo archivos Excel (.xlsx, .xls)</li>
          </ul>
        </div>
      </div>

      <!-- Sección de Plantilla -->
      <div class="upload-section">
        <div class="section-header">
          <h4 class="section-title">
            <span class="section-icon">📋</span>
            Plantilla de Importación
          </h4>
        </div>
        
        <div class="template-section">
          <div class="template-info">
            <p class="template-description">
              Descarga la plantilla de Excel con el formato requerido.
            </p>
          </div>
          
          <button 
            @click="$emit('download-template')" 
            class="btn-template"
            :disabled="downloadingTemplate"
          >
            <span class="btn-icon">{{ downloadingTemplate ? '⏳' : '📥' }}</span>
            <span class="btn-text">
              {{ downloadingTemplate ? 'Descargando...' : 'Descargar Plantilla' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Sección de Subida de Archivo -->
      <div class="upload-section">
        <div class="section-header">
          <h4 class="section-title">
            <span class="section-icon">📁</span>
            Seleccionar Archivo
          </h4>
        </div>
        
        <div class="file-upload-area">
          <input 
            ref="fileInput"
            type="file" 
            accept=".xlsx,.xls" 
            @change="$emit('file-selected', $event)"
            class="file-input"
            id="customer-bulk-upload-file"
          />
          
          <label 
            for="customer-bulk-upload-file" 
            class="file-upload-label"
            :class="{ 'file-selected': selectedFile }"
          >
            <div class="upload-icon">
              {{ selectedFile ? '📄' : '⬆️' }}
            </div>
            
            <div class="upload-text">
              <div class="upload-title">
                {{ selectedFile ? selectedFile.name : 'Seleccionar archivo Excel' }}
              </div>
              <div class="upload-subtitle">
                {{ selectedFile ? 
                  `Tamaño: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB` : 
                  'Archivos .xlsx, .xls hasta 10MB' 
                }}
              </div>
            </div>
            
            <div v-if="selectedFile" class="file-actions">
              <button 
                @click.stop="$emit('clear-file')" 
                class="btn-clear"
                type="button"
              >
                🗑️ Quitar
              </button>
            </div>
          </label>
        </div>
      </div>

      <!-- Opciones de Integración -->
      <div class="upload-section">
        <div class="section-header">
          <h4 class="section-title">
            <span class="section-icon">⚙️</span>
            Opciones de Integración
          </h4>
        </div>
        
        <div class="integration-options">
          <div class="option-card">
            <div class="option-header">
              <input 
                type="checkbox" 
                id="create-in-circuit"
                :checked="createInCircuit"
                @change="$emit('update:createInCircuit', $event.target.checked)"
                class="option-checkbox"
              />
              <label for="create-in-circuit" class="option-label">
                <span class="option-icon">🔄</span>
                <span class="option-title">Crear en Circuit</span>
              </label>
            </div>
            <p class="option-description">
              Crear automáticamente las rutas de entrega en Circuit
            </p>
          </div>
          
          <div class="option-card">
            <div class="option-header">
              <input 
                type="checkbox" 
                id="create-in-shipday"
                :checked="createInShipday"
                @change="$emit('update:createInShipday', $event.target.checked)"
                class="option-checkbox"
              />
              <label for="create-in-shipday" class="option-label">
                <span class="option-icon">🚢</span>
                <span class="option-title">Crear en ShipDay</span>
              </label>
            </div>
            <p class="option-description">
              Sincronizar pedidos con ShipDay para gestión de entregas
            </p>
          </div>
        </div>
      </div>

      <!-- Feedback -->
      <div v-if="uploadFeedback" class="upload-feedback" :class="uploadStatus">
        <div class="feedback-header">
          <div class="feedback-icon">
            {{ 
              uploadStatus === 'processing' ? '⏳' : 
              uploadStatus === 'success' ? '✅' : 
              uploadStatus === 'error' ? '❌' : 'ℹ️' 
            }}
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
      </div>

      <!-- Acciones -->
      <div class="modal-actions">
        <button 
          @click="$emit('close')" 
          class="btn-modal cancel"
          :disabled="isUploading"
        >
          ❌ Cancelar
        </button>
        
        <button 
          @click="$emit('upload')" 
          :disabled="!selectedFile || isUploading" 
          class="btn-modal save"
        >
          {{ isUploading ? '⏳ Procesando...' : '⬆️ Subir Pedidos' }}
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import Modal from '../Modal.vue'

defineProps({
  show: Boolean,
  selectedFile: Object,
  downloadingTemplate: Boolean,
  isUploading: Boolean,
  uploadFeedback: String,
  uploadStatus: String,
  createInCircuit: Boolean,
  createInShipday: Boolean
})

defineEmits([
  'close',
  'download-template',
  'file-selected',
  'clear-file',
  'upload',
  'update:createInCircuit',
  'update:createInShipday'
])
</script>

<style scoped>
.bulk-upload-content {
  max-height: 70vh;
  overflow-y: auto;
}

.upload-section {
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.info-section {
  background: #f8fafc;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.info-card {
  background: white;
  padding: 16px;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.info-text {
  margin: 0 0 12px 0;
  color: #4b5563;
}

.info-list {
  margin: 0;
  padding-left: 20px;
  color: #6b7280;
}

.info-list li {
  margin-bottom: 4px;
}

.template-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.template-info {
  flex: 1;
}

.template-description {
  margin: 0;
  color: #6b7280;
}

.btn-template {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-template:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-template:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-upload-area {
  position: relative;
}

.file-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.file-upload-label {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.file-upload-label:hover,
.file-upload-label.file-selected {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.upload-icon {
  font-size: 2rem;
}

.upload-text {
  flex: 1;
}

.upload-title {
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.upload-subtitle {
  color: #6b7280;
  font-size: 0.875rem;
}

.btn-clear {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-clear:hover {
  background: #dc2626;
}

.integration-options {
  display: grid;
  gap: 16px;
}

.option-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fafafa;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.option-checkbox {
  margin: 0;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.option-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.upload-feedback {
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.upload-feedback.processing {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.upload-feedback.success {
  background: #d1fae5;
  border-left: 4px solid #10b981;
}

.upload-feedback.error {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
}

.feedback-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.feedback-icon {
  font-size: 1.25rem;
}

.feedback-content {
  flex: 1;
}

.feedback-message {
  color: #374151;
  white-space: pre-line;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(0,0,0,0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0; }
  50% { width: 70%; }
  100% { width: 100%; }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-modal {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modal.cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-modal.cancel:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-modal.save {
  background: #3b82f6;
  color: white;
}

.btn-modal.save:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-modal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}
</style>