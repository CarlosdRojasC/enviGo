<template>
  <div class="proof-container">
    <!-- Debug Info (solo en desarrollo) -->
    <div v-if="isDevelopment" class="debug-info">
      <details>
        <summary>🔍 Debug Info</summary>
        <pre>{{ debugInfo }}</pre>
      </details>
    </div>

    <!-- Header -->
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

    <!-- Resumen del pedido -->
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

    <!-- Estado de disponibilidad de pruebas -->
    <div class="proof-status">
      <div class="status-grid">
        <div class="status-item" :class="{ available: hasPhotos }">
          <span class="icon">📸</span>
          <span class="text">Fotos de Entrega</span>
          <span class="status">{{ hasPhotos ? 'Disponibles' : 'No disponibles' }}</span>
        </div>
        <div class="status-item" :class="{ available: hasSignature }">
          <span class="icon">✍️</span>
          <span class="text">Firma Digital</span>
          <span class="status">{{ hasSignature ? 'Disponible' : 'No disponible' }}</span>
        </div>
        <div class="status-item" :class="{ available: hasLocation }">
          <span class="icon">📍</span>
          <span class="text">Ubicación</span>
          <span class="status">{{ hasLocation ? 'Disponible' : 'No disponible' }}</span>
        </div>
      </div>
    </div>

    <!-- Fotos de entrega -->
    <div v-if="hasPhotos" class="photos-section">
      <h4 class="section-title">📸 Fotos de Entrega ({{ deliveryPhotos.length }})</h4>
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
            @error="handleImageError($event, index)"
            @load="handleImageLoad($event, index)"
          />
          <div class="photo-overlay">
            <span class="zoom-icon">🔍</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mensaje cuando no hay fotos -->
    <div v-else class="no-photos-message">
      <div class="empty-state">
        <span class="empty-icon">📸</span>
        <h4>No hay fotos disponibles</h4>
        <p>No se encontraron fotos de entrega para este pedido.</p>
      </div>
    </div>

    <!-- Firma digital -->
    <div v-if="hasSignature" class="signature-section">
      <h4 class="section-title">✍️ Firma Digital</h4>
      <div class="signature-container">
        <img 
          :src="signatureUrl" 
          alt="Firma digital"
          class="signature-image"
          @click="openSignatureModal"
          @error="handleSignatureError"
          @load="handleSignatureLoad"
        />
        <div class="signature-info">
          <p>Firma capturada digitalmente al momento de la entrega</p>
          <button @click="openSignatureModal" class="view-signature-btn">
            Ver firma completa
          </button>
        </div>
      </div>
    </div>
    
    <!-- Mensaje cuando no hay firma -->
    <div v-else class="no-signature-message">
      <div class="empty-state">
        <span class="empty-icon">✍️</span>
        <h4>No hay firma disponible</h4>
        <p>No se encontró firma digital para este pedido.</p>
      </div>
    </div>

    <!-- Información de ubicación -->
    <div v-if="hasLocation" class="location-section">
      <h4 class="section-title">📍 Ubicación de Entrega</h4>
      <div class="location-info">
        <p>Lat: {{ order.delivery_location.lat }}, Lng: {{ order.delivery_location.lng }}</p>
        <button @click="openLocationInMaps" class="location-btn">
          🗺️ Ver en Google Maps
        </button>
      </div>
    </div>

    <!-- Timeline de entrega -->
    <div class="timeline-section">
      <h4 class="section-title">⏰ Timeline de Entrega</h4>
      <div class="timeline">
        <div class="time-item">
          <span class="time-label">Pedido creado:</span>
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
    </div>

    <!-- Modal de foto -->
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
    
    <!-- Modal de firma -->
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
import { ref, computed, onMounted } from 'vue';
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

// Estados de carga de imágenes
const imageLoadStates = ref({});
const signatureLoadState = ref({ loaded: false, error: false });

// Debug
const isDevelopment = computed(() => process.env.NODE_ENV === 'development');

