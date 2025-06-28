<template>
  <div class="page-container">
    <h1 class="page-title">Dashboard del Administrador</h1>
    <div v-if="loading" class="loading"><p>Cargando estadísticas...</p></div>
    <div v-else class="dashboard-content">
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total de Empresas</h3>
          <div class="stat-value">{{ stats.companies || 0 }}</div>
          <div class="stat-change">📈 Activas en el sistema</div>
        </div>
        <div class="stat-card">
          <h3>Total de Pedidos</h3>
          <div class="stat-value">{{ stats.orders?.total_orders || 0 }}</div>
          <div class="stat-change">📦 Histórico</div>
        </div>
        <div class="stat-card">
          <h3>Pedidos Entregados</h3>
          <div class="stat-value">{{ stats.orders?.delivered || 0 }}</div>
          <div class="stat-change">✅ Completados</div>
        </div>
        <div class="stat-card">
          <h3>Ingresos del Mes</h3>
          <div class="stat-value">${{ formatCurrency(stats.monthly_revenue || 0) }}</div>
          <div class="stat-change">💰 Estimado de facturación</div>
        </div>
      </div>
       </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';

const loading = ref(true);
const stats = ref({});

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await apiService.dashboard.getStats();
    stats.value = data;
  } catch (error) {
    console.error("Error cargando datos del admin dashboard:", error);
  } finally {
    loading.value = false;
  }
});

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}
</script>

<style scoped>
.page-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 24px; }
.loading { text-align: center; padding: 50px; font-size: 18px; color: #6b7280; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
.stat-card h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500; }
.stat-value { font-size: 32px; font-weight: 700; color: #1f2937; margin-bottom: 5px; }
.stat-change { font-size: 12px; color: #6b7280; }
</style>