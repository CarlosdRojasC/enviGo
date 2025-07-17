<template>
  <div class="proof-container">
    <!-- Debug Info (solo en desarrollo) -->
    <div v-if="showDebugInfo" class="debug-info">
      <h4>🔍 Debug - Fuentes de Fotos:</h4>
      <ul>
        <li><strong>proof_of_delivery.photo_url:</strong> {{ order.proof_of_delivery?.photo_url || 'null' }}</li>
        <li><strong>podUrls array:</strong> {{ order.podUrls || 'null' }} ({{ (order.podUrls || []).length }} items)</li>
        <li><strong>shipday_details.podUrls:</strong> {{ order.shipday_details?.podUrls || 'null' }}</li>
        <li><strong>signatureUrl:</strong> {{ order.signatureUrl || 'null' }}</li>
        <li><strong>proof_of_delivery.signature_url:</strong> {{ order.proof_of_delivery?.signature_url || 'null' }}</li>
      </ul>
      <p><strong>Total fotos encontradas:</strong> {{ deliveryPhotos.length }}</p>
    </div>

    <div class="proof-header">
      <div class="header-info">
        <h3>📋 Prueba de Entrega</h3>
        <p class="delivery-info">
          Entregado el {{ formatDate(order.delivery_date) }} 
          <span v-if="order.driver_info?.name">por {{ order.driver_info.name }}</span>
        </p>
      </div>
      <div class="delivery-status">
        <span class="status-badge delivered">✅ Entregado</span>
      </div>
    </div>

    <div class="order-summary">
      <div class="summary-item">
        <span class="label">Cliente:</span>
        <span class="value">{{ order.customer_name }}</span>
      </div>
      <div class="summary-item">
        <span class="label">Dirección:</span>
        <span class="value">{{ order.shipping_address }}</span>
      </div>
      <div v-if="order.shipping_commune" class="summary-item">
        <span class="label">Comuna:</span>
        <span class="value">{{ order.shipping_commune }}</span>
      </div>
    </div>

    <!-- Fotos de Entrega -->
    <div v-if="hasPhotos" class="photos-section">
      <h4 class="section-title">📸 Fotos de Entrega ({{ deliveryPhotos.length }})</h4>
      <div class="photos-grid">
        <div 
          v-for="(photo, index) in deliveryPhotos" 
          :key="`photo-${index}`"
          class="photo-item"
          @click="openPhotoModal(photo, index)">
          <img 
            :src="photo" 
            :alt="`Foto de entrega ${index + 1}`"
            class="delivery-photo"
            @error="handleImageError($event, index)"
            @load="handleImageLoad(index)"
          />
          <div class="photo-overlay">
            <span class="zoom-icon">🔍</span>
          </div>
          <div class="photo-number">{{ index + 1 }}</div>
        </div>
      </div>
    </div>

    <!-- Mensaje si no hay fotos -->
    <div v-else class="no-photos-section">
      <div class="no-photos-message">
        <span class="icon">📷</span>
        <p>No se encontraron fotos de entrega</p>
        <small>Las fotos se cargarán automáticamente cuando el conductor las suba</small>
      </div>
    </div>

    <!-- Firma Digital -->
    <div v-if="hasSignature" class="signature-section">
      <h4 class="section-title">✍️ Firma Digital</h4>
      <div class="signature-container">
        <img 
          :src="signatureUrl" 
          alt="Firma digital"
          class="signature-image"
          @click="openSignatureModal"
          @error="handleImageError"
        />
        <div class="signature-info">
          <p><strong>Firmado por:</strong> {{ order.customer_name }}</p>
          <p><strong>Fecha:</strong> {{ formatDateTime(order.delivery_date) }}</p>
          <small>Firma capturada digitalmente al momento de la entrega</small>
        </div>
      </div>
    </div>

    <!-- Ubicación de Entrega -->
    <div v-if="hasLocation" class="location-section">
      <h4 class="section-title">📍 Ubicación de Entrega</h4>
      <div class="location-info">
        <div class="location-details">
          <p><strong>Coordenadas:</strong> {{ order.delivery_location.lat }}, {{ order.delivery_location.lng }}</p>
          <p v-if="order.delivery_location.formatted_address">
            <strong>Dirección:</strong> {{ order.delivery_location.formatted_address }}
          </p>
        </div>
        <button @click="openLocationInMaps" class="location-btn">
          🗺️ Ver en Google Maps
        </button>
      </div>
    </div>

    <!-- Timeline de Entrega -->
    <div v-if="order.shipday_times" class="timeline-section">
      <h4 class="section-title">⏱️ Timeline de Entrega</h4>
      <div class="timeline">
        <div v-if="order.shipday_times?.placement_time" class="time-item">
          <span class="time-label">Pedido creado:</span>
          <span class="time-value">{{ formatDateTime(order.shipday_times.placement_time) }}</span>
        </div>
        <div v-if="order.shipday_times?.assigned_time" class="time-item">
          <span class="time-label">Conductor asignado:</span>
          <strong v-if="order.driver_info?.name" class="driver-name-inline">: {{ order.driver_info.name }}</strong>
        </div>
        <div v-if="order.shipday_times?.pickup_time" class="time-item">
          <span class="time-label">Recogido:</span>
          <span class="time-value">{{ formatDateTime(order.shipday_times.pickup_time) }}</span>
        </div>
        <div class="time-item highlight">
          <span class="time-label">Entregado:</span>
          <span class="time-value">{{ formatDateTime(order.delivery_date) }}</span>
        </div>
        <div v-if="deliveryDuration" class="time-item total">
          <span class="time-label">Tiempo total:</span>
          <span class="time-value">{{ deliveryDuration }}</span>
        </div>
      </div>
    </div>

    <!-- Notas -->
    <div v-if="order.notes || order.delivery_note" class="notes-section">
      <h4 class="section-title">📝 Notas</h4>
      <div class="notes-content">
        <div v-if="order.notes" class="note-item">
          <span class="note-label">Instrucciones del pedido:</span>
          <span class="note-text">{{ order.notes }}</span>
        </div>
        <div v-if="order.delivery_note" class="note-item">
          <span class="note-label">Notas de entrega:</span>
          <span class="note-text">{{ order.delivery_note }}</span>
        </div>
      </div>
    </div>

    <!-- Acciones -->
    <div class="actions-section">
      <button @click="shareProof" class="action-btn share">
        📤 Compartir
      </button>
      <button @click="reportIssue" class="action-btn report">
        ⚠️ Reportar Problema
      </button>
      <button v-if="showDebugInfo" @click="toggleDebug" class="action-btn debug">
        🔍 Debug Info
      </button>
    </div>

    <!-- Modal de Foto -->
    <div v-if="showPhotoModal" class="photo-modal" @click="closePhotoModal">
      <div class="photo-modal-content" @click.stop>
        <button @click="closePhotoModal" class="close-btn">✕</button>
        <img :src="selectedPhoto" alt="Foto de entrega ampliada" class="modal-image" />
        <div class="photo-navigation" v-if="deliveryPhotos.length > 1">
          <button @click="previousPhoto" :disabled="selectedPhotoIndex === 0" class="nav-btn">
            ← Anterior
          </button>
          <span class="photo-counter">{{ selectedPhotoIndex + 1 }} / {{ deliveryPhotos.length }}</span>
          <button @click="nextPhoto" :disabled="selectedPhotoIndex === deliveryPhotos.length - 1" class="nav-btn">
            Siguiente →
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal de Firma -->
    <div v-if="showSignatureModal" class="signature-modal" @click="closeSignatureModal">
      <div class="signature-modal-content" @click.stop>
        <button @click="closeSignatureModal" class="close-btn">✕</button>
        <img :src="signatureUrl" alt="Firma digital ampliada" class="modal-signature" />
        <p class="signature-caption">Firma digital capturada al momento de la entrega</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';

