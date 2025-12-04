<template>
  <div class="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
    <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">
      {{ isEditing ? 'Editar Conductor' : 'Nuevo Conductor' }}
    </h2>
    
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Información Personal -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-200">
          Información Personal
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex flex-col">
            <label for="name" class="text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              :class="errors.name ? 'border-red-500' : 'border-gray-300'"
              placeholder="Ej: Juan Pérez"
              required
            />
            <span v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</span>
          </div>
          
          <div class="flex flex-col">
            <label for="email" class="text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
              :class="errors.email ? 'border-red-500' : 'border-gray-300'"
              placeholder="Ej: juan@ejemplo.com"
              required
              :disabled="isEditing"
            />
            <span v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</span>
            <span v-if="isEditing" class="text-gray-500 text-xs mt-1 italic">El email no se puede cambiar</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex flex-col">
            <label for="phone" class="text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              :class="errors.phone ? 'border-red-500' : 'border-gray-300'"
              placeholder="Ej: +56 9 1234 5678"
              required
            />
            <span v-if="errors.phone" class="text-red-500 text-xs mt-1">{{ errors.phone }}</span>
          </div>
          
          <!-- Campo Password: Requerido solo al crear -->
          <div class="flex flex-col">
            <label for="password" class="text-sm font-medium text-gray-700 mb-1">
              {{ isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña *' }}
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              :class="errors.password ? 'border-red-500' : 'border-gray-300'"
              placeholder="********"
              :required="!isEditing"
            />
            <span v-if="errors.password" class="text-red-500 text-xs mt-1">{{ errors.password }}</span>
          </div>
        </div>
        
        <!-- Campo Empresa (Opcional, visual) -->
        <div class="flex flex-col">
            <label for="company_name" class="text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <input
              id="company_name"
              v-model="form.company_name"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Ej: Delivery Express"
            />
        </div>
      </div>

      <!-- Información del Vehículo -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-700 pb-2 border-b border-gray-200">
          Información del Vehículo
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex flex-col">
            <label for="vehicle_type" class="text-sm font-medium text-gray-700 mb-1">Tipo de Vehículo</label>
            <select 
              id="vehicle_type" 
              v-model="form.vehicle_type"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
            >
              <option value="car">🚗 Auto</option>
              <option value="motorcycle">🏍️ Moto</option>
              <option value="bicycle">🚲 Bicicleta</option>
              <option value="van">🚐 Furgoneta</option>
              <option value="truck">🚚 Camión</option>
              <option value="other">📦 Otro</option>
            </select>
          </div>
          
          <div class="flex flex-col">
            <label for="vehicle_plate" class="text-sm font-medium text-gray-700 mb-1">Placa del Vehículo</label>
            <input
              id="vehicle_plate"
              v-model="form.vehicle_plate"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Ej: ABC-1234"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div class="flex flex-col">
            <label for="driver_license" class="text-sm font-medium text-gray-700 mb-1">Licencia de Conducir</label>
            <input
              id="driver_license"
              v-model="form.driver_license"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Ej: 12345678"
            />
          </div>
          
          <div class="flex items-center h-[42px]">
            <label class="flex items-center gap-3 cursor-pointer">
              <div class="relative inline-flex items-center">
                <input type="checkbox" v-model="form.is_active" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
              <span class="text-sm font-medium text-gray-700">Conductor Activo</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Error General -->
      <div v-if="errors.general" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-600 text-center">{{ errors.general }}</p>
      </div>

      <!-- Botones -->
      <div class="flex justify-end gap-4 pt-4 border-t border-gray-100">
        <button 
          type="button" 
          @click="$emit('cancel')" 
          class="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          :disabled="loading" 
          class="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {{ loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../services/api' // Usamos servicio local en vez de Shipday

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
  password: '', // Nuevo campo requerido por el backend
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

// Lifecycle
onMounted(() => {
  if (props.driver) {
    // Llenar formulario para edición
    form.value = {
      name: props.driver.name || props.driver.full_name || '',
      email: props.driver.email || '',
      phone: props.driver.phone || '',
      password: '', // No llenamos el password al editar
      company_name: props.driver.company_name || '',
      vehicle_type: props.driver.vehicle_type || 'car',
      vehicle_plate: props.driver.vehicle_plate || '',
      driver_license: props.driver.driver_license || '',
      // Manejar la diferencia entre isActive (frontend) e is_active (backend)
      is_active: props.driver.is_active !== undefined ? props.driver.is_active : (props.driver.isActive !== undefined ? props.driver.isActive : true)
    }
  }
})

// Validación local simple
const validateForm = () => {
  errors.value = {}
  let isValid = true

  if (!form.value.name.trim()) {
    errors.value.name = 'El nombre es obligatorio'
    isValid = false
  }

  if (!form.value.email.trim()) {
    errors.value.email = 'El email es obligatorio'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Email inválido'
    isValid = false
  }

  if (!form.value.phone.trim()) {
    errors.value.phone = 'El teléfono es obligatorio'
    isValid = false
  }

  // Password requerido solo si es creación
  if (!isEditing.value && (!form.value.password || form.value.password.length < 6)) {
    errors.value.password = 'La contraseña debe tener al menos 6 caracteres'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  errors.value = {}

  try {
    // Preparar datos para el backend local
    const payload = {
      full_name: form.value.name, // Mapear name -> full_name
      email: form.value.email,
      phone: form.value.phone,
      vehicle_type: form.value.vehicle_type,
      // Nota: vehicle_plate y driver_license se envían pero requieren que el modelo Backend los soporte
      vehicle_plate: form.value.vehicle_plate,
      driver_license: form.value.driver_license,
      is_active: form.value.is_active
    }

    // Solo enviar password si tiene valor (para editar) o es obligatorio (para crear)
    if (form.value.password) {
      payload.password = form.value.password
    }

    let response
    if (isEditing.value) {
      // Actualizar
      response = await apiService.drivers.update(props.driver._id, payload)
    } else {
      // Crear
      response = await apiService.drivers.create(payload)
    }

    // Emitir evento de éxito con los datos del conductor
    // La respuesta del backend suele venir en response.data.data o response.data
    const driverData = response.data?.data || response.data
    
    emit('success', {
      message: isEditing.value ? 'Conductor actualizado exitosamente' : 'Conductor creado exitosamente',
      driver: {
        ...driverData,
        // Aseguramos consistencia de campos para el frontend
        name: driverData.full_name,
        isActive: driverData.is_active
      }
    })
    
    if (!isEditing.value) {
      resetForm()
    }
    
  } catch (error) {
    console.error('❌ Error guardando conductor:', error)
    const errorMsg = error.response?.data?.message || error.message || 'Error al guardar el conductor'
    errors.value.general = errorMsg
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    name: '',
    email: '',
    phone: '',
    password: '',
    company_name: '',
    vehicle_type: 'car',
    vehicle_plate: '',
    driver_license: '',
    is_active: true
  }
  errors.value = {}
}
</script>