// Computed properties mejoradas
const deliveryPhotos = computed(() => {
  const photos = [];
    
  // Fotos desde proof_of_delivery (estructura local)
  if (props.order.proof_of_delivery?.photo_url) {
    if (Array.isArray(props.order.proof_of_delivery.photo_url)) {
      photos.push(...props.order.proof_of_delivery.photo_url);
    } else {
      photos.push(props.order.proof_of_delivery.photo_url);
    }
  }
    
  // Fotos desde webhooks de Shipday (podUrls)
  if (props.order.podUrls && Array.isArray(props.order.podUrls)) {
    photos.push(...props.order.podUrls);
  }
  
  // Fotos desde otros campos posibles
  if (props.order.delivery_photos && Array.isArray(props.order.delivery_photos)) {
    photos.push(...props.order.delivery_photos);
  }
    
  // Eliminar duplicados y URLs vacías
  const uniquePhotos = [...new Set(photos)].filter(photo => photo && photo.trim() !== '');
  
  console.log('🔍 Fotos de entrega encontradas:', {
    proof_of_delivery: props.order.proof_of_delivery?.photo_url,
    podUrls: props.order.podUrls,
    delivery_photos: props.order.delivery_photos,
    uniquePhotos
  });
  
  return uniquePhotos;
});

const signatureUrl = computed(() => {
  const signature = props.order.proof_of_delivery?.signature_url || 
                   props.order.signatureUrl || 
                   null;
  
  console.log('🔍 Firma encontrada:', {
    proof_of_delivery_signature: props.order.proof_of_delivery?.signature_url,
    signatureUrl: props.order.signatureUrl,
    final: signature
  });
  
  return signature;
});

const hasPhotos = computed(() => deliveryPhotos.value.length > 0);
const hasSignature = computed(() => !!signatureUrl.value);
const hasLocation = computed(() => 
  props.order.delivery_location?.lat && props.order.delivery_location?.lng
);

const debugInfo = computed(() => ({
  orderId: props.order._id,
  orderNumber: props.order.order_number,
  status: props.order.status,
  deliveryDate: props.order.delivery_date,
  hasPhotos: hasPhotos.value,
  hasSignature: hasSignature.value,
  hasLocation: hasLocation.value,
  photosCount: deliveryPhotos.value.length,
  rawData: {
    proof_of_delivery: props.order.proof_of_delivery,
    podUrls: props.order.podUrls,
    signatureUrl: props.order.signatureUrl,
    delivery_location: props.order.delivery_location,
    delivery_photos: props.order.delivery_photos
  }
}));

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

// Manejo de errores de imágenes
function handleImageError(event, index) {
  console.error(`❌ Error cargando imagen ${index + 1}:`, event.target.src);
  imageLoadStates.value[index] = { loaded: false, error: true };
  toast.error(`Error cargando imagen ${index + 1}`);
}

function handleImageLoad(event, index) {
  console.log(`✅ Imagen ${index + 1} cargada correctamente`);
  imageLoadStates.value[index] = { loaded: true, error: false };
}

function handleSignatureError(event) {
  console.error('❌ Error cargando firma:', event.target.src);
  signatureLoadState.value = { loaded: false, error: true };
  toast.error('Error cargando la firma digital');
}

function handleSignatureLoad(event) {
  console.log('✅ Firma cargada correctamente');
  signatureLoadState.value = { loaded: true, error: false };
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
      text: `Mi pedido #${props.order.order_number} fue entregado exitosamente el ${formatDate(props.order.delivery_date)}.`,
      url: window.location.href
    }).catch(console.error);
  } else {
    // Fallback para navegadores que no soportan Web Share API
    const text = `Comprobante de Entrega - Pedido #${props.order.order_number}\nEntregado el ${formatDate(props.order.delivery_date)}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Información copiada al portapapeles');
    }).catch(() => {
      toast.error('No se pudo copiar la información');
    });
  }
}

function reportIssue() {
  const subject = `Problema con entrega del pedido #${props.order.order_number}`;
  const body = `Hola,\n\nTengo un problema con la entrega de mi pedido #${props.order.order_number}.\n\nDetalles:\n- Cliente: ${props.order.customer_name}\n- Fecha de entrega: ${formatDate(props.order.delivery_date)}\n\nDescripción del problema:\n\n[Describe el problema aquí]\n\nGracias.`;
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Lifecycle
onMounted(() => {
  console.log('📋 ProofOfDelivery montado para orden:', props.order.order_number);
  console.log('🔍 Datos de la orden:', debugInfo.value);
});
</script>

<style scoped>
.proof-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.debug-info {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 12px;
}

.debug-info summary {
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 8px;
}

.debug-info pre {
  background: white;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
}

.proof-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e9ecef;
}