const toast = useToast();
const props = defineProps({
  order: { type: Object, required: true }
});

// Estado de modales y debug
const showPhotoModal = ref(false);
const showSignatureModal = ref(false);
const selectedPhoto = ref('');
const selectedPhotoIndex = ref(0);
const showDebugInfo = ref(process.env.NODE_ENV === 'development'); // Solo en desarrollo

// Computed properties mejorados
const deliveryPhotos = computed(() => {
  const photos = [];
  
  console.log('🔍 ProofOfDelivery - Buscando fotos en:', {
    proof_of_delivery: props.order.proof_of_delivery,
    podUrls: props.order.podUrls,
    shipday_details: props.order.shipday_details
  });
    
  // 1. Foto principal desde proof_of_delivery
  if (props.order.proof_of_delivery?.photo_url) {
    photos.push(props.order.proof_of_delivery.photo_url);
    console.log('📸 Foto encontrada en proof_of_delivery.photo_url:', props.order.proof_of_delivery.photo_url);
  }
    
  // 2. Fotos desde webhooks de Shipday (podUrls) - ARRAY PRINCIPAL
  if (props.order.podUrls && Array.isArray(props.order.podUrls)) {
    photos.push(...props.order.podUrls);
    console.log('📸 Fotos encontradas en podUrls:', props.order.podUrls);
  }

  // 3. Fotos desde shipday_details (datos de la API)
  if (props.order.shipday_details?.podUrls && Array.isArray(props.order.shipday_details.podUrls)) {
    photos.push(...props.order.shipday_details.podUrls);
    console.log('📸 Fotos encontradas en shipday_details.podUrls:', props.order.shipday_details.podUrls);
  }

  // 4. Fotos desde shipday_details._raw (datos crudos)
  if (props.order.shipday_details?._raw?.podUrls && Array.isArray(props.order.shipday_details._raw.podUrls)) {
    photos.push(...props.order.shipday_details._raw.podUrls);
    console.log('📸 Fotos encontradas en shipday_details._raw.podUrls:', props.order.shipday_details._raw.podUrls);
  }

  // 5. Fotos desde proofOfDelivery en shipday_details
  if (props.order.shipday_details?._raw?.proofOfDelivery?.photos && Array.isArray(props.order.shipday_details._raw.proofOfDelivery.photos)) {
    photos.push(...props.order.shipday_details._raw.proofOfDelivery.photos);
    console.log('📸 Fotos encontradas en proofOfDelivery.photos:', props.order.shipday_details._raw.proofOfDelivery.photos);
  }
    
  // Filtrar URLs válidas y eliminar duplicados
  const validPhotos = photos.filter(url => url && typeof url === 'string' && url.trim() !== '');
  const uniquePhotos = [...new Set(validPhotos)];
  
  console.log('📸 ProofOfDelivery - Fotos finales:', {
    total_found: photos.length,
    valid_photos: validPhotos.length,
    unique_photos: uniquePhotos.length,
    photos: uniquePhotos
  });
  
  return uniquePhotos;
});

