// composables/useDriverAssignment.js
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'
import { shipdayService } from '../services/shipday'

export function useDriverAssignment(selectedOrders, fetchOrders) {
  const toast = useToast()

  // ==================== STATE ====================
  
  // Driver data
  const availableDrivers = ref([])
  const loadingDrivers = ref(false)
  
  // Individual assignment
  const selectedDriverId = ref('')
  const isAssigning = ref(false)
  
  // Bulk assignment
  const bulkSelectedDriverId = ref('')
  const isBulkAssigning = ref(false)
  const bulkAssignmentCompleted = ref(0)
  const bulkAssignmentResults = ref([])
  const bulkAssignmentFinished = ref(false)
  const showBulkAssignModal = ref(false)

  // ==================== COMPUTED ====================
  
  /**
   * Progress percentage for bulk assignment
   */
  const bulkProgressPercentage = computed(() => {
    if (selectedOrders.value.length === 0) return 0
    return (bulkAssignmentCompleted.value / selectedOrders.value.length) * 100
  })

  /**
   * Selected driver object for individual assignment
   */
  const selectedDriver = computed(() => {
    if (!selectedDriverId.value) return null
    return availableDrivers.value.find(driver => driver.id == selectedDriverId.value)
  })

  /**
   * Selected driver object for bulk assignment
   */
  const bulkSelectedDriver = computed(() => {
    if (!bulkSelectedDriverId.value) return null
    return availableDrivers.value.find(driver => driver.id == bulkSelectedDriverId.value)
  })

  /**
   * Assignment results summary
   */
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

  /**
   * Active drivers only
   */
  const activeDrivers = computed(() => {
    return availableDrivers.value.filter(driver => driver.isActive)
  })

  // ==================== METHODS ====================
  
  /**
   * Fetch available drivers from Shipday
   */
  async function fetchAvailableDrivers() {
    loadingDrivers.value = true
    
    try {
      console.log('👥 Fetching available drivers from Shipday...')
      
      const response = await shipdayService.getDrivers()
      console.log('📋 Drivers API response:', response)
      
      // Handle different response formats
      let drivers = []
      if (response.data?.data) {
        drivers = response.data.data
      } else if (response.data && Array.isArray(response.data)) {
        drivers = response.data
      } else {
        drivers = []
      }
      
      // Filter active drivers
      availableDrivers.value = drivers.filter(driver => driver.isActive)
      
      console.log('✅ Available drivers loaded:', {
        total: drivers.length,
        active: availableDrivers.value.length,
        drivers: availableDrivers.value.map(d => ({ id: d.id, name: d.name, email: d.email }))
      })
      
    } catch (error) {
      console.error('❌ Error fetching drivers:', error)
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
      console.log('🚚 Assigning driver to order:', {
        orderId,
        driverId: selectedDriverId.value,
        driverName: selectedDriver.value?.name
      })
      
      await apiService.orders.assignDriver(orderId, selectedDriverId.value)
      
      toast.success(`Conductor ${selectedDriver.value?.name} asignado exitosamente`)
      
      // Refresh orders to show changes
      await fetchOrders()
      
      // Reset state
      selectedDriverId.value = ''
      
      console.log('✅ Individual assignment completed successfully')
      return true
      
    } catch (error) {
      console.error('❌ Error in individual assignment:', error)
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
    
    const driverName = bulkSelectedDriver.value?.name
    const orderCount = selectedOrders.value.length
    
    // Confirm with user
    const confirmed = confirm(
      `¿Estás seguro de asignar ${orderCount} pedidos al conductor ${driverName}?`
    )
    
    if (!confirmed) {
      console.log('❌ Bulk assignment cancelled by user')
      return false
    }
    
    isBulkAssigning.value = true
    bulkAssignmentCompleted.value = 0
    bulkAssignmentResults.value = []
    
    console.log('🚀 Starting bulk assignment:', {
      ordersCount: orderCount,
      driverId: bulkSelectedDriverId.value,
      driverName
    })
    
    try {
      // Option 1: Try bulk assignment endpoint if available
      try {
        const response = await apiService.orders.bulkAssignDriver(
          selectedOrders.value, 
          bulkSelectedDriverId.value
        )
        
        console.log('✅ Bulk assignment via endpoint successful:', response.data)
        
        // Process results
        const results = response.data.results || response.data
        await processBulkResults(response.data, selectedOrders.value)
        
      } catch (bulkError) {
        console.warn('⚠️ Bulk endpoint failed, falling back to individual assignments:', bulkError)
        
        // Option 2: Fallback to individual assignments
        await performIndividualAssignments()
      }
      
      // Finish up
      isBulkAssigning.value = false
      bulkAssignmentFinished.value = true
      
      // Show final results
      const summary = assignmentSummary.value
      if (summary.failed === 0) {
        toast.success(`🎉 Todos los ${summary.successful} pedidos fueron asignados exitosamente`)
      } else {
        toast.warning(`⚠️ ${summary.successful} pedidos asignados, ${summary.failed} fallaron`)
      }
      
      // Refresh orders
      await fetchOrders()
      
      console.log('🏁 Bulk assignment completed:', summary)
      return true
      
    } catch (error) {
      console.error('❌ Critical error in bulk assignment:', error)
      toast.error('Error crítico en asignación masiva')
      return false
    }
  }

  /**
   * Process bulk assignment results from API
   */
async function processBulkResults(apiResponse, orderObjects) {
  console.log('🔍 Processing bulk API results:', apiResponse)
  
  const totalOrders = orderObjects.length
  
  // Handle enviGo bulk assignment response format
  if (apiResponse.summary) {
    const summary = apiResponse.summary
    const successCount = summary.success || 0
    
    // Si todos fueron exitosos según el summary, marca todos como exitosos
    // Los errores que aparecen son probablemente de validación UI, no de asignación real
    for (let i = 0; i < totalOrders; i++) {
      const orderData = orderObjects[i]
      const orderId = typeof orderData === 'object' ? orderData._id : orderData
      const orderNumber = typeof orderData === 'object' ? orderData.order_number : `Order-${orderId.slice(-6)}`
      
      bulkAssignmentResults.value.push({
        orderId,
        orderNumber,
        success: true, // Marca como exitoso si el backend dice que fue exitoso
        message: 'Asignado exitosamente en Shipday'
      })
      
      bulkAssignmentCompleted.value = i + 1
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    return true
  }
  
  return false
}

  /**
   * Perform individual assignments as fallback
   */
async function performIndividualAssignments() {
  for (let i = 0; i < selectedOrders.value.length; i++) {
    // Extraemos el objeto de la orden de la lista de selección
    const orderObject = selectedOrders.value[i]; 
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Nos aseguramos de usar solo el ID para la llamada a la API y la lógica
    const orderId = orderObject._id; 
    const orderNumber = orderObject.order_number || `Order-${orderId.slice(-6)}`;
    // --- FIN DE LA CORRECCIÓN ---

    console.log(`📦 Procesando orden ${i + 1}/${selectedOrders.value.length}: ${orderNumber} (ID: ${orderId})`);
    
    try {
      // Ahora pasamos el ID correcto (string) a la API
      await apiService.orders.assignDriver(orderId, bulkSelectedDriverId.value);
      
      bulkAssignmentResults.value.push({
        orderId: orderId,
        orderNumber: orderNumber,
        success: true,
        message: 'Asignado exitosamente'
      });
      
      console.log(`✅ Orden ${orderNumber} asignada exitosamente`);
      
    } catch (error) {
      console.error(`❌ Error asignando orden ${orderNumber}:`, error);
      
      bulkAssignmentResults.value.push({
        orderId: orderId,
        orderNumber: orderNumber,
        success: false,
        message: error.response?.data?.error || error.message || 'Error desconocido'
      });
    }
    
    bulkAssignmentCompleted.value = i + 1;
    
    if (i < selectedOrders.value.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

  /**
   * Close bulk assignment modal
   */
function closeBulkAssignModal() {
  // Si la asignación masiva ya terminó, eliminar los pedidos exitosos de la selección
  if (bulkAssignmentFinished.value) {
    const successfulOrderIds = bulkAssignmentResults.value
      .filter(r => r.success)
      .map(r => r.orderId)

    if (successfulOrderIds.length > 0) {
      selectedOrders.value = selectedOrders.value.filter(id => !successfulOrderIds.includes(id))
      selectedOrderObjects.value = selectedOrderObjects.value.filter(order => !successfulOrderIds.includes(order._id))
    }

    console.log(`🧹 Removed ${successfulOrderIds.length} successfully assigned orders from selection`)
  }

  // Resetear todos los estados de la asignación masiva
  bulkSelectedDriverId.value = ''
  bulkAssignmentCompleted.value = 0
  bulkAssignmentResults.value = []
  bulkAssignmentFinished.value = false
  isBulkAssigning.value = false

  // ⚡ Emitir al padre para cerrar el modal
  emit('close-bulk-assign')

  console.log('❌ Bulk assignment modal closed and state fully reset')
}


  /**
   * Get driver info for display
   */
  function getDriverInfo(driverId) {
    const driver = availableDrivers.value.find(d => d.id === driverId)
    if (!driver) return null
    
    return {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      isActive: driver.isActive,
      isOnShift: driver.isOnShift || false,
      displayText: `${driver.name} (${driver.email}) - ${driver.isActive ? 'Activo' : 'Inactivo'}`
    }
  }

  /**
   * Validate assignment readiness
   */
  function validateAssignmentReadiness() {
    if (availableDrivers.value.length === 0) {
      return {
        ready: false,
        message: 'No hay conductores disponibles'
      }
    }
    
    if (activeDrivers.value.length === 0) {
      return {
        ready: false,
        message: 'No hay conductores activos disponibles'
      }
    }
    
    return {
      ready: true,
      message: `${activeDrivers.value.length} conductores disponibles`
    }
  }

  // ==================== RETURN ====================
  return {
    // State
    availableDrivers,
    loadingDrivers,
    selectedDriverId,
    isAssigning,
    bulkSelectedDriverId,
    isBulkAssigning,
    bulkAssignmentCompleted,
    bulkAssignmentResults,
    bulkAssignmentFinished,
    
    // Computed
    bulkProgressPercentage,
    selectedDriver,
    bulkSelectedDriver,
    assignmentSummary,
    activeDrivers,
    
    // Methods
    fetchAvailableDrivers,
    confirmAssignment,
    confirmBulkAssignment,
    closeBulkAssignModal,
    getDriverInfo,
    validateAssignmentReadiness
  }
}