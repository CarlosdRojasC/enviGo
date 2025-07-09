<template>
  <div class="commune-filter">
    <div class="filter-header">
      <h3>🏘️ Configurar Comunas por Canal</h3>
      <p>Selecciona una empresa y un canal para definir las comunas donde se aceptarán pedidos.</p>
    </div>

    <div class="selectors-grid">
      <div class="form-group">
        <label for="company-select">1. Selecciona una Empresa:</label>
        <select id="company-select" v-model="selectedCompanyId" @change="loadChannelsForCompany" class="channel-select">
          <option value="">-- Elige una empresa --</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="channel-select">2. Selecciona un Canal:</label>
        <select id="channel-select" v-model="selectedChannelId" @change="loadChannelData" class="channel-select" :disabled="!selectedCompanyId || loading.channels">
          <option value="">-- Elige un canal --</option>
          <option v-for="channel in channels" :key="channel._id" :value="channel._id">
            {{ channel.channel_name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading.channels || loading.communes" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando datos...</p>
    </div>
    <div v-else-if="!selectedChannelId" class="empty-state">
      <div class="empty-icon">☝️</div>
      <h3>Selecciona un canal para empezar</h3>
      <p>Una vez que elijas un canal, podrás configurar sus comunas permitidas.</p>
    </div>

    <div v-else class="commune-config">
      <div class="quick-actions">
        <button @click="selectAll" class="btn-quick">✅ Seleccionar Todas</button>
        <button @click="clearAll" class="btn-quick">❌ Limpiar Selección</button>
      </div>

      <div class="zones-grid">
        <div v-for="(communesInZone, zone) in availableCommunesByZone" :key="zone" class="zone-card">
          <div class="zone-header">
            <h4>{{ zone }}</h4>
            <span class="zone-count">{{ getSelectedInZone(communesInZone) }}/{{ communesInZone.length }}</span>
          </div>
          <div class="communes-list">
            <label v-for="commune in communesInZone" :key="commune" class="commune-item" :class="{ 'selected': selectedCommunes.includes(commune) }">
              <input 
                type="checkbox" 
                :value="commune"
                :checked="selectedCommunes.includes(commune)"
                @change="toggleCommune(commune)"
              />
              <span class="commune-name">{{ commune }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="actions">
        <button @click="saveConfiguration" :disabled="saving" class="btn-save">
          {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiService } from '../services/api';

// --- ESTADO ---
const companies = ref([]);
const channels = ref([]);
const availableCommunesByZone = ref({}); // <- Almacenará el objeto con zonas
const selectedCompanyId = ref('');
const selectedChannelId = ref('');
const selectedCommunes = ref([]);
const loading = ref({ companies: true, channels: false, communes: true });
const saving = ref(false);

// --- PROPIEDADES COMPUTADAS ---
const allAvailableCommunes = computed(() => {
  // Crea una lista plana de todas las comunas para los botones "Seleccionar Todas"
  return Object.values(availableCommunesByZone.value).flat().sort();
});

// --- MÉTODOS ---
async function fetchInitialData() {
  loading.value.companies = true;
  loading.value.communes = true;
  try {
    const [companiesRes, communesRes] = await Promise.all([
      apiService.companies.getAll(),
      // ▼▼▼ CAMBIO CLAVE: Usa el nuevo servicio que apunta a la ruta correcta ▼▼▼
      apiService.communes.getEnvigoCommunes()
    ]);
    
    companies.value = companiesRes.data || [];
    // El backend ya nos da las comunas agrupadas por zona
    availableCommunesByZone.value = communesRes.data.communes_by_zone || {};

  } catch (error) {
    console.error('Error cargando datos iniciales:', error);
    alert('No se pudieron cargar los datos necesarios.');
  } finally {
    loading.value.companies = false;
    loading.value.communes = false;
  }
}

async function loadChannelsForCompany() {
  selectedChannelId.value = '';
  selectedCommunes.value = [];
  if (!selectedCompanyId.value) {
    channels.value = [];
    return;
  }
  loading.value.channels = true;
  try {
    const { data } = await apiService.channels.getByCompany(selectedCompanyId.value);
    channels.value = data || [];
  } catch (error) {
    console.error(`Error cargando canales para la empresa ${selectedCompanyId.value}:`, error);
  } finally {
    loading.value.channels = false;
  }
}

async function loadChannelData() {
  if (!selectedChannelId.value) {
    selectedCommunes.value = [];
    return;
  }
  try {
    const { data } = await apiService.channels.getById(selectedChannelId.value);
    selectedCommunes.value = data.accepted_communes || [];
  } catch (error) {
    console.error(`Error cargando datos del canal ${selectedChannelId.value}:`, error);
  }
}

function toggleCommune(commune) {
  const index = selectedCommunes.value.indexOf(commune);
  if (index > -1) {
    selectedCommunes.value.splice(index, 1);
  } else {
    selectedCommunes.value.push(commune);
  }
}

function selectAll() {
  selectedCommunes.value = [...allAvailableCommunes.value];
}

function clearAll() {
  selectedCommunes.value = [];
}

const getSelectedInZone = (zoneCommunes) => {
  return zoneCommunes.filter(commune => selectedCommunes.value.includes(commune)).length;
};

async function saveConfiguration() {
  if (!selectedChannelId.value) {
    alert('Por favor, selecciona un canal antes de guardar.');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      accepted_communes: selectedCommunes.value
    };
    await apiService.channels.update(selectedChannelId.value, payload);
    alert('✅ Configuración de comunas guardada exitosamente.');
  } catch (error) {
    console.error('Error guardando configuración:', error);
    alert('❌ Hubo un error al guardar la configuración.');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchInitialData();
});
</script>


<style scoped>
.commune-filter {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.filter-header {
  text-align: center;
  margin-bottom: 30px;
}

.filter-header h3 {
  color: #333;
  margin-bottom: 10px;
}

.filter-header p {
  color: #666;
}

.channel-selector {
  margin-bottom: 30px;
}

.channel-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

.channel-select {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  background: white;
}

.channel-select:focus {
  outline: none;
  border-color: #007bff;
}

.commune-config {
  space-y: 30px;
}

.current-status {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 25px;
  border: 2px solid;
}

.status-all {
  background: #e8f5e8;
  border-color: #4caf50;
  color: #2e7d32;
}

.status-restrictive {
  background: #fff3e0;
  border-color: #ff9800;
  color: #f57c00;
}

.status-moderate {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.status-complete {
  background: #f3e5f5;
  border-color: #9c27b0;
  color: #7b1fa2;
}

.status-icon {
  font-size: 2em;
  margin-right: 15px;
}

.status-text h4 {
  margin: 0 0 5px 0;
}

.status-text p {
  margin: 0;
  opacity: 0.8;
}

.quick-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.btn-quick {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-quick:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #007bff;
}

.btn-quick:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.zone-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
}

.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.zone-header h4 {
  margin: 0;
  color: #333;
}

.zone-count {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
}

.communes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.commune-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.commune-item:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.commune-item.selected {
  border-color: #28a745;
  background: #d4edda;
}

.commune-item input {
  margin-right: 8px;
}

.commune-name {
  flex: 1;
  font-size: 0.9em;
}

.check-mark {
  color: #28a745;
  font-weight: bold;
}

.test-section {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.test-section h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.test-input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.test-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.btn-test {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
}

.test-result.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.test-result.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn-save {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sync {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
}

.btn-sync:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #666;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin-bottom: 10px;
  color: #333;
}

@media (max-width: 768px) {
  .zones-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .test-input-group {
    flex-direction: column;
  }
}
</style>