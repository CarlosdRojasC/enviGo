<template>
  <div class="proof-container">
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

    <div v-if="hasPhotos" class="photos-section">
      <h4 class="section-title">📸 Fotos de Entrega</h4>
      <div class="photos-grid">
        <div 
          v-for="(photo, index) in deliveryPhotos" 
          :key="index"
          class="photo-item"
          @click="openPhotoModal(photo, index)">
          <img 
            :src="photo" 
            :alt="`Foto de entrega ${index + 1}`"
            class="delivery-photo"
            @error="handleImageError"
          />
          <div class="photo-overlay">
            <span class="zoom-icon">🔍</span>
          </div>
        </div>
      </div>
    </div>

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
          <p>Firma capturada digitalmente al momento de la entrega</p>
          <small>Haz clic en la imagen para verla en tamaño completo</small>
        </div>
      </div>
    </div>

    <div v-if="hasLocation" class="location-section">
      <h4 class="section-title">📍 Ubicación de Entrega</h4>
      <div class="location-info">
        <div class="coordinates">
          <span class="coord-label">Coordenadas:</span>
          <span class="coord-value">
            {{ order.delivery_location.lat.toFixed(6) }}, {{ order.delivery_location.lng.toFixed(6) }}
          </span>
        </div>
        <div v-if="order.delivery_location.formatted_address" class="formatted-address">
          <span class="address-label">Dirección verificada:</span>
          <span class="address-value">{{ order.delivery_location.formatted_address }}</span>
        </div>
        <button @click="openLocationInMaps" class="maps-btn">
          🗺️ Ver en Google Maps
        </button>
      </div>
    </div>

    <div v-if="order.driver_info" class="driver-section">
      <h4 class="section-title">👨‍💼 Conductor</h4>
      <div class="driver-card">
        <div class="driver-avatar">
          {{ getDriverInitials(order.driver_info.name) }}
        </div>
        <div class="driver-details">
          <div class="driver-name">{{ order.driver_info.name || 'Conductor Asignado' }}</div>
          <div v-if="order.driver_info.phone" class="driver-contact">
            📱 {{ order.driver_info.phone }}
          </div>
          <div v-if="order.driver_info.email" class="driver-email">
            📧 {{ order.driver_info.email }}
          </div>
        </div>
      </div>
    </div>

    <div class="delivery-time-section">
      <h4 class="section-title">⏰ Tiempo de Entrega</h4>
      <div class="time-details">
        <div class="time-item">
          <span class="time-label">Pedido realizado:</span>
          <span class="time-value">{{ formatDateTime(order.order_date) }}</span>
        </div>
        <div v-if="order.shipday_times?.assigned_time" class="time-item">
          <span class="time-label">Conductor asignado:</span>
          <span class="time-value">{{ formatDateTime(order.shipday_times.assigned_time) }}</span>
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

    <div class="actions-section">
      <button @click="shareProof" class="action-btn share">
        📤 Compartir
      </button>
      <button @click="reportIssue" class="action-btn report">
        ⚠️ Reportar Problema
      </button>
    </div>

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

// Estado de modales
const showPhotoModal = ref(false);
const showSignatureModal = ref(false);
const selectedPhoto = ref('');
const selectedPhotoIndex = ref(0);

// Computed properties
const deliveryPhotos = computed(() => {
  const photos = [];
    
  // Fotos desde proof_of_delivery (estructura local)
  if (props.order.proof_of_delivery?.photo_url) {
    photos.push(props.order.proof_of_delivery.photo_url);
  }
    
  // Fotos desde webhooks de Shipday (podUrls)
  if (props.order.podUrls && Array.isArray(props.order.podUrls)) {
    photos.push(...props.order.podUrls);
  }
    
  // Eliminar duplicados
  return [...new Set(photos)];
});

const signatureUrl = computed(() => {
  return props.order.proof_of_delivery?.signature_url || 
         props.order.signatureUrl || 
         null;
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

function openLocationInMaps() {
  if (props.order.delivery_location?.lat && props.order.delivery_location?.lng) {
    const { lat, lng } = props.order.delivery_location;
    const url = `https://www.google.com/maps?q=$?q=${lat},${lng}`;
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

function handleImageError(event) {
  console.error('Error cargando imagen:', event.target.src);
  event.target.style.display = 'none';
}
</script>

<style scoped>
.proof-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
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
.section-title {
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
}
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
.location-section {
  margin-bottom: 24px;
}
.location-info {
  background: #f1f5f9;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
}
.coordinates,
.formatted-address {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
.coord-label,
.address-label {
  font-weight: 500;
  color: #475569;
}
.coord-value,
.address-value {
  color: #1e293b;
  font-family: monospace;
  font-size: 14px;
}
.maps-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}
.maps-btn:hover {
  background: #2563eb;
}
.driver-section {
  margin-bottom: 24px;
}
.driver-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.driver-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}
.driver-name {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}
.driver-contact,
.driver-email {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 2px;
}
.delivery-time-section {
  margin-bottom: 24px;
}
.time-details {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.time-item:last-child {
  border-bottom: none;
}
.time-item.highlight {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.time-item.total {
  background: #f8fafc;
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
.notes-section {
  margin-bottom: 24px;
}
.notes-content {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 16px;
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
.action-btn.download {
  background: #10b981;
  color: white;
}
.action-btn.download:hover {
  background: #059669;
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
</style>