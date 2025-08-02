<!-- frontend/src/views/ResetPassword.vue -->
<template>
  <main class="auth-main">
    <div class="auth-container">
      <!-- Header -->
      <div class="auth-header">
        <div class="logo-container">
          <div class="logo">
            <div class="logo-icon">📦</div>
            <span class="logo-text">envi<span class="logo-accent">Go</span></span>
          </div>
        </div>
        <h1 class="auth-title">Restablecer Contraseña</h1>
        <p class="auth-subtitle">Ingresa tu nueva contraseña para continuar</p>
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

      <!-- Estado de validación del token -->
      <div v-if="tokenStatus === 'validating'" class="loading-message">
        <div class="spinner"></div>
        <span>Validando enlace de restablecimiento...</span>
      </div>

      <div v-if="tokenStatus === 'expired'" class="warning-message">
        <div class="warning-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <div>
          <p class="warning-title">Enlace expirado</p>
          <p class="warning-text">El enlace de restablecimiento ha expirado. Solicita uno nuevo.</p>
          <router-link to="/forgot-password" class="link-button">
            Solicitar nuevo enlace
          </router-link>
        </div>
      </div>

      <div v-if="tokenStatus === 'invalid'" class="error-message">
        <div class="error-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <p class="error-title">Enlace inválido</p>
          <p class="error-text">El enlace de restablecimiento no es válido o ya fue utilizado.</p>
          <router-link to="/forgot-password" class="link-button">
            Solicitar nuevo enlace
          </router-link>
        </div>
      </div>

      <!-- Formulario de reset password -->
      <form v-if="tokenStatus === 'valid'" @submit.prevent="handleResetPassword" class="auth-form">
        <!-- Nueva contraseña -->
        <div class="form-group">
          <label for="new-password" class="form-label">Nueva Contraseña</label>
          <div class="input-container">
            <input
              id="new-password"
              :type="showNewPassword ? 'text' : 'password'"
              v-model="newPassword"
              required
              class="form-input password-input"
              :class="{ 'input-error': newPasswordError }"
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
              @click="showNewPassword = !showNewPassword"
              tabindex="-1"
            >
              <svg v-if="!showNewPassword" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
              </svg>
            </button>
          </div>
          <span v-if="newPasswordError" class="field-error">{{ newPasswordError }}</span>
          <div v-if="newPassword" class="password-strength">
            <div class="strength-meter">
              <div class="strength-bar" :class="passwordStrength.class" :style="{ width: passwordStrength.width }"></div>
            </div>
            <span class="strength-text" :class="passwordStrength.class">{{ passwordStrength.text }}</span>
          </div>
        </div>

        <!-- Confirmar contraseña -->
        <div class="form-group">
          <label for="confirm-password" class="form-label">Confirmar Nueva Contraseña</label>
          <div class="input-container">
            <input
              id="confirm-password"
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="confirmPassword"
              required
              class="form-input password-input"
              :class="{ 'input-error': confirmPasswordError }"
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
              @click="showConfirmPassword = !showConfirmPassword"
              tabindex="-1"
            >
              <svg v-if="!showConfirmPassword" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
              </svg>
            </button>
          </div>
          <span v-if="confirmPasswordError" class="field-error">{{ confirmPasswordError }}</span>
        </div>

        <!-- Requisitos de contraseña -->
        <div class="password-requirements">
          <p class="requirements-title">La contraseña debe tener:</p>
          <ul class="requirements-list">
            <li :class="{ 'requirement-met': requirements.length }">
              <svg v-if="requirements.length" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Al menos 8 caracteres
            </li>
            <li :class="{ 'requirement-met': requirements.uppercase }">
              <svg v-if="requirements.uppercase" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Una letra mayúscula
            </li>
            <li :class="{ 'requirement-met': requirements.lowercase }">
              <svg v-if="requirements.lowercase" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Una letra minúscula
            </li>
            <li :class="{ 'requirement-met': requirements.number }">
              <svg v-if="requirements.number" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Al menos un número
            </li>
          </ul>
        </div>

        <button
          type="submit"
          :disabled="loading || !isFormValid"
          class="submit-btn"
        >
          <span v-if="loading" class="btn-spinner"></span>
          {{ loading ? 'Actualizando contraseña...' : 'Actualizar Contraseña' }}
        </button>

        <div class="auth-footer">
          <router-link to="/login" class="back-link">
            ← Volver al inicio de sesión
          </router-link>
        </div>
      </form>

      <!-- Success state -->
      <div v-if="resetSuccess" class="success-container">
        <div class="success-icon-large">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2>¡Contraseña actualizada!</h2>
        <p>Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <router-link to="/login" class="primary-btn">
          Ir al inicio de sesión
        </router-link>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
