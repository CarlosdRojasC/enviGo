<template>
  <div class="trend-chart-container">
    <div class="chart-header" v-if="showHeader">
      <div class="chart-title-section">
        <h3 class="chart-title">{{ title }}</h3>
        <p class="chart-subtitle" v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="chart-controls" v-if="showControls">
        <select v-model="selectedPeriod" @change="handlePeriodChange" class="period-selector">
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
          <option value="90d">3 meses</option>
        </select>
      </div>
    </div>
    
    <div class="chart-content">
      <div v-if="loading" class="chart-loading">
        <div class="loading-spinner"></div>
        <p>Cargando datos del gráfico...</p>
      </div>
      
      <div v-else-if="!hasData" class="chart-empty">
        <div class="empty-icon">📊</div>
        <h4>No hay datos disponibles</h4>
        <p>No se encontraron pedidos para el período seleccionado</p>
      </div>
      
      <div v-else class="chart-wrapper">
        <canvas 
          ref="chartCanvas" 
          :style="{ height: height + 'px' }"
        ></canvas>
      </div>
    </div>
    
    <!-- Resumen de estadísticas -->
    <div class="chart-summary" v-if="hasData && chartStats">
      <div class="summary-item">
        <span class="summary-label">Total</span>
        <span class="summary-value">{{ chartStats.total }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Promedio</span>
        <span class="summary-value">{{ chartStats.average }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Tendencia</span>
        <span class="summary-value" :class="chartStats.trend.direction">
          {{ getTrendIcon(chartStats.trend.direction) }} {{ chartStats.trend.percentage }}%
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Máximo</span>
        <span class="summary-value">{{ chartStats.max }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

// Importación más simple de Chart.js
import Chart from 'chart.js/auto'

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
  height: {
    type: Number,
    default: 300
  },
  showControls: {
    type: Boolean,
    default: true
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  initialPeriod: {
    type: String,
    default: '30d'
  }
})

const emit = defineEmits(['period-change'])

const chartCanvas = ref(null)
const chartInstance = ref(null)
const selectedPeriod = ref(props.initialPeriod)

const hasData = computed(() => {
  return props.data && props.data.length > 0
})

const processedData = computed(() => {
  if (!hasData.value) return []
  
  console.log('📊 Procesando datos para el gráfico:', props.data)
  
  // Procesar datos para Chart.js
  return props.data.map(item => {
    // Manejar diferentes formatos de datos
    let date, count
    
    if (item._id) {
      // Formato de agregación de MongoDB
      if (item._id.year && item._id.month && item._id.day) {
        date = new Date(item._id.year, item._id.month - 1, item._id.day)
      } else if (item._id.year && item._id.month) {
        date = new Date(item._id.year, item._id.month - 1, 1)
      } else {
        date = new Date()
      }
      count = item.count || 0
    } else {
      // Formato simple
      date = new Date(item.date || item.order_date)
      count = item.orders || item.count || 0
    }
    
    return {
      date: date,
      dateString: date.toLocaleDateString('es-ES'),
      count: count
    }
  }).sort((a, b) => a.date - b.date)
})

const chartStats = computed(() => {
  if (!hasData.value) return null
  
  const counts = processedData.value.map(item => item.count)
  const total = counts.reduce((sum, count) => sum + count, 0)
  const average = Math.round(total / counts.length)
  const max = Math.max(...counts)
  
  // Calcular tendencia comparando primera y segunda mitad
  const midPoint = Math.floor(counts.length / 2)
  const firstHalf = counts.slice(0, midPoint)
  const secondHalf = counts.slice(midPoint)
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
  
  const trendPercentage = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0
  
  return {
    total,
    average,
    max,
    trend: {
      direction: trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'neutral',
      percentage: Math.abs(trendPercentage)
    }
  }
})

function createChart() {
  if (!chartCanvas.value) {
    console.log('⚠️ Canvas no disponible para crear gráfico')
    return
  }
  
  if (!hasData.value) {
    console.log('⚠️ No hay datos para crear gráfico')
    return
  }
  
  console.log('📊 Creando gráfico con datos procesados:', processedData.value)
  
  // Destruir gráfico existente de forma segura
  if (chartInstance.value) {
    try {
      chartInstance.value.destroy()
    } catch (error) {
      console.warn('⚠️ Error destruyendo gráfico anterior:', error)
    }
    chartInstance.value = null
  }
  
  const ctx = chartCanvas.value.getContext('2d')
  
  if (!ctx) {
    console.error('❌ No se pudo obtener contexto del canvas')
    return
  }
  
  const labels = processedData.value.map(item => {
    // Formatear etiquetas según el período
    if (selectedPeriod.value === '7d') {
      return item.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
    } else if (selectedPeriod.value === '30d') {
      return item.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    } else {
      return item.date.toLocaleDateString('es-ES', { month: 'short' })
    }
  })
  
  const data = processedData.value.map(item => item.count)
  
  console.log('📊 Labels:', labels)
  console.log('📊 Data:', data)
  
  if (labels.length === 0 || data.length === 0) {
    console.warn('⚠️ Labels o datos están vacíos')
    return
  }
  
  try {
    chartInstance.value = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Pedidos',
          data: data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#1d4ed8',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#3b82f6',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex
                return processedData.value[index]?.dateString || ''
              },
              label: function(context) {
                return `${context.parsed.y} pedidos`
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#6b7280',
              font: {
                size: 12
              },
              callback: function(value) {
                return Math.floor(value)
              }
            },
            grid: {
              color: 'rgba(107, 114, 128, 0.1)',
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: '#6b7280',
              font: {
                size: 12
              },
              maxTicksLimit: 8
            },
            grid: {
              display: false
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 8
          }
        },
        animation: {
          duration: 800,
          easing: 'easeInOutQuart'
        }
      }
    })
    
    console.log('✅ Gráfico creado exitosamente')
  } catch (error) {
    console.error('❌ Error creando gráfico:', error)
    
    // Intentar limpiar en caso de error
    if (chartInstance.value) {
      try {
        chartInstance.value.destroy()
      } catch (destroyError) {
        console.warn('⚠️ Error limpiando gráfico después de fallo:', destroyError)
      }
      chartInstance.value = null
    }
  }
}

