<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header Section -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Canales de Venta</h1>
          <p class="mt-1 text-sm text-gray-500">
            {{ auth.isAdmin ? 'Gestiona todos los canales del sistema' : 'Gestiona tus canales de venta' }}
          </p>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="refreshChannels"
            :disabled="isRefreshing"
            class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Canal
          </button>
        </div>
      </div>

      <!-- Filtros para Admin -->
      <div v-if="auth.isAdmin" class="mt-6 flex flex-col sm:flex-row gap-4">
        <!-- Selector de Empresa -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filtrar por empresa</label>
          <select
            v-model="selectedCompanyId"
            @change="fetchChannels"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Todas las empresas</option>
            <option v-for="company in companies" :key="company._id" :value="company._id">
              {{ company.company_name }}
            </option>
          </select>
        </div>

        <!-- Buscador -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Buscar canales</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre o tipo..."
              class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
            <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Filtro por tipo -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de canal</label>
          <select
            v-model="selectedType"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Todos los tipos</option>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="mercadolibre">MercadoLibre</option>
            <option value="jumpseller">Jumpseller</option>
            <option value="general_store">Tienda General</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="text-gray-600">Cargando canales...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredChannels.length === 0" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No hay canales disponibles</h3>
      <p class="text-gray-500 mb-6">
        {{ searchQuery || selectedType ? 'No se encontraron canales con los filtros aplicados' : 'Comienza creando tu primer canal de ventas' }}
      </p>
      <button
        v-if="!searchQuery && !selectedType"
        @click="showCreateModal = true"
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Crear Canal
      </button>
    </div>

    <!-- Channels Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="channel in filteredChannels"
        :key="channel._id"
        class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden group"
      >
        <!-- Card Header -->
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-start justify-between mb-3">
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
            
            <!-- Status Badge -->
            <span
              :class="[
                'px-3 py-1 rounded-full text-xs font-medium',
                channel.is_active 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              ]"
            >
              {{ channel.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <!-- Company Badge (solo para admin) -->
          <div v-if="auth.isAdmin && channel.company_name" class="mt-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {{ channel.company_name }}
            </span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-6 space-y-4">
          <!-- Store URL -->
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 mb-1">URL de la tienda</p>
              <a
                :href="channel.store_url"
                target="_blank"
                class="text-sm text-blue-600 hover:text-blue-800 truncate block hover:underline"
              >
                {{ channel.store_url }}
              </a>
            </div>
          </div>

          <!-- Last Sync -->
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-xs text-gray-500 mb-1">Última sincronización</p>
              <p class="text-sm text-gray-900">
                {{ channel.last_sync_at ? formatDate(channel.last_sync_at) : 'Nunca sincronizado' }}
              </p>
            </div>
          </div>

          <!-- Sync Status Badge -->
          <div>
            <span
              :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                getSyncStatusClass(channel)
              ]"
            >
              <span class="w-2 h-2 rounded-full mr-2" :class="getSyncStatusDotClass(channel)"></span>
              {{ getSyncStatusText(channel) }}
            </span>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            @click="syncChannel(channel._id)"
            :disabled="syncingChannels[channel._id]"
            class="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              class="w-4 h-4 mr-2"
              :class="{ 'animate-spin': syncingChannels[channel._id] }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ syncingChannels[channel._id] ? 'Sincronizando...' : 'Sincronizar' }}
          </button>

          <button
            @click="editChannel(channel)"
            class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar canal"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            @click="deleteChannel(channel._id)"
            class="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar canal"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import apiService from '@/services/api'

const auth = useAuthStore()
const toast = useToast()

// State
const channels = ref([])
const companies = ref([])
const loading = ref(false)
const isRefreshing = ref(false)
const showCreateModal = ref(false)
const selectedCompanyId = ref('')
const searchQuery = ref('')
const selectedType = ref('')
const syncingChannels = ref({})

// Computed
const getCompanyId = computed(() => {
  return auth.user?.company_id || auth.companyId
})

const filteredChannels = computed(() => {
  let filtered = channels.value

  // Filtro por búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(channel =>
      channel.channel_name?.toLowerCase().includes(query) ||
      channel.channel_type?.toLowerCase().includes(query) ||
      channel.company_name?.toLowerCase().includes(query)
    )
  }

  // Filtro por tipo
  if (selectedType.value) {
    filtered = filtered.filter(channel => channel.channel_type === selectedType.value)
  }

  return filtered
})

