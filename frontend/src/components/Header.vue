<!-- frontend/src/components/Header.vue -->
<template>
  <header class="header">
    <div class="header-content">
      <!-- Título dinámico basado en la ruta actual -->
      <div class="header-left">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <div class="breadcrumb" v-if="breadcrumbs.length > 0">
          <span v-for="(crumb, index) in breadcrumbs" :key="index">
            <router-link v-if="crumb.path" :to="crumb.path" class="breadcrumb-link">
              {{ crumb.name }}
            </router-link>
            <span v-else class="breadcrumb-current">{{ crumb.name }}</span>
            <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
          </span>
        </div>
      </div>

      <!-- Acciones del header -->
      <div class="header-right">
        <!-- Notificaciones -->
        <div class="header-item notifications" @click="toggleNotifications">
          <div class="notification-icon">
            <i class="fas fa-bell"></i>
            <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
          </div>
          
          <!-- Dropdown de notificaciones -->
          <div v-if="showNotifications" class="notifications-dropdown">
            <div class="notifications-header">
              <h3>Notificaciones</h3>
              <button @click="markAllAsRead" class="mark-all-read">Marcar todas como leídas</button>
            </div>
            <div class="notifications-list">
              <div 
                v-for="notification in notifications" 
                :key="notification.id"
                class="notification-item"
                :class="{ unread: !notification.read }"
              >
                <div class="notification-icon-small">
                  <i :class="getNotificationIcon(notification.type)"></i>
                </div>
                <div class="notification-content">
                  <p class="notification-message">{{ notification.message }}</p>
                  <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
                </div>
              </div>
              
              <div v-if="notifications.length === 0" class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No hay notificaciones</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Información del usuario -->
        <div class="header-item user-info">
          <div class="user-avatar">
            {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
          </div>
          <div class="user-details">
            <span class="user-name">{{ auth.user?.full_name }}</span>
            <span class="user-role">{{ formatRole(auth.user?.role) }}</span>
          </div>
        </div>

        <!-- Botón de menú móvil -->
        <button class="mobile-menu-btn" @click="toggleMobileMenu">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../store/auth'

// Props y emits
const emit = defineEmits(['toggle-mobile-menu'])

// State
const auth = useAuthStore()
const route = useRoute()
const showNotifications = ref(false)
const notifications = ref([
  {
    id: 1,
    type: 'order',
    message: 'Nuevo pedido recibido desde Shopify',
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutos atrás
    read: false
  },
  {
    id: 2,
    type: 'delivery',
    message: 'Entrega completada en Las Condes',
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
    read: false
  },
  {
    id: 3,
    type: 'alert',
    message: 'Conductor reportó problema en entrega',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 horas atrás
    read: true
  }
])

// Computed
const pageTitle = computed(() => {
  const routeNames = {
    'Dashboard': 'Dashboard',
    'AdminDashboard': 'Dashboard Administrativo',
    'Orders': 'Gestión de Pedidos',
    'AdminOrders': 'Pedidos Globales',
    'Channels': 'Canales de Venta',
    'AdminChannels': 'Canales Globales',
    'Billing': 'Facturación',
    'AdminBilling': 'Facturación Global',
    'AdminCompanies': 'Gestión de Empresas',
    'AdminDrivers': 'Gestión de Conductores',
    'AdminDriverPayments': 'Pagos a Conductores',
    'AdminCommunes': 'Gestión de Comunas'
  }
  
  return routeNames[route.name] || 'enviGo Logistics'
})

const breadcrumbs = computed(() => {
  const crumbs = []
  
  if (auth.isAdmin) {
    crumbs.push({ name: 'Admin', path: '/app/admin/dashboard' })
  } else {
    crumbs.push({ name: 'Inicio', path: '/app/dashboard' })
  }
  
  if (route.name !== 'Dashboard' && route.name !== 'AdminDashboard') {
    crumbs.push({ name: pageTitle.value, path: null })
  }
  
  return crumbs
})

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

// Methods
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
}

const toggleMobileMenu = () => {
  emit('toggle-mobile-menu')
}

const markAllAsRead = () => {
  notifications.value.forEach(notification => {
    notification.read = true
  })
}

const formatRole = (role) => {
  const roles = {
    'admin': 'Administrador',
    'company_owner': 'Propietario',
    'company_employee': 'Empleado'
  }
  return roles[role] || role
}

const getNotificationIcon = (type) => {
  const icons = {
    'order': 'fas fa-shopping-cart',
    'delivery': 'fas fa-truck',
    'alert': 'fas fa-exclamation-triangle',
    'success': 'fas fa-check-circle',
    'info': 'fas fa-info-circle'
  }
  return icons[type] || 'fas fa-bell'
}

const formatTime = (date) => {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

// Click outside para cerrar notificaciones
const handleClickOutside = (event) => {
  if (!event.target.closest('.notifications')) {
    showNotifications.value = false
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 2rem;
  height: 64px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

/* Header Left */
.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.breadcrumb-link {
  color: #8BC53F;
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: #7AB32E;
}

.breadcrumb-current {
  color: #374151;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #d1d5db;
  margin: 0 0.25rem;
}

/* Header Right */
.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Notificaciones */
.notifications {
  position: relative;
  cursor: pointer;
}

.notification-icon {
  position: relative;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.notification-icon:hover {
  background-color: #f3f4f6;
}

.notification-icon i {
  font-size: 1.25rem;
  color: #6b7280;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1;
}

/* Dropdown de notificaciones */
.notifications-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 0.5rem;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.notifications-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.mark-all-read {
  background: none;
  border: none;
  color: #8BC53F;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
}

.mark-all-read:hover {
  color: #7AB32E;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: #f9fafb;
}

.notification-item.unread {
  background-color: #f0f9ff;
  border-left: 3px solid #8BC53F;
}

.notification-icon-small {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-icon-small i {
  font-size: 0.875rem;
  color: #6b7280;
}

.notification-content {
  flex: 1;
}

.notification-message {
  font-size: 0.875rem;
  color: #374151;
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.notification-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

.no-notifications {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
}

.no-notifications i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

/* Usuario */
.user-info {
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.user-info:hover {
  background-color: #f9fafb;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 1rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.user-role {
  font-size: 0.75rem;
  color: #8BC53F;
  font-weight: 500;
}

/* Botón menú móvil */
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.mobile-menu-btn:hover {
  background-color: #f3f4f6;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    padding: 0 1rem;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .breadcrumb {
    display: none;
  }

  .user-details {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }

  .notifications-dropdown {
    width: 280px;
    right: -1rem;
  }
}

@media (max-width: 480px) {
  .header-right {
    gap: 0.75rem;
  }

  .user-info {
    padding: 0.25rem;
  }

  .notifications-dropdown {
    width: calc(100vw - 2rem);
    right: -1rem;
  }
}
</style>