<template>
  <main class="login-page">
    <div class="login-card">
      <!-- Header mejorado -->
      <div class="login-header">
        <div class="logo-container">
         <img src="../assets/envigoLogo.png" alt="enviGo Logo" class="logo-icon">
        </div>
        <h1 class="login-title">
          {{ currentView === 'login' ? 'Iniciar Sesión' : 'Restablecer Contraseña' }}
        </h1>
        <p class="login-subtitle">
          {{ currentView === 'login' ? 'Accede a tu cuenta de enviGo' : 'Te enviaremos un enlace para restablecer tu contraseña' }}
        </p>
      </div>

      <!-- Formulario de Login -->
      <form v-if="currentView === 'login'" @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email" class="form-label">Correo electrónico</label>
          <div class="input-container">
            <input
              id="email"
              type="email"
              v-model="email"
              required
              class="form-input"
              :class="{ 'input-error': emailError }"
              placeholder="tu@empresa.com"
              :disabled="loading"
            />
            <div class="input-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
              </svg>
            </div>
          </div>
          <span v-if="emailError" class="field-error">{{ emailError }}</span>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Contraseña</label>
          <div class="input-container">
            <input
              id="password"
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              required
              class="form-input password-input"
              :class="{ 'input-error': passwordError }"
              placeholder="••••••••"
              :disabled="loading"
            />
            <div class="input-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <svg v-if="!showPassword" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
              </svg>
            </button>
          </div>
          <span v-if="passwordError" class="field-error">{{ passwordError }}</span>
        </div>

        <!-- Opciones adicionales -->
        <div class="form-options">
          <div class="remember-me">
            <input
              id="remember-me"
              type="checkbox"
              v-model="rememberMe"
              class="checkbox"
            />
            <label for="remember-me" class="checkbox-label">
              Recordarme por 30 días
            </label>
          </div>
          <button
            type="button"
            class="forgot-password-btn"
            @click="currentView = 'reset'"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <!-- Mensaje de error global -->
        <div v-if="error" class="error-message">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span>{{ error }}</span>
        </div>

        <!-- Mensaje de éxito -->
        <div v-if="successMessage" class="success-message">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span>{{ successMessage }}</span>
        </div>

        <button
          type="submit"
          :disabled="loading || !isFormValid"
          class="submit-btn"
        >
          <span v-if="loading" class="loading-spinner">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
              <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </span>
          {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
        </button>
      </form>

      <!-- Formulario de Reset Password -->
      <form v-if="currentView === 'reset'" @submit.prevent="handlePasswordReset" class="login-form">
        <div class="form-group">
          <label for="reset-email" class="form-label">Correo electrónico</label>
          <div class="input-container">
            <input
              id="reset-email"
              type="email"
              v-model="resetEmail"
              required
              class="form-input"
              placeholder="tu@empresa.com"
              :disabled="loading"
            />
            <div class="input-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
              </svg>
            </div>
          </div>
          <p class="input-help">Te enviaremos un enlace seguro para restablecer tu contraseña</p>
        </div>

        <!-- Mensajes -->
        <div v-if="error" class="error-message">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span>{{ error }}</span>
        </div>

        <div v-if="successMessage" class="success-message">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span>{{ successMessage }}</span>
        </div>

        <div class="button-group">
          <button
            type="submit"
            :disabled="loading"
            class="submit-btn"
          >
            {{ loading ? 'Enviando...' : 'Enviar enlace de restablecimiento' }}
          </button>
          <button
            type="button"
            class="secondary-btn"
            @click="goBackToLogin"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </form>
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
      
      // Pequeño delay para mostrar el mensaje de éxito
      setTimeout(() => {
        if (auth.isAdmin) {
          router.push({ name: 'AdminDashboard' })
        } else {
          router.push({ name: 'Dashboard' })
        }
      }, 500)
    } else {
      error.value = result.error || 'Error al iniciar sesión'
      
      // Si es un error de cuenta bloqueada, mostrar información adicional
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
  // Limpiar errores previos del store
  auth.clearError()
  
  // Si ya está logueado, redirigir
  if (auth.isLoggedIn) {
    if (auth.isAdmin) {
      router.push({ name: 'AdminDashboard' })
    } else {
      router.push({ name: 'Dashboard' })
    }
  }
  
  // Focus en el primer input
  setTimeout(() => {
    const firstInput = document.querySelector('input[type="email"]')
    if (firstInput) firstInput.focus()
  }, 100)
})
</script>

