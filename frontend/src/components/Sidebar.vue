<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="logo">enviGo</h2>
    </div>
    <nav class="nav-menu">
      <router-link v-if="auth.isAdmin" to="/admin/dashboard" class="nav-item">📊 Dashboard</router-link>
      <router-link v-if="auth.isAdmin" to="/admin/companies" class="nav-item">🏢 Empresas</router-link>
      <router-link v-if="auth.isAdmin" to="/admin/orders" class="nav-item">📦 Pedidos Globales</router-link>
      <router-link v-if="auth.isAdmin" to="/admin/billing" class="nav-item">🧾 Facturación</router-link>
      
      <router-link v-if="!auth.isAdmin" to="/dashboard" class="nav-item">📊 Dashboard</router-link>
      <router-link v-if="!auth.isAdmin" to="/orders" class="nav-item">📦 Mis Pedidos</router-link>
      <router-link v-if="!auth.isAdmin" to="/channels" class="nav-item">📡 Mis Canales</router-link>
      <router-link v-if="!auth.isAdmin" to="/billing" class="nav-item">🧾 Facturación</router-link>
    </nav>
    <div class="sidebar-footer">
        <div class="user-profile">
            <span class="user-name">{{ auth.user?.full_name }}</span>
            <span class="user-role">{{ auth.user?.role }}</span>
        </div>
        <button @click="logout" class="logout-btn">Cerrar Sesión</button>
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
.sidebar { width: 250px; background-color: #111827; color: #d1d5db; display: flex; flex-direction: column; height: 100vh; flex-shrink: 0; }
.sidebar-header { padding: 24px; border-bottom: 1px solid #374151; text-align: center; }
.logo { color: white; font-size: 24px; font-weight: bold; margin: 0; }
.nav-menu { flex-grow: 1; padding: 16px 0; }
.nav-item { display: block; color: #d1d5db; text-decoration: none; padding: 12px 24px; margin: 4px 0; border-left: 3px solid transparent; transition: all 0.2s ease-in-out; }
.nav-item:hover { background-color: #374151; color: white; }
.router-link-exact-active { background-color: #1f2937; color: white; font-weight: 600; border-left-color: #4f46e5; }
.sidebar-footer { padding: 16px; border-top: 1px solid #374151; }
.user-profile { padding: 8px; margin-bottom: 12px; }
.user-name { display: block; font-weight: 600; color: white; }
.user-role { font-size: 12px; color: #9ca3af; text-transform: capitalize; }
.logout-btn { width: 100%; padding: 10px; background-color: #374151; color: white; border: none; border-radius: 6px; cursor: pointer; }
.logout-btn:hover { background-color: #4b5563; }
</style>