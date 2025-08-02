<!-- Settings.vue - Template Parte 1: Header y Navegación -->
<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">Configuración</h1>
          <p class="page-subtitle">Personaliza tu experiencia en enviGo y configura tus preferencias</p>
        </div>
        <div class="header-actions">
          <button 
            v-if="hasChanges" 
            @click="saveAllSettings" 
            :disabled="saving"
            class="save-btn"
          >
            <span v-if="saving" class="btn-spinner"></span>
            {{ saving ? 'Guardando...' : 'Guardar Todo' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Navigation -->
    <div class="settings-container">
      <div class="settings-nav">
        <div class="nav-section">
          <h3 class="nav-title">General</h3>
          <button 
            v-for="section in generalSections" 
            :key="section.id"
            @click="activeSection = section.id"
            :class="['nav-item', { active: activeSection === section.id }]"
          >
            <i class="nav-icon">{{ section.icon }}</i>
            <span>{{ section.title }}</span>
          </button>
        </div>
        
        <div class="nav-section" v-if="!auth.isAdmin">
          <h3 class="nav-title">Empresa</h3>
          <button 
            v-for="section in companySections" 
            :key="section.id"
            @click="activeSection = section.id"
            :class="['nav-item', { active: activeSection === section.id }]"
          >
            <i class="nav-icon">{{ section.icon }}</i>
            <span>{{ section.title }}</span>
          </button>
        </div>
        
        <div class="nav-section" v-if="auth.isAdmin">
          <h3 class="nav-title">Administración</h3>
          <button 
            v-for="section in adminSections" 
            :key="section.id"
            @click="activeSection = section.id"
            :class="['nav-item', { active: activeSection === section.id }]"
          >
            <i class="nav-icon">{{ section.icon }}</i>
            <span>{{ section.title }}</span>
          </button>
        </div>
      </div>
      <!-- Settings Content -->
      <div class="settings-content">
        <!-- General Settings -->
        <div v-if="activeSection === 'general'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Configuración General</h2>
            <p class="section-subtitle">Ajusta las preferencias básicas de la aplicación</p>
          </div>
          
          <div class="settings-grid">
            <!-- Language & Region -->
            <div class="setting-group">
              <h3 class="group-title">Idioma y Región</h3>
              <div class="setting-item">
                <div class="setting-info">
                  <label class="setting-label">Idioma</label>
                  <p class="setting-description">Selecciona el idioma de la interfaz</p>
                </div>
                <select v-model="settings.language" @change="markAsChanged" class="setting-select">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <label class="setting-label">Zona Horaria</label>
                  <p class="setting-description">Define tu zona horaria local</p>
                </div>
                <select v-model="settings.timezone" @change="markAsChanged" class="setting-select">
                  <option value="America/Santiago">Santiago (GMT-3)</option>
                  <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
                  <option value="America/Lima">Lima (GMT-5)</option>
                  <option value="America/Bogota">Bogotá (GMT-5)</option>
                </select>
              </div>
            </div>

            <!-- Theme -->
            <div class="setting-group">
              <h3 class="group-title">Apariencia</h3>
              <div class="setting-item">
                <div class="setting-info">
                  <label class="setting-label">Tema</label>
                  <p class="setting-description">Elige entre tema claro u oscuro</p>
                </div>
                <div class="theme-selector">
                  <button 
                    v-for="theme in themes"
                    :key="theme.id"
                    @click="setTheme(theme.id)"
                    :class="['theme-option', { active: settings.theme === theme.id }]"
                  >
                    <div class="theme-preview" :class="theme.id">
                      <div class="theme-header"></div>
                      <div class="theme-content"></div>
                    </div>
                    <span>{{ theme.name }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Notifications Settings -->
        <div v-if="activeSection === 'notifications'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Notificaciones</h2>
            <p class="section-subtitle">Controla qué notificaciones quieres recibir y cómo</p>
          </div>
          
          <div class="settings-grid">
            <div class="setting-group">
              <h3 class="group-title">Notificaciones Push</h3>
              <div class="setting-item toggle-item">
                <div class="setting-info">
                  <label class="setting-label">Habilitar notificaciones push</label>
                  <p class="setting-description">Recibe notificaciones en tiempo real en tu navegador</p>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="settings.notifications.push_enabled"
                    @change="markAsChanged"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="setting-group">
              <h3 class="group-title">Tipos de Notificación</h3>
              <div v-for="notif in notificationTypes" :key="notif.id" class="setting-item toggle-item">
                <div class="setting-info">
                  <label class="setting-label">{{ notif.title }}</label>
                  <p class="setting-description">{{ notif.description }}</p>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="settings.notifications[notif.id]"
                    @change="markAsChanged"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="setting-group">
              <h3 class="group-title">Notificaciones por Email</h3>
              <div class="setting-item">
                <div class="setting-info">
                  <label class="setting-label">Frecuencia de resumen</label>
                  <p class="setting-description">Con qué frecuencia recibir resúmenes por email</p>
                </div>
                <select v-model="settings.notifications.email_frequency" @change="markAsChanged" class="setting-select">
                  <option value="never">Nunca</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <!-- Privacy Settings -->
        <div v-if="activeSection === 'privacy'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Privacidad y Seguridad</h2>
            <p class="section-subtitle">Controla tu privacidad y configuración de seguridad</p>
          </div>
          
          <div class="settings-grid">
            <div class="setting-group">
              <h3 class="group-title">Sesión</h3>
              <div class="setting-item toggle-item">
                <div class="setting-info">
                  <label class="setting-label">Mantener sesión iniciada</label>
                  <p class="setting-description">Recordar tu sesión por 30 días</p>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="settings.privacy.remember_session"
                    @change="markAsChanged"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <label class="setting-label">Sesiones activas</label>
                  <p class="setting-description">Gestiona dónde tienes la sesión iniciada</p>
                </div>
                <button @click="showActiveSessions = true" class="setting-action-btn">
                  Ver Sesiones
                </button>
              </div>
            </div>

            <div class="setting-group">
              <h3 class="group-title">Datos</h3>
              <div class="setting-item toggle-item">
                <div class="setting-info">
                  <label class="setting-label">Analíticas de uso</label>
                  <p class="setting-description">Ayúdanos a mejorar enviGo compartiendo datos de uso anónimos</p>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="settings.privacy.analytics_enabled"
                    @change="markAsChanged"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Company Settings (solo para company_owner) -->
        <div v-if="activeSection === 'company' && auth.isCompanyOwner" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Configuración de Empresa</h2>
            <p class="section-subtitle">Gestiona la configuración general de tu empresa</p>
          </div>
          
          <div class="settings-grid">
            <div class="setting-group">
              <h3 class="group-title">Información General</h3>
              <div class="setting-item">
                <label class="setting-label">Nombre de la empresa</label>
                <input 
                  v-model="companySettings.name" 
                  @input="markAsChanged"
                  type="text" 
                  class="setting-input"
                  placeholder="Nombre de tu empresa"
                />
              </div>
              
              <div class="setting-item">
                <label class="setting-label">RUT/NIT</label>
                <input 
                  v-model="companySettings.tax_id" 
                  @input="markAsChanged"
                  type="text" 
                  class="setting-input"
                  placeholder="12.345.678-9"
                />
              </div>
              
              <div class="setting-item">
                <label class="setting-label">Dirección</label>
                <textarea 
                  v-model="companySettings.address" 
                  @input="markAsChanged"
                  class="setting-textarea"
                  placeholder="Dirección completa de la empresa"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div class="setting-group">
              <h3 class="group-title">Configuración de Pedidos</h3>
              <div class="setting-item toggle-item">
                <div class="setting-info">
                  <label class="setting-label">Aprobación automática</label>
                  <p class="setting-description">Los pedidos se aprueban automáticamente al crearlos</p>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="companySettings.auto_approve_orders"
                    @change="markAsChanged"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="setting-item">
                <label class="setting-label">Horario de atención</label>
                <div class="time-range">
                  <input 
                    v-model="companySettings.business_hours.start" 
                    @input="markAsChanged"
                    type="time" 
                    class="setting-input time-input"
                  />
                  <span class="time-separator">a</span>
                  <input 
                    v-model="companySettings.business_hours.end" 
                    @input="markAsChanged"
                    type="time" 
                    class="setting-input time-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- System Settings (solo para admin) -->
        <div v-if="activeSection === 'system' && auth.isAdmin" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Configuración del Sistema</h2>
            <p class="section-subtitle">Configuración global de la plataforma enviGo</p>
          </div>
          
          <div class="settings-grid">
            <div class="setting-group">
              <h3 class="group-title">Configuración Global</h3>
              <div class="setting-item toggle-item">
                <div class="setting-info">
                  <label class="setting-label">Registro público</label>
                  <p class="setting-description">Permitir que nuevas empresas se registren</p>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="systemSettings.public_registration"
                    @change="markAsChanged"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="setting-item">
                <label class="setting-label">Límite de empresas</label>
                <input 
                  v-model.number="systemSettings.max_companies" 
                  @input="markAsChanged"
                  type="number" 
                  class="setting-input"
                  placeholder="0 = ilimitado"
                />
              </div>
            </div>

            <div class="setting-group">
              <h3 class="group-title">Mantenimiento</h3>
              <div class="setting-item toggle-item">
                <div class="setting-info">
                  <label class="setting-label">Modo mantenimiento</label>
                  <p class="setting-description">Bloquear acceso temporal a la plataforma</p>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="systemSettings.maintenance_mode"
                    @change="markAsChanged"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Sessions Modal -->
    <teleport to="body">
      <div v-if="showActiveSessions" class="modal-overlay" @click="showActiveSessions = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Sesiones Activas</h3>
            <button @click="showActiveSessions = false" class="modal-close">×</button>
          </div>
          
          <div class="modal-body">
            <div class="sessions-list">
              <div v-for="session in activeSessions" :key="session.id" class="session-item">
                <div class="session-info">
                  <div class="session-device">
                    <i class="device-icon">{{ getDeviceIcon(session.device) }}</i>
                    <div class="device-details">
                      <p class="device-name">{{ session.device }}</p>
                      <p class="device-location">{{ session.location }}</p>
                    </div>
                  </div>
                  <div class="session-meta">
                    <span class="session-status" :class="{ current: session.current }">
                      {{ session.current ? 'Sesión actual' : 'Activa' }}
                    </span>
                    <span class="session-time">{{ formatDate(session.last_activity) }}</span>
                  </div>
                </div>
                <button 
                  v-if="!session.current" 
                  @click="terminateSession(session.id)"
                  class="terminate-btn"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../store/auth'
import { useToast } from 'vue-toastification'

const auth = useAuthStore()
const toast = useToast()

// Estado reactivo
const activeSection = ref('general')
const hasChanges = ref(false)
const saving = ref(false)
const showActiveSessions = ref(false)

// Settings data
const settings = ref({
  language: 'es',
  timezone: 'America/Santiago',
  theme: 'light',
  notifications: {
    push_enabled: true,
    order_updates: true,
    delivery_notifications: true,
    system_alerts: true,
    marketing_emails: false,
    email_frequency: 'daily'
  },
  privacy: {
    remember_session: true,
    analytics_enabled: true
  }
})

const companySettings = ref({
  name: '',
  tax_id: '',
  address: '',
  auto_approve_orders: false,
  business_hours: {
    start: '09:00',
    end: '18:00'
  }
})

const systemSettings = ref({
  public_registration: true,
  max_companies: 0,
  maintenance_mode: false
})
// Navigation sections
const generalSections = [
  { id: 'general', title: 'General', icon: '⚙️' },
  { id: 'notifications', title: 'Notificaciones', icon: '🔔' },
  { id: 'privacy', title: 'Privacidad', icon: '🔒' }
]

const companySections = [
  { id: 'company', title: 'Empresa', icon: '🏢' },
  { id: 'integrations', title: 'Integraciones', icon: '🔗' },
  { id: 'billing', title: 'Facturación', icon: '💳' }
]

const adminSections = [
  { id: 'system', title: 'Sistema', icon: '🖥️' },
  { id: 'users', title: 'Usuarios', icon: '👥' },
  { id: 'maintenance', title: 'Mantenimiento', icon: '🔧' }
]

// Theme options
const themes = [
  { id: 'light', name: 'Claro' },
  { id: 'dark', name: 'Oscuro' },
  { id: 'auto', name: 'Automático' }
]

// Notification types
const notificationTypes = [
  {
    id: 'order_updates',
    title: 'Actualizaciones de pedidos',
    description: 'Cuando cambie el estado de un pedido'
  },
  {
    id: 'delivery_notifications',
    title: 'Notificaciones de entrega',
    description: 'Cuando se complete una entrega'
  },
  {
    id: 'system_alerts',
    title: 'Alertas del sistema',
    description: 'Alertas importantes del sistema'
  },
  {
    id: 'marketing_emails',
    title: 'Emails promocionales',
    description: 'Noticias y promociones de enviGo'
  }
]

// Active sessions (mock data)
const activeSessions = ref([
  {
    id: 1,
    device: 'Chrome en Windows',
    location: 'Santiago, Chile',
    last_activity: new Date(),
    current: true
  },
  {
    id: 2,
    device: 'Safari en iPhone',
    location: 'Santiago, Chile',
    last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
])
// Methods
const markAsChanged = () => {
  hasChanges.value = true
}

const setTheme = (themeId) => {
  settings.value.theme = themeId
  markAsChanged()
  // Apply theme immediately
  applyTheme(themeId)
}

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
}

const saveAllSettings = async () => {
  if (!hasChanges.value || saving.value) return
  
  saving.value = true
  try {
    // Simular llamada API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Aquí irían las llamadas reales a la API
    // await auth.updateSettings(settings.value)
    // if (auth.isCompanyOwner) await updateCompanySettings(companySettings.value)
    // if (auth.isAdmin) await updateSystemSettings(systemSettings.value)
    
    hasChanges.value = false
    toast.success('Configuración guardada correctamente')
  } catch (error) {
    toast.error(error.message || 'Error al guardar la configuración')
  } finally {
    saving.value = false
  }
}

const loadSettings = async () => {
  try {
    // Simular carga de configuración
    // const userSettings = await auth.getSettings()
    // settings.value = { ...settings.value, ...userSettings }
    
    if (auth.isCompanyOwner && auth.user?.company) {
      companySettings.value.name = auth.user.company.name || ''
      // Cargar más datos de la empresa
    }
    
    // Aplicar tema
    applyTheme(settings.value.theme)
  } catch (error) {
    toast.error('Error al cargar la configuración')
  }
}
const terminateSession = async (sessionId) => {
  try {
    // Simular terminación de sesión
    await new Promise(resolve => setTimeout(resolve, 500))
    
    activeSessions.value = activeSessions.value.filter(s => s.id !== sessionId)
    toast.success('Sesión terminada correctamente')
  } catch (error) {
    toast.error('Error al terminar la sesión')
  }
}

const getDeviceIcon = (device) => {
  if (device.includes('iPhone') || device.includes('Android')) return '📱'
  if (device.includes('iPad') || device.includes('Tablet')) return '📱'
  if (device.includes('Mac')) return '💻'
  return '🖥️'
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Watchers
watch([settings, companySettings, systemSettings], () => {
  markAsChanged()
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadSettings()
})
</script>
<style scoped>
/* ==================== SETTINGS - PARTE 1: LAYOUT PRINCIPAL ==================== */

.settings-page {
  padding: 2rem;
  max-width: 1400px;
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

/* Settings Container */
.settings-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}
/* ==================== SETTINGS - PARTE 2: NAVEGACIÓN ==================== */

.settings-nav {
  background: var(--white);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
  border: 1px solid rgba(139, 197, 63, 0.1);
  position: sticky;
  top: 2rem;
}

.nav-section {
  margin-bottom: 2rem;
}

.nav-section:last-child {
  margin-bottom: 0;
}

.nav-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 1rem 0;
  padding: 0 0.75rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
  text-align: left;
  font-family: var(--font-family);
  color: var(--dark);
}

.nav-item:hover {
  background: rgba(139, 197, 63, 0.1);
  color: var(--primary-dark);
}

.nav-item.active {
  background: var(--gradient);
  color: var(--white);
  box-shadow: var(--shadow-green);
}

.nav-icon {
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
}
/* ==================== SETTINGS - PARTE 3: CONTENIDO ==================== */

.settings-content {
  background: var(--white);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: var(--shadow);
  border: 1px solid rgba(139, 197, 63, 0.1);
  min-height: 600px;
}

.settings-section {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(139, 197, 63, 0.1);
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

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Setting Groups */
.setting-group {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  background: var(--white);
}

.group-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark);
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(139, 197, 63, 0.1);
}
/* ==================== SETTINGS - PARTE 4: SETTING ITEMS Y CONTROLES ==================== */

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-weight: 600;
  color: var(--dark);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  display: block;
}

.setting-description {
  color: var(--gray);
  font-size: 0.75rem;
  margin: 0;
  line-height: 1.4;
}

/* Form Controls */
.setting-select, .setting-input {
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  min-width: 160px;
  transition: all 0.2s ease;
  background: var(--white);
  font-family: var(--font-family);
}

.setting-select:focus, .setting-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 197, 63, 0.15);
}

