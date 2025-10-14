<template>
  <div class="channel-form">
    <form @submit.prevent="handleSubmit">
      <!-- Selector de tipo de canal -->
      <div class="form-section">
        <h4 class="section-title">
          <span class="section-icon">🔗</span>
          Tipo de Canal
        </h4>
        
        <div class="channel-types">
          <div 
            v-for="type in availableChannelTypes" 
            :key="type.value"
            class="channel-type-option"
            :class="{ active: formData.channel_type === type.value }"
            @click="selectChannelType(type.value)"
          >
            <div class="type-icon">{{ type.icon }}</div>
            <div class="type-info">
              <h5 class="type-name">{{ type.name }}</h5>
              <p class="type-description">{{ type.description }}</p>
            </div>
            <div class="type-selector">
              <div class="radio-circle" :class="{ active: formData.channel_type === type.value }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración del canal -->
      <div v-if="formData.channel_type" class="form-section">
        <h4 class="section-title">
          <span class="section-icon">⚙️</span>
          Configuración del Canal
        </h4>

        <!-- Información básica -->
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">Nombre del Canal</label>
            <input 
              v-model="formData.channel_name" 
              type="text" 
              class="form-input"
              placeholder="Mi Tienda Online"
              required
            />
            <small class="form-help">Nombre identificativo para este canal</small>
          </div>

          <div class="form-group">
  <!-- Para MercadoLibre: Select de países -->
  <div v-if="formData.channel_type === 'mercadolibre'">
    <label class="form-label required">País de MercadoLibre</label>
    <select 
      v-model="formData.store_url" 
      class="form-select"
      required
    >
      <option value="">Selecciona tu país</option>
      <option value="https://mercadolibre.cl">🇨🇱 Chile</option>
      <option value="https://mercadolibre.com.ar">🇦🇷 Argentina</option>
      <option value="https://mercadolibre.com.mx">🇲🇽 México</option>
      <option value="https://mercadolivre.com.br">🇧🇷 Brasil</option>
      <option value="https://mercadolibre.com.co">🇨🇴 Colombia</option>
      <option value="https://mercadolibre.com.pe">🇵🇪 Perú</option>
      <option value="https://mercadolibre.com.uy">🇺🇾 Uruguay</option>
    </select>
    <small class="form-help">Selecciona el país donde tienes tu cuenta de MercadoLibre</small>
  </div>

  <!-- Para otros canales: Input de texto -->
  <div v-else>
    <label class="form-label required">URL de la Tienda (Con HTTPS)</label>
    <input 
      v-model="formData.store_url" 
      type="url" 
      class="form-input"
      :placeholder="getUrlPlaceholder(formData.channel_type)"
      required
    />
    <small class="form-help">{{ getUrlHelp(formData.channel_type) }}</small>
  </div>
