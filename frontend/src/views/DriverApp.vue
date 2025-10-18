<template>
  <div class="driver-app">
    <!-- Header -->
    <header class="driver-header">
      <div class="header-content">
        <div class="driver-info">
          <div class="avatar">
            {{ driverName ? driverName.charAt(0).toUpperCase() : 'D' }}
          </div>
          <div class="info">
            <h3>{{ driverName || 'Conductor' }}</h3>
            <p class="status" :class="connectionStatus">
              {{ connectionStatus === 'online' ? '🟢 En línea' : '🔴 Sin conexión' }}
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button 
            @click="syncOfflineData" 
            class="sync-btn"
            :disabled="isSyncing || !hasOfflineData"
            :class="{ 'has-pending': hasOfflineData }"
          >
            <span v-if="isSyncing">🔄</span>
            <span v-else-if="hasOfflineData">⚠️</span>
            <span v-else>✅</span>
          </button>
          <button @click="showSettings = true" class="settings-btn">⚙️</button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- No Active Route -->
      <div v-if="!activeRoute" class="no-route-card">
        <div class="icon">🚚</div>
        <h2>Sin rutas asignadas</h2>
        <p>Esperando asignación de rutas...</p>
        <button @click="checkForActiveRoute" class="refresh-btn">
          Actualizar
        </button>
      </div>

      <!-- Active Route -->
      <div v-else class="route-container">
        <!-- Route Status -->
        <div class="route-status-card">
          <div class="status-header">
            <h3>Ruta Activa</h3>
            <span class="status-badge" :class="activeRoute.status">
              {{ getStatusText(activeRoute.status) }}
            </span>
          </div>
          <div class="route-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${routeProgress}%` }"
              ></div>
            </div>
            <p>{{ completedOrders }}/{{ totalOrders }} entregas completadas</p>
          </div>
          <div class="route-actions">
            <button 
              v-if="activeRoute.status === 'assigned'"
              @click="startRoute"
              class="start-btn"
            >
              🚀 Iniciar Ruta
            </button>
            <button 
              v-if="activeRoute.status === 'in_progress'"
              @click="showRouteMap = true"
              class="map-btn"
            >
              🗺️ Ver Mapa
            </button>
          </div>
        </div>

        <!-- Orders List -->
        <div class="orders-container">
          <h3>Lista de Entregas</h3>
          <div class="orders-list">
            <div 
              v-for="orderItem in sortedOrders" 
              :key="orderItem.order._id"
              class="order-card"
              :class="{ 
                'current': isCurrentDelivery(orderItem),
                'completed': orderItem.deliveryStatus === 'delivered',
                'failed': orderItem.deliveryStatus === 'failed'
              }"
              @click="selectOrder(orderItem)"
            >
              <div class="order-header">
                <div class="order-number">
                  <span class="sequence">#{{ orderItem.sequenceNumber }}</span>
                  <span class="order-id">{{ orderItem.order.order_number }}</span>
                </div>
                <div class="delivery-status" :class="orderItem.deliveryStatus">
                  {{ getDeliveryStatusText(orderItem.deliveryStatus) }}
                </div>
              </div>
              
              <div class="customer-info">
                <h4>{{ orderItem.order.customer.name }}</h4>
                <p>{{ orderItem.order.delivery_address.full_address }}</p>
                <p class="phone">📱 {{ orderItem.order.customer.phone || 'Sin teléfono' }}</p>
              </div>

              <div class="order-details">
                <div class="products">
                  <strong>Productos:</strong>
                  <span>{{ getProductsSummary(orderItem.order.product_details) }}</span>
                </div>
                <div class="estimated-time" v-if="orderItem.estimatedArrival">
                  <strong>Estimado:</strong>
                  <span>{{ formatTime(orderItem.estimatedArrival) }}</span>
                </div>
              </div>

              <div class="order-actions">
                <button 
                  v-if="orderItem.deliveryStatus === 'pending' && isCurrentDelivery(orderItem)"
                  @click.stop="markInProgress(orderItem)"
                  class="action-btn in-progress"
                >
                  📦 En camino
                </button>
                <button 
                  v-if="orderItem.deliveryStatus === 'in_progress'"
                  @click.stop="openDeliveryProof(orderItem)"
                  class="action-btn deliver"
                >
                  ✅ Entregar
                </button>
                <button 
                  v-if="orderItem.deliveryStatus === 'pending' || orderItem.deliveryStatus === 'in_progress'"
                  @click.stop="markAsFailed(orderItem)"
                  class="action-btn failed"
                >
                  ❌ No entregado
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Map Modal -->
    <div v-if="showRouteMap" class="modal-overlay" @click="showRouteMap = false">
      <div class="modal-content map-modal" @click.stop>
        <div class="modal-header">
          <h3>Mapa de Ruta</h3>
          <button @click="showRouteMap = false" class="close-btn">✕</button>
        </div>
        <div id="route-map" class="map-container"></div>
      </div>
    </div>

    <!-- Delivery Proof Modal -->
    <div v-if="showDeliveryProof" class="modal-overlay" @click="closeDeliveryProof">
      <div class="modal-content delivery-modal" @click.stop>
        <div class="modal-header">
          <h3>Confirmar Entrega</h3>
          <button @click="closeDeliveryProof" class="close-btn">✕</button>
        </div>
        <div class="delivery-form">
          <div class="customer-info">
            <h4>{{ selectedOrder?.order?.customer?.name }}</h4>
            <p>{{ selectedOrder?.order?.delivery_address?.full_address }}</p>
          </div>

          <!-- Photo Capture -->
          <div class="photo-section">
            <label>Foto de entrega *</label>
            <div class="photo-capture">
              <input 
                type="file" 
                ref="photoInput"
                accept="image/*"
                capture="environment"
                @change="handlePhotoCapture"
                style="display: none"
              >
              <div v-if="!deliveryPhoto" class="photo-placeholder" @click="$refs.photoInput.click()">
                <div class="icon">📷</div>
                <p>Tomar foto</p>
              </div>
              <div v-else class="photo-preview">
                <img :src="deliveryPhoto" alt="Foto de entrega">
                <button @click="retakePhoto" class="retake-btn">📷 Cambiar foto</button>
              </div>
            </div>
          </div>

          <!-- Recipient Name -->
          <div class="form-group">
            <label for="recipientName">Nombre de quien recibe *</label>
            <input 
              id="recipientName"
              v-model="deliveryForm.recipientName"
              type="text"
              placeholder="Nombre completo"
              required
            >
          </div>

          <!-- Signature -->
          <div class="form-group">
            <label>Firma (opcional)</label>
            <div class="signature-pad">
              <canvas 
                ref="signatureCanvas"
                @mousedown="startSigning"
                @mousemove="continueSigning"
                @mouseup="stopSigning"
                @touchstart="startSigning"
                @touchmove="continueSigning"
                @touchend="stopSigning"
              ></canvas>
              <button @click="clearSignature" class="clear-signature">Limpiar</button>
            </div>
          </div>

          <!-- Comments -->
          <div class="form-group">
            <label for="comments">Comentarios (opcional)</label>
            <textarea 
              id="comments"
              v-model="deliveryForm.comments"
              placeholder="Observaciones sobre la entrega..."
              rows="3"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="delivery-actions">
            <button @click="closeDeliveryProof" class="cancel-btn">
              Cancelar
            </button>
            <button 
              @click="confirmDelivery" 
              class="confirm-btn"
              :disabled="!isDeliveryFormValid || isSubmitting"
            >
              {{ isSubmitting ? 'Procesando...' : 'Confirmar Entrega' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
      <div class="modal-content settings-modal" @click.stop>
        <div class="modal-header">
          <h3>Configuración</h3>
          <button @click="showSettings = false" class="close-btn">✕</button>
        </div>
        <div class="settings-content">
          <div class="setting-item">
            <label>Modo offline</label>
            <input type="checkbox" v-model="offlineMode">
          </div>
          <div class="setting-item">
            <label>Notificaciones</label>
            <input type="checkbox" v-model="notificationsEnabled">
          </div>
          <div class="setting-item">
            <button @click="logout" class="logout-btn">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

export default {
  name: 'DriverApp',
  setup() {
    const router = useRouter()
    
    // State
    const activeRoute = ref(null)
    const connectionStatus = ref('online')
    const driverName = ref('')
    const showRouteMap = ref(false)
    const showDeliveryProof = ref(false)
    const showSettings = ref(false)
    const selectedOrder = ref(null)
    const isSyncing = ref(false)
    const isSubmitting = ref(false)
    
    // Settings
    const offlineMode = ref(false)
    const notificationsEnabled = ref(true)
    
    // Delivery form
    const deliveryForm = ref({
      recipientName: '',
      comments: ''
    })
    const deliveryPhoto = ref(null)
    const signatureData = ref(null)
    
    // Signature pad state
    const isDrawing = ref(false)
    const signatureCanvas = ref(null)
    
    // Offline data
    const offlineUpdates = ref([])
    
    // Computed
    const routeProgress = computed(() => {
      if (!activeRoute.value || !activeRoute.value.orders) return 0
      const completed = activeRoute.value.orders.filter(o => o.deliveryStatus === 'delivered').length
      return Math.round((completed / activeRoute.value.orders.length) * 100)
    })
    
    const completedOrders = computed(() => {
      return activeRoute.value?.orders?.filter(o => o.deliveryStatus === 'delivered').length || 0
    })
    
    const totalOrders = computed(() => {
      return activeRoute.value?.orders?.length || 0
    })
    
    const sortedOrders = computed(() => {
      if (!activeRoute.value?.orders) return []
      return [...activeRoute.value.orders].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    })
    
    const hasOfflineData = computed(() => {
      return offlineUpdates.value.length > 0
    })
    
    const isDeliveryFormValid = computed(() => {
      return deliveryForm.value.recipientName.trim() !== '' && deliveryPhoto.value !== null
    })
    
    // Methods
    const checkForActiveRoute = async () => {
      try {
        const response = await api.routes.getActiveRoute()
        activeRoute.value = response.data.data
        
        if (activeRoute.value) {
          driverName.value = activeRoute.value.driver?.name || 'Conductor'
        }
      } catch (error) {
        console.error('Error obteniendo ruta activa:', error)
        if (connectionStatus.value === 'online') {
          // Solo mostrar error si estamos online
          alert('Error al obtener la ruta activa')
        }
      }
    }
    
    const startRoute = async () => {
      try {
        await api.routes.startRoute(activeRoute.value._id)
        await checkForActiveRoute()
        alert('¡Ruta iniciada! Puedes comenzar con las entregas.')
      } catch (error) {
        console.error('Error iniciando ruta:', error)
        alert('Error al iniciar la ruta')
      }
    }
    
    const isCurrentDelivery = (orderItem) => {
      if (!activeRoute.value || activeRoute.value.status !== 'in_progress') return false
      
      // El pedido actual es el primero con estado pending o in_progress
      const pendingOrders = sortedOrders.value.filter(o => 
        o.deliveryStatus === 'pending' || o.deliveryStatus === 'in_progress'
      )
      
      return pendingOrders.length > 0 && pendingOrders[0].order._id === orderItem.order._id
    }
    
    const selectOrder = (orderItem) => {
      if (orderItem.deliveryStatus === 'delivered') return
      selectedOrder.value = orderItem
    }
    
    const markInProgress = async (orderItem) => {
      try {
        if (connectionStatus.value === 'online') {
          await api.routes.updateOrderStatus(
            activeRoute.value._id, 
            orderItem.order._id, 
            'in_progress'
          )
          await checkForActiveRoute()
        } else {
          // Guardar para sincronización offline
          addOfflineUpdate(orderItem.order._id, 'status_update', {
            status: 'in_progress'
          })
          // Actualizar localmente
          orderItem.deliveryStatus = 'in_progress'
        }
      } catch (error) {
        console.error('Error actualizando estado:', error)
        alert('Error al actualizar el estado')
      }
    }
    
    const openDeliveryProof = (orderItem) => {
      selectedOrder.value = orderItem
      showDeliveryProof.value = true
      resetDeliveryForm()
    }
    
    const closeDeliveryProof = () => {
      showDeliveryProof.value = false
      selectedOrder.value = null
      resetDeliveryForm()
    }
    
    const resetDeliveryForm = () => {
      deliveryForm.value = {
        recipientName: '',
        comments: ''
      }
      deliveryPhoto.value = null
      signatureData.value = null
      if (signatureCanvas.value) {
        const ctx = signatureCanvas.value.getContext('2d')
        ctx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
      }
    }
    
    const handlePhotoCapture = (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          deliveryPhoto.value = e.target.result
        }
        reader.readAsDataURL(file)
      }
    }
    
    const retakePhoto = () => {
      deliveryPhoto.value = null
      document.querySelector('input[type="file"]').click()
    }
    
    const confirmDelivery = async () => {
      if (!isDeliveryFormValid.value) return
      
      isSubmitting.value = true
      
      try {
        const deliveryProof = {
          photo: deliveryPhoto.value, // Base64 image
          signature: signatureData.value,
          recipientName: deliveryForm.value.recipientName,
          comments: deliveryForm.value.comments
        }
        
        if (connectionStatus.value === 'online') {
          await api.routes.updateOrderStatus(
            activeRoute.value._id,
            selectedOrder.value.order._id,
            'delivered',
            deliveryProof
          )
          await checkForActiveRoute()
        } else {
          // Guardar para sincronización offline
          addOfflineUpdate(selectedOrder.value.order._id, 'status_update', {
            status: 'delivered',
            deliveryProof
          })
          // Actualizar localmente
          selectedOrder.value.deliveryStatus = 'delivered'
          selectedOrder.value.deliveryProof = deliveryProof
        }
        
        closeDeliveryProof()
        alert('¡Entrega confirmada correctamente!')
        
      } catch (error) {
        console.error('Error confirmando entrega:', error)
        alert('Error al confirmar la entrega')
      } finally {
        isSubmitting.value = false
      }
    }
    
    const markAsFailed = async (orderItem) => {
      const reason = prompt('Motivo de la falla en la entrega:')
      if (!reason) return
      
      try {
        const failureData = {
          comments: reason,
          timestamp: new Date()
        }
        
        if (connectionStatus.value === 'online') {
          await api.routes.updateOrderStatus(
            activeRoute.value._id,
            orderItem.order._id,
            'failed',
            failureData
          )
          await checkForActiveRoute()
        } else {
          addOfflineUpdate(orderItem.order._id, 'status_update', {
            status: 'failed',
            deliveryProof: failureData
          })
          orderItem.deliveryStatus = 'failed'
          orderItem.deliveryProof = failureData
        }
      } catch (error) {
        console.error('Error marcando como fallida:', error)
        alert('Error al marcar como fallida')
      }
    }
    
    // Signature handling
    const initSignaturePad = () => {
      nextTick(() => {
        if (signatureCanvas.value) {
          const canvas = signatureCanvas.value
          canvas.width = canvas.offsetWidth
          canvas.height = 150
          
          const ctx = canvas.getContext('2d')
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
        }
      })
    }
    
    const startSigning = (e) => {
      isDrawing.value = true
      const rect = signatureCanvas.value.getBoundingClientRect()
      const x = (e.clientX || e.touches[0].clientX) - rect.left
      const y = (e.clientY || e.touches[0].clientY) - rect.top
      
      const ctx = signatureCanvas.value.getContext('2d')
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    
    const continueSigning = (e) => {
      if (!isDrawing.value) return
      e.preventDefault()
      
      const rect = signatureCanvas.value.getBoundingClientRect()
      const x = (e.clientX || e.touches[0].clientX) - rect.left
      const y = (e.clientY || e.touches[0].clientY) - rect.top
      
      const ctx = signatureCanvas.value.getContext('2d')
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    
    const stopSigning = () => {
      if (isDrawing.value) {
        isDrawing.value = false
        signatureData.value = signatureCanvas.value.toDataURL()
      }
    }
    
    const clearSignature = () => {
      const ctx = signatureCanvas.value.getContext('2d')
      ctx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
      signatureData.value = null
    }
    
    // Offline handling
    const addOfflineUpdate = (orderId, action, data) => {
      offlineUpdates.value.push({
        orderId,
        action,
        data,
        timestamp: new Date()
      })
      localStorage.setItem('envigo_offline_updates', JSON.stringify(offlineUpdates.value))
    }
    
    const loadOfflineUpdates = () => {
      const stored = localStorage.getItem('envigo_offline_updates')
      if (stored) {
        offlineUpdates.value = JSON.parse(stored)
      }
    }
    
    const syncOfflineData = async () => {
      if (!hasOfflineData.value || !activeRoute.value) return
      
      isSyncing.value = true
      
      try {
        await api.routes.syncOfflineUpdates(activeRoute.value._id, offlineUpdates.value)
        
        // Limpiar datos offline después de sincronización exitosa
        offlineUpdates.value = []
        localStorage.removeItem('envigo_offline_updates')
        
        // Actualizar ruta activa
        await checkForActiveRoute()
        
        alert('Datos sincronizados correctamente')
      } catch (error) {
        console.error('Error sincronizando datos offline:', error)
        alert('Error al sincronizar datos offline')
      } finally {
        isSyncing.value = false
      }
    }
    
    // Connection monitoring
    const updateConnectionStatus = () => {
      connectionStatus.value = navigator.onLine ? 'online' : 'offline'
    }
    
    // Utility functions
    const getStatusText = (status) => {
      const statusMap = {
        'assigned': 'Asignada',
        'in_progress': 'En progreso',
        'completed': 'Completada',
        'cancelled': 'Cancelada'
      }
      return statusMap[status] || status
    }
    
    const getDeliveryStatusText = (status) => {
      const statusMap = {
        'pending': 'Pendiente',
        'in_progress': 'En camino',
        'delivered': 'Entregado',
        'failed': 'Fallido',
        'cancelled': 'Cancelado'
      }
      return statusMap[status] || status
    }
    
    const getProductsSummary = (products) => {
      if (!products || products.length === 0) return 'Sin productos'
      return products.map(p => `${p.quantity}x ${p.name}`).join(', ')
    }
    
    const formatTime = (dateString) => {
      return new Date(dateString).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const logout = () => {
      localStorage.removeItem('token')
      router.push('/login')
    }
    
    // Lifecycle
    onMounted(() => {
      checkForActiveRoute()
      loadOfflineUpdates()
      updateConnectionStatus()
      
      // Listen for connection changes
      window.addEventListener('online', updateConnectionStatus)
      window.addEventListener('offline', updateConnectionStatus)
      
      // Periodic check for active route
      setInterval(checkForActiveRoute, 30000) // Check every 30 seconds
    })
    
    onUnmounted(() => {
      window.removeEventListener('online', updateConnectionStatus)
      window.removeEventListener('offline', updateConnectionStatus)
    })
    
    return {
      // State
      activeRoute,
      connectionStatus,
      driverName,
      showRouteMap,
      showDeliveryProof,
      showSettings,
      selectedOrder,
      isSyncing,
      isSubmitting,
      
      // Settings
      offlineMode,
      notificationsEnabled,
      
      // Delivery form
      deliveryForm,
      deliveryPhoto,
      signatureData,
      signatureCanvas,
      
      // Computed
      routeProgress,
      completedOrders,
      totalOrders,
      sortedOrders,
      hasOfflineData,
      isDeliveryFormValid,
      
      // Methods
      checkForActiveRoute,
      startRoute,
      isCurrentDelivery,
      selectOrder,
      markInProgress,
      openDeliveryProof,
      closeDeliveryProof,
      handlePhotoCapture,
      retakePhoto,
      confirmDelivery,
      markAsFailed,
      initSignaturePad,
      startSigning,
      continueSigning,
      stopSigning,
      clearSignature,
      syncOfflineData,
      getStatusText,
      getDeliveryStatusText,
      getProductsSummary,
      formatTime,
      logout
    }
  }
}
</script>