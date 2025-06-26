<template>
  <div class="page-container">
    <h1 class="page-title">Mis Canales de Venta</h1>
    
    <div class="channels-section">
      <div v-if="loading" class="loading"><p>Cargando canales...</p></div>
      <div v-else class="channels-grid">
        <div 
          v-for="channel in channels" 
          :key="channel._id" 
          class="channel-card"
          :class="{ inactive: !channel.is_active }"
        >
          <div class="channel-header">
            <h3>{{ channel.channel_name }}</h3>
            <span class="channel-type">{{ getChannelTypeName(channel.channel_type) }}</span>
          </div>
          <div class="channel-stats">
            <div class="channel-stat">
              <span class="label">Total Pedidos:</span>
              <span class="value">{{ channel.total_orders || 0 }}</span>
            </div>
            <div class="channel-stat">
              <span class="label">Última Sincronización:</span>
              <span class="value">{{ formatDate(channel.last_sync) }}</span>
            </div>
          </div>
          <div class="channel-actions">
            <button 
              @click="syncChannel(channel._id)" 
              :disabled="syncingChannels.includes(channel._id)"
              class="sync-btn"
            >
              {{ syncingChannels.includes(channel._id) ? 'Sincronizando...' : 'Sincronizar' }}
            </button>
            <button @click="showChannelDetails(channel)" class="details-btn">
              Ver Detalles
            </button>
          </div>
        </div>
        
        <div class="add-channel-card">
          <button @click="openAddChannelModal" class="add-channel-btn">
            <span class="plus">+</span>
            <span>Agregar Canal</span>
          </button>
        </div>
      </div>
    </div>

    <Modal v-model="showAddChannelModal" title="Agregar Nuevo Canal" width="500px">
        <form @submit.prevent="addChannel">
          <div class="form-group">
            <label>Tipo de Canal:</label>
            <select v-model="newChannel.channel_type" required>
              <option value="" disabled>Seleccionar...</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
            </select>
          </div>
          
          <div v-if="newChannel.channel_type">
            <div class="form-group">
              <label>Nombre del Canal:</label>
              <input v-model="newChannel.channel_name" type="text" required placeholder="Mi Tienda Shopify">
            </div>
            
            <div class="form-group">
              <label>URL de la Tienda:</label>
              <input v-model="newChannel.store_url" type="text" required placeholder="ejemplo.myshopify.com">
            </div>

            <div class="form-group">
              <label>{{ newChannel.channel_type === 'shopify' ? 'Token de Acceso (API Secret)' : 'Consumer Key' }}</label>
              <input v-model="newChannel.api_key" type="text" required>
            </div>
            
            <div class="form-group">
              <label>{{ newChannel.channel_type === 'shopify' ? 'API Key' : 'Consumer Secret' }}</label>
              <input v-model="newChannel.api_secret" type="password" required>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="showAddChannelModal = false" class="btn-cancel">Cancelar</button>
            <button type="submit" :disabled="addingChannel || !newChannel.channel_type" class="btn-save">
              {{ addingChannel ? 'Agregando...' : 'Agregar' }}
            </button>
          </div>
        </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';

const auth = useAuthStore();
const user = computed(() => auth.user);

const channels = ref([]);
const loading = ref(true);
const syncingChannels = ref([]);

// Estado del modal
const showAddChannelModal = ref(false);
const addingChannel = ref(false);
const newChannel = ref({
  channel_type: '',
  channel_name: '',
  api_key: '',
  api_secret: '',
  store_url: ''
});

onMounted(fetchChannels);

async function fetchChannels() {
  loading.value = true;
  try {
    const companyId = user.value?.company_id || user.value?.company?._id;
    if (!companyId) return;
    const { data } = await apiService.channels.getByCompany(companyId);
    channels.value = data;
  } catch (error) {
    console.error('Error fetching channels:', error);
  } finally {
    loading.value = false;
  }
}

function openAddChannelModal() {
    newChannel.value = { channel_type: '', channel_name: '', api_key: '', api_secret: '', store_url: '' };
    showAddChannelModal.value = true;
}

async function addChannel() {
    addingChannel.value = true;
    try {
        const companyId = user.value?.company_id || user.value?.company?._id;
        const { data } = await apiService.channels.create(companyId, newChannel.value);
        
        showAddChannelModal.value = false;
        alert('Canal agregado. Probando conexión...');

        const testResult = await apiService.channels.testConnection(data.channel._id);
        if (testResult.data.success) {
            alert(`¡Conexión exitosa! ${testResult.data.message}`);
        } else {
            alert(`Canal creado, pero la prueba de conexión falló: ${testResult.data.message}`);
        }
        await fetchChannels();

    } catch (error) {
        alert(`Error al agregar el canal: ${error.message || 'Verifique los datos.'}`);
    } finally {
        addingChannel.value = false;
    }
}

async function syncChannel(channelId) {
    if (syncingChannels.value.includes(channelId)) return;
    syncingChannels.value.push(channelId);
    try {
        await apiService.channels.sync(channelId, {
            date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            date_to: new Date().toISOString()
        });
        alert('Sincronización iniciada. Los pedidos aparecerán en la sección "Mis Pedidos" en unos momentos.');
        await fetchChannels(); // Actualizar datos como total de pedidos
    } catch (error) {
        alert(`Error en la sincronización: ${error.message}`);
    } finally {
        syncingChannels.value = syncingChannels.value.filter(id => id !== channelId);
    }
}

function showChannelDetails(channel) {
  alert(`Detalles del canal ${channel.channel_name}. Funcionalidad pendiente.`);
}

function getChannelTypeName(type) {
    const names = { shopify: 'Shopify', woocommerce: 'WooCommerce', mercadolibre: 'MercadoLibre' };
    return names[type] || type;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}
</script>

<style scoped>
/* Estilos extraídos del dashboard para consistencia */
.page-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 24px;
}
.loading { text-align: center; padding: 50px; font-size: 18px; color: #6b7280; }
.channels-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}
.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
.channel-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: #f9fafb;
}
.channel-card.inactive {
  opacity: 0.6;
  background: #f3f4f6;
}
.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.channel-header h3 { margin: 0; color: #1f2937; }
.channel-type { background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.channel-stats { margin-bottom: 15px; }
.channel-stat { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
.channel-stat .label { color: #6b7280; }
.channel-stat .value { color: #1f2937; font-weight: 500; }
.channel-actions { display: flex; gap: 10px; }
.sync-btn, .details-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}
.sync-btn:hover, .details-btn:hover { background: #f3f4f6; }
.sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.add-channel-card {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.add-channel-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 20px;
}
.add-channel-btn:hover { color: #3b82f6; }
.add-channel-btn .plus { font-size: 48px; font-weight: 300; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.modal-actions button { padding: 10px 20px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
.btn-cancel { background-color: #e5e7eb; }
.btn-save { background-color: #4f46e5; color: white; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>