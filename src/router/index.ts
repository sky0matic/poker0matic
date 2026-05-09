import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import Config from '@/pages/config.vue'
import Index from '@/pages/index.vue'
import { useConfigStore } from '@/stores/config'

function requireConfig (to: RouteLocationNormalized) {
  const configStore = useConfigStore()
  configStore.initializeConfig()

  // Apply config from URL query param (client-side navigation or shared link).
  // Must happen before the configFound check so a shared link works even when
  // no config is stored yet.
  if ('config' in to.query) {
    configStore.applyConfigFromBase64(String(to.query.config))
    const { config: _, ...query } = to.query
    return { path: to.path, params: to.params, query, replace: true }
  }

  if (!configStore.configFound) {
    return '/config?e'
  }

  return true
}

function requireConfigIndex (to: RouteLocationNormalized) {
  const configStore = useConfigStore()
  configStore.initializeConfig()

  // Apply config and/or redirect to room in one pass.
  if ('config' in to.query || 'roomId' in to.query) {
    if ('config' in to.query) {
      configStore.applyConfigFromBase64(String(to.query.config))
    }
    const roomId = to.query.roomId
    if (typeof roomId === 'string' && roomId.trim().length > 0) {
      return `/rooms/${roomId.trim()}`
    }
    const { config: _, roomId: __, ...query } = to.query
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
    {
      path: '/attributions',
      component: () => import('@/pages/attributions.vue'),
    },
  ],
})

export default router
