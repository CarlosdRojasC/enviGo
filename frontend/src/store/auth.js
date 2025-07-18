// frontend/src/store/auth.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiService } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  // Estado reactivo
  const user = ref(JSON.parse(localStorage.getItem('user')) || null);
  const token = ref(localStorage.getItem('token') || null);
  const loading = ref(false);
  const error = ref(null);

  // Computed properties
  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isCompanyOwner = computed(() => user.value?.role === 'company_owner');
  const isCompanyEmployee = computed(() => user.value?.role === 'company_employee');
  const role = computed(() => user.value?.role || null);
  const companyId = computed(() => user.value?.company?._id || user.value?.company_id || null);
  const hasCompany = computed(() => !!companyId.value);

  // Métodos
  async function login(email, password) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await apiService.auth.login(email, password);

      user.value = data.user;
      token.value = data.token;

      // Persistir en localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Error en login:', err.response || err);
      error.value = err.response?.data?.error || err.message || 'Error al iniciar sesión';
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  }

  async function register(userData) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await apiService.auth.register(userData);
      return { success: true, data };
    } catch (err) {
      error.value = err.message || 'Error al registrar usuario';
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  }

  async function getProfile() {
    if (!token.value) return null;

    try {
      const { data } = await apiService.auth.getProfile();
      user.value = data;
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (err) {
      console.error('Error getting profile:', err);
      logout();
      return null;
    }
  }

  async function changePassword(currentPassword, newPassword) {
    loading.value = true;
    error.value = null;

    try {
      await apiService.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      return { success: true };
    } catch (err) {
      error.value = err.message || 'Error al cambiar contraseña';
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    error.value = null;

    localStorage.removeItem('user');
    localStorage.removeItem('token');

    apiService.auth.logout();
  }

  function updateUser(userData) {
    user.value = { ...user.value, ...userData };
    localStorage.setItem('user', JSON.stringify(user.value));
  }

  function clearError() {
    error.value = null;
  }

  async function initializeAuth() {
    if (token.value && user.value) {
      try {
        await getProfile();
      } catch (err) {
        console.log('Token expirado, cerrando sesión.');
        logout();
      }
    }
  }

  // Función helper para verificar permisos
  function canAccessCompany(targetCompanyId) {
    if (isAdmin.value) return true;
    if (!hasCompany.value) return false;
    return companyId.value === targetCompanyId;
  }

  // Función helper para obtener rutas permitidas
  function getAllowedRoutes() {
    if (isAdmin.value) {
      return ['AdminDashboard', 'Companies', 'Users', 'Orders', 'Channels'];
    } else if (isCompanyOwner.value || isCompanyEmployee.value) {
      return ['Dashboard', 'Orders', 'Channels', 'Profile'];
    }
    return [];
  }

  return {
    // Estado
    user,
    token,
    loading,
    error,

    // Computed
    isLoggedIn,
    isAdmin,
    isCompanyOwner,
    isCompanyEmployee,
    companyId,
    role,
    hasCompany,

    // Métodos
    login,
    register,
    logout,
    getProfile,
    changePassword,
    updateUser,
    clearError,
    initializeAuth,
    canAccessCompany,
    getAllowedRoutes
  };
});