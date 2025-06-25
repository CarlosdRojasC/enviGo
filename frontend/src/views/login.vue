<template>
  <main class="login-page">
    <div class="login-card">
      <h1 class="login-title">Iniciar Sesión</h1>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email" class="form-label">Correo electrónico</label>
          <input
            id="email"
            type="email"
            v-model="email"
            required
            class="form-input"
            placeholder="ejemplo@correo.com"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Contraseña</label>
          <input
            id="password"
            type="password"
            v-model="password"
            required
            class="form-input"
            placeholder="••••••••"
          />
        </div>

        <div v-if="auth.error" class="error-message">
          {{ auth.error }}
        </div>

        <button
          type="submit"
          :disabled="auth.loading"
          class="submit-btn"
        >
          {{ auth.loading ? 'Cargando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()

async function handleLogin() {
  const { success } = await auth.login(email.value, password.value)

  if (success) {
    if (auth.isAdmin) {
      router.push({ name: 'AdminDashboard' })
    } else {
      router.push({ name: 'Dashboard' })
    }
  }
}
</script>

<style scoped>
/* Estilos adaptados de dashboard.vue para consistencia visual */
.login-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: 20px;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  width: 100%;
  max-width: 420px;
  transition: box-shadow 0.3s ease;
}

.login-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
  margin-bottom: 30px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  width: 100%;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 500;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input::placeholder {
    color: #9ca3af;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-message {
  color: #dc2626;
  font-size: 14px;
  text-align: center;
  background-color: #fee2e2;
  padding: 10px;
  border-radius: 6px;
}

.submit-btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  background: #3b82f6;
  color: white;
  transition: background-color 0.2s, opacity 0.2s;
  margin-top: 10px;
}

.submit-btn:hover {
  background: #2563eb;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #60a5fa;
}
</style>