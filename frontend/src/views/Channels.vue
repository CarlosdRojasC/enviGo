<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- ========== HEADER ========== -->
    <div class="mb-8">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
        <!-- Título -->
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span class="text-4xl">📡</span>
            {{ isAdmin ? 'Canales de Venta (Admin)' : 'Mis Canales de Venta' }}
          </h1>
          <p class="mt-2 text-gray-600">
            {{ isAdmin 
              ? 'Gestiona las integraciones de todas las empresas' 
              : 'Gestiona tus integraciones con plataformas de e-commerce' 
            }}
          </p>
        </div>

        <!-- Botones -->
        <div class="flex gap-3">
          <button
            @click="refreshChannels"
            :disabled="isRefreshing"
            class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <span class="text-lg mr-2 transition-transform" :class="{ 'animate-spin': isRefreshing }">{{ isRefreshing ? '⏳' : '🔄' }}</span>
            {{ isRefreshing ? 'Actualizando...' : 'Actualizar' }}
          </button>
          
          <button
            v-if="canAddChannel"
            @click="openAddChannelModal"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            <span class="text-lg mr-2">+</span>
            Agregar Canal
          </button>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">🔗</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ channels.length }}</p>
              <p class="text-sm text-gray-600">Canales Activos</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">📦</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ totalOrders }}</p>
              <p class="text-sm text-gray-600">Pedidos Totales</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">💰</div>
            <div>
              <p class="text-2xl font-bold text-gray-900">${{ formatCurrency(totalRevenue) }}</p>
              <p class="text-sm text-gray-600">Ingresos Totales</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-if="isAdmin">
            <label class="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
            <select v-model="selectedCompanyId" @change="fetchChannels" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todas las empresas</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">{{ company.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select v-model="filterType" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todos los tipos</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="mercadolibre">MercadoLibre</option>
              <option value="general_store">Tienda General</option>
              <option value="jumpseller">Jumpseller</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select v-model="filterStatus" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="sync_issues">Con problemas</option>
              <option value="needs_sync">Necesita sincronización</option>
            </select>
          </div>

          <div class="flex items-end">
            <button
              v-if="filterType || filterStatus || selectedCompanyId"
              @click="clearFilters"
              class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              🔄 Limpiar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== LOADING ========== -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="text-gray-600">Cargando canales...</p>
      </div>
    </div>

    <!-- ========== EMPTY STATE ========== -->
    <div v-else-if="filteredChannels.length === 0" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
        <span class="text-4xl">📡</span>
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">
        {{ channels.length === 0 ? 'No hay canales configurados' : 'No hay canales que coincidan' }}
      </h3>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">
        {{ channels.length === 0 
          ? 'Conecta tu primera plataforma de e-commerce para comenzar a sincronizar pedidos automáticamente.'
          : 'Intenta ajustar los filtros para ver más canales.'
        }}
      </p>
      <button
        v-if="canAddChannel && channels.length === 0"
        @click="openAddChannelModal"
        class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <span class="text-lg mr-2">+</span>
        Agregar Primer Canal
      </button>
      <button
        v-else-if="channels.length > 0"
        @click="clearFilters"
        class="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
      >
        <span class="text-lg mr-2">🔄</span>
        Limpiar Filtros
      </button>
    </div>

    <!-- ========== GRID DE CANALES ========== -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="channel in filteredChannels"
        :key="channel._id"
        class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border-2 overflow-hidden group"
        :class="{
          'border-green-500': getChannelStatus(channel) === 'active',
          'border-yellow-500': getChannelStatus(channel) === 'sync_issues',
          'border-red-500': getChannelStatus(channel) === 'needs_sync'
        }"
      >
        <!-- Header -->
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center text-2xl">
                {{ getChannelIcon(channel.channel_type) }}
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {{ channel.channel_name }}
                </h3>
                <p class="text-sm text-gray-500">{{ getChannelTypeName(channel.channel_type) }}</p>
              </div>
            </div>

            <span
              class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              :class="{
                'bg-green-100 text-green-700': getChannelStatus(channel) === 'active',
                'bg-yellow-100 text-yellow-700': getChannelStatus(channel) === 'sync_issues',
                'bg-red-100 text-red-700': getChannelStatus(channel) === 'needs_sync'
              }"
            >
              {{ getChannelStatusText(channel) }}
            </span>
          </div>

          <div v-if="isAdmin && channel.company_name" class="mt-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
              🏢 {{ channel.company_name }}
            </span>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 mb-1">URL de la tienda</p>
              <a :href="channel.store_url" target="_blank" class="text-sm text-blue-600 hover:text-blue-800 truncate block hover:underline">
                {{ channel.store_url }}
              </a>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            <div class="text-center">
              <p class="text-xs text-gray-500 mb-1">Pedidos</p>
              <p class="text-lg font-semibold text-gray-900">{{ channel.total_orders || 0 }}</p>
            </div>
            <div class="text-center">
              <p class="text-xs text-gray-500 mb-1">Ingresos</p>
              <p class="text-sm font-semibold text-gray-900">${{ formatCurrency(channel.total_revenue || 0) }}</p>
            </div>
            <div class="text-center">
              <p class="text-xs text-gray-500 mb-1">Último</p>
              <p class="text-xs font-medium text-gray-900">{{ formatDate(channel.last_order_date) }}</p>
            </div>
          </div>

          <div class="pt-3 border-t border-gray-100">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ getSyncIcon(channel) }}</span>
              <div>
                <p class="text-xs text-gray-500">Última sincronización</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(channel.last_sync_at) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div class="space-y-2">
            <button
              @click="syncChannel(channel._id)"
              :disabled="syncingChannels.includes(channel._id)"
              class="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span class="text-lg mr-2" :class="{ 'animate-spin': syncingChannels.includes(channel._id) }">
                {{ syncingChannels.includes(channel._id) ? '⏳' : '🔄' }}
              </span>
              {{ syncingChannels.includes(channel._id) ? 'Sincronizando...' : 'Sincronizar' }}
            </button>
    <button
      v-if="channel.channel_type === 'mercadolibre'"
      @click="resyncChannel(channel._id)"
      :disabled="syncingChannels.includes(channel._id)"
      class="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span class="text-lg mr-2" :class="{ 'animate-spin': syncingChannels.includes(channel._id) }">
        {{ syncingChannels.includes(channel._id) ? '⏳' : '🔄' }}
      </span>
      {{ syncingChannels.includes(channel._id) ? 'Re-sincronizando...' : 'Re-sincronizar (30 días)' }}
    </button>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-if="requiresOAuth(channel.channel_type) && !channel.api_key"
                @click="authorizeOAuthChannel(channel)"
                class="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <span class="text-lg mr-1">🔗</span>
                Autorizar
              </button>

              <button
                @click="showChannelDetails(channel)"
                class="inline-flex items-center justify-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                :class="{ 'col-span-2': !(requiresOAuth(channel.channel_type) && !channel.api_key) }"
              >
                <span class="text-lg mr-1">📊</span>
                Detalles
              </button>

              <button
                @click="confirmDeleteChannel(channel)"
                class="inline-flex items-center justify-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                :class="{ 'col-span-2': !(requiresOAuth(channel.channel_type) && !channel.api_key) }"
              >
                <span class="text-lg mr-1">🗑️</span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Agregar -->
      <div
        v-if="canAddChannel && filteredChannels.length > 0"
        @click="openAddChannelModal"
        class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-400 transition-all cursor-pointer group"
      >
        <div class="h-full flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <div class="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span class="text-3xl">+</span>
          </div>
          <h4 class="text-lg font-semibold text-blue-900 mb-2">Agregar Nuevo Canal</h4>
          <p class="text-sm text-blue-700">Conecta otra plataforma de e-commerce</p>
        </div>
      </div>
    </div>

    <!-- ========== MODALES ========== -->
    <Modal v-model="showAddChannelModal" title="Agregar Nuevo Canal" width="500px">
      <form @submit.prevent="addChannel" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Canal:</label>
          <select v-model="channelData.channel_type" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="" disabled>Seleccionar...</option>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="mercadolibre">MercadoLibre</option>
            <option value="general_store">Tienda General</option>
            <option value="jumpseller">Jumpseller</option>
          </select>
        </div>
        
        <div v-if="channelData.channel_type">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nombre del Canal:</label>
            <input 
              v-model="channelData.channel_name" 
              type="text" 
              required 
              :placeholder="getChannelNamePlaceholder(channelData.channel_type)"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
          </div>
          
          <div class="mt-4">
  <!-- Para MercadoLibre: Select de países -->
  <div v-if="channelData.channel_type === 'mercadolibre'">
    <label class="block text-sm font-medium text-gray-700 mb-2">País de MercadoLibre:</label>
    <select 
      v-model="channelData.store_url"
      required
      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
    <p class="mt-1 text-xs text-gray-500">Selecciona el país donde tienes tu cuenta de MercadoLibre</p>
  </div>

  <!-- Para otros canales: Input de texto -->
  <div v-else>
    <label class="block text-sm font-medium text-gray-700 mb-2">URL de la Tienda:</label>
    <input 
      v-model="channelData.store_url"
      type="url"
      required
      :placeholder="getUrlPlaceholder(channelData.channel_type)"
      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    >
    <p class="mt-1 text-xs text-gray-500">{{ getUrlHelp(channelData.channel_type) }}</p>
  </div>
