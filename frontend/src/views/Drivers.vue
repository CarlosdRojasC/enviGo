<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión de Conductores</h1>
        <p class="text-gray-500 mt-1">Administra tu flota de conductores</p>
      </div>
      
      <button 
        @click="showCreateForm = true" 
        class="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95"
      >
        <span>➕</span>
        Nuevo Conductor
      </button>
      </div>

    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
      <div class="relative flex-1">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>
      
      <div class="flex gap-3 overflow-x-auto pb-1 md:pb-0">
        <select 
          v-model="statusFilter" 
          class="px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        
        <select 
          v-model="vehicleFilter" 
          class="px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
        >
          <option value="">Todos los vehículos</option>
          <option value="car">🚗 Auto</option>
          <option value="motorcycle">🏍️ Moto</option>
          <option value="bicycle">🚲 Bicicleta</option>
          <option value="truck">🚚 Camión</option>
          <option value="van">🚐 Furgoneta</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">👥</div>
        <div>
          <div class="text-2xl font-bold text-gray-900">{{ stats.total }}</div>
          <div class="text-sm text-gray-500 font-medium">Total Conductores</div>
        </div>
      </div>
      
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">✅</div>
        <div>
          <div class="text-2xl font-bold text-gray-900">{{ stats.active }}</div>
          <div class="text-sm text-gray-500 font-medium">Activos</div>
        </div>
      </div>
      
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl">⏸️</div>
        <div>
          <div class="text-2xl font-bold text-gray-900">{{ stats.inactive }}</div>
          <div class="text-sm text-gray-500 font-medium">Inactivos</div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">🚗</div>
        <div>
          <div class="text-2xl font-bold text-gray-900">{{ stats.withVehicle }}</div>
          <div class="text-sm text-gray-500 font-medium">Con Vehículo</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center">
      <div class="animate-spin w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
      <p class="text-gray-500">Cargando conductores...</p>
    </div>

    <div v-else-if="!loading && drivers.length === 0" class="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
      <div class="text-6xl mb-4">🚗</div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No hay conductores registrados</h3>
      <p class="text-gray-500 mb-6">Comienza agregando tu primer conductor a la flota</p>
      <button 
        @click="showCreateForm = true" 
        class="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 inline-flex items-center gap-2 transition-colors"
      >
        Agregar Primer Conductor
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="driver in filteredDrivers"
        :key="driver._id || driver.email"
        class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group border-l-4"
        :class="driver.isActive ? 'border-l-green-500' : 'border-l-red-500'"
      >
        <div class="p-5 flex justify-between items-start">
          <div class="flex items-center gap-2 mb-4">
            <div :class="['w-2.5 h-2.5 rounded-full', driver.isActive ? 'bg-green-500' : 'bg-red-500']"></div>
            <span class="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {{ driver.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>

        <div class="px-5 pb-5 flex gap-4">
          <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0 overflow-hidden border-2 border-white shadow-sm">
            <img 
              v-if="driver.photo_url" 
              :src="driver.photo_url" 
              :alt="driver.name"
              class="w-full h-full object-cover"
              @error="e => e.target.style.display = 'none'"
            />
            <span v-else>{{ getInitials(driver.name) }}</span>
          </div>
          
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-gray-900 truncate">{{ driver.name }}</h3>
            <p class="text-sm text-gray-500 truncate">{{ driver.email }}</p>
            <p class="text-sm text-gray-500 mt-0.5">{{ driver.phone }}</p>
            
            <div class="flex flex-wrap gap-2 mt-3">
              <span v-if="driver.vehicle_type" class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {{ getVehicleIcon(driver.vehicle_type) }} {{ driver.vehicle_type }}
              </span>
              <span v-if="driver.vehicle_plate" class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                🏷️ {{ driver.vehicle_plate }}
              </span>
            </div>
          </div>
        </div>

        <div class="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
            <button
              @click="toggleDriverStatus(driver)"
              class="flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
              :class="driver.isActive 
                ? 'border-red-200 text-red-700 hover:bg-red-50 bg-white' 
                : 'border-green-200 text-green-700 hover:bg-green-50 bg-white'"
              :disabled="updatingStatus === driver._id"
            >
              {{ updatingStatus === driver._id ? '...' : (driver.isActive ? 'Desactivar' : 'Activar') }}
            </button>
            
            <button 
              @click="editDriver(driver)" 
              class="p-2 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-gray-200 transition-all" 
              title="Editar conductor"
            >
              ✏️
            </button>
            
            <button 
              @click="viewDriverPayments(driver)" 
              class="p-2 rounded-lg text-gray-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
              title="Ver historial de pagos"
            >
              💰
            </button>
            
            <button 
              @click="confirmDelete(driver)" 
              class="p-2 rounded-lg text-gray-600 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-gray-200 transition-all" 
              title="Eliminar conductor"
            >
              🗑️
            </button>
        </div>
      </div>
    </div>

    <div v-if="showCreateForm || editingDriver" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" @click="closeModals">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <DriverForm
          :driver="editingDriver"
          @success="handleDriverSuccess"
          @cancel="closeModals"
        />
      </div>
    </div>

    <div v-if="driverToDelete" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" @click="closeDeleteModal">
      <div class="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm w-full transform transition-all" @click.stop>
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">¿Eliminar Conductor?</h3>
        <p class="text-gray-500 mb-6">
          ¿Estás seguro de que quieres eliminar a <strong class="text-gray-900">{{ driverToDelete.name }}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div class="flex gap-3 justify-center">
          <button 
            @click="closeDeleteModal" 
            class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            @click="deleteDriver" 
            :disabled="deleting" 
            class="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {{ deleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import DriverForm from './DriverForm.vue'
