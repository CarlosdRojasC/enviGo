<template>
  <div class="channels-page">
    <!-- Header con estadísticas y acciones -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <span class="title-icon">📡</span>
            {{ isAdmin ? 'Canales de Venta (Admin)' : 'Mis Canales de Venta' }}
          </h1>
          <p class="page-subtitle">
            {{ isAdmin 
              ? 'Gestiona las integraciones de todas las empresas' 
              : 'Gestiona tus integraciones con plataformas de e-commerce' 
            }}
          </p>
        </div>
        
        <!-- Estadísticas rápidas -->
        <div class="quick-stats">
          <div class="stat-card">
            <div class="stat-icon">🔗</div>
            <div class="stat-content">
              <div class="stat-number">{{ channels.length }}</div>
              <div class="stat-label">Canales Activos</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📦</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalOrders }}</div>
              <div class="stat-label">Pedidos Totales</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <div class="stat-number">${{ formatCurrency(totalRevenue) }}</div>
              <div class="stat-label">Ingresos Totales</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros y acciones -->
      <div class="header-actions">
        <div class="filters-section">
          <!-- Filtro por empresa (solo admin) -->
          <div v-if="isAdmin" class="filter-group">
            <label class="filter-label">Empresa:</label>
            <select v-model="selectedCompanyId" @change="fetchChannels" class="filter-select">
              <option value="">Todas las empresas</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">
                {{ company.name }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Tipo:</label>
            <select v-model="filterType" class="filter-select">
              <option value="">Todos los tipos</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="mercadolibre">MercadoLibre</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Estado:</label>
            <select v-model="filterStatus" class="filter-select">
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="sync_issues">Con problemas</option>
              <option value="needs_sync">Necesita sincronización</option>
            </select>
          </div>

          <button @click="refreshChannels" class="refresh-btn" :disabled="isRefreshing">
            <span class="btn-icon">{{ isRefreshing ? '⏳' : '🔄' }}</span>
            {{ isRefreshing ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </div>

        <button 
          v-if="canAddChannel" 
          @click="openAddChannelModal" 
          class="add-channel-btn primary"
        >
          <span class="btn-icon">+</span>
          Agregar Canal
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando canales...</p>
    </div>

    <!-- Contenido principal -->
    <div v-else class="channels-container">
      <!-- Vista de grid -->
      <div class="channels-grid">
        <div 
          v-for="channel in filteredChannels" 
          :key="channel._id" 
          class="channel-card"
          :class="getChannelCardClass(channel)"
        >
          <!-- Header del canal -->
          <div class="channel-header">
            <div class="channel-info">
              <div class="channel-type-badge" :class="channel.channel_type">
                {{ getChannelIcon(channel.channel_type) }}
                {{ getChannelTypeName(channel.channel_type) }}
              </div>
              <h3 class="channel-name">{{ channel.channel_name }}</h3>
              <p class="channel-url">{{ channel.store_url }}</p>
              <!-- Empresa (solo para admin) -->
              <p v-if="isAdmin && channel.company_name" class="channel-company">
                🏢 {{ channel.company_name }}
              </p>
            </div>
            
            <div class="channel-status">
              <div class="status-indicator" :class="getChannelStatus(channel)"></div>
              <span class="status-text">{{ getChannelStatusText(channel) }}</span>
            </div>
          </div>

          <!-- Métricas del canal -->
          <div class="channel-metrics">
            <div class="metric">
              <span class="metric-label">Pedidos</span>
              <span class="metric-value">{{ channel.total_orders || 0 }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Último pedido</span>
              <span class="metric-value">{{ formatDate(channel.last_order_date) }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Ingresos</span>
              <span class="metric-value">${{ formatCurrency(channel.total_revenue || 0) }}</span>
            </div>
          </div>

          <!-- Información de sincronización -->
          <div class="sync-info">
            <div class="sync-status" :class="getSyncStatusClass(channel)">
              <span class="sync-icon">{{ getSyncIcon(channel) }}</span>
              <span class="sync-text">{{ getSyncStatusText(channel) }}</span>
            </div>
            <div class="sync-details">
              <small>Última sync: {{ formatDate(channel.last_sync_at) }}</small>
            </div>
          </div>

          <!-- Acciones del canal -->
          <div class="channel-actions">
            <button 
              @click="syncChannel(channel._id)" 
              :disabled="syncingChannels.includes(channel._id)"
              class="action-btn sync"
              :title="'Sincronizar pedidos de ' + channel.channel_name"
            >
              <span class="btn-icon">{{ syncingChannels.includes(channel._id) ? '⏳' : '🔄' }}</span>
              {{ syncingChannels.includes(channel._id) ? 'Sincronizando...' : 'Sincronizar' }}
            </button>
            <button
    v-if="channel.channel_type === 'mercadolibre' && !channel.api_key"
    @click="authorizeMercadoLibre(channel)"
    class="action-btn details"
    title="Autorizar este canal con Mercado Libre"
  >
    <span class="btn-icon">🔗</span>
    Autorizar
  </button>
            <button 
              @click="showChannelDetails(channel)" 
              class="action-btn details"
              :title="'Ver detalles de ' + channel.channel_name"
            >
              <span class="btn-icon">📊</span>
              Detalles
            </button>
            
            <button 
              @click="confirmDeleteChannel(channel)" 
              class="action-btn delete"
              :title="'Eliminar ' + channel.channel_name"
            >
              <span class="btn-icon">🗑️</span>
              Eliminar
            </button>
          </div>
        </div>

        <!-- Card para agregar nuevo canal -->
        <div v-if="canAddChannel && filteredChannels.length > 0" class="add-channel-card">
          <button @click="openAddChannelModal" class="add-channel-placeholder">
            <div class="placeholder-icon">+</div>
            <div class="placeholder-text">
              <h4>Agregar Nuevo Canal</h4>
              <p>Conecta otra plataforma de e-commerce</p>
            </div>
          </button>
        </div>
      </div>

      <!-- Estado vacío -->
      <div v-if="filteredChannels.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">📡</div>
        <h3 class="empty-title">
          {{ channels.length === 0 ? 'No hay canales configurados' : 'No hay canales que coincidan con los filtros' }}
        </h3>
        <p class="empty-description">
          {{ channels.length === 0 
            ? 'Conecta tu primera plataforma de e-commerce para comenzar a sincronizar pedidos automáticamente.'
            : 'Intenta ajustar los filtros para ver más canales.'
          }}
        </p>
        <button 
          v-if="canAddChannel && channels.length === 0" 
          @click="openAddChannelModal" 
          class="empty-action-btn"
        >
          <span class="btn-icon">+</span>
          Agregar Primer Canal
        </button>
        <button 
          v-else-if="channels.length > 0"
          @click="clearFilters" 
          class="empty-action-btn secondary"
        >
          <span class="btn-icon">🔄</span>
          Limpiar Filtros
        </button>
      </div>
    </div>

    <!-- Modal para agregar canal (simplificado) -->
    <Modal v-model="showAddChannelModal" title="Agregar Nuevo Canal" width="500px">
        <form @submit.prevent="addChannel">
          <div class="form-group">
            <label>Tipo de Canal:</label>
            <select v-model="channelData.channel_type" required>
              <option value="" disabled>Seleccionar...</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="mercadolibre">MercadoLibre</option>
            </select>
          </div>
          
          <div v-if="channelData.channel_type !== 'mercadolibre'">
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
            
            <!-- Selector de empresa para admin -->
            <div v-if="isAdmin" class="form-group">
              <label>Empresa:</label>
              <select v-model="channelData.company_id" required>
                <option value="" disabled>Seleccionar empresa...</option>
                <option v-for="company in companies" :key="company._id" :value="company._id">
                  {{ company.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="showAddChannelModal = false" class="btn-cancel">
              Cancelar
            </button>
            <button type="submit" :disabled="addingChannel || !channelData.channel_type" class="btn-save">
              {{ addingChannel ? 'Creando...' : 'Crear Canal' }}
            </button>
          </div>
        </form>
    </Modal>

    <!-- Modal de detalles simplificado -->
    <Modal v-model="showChannelDetailsModal" :title="`Detalles de ${selectedChannel?.channel_name}`" width="600px">
      <div v-if="selectedChannel" class="channel-details-simple">
        <div class="details-section">
          <h4>Información General</h4>
          <div class="detail-item">
            <span class="detail-label">Tipo:</span>
            <span class="detail-value">{{ getChannelTypeName(selectedChannel.channel_type) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">URL:</span>
            <span class="detail-value">{{ selectedChannel.store_url }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Total Pedidos:</span>
            <span class="detail-value">{{ selectedChannel.total_orders || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Última Sincronización:</span>
            <span class="detail-value">{{ formatDate(selectedChannel.last_sync_at) }}</span>
          </div>
        </div>
        
        <div class="details-actions">
          <button @click="syncChannel(selectedChannel._id)" class="btn-sync">
            Sincronizar Ahora
          </button>
        </div>
      </div>
    </Modal>

    <!-- Modal de confirmación de eliminación -->
    <Modal v-model="showDeleteModal" title="Confirmar Eliminación" width="400px">
      <div class="delete-confirmation">
        <div class="warning-icon">⚠️</div>
        <h3>¿Estás seguro?</h3>
        <p>
          Esta acción eliminará permanentemente el canal 
          <strong>{{ channelToDelete?.channel_name }}</strong>.
        </p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn-cancel">
            Cancelar
          </button>
          <button @click="confirmDelete" class="btn-danger" :disabled="deleting">
            {{ deleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import Modal from '../components/Modal.vue'
import channelsService from '../services/channels.service'

// ==================== ESTADO ====================
const auth = useAuthStore()
const toast = useToast()

// Estado de la página
const loading = ref(true)
const isRefreshing = ref(false)

// Canales y empresas
const channels = ref([])
const companies = ref([])
const selectedCompanyId = ref('')

// Filtros
const filterType = ref('')
const filterStatus = ref('')

// Modales
const showAddChannelModal = ref(false)
const showChannelDetailsModal = ref(false)
const showDeleteModal = ref(false)

// Estado de formularios
const addingChannel = ref(false)
const selectedChannel = ref(null)
const channelToDelete = ref(null)
const deleting = ref(false)

// Datos del formulario
const channelData = ref({
  channel_type: '',
  channel_name: '',
  store_url: '',
  api_key: '',
  api_secret: '',
  company_id: ''
})

// Sincronización
const syncingChannels = ref([])

// ==================== COMPUTED ====================
const isAdmin = computed(() => auth.isAdmin)

const canAddChannel = computed(() => {
  return auth.isCompanyOwner || auth.isAdmin
})
const getCompanyId = computed(() => {
  if (auth.isAdmin) return null
  
  return auth.user?.company?._id || 
         auth.user?.company_id || 
         auth.companyId || 
         null
})

const filteredChannels = computed(() => {
  let filtered = channels.value

  if (filterType.value) {
    filtered = filtered.filter(channel => channel.channel_type === filterType.value)
  }

  if (filterStatus.value) {
    filtered = filtered.filter(channel => {
      const status = getChannelStatus(channel)
      return status === filterStatus.value
    })
  }

  return filtered
})

const totalOrders = computed(() => {
  if (!Array.isArray(channels.value)) return 0
  return channels.value.reduce((sum, channel) => sum + (channel.total_orders || 0), 0)
})

const totalRevenue = computed(() => {
  if (!Array.isArray(channels.value)) return 0
  return channels.value.reduce((sum, channel) => sum + (channel.total_revenue || 0), 0)
})

// ==================== MÉTODOS ====================
async function fetchChannels() {
  try {
    loading.value = true
    
    let endpoint = ''
    if (auth.isAdmin) {
      // Admin puede ver todos los canales o filtrar por empresa
      if (selectedCompanyId.value) {
        endpoint = `companies/${selectedCompanyId.value}/channels`
        const response = await apiService.companies.getChannels?.(selectedCompanyId.value) || 
                         await apiService.channels.getByCompany(selectedCompanyId.value)
channels.value = response.data?.data || response.data || []
      } else {
         try {
    const response = await apiService.channels.getAllForAdmin()
    channels.value = response.data?.data || response.data || []
    console.log('✅ Admin: canales de todas las empresas cargados:', channels.value.length)
  } catch (error) {
    console.error('❌ Error obteniendo todos los canales:', error)
    // Si falla, intenta con fetch directo
    try {
      const response = await fetch('/api/channels/admin/all', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        channels.value = data.data || data || []
      } else {
        channels.value = []
      }
    } catch (fetchError) {
      console.error('❌ Error con fetch directo:', fetchError)
      channels.value = []
    }
  }
}
    } else {
      // Usuario normal: solo sus canales
      const companyId = getCompanyId.value
if (!companyId) {
  console.error('❌ No se encontró company_id en el usuario:', auth.user)
  toast.error('Error: Usuario sin empresa asignada. Contacta al administrador.')
  channels.value = []
  return
}

console.log('🔍 Obteniendo canales para empresa:', companyId)
const response = await apiService.channels.getByCompany(companyId)
channels.value = response.data?.data || response.data || []
    }
    
  } catch (error) {
    console.error('Error al cargar canales:', error)
    toast.error(`Error al cargar canales: ${error.message}`)
    channels.value = []
  } finally {
    loading.value = false
  }
}

async function fetchCompanies() {
  if (!auth.isAdmin) return
  
  try {
    const response = await apiService.companies.getAll()
    companies.value = response.data || []
  } catch (error) {
    console.error('Error al cargar empresas:', error)
  }
}

async function refreshChannels() {
  isRefreshing.value = true
  try {
    await fetchChannels()
    toast.success('Canales actualizados correctamente')
  } catch (error) {
    toast.error('Error al actualizar canales')
  } finally {
    isRefreshing.value = false
  }
}

function getChannelIcon(type) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🛒',
    mercadolibre: '🏪'
  }
  return icons[type] || '📦'
}

function getChannelTypeName(type) {
  const names = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    mercadolibre: 'MercadoLibre'
  }
  return names[type] || type
}

function getChannelStatus(channel) {
  const daysSinceLastSync = channel.last_sync_at 
    ? Math.floor((new Date() - new Date(channel.last_sync_at)) / (1000 * 60 * 60 * 24))
    : null

  if (!channel.last_sync_at) return 'needs_sync'
  if (daysSinceLastSync > 7) return 'sync_issues'
  return 'active'
}

async function authorizeMercadoLibre(channel) {
  try {
    toast.info(`Redirigiendo a Mercado Libre para autorizar "${channel.channel_name}"...`);
    
    // Este nuevo endpoint del backend generará la URL correcta para este canal
    const response = await apiService.mercadolibre.getAuthorizationUrl({
      channelId: channel._id
    });
    
    // Redirige al usuario a la página de Mercado Libre
    window.location.href = response.data.authUrl;

  } catch (error) {
    console.error("Error al iniciar la autorización de Mercado Libre:", error);
    toast.error("No se pudo iniciar la conexión con Mercado Libre.");
  }
}

function getChannelStatusText(channel) {
  const status = getChannelStatus(channel)
  const texts = {
    active: 'Activo',
    sync_issues: 'Problemas de sync',
    needs_sync: 'Necesita sincronización'
  }
  return texts[status] || 'Desconocido'
}

function getChannelCardClass(channel) {
  const status = getChannelStatus(channel)
  return {
    'status-active': status === 'active',
    'status-warning': status === 'sync_issues',
    'status-error': status === 'needs_sync'
  }
}

function getSyncStatusClass(channel) {
  return getChannelStatus(channel)
}

function getSyncIcon(channel) {
  const status = getChannelStatus(channel)
  const icons = {
    active: '✅',
    sync_issues: '⚠️',
    needs_sync: '❌'
  }
  return icons[status] || '❓'
}

function getSyncStatusText(channel) {
  const status = getChannelStatus(channel)
  const texts = {
    active: 'Sincronización OK',
    sync_issues: 'Revisar sincronización',
    needs_sync: 'Sin sincronizar'
  }
  return texts[status] || 'Estado desconocido'
}

function formatDate(dateStr) {
  if (!dateStr) return 'Nunca'
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// ==================== ACCIONES ====================
function openAddChannelModal() {
  channelData.value = {
    channel_type: '',
    channel_name: '',
    store_url: '',
    api_key: '',
    api_secret: '',
    company_id: auth.isAdmin ? '' : getCompanyId.value
  }
  showAddChannelModal.value = true
}

async function addChannel() {
  try {
    addingChannel.value = true
    
  let companyId
if (auth.isAdmin) {
  companyId = channelData.value.company_id
  if (!companyId) {
    toast.error('Selecciona una empresa para el canal')
    return
  }
} else {
  companyId = getCompanyId.value
  if (!companyId) {
    toast.error('Error: Usuario sin empresa asignada')
    return
  }
}

await apiService.channels.create(companyId, channelData.value)
    
    toast.success('Canal creado exitosamente')
    await fetchChannels()
    showAddChannelModal.value = false
  } catch (error) {
    toast.error(`Error al crear canal: ${error.message}`)
  } finally {
    addingChannel.value = false
  }
}

function showChannelDetails(channel) {
  selectedChannel.value = channel
  showChannelDetailsModal.value = true
}

async function syncChannel(channelId) {
  // 1. Evita dobles clics y muestra "Sincronizando..." en el botón
  if (syncingChannels.value.includes(channelId)) return;
  syncingChannels.value.push(channelId);
  
  try {
    // 2. Llama al backend para iniciar la sincronización
    const { data } = await apiService.channels.syncOrders(channelId, {
      date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      date_to: new Date().toISOString()
    });

    // 3. (LA PARTE MÁGICA) Busca el canal en tu lista local
    const index = channels.value.findIndex(c => c._id === channelId);

    // 4. Si lo encuentra y el backend envió el canal actualizado, lo reemplaza
    if (index !== -1 && data.channel) {
      // Vue se encargará de actualizar la tarjeta automáticamente
      channels.value[index] = { ...channels.value[index], ...data.channel };
    }

    // 5. Muestra una notificación de éxito
    toast.success(data.message || 'Sincronización completada exitosamente.');
    
  } catch (error) {
    console.error('Error en la sincronización:', error);
    toast.error(error.message || 'Ocurrió un error durante la sincronización.');
  
  } finally {
    // 6. Vuelve a habilitar el botón
    syncingChannels.value = syncingChannels.value.filter(id => id !== channelId);
  }
}

function confirmDeleteChannel(channel) {
  channelToDelete.value = channel
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!channelToDelete.value) return
  
  try {
    deleting.value = true
    await channelsService.delete(channelToDelete.value._id)
    toast.success('Canal eliminado exitosamente')
    await fetchChannels()
    showDeleteModal.value = false
    channelToDelete.value = null
  } catch (error) {
    toast.error(`Error al eliminar el canal: ${error.message}`)
  } finally {
    deleting.value = false
  }
}

function clearFilters() {
  filterType.value = ''
  filterStatus.value = ''
  selectedCompanyId.value = ''
}
function getChannelSyncStatus(channel) {
  const syncInfo = channel.sync_status_info;
  
  if (syncInfo) {
    return {
      class: syncInfo.needsSync ? 'needs-sync' : 'synced',
      text: syncInfo.message,
      needsSync: syncInfo.needsSync
    };
  }
  
  // Fallback al método anterior
  const lastSync = channel.last_sync_at || channel.last_sync;
  
  if (!lastSync) {
    return {
      class: 'needs-sync',
      text: 'Necesita sincronización',
      needsSync: true
    };
  }
  
  const daysSinceSync = Math.floor((new Date() - new Date(lastSync)) / (1000 * 60 * 60 * 24));
  
  if (daysSinceSync <= 1) {
    return {
      class: 'synced',
      text: 'Sincronizado',
      needsSync: false
    };
  } else if (daysSinceSync <= 7) {
    return {
      class: 'needs-sync',
      text: `Hace ${daysSinceSync} días`,
      needsSync: true
    };
  } else {
    return {
      class: 'outdated',
      text: `Hace ${daysSinceSync} días`,
      needsSync: true
    };
  }
}

// ==================== LIFECYCLE ====================
onMounted(async () => {
  console.log('🔍 Debug usuario en Channels:', {
  user: auth.user,
  isAdmin: auth.isAdmin,
  companyId: getCompanyId.value,
  authCompanyId: auth.companyId
})
  await fetchCompanies()
  await fetchChannels()
})
</script>

<style scoped>
/* Reutilizar los estilos de la versión anterior pero simplificados */
.channels-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 24px;
}

.page-header {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 36px;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.quick-stats {
  display: flex;
  gap: 20px;
}

.stat-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 140px;
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.filters-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  min-width: 140px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-channel-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.add-channel-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.btn-icon {
  font-size: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.channels-container {
  min-height: 400px;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
}

/* ==================== CHANNEL CARDS ==================== */
.channel-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.channel-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #e5e7eb;
  transition: background 0.3s;
}

.channel-card.status-active {
  border-color: #10b981;
}

.channel-card.status-active::before {
  background: #10b981;
}

.channel-card.status-warning {
  border-color: #f59e0b;
}

.channel-card.status-warning::before {
  background: #f59e0b;
}

.channel-card.status-error {
  border-color: #ef4444;
}

.channel-card.status-error::before {
  background: #ef4444;
}

.channel-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.channel-info {
  flex: 1;
}

.channel-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.channel-type-badge.shopify {
  background: #e0f2fe;
  color: #0277bd;
}

.channel-type-badge.woocommerce {
  background: #f3e5f5;
  color: #7b1fa2;
}

.channel-type-badge.mercadolibre {
  background: #fff3e0;
  color: #ef6c00;
}

.channel-name {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.channel-url {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 4px 0;
  word-break: break-all;
}

.channel-company {
  font-size: 12px;
  color: #8b5cf6;
  margin: 0;
  font-weight: 500;
}

.channel-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f9fafb;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e5e7eb;
}

.status-indicator.active {
  background: #10b981;
}

.status-indicator.sync_issues {
  background: #f59e0b;
}

.status-indicator.needs_sync {
  background: #ef4444;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.channel-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.metric {
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.metric-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.sync-info {
  margin-bottom: 20px;
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sync-status.active {
  color: #059669;
}

.sync-status.sync_issues {
  color: #d97706;
}

.sync-status.needs_sync {
  color: #dc2626;
}

.sync-icon {
  font-size: 14px;
}

.sync-text {
  font-size: 14px;
  font-weight: 500;
}

.sync-details {
  font-size: 12px;
  color: #6b7280;
}

.channel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: #374151;
  flex: 1;
  justify-content: center;
  min-width: 80px;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.sync {
  border-color: #3b82f6;
  color: #3b82f6;
}

.action-btn.sync:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.action-btn.details {
  border-color: #6b7280;
  color: #6b7280;
}

.action-btn.details:hover:not(:disabled) {
  background: #6b7280;
  color: white;
}

.action-btn.delete {
  border-color: #ef4444;
  color: #ef4444;
}

.action-btn.delete:hover:not(:disabled) {
  background: #ef4444;
  color: white;
}

/* ==================== ADD CHANNEL CARD ==================== */
.add-channel-card {
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-channel-placeholder {
  width: 100%;
  height: 100%;
  min-height: 300px;
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
}

.add-channel-placeholder:hover {
  border-color: #3b82f6;
  background: #f8fafc;
  transform: translateY(-2px);
}

.placeholder-icon {
  font-size: 48px;
  color: #9ca3af;
  width: 80px;
  height: 80px;
  border: 2px dashed #d1d5db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.add-channel-placeholder:hover .placeholder-icon {
  color: #3b82f6;
  border-color: #3b82f6;
  background: white;
}

.placeholder-text {
  text-align: center;
}

.placeholder-text h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.placeholder-text p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* ==================== EMPTY STATE ==================== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  border: 2px dashed #d1d5db;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.empty-description {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.empty-action-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.empty-action-btn.secondary {
  background: #6b7280;
}

.empty-action-btn.secondary:hover {
  background: #4b5563;
}

/* ==================== FORMULARIOS ==================== */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  background: white;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel,
.btn-save,
.btn-sync,
.btn-danger {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-save,
.btn-sync {
  background: #3b82f6;
  color: white;
}

.btn-save:hover:not(:disabled),
.btn-sync:hover:not(:disabled) {
  background: #2563eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-save:disabled,
.btn-sync:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ==================== DETALLES DEL CANAL ==================== */
.channel-details-simple {
  padding: 20px;
}

.details-section {
  margin-bottom: 24px;
}

.details-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.details-actions {
  text-align: center;
}

/* ==================== CONFIRMACIÓN DE ELIMINACIÓN ==================== */
.delete-confirmation {
  text-align: center;
  padding: 20px;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.delete-confirmation h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.delete-confirmation p {
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1200px) {
  .channels-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 24px;
  }
  
  .quick-stats {
    justify-content: space-between;
  }
}

@media (max-width: 768px) {
  .channels-page {
    padding: 16px;
  }
  
  .page-header {
    padding: 24px;
  }
  
  .channels-grid {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .filters-section {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .quick-stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .stat-card {
    min-width: auto;
  }
  
  .channel-metrics {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .channel-actions {
    flex-direction: column;
  }
  
  .action-btn {
    flex: none;
    justify-content: flex-start;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style>