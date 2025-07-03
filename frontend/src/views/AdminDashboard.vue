<template>
  <div class="page-container">
    <div class="dashboard-header">
      <h1 class="page-title">Dashboard del Administrador</h1>
      <div class="header-actions">
        <button @click="refreshData" class="refresh-btn" :disabled="loading">
          🔄 {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="initial-loading">
      <div class="loading-spinner"></div>
      <p>Cargando estadísticas del sistema...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- KPIs Section -->
      <div class="kpis-grid">
        <div class="kpi-card">
          <div class="kpi-icon">🏢</div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats.companies || 0 }}</div>
            <div class="kpi-label">Empresas Activas</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📦</div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats.orders?.total_orders || 0 }}</div>
            <div class="kpi-label">Total Pedidos</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">✅</div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats.orders?.delivered || 0 }}</div>
            <div class="kpi-label">Pedidos Entregados</div>
          </div>
        </div>
        <div class="kpi-card revenue">
          <div class="kpi-icon">💰</div>
          <div class="kpi-content">
            <div class="kpi-value">${{ formatCurrency(stats.monthly_revenue || 0) }}</div>
            <div class="kpi-label">Costos de Envío Totales</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Section -->
      <div class="quick-actions">
        <h2 class="section-title">Acciones Rápidas</h2>
        <div class="actions-grid">
          <router-link to="/admin/companies" class="action-card">
            <div class="action-icon">🏢</div>
            <div class="action-content">
              <div class="action-title">Gestionar Empresas</div>
              <div class="action-description">Ver y administrar empresas</div>
            </div>
          </router-link>
          <router-link to="/admin/orders" class="action-card">
            <div class="action-icon">📦</div>
            <div class="action-content">
              <div class="action-title">Gestionar Pedidos</div>
              <div class="action-description">Ver todos los pedidos</div>
            </div>
          </router-link>
          <router-link to="/admin/billing" class="action-card">
            <div class="action-icon">💳</div>
            <div class="action-content">
              <div class="action-title">Facturación</div>
              <div class="action-description">Gestionar facturas</div>
            </div>
          </router-link>
           <router-link to="/admin/orders" class="action-card">
            <div class="action-icon">📊</div>
            <div class="action-content">
              <div class="action-title">Exportar Pedidos</div>
              <div class="action-description">Descargar para OptiRoute</div>
            </div>
          </router-link>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="charts-grid">
          <!-- Trend Chart -->
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Tendencia de Pedidos</h3>
              <div class="chart-controls">
                <select v-model="trendPeriod" @change="fetchTrendData" class="period-select">
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="90d">Últimos 90 días</option>
                </select>
              </div>
            </div>
            <div class="chart-content">
              <div v-if="loadingTrend" class="chart-loading">
                <div class="loading-spinner-small"></div>
                <span>Cargando tendencia...</span>
              </div>
              <div v-else-if="trendError" class="chart-error">
                <span>❌ Error cargando datos de tendencia</span>
                <button @click="fetchTrendData" class="retry-btn">Reintentar</button>
              </div>
              <canvas v-show="!loadingTrend && !trendError" ref="trendChartCanvas" :key="trendChartKey"></canvas>
            </div>
          </div>

          <!-- Status Chart -->
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Distribución por Estado</h3>
            </div>
            <div class="chart-content">
              <div v-if="hasNoOrderData" class="no-data-message">
                <span>📊 No hay datos de pedidos para mostrar</span>
              </div>
              <canvas v-show="!hasNoOrderData" ref="statusChartCanvas" :key="statusChartKey"></canvas>
            </div>
          </div>
        </div>

        <!-- Revenue Chart -->
        <div class="chart-container full-width">
          <div class="chart-header">
            <h3 class="chart-title">Costos de Envío por Mes (Últimos 6 meses)</h3>
          </div>
          <div class="chart-content">
            <div v-if="loadingRevenue" class="chart-loading">
              <div class="loading-spinner-small"></div>
              <span>Cargando datos de costos...</span>
            </div>
            <div v-else-if="revenueError" class="chart-error">
              <span>❌ Error cargando datos de costos</span>
              <button @click="fetchRevenueData" class="retry-btn">Reintentar</button>
            </div>
            <canvas v-show="!loadingRevenue && !revenueError" ref="revenueChartCanvas" :key="revenueChartKey"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <div v-if="showErrorToast" class="error-toast" @click="showErrorToast = false">
      <span>❌ {{ errorMessage }}</span>
      <button class="close-toast">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from 'vue';
