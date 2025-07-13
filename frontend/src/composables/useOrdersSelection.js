// composables/useOrdersSelection.js
import { ref, computed } from 'vue'

export function useOrdersSelection(orders) {
  // ==================== STATE ====================
  const selectedOrders = ref([])

  // ==================== COMPUTED ====================
  
  /**
   * Orders that can be selected (not already assigned to Shipday)
   */
  const selectableOrders = computed(() => {
     return orders.value.filter(order => {
    const isAssignable = !order.shipday_driver_id; // Se puede asignar si NO tiene conductor
    const isCorrectStatus = ['pending', 'ready_for_pickup'].includes(order.status);
    return isAssignable && isCorrectStatus;
  });
  })

  /**
   * Check if all selectable orders are selected
   */
  const selectAllChecked = computed(() => {
    const selectable = selectableOrders.value
    return selectable.length > 0 && 
           selectable.every(order => selectedOrders.value.includes(order._id))
  })

  /**
   * Check if some (but not all) orders are selected (indeterminate state)
   */
  const selectAllIndeterminate = computed(() => {
    const selectable = selectableOrders.value
    const selectedCount = selectable.filter(order => 
      selectedOrders.value.includes(order._id)
    ).length
    
    return selectedCount > 0 && selectedCount < selectable.length
  })

  /**
   * Count of selected orders
   */
  const selectedCount = computed(() => {
    return selectedOrders.value.length
  })

  /**
   * Check if any orders are selected
   */
  const hasSelection = computed(() => {
    return selectedOrders.value.length > 0
  })

  /**
   * Get selected order objects (not just IDs)
   */
  const selectedOrderObjects = computed(() => {
    return orders.value.filter(order => 
      selectedOrders.value.includes(order._id)
    )
  })

  /**
   * Statistics about selection
   */
  const selectionStats = computed(() => {
    const selected = selectedOrderObjects.value
    
    return {
      total: selected.length,
      pending: selected.filter(o => o.status === 'pending').length,
      processing: selected.filter(o => o.status === 'processing').length,
      ready_for_pickup: selected.filter(o => o.status === 'ready_for_pickup').length,
      totalValue: selected.reduce((sum, order) => sum + (order.total_amount || 0), 0)
    }
  })

  // ==================== METHODS ====================

  /**
   * Toggle selection of a single order
   */
  function toggleOrderSelection(order) {
    // Don't allow selection of orders already assigned to Shipday
    if (order.shipday_order_id) {
      console.warn('⚠️ Cannot select order already assigned to Shipday:', order.order_number)
      return
    }

    const index = selectedOrders.value.indexOf(order._id)
    
    if (index > -1) {
      // Remove from selection
      selectedOrders.value.splice(index, 1)
      console.log('➖ Order deselected:', order.order_number)
    } else {
      // Add to selection
      selectedOrders.value.push(order._id)
      console.log('➕ Order selected:', order.order_number)
    }
    
    console.log('📊 Current selection:', selectedOrders.value.length, 'orders')
  }

  /**
   * Toggle select all/none
   */
  function toggleSelectAll() {
    const selectable = selectableOrders.value
    
    if (selectAllChecked.value) {
      // Deselect all selectable orders from current page
      selectable.forEach(order => {
        const index = selectedOrders.value.indexOf(order._id)
        if (index > -1) {
          selectedOrders.value.splice(index, 1)
        }
      })
      console.log('🔄 All orders deselected from current page')
    } else {
      // Select all selectable orders from current page
      selectable.forEach(order => {
        if (!selectedOrders.value.includes(order._id)) {
          selectedOrders.value.push(order._id)
        }
      })
      console.log('✅ All selectable orders selected from current page')
    }
    
    console.log('📊 Total selection after toggle:', selectedOrders.value.length, 'orders')
  }

  /**
   * Clear all selection
   */
  function clearSelection() {
    const previousCount = selectedOrders.value.length
    selectedOrders.value = []
    console.log('🗑️ Selection cleared:', previousCount, 'orders deselected')
  }

  /**
   * Check if specific order is selected
   */
  function isOrderSelected(order) {
    return selectedOrders.value.includes(order._id)
  }

  /**
   * Select specific orders by IDs
   */
  function selectOrders(orderIds) {
    const validIds = orderIds.filter(id => {
      const order = orders.value.find(o => o._id === id)
      return order && !order.shipday_order_id
    })
    
    validIds.forEach(id => {
      if (!selectedOrders.value.includes(id)) {
        selectedOrders.value.push(id)
      }
    })
    
    console.log('📋 Orders selected by ID:', validIds.length)
  }

  /**
   * Deselect specific orders by IDs
   */
  function deselectOrders(orderIds) {
    orderIds.forEach(id => {
      const index = selectedOrders.value.indexOf(id)
      if (index > -1) {
        selectedOrders.value.splice(index, 1)
      }
    })
    
    console.log('📋 Orders deselected by ID:', orderIds.length)
  }

  /**
   * Select orders by criteria
   */
  function selectOrdersByCriteria(criteria) {
    const matchingOrders = selectableOrders.value.filter(order => {
      let matches = true
      
      if (criteria.status && order.status !== criteria.status) {
        matches = false
      }
      
      if (criteria.company_id && order.company_id !== criteria.company_id) {
        matches = false
      }
      
      if (criteria.commune && order.shipping_commune !== criteria.commune) {
        matches = false
      }
      
      return matches
    })
    
    const newIds = matchingOrders.map(order => order._id)
    selectOrders(newIds)
    
    console.log('🎯 Orders selected by criteria:', matchingOrders.length)
    return matchingOrders.length
  }

  /**
   * Get selection summary for display
   */
  function getSelectionSummary() {
    const stats = selectionStats.value
    
    return {
      text: `${stats.total} pedidos seleccionados`,
      details: [
        `Pendientes: ${stats.pending}`,
        `Procesando: ${stats.processing}`,
        `Listos: ${stats.ready_for_pickup}`,
        `Valor total: $${stats.totalValue.toLocaleString('es-CL')}`
      ]
    }
  }

  /**
   * Validate selection for bulk operations
   */
  function validateSelection() {
    if (selectedOrders.value.length === 0) {
      return {
        valid: false,
        message: 'No hay pedidos seleccionados'
      }
    }
    
    const invalidOrders = selectedOrderObjects.value.filter(order => 
      order.shipday_order_id
    )
    
    if (invalidOrders.length > 0) {
      return {
        valid: false,
        message: `${invalidOrders.length} pedidos ya están asignados en Shipday`
      }
    }
    
    return {
      valid: true,
      message: `${selectedOrders.value.length} pedidos válidos para operación masiva`
    }
  }

  /**
   * Clean up selection (remove invalid IDs)
   */
  function cleanupSelection() {
    const validIds = selectedOrders.value.filter(id => {
      const order = orders.value.find(o => o._id === id)
      return order && !order.shipday_order_id
    })
    
    const removedCount = selectedOrders.value.length - validIds.length
    selectedOrders.value = validIds
    
    if (removedCount > 0) {
      console.log('🧹 Selection cleaned up:', removedCount, 'invalid selections removed')
    }
    
    return removedCount
  }

  // ==================== RETURN ====================
  return {
    // State
    selectedOrders,
    
    // Computed
    selectableOrders,
    selectAllChecked,
    selectAllIndeterminate,
    selectedCount,
    hasSelection,
    selectedOrderObjects,
    selectionStats,
    
    // Methods
    toggleOrderSelection,
    toggleSelectAll,
    clearSelection,
    isOrderSelected,
    selectOrders,
    deselectOrders,
    selectOrdersByCriteria,
    getSelectionSummary,
    validateSelection,
    cleanupSelection
  }
}