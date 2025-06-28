<template>
  <div class="kpi-card" :class="variant">
    <div class="kpi-header">
      <div class="kpi-info">
        <h3 class="kpi-title">{{ title }}</h3>
        <div class="kpi-value">{{ formattedValue }}</div>
      </div>
      <div class="kpi-icon" v-if="icon">
        {{ icon }}
      </div>
    </div>
    
    <div class="kpi-footer" v-if="trend || subtitle">
      <div class="kpi-trend" :class="trendClass" v-if="trend">
        <span class="trend-icon">{{ trendIcon }}</span>
        <span class="trend-text">{{ Math.abs(trend.percentage) }}%</span>
        <span class="trend-label">{{ trend.label || 'vs anterior' }}</span>
      </div>
      <div class="kpi-subtitle" v-else-if="subtitle">
        {{ subtitle }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'revenue', 'orders', 'users', 'success', 'warning'].includes(value)
  },
  trend: {
    type: Object,
    default: null
    // Ejemplo: { direction: 'up'|'down', percentage: 15, label: 'vs ayer' }
  },
  subtitle: {
    type: String,
    default: ''
  },
  format: {
    type: String,
    default: 'number',
    validator: (value) => ['number', 'currency', 'percentage'].includes(value)
  }
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  if (props.value === null || props.value === undefined) return '0'
  
  switch (props.format) {
    case 'currency':
      return `$${formatCurrency(props.value)}`
    case 'percentage':
      return `${props.value}%`
    default:
      return formatCurrency(props.value)
  }
})

const trendClass = computed(() => {
  if (!props.trend) return ''
  return props.trend.direction === 'up' ? 'trend-up' : 'trend-down'
})

const trendIcon = computed(() => {
  if (!props.trend) return ''
  return props.trend.direction === 'up' ? '↗️' : '↘️'
})

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}
</script>

<style scoped>
.kpi-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  border-left: 4px solid #e5e7eb;
  transition: all 0.2s ease;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.kpi-card.revenue { border-left-color: #10b981; }
.kpi-card.orders { border-left-color: #3b82f6; }
.kpi-card.users { border-left-color: #8b5cf6; }
.kpi-card.success { border-left-color: #f59e0b; }
.kpi-card.warning { border-left-color: #ef4444; }

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.kpi-title {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.2;
}

.kpi-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  word-break: break-all;
}

.kpi-icon {
  font-size: 28px;
  opacity: 0.8;
  flex-shrink: 0;
}

.kpi-footer {
  margin-top: 12px;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.kpi-trend.trend-up {
  color: #10b981;
}

.kpi-trend.trend-down {
  color: #ef4444;
}

.trend-label {
  color: #6b7280;
  font-weight: 400;
}

.kpi-subtitle {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
}

/* Responsive */
@media (max-width: 768px) {
  .kpi-card {
    padding: 20px;
  }
  
  .kpi-value {
    font-size: 28px;
  }
  
  .kpi-icon {
    font-size: 24px;
  }
}
</style>