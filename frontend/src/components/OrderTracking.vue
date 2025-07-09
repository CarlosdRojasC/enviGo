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
      
      <!-- Tracking URL prominente -->
<div v-if="tracking.tracking_url || tracking.shipday_tracking_url" class="live-tracking-section">
  <div class="live-tracking-card">
    <div class="live-tracking-header">
      <span class="live-icon">🔴</span>
      <h3>Seguimiento en Vivo</h3>
    </div>
          <p>Rastrea tu pedido en tiempo real con nuestra tecnología GPS</p>
              <!-- 🆕 DEBUG INFO TEMPORAL -->
    <div v-if="true" style="background: #f0f0f0; padding: 8px; margin: 8px 0; font-size: 12px;">
      <strong>Debug URLs:</strong><br>
      tracking_url: {{ tracking.tracking_url }}<br>
      shipday_tracking_url: {{ tracking.shipday_tracking_url }}
    </div>
    
          <a 
            :href="tracking.tracking_url" 
            target="_blank" 
            class="live-tracking-btn"
            @click="trackLiveClick">
            📍 Ver Ubicación en Tiempo Real
          </a>
        </div>
      </div>

      <!-- Información del conductor -->
      <div v-if="tracking.driver && (tracking.driver.name || tracking.driver.id)" class="driver-section">
        <div class="section-header">
          <h3>👨‍💼 Tu Conductor</h3>
        </div>
        <div class="driver-card">
          <div class="driver-avatar">
            {{ getDriverInitials(tracking.driver.name) }}
          </div>
          <div class="driver-info">
            <div class="driver-name">{{ tracking.driver.name || 'Conductor Asignado' }}</div>
            <div class="driver-status" :class="getDriverStatusClass(tracking.driver.status)">
              {{ getDriverStatus(tracking.driver.status) }}
            </div>
            <div v-if="tracking.driver.phone" class="driver-contact">
              <button @click="callDriver(tracking.driver.phone)" class="contact-btn">
                📞 {{ tracking.driver.phone }}
              </button>
            </div>
          </div>
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
              <div v-if="tracking.company.name" class="company-name">
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
          
          <button v-if="tracking.company.phone" @click="callCompany" class="support-btn">
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
import { ref, onMounted, onUnmounted } from 'vue';
import { apiService } from '../services/api';

const props = defineProps({
  orderId: { type: String, required: true },
  orderNumber: { type: String, default: '' }
});

const emit = defineEmits(['close', 'support-contact']);

// Estado del tracking
const tracking = ref(null);
const loadingTracking = ref(true);
const refreshing = ref(false);
const lastUpdated = ref(new Date());

let refreshInterval = null;

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
    tracking.value = data.tracking;
    lastUpdated.value = new Date(data.last_updated);
    
    // 🔍 DEBUG ESPECÍFICO PARA TRACKING URL
    console.log('🔍 VERIFICANDO TRACKING URL:');
    console.log('- tracking.tracking_url:', data.tracking?.tracking_url);
    console.log('- tracking.shipday_tracking_url:', data.tracking?.shipday_tracking_url);
    console.log('- tracking.has_tracking:', data.tracking?.has_tracking);
    console.log('- Objeto tracking completo:', data.tracking);
    
    // 🆕 NORMALIZAR URLs DE TRACKING - Buscar en ambos campos
    if (data.tracking) {
      // Asegurar que tengamos la URL en el campo correcto
      if (data.tracking.shipday_tracking_url && !data.tracking.tracking_url) {
        data.tracking.tracking_url = data.tracking.shipday_tracking_url;
        console.log('✅ URL de tracking normalizada desde shipday_tracking_url');
      }
      
      // Actualizar el estado
      tracking.value = data.tracking;
    }
    
    console.log('✅ Tracking cargado:', {
      order_number: tracking.value?.order_number,
      has_tracking_url: !!(tracking.value?.tracking_url || tracking.value?.shipday_tracking_url),
      current_status: tracking.value?.current_status,
      timeline_events: tracking.value?.timeline?.length || 0
    });
    
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

// Funciones de UI
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

function getDriverStatusClass(status) {
  return status ? status.toLowerCase() : 'unknown';
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
  console.log('📍 Usuario abriendo tracking en vivo');
}

function callDriver(phone) {
  window.location.href = `tel:${phone}`;
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
</style>