</div>
        </div>

        <!-- Credenciales específicas por tipo -->
        <div class="credentials-section">
          <h5 class="credentials-title">Credenciales de API</h5>
          
          <!-- Shopify -->
          <div v-if="formData.channel_type === 'shopify'" class="credentials-grid">
            <div class="form-group">
              <label class="form-label required">Access Token</label>
              <input 
                v-model="formData.api_key" 
                type="password" 
                class="form-input"
                placeholder="shpat_..."
                required
              />
              <small class="form-help">Token de acceso privado de tu app</small>
            </div>

            <div class="form-group">
              <label class="form-label required">API Key</label>
              <input 
                v-model="formData.api_secret" 
                type="text" 
                class="form-input"
                placeholder="Tu API Key"
                required
              />
              <small class="form-help">Clave pública de tu app</small>
            </div>

            <div class="form-group">
              <label class="form-label">Webhook Secret</label>
              <input 
                v-model="formData.webhook_secret" 
                type="password" 
                class="form-input"
                placeholder="Opcional"
              />
              <small class="form-help">Secret para validar webhooks (opcional)</small>
            </div>
          </div>

          <!-- WooCommerce -->
          <div v-else-if="formData.channel_type === 'woocommerce'" class="credentials-grid">
            <div class="form-group">
              <label class="form-label required">Consumer Key</label>
              <input 
                v-model="formData.api_key" 
                type="text" 
                class="form-input"
                placeholder="ck_..."
                required
              />
              <small class="form-help">Consumer Key de WooCommerce</small>
            </div>

            <div class="form-group">
              <label class="form-label required">Consumer Secret</label>
              <input 
                v-model="formData.api_secret" 
                type="password" 
                class="form-input"
                placeholder="cs_..."
                required
              />
              <small class="form-help">Consumer Secret de WooCommerce</small>
            </div>
          </div>

          <!-- MercadoLibre -->
          <div v-else-if="formData.channel_type === 'mercadolibre'" class="credentials-info">
            <div class="oauth-info">
              <div class="oauth-icon">🔐</div>
              <div class="oauth-content">
                <h6>Autenticación OAuth</h6>
                <p>MercadoLibre utiliza OAuth 2.0. Después de crear el canal, serás redirigido para autorizar la conexión.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuraciones adicionales -->
        <div class="advanced-settings">
          <div class="settings-header">
            <h5 class="settings-title">Configuraciones Avanzadas</h5>
            <button 
              type="button" 
              @click="showAdvanced = !showAdvanced"
              class="toggle-advanced"
            >
              {{ showAdvanced ? 'Ocultar' : 'Mostrar' }}
              <span class="toggle-icon" :class="{ rotated: showAdvanced }">▼</span>
            </button>
          </div>

          <div v-show="showAdvanced" class="advanced-content">
            <div class="form-group">
              <label class="form-label">
                <input 
                  v-model="formData.auto_sync" 
                  type="checkbox" 
                  class="form-checkbox"
                />
                Sincronización automática
              </label>
              <small class="form-help">Sincronizar pedidos automáticamente cada hora</small>
            </div>

            <div class="form-group">
              <label class="form-label">Intervalo de sincronización (minutos)</label>
              <select v-model="formData.sync_interval" class="form-select">
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
                <option value="240">4 horas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Test de conexión -->
      <div v-if="formData.channel_type && hasRequiredFields" class="form-section">
        <h4 class="section-title">
          <span class="section-icon">🔍</span>
          Verificar Conexión
        </h4>
        
        <div class="test-connection">
          <button 
            type="button" 
            @click="testConnection"
            :disabled="testing || !canTest"
            class="test-btn"
          >
            <span class="btn-icon">{{ testing ? '⏳' : '🔍' }}</span>
            {{ testing ? 'Probando...' : 'Probar Conexión' }}
          </button>
          
          <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
            <span class="result-icon">{{ testResult.success ? '✅' : '❌' }}</span>
            <span class="result-text">{{ testResult.message }}</span>
          </div>
        </div>
      </div>

      <!-- Acciones del formulario -->
      <div class="form-actions">
        <button 
          type="button" 
          @click="$emit('cancel')" 
          class="btn-cancel"
          :disabled="loading"
        >
          Cancelar
        </button>
        
        <button 
          type="submit" 
          class="btn-submit"
          :disabled="loading || !isFormValid"
        >
          <span class="btn-icon">{{ loading ? '⏳' : (isEditing ? '✏️' : '➕') }}</span>
          {{ loading ? 'Guardando...' : (isEditing ? 'Actualizar Canal' : 'Crear Canal') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'

// ==================== PROPS & EMITS ====================
const props = defineProps({
  channel: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

// ==================== ESTADO ====================
const toast = useToast()

const formData = ref({
  channel_type: '',
  channel_name: '',
  store_url: '',
  api_key: '',
  api_secret: '',
  webhook_secret: '',
  auto_sync: true,
  auto_create_shipday: false,
  sync_interval: 60
})

const showAdvanced = ref(false)
const testing = ref(false)
const testResult = ref(null)

// ==================== COMPUTED ====================
const isEditing = computed(() => !!props.channel)

const availableChannelTypes = computed(() => [
  {
    value: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    description: 'Conecta tu tienda Shopify para sincronizar pedidos automáticamente'
  },
  {
    value: 'woocommerce',
    name: 'WooCommerce',
    icon: '🛒',
    description: 'Integra tu tienda WooCommerce con WordPress'
  },
  {
    value: 'mercadolibre',
    name: 'MercadoLibre',
    icon: '🏪',
    description: 'Sincroniza tus ventas de MercadoLibre'
  }
])

const hasRequiredFields = computed(() => {
  if (!formData.value.channel_type) return false
  
  const hasBasicFields = formData.value.channel_name && formData.value.store_url
  
  if (formData.value.channel_type === 'mercadolibre') {
    return hasBasicFields // OAuth no requiere credenciales manuales
  }
  
  return hasBasicFields && formData.value.api_key && formData.value.api_secret
})

const canTest = computed(() => {
  return hasRequiredFields.value && !testing.value
})

const isFormValid = computed(() => {
  return hasRequiredFields.value && !testing.value
})
const validateFormData = computed(() => {
  const errors = [];
  
  if (!formData.value.channel_type) {
    errors.push('Selecciona un tipo de canal');
  }
  
  if (!formData.value.channel_name?.trim()) {
    errors.push('El nombre del canal es obligatorio');
  }
  
  if (!formData.value.store_url?.trim()) {
    errors.push('La URL de la tienda es obligatoria');
  }
  
  // Validaciones específicas por tipo de canal
if (formData.value.channel_type === 'mercadolibre') {
  // Para ML, validar que sea una URL válida del select
  const validMLUrls = [
    'https://mercadolibre.cl',
    'https://mercadolibre.com.ar',
    'https://mercadolibre.com.mx',
    'https://mercadolivre.com.br',
    'https://mercadolibre.com.co',
    'https://mercadolibre.com.pe',
    'https://mercadolibre.com.uy'
  ];
  
  if (!validMLUrls.includes(formData.value.store_url)) {
    errors.push('Debes seleccionar un país de MercadoLibre válido');
  }
    
    // Para ML no necesitamos validar credenciales
  } else {
    // Para otros canales, validar credenciales
    if (!formData.value.api_key?.trim()) {
      errors.push('La API Key es obligatoria');
    }
    
    if (!formData.value.api_secret?.trim()) {
      errors.push('El API Secret es obligatorio');
    }
  }
  
  return errors;
});

const isFormValid = computed(() => {
  return validateFormData.value.length === 0 && !testing.value;
});

// ==================== MÉTODOS ====================
function selectChannelType(type) {
  formData.value.channel_type = type
  testResult.value = null
}

function getUrlPlaceholder(type) {
  const placeholders = {
    shopify: 'https://mi-tienda.myshopify.com',
    woocommerce: 'https://mi-tienda.com',
  }
  return placeholders[type] || 'https://mi-tienda.com'
}

function getUrlHelp(type) {
  const helps = {
    shopify: 'URL completa de tu tienda Shopify',
    woocommerce: 'URL base de tu sitio WordPress con WooCommerce',
  }
  return helps[type] || 'URL de tu tienda online'
}

async function testConnection() {
  if (!canTest.value) return
  
  testing.value = true
  testResult.value = null
  
  try {
    const response = await apiService.post('channels/test-connection', {
      channel_type: formData.value.channel_type,
      store_url: formData.value.store_url,
      api_key: formData.value.api_key,
      api_secret: formData.value.api_secret
    })
    
    testResult.value = {
      success: true,
      message: 'Conexión exitosa. El canal está listo para usar.'
    }
    
    toast.success('Conexión establecida correctamente')
  } catch (error) {
    testResult.value = {
      success: false,
      message: `Error de conexión: ${error.message}`
    }
    
    toast.error('Error al probar la conexión')
  } finally {
    testing.value = false
  }
}

function handleSubmit() {
  if (!isFormValid.value) return
  
  emit('submit', { ...formData.value })
}

function resetForm() {
  formData.value = {
    channel_type: '',
    channel_name: '',
    store_url: '',
    api_key: '',
    api_secret: '',
    webhook_secret: '',
    auto_sync: true,
    auto_create_shipday: false,
    sync_interval: 60
  }
  showAdvanced.value = false
  testResult.value = null
}
async function createChannel() {
  if (!isFormValid.value) {
    toast.error('Por favor, completa todos los campos requeridos');
    return;
  }
  
  creating.value = true;
  
  try {
    const payload = {
      channel_type: formData.value.channel_type,
      channel_name: formData.value.channel_name.trim(),
      store_url: formData.value.store_url.trim(),
      webhook_secret: formData.value.webhook_secret || ''
    };
    
    // Solo agregar credenciales si NO es MercadoLibre
    if (formData.value.channel_type !== 'mercadolibre') {
      payload.api_key = formData.value.api_key.trim();
      payload.api_secret = formData.value.api_secret.trim();
    }
    
    console.log('🚀 Creando canal:', {
      type: payload.channel_type,
      name: payload.channel_name,
      requiresOAuth: payload.channel_type === 'mercadolibre'
    });
    
    const response = await apiService.post(`companies/${props.companyId}/channels`, payload);
    
    // Manejo específico para MercadoLibre
    if (formData.value.channel_type === 'mercadolibre') {
      if (response.data.authorizationUrl) {
        toast.info('Redirigiendo a MercadoLibre para autorizar la conexión...');
        
        // Guardar información del canal creado
        localStorage.setItem('pendingMLChannel', JSON.stringify({
          channelId: response.data.channel.id,
          channelName: response.data.channel.channel_name,
          companyId: props.companyId
        }));
        
        // Redirigir a MercadoLibre
        window.location.href = response.data.authorizationUrl;
        return;
      } else {
        throw new Error('No se recibió la URL de autorización de MercadoLibre');
      }
    }
    
    // Para otros tipos de canal
    toast.success(`Canal ${response.data.channel.channel_name} creado exitosamente`);
    emit('channel-created', response.data.channel);
    resetForm();
    
  } catch (error) {
    console.error('❌ Error creando canal:', error);
    
    const errorMsg = error.response?.data?.error || 'Error al crear el canal';
    const errorDetails = error.response?.data?.details;
    
    if (errorDetails) {
      toast.error(`${errorMsg}\n${errorDetails}`);
    } else {
      toast.error(errorMsg);
    }
    
    // Si es un error de configuración de ML, mostrar ayuda
    if (errorMsg.includes('MERCADOLIBRE_APP_ID')) {
      toast.warning('La integración con MercadoLibre no está configurada. Contacta al administrador.');
    }
    
  } finally {
    creating.value = false;
  }
}

// Función para validar URL de MercadoLibre en tiempo real
const validateMLUrl = (url) => {
  const mlCountries = [
    'mercadolibre.com.ar', // Argentina
    'mercadolibre.com.mx', // México  
    'mercadolibre.cl',     // Chile
    'mercadolibre.com.co', // Colombia
    'mercadolibre.com.pe', // Perú
    'mercadolibre.com.uy', // Uruguay
    'mercadolibre.com.ve', // Venezuela
    'mercadolivre.com.br'  // Brasil
  ];
  
  return mlCountries.some(domain => url.includes(domain));
};
// ==================== WATCHERS ====================
watch(() => props.channel, (newChannel) => {
  if (newChannel) {
    // Cargar datos del canal para edición
    formData.value = {
      channel_type: newChannel.channel_type || '',
      channel_name: newChannel.channel_name || '',
      store_url: newChannel.store_url || '',
      api_key: newChannel.api_key || '',
      api_secret: newChannel.api_secret || '',
      webhook_secret: newChannel.webhook_secret || '',
      auto_sync: newChannel.auto_sync ?? true,
      auto_create_shipday: newChannel.auto_create_shipday ?? false,
      sync_interval: newChannel.sync_interval || 60
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Limpiar resultado de test cuando cambian las credenciales
watch([
  () => formData.value.api_key,
  () => formData.value.api_secret,
  () => formData.value.store_url
], () => {
  testResult.value = null
})
</script>

<style scoped>
.channel-form {
  max-width: 600px;
  margin: 0 auto;
}

/* ==================== SECCIONES ==================== */
.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.section-icon {
  font-size: 20px;
}

/* ==================== TIPOS DE CANAL ==================== */
.channel-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.channel-type-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.channel-type-option:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.channel-type-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.type-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.channel-type-option.active .type-icon {
  background: #dbeafe;
  border-color: #3b82f6;
}

.type-info {
  flex: 1;
}

.type-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.type-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.type-selector {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-circle {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  transition: all 0.2s;
}

.radio-circle.active {
  border-color: #3b82f6;
  background: #3b82f6;
  box-shadow: inset 0 0 0 3px white;
}

/* ==================== FORMULARIOS ==================== */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  background: white;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.3;
}

.form-checkbox {
  margin-right: 8px;
}

/* ==================== CREDENCIALES ==================== */
.credentials-section {
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.credentials-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.credentials-grid {
  display: grid;
  gap: 16px;
}

.credentials-info {
  text-align: center;
  padding: 20px;
}

.oauth-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
}

.oauth-icon {
  font-size: 32px;
}

.oauth-content h6 {
  font-size: 16px;
  font-weight: 600;
  color: #1e40af;
  margin: 0 0 4px 0;
}

.oauth-content p {
  font-size: 14px;
  color: #3730a3;
  margin: 0;
  line-height: 1.4;
}

/* ==================== CONFIGURACIONES AVANZADAS ==================== */
.advanced-settings {
  margin-top: 20px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.settings-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.toggle-advanced {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-advanced:hover {
  background: #e5e7eb;
}

.toggle-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.advanced-content {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

/* ==================== TEST DE CONEXIÓN ==================== */
.test-connection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.test-btn:hover:not(:disabled) {
  background: #2563eb;
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.test-result.success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.test-result.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.result-icon {
  font-size: 16px;
}

.result-text {
  font-weight: 500;
}

/* ==================== ACCIONES DEL FORMULARIO ==================== */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-submit {
  background: #3b82f6;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}

.btn-cancel:disabled,
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .channel-type-option {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .type-info {
    order: 1;
  }
  
  .type-selector {
    order: 2;
  }
  
  .oauth-info {
    flex-direction: column;
    text-align: center;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-cancel,
  .btn-submit {
    justify-content: center;
  }
}
</style>