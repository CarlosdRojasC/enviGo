<!-- frontend/src/views/Profile.vue -->
<template>
  <div class="profile-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">Mi Perfil</h1>
          <p class="page-subtitle">Gestiona tu información personal y configuración de cuenta</p>
        </div>
        <div class="header-actions">
          <button 
            v-if="hasChanges" 
            @click="saveChanges" 
            :disabled="saving"
            class="save-btn"
          >
            <span v-if="saving" class="btn-spinner"></span>
            {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </div>
<div class="profile-tabs">
      <button 
        @click="activeTab = 'profile'"
        :class="['tab-btn', { active: activeTab === 'profile' }]"
      >
        👤 Mi Perfil
      </button>
      
      <button 
        @click="activeTab = 'security'"
        :class="['tab-btn', { active: activeTab === 'security' }]"
      >
        🔒 Seguridad
      </button>
      
      <!-- Solo mostrar para administradores -->
      <button 
        v-if="auth.isAdmin"
        @click="activeTab = 'sessions'"
        :class="['tab-btn', { active: activeTab === 'sessions' }]"
      >
        👥 Sesiones Activas
      </button>
    </div>

    <!-- 🔥 AGREGAR AQUÍ EL WRAPPER DE CONTENIDO -->
    <div class="tab-content">
    <!-- Content -->
    <div class="profile-content">
      <!-- Avatar Section -->
      <div class="profile-section avatar-section">
        <div class="section-header">
          <h2 class="section-title">Foto de Perfil</h2>
          <p class="section-subtitle">Personaliza tu imagen de perfil</p>
        </div>
        
        <div class="avatar-container">
          <div class="current-avatar">
            <div class="avatar-circle" :style="{ background: avatarGradient }">
              <img v-if="profileData.avatar_url" :src="profileData.avatar_url" :alt="profileData.full_name" />
              <span v-else class="avatar-initials">{{ avatarInitials }}</span>
            </div>
            <div class="avatar-status" :class="{ online: isConnected }"></div>
          </div>
          
          <div class="avatar-actions">
            <label for="avatar-upload" class="upload-btn">
              <i class="upload-icon">📸</i>
              Cambiar Foto
            </label>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              @change="handleAvatarUpload"
              class="hidden-input"
            />
            <button v-if="profileData.avatar_url" @click="removeAvatar" class="remove-btn">
              <i class="remove-icon">🗑️</i>
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <!-- Personal Information -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">Información Personal</h2>
          <p class="section-subtitle">Actualiza tus datos básicos</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="full_name" class="form-label">Nombre Completo</label>
            <input
              id="full_name"
              v-model="profileData.full_name"
              type="text"
              class="form-input"
              placeholder="Tu nombre completo"
              @input="markAsChanged"
            />
          </div>
          
          <div class="form-group">
            <label for="email" class="form-label">Correo Electrónico</label>
            <input
              id="email"
              v-model="profileData.email"
              type="email"
              class="form-input"
              placeholder="tu@email.com"
              @input="markAsChanged"
            />
          </div>
          
          <div class="form-group">
            <label for="phone" class="form-label">Teléfono</label>
            <input
              id="phone"
              v-model="profileData.phone"
              type="tel"
              class="form-input"
              placeholder="+56 9 1234 5678"
              @input="markAsChanged"
            />
          </div>
          
          <div class="form-group">
            <label for="position" class="form-label">Cargo</label>
            <input
              id="position"
              v-model="profileData.position"
              type="text"
              class="form-input"
              placeholder="Tu cargo en la empresa"
              @input="markAsChanged"
            />
          </div>
        </div>
      </div>

      <!-- Security Section -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">Seguridad</h2>
          <p class="section-subtitle">Gestiona tu contraseña y seguridad</p>
        </div>
        
        <div class="security-grid">
          <div class="security-item">
            <div class="security-info">
              <h3 class="security-title">Contraseña</h3>
              <p class="security-subtitle">Última actualización: {{ lastPasswordChange }}</p>
            </div>
            <button @click="showPasswordModal = true" class="security-btn">
              Cambiar Contraseña
            </button>
          </div>
          
          <div class="security-item">
            <div class="security-info">
              <h3 class="security-title">Verificación en Dos Pasos</h3>
              <p class="security-subtitle">{{ profileData.two_factor_enabled ? 'Activa' : 'Inactiva' }}</p>
            </div>
            <button @click="toggle2FA" class="security-btn" :class="{ active: profileData.two_factor_enabled }">
              {{ profileData.two_factor_enabled ? 'Desactivar' : 'Activar' }}
            </button>
          </div>
        </div>
      </div>
    <div v-if="activeTab === 'sessions' && auth.isAdmin" class="tab-pane">
        <ActiveSessionsPanel />
      </div>
    </div>
      <!-- Account Information -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">Información de Cuenta</h2>
          <p class="section-subtitle">Detalles de tu cuenta en enviGo</p>
        </div>
        
        <div class="account-grid">
          <div class="account-item">
            <span class="account-label">Rol</span>
            <span class="account-value role-badge" :class="auth.user?.role">
              {{ formatRole(auth.user?.role) }}
            </span>
          </div>
          
          <div class="account-item">
            <span class="account-label">Empresa</span>
            <span class="account-value">{{ auth.user?.company?.name || 'Sin empresa' }}</span>
          </div>
          
          <div class="account-item">
            <span class="account-label">Fecha de Registro</span>
            <span class="account-value">{{ formatDate(auth.user?.created_at) }}</span>
          </div>
          
          <div class="account-item">
            <span class="account-label">Último Acceso</span>
            <span class="account-value">{{ formatDate(auth.user?.last_login) }}</span>
          </div>
        </div>
      </div>

      <!-- Activity Section -->
      <div class="profile-section">
        <div class="section-header">
          <h2 class="section-title">Actividad Reciente</h2>
          <p class="section-subtitle">Tus últimas acciones en la plataforma</p>
        </div>
        
        <div class="activity-list">
          <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.type">
              {{ getActivityIcon(activity.type) }}
            </div>
            <div class="activity-content">
              <p class="activity-title">{{ activity.title }}</p>
              <p class="activity-subtitle">{{ activity.description }}</p>
            </div>
            <div class="activity-time">
              {{ formatRelativeTime(activity.timestamp) }}
            </div>
          </div>
          
          <div v-if="recentActivity.length === 0" class="empty-activity">
            <div class="empty-icon">📊</div>
            <p>No hay actividad reciente</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Password Change Modal -->
    <teleport to="body">
      <div v-if="showPasswordModal" class="modal-overlay" @click="closePasswordModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Cambiar Contraseña</h3>
            <button @click="closePasswordModal" class="modal-close">×</button>
          </div>
          
          <form @submit.prevent="handlePasswordChange" class="password-form">
            <div class="form-group">
              <label for="current_password" class="form-label">Contraseña Actual</label>
              <div class="input-container">
                <input
                  id="current_password"
                  v-model="passwordData.current"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  class="form-input password-input"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  @click="showCurrentPassword = !showCurrentPassword"
                  class="password-toggle"
                >
                  {{ showCurrentPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="new_password" class="form-label">Nueva Contraseña</label>
              <div class="input-container">
                <input
                  id="new_password"
                  v-model="passwordData.new"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="form-input password-input"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  @click="showNewPassword = !showNewPassword"
                  class="password-toggle"
                >
                  {{ showNewPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              <div v-if="passwordData.new" class="password-strength">
                <div class="strength-meter">
                  <div class="strength-bar" :class="passwordStrength.class" :style="{ width: passwordStrength.width }"></div>
                </div>
                <span class="strength-text" :class="passwordStrength.class">{{ passwordStrength.text }}</span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="confirm_password" class="form-label">Confirmar Nueva Contraseña</label>
              <div class="input-container">
                <input
                  id="confirm_password"
                  v-model="passwordData.confirm"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="form-input password-input"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="password-toggle"
                >
                  {{ showConfirmPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              <span v-if="passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm" class="error-text">
                Las contraseñas no coinciden
              </span>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="closePasswordModal" class="cancel-btn">
                Cancelar
              </button>
              <button 
                type="submit" 
                :disabled="!isPasswordFormValid || changingPassword"
                class="submit-btn"
              >
                <span v-if="changingPassword" class="btn-spinner"></span>
                {{ changingPassword ? 'Cambiando...' : 'Cambiar Contraseña' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../store/auth'
import { useToast } from 'vue-toastification'
import ActiveSessionsPanel from './ActiveSessionsPanel.vue'

const auth = useAuthStore()
const toast = useToast()

// Estado reactivo
const profileData = ref({
  full_name: '',
  email: '',
  phone: '',
  position: '',
  avatar_url: '',
  two_factor_enabled: false
})

const originalData = ref({})
const hasChanges = ref(false)
const saving = ref(false)
const isConnected = ref(true)
const activeTab = ref('profile')

if (auth.isAdmin) {
  activeTab.value = 'sessions'
}

// Password modal
const showPasswordModal = ref(false)
const passwordData = ref({
  current: '',
  new: '',
  confirm: ''
})
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const changingPassword = ref(false)

// Activity
const recentActivity = ref([
  {
    id: 1,
    type: 'login',
    title: 'Inicio de sesión',
    description: 'Accediste a la plataforma desde Chrome',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: 2,
    type: 'order',
    title: 'Pedido creado',
    description: 'Creaste el pedido #12345',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
  },
  {
    id: 3,
    type: 'profile',
    title: 'Perfil actualizado',
    description: 'Actualizaste tu información de contacto',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  }
])

// Computed
const avatarInitials = computed(() => {
  if (!profileData.value.full_name) return '??'
  return profileData.value.full_name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const avatarGradient = computed(() => {
  return 'var(--gradient)'
})

const lastPasswordChange = computed(() => {
  return formatDate(auth.user?.password_updated_at || auth.user?.created_at)
})

const passwordStrength = computed(() => {
  const password = passwordData.value.new
  if (!password) return { class: '', width: '0%', text: '' }
  
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  if (score <= 1) return { class: 'weak', width: '20%', text: 'Muy débil' }
  if (score === 2) return { class: 'fair', width: '40%', text: 'Débil' }
  if (score === 3) return { class: 'good', width: '60%', text: 'Buena' }
  if (score === 4) return { class: 'strong', width: '80%', text: 'Fuerte' }
  return { class: 'very-strong', width: '100%', text: 'Muy fuerte' }
})

const isPasswordFormValid = computed(() => {
  return passwordData.value.current &&
         passwordData.value.new &&
         passwordData.value.confirm &&
         passwordData.value.new === passwordData.value.confirm &&
         passwordData.value.new.length >= 8
})

// Methods
const markAsChanged = () => {
  hasChanges.value = true
}

const initializeProfile = () => {
  if (auth.user) {
    profileData.value = {
      full_name: auth.user.full_name || '',
      email: auth.user.email || '',
      phone: auth.user.phone || '',
      position: auth.user.position || '',
      avatar_url: auth.user.avatar_url || '',
      two_factor_enabled: auth.user.two_factor_enabled || false
    }
    originalData.value = { ...profileData.value }
  }
}

const saveChanges = async () => {
  if (!hasChanges.value || saving.value) return
  
  saving.value = true
  try {
    await auth.updateProfile(profileData.value)
    originalData.value = { ...profileData.value }
    hasChanges.value = false
    toast.success('Perfil actualizado correctamente')
  } catch (error) {
    toast.error(error.message || 'Error al actualizar el perfil')
  } finally {
    saving.value = false
  }
}

const handleAvatarUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    toast.error('La imagen no puede superar los 5MB')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    profileData.value.avatar_url = e.target.result
    markAsChanged()
  }
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  profileData.value.avatar_url = ''
  markAsChanged()
}

const toggle2FA = () => {
  profileData.value.two_factor_enabled = !profileData.value.two_factor_enabled
  markAsChanged()
  toast.info(`Verificación en dos pasos ${profileData.value.two_factor_enabled ? 'activada' : 'desactivada'}`)
}

const closePasswordModal = () => {
  showPasswordModal.value = false
  passwordData.value = { current: '', new: '', confirm: '' }
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
}

const handlePasswordChange = async () => {
  if (!isPasswordFormValid.value || changingPassword.value) return
  
  changingPassword.value = true
  try {
    await auth.changePassword(passwordData.value.current, passwordData.value.new)
    toast.success('Contraseña actualizada correctamente')
    closePasswordModal()
  } catch (error) {
    toast.error(error.message || 'Error al cambiar la contraseña')
  } finally {
    changingPassword.value = false
  }
}

const formatRole = (role) => {
  const roles = {
    admin: 'Administrador',
    company_owner: 'Propietario',
    company_employee: 'Empleado'
  }
  return roles[role] || role
}

const formatDate = (date) => {
  if (!date) return 'No disponible'
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatRelativeTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const diff = now - new Date(date)
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  return 'hace unos minutos'
}

const getActivityIcon = (type) => {
  const icons = {
    login: '🔐',
    order: '📦',
    profile: '👤',
    settings: '⚙️',
    security: '🛡️'
  }
  return icons[type] || '📊'
}

// Watch for changes
watch(profileData, (newVal, oldVal) => {
  if (JSON.stringify(newVal) !== JSON.stringify(originalData.value)) {
    hasChanges.value = true
  } else {
    hasChanges.value = false
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  initializeProfile()
})
</script>
<style scoped>
/* ==================== PROFILE - PARTE 1: LAYOUT PRINCIPAL Y HEADER ==================== */

.profile-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--gray-light);
  font-family: var(--font-family);
}

/* Page Header */
.page-header {
  background: var(--white);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
  border: 1px solid rgba(139, 197, 63, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--dark);
  margin: 0 0 0.5rem 0;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: var(--gray);
  font-size: 1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.save-btn {
  background: var(--gradient);
  color: var(--white);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: var(--shadow-green);
  font-family: var(--font-family);
}

.save-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
/* ==================== PROFILE - PARTE 2: CONTENIDO Y SECCIONES ==================== */

/* Profile Content */
.profile-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Profile Sections */
.profile-section {
  background: var(--white);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: var(--shadow);
  border: 1px solid rgba(139, 197, 63, 0.1);
  transition: all 0.3s ease;
}

.profile-section:hover {
  box-shadow: var(--shadow-hover);
  border-color: rgba(139, 197, 63, 0.2);
}

.section-header {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--dark);
  margin: 0 0 0.5rem 0;
}

.section-subtitle {
  color: var(--gray);
  font-size: 0.875rem;
  margin: 0;
}

/* Avatar Section específica */
.avatar-section {
  text-align: center;
}
/* ==================== PROFILE - PARTE 3: AVATAR Y UPLOAD ==================== */

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.current-avatar {
  position: relative;
  display: inline-block;
}

.avatar-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  border: 4px solid var(--white);
  box-shadow: 0 8px 24px rgba(139, 197, 63, 0.3);
  transition: all 0.3s ease;
}

.avatar-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(139, 197, 63, 0.4);
}

.avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--white);
}

.avatar-status {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dc2626;
  border: 3px solid var(--white);
  transition: all 0.3s ease;
}

.avatar-status.online {
  background: var(--primary);
  box-shadow: 0 0 12px rgba(139, 197, 63, 0.5);
}

.avatar-actions {
  display: flex;
  gap: 1rem;
}

.upload-btn, .remove-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  font-family: var(--font-family);
}

.upload-btn {
  background: var(--gradient);
  color: var(--white);
  box-shadow: var(--shadow-green);
}

.upload-btn:hover {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
  transform: translateY(-1px);
}

.remove-btn {
  background: transparent;
  color: #dc2626;
  border: 2px solid #dc2626;
}

.remove-btn:hover {
  background: #dc2626;
  color: var(--white);
}

.hidden-input {
  display: none;
}
/* ==================== PROFILE - PARTE 4: FORMULARIOS ==================== */

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: var(--dark);
  font-size: 0.875rem;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: var(--white);
  font-family: var(--font-family);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 197, 63, 0.15);
}

.form-input::placeholder {
  color: var(--gray);
}
/* ==================== PROFILE - PARTE 5: SECCIÓN DE SEGURIDAD ==================== */

.security-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.security-item:hover {
  border-color: var(--primary);
  background: rgba(139, 197, 63, 0.02);
}

.security-info {
  flex: 1;
}

.security-title {
  font-weight: 600;
  color: var(--dark);
  margin: 0 0 0.25rem 0;
}

.security-subtitle {
  color: var(--gray);
  font-size: 0.875rem;
  margin: 0;
}

.security-btn {
  padding: 0.5rem 1rem;
  border: 2px solid var(--primary);
  border-radius: 6px;
  background: transparent;
  color: var(--primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family);
}

.security-btn:hover {
  background: var(--primary);
  color: var(--white);
}

.security-btn.active {
  background: var(--gradient);
  color: var(--white);
  border-color: var(--primary);
}
/* ==================== PROFILE - PARTE 6: INFORMACIÓN DE CUENTA ==================== */

.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.account-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: rgba(139, 197, 63, 0.05);
  border-radius: 12px;
  border-left: 4px solid var(--primary);
}

