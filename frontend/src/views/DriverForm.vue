<template>
  <div class="driver-form">
    <h2 class="form-title">{{ isEditing ? 'Editar Conductor' : 'Nuevo Conductor' }}</h2>
    
    <form @submit.prevent="handleSubmit" class="form">
      <!-- Información Personal -->
      <div class="form-section">
        <h3 class="section-title">Información Personal</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="name">Nombre Completo *</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              :class="{ error: errors.name }"
              placeholder="Ej: Juan Pérez"
              required
            />
            <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
          </div>
          
          <div class="form-group">
            <label for="email">Email *</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              :class="{ error: errors.email }"
              placeholder="Ej: juan@ejemplo.com"
              required
              :disabled="isEditing"
            />
            <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
            <span v-if="isEditing" class="help-text">El email no se puede cambiar</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="phone">Teléfono *</label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              :class="{ error: errors.phone }"
              placeholder="Ej: +56 9 1234 5678"
              required
            />
            <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
          </div>
          
          <div class="form-group">
            <label for="company_name">Empresa</label>
            <input
              id="company_name"
              v-model="form.company_name"
              type="text"
              placeholder="Ej: Delivery Express"
            />
          </div>
        </div>
      </div>

      <!-- Información del Vehículo -->
      <div class="form-section">
        <h3 class="section-title">Información del Vehículo</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="vehicle_type">Tipo de Vehículo</label>
            <select id="vehicle_type" v-model="form.vehicle_type">
              <option value="">Seleccionar...</option>
              <option v-for="type in vehicleTypes" :key="type.value" :value="type.value">
                {{ type.icon }} {{ type.label }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="vehicle_plate">Placa del Vehículo</label>
            <input
              id="vehicle_plate"
              v-model="form.vehicle_plate"
              type="text"
              placeholder="Ej: ABC-1234"
            />
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
            />
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="form.is_active"
                type="checkbox"
              />
              <span class="checkbox-text">Conductor Activo</span>
            </label>
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
        <button type="submit" :disabled="loading" class="btn-submit">
          {{ loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
  company_name: '',
  vehicle_type: 'car',
  vehicle_plate: '',
  driver_license: '',
  is_active: true
})

const errors = ref({})
const loading = ref(false)

// Computed
const isEditing = computed(() => !!props.driver)
const vehicleTypes = computed(() => shipdayService.getVehicleTypes())

// Lifecycle
onMounted(() => {
  if (props.driver) {
    // Llenar formulario para edición
    const driverData = {
      name: props.driver.name || '',
      email: props.driver.email || '',
      phone: props.driver.phone || props.driver.phoneNumber || '',
      company_name: props.driver.company_name || '',
      vehicle_type: props.driver.vehicle_type || props.driver.vehicleType || 'car',
      vehicle_plate: props.driver.vehicle_plate || '',
      driver_license: props.driver.driver_license || '',
      is_active: props.driver.is_active !== undefined ? props.driver.is_active : true
    }
    Object.assign(form.value, driverData)
  }
})

// Métodos
const validateForm = () => {
  const validation = shipdayService.validateDriver(form.value)
  errors.value = validation.errors
  return validation.isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  errors.value = {}

  try {
    const driverData = shipdayService.formatDriverData(form.value)
    
    let result
    if (isEditing.value) {
      // Usar el carrierId o email como identificador
      const driverId = props.driver.carrierId || props.driver.email
      result = await shipdayService.updateDriver(driverId, driverData)
    } else {
      result = await shipdayService.createDriver(driverData)
    }

    console.log('✅ Conductor guardado:', result)
    
    // Emitir evento de éxito con los datos del conductor
    const responseData = result.data || result
    emit('success', {
      message: isEditing.value ? 'Conductor actualizado exitosamente' : 'Conductor creado exitosamente',
      driver: responseData
    })
    
    // Limpiar formulario si es creación
    if (!isEditing.value) {
      resetForm()
    }
    
  } catch (error) {
    console.error('❌ Error guardando conductor:', error)
    
    // Mostrar errores específicos
    if (error.response?.data?.error) {
      errors.value.general = error.response.data.error
    } else if (error.response?.data?.details) {
      errors.value.general = error.response.data.details
    } else {
      errors.value.general = error.message || 'Error al guardar el conductor'
    }
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    name: '',
    email: '',
    phone: '',
    company_name: '',
    vehicle_type: 'car',
    vehicle_plate: '',
    driver_license: '',
    is_active: true
  }
  errors.value = {}
}
</script>

<style scoped>
.driver-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
  text-align: center;
}

.form-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input,
.form-group select {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
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
}

.form-group input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px 0;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
}

.checkbox-text {
  font-size: 14px;
  color: #374151;
}

.error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

.help-text {
  color: #6b7280;
  font-size: 12px;
  margin-top: 4px;
  font-style: italic;
}

.general-error {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.general-error .error-message {
  margin: 0;
  font-size: 14px;
  color: #dc2626;
}

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-submit {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-submit {
  background: #3b82f6;
  color: white;
  border: none;
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
    margin: 16px;
    padding: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>