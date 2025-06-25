// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/login.vue'
import StoreDashboard from '../views/dashboard.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import { useAuthStore } from '../store/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: StoreDashboard,
    meta: { 
      requiresAuth: true, 
      roles: ['company_owner', 'company_employee'],
      requiresCompany: true
    }
  }, 
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { 
      requiresAuth: true, 
      roles: ['admin']
    }
  },
  
  // Rutas adicionales que podrías agregar después
  // {
  //   path: '/orders',
  //   name: 'Orders',
  //   component: () => import('../views/orders.vue'),
  //   meta: { 
  //     requiresAuth: true,
  //     roles: ['admin', 'company_owner', 'company_employee']
  //   }
  // },
  // {
  //   path: '/channels',
  //   name: 'Channels',
  //   component: () => import('../views/channels.vue'),
  //   meta: { 
  //     requiresAuth: true,
  //     roles: ['admin', 'company_owner', 'company_employee'],
  //     requiresCompany: true
  //   }
  // },
  // {
  //   path: '/profile',
  //   name: 'Profile',
  //   component: () => import('../views/profile.vue'),
  //   meta: { requiresAuth: true }
  // },
  
  // Ruta de fallback
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
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

  console.log('Router Guard:', {
    to: to.name,
    isAuthenticated,
    userRole,
    hasCompany,
    meta: to.meta
  })

  // 1. Si no está autenticado y la ruta requiere login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' })
  }

  // 2. Si intenta entrar al login estando logueado
  if (to.meta.guest && isAuthenticated) {
    // Redirigir según el rol
    if (userRole === 'admin') {
      return next({ name: 'AdminDashboard' })
    } else if (userRole === 'company_owner' || userRole === 'company_employee') {
      return next({ name: 'Dashboard' })
    }
  }

  // 3. Verificar roles permitidos
  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    console.log('Acceso denegado por rol')
    // Redirigir a su dashboard correspondiente
    if (userRole === 'admin') {
      return next({ name: 'AdminDashboard' })
    } else {
      return next({ name: 'Dashboard' })
    }
  }

  // 4. Verificar si requiere empresa
  if (to.meta.requiresCompany && !hasCompany) {
    console.log('Acceso denegado: usuario sin empresa')
    return next({ name: 'Login' })
  }

  // 5. En cualquier otro caso, permitir acceso
  next()
})

export default router