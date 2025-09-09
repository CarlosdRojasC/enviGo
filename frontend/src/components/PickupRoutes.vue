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
          <tr v-else-if="pickups.length === 0">
            <td colspan="8" class="text-center py-4">No hay rutas de retiro pendientes.</td>
          </tr>
          <tr v-for="(pickup, index) in pickups" :key="pickup._id" class="table-row">
            <td class="px-4 py-2">{{ index + 1 }}</td>
            <td class="px-4 py-2">
              <span class="manifest-link">{{ pickup.manifest_id?.manifest_number || 'N/A' }}</span>
            </td>
            <td class="px-4 py-2">{{ pickup.company_id?.name || 'N/A' }}</td>
            <td class="px-4 py-2">{{ pickup.pickup_address }}</td>
            <td class="px-4 py-2 text-center">{{ pickup.total_orders }}</td>
            <td class="px-4 py-2 text-center">{{ pickup.total_packages }}</td>
            <td class="px-4 py-2">{{ formatDate(pickup.created_at) }}</td>
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
import { apiService } from '../services/api';

const pickups = ref([]);
const loading = ref(true);

async function fetchPickups() {
  loading.value = true;
  try {
    // Usamos el nuevo servicio de 'pickups' que creamos
    const { data } = await apiService.pickups.getAll();
    pickups.value = data;
  } catch (error) {
    console.error("Error al cargar las rutas de retiro:", error);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-CL', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function assignDriver(pickup) {
  console.log('Abrir modal para asignar conductor a:', pickup);
  // Aquí puedes implementar la lógica para abrir tu modal de asignación
}

onMounted(fetchPickups);
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
  white-space: nowrap;
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