const signatureUrl = computed(() => {
  // Buscar firma en múltiples ubicaciones
  const signature = props.order.proof_of_delivery?.signature_url || 
                   props.order.signatureUrl || 
                   props.order.shipday_details?.signatureUrl ||
                   props.order.shipday_details?._raw?.signatureUrl ||
                   props.order.shipday_details?._raw?.proofOfDelivery?.signature ||
                   null;
  
  console.log('✍️ ProofOfDelivery - Firma encontrada:', signature);
  return signature;
});

const hasPhotos = computed(() => deliveryPhotos.value.length > 0);
const hasSignature = computed(() => !!signatureUrl.value);
const hasLocation = computed(() => 
  props.order.delivery_location?.lat && props.order.delivery_location?.lng);

const deliveryDuration = computed(() => {
  if (!props.order.order_date || !props.order.delivery_date) return null;
    
  const orderDate = new Date(props.order.order_date);
  const deliveryDate = new Date(props.order.delivery_date);
  const diffMs = deliveryDate - orderDate;
    
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} día${days !== 1 ? 's' : ''} ${remainingHours}h ${minutes}m`;
  } else {
    return `${hours}h ${minutes}m`;
  }
});

// Funciones de modal
function openPhotoModal(photo, index) {
  selectedPhoto.value = photo;
  selectedPhotoIndex.value = index;
  showPhotoModal.value = true;
}

function closePhotoModal() {
  showPhotoModal.value = false;
}

function previousPhoto() {
  if (selectedPhotoIndex.value > 0) {
    selectedPhotoIndex.value--;
    selectedPhoto.value = deliveryPhotos.value[selectedPhotoIndex.value];
  }
}

function nextPhoto() {
  if (selectedPhotoIndex.value < deliveryPhotos.value.length - 1) {
    selectedPhotoIndex.value++;
    selectedPhoto.value = deliveryPhotos.value[selectedPhotoIndex.value];
  }
}

function openSignatureModal() {
  showSignatureModal.value = true;
}

function closeSignatureModal() {
  showSignatureModal.value = false;
}

// Funciones utilitarias
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDriverInitials(name) {
  if (!name) return '👤';
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

// CORRECCIÓN: Función de Google Maps arreglada
function openLocationInMaps() {
  if (props.order.delivery_location?.lat && props.order.delivery_location?.lng) {
    const { lat, lng } = props.order.delivery_location;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  }
}

function shareProof() {
  if (navigator.share) {
    navigator.share({
      title: `Comprobante de Entrega - Pedido #${props.order.order_number}`,
      text: `Mi pedido #${props.order.order_number} fue entregado exitosamente el ${formatDate(props.order.delivery_date)}`,
      url: window.location.href
    });
  } else {
    // Fallback para navegadores que no soportan Web Share API
    const text = `Mi pedido #${props.order.order_number} fue entregado exitosamente el ${formatDate(props.order.delivery_date)}`;
    navigator.clipboard.writeText(text);
    toast.success('Información copiada al portapapeles');
  }
}

