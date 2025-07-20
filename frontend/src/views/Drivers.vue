<template>
  <div class="drivers-page">
    <div class="page-header">
      <h1 class="page-title">Gestión de Conductores</h1>
      <button @click="openDriverModal()" class="btn-primary">+ Agregar Conductor</button>
    </div>

    <div v-if="loading" class="loading-container">Cargando conductores...</div>
    
    <div v-else-if="drivers.length > 0" class="drivers-grid">
      <div v-for="driver in drivers" :key="driver._id" class="driver-card">
        <div class="driver-header">
          <div class="driver-avatar">{{ driver.full_name.charAt(0) }}</div>
          <div class="driver-info">
            <h3 class="driver-name">{{ driver.full_name }}</h3>
            <p class="driver-phone">{{ driver.phone }}</p>
          </div>
        </div>
        <div class="driver-stats">
          <div class="stat-item">
            <span class="stat-value">{{ driver.stats?.deliveredThisMonth || 0 }}</span>
            <span class="stat-label">Entregas (Mes)</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ driver.stats?.totalAssigned || 0 }}</span>
            <span class="stat-label">Asignados (Total)</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ driver.stats?.issuesCount || 0 }}</span>
            <span class="stat-label">Incidencias</span>
          </div>
        </div>
        <div class="driver-actions">
          <button @click="openDriverModal(driver)" class="action-btn">Editar</button>
          <button @click="confirmDelete(driver)" class="action-btn-danger">Eliminar</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
        <p>Aún no has agregado conductores.</p>
        <button @click="openDriverModal()" class="btn-primary">+ Agregar Primer Conductor</button>
    </div>
    
    <Modal v-model="showDriverModal" :title="isEditing ? 'Editar Conductor' : 'Agregar Nuevo Conductor'">
        <form @submit.prevent="saveDriver">
            <div class="form-group">
                <label>Nombre Completo:</label>
                <input v-model="driverData.full_name" type="text" required />
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input v-model="driverData.email" type="email" required />
            </div>
            <div class="form-group">
                <label>Teléfono:</label>
                <input v-model="driverData.phone" type="text" required />
            </div>
            <div class="modal-actions">
                <button type="button" @click="showDriverModal = false" class="btn-secondary">Cancelar</button>
                <button type="submit" :disabled="saving" class="btn-primary">
                    {{ saving ? 'Guardando...' : 'Guardar Conductor' }}
                </button>
            </div>
        </form>
    </Modal>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';

// --- ESTADO ---
const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const drivers = ref([]);

// --- MODALES Y FORMULARIO ---
const showDriverModal = ref(false);
const isEditing = ref(false);
const driverData = ref({
  _id: null,
  full_name: '',
  email: '',
  phone: ''
});

// --- MÉTODOS ---

async function loadDrivers() {
  loading.value = true;
  try {
    // Llama a tu propio backend, que calcula las estadísticas
    const { data } = await apiService.drivers.getAll();
    drivers.value = data;
  } catch (error) {
    console.error('Error cargando conductores:', error);
    toast.error('No se pudieron cargar los conductores.');
  } finally {
    loading.value = false;
  }
}

function openDriverModal(driver = null) {
  if (driver) {
    // Editando un conductor existente
    isEditing.value = true;
    driverData.value = { ...driver };
  } else {
    // Creando un nuevo conductor
    isEditing.value = false;
    driverData.value = { _id: null, full_name: '', email: '', phone: '' };
  }
  showDriverModal.value = true;
}

async function saveDriver() {
  saving.value = true;
  try {
    if (isEditing.value) {
      // Lógica de actualización
      await apiService.drivers.update(driverData.value._id, driverData.value);
      toast.success('Conductor actualizado exitosamente.');
    } else {
      // Lógica de creación
      await apiService.drivers.create(driverData.value);
      toast.success('Conductor agregado exitosamente.');
    }
    showDriverModal.value = false;
    await loadDrivers(); // Recarga la lista para mostrar los cambios
  } catch (error) {
    console.error('Error guardando conductor:', error);
    toast.error(error.message || 'No se pudo guardar el conductor.');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(driver) {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${driver.full_name}?`)) {
        try {
            await apiService.drivers.delete(driver._id);
            toast.success('Conductor eliminado.');
            await loadDrivers(); // Recarga la lista
        } catch (error) {
            console.error('Error eliminando conductor:', error);
            toast.error('No se pudo eliminar el conductor.');
        }
    }
}

// --- CICLO DE VIDA ---
onMounted(() => {
  loadDrivers();
});
</script>
<style scoped>
/* ==================== LAYOUT GENERAL ==================== */
.drivers-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-primary:hover {
  background-color: #4338ca;
}

/* ==================== GRID DE CONDUCTORES ==================== */
.drivers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.driver-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.driver-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.driver-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  flex-shrink: 0;
}

.driver-name {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
  font-weight: 600;
}

.driver-phone {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.driver-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  text-align: center;
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 12px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  display: block;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.driver-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.action-btn, .action-btn-danger {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}
.action-btn:hover {
    background-color: #f3f4f6;
    border-color: #9ca3af;
}

.action-btn-danger {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
.action-btn-danger:hover {
  background-color: #fca5a5;
}

/* ==================== ESTADOS DE CARGA Y VACÍO ==================== */
.loading-container, .empty-state {
  text-align: center;
  padding: 64px;
  color: #6b7280;
  font-style: italic;
}

/* ==================== MODAL Y FORMULARIO ==================== */
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}
.form-group input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
}
.btn-secondary:hover {
    background-color: #e5e7eb;
}
</style>