</div>
          
          <div v-if="!requiresOAuth(channelData.channel_type) && channelData.channel_type !== 'general_store'" class="space-y-4 mt-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ getApiKeyLabel(channelData.channel_type) }}</label>
              <input 
                v-model="channelData.api_key" 
                type="text" 
                required
                :placeholder="getApiKeyPlaceholder(channelData.channel_type)"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ getApiSecretLabel(channelData.channel_type) }}</label>
              <input 
                v-model="channelData.api_secret" 
                type="password" 
                required
                :placeholder="getApiSecretPlaceholder(channelData.channel_type)"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
            </div>
          </div>
          
          <div v-if="requiresOAuth(channelData.channel_type)" class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex gap-3">
              <span class="text-2xl">🔐</span>
              <div>
                <h4 class="font-semibold text-blue-900 mb-2">Autenticación OAuth 2.0</h4>
                <p class="text-sm text-blue-800 mb-3">{{ getOAuthDescription(channelData.channel_type) }}</p>
                <ul class="text-sm text-blue-700 space-y-1">
                  <li v-for="step in getOAuthSteps(channelData.channel_type)" :key="step">{{ step }}</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div v-if="isAdmin" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Empresa:</label>
            <select v-model="channelData.company_id" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>Seleccionar empresa...</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">{{ company.name }}</option>
            </select>
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button type="button" @click="showAddChannelModal = false" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Cancelar
          </button>
          <button 
            type="submit" 
            :disabled="addingChannel || !isFormValid" 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {{ getButtonText() }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal v-model="showChannelDetailsModal" :title="`Detalles de ${selectedChannel?.channel_name}`" width="900px">
      <ChannelDetails 
        v-if="selectedChannel" 
        :channel="selectedChannel"
        @sync="handleChannelSync"
        @edit="handleChannelEdit"
        @refresh="refreshChannels"
      />
    </Modal>

    <Modal v-model="showDeleteModal" title="Confirmar Eliminación" width="400px">
      <div class="text-center py-4">
        <div class="text-6xl mb-4">⚠️</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">¿Estás seguro?</h3>
        <p class="text-gray-600 mb-6">
          Esta acción eliminará permanentemente el canal 
          <strong>{{ channelToDelete?.channel_name }}</strong>.
        </p>
        <div class="flex justify-center gap-3">
          <button @click="showDeleteModal = false" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Cancelar
          </button>
          <button @click="confirmDelete" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" :disabled="deleting">
            {{ deleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import Modal from '../components/Modal.vue'
import channelsService from '../services/channels.service'
import ChannelDetails from '../components/ChannelDetails.vue'

// ==================== ESTADO ====================
const auth = useAuthStore()
const toast = useToast()

// Estado de la página
const loading = ref(true)
const isRefreshing = ref(false)

// Canales y empresas
const channels = ref([])
const companies = ref([])
const selectedCompanyId = ref('')

// Filtros
const filterType = ref('')
const filterStatus = ref('')

// Modales
const showAddChannelModal = ref(false)
const showChannelDetailsModal = ref(false)
const showDeleteModal = ref(false)

// Estado de formularios
const addingChannel = ref(false)
const selectedChannel = ref(null)
const channelToDelete = ref(null)
const deleting = ref(false)

// Datos del formulario
const channelData = ref({
  channel_type: '',
  channel_name: '',
  store_url: '',
  api_key: '',
  api_secret: '',
  company_id: ''
})

// Sincronización
const syncingChannels = ref([])

// ==================== COMPUTED ====================
const isAdmin = computed(() => auth.isAdmin)

const canAddChannel = computed(() => {
  return auth.isCompanyOwner || auth.isAdmin
})

const getCompanyId = computed(() => {
  if (auth.isAdmin) return null
  
  return auth.user?.company?._id || 
         auth.user?.company_id || 
         auth.companyId || 
         null
})

const filteredChannels = computed(() => {
  let filtered = channels.value

  if (filterType.value) {
    filtered = filtered.filter(channel => channel.channel_type === filterType.value)
  }

  if (filterStatus.value) {
    filtered = filtered.filter(channel => {
      const status = getChannelStatus(channel)
      return status === filterStatus.value
    })
  }

  return filtered
})

const totalOrders = computed(() => {
  if (!Array.isArray(channels.value)) return 0
  return channels.value.reduce((sum, channel) => sum + (channel.total_orders || 0), 0)
})

const totalRevenue = computed(() => {
  if (!Array.isArray(channels.value)) return 0
  return channels.value.reduce((sum, channel) => sum + (channel.total_revenue || 0), 0)
})
const isFormValid = computed(() => {
  // Validaciones básicas siempre requeridas
  if (!channelData.value.channel_type) return false
  if (!channelData.value.channel_name?.trim()) return false
  
  // Para admin, también validar empresa
  if (isAdmin.value && !channelData.value.company_id) return false
  
  // ✅ Tienda General (solo necesita nombre y tipo)
  if (channelData.value.channel_type === 'general_store') {
    return true
  }
  
  // ✅ Canales OAuth (MercadoLibre y Jumpseller) - solo necesitan store_url
  if (requiresOAuth(channelData.value.channel_type)) {
    return !!channelData.value.store_url?.trim()
  }
  
  // ✅ Otros canales (Shopify, WooCommerce) - necesitan todo
  if (!channelData.value.store_url?.trim()) return false
  if (!channelData.value.api_key?.trim()) return false
  if (!channelData.value.api_secret?.trim()) return false
  
  return true
})

// ==================== MÉTODOS ====================
async function fetchChannels() {
  try {
    loading.value = true
    
    let endpoint = ''
    if (auth.isAdmin) {
      // Admin puede ver todos los canales o filtrar por empresa
      if (selectedCompanyId.value) {
        endpoint = `companies/${selectedCompanyId.value}/channels`
        const response = await apiService.companies.getChannels?.(selectedCompanyId.value) || 
                         await apiService.channels.getByCompany(selectedCompanyId.value)
        channels.value = response.data?.data || response.data || []
      } else {
        try {
          const response = await apiService.channels.getAllForAdmin()
          channels.value = response.data?.data || response.data || []
          console.log('✅ Admin: canales de todas las empresas cargados:', channels.value.length)
        } catch (error) {
          console.error('❌ Error obteniendo todos los canales:', error)
          // Si falla, intenta con fetch directo
          try {
            const response = await fetch('/api/channels/admin/all', {
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            })
            if (response.ok) {
              const data = await response.json()
              channels.value = data.data || data || []
            } else {
              channels.value = []
            }
          } catch (fetchError) {
            console.error('❌ Error con fetch directo:', fetchError)
            channels.value = []
          }
        }
      }
    } else {
      // Usuario normal: solo sus canales
      const companyId = getCompanyId.value
      if (!companyId) {
        console.error('❌ No se encontró company_id en el usuario:', auth.user)
        toast.error('Error: Usuario sin empresa asignada. Contacta al administrador.')
        channels.value = []
        return
      }

      console.log('🔍 Obteniendo canales para empresa:', companyId)
      const response = await apiService.channels.getByCompany(companyId)
      channels.value = response.data?.data || response.data || []
    }
    
  } catch (error) {
    console.error('Error al cargar canales:', error)
    toast.error(`Error al cargar canales: ${error.message}`)
    channels.value = []
  } finally {
    loading.value = false
  }
}

function handleChannelSync(channelId) {
  // Reutilizar el método existente
  syncChannel(channelId)
}

function handleChannelEdit(channel) {
  // Implementar edición si es necesario
  console.log('Editar canal:', channel)
  toast.info('Funcionalidad de edición próximamente')
}
async function fetchCompanies() {
  if (!auth.isAdmin) return
  
  try {
    const response = await apiService.companies.getAll()
    companies.value = response.data || []
  } catch (error) {
    console.error('Error al cargar empresas:', error)
  }
}

async function refreshChannels() {
  isRefreshing.value = true
  try {
    await fetchChannels()
    toast.success('Canales actualizados correctamente')
  } catch (error) {
    toast.error('Error al actualizar canales')
  } finally {
    isRefreshing.value = false
  }
}
// ==================== FUNCIONES HELPER ====================

// ✅ FUNCIONES PARA OAUTH
function requiresOAuth(channelType) {
  return ['mercadolibre', 'jumpseller'].includes(channelType);
}

function getApiKeyLabel(channelType) {
  const labels = {
    shopify: 'Token de Acceso (API Secret)',
    woocommerce: 'Consumer Key',
    jumpseller: 'API Login',
    general_store: 'API Key'
  };
  return labels[channelType] || 'API Key';
}

function getApiSecretLabel(channelType) {
  const labels = {
    shopify: 'API Key',
    woocommerce: 'Consumer Secret', 
    jumpseller: 'Auth Token',
    general_store: 'API Secret'
  };
  return labels[channelType] || 'API Secret';
}

function getOAuthDescription(channelType) {
  const descriptions = {
    mercadolibre: 'MercadoLibre utiliza OAuth para mayor seguridad. Después de crear el canal, serás redirigido para autorizar la conexión.',
    jumpseller: 'Jumpseller utiliza OAuth 2.0 para acceso seguro. Te redirigiremos a tu tienda para autorizar la conexión.'
  };
  return descriptions[channelType] || 'Este canal utiliza OAuth 2.0 para autenticación segura.';
}

function getOAuthSteps(channelType) {
  const steps = {
    mercadolibre: [
      '✅ No necesitas credenciales manuales',
      '✅ Conexión segura y automática',
      '✅ Solo pedidos Flex serán importados'
    ],
    jumpseller: [
      '✅ Haz clic en "Crear Canal"', 
      '✅ Serás redirigido a Jumpseller',
      '✅ Autoriza el acceso a enviGo',
      '✅ Regresarás automáticamente'
    ]
  };
  return steps[channelType] || [];
}

function getChannelIcon(type) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🛒',
    mercadolibre: '🏪',
    general_store: '📱',
    jumpseller: '🚀'
  }
  return icons[type] || '📦'
}

function getChannelTypeName(type) {
  const names = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    mercadolibre: 'MercadoLibre',
    general_store: 'Tienda General',
    jumpseller: 'Jumpseller'
  }
  return names[type] || type
}

