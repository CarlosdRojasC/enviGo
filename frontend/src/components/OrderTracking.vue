<template>
  <div class="tracking-container">
    
    <!-- Header del tracking -->
    <div v-if="tracking" class="tracking-header">
      <div class="tracking-title">
        <h2>📍 Seguimiento de Pedido</h2>
        <span class="order-number">#{{ tracking.order_number }}</span>
      </div>
      
      <div class="tracking-status">
        <span class="status-badge" :class="tracking.current_status">
          {{ getStatusIcon(tracking.current_status) }} {{ getStatusName(tracking.current_status) }}
        </span>
      </div>
    </div>

    <div v-if="loadingTracking" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando información de seguimiento...</p>
    </div>
    
    <div v-else-if="!tracking" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>No se pudo cargar el seguimiento</h3>
      <p>Inténtalo nuevamente en unos momentos.</p>
      <button @click="fetchTracking" class="retry-btn">🔄 Reintentar</button>
    </div>
    
    <div v-else class="tracking-content">
      
      <!-- 🆕 TRACKING EN VIVO - APARECE SIEMPRE QUE HAYA URL (independiente del estado) -->
      <div v-if="hasTrackingUrl" class="live-tracking-section">
        <div class="live-tracking-card">
          <div class="live-tracking-header">
            <span class="live-icon">🔴</span>
            <h3>Seguimiento en Vivo</h3>
          </div>
          <p>Rastrea tu pedido en tiempo real con nuestra tecnología GPS</p>
          
          <a 
            :href="getTrackingUrl" 
            target="_blank" 
            class="live-tracking-btn"
            @click="trackLiveClick">
            📍 Ver Ubicación en Tiempo Real
          </a>
        </div>
      </div>

      <!-- 🆕 PRUEBA DE ENTREGA - SOLO para pedidos entregados -->
      <div v-if="tracking.current_status === 'delivered' && hasProofOfDelivery" class="proof-section">
        <div class="section-header">
          <h3>📸 Prueba de Entrega</h3>
        </div>
        <div class="proof-card">
          <div class="proof-summary">
            <span class="proof-icon">✅</span>
            <div class="proof-info">
              <div class="proof-title">Entrega Confirmada</div>
              <div class="proof-description">
                Tu pedido fue entregado exitosamente 
                {{ formatDate(tracking.delivery_date) }}
              </div>
            </div>
          </div>
          <button @click="showFullProofModal" class="proof-details-btn">
            📋 Ver Prueba Completa
          </button>
        </div>
      </div>

      <!-- 🔧 CORREGIDO: Información del conductor con mejor detección -->
      <div v-if="hasDriverInfo" class="driver-section">
        <div class="section-header">
          <h3>👨‍💼 Tu Conductor</h3>
        </div>
        <div class="driver-card">
          <div class="driver-avatar">
            {{ getDriverInitials(getDriverName) }}
          </div>
          <div class="driver-info">
            <div class="driver-name">{{ getDriverName }}</div>
            <div class="driver-phone" v-if="getDriverPhone">
              📞 {{ getDriverPhone }}
            </div>
            <div class="driver-status" :class="getDriverStatusClass(driverStatus.status)">
              <div class="status-indicator" :class="{ 'online': driverStatus.isConnected }"></div>
              <span class="status-text">{{ getDriverStatusText(driverStatus.status) }}</span>
              <div v-if="loadingDriverStatus" class="status-loading">
                <div class="mini-spinner"></div>
              </div>
            </div>
            <div v-if="!driverStatus.isConnected && driverStatus.lastSeen" class="last-seen">
              Visto por última vez: {{ formatLastSeen(driverStatus.lastSeen) }}
            </div>
            <div class="driver-actions">
              <button 
                v-if="getDriverPhone" 
                @click="callDriver" 
                class="action-btn call-btn"
                title="Llamar al conductor"
              >
                📞
              </button>
              <button 
                @click="fetchDriverStatus" 
                class="action-btn refresh-btn"
                :disabled="loadingDriverStatus"
                title="Actualizar estado"
              >
                🔄
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 🔍 DEBUG INFO (temporal - remover en producción) -->
      <div v-if="showDebugInfo" class="debug-section">
        <div class="section-header">
          <h3>🔍 Debug Info</h3>
        </div>
        <div class="debug-content">
          <pre>{{ JSON.stringify({
            tracking_driver: tracking.driver,
            tracking_driver_info: tracking.driver_info,
            tracking_carrierId: tracking.carrierId,
            tracking_carrierName: tracking.carrierName,
            tracking_shipday_driver_id: tracking.shipday_driver_id,
            driverStatus: driverStatus
          }, null, 2) }}</pre>
        </div>
      </div>

      <!-- Timeline de eventos -->
      <div class="timeline-section">
        <div class="section-header">
          <h3>📋 Historial del Pedido</h3>
        </div>
        <div class="timeline">
          <div 
            v-for="(event, index) in tracking.timeline" 
            :key="index"
            class="timeline-item"
            :class="event.status">
            
            <div class="timeline-marker">
              <span class="timeline-icon">{{ event.icon }}</span>
            </div>
            
            <div class="timeline-content">
              <div class="timeline-title">{{ event.title }}</div>
              <div class="timeline-description">{{ event.description }}</div>
              <div v-if="event.timestamp" class="timeline-time">
                {{ formatEventTime(event.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Información de entrega -->
      <div class="delivery-info-section">
        <div class="section-header">
          <h3>🏠 Información de Entrega</h3>
        </div>
        
        <div class="delivery-cards">
          <div class="delivery-card">
            <div class="card-header">
              <span class="card-icon">📍</span>
              <h4>Dirección de Entrega</h4>
            </div>
            <div class="card-content">
              <div class="address">{{ tracking.delivery_address }}</div>
              <div v-if="tracking.delivery_location" class="coordinates">
                📍 {{ tracking.delivery_location.formatted_address }}
              </div>
            </div>
          </div>
          
          <div v-if="tracking.pickup_address" class="delivery-card">
            <div class="card-header">
              <span class="card-icon">🏪</span>
              <h4>Punto de Recogida</h4>
            </div>
            <div class="card-content">
              <div class="address">{{ tracking.pickup_address }}</div>
              <div v-if="tracking.company && tracking.company.name" class="company-name">
                {{ tracking.company.name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalles del pedido -->
      <div class="order-details-section">
        <div class="section-header">
          <h3>📦 Detalles del Pedido</h3>
        </div>
        
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Cliente:</span>
            <span class="detail-value">{{ tracking.customer_name }}</span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">Fecha del Pedido:</span>
            <span class="detail-value">{{ formatDate(tracking.order_date) }}</span>
          </div>
          
          <div v-if="tracking.delivery_date" class="detail-item">
            <span class="detail-label">Fecha de Entrega:</span>
            <span class="detail-value">{{ formatDate(tracking.delivery_date) }}</span>
          </div>
          
          <div v-if="tracking.estimated_delivery" class="detail-item">
            <span class="detail-label">Entrega Estimada:</span>
            <span class="detail-value">{{ formatDate(tracking.estimated_delivery) }}</span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">Total:</span>
            <span class="detail-value amount">${{ formatCurrency(tracking.total_amount) }}</span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">Costo de Envío:</span>
            <span class="detail-value">${{ formatCurrency(tracking.shipping_cost) }}</span>
          </div>
        </div>
        
        <div v-if="tracking.notes" class="order-notes">
          <div class="notes-header">
            <span class="notes-icon">📝</span>
            <span class="notes-title">Notas del Pedido</span>
          </div>
          <div class="notes-content">{{ tracking.notes }}</div>
        </div>
      </div>

      <!-- Soporte -->
      <div class="support-section">
        <div class="section-header">
          <h3>💬 ¿Necesitas Ayuda?</h3>
        </div>
        
        <div class="support-options">
          <button @click="contactSupport" class="support-btn">
            📧 Contactar Soporte
          </button>
          
          <button v-if="tracking.company && tracking.company.phone" @click="callCompany" class="support-btn">
            📞 Llamar a {{ tracking.company.name }}
          </button>
          
          <button @click="reportIssue" class="support-btn">
            ⚠️ Reportar Problema
          </button>
        </div>
      </div>

      <!-- Footer con última actualización -->
      <div class="tracking-footer">
        <div class="last-updated">
          Última actualización: {{ formatDate(lastUpdated, true) }}
        </div>
        <button @click="refreshTracking" class="refresh-btn" :disabled="refreshing">
          {{ refreshing ? '🔄' : '🔄' }} {{ refreshing ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { apiService } from '../services/api';

const props = defineProps({
  orderId: { type: String, required: true },
  orderNumber: { type: String, default: '' }
});

const emit = defineEmits(['close', 'support-contact', 'show-proof']);

// Estado del tracking
const tracking = ref(null);
const loadingTracking = ref(true);
const refreshing = ref(false);
const lastUpdated = ref(new Date());
const showDebugInfo = ref(true); // 🔧 Cambiar a false después de probar
const driverStatus = ref({
  name: '',
  phone: '',
  status: 'unknown', // online, offline, busy, unknown
  lastSeen: null,
  isConnected: false
});
const loadingDriverStatus = ref(false);

let refreshInterval = null;

// 🆕 COMPUTED PROPERTIES PARA TRACKING
const hasTrackingUrl = computed(() => {
  return !!(tracking.value?.tracking_url || tracking.value?.shipday_tracking_url);
});

const getTrackingUrl = computed(() => {
  return tracking.value?.tracking_url || tracking.value?.shipday_tracking_url || '';
});

const hasProofOfDelivery = computed(() => {
  if (!tracking.value) return false;
  return !!(
    tracking.value.proof_of_delivery?.photo_url || 
    tracking.value.proof_of_delivery?.signature_url ||
    tracking.value.podUrls?.length > 0 ||
    tracking.value.signatureUrl
  );
});

// 🆕 COMPUTED PROPERTIES PARA EL CONDUCTOR
const hasDriverInfo = computed(() => {
  return !!(
    tracking.value?.driver?.name || 
    tracking.value?.driver_info?.name ||
    tracking.value?.carrierName ||
    driverStatus.value?.name !== ''
  );
});

const getDriverName = computed(() => {
  return (
    driverStatus.value?.name ||
    tracking.value?.driver?.name || 
    tracking.value?.driver_info?.name ||
    tracking.value?.carrierName ||
    'Conductor Asignado'
  );
});

const getDriverPhone = computed(() => {
  return (
    driverStatus.value?.phone ||
    tracking.value?.driver?.phone || 
    tracking.value?.driver_info?.phone ||
    tracking.value?.carrierPhone ||
    ''
  );
});

onMounted(() => {
  fetchTracking();
  
  // Auto-refresh cada 30 segundos si el pedido está en tránsito
  refreshInterval = setInterval(() => {
    if (tracking.value && ['processing', 'shipped'].includes(tracking.value.current_status)) {
      refreshTracking();
    }
  }, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

async function fetchTracking() {
  loadingTracking.value = true;
  try {
    console.log('📍 Obteniendo tracking para orden:', props.orderId);
    
    const { data } = await apiService.orders.getTracking(props.orderId);
    
    // 🔍 DEBUG ESPECÍFICO PARA TRACKING URL
    console.log('🔍 VERIFICANDO TRACKING URL:');
    console.log('- tracking.tracking_url:', data.tracking?.tracking_url);
    console.log('- tracking.shipday_tracking_url:', data.tracking?.shipday_tracking_url);
    console.log('- tracking.has_tracking:', data.tracking?.has_tracking);
    
    tracking.value = data.tracking;
    lastUpdated.value = new Date(data.last_updated);
    
    console.log('✅ Tracking cargado:', {
      order_number: tracking.value?.order_number,
      has_tracking_url: hasTrackingUrl.value,
      tracking_url_used: getTrackingUrl.value,
      current_status: tracking.value?.current_status,
      timeline_events: tracking.value?.timeline?.length || 0
    });
    
    // 🔍 DEBUG TEMPORAL: Mostrar estructura de datos del conductor
    console.log('🔍 DEBUG - Estructura completa del tracking para conductor:', {
      'tracking.driver': tracking.value?.driver,
      'tracking.driver_info': tracking.value?.driver_info,
      'tracking.carrierId': tracking.value?.carrierId,
      'tracking.carrierName': tracking.value?.carrierName,
      'tracking.carrierPhone': tracking.value?.carrierPhone,
      'tracking.shipday_driver_id': tracking.value?.shipday_driver_id
    });
    
    // 🔧 IMPORTANTE: Cargar estado del conductor después de cargar tracking
    if (tracking.value) {
      await fetchDriverStatus();
    }
  } catch (error) {
    console.error('❌ Error cargando tracking:', error);
    tracking.value = null;
  } finally {
    loadingTracking.value = false;
  }
}

async function refreshTracking() {
  if (refreshing.value) return;
  
  refreshing.value = true;
  try {
    await fetchTracking();
  } finally {
    refreshing.value = false;
  }
}

// 🆕 FUNCIÓN PARA MOSTRAR MODAL DE PRUEBA COMPLETA
function showFullProofModal() {
  emit('show-proof', {
    orderId: props.orderId,
    orderNumber: tracking.value?.order_number,
    order: tracking.value
  });
}

// Funciones de UI (mantener las existentes)
function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    processing: '⚙️',
    shipped: '🚚',
    delivered: '✅',
    cancelled: '❌'
  };
  return icons[status] || '📦';
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'En Tránsito',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };
  return names[status] || status;
}

function getDriverInitials(name) {
  if (!name) return '👤';
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function getDriverStatus(status) {
  const statuses = {
    ONLINE: '🟢 En línea',
    OFFLINE: '🔴 Desconectado',
    BUSY: '🟡 Ocupado'
  };
  return statuses[status] || '📍 En servicio';
}

function formatEventTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = Math.abs(now - date) / (1000 * 60 * 60);
  
  if (diffHours < 1) {
    const diffMinutes = Math.round(diffHours * 60);
    return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    const hours = Math.round(diffHours);
    return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function formatDate(dateStr, withTime = false) {
  if (!dateStr) return 'N/A';
  const options = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Date(dateStr).toLocaleDateString('es-CL', options);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

// Funciones de acción
function trackLiveClick() {
  console.log('📍 Usuario abriendo tracking en vivo:', getTrackingUrl.value);
}

function callCompany() {
  if (tracking.value?.company?.phone) {
    window.location.href = `tel:${tracking.value.company.phone}`;
  }
}

function contactSupport() {
  emit('support-contact', {
    orderId: props.orderId,
    orderNumber: tracking.value?.order_number,
    customerName: tracking.value?.customer_name
  });
}

function reportIssue() {
  const subject = `Problema con Pedido #${tracking.value?.order_number}`;
  const body = `Hola,\n\nTengo un problema con mi pedido #${tracking.value?.order_number}.\n\nDetalles:\n- Estado actual: ${getStatusName(tracking.value?.current_status)}\n- Cliente: ${tracking.value?.customer_name}\n\nDescripción del problema:\n[Describe el problema aquí]\n\nGracias.`;
  
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ==================== MÉTODOS PARA ESTADO DEL CONDUCTOR ====================

/**
 * 🔧 COMPLETAMENTE CORREGIDO: Obtener estado actual del conductor
 * Busca el driver ID en todas las ubicaciones posibles y maneja fallbacks
 */
async function fetchDriverStatus() {
  // 🔧 BUSCAR DRIVER ID EN TODAS LAS UBICACIONES POSIBLES
  const possibleDriverIds = [
    tracking.value?.driver_info?.shipday_driver_id,
    tracking.value?.shipday_driver_id,
    tracking.value?.driver?.id,
    tracking.value?.driver_info?.id,
    tracking.value?.driver_info?.driver_id,
    tracking.value?.carrierId,
    tracking.value?.driver_info?.carrierId,
    tracking.value?.driver?.carrierId
  ];

  const driverId = possibleDriverIds.find(id => id && id !== null && id !== undefined && id !== '');

  // 🔧 TAMBIÉN VERIFICAR SI HAY INFORMACIÓN BÁSICA DEL CONDUCTOR
  const hasDriverInfo = !!(
    tracking.value?.driver?.name || 
    tracking.value?.driver_info?.name ||
    tracking.value?.carrierName
  );

  console.log('🔍 DEBUG fetchDriverStatus:', {
    possibleDriverIds,
    foundDriverId: driverId,
    hasDriverInfo,
    trackingDriverInfo: tracking.value?.driver_info,
    trackingDriver: tracking.value?.driver
  });

  if (!driverId && !hasDriverInfo) {
    console.log('📍 No hay ID de conductor ni información del conductor disponible');
    return;
  }

  // 🔧 SI NO HAY ID PERO SÍ HAY INFO, USAR LOS DATOS EXISTENTES
  if (!driverId) {
    console.log('📍 No hay driver ID, pero usando información existente del conductor');
    driverStatus.value = {
      name: tracking.value?.driver?.name || tracking.value?.driver_info?.name || tracking.value?.carrierName || 'Conductor',
      phone: tracking.value?.driver?.phone || tracking.value?.driver_info?.phone || tracking.value?.carrierPhone || '',
      status: tracking.value?.driver?.status || tracking.value?.driver_info?.status || 'unknown',
      lastSeen: null,
      isConnected: false
    };
    return;
  }

  try {
    loadingDriverStatus.value = true;
    console.log('👨‍💼 Obteniendo estado del conductor con ID:', driverId);
    
    // 🔧 VERIFICAR SI EL ENDPOINT EXISTE EN apiService
    if (!apiService.drivers || typeof apiService.drivers.getStatus !== 'function') {
      console.warn('⚠️ apiService.drivers.getStatus no está disponible, usando datos existentes');
      throw new Error('Endpoint no disponible');
    }
    
    // 🔧 CORREGIDO: Usar apiService con manejo de errores mejorado
    const { data: driverData } = await apiService.drivers.getStatus(driverId);
    
    driverStatus.value = {
      name: driverData.name || tracking.value?.driver_info?.name || tracking.value?.driver?.name || tracking.value?.carrierName || 'Conductor',
      phone: driverData.phone || tracking.value?.driver_info?.phone || tracking.value?.driver?.phone || tracking.value?.carrierPhone || '',
      status: driverData.status || 'unknown', // online, offline, busy
      lastSeen: driverData.lastSeen ? new Date(driverData.lastSeen) : null,
      isConnected: driverData.status === 'online',
      location: driverData.location || null
    };
    
    console.log('✅ Estado del conductor actualizado desde API:', driverStatus.value);
    
  } catch (error) {
    console.error('❌ Error obteniendo estado del conductor:', error);
    // Fallback a datos del tracking
    driverStatus.value = {
      name: tracking.value?.driver_info?.name || tracking.value?.driver?.name || tracking.value?.carrierName || 'Conductor',
      phone: tracking.value?.driver_info?.phone || tracking.value?.driver?.phone || tracking.value?.carrierPhone || '',
      status: 'offline',
      lastSeen: null,
      isConnected: false
    };
    console.log('📋 Usando datos fallback del conductor:', driverStatus.value);
  } finally {
    loadingDriverStatus.value = false;
  }
}

/**
 * Formatear el texto del estado del conductor
 */
function getDriverStatusText(status) {
  const statusTexts = {
    'online': 'En Línea',
    'offline': 'Desconectado', 
    'busy': 'Ocupado',
    'driving': 'Conduciendo',
    'unknown': 'Estado Desconocido'
  };
  return statusTexts[status] || 'Desconocido';
}

/**
 * Obtener clase CSS para el estado
 */
function getDriverStatusClass(status) {
  const statusClasses = {
    'online': 'status-online',
    'offline': 'status-offline',
    'busy': 'status-busy', 
    'driving': 'status-driving',
    'unknown': 'status-unknown'
  };
  return statusClasses[status] || 'status-unknown';
}

function formatLastSeen(lastSeen) {
  const now = new Date();
  const diff = now - lastSeen;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} minutos`;
  if (minutes < 1440) return `hace ${Math.floor(minutes / 60)} horas`;
  return lastSeen.toLocaleDateString();
}

function callDriver() {
  const phone = getDriverPhone.value;
  if (phone) {
    window.location.href = `tel:${phone}`;
  }
}

// ==================== EXPOSE FUNCTIONS PARA USO EXTERNO ====================

/**
 * Verificar si una orden tiene información de tracking
 */
function hasTrackingInfo(order) {
  if (order.status === 'delivered') return false;
  return !!(
    order.shipday_tracking_url ||
    order.shipday_driver_id || 
    order.shipday_order_id ||
    ['processing', 'shipped'].includes(order.status)
  );
}

/**
 * Verificar si una orden tiene prueba de entrega
 */
function orderHasProofOfDelivery(order) {
  if (order.status !== 'delivered') return false;
  return !!(
    order.proof_of_delivery?.photo_url || 
    order.proof_of_delivery?.signature_url ||
    order.podUrls?.length > 0 ||
    order.signatureUrl
  );
}

/**
 * Abrir tracking en vivo desde componente externo
 */
async function openLiveTrackingFromExternal(order, updateCallback) {
  console.log('📍 Abriendo tracking externo para orden:', order.order_number);
  
  if (order.shipday_tracking_url) {
    console.log('✅ Abriendo tracking URL directa:', order.shipday_tracking_url);
    window.open(order.shipday_tracking_url, '_blank');
  } else if (order.shipday_order_id) {
    console.log('⚠️ No hay tracking URL, intentando refrescar datos...');
    try {
      const { data } = await apiService.orders.getById(order._id);
      
      if (data.shipday_tracking_url) {
        console.log('✅ URL obtenida después de refresh:', data.shipday_tracking_url);
        // Actualizar orden localmente si hay callback
        if (updateCallback) {
          updateCallback(data);
        }
        window.open(data.shipday_tracking_url, '_blank');
      } else {
        console.log('⚠️ No se encontró URL de tracking después del refresh');
      }
    } catch (error) {
      console.error('❌ Error al refrescar datos de la orden:', error);
    }
  } else {
    console.log('⚠️ No hay información de Shipday para esta orden');
  }
}

/**
 * Obtener configuración del botón de acción
 */
function getActionButton(order) {
  if (order.status === 'delivered') {
    return {
      type: 'proof',
      label: 'Ver Prueba de Entrega',
      icon: '📸',
      class: 'btn-success',
      available: orderHasProofOfDelivery(order)
    };
  }
  
  if (['processing', 'shipped'].includes(order.status)) {
    return {
      type: 'tracking',
      label: 'Tracking en Vivo',
      icon: '📍',
      class: 'btn-primary',
      available: hasTrackingInfo(order)
    };
  }
  
  return { type: 'none', available: false };
}

// Exponer funciones al template parent
defineExpose({
  hasTrackingInfo,
  orderHasProofOfDelivery,
  openLiveTrackingFromExternal,
  getActionButton,
  fetchDriverStatus,
  refreshTracking
});
</script>

<style scoped>
.tracking-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Header */
.tracking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
}

.tracking-title h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
}

.order-number {
  font-size: 16px;
  opacity: 0.9;
  font-weight: 500;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

/* Estados de carga */
.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.retry-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
}

/* Tracking en vivo */
.live-tracking-section {
  margin-bottom: 30px;
}

.live-tracking-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.live-tracking-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.live-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-tracking-card h3 {
  margin: 0;
  color: #0369a1;
  font-size: 20px;
}

.live-tracking-card p {
  color: #0284c7;
  margin: 12px 0 20px;
}

.live-tracking-btn {
  display: inline-block;
  background: #0ea5e9;
  color: white;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
}

.live-tracking-btn:hover {
  background: #0284c7;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(14, 165, 233, 0.3);
}

/* Secciones */
.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

/* Conductor */
.driver-section {
  margin-bottom: 30px;
}

.driver-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.driver-avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.driver-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.driver-status {
  font-size: 14px;
  margin-bottom: 8px;
}

.driver-status.online { color: #059669; }
.driver-status.offline { color: #dc2626; }
.driver-status.busy { color: #d97706; }

.contact-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  text-decoration: none;
}

/* Timeline */
.timeline-section {
  margin-bottom: 30px;
}

.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-marker {
  position: absolute;
  left: -22px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.timeline-item.completed .timeline-marker {
  background: #10b981;
  color: white;
}

.timeline-item.current .timeline-marker {
  background: #6366f1;
  color: white;
  animation: pulse 2s infinite;
}

.timeline-item.pending .timeline-marker {
  background: #f3f4f6;
  border: 2px solid #d1d5db;
  color: #6b7280;
}

.timeline-item.cancelled .timeline-marker {
  background: #ef4444;
  color: white;
}

.timeline-content {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timeline-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.timeline-description {
  color: #6b7280;
  margin-bottom: 8px;
}

.timeline-time {
  font-size: 12px;
  color: #9ca3af;
}

/* Información de entrega */
.delivery-info-section {
  margin-bottom: 30px;
}

.delivery-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.delivery-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 16px;
}

.card-header h4 {
  margin: 0;
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
}

.address {
  color: #374151;
  margin-bottom: 4px;
}

.coordinates,
.company-name {
  font-size: 12px;
  color: #6b7280;
}

/* Detalles del pedido */
.order-details-section {
  margin-bottom: 30px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.detail-label {
  font-weight: 500;
  color: #6b7280;
}

.detail-value {
  font-weight: 600;
  color: #1f2937;
}

.detail-value.amount {
  color: #059669;
  font-size: 16px;
}

.order-notes {
  background: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 16px;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.notes-title {
  font-weight: 600;
  color: #92400e;
}

.notes-content {
  color: #92400e;
  line-height: 1.5;
}

/* Soporte */
.support-section {
  margin-bottom: 30px;
}

.support-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.support-btn {
  background: white;
  border: 2px solid #e5e7eb;
  color: #374151;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.support-btn:hover {
  border-color: #6366f1;
  background: #f8fafc;
  transform: translateY(-1px);
}

/* Footer */
.tracking-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.last-updated {
  font-size: 12px;
  color: #6b7280;
}

.refresh-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #5b21b6;
}

.refresh-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .tracking-container {
    padding: 16px;
  }
  
  .tracking-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .delivery-cards {
    grid-template-columns: 1fr;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .support-options {
    grid-template-columns: 1fr;
  }
  
  .tracking-footer {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
}
/* 🆕 ESTILOS PARA DEBUG INFO */
.debug-info {
  background: #f0f0f0;
  border: 1px solid #ddd;
  padding: 8px;
  margin: 8px 0;
  font-size: 11px;
  border-radius: 4px;
  font-family: monospace;
  color: #555;
}

/* 🆕 ESTILOS PARA SECCIÓN DE PRUEBA DE ENTREGA */
.proof-section {
  margin-bottom: 30px;
}

.proof-card {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 2px solid #10b981;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.proof-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}

.proof-icon {
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 50%;
}

.proof-title {
  font-size: 18px;
  font-weight: 600;
  color: #065f46;
  margin-bottom: 4px;
}

.proof-description {
  color: #047857;
  font-size: 14px;
}

.proof-details-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
}

.proof-details-btn:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 🆕 MEJORAR TRACKING EN VIVO PARA QUE SE VEA MEJOR */
.live-tracking-section {
  margin-bottom: 30px;
}

.live-tracking-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.live-tracking-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(14, 165, 233, 0.1), transparent);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

.live-tracking-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.live-icon {
  animation: pulse 2s infinite;
  font-size: 16px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.live-tracking-card h3 {
  margin: 0;
  color: #0369a1;
  font-size: 20px;
  position: relative;
  z-index: 1;
}

.live-tracking-card p {
  color: #0284c7;
  margin: 12px 0 20px;
  position: relative;
  z-index: 1;
}

.live-tracking-btn {
  display: inline-block;
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
  text-decoration: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
}

.live-tracking-btn:hover {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(14, 165, 233, 0.4);
}

.live-tracking-btn:active {
  transform: translateY(0);
}

/* 🆕 RESPONSIVE IMPROVEMENTS */
@media (max-width: 768px) {
  .proof-card {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .proof-summary {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .live-tracking-btn {
    padding: 12px 24px;
    font-size: 14px;
  }
  
  .debug-info {
    font-size: 10px;
    padding: 6px;
  }
}
</style>