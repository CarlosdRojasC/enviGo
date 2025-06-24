<template>
  <div class="login-container">
    <h1>Login</h1>
    <form @submit.prevent="handleLogin">
      <label>Email:</label>
      <input v-model="email" type="email" required />
      
      <label>Password:</label>
      <input v-model="password" type="password" required />
      
      <button type="submit">Ingresar</button>
    </form>
    <p v-if="error" style="color:red">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

// Datos mock de usuario
const mockUser = {
  email: 'admin@tienda.com',
  password: '123456',
}

async function handleLogin() {
  error.value = '';
  const success = await auth.login(email.value, password.value);
  if (success) {
    router.push('/dashboard');
  } else {
    error.value = 'Credenciales incorrectas o error del servidor';
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
input {
  width: 100%;
  margin-bottom: 12px;
  padding: 8px;
  box-sizing: border-box;
}
button {
  width: 100%;
  padding: 10px;
  cursor: pointer;
}
</style>
