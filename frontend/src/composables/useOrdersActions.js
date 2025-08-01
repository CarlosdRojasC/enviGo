// composables/useOrdersActions.js
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'

export function useOrdersActions(newOrder, isCreatingOrder, fetchOrders) {
  const toast = useToast()

  // ==================== STATE ====================
  const isExporting = ref(false)

  // ==================== METHODS ====================
  
async function exportOrders(filters = {}) {
  isExporting.value = true
  
  try {
    console.log('📤 Exportando pedidos con filtros:', filters)
    
    const response = await apiService.orders.exportOrders(filters)
    
    // Handle different response types
    let data = response.data
    let filename = `pedidos_${Date.now()}.xlsx`
    
    // Check if response has custom filename
    const contentDisposition = response.headers['content-disposition']
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }
    
    // Create and download file
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    toast.success('✅ Pedidos exportados exitosamente')
    console.log('✅ Export completed:', filename)
    
  } catch (error) {
    console.error('❌ Error exporting orders:', error)
    
    if (error.response?.status === 404 || error.response?.data?.message?.includes('no encontraron')) {
      toast.warning('No se encontraron pedidos para exportar con los filtros aplicados')
    } else {
      toast.error('Error al exportar pedidos. Inténtalo de nuevo.')
    }
  } finally {
    isExporting.value = false
  }
}

  /**
   * Create new order manually
   */
