/**
 * router/index.ts
 *
 * Manual routes for ./src/pages/*.vue
 */

// Composables
import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import Config from '@/pages/config.vue'
import Index from '@/pages/index.vue'
import { useConfigStore } from '@/stores/config'

function requireConfig (to: RouteLocationNormalized) {
  const configStore = useConfigStore()
  configStore.initializeConfig()

  if (!configStore.configFound) {
    return '/config?e'
  }

  if ('config' in to.query) {
    const { config: _, ...query } = to.query
    return { path: to.path, params: to.params, query, replace: true }
  }

  return true
}

function requireConfigIndex (to: RouteLocationNormalized) {
  const configStore = useConfigStore()
  configStore.initializeConfig()

  if (!configStore.configFound) {
    return '/config?e'
  }

  const roomId = to.query.roomId
  if (typeof roomId === 'string' && roomId.trim().length > 0) {
    return `/rooms/${roomId.trim()}`
  }

  if ('config' in to.query) {
    const { config: _, ...query } = to.query
    return { path: to.path, query, replace: true }
  }

  return true
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Index,
      beforeEnter: requireConfigIndex,
    },
    {
      path: '/rooms/:roomId',
      component: () => import('@/pages/room.vue'),
      beforeEnter: requireConfig,
    },
    {
      path: '/create',
      component: () => import('@/pages/create.vue'),
      beforeEnter: requireConfig,
    },
    {
      path: '/config',
      component: Config,
      props: route => ({
        showError: 'e' in route.query,
      }),
    },

  ],
})

export default router