.header-info h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.delivery-info {
  color: #666;
  margin: 0;
  font-size: 16px;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.status-badge.delivered {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.order-summary {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 4px 0;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 600;
  color: #495057;
}

.value {
  color: #212529;
  text-align: right;
  max-width: 60%;
}

.proof-status {
  margin-bottom: 24px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
}

.status-item.available {
  border-color: #28a745;
  background: #d4edda;
}

.status-item .icon {
  font-size: 20px;
  margin-right: 12px;
}

.status-item .text {
  font-weight: 500;
  margin-right: auto;
}

.status-item .status {
  font-size: 12px;
  color: #666;
}

.status-item.available .status {
  color: #155724;
  font-weight: 600;
}

.photos-section, .signature-section, .location-section, .timeline-section, .notes-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.photo-item:hover {
  transform: scale(1.05);
}

.delivery-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}

.empty-state .empty-icon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 16px;
  display: block;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.signature-container {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.signature-image {
  max-width: 200px;
  max-height: 100px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
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
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
}

.view-signature-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.view-signature-btn:hover {
  background: #0056b3;
}

.location-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-btn {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.location-btn:hover {
  background: #218838;
}

.timeline {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.time-item:last-child {
  border-bottom: none;
}

.time-item.highlight {
  background: #d4edda;
  margin: 8px -20px;
  padding: 12px 20px;
  border-radius: 4px;
  border-bottom: none;
}

.time-item.total {
  font-weight: 600;
  background: #e9ecef;
  margin: 8px -20px 0;
  padding: 12px 20px;
  border-radius: 4px;
  border-bottom: none;
}

.time-label {
  font-weight: 500;
  color: #495057;
}

.time-value {
  color: #212529;
  font-family: monospace;
}

.notes-content {
  background: #fff3cd;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
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
  color: #856404;
  margin-bottom: 4px;
}

.note-text {
  color: #856404;
  line-height: 1.5;
}

.actions-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.action-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 14px;
}

.action-btn.share {
  background: #17a2b8;
  color: white;
}

.action-btn.share:hover {
  background: #138496;
}

.action-btn.report {
  background: #dc3545;
  color: white;
}

.action-btn.report:hover {
  background: #c82333;
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
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

.modal-image,
.modal-signature {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
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
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .proof-container {
    padding: 16px;
  }
  
  .proof-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .signature-container {
    flex-direction: column;
    text-align: center;
  }
  
  .location-info {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .photos-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .time-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

/* Estados de carga de imágenes */
.delivery-photo,
.signature-image {
  transition: opacity 0.3s ease;
}

.delivery-photo[src=""],
.signature-image[src=""] {
  opacity: 0.5;
  background: #f8f9fa;
}

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.photos-section,
.signature-section,
.location-section,
.timeline-section,
.notes-section {
  animation: fadeIn 0.3s ease-out;
}

/* Tooltips para accesibilidad */
.photo-item,
.signature-image,
.location-btn,
.view-signature-btn {
  position: relative;
}

.photo-item:focus,
.signature-image:focus,
.location-btn:focus,
.view-signature-btn:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

/* Estados de error para imágenes */
.delivery-photo:not([src]),
.signature-image:not([src]) {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delivery-photo:not([src])::before,
.signature-image:not([src])::before {
  content: "❌ Error";
  color: #6c757d;
  font-size: 12px;
}
</style>