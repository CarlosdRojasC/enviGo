
<template>
  <div class="proof-container">
     <div v-if="!hasProofOfDelivery" class="no-proof-message">
      <div class="no-proof-icon">📋</div>
      <h3>Sin Prueba de Entrega</h3>
      <p>Este pedido aún no tiene prueba de entrega disponible.</p>
      <p class="help-text">La prueba se generará cuando el conductor complete la entrega.</p>
    </div>
    <div v-else>
    <!-- Header -->
    <div class="proof-header">
      <div class="delivery-success">
        <div class="success-icon">✅</div>
        <div class="success-text">
          <h2>¡Pedido Entregado!</h2>
          <p>Tu pedido #{{ order.order_number }} fue entregado exitosamente</p>
        </div>
      </div>
      <div class="delivery-date">
        {{ formatDateTime(order.delivery_date) }}
      </div>
    </div>

    <!-- Información del Conductor -->
    <div class="driver-info" v-if="order.driver_info">
      <h3>Información del Conductor</h3>
      <div class="driver-details">
        <div class="driver-detail">
          <span class="label">Nombre:</span>
          <span class="value">{{ order.driver_info.name }}</span>
        </div>
        <div class="driver-detail" v-if="order.driver_info.phone">
          <span class="label">Teléfono:</span>
          <span class="value">{{ order.driver_info.phone }}</span>
        </div>
      </div>
    </div>

    <!-- Prueba de Entrega -->
    <div class="proof-evidence">
      <h3>Pruebas de Entrega</h3>
      
      <!-- Fotos -->
      <div class="photos-section" v-if="hasPhotos">
        <h4>Fotografías</h4>
        <div class="photos-grid">
          <div 
            v-for="(photo, index) in deliveryPhotos" 
            :key="index"
            class="photo-item"
          >
            <img 
              :src="photo.url" 
              :alt="`Foto de entrega ${index + 1}`"
              class="delivery-photo"
              @error="(event) => handleImageError(event, index + 1)"
              @load="() => handleImageLoad(index)"
            />
            <div class="photo-overlay" v-if="photo.loading">
              <div class="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ubicación GPS -->
      <div class="location-section" v-if="hasGpsLocation">
        <h4>Ubicación de Entrega</h4>
        <div class="location-info">
          <div class="coordinates">
            <span class="label">Coordenadas:</span>
            <span class="value">
              {{ order.proof_of_delivery.gps_coordinates.lat.toFixed(6) }}, 
              {{ order.proof_of_delivery.gps_coordinates.lng.toFixed(6) }}
            </span>
          </div>
          <button @click="openInMaps" class="maps-button">
            📍 Ver en Mapa
          </button>
        </div>
      </div>

      <!-- Notas de Entrega -->
      <div class="notes-section" v-if="order.proof_of_delivery?.delivery_notes">
        <h4>Notas de Entrega</h4>
        <div class="delivery-notes">
          {{ order.proof_of_delivery.delivery_notes }}
        </div>
      </div>
    </div>

    <!-- Acciones -->
    <div class="proof-actions">
      <button @click="shareProof" class="action-button share">
        📤 Compartir Comprobante
      </button>
      <button @click="downloadProof" class="action-button download">
        💾 Descargar
      </button>
      <button @click="reportIssue" class="action-button report">
        ⚠️ Reportar Problema
      </button>
    </div>
    </div>

    <!-- Modal de Error de Imagen -->
    <div v-if="showErrorModal" class="error-modal-overlay" @click="closeErrorModal">
      <div class="error-modal">
        <h3>Error al Cargar Imagen</h3>
        <p>{{ errorMessage }}</p>
        <div class="error-actions">
          <button @click="retryImageLoad" class="retry-button">🔄 Reintentar</button>
          <button @click="closeErrorModal" class="close-button">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api';

const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

const toast = useToast()

// Estado para manejo de errores
const showErrorModal = ref(false)
const errorMessage = ref('')
const failedImageIndex = ref(null)
const imageLoadStates = ref({})

// ✅ COMPUTED PROPERTIES CORREGIDOS - CON VERIFICACIÓN DE NULL
const hasProofOfDelivery = computed(() => {
  return !!(props.order?.proof_of_delivery)
})