function getChannelStatus(channel) {
  const daysSinceLastSync = channel.last_sync_at 
    ? Math.floor((new Date() - new Date(channel.last_sync_at)) / (1000 * 60 * 60 * 24))
    : null

  if (!channel.last_sync_at) return 'needs_sync'
  if (daysSinceLastSync > 7) return 'sync_issues'
  return 'active'
}
function getChannelStatusText(channel) {
  const status = getChannelStatus(channel)
  const texts = {
    active: 'Activo',
    sync_issues: 'Problemas de sync',
    needs_sync: 'Necesita sincronización'
  }
  return texts[status] || 'Desconocido'
}

function getChannelCardClass(channel) {
  const status = getChannelStatus(channel)
  return {
    'status-active': status === 'active',
    'status-warning': status === 'sync_issues',
    'status-error': status === 'needs_sync'
  }
}

function getSyncStatusClass(channel) {
  return getChannelStatus(channel)
}

function getSyncIcon(channel) {
  const status = getChannelStatus(channel)
  const icons = {
    active: '✅',
    sync_issues: '⚠️',
    needs_sync: '❌'
  }
  return icons[status] || '❓'
}

function getSyncStatusText(channel) {
  const status = getChannelStatus(channel)
  const texts = {
    active: 'Sincronización OK',
    sync_issues: 'Revisar sincronización',
    needs_sync: 'Sin sincronizar'
  }
  return texts[status] || 'Estado desconocido'
}

