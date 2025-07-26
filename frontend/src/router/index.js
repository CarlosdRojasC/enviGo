import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

// Layouts
import DashboardLayout from '../layouts/DashboardLayout.vue'
import PublicLayout from '../layouts/PublicLayout.vue'

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
          return auth.isAdmin ? '/app/dashboard' : '/app/dashboard';
        }
      },

      // ==================== DASHBOARDS ====================
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { 
          requiresAuth: true,
          roles: ['admin', 'company_owner', 'company_employee']
        }
      },

      // ==================== PEDIDOS (VISTA UNIFICADA) ====================
      {
        path: 'orders', 
        name: 'Orders', 
        component: () => import('../views/UnifiedOrdersView.vue'),
        meta: { 
          requiresAuth: true,
          roles: ['admin', 'company_owner', 'company_employee']
        }
      },

      // ==================== REDIRECCIONES PARA COMPATIBILIDAD ====================
      {
        path: 'admin/orders',
        name: 'AdminOrders',
        redirect: { name: 'Orders' }
      },

      // ==================== EMPRESAS (Solo Admin) ====================
      {
        path: 'companies',
        name: 'Companies',
        component: () => import('../views/Companies.vue'),
        meta: { 
          requiresAuth: true, 
          roles: ['admin'] 
        }
      },

      // ==================== CANALES ====================
      {
        path: 'channels',
        name: 'Channels',
        component: () => import('../views/Channels.vue'),
        meta: { 
          requiresAuth: true, 
          requiresCompany: true,
          roles: ['company_owner', 'company_employee']
        }
      },

      // ==================== CONFIGURACIÓN DE COMUNAS ====================
      {
        path: 'admin/communes',
        name: 'AdminCommunes',
        component: () => import('../views/AdminCommunes.vue'),
        meta: { 
          requiresAuth: true, 
          roles: ['admin'] 
        }
      },

      // ==================== CONDUCTORES Y SHIPDAY ====================
      {
        path: 'drivers',
        name: 'Drivers',
        component: () => import('../views/Drivers.vue'),
        meta: { 
          requiresAuth: true, 
          roles: ['admin'] 
        }
      },

      // ==================== USUARIOS ====================
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { 
          requiresAuth: true, 
          requiresCompany: true,
          roles: ['company_owner']
        }
      },

      // ==================== FACTURACIÓN ====================
      {
        path: 'billing',
        name: 'Billing',
        component: () => import('../views/Billing.vue'),
        meta: { 
          requiresAuth: true, 
          requiresCompany: true,
          roles: ['company_owner']
        }
      },

      // ==================== CONFIGURACIÓN ====================
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { 
          requiresAuth: true,
          roles: ['admin', 'company_owner', 'company_employee']
        }
      }
    ]
  },

  // ==================== RUTAS DE ERROR ====================
  { 
    path: '/:pathMatch(.*)*', 
    redirect: '/' 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ==================== GUARDS DE NAVEGACIÓN ====================
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isAuthenticated = auth.isLoggedIn
  const userRole = auth.user?.role
  const hasCompany = auth.hasCompany

  console.log('🚦 Router Guard:', {
    to: to.name,
    isAuthenticated,
    userRole,
    hasCompany,
    meta: to.meta
  })

  // Si requiere autenticación y no está autenticado
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('❌ No autenticado, redirigiendo a login')
    return next({ name: 'Login' })
  }

  // Si es una ruta de invitado y está autenticado, redirigir al dashboard
  if (to.meta.guest && isAuthenticated) {
    console.log('✅ Ya autenticado, redirigiendo a dashboard')
    return next({ path: '/app/dashboard' })
  }

  // Verificar roles
  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    console.log('❌ Rol no autorizado:', { required: to.meta.roles, current: userRole })
    return next({ path: '/app/dashboard' })
  }

  // Verificar si requiere empresa (solo para no-admins)
  if (to.meta.requiresCompany && userRole !== 'admin' && !hasCompany) {
    console.log('❌ Requiere empresa y no la tiene')
    return next({ name: 'Login' })
  }
  
  console.log('✅ Acceso permitido')
  next()
})

export default router