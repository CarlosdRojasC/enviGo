import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null);
  const token = ref(localStorage.getItem('token') || null);

  async function login(email, password) {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      user.value = data.user;
      token.value = data.token;

      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      return true;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  function isLoggedIn() {
    return !!token.value;
  }

  return { user, token, login, logout, isLoggedIn };
});
