<template>
  <Modal 
    :model-value="show" 
    @update:model-value="(value) => !value && $emit('close')"
    title="Solicitar Colecta" 
    width="500px"
  >
    <div class="collection-request-content">
      <div class="company-info">
        <h4>Información de colecta</h4>
        <div class="info-card">
          <p><strong>Empresa:</strong> {{ companyName }}</p>
          <p><strong>Dirección:</strong> {{ companyAddress }}</p>
        </div>
      </div>
<div class="form-group">
  <label class="required">Fecha preferida para colecta</label>
  <input 
    type="date" 
    v-model="collectionDate"
    :min="minDate"
    :max="maxDate"
    class="date-input"
    required
  />
  <small class="help-text">
    Selecciona cuándo prefieres que recojan los paquetes
  </small>
</div>
      <div class="form-section">
        <div class="form-group">
          <label class="required">Cantidad de paquetes</label>
          <input 
            type="number" 
            v-model.number="packageCount"
            min="1"
            max="999"
            class="package-input"
            placeholder="Ej: 15"
            required
          />
          <small class="help-text">
            Indica cuántos paquetes tienes listos para recoger
          </small>
        </div>

        <div class="form-group">
          <label>Notas adicionales (opcional)</label>
          <textarea 
            v-model="notes"
            rows="3"
            placeholder="Instrucciones especiales, horarios preferidos, etc..."
            class="notes-input"
          ></textarea>
        </div>

        <div class="info-alert">
          <div class="alert-icon">📞</div>
          <div class="alert-text">
            <p><strong>¿Qué sucede después?</strong></p>
            <p>Nuestro equipo se contactará contigo para coordinar la colecta en las próximas horas.</p>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button 
          @click="$emit('close')" 
          class="btn-cancel"
          :disabled="isRequesting"
        >
          Cancelar
        </button>
        
        <button 
          @click="handleSubmit" 
          class="btn-confirm"
          :disabled="!packageCount || packageCount < 1 || isRequesting"
        >
          {{ isRequesting ? 'Enviando...' : 'Solicitar Colecta' }}
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import Modal from '../Modal.vue'

const props = defineProps({
  show: Boolean,
  companyName: String,
  companyAddress: String,
  isRequesting: Boolean
})

const emit = defineEmits(['close', 'submit'])
const collectionDate = ref('')
const packageCount = ref(1)
const notes = ref('')

const minDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

const maxDate = computed(() => {
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 14)
  return maxDate.toISOString().split('T')[0]
})

// Resetear formulario cuando se abre
watch(() => props.show, (show) => {
  if (show) {
    packageCount.value = 1
    notes.value = ''
  }
})

function handleSubmit() {
  if (!packageCount.value || !collectionDate.value) return
  
  emit('submit', {
    packageCount: packageCount.value,
    collectionDate: collectionDate.value,
    notes: notes.value
  })
}
</script>

<style scoped>
.collection-request-content {
  max-height: 70vh;
  overflow-y: auto;
}

.company-info {
  margin-bottom: 24px;
}

.company-info h4 {
  margin: 0 0 12px 0;
  color: #374151;
}

.info-card {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.info-card p {
  margin: 4px 0;
  color: #6b7280;
}

.form-section {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.form-group label.required::after {
  content: " *";
  color: #ef4444;
}

.package-input, .notes-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.package-input:focus, .notes-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.help-text {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.info-alert {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #0ea5e9;
}

.alert-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.alert-text p {
  margin: 0 0 4px 0;
  color: #0c4a6e;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-confirm {
  background: #0ea5e9;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #0284c7;
  transform: translateY(-1px);
}

.btn-cancel:disabled, .btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}
</style>