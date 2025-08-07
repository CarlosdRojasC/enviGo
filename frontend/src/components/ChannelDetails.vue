<template>
  <div class="channel-details">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando detalles del canal...</p>
    </div>

    <div v-else class="details-content">
      <!-- Header del canal -->
      <div class="channel-header">
        <div class="channel-info">
          <div class="channel-badge" :class="channel.channel_type">
            <span class="badge-icon">{{ getChannelIcon(channel.channel_type) }}</span>
            <span class="badge-text">{{ getChannelTypeName(channel.channel_type) }}</span>
          </div>
          <h2 class="channel-name">{{ channel.channel_name }}</h2>
          <p class="channel-url">{{ channel.store_url }}</p>
        </div>
        
        <div class="header-actions">
          <button @click="$emit('edit', channel)" class="action-btn edit">
            <span class="btn-icon">✏️</span>
            Editar
          </button>
<button 
  v-if="channel.channel_type === 'mercadolibre'"
  @click="handleMercadoLibreSync" 
  :disabled="syncing || channel.settings?.initial_sync_completed"
  :class="getMercadoLibreButtonClass()"
  class="action-btn"
>
  <span class="btn-icon">{{ getMercadoLibreButtonIcon() }}</span>
  {{ getMercadoLibreButtonText() }}
</button>

<!-- BOTÓN PARA OTROS CANALES -->
<button 
  v-else
  @click="$emit('sync', channel._id)" 
  class="action-btn sync"
  :disabled="syncing"
>
  <span class="btn-icon">{{ syncing ? '⏳' : '🔄' }}</span>
  {{ syncing ? 'Sincronizando...' : 'Sincronizar' }}
</button>
        </div>
      </div>
