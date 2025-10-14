<template>
  <main class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12">
    <div class="w-full max-w-md">
      <!-- Card Principal -->
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-10 text-center">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-xl mb-4 p-2">
            <img src="../assets/envigoLogo.png" alt="enviGo Logo" class="w-full h-full object-contain">
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">
            {{ currentView === 'login' ? 'Iniciar Sesión' : 'Restablecer Contraseña' }}
          </h1>
          <p class="text-blue-100 text-sm">
            {{ currentView === 'login' ? 'Accede a tu cuenta de enviGo' : 'Te enviaremos un enlace para restablecer tu contraseña' }}
          </p>
        </div>

        <!-- Mensajes de error/éxito -->
        <div v-if="error" class="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-800">{{ error }}</p>
          </div>
        </div>

        <div v-if="successMessage" class="mx-8 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
          </div>
        </div>

        <!-- Formulario de Login -->
        <form v-if="currentView === 'login'" @submit.prevent="handleLogin" class="p-8 space-y-6">
          <!-- Email -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-semibold text-slate-700">
              Correo electrónico
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                </svg>
              </div>
              <input
                id="email"
                type="email"
                v-model="email"
                required
                :disabled="loading"
                placeholder="tu@empresa.com"
                class="block w-full pl-10 pr-3 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
                :class="emailError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'"
              />
            </div>
            <p v-if="emailError" class="text-sm text-red-600 flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              {{ emailError }}
            </p>
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold text-slate-700">
              Contraseña
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <input
                id="password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                required
                :disabled="loading"
                placeholder="••••••••"
                class="block w-full pl-10 pr-12 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
                :class="passwordError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                tabindex="-1"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
            <p v-if="passwordError" class="text-sm text-red-600 flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              {{ passwordError }}
            </p>
          </div>

          <!-- Opciones -->
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                v-model="rememberMe"
                :disabled="loading"
                class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-all disabled:opacity-50"
              />
              <span class="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Recordarme por 30 días</span>
            </label>
            <button
              type="button"
              @click="currentView = 'reset'"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <!-- Botón de submit -->
          <button
            type="submit"
            :disabled="!isFormValid || loading"
            class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-blue-600 shadow-lg hover:shadow-xl"
          >
            <svg v-if="loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span>{{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}</span>
          </button>
        </form>

        <!-- Formulario de Reset Password -->
        <form v-else @submit.prevent="handlePasswordReset" class="p-8 space-y-6">
          <div class="space-y-2">
            <label for="resetEmail" class="block text-sm font-semibold text-slate-700">
              Correo electrónico
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                </svg>
              </div>
              <input
                id="resetEmail"
                type="email"
                v-model="resetEmail"
                required
                :disabled="loading"
                placeholder="tu@empresa.com"
                class="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <p class="text-sm text-slate-500 mt-2">Te enviaremos un enlace seguro para restablecer tu contraseña</p>
          </div>

          <!-- Botones -->
          <div class="space-y-3">
            <button
              type="submit"
              :disabled="!resetEmail || loading"
              class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <svg v-if="loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>{{ loading ? 'Enviando...' : 'Enviar enlace de restablecimiento' }}</span>
            </button>
            <button
              type="button"
              @click="goBackToLogin"
              class="w-full px-6 py-3 border-2 border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center">
        <p class="text-sm text-slate-600">
          ¿No tienes una cuenta? 
          <a href="#" class="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Contacta con soporte
          </a>
        </p>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const auth = useAuthStore()

// Estado del componente
const currentView = ref('login') // 'login' | 'reset'
const email = ref('')
const password = ref('')
const resetEmail = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

// Errores específicos de campos
const emailError = ref('')
const passwordError = ref('')

// Computed
const isFormValid = computed(() => {
  if (currentView.value === 'login') {
    return email.value && password.value && !emailError.value && !passwordError.value
  }
  return resetEmail.value && isValidEmail(resetEmail.value)
})

// Validaciones
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateEmail = () => {
  if (!email.value) {
    emailError.value = ''
    return
  }
  
  if (!isValidEmail(email.value)) {
    emailError.value = 'Por favor ingresa un email válido'
  } else {
    emailError.value = ''
  }
}

const validatePassword = () => {
  if (!password.value) {
    passwordError.value = ''
    return
  }
  
  if (password.value.length < 6) {
    passwordError.value = 'La contraseña debe tener al menos 6 caracteres'
  } else {
    passwordError.value = ''
  }
}

// Watchers para validación en tiempo real
watch(email, validateEmail)
watch(password, validatePassword)

// Métodos
const clearMessages = () => {
  error.value = ''
  successMessage.value = ''
  emailError.value = ''
  passwordError.value = ''
}

const handleLogin = async () => {
  if (loading.value || !isFormValid.value) return
  
  clearMessages()
  loading.value = true

  try {
    const result = await auth.login(email.value, password.value, rememberMe.value)

    if (result.success) {
      successMessage.value = 'Inicio de sesión exitoso'
      
      setTimeout(() => {
        if (auth.isAdmin) {
          router.push({ name: 'AdminDashboard' })
        } else {
          router.push({ name: 'Dashboard' })
        }
      }, 500)
    } else {
      error.value = result.error || 'Error al iniciar sesión'
      
      if (result.locked && result.locked_until) {
        const unlockTime = new Date(result.locked_until).toLocaleString('es-CL')
        error.value += `. Tu cuenta se desbloqueará el ${unlockTime}`
      }
    }
  } catch (err) {
    error.value = err.message || 'Error de conexión'
  } finally {
    loading.value = false
  }
}

const handlePasswordReset = async () => {
  if (loading.value || !resetEmail.value) return
  
  clearMessages()
  loading.value = true

  try {
    const result = await auth.requestPasswordReset(resetEmail.value)
    
    if (result.success) {
      successMessage.value = 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      resetEmail.value = ''
    } else {
      error.value = result.error || 'Error al enviar solicitud'
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al enviar solicitud'
  } finally {
    loading.value = false
  }
}

const goBackToLogin = () => {
  currentView.value = 'login'
  clearMessages()
  resetEmail.value = ''
}

// Lifecycle
onMounted(() => {
  auth.clearError()
  
  if (auth.isLoggedIn) {
    if (auth.isAdmin) {
      router.push({ name: 'AdminDashboard' })
    } else {
      router.push({ name: 'Dashboard' })
    }
  }
  
  setTimeout(() => {
    const firstInput = document.querySelector('input[type="email"]')
    if (firstInput) firstInput.focus()
  }, 100)
})
</script>