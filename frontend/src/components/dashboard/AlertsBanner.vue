<template>
  <div class="alerts-banner">
    <transition-group name="alert" tag="div" class="alerts-list">
      <div 
        v-for="alert in alerts" 
        :key="alert.id"
        class="alert-item"
        :class="alert.type"
      >
        <div class="alert-icon">
          {{ getAlertIcon(alert.type) }}
        </div>
        <div class="alert-content">
          <div class="alert-title">{{ alert.title }}</div>
          <div class="alert-message">{{ alert.message }}</div>
        </div>
        <div class="alert-actions">
          <router-link 
            v-if="alert.action"
            :to="alert.action.route"
            class="alert-action-btn"
          >
            {{ alert.action.text }}
          </router-link>
          <button 
            @click="$emit('dismiss', alert.id)"
            class="alert-dismiss"
            :title="'Cerrar alerta'"
          >
            ✕
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
const props = defineProps({
  alerts: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['dismiss'])

function getAlertIcon(type) {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  }
  return icons[type] || 'ℹ️'
}
</script>

<style scoped>
.alerts-banner {
  margin-bottom: 24px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #e5e7eb;
}

.alert-item.info {
  border-left-color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%);
}

.alert-item.warning {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%);
}

.alert-item.error {
  border-left-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%);
}

.alert-item.success {
  border-left-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%);
}

.alert-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.alert-message {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.alert-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.alert-action-btn {
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.alert-action-btn:hover {
  background: #2563eb;
}

.alert-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.alert-dismiss:hover {
  background: #e5e7eb;
  color: #374151;
}

/* Animaciones */
.alert-enter-active,
.alert-leave-active {
  transition: all 0.3s ease;
}

.alert-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.alert-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.alert-move {
  transition: transform 0.3s ease;
}

/* Responsive */
@media (max-width: 768px) {
  .alert-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .alert-actions {
    justify-content: space-between;
  }
}
</style>