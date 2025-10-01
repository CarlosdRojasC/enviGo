<script setup>
</script>

<template>
  <router-view />
</template>

<style scoped>
body{
  overflow-y: hidden;
}
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
#app {
  min-height: 100vh;
}
body {
  overflow-x: hidden;
}

</style>
