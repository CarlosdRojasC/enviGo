import { ref } from 'vue'

export function useOrdersModals() {
  // ==================== STATE ====================
  
  // Modal visibility states
  const showOrderDetailsModal = ref(false)
  const showUpdateStatusModal = ref(false)
  const showCreateOrderModal = ref(false)
  const showBulkUploadModal = ref(false)
  const showAssignModal = ref(false)
  const showBulkAssignModal = ref(false)
  const showDeliveryProofModal = ref(false)
  const showEditModal = ref(false) // ✅ Definición agregada

  // Selected items
  const selectedOrder = ref(null)
  
  // Form data
  const newOrder = ref({})
  const isCreatingOrder = ref(false)

  // ==================== METHODS ====================
  
  /**
   * Open order details modal
   */
  function openOrderDetailsModal(order) {
    selectedOrder.value = order
    showOrderDetailsModal.value = true
    console.log('👁️ Opening order details modal for:', order.order_number)
  }

  /**
   * Close order details modal
   */
  function closeOrderDetailsModal() {
    showOrderDetailsModal.value = false
    selectedOrder.value = null
    console.log('❌ Order details modal closed')
  }

  /**
   * Open edit order modal (NUEVO)
   */
  function openEditModal(order) {
    selectedOrder.value = order
    showEditModal.value = true
    console.log('📝 Opening edit order modal for:', order.order_number)
  }

  /**
   * Close edit order modal (NUEVO)
   */
  function closeEditModal() {
    showEditModal.value = false
    selectedOrder.value = null
    console.log('❌ Edit order modal closed')
  }

  function openDeliveryProofModal(order) {
    selectedOrder.value = order
    showDeliveryProofModal.value = true
    console.log('📦 Opening delivery proof modal for:', order.order_number)
  }

  function closeDeliveryProofModal() {
    showDeliveryProofModal.value = false
    selectedOrder.value = null
    console.log('❌ Delivery proof modal closed')
  }

  /**
   * Open update status modal
   */
  function openUpdateStatusModal(order) {
    selectedOrder.value = order
    showUpdateStatusModal.value = true
    console.log('✏️ Opening update status modal for:', order.order_number)
  }

  /**
   * Close update status modal
   */
  function closeUpdateStatusModal() {
    showUpdateStatusModal.value = false
    selectedOrder.value = null
    console.log('❌ Update status modal closed')
  }

  /**
   * Open create order modal
   */
  function openCreateOrderModal() {
    // Initialize new order with default values
    newOrder.value = {
      company_id: '',
      channel_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      shipping_address: '',
      shipping_commune: '',
      shipping_state: 'Región Metropolitana',
      total_amount: 0,
      shipping_cost: 0,
      notes: '',
    }
    
    showCreateOrderModal.value = true
    console.log('➕ Opening create order modal')
  }

  /**
   * Close create order modal
   */
  function closeCreateOrderModal() {
    showCreateOrderModal.value = false
    newOrder.value = {}
    isCreatingOrder.value = false
    console.log('❌ Create order modal closed')
  }

  /**
   * Open bulk upload modal
   */
  function openBulkUploadModal() {
    showBulkUploadModal.value = true
    console.log('⬆️ Opening bulk upload modal')
  }

  /**
   * Close bulk upload modal
   */
  function closeBulkUploadModal() {
    showBulkUploadModal.value = false
    console.log('❌ Bulk upload modal closed')
  }

  /**
   * Open assign driver modal
   */
  function openAssignModal(order) {
    selectedOrder.value = order
    showAssignModal.value = true
    console.log('🚚 Opening assign driver modal for:', order.order_number)
  }

  function closeBulkAssignModalFull() {
    // Cerrar modal visualmente
    showBulkAssignModal.value = false;

    // Resetear estados del composable de driver assignment
    if (typeof resetBulkAssignmentState === 'function') {
      resetBulkAssignmentState();
    }

    console.log('❌ Bulk assign modal closed and state reset')
  }

  /**
   * Close assign driver modal
   */
  function closeAssignModal() {
    showAssignModal.value = false
    selectedOrder.value = null
    console.log('❌ Assign driver modal closed')
  }

  /**
   * Open bulk assign modal
   */
  function openBulkAssignModal() {
    showBulkAssignModal.value = true
    console.log('🚛 Opening bulk assign modal')
  }

  /**
   * Close bulk assign modal
   */
  function closeBulkAssignModal() {
    // Si la asignación masiva ya terminó, eliminar los pedidos exitosos de la selección
    // (Nota: bulkAssignmentFinished es una prop externa, aquí solo cerramos)
    
    // ⚡ Emitir al padre para cerrar el modal (esto se maneja en el componente)
    showBulkAssignModal.value = false
    console.log('❌ Bulk assignment modal closed')
  }

  /**
   * Close all modals
   */
  function closeAllModals() {
    showOrderDetailsModal.value = false
    showUpdateStatusModal.value = false
    showCreateOrderModal.value = false
    showBulkUploadModal.value = false
    showAssignModal.value = false
    showBulkAssignModal.value = false
    showDeliveryProofModal.value = false
    showEditModal.value = false // ✅ Agregado aquí
    
    selectedOrder.value = null
    newOrder.value = {}
    isCreatingOrder.value = false
    console.log('🚫 All modals closed')
  }

  /**
   * Validate new order form
   */
  function validateNewOrder() {
    const errors = []
    
    if (!newOrder.value.company_id) {
      errors.push('Debe seleccionar una empresa')
    }
    
    if (!newOrder.value.customer_name || newOrder.value.customer_name.trim() === '') {
      errors.push('El nombre del cliente es requerido')
    }
    
    if (!newOrder.value.shipping_address || newOrder.value.shipping_address.trim() === '') {
      errors.push('La dirección de envío es requerida')
    }
    
    if (!newOrder.value.shipping_commune || newOrder.value.shipping_commune.trim() === '') {
      errors.push('La comuna es requerida')
    }
    
    if (!newOrder.value.total_amount || newOrder.value.total_amount <= 0) {
      errors.push('El monto total debe ser mayor a 0')
    }
    
    // Validate email if provided
    if (newOrder.value.customer_email && !isValidEmail(newOrder.value.customer_email)) {
      errors.push('El email del cliente no es válido')
    }
    
    // Validate time windows
    if (newOrder.value.timeWindowStart && newOrder.value.timeWindowEnd) {
      if (newOrder.value.timeWindowStart >= newOrder.value.timeWindowEnd) {
        errors.push('La hora de inicio debe ser anterior a la hora de fin')
      }
    }
    
    // Validate numeric fields
    if (newOrder.value.serviceTime && newOrder.value.serviceTime < 0) {
      errors.push('El tiempo de servicio no puede ser negativo')
    }
    
    if (newOrder.value.load1Packages && newOrder.value.load1Packages < 1) {
      errors.push('El número de paquetes debe ser al menos 1')
    }
    
    if (newOrder.value.load2WeightKg && newOrder.value.load2WeightKg < 0) {
      errors.push('El peso no puede ser negativo')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Prepare order data for submission
   */
  function prepareOrderData() {
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
      customer_name: newOrder.value.customer_name?.trim(),
      customer_email: newOrder.value.customer_email?.trim(),
      customer_phone: newOrder.value.customer_phone?.trim(),
      shipping_address: newOrder.value.shipping_address?.trim(),
      shipping_commune: newOrder.value.shipping_commune?.trim(),
      shipping_state: newOrder.value.shipping_state?.trim(),
      notes: newOrder.value.notes?.trim()
    }
  }

  /**
   * Reset new order form
   */
  function resetNewOrderForm() {
    newOrder.value = {
      company_id: '',
      channel_id: '',
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
   * Get current modal state for debugging
   */
  function getModalState() {
    return {
      orderDetails: showOrderDetailsModal.value,
      updateStatus: showUpdateStatusModal.value,
      createOrder: showCreateOrderModal.value,
      bulkUpload: showBulkUploadModal.value,
      assign: showAssignModal.value,
      bulkAssign: showBulkAssignModal.value,
      deliveryProof: showDeliveryProofModal.value,
      edit: showEditModal.value,
      selectedOrder: selectedOrder.value?.order_number || null
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Validate email format
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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
    selectedOrder,
    newOrder,
    isCreatingOrder,
    showDeliveryProofModal,
    showEditModal, // ✅ Exportado
    
    // Methods
    openOrderDetailsModal,
    closeOrderDetailsModal,
    
    openDeliveryProofModal,
    closeDeliveryProofModal,
    
    openUpdateStatusModal,
    closeUpdateStatusModal,
    
    openEditModal, // ✅ Exportado
    closeEditModal, // ✅ Exportado
    
    openCreateOrderModal,
    closeCreateOrderModal,
    
    openBulkUploadModal,
    closeBulkUploadModal,
    
    openAssignModal,
    closeAssignModal,
    
    openBulkAssignModal,
    closeBulkAssignModal,
    closeBulkAssignModalFull,
    
    closeAllModals,
    validateNewOrder,
    prepareOrderData,
    resetNewOrderForm,
    getModalState
  }
}