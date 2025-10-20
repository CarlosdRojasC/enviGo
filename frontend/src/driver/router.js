import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from './pages/LoginPage.vue';
import ActiveRoute from './pages/ActiveRoute.vue';
import ProofOfDelivery from './pages/ProofOfDelivery.vue';
import OfflineSync from './pages/OfflineSync.vue';

const routes = [
  { path: '/driver/login', name: 'driver-login', component: LoginPage },
  { path: '/driver/route', name: 'driver-route', component: ActiveRoute, meta: { requiresAuth: true } },
  { path: '/driver/proof/:orderId', name: 'driver-proof', component: ProofOfDelivery, meta: { requiresAuth: true } },
  { path: '/driver/offline', name: 'driver-offline', component: OfflineSync, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _, next) => {
  const token = localStorage.getItem('driver_token');
  if (to.meta.requiresAuth && !token) return next('/driver/login');
  next();
});

export default router;