const hasPhotos = computed(() => {
  if (!hasProofOfDelivery.value) return false
  
  const proof = props.order.proof_of_delivery
  
  // ✅ Buscar en TODAS las ubicaciones posibles
  return !!(
    (Array.isArray(proof.photo_urls) && proof.photo_urls.length > 0) || // Cloudinary
    (Array.isArray(proof.podUrls) && proof.podUrls.length > 0) ||       // Shipday
    proof.photo_url                                                       // Formato antiguo
  )
})

const deliveryPhotos = computed(() => {
  const photoUrls = new Set();
  const proof = props.order?.proof_of_delivery;

  // 🔍 DEBUG TEMPORAL
  console.log('🔍 DEBUG - proof_of_delivery completo:', proof);
  console.log('🔍 photo_urls (Cloudinary):', proof?.photo_urls);
  console.log('🔍 podUrls (Shipday):', proof?.podUrls);
  console.log('🔍 photo_url (antiguo):', proof?.photo_url);

  if (proof) {
    if (Array.isArray(proof.photo_urls) && proof.photo_urls.length > 0) {
      proof.photo_urls.forEach(url => {
        if (url) photoUrls.add(url);
      });
    }

    if (Array.isArray(proof.podUrls) && proof.podUrls.length > 0) {
      proof.podUrls.forEach(url => {
        if (url) photoUrls.add(url);
      });
    }

    if (proof.photo_url) {
      photoUrls.add(proof.photo_url);
    }
  }

  const result = Array.from(photoUrls).map((url, index) => ({
    url,
    loading: imageLoadStates.value[index] !== 'loaded'
  }));

  // 🔍 DEBUG TEMPORAL
  console.log('🔍 RESULTADO deliveryPhotos:', result);

  return result;
});


const hasSignature = computed(() => {
  if (!hasProofOfDelivery.value) return false
  const proof = props.order.proof_of_delivery
  return !!(proof.signature_url || proof.signatureUrl)
})

const signatureUrl = computed(() => {
  const potentialSignature = props.order?.signatureUrl || props.order?.proof_of_delivery?.signature_url;

  if (!potentialSignature) {
    return null;
  }

  // Si la URL de la firma está incluida en las fotos, no la mostramos.
  const isPhoto = deliveryPhotos.value.some(photo => photo.url === potentialSignature);
  if (isPhoto) {
    return null;
  }

  return potentialSignature;
})

const hasGpsLocation = computed(() => {
  if (!hasProofOfDelivery.value) return false
  const coords = props.order.proof_of_delivery.gps_coordinates
  return coords && coords.lat && coords.lng
})

const hasDeliveryNotes = computed(() => {
  if (!hasProofOfDelivery.value) return false
  return !!(props.order.proof_of_delivery.delivery_notes || props.order.proof_of_delivery.notes)
})

const deliveryNotes = computed(() => {
  if (!hasDeliveryNotes.value) return ''
  const proof = props.order.proof_of_delivery
  return proof.delivery_notes || proof.notes || ''
})

// ✅ RESTO DE MÉTODOS SIN CAMBIOS...
function handleImageError(event, imageNumber) {
  console.error('Error cargando imagen:', event.target.src)
  
  errorMessage.value = `No se pudo cargar la foto ${imageNumber}. Por favor, inténtalo de nuevo.`
  failedImageIndex.value = imageNumber - 1
  showErrorModal.value = true
  
  imageLoadStates.value[imageNumber - 1] = 'failed'
}

function handleImageLoad(index) {
  imageLoadStates.value[index] = 'loaded'
}

function handleSignatureError(event) {
  console.error('Error cargando firma:', event.target.src)
  toast.error('No se pudo cargar la firma digital')
}

function retryImageLoad() {
  if (failedImageIndex.value !== null) {
    imageLoadStates.value[failedImageIndex.value] = 'loading'
    
    const imgElements = document.querySelectorAll('.delivery-photo')
    if (imgElements[failedImageIndex.value]) {
      const img = imgElements[failedImageIndex.value]
      const originalSrc = img.src
      img.src = ''
      setTimeout(() => {
        img.src = originalSrc
      }, 100)
    }
  }
  closeErrorModal()
}

