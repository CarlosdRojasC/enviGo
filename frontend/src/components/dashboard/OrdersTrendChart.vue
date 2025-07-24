<template>
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title-section">
        <h3 class="chart-title">{{ title }}</h3>
        <p class="chart-subtitle" v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="chart-controls" v-if="showControls">
        <select v-model="selectedPeriod" @change="handlePeriodChange" class="period-selector">
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
          <option value="90d">3 meses</option>
          <option value="1y">1 año</option>
        </select>
      </div>
    </div>
    
    <div class="chart-content">
      <div v-if="loading" class="chart-loading">
        <div class="loading-spinner"></div>
        <p>Cargando datos...</p>
      </div>
      
      <div v-else-if="!chartData || chartData.length === 0" class="chart-empty">
        <div class="empty-icon">📊</div>
        <p>No hay datos para mostrar</p>
      </div>
      
      <div v-else class="chart-wrapper">
        <!-- Aquí iría un gráfico real como Chart.js o similar -->
        <!-- Por ahora simulo con SVG básico -->
        <svg width="100%" height="300" class="chart-svg">
          <!-- Grid lines -->
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <!-- Chart area -->
          <g class="chart-area">
            <!-- Simulate line chart -->
            <polyline
              :points="linePoints"
              fill="none"
              stroke="#3b82f6"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            
            <!-- Data points -->
            <circle
              v-for="(point, index) in dataPoints"
              :key="index"
              :cx="point.x"
              :cy="point.y"
              r="4"
              fill="#3b82f6"
              stroke="white"
              stroke-width="2"
              class="data-point"
              @mouseover="showTooltip(point, $event)"
              @mouseout="hideTooltip"
            />
          </g>
          
          <!-- X-axis labels -->
          <g class="x-axis">
            <text
              v-for="(point, index) in dataPoints"
              :key="index"
              :x="point.x"
              y="290"
              text-anchor="middle"
              class="axis-label"
            >
              {{ formatDateForAxis(chartData[index]?.date) }}
            </text>
          </g>
        </svg>
        
        <!-- Tooltip -->
        <div 
          v-if="tooltip.show" 
          class="chart-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="tooltip-date">{{ tooltip.date }}</div>
          <div class="tooltip-value">{{ tooltip.value }} pedidos</div>
        </div>
      </div>
    </div>
    
    <!-- Chart Summary -->
    <div class="chart-summary" v-if="summary">
      <div class="summary-item">
        <span class="summary-label">Total:</span>
        <span class="summary-value">{{ summary.total }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Promedio:</span>
        <span class="summary-value">{{ summary.average }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Tendencia:</span>
        <span class="summary-value" :class="summary.trend.direction">
          {{ summary.trend.direction === 'up' ? '↗️' : '↘️' }} 
          {{ summary.trend.percentage }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Tendencia de Pedidos'
  },
  subtitle: {
    type: String,
    default: ''
  },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  showControls: {
    type: Boolean,
    default: true
  },
  initialPeriod: {
    type: String,
    default: '30d'
  }
})

const emit = defineEmits(['period-change'])

const selectedPeriod = ref(props.initialPeriod)
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  date: '',
  value: 0
})

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  // Simular datos si no hay datos reales
  if (props.data.length === 0) {
    const mockData = []
    const days = selectedPeriod.value === '7d' ? 7 : selectedPeriod.value === '30d' ? 30 : 90
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i - 1))
      mockData.push({
        date: date.toISOString(),
        orders: Math.floor(Math.random() * 50) + 10
      })
    }
    return mockData
  }
  
  return props.data
})

const dataPoints = computed(() => {
  if (!chartData.value || chartData.value.length === 0) return []
  
  const width = 800 // SVG width
  const height = 250 // Chart area height
  const padding = 40
  
  const maxValue = Math.max(...chartData.value.map(d => d.orders || 0))
  const minValue = Math.min(...chartData.value.map(d => d.orders || 0))
  const valueRange = maxValue - minValue || 1
  
  return chartData.value.map((item, index) => ({
    x: padding + (index * ((width - 2 * padding) / (chartData.value.length - 1 || 1))),
    y: height - padding - ((item.orders - minValue) / valueRange) * (height - 2 * padding),
    value: item.orders,
    date: item.date
  }))
})

const linePoints = computed(() => {
  if (!dataPoints.value || dataPoints.value.length === 0) return ''
  return dataPoints.value.map(point => `${point.x},${point.y}`).join(' ')
})

const summary = computed(() => {
  if (!chartData.value || chartData.value.length === 0) return null
  
  const values = chartData.value.map(d => d.orders || 0)
  const total = values.reduce((sum, val) => sum + val, 0)
  const average = Math.round(total / values.length)
  
  // Calcular tendencia comparando primera y última mitad
  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
  
  const trendPercentage = Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
  
  return {
    total,
    average,
    trend: {
      direction: trendPercentage >= 0 ? 'up' : 'down',
      percentage: Math.abs(trendPercentage)
    }
  }
})

const handlePeriodChange = () => {
  emit('period-change', selectedPeriod.value)
}

const showTooltip = (point, event) => {
  const rect = event.target.closest('.chart-container').getBoundingClientRect()
  tooltip.value = {
    show: true,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top - 60,
    date: formatDateForTooltip(point.date),
    value: point.value
  }
}

const hideTooltip = () => {
  tooltip.value.show = false
}

const formatDateForAxis = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatDateForTooltip = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric' 
  })
}
</script>

<style scoped>
.chart-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  position: relative;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.chart-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.period-selector {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #374151;
}

.chart-content {
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.chart-wrapper {
  width: 100%;
  position: relative;
}

.chart-svg {
  width: 100%;
  height: 300px;
}

.data-point {
  cursor: pointer;
  transition: all 0.2s ease;
}

.data-point:hover {
  r: 6;
  stroke-width: 3;
}

.axis-label {
  font-size: 12px;
  fill: #6b7280;
}

.chart-tooltip {
  position: absolute;
  background: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip-date {
  font-weight: 500;
  margin-bottom: 2px;
}

.tooltip-value {
  color: #93c5fd;
}

.chart-summary {
  display: flex;
  justify-content: space-around;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  margin-top: 20px;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.summary-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.summary-value.up {
  color: #10b981;
}

.summary-value.down {
  color: #ef4444;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-container {
    padding: 16px;
  }
  
  .chart-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .chart-summary {
    flex-direction: column;
    gap: 12px;
  }
  
  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .summary-label,
  .summary-value {
    display: inline;
  }
}
</style>