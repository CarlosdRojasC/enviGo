import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/login.vue'
import Dashboard from '../views/dashboard.vue'
import { useAuthStore } from '../store/auth'

const routes = [
  { path: '/', name: 'Login', component: Login },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn()) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
