<!-- frontend/src/components/Sidebar.vue - ACTUALIZADO -->
<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
      <h2 class="logo">
        <img class="imagelogo" src="../assets/favicon.png" alt="" srcset="">
      </h2>
        </div>
      </div>
    <nav class="nav-menu">
      <!-- Rutas para Admin -->
      <router-link v-if="auth.isAdmin" to="/app/admin/dashboard" class="nav-item">
        📊 <span>Dashboard</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin/companies" class="nav-item">
        🏢 <span>Empresas</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin/orders" class="nav-item">
        📦 <span>Pedidos Globales</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin/channels" class="nav-item">
        📡 <span>Canales de Venta</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin/billing" class="nav-item">
        🧾 <span>Facturación</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin/drivers" class="nav-item">
        🚚 <span>Conductores</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin/driver-payments" class="nav-item">
        💰 <span>Pago conductores</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin/communes" class="nav-item">
        🏘️ <span>Comunas</span>
      </router-link>

      <!-- Rutas para Empresas -->
      <router-link v-if="!auth.isAdmin" to="/app/dashboard" class="nav-item">
        📊 <span>Dashboard</span>
      </router-link>
      <router-link v-if="!auth.isAdmin" to="/app/orders" class="nav-item">
        📦 <span>Mis Pedidos</span>
      </router-link>
      <router-link v-if="!auth.isAdmin" to="/app/channels" class="nav-item">
        📡 <span>Mis Canales</span>
      </router-link>
      <router-link v-if="!auth.isAdmin" to="/app/billing" class="nav-item">
        🧾 <span>Facturación</span>
      </router-link>
    </nav>
    
    <div class="sidebar-footer">
      <div class="user-profile">
        <div class="user-avatar">
          {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
        </div>
        <div class="user-info">
          <span class="user-name">{{ auth.user?.full_name }}</span>
          <span class="user-role">{{ auth.user?.role.replace('_', ' ') }}</span>
        </div>
      </div>
      
      <!-- Botón para volver a la página principal -->
      <router-link to="/" class="home-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Página Principal</span>
      </router-link>
      
      <button @click="logout" class="logout-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 17L15 12L10 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Cerrar Sesión</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { useAuthStore } from '../store/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push('/');
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background-color: #2C2C2C;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  height: 100vh;
  flex-shrink: 0;
  transition: width 0.3s ease;
  border-right: 1px solid #3A3A3A;
}

.sidebar-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #3A3A3A;
  justify-content: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.imagelogo {
  width: 160px;
  height: auto;
  filter: drop-shadow(0 0 4px rgba(0, 255, 128, 0.2));
}

.nav-menu {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
  font-weight: 500;
}

.nav-item:hover {
  background-color: rgba(139, 197, 63, 0.1);
  color: #8BC53F;
  border-left-color: #8BC53F;
}

.nav-item.router-link-active {
  background-color: rgba(139, 197, 63, 0.15);
  color: #8BC53F;
  border-left-color: #8BC53F;
}

.nav-item span {
  margin-left: 12px;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #3A3A3A;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: rgba(139, 197, 63, 0.1);
  border-radius: 8px;
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
  font-size: 1.1rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: white;
  font-size: 0.9rem;
}

.user-role {
  font-size: 0.75rem;
  color: #8BC53F;
  text-transform: capitalize;
}

.home-btn,
.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.9rem;
}

.home-btn:hover {
  background-color: rgba(139, 197, 63, 0.1);
  color: #8BC53F;
}

.logout-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.logout-btn svg {
  transition: transform 0.3s ease;
}

.logout-btn:hover svg {
  transform: translateX(2px);
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: fixed;
    bottom: 0;
    z-index: 1000;
    flex-direction: row;
    border-top: 1px solid #3A3A3A;
    border-right: none;
  }

  .sidebar-header {
    display: none;
  }

  .nav-menu {
    display: flex;
    flex-direction: row;
    padding: 0;
    overflow-x: auto;
  }

  .nav-item {
    flex-direction: column;
    min-width: 80px;
    padding: 8px;
    font-size: 0.8rem;
    text-align: center;
    border-left: none;
    border-top: 3px solid transparent;
  }

  .nav-item:hover,
  .nav-item.router-link-active {
    border-left: none;
    border-top-color: #8BC53F;
  }

  .nav-item span {
    margin-left: 0;
    margin-top: 4px;
  }

  .sidebar-footer {
    display: none;
  }
}
</style>