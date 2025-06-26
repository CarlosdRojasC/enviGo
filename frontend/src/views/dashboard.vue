<template>
  <div class="page-container">
    <h1 class="page-title">Dashboard</h1>
    <div v-if="loading" class="loading"><p>Cargando estadísticas...</p></div>
    <div v-else class="dashboard-content">
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Pedidos Hoy</h3>
          <div class="stat-value">{{ stats.orders?.orders_today || 0 }}</div>
          <div class="stat-change">📈 Últimas 24h</div>
        </div>
        <div class="stat-card">
          <h3>Pedidos Este Mes</h3>
          <div class="stat-value">{{ stats.orders?.orders_this_month || 0 }}</div>
          <div class="stat-change">📅 {{ currentMonth }}</div>
        </div>
        <div class="stat-card">
          <h3>Total Entregados</h3>
          <div class="stat-value">{{ stats.orders?.delivered || 0 }}</div>
          <div class="stat-change">✅ Completados</div>
        </div>
        <div class="stat-card">
          <h3>Total Facturado</h3>
          <div class="stat-value">${{ formatCurrency(stats.monthly_cost || 0) }}</div>
          <div class="stat-change">💰 ${{ stats.price_per_order || 0 }} por pedido</div>
        </div>
      </div>
      <div class="status-summary">
        <h2>Resumen de Estados</h2>
        <div class="status-grid">
          <div class="status-item pending">
            <span class="status-count">{{ stats.orders?.pending || 0 }}</span>
            <span class="status-label">Pendientes</span>
          </div>
          <div class="status-item processing">
            <span class="status-count">{{ stats.orders?.processing || 0 }}</span>
            <span class="status-label">Procesando</span>
          </div>
          <div class="status-item shipped">
            <span class="status-count">{{ stats.orders?.shipped || 0 }}</span>
            <span class="status-label">Enviados</span>
          </div>
          <div class="status-item delivered">
            <span class="status-count">{{ stats.orders?.delivered || 0 }}</span>
            <span class="status-label">Entregados</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { apiService } from '../services/api';

const loading = ref(true);
const stats = ref({});
const currentMonth = computed(() => new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await apiService.dashboard.getStats();
    stats.value = data;
  } catch (error) {
    console.error('Error fetching stats:', error);
  } finally {
    loading.value = false;
  }
});

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}
</script>

<style scoped>
.page-container { max-width: 1400px;  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; /* <-- AÑADE ESTA LÍNEA */
 }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 24px; }
.loading { text-align: center; padding: 50px; font-size: 18px; color: #6b7280; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
.stat-card h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500; }
.stat-value { font-size: 32px; font-weight: 700; color: #1f2937; margin-bottom: 5px; }
.stat-change { font-size: 12px; color: #10b981; }
.status-summary { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
.status-summary h2 { margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #1f2937; }
.status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
.status-item { text-align: center; padding: 16px; border-radius: 8px; border: 2px solid; }
.status-item.pending { border-color: #f59e0b; background: #fef3c7; }
.status-item.processing { border-color: #3b82f6; background: #dbeafe; }
.status-item.shipped { border-color: #8b5cf6; background: #e9d5ff; }
.status-item.delivered { border-color: #10b981; background: #d1fae5; }
.status-count { display: block; font-size: 24px; font-weight: 700; color: #1f2937; }
.status-label { font-size: 12px; color: #6b7280; font-weight: 500; }
</style>