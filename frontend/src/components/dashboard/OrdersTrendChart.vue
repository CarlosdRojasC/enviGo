<template>
  <div class="trend-chart-container">
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

// Importación más básica de Chart.js
import Chart from 'chart.js/auto'

const props = defineProps({
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
  }
})

const chartCanvas = ref(null)
const chartInstance = ref(null)

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
    console.log('⚠️ Canvas no disponible')
    return
  }
  
  if (!hasData.value) {
    console.log('⚠️ No hay datos')
    return
  }
  
  console.log('📊 Creando gráfico básico')
  
  // Destruir gráfico existente
  if (chartInstance.value) {
    try {
      chartInstance.value.destroy()
    } catch (error) {
      console.warn('⚠️ Error destruyendo gráfico:', error)
    }
    chartInstance.value = null
  }
  
  const ctx = chartCanvas.value.getContext('2d')
  
  if (!ctx) {
    console.error('❌ No se pudo obtener contexto')
    return
  }
  
  const labels = processedData.value.map((item, index) => {
    // Etiquetas simples
    if (processedData.value.length <= 7) {
      return item.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
    } else if (processedData.value.length <= 31) {
      return item.date.getDate().toString()
    } else {
      return item.date.toLocaleDateString('es-ES', { month: 'short' })
    }
  })
  
  const data = processedData.value.map(item => item.count)
  
  console.log('📊 Labels:', labels.length)
  console.log('📊 Data points:', data.length)
  
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
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            cornerRadius: 6,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(107, 114, 128, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#6b7280',
              maxTicksLimit: 10
            },
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        animation: {
          duration: 600
        }
      }
    })
    
    console.log('✅ Gráfico básico creado')
  } catch (error) {
    console.error('❌ Error creando gráfico:', error)
    
    // Limpiar en caso de error
    if (chartInstance.value) {
      try {
        chartInstance.value.destroy()
      } catch (destroyError) {
        console.warn('⚠️ Error limpiando:', destroyError)
      }
      chartInstance.value = null
    }
  }
}

function getTrendIcon(direction) {
  switch(direction) {
    case 'up': return '↗️'
    case 'down': return '↘️'
    case 'neutral': return '➡️'
    default: return '➡️'
  }
}

// Watchers simplificados
watch(() => props.data, async (newData) => {
  console.log('📊 Datos cambiaron, recreando gráfico')
  
  if (chartInstance.value) {
    chartInstance.value.destroy()
    chartInstance.value = null
  }
  
  if (hasData.value) {
    await nextTick()
    setTimeout(createChart, 100) // Pequeño delay para asegurar que el DOM esté listo
  }
}, { deep: true })

watch(() => props.loading, (isLoading) => {
  if (isLoading && chartInstance.value) {
    console.log('📊 Iniciando carga, destruyendo gráfico')
    chartInstance.value.destroy()
    chartInstance.value = null
  }
})

// Lifecycle
onMounted(() => {
  console.log('📊 Componente montado')
  if (hasData.value && !props.loading) {
    nextTick(() => createChart())
  }
})

onUnmounted(() => {
  if (chartInstance.value) {
    try {
      chartInstance.value.destroy()
    } catch (error) {
      console.warn('⚠️ Error en cleanup:', error)
    }
  }
})
</script>

<style scoped>
.trend-chart-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
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