<style scoped>
/* ==================== PARTE 1: LAYOUT PRINCIPAL Y VARIABLES ==================== */

/* Layout principal de la página de login */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, var(--dark) 0%, var(--dark-lighter) 50%, #4A4A4A 100%);
  font-family: var(--font-family);
}

/* Tarjeta principal del login */
.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--white);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-hover);
  border: 1px solid rgba(139, 197, 63, 0.1);
}

/* Animación de entrada */
.login-card {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* ==================== PARTE 2: HEADER CON COLORES ENVIGO ==================== */

/* Header con gradiente de enviGo */
.login-header {
  background: var(--gradient);
  color: var(--white);
  padding: 2rem 1.5rem;
  text-align: center;
  position: relative;
}

/* Efecto adicional al header */
.login-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 100%);
  pointer-events: none;
}

/* Contenedor del logo */
.logo-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  margin-bottom: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.logo-container:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* Icono del logo */
.logo-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--white);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

/* Título del login */
.login-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--white);
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Subtítulo */
.login-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
  font-weight: 400;
  color: var(--white);
}
/* ==================== PARTE 3: FORMULARIO E INPUTS ==================== */

/* Formulario principal */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 2rem 1.5rem;
}

/* Grupo de campos */
.form-group {
  width: 100%;
}

/* Etiquetas de campos */
.form-label {
  display: block;
  margin-bottom: 8px;
  color: var(--dark);
  font-weight: 500;
  font-size: 14px;
}

/* Contenedor de input */
.input-container {
  position: relative;
}

/* Inputs principales */
.form-input {
  width: 100%;
  padding: 14px 16px;
  padding-left: 44px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
  transition: all 0.2s ease;
  background: var(--white);
  font-family: var(--font-family);
}

/* Input de contraseña con padding derecho */
.password-input {
  padding-right: 44px;
}

/* Placeholder */
.form-input::placeholder {
  color: var(--gray);
}

/* Estado focus con colores de enviGo */
.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 197, 63, 0.1);
}

/* Estado deshabilitado */
.form-input:disabled {
  background-color: var(--gray-light);
  color: var(--gray);
  cursor: not-allowed;
}

/* Input con error */
.input-error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

/* Iconos dentro de inputs */
.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.input-icon svg {
  width: 18px;
  height: 18px;
  color: var(--gray);
  transition: color 0.2s ease;
}

/* Cambiar color del icono cuando el input tiene focus */
.form-input:focus + .input-icon svg,
.form-input:focus ~ .input-icon svg {
  color: var(--primary);
}
/* ==================== PARTE 4: TOGGLE CONTRASEÑA Y OPCIONES ==================== */

/* Botón para mostrar/ocultar contraseña */
.password-toggle {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.password-toggle:hover {
  background-color: rgba(139, 197, 63, 0.1);
}

.password-toggle svg {
  width: 18px;
  height: 18px;
  color: var(--gray);
  transition: color 0.2s ease;
}

.password-toggle:hover svg {
  color: var(--primary);
}

/* Opciones del formulario */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

/* Recordarme */
.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Checkbox personalizado con colores de enviGo */
.checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  color: var(--dark);
  cursor: pointer;
  transition: color 0.2s ease;
}

.checkbox-label:hover {
  color: var(--primary);
}

/* Botón de olvidar contraseña */
.forgot-password-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
}

.forgot-password-btn:hover {
  color: var(--primary-dark);
  text-decoration: underline;
  background: rgba(139, 197, 63, 0.1);
}
/* ==================== PARTE 5: MENSAJES DE ERROR Y ÉXITO ==================== */

/* Mensajes de error y éxito */
.error-message, .success-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
}

/* Mensaje de error */
.error-message {
  color: #b91c1c;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-left: 4px solid #ef4444;
}

/* Mensaje de éxito con colores de enviGo */
.success-message {
  color: var(--accent);
  background-color: rgba(139, 197, 63, 0.1);
  border: 1px solid rgba(139, 197, 63, 0.3);
  border-left: 4px solid var(--primary);
}

