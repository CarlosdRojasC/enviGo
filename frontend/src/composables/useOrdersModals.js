// composables/useOrdersModals.js - VERSIÓN CORREGIDA
import { ref, nextTick } from 'vue'

export function useOrdersModals() {
  // ==================== STATE ====================
  
  // Modal visibility states
  const showOrderDetailsModal = ref(false)
  const showUpdateStatusModal = ref(false)
  const showCreateOrderModal = ref(false)
  const showBulkUploadModal = ref(false)
  const showAssignModal = ref(false)
  const showBulkAssignModal = ref(false)
  const showProofModal = ref(false) // 🆕 Agregado
  
  // Selected items
  const selectedOrder = ref(null)
  const selectedProofOrder = ref(null) // 🆕 Agregado
  const loadingOrderDetails = ref(false) // 🆕 Agregado
  
  // Form data
  const newOrder = ref({})
  const isCreatingOrder = ref(false)

  // ==================== MÉTODOS CORREGIDOS ====================
  
  /**
   * ✅ Open proof of delivery modal - VERSIÓN SEGURA
   */
  async function openProofModal(order) {
    try {
      console.log('📸 Iniciando carga de prueba de entrega para:', order.order_number)
      
      // 1. Resetear estados de forma segura
      selectedProofOrder.value = null
      loadingOrderDetails.value = true
      
      // 2. Mostrar modal con spinner
      showProofModal.value = true
      
      // 3. Esperar al siguiente tick para asegurar que el DOM está listo
      await nextTick()
      
      // 4. Simular carga (reemplazar con tu API real)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 5. Asignar datos de forma segura
      selectedProofOrder.value = { ...order }
      
      console.log('✅ Prueba de entrega cargada exitosamente')
      
    } catch (error) {
      console.error('❌ Error abriendo modal de prueba de entrega:', error)
      showProofModal.value = false
      selectedProofOrder.value = null
    } finally {
      loadingOrderDetails.value = false
    }
  }

  /**
   * ✅ Close proof modal - VERSIÓN SEGURA
   */
  function closeProofModal() {
    showProofModal.value = false
    selectedProofOrder.value = null
    loadingOrderDetails.value = false
    console.log('❌ Modal de prueba de entrega cerrado')
  }

  /**
   * ✅ Open order details modal - MEJORADO
   */
  function openOrderDetailsModal(order) {
    if (!order) {
      console.warn('⚠️ Intento de abrir modal sin orden válida')
      return
    }
    
    selectedOrder.value = { ...order } // Clonar para evitar mutaciones
    showOrderDetailsModal.value = true
    console.log('👁️ Opening order details modal for:', order.order_number)
  }

  /**
   * ✅ Close order details modal - MEJORADO
   */
  function closeOrderDetailsModal() {
    showOrderDetailsModal.value = false
    selectedOrder.value = null
    console.log('❌ Order details modal closed')
  }

  /**
   * ✅ Open update status modal - MEJORADO
   */
  function openUpdateStatusModal(order) {
    if (!order) {
      console.warn('⚠️ Intento de abrir modal de estado sin orden válida')
      return
    }
    
    selectedOrder.value = { ...order }
    showUpdateStatusModal.value = true
    console.log('✏️ Opening update status modal for:', order.order_number)
  }

  /**
   * ✅ Close update status modal - MEJORADO
   */
  function closeUpdateStatusModal() {
    showUpdateStatusModal.value = false
    selectedOrder.value = null
    console.log('❌ Update status modal closed')
  }

  /**
   * ✅ Open create order modal - MEJORADO
   */
  function openCreateOrderModal() {
    // Initialize new order with default values
    newOrder.value = {
      company_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      shipping_address: '',
      shipping_commune: '',
      shipping_state: 'Región Metropolitana',
      total_amount: 0,
      shipping_cost: 0,
      notes: '',
      
      // OptiRoute specific fields
      priority: 'Normal',
      serviceTime: 5,
      timeWindowStart: '09:00',
      timeWindowEnd: '18:00',
      load1Packages: 1,
      load2WeightKg: 1
    }
    
    showCreateOrderModal.value = true
    console.log('➕ Opening create order modal')
  }

  /**
   * ✅ Close create order modal - MEJORADO
   */
  function closeCreateOrderModal() {
    showCreateOrderModal.value = false
    newOrder.value = {}
    isCreatingOrder.value = false
    console.log('❌ Create order modal closed')
  }

  /**
   * ✅ Open bulk upload modal
   */
  function openBulkUploadModal() {
    showBulkUploadModal.value = true
    console.log('⬆️ Opening bulk upload modal')
  }

  /**
   * ✅ Close bulk upload modal
   */
  function closeBulkUploadModal() {
    showBulkUploadModal.value = false
    console.log('❌ Bulk upload modal closed')
  }

  /**
   * ✅ Open assign driver modal - MEJORADO
   */
  function openAssignModal(order) {
    if (!order) {
      console.warn('⚠️ Intento de abrir modal de asignación sin orden válida')
      return
    }
    
    selectedOrder.value = { ...order }
    showAssignModal.value = true
    console.log('🚚 Opening assign driver modal for:', order.order_number)
  }

  /**
   * ✅ Close assign driver modal
   */
  function closeAssignModal() {
    showAssignModal.value = false
    selectedOrder.value = null
    console.log('❌ Assign driver modal closed')
  }

  /**
   * ✅ Open bulk assign modal
   */
  function openBulkAssignModal() {
    showBulkAssignModal.value = true
    console.log('🚛 Opening bulk assign modal')
  }

  /**
   * ✅ Close bulk assign modal
   */
  function closeBulkAssignModal() {
    showBulkAssignModal.value = false
    console.log('❌ Bulk assign modal closed')
  }

  /**
   * ✅ Close all modals - VERSIÓN COMPLETA
   */
  function closeAllModals() {
    showOrderDetailsModal.value = false
    showUpdateStatusModal.value = false
    showCreateOrderModal.value = false
    showBulkUploadModal.value = false
    showAssignModal.value = false
    showBulkAssignModal.value = false
    showProofModal.value = false // 🆕 Agregado
    
    selectedOrder.value = null
    selectedProofOrder.value = null // 🆕 Agregado
    newOrder.value = {}
    isCreatingOrder.value = false
    loadingOrderDetails.value = false // 🆕 Agregado
    
    console.log('🚫 All modals closed')
  }

  /**
   * ✅ Validate new order form - MEJORADO
   */
  function validateNewOrder() {
    const errors = []
    
    // Validaciones básicas
    if (!newOrder.value?.company_id) {
      errors.push('Debe seleccionar una empresa')
    }
    
    if (!newOrder.value?.customer_name?.trim()) {
      errors.push('El nombre del cliente es requerido')
    }
    
    if (!newOrder.value?.shipping_address?.trim()) {
      errors.push('La dirección de envío es requerida')
    }
    
    if (!newOrder.value?.shipping_commune?.trim()) {
      errors.push('La comuna es requerida')
    }
    
    if (!newOrder.value?.total_amount || newOrder.value.total_amount <= 0) {
      errors.push('El monto total debe ser mayor a 0')
    }
    
    // Validate email if provided
    if (newOrder.value?.customer_email && !isValidEmail(newOrder.value.customer_email)) {
      errors.push('El email del cliente no es válido')
    }
    
    // Validate time windows
    if (newOrder.value?.timeWindowStart && newOrder.value?.timeWindowEnd) {
      if (newOrder.value.timeWindowStart >= newOrder.value.timeWindowEnd) {
        errors.push('La hora de inicio debe ser anterior a la hora de fin')
      }
    }
    
    // Validate numeric fields
    if (newOrder.value?.serviceTime && newOrder.value.serviceTime < 0) {
      errors.push('El tiempo de servicio no puede ser negativo')
    }
    
    if (newOrder.value?.load1Packages && newOrder.value.load1Packages < 1) {
      errors.push('El número de paquetes debe ser al menos 1')
    }
    
    if (newOrder.value?.load2WeightKg && newOrder.value.load2WeightKg < 0) {
      errors.push('El peso no puede ser negativo')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * ✅ Prepare order data for submission - MEJORADO
   */
  function prepareOrderData() {
    if (!newOrder.value) {
      throw new Error('No hay datos de orden para preparar')
    }
    
    return {
      ...newOrder.value,
      order_number: `MANUAL-${Date.now()}`,
      external_order_id: `manual-admin-${Date.now()}`,
      
      // Ensure numeric fields are properly typed
      total_amount: parseFloat(newOrder.value.total_amount) || 0,
      shipping_cost: parseFloat(newOrder.value.shipping_cost) || 0,
      serviceTime: parseInt(newOrder.value.serviceTime) || 5,
      load1Packages: parseInt(newOrder.value.load1Packages) || 1,
      load2WeightKg: parseFloat(newOrder.value.load2WeightKg) || 1,
      
      // Trim string fields
      customer_name: newOrder.value.customer_name?.trim() || '',
      customer_email: newOrder.value.customer_email?.trim() || '',
      customer_phone: newOrder.value.customer_phone?.trim() || '',
      shipping_address: newOrder.value.shipping_address?.trim() || '',
      shipping_commune: newOrder.value.shipping_commune?.trim() || '',
      shipping_state: newOrder.value.shipping_state?.trim() || 'Región Metropolitana',
      notes: newOrder.value.notes?.trim() || ''
    }
  }

  /**
   * ✅ Reset new order form
   */
  function resetNewOrderForm() {
    newOrder.value = {
      company_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      shipping_address: '',
      shipping_commune: '',
      shipping_state: 'Región Metropolitana',
      total_amount: 0,
      shipping_cost: 0,
      notes: '',
      priority: 'Normal',
      serviceTime: 5,
      timeWindowStart: '09:00',
      timeWindowEnd: '18:00',
      load1Packages: 1,
      load2WeightKg: 1
    }
  }

  /**
   * ✅ Get current modal state for debugging - ACTUALIZADO
   */
  function getModalState() {
    return {
      orderDetails: showOrderDetailsModal.value,
      updateStatus: showUpdateStatusModal.value,
      createOrder: showCreateOrderModal.value,
      bulkUpload: showBulkUploadModal.value,
      assign: showAssignModal.value,
      bulkAssign: showBulkAssignModal.value,
      proofModal: showProofModal.value, // 🆕 Agregado
      selectedOrder: selectedOrder.value?.order_number || null,
      selectedProofOrder: selectedProofOrder.value?.order_number || null, // 🆕 Agregado
      loadingDetails: loadingOrderDetails.value // 🆕 Agregado
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * ✅ Validate email format
   */
  function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  // ==================== RETURN ====================
  return {
    // State
    showOrderDetailsModal,
    showUpdateStatusModal,
    showCreateOrderModal,
    showBulkUploadModal,
    showAssignModal,
    showBulkAssignModal,
    showProofModal, // 🆕 Agregado
    selectedOrder,
    selectedProofOrder, // 🆕 Agregado
    newOrder,
    isCreatingOrder,
    loadingOrderDetails, // 🆕 Agregado
    
    // Methods
    openOrderDetailsModal,
    closeOrderDetailsModal,
    openUpdateStatusModal,
    closeUpdateStatusModal,
    openCreateOrderModal,
    closeCreateOrderModal,
    openBulkUploadModal,
    closeBulkUploadModal,
    openAssignModal,
    closeAssignModal,
    openBulkAssignModal,
    closeBulkAssignModal,
    openProofModal, // 🆕 Agregado
    closeProofModal, // 🆕 Agregado
    closeAllModals,
    validateNewOrder,
    prepareOrderData,
    resetNewOrderForm,
    getModalState
  }
}