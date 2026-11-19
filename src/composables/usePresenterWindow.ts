import { onMounted, onUnmounted } from 'vue'

export const PRESENTER_WINDOW_FEATURES = 'popup,width=960,height=720'

export function presenterWindowName (roomId: string): string {
  return `poker0matic-presenter-${roomId}`
}

/**
 * Path of the presenter route. It never carries the `config` query param: the window is
 * screen-shared, and the child reads the Firebase config from localStorage (same origin).
 * It is built from the room id only (never from the current location), and `encodeURIComponent`
 * keeps a `?` in the id from starting a query string.
 */
export function presenterWindowUrl (roomId: string): string {
  return `${import.meta.env.BASE_URL}rooms/${encodeURIComponent(roomId)}/presenter`
}

/**
 * Opens the read-only presenter view of a room in a child window and closes it when this
 * page goes away (`pagehide`) or the calling component unmounts.
 */
export function usePresenterWindow (roomId: string) {
  let handle: Window | null = null

  /** Focuses the open child window or opens a new one. Returns `false` when the pop-up was blocked. */
  function open (): boolean {
    if (handle && !handle.closed) {
      handle.focus()
      return true
    }

    handle = window.open(presenterWindowUrl(roomId), presenterWindowName(roomId), PRESENTER_WINDOW_FEATURES)
    return handle !== null
  }

  function close () {
    if (handle && !handle.closed) {
      handle.close()
    }
    handle = null
  }

  onMounted(() => {
    window.addEventListener('pagehide', close)
  })

  onUnmounted(() => {
    window.removeEventListener('pagehide', close)
    close()
  })

  return { open, close }
}
