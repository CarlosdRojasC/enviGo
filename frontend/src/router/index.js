import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import Login from '../views/login.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true }
  },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      { 
        path: '', 
        redirect: to => {
          const auth = useAuthStore();
          return auth.isAdmin ? '/admin/dashboard' : '/dashboard';
        }
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard.vue'),
        meta: { roles: ['company_owner', 'company_employee'], requiresCompany: true }
      }, 
      {
        path: 'admin/dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/AdminDashboard.vue'),
        meta: { roles: ['admin'] }
      },
   // Rutas de facturas para empresas
      {
        path: 'Billing',
        name: 'Billing',
        component: () => import('../views/Billing.vue'),
        meta: { 
          roles: ['company_owner', 'company_employee'], 
          requiresCompany: true 
        }
      },

      // Rutas de facturas para admin
      {
        path: 'admin/billing',
        name: 'AdminBilling',
        component: () => import('../views/Billing.vue'),
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
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isAuthenticated = auth.isLoggedIn
  const userRole = auth.user?.role
  const hasCompany = auth.hasCompany

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' })
  }

  if (to.meta.guest && isAuthenticated) {
    if (userRole === 'admin') return next({ name: 'AdminDashboard' })
    return next({ name: 'Dashboard' })
  }

  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    if (userRole === 'admin') return next({ name: 'AdminDashboard' })
    return next({ name: 'Dashboard' })
  }

  if (to.meta.requiresCompany && !hasCompany) {
    return next({ name: 'Login' })
  }
  
  next()
})

export default router