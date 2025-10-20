<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <!-- HEADER -->
    <header class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 shadow-sm">
      <div class="flex items-center gap-2">
        <img src="/logo.png" alt="envigo logo" class="w-8 h-8" />
        <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-200">enviGo Driver</h1>
      </div>

      <div class="flex items-center gap-3">
        <button @click="toggleTheme" class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <component :is="darkMode ? SunIcon : MoonIcon" class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <button v-if="isDriver" @click="logout" class="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30">
          <LogoutIcon class="w-5 h-5 text-red-500" />
        </button>
      </div>
    </header>

    <!-- CONTENIDO -->
    <main class="flex-1 relative overflow-y-auto">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>

      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80 z-50"
      >
        <svg
          class="animate-spin h-8 w-8 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          ></path>
        </svg>
      </div>
    </main>

    <!-- FOOTER -->
    <footer class="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
      © {{ new Date().getFullYear() }} enviGo Logistics
    </footer>
  </div>
</template>

<script setup>
import { ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { MoonIcon, SunIcon, LogOut as LogoutIcon } from "lucide-vue-next";

const router = useRouter();
const loading = ref(false);
const darkMode = ref(localStorage.getItem("theme") === "dark");
const isDriver = localStorage.getItem("driver_token");

const toggleTheme = () => {
  darkMode.value = !darkMode.value;
  const theme = darkMode.value ? "dark" : "light";
  document.documentElement.classList.toggle("dark", darkMode.value);
  localStorage.setItem("theme", theme);
};

const logout = () => {
  localStorage.removeItem("driver_token");
  router.push("/driver/login");
};

// Maneja el loader durante navegación
router.beforeEach((to, from, next) => {
  loading.value = true;
  next();
});

router.afterEach(() => {
  setTimeout(() => (loading.value = false), 300);
});

watchEffect(() => {
  document.documentElement.classList.toggle("dark", darkMode.value);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
