// frontend/src/router/index.js - GUARDS CORREGIDOS
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

// Layouts
import DashboardLayout from '../layouts/DashboardLayout.vue'
import PublicLayout from '../layouts/PublicLayout.vue'
import EmptyLayout from '../layouts/EmptyLayout.vue'

// Vistas públicas
import LandingPage from '../views/LandingPage.vue'
import Login from '../views/login.vue'


const routes = [
  // ==================== RUTAS PÚBLICAS ====================
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: LandingPage
      },
      {
        path: 'login',
        name: 'Login',
        component: Login,
        meta: { guest: true }
      },
      {
        path: 'reset-password',
        name: 'ResetPassword',
        component: () => import('../components/ResetPassword.vue'),
        meta: { guest: true }
      }
    ]
  },

  // ==================== RUTAS DEL SISTEMA ====================
  {
    path: '/app',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      { 
        path: '', 
        redirect: to => {
          const auth = useAuthStore();
          return auth.isAdmin ? '/app/admin/dashboard' : '/app/dashboard';
        }
      },
      
      // RUTAS PARA EMPRESAS
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('../views/Orders.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      {
        path: 'channels',
        name: 'Channels',
        component: () => import('../views/Channels.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      {
        path: 'billing',
        name: 'Billing',
        component: () => import('../views/Billing.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../components/Profile.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../components/Settings.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      {
        path: 'manifests',
        name: 'Manifests',
        component: () => import('../views/ManifestsAdmin.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      {
        path: 'manifest/:id',
        name: 'ManifestView',
        component: () => import('../views/PickupManifest.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      },
      
      // RUTAS PARA ADMIN
      {
        path: 'admin/dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/AdminDashboard.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/profile',
        name: 'AdminProfile',
        component: () => import('../components/Profile.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/settings',
        name: 'AdminSettings',
        component: () => import('../components/Settings.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/companies',
        name: 'AdminCompanies',
        component: () => import('../views/Companies.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/orders',
        name: 'AdminOrders',
        component: () => import('../views/AdminOrders.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/channels',
        name: 'AdminChannels',
        component: () => import('../views/Channels.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/billing',
        name: 'AdminBilling',
        component: () => import('../views/AdminBilling.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/drivers',
        name: 'AdminDrivers',
        component: () => import('../views/Drivers.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/driver-payments',
        name: 'AdminDriverPayments',
        component: () => import('../components/DriverPayments.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/communes',
        name: 'AdminCommunes',
        component: () => import('../views/AdminCommunes.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/manifests',
        name: 'AdminManifests',
        component: () => import('../views/ManifestsAdmin.vue'),
        meta: { 
          requiresAuth: true, 
          roles: ['admin'] 
        }
      },
      {
        path: 'admin/pickup-routes',
        name: 'PickupRoutes',
        component: () => import('../components/PickupRoutes.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/routes',
        name: 'AdminRoutes',
        component: () => import('../views/RouteManager.vue'),
        meta: {
          title: 'Gestor de Rutas',
          requiresAuth: true,
          layout: 'admin',
          icon: '🚚'
        }
      },
      {
        path: 'admin/manifest/:id',
        name: 'AdminManifestView',
        component: () => import('../views/PickupManifest.vue'),
        meta: { 
          requiresAuth: true, 
          roles: ['admin'] 
        }
      }
    ]
  },

  // ==================== RUTAS ESPECIALES ====================
  {
    path: '/scanner',
    name: 'MLScanner',
    component: () => import('../views/DriverMLScanner.vue'),
    meta: { 
      requiresAuth: false
    }
  },
  {
    path: '/integrations/mercadolibre/callback',
    name: 'MercadoLibreCallback',
    component: () => import('../views/MercadoLibreCallback.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/integration-success',
    name: 'IntegrationSuccess',
    component: () => import('../views/IntegrationSuccess.vue'),
    meta: { 
      requiresAuth: false,
      title: 'Integración Exitosa'
    }
  },
  {
    path: '/integration-error',
    name: 'IntegrationError',
    component: () => import('../views/IntegrationError.vue'),
    meta: { 
      requiresAuth: false,
      title: 'Error en Integración'
    }
  },

  // ==================== RUTAS EXCLUSIVAS PARA CONDUCTORES ====================
  {
  path: '/driver',
  component: EmptyLayout, // Sin sidebar ni dashboard  
  children: [
    {
      path: '',
      name: 'DriverApp',
      component: () => import('../views/DriverApp.vue'), // ✅ SPA principal del conductor
      meta: { 
        requiresAuth: true, // ✅ Usar el mismo guard que admins
        driverOnly: true    // ✅ Pero solo para conductores
      }
    }
  ]
},

  // Catch all
  { 
    path: '/:pathMatch(.*)*', 
    redirect: '/' 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ✅ GUARDS DE NAVEGACIÓN MEJORADOS
router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  
  // Si no hay token y la ruta requiere autenticación
  if (!token && to.meta.requiresAuth) {
    return next('/login') // ✅ Todos van al mismo login
  }
  
  // Si hay token, verificar el rol del usuario
  if (token) {
    try {
      // Decodificar el token para obtener el rol
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userRole = payload.role
      
      console.log('👤 Usuario autenticado como:', userRole)
      
      // ✅ Redirección inteligente según rol
      if (userRole === 'driver') {
        // Conductores solo pueden acceder a rutas de driver
        if (to.meta.driverOnly || to.path === '/driver') {
          // Permitir acceso
        } else if (to.path === '/login' || to.path === '/' || to.path === '/dashboard') {
          // Redirigir conductores a su app
          return next('/driver')
        } else {
          // Bloquear acceso a rutas de admin
          return next('/driver')
        }
      } else {
        // Admins/Managers no pueden acceder a rutas de driver
        if (to.meta.driverOnly) {
          return next('/dashboard')
        } else if (to.path === '/login' || to.path === '/') {
          return next('/dashboard')
        }
      }
      
    } catch (error) {
      console.error('❌ Error decodificando token:', error)
      localStorage.removeItem('token')
      return next('/login')
    }
  }
  
  // Si es ruta de invitado y hay token, redirigir según rol
  if (to.meta.guest && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userRole = payload.role
      
      if (userRole === 'driver') {
        return next('/driver')
      } else {
        return next('/dashboard')
      }
    } catch (error) {
      localStorage.removeItem('token')
    }
  }
  
  next()
})
export default router