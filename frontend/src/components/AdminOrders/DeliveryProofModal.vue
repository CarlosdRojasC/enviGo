<template>
  <Modal 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    title="Confirmar Entrega" 
    width="600px"
    class="delivery-proof-modal"
  >
    <div class="delivery-content">
      <!-- Información de la orden -->
      <div class="order-info-section">
        <div class="info-header">
          <span class="info-icon">📦</span>
          <h4>Orden #{{ order?.order_number }}</h4>
        </div>
        <div class="info-details">
          <p class="info-address">{{ order?.shipping_address }}</p>
          <p class="info-customer">{{ order?.customer_name }}</p>
        </div>
      </div>

      <!-- Nombre del receptor -->
      <div class="form-group">
        <label class="form-label">
          <span class="label-icon">👤</span>
          Nombre de quien recibe
        </label>
        <input
          v-model="recipientName"
          type="text"
          placeholder="Nombre completo del receptor"
          class="form-input"
        />
      </div>

      <!-- Sección de foto -->
      <div class="form-group">
        <label class="form-label required">
          <span class="label-icon">📸</span>
          Foto de Prueba
        </label>

        <!-- Botones para capturar/subir -->
        <div v-if="!photoPreview && !useCamera" class="photo-actions">
          <button 
            @click="startCamera" 
            class="btn-photo camera"
            type="button"
          >
            <span class="btn-icon">📷</span>
            Tomar Foto
          </button>
          
          <button 
            @click="$refs.fileInput.click()" 
            class="btn-photo upload"
            type="button"
          >
            <span class="btn-icon">📁</span>
            Subir Foto
          </button>
          
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileUpload"
            style="display: none;"
          />
        </div>

        <!-- Vista de cámara -->
        <div v-if="useCamera" class="camera-view">
          <video
            ref="videoElement"
            autoplay
            playsinline
            class="camera-preview"
          ></video>
          
          <div class="camera-actions">
            <button 
              @click="capturePhoto" 
              class="btn-camera capture"
              type="button"
            >
              📸 Capturar
            </button>
            <button 
              @click="stopCamera" 
              class="btn-camera cancel"
              type="button"
            >
              ❌ Cancelar
            </button>
          </div>
        </div>

        <!-- Preview de la foto -->
        <div v-if="photoPreview" class="photo-preview">
          <img :src="photoPreview" alt="Prueba de entrega" />
          <button 
            @click="removePhoto" 
            class="btn-remove-photo"
            type="button"
          >
            🗑️ Eliminar
          </button>
        </div>

        <canvas ref="canvasElement" style="display: none;"></canvas>
      </div>

      <!-- Notas adicionales -->
      <div class="form-group">
        <label class="form-label">
          <span class="label-icon">📝</span>
          Notas adicionales
        </label>
        <textarea
          v-model="notes"
          placeholder="Ejemplo: Entregado en portería, dejado con vecino..."
          rows="3"
          class="form-textarea"
        ></textarea>
      </div>

      <!-- Acciones del modal -->
      <div class="modal-actions">
        <button 
          @click="$emit('update:modelValue', false)" 
          class="btn-modal cancel"
          type="button"
          :disabled="loading"
        >
          <span class="btn-icon">❌</span>
          <span class="btn-text">Cancelar</span>
        </button>
        
        <button 
          @click="handleSubmit" 
          class="btn-modal confirm"
          type="button"
          :disabled="!photoPreview || loading"
        >
          <span class="btn-icon">{{ loading ? '⏳' : '✅' }}</span>
          <span class="btn-text">
            {{ loading ? 'Enviando...' : 'Confirmar Entrega' }}
          </span>
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '../Modal.vue'

const props = defineProps({
  modelValue: Boolean,
  order: Object
})

const emit = defineEmits(['update:modelValue', 'submit'])

// Estados
const recipientName = ref('')
const photoPreview = ref(null)
const photo = ref(null)
const notes = ref('')
const loading = ref(false)
const useCamera = ref(false)

// Referencias
const videoElement = ref(null)
const canvasElement = ref(null)
const fileInput = ref(null)
const streamRef = ref(null)

// Convertir archivo a base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Manejar subida de archivo
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    alert('Por favor selecciona una imagen válida')
    return
  }

  // Validar tamaño (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen es demasiado grande. Máximo 5MB')
    return
  }

  try {
    const base64 = await fileToBase64(file)
    photo.value = base64
    photoPreview.value = base64
  } catch (error) {
    console.error('Error al procesar imagen:', error)
    alert('Error al procesar la imagen')
  }
}

// Iniciar cámara
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      streamRef.value = stream
      useCamera.value = true
    }
  } catch (error) {
    console.error('Error accediendo a la cámara:', error)
    alert('No se pudo acceder a la cámara. Intenta subir una foto.')
  }
}

// Detener cámara
const stopCamera = () => {
  if (streamRef.value) {
    streamRef.value.getTracks().forEach(track => track.stop())
    streamRef.value = null
  }
  useCamera.value = false
}

// Capturar foto
const capturePhoto = () => {
  if (!videoElement.value || !canvasElement.value) return

  const video = videoElement.value
  const canvas = canvasElement.value
  
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const context = canvas.getContext('2d')
  context.drawImage(video, 0, 0)
  
  const base64 = canvas.toDataURL('image/jpeg', 0.8)
  photo.value = base64
  photoPreview.value = base64
  
  stopCamera()
}

// Eliminar foto
const removePhoto = () => {
  photo.value = null
  photoPreview.value = null
  stopCamera()
}

// Resetear formulario
const resetForm = () => {
  recipientName.value = ''
  photo.value = null
  photoPreview.value = null
  notes.value = ''
  loading.value = false
  stopCamera()
}

// Enviar
const handleSubmit = async () => {
  if (!photo.value) {
    alert('Por favor toma o sube una foto como prueba de entrega')
    return
  }

  loading.value = true

  try {
    await emit('submit', {
      photo: photo.value,
      recipient_name: recipientName.value || 'No especificado',
      notes: notes.value
    })
    
    resetForm()
  } catch (error) {
    console.error('Error:', error)
    alert('Error al confirmar entrega')
  } finally {
    loading.value = false
  }
}

// Limpiar al cerrar
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})
</script>

<style scoped>
.delivery-content {
  padding: 1.5rem;
}

.order-info-section {
  background: #eff6ff;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #bfdbfe;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.info-icon {
  font-size: 1.5rem;
}

.info-header h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e40af;
}

.info-details p {
  margin: 0.25rem 0;
  color: #1e3a8a;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-label.required::after {
  content: '*';
  color: #ef4444;
  margin-left: 0.25rem;
}

.label-icon {
  font-size: 1.2rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.photo-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-photo {
  flex: 1;
  padding: 1rem;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.btn-photo:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.btn-photo .btn-icon {
  font-size: 2rem;
}

.camera-view {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.camera-preview {
  width: 100%;
  display: block;
}

.camera-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f9fafb;
}

.btn-camera {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-camera.capture {
  background: #10b981;
  color: white;
}

.btn-camera.capture:hover {
  background: #059669;
}

.btn-camera.cancel {
  background: #ef4444;
  color: white;
}

.btn-camera.cancel:hover {
  background: #dc2626;
}

.photo-preview {
  position: relative;
  border: 2px solid #10b981;
  border-radius: 8px;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  display: block;
}

.btn-remove-photo {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-remove-photo:hover {
  background: rgba(220, 38, 38, 1);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-modal {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-modal.cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-modal.cancel:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-modal.confirm {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-modal.confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-modal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>