function closeErrorModal() {
  showErrorModal.value = false
  errorMessage.value = ''
  failedImageIndex.value = null
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'No especificado'
  
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openInMaps() {
  const coords = props.order.proof_of_delivery.gps_coordinates
  const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
  window.open(url, '_blank')
}

function shareProof() {
  if (navigator.share) {
    navigator.share({
      title: `Comprobante de Entrega - Pedido #${props.order.order_number}`,
      text: `Mi pedido #${props.order.order_number} fue entregado exitosamente el ${formatDateTime(props.order.delivery_date)}`,
      url: window.location.href
    })
  } else {
    const text = `Mi pedido #${props.order.order_number} fue entregado exitosamente el ${formatDateTime(props.order.delivery_date)}`
    navigator.clipboard.writeText(text)
    toast.success('Información copiada al portapapeles')
  }
}

async function downloadProof() {
    try {
        toast.info('Generando comprobante...');
        const orderId = props.order._id;

        // ✅ INICIO DE LA CORRECCIÓN
        // Cambiamos la sintaxis de la llamada a la API para que coincida
        // con otros servicios de tu proyecto. Esto evita el error ".get is not a function".
        const response = await apiService({
            method: 'GET',
            url: `/labels/proof/${orderId}/download`,
            responseType: 'blob', // Importante para recibir un archivo
        });
        // ✅ FIN DE LA CORRECCIÓN

        // Crea un link para descargar el archivo (sin cambios aquí)
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Comprobante-${props.order.order_number}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('¡Comprobante descargado!');
    } catch (error) {
        console.error('Error al descargar el comprobante:', error);
        toast.error('No se pudo generar el PDF.');
    }
}

function reportIssue() {
  const subject = `Problema con Entrega - Pedido #${props.order.order_number}`
  const body = `Hola,\n\nTengo un problema con la entrega de mi pedido #${props.order.order_number}.\n\nDetalles de la entrega:\n- Fecha: ${formatDateTime(props.order.delivery_date)}\n- Conductor: ${props.order.driver_info?.name || 'No especificado'}\n\nDescripción del problema:\n[Describe el problema aquí]\n\nGracias.`
    
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

onMounted(() => {
  if (hasPhotos.value) {
    deliveryPhotos.value.forEach((_, index) => {
      imageLoadStates.value[index] = 'loading'
    })
  }
})
</script>

<style scoped>

.proof-actions {
  display: flex;
  justify-content: center;
  gap: 16px; /* Aumenta el espacio */
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
  flex-wrap: wrap; /* Para que se vea bien en móviles */
}

.action-button {
  display: inline-flex; /* Permite alinear el ícono y el texto */
  align-items: center;
  gap: 8px; /* Espacio entre ícono y texto */
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  cursor: pointer;
  font-weight: 600; /* Letra más marcada */
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  border-color: #cbd5e1;
}

/* Colores específicos por botón */
.action-button.share:hover { color: #3b82f6; border-color: #3b82f6; }
.action-button.download:hover { color: #16a34a; border-color: #16a34a; }
.action-button.report:hover { color: #ef4444; border-color: #ef4444; }

.proof-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.proof-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  color: white;
}

.delivery-success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.success-icon {
  font-size: 48px;
}

.success-text h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.success-text p {
  margin: 0;
  opacity: 0.9;
}

.delivery-date {
  font-size: 16px;
  opacity: 0.9;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.photo-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
}

.delivery-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  cursor: zoom-in;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-modal {
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  text-align: center;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.retry-button, .close-button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}

.retry-button {
  background: #3b82f6;
  color: white;
}

.close-button {
  background: #f3f4f6;
  color: #374151;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .proof-container {
    margin: 10px;
    padding: 16px;
  }
  
  .photos-grid {
    grid-template-columns: 1fr;
  }
  
  .delivery-success {
    flex-direction: column;
    text-align: center;
  }
}
.no-proof-message {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.no-proof-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.no-proof-message h3 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 24px;
}

.no-proof-message p {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.help-text {
  font-size: 14px !important;
  color: #9ca3af !important;
}
</style>