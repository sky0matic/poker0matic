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

  if (!('config' in to.query) && configStore.firebaseConfig) {
    const encoded = btoa(JSON.stringify(configStore.firebaseConfig))
    return { path: to.path, params: to.params, query: { ...to.query, config: encoded }, replace: true }
  }

  return true
}

/**
 * Guard for the screen-shared presenter window. Unlike `requireConfig`, it never puts the
 * encoded Firebase config in the URL (the child window reads it from localStorage, same origin)
 * and strips a `config` query param that would otherwise be visible to the audience.
 */
function requirePresenterConfig (to: RouteLocationNormalized) {
  const configStore = useConfigStore()
  configStore.initializeConfig()

  if (!configStore.configFound) {
    return '/config?e'
  }

  if ('config' in to.query) {
    const query = { ...to.query }
    delete query.config
    return { path: to.path, params: to.params, query, hash: to.hash, replace: true }
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
      path: '/rooms/:roomId/presenter',
      component: () => import('@/pages/presenter.vue'),
      beforeEnter: requirePresenterConfig,
      meta: { presenter: true },
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