.account-label {
  font-size: 0.875rem;
  color: var(--gray);
  font-weight: 500;
}

.account-value {
  font-weight: 600;
  color: var(--dark);
  font-size: 1rem;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge.admin {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: var(--white);
}

.role-badge.company_owner {
  background: var(--gradient);
  color: var(--white);
}

.role-badge.company_employee {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: var(--white);
}
/* ==================== PROFILE - PARTE 7: ACTIVIDAD RECIENTE ==================== */

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.activity-item:hover {
  border-color: var(--primary);
  background: rgba(139, 197, 63, 0.02);
  transform: translateY(-1px);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: var(--gradient);
  color: var(--white);
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 600;
  color: var(--dark);
  margin: 0 0 0.25rem 0;
}

.activity-subtitle {
  color: var(--gray);
  font-size: 0.875rem;
  margin: 0;
}

.activity-time {
  color: var(--gray);
  font-size: 0.75rem;
  font-weight: 500;
}

.empty-activity {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--gray);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}
/* ==================== PROFILE - PARTE 8: MODAL DE CONTRASEÑA ==================== */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--white);
  border-radius: 16px;
  padding: 0;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-hover);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--dark);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--gray);
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f3f4f6;
  color: var(--dark);
}

.password-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-container {
  position: relative;
}

