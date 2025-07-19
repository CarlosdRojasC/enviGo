<template>
  <div class="chart-container">
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <p>Cargando datos del gráfico...</p>
    </div>
    <div v-else-if="!hasData" class="no-data">
      <div class="no-data-icon">📊</div>
      <h4>Sin datos disponibles</h4>
      <p>No hay información suficiente para mostrar el gráfico</p>
    </div>
    <div v-else class="chart-content">
      <canvas ref="chartCanvas" :height="height"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

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
    type: [Number, String],
    default: 300
  },
  showLegend: {
    type: Boolean,
    default: false
  }
})

// Referencias
const chartCanvas = ref(null)
let chartInstance = null

// Computed
const hasData = computed(() => {
  return props.data && props.data.length > 0
})

// Función para crear el gráfico con canvas nativo (sin dependencias)
function createChart() {
  if (!chartCanvas.value || !hasData.value) return

  const canvas = chartCanvas.value
  const ctx = canvas.getContext('2d')
  const rect = canvas.getBoundingClientRect()
  
  // Ajustar el tamaño del canvas
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = parseInt(props.height) * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  
  // Configurar estilos
  const width = rect.width
  const height = parseInt(props.height)
  const padding = { top: 20, right: 30, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Limpiar canvas
  ctx.clearRect(0, 0, width, height)

  // Preparar datos
  const maxValue = Math.max(...props.data.map(d => d.count || d.value || 0))
  const minValue = Math.min(...props.data.map(d => d.count || d.value || 0))
  const range = maxValue - minValue || 1

  // Función para convertir data a coordenadas
  function dataToCoords(index, value) {
    const x = padding.left + (index / (props.data.length - 1)) * chartWidth
    const y = padding.top + ((maxValue - value) / range) * chartHeight
    return { x, y }
  }

  // Dibujar grid
  ctx.strokeStyle = '#f3f4f6'
  ctx.lineWidth = 1
  
  // Líneas horizontales
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (i / 5) * chartHeight
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + chartWidth, y)
    ctx.stroke()
  }

  // Líneas verticales
  const verticalLines = Math.min(props.data.length, 7)
  for (let i = 0; i < verticalLines; i++) {
    const x = padding.left + (i / (verticalLines - 1)) * chartWidth
    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, padding.top + chartHeight)
    ctx.stroke()
  }

  // Dibujar área bajo la curva
  if (props.data.length > 1) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    
    // Comenzar desde la esquina inferior izquierda
    const firstPoint = dataToCoords(0, props.data[0].count || props.data[0].value || 0)
    ctx.moveTo(firstPoint.x, padding.top + chartHeight)
    ctx.lineTo(firstPoint.x, firstPoint.y)
    
    // Dibujar la curva
    props.data.forEach((item, index) => {
      const coords = dataToCoords(index, item.count || item.value || 0)
      ctx.lineTo(coords.x, coords.y)
    })
    
    // Cerrar el área
    const lastPoint = dataToCoords(props.data.length - 1, props.data[props.data.length - 1].count || props.data[props.data.length - 1].value || 0)
    ctx.lineTo(lastPoint.x, padding.top + chartHeight)
    ctx.closePath()
    ctx.fill()
  }

  // Dibujar la línea principal
  if (props.data.length > 1) {
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    props.data.forEach((item, index) => {
      const coords = dataToCoords(index, item.count || item.value || 0)
      if (index === 0) {
        ctx.moveTo(coords.x, coords.y)
      } else {
        ctx.lineTo(coords.x, coords.y)
      }
    })
    ctx.stroke()
  }

  // Dibujar puntos
  props.data.forEach((item, index) => {
    const coords = dataToCoords(index, item.count || item.value || 0)
    
    // Punto exterior
    ctx.fillStyle = '#3b82f6'
    ctx.beginPath()
    ctx.arc(coords.x, coords.y, 5, 0, Math.PI * 2)
    ctx.fill()
    
    // Punto interior
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(coords.x, coords.y, 2, 0, Math.PI * 2)
    ctx.fill()
  })

  // Dibujar etiquetas del eje Y
  ctx.fillStyle = '#6b7280'
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  
  for (let i = 0; i <= 5; i++) {
    const value = maxValue - (i / 5) * range
    const y = padding.top + (i / 5) * chartHeight
    ctx.fillText(Math.round(value).toString(), padding.left - 10, y)
  }

  // Dibujar etiquetas del eje X
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  
  const labelStep = Math.max(1, Math.floor(props.data.length / 6))
  props.data.forEach((item, index) => {
    if (index % labelStep === 0 || index === props.data.length - 1) {
      const coords = dataToCoords(index, 0)
      const label = formatDateLabel(item.date || item.label || index.toString())
      ctx.fillText(label, coords.x, padding.top + chartHeight + 10)
    }
  })
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  } catch (e) {
    return dateStr.toString()
  }
}

function destroyChart() {
  if (chartInstance) {
    chartInstance = null
  }
}

function handleResize() {
  if (hasData.value) {
    setTimeout(createChart, 100)
  }
}

// Watchers
watch(() => props.data, () => {
  if (hasData.value) {
    setTimeout(createChart, 100)
  }
}, { deep: true })

watch(() => props.loading, (newLoading) => {
  if (!newLoading && hasData.value) {
    setTimeout(createChart, 100)
  }
})

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize)
  if (hasData.value) {
    setTimeout(createChart, 100)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  destroyChart()
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  border-radius: 8px;
}

.chart-loading,
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
  padding: 40px 20px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.no-data-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-data h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.no-data p {
  font-size: 14px;
  margin: 0;
}

.chart-content {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-content canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-container {
    font-size: 12px;
  }
}
</style>