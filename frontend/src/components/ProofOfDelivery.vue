<template>
  <div class="max-w-3xl mx-auto p-5 bg-white rounded-xl shadow-lg">
    <!-- Sin Prueba de Entrega -->
    <div v-if="!hasProofOfDelivery" class="text-center py-15 px-5 text-gray-500">
      <div class="text-6xl mb-5">📋</div>
      <h3 class="m-0 mb-3 text-gray-700 text-2xl">Sin Prueba de Entrega</h3>
      <p class="m-0 mb-2 text-base">Este pedido aún no tiene prueba de entrega disponible.</p>
      <p class="text-sm text-gray-400">La prueba se generará cuando el conductor complete la entrega.</p>
    </div>

    <!-- Con Prueba de Entrega -->
    <div v-else>
      <!-- Header -->
      <div class="text-center mb-8 p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white">
        <div class="flex items-center justify-center gap-4 mb-3">
          <div class="text-5xl">✅</div>
          <div>
            <h2 class="m-0 mb-2 text-2xl">¡Pedido Entregado!</h2>
            <p class="m-0 opacity-90">Tu pedido #{{ order.order_number }} fue entregado exitosamente</p>
          </div>
        </div>
        <div class="text-base opacity-90">
          {{ formatDateTime(order.delivery_date) }}
        </div>
      </div>

      <!-- Información del Conductor -->
      <div v-if="order.driver_info" class="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h3 class="m-0 mb-3 text-lg font-semibold text-gray-800">Información del Conductor</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-600">Nombre:</span>
            <span class="text-sm text-gray-800">{{ order.driver_info.name }}</span>
          </div>
          <div v-if="order.driver_info.phone" class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-600">Teléfono:</span>
            <span class="text-sm text-gray-800">{{ order.driver_info.phone }}</span>
          </div>
        </div>
      </div>

      <!-- Prueba de Entrega -->
      <div class="mb-6">
        <h3 class="m-0 mb-4 text-lg font-semibold text-gray-800">Pruebas de Entrega</h3>
        
        <!-- Fotos -->
        <div v-if="hasPhotos" class="mb-6">
          <h4 class="m-0 mb-3 text-base font-semibold text-gray-700">Fotografías</h4>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
            <div 
              v-for="(photo, index) in deliveryPhotos" 
              :key="index"
              class="relative rounded-lg overflow-hidden aspect-square"
            >
              <img 
                :src="photo.url" 
                :alt="`Foto de entrega ${index + 1}`"
                class="w-full h-full object-cover rounded-lg cursor-zoom-in"
                @error="(event) => handleImageError(event, index + 1)"
                @load="() => handleImageLoad(index)"
              />
              <div v-if="photo.loading" class="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div class="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Ubicación GPS -->
        <div v-if="hasGpsLocation" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 class="m-0 mb-3 text-base font-semibold text-gray-700">Ubicación de Entrega</h4>
          <div class="space-y-3">
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-600">Coordenadas:</span>
              <span class="text-sm text-gray-800 font-mono">
                {{ order.proof_of_delivery.gps_coordinates.lat.toFixed(6) }}, 
                {{ order.proof_of_delivery.gps_coordinates.lng.toFixed(6) }}
              </span>
            </div>
            <button 
              @click="openInMaps" 
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              📍 Ver en Mapa
            </button>
          </div>
        </div>

        <!-- Notas de Entrega -->
        <div v-if="order.proof_of_delivery?.delivery_notes" class="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 class="m-0 mb-2 text-base font-semibold text-gray-700">Notas de Entrega</h4>
          <div class="text-sm text-gray-700 leading-relaxed">
            {{ order.proof_of_delivery.delivery_notes }}
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex justify-center gap-4 mt-6 pt-5 border-t border-slate-200 flex-wrap">
        <button 
          @click="shareProof" 
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-none bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 hover:border-slate-300 hover:text-blue-600 hover:border-blue-600"
        >
          📤 Compartir Comprobante
        </button>
        <button 
          @click="downloadProof" 
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-none bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 hover:border-slate-300 hover:text-green-600 hover:border-green-600"
        >
          💾 Descargar
        </button>
        <button 
          @click="reportIssue" 
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-none bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 hover:border-slate-300 hover:text-red-600 hover:border-red-600"
        >
          ⚠️ Reportar Problema
        </button>
      </div>
    </div>

    <!-- Modal de Error de Imagen -->
    <div v-if="showErrorModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" @click="closeErrorModal">
      <div class="bg-white p-6 rounded-xl max-w-md text-center" @click.stop>
        <h3 class="m-0 mb-3 text-lg font-semibold text-gray-800">Error al Cargar Imagen</h3>
        <p class="m-0 mb-5 text-sm text-gray-600">{{ errorMessage }}</p>
        <div class="flex gap-3 justify-center">
          <button 
            @click="retryImageLoad" 
            class="px-4 py-2 rounded-md border-none bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition-colors"
          >
            🔄 Reintentar
          </button>
          <button 
            @click="closeErrorModal" 
            class="px-4 py-2 rounded-md border-none bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
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

// Computed properties
const hasProofOfDelivery = computed(() => {
  return !!(props.order?.proof_of_delivery)
})

const hasPhotos = computed(() => {
  if (!hasProofOfDelivery.value) return false
  
  const proof = props.order.proof_of_delivery
  
  return !!(
    (Array.isArray(proof.photo_urls) && proof.photo_urls.length > 0) ||
    (Array.isArray(proof.podUrls) && proof.podUrls.length > 0) ||
    proof.photo_url
  )
})

const deliveryPhotos = computed(() => {
  const photoUrls = new Set();
  const proof = props.order?.proof_of_delivery;

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

  console.log('🔍 RESULTADO deliveryPhotos:', result);

  return result;
});

const hasGpsLocation = computed(() => {
  if (!hasProofOfDelivery.value) return false
  const coords = props.order.proof_of_delivery.gps_coordinates
  return coords && coords.lat && coords.lng
})

// Methods
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

function retryImageLoad() {
  if (failedImageIndex.value !== null) {
    imageLoadStates.value[failedImageIndex.value] = 'loading'
    
    const imgElements = document.querySelectorAll('.cursor-zoom-in')
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

    const response = await apiService({
      method: 'GET',
      url: `/labels/proof/${orderId}/download`,
      responseType: 'blob',
    });

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
/* Solo animación de spin */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .max-w-3xl {
    margin: 10px;
    padding: 1rem;
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
  
  .flex.items-center.justify-center.gap-4 {
    flex-direction: column;
    text-align: center;
  }
}
</style>