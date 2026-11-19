import { onMounted, onUnmounted } from 'vue'

export const OPENER_POLL_INTERVAL_MS = 1000

/**
 * Closes this window once the window that opened it is closed or gone.
 * Does nothing when the page was not opened by another window.
 */
export function useCloseWithOpener () {
  let pollInterval: ReturnType<typeof setInterval> | null = null

  function stopPolling () {
    if (pollInterval !== null) {
      clearInterval(pollInterval)
    }
    pollInterval = null
  }

  onMounted(() => {
    if (!window.opener) {
      return
    }

    pollInterval = setInterval(() => {
      const opener = window.opener as Window | null
      if (!opener || opener.closed) {
        stopPolling()
        window.close()
      }
    }, OPENER_POLL_INTERVAL_MS)
  })

  onUnmounted(stopPolling)
}
