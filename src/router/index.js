import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

// Lazy load komponenter
const DashboardView = () => import('@/views/DashboardView.vue');
const HomeView = () => import('@/views/HomeView.vue');
const LoginView = () => import('@/views/LoginView.vue');

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/home',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'dashboard' }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Navigation guards for auth
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  if (userStore.isLoading) {
    try {
      await userStore.initUser();
    } catch (error) {
      console.error('Error initializing user:', error);
      next({ name: 'login' });
      return;
    }
  }

  const isLoggedIn = userStore.isLoggedIn;

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn) {
      next({ name: 'login' });
    } else {
      // Redirect til dashboard ved refresh/første besøg
      if (to.name === 'home' && from.name === undefined) {
        next({ name: 'dashboard' });
      } else {
        next();
      }
    }
  } else if (to.matched.some(record => record.meta.guest) && isLoggedIn) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;