/* Iconos de mensajes */
.error-icon svg, .success-icon svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.error-icon svg {
  color: #ef4444;
}

.success-icon svg {
  color: var(--primary);
}

/* Error de campo específico */
.field-error {
  display: block;
  color: #ef4444;
  font-size: 12px;
  margin-top: 6px;
  font-weight: 500;
}

/* Ayuda de input */
.input-help {
  margin-top: 6px;
  font-size: 12px;
  color: var(--gray);
}

/* Animación de aparición de mensajes */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* ==================== PARTE 6: BOTONES CON GRADIENTE ENVIGO ==================== */

/* Botón principal de submit */
.submit-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  background: var(--gradient);
  color: var(--white);
  transition: all 0.2s ease;
  margin-top: 10px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  font-family: var(--font-family);
  box-shadow: var(--shadow-green);
}

/* Hover del botón principal */
.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}

/* Estado activo del botón */
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow);
}

/* Estado deshabilitado */
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  background: var(--gray-light);
  color: var(--gray);
}

/* Grupo de botones */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Botón secundario */
.secondary-btn {
  width: 100%;
  padding: 12px 20px;
  border: 2px solid rgba(139, 197, 63, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  background: var(--white);
  color: var(--primary);
  transition: all 0.2s ease;
  font-family: var(--font-family);
}

/* Hover del botón secundario */
.secondary-btn:hover {
  background: rgba(139, 197, 63, 0.1);
  border-color: var(--primary);
  color: var(--primary-dark);
}
/* ==================== PARTE 7: SPINNER Y ESTADOS DE CARGA ==================== */

/* Spinner de carga */
.loading-spinner {
  position: absolute;
  left: 16px;
}

.loading-spinner svg {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
  color: var(--white);
}

/* Animación de rotación */
@keyframes spin {
  from { 
    transform: rotate(0deg); 
  }
  to { 
    transform: rotate(360deg); 
  }
}

/* Estados de focus mejorados con colores de enviGo */
.form-input:focus,
.checkbox:focus,
.submit-btn:focus,
.secondary-btn:focus,
.forgot-password-btn:focus,
.password-toggle:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Focus visible para accesibilidad */
.form-input:focus-visible,
.checkbox:focus-visible,
.submit-btn:focus-visible,
.secondary-btn:focus-visible,
.forgot-password-btn:focus-visible,
.password-toggle:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Estado loading para inputs */
.form-input:disabled {
  background-color: var(--gray-light);
  color: var(--gray);
  cursor: not-allowed;
  border-color: #e5e7eb;
}
/* ==================== PARTE 8: RESPONSIVE DESIGN ==================== */

/* Responsive para móviles */
@media (max-width: 480px) {
  .login-page {
    padding: 16px;
    background: linear-gradient(135deg, var(--dark) 0%, var(--dark-lighter) 100%);
  }
  
  .login-card {
    max-width: 100%;
    border-radius: 12px;
  }
  
  .login-header {
    padding: 1.5rem 1rem;
  }
  
  .login-form {
    padding: 1.5rem 1rem;
  }
  
  .login-title {
    font-size: 24px;
  }
  
  .form-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .form-input {
    font-size: 16px; /* Evita zoom en iOS */
  }
}

/* Responsive para tablets */
@media (max-width: 768px) and (min-width: 481px) {
  .login-page {
    padding: 24px;
  }
  
  .login-card {
    max-width: 400px;
  }
}

/* Estados hover solo en dispositivos que lo soportan */
@media (hover: hover) {
  .logo-container:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
  
  .password-toggle:hover {
    background-color: rgba(139, 197, 63, 0.1);
  }
  
  .checkbox-label:hover {
    color: var(--primary);
  }
  
  .forgot-password-btn:hover {
    color: var(--primary-dark);
    background: rgba(139, 197, 63, 0.1);
  }
  
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  .secondary-btn:hover {
    background: rgba(139, 197, 63, 0.1);
  }
}

/* Modo oscuro (si está habilitado en el sistema) */
@media (prefers-color-scheme: dark) {
  .login-page {
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  }
}
</style>