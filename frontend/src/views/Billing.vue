<template>
  <div class="page-container">
    <h1 class="page-title">Dashboard</h1>

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
const isGenerating = ref(false); // Nuevo estado para el botón

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

// NUEVA FUNCIÓN
async function runInvoiceGeneration() {
  if (!confirm('¿Estás seguro de que quieres generar las facturas para el mes anterior? Este proceso puede tardar unos momentos.')) {
    return;
  }
  isGenerating.value = true;
  try {
    const { data } = await apiService.billing.generateInvoices();
    alert(data.message || 'Proceso completado.');
  } catch (error) {
    alert('Hubo un error al generar las facturas: ' + (error.response?.data?.error || error.message));
  } finally {
    isGenerating.value = false;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}
</script>

<style scoped>
/* Estilos adaptados de dashboard.vue y otras vistas para consistencia */
.page-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 24px;
}

.loading, .empty-state {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #6b7280;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.invoices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.invoice-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.invoice-number {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.invoice-period {
  font-size: 14px;
  color: #6b7280;
  text-transform: capitalize;
}

.invoice-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invoice-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #6b7280;
  font-size: 14px;
}

.value {
  color: #1f2937;
  font-weight: 500;
}

.value.amount {
  font-size: 18px;
  font-weight: 700;
}

/* Estilos de badges consistentes con el resto de la app */
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.pending { background-color: #fef3c7; color: #92400e; }
.status-badge.paid { background-color: #d1fae5; color: #065f46; } /* Nuevo estado 'paid' */
.status-badge.overdue { background-color: #fee2e2; color: #991b1b; } /* Nuevo estado 'overdue' */

.invoice-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
}

.action-btn.download {
  color: #3b82f6;
  border-color: #3b82f6;
}
.action-btn.download:hover {
  background: #eff6ff;
}

.action-btn.mark-paid {
  color: #10b981;
  border-color: #10b981;
}
.action-btn.mark-paid:hover {
  background: #d1fae5;
}
.page-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 24px; }
.loading { text-align: center; padding: 50px; font-size: 18px; color: #6b7280; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
.stat-card h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500; }
.stat-value { font-size: 32px; font-weight: 700; color: #1f2937; margin-bottom: 5px; }
.stat-change { font-size: 12px; color: #6b7280; }
/* NUEVOS ESTILOS */
.actions-section {
  margin-top: 40px;
}
.actions-section h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}
.action-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.action-card p {
  margin: 4px 0 0;
  color: #6b7280;
  max-width: 600px;
}
.btn-primary {
  background-color: #4f46e5;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
}
.btn-primary:disabled {
  background-color: #a5b4fc;
  cursor: not-allowed;
}
</style>