<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
    <div class="max-w-2xl w-full">
      <!-- Card Principal -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <!-- Header con icono animado -->
        <div class="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 animate-bounce">
            <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">
            ¡Integración Exitosa! 🎉
          </h1>
          <p class="text-green-50 text-lg">
            Tu cuenta de {{ channelName }} ha sido conectada correctamente
          </p>
        </div>

        <!-- Contenido -->
        <div class="p-8 space-y-6">
          <!-- Mensaje principal -->
          <div class="text-center">
            <p class="text-gray-700 dark:text-gray-300 text-lg">
              En los próximos minutos comenzaremos a sincronizar automáticamente 
              todos los pedidos pendientes del día.
            </p>
          </div>

          <!-- Proceso de sincronización -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              ¿Qué sucederá ahora?
            </h3>
            
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p class="font-medium text-blue-900 dark:text-blue-100">Sincronización inicial</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">Traeremos todos los pedidos pendientes de hoy</p>
                </div>
              </div>
              
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p class="font-medium text-blue-900 dark:text-blue-100">Sincronización automática</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">Los nuevos pedidos se importarán cada 15 minutos</p>
                </div>
              </div>
              
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p class="font-medium text-blue-900 dark:text-blue-100">Notificaciones en tiempo real</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">Recibirás webhooks cuando haya nuevas ventas</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Temporizador de sincronización -->
          <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 text-center">
            <p class="text-gray-700 dark:text-gray-300 mb-2">
              Primera sincronización en curso...
            </p>
            <div class="flex items-center justify-center gap-3">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <span class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {{ countdown }}
              </span>
              <span class="text-gray-600 dark:text-gray-400">segundos</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Tiempo estimado de sincronización
            </p>
          </div>

          <!-- Información adicional -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Información importante
            </h4>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li class="flex items-start gap-2">
                <span class="text-green-500 mt-0.5">✓</span>
                <span>Los pedidos se importarán con el estado "Pendiente"</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-green-500 mt-0.5">✓</span>
                <span>Puedes revisar el historial de sincronización en la sección de Canales</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-green-500 mt-0.5">✓</span>
                <span>Si tienes dudas, contacta a soporte desde el menú de ayuda</span>
              </li>
            </ul>
          </div>

          <!-- Botones de acción -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              @click="goToOrders"
              class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Ver mis pedidos
            </button>
            
            <button
              @click="goToChannels"
              class="flex-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              Gestionar canales
            </button>
          </div>
        </div>
      </div>

      <!-- Footer con ayuda -->
      <div class="text-center mt-6">
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          ¿Necesitas ayuda? 
          <a href="#" @click.prevent="contactSupport" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Contacta a soporte
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const router = useRouter()
const route = useRoute()
const toast = useToast()

// Estado
const countdown = ref(90) // 90 segundos de countdown
const channelName = ref('MercadoLibre')

// Timer
let countdownInterval = null

onMounted(() => {
  // Obtener el nombre del canal de los query params
  const name = route.query.channel_name
  if (name) {
    channelName.value = decodeURIComponent(name)
  }

  // Iniciar countdown
  countdownInterval = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(countdownInterval)
    }
  }, 1000)

  // Mostrar notificación de bienvenida
  toast.success(`¡Bienvenido! Tu canal ${channelName.value} está listo`, {
    timeout: 5000
  })
})

onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

// Métodos
function goToOrders() {
  router.push('/app/orders')
}

function goToChannels() {
  router.push('/app/channels')
}

function contactSupport() {
  // Aquí puedes abrir un modal de soporte o redirigir a una página de contacto
  toast.info('Abriendo chat de soporte...')
  // router.push('/support')
}
</script>

<style scoped>
@keyframes bounce {
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

.animate-bounce {
  animation: bounce 1s infinite;
}
</style>