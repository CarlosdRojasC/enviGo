// frontend/src/composables/useDriverAssignment.js - Con Rate Limiting Mejorado

import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'

const toast = useToast()

export function useDriverAssignment(selectedOrders, fetchOrders) {
  // ==================== ESTADO REACTIVO ====================
  
  // Estados de asignación individual
  const selectedDriverId = ref('')
  const isAssigning = ref(false)
  
  // Estados de asignación masiva
  const showBulkAssignModal = ref(false)
  const bulkSelectedDriverId = ref('')
  const isBulkAssigning = ref(false)
  const bulkAssignmentCompleted = ref(0)
  const bulkAssignmentResults = ref([])
  const bulkAssignmentFinished = ref(false)
  const bulkAssignmentStartTime = ref(null)
  
  // Datos de conductores
  const drivers = ref([])
  const loadingDrivers = ref(false)
  
  // Rate limiting y progreso
  const rateLimitInfo = ref({})
  const currentBatch = ref(0)
  const totalBatches = ref(0)
  const estimatedTimeRemaining = ref(0)

  // ==================== COMPUTED PROPERTIES ====================
  
  const selectedDriver = computed(() => 
    drivers.value.find(d => d.id == selectedDriverId.value)
  )
  
  const bulkSelectedDriver = computed(() => 
    drivers.value.find(d => d.id == bulkSelectedDriverId.value)
  )
  
  const bulkAssignmentProgress = computed(() => {
    if (selectedOrders.value.length === 0) return 0
    return Math.round((bulkAssignmentCompleted.value / selectedOrders.value.length) * 100)
  })
  
  const bulkAssignmentSuccessRate = computed(() => {
    if (bulkAssignmentResults.value.length === 0) return 0
    const successful = bulkAssignmentResults.value.filter(r => r.success).length
    return Math.round((successful / bulkAssignmentResults.value.length) * 100)
  })

  const bulkAssignmentDuration = computed(() => {
    if (!bulkAssignmentStartTime.value) return 0
    const now = bulkAssignmentFinished.value ? 
      new Date(bulkAssignmentResults.value[bulkAssignmentResults.value.length - 1]?.timestamp || Date.now()) : 
      Date.now()
    return Math.round((now - bulkAssignmentStartTime.value) / 1000)
  })

  // ==================== WATCHERS ====================
  
  // Calcular tiempo estimado restante
  watch([bulkAssignmentCompleted, isBulkAssigning], ([completed, isAssigning]) => {
    if (!isAssigning || completed === 0) {
      estimatedTimeRemaining.value = 0
      return
    }
    
    const elapsed = Date.now() - bulkAssignmentStartTime.value
    const avgTimePerOrder = elapsed / completed
    const remaining = selectedOrders.value.length - completed
    estimatedTimeRemaining.value = Math.round((avgTimePerOrder * remaining) / 1000)
  })

  // ==================== MÉTODOS DE CONDUCTORES ====================
  
  /**
   * Obtener lista de conductores disponibles
   */
  async function fetchDrivers() {
    if (loadingDrivers.value) return
    
    loadingDrivers.value = true
    try {
      console.log('👥 Obteniendo lista de conductores...')
      const { data } = await apiService.shipday.getDrivers()
      
      // Filtrar solo conductores activos
      drivers.value = data.filter(driver => driver.isActive)
      
      console.log(`✅ ${drivers.value.length} conductores activos encontrados`)
      
    } catch (error) {
      console.error('❌ Error obteniendo conductores:', error)
      toast.error('Error al cargar conductores')
      drivers.value = []
    } finally {
      loadingDrivers.value = false
    }
  }

  // ==================== ASIGNACIÓN INDIVIDUAL ====================
  
  /**
   * Asignar conductor a una sola orden
   */
  async function assignDriver(orderId) {
    if (!selectedDriverId.value) {
      toast.error('Por favor, selecciona un conductor')
      return false
    }
    
    if (isAssigning.value) {
      console.log('⚠️ Ya hay una asignación en progreso')
      return false
    }
    
    isAssigning.value = true
    
    try {
      console.log('🔄 Asignando conductor individual:', {
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

  // ==================== ASIGNACIÓN MASIVA ====================
  
  /**
   * Abrir modal de asignación masiva
   */
  function openBulkAssignModal() {
    if (selectedOrders.value.length === 0) {
      toast.error('No hay pedidos seleccionados')
      return
    }
    
    console.log(`📦 Abriendo modal de asignación masiva para ${selectedOrders.value.length} pedidos`)
    
    // Reset states
    bulkSelectedDriverId.value = ''
    bulkAssignmentResults.value = []
    bulkAssignmentCompleted.value = 0
    bulkAssignmentFinished.value = false
    rateLimitInfo.value = {}
    currentBatch.value = 0
    totalBatches.value = 0
    estimatedTimeRemaining.value = 0
    
    showBulkAssignModal.value = true
  }

  /**
   * Confirmar asignación masiva
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
      `¿Estás seguro de asignar ${orderCount} pedidos al conductor ${driverName}?\n\nEsto puede tomar varios minutos debido a los límites de la API.`
    )
    
    if (!confirmed) {
      console.log('❌ Bulk assignment cancelled by user')
      return false
    }
    
    // Initialize states
    isBulkAssigning.value = true
    bulkAssignmentCompleted.value = 0
    bulkAssignmentResults.value = []
    bulkAssignmentFinished.value = false
    bulkAssignmentStartTime.value = Date.now()
    
    console.log('🚀 Starting bulk assignment:', {
      ordersCount: orderCount,
      driverId: bulkSelectedDriverId.value,
      driverName
    })
    
    try {
      // Intentar asignación masiva mejorada
      const success = await performBulkAssignmentWithRateLimit()
      
      if (success) {
        console.log('✅ Bulk assignment completed successfully')
        toast.success(`✅ Asignación masiva completada: ${bulkAssignmentResults.value.filter(r => r.success).length}/${orderCount} exitosas`)
        
        // Refresh orders
        await fetchOrders()
      } else {
        console.log('⚠️ Bulk assignment completed with some errors')
        toast.warning(`⚠️ Asignación completada con errores. Ver detalles en el modal.`)
      }
      
    } catch (error) {
      console.error('❌ Critical error in bulk assignment:', error)
      toast.error(`Error crítico en asignación masiva: ${error.message}`)
    } finally {
      bulkAssignmentFinished.value = true
      isBulkAssigning.value = false
    }
    
    return true
  }

  /**
   * Realizar asignación masiva con rate limiting mejorado
   */
  async function performBulkAssignmentWithRateLimit() {
    try {
      console.log('🔄 Intentando asignación masiva optimizada...')
      
      // Extraer solo los IDs de las órdenes
      const orderIds = selectedOrders.value.map(order => order._id)
      
      // Usar el endpoint de bulk assignment mejorado
      const response = await apiService.orders.bulkAssignDriver(orderIds, bulkSelectedDriverId.value)
      
      console.log('✅ Respuesta de bulk assignment:', response.data)
      
      // Procesar resultados
      const { successful, failed, rateLimitInfo: rateInfo } = response.data.results || response.data
      
      // Actualizar estados
      bulkAssignmentResults.value = [
        ...(successful || []).map(item => ({ ...item, success: true })),
        ...(failed || []).map(item => ({ ...item, success: false }))
      ]
      
      bulkAssignmentCompleted.value = bulkAssignmentResults.value.length
      rateLimitInfo.value = rateInfo || {}
      
      // Simular progreso gradual para UX
      if (successful && successful.length > 0) {
        for (let i = 0; i <= successful.length; i++) {
          bulkAssignmentCompleted.value = i + (failed?.length || 0)
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      return (failed?.length || 0) === 0
      
    } catch (error) {
      console.error('❌ Error en bulk assignment optimizado:', error)
      
      // Fallback a asignación individual si bulk falla
      if (error.response?.status === 404 || error.response?.status === 501) {
        console.log('🔄 Fallback a asignación individual...')
        return await performIndividualAssignments()
      }
      
      throw error
    }
  }

  /**
   * Realizar asignaciones individuales como fallback
   */
  async function performIndividualAssignments() {
    console.log('🔄 Ejecutando asignaciones individuales con rate limiting...')
    
    const batchSize = 3 // Lotes más pequeños
    const batchDelay = 15000 // 15 segundos entre lotes
    const orderDelay = 3000 // 3 segundos entre órdenes individuales
    
    totalBatches.value = Math.ceil(selectedOrders.value.length / batchSize)
    
    for (let i = 0; i < selectedOrders.value.length; i += batchSize) {
      const batch = selectedOrders.value.slice(i, i + batchSize)
      currentBatch.value = Math.floor(i / batchSize) + 1
      
      console.log(`📦 Procesando lote ${currentBatch.value}/${totalBatches.value} (${batch.length} órdenes)`)
      
      for (let j = 0; j < batch.length; j++) {
        const orderObject = batch[j]
        const orderId = orderObject._id
        const orderNumber = orderObject.order_number || `Order-${orderId.slice(-6)}`
        
        console.log(`🔄 [${i + j + 1}/${selectedOrders.value.length}] Procesando orden ${orderNumber}`)
        
        try {
          await apiService.orders.assignDriver(orderId, bulkSelectedDriverId.value)
          
          bulkAssignmentResults.value.push({
            orderId: orderId,
            orderNumber: orderNumber,
            success: true,
            message: 'Asignado exitosamente',
            timestamp: Date.now()
          })
          
          console.log(`✅ [${i + j + 1}/${selectedOrders.value.length}] Orden ${orderNumber} asignada`)
          
        } catch (error) {
          console.error(`❌ [${i + j + 1}/${selectedOrders.value.length}] Error en orden ${orderNumber}:`, error.message)
          
          bulkAssignmentResults.value.push({
            orderId: orderId,
            orderNumber: orderNumber,
            success: false,
            message: error.response?.data?.error || error.message || 'Error desconocido',
            timestamp: Date.now()
          })
        }
        
        // Actualizar progreso
        bulkAssignmentCompleted.value = i + j + 1
        
        // Delay entre órdenes individuales (excepto la última del lote)
        if (j < batch.length - 1) {
          console.log(`⏱️ Delay de ${orderDelay/1000}s entre órdenes...`)
          await new Promise(resolve => setTimeout(resolve, orderDelay))
        }
      }
      
      // Delay entre lotes (excepto el último)
      if (i + batchSize < selectedOrders.value.length) {
        console.log(`⏳ Delay de ${batchDelay/1000}s entre lotes...`)
        await new Promise(resolve => setTimeout(resolve, batchDelay))
      }
    }
    
    // Verificar si todas fueron exitosas
    const successfulCount = bulkAssignmentResults.value.filter(r => r.success).length
    return successfulCount === selectedOrders.value.length
  }

  /**
   * Cerrar modal de asignación masiva
   */
  function closeBulkAssignModal() {
    if (isBulkAssigning.value) {
      const confirmed = confirm('¿Estás seguro de cancelar la asignación en progreso?')
      if (!confirmed) return
    }
    
    showBulkAssignModal.value = false
    
    // Reset states after modal closes
    setTimeout(() => {
      bulkSelectedDriverId.value = ''
      bulkAssignmentResults.value = []
      bulkAssignmentCompleted.value = 0
      bulkAssignmentFinished.value = false
      isBulkAssigning.value = false
      rateLimitInfo.value = {}
      currentBatch.value = 0
      totalBatches.value = 0
      estimatedTimeRemaining.value = 0
    }, 300)
  }

  // ==================== UTILIDADES ====================
  
  /**
   * Formatear tiempo en formato legible
   */
  function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  /**
   * Obtener estadísticas de la asignación
   */
  const assignmentStats = computed(() => {
    const total = bulkAssignmentResults.value.length
    const successful = bulkAssignmentResults.value.filter(r => r.success).length
    const failed = total - successful
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      duration: bulkAssignmentDuration.value,
      estimatedRemaining: estimatedTimeRemaining.value
    }
  })

  // ==================== LIFECYCLE ====================
  
  // Auto-fetch drivers when composable is used
  fetchDrivers()

  // ==================== RETURN ====================
  
  return {
    // States
    selectedDriverId,
    isAssigning,
    showBulkAssignModal,
    bulkSelectedDriverId,
    isBulkAssigning,
    bulkAssignmentCompleted,
    bulkAssignmentResults,
    bulkAssignmentFinished,
    drivers,
    loadingDrivers,
    rateLimitInfo,
    currentBatch,
    totalBatches,
    estimatedTimeRemaining,
    
    // Computed
    selectedDriver,
    bulkSelectedDriver,
    bulkAssignmentProgress,
    bulkAssignmentSuccessRate,
    bulkAssignmentDuration,
    assignmentStats,
    
    // Methods
    fetchDrivers,
    assignDriver,
    openBulkAssignModal,
    confirmBulkAssignment,
    closeBulkAssignModal,
    formatTime
  }
}