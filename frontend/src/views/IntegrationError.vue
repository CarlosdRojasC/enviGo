<template>
  <div class="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
    <div class="max-w-2xl w-full">
      <!-- Card Principal -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <!-- Header con icono de error -->
        <div class="bg-gradient-to-r from-red-500 to-orange-600 p-8 text-center">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
            <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">
            Error en la integración
          </h1>
          <p class="text-red-50 text-lg">
            No pudimos conectar tu cuenta de {{ platformName }}
          </p>
        </div>

        <!-- Contenido -->
        <div class="p-8 space-y-6">
          <!-- Mensaje de error -->
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {{ errorTitle }}
            </h3>
            <p class="text-red-700 dark:text-red-300">
              {{ errorMessage }}
            </p>
          </div>

          <!-- Causas comunes -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Causas comunes de este error
            </h4>
            <ul class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li class="flex items-start gap-2">
                <span class="text-orange-500 mt-0.5 flex-shrink-0">•</span>
                <span>Cancelaste la autorización en {{ platformName }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-orange-500 mt-0.5 flex-shrink-0">•</span>
                <span>Las credenciales de la aplicación no están configuradas correctamente</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-orange-500 mt-0.5 flex-shrink-0">•</span>
                <span>La URL de callback no coincide con la registrada en {{ platformName }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-orange-500 mt-0.5 flex-shrink-0">•</span>
                <span>Problemas temporales de conexión con {{ platformName }}</span>
              </li>
            </ul>
          </div>

          <!-- Qué hacer ahora -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
              ¿Qué puedes hacer?
            </h3>
            
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p class="font-medium text-blue-900 dark:text-blue-100">Intenta nuevamente</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">Vuelve a la página de canales e intenta conectar de nuevo</p>
                </div>
              </div>
              
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p class="font-medium text-blue-900 dark:text-blue-100">Verifica tus permisos</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">Asegúrate de tener permisos de administrador en {{ platformName }}</p>
                </div>
              </div>
              
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p class="font-medium text-blue-900 dark:text-blue-100">Contacta a soporte</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">Si el problema persiste, nuestro equipo puede ayudarte</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Detalles técnicos (colapsable) -->
          <div v-if="technicalDetails" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              @click="showTechnicalDetails = !showTechnicalDetails"
              class="w-full px-6 py-3 bg-gray-50 dark:bg-gray-900 text-left font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
            >
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                </svg>
                Detalles técnicos
              </span>
              <svg 
                class="w-5 h-5 transition-transform" 
                :class="{ 'rotate-180': showTechnicalDetails }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            <div v-show="showTechnicalDetails" class="p-6 bg-gray-50 dark:bg-gray-900/50">
              <pre class="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">{{ technicalDetails }}</pre>
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              @click="tryAgain"
              class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Intentar nuevamente
            </button>
            
            <button
              @click="contactSupport"
              class="flex-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-500 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              Contactar soporte
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-6">
        <button
          @click="goToChannels"
          class="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium transition-colors"
        >
          ← Volver a Canales
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const router = useRouter()
const route = useRoute()
const toast = useToast()

// Estado
const showTechnicalDetails = ref(false)

// Obtener datos de la URL
const platform = computed(() => route.query.platform || 'la plataforma')
const errorCode = computed(() => route.query.error || 'unknown')
const errorMsg = computed(() => route.query.message || 'Error desconocido')

// Nombres amigables de plataformas
const platformNames = {
  'mercadolibre': 'MercadoLibre',
  'shopify': 'Shopify',
  'woocommerce': 'WooCommerce',
  'jumpseller': 'Jumpseller'
}

const platformName = computed(() => platformNames[platform.value] || platform.value)

// Títulos de error según el código
const errorTitles = {
  'oauth_denied': 'Autorización cancelada',
  'missing_params': 'Parámetros faltantes',
  'validation_failed': 'Error de validación',
  'timeout': 'Tiempo de espera agotado',
  'unknown': 'Error desconocido'
}

const errorTitle = computed(() => errorTitles[errorCode.value] || 'Error en la integración')

const errorMessage = computed(() => {
  return decodeURIComponent(errorMsg.value)
})

const technicalDetails = computed(() => {
  return JSON.stringify({
    platform: platform.value,
    error_code: errorCode.value,
    message: errorMsg.value,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent
  }, null, 2)
})

onMounted(() => {
  // Mostrar notificación de error
  toast.error(`Error al conectar con ${platformName.value}`, {
    timeout: 5000
  })
})

// Métodos
function tryAgain() {
  router.push('/app/channels')
}

function goToChannels() {
  router.push('/app/channels')
}

function contactSupport() {
  toast.info('Abriendo chat de soporte...')
  // Aquí puedes implementar tu sistema de soporte
  // Por ejemplo: abrir un modal, chat en vivo, o redirigir a una página de contacto
}
</script>

<style scoped>
.rotate-180 {
  transform: rotate(180deg);
}
</style>