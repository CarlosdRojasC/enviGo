
<template>
  <div class="recent-activity">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <div class="header-actions" v-if="showViewAll">
        <router-link :to="viewAllRoute" class="view-all-link">
          Ver todo →
        </router-link>
      </div>
    </div>

    <div class="activity-content">
      <div v-if="loading" class="activity-loading">
        <div class="loading-skeleton" v-for="i in 3" :key="i">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-subtitle"></div>
          </div>
        </div>
      </div>

      <div v-else-if="!items || items.length === 0" class="activity-empty">
        <div class="empty-icon">{{ emptyIcon }}</div>
        <p>{{ emptyMessage }}</p>
      </div>

      <div v-else class="activity-list">
        <div 
          v-for="item in displayItems" 
          :key="item.id"
          class="activity-item"
          @click="handleItemClick(item)"
        >
          <div class="activity-icon" :class="getIconClass(item.type)">
            {{ getIcon(item.type) }}
          </div>
          <div class="activity-content">
            <div class="activity-title">{{ item.title }}</div>
            <div class="activity-description">{{ item.description }}</div>
            <div class="activity-meta">
              <span class="activity-time">{{ formatTime(item.timestamp) }}</span>
              <span class="activity-status" :class="item.status" v-if="item.status">
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>
          <div class="activity-actions" v-if="item.actions">
            <button 
              v-for="action in item.actions" 
              :key="action.id"
              @click.stop="handleAction(action, item)"
              class="action-btn"
              :class="action.type"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Actividad Reciente'
  },
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  maxItems: {
    type: Number,
    default: 5
  },
  showViewAll: {
    type: Boolean,
    default: true
  },
  viewAllRoute: {
    type: String,
    default: '/orders'
  },
  emptyIcon: {
    type: String,
    default: '📋'
  },
  emptyMessage: {
    type: String,
    default: 'No hay actividad reciente'
  },
  type: {
    type: String,
    default: 'orders',
    validator: (value) => ['orders', 'general', 'sync', 'users'].includes(value)
  }
})

const emit = defineEmits(['item-click', 'action-click'])

const displayItems = computed(() => {
  if (!props.items) return []
  return props.items.slice(0, props.maxItems)
})

const getIcon = (type) => {
  const icons = {
    new_order: '📦',
    status_change: '🔄',
    delivery: '🚚',
    payment: '💳',
    sync: '🔄',
    user_login: '👤',
    error: '⚠️',
    success: '✅',
    default: '📋'
  }
  return icons[type] || icons.default
}

const getIconClass = (type) => {
  const classes = {
    new_order: 'icon-blue',
    status_change: 'icon-orange',
    delivery: 'icon-green',
    payment: 'icon-purple',
    sync: 'icon-blue',
    user_login: 'icon-gray',
    error: 'icon-red',
    success: 'icon-green'
  }
  return classes[type] || 'icon-gray'
}

const getStatusText = (status) => {
  const statusTexts = {
    pending: 'Pendiente',
    completed: 'Completado',
    failed: 'Fallido',
    processing: 'Procesando'
  }
  return statusTexts[status] || status
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // Menos de 1 minuto
  if (diff < 60000) {
    return 'Hace un momento'
  }
  
  // Menos de 1 hora
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `Hace ${minutes} min`
  }
  
  // Menos de 24 horas
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `Hace ${hours}h`
  }
  
  // Menos de 7 días
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `Hace ${days} día${days > 1 ? 's' : ''}`
  }
  
  // Más de 7 días
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  })
}

const handleItemClick = (item) => {
  emit('item-click', item)
}

const handleAction = (action, item) => {
  emit('action-click', { action, item })
}
</script>

<style scoped>
.recent-activity {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  height: fit-content;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.view-all-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.view-all-link:hover {
  color: #2563eb;
}

.activity-loading {
  space-y: 16px;
}

.loading-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-title {
  width: 60%;
}

.skeleton-subtitle {
  width: 40%;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.activity-empty {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.activity-list {
  space-y: 0;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.activity-item:hover {
  background: #f9fafb;
}

.activity-item:last-child {
  margin-bottom: 0;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.icon-blue {
  background: #dbeafe;
  color: #1e40af;
}

.icon-green {
  background: #d1fae5;
  color: #065f46;
}

.icon-orange {
  background: #fed7aa;
  color: #9a3412;
}

.icon-purple {
  background: #e9d5ff;
  color: #6b21a8;
}

.icon-red {
  background: #fee2e2;
  color: #991b1b;
}

.icon-gray {
  background: #f3f4f6;
  color: #374151;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
  line-height: 1.3;
}

.activity-description {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
  line-height: 1.3;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-time {
  font-size: 12px;
  color: #9ca3af;
}

.activity-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 10px;
}

.activity-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.activity-status.completed {
  background: #d1fae5;
  color: #065f46;
}

.activity-status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.activity-status.processing {
  background: #dbeafe;
  color: #1e40af;
}

.activity-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  font-size: 11px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
}

.action-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-btn.secondary:hover {
  background: #e5e7eb;
}

.action-btn.danger {
  background: #ef4444;
  color: white;
}

.action-btn.danger:hover {
  background: #dc2626;
}

/* Responsive */
@media (max-width: 768px) {
  .recent-activity {
    padding: 20px;
  }
  
  .activity-item {
    gap: 10px;
    padding: 10px;
  }
  
  .activity-icon {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
  
  .activity-title {
    font-size: 13px;
  }
  
  .activity-description {
    font-size: 12px;
  }
  
  .activity-actions {
    flex-direction: column;
    gap: 4px;
  }
}
</style>