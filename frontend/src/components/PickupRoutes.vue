<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">📍 Rutas de Retiro</h1>
      <p class="page-subtitle">Gestiona los retiros pendientes en las direcciones de tus clientes.</p>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th class="px-4 py-2 text-left text-sm font-semibold">#</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Manifiesto</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Empresa</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Dirección retiro</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-center">Órdenes</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-center">Bultos</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Fecha</th>
            <th class="px-4 py-2 text-left text-sm font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="text-center py-4">Cargando retiros...</td>
          </tr>
          <tr v-else-if="pickupOrders.length === 0">
            <td colspan="8" class="text-center py-4">No hay rutas de retiro pendientes.</td>
          </tr>
          <tr v-for="(pickup, index) in pickupOrders" :key="pickup._id" class="table-row">
            <td class="px-4 py-2">{{ index + 1 }}</td>
            <td class="px-4 py-2">
              <span class="manifest-link">{{ pickup.manifest_data?.manifest_id || 'N/A' }}</span>
            </td>
            <td class="px-4 py-2">{{ pickup.company_id?.name || 'N/A' }}</td>
            <td class="px-4 py-2">{{ pickup.shipping_address }}</td>
            <td class="px-4 py-2 text-center">{{ pickup.pickup_orders?.length || 0 }}</td>
            <td class="px-4 py-2 text-center">{{ calculateTotalPackages(pickup) }}</td>
            <td class="px-4 py-2">{{ formatDate(pickup.order_date) }}</td>
            <td class="px-4 py-2">
              <button @click="assignDriver(pickup)" class="action-btn">Asignar Conductor</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api'; // Asegúrate que la ruta sea correcta

const pickupOrders = ref([]);
const loading = ref(true);

async function fetchPickupOrders() {
  loading.value = true;
  try {
    // 1. Pedimos a la API SOLO los puntos de retiro
    const { data } = await apiService.orders.getAll({ is_pickup: 'true' });
    
    // 2. Para obtener el total de bultos, necesitamos los detalles de cada orden
    //    Hacemos una llamada adicional para obtener esa información
    const detailedOrders = await Promise.all(
        data.map(async (pickup) => {
            const orderDetails = await apiService.orders.getByIds(pickup.pickup_orders);
            pickup.detailed_orders = orderDetails.data;
            return pickup;
        })
    );
    pickupOrders.value = detailedOrders;

  } catch (error) {
    console.error("Error al cargar las rutas de retiro:", error);
  } finally {
    loading.value = false;
  }
}

// Función para sumar los bultos de las órdenes detalladas
function calculateTotalPackages(pickup) {
    if (!pickup.detailed_orders) return pickup.pickup_orders?.length || 0;
    return pickup.detailed_orders.reduce((sum, order) => sum + (order.load1Packages || 1), 0);
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-CL', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function assignDriver(pickupOrder) {
  console.log('Abrir modal para asignar conductor a:', pickupOrder);
  // Aquí puedes implementar la lógica para abrir tu modal de asignación
}

onMounted(fetchPickupOrders);
</script>

<style scoped>
/* Estilos genéricos para la página y la tabla, puedes adaptarlos */
.page-container {
  padding: 24px;
}
.page-header {
  margin-bottom: 24px;
}
.page-title {
  font-size: 2rem;
  font-weight: 700;
}
.page-subtitle {
  font-size: 1rem;
  color: #6b7280;
}
.table-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  overflow: hidden;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th, .data-table td {
  border-bottom: 1px solid #e5e7eb;
}
.data-table th {
  background-color: #f9fafb;
  color: #374151;
}
.table-row:hover {
  background-color: #f9fafb;
}
.text-center {
  text-align: center;
}
.manifest-link {
  color: #4f46e5;
  font-weight: 500;
  cursor: pointer;
}
.action-btn {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.action-btn:hover {
  background-color: #4338ca;
}
</style>