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
        path: 'login',
        name: 'DriverLogin',
        component: () => import('../driver/pages/LoginPage.vue'),
        meta: { 
          guest: true,
          driverOnly: true // ✅ Marcar como ruta específica de driver
        }
      },
      {
        path: 'route',
        name: 'DriverRoute',
        component: () => import('../driver/pages/ActiveRoute.vue'),
        meta: { 
          requiresDriverAuth: true,
          driverOnly: true
        }
      },
      {
        path: 'proof/:orderId',
        name: 'DriverProof',
        component: () => import('../driver/pages/ProofOfDelivery.vue'),
        meta: { 
          requiresDriverAuth: true,
          driverOnly: true
        }
      },
      {
        path: 'offline',
        name: 'DriverOffline',
        component: () => import('../driver/pages/OfflineSync.vue'),
        meta: { 
          requiresDriverAuth: true,
          driverOnly: true
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
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isAuthenticated = auth.isLoggedIn
  const userRole = auth.user?.role
  const hasCompany = auth.hasCompany

  // ✅ 1. LÓGICA PARA RUTAS DE DRIVERS
  if (to.path.startsWith('/driver')) {
  // ✅ Si el usuario ya está logueado como driver, no lo mandes al login
  if (to.meta.guest && userRole === 'driver') {
    return next({ name: 'DriverRoute' })
  }

  // ✅ Si requiere autenticación de driver
  if (to.meta.requiresDriverAuth && userRole !== 'driver') {
    return next({ name: 'Login' }) // redirige al login principal
  }

  // ✅ Si el usuario NO es driver pero está logueado como admin/empresa
  if (isAuthenticated && userRole !== 'driver') {
    return next({ name: 'Dashboard' })
  }

  return next()
}


  // Si requiere autenticación y no está autenticado
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' })
  }

  // Si es una ruta de invitado y está autenticado, redirigir al dashboard
  if (to.meta.guest && !to.meta.driverOnly && isAuthenticated) {
    if (userRole === 'admin') return next({ path: '/app/admin/dashboard' })
    return next({ path: '/app/dashboard' })
  }

  // Verificar roles
  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    if (userRole === 'admin') return next({ path: '/app/admin/dashboard' })
    return next({ path: '/app/dashboard' })
  }

  // Verificar si requiere empresa
  if (to.meta.requiresCompany && !hasCompany) {
    return next({ name: 'Login' })
  }
  
  next()
})

export default router