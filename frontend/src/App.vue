<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// Importar layouts
import MainLayout from './layouts/PublicLayout.vue'
import EmptyLayout from './layouts/EmptyLayout.vue'

const route = useRoute()

// Detectar layout según la meta de la ruta
const currentLayout = computed(() => {
  const layoutName = route.meta.layout
  
  if (layoutName === 'empty') {
    return EmptyLayout
  }
  
  return MainLayout
})
</script>

<template>
  <component :is="currentLayout">
    <router-view />
  </component>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  min-height: 100vh;
}
</style>