.setting-textarea {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  width: 100%;
  resize: vertical;
  transition: all 0.2s ease;
  background: var(--white);
  font-family: var(--font-family);
}

.setting-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 197, 63, 0.15);
}

.setting-action-btn {
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

.setting-action-btn:hover {
  background: var(--primary);
  color: var(--white);
}
/* ==================== SETTINGS - PARTE 5: TOGGLE SWITCH ==================== */

.toggle-item {
  align-items: center;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.2s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background: var(--gradient);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-slider:hover {
  opacity: 0.9;
}
/* ==================== SETTINGS - PARTE 6: THEME SELECTOR ==================== */

.theme-selector {
  display: flex;
  gap: 1rem;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: var(--white);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family);
}

.theme-option:hover {
  border-color: var(--primary);
}

.theme-option.active {
  border-color: var(--primary);
  background: rgba(139, 197, 63, 0.05);
}

.theme-preview {
  width: 60px;
  height: 40px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.theme-header {
  height: 12px;
  background: #f1f5f9;
}

.theme-content {
  flex: 1;
  background: var(--white);
}

.theme-preview.dark .theme-header {
  background: #374151;
}

.theme-preview.dark .theme-content {
  background: #1f2937;
}

.theme-preview.auto .theme-header {
  background: linear-gradient(90deg, #f1f5f9 50%, #374151 50%);
}

.theme-preview.auto .theme-content {
  background: linear-gradient(90deg, var(--white) 50%, #1f2937 50%);
}

/* Time Range */
.time-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-input {
  min-width: 100px;
}

.time-separator {
  color: var(--gray);
  font-weight: 500;
}
/* ==================== SETTINGS - PARTE 7: MODAL Y SESSIONS ==================== */

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
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
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

.modal-body {
  padding: 1.5rem 2rem;
  max-height: 60vh;
  overflow-y: auto;
}
/* ==================== SETTINGS - PARTE 8: SESSIONS LIST ==================== */

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.session-item:hover {
  border-color: var(--primary);
  background: rgba(139, 197, 63, 0.02);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.session-device {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.device-icon {
  font-size: 1.5rem;
  width: 24px;
  text-align: center;
}

.device-details {
  flex: 1;
}

.device-name {
  font-weight: 600;
  color: var(--dark);
  margin: 0 0 0.125rem 0;
  font-size: 0.875rem;
}

.device-location {
  color: var(--gray);
  font-size: 0.75rem;
  margin: 0;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.session-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #f1f5f9;
  color: var(--gray);
}

.session-status.current {
  background: rgba(139, 197, 63, 0.1);
  color: var(--primary);
}

.session-time {
  font-size: 0.75rem;
  color: var(--gray);
}

.terminate-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #dc2626;
  border-radius: 6px;
  background: transparent;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family);
}

.terminate-btn:hover {
  background: #dc2626;
  color: var(--white);
}
/* ==================== SETTINGS - PARTE 9: SPINNER Y RESPONSIVE ==================== */

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
@media (max-width: 1024px) {
  .settings-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .settings-nav {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .nav-section {
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 1rem;
  }
  
  .page-header {
    padding: 1.5rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .settings-content {
    padding: 1.5rem;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .theme-selector {
    flex-direction: column;
  }
  
  .theme-option {
    flex-direction: row;
    justify-content: flex-start;
  }
  
  .time-range {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .time-separator {
    display: none;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: calc(100% - 2rem);
  }
  
  .session-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .session-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
/* ==================== SETTINGS - PARTE 10: ESTADOS FINALES Y ANIMACIONES ==================== */

@media (max-width: 480px) {
  .settings-nav {
    grid-template-columns: 1fr;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .section-title {
    font-size: 1.25rem;
  }
  
  .modal-header {
    padding: 1rem 1.5rem;
  }
  
  .modal-body {
    padding: 1rem 1.5rem;
  }
}

/* ==================== FOCUS STATES PARA ACCESIBILIDAD ==================== */
.setting-select:focus,
.setting-input:focus,
.setting-textarea:focus,
.setting-action-btn:focus,
.save-btn:focus,
.nav-item:focus,
.theme-option:focus,
.toggle-switch:focus-within,
.terminate-btn:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ==================== ANIMACIONES ADICIONALES ==================== */
.setting-group {
  animation: fadeInUp 0.4s ease-out;
}

.setting-group:nth-child(2) { animation-delay: 0.1s; }
.setting-group:nth-child(3) { animation-delay: 0.2s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Estados hover mejorados */
@media (hover: hover) {
  .setting-group:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 197, 63, 0.1);
  }
  
  .session-item:hover {
    transform: translateY(-1px);
  }
  
  .nav-item:hover {
    transform: translateX(2px);
  }
}

/* ==================== MODO OSCURO (OPCIONAL) ==================== */
@media (prefers-color-scheme: dark) {
  .settings-page[data-theme="auto"] {
    background: #1a1a1a;
  }
  
  .settings-page[data-theme="auto"] .page-header,
  .settings-page[data-theme="auto"] .settings-nav,
  .settings-page[data-theme="auto"] .settings-content,
  .settings-page[data-theme="auto"] .setting-group {
    background: #2a2a2a;
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .settings-page[data-theme="auto"] .page-title,
  .settings-page[data-theme="auto"] .section-title,
  .settings-page[data-theme="auto"] .setting-label {
    color: #f1f5f9;
  }
  
  .settings-page[data-theme="auto"] .page-subtitle,
  .settings-page[data-theme="auto"] .section-subtitle,
  .settings-page[data-theme="auto"] .setting-description {
    color: #94a3b8;
  }
}

/* ==================== TRANSICIONES SUAVES ==================== */
* {
  transition: border-color 0.2s ease, 
              background-color 0.2s ease, 
              color 0.2s ease, 
              transform 0.2s ease,
              box-shadow 0.2s ease;
}
</style>