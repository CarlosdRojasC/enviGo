<!-- frontend/src/components/CommuneFilter.vue -->
<template>
  <div class="commune-filter">
    <div class="filter-header">
      <h3>🏘️ Configurar Comunas por Canal</h3>
      <p>Selecciona las comunas que acepta cada canal de ventas</p>
    </div>

    <!-- Selector de canal -->
    <div class="channel-selector">
      <label>Canal de Ventas:</label>
      <select v-model="selectedChannelId" @change="loadChannelData" class="channel-select">
        <option value="">Selecciona un canal...</option>
        <option v-for="channel in channels" :key="channel._id" :value="channel._id">
          {{ channel.channel_name }} ({{ channel.platform }})
        </option>
      </select>
    </div>

    <!-- Configuración de comunas -->
    <div v-if="selectedChannelId" class="commune-config">
      <!-- Estado actual -->
      <div class="current-status" :class="statusClass">
        <div class="status-icon">{{ statusIcon }}</div>
        <div class="status-text">
          <h4>{{ statusTitle }}</h4>
          <p>{{ statusDescription }}</p>
        </div>
      </div>

      <!-- Selección rápida -->
      <div class="quick-actions">
        <button @click="selectAll" class="btn-quick" :disabled="allSelected">
          ✅ Todas ({{ totalCommunes }})
        </button>
        <button @click="clearAll" class="btn-quick" :disabled="noneSelected">
          ❌ Ninguna
        </button>
        <button @click="selectZone('Zona Centro')" class="btn-quick">
          🏢 Solo Centro
        </button>
        <button @click="selectZone('Zona Oriente')" class="btn-quick">
          🏔️ Solo Oriente
        </button>
      </div>

      <!-- Comunas por zona -->
      <div class="zones-grid">
        <div v-for="(communes, zone) in envigoCommunes" :key="zone" class="zone-card">
          <div class="zone-header">
            <h4>{{ zone }}</h4>
            <span class="zone-count">{{ getSelectedInZone(communes) }}/{{ communes.length }}</span>
          </div>
          
          <div class="communes-list">
            <label 
              v-for="commune in communes" 
              :key="commune"
              class="commune-item"
              :class="{ 'selected': isSelected(commune) }"
            >
              <input 
                type="checkbox" 
                :value="commune"
                :checked="isSelected(commune)"
                @change="toggleCommune(commune)"
              />
              <span class="commune-name">{{ commune }}</span>
              <span v-if="isSelected(commune)" class="check-mark">✓</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Prueba de filtro -->
      <div class="test-section">
        <h4>🧪 Probar Filtro</h4>
        <div class="test-input-group">
          <input 
            v-model="testCommune"
            type="text"
            placeholder="Ingresa una comuna para probar..."
            class="test-input"
            @keyup.enter="runTest"
          />
          <button @click="runTest" class="btn-test" :disabled="!testCommune">
            Probar
          </button>
        </div>
        
        <div v-if="testResult" class="test-result" :class="testResult.is_allowed ? 'success' : 'error'">
          <span class="result-icon">{{ testResult.is_allowed ? '✅' : '❌' }}</span>
          <span class="result-text">{{ testResult.message }}</span>
        </div>
      </div>

      <!-- Acciones -->
      <div class="actions">
        <button 
          @click="saveConfiguration" 
          :disabled="saving"
          class="btn-save"
        >
          {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
        </button>
        
        <button 
          @click="syncOrders" 
          :disabled="syncing"
          class="btn-sync"
        >
          {{ syncing ? 'Sincronizando...' : 'Sincronizar Pedidos' }}
        </button>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-if="!selectedChannelId" class="empty-state">
      <div class="empty-icon">🏪</div>
      <h3>Selecciona un Canal</h3>
      <p>Elige un canal para configurar sus comunas permitidas</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import apiService from '../services/api';

export default {
  name: 'CommuneFilter',
  emits: ['saved', 'synced'],
  setup(props, { emit }) {
    // Estados
    const channels = ref([]);
    const selectedChannelId = ref('');
    const selectedCommunes = ref([]);
    const envigoCommunes = ref({});
    const testCommune = ref('');
    const testResult = ref(null);
    const saving = ref(false);
    const syncing = ref(false);
    const loading = ref(false);

    // Computeds
    const totalCommunes = computed(() => {
      return Object.values(envigoCommunes.value).flat().length;
    });

    const allSelected = computed(() => {
      return selectedCommunes.value.length === totalCommunes.value;
    });

    const noneSelected = computed(() => {
      return selectedCommunes.value.length === 0;
    });

    const statusClass = computed(() => {
      const count = selectedCommunes.value.length;
      if (count === 0) return 'status-all';
      if (count <= 5) return 'status-restrictive';
      if (count === totalCommunes.value) return 'status-complete';
      return 'status-moderate';
    });

    const statusIcon = computed(() => {
      const count = selectedCommunes.value.length;
      if (count === 0) return '🌍';
      if (count <= 5) return '🎯';
      if (count === totalCommunes.value) return '✅';
      return '📍';
    });

    const statusTitle = computed(() => {
      const count = selectedCommunes.value.length;
      if (count === 0) return 'Todas las Comunas';
      if (count <= 5) return 'Filtro Restrictivo';
      if (count === totalCommunes.value) return 'Todas las Comunas de enviGo';
      return 'Filtro Moderado';
    });

    const statusDescription = computed(() => {
      const count = selectedCommunes.value.length;
      if (count === 0) return 'Se aceptarán pedidos de cualquier comuna';
      if (count === totalCommunes.value) return `Se aceptarán pedidos de las ${totalCommunes.value} comunas de enviGo`;
      return `Se aceptarán pedidos de ${count} comunas seleccionadas`;
    });

    // Métodos
    const loadChannels = async () => {
      try {
        // Adaptar según tu estructura de API
        const response = await apiService.get('/companies/channels'); // Ajustar endpoint
        channels.value = response.data || [];
      } catch (error) {
        console.error('Error cargando canales:', error);
      }
    };

    const loadEnvigoCommunes = async () => {
      try {
        const response = await apiService.get('/communes/envigo');
        envigoCommunes.value = response.data.communes_by_zone;
      } catch (error) {
        console.error('Error cargando comunas de enviGo:', error);
        // Fallback con datos hardcodeados
        envigoCommunes.value = {
          'Zona Norte': ['Huechuraba', 'Quilicura', 'Recoleta', 'Independencia'],
          'Zona Centro': ['Santiago Centro', 'Estación Central', 'Quinta Normal'],
          'Zona Oriente': ['Las Condes', 'Vitacura', 'Ñuñoa', 'La Reina', 'Peñalolén', 'Macul'],
          'Zona Sur': ['San Miguel', 'San Joaquín', 'Pedro Aguirre Cerda', 'La Cisterna', 'San Ramón', 'La Granja'],
          'Zona Poniente': ['Cerrillos', 'Renca', 'Cerro Navia'],
          'Zona Sur-Oriente': ['La Florida']
        };
      }
    };

    const loadChannelData = async () => {
      if (!selectedChannelId.value) {
        selectedCommunes.value = [];
        return;
      }
      
      try {
        loading.value = true;
        const response = await apiService.get(`/channels/${selectedChannelId.value}/communes`);
        selectedCommunes.value = response.data.accepted_communes || [];
      } catch (error) {
        console.error('Error cargando datos del canal:', error);
        selectedCommunes.value = [];
      } finally {
        loading.value = false;
      }
    };

    const isSelected = (commune) => {
      return selectedCommunes.value.includes(commune);
    };

    const toggleCommune = (commune) => {
      if (isSelected(commune)) {
        selectedCommunes.value = selectedCommunes.value.filter(c => c !== commune);
      } else {
        selectedCommunes.value.push(commune);
      }
    };

    const selectAll = () => {
      selectedCommunes.value = Object.values(envigoCommunes.value).flat();
    };

    const clearAll = () => {
      selectedCommunes.value = [];
    };

    const selectZone = (zoneName) => {
      const zoneCommunes = envigoCommunes.value[zoneName] || [];
      zoneCommunes.forEach(commune => {
        if (!selectedCommunes.value.includes(commune)) {
          selectedCommunes.value.push(commune);
        }
      });
    };

    const getSelectedInZone = (zoneCommunes) => {
      return zoneCommunes.filter(commune => isSelected(commune)).length;
    };

    const runTest = async () => {
      if (!testCommune.value || !selectedChannelId.value) return;
      
      try {
        const response = await apiService.post(`/channels/${selectedChannelId.value}/communes/test`, {
          test_commune: testCommune.value
        });
        testResult.value = response.data;
      } catch (error) {
        console.error('Error probando comuna:', error);
        testResult.value = {
          is_allowed: false,
          message: 'Error al probar la comuna'
        };
      }
    };

    const saveConfiguration = async () => {
      if (!selectedChannelId.value) return;
      
      saving.value = true;
      try {
        await apiService.put(`/channels/${selectedChannelId.value}/communes`, {
          accepted_communes: selectedCommunes.value
        });
        
        emit('saved', {
          channelId: selectedChannelId.value,
          communes: selectedCommunes.value
        });
        
        alert('✅ Configuración guardada exitosamente');
      } catch (error) {
        console.error('Error guardando configuración:', error);
        alert('❌ Error guardando configuración');
      } finally {
        saving.value = false;
      }
    };

    const syncOrders = async () => {
      if (!selectedChannelId.value) return;
      
      syncing.value = true;
      try {
        const response = await apiService.post(`/channels/${selectedChannelId.value}/sync-with-communes`, {
          date_from: null,
          date_to: null,
          dry_run: false
        });
        
        const result = response.data.sync_result;
        
        emit('synced', {
          channelId: selectedChannelId.value,
          result: result
        });
        
        alert(`✅ Sincronización completada:\n${result.imported || 0} pedidos importados\n${result.rejected || 0} pedidos rechazados`);
      } catch (error) {
        console.error('Error sincronizando:', error);
        alert('❌ Error en la sincronización');
      } finally {
        syncing.value = false;
      }
    };

    // Lifecycle
    onMounted(async () => {
      await Promise.all([
        loadChannels(),
        loadEnvigoCommunes()
      ]);
    });

    return {
      channels,
      selectedChannelId,
      selectedCommunes,
      envigoCommunes,
      testCommune,
      testResult,
      saving,
      syncing,
      loading,
      totalCommunes,
      allSelected,
      noneSelected,
      statusClass,
      statusIcon,
      statusTitle,
      statusDescription,
      loadChannelData,
      isSelected,
      toggleCommune,
      selectAll,
      clearAll,
      selectZone,
      getSelectedInZone,
      runTest,
      saveConfiguration,
      syncOrders
    };
  }
};
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