<!-- frontend/src/components/Sidebar.vue - MEJORADO CON TAILWIND -->
<template>
  <aside class="flex flex-col w-64 min-h-screen bg-gray-900 border-r border-gray-800 transition-all duration-300">
    <!-- Header con Logo -->
    <div class="flex items-center justify-center py-6 px-6 border-b border-gray-800">
      <img 
        class="w-40 h-auto drop-shadow-[0_0_4px_rgba(139,197,63,0.3)]" 
        src="../assets/favicon.png" 
        alt="enviGo Logo" 
      />
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 py-6 overflow-y-auto">
      <!-- Sección Admin -->
      <div v-if="auth.isAdmin" class="space-y-1 px-3">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Administración
        </p>
        
        <router-link 
          v-for="route in adminRoutes" 
          :key="route.path"
          :to="route.path" 
          class="nav-link group"
          :class="{ 'active': isActive(route.path) }"
        >
          <span class="text-lg">{{ route.icon }}</span>
          <span class="flex-1">{{ route.name }}</span>
          <span class="opacity-0 group-hover:opacity-100 transition-opacity">
            →
          </span>
        </router-link>
      </div>

      <!-- Sección Empresas -->
      <div v-if="!auth.isAdmin" class="space-y-1 px-3">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Mi Empresa
        </p>
        
        <router-link 
          v-for="route in companyRoutes" 
          :key="route.path"
          :to="route.path" 
          class="nav-link group"
          :class="{ 'active': isActive(route.path) }"
        >
          <span class="text-lg">{{ route.icon }}</span>
          <span class="flex-1">{{ route.name }}</span>
          <span class="opacity-0 group-hover:opacity-100 transition-opacity">
            →
          </span>
        </router-link>
      </div>
    </nav>

    <!-- Footer con Usuario y Acciones -->
    <div class="border-t border-gray-800 p-4 space-y-3">
      <!-- User Profile -->
      <div class="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-lime-500/10 to-lime-600/10 border border-lime-500/20">
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center font-bold text-white shadow-lg">
            {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
          </div>
          <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-lime-500 rounded-full border-2 border-gray-900"></div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-white truncate">
            {{ auth.user?.full_name }}
          </p>
          <p class="text-xs text-lime-400 capitalize">
            {{ auth.user?.role.replace('_', ' ') }}
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2">
        <router-link 
          to="/" 
          class="action-btn group hover:bg-lime-500/10 hover:text-lime-400"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 22V12H15V22" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="flex-1">Página Principal</span>
          <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </router-link>

        <button 
          @click="logout" 
          class="action-btn group hover:bg-red-500/10 hover:text-red-400"
        >
          <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 17L15 12L10 7" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 12H3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="flex-1">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useAuthStore } from '../store/auth';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

// Rutas para Admin
const adminRoutes = [
  { path: '/app/admin/dashboard', icon: '📊', name: 'Dashboard' },
  { path: '/app/admin/companies', icon: '🏢', name: 'Empresas' },
  { path: '/app/admin/pickup-routes', icon: '📍', name: 'Rutas de Recolección' },
  { path: '/app/admin/orders', icon: '📦', name: 'Pedidos Globales' },
  { path: '/app/admin/manifests', icon: '📋', name: 'Manifiestos' },
  { path: '/app/admin/channels', icon: '📡', name: 'Canales de Venta' },
  { path: '/app/admin/billing', icon: '🧾', name: 'Facturación' },
  { path: '/app/admin/drivers', icon: '🚚', name: 'Conductores' },
  { path: '/app/admin/driver-payments', icon: '💰', name: 'Pago Conductores' },
  { path: '/app/admin/communes', icon: '🏘️', name: 'Comunas' },
];

// Rutas para Empresas
const companyRoutes = [
  { path: '/app/dashboard', icon: '📊', name: 'Dashboard' },
  { path: '/app/orders', icon: '📦', name: 'Mis Pedidos' },
  { path: '/app/manifests', icon: '📋', name: 'Manifiestos' },
  { path: '/app/channels', icon: '📡', name: 'Mis Canales' },
  { path: '/app/billing', icon: '🧾', name: 'Facturación' },
];

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/');
}

function logout() {
  auth.logout();
  router.push('/');
}
</script>

<style scoped>
/* Nav Link Styles */
.nav-link {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 
         transition-all duration-200 font-medium text-sm
         hover:bg-lime-500/10 hover:text-lime-400 hover:translate-x-1;
  border-left: 3px solid transparent;
}

.nav-link.active {
  @apply bg-gradient-to-r from-lime-500/20 to-lime-600/10 text-lime-400 
         border-l-lime-500 font-semibold;
}

/* Action Button Styles */
.action-btn {
  @apply w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
         text-gray-400 text-sm font-medium transition-all duration-200
         border border-transparent hover:border-current;
}

/* Scrollbar Styling */
nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  @apply bg-gray-800;
}

nav::-webkit-scrollbar-thumb {
  @apply bg-gray-700 rounded-full;
}

nav::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-600;
}

/* Responsive */
@media (max-width: 768px) {
  aside {
    @apply w-full h-auto fixed bottom-0 z-50 flex-row border-r-0 border-t;
  }

  nav {
    @apply flex-row py-0 px-0 overflow-x-auto;
  }

  .nav-link {
    @apply flex-col min-w-[80px] text-center py-2 px-2 text-xs border-l-0 border-t-3 hover:translate-x-0;
  }

  .nav-link span:first-child {
    @apply text-2xl;
  }

  aside > div:first-child,
  aside > div:last-child {
    @apply hidden;
  }
}
</style>