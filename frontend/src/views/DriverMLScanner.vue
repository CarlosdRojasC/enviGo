<template>
  <div class="scanner-app">
    
    <!-- PANTALLA DE ACCESO -->
    <div v-if="!isAccessGranted" class="access-screen">
      <div class="access-container">
        <div class="logo">
          <div class="logo-icon">📦</div>
          <h1>Scanner ML</h1>
          <p>enviGo</p>
        </div>
        
        <div class="access-form">
          <input 
            v-model="accessPassword"
            type="password" 
            placeholder="Contraseña de acceso"
            @keyup.enter="verifyAccess"
            autofocus
          />
          
          <button 
            @click="verifyAccess" 
            :disabled="!accessPassword || isVerifyingAccess"
            class="btn-primary"
          >
            {{ isVerifyingAccess ? 'Verificando...' : 'Acceder' }}
          </button>
          
          <p class="help-text">Contacta a tu supervisor para obtener la contraseña</p>
        </div>
      </div>
    </div>

    <!-- CONTENIDO DESPUÉS DE LOGIN -->
    <div v-if="isAccessGranted" class="scanner-content">
      <h1>Scanner ML Funcionando</h1>
      <p>Acceso concedido correctamente</p>
      <button @click="logout" class="btn-primary">Cerrar Sesión</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()

const isAccessGranted = ref(false)
const accessPassword = ref('')
const isVerifyingAccess = ref(false)

function verifyAccess() {
  isVerifyingAccess.value = true
  
  setTimeout(() => {
    if (accessPassword.value === 'envigo2025') {
      isAccessGranted.value = true
      localStorage.setItem('scanner_access', 'granted')
      toast.success('Acceso concedido')
    } else {
      toast.error('Contraseña incorrecta')
      accessPassword.value = ''
    }
    isVerifyingAccess.value = false
  }, 500)
}

function logout() {
  isAccessGranted.value = false
  localStorage.removeItem('scanner_access')
  toast.info('Sesión cerrada')
}
</script>

<style scoped>
.scanner-app {
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.access-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.access-container {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 60px;
  margin-bottom: 10px;
}

.logo h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 5px;
}

.logo p {
  color: #666;
  font-size: 16px;
}

.access-form input {
  width: 100%;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  margin-bottom: 15px;
}

.btn-primary {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
}

.help-text {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin-top: 15px;
}

.scanner-content {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
</style>