// Lifecycle
onMounted(async () => {
  await fetchCompanies()
  await fetchChannels()
})

// Methods
async function fetchChannels() {
  loading.value = true
  try {
    if (auth.isAdmin) {
      if (selectedCompanyId.value) {
        const response = await apiService.channels.getByCompany(selectedCompanyId.value)
        channels.value = response.data?.data || response.data || []
      } else {
        const response = await apiService.channels.getAllForAdmin()
        channels.value = response.data?.data || response.data || []
      }
    } else {
      const companyId = getCompanyId.value
      if (!companyId) {
        toast.error('Error: Usuario sin empresa asignada')
        return
      }
      const response = await apiService.channels.getByCompany(companyId)
      channels.value = response.data?.data || response.data || []
    }
  } catch (error) {
    console.error('Error al cargar canales:', error)
    toast.error('Error al cargar canales')
  } finally {
    loading.value = false
  }
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

async function syncChannel(channelId) {
  syncingChannels.value[channelId] = true
  try {
    await apiService.channels.syncOrders(channelId)
    toast.success('Sincronización iniciada correctamente')
    await fetchChannels()
  } catch (error) {
    toast.error('Error al sincronizar canal')
  } finally {
    syncingChannels.value[channelId] = false
  }
}

function editChannel(channel) {
  // Implementar modal de edición
  toast.info('Funcionalidad de edición próximamente')
}

async function deleteChannel(channelId) {
  if (!confirm('¿Estás seguro de eliminar este canal?')) return
  
  try {
    await apiService.channels.delete(channelId)
    toast.success('Canal eliminado correctamente')
    await fetchChannels()
  } catch (error) {
    toast.error('Error al eliminar canal')
  }
}

// Helper functions
function getChannelIcon(type) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🛒',
    mercadolibre: '🏪',
    jumpseller: '🏬',
    general_store: '📱'
  }
  return icons[type] || '📦'
}

function getChannelTypeName(type) {
  const names = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    mercadolibre: 'MercadoLibre',
    jumpseller: 'Jumpseller',
    general_store: 'Tienda General'
  }
  return names[type] || type
}

function getSyncStatusClass(channel) {
  const status = getChannelStatus(channel)
  const classes = {
    'synced': 'bg-green-50 text-green-700 border border-green-200',
    'warning': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    'error': 'bg-red-50 text-red-700 border border-red-200',
    'never': 'bg-gray-50 text-gray-700 border border-gray-200'
  }
  return classes[status] || classes.never
}

function getSyncStatusDotClass(channel) {
  const status = getChannelStatus(channel)
  const classes = {
    'synced': 'bg-green-500',
    'warning': 'bg-yellow-500',
    'error': 'bg-red-500',
    'never': 'bg-gray-400'
  }
  return classes[status] || classes.never
}

function getSyncStatusText(channel) {
  const status = getChannelStatus(channel)
  const texts = {
    'synced': 'Sincronizado recientemente',
    'warning': 'Requiere sincronización',
    'error': 'Error en sincronización',
    'never': 'Sin sincronizar'
  }
  return texts[status] || texts.never
}

function getChannelStatus(channel) {
  if (!channel.last_sync_at) return 'never'
  
  const daysSince = Math.floor((Date.now() - new Date(channel.last_sync_at).getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSince <= 1) return 'synced'
  if (daysSince <= 7) return 'warning'
  return 'error'
}

function formatDate(date) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
  
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>