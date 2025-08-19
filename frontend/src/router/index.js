import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

// Layouts
import DashboardLayout from '../layouts/DashboardLayout.vue'
import PublicLayout from '../layouts/PublicLayout.vue'

// Vistas públicas
import LandingPage from '../views/LandingPage.vue'
import Login from '../views/login.vue'
 

// Vistas del sistema (existentes)
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
  component: () => import('../views/ManifestsAdmin.vue'), // Reutilizar el mismo componente
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
        path: 'admin/pickup-routes',
        name: 'AdminPickupRoutes',
        component: () => import('../components/PickupRoutes.vue'),
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
  path: 'admin/manifest/:id',
  name: 'AdminManifestView',
  component: () => import('../views/PickupManifest.vue'),
  meta: { 
    requiresAuth: true, 
    roles: ['admin'] 
  }
},
    ]
  },

  // ==================== RUTAS ESPECIALES ====================
  {
    path: '/integrations/mercadolibre/callback',
    name: 'MercadoLibreCallback',
    component: () => import('../views/MercadoLibreCallback.vue'),
    meta: { requiresAuth: true }
  },

  // Redirigir cualquier ruta no encontrada
  { 
    path: '/:pathMatch(.*)*', 
    redirect: '/' 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guards de navegación actualizados
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isAuthenticated = auth.isLoggedIn
  const userRole = auth.user?.role
  const hasCompany = auth.hasCompany

  // Si requiere autenticación y no está autenticado
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' })
  }

  // Si es una ruta de invitado y está autenticado, redirigir al dashboard
  if (to.meta.guest && isAuthenticated) {
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