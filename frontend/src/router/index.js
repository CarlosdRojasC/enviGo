import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/login.vue'
import StoreDashboard from '../views/dashboard.vue'
import { useAuthStore } from '../store/auth'
import AdminDashboard from '../views/AdminDashboard.vue'

const routes = [
 {
  path: '/',
  redirect: to => {
    // No uses useAuthStore() aquí directamente porque Pinia no está listo
    // Mejor redirige siempre a /login o maneja esto en beforeEach
    return '/login';
  }
},
{
  path: '/login',
  name: 'Login',
  component: Login
},
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: StoreDashboard,
    meta: { requiresAuth: true, role: 'user' },
  }, 
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, role: 'admin' },
  },
  // Rutas adicionales que podrías agregar después
  // {
  //   path: '/orders/:id',
  //   name: 'OrderDetail',
  //   component: () => import('../views/order-detail.vue'),
  //   meta: { requiresAuth: true }
  // },
  // {
  //   path: '/channels',
  //   name: 'Channels',
  //   component: () => import('../views/channels.vue'),
  //   meta: { requiresAuth: true }
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
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})


router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isAuthenticated = auth.isLoggedIn
  const userRole = auth.user?.role // 'admin' o 'user'

  // 1. Si no está autenticado y la ruta requiere login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' })
  }

  // 2. Si intenta entrar al login estando logueado
  if (to.name === 'Login' && isAuthenticated) {
    if (userRole === 'admin') {
      return next({ name: 'AdminDashboard' })
    } else {
      return next({ name: 'Dashboard' })
    }
  }

  // 3. Si está autenticado pero entra a una ruta no permitida por su rol
  if (to.meta.role && to.meta.role !== userRole) {
    return next({ name: userRole === 'admin' ? 'AdminDashboard' : 'Dashboard' })
  }

  // 4. En cualquier otro caso
  next()
})

export default router