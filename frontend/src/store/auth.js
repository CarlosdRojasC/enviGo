// frontend/src/store/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  // Estado
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref(null)

  // Inicializar usuario desde localStorage
  if (token.value) {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (err) {
        console.error('Error parsing stored user:', err)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        token.value = null
      }
    }
  }

  // Computed properties
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isCompanyOwner = computed(() => user.value?.role === 'company_owner')
  const isCompanyEmployee = computed(() => user.value?.role === 'company_employee')
  const role = computed(() => user.value?.role || null)
  const companyId = computed(() => user.value?.company?._id || user.value?.company_id || null)
  const hasCompany = computed(() => !!companyId.value)
  const permissions = computed(() => user.value?.permissions || [])
  const requiresPasswordChange = computed(() => user.value?.requires_password_change || false)

  // Métodos principales
  async function login(email, password, rememberMe = false) {
    loading.value = true
    error.value = null

    try {
      const { data } = await apiService.auth.login(email, password, rememberMe)

      user.value = data.user
      token.value = data.token

      // Persistir en localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)

      return { success: true, user: data.user }
    } catch (err) {
      console.error('Error en login:', err.response || err)
      
      const errorMessage = err.response?.data?.error || err.message || 'Error al iniciar sesión'
      error.value = errorMessage

      // Manejar casos específicos
      if (err.response?.status === 423) {
        // Cuenta bloqueada
        return { 
          success: false, 
          error: errorMessage,
          locked: true,
          locked_until: err.response.data.locked_until
        }
      }

      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  async function register(userData) {
    loading.value = true
    error.value = null

    try {
      const { data } = await apiService.auth.register(userData)
      return { success: true, data }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al registrar usuario'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  async function requestPasswordReset(email) {
    loading.value = true
    error.value = null

    try {
      await apiService.auth.requestPasswordReset(email)
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error al solicitar restablecimiento'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(token, newPassword) {
    loading.value = true
    error.value = null

    try {
      await apiService.auth.resetPassword(token, newPassword)
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error al restablecer contraseña'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  async function getProfile() {
    if (!token.value) return null

    try {
      const { data } = await apiService.auth.getProfile()
      user.value = data
      localStorage.setItem('user', JSON.stringify(data))
      return data
    } catch (err) {
      console.error('Error getting profile:', err)
      if (err.response?.status === 401) {
        logout()
      }
      return null
    }
  }

  async function changePassword(currentPassword, newPassword) {
    loading.value = true
    error.value = null

    try {
      await apiService.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      })

      // Actualizar estado local si había requerimiento de cambio
      if (user.value?.requires_password_change) {
        user.value.requires_password_change = false
        localStorage.setItem('user', JSON.stringify(user.value))
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error al cambiar contraseña'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  async function verifyToken() {
    if (!token.value) return false

    try {
      const { data } = await apiService.auth.verifyToken()
      if (data.valid) {
        user.value = data.user
        localStorage.setItem('user', JSON.stringify(data.user))
        return true
      } else {
        logout()
        return false
      }
    } catch (err) {
      console.error('Token verification failed:', err)
      logout()
      return false
    }
  }
async function validateResetToken(token) {
  try {
    // Llama al servicio que acabamos de modificar
    await apiService.auth.validateResetToken(token);
  } catch (err) {
    // Si el servicio falla (ej. error 400), relanzamos el error
    // para que el componente lo atrape.
    console.error('Error al validar token desde la tienda:', err);
    throw err;
  }
}
  function logout() {
    user.value = null
    token.value = null
    error.value = null

    localStorage.removeItem('user')
    localStorage.removeItem('token')

    // Llamar API de logout si existe
    apiService.auth.logout?.()
  }

  function updateUser(userData) {
    if (user.value) {
      user.value = { ...user.value, ...userData }
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  function clearError() {
    error.value = null
  }

  async function initializeAuth() {
    if (token.value && user.value) {
      try {
        // Verificar que el token siga siendo válido
        const isValid = await verifyToken()
        return isValid
      } catch (err) {
        console.log('Token expirado durante inicialización, cerrando sesión.')
        logout()
        return false
      }
    }
    return false
  }

  // Métodos de utilidad para permisos
  function hasPermission(permission) {
    return permissions.value.includes(permission)
  }

  function hasAnyPermission(permissionList) {
    return permissionList.some(permission => permissions.value.includes(permission))
  }

  function canAccessCompany(targetCompanyId) {
    if (isAdmin.value) return true
    if (!hasCompany.value) return false
    return companyId.value === targetCompanyId
  }

  function canManageUsers() {
    return isAdmin.value || isCompanyOwner.value
  }

  function canViewAllOrders() {
    return hasPermission('view_all_orders') || isAdmin.value
  }

  function canManageCompany() {
    return hasPermission('manage_companies') || isAdmin.value
  }

  // Método para obtener rutas permitidas según el rol
  function getAllowedRoutes() {
    if (isAdmin.value) {
      return [
        'AdminDashboard', 
        'Companies', 
        'AllUsers', 
        'AllOrders', 
        'SystemSettings',
        'Analytics'
      ]
    } else if (isCompanyOwner.value) {
      return [
        'Dashboard', 
        'Orders', 
        'CompanyUsers', 
        'Channels', 
        'CompanySettings',
        'Reports',
        'Profile'
      ]
    } else if (isCompanyEmployee.value) {
      return [
        'Dashboard', 
        'Orders', 
        'CreateOrder',
        'Reports',
        'Profile'
      ]
    }
    return []
  }

  // Método para verificar si una ruta está permitida
  function isRouteAllowed(routeName) {
    const allowedRoutes = getAllowedRoutes()
    return allowedRoutes.includes(routeName)
  }

  // Método para obtener la ruta de redirección después del login
  function getRedirectRoute() {
    if (isAdmin.value) {
      return '/app/admin/dashboard'
    } else if (hasCompany.value) {
      return '/app/dashboard'
    } else {
      return '/setup' // Ruta para configurar empresa si no tiene
    }
  }

  // Auto-refresh del perfil cada cierto tiempo
  let profileRefreshInterval = null

  function startProfileRefresh() {
    if (profileRefreshInterval) return

    profileRefreshInterval = setInterval(async () => {
      if (isLoggedIn.value) {
        await getProfile()
      }
    }, 5 * 60 * 1000) // Cada 5 minutos
  }

  function stopProfileRefresh() {
    if (profileRefreshInterval) {
      clearInterval(profileRefreshInterval)
      profileRefreshInterval = null
    }
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
    permissions,
    requiresPasswordChange,

    // Métodos de autenticación
    login,
    register,
    logout,
    requestPasswordReset,
    resetPassword,
    getProfile,
    validateResetToken,
    changePassword,
    verifyToken,
    updateUser,
    clearError,
    initializeAuth,

    // Métodos de permisos
    hasPermission,
    hasAnyPermission,
    canAccessCompany,
    canManageUsers,
    canViewAllOrders,
    canManageCompany,
    getAllowedRoutes,
    isRouteAllowed,
    getRedirectRoute,

    // Utilidades
    startProfileRefresh,
    stopProfileRefresh
  }
})