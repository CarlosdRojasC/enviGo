<!-- frontend/src/layouts/DashboardLayout.vue - ACTUALIZADO -->
<template>
  <div class="dashboard-layout">
    <Sidebar />
    <main class="main-content">
      <Header />
      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import Header from '../components/Header.vue'
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: #f8fafc;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-layout {
    flex-direction: column;
  }
  
  .content-area {
    padding: 1rem;
  }
}
</style>