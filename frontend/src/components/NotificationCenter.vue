<!-- frontend/src/components/NotificationCenter.vue -->
<template>
  <div class="notification-center">
    <!-- Indicador de conexión -->
    <div class="connection-status" :class="{ connected: wsState.connected }">
      <div class="status-indicator">
        <span v-if="wsState.connected" class="status-dot connected"></span>
        <span v-else class="status-dot disconnected"></span>
        <span class="status-text">
          {{ wsState.connected ? 'En línea' : 'Desconectado' }}
        </span>
      </div>
      <div v-if="wsState.connected" class="connection-info">
        {{ wsState.stats.messagesReceived }} mensajes recibidos
      </div>
    </div>

    <!-- Lista de notificaciones -->
    <div class="notifications-list">
      <transition-group name="notification" tag="div">
        <div
          v-for="notification in visibleNotifications"
          :key="notification.id"
          class="notification-item"
          :class="[notification.type, { 'is-new': notification.isNew }]"
          @click="markAsRead(notification.id)"
        >
          <div class="notification-icon">
            {{ notification.icon || getDefaultIcon(notification.type) }}
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
          </div>
          <div class="notification-actions">
            <button @click.stop="removeNotification(notification.id)" class="remove-btn">
              ×
            </button>
          </div>
        </div>
      </transition-group>
      
      <div v-if="notifications.length === 0" class="empty-state">
        <div class="empty-icon">🔔</div>
        <p>No hay notificaciones</p>
      </div>
    </div>

    <!-- Controles -->
    <div class="notification-controls">
      <button @click="clearAll" class="clear-btn" :disabled="notifications.length === 0">
        🗑️ Limpiar Todo
      </button>
      <button @click="toggleConnection" class="connect-btn" :class="{ connected: wsState.connected }">
        {{ wsState.connected ? '🔌 Desconectar' : '🔌 Conectar' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWebSocket } from '../services/websocket.service'
import { useAuthStore } from '../store/auth'

// Setup
const { wsManager, state: wsState } = useWebSocket()
const authStore = useAuthStore()

// Estado local
const notifications = ref([])
const maxNotifications = 10
let notificationId = 0

// Computed
const visibleNotifications = computed(() => {
  return notifications.value.slice(0, maxNotifications)
})

// Métodos
function addNotification(notification) {
  const newNotification = {
    id: ++notificationId,
    timestamp: new Date(),
    isNew: true,
    ...notification
  }
  
  notifications.value.unshift(newNotification)
  
  // Marcar como leída después de un momento
  setTimeout(() => {
    newNotification.isNew = false
  }, 3000)
  
  // Limitar número de notificaciones
  if (notifications.value.length > maxNotifications * 2) {
    notifications.value = notifications.value.slice(0, maxNotifications)
  }
}

function markAsRead(id) {
  const notification = notifications.value.find(n => n.id === id)
  if (notification) {
    notification.isNew = false
  }
}

function removeNotification(id) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

function clearAll() {
  notifications.value = []
}

function toggleConnection() {
  if (wsState.connected) {
    wsManager.disconnect()
  } else {
    wsManager.connect()
  }
}

function getDefaultIcon(type) {
  const icons = {
    'success': '✅',
    'info': 'ℹ️',
    'warning': '⚠️',
    'error': '❌',
    'order-update': '📦'
  }
  return icons[type] || '🔔'
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Event listeners
onMounted(() => {
  // Escuchar notificaciones de órdenes
  wsManager.on('order_notification', (notification) => {
    addNotification({
      title: notification.title,
      message: notification.message,
      type: 'order-update',
      icon: notification.icon,
      data: notification.data
    })
  })

  // Escuchar nuevas órdenes (solo admins)
  wsManager.on('new_order_notification', (notification) => {
    if (authStore.isAdmin) {
      addNotification({
        title: notification.title,
        message: notification.message,
        type: 'success',
        icon: notification.icon,
        data: notification.data
      })
    }
  })

  // Notificaciones de conexión
  wsManager.on('connected', () => {
    addNotification({
      title: 'Sistema Conectado',
      message: 'Conectado al sistema de notificaciones en tiempo real',
      type: 'success',
      icon: '🔗'
    })
  })

  wsManager.on('disconnected', () => {
    addNotification({
      title: 'Sistema Desconectado',
      message: 'Se perdió la conexión con el sistema de notificaciones',
      type: 'warning',
      icon: '🔌'
    })
  })

  wsManager.on('error', (error) => {
    addNotification({
      title: 'Error de Conexión',
      message: error.message || 'Error en el sistema de notificaciones',
      type: 'error',
      icon: '❌'
    })
  })

  // Auto-conectar si está autenticado
  if (authStore.isLoggedIn && !wsState.connected) {
    wsManager.connect()
  }
})

onUnmounted(() => {
  // Cleanup si es necesario
  wsManager.off('order_notification')
  wsManager.off('new_order_notification')
  wsManager.off('connected')
  wsManager.off('disconnected')
  wsManager.off('error')
})
</script>

<style scoped>
.notification-center {
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.connection-status {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.connection-status.connected {
  background: #d4edda;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.connected {
  background: #28a745;
  animation: pulse 2s infinite;
}

.status-dot.disconnected {
  background: #dc3545;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.3s ease;
}

.notification-item:hover {
  background: #f8f9fa;
}

.notification-item.is-new {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
}

.notification-item.order-update {
  border-left: 4px solid #007bff;
}

.notification-item.success {
  border-left: 4px solid #28a745;
}

.notification-item.error {
  border-left: 4px solid #dc3545;
}

.notification-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.notification-message {
  color: #6c757d;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.notification-time {
  color: #adb5bd;
  font-size: 12px;
}

.notification-actions {
  flex-shrink: 0;
}

.remove-btn {
  background: none;
  border: none;
  color: #adb5bd;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.remove-btn:hover {
  background: #f8f9fa;
  color: #dc3545;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.notification-controls {
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 8px;
}

.clear-btn, .connect-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.clear-btn:hover:not(:disabled) {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.connect-btn:hover {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.connect-btn.connected:hover {
  background: #dc3545;
  border-color: #dc3545;
}

/* Animaciones */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>