function formatDate(dateStr) {
  if (!dateStr) return 'Nunca'
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function getChannelNamePlaceholder(type) {
  const placeholders = {
    shopify: 'Mi Tienda Shopify',
    woocommerce: 'Mi Tienda WooCommerce',
    mercadolibre: 'Mi Tienda MercadoLibre',
    general_store: 'Mi Tienda General',
    jumpseller: 'Mi Tienda Jumpseller'
  }
  return placeholders[type] || 'Mi Tienda'
}

function getUrlPlaceholder(type) {
  const placeholders = {
    shopify: 'https://mi-tienda.myshopify.com',
    woocommerce: 'https://mi-tienda.com',
    mercadolibre: 'https://mercadolibre.cl', // ✅ Chile por defecto
    jumpseller: 'https://mi-tienda.jumpseller.com'
  }
  return placeholders[type] || 'https://mi-tienda.com'
}

function getUrlHelp(type) {
  const helps = {
    shopify: 'Dominio de tu tienda Shopify',
    woocommerce: 'URL completa de tu sitio WordPress',
    mercadolibre: 'Ejemplos: mercadolibre.cl, mercadolibre.com.mx, mercadolibre.com.ar',
    jumpseller: 'URL completa de tu tienda Jumpseller'
  }
  return helps[type] || 'URL de tu tienda'
}

function getApiKeyPlaceholder(type) {
  const placeholders = {
    shopify: 'shpat_...',
    woocommerce: 'ck_...',
    jumpseller: 'tu_api_login'
  }
  return placeholders[type] || ''
}

function getApiSecretPlaceholder(type) {
  const placeholders = {
    shopify: 'Tu API Key público',
    woocommerce: 'cs_...',
    jumpseller: 'Token de 32 caracteres'
  }
  return placeholders[type] || ''
}

function getButtonText() {
  if (addingChannel.value) {
    return 'Creando...'
  }
  
  if (requiresOAuth(channelData.value.channel_type)) {
    const channelName = channelData.value.channel_type === 'mercadolibre' ? 'MercadoLibre' : 'Jumpseller'
    return `Crear y Autorizar con ${channelName}`
  }
  
  return 'Crear Canal'
}
// ==================== ACCIONES ====================
function openAddChannelModal() {
  channelData.value = {
    channel_type: '',
    channel_name: '',
    store_url: '',
    api_key: '',
    api_secret: '',
    company_id: auth.isAdmin ? '' : getCompanyId.value
  }
  showAddChannelModal.value = true
}

async function addChannel() {
  try {
    addingChannel.value = true;
    
    // Obtener companyId
    let companyId;
    if (auth.isAdmin) {
      companyId = channelData.value.company_id;
      if (!companyId) {
        toast.error('Selecciona una empresa para el canal');
        addingChannel.value = false;
        return;
      }
    } else {
      companyId = getCompanyId.value;
      if (!companyId) {
        toast.error('Error: Usuario sin empresa asignada');
        addingChannel.value = false;
        return;
      }
    }

    // Crear el canal
    const response = await apiService.channels.create(companyId, channelData.value);

    // Verificar si es un canal OAuth que requiere autorización
    if (response.data.authorizationUrl) {
      const channelTypeName = channelData.value.channel_type === 'mercadolibre' ? 'MercadoLibre' : 'Jumpseller';
      toast.info(`Canal creado. Redirigiendo a ${channelTypeName} para autorizar...`);
      
      // Esperar un poco para que el usuario lea el mensaje
      setTimeout(() => {
        window.location.href = response.data.authorizationUrl;
      }, 1500);

    } else {
      // Canal creado sin OAuth
      toast.success('Canal creado exitosamente');
      await fetchChannels();
      showAddChannelModal.value = false;
    }
    
  } catch (error) {
    toast.error(`Error al crear canal: ${error.response?.data?.error || error.message}`);
  } finally {
    addingChannel.value = false;
  }
}

async function authorizeOAuthChannel(channel) {
  try {
    const channelTypeName = getChannelTypeName(channel.channel_type);
    toast.info(`Redirigiendo a ${channelTypeName} para autorizar "${channel.channel_name}"...`);
    
    // Endpoint para generar URL de autorización para canal existente
    let response;
    if (channel.channel_type === 'mercadolibre') {
      response = await apiService.mercadolibre.getAuthorizationUrl({
        channelId: channel._id
      });
    } else if (channel.channel_type === 'jumpseller') {
      response = await apiService.jumpseller.getAuthorizationUrl({
        channelId: channel._id
      });
    }
    
    // Redirigir a la página de autorización
    if (response?.data?.authUrl || response?.data?.authorizationUrl) {
      window.location.href = response.data.authUrl || response.data.authorizationUrl;
    }

  } catch (error) {
    console.error(`Error al iniciar la autorización:`, error);
    toast.error(`No se pudo iniciar la conexión con ${getChannelTypeName(channel.channel_type)}.`);
  }
}
function showChannelDetails(channel) {
  selectedChannel.value = channel
  showChannelDetailsModal.value = true
}

async function syncChannel(channelId) {
  // Evita dobles clics
  if (syncingChannels.value.includes(channelId)) return;
  syncingChannels.value.push(channelId);
  
  try {
    // Llamar al backend para sincronizar
    const { data } = await apiService.channels.syncOrders(channelId, {
      date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      date_to: new Date().toISOString()
    });

    // Actualizar el canal en la lista local
    const index = channels.value.findIndex(c => c._id === channelId);
    if (index !== -1 && data.channel) {
      channels.value[index] = { ...channels.value[index], ...data.channel };
    }

    toast.success(data.message || 'Sincronización completada exitosamente.');
    
  } catch (error) {
    console.error('Error en la sincronización:', error);
    toast.error(error.message || 'Ocurrió un error durante la sincronización.');
  
  } finally {
    syncingChannels.value = syncingChannels.value.filter(id => id !== channelId);
  }
}
async function resyncChannel(channelId) {
  if (!confirm('¿Re-sincronizar los últimos 30 días de pedidos de MercadoLibre?\n\nEsto actualizará pedidos existentes y creará los que falten.')) {
    return;
  }
  
  // Evita dobles clics
  if (syncingChannels.value.includes(channelId)) return;
  syncingChannels.value.push(channelId);
  
  try {
    // ✅ CORRECCIÓN: Usar fetch o axios directamente
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/channels/${channelId}/resync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ daysBack: 30 })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al re-sincronizar');
    }

    const data = await response.json();
    toast.success(data.message || 'Re-sincronización iniciada. Los pedidos aparecerán en unos momentos.');
    
    // Recargar canales después de un tiempo
    setTimeout(async () => {
      await fetchChannels();
      toast.info('Canales actualizados');
    }, 5000);
    
  } catch (error) {
    console.error('Error en la re-sincronización:', error);
    toast.error(error.message || 'Error al re-sincronizar pedidos');
  
  } finally {
    syncingChannels.value = syncingChannels.value.filter(id => id !== channelId);
  }
}
function confirmDeleteChannel(channel) {
  channelToDelete.value = channel
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!channelToDelete.value) return
  
  try {
    deleting.value = true
    await channelsService.delete(channelToDelete.value._id)
    toast.success('Canal eliminado exitosamente')
    await fetchChannels()
    showDeleteModal.value = false
    channelToDelete.value = null
  } catch (error) {
    toast.error(`Error al eliminar el canal: ${error.message}`)
  } finally {
    deleting.value = false
  }
}