// Estado del componente
const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const resetSuccess = ref(false)

// Estados del token
const tokenStatus = ref('validating') // 'validating' | 'valid' | 'invalid' | 'expired'

// Errores específicos
const newPasswordError = ref('')
const confirmPasswordError = ref('')

// Validaciones y requisitos de contraseña
const requirements = computed(() => ({
  length: newPassword.value.length >= 8,
  uppercase: /[A-Z]/.test(newPassword.value),
  lowercase: /[a-z]/.test(newPassword.value),
  number: /\d/.test(newPassword.value)
}))

const passwordStrength = computed(() => {
  const score = Object.values(requirements.value).filter(Boolean).length
  
  if (score === 0) return { class: '', width: '0%', text: '' }
  if (score === 1) return { class: 'strength-weak', width: '25%', text: 'Muy débil' }
  if (score === 2) return { class: 'strength-fair', width: '50%', text: 'Débil' }
  if (score === 3) return { class: 'strength-good', width: '75%', text: 'Buena' }
  return { class: 'strength-strong', width: '100%', text: 'Fuerte' }
})

const isFormValid = computed(() => {
  return newPassword.value &&
         confirmPassword.value &&
         !newPasswordError.value &&
         !confirmPasswordError.value &&
         Object.values(requirements.value).every(Boolean) &&
         newPassword.value === confirmPassword.value
})

// Validaciones
const validateNewPassword = () => {
  if (!newPassword.value) {
    newPasswordError.value = ''
    return
  }

  if (newPassword.value.length < 8) {
    newPasswordError.value = 'La contraseña debe tener al menos 8 caracteres'
  } else if (!Object.values(requirements.value).every(Boolean)) {
    newPasswordError.value = 'La contraseña no cumple todos los requisitos'
  } else {
    newPasswordError.value = ''
  }
}

const validateConfirmPassword = () => {
  if (!confirmPassword.value) {
    confirmPasswordError.value = ''
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    confirmPasswordError.value = 'Las contraseñas no coinciden'
  } else {
    confirmPasswordError.value = ''
  }
}

// Watchers
watch(newPassword, () => {
  validateNewPassword()
  if (confirmPassword.value) {
    validateConfirmPassword()
  }
})

watch(confirmPassword, validateConfirmPassword)

// Métodos
const clearMessages = () => {
  error.value = ''
  successMessage.value = ''
  newPasswordError.value = ''
  confirmPasswordError.value = ''
}

const validateToken = async () => {
  tokenStatus.value = 'validating';
  try {
    // Llamada real al backend para validar
    await auth.validateResetToken(token.value);
    tokenStatus.value = 'valid'; // El token es bueno, muestra el formulario
  } catch (err) {
    console.error('Error al validar el token:', err);
    // El backend respondió con un error (400), por lo que el token es inválido/expirado
    tokenStatus.value = 'expired'; // Muestra el mensaje de enlace expirado/inválido
  }
};