function reportIssue() {
  const subject = `Problema con Entrega - Pedido #${props.order.order_number}`;
  const body = `Hola,\n\nTengo un problema con la entrega de mi pedido #${props.order.order_number}.\n\nDetalles de la entrega:\n- Fecha: ${formatDateTime(props.order.delivery_date)}\n- Conductor: ${props.order.driver_info?.name || 'No especificado'}\n\nDescripción del problema:\n[Describe el problema aquí]\n\nGracias.`;
    
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function handleImageError(event, index) {
  console.error('Error cargando imagen:', event.target.src);
  toast.error(`Error cargando la foto ${index ? index + 1 : ''}`);
  event.target.style.display = 'none';
}

function handleImageLoad(index) {
  console.log(`✅ Imagen ${index + 1} cargada correctamente`);
}

</script>

<style scoped>
.proof-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Debug Info */
.debug-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 12px;
}

.debug-info h4 {
  margin: 0 0 8px 0;
  color: #856404;
}

.debug-info ul {
  margin: 8px 0;
  padding-left: 20px;
}

.debug-info li {
  margin-bottom: 4px;
}

/* Header */
.proof-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 12px;
}

.header-info h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
}

.delivery-info {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.status-badge.delivered {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

/* Order Summary */
.order-summary {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #64748b;
}

.value {
  color: #1e293b;
  font-weight: 500;
}

/* Section Titles */
.section-title {
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
}

/* Photos Section */
.photos-section {
  margin-bottom: 24px;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.photo-item {
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}

.photo-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.delivery-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.photo-item:hover .photo-overlay {
  opacity: 1;
}

.zoom-icon {
  color: white;
  font-size: 24px;
}

.photo-number {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* No Photos */
.no-photos-section {
  margin-bottom: 24px;
}

.no-photos-message {
  text-align: center;
  padding: 40px 20px;
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  color: #64748b;
}

.no-photos-message .icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.no-photos-message p {
  margin: 0 0 8px 0;
  font-weight: 500;
}

.no-photos-message small {
  font-size: 12px;
  opacity: 0.8;
}

/* Signature Section */
.signature-section {
  margin-bottom: 24px;
}

.signature-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.signature-image {
  max-width: 200px;
  max-height: 120px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.signature-image:hover {
  transform: scale(1.05);
}

.signature-info {
  flex: 1;
}

.signature-info p {
  margin: 0 0 8px 0;
  color: #64748b;
}

.signature-info small {
  color: #94a3b8;
  font-style: italic;
}

/* Location Section */
.location-section {
  margin-bottom: 24px;
}

.location-info {
  background: #f1f5f9;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-details p {
  margin: 0 0 4px 0;
  color: #475569;
}

.location-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.location-btn:hover {
  background: #2563eb;
}

/* Timeline Section */
.timeline-section {
  margin-bottom: 24px;
}

.timeline {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.time-item:last-child {
  border-bottom: none;
}

.time-item.highlight {
  background: #ecfdf5;
  margin: 0 -8px;
  padding: 8px;
  border-radius: 6px;
  border-bottom: 1px solid #d1fae5;
}

.time-item.total {
  background: #fef3c7;
  margin: 0 -8px;
  padding: 8px;
  border-radius: 6px;
  font-weight: 600;
}

.time-label {
  color: #64748b;
  font-weight: 500;
}

.time-value {
  color: #1e293b;
  font-weight: 500;
}

/* Notes Section */
.notes-section {
  margin-bottom: 24px;
}

.notes-content {
  background: #fef7e6;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #f59e0b;
}

.note-item {
  margin-bottom: 12px;
}

.note-item:last-child {
  margin-bottom: 0;
}

.note-label {
  display: block;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 4px;
}

.note-text {
  color: #78350f;
  line-height: 1.5;
}

/* Actions Section */
.actions-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.action-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn.share {
  background: #3b82f6;
  color: white;
}

.action-btn.share:hover {
  background: #2563eb;
}

.action-btn.report {
  background: #ef4444;
  color: white;
}

.action-btn.report:hover {
  background: #dc2626;
}

.action-btn.debug {
  background: #8b5cf6;
  color: white;
}

.action-btn.debug:hover {
  background: #7c3aed;
}

/* Modals */
.photo-modal,
.signature-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.photo-modal-content,
.signature-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  text-align: center;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
}

.modal-image,
.modal-signature {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
}

.photo-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  color: white;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.photo-counter {
  font-size: 14px;
  font-weight: 500;
}

.signature-caption {
  color: white;
  margin-top: 16px;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .proof-container {
    padding: 16px;
  }
  
  .proof-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .signature-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .location-info {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .photos-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
}
</style>