<!-- ✅ NUEVA SECCIÓN: Estado del Webhook (solo para MercadoLibre) -->
      <div v-if="channel.channel_type === 'mercadolibre'" class="webhook-section">
        <h3 class="section-title">🔔 Estado del Webhook</h3>
        <div class="webhook-card" :class="getWebhookStatusClass()">
          <div class="webhook-indicator">
            <div class="webhook-icon">{{ getWebhookStatusIcon() }}</div>
            <div class="webhook-info">
              <h4 class="webhook-title">{{ getWebhookStatusTitle() }}</h4>
              <p class="webhook-description">{{ getWebhookStatusDescription() }}</p>
            </div>
            <div class="webhook-status">
              <div class="status-dot" :class="{ 'active': channel.settings?.initial_sync_completed, 'pending': !channel.settings?.initial_sync_completed }"></div>
              <span class="status-text">
                {{ channel.settings?.initial_sync_completed ? 'Activo' : 'Pendiente' }}
              </span>
            </div>
          </div>
          
          <!-- Información del webhook -->
          <div class="webhook-details">
            <div class="webhook-detail">
              <span class="detail-label">Filtros activos:</span>
              <span class="detail-value">Solo Flex, No entregados</span>
            </div>
            <div class="webhook-detail">
              <span class="detail-label">Sincronización inicial:</span>
              <span class="detail-value">
                {{ channel.settings?.initial_sync_completed ? 'Completada' : 'Pendiente' }}
              </span>
            </div>
          </div>

          <!-- Alerta si no hay sincronización inicial -->
          <div v-if="!channel.settings?.initial_sync_completed" class="webhook-alert">
            <div class="alert-content">
              <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <div class="alert-text">
                <strong>Acción requerida:</strong> Ejecuta la sincronización inicial para importar pedidos existentes
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Estadísticas principales -->
      <div class="stats-section">
        <h3 class="section-title">📊 Estadísticas Generales</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon orders">📦</div>
            <div class="stat-content">
              <div class="stat-number">{{ channelStats.total_orders || 0 }}</div>
              <div class="stat-label">Pedidos Totales</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon delivered">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ channelStats.delivered_orders || 0 }}</div>
              <div class="stat-label">Pedidos Entregados</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon revenue">💰</div>
            <div class="stat-content">
              <div class="stat-number">${{ formatCurrency(channelStats.total_revenue || 0) }}</div>
              <div class="stat-label">Ingresos Totales</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon rate">📈</div>
            <div class="stat-content">
              <div class="stat-number">{{ deliveryRate }}%</div>
              <div class="stat-label">Tasa de Entrega</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado de sincronización -->
      <div class="sync-section">
        <h3 class="section-title">🔄 Estado de Sincronización</h3>
        <div class="sync-status-card" :class="syncStatusClass">
          <div class="sync-indicator">
            <div class="sync-icon">{{ syncStatusIcon }}</div>
            <div class="sync-info">
              <h4 class="sync-title">{{ syncStatusTitle }}</h4>
              <p class="sync-description">{{ syncStatusDescription }}</p>
            </div>
          </div>
          
          <div class="sync-details">
            <div class="sync-detail">
              <span class="detail-label">Última sincronización:</span>
              <span class="detail-value">{{ formatDate(channel.last_sync_at) }}</span>
            </div>
            <div class="sync-detail">
              <span class="detail-label">Próxima sincronización:</span>
              <span class="detail-value">{{ getNextSyncTime() }}</span>
            </div>
            <div class="sync-detail">
              <span class="detail-label">Intervalo:</span>
              <span class="detail-value">{{ getSyncIntervalText() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración del canal -->
      <div class="config-section">
  <h3 class="section-title">⚙️ Configuración</h3>
  <div class="config-grid">
    
    <!-- ✅ SOLO PARA CANALES QUE NO SON MERCADOLIBRE -->
    <div v-if="channel.channel_type !== 'mercadolibre'" class="config-item">
      <div class="config-label">Sincronización automática</div>
      <div class="config-value">
        <span class="status-badge" :class="channel.auto_sync ? 'active' : 'inactive'">
          {{ channel.auto_sync ? 'Activada' : 'Desactivada' }}
        </span>
      </div>
    </div>
    
    <div class="config-item">
      <div class="config-label">Crear en Shipday automáticamente</div>
      <div class="config-value">
        <span class="status-badge" :class="channel.auto_create_shipday ? 'active' : 'inactive'">
          {{ channel.auto_create_shipday ? 'Activado' : 'Desactivado' }}
        </span>
      </div>
    </div>
    
    <!-- ✅ SOLO PARA CANALES QUE NO SON MERCADOLIBRE -->
    <div v-if="channel.channel_type !== 'mercadolibre'" class="config-item">
      <div class="config-label">Intervalo de sincronización</div>
      <div class="config-value">{{ getSyncIntervalText() }}</div>
    </div>
    
    <!-- ✅ CONFIGURACIÓN ESPECÍFICA PARA MERCADOLIBRE -->
    <div v-if="channel.channel_type === 'mercadolibre'" class="config-item">
      <div class="config-label">Modo de sincronización</div>
      <div class="config-value">
        <span class="status-badge active">Webhook en tiempo real</span>
      </div>
    </div>
    
    <div class="config-item">
      <div class="config-label">
        {{ channel.channel_type === 'mercadolibre' ? 'Webhook MercadoLibre' : 'Webhook configurado' }}
      </div>
      <div class="config-value">
        <span class="status-badge" :class="getWebhookConfigStatus() ? 'active' : 'inactive'">
          {{ getWebhookConfigText() }}
        </span>
      </div>
    </div>
    
    <!-- ✅ INFORMACIÓN ADICIONAL PARA MERCADOLIBRE -->
    <div v-if="channel.channel_type === 'mercadolibre'" class="config-item">
      <div class="config-label">Filtros aplicados</div>
      <div class="config-value">Solo Flex, No entregados</div>
    </div>
    
  </div>
</div>

      <!-- Actividad reciente -->
      <div class="activity-section">
        <h3 class="section-title">📈 Actividad Reciente</h3>
        <div class="activity-chart">
          <div v-if="activityData.length === 0" class="no-activity">
            <div class="no-activity-icon">📊</div>
            <h4>Sin datos de actividad</h4>
            <p>No hay datos suficientes para mostrar la actividad reciente</p>
          </div>
          <div v-else class="chart-container">
            <!-- Aquí iría un gráfico de actividad -->
            <div class="chart-placeholder">
              <div class="chart-bars">
                <div 
                  v-for="(data, index) in activityData" 
                  :key="index"
                  class="chart-bar"
                  :style="{ height: `${(data.orders / maxOrders) * 100}%` }"
                  :title="`${data.date}: ${data.orders} pedidos`"
                ></div>
              </div>
              <div class="chart-labels">
                <span v-for="(data, index) in activityData" :key="index" class="chart-label">
                  {{ formatChartDate(data.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs de sincronización -->
      <div class="logs-section">
        <h3 class="section-title">📝 Historial de Sincronización</h3>
        <div class="logs-container">
          <div v-if="syncLogs.length === 0" class="no-logs">
            <div class="no-logs-icon">📝</div>
            <h4>Sin registros de sincronización</h4>
            <p>No hay registros de sincronización disponibles</p>
          </div>
          <div v-else class="logs-list">
            <div 
              v-for="log in syncLogs" 
              :key="log._id"
              class="log-item"
              :class="log.status"
            >
              <div class="log-icon">
                {{ log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⏳' }}
              </div>
              <div class="log-content">
                <div class="log-header">
                  <span class="log-status">{{ getLogStatusText(log.status) }}</span>
                  <span class="log-date">{{ formatDateTime(log.created_at) }}</span>
                </div>
                <div class="log-details">
                  <div class="log-metric">
                    <span class="metric-label">Pedidos procesados:</span>
                    <span class="metric-value">{{ log.orders_processed || 0 }}</span>
                  </div>
                  <div class="log-metric">
                    <span class="metric-label">Nuevos pedidos:</span>
                    <span class="metric-value">{{ log.new_orders || 0 }}</span>
                  </div>
                  <div class="log-metric">
                    <span class="metric-label">Duración:</span>
                    <span class="metric-value">{{ formatDuration(log.duration) }}</span>
                  </div>
                </div>
                <div v-if="log.error_message" class="log-error">
                  <span class="error-label">Error:</span>
                  <span class="error-message">{{ log.error_message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Información técnica -->
      <div class="tech-section">
        <h3 class="section-title">🔧 Información Técnica</h3>
        <div class="tech-details">
          <div class="tech-item">
            <span class="tech-label">ID del Canal:</span>
            <span class="tech-value">{{ channel._id }}</span>
          </div>
          <div class="tech-item">
            <span class="tech-label">Creado:</span>
            <span class="tech-value">{{ formatDateTime(channel.created_at) }}</span>
          </div>
          <div class="tech-item">
            <span class="tech-label">Última actualización:</span>
            <span class="tech-value">{{ formatDateTime(channel.updated_at) }}</span>
          </div>
          <div class="tech-item">
            <span class="tech-label">Versión de API:</span>
            <span class="tech-value">{{ channel.api_version || 'Estándar' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService }  from '../services/api'

// ==================== PROPS & EMITS ====================
const props = defineProps({
  channel: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['refresh', 'edit', 'sync'])

// ==================== ESTADO ====================
const toast = useToast()

const loading = ref(true)
const syncing = ref(false)
const channelStats = ref({})
const syncLogs = ref([])
const activityData = ref([])

// ==================== COMPUTED ====================
const deliveryRate = computed(() => {
  const total = channelStats.value.total_orders || 0
  const delivered = channelStats.value.delivered_orders || 0
  return total > 0 ? Math.round((delivered / total) * 100) : 0
})

const syncStatusClass = computed(() => {
  const daysSinceLastSync = props.channel.last_sync_at 
    ? Math.floor((new Date() - new Date(props.channel.last_sync_at)) / (1000 * 60 * 60 * 24))
    : null

  if (!props.channel.last_sync_at) return 'never-synced'
  if (daysSinceLastSync > 7) return 'sync-issues'
  if (daysSinceLastSync > 1) return 'sync-warning'
  return 'sync-ok'
})

const syncStatusIcon = computed(() => {
  const statusIcons = {
    'sync-ok': '✅',
    'sync-warning': '⚠️',
    'sync-issues': '❌',
    'never-synced': '🔄'
  }
  return statusIcons[syncStatusClass.value] || '❓'
})

const syncStatusTitle = computed(() => {
  const statusTitles = {
    'sync-ok': 'Sincronización Correcta',
    'sync-warning': 'Sincronización Atrasada',
    'sync-issues': 'Problemas de Sincronización',
    'never-synced': 'Sin Sincronizar'
  }
  return statusTitles[syncStatusClass.value] || 'Estado Desconocido'
})

const syncStatusDescription = computed(() => {
  const statusDescriptions = {
    'sync-ok': 'El canal se está sincronizando correctamente',
    'sync-warning': 'La última sincronización fue hace más de 1 día',
    'sync-issues': 'No se ha sincronizado en más de una semana',
    'never-synced': 'Este canal nunca se ha sincronizado'
  }
  return statusDescriptions[syncStatusClass.value] || 'No se puede determinar el estado'
})

const hasWebhook = computed(() => {
  return !!(props.channel.webhook_secret || props.channel.webhook_url)
})

const maxOrders = computed(() => {
  return Math.max(...activityData.value.map(d => d.orders), 1)
})

// ==================== MÉTODOS ====================
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateStr) {
  if (!dateStr) return 'Nunca'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'No disponible'
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatChartDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit'
  })
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function getSyncIntervalText() {
  const interval = props.channel.sync_interval || 60
  if (interval < 60) return `${interval} minutos`
  const hours = Math.floor(interval / 60)
  return hours === 1 ? '1 hora' : `${hours} horas`
}

function getNextSyncTime() {
  if (!props.channel.auto_sync || !props.channel.last_sync_at) {
    return 'Manual'
  }
  
  const lastSync = new Date(props.channel.last_sync_at)
  const interval = (props.channel.sync_interval || 60) * 60 * 1000
  const nextSync = new Date(lastSync.getTime() + interval)
  
  if (nextSync < new Date()) {
    return 'Pendiente'
  }
  
  return nextSync.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getLogStatusText(status) {
  const statusTexts = {
    success: 'Exitosa',
    error: 'Error',
    pending: 'En progreso'
  }
  return statusTexts[status] || status
}
function getWebhookStatusClass() {
  if (props.channel.settings?.initial_sync_completed) return 'webhook-active'
  return 'webhook-pending'
}

function getWebhookStatusIcon() {
  return props.channel.settings?.initial_sync_completed ? '✅' : '⚠️'
}

function getWebhookStatusTitle() {
  return props.channel.settings?.initial_sync_completed 
    ? 'Webhook Configurado' 
    : 'Webhook Pendiente'
}

function getWebhookStatusDescription() {
  return props.channel.settings?.initial_sync_completed
    ? 'Los pedidos de MercadoLibre Flex llegan automáticamente en tiempo real'
    : 'Requiere sincronización inicial para activar el webhook automático'
}

function getMercadoLibreButtonClass() {
  if (syncing.value) return 'sync disabled'
  if (props.channel.settings?.initial_sync_completed) return 'sync disabled'
  return 'sync'
}

function getMercadoLibreButtonIcon() {
  if (syncing.value) return '⏳'
  if (props.channel.settings?.initial_sync_completed) return '✅'
  return '🔄'
}

function getMercadoLibreButtonText() {
  if (syncing.value) return 'Sincronizando...'
  if (props.channel.settings?.initial_sync_completed) return 'Webhook Activo'
  return 'Sincronización Inicial'
}

async function handleMercadoLibreSync() {
  if (syncing.value || props.channel.settings?.initial_sync_completed) return
  
  syncing.value = true
  try {
    emit('sync', props.channel._id)
  } finally {
    syncing.value = false
  }
}

function getWebhookConfigStatus() {
  if (props.channel.channel_type === 'mercadolibre') {
    return props.channel.settings?.initial_sync_completed
  }
  return !!(props.channel.webhook_secret || props.channel.webhook_url)
}

function getWebhookConfigText() {
  if (props.channel.channel_type === 'mercadolibre') {
    return props.channel.settings?.initial_sync_completed ? 'Configurado' : 'Pendiente'
  }
  return !!(props.channel.webhook_secret || props.channel.webhook_url) ? 'Sí' : 'No'
}

async function loadChannelDetails() {
  try {
    loading.value = true
    
    // Por ahora cargar datos simulados hasta que el backend esté listo
    channelStats.value = {
      total_orders: props.channel.total_orders || 0,
      delivered_orders: Math.floor((props.channel.total_orders || 0) * 0.8),
      total_revenue: props.channel.total_revenue || 0
    }
    
    syncLogs.value = []
    activityData.value = []
    
  } catch (error) {
    console.error('Error cargando detalles:', error)
    toast.error(`Error al cargar detalles: ${error.message}`)
  } finally {
    loading.value = false
  }
}
// ==================== LIFECYCLE ====================
onMounted(() => {
  loadChannelDetails()
})

watch(() => props.channel._id, () => {
  loadChannelDetails()
})
</script>

<style scoped>
.channel-details {
  max-width: 800px;
  margin: 0 auto;
}

/* ==================== LOADING ==================== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
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

/* ==================== HEADER ==================== */
.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.channel-info {
  flex: 1;
}

.channel-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.channel-badge.shopify {
  background: #e0f2fe;
  color: #0277bd;
}

.channel-badge.woocommerce {
  background: #f3e5f5;
  color: #7b1fa2;
}

.channel-badge.mercadolibre {
  background: #fff3e0;
  color: #ef6c00;
}

.badge-icon {
  font-size: 16px;
}

.channel-name {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.channel-url {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
  word-break: break-all;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.action-btn.edit {
  color: #f59e0b;
  border-color: #f59e0b;
}

.action-btn.edit:hover {
  background: #f59e0b;
  color: white;
}

.action-btn.sync {
  color: #3b82f6;
  border-color: #3b82f6;
}

.action-btn.sync:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ==================== SECCIONES ==================== */
.stats-section,
.sync-section,
.config-section,
.activity-section,
.logs-section,
.tech-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

/* ==================== ESTADÍSTICAS ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.orders {
  background: #dbeafe;
  color: #1d4ed8;
}

.stat-icon.delivered {
  background: #dcfce7;
  color: #16a34a;
}

.stat-icon.revenue {
  background: #fef3c7;
  color: #d97706;
}

.stat-icon.rate {
  background: #e0e7ff;
  color: #6366f1;
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
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

/* ==================== SINCRONIZACIÓN ==================== */
.sync-status-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.sync-status-card.sync-ok {
  border-color: #10b981;
  background: #f0fdf4;
}

.sync-status-card.sync-warning {
  border-color: #f59e0b;
  background: #fffbeb;
}

.sync-status-card.sync-issues,
.sync-status-card.never-synced {
  border-color: #ef4444;
  background: #fef2f2;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.sync-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sync-info {
  flex: 1;
}

.sync-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.sync-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.sync-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.sync-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.detail-label {
  font-size: 14px;
  color: #6b7280;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

/* ==================== CONFIGURACIÓN ==================== */
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.config-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.config-value {
  font-size: 14px;
  color: #1f2937;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

/* ==================== ACTIVIDAD ==================== */
.activity-chart {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.no-activity {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.no-activity-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-activity h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.no-activity p {
  font-size: 14px;
  margin: 0;
}

.chart-container {
  height: 200px;
  display: flex;
  flex-direction: column;
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 0 8px;
}

.chart-bar {
  flex: 1;
  background: #3b82f6;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: all 0.2s;
  cursor: pointer;
}

.chart-bar:hover {
  background: #2563eb;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 8px;
}

.chart-label {
  font-size: 12px;
  color: #6b7280;
}

/* ==================== LOGS ==================== */
.logs-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.no-logs {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.no-logs-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-logs h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.no-logs p {
  font-size: 14px;
  margin: 0;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 24px;
  transition: background 0.2s;
}

.log-item:hover {
  background: #f9fafb;
}

.log-item.success {
  border-left: 4px solid #10b981;
}

.log-item.error {
  border-left: 4px solid #ef4444;
}

.log-item.pending {
  border-left: 4px solid #f59e0b;
}

.log-icon {
  font-size: 20px;
  margin-top: 2px;
}

.log-content {
  flex: 1;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-status {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.log-date {
  font-size: 12px;
  color: #6b7280;
}

.log-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.log-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  font-size: 12px;
  color: #6b7280;
}

.metric-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.log-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 8px;
  margin-top: 8px;
}

.error-label {
  font-size: 12px;
  color: #dc2626;
  font-weight: 600;
}

.error-message {
  font-size: 12px;
  color: #dc2626;
  margin-left: 8px;
}

/* ==================== INFORMACIÓN TÉCNICA ==================== */
.tech-details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.tech-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.tech-item:last-child {
  border-bottom: none;
}

.tech-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.tech-value {
  font-size: 14px;
  color: #1f2937;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}
/* ==================== WEBHOOK SECTION ==================== */
.webhook-section {
  margin-bottom: 32px;
}

.webhook-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.webhook-card.webhook-active {
  border-color: #10b981;
  background: #f0fdf4;
}

.webhook-card.webhook-pending {
  border-color: #f59e0b;
  background: #fffbeb;
}

.webhook-indicator {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.webhook-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.webhook-info {
  flex: 1;
}

.webhook-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.webhook-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.webhook-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d1d5db;
}

.status-dot.active {
  background: #10b981;
  animation: pulse 2s infinite;
}

.status-dot.pending {
  background: #f59e0b;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.webhook-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.webhook-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.webhook-alert {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 16px;
}

.alert-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.alert-icon {
  width: 20px;
  height: 20px;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-text {
  font-size: 14px;
  color: #92400e;
  line-height: 1.4;
}
/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  .channel-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    align-self: stretch;
  }
  
  .action-btn {
    flex: 1;
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .sync-details {
    grid-template-columns: 1fr;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-labels {
    display: none;
  }
  
  .log-details {
    flex-direction: column;
    gap: 8px;
  }
  
  .tech-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>