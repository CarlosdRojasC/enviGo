// composables/useDriverAssignment.js
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'

export function useDriverAssignment(selectedOrders, fetchOrders) {
  const toast = useToast()

  // ==================== STATE ====================
  const availableDrivers = ref([])
  const loadingDrivers = ref(false)

  const selectedDriverId = ref('')
  const isAssigning = ref(false)

  const bulkSelectedDriverId = ref('')
  const isBulkAssigning = ref(false)
  const bulkAssignmentCompleted = ref(0)
  const bulkAssignmentResults = ref([])
  const bulkAssignmentFinished = ref(false)

  // ==================== COMPUTED ====================
  const bulkProgressPercentage = computed(() => {
    if (selectedOrders.value.length === 0) return 0
    return (bulkAssignmentCompleted.value / selectedOrders.value.length) * 100
  })

  const selectedDriver = computed(() => {
    if (!selectedDriverId.value) return null
    return availableDrivers.value.find(driver => driver._id === selectedDriverId.value)
  })

  const bulkSelectedDriver = computed(() => {
    if (!bulkSelectedDriverId.value) return null
    return availableDrivers.value.find(driver => driver._id === bulkSelectedDriverId.value)
  })

  const assignmentSummary = computed(() => {
    const successful = bulkAssignmentResults.value.filter(r => r.success).length
    const failed = bulkAssignmentResults.value.filter(r => !r.success).length

    return {
      total: bulkAssignmentResults.value.length,
      successful,
      failed,
      successRate: bulkAssignmentResults.value.length > 0
        ? Math.round((successful / bulkAssignmentResults.value.length) * 100)
        : 0
    }
  })

  const activeDrivers = computed(() => {
    return availableDrivers.value.filter(driver => driver.is_active)
  })

  // ==================== METHODS ====================

  /**
   * Fetch available drivers from your backend (local)
   */
async function fetchAvailableDrivers() {
  loadingDrivers.value = true
  try {
    console.log('👥 Cargando conductores locales desde backend...')

    // ✅ Usamos el módulo correcto del apiService
    const response = await apiService.drivers.getAll()
    console.log('📋 Respuesta /drivers:', response.data)

    // ✅ Detectamos formato de respuesta (por si el backend cambia)
    let drivers = []
    if (response.data?.data) {
      drivers = response.data.data
    } else if (Array.isArray(response.data)) {
      drivers = response.data
    } else {
      drivers = []
    }

    // ✅ Filtrar solo activos
    availableDrivers.value = drivers.filter(driver => driver.is_active)

    // ✅ Mostrar nombres completos en log para verificar
    console.log(
      `✅ Conductores activos cargados (${availableDrivers.value.length}):`,
      availableDrivers.value.map(d => d.full_name || d.name)
    )

  } catch (error) {
    console.error('❌ Error cargando conductores locales:', {
      message: error.message,
      response: error.response?.data || 'Sin respuesta del servidor'
    })
    toast.error('Error al cargar conductores')
    availableDrivers.value = []
  } finally {
    loadingDrivers.value = false
  }
}


  /**
   * Confirm individual driver assignment
   */
  async function confirmAssignment(orderId) {
    if (!selectedDriverId.value) {
      toast.warning('Por favor, selecciona un conductor')
      return false
    }

    if (!orderId) {
      toast.error('ID de pedido no válido')
      return false
    }

    isAssigning.value = true

    try {
      const driver = selectedDriver.value
      console.log('🚚 Asignando conductor a pedido:', { orderId, driver })

      await apiService.orders.assignDriver(orderId, driver._id)

      toast.success(`Conductor ${driver.full_name} asignado exitosamente`)
      await fetchOrders()
      selectedDriverId.value = ''

      console.log('✅ Asignación individual completada')
      return true
    } catch (error) {
      console.error('❌ Error en la asignación individual:', error)
      toast.error(`Error al asignar conductor: ${error.response?.data?.error || error.message}`)
      return false
    } finally {
      isAssigning.value = false
    }
  }

  /**
   * Confirm bulk driver assignment
   */
  async function confirmBulkAssignment() {
    if (!bulkSelectedDriverId.value) {
      toast.error('Por favor, selecciona un conductor')
      return false
    }

    if (selectedOrders.value.length === 0) {
      toast.error('No hay pedidos seleccionados')
      return false
    }

    const driver = bulkSelectedDriver.value
    const confirmed = confirm(`¿Asignar ${selectedOrders.value.length} pedidos a ${driver.full_name}?`)
    if (!confirmed) return false

    isBulkAssigning.value = true
    bulkAssignmentCompleted.value = 0
    bulkAssignmentResults.value = []

    try {
      const orderIds = selectedOrders.value.map(o => o._id)
      const response = await apiService.post('/orders/bulk-assign', {
        orderIds,
        driverId: driver._id
      })

      console.log('✅ Resultado asignación masiva:', response.data)

      for (let i = 0; i < orderIds.length; i++) {
        bulkAssignmentResults.value.push({
          orderId: orderIds[i],
          success: true,
          message: 'Asignado exitosamente'
        })
        bulkAssignmentCompleted.value = i + 1
      }

      toast.success(`🎉 ${orderIds.length} pedidos asignados a ${driver.full_name}`)
      await fetchOrders()
      return true
    } catch (error) {
      console.error('❌ Error en asignación masiva:', error)
      toast.error('Error al asignar pedidos')
      return false
    } finally {
      isBulkAssigning.value = false
      bulkAssignmentFinished.value = true
    }
  }

  /**
   * Close bulk assignment modal
   */
  function closeBulkAssignModal() {
    bulkSelectedDriverId.value = ''
    bulkAssignmentCompleted.value = 0
    bulkAssignmentResults.value = []
    bulkAssignmentFinished.value = false
    isBulkAssigning.value = false
  }

  /**
   * Validate assignment readiness
   */
  function validateAssignmentReadiness() {
    if (availableDrivers.value.length === 0) {
      return { ready: false, message: 'No hay conductores disponibles' }
    }

    if (activeDrivers.value.length === 0) {
      return { ready: false, message: 'No hay conductores activos' }
    }

    return { ready: true, message: `${activeDrivers.value.length} conductores disponibles` }
  }

  // ==================== RETURN ====================
  return {
    availableDrivers,
    loadingDrivers,
    selectedDriverId,
    isAssigning,
    bulkSelectedDriverId,
    isBulkAssigning,
    bulkAssignmentCompleted,
    bulkAssignmentResults,
    bulkAssignmentFinished,

    bulkProgressPercentage,
    selectedDriver,
    bulkSelectedDriver,
    assignmentSummary,
    activeDrivers,

    fetchAvailableDrivers,
    confirmAssignment,
    confirmBulkAssignment,
    closeBulkAssignModal,
    validateAssignmentReadiness
  }
}
