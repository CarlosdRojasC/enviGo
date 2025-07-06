<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Gestión de Conductores</h1>
      <button @click="openAddDriverModal" class="btn-primary">
        + Añadir Conductor
      </button>
    </div>

    <div class="content-section">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre Conductor</th>
              <th>Contacto</th>
              <th>Shipday ID</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="loading-row">Cargando conductores...</td>
            </tr>
            <tr v-else-if="drivers.length === 0">
              <td colspan="5" class="empty-row">No se encontraron conductores. ¡Añade el primero!</td>
            </tr>
            <tr v-else v-for="driver in drivers" :key="driver._id">
              <td>{{ driver.full_name }}</td>
              <td>
                <div>{{ driver.email }}</div>
                <div class="phone-number">{{ driver.phone }}</div>
              </td>
              <td>
                <span class="shipday-id">{{ driver.shipday_driver_id || 'N/A' }}</span>
              </td>
              <td>
                <span class="status-badge" :class="driver.is_active ? 'active' : 'inactive'">
                  {{ driver.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <button @click="toggleDriverStatus(driver)" class="btn-action toggle">
                  {{ driver.is_active ? 'Desactivar' : 'Activar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-model="showAddDriverForm" title="Añadir Nuevo Conductor" width="500px">
        <form @submit.prevent="handleAddNewDriver">
            <div class="form-group">
                <label>Nombre Completo *</label>
                <input v-model="newDriver.full_name" type="text" required>
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input v-model="newDriver.email" type="email" required>
            </div>
             <div class="form-group">
                <label>Teléfono *</label>
                <input v-model="newDriver.phone" type="tel" placeholder="+56912345678" required>
            </div>
            <div class="form-group">
                <label>Contraseña Provisional *</label>
                <input v-model="newDriver.password" type="password" required minlength="6">
            </div>
            <div class="modal-actions">
                <button type="button" @click="showAddDriverForm = false" class="btn-cancel">Cancelar</button>
                <button type="submit" :disabled="isAddingDriver" class="btn-save">
                    {{ isAddingDriver ? 'Creando...' : 'Crear Conductor' }}
                </button>
            </div>
        </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';

const drivers = ref([]);
const loading = ref(true);
const showAddDriverForm = ref(false);
const isAddingDriver = ref(false);
const newDriver = ref({ full_name: '', email: '', phone: '', password: '' });

onMounted(fetchDrivers);

async function fetchDrivers() {
  loading.value = true;
  try {
    const { data } = await apiService.drivers.getAll(); // Llamar al nuevo endpoint
    drivers.value = data;
  } catch (error) {
    console.error("Error cargando conductores:", error);
    alert("No se pudieron cargar los conductores.");
    drivers.value = [];
  } finally {
    loading.value = false;
  }
}

function openAddDriverModal() {
  newDriver.value = { full_name: '', email: '', phone: '', password: '' };
  showAddDriverForm.value = true;
}

async function handleAddNewDriver() {
  isAddingDriver.value = true;
  try {
    // El 'company_id' ya no se envía
    await apiService.drivers.create(newDriver.value);
    alert('Conductor creado exitosamente.');
    showAddDriverForm.value = false;
    await fetchDrivers(); // Recargar la lista de conductores
  } catch (error) {
    alert(`Error al crear conductor: ${error.response?.data?.error || error.message}`);
  } finally {
    isAddingDriver.value = false;
  }
}

async function toggleDriverStatus(driver) {
  alert(`Funcionalidad para cambiar estado de ${driver.full_name} pendiente.`);
}
</script>

<style scoped>
/* Los estilos de la respuesta anterior son compatibles con esta vista. */
/* Puedes copiar y pegar los estilos de Drivers.vue que te proporcioné antes. */
.page-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; }
.btn-primary { background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; }
.btn-primary:disabled { background-color: #9ca3af; cursor: not-allowed; }
.filters-section { background: white; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.content-section { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: left; }
.data-table th { background: #f9fafb; }
.loading-row, .empty-row { text-align: center; padding: 40px; color: #6b7280; }
.phone-number { font-size: 12px; color: #6b7280; }
.shipday-id { font-family: monospace; background-color: #e5e7eb; padding: 2px 4px; border-radius: 4px; font-size: 12px; }
.status-badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.status-badge.active { background-color: #d1fae5; color: #065f46; }
.status-badge.inactive { background-color: #fee2e2; color: #991b1b; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.btn-cancel { background-color: #e5e7eb; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer;}
.btn-save { background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer;}
.btn-save:disabled { opacity: 0.5; }
.btn-action.toggle {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  font-size: 12px;
}
</style>