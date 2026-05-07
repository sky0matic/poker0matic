/**
 * router/index.ts
 *
 * Manual routes for ./src/pages/*.vue
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router'
import Config from '@/pages/config.vue'
import Index from '@/pages/index.vue'
import { useConfigStore } from '@/stores/config'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Index,
      beforeEnter: () => {
        const configStore = useConfigStore()
        configStore.initializeConfig()

        return configStore.configFound ? true : '/config?e'
      },
    },
    {
      path: '/config',
      component: Config,
      props: route => ({
        showError: 'e' in route.query,
      }),
    },
    {
      path: '/attributions',
      component: () => import('@/pages/attributions.vue'),
    },
  ],
})

export default router
