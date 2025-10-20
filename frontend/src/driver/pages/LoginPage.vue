<template>
  <div class="h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="bg-white p-8 rounded-xl shadow-lg w-96 max-w-md">
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">🚛</h1>
        <h2 class="text-xl font-semibold text-gray-700">Acceso Conductores</h2>
        <p class="text-sm text-gray-500 mt-1">Ingresa tus credenciales para continuar</p>
      </div>

      <!-- Formulario -->
      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Correo Electrónico
          </label>
          <input 
            v-model="email" 
            placeholder="ejemplo@correo.com" 
            type="email" 
            class="input"
            :disabled="loading"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input 
            v-model="password" 
            placeholder="••••••••" 
            type="password" 
            class="input"
            :disabled="loading"
            required
          />
        </div>

        <button 
          type="submit"
          :disabled="loading || !email || !password" 
          class="btn-primary w-full"
        >
          <span v-if="loading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Ingresando...
          </span>
          <span v-else>Iniciar Sesión</span>
        </button>
      </form>

      <!-- Mensajes de error -->
      <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <p class="text-red-600 text-sm text-center">{{ error }}</p>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center">
        <p class="text-xs text-gray-500">
          ¿Problemas para acceder? Contacta al administrador
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { driverStore } from "../store";

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const router = useRouter();

// ✅ Verificar si ya está autenticado al montar el componente
onMounted(() => {
  if (driverStore.isAuthenticated) {
    router.push("/driver/route");
  }
});

const login = async () => {
  if (!email.value || !password.value) {
    error.value = "Por favor completa todos los campos";
    return;
  }

  try {
    loading.value = true;
    error.value = "";
    
    // ✅ Intentar login
    await driverStore.login(email.value, password.value);
    
    // ✅ Redirigir si es exitoso
    router.push("/driver/route");
    
  } catch (err) {
    console.error("❌ Error en login:", err);
    error.value = err.message || "Error de autenticación";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.input {
  @apply w-full border border-gray-300 rounded-md px-3 py-2 
         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
         disabled:bg-gray-100 disabled:cursor-not-allowed
         transition-colors duration-200;
}

.btn-primary {
  @apply bg-blue-600 text-white font-semibold rounded-md py-3 px-4
         hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
         disabled:bg-gray-400 disabled:cursor-not-allowed
         transition-all duration-200 transform hover:scale-[1.02];
}
</style>