function handlePeriodChange() {
  emit('period-change', selectedPeriod.value)
}

function getTrendIcon(direction) {
  switch(direction) {
    case 'up': return '↗️'
    case 'down': return '↘️'
    case 'neutral': return '➡️'
    default: return '➡️'
  }
}

// Watchers
watch(() => props.data, async (newData, oldData) => {
  console.log('📊 Datos del gráfico cambiaron:', { 
    nuevos: newData?.length || 0, 
    anteriores: oldData?.length || 0 
  })
  
  // Destruir gráfico anterior antes de crear uno nuevo
  if (chartInstance.value) {
    chartInstance.value.destroy()
    chartInstance.value = null
  }
  
  if (hasData.value) {
    await nextTick()
    createChart()
  }
}, { deep: true })

watch(() => props.loading, (newLoading, oldLoading) => {
  console.log('📊 Estado de carga cambió:', { nuevo: newLoading, anterior: oldLoading })
  
  if (newLoading) {
    // Si está cargando, destruir gráfico actual
    if (chartInstance.value) {
      chartInstance.value.destroy()
      chartInstance.value = null
    }
  } else if (hasData.value) {
    // Si terminó de cargar y hay datos, crear gráfico
    nextTick(() => createChart())
  }
})

watch(() => props.initialPeriod, (newPeriod) => {
  console.log('📊 Período inicial cambió:', newPeriod)
  selectedPeriod.value = newPeriod
})

// Lifecycle
onMounted(() => {
  console.log('📊 Componente montado con datos:', props.data)
  if (hasData.value) {
    nextTick(() => createChart())
  }
})

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }
})
</script>

<style scoped>
.trend-chart-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 0 24px;
  margin-bottom: 20px;
}

.chart-title-section {
  flex: 1;
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

.chart-controls {
  flex-shrink: 0;
}

.period-selector {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.period-selector:hover {
  border-color: #3b82f6;
}

.period-selector:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.chart-content {
  padding: 0 24px;
  position: relative;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6b7280;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.chart-empty h4 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.chart-empty p {
  font-size: 14px;
  margin: 0;
}

.chart-wrapper {
  position: relative;
  width: 100%;
}

.chart-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 500;
}

.summary-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.summary-value.up {
  color: #10b981;
}

.summary-value.down {
  color: #ef4444;
}

.summary-value.neutral {
  color: #6b7280;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .chart-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 20px;
  }
  
  .chart-content {
    padding: 0 16px;
  }
}

@media (max-width: 480px) {
  .chart-summary {
    grid-template-columns: 1fr;
  }
  
  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .summary-item:last-child {
    border-bottom: none;
  }
  
  .summary-label,
  .summary-value {
    display: inline;
    margin: 0;
  }
  
  .summary-value {
    font-size: 16px;
  }
}
</style>