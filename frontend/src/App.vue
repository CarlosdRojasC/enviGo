<script setup>
</script>

<template>
  <router-view />
</template>

<style scoped>

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
body {
  overflow-x: hidden;
}

/* Landing Page - permitir scroll */
.route-landing body,
body.route-landing {
  overflow-y: auto;
}

/* Admin Dashboard - ocultar scroll */
.route-admin body,
.route-dashboard body,
body.route-admin,
body.route-dashboard {
  overflow-y: hidden;
}

/* App container para admin */
.admin-layout,
.dashboard-layout {
  height: 100vh;
  overflow: hidden;
}

/* Landing container */
.landing-layout {
  min-height: 100vh;
  overflow-y: auto;
}
</style>
