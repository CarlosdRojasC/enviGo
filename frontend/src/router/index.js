import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/login.vue'
import StoreDashboard from '../views/dashboard.vue'
import { useAuthStore } from '../store/auth'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: StoreDashboard,
    meta: { requiresAuth: true }
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
  
  if (to.meta.requiresAuth && !auth.isLoggedIn) { // Sin paréntesis ()
    next({ name: 'Login' })
  } else if (to.name === 'Login' && auth.isLoggedIn) { // Sin paréntesis ()
    // Si ya está logueado y trata de ir al login, redirigir al dashboard
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router