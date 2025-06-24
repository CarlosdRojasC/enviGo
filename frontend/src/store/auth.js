import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
const token = ref(localStorage.getItem('token') || null)
const user = ref(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null)

  function login(userData, jwt) {
 user.value = userData
  token.value = jwt
  localStorage.setItem('token', jwt)
  localStorage.setItem('user', JSON.stringify(userData))
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function isLoggedIn() {
    return !!token.value || !!localStorage.getItem('token')
  }

  return { user, token, login, logout, isLoggedIn }
})
