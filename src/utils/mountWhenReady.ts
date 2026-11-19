import type { App } from 'vue'
import type { Router } from 'vue-router'

/**
 * Mounts the app only once the initial navigation has resolved (guards run, lazy page loaded).
 * Until then the route has no meta, so route-dependent layout (the presenter window hides the
 * toolbar) would flash. A failed initial navigation is logged and the app is still mounted.
 */
export function mountWhenReady (app: App, router: Router, selector: string): Promise<void> {
  return router.isReady()
    .catch(console.error)
    .finally(() => {
      app.mount(selector)
    })
}
