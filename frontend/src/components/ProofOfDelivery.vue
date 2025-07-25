// frontend/src/components/ProofOfDelivery.vue - COMPONENTE CORREGIDO

<template>
  <div class="proof-container">
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
      <h3>Prueba de Entrega</h3>
      
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

      <!-- Firma -->
      <div class="signature-section" v-if="order.proof_of_delivery?.signature_url">
        <h4>Firma del Receptor</h4>
        <div class="signature-container">
          <img 
            :src="order.proof_of_delivery.signature_url" 
            alt="Firma del receptor"
            class="signature-image"
            @error="handleSignatureError"
          />
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

// Computed properties
const hasPhotos = computed(() => {
  return order.proof_of_delivery?.photo_url || 
         (Array.isArray(order.proof_of_delivery?.photos) && 
          order.proof_of_delivery.photos.length > 0)
})

const deliveryPhotos = computed(() => {
  if (!hasPhotos.value) return []
  
  // Si es una sola foto
  if (order.proof_of_delivery.photo_url) {
    return [{
      url: order.proof_of_delivery.photo_url,
      loading: imageLoadStates.value[0] !== 'loaded'
    }]
  }
  
  // Si son múltiples fotos
  return order.proof_of_delivery.photos.map((photo, index) => ({
    url: photo,
    loading: imageLoadStates.value[index] !== 'loaded'
  }))
})

const hasGpsLocation = computed(() => {
  const coords = order.proof_of_delivery?.gps_coordinates
  return coords && coords.lat && coords.lng
})

// Métodos de manejo de errores CORREGIDOS
function handleImageError(event, imageNumber) {
  console.error('Error cargando imagen:', event.target.src)
  
  errorMessage.value = `No se pudo cargar la foto ${imageNumber}. Por favor, inténtalo de nuevo.`
  failedImageIndex.value = imageNumber - 1
  showErrorModal.value = true
  
  // Marcar imagen como fallida
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
    // Resetear estado de la imagen
    imageLoadStates.value[failedImageIndex.value] = 'loading'
    
    // Forzar recarga de la imagen
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

// Otros métodos
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
  const coords = order.proof_of_delivery.gps_coordinates
  const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
  window.open(url, '_blank')
}

function shareProof() {
  if (navigator.share) {
    navigator.share({
      title: `Comprobante de Entrega - Pedido #${order.order_number}`,
      text: `Mi pedido #${order.order_number} fue entregado exitosamente el ${formatDateTime(order.delivery_date)}`,
      url: window.location.href
    })
  } else {
    const text = `Mi pedido #${order.order_number} fue entregado exitosamente el ${formatDateTime(order.delivery_date)}`
    navigator.clipboard.writeText(text)
    toast.success('Información copiada al portapapeles')
  }
}

function downloadProof() {
  // Implementar descarga de comprobante
  toast.info('Función de descarga en desarrollo')
}

function reportIssue() {
  const subject = `Problema con Entrega - Pedido #${order.order_number}`
  const body = `Hola,\n\nTengo un problema con la entrega de mi pedido #${order.order_number}.\n\nDetalles de la entrega:\n- Fecha: ${formatDateTime(order.delivery_date)}\n- Conductor: ${order.driver_info?.name || 'No especificado'}\n\nDescripción del problema:\n[Describe el problema aquí]\n\nGracias.`
    
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Inicialización
onMounted(() => {
  // Inicializar estados de carga de imágenes
  if (hasPhotos.value) {
    deliveryPhotos.value.forEach((_, index) => {
      imageLoadStates.value[index] = 'loading'
    })
  }
})
</script>

<style scoped>
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
</style>