<template>
  <div class="driver-form">
    <div class="form-header">
      <h2>{{ isEditing ? 'Editar Conductor' : 'Nuevo Conductor' }}</h2>
      <button @click="$emit('cancel')" class="close-btn">×</button>
    </div>

    <form @submit.prevent="submitForm" class="form-content">
      <div class="form-sections">
        <!-- Información Personal -->
        <div class="form-section">
          <h3>Información Personal</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="name">Nombre Completo *</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                placeholder="Ej: Juan Pérez"
                :class="{ error: errors.name }"
                required
              />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="email">Email *</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="Ej: juan@ejemplo.com"
                :class="{ error: errors.email }"
                required
              />
              <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
            </div>
            
            <div class="form-group">
              <label for="phone">Teléfono *</label>
              <input
                id="phone"
                v-model="form.phone"
                type="tel"
                placeholder="Ej: +56912345678"
                :class="{ error: errors.phone }"
                required
              />
              <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
            </div>
          </div>
        </div>

        <!-- Información del Vehículo -->
        <div class="form-section">
          <h3>Información del Vehículo</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="vehicle_type">Tipo de Vehículo</label>
              <select
                id="vehicle_type"
                v-model="form.vehicle_type"
                :class="{ error: errors.vehicle_type }"
              >
                <option value="">Seleccionar...</option>
                <option value="car">🚗 Auto</option>
                <option value="motorcycle">🏍️ Motocicleta</option>
                <option value="bicycle">🚲 Bicicleta</option>
                <option value="truck">🚚 Camión</option>
                <option value="van">🚐 Van</option>
              </select>
              <span v-if="errors.vehicle_type" class="error-message">{{ errors.vehicle_type }}</span>
            </div>
            
            <div class="form-group">
              <label for="vehicle_plate">Placa del Vehículo</label>
              <input
                id="vehicle_plate"
                v-model="form.vehicle_plate"
                type="text"
                placeholder="Ej: ABC-1234"
                :class="{ error: errors.vehicle_plate }"
              />
              <span v-if="errors.vehicle_plate" class="error-message">{{ errors.vehicle_plate }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="driver_license">Licencia de Conducir</label>
              <input
                id="driver_license"
                v-model="form.driver_license"
                type="text"
                placeholder="Ej: 12345678"
                :class="{ error: errors.driver_license }"
              />
              <span v-if="errors.driver_license" class="error-message">{{ errors.driver_license }}</span>
            </div>
          </div>
        </div>

        <!-- Configuración -->
        <div class="form-section">
          <h3>Configuración</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="checkbox-label">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                />
                <span class="checkbox-text">Conductor Activo</span>
                <span class="checkbox-description">El conductor podrá recibir asignaciones</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Error General -->
      <div v-if="errors.general" class="general-error">
        <span class="error-message">{{ errors.general }}</span>
      </div>

      <!-- Botones -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel">
          Cancelar
        </button>
        <button type="submit" :disabled="loading || !formValid" class="btn-submit">
          {{ loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Conductor') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { shipdayService } from '../services/shipday'

const props = defineProps({
  driver: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['success', 'cancel'])

// Estado del formulario
const form = ref({
  name: '',
  email: '',
  phone: '',
  vehicle_type: '',
  vehicle_plate: '',
  driver_license: '',
  is_active: true
})

const errors = ref({})
const loading = ref(false)

// Computed
const isEditing = computed(() => !!props.driver)

const formValid = computed(() => {
  return form.value.name.trim().length >= 2 &&
         form.value.email.trim().length > 0 &&
         form.value.phone.trim().length >= 8 &&
         !Object.keys(errors.value).some(key => key !== 'general' && errors.value[key])
})

// Watchers para validación en tiempo real
watch(() => form.value.name, validateName)
watch(() => form.value.email, validateEmail)
watch(() => form.value.phone, validatePhone)

// Lifecycle
onMounted(() => {
  if (props.driver) {
    populateForm()
  }
})

// Métodos
const populateForm = () => {
  const driver = props.driver
  
  form.value = {
    name: getDriverName(driver),
    email: getDriverEmail(driver),
    phone: getDriverPhone(driver),
    vehicle_type: driver.vehicleType || '',
    vehicle_plate: driver.plateNumber || driver.vehicle_plate || '',
    driver_license: driver.driver_license || '',
    is_active: driver.is_active !== undefined ? driver.is_active : driver.isActive !== undefined ? driver.isActive : true
  }
}

// Helper functions para extraer datos del driver
const getDriverName = (driver) => {
  return driver?.name || driver?.full_name || driver?.firstName || ''
}

const getDriverEmail = (driver) => {
  return driver?.email || ''
}

const getDriverPhone = (driver) => {
  return driver?.phone || driver?.phoneNumber || driver?.mobile || ''
}

// Validaciones
const validateName = () => {
  const name = form.value.name.trim()
  if (name.length < 2) {
    errors.value.name = 'El nombre debe tener al menos 2 caracteres'
  } else if (name.length > 100) {
    errors.value.name = 'El nombre no puede tener más de 100 caracteres'
  } else {
    delete errors.value.name
  }
}

const validateEmail = () => {
  const email = form.value.email.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    errors.value.email = 'El email es requerido'
  } else if (!emailRegex.test(email)) {
    errors.value.email = 'El formato del email es inválido'
  } else {
    delete errors.value.email
  }
}

const validatePhone = () => {
  const phone = form.value.phone.trim()
  const phoneRegex = /^[\d\s\-\+\(\)]{8,15}$/
  
  if (!phone) {
    errors.value.phone = 'El teléfono es requerido'
  } else if (!phoneRegex.test(phone)) {
    errors.value.phone = 'El formato del teléfono es inválido (8-15 dígitos)'
  } else {
    delete errors.value.phone
  }
}

const validateForm = () => {
  validateName()
  validateEmail()
  validatePhone()
  
  // Validar tipo de vehículo si se proporciona
  if (form.value.vehicle_type && !['car', 'motorcycle', 'bicycle', 'truck', 'van'].includes(form.value.vehicle_type)) {
    errors.value.vehicle_type = 'Tipo de vehículo inválido'
  } else {
    delete errors.value.vehicle_type
  }
  
  return Object.keys(errors.value).filter(key => key !== 'general').length === 0
}

const submitForm = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  errors.value.general = null

  try {
    const formData = {
      name: form.value.name.trim(),
      email: form.value.email.trim().toLowerCase(),
      phone: form.value.phone.trim(),
      vehicleType: form.value.vehicle_type || undefined,
      plateNumber: form.value.vehicle_plate.trim() || undefined,
      isActive: form.value.is_active
    }

    let result
    let message

    if (isEditing.value) {
      // Actualizar conductor existente
      const driverId = getDriverId(props.driver)
      result = await shipdayService.updateDriver(driverId, formData)
      message = 'Conductor actualizado exitosamente'
    } else {
      // Crear nuevo conductor
      result = await shipdayService.createDriver(formData)
      message = 'Conductor creado exitosamente'
    }

    emit('success', {
      driver: result.data || result,
      message
    })

  } catch (error) {
    console.error('❌ Error en formulario de conductor:', error)
    
    let errorMessage = 'Error al procesar la solicitud'
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }
    
    // Manejar errores específicos
    if (errorMessage.includes('email')) {
      errors.value.email = 'Este email ya está registrado'
    } else if (errorMessage.includes('phone')) {
      errors.value.phone = 'Este teléfono ya está registrado'
    } else {
      errors.value.general = errorMessage
    }
  } finally {
    loading.value = false
  }
}

const getDriverId = (driver) => {
  return driver?.email || driver?.id || driver?._id
}
</script>

<style scoped>
.driver-form {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.form-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.form-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.form-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
  font-size: 14px;
}

.form-group input,
.form-group select {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input.error,
.form-group select.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.checkbox-label:hover {
  background-color: #f9fafb;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  width: auto;
}

.checkbox-text {
  font-weight: 500;
  color: #374151;
  margin: 0;
}

.checkbox-description {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

.general-error {
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  margin-top: 24px;
}

.btn-cancel {
  background: #6b7280;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: #4b5563;
}

.btn-submit {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}

.btn-submit:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .driver-form {
    max-width: 95%;
    margin: 20px;
  }
  
  .form-header {
    padding: 16px;
  }
  
  .form-content {
    padding: 16px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>