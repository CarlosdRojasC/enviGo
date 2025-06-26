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
  background-color: #f3f4f6;
  min-height: 100vh;
}
.main-content {
  flex-grow: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>