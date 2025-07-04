<!-- src/views/Dashboard.vue - Company Users -->
<template>
  <div class="page-container">
    <div class="dashboard-header">
      <h1 class="page-title">Dashboard</h1>
      <div class="header-actions">
        <button @click="refreshData" class="refresh-btn" :disabled="loading">
          🔄 {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <div v-if="loading && !stats.orders" class="initial-loading">
      <div class="loading-spinner"></div>
      <p>Cargando estadísticas...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- KPIs Grid -->
      <div class="kpis-grid">
        <KPICard 
          title="Pedidos Hoy"
          :value="stats.orders?.orders_today || 0"
          icon="📦"
          variant="orders"
          :trend="getTrend('orders_today')"
          subtitle="Últimas 24h"
        />
        <KPICard 
          title="Pedidos Este Mes"
          :value="stats.orders?.orders_this_month || 0"
          icon="📅"
          variant="orders"
          :trend="getTrend('orders_month')"
          :subtitle="currentMonth"
        />
        <KPICard 
          title="Total Entregados"
          :value="stats.orders?.delivered || 0"
          icon="✅"
          variant="success"
          :trend="getTrend('delivered')"
          subtitle="Completados"
        />
        <KPICard 
          title="Costo Estimado"
          :value="stats.monthly_cost || 0"
          icon="💰"
          variant="revenue"
          format="currency"
          :subtitle="`$${stats.price_per_order || 0} por pedido`"
        />
      </div>

      <!-- Main Content Grid -->
      <div class="main-grid">
        <!-- Charts Section -->
        <div class="charts-section">
          <OrdersTrendChart 
            title="Tendencia de Pedidos"
            subtitle="Evolución de pedidos en el tiempo"
            :data="chartData"
            :loading="loadingChart"
            @period-change="handlePeriodChange"
          />
        </div>

        <!-- Sidebar -->
        <div class="sidebar-section">
          <QuickActions 
            title="Acciones Rápidas"
            subtitle="Gestiona tu negocio"
            @action-click="handleQuickAction"
          />
          
          <RecentActivity 
            title="Pedidos Recientes"
            :items="recentOrders"
            :loading="loadingOrders"
            view-all-route="/orders"
            type="orders"
            empty-message="No hay pedidos recientes"
            @item-click="handleOrderClick"
            @action-click="handleOrderAction"
          />
        </div>
      </div>

      <!-- Status Summary -->
      <div class="status-summary">
        <h2 class="summary-title">Resumen de Estados</h2>
        <div class="status-grid">
          <div class="status-item pending">
            <div class="status-icon">⏳</div>
            <div class="status-info">
              <span class="status-count">{{ stats.orders?.pending || 0 }}</span>
              <span class="status-label">Pendientes</span>
            </div>
          </div>
          <div class="status-item processing">
            <div class="status-icon">🔄</div>
            <div class="status-info">
              <span class="status-count">{{ stats.orders?.processing || 0 }}</span>
              <span class="status-label">Procesando</span>
            </div>
          </div>
          <div class="status-item shipped">
            <div class="status-icon">📦</div>
            <div class="status-info">
              <span class="status-count">{{ stats.orders?.shipped || 0 }}</span>
              <span class="status-label">Enviados</span>
            </div>
          </div>
          <div class="status-item delivered">
            <div class="status-icon">✅</div>
            <div class="status-info">
              <span class="status-count">{{ stats.orders?.delivered || 0 }}</span>
              <span class="status-label">Entregados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '../services/api'
import KPICard from '../components/dashboard/KPICard.vue'
import OrdersTrendChart from '../components/dashboard/OrdersTrendChart.vue'
import QuickActions from '../components/dashboard/QuickActions.vue'
import RecentActivity from '../components/dashboard/RecentActivity.vue'

const router = useRouter()

// Estado existente (mantenemos la lógica original)
const loading = ref(true)
const loadingChart = ref(false)
const loadingOrders = ref(false)
const stats = ref({})
const chartData = ref([])
const recentOrders = ref([])

// Computed properties
const currentMonth = computed(() => 
  new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
)

// Funciones existentes (mantenemos la lógica original del backend)
const fetchStats = async () => {
  loading.value = true
  try {
    const { data } = await apiService.dashboard.getStats()
    stats.value = data
    
    // Generar datos para el gráfico basado en stats
    fetchChartData()
    
    
    // Transformar pedidos recientes para el componente
    transformRecentOrders(data.recent_orders || [])
  } catch (error) {
    console.error('Error fetching stats:', error)
  } finally {
    loading.value = false
  }
}

const fetchChartData = async (period = '30d') => {
  loadingChart.value = true;
  try {
const { data } = await apiService.orders.getTrend({ period });
    chartData.value = data;
  } catch (error) {
    console.error("Error fetching chart data:", error);
    chartData.value = []; // En caso de error, el gráfico aparecerá vacío
  } finally {
    loadingChart.value = false;
  }
};
const transformRecentOrders = (orders) => {
  recentOrders.value = orders.map(order => ({
    id: order._id,
    title: `Pedido #${order.order_number}`,
    description: `${order.customer_name} - $${formatCurrency(order.total_amount)}`,
    timestamp: order.order_date,
    type: 'new_order',
    status: order.status,
    data: order,
    actions: [
      { id: 'view', label: 'Ver', type: 'primary' },
      { id: 'track', label: 'Rastrear', type: 'secondary' }
    ]
  }))
}

const getTrend = (metric) => {
  // Simular tendencias basadas en datos
  // En una implementación real, esto vendría del backend
  const trends = {
    orders_today: { direction: 'up', percentage: 15 },
    orders_month: { direction: 'up', percentage: 8 },
    delivered: { direction: 'up', percentage: 2 }
  }
  
  return trends[metric] || null
}

const refreshData = () => {
  fetchStats()
}

const handlePeriodChange = (period) => {
  console.log('Period changed to:', period)
  loadingChart.value = true
  
  // Simular recarga de datos del gráfico
  setTimeout(() => {
    fetchChartData()
    loadingChart.value = false
  }, 1000)
}

const handleQuickAction = (action) => {
  console.log('Quick action clicked:', action)
  
  // Navegación basada en la acción
  if (action.route) {
    router.push(action.route)
  }
}

const handleOrderClick = (item) => {
  router.push(`/orders?highlight=${item.data._id}`)
}

const handleOrderAction = ({ action, item }) => {
  console.log('Order action:', action, item)
  
  switch (action.id) {
    case 'view':
      router.push(`/orders?highlight=${item.data._id}`)
      break
    case 'track':
      // Abrir modal de tracking o similar
      console.log('Track order:', item.data.order_number)
      break
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

// Lifecycle (mantenemos la lógica original)
onMounted(() => {
  fetchStats()
  fetchChartData(); // Llama a la nueva función al montar el componente
})
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
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
  space-y: 30px;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 30px;
  margin-bottom: 30px;
}

.charts-section {
  min-height: 400px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-summary {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.summary-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid;
  background: white;
  transition: all 0.2s ease;
}

.status-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-item.pending {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.status-item.processing {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.status-item.shipped {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%);
}

.status-item.delivered {
  border-color: #10b981;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.status-icon {
  font-size: 32px;
  opacity: 0.8;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-count {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.status-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-top: 4px;
}

/* Responsive */
@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .sidebar-section {
    grid-template-columns: 1fr 1fr;
    display: grid;
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
  
  .kpis-grid {
    grid-template-columns: 1fr;
  }
  
  .sidebar-section {
    grid-template-columns: 1fr;
  }
  
  .status-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .status-item {
    padding: 16px;
    gap: 12px;
  }
  
  .status-count {
    font-size: 24px;
  }
  
  .status-icon {
    font-size: 24px;
  }
}
</style>