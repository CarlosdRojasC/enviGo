<template>
  <div class="h-screen flex flex-col justify-center items-center bg-gray-100">
    <div class="bg-white p-6 rounded-xl shadow-lg w-96">
      <h1 class="text-2xl font-bold text-center mb-4">🚛 Acceso Conductores</h1>

      <input v-model="email" placeholder="Correo" type="email" class="input mb-3" />
      <input v-model="password" placeholder="Contraseña" type="password" class="input mb-4" />

      <button @click="login" :disabled="loading" class="btn-primary w-full">
        {{ loading ? 'Ingresando...' : 'Iniciar Sesión' }}
      </button>

      <p v-if="error" class="text-red-600 text-sm text-center mt-3">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { driverStore } from "../store";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();

const login = async () => {
  try {
    loading.value = true;
    await driverStore.login(email.value, password.value);
    router.push("/driver/dashboard"); // 🔗 cambiar por la ruta principal del conductor
  } catch (err) {
    error.value = err.message || "Error de autenticación";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.input {
  @apply w-full border rounded-md px-3 py-2 focus:ring focus:ring-blue-300;
}
.btn-primary {
  @apply bg-blue-600 text-white font-semibold rounded-md py-2 hover:bg-blue-700;
}
</style>