function clearFilters() {
  filterType.value = ''
  filterStatus.value = ''
  selectedCompanyId.value = ''
}

function getChannelSyncStatus(channel) {
  const syncInfo = channel.sync_status_info;
  
  if (syncInfo) {
    return {
      class: syncInfo.needsSync ? 'needs-sync' : 'synced',
      text: syncInfo.message,
      needsSync: syncInfo.needsSync
    };
  }
  
  // Fallback al método anterior
  const lastSync = channel.last_sync_at || channel.last_sync;
  
  if (!lastSync) {
    return {
      class: 'needs-sync',
      text: 'Necesita sincronización',
      needsSync: true
    };
  }
  
  const daysSinceSync = Math.floor((new Date() - new Date(lastSync)) / (1000 * 60 * 60 * 24));
  
  if (daysSinceSync <= 1) {
    return {
      class: 'synced',
      text: 'Sincronizado',
      needsSync: false
    };
  } else if (daysSinceSync <= 7) {
    return {
      class: 'needs-sync',
      text: `Hace ${daysSinceSync} días`,
      needsSync: true
    };
  } else {
    return {
      class: 'outdated',
      text: `Hace ${daysSinceSync} días`,
      needsSync: true
    };
  }
}

function handleCallbackResponse() {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const error = urlParams.get('error');
  const details = urlParams.get('details');
  const channelName = urlParams.get('channel_name');
  
  if (success === 'ml_connected') {
    const message = channelName 
      ? `¡Canal "${channelName}" conectado exitosamente con MercadoLibre!`
      : '¡Conexión con MercadoLibre exitosa!';
    toast.success(message);
  } else if (success === 'jumpseller_connected') {
    const message = channelName 
      ? `¡Canal "${channelName}" conectado exitosamente con Jumpseller!`
      : '¡Conexión con Jumpseller exitosa!';
    toast.success(message);
  } else if (error) {
    let errorMessage = 'Error conectando con la plataforma';
    
    switch (error) {
      case 'oauth_denied':
        errorMessage = 'Autorización denegada por el usuario';
        break;
      case 'missing_params':
        errorMessage = 'Faltan parámetros en la respuesta';
        break;
      case 'validation_failed':
        errorMessage = `Error de validación: ${details || 'No se pudo validar la autorización'}`;
        break;
      case 'processing_failed':
        errorMessage = `Error procesando la autorización: ${details || 'Error interno'}`;
        break;
    }
    
    toast.error(errorMessage);
    console.error('❌ Error en callback OAuth:', { error, details });
  }
  
  // Limpiar la URL después de mostrar el mensaje
  if (success || error) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ==================== LIFECYCLE ====================
onMounted(async () => {
  console.log('🔍 Debug usuario en Channels:', {
    user: auth.user,
    isAdmin: auth.isAdmin,
    companyId: getCompanyId.value,
    authCompanyId: auth.companyId
  })
  await fetchCompanies()
  await fetchChannels()
  await handleCallbackResponse();
})
</script>
<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>