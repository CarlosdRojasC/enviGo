// frontend/src/composables/useRealtimeData.js - COMPOSABLE PARA DATOS EN TIEMPO REAL
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiService } from '../services/api'
import { toastService } from '../services/toast.service'

export function useRealtimeData(endpoint, options = {}) {
  // ==================== CONFIGURACIÓN ====================
  const {
    refreshInterval = 30000,     // 30 segundos por defecto
    enableAutoRefresh = true,
    enableWebSocketUpdates = true,
    showToastsOnUpdate = false,
    dependencies = []             // Para reactividad
  } = options

  // ==================== ESTADO REACTIVO ====================
  const data = ref(null)
  const loading = ref(true)
  const error = ref(null)
  const lastUpdate = ref(null)
  const isAutoRefreshActive = ref(enableAutoRefresh)
  const isWebSocketActive = ref(enableWebSocketUpdates)
  const updateCount = ref(0)
  const pendingUpdates = ref(0)

  // Timers y listeners
  let refreshTimer = null
  let updateQueue = []
  let retryCount = 0
  const maxRetries = 3

  // ==================== COMPUTED ====================
  const stats = computed(() => ({
    lastUpdate: lastUpdate.value,
    autoRefresh: isAutoRefreshActive.value,
    webSocket: isWebSocketActive.value,
    updateCount: updateCount.value,
    pendingUpdates: pendingUpdates.value,
    hasData: !!data.value,
    isStale: lastUpdate.value && (Date.now() - lastUpdate.value) > refreshInterval * 2
  }))

  const isOutdated = computed(() => {
    if (!lastUpdate.value) return true
    return (Date.now() - lastUpdate.value) > refreshInterval * 1.5
  })

  // ==================== MÉTODOS PRINCIPALES ====================

  /**
   * Cargar datos desde la API
   */
  async function fetchData(showLoader = false) {
    if (showLoader) loading.value = true
    error.value = null

    try {
      console.log(`🔄 [RealtimeData] Fetching data from ${endpoint}`)
      
      const response = await apiService.get(endpoint)
      
      if (response.data) {
        const previousData = data.value
        data.value = response.data
        lastUpdate.value = Date.now()
        updateCount.value++
        retryCount = 0

        // Procesar diferencias si hay datos previos
        if (previousData && showToastsOnUpdate) {
          processDifferences(previousData, response.data)
        }

        console.log(`✅ [RealtimeData] Data updated successfully`)
        return response.data
      }
    } catch (err) {
      console.error(`❌ [RealtimeData] Error fetching data:`, err)
      error.value = err.message || 'Error al cargar datos'
      
      // Retry logic
      if (retryCount < maxRetries) {
        retryCount++
        console.log(`🔄 [RealtimeData] Retrying... (${retryCount}/${maxRetries})`)
        setTimeout(() => fetchData(showLoader), 2000 * retryCount)
      } else {
        toastService.error(`Error cargando datos: ${error.value}`)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Refrescar datos manualmente
   */
  async function refresh() {
    await fetchData(true)
    toastService.success('📊 Datos actualizados')
  }

  /**
   * Activar/desactivar actualización automática
   */
  function toggleAutoRefresh() {
    isAutoRefreshActive.value = !isAutoRefreshActive.value
    
    if (isAutoRefreshActive.value) {
      startAutoRefresh()
      toastService.info('⚡ Actualización automática activada')
    } else {
      stopAutoRefresh()
      toastService.info('⏸️ Actualización automática pausada')
    }
  }

  /**
   * Iniciar actualización automática
   */
  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer)
    
    refreshTimer = setInterval(() => {
      if (isAutoRefreshActive.value && !loading.value) {
        fetchData(false) // Sin loader para no ser intrusivo
      }
    }, refreshInterval)
    
    console.log(`🔄 [RealtimeData] Auto-refresh started (${refreshInterval}ms)`)
  }

  /**
   * Detener actualización automática
   */
  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    console.log(`⏸️ [RealtimeData] Auto-refresh stopped`)
  }

  /**
   * Procesar actualizaciones en tiempo real via WebSocket
   */
  function handleRealtimeUpdate(eventData) {
    if (!isWebSocketActive.value) return

    console.log(`⚡ [RealtimeData] Real-time update received:`, eventData)
    
    // Añadir a cola de actualizaciones pendientes
    updateQueue.push({
      ...eventData,
      timestamp: Date.now()
    })
    
    pendingUpdates.value = updateQueue.length
    
    // Procesar actualizaciones después de un breve delay
    setTimeout(processUpdateQueue, 1000)
  }

  /**
   * Procesar cola de actualizaciones
   */
  function processUpdateQueue() {
    if (updateQueue.length === 0) return

    console.log(`⚡ [RealtimeData] Processing ${updateQueue.length} pending updates`)
    
    // Aplicar todas las actualizaciones pendientes
    updateQueue.forEach(update => {
      applyIncrementalUpdate(update)
    })
    
    // Limpiar cola
    updateQueue = []
    pendingUpdates.value = 0
    lastUpdate.value = Date.now()
    updateCount.value++
  }

  /**
   * Aplicar actualización incremental sin refetch completo
   */
  function applyIncrementalUpdate(update) {
    if (!data.value) return

    try {
      switch (update.type) {
        case 'order_created':
          if (data.value.orders !== undefined) {
            data.value.total_orders = (data.value.total_orders || 0) + 1
            data.value.orders_today = (data.value.orders_today || 0) + 1
          }
          break
          
        case 'order_status_changed':
          if (data.value.orders_by_status) {
            // Decrementar estado anterior
            if (update.old_status && data.value.orders_by_status[update.old_status]) {
              data.value.orders_by_status[update.old_status]--
            }
            // Incrementar nuevo estado
            if (update.new_status) {
              data.value.orders_by_status[update.new_status] = 
                (data.value.orders_by_status[update.new_status] || 0) + 1
            }
          }
          
          // Actualizar métricas específicas
          if (update.new_status === 'delivered') {
            data.value.delivered_orders = (data.value.delivered_orders || 0) + 1
          }
          break
          
        case 'channel_sync_completed':
          if (data.value.channels) {
            data.value.total_orders = (data.value.total_orders || 0) + update.orders_imported
            data.value.orders_today = (data.value.orders_today || 0) + update.orders_imported
          }
          break
      }
      
      console.log(`✅ [RealtimeData] Incremental update applied:`, update.type)
      
    } catch (err) {
      console.error(`❌ [RealtimeData] Error applying incremental update:`, err)
      // Fallback: hacer fetch completo
      fetchData(false)
    }
  }

  /**
   * Comparar datos para detectar cambios significativos
   */
  function processDifferences(oldData, newData) {
    if (!oldData || !newData) return

    // Detectar cambios en métricas principales
    const changes = []
    
    if (oldData.total_orders !== newData.total_orders) {
      const diff = newData.total_orders - oldData.total_orders
      changes.push(`${diff > 0 ? '+' : ''}${diff} pedidos`)
    }
    
    if (oldData.delivered_orders !== newData.delivered_orders) {
      const diff = newData.delivered_orders - oldData.delivered_orders
      changes.push(`${diff > 0 ? '+' : ''}${diff} entregas`)
    }
    
    if (changes.length > 0) {
      toastService.info(`📊 Datos actualizados: ${changes.join(', ')}`, {
        timeout: 4000
      })
    }
  }

  // ==================== LIFECYCLE ====================

  onMounted(() => {
    console.log(`🚀 [RealtimeData] Initializing for endpoint: ${endpoint}`)
    
    // Carga inicial
    fetchData(true)
    
    // Configurar auto-refresh
    if (enableAutoRefresh) {
      startAutoRefresh()
    }
    
    // Configurar WebSocket listeners
    if (enableWebSocketUpdates) {
      window.addEventListener('orderUpdated', (event) => {
        handleRealtimeUpdate({
          type: 'order_status_changed',
          ...event.detail
        })
      })
      
      window.addEventListener('orderCreated', (event) => {
        handleRealtimeUpdate({
          type: 'order_created',
          ...event.detail
        })
      })
      
      window.addEventListener('channelSyncCompleted', (event) => {
        handleRealtimeUpdate({
          type: 'channel_sync_completed',
          ...event.detail
        })
      })
    }
  })

  onUnmounted(() => {
    console.log(`🧹 [RealtimeData] Cleaning up for endpoint: ${endpoint}`)
    
    stopAutoRefresh()
    
    // Cleanup WebSocket listeners
    window.removeEventListener('orderUpdated', handleRealtimeUpdate)
    window.removeEventListener('orderCreated', handleRealtimeUpdate)
    window.removeEventListener('channelSyncCompleted', handleRealtimeUpdate)
  })

  // ==================== RETURN ====================
  return {
    // Estado
    data,
    loading,
    error,
    stats,
    isOutdated,
    
    // Métodos
    refresh,
    fetchData,
    toggleAutoRefresh,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Control
    isAutoRefreshActive,
    isWebSocketActive
  }
}