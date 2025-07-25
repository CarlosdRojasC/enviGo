<!-- frontend/src/layouts/PublicLayout.vue -->
<template>
  <div class="public-layout">
    <router-view />
  </div>
</template>

<script setup>
// Este layout es mínimo, solo para envolver las páginas públicas
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  width: 100%;
}

/* Reset básico para páginas públicas */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>