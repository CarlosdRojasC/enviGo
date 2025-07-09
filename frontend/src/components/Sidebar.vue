<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>enviGo</span>
      </h2>
    </div>
    <nav class="nav-menu">
      <router-link v-if="auth.isAdmin" to="/admin/dashboard" class="nav-item">📊 <span>Dashboard</span></router-link>
      <router-link v-if="auth.isAdmin" to="/admin/companies" class="nav-item">🏢 <span>Empresas</span></router-link>
      <router-link v-if="auth.isAdmin" to="/admin/orders" class="nav-item">📦 <span>Pedidos Globales</span></router-link>
      <router-link v-if="auth.isAdmin" to="/admin/channels" class="nav-item">📡 <span>Canales de Venta</span></router-link>
      <router-link v-if="auth.isAdmin" to="/admin/billing" class="nav-item">🧾 <span>Facturación</span></router-link>
      <router-link v-if="auth.isAdmin" to="/admin/drivers" class="nav-item">🚚 <span>Conductores</span></router-link>
      <router-link v-if="auth.isAdmin" to="/admin/communes" class="nav-item">🏘️ <span>Comunas</span></router-link>
     <router-link v-if="auth.isAdmin" to="/admin/driver-orders" class="nav-item">🚚 <span>Pedidos de Conductores</span></router-link>





      <router-link v-if="!auth.isAdmin" to="/dashboard" class="nav-item">📊 <span>Dashboard</span></router-link>
      <router-link v-if="!auth.isAdmin" to="/orders" class="nav-item">📦 <span>Mis Pedidos</span></router-link>
      <router-link v-if="!auth.isAdmin" to="/channels" class="nav-item">📡 <span>Mis Canales</span></router-link>
      <router-link v-if="!auth.isAdmin" to="/billing" class="nav-item">🧾 <span>Facturación</span></router-link>
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
        <button @click="logout" class="logout-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 17L15 12L10 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
  router.push('/login');
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background-color: #0f172a; /* Azul oscuro casi negro */
  color: #94a3b8; /* Gris azulado claro */
  display: flex;
  flex-direction: column;
  height: 100vh;
  flex-shrink: 0;
  transition: width 0.3s ease;
  border-right: 1px solid #1e293b; /* Borde sutil */
}

.sidebar-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #1e293b;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #e2e8f0; /* Blanco un poco más suave */
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  text-decoration: none;
}

.logo svg {
  color: #4f46e5; /* Morado del diseño original */
}

.nav-menu {
  flex-grow: 1;
  padding: 16px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  text-decoration: none;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px; /* Bordes redondeados */
  transition: all 0.2s ease-in-out;
  font-weight: 500;
}

.nav-item:hover {
  background-color: #1e293b; /* Fondo más oscuro al pasar el ratón */
  color: #f1f5f9; /* Texto más claro al pasar el ratón */
}

.router-link-exact-active {
  background-color: #4f46e5; /* Color de acento */
  color: white;
  font-weight: 600;
}

.sidebar-footer {
  padding: 20px 16px;
  border-top: 1px solid #1e293b;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #334155;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
    flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.user-role {
  font-size: 12px;
  color: #64748b; /* Gris más claro */
  text-transform: capitalize;
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background-color: transparent;
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background-color: #ef4444; /* Rojo para acción destructiva */
  border-color: #ef4444;
  color: white;
}
</style>