<template>
  <div class="callback-container">
    <div class="spinner"></div>
    <h2>Finalizando conexión con Mercado Libre...</h2>
    <p v-if="!error">Por favor, espera un momento.</p>
    <div v-if="error" class="error-message">
      <p>❌ Hubo un error al conectar tu cuenta:</p>
      <pre>{{ error }}</pre>
      <router-link to="/channels" class="btn-back">Volver a mis canales</router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { apiService } from '../services/api';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const error = ref(null);

onMounted(async () => {
  const { code, state } = route.query; // 'state' puede contener el ID del canal

  if (!code) {
    error.value = 'No se recibió el código de autorización. Por favor, intenta de nuevo.';
    return;
  }

  try {
    // Llama a un nuevo endpoint del backend para intercambiar el código por los tokens
    await apiService.mercadolibre.exchangeCode({ code, state });

    toast.success('¡Canal de Mercado Libre conectado exitosamente!');
    
    // Redirige de vuelta a la página de canales
    router.push('/channels');

  } catch (err) {
    console.error("Error en el callback de Mercado Libre:", err);
    error.value = err.response?.data?.error || 'No se pudo validar la autorización.';
  }
});
</script>

<style scoped>
.callback-container { padding: 50px; text-align: center; }
.spinner { /* ... estilos para un spinner ... */ }
.error-message { color: #dc2626; margin-top: 20px; }
.btn-back { margin-top: 15px; display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; }
</style>