<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">{{ isAdminView ? 'Gestionar Canales de Venta' : 'Mis Canales de Venta' }}</h1>
      <button v-if="canAddChannel" @click="openAddChannelModal" class="btn-primary add-channel-btn-header">
        + Agregar Canal
      </button>
    </div>

    <div v-if="isAdminView" class="admin-controls-section">
      <div class="form-group">
        <label for="company-select">Seleccione una Empresa para ver sus canales:</label>
        <select id="company-select" v-model="selectedCompanyId" @change="fetchChannels">
          <option :value="null" disabled>-- Elija una empresa --</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
      </div>
    </div>
    
    <div class="channels-section">
      <div v-if="loading" class="loading"><p>Cargando canales...</p></div>
      <div v-else-if="isAdminView && !selectedCompanyId" class="empty-state">
          <p>Por favor, seleccione una empresa para continuar.</p>
      </div>
      <div v-else-if="channels.length === 0" class="empty-state">
          <p>No se encontraron canales de venta. ¡Añade el primero!</p>
      </div>
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
            <button @click="openEditChannelModal(channel)" class="action-btn edit">Editar</button>
            <button @click="syncChannel(channel._id)" :disabled="syncingChannels.includes(channel._id)" class="action-btn sync">
              {{ syncingChannels.includes(channel._id) ? 'Sincronizando...' : 'Sincronizar' }}
            </button>
            <button @click="deleteChannel(channel)" class="action-btn delete">Eliminar</button>
          </div>
        </div>
        
        <div v-if="channels.length > 0 && canAddChannel" class="add-channel-card">
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
            <select v-model="channelData.channel_type" required>
              <option value="" disabled>Seleccionar...</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
            </select>
          </div>
          <div v-if="channelData.channel_type">
            <div class="form-group">
              <label>Nombre del Canal:</label>
              <input v-model="channelData.channel_name" type="text" required placeholder="Mi Tienda Shopify">
            </div>
            <div class="form-group">
              <label>URL de la Tienda:</label>
              <input v-model="channelData.store_url" type="text" required placeholder="ejemplo.myshopify.com">
            </div>
            <div class="form-group">
              <label>{{ channelData.channel_type === 'shopify' ? 'Token de Acceso (API Secret)' : 'Consumer Key' }}</label>
              <input v-model="channelData.api_key" type="text" required>
            </div>
            <div class="form-group">
              <label>{{ channelData.channel_type === 'shopify' ? 'API Key' : 'Consumer Secret' }}</label>
              <input v-model="channelData.api_secret" type="password" required>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAddChannelModal = false" class="btn-cancel">Cancelar</button>
            <button type="submit" :disabled="addingChannel || !channelData.channel_type" class="btn-save">
              {{ addingChannel ? 'Agregando...' : 'Agregar' }}
            </button>
          </div>
        </form>
    </Modal>

    <Modal v-model="showEditChannelModal" title="Editar Canal de Venta" width="500px">
        <form @submit.prevent="updateChannel" v-if="channelData">
          <div class="form-group">
            <label>Tipo de Canal:</label>
            <input :value="getChannelTypeName(channelData.channel_type)" type="text" disabled class="disabled-input">
          </div>
          <div class="form-group">
            <label>Nombre del Canal:</label>
            <input v-model="channelData.channel_name" type="text" required>
          </div>
          <div class="form-group">
            <label>URL de la Tienda:</label>
            <input v-model="channelData.store_url" type="text" required>
          </div>
          <div class="form-group">
            <label>{{ channelData.channel_type === 'shopify' ? 'Token de Acceso (API Secret)' : 'Consumer Key' }}</label>
            <input v-model="channelData.api_key" type="text">
          </div>
          <div class="form-group">
            <label>{{ channelData.channel_type === 'shopify' ? 'API Key' : 'Consumer Secret' }}</label>
            <input v-model="channelData.api_secret" type="password" placeholder="Dejar en blanco para no cambiar">
          </div>
          <div class="modal-actions">
            <button type="button" @click="showEditChannelModal = false" class="btn-cancel">Cancelar</button>
            <button type="submit" :disabled="isUpdatingChannel" class="btn-save">
              {{ isUpdatingChannel ? 'Guardando...' : 'Guardar Cambios' }}
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
import { useRoute } from 'vue-router';

const auth = useAuthStore();
const route = useRoute();
const user = computed(() => auth.user);

const channels = ref([]);
const companies = ref([]);
const selectedCompanyId = ref(null);
const loading = ref(true);
const syncingChannels = ref([]);

const showAddChannelModal = ref(false);
const addingChannel = ref(false);
const showEditChannelModal = ref(false);
const isUpdatingChannel = ref(false);
const channelData = ref({
  channel_type: '',
  channel_name: '',
  api_key: '',
  api_secret: '',
  store_url: '',
  accepted_communes: '' // Usamos un string para el textarea
});
const editingChannelId = ref(null); // Para saber si estamos editando o creando
const isAdminView = computed(() => route.path.startsWith('/admin'));

const canAddChannel = computed(() => {
    if (isAdminView.value) {
        return !!selectedCompanyId.value;
    }
    return true;
});

onMounted(() => {
  if (isAdminView.value) {
    fetchCompanies();
    loading.value = false;
  } else {
    fetchChannels();
  }
});

async function fetchCompanies() {
  try {
    const { data } = await apiService.companies.getAll();
    companies.value = data;
  } catch (error) {
    console.error("Error fetching companies:", error);
  }
}