async function handleCreateOrder() {

  console.group('🐛 DEBUG - Create Order Form Data')
  console.log('newOrder.value completo:', newOrder.value)
  console.log('company_id:', newOrder.value.company_id)
  console.log('channel_id:', newOrder.value.channel_id) // ✅ NUEVO LOG
  console.log('customer_name:', newOrder.value.customer_name)
  console.log('shipping_address:', newOrder.value.shipping_address)
  console.log('shipping_commune:', newOrder.value.shipping_commune)
  console.log('total_amount:', newOrder.value.total_amount)
  console.groupEnd()

  // ✅ NUEVA VALIDACIÓN: Canal requerido
  if (!newOrder.value.channel_id) {
    console.error('❌ channel_id is missing:', newOrder.value.channel_id)
    toast.warning('Por favor, selecciona el canal de retiro')
    return false
  }

  // Validation con mensajes más específicos
  if (!newOrder.value.company_id) {
    console.error('❌ company_id is missing:', newOrder.value.company_id)
    toast.warning('Por favor, seleccione una empresa')
    return false
  }
  
  if (!newOrder.value.customer_name?.trim()) {
    console.error('❌ customer_name is missing:', newOrder.value.customer_name)
    toast.warning('Por favor, ingrese el nombre del cliente')
    return false
  }

  // Validation
  if (!newOrder.value.shipping_address?.trim()) {
    toast.warning('Por favor, ingrese la dirección de envío')
    return false
  }
  
  if (!newOrder.value.shipping_commune?.trim()) {
    toast.warning('Por favor, ingrese la comuna')
    return false
  }
  
  if (!newOrder.value.total_amount || newOrder.value.total_amount <= 0) {
    toast.warning('Por favor, ingrese un monto total válido')
    return false
  }
  
  isCreatingOrder.value = true
  
  try {
    console.log('➕ Creating new order:', newOrder.value)
    
    // ✅ VALIDACIÓN ADICIONAL: Verificar que el canal pertenece a la empresa
    const channelsResponse = await apiService.channels.getByCompany(newOrder.value.company_id)
    console.log('📡 Channels response:', channelsResponse)

    // ✅ EXTRAER CANALES CORRECTAMENTE
    let channels = []
    if (channelsResponse?.data?.data && Array.isArray(channelsResponse.data.data)) {
      channels = channelsResponse.data.data
    } else if (channelsResponse?.data && Array.isArray(channelsResponse.data)) {
      channels = channelsResponse.data
    }

    console.log('📡 Extracted channels:', channels)

    if (!channels || channels.length === 0) {
      toast.warning('La empresa seleccionada no tiene canales configurados. Configure uno primero.')
      return false
    }

    // ✅ VALIDAR QUE EL CANAL SELECCIONADO PERTENECE A LA EMPRESA
    const selectedChannel = channels.find(c => c._id === newOrder.value.channel_id)
    if (!selectedChannel) {
      toast.error('El canal seleccionado no es válido para esta empresa')
      return false
    }

    console.log('✅ Canal validado:', selectedChannel.channel_name)
    
    // Prepare order data
    const orderData = {
      ...newOrder.value,
      channel_id: newOrder.value.channel_id,  // ✅ USAR EL CANAL SELECCIONADO
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
      shipping_state: newOrder.value.shipping_state?.trim() || 'Región Metropolitana',
      notes: newOrder.value.notes?.trim()
    }
    
    console.log('📦 Prepared order data:', orderData)
    
    // Create order
    const response = await apiService.orders.create(orderData)
    
    toast.success(`✅ Pedido manual creado exitosamente para ${selectedChannel.channel_name}`)
    console.log('✅ Order created:', response.data)
    
    // Refresh orders list
    await fetchOrders()
    
    // Reset form
    resetNewOrderForm()
    
    return true
    
  } catch (error) {
    console.error('❌ Error creating order:', error)
    
    let errorMessage = 'No se pudo crear el pedido'
    
    if (error.response?.data?.errors?.[0]?.msg) {
      errorMessage = error.response.data.errors[0].msg
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    toast.error(`Error al crear pedido: ${errorMessage}`)
    return false
    
  } finally {
    isCreatingOrder.value = false
  }
}

  /**
   * Handle order status update
   */
  async function handleStatusUpdate({ orderId, newStatus }) {
    try {
      console.log('🔄 Updating order status:', { orderId, newStatus })
      
      await apiService.orders.updateStatus(orderId, newStatus)
      
      toast.success('✅ Estado actualizado exitosamente')
      console.log('✅ Status updated successfully')
      
      // Refresh orders to show changes
      await fetchOrders()
      
      return true
      
    } catch (error) {
      console.error('❌ Error updating status:', error)
      
      let errorMessage = 'Error al actualizar estado'
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(`Error al actualizar estado: ${errorMessage}`)
      return false
    }
  }

  /**
   * Delete order
   */
  async function deleteOrder(orderId) {
    const confirmed = confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')
    
    if (!confirmed) {
      return false
    }
    
    try {
      console.log('🗑️ Deleting order:', orderId)
      
      await apiService.orders.delete(orderId)
      
      toast.success('✅ Pedido eliminado exitosamente')
      console.log('✅ Order deleted successfully')
      
      // Refresh orders
      await fetchOrders()
      
      return true
      
    } catch (error) {
      console.error('❌ Error deleting order:', error)
      toast.error('Error al eliminar pedido')
      return false
    }
  }

  /**
   * Duplicate order
   */
  async function duplicateOrder(order) {
    try {
      console.log('📋 Duplicating order:', order._id)
      
      // Create new order data based on existing order
      const duplicateData = {
        company_id: order.company_id,
        channel_id: order.channel_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        shipping_address: order.shipping_address,
        shipping_commune: order.shipping_commune,
        shipping_state: order.shipping_state,
        total_amount: order.total_amount,
        shipping_cost: order.shipping_cost,
        notes: order.notes ? `[DUPLICADO] ${order.notes}` : '[DUPLICADO]',
        
        // Generate new identifiers
        order_number: `DUP-${Date.now()}`,
        external_order_id: `duplicate-${order._id}-${Date.now()}`,
        
      }
      
      await apiService.orders.create(duplicateData)
      
      toast.success('✅ Pedido duplicado exitosamente')
      console.log('✅ Order duplicated successfully')
      
      // Refresh orders
      await fetchOrders()
      
      return true
      
    } catch (error) {
      console.error('❌ Error duplicating order:', error)
      toast.error('Error al duplicar pedido')
      return false
    }
  }

  /**
   * Reset new order form
   */
function resetNewOrderForm() {
  newOrder.value = {
    company_id: '',
    channel_id: '', // ✅ AGREGAR ESTA LÍNEA
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
}

  /**
   * Format currency for display
   */
  async function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '$0'
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date for display
   */
  async function formatDate(dateStr, withTime = false) {
    if (!dateStr) return 'N/A'
    
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Santiago'
    }
    
    if (withTime) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }
    
    return new Date(dateStr).toLocaleString('es-CL', options)
  }

  /**
   * Get status display name
   */
  async function getStatusName(status) {
    const statusMap = {
    pending: 'Pendiente',
    ready_for_pickup: 'Listo para Retiro',
    warehouse_received: '📦 En Bodega',
    shipped: '🚚 En Ruta',
    delivered: '✅ Entregado',
    invoiced: '🧾 Facturado',
    cancelled: '❌ Cancelado'
    }
    return statusMap[status] || status
  }

  /**
   * Get commune display class
   */
  async function getCommuneClass(commune) {
    if (!commune || commune === 'Sin comuna') return 'commune-empty'
    
    const importantCommunes = [
      'Las Condes', 'Vitacura', 'Providencia', 'Ñuñoa', 'Santiago',
      'La Florida', 'Peñalolén', 'Macul', 'San Miguel', 'Quinta Normal',
      'Independencia', 'Recoleta', 'Huechuraba', 'Quilicura', 
      'Estación Central', 'La Reina', 'San Joaquín', 'Pedro Aguirre Cerda',
      'Cerrillos', 'Renca', 'La Granja', 'La Cisterna', 'San Ramón', 
      'Cerro Navia'
    ]
    
    const isImportant = importantCommunes.some(important => 
      commune.toLowerCase().includes(important.toLowerCase())
    )
    
    return isImportant ? 'commune-important' : 'commune-filled'
  }

  /**
   * Debug order information
   */
  async function debugOrder(order) {
    console.group('🐛 Order Debug Info')
    console.log('Order ID:', order._id)
    console.log('Order Number:', order.order_number)
    console.log('Status:', order.status)
    console.log('Company:', order.company_id)
    console.log('Shipday Order ID:', order.shipday_order_id)
    console.log('Driver ID:', order.driver_id)
    console.log('Full Order Object:', order)
    console.groupEnd()
    
    toast.info(`Debug info logged for order ${order.order_number}`)
  }
  

  // ==================== RETURN ====================
  return {
    // State
    isExporting,
    
    // Methods
    exportOrders,
    handleCreateOrder,
    handleStatusUpdate,
    deleteOrder,
    duplicateOrder,
    resetNewOrderForm,
    formatCurrency,
    formatDate,
    getStatusName,
    getCommuneClass,
    debugOrder
  }
}