import { apiService } from '../services/api';
import { Chart, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

// Estado básico
const loading = ref(true);
const stats = ref({});
//const isExporting = ref(false);

// Estado para charts
const loadingTrend = ref(true);
const loadingRevenue = ref(true);
const trendPeriod = ref('7d');

// Estados de error
const trendError = ref(false);
const revenueError = ref(false);
const showErrorToast = ref(false);
const errorMessage = ref('');

// Keys para forzar re-render de canvas
const trendChartKey = ref(0);
const statusChartKey = ref(0);
const revenueChartKey = ref(0);

// Referencias para los canvas
const trendChartCanvas = ref(null);
const statusChartCanvas = ref(null);
const revenueChartCanvas = ref(null);

// Instancias de Chart.js
let trendChartInstance = null;
let statusChartInstance = null;
let revenueChartInstance = null;

// Computed para verificar si hay datos de órdenes
const hasNoOrderData = computed(() => {
  if (!stats.value.orders) return true;
  const orders = stats.value.orders;
  const total = (orders.pending || 0) + (orders.processing || 0) + 
                (orders.shipped || 0) + (orders.delivered || 0) + 
                (orders.cancelled || 0);
  return total === 0;
});

// --- FUNCIONES DE UTILIDAD ---
const showError = (message) => {
  errorMessage.value = message;
  showErrorToast.value = true;
  setTimeout(() => {
    showErrorToast.value = false;
  }, 5000);
};

const destroyChart = (chartInstance) => {
  if (chartInstance) {
    chartInstance.destroy();
    return null;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
};

// --- FUNCIONES DE OBTENCIÓN DE DATOS ---

const fetchAllData = async () => {
  loading.value = true;
  try {
    console.log('🔍 FRONTEND: Solicitando stats del dashboard admin...');
    
    // Llamada real a la API
    const response = await apiService.dashboard.getStats();
    stats.value = response.data;
    
    console.log('✅ FRONTEND: Stats recibidas:', stats.value);
    
    // Cargar datos de gráficos en paralelo
    await Promise.all([
      fetchTrendData(),
      fetchRevenueData()
    ]);

    // Crear gráficos después de que el DOM esté listo
    await nextTick();
    setTimeout(() => {
      createAllCharts();
    }, 100);

  } catch (error) {
    console.error("❌ FRONTEND: Error cargando datos del admin dashboard:", error);
    showError('Error cargando las estadísticas del dashboard');
  } finally {
    loading.value = false;
  }
};

const fetchTrendData = async () => {
  loadingTrend.value = true;
  trendError.value = false;
  
  try {
    console.log('🔍 FRONTEND: Solicitando datos de tendencia...', { period: trendPeriod.value });
    
    const response = await apiService.orders.getTrend({ 
      period: trendPeriod.value 
    });
    
    console.log('✅ FRONTEND: Datos de tendencia recibidos:', response.data);
    
    await nextTick();
    setTimeout(() => {
      createOrUpdateTrendChart(response.data);
    }, 100);
    
  } catch (error) {
    console.error('❌ FRONTEND: Error fetching trend data:', error);
    trendError.value = true;
    showError('Error cargando datos de tendencia de pedidos');
  } finally {
    loadingTrend.value = false;
  }
};

const fetchRevenueData = async () => {
  loadingRevenue.value = true;
  revenueError.value = false;
  
  try {
    console.log('🔍 FRONTEND: Solicitando datos de costos mensuales...');
    
    const response = await apiService.billing.getFinancialSummary();
    
    console.log('✅ FRONTEND: Datos de costos mensuales recibidos:', response.data);
    
    await nextTick();
    setTimeout(() => {
      createOrUpdateRevenueChart(response.data);
    }, 100);
    
  } catch (error) {
    console.error('❌ FRONTEND: Error fetching revenue data:', error);
    revenueError.value = true;
    showError('Error cargando datos de costos mensuales');
  } finally {
    loadingRevenue.value = false;
  }
};

// --- FUNCIONES DE CREACIÓN DE GRÁFICOS ---

const createAllCharts = () => {
  createOrUpdateStatusChart();
};

const createOrUpdateTrendChart = (data) => {
  if (!trendChartCanvas.value || !data || data.length === 0) {
    console.warn('❌ No se puede crear gráfico de tendencia: canvas o datos faltantes');
    return;
  }
  
  // Destruir gráfico existente
  trendChartInstance = destroyChart(trendChartInstance);
  
  const ctx = trendChartCanvas.value.getContext('2d');
  
  const chartData = {
    labels: data.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
    datasets: [{
      label: 'Pedidos',
      data: data.map(item => item.count || item.orders || 0),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#3b82f6',
          borderWidth: 1,
          callbacks: {
            title: function(context) {
              return `Fecha: ${context[0].label}`;
            },
            label: function(context) {
              return `Pedidos: ${context.parsed.y}`;
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
            callback: function(value) {
              return Math.floor(value);
            }
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
            color: 'rgba(107, 114, 128, 0.1)'
          }
        }
      }
    }
  });
  
  console.log('✅ Gráfico de tendencia creado exitosamente');
};

const createOrUpdateStatusChart = () => {
  if (!statusChartCanvas.value || hasNoOrderData.value) {
    console.warn('❌ No se puede crear gráfico de estado: canvas faltante o sin datos');
    return;
  }
  
  // Destruir gráfico existente
  statusChartInstance = destroyChart(statusChartInstance);
  
  const ctx = statusChartCanvas.value.getContext('2d');
  const orders = stats.value.orders;

  const dataValues = [
    orders.pending || 0,
    orders.processing || 0,
    orders.shipped || 0,
    orders.delivered || 0,
    orders.cancelled || 0
  ];

  const labels = ['Pendientes', 'Procesando', 'Enviados', 'Entregados', 'Cancelados'];
  const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { 
            padding: 15, 
            usePointStyle: true,
            font: {
              size: 11
            },
            color: '#374151'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: function(context) {
              const total = dataValues.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
  
  console.log('✅ Gráfico de estado creado exitosamente');
};

const createOrUpdateRevenueChart = (data) => {
  if (!revenueChartCanvas.value || !data || data.length === 0) {
    console.warn('❌ No se puede crear gráfico de costos: canvas o datos faltantes');
    return;
  }
  
  // Destruir gráfico existente
  revenueChartInstance = destroyChart(revenueChartInstance);
  
  const ctx = revenueChartCanvas.value.getContext('2d');

  const chartData = {
    labels: data.map(item => item.month_year || item.month),
    datasets: [{
      label: 'Costos de Envío',
      data: data.map(item => item.total_shipping_cost || item.revenue || 0),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };

  revenueChartInstance = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: function(context) {
              return `Costos: $${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => '$' + formatCurrency(value),
            color: '#6b7280'
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#6b7280'
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)'
          }
        }
      }
    }
  });
  
  console.log('✅ Gráfico de costos creado exitosamente');
};

// --- WATCHERS ---

// Watcher para recrear el gráfico de estado cuando cambien los datos
watch(() => stats.value.orders, () => {
  if (!hasNoOrderData.value) {
    nextTick(() => {
      setTimeout(() => {
        statusChartKey.value++;
        nextTick(() => {
          setTimeout(() => {
            createOrUpdateStatusChart();
          }, 100);
        });
      }, 50);
    });
  }
}, { deep: true });

// --- FUNCIONES DE ACCIONES ---

const refreshData = () => {
  console.log('🔄 Refrescando todos los datos...');
  
  // Incrementar keys para forzar re-render de todos los canvas
  trendChartKey.value++;
  statusChartKey.value++;
  revenueChartKey.value++;
  
  // Destruir gráficos existentes
  trendChartInstance = destroyChart(trendChartInstance);
  statusChartInstance = destroyChart(statusChartInstance);
  revenueChartInstance = destroyChart(revenueChartInstance);
  
  // Resetear estados de error
  trendError.value = false;
  revenueError.value = false;
  
  fetchAllData();
};

const exportOrders = async () => {
  isExporting.value = true;
  try {
    console.log('📤 Iniciando exportación de pedidos...');
    
    const response = await apiService.orders.exportForOptiRoute();
    
    // Crear y descargar el archivo
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pedidos_optiroute_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Exportación completada exitosamente');
    showError('Exportación completada exitosamente'); // Usar como notificación exitosa
    
  } catch (error) {
    console.error('❌ Error exportando pedidos:', error);
    showError('Error al exportar pedidos. Verifica que haya pedidos disponibles.');
  } finally {
    isExporting.value = false;
  }
};

// --- CICLO DE VIDA ---

onMounted(() => {
  console.log('🚀 Dashboard montado, iniciando carga de datos...');
  fetchAllData();
});

onBeforeUnmount(() => {
  console.log('🧹 Limpiando instancias de gráficos...');
  trendChartInstance = destroyChart(trendChartInstance);
  statusChartInstance = destroyChart(statusChartInstance);
  revenueChartInstance = destroyChart(revenueChartInstance);
});
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.refresh-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.initial-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
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

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* KPIs */
.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.kpi-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kpi-card.revenue {
  border-left: 4px solid #10b981;
}

.kpi-icon {
  font-size: 40px;
  opacity: 0.8;
}

.kpi-content {
  flex: 1;
}

.kpi-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.kpi-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 2px;
}

.kpi-subtitle {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

/* Secciones */
.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

/* Acciones rápidas */
.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.action-card:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
  transform: translateY(-1px);
}

.action-card.clickable {
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
}

.action-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.action-description {
  font-size: 14px;
  color: #6b7280;
}

/* Charts */
.charts-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-container {
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.chart-container.full-width {
  grid-column: 1 / -1;
}

.chart-header {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.chart-controls {
  display: flex;
  gap: 8px;
}

.period-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.chart-content {
  padding: 20px;
  height: 300px;
  position: relative;
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  font-style: italic;
}

.no-data-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-style: italic;
}

.no-data-message p {
  margin: 0;
  font-size: 16px;
}

/* Responsive */
@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  .kpis-grid, .actions-grid {
    grid-template-columns: 1fr;
  }
  .chart-content {
    height: 250px;
  }
}
</style>