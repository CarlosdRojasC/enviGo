import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)

  function login(userData, jwt) {
    user.value = userData
    token.value = jwt
    localStorage.setItem('token', jwt)
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  function isLoggedIn() {
    return !!token.value || !!localStorage.getItem('token')
  }

  return { user, token, login, logout, isLoggedIn }
})
