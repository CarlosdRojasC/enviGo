<template>
  <div class="dashboard-layout">
    <Sidebar />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue';
</script>

<style scoped>
.dashboard-layout {
 display: flex;
  height: 100vh; /* Fija la altura a la de la pantalla */
  width: 100%;
  background-color: #f3f4f6;
  overflow: hidden; /* Evita que el layout principal se desborde y genere un scroll global */
}
.main-content {
  flex-grow: 1;
  padding: 32px;
  overflow-y: auto;
  height: 100vh; 
}
</style>