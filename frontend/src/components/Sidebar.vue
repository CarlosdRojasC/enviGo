<!-- frontend/src/components/Sidebar.vue - DISEÑO CLARO CON TAILWIND -->
<template>
  <aside class="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 transition-all duration-300">
    <!-- Header con Logo -->
    <div class="p-6 border-b border-gray-200">
      <img 
        class="h-10 w-auto" 
        src="../assets/favicon.png" 
        alt="enviGo Logo" 
      />
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 px-4 py-6 overflow-y-auto space-y-2">
      <!-- Sección Admin -->
      <template v-if="auth.isAdmin">
        <p class="px-2 text-xs font-semibold tracking-wider text-gray-400 uppercase mb-3">
          Administración
        </p>
        
        <router-link 
          v-for="route in adminRoutes" 
          :key="route.path"
          :to="route.path" 
          class="nav-link"
          :class="{ 'active': isActive(route.path) }"
        >
          <span class="material-icons text-xl">{{ route.icon }}</span>
          <span class="flex-1">{{ route.name }}</span>
        </router-link>
      </template>

      <!-- Sección Empresas -->
      <template v-if="!auth.isAdmin">
        <p class="px-2 text-xs font-semibold tracking-wider text-gray-400 uppercase mb-3">
          Mi Empresa
        </p>
        
        <router-link 
          v-for="route in companyRoutes" 
          :key="route.path"
          :to="route.path" 
          class="nav-link"
          :class="{ 'active': isActive(route.path) }"
        >
          <span class="material-icons text-xl">{{ route.icon }}</span>
          <span class="flex-1">{{ route.name }}</span>
        </router-link>
      </template>
    </nav>

    <!-- Footer con Usuario y Acciones -->
    <div class="border-t border-gray-200 p-4 space-y-3">
      <!-- User Profile -->
      <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
            {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
          </div>
          <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">
            {{ auth.user?.full_name }}
          </p>
          <p class="text-xs text-gray-500 capitalize">
            {{ auth.user?.role.replace('_', ' ') }}
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2">
        <router-link 
          to="/" 
          class="action-btn group hover:bg-gray-50"
        >
          <span class="material-icons text-lg text-gray-400 group-hover:text-indigo-600">home</span>
          <span class="flex-1 text-gray-700 group-hover:text-gray-900">Página Principal</span>
        </router-link>

        <button 
          @click="logout" 
          class="action-btn group hover:bg-red-50"
        >
          <span class="material-icons text-lg text-gray-400 group-hover:text-red-600">logout</span>
          <span class="flex-1 text-gray-700 group-hover:text-red-600">Cerrar Sesión</span>
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

// Rutas para Admin con Material Icons
const adminRoutes = [
  { path: '/app/admin/dashboard', icon: 'dashboard', name: 'Dashboard' },
  { path: '/app/admin/companies', icon: 'business', name: 'Empresas' },
  { path: '/app/admin/pickup-routes', icon: 'route', name: 'Rutas de Recolección' },
  { path: '/app/admin/orders', icon: 'inventory_2', name: 'Pedidos Globales' },
  { path: '/app/admin/manifests', icon: 'receipt_long', name: 'Manifiestos' },
  { path: '/app/admin/channels', icon: 'storefront', name: 'Canales de Venta' },
  { path: '/app/admin/billing', icon: 'request_quote', name: 'Facturación' },
  { path: '/app/admin/drivers', icon: 'local_shipping', name: 'Conductores' },
  { path: '/app/admin/driver-payments', icon: 'payments', name: 'Pago Conductores' },
  { path: '/app/admin/communes', icon: 'map', name: 'Comunas' },
  { path: '/app/admin/routes', icon: 'route', name: 'Rutas Optimizadas' },
];

// Rutas para Empresas con Material Icons
const companyRoutes = [
  { path: '/app/dashboard', icon: 'dashboard', name: 'Dashboard' },
  { path: '/app/orders', icon: 'inventory_2', name: 'Mis Pedidos' },
  { path: '/app/manifests', icon: 'receipt_long', name: 'Manifiestos' },
  { path: '/app/channels', icon: 'storefront', name: 'Mis Canales' },
  { path: '/app/billing', icon: 'request_quote', name: 'Facturación' },
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
  @apply flex items-center gap-3 px-4 py-2.5 rounded-lg 
         text-sm font-medium text-gray-700
         transition-all duration-200
         hover:bg-gray-100 hover:text-gray-900;
}

.nav-link.active {
  @apply bg-indigo-600 text-white shadow-sm;
}

.nav-link.active .material-icons {
  @apply text-white;
}

.nav-link:not(.active) .material-icons {
  @apply text-gray-400;
}

.nav-link:hover:not(.active) .material-icons {
  @apply text-indigo-600;
}

/* Action Button Styles */
.action-btn {
  @apply w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
         text-sm font-medium transition-all duration-200
         border border-transparent;
}

/* Scrollbar Styling */
nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

nav::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

nav::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
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
    @apply flex-col min-w-[80px] text-center py-3 px-2 text-xs;
  }

  .nav-link .material-icons {
    @apply text-2xl mb-1;
  }

  aside > div:first-child,
  aside > div:last-child {
    @apply hidden;
  }
}
</style>