.password-input {
  padding-right: 3rem;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.password-toggle:hover {
  background: rgba(139, 197, 63, 0.1);
}
/* ==================== PROFILE - PARTE 9: FORTALEZA DE CONTRASEÑA Y ACCIONES ==================== */

.password-strength {
  margin-top: 0.5rem;
}

.strength-meter {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.strength-bar {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.strength-bar.weak {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.strength-bar.fair {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.strength-bar.good {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.strength-bar.strong {
  background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
}

.strength-bar.very-strong {
  background: var(--gradient);
}

.strength-text {
  font-size: 0.75rem;
  font-weight: 500;
}

.strength-text.weak { color: #ef4444; }
.strength-text.fair { color: #f59e0b; }
.strength-text.good { color: #3b82f6; }
.strength-text.strong { color: var(--primary); }
.strength-text.very-strong { color: var(--primary); }

.error-text {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: var(--white);
  color: var(--gray);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family);
}

.cancel-btn:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--gradient);
  color: var(--white);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-family);
  box-shadow: var(--shadow-green);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
/* ==================== PROFILE - PARTE 10: SPINNER Y RESPONSIVE ==================== */

/* Spinner */
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 768px) {
  .profile-page {
    padding: 1rem;
  }
  
  .page-header {
    padding: 1.5rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .profile-section {
    padding: 1.5rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .account-grid {
    grid-template-columns: 1fr;
  }
  
  .avatar-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .upload-btn, .remove-btn {
    justify-content: center;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: calc(100% - 2rem);
  }
  
  .password-form {
    padding: 1.5rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .cancel-btn, .submit-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .section-title {
    font-size: 1.25rem;
  }
  
  .avatar-circle {
    width: 100px;
    height: 100px;
  }
  
  .avatar-initials {
    font-size: 2rem;
  }
  
  .activity-item {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .activity-time {
    align-self: center;
  }
  
  .security-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .modal-header {
    padding: 1rem 1.5rem;
  }
  
  .modal-title {
    font-size: 1.125rem;
  }
}

/* ==================== FOCUS STATES PARA ACCESIBILIDAD ==================== */
.form-input:focus,
.submit-btn:focus,
.cancel-btn:focus,
.security-btn:focus,
.upload-btn:focus,
.remove-btn:focus,
.password-toggle:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ==================== ANIMACIONES ADICIONALES ==================== */
.profile-section {
  animation: fadeInUp 0.6s ease-out;
}

.profile-section:nth-child(2) { animation-delay: 0.1s; }
.profile-section:nth-child(3) { animation-delay: 0.2s; }
.profile-section:nth-child(4) { animation-delay: 0.3s; }

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

/* Estados hover mejorados */
@media (hover: hover) {
  .avatar-circle:hover {
    transform: scale(1.05);
  }
  
  .activity-item:hover {
    transform: translateY(-2px);
  }
  
  .security-item:hover {
    transform: translateY(-1px);
  }
}
/* 🔥 AGREGAR ESTOS ESTILOS AL FINAL */

/* ==================== TABS ==================== */
.profile-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #f3f4f6;
  background: white;
  border-radius: 12px 12px 0 0;
  padding: 0 1rem;
}

.tab-btn {
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  border-radius: 8px 8px 0 0;
}

.tab-btn:hover {
  color: #8BC53F;
  background: rgba(139, 197, 63, 0.05);
}

.tab-btn.active {
  color: #8BC53F;
  border-bottom-color: #8BC53F;
  background: rgba(139, 197, 63, 0.1);
  font-weight: 600;
}

.tab-content {
  min-height: 500px;
}

.tab-pane {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>