import { useRouter } from 'vue-router'
import { apiService } from '../services/api' // Usamos apiService interno
import { useToast } from 'vue-toastification'

const router = useRouter()
const toast = useToast()

// Estado
const drivers = ref([])
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const vehicleFilter = ref('')
const showCreateForm = ref(false)
const editingDriver = ref(null)
const driverToDelete = ref(null)
const deleting = ref(false)
const updatingStatus = ref(null)

// Computed
const filteredDrivers = computed(() => {
  let filtered = drivers.value

  // Filtro de búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(driver => 
      driver.name?.toLowerCase().includes(query) ||
      driver.email?.toLowerCase().includes(query) ||
      driver.phone?.includes(query)
    )
  }

  // Filtro de estado
  if (statusFilter.value) {
    const isActive = statusFilter.value === 'active'
    filtered = filtered.filter(driver => driver.isActive === isActive)
  }

  // Filtro de vehículo
  if (vehicleFilter.value) {
    filtered = filtered.filter(driver => driver.vehicle_type === vehicleFilter.value)
  }

  return filtered
})

const stats = computed(() => {
  const total = drivers.value.length
  const active = drivers.value.filter(d => d.isActive).length
  const inactive = total - active
  const withVehicle = drivers.value.filter(d => d.vehicle_type).length

  return { total, active, inactive, withVehicle }
})

// Lifecycle
onMounted(() => {
  loadDrivers()
})

// Métodos
const loadDrivers = async () => {
  loading.value = true
  try {
    // CAMBIO: Usar apiService en lugar de shipdayService
    const response = await apiService.drivers.getAll()
    
    // Ajustar según la estructura de tu respuesta de backend
    const rawData = response.data?.data || response.data || []
    
    drivers.value = rawData.map(driver => ({
      ...driver,
      // Aseguramos que isActive sea booleano
      isActive: driver.isActive !== undefined ? driver.isActive : true
    }))
    
  } catch (error) {
    console.error('❌ Error cargando conductores:', error)
    toast.error('Error al cargar conductores')
  } finally {
    loading.value = false
  }
}

const editDriver = (driver) => {
  editingDriver.value = { ...driver }
}

const confirmDelete = (driver) => {
  driverToDelete.value = driver
}

const deleteDriver = async () => {
  if (!driverToDelete.value) return

  deleting.value = true
  try {
    // CAMBIO: Usar apiService
    await apiService.drivers.delete(driverToDelete.value._id)
    
    // Remover de la lista local
    drivers.value = drivers.value.filter(d => d._id !== driverToDelete.value._id)
    
    toast.success('Conductor eliminado exitosamente')
    closeDeleteModal()
  } catch (error) {
    console.error('❌ Error eliminando conductor:', error)
    toast.error('Error al eliminar conductor')
  } finally {
    deleting.value = false
  }
}

const toggleDriverStatus = async (driver) => {
  updatingStatus.value = driver._id
  try {
    const newStatus = !driver.isActive
    // CAMBIO: Usar apiService
    await apiService.drivers.update(driver._id, {
      isActive: newStatus
    })
    
    // Actualizar en la lista local
    const index = drivers.value.findIndex(d => d._id === driver._id)
    if (index !== -1) {
      drivers.value[index].isActive = newStatus
    }
    
    toast.success(`Conductor ${newStatus ? 'activado' : 'desactivado'} exitosamente`)
  } catch (error) {
    console.error('❌ Error actualizando estado:', error)
    toast.error('Error al actualizar estado')
  } finally {
    updatingStatus.value = null
  }
}

const handleDriverSuccess = (event) => {
  if (editingDriver.value) {
    // Actualizar conductor existente
    const index = drivers.value.findIndex(d => d._id === editingDriver.value._id)
    if (index !== -1) {
      drivers.value[index] = { ...drivers.value[index], ...event.driver }
    }
  } else {
    // Agregar nuevo conductor
    drivers.value.push(event.driver)
  }
  
  toast.success(event.message || 'Conductor guardado correctamente')
  closeModals()
}

const closeModals = () => {
  showCreateForm.value = false
  editingDriver.value = null
}

const closeDeleteModal = () => {
  driverToDelete.value = null
}

const viewDriverPayments = (driver) => {
  router.push({
    name: 'DriverPayments',
    query: {
      driverId: driver._id, // Usamos el ID interno
      driverName: driver.name
    }
  })
}

// Helper functions
const getInitials = (name) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
}

const getVehicleIcon = (type) => {
  const icons = {
    car: '🚗',
    motorcycle: '🏍️',
    bicycle: '🚲',
    truck: '🚚',
    van: '🚐'
  }
  return icons[type] || '🚗'
}
</script>