async function fetchChannels() {
  const companyId = isAdminView.value 
    ? selectedCompanyId.value 
    : (user.value?.company_id || user.value?.company?._id);
  
  if (!companyId) {
    channels.value = [];
    return;
  }
  
  loading.value = true;
  try {
    const { data } = await apiService.channels.getByCompany(companyId);
    channels.value = data;
  } catch (error) {
    console.error('Error fetching channels:', error);
    channels.value = [];
  } finally {
    loading.value = false;
  }
}

function openAddChannelModal() {
  if (!canAddChannel.value) {
    alert("Por favor, seleccione una empresa primero.");
    return;
  }
  
  editingChannelId.value = null; // Indica que estamos creando
  // Resetea el objeto del formulario
  channelData.value = {
    channel_type: '',
    channel_name: '',
    api_key: '',
    api_secret: '',
    store_url: '',
    accepted_communes: '' // El campo de comunas empieza vacío
  };
  showAddChannelModal.value = true;
}
async function addChannel() {
  addingChannel.value = true;
  try {
    const companyId = isAdminView.value ? selectedCompanyId.value : (user.value?.company_id || user.value?.company?._id);
    
    // Convierte el string de comunas en un array limpio antes de enviar
    const communesArray = channelData.value.accepted_communes
      .split(',')
      .map(c => c.trim())
      .filter(c => c); // Filtra elementos vacíos

    const payload = { ...channelData.value, accepted_communes: communesArray };

    const { data } = await apiService.channels.create(companyId, payload);
    
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

function openEditChannelModal(channel) {
  editingChannelId.value = channel._id; // Indica que estamos editando
  
  // Convierte el array de comunas de la BD a un string para el textarea
  const communesString = (channel.accepted_communes || []).join(', ');
  
  // Llenamos el objeto del formulario con los datos del canal a editar
  channelData.value = { 
    ...channel,
    accepted_communes: communesString, // Usamos el texto convertido
    api_secret: '' // Limpiar la contraseña por seguridad al editar
  };
  showEditChannelModal.value = true;
}
async function updateChannel() {
  if (!editingChannelId.value) return;
  isUpdatingChannel.value = true;
  try {
    // Convierte el string de comunas en un array limpio antes de enviar
    const communesArray = channelData.value.accepted_communes
      .split(',')
      .map(c => c.trim())
      .filter(c => c);

    const updateData = {
      channel_name: channelData.value.channel_name,
      store_url: channelData.value.store_url,
      api_key: channelData.value.api_key,
      accepted_communes: communesArray,
    };
    if (channelData.value.api_secret) {
      updateData.api_secret = channelData.value.api_secret;
    }

    await apiService.channels.update(editingChannelId.value, updateData);
    alert('Canal actualizado con éxito.');
    showEditChannelModal.value = false;
    await fetchChannels();
  } catch (error) {
    alert(`Error al actualizar el canal: ${error.message}`);
  } finally {
    isUpdatingChannel.value = false;
  }
}

async function deleteChannel(channel) {
  const confirmation = confirm(`¿Estás seguro de que quieres eliminar el canal "${channel.channel_name}"? Esta acción es irreversible.`);
  if (!confirmation) return;

  try {
    await apiService.channels.delete(channel._id);
    alert('Canal eliminado con éxito.');
    await fetchChannels();
  } catch (error) {
    alert(`Error al eliminar el canal: ${error.message}`);
  }
}

async function syncChannel(channelId) {
    if (syncingChannels.value.includes(channelId)) return;
    syncingChannels.value.push(channelId);
    try {
      await apiService.channels.syncOrders(channelId, {
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    date_to: new Date().toISOString()
});
        alert('Sincronización iniciada. Los pedidos aparecerán en la sección "Mis Pedidos" en unos momentos.');
        await fetchChannels();
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
/* ESTILOS ORIGINALES (NO SE HAN QUITADO) */
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
  display: flex;
  flex-direction: column;
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
.channel-stats { margin-bottom: 15px; flex-grow: 1; }
.channel-stat { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
.channel-stat .label { color: #6b7280; }
.channel-stat .value { color: #1f2937; font-weight: 500; }
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

/* ESTILOS AÑADIDOS Y MEJORADOS */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.btn-primary.add-channel-btn-header {
    background-color: #4f46e5;
    color: white;
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
}
.admin-controls-section {
    background: white;
    padding: 24px;
    border-radius: 12px;
    margin-bottom: 24px;
    border: 1px solid #e5e7eb;
}
.empty-state {
    text-align: center;
    padding: 40px;
    font-size: 16px;
    color: #6b7280;
}
.channel-actions { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr);
    gap: 8px; 
    margin-top: auto; 
    padding-top: 15px;
    border-top: 1px solid #e5e7eb;
}
.action-btn {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.action-btn.edit { color: #3b82f6; border-color: #bfdbfe; }
.action-btn.edit:hover { background-color: #3b82f6; color: white; }
.action-btn.sync { color: #16a34a; border-color: #86efac; }
.action-btn.sync:hover { background-color: #16a34a; color: white; }
.action-btn.delete { color: #ef4444; border-color: #fecaca; }
.action-btn.delete:hover { background-color: #ef4444; color: white; }
.disabled-input {
    background-color: #f3f4f6;
    cursor: not-allowed;
}
</style>