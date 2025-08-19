<template>
  <div class="pickup-routes-view">
    <header class="view-header">
      <div class="header-content">
        <i class="fas fa-route header-icon"></i>
        <div>
          <h1>Rutas de Recolección</h1>
          <p>Gestiona los puntos de retiro pendientes y optimiza las rutas para tus conductores.</p>
        </div>
      </div>
    </header>

    <div class="view-content">
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-map-marker-alt"></i> Puntos de Recolección Pendientes</h2>
          <button 
            class="btn btn-primary" 
            @click="optimizeSelectedRoutes" 
            :disabled="selectedManifests.length < 1 || isOptimizing"
          >
            <span v-if="isOptimizing">
              <i class="fas fa-spinner fa-spin"></i> Procesando...
            </span>
            <span v-else>
              <i class="fas fa-cogs"></i> Optimizar Ruta ({{ selectedManifests.length }})
            </span>
          </button>
        </div>

        <div class="card-body">
          <div v-if="isLoading" class="feedback-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando puntos de recolección...</p>
          </div>

          <div v-else-if="manifests.length === 0" class="feedback-state">
            <i class="fas fa-box-open"></i>
            <p>¡Todo al día! No hay puntos de recolección pendientes.</p>
          </div>

          <div v-else class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th><input type="checkbox" @change="toggleSelectAll" :checked="allSelected" /></th>
                  <th>Manifiesto</th>
                  <th>Empresa</th>
                  <th>Dirección de Retiro</th>
                  <th class="text-center">Paquetes</th>
                  <th>Fecha Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="manifest in manifests" :key="manifest._id">
                  <td><input type="checkbox" v-model="selectedManifests" :value="manifest._id" /></td>
                  <td><strong>{{ manifest.manifest_number }}</strong></td>
                  <td>{{ manifest.company_id.name }}</td>
                  <td>
                    <div class="address-cell">
                      {{ manifest.pickup_address.full_address }}
                      <span class="commune-badge">{{ manifest.pickup_address.commune }}</span>
                    </div>
                  </td>
                  <td class="text-center">{{ manifest.total_packages }}</td>
                  <td>{{ formatDate(manifest.generated_at) }}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" @click="viewManifestDetails(manifest)">
                      <i class="fas fa-eye"></i> Ver
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import manifestService from '@/services/manifest.service'; // Asegúrate de tener este servicio
import { useToast } from 'vue-toastification';

const toast = useToast();

// Estado del componente
const isLoading = ref(true);
const isOptimizing = ref(false);
const manifests = ref([]);
const selectedManifests = ref([]);

// Obtener datos del backend
const fetchManifests = async () => {
  try {
    isLoading.value = true;
    const response = await manifestService.getManifestsByStatus('pending_pickup');
    // Asumiendo que tu API devuelve { manifests: [...] }
    manifests.value = response.data.manifests || []; 
  } catch (error) {
    console.error("Error al cargar los manifiestos:", error);
    toast.error("No se pudieron cargar los puntos de recolección.");
  } finally {
    isLoading.value = false;
  }
};

// Lógica de la interfaz
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const allSelected = computed(() => {
  return manifests.value.length > 0 && selectedManifests.value.length === manifests.value.length;
});

const toggleSelectAll = (event) => {
  if (event.target.checked) {
    selectedManifests.value = manifests.value.map(m => m._id);
  } else {
    selectedManifests.value = [];
  }
};

// Acciones
const viewManifestDetails = (manifest) => {
  // Aquí podrías abrir un modal con los detalles de las órdenes del manifiesto
  console.log("Mostrando detalles de:", manifest);
  toast.info(`Viendo detalles de ${manifest.manifest_number}`);
};

const optimizeSelectedRoutes = async () => {
  if (selectedManifests.value.length === 0) return;

  isOptimizing.value = true;
  toast.info(`Enviando ${selectedManifests.value.length} puntos a optimización...`);

  try {
    // PRÓXIMO PASO: Llamar al servicio de optimización (Shipday/Circuit)
    // const result = await routeOptimizationService.optimize(selectedManifests.value);
    console.log("IDs de manifiestos a optimizar:", selectedManifests.value);
    
    // Simulación de una llamada a la API
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success("¡Ruta creada exitosamente! (Simulación)");
    
    // Limpiar selección y recargar la lista
    selectedManifests.value = [];
    await fetchManifests();

  } catch (error) {
    console.error("Error al optimizar la ruta:", error);
    toast.error("Hubo un problema al crear la ruta.");
  } finally {
    isOptimizing.value = false;
  }
};

// Cargar datos al iniciar la vista
onMounted(() => {
  fetchManifests();
});
</script>

<style scoped>
/* Estilos para una apariencia más profesional */
.pickup-routes-view { padding: 2rem; background-color: #f4f7fa; min-height: 100vh; }
.view-header { display: flex; align-items: center; margin-bottom: 2rem; }
.header-content { display: flex; align-items: center; gap: 1.5rem; }
.header-icon { font-size: 2.5rem; color: var(--primary-color, #3b82f6); }
.view-header h1 { margin: 0; font-size: 1.8rem; }
.view-header p { margin: 0; color: #666; }
.card { background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
.card-header h2 { font-size: 1.2rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
.card-body { padding: 0; } /* Sin padding para que la tabla ocupe todo */
.table-container { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 12px 1.5rem; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
.table thead th { background-color: #f9fafb; font-weight: 600; color: #374151; }
.table tbody tr:hover { background-color: #f4f7fa; }
.text-center { text-align: center; }
.address-cell { display: flex; flex-direction: column; }
.commune-badge { background-color: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; margin-top: 4px; align-self: flex-start; }
.feedback-state { text-align: center; padding: 3rem 1rem; color: #6b7280; }
.feedback-state i { font-size: 2.5rem; margin-bottom: 1rem; }
</style>