const handleResetPassword = async () => {
  if (loading.value || !isFormValid.value) return

  clearMessages()
  loading.value = true

  try {
    const response = await auth.resetPassword(token.value, newPassword.value)
    
    if (response.data.message) {
      resetSuccess.value = true
      successMessage.value = response.data.message
    }
  } catch (err) {
    console.error('Error resetting password:', err)
    
    const errorMessage = err.response?.data?.error || 'Error al actualizar la contraseña'
    
    if (errorMessage.includes('Token inválido') || errorMessage.includes('expirado')) {
      tokenStatus.value = 'expired'
    } else if (errorMessage.includes('misma contraseña')) {
      error.value = 'La nueva contraseña debe ser diferente a la anterior'
    } else {
      error.value = errorMessage
    }
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  token.value = route.query.token || ''
  
  if (!token.value) {
    tokenStatus.value = 'invalid'
    return
  }
  
  validateToken()
})
</script>

<style scoped>
/* Reutilizamos los estilos base de login.vue y agregamos específicos */
.auth-main {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 480px;
  animation: slideUp 0.6s ease-out;
}

/* Logo y header */
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-container {
  margin-bottom: 24px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 28px;
  font-weight: 700;
}

.logo-icon {
  font-size: 32px;
}

.logo-text {
  color: #1f2937;
}

.logo-accent {
  color: #667eea;
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.auth-subtitle {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

/* Formulario */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.input-container {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
  background: white;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.input-error {
  border-color: #ef4444;
}

.password-input {
  padding-right: 48px;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.input-icon svg {
  width: 20px;
  height: 20px;
}

.password-toggle {
  position: absolute;
  right: 16px;
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
  background-color: #f3f4f6;
}

.password-toggle svg {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

/* Password strength */
.password-strength {
  margin-top: 8px;
}

.strength-meter {
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.strength-bar {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.strength-weak { 
  background-color: #ef4444; 
}

.strength-fair { 
  background-color: #f59e0b; 
}

.strength-good { 
  background-color: #3b82f6; 
}

.strength-strong { 
  background-color: #10b981; 
}

.strength-text {
  font-size: 12px;
  font-weight: 500;
}

.strength-text.strength-weak { color: #ef4444; }
.strength-text.strength-fair { color: #f59e0b; }
.strength-text.strength-good { color: #3b82f6; }
.strength-text.strength-strong { color: #10b981; }

/* Password requirements */
.password-requirements {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.requirements-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.requirements-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  transition: color 0.2s;
}

.requirements-list li.requirement-met {
  color: #059669;
}

.requirements-list li svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Mensajes */
.error-message, 
.success-message, 
.warning-message, 
.loading-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 24px;
}

.error-message {
  color: #b91c1c;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
}

.success-message {
  color: #166534;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.warning-message {
  color: #92400e;
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
}

.loading-message {
  color: #1d4ed8;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
}

.error-icon svg, 
.success-icon svg, 
.warning-icon svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.warning-title, 
.error-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.warning-text, 
.error-text {
  margin-bottom: 12px;
}

.link-button {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
}

.link-button:hover {
  text-decoration: underline;
}

.field-error {
  color: #ef4444;
  font-size: 12px;
  font-weight: 500;
}

/* Botones */
.submit-btn {
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

/* Success container */
.success-container {
  text-align: center;
  padding: 40px 20px;
}

.success-icon-large {
  width: 80px;
  height: 80px;
  background-color: #dcfce7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.success-icon-large svg {
  width: 40px;
  height: 40px;
  color: #16a34a;
}

.success-container h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.success-container p {
  color: #6b7280;
  font-size: 16px;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

/* Footer */
.auth-footer {
  text-align: center;
  margin-top: 24px;
}

.back-link {
  color: #6b7280;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.back-link:hover {
  color: #667eea;
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Animaciones */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .auth-container {
    padding: 24px;
    margin: 10px;
  }
  
  .auth-title {
    font-size: 24px;
  }
  
  .logo {
    font-size: 24px;
  }
  
  .logo-icon {
    font-size: 28px;
  }
}
</style>