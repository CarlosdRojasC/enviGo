// frontend/src/services/toast.service.js - NUEVO SERVICIO DE TOAST MEJORADO
import { useToast } from 'vue-toastification'

class ToastService {
  constructor() {
    this.toast = useToast()
    this.activeToasts = new Map()
    this.notificationQueue = []
    this.maxActiveToasts = 3
  }

  // ==================== MÉTODOS PRINCIPALES ====================

  /**
   * Mostrar notificación de éxito
   */
  success(message, options = {}) {
    return this.show('success', message, {
      timeout: 4000,
      icon: '✅',
      ...options
    })
  }

  /**
   * Mostrar notificación de error
   */
  error(message, options = {}) {
    return this.show('error', message, {
      timeout: 8000,
      icon: '❌',
      ...options
    })
  }

  /**
   * Mostrar notificación de advertencia
   */
  warning(message, options = {}) {
    return this.show('warning', message, {
      timeout: 6000,
      icon: '⚠️',
      ...options
    })
  }

  /**
   * Mostrar notificación informativa
   */
  info(message, options = {}) {
    return this.show('info', message, {
      timeout: 5000,
      icon: 'ℹ️',
      ...options
    })
  }

  // ==================== NOTIFICACIONES ESPECÍFICAS ====================

  /**
   * Notificación de pedido actualizado
   */
  orderUpdated(orderData) {
    const statusMessages = {
      'driver_assigned': `🚚 Conductor asignado a pedido #${orderData.order_number}`,
      'picked_up': `📦 Pedido #${orderData.order_number} recogido`,
      'in_transit': `🚛 Pedido #${orderData.order_number} en tránsito`,
      'delivered': `✅ Pedido #${orderData.order_number} entregado`,
      'failed_delivery': `❌ Error en entrega del pedido #${orderData.order_number}`,
      'proof_uploaded': `📷 Prueba de entrega subida para #${orderData.order_number}`
    }

    const message = statusMessages[orderData.status] || 
                   `🔄 Pedido #${orderData.order_number} actualizado`

    const statusColors = {
      'driver_assigned': '#3b82f6',
      'picked_up': '#8b5cf6',
      'in_transit': '#f59e0b',
      'delivered': '#10b981',
      'failed_delivery': '#ef4444',
      'proof_uploaded': '#06b6d4'
    }

    return this.show('info', message, {
      timeout: 7000,
      toastClassName: `order-status-${orderData.status}`,
      bodyClassName: 'order-notification-body',
      style: {
        borderLeft: `4px solid ${statusColors[orderData.status] || '#6b7280'}`
      },
      onClick: () => {
        // Emitir evento para navegar al pedido
        window.dispatchEvent(new CustomEvent('navigateToOrder', {
          detail: { orderId: orderData.order_id }
        }))
      }
    })
  }

  /**
   * Notificación de sincronización
   */
  syncNotification(channelName, result) {
    if (result.success) {
      return this.success(
        `🔄 Canal "${channelName}" sincronizado: ${result.ordersImported} pedidos importados`,
        { timeout: 5000 }
      )
    } else {
      return this.error(
        `❌ Error sincronizando "${channelName}": ${result.error}`,
        { timeout: 8000 }
      )
    }
  }

  /**
   * Notificación de conexión WebSocket
   */
  connectionStatus(status, details = {}) {
    const messages = {
      connected: '📡 Notificaciones en tiempo real activadas',
      disconnected: '📡 Notificaciones desconectadas',
      reconnecting: '🔄 Reconectando notificaciones...',
      error: '❌ Error en sistema de notificaciones'
    }

    const types = {
      connected: 'success',
      disconnected: 'warning',
      reconnecting: 'info',
      error: 'error'
    }

    // Solo mostrar primera conexión para evitar spam
    if (status === 'connected' && details.isReconnection) return

    return this.show(types[status], messages[status], {
      timeout: status === 'error' ? 8000 : 4000,
      toastId: 'websocket-status'  // Reemplaza toasts anteriores del mismo tipo
    })
  }

  // ==================== MÉTODOS AVANZADOS ====================

  /**
   * Mostrar notificación con gestión de cola
   */
  show(type, message, options = {}) {
    // Verificar si ya hay demasiadas notificaciones activas
    if (this.activeToasts.size >= this.maxActiveToasts) {
      this.notificationQueue.push({ type, message, options })
      return null
    }

    const finalOptions = {
      ...options,
      onClose: () => {
        this.activeToasts.delete(toastId)
        this.processQueue()
        if (options.onClose) options.onClose()
      }
    }

    let toastId
    try {
      toastId = this.toast[type](message, finalOptions)
      this.activeToasts.set(toastId, { type, message, timestamp: Date.now() })
      return toastId
    } catch (error) {
      console.error('Error mostrando toast:', error)
      return null
    }
  }

  /**
   * Procesar cola de notificaciones pendientes
   */
  processQueue() {
    if (this.notificationQueue.length > 0 && this.activeToasts.size < this.maxActiveToasts) {
      const next = this.notificationQueue.shift()
      this.show(next.type, next.message, next.options)
    }
  }

  /**
   * Cerrar notificación específica
   */
  dismiss(toastId) {
    if (toastId && this.activeToasts.has(toastId)) {
      this.toast.dismiss(toastId)
      this.activeToasts.delete(toastId)
      this.processQueue()
    }
  }

  /**
   * Cerrar todas las notificaciones
   */
  clear() {
    this.toast.clear()
    this.activeToasts.clear()
    this.notificationQueue = []
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  getStats() {
    return {
      active: this.activeToasts.size,
      queued: this.notificationQueue.length,
      total: this.activeToasts.size + this.notificationQueue.length
    }
  }

  // ==================== NOTIFICACIONES DE BATCH ====================

  /**
   * Mostrar progreso de operaciones en lote
   */
  batchProgress(current, total, operation) {
    const percentage = Math.round((current / total) * 100)
    
    return this.info(
      `${operation}: ${current}/${total} (${percentage}%)`,
      {
        timeout: false, // No cerrar automáticamente
        toastId: 'batch-progress',
        hideProgressBar: false,
        progress: percentage
      }
    )
  }

  /**
   * Resultado de operación en lote
   */
  batchComplete(results) {
    // Cerrar toast de progreso
    this.dismiss('batch-progress')

    if (results.success > 0 && results.errors === 0) {
      return this.success(
        `✅ Operación completada: ${results.success} elementos procesados`
      )
    } else if (results.success > 0 && results.errors > 0) {
      return this.warning(
        `⚠️ Completado con errores: ${results.success} éxito, ${results.errors} errores`
      )
    } else {
      return this.error(
        `❌ Operación fallida: ${results.errors} errores`
      )
    }
  }
}

// Crear instancia singleton
export const toastService = new ToastService()

// Composable para usar en componentes Vue
export function useEnvigoToast() {
  return toastService
}