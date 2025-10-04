<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
    <div class="px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Título y Breadcrumbs -->
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ pageTitle }}
          </h1>
          <div v-if="breadcrumbs.length > 0" class="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center gap-2">
              <router-link 
                v-if="crumb.to" 
                :to="crumb.to"
                class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {{ crumb.label }}
              </router-link>
              <span v-else>{{ crumb.label }}</span>
              <span v-if="index < breadcrumbs.length - 1" class="text-gray-300 dark:text-gray-600">
                /
              </span>
            </span>
          </div>
        </div>

        <!-- Acciones del Header -->
        <div class="flex items-center gap-3">
          <!-- Estado de Conexión -->
          <div 
            v-if="isConnected"
            class="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium"
            title="Conectado en tiempo real"
          >
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="hidden sm:inline">En línea</span>
          </div>

          <!-- Notificaciones -->
          <div class="relative" ref="notificationRef">
            <button
              @click="toggleNotifications"
              class="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span class="material-icons text-gray-600 dark:text-gray-400">
                notifications
              </span>
              <!-- Badge de contador -->
              <span
                v-if="unreadCount > 0"
                class="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full"
              >
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </button>

            <!-- Panel de Notificaciones con Teleport -->
            <Teleport to="body">
              <div
                v-if="showNotifications"
                class="fixed inset-0 z-[9999] flex justify-end pt-20 pr-6"
                @click="showNotifications = false"
              >
                <div
                  @click.stop
                  class="w-full max-w-md h-[calc(100vh-6rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
                >
                  <!-- Header del panel -->
                  <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-icons text-indigo-600 dark:text-indigo-400">
                          notifications
                        </span>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                          Notificaciones
                        </h3>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          v-if="unreadCount > 0"
                          @click="markAllAsRead"
                          class="flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                        >
                          <span class="material-icons text-sm">done_all</span>
                          <span>Marcar todas</span>
                        </button>
                        <button
                          @click="showNotifications = false"
                          class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <span class="material-icons text-gray-600 dark:text-gray-400">close</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Lista de notificaciones -->
                  <div class="flex-1 overflow-y-auto">
                    <!-- Loading -->
                    <div v-if="loading" class="flex flex-col items-center justify-center h-full gap-3">
                      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                      <p class="text-sm text-gray-500 dark:text-gray-400">Cargando notificaciones...</p>
                    </div>

                    <!-- Empty state -->
                    <div v-else-if="notifications.length === 0" class="flex flex-col items-center justify-center h-full gap-3 p-8">
                      <span class="text-6xl">🔕</span>
                      <p class="text-gray-900 dark:text-white font-semibold">No hay notificaciones</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Te mantendremos informado cuando lleguen nuevas notificaciones
                      </p>
                    </div>

                    <!-- Notificaciones -->
                    <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
                      <div
                        v-for="notification in displayNotifications"
                        :key="notification.id"
                        @click="handleNotificationClick(notification)"
                        :class="[
                          'p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                          !notification.read && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                        ]"
                      >
                        <div class="flex gap-3">
                          <!-- Icono -->
                          <div class="flex-shrink-0">
                            <span class="text-2xl">{{ getNotificationIcon(notification.type) }}</span>
                          </div>

                          <!-- Contenido -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                                {{ notification.title }}
                              </p>
                              <button
                                v-if="!notification.read"
                                @click.stop="markAsRead(notification.id)"
                                class="flex-shrink-0 p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                title="Marcar como leída"
                              >
                                <span class="material-icons text-sm text-indigo-600 dark:text-indigo-400">
                                  check
                                </span>
                              </button>
                            </div>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {{ notification.message }}
                            </p>
                            <div class="flex items-center gap-2 mt-2">
                              <span class="text-xs text-gray-500 dark:text-gray-500">
                                {{ utils.formatRelativeDate(notification.created_at) }}
                              </span>
                              <span v-if="notification.order_number" class="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                #{{ notification.order_number }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer - Cargar más -->
                  <div v-if="hasMoreNotifications && notifications.length > 0" class="p-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      @click="loadMoreNotifications"
                      :disabled="loadingMore"
                      class="w-full px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span v-if="loadingMore" class="flex items-center justify-center gap-2">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        Cargando...
                      </span>
                      <span v-else>Ver más notificaciones</span>
                    </button>
                  </div>
                </div>
              </div>
            </Teleport>
          </div>

          <!-- Menú de Usuario -->
          <div class="relative" ref="userMenuRef">
            <button
              @click="toggleUserMenu"
              class="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div class="relative">
                <div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                  {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
                </div>
                <!-- Dot de estado online -->
                <div
                  v-if="isConnected"
                  class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"
                ></div>
              </div>
              <div class="hidden md:block text-left">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ auth.user?.full_name }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatRole(auth.user?.role) }}
                </p>
              </div>
              <span class="material-icons text-gray-600 dark:text-gray-400">
                {{ showUserMenu ? 'expand_less' : 'expand_more' }}
              </span>
            </button>

            <!-- Dropdown del Usuario -->
            <div
              v-if="showUserMenu"
              class="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50"
            >
              <!-- Header del menú -->
              <div class="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {{ auth.user?.full_name }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ auth.user?.email }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Items del menú -->
              <div class="py-1">
                <button
                  @click="goToProfile"
                  class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span class="material-icons text-base">person</span>
                  <span>Mi Perfil</span>
                </button>

                <button
                  @click="goToSettings"
                  class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span class="material-icons text-base">settings</span>
                  <span>Configuración</span>
                </button>

                <hr class="my-1 border-gray-200 dark:border-gray-700">

                <button
                  @click="handleLogout"
                  class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <span class="material-icons text-base">logout</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { apiService } from '../services/api'
import { useToast } from 'vue-toastification'
import wsManager from '../services/websocket.service'
import UtilsService from '../services/utils.service'

// Setup
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const utils = UtilsService

// Refs
const notificationRef = ref(null)
const userMenuRef = ref(null)

// State
const showNotifications = ref(false)
const showUserMenu = ref(false)
const notifications = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMoreNotifications = ref(true)
const currentPage = ref(1)
const isConnected = ref(false)

// Computed
const pageTitle = computed(() => {
  return route.meta?.title || 'Dashboard'
})

const breadcrumbs = computed(() => {
  return route.meta?.breadcrumbs || []
})

const displayNotifications = computed(() => {
  return notifications.value.slice(0, currentPage.value * 10)
})

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

// Methods
function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value && loading.value) {
    fetchNotifications()
  }
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

async function fetchNotifications() {
  try {
    loading.value = true
    const response = await apiService.notifications.getAll({ page: 1, limit: 10 })
    notifications.value = response.data.notifications || []
    hasMoreNotifications.value = response.data.has_more || false
  } catch (error) {
    console.error('Error fetching notifications:', error)
  } finally {
    loading.value = false
  }
}

async function loadMoreNotifications() {
  try {
    loadingMore.value = true
    currentPage.value++
    const response = await apiService.notifications.getAll({ 
      page: currentPage.value, 
      limit: 10 
    })
    notifications.value.push(...(response.data.notifications || []))
    hasMoreNotifications.value = response.data.has_more || false
  } catch (error) {
    console.error('Error loading more notifications:', error)
  } finally {
    loadingMore.value = false
  }
}

async function markAsRead(id) {
  try {
    await apiService.notifications.markAsRead(id)
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

async function markAllAsRead() {
  try {
    await apiService.notifications.markAllAsRead()
    notifications.value.forEach(n => n.read = true)
    toast.success('Todas las notificaciones marcadas como leídas')
  } catch (error) {
    console.error('Error marking all as read:', error)
    toast.error('Error al marcar notificaciones')
  }
}

function handleNotificationClick(notification) {
  if (!notification.read) {
    markAsRead(notification.id)
  }
  
  if (notification.link) {
    router.push(notification.link)
    showNotifications.value = false
  }
}

function getNotificationIcon(type) {
  const icons = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    order: '📦',
    delivery: '🚚',
    default: '🔔'
  }
  return icons[type] || icons.default
}

function formatRole(role) {
  const roles = {
    admin: 'Administrador',
    user: 'Usuario',
    driver: 'Conductor',
    company_admin: 'Admin Empresa'
  }
  return roles[role] || role
}

function goToProfile() {
  router.push('/profile')
  showUserMenu.value = false
}

function goToSettings() {
  router.push('/settings')
  showUserMenu.value = false
}

async function handleLogout() {
  try {
    await auth.logout()
    router.push('/login')
    toast.success('Sesión cerrada correctamente')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
    toast.error('Error al cerrar sesión')
  }
}

// Click outside handlers
function handleClickOutside(event) {
  if (notificationRef.value && !notificationRef.value.contains(event.target)) {
    showNotifications.value = false
  }
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    showUserMenu.value = false
  }
}

// WebSocket connection status
function updateConnectionStatus() {
  isConnected.value = wsManager.isConnected
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  // WebSocket status
  updateConnectionStatus()
  const interval = setInterval(updateConnectionStatus, 5000)
  
  // Cleanup
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    clearInterval(interval)
  })
})
</script>

<style scoped>
.material-icons {
  font-size: 1.25rem;
  font-family: 'Material Icons';
}
</style>