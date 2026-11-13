import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoomStore } from '@/stores/room'
import { FORCE_RECONNECT_AFTER_HIDDEN_MS } from '@/utils/presence'

/**
 * If a forced reconnect has not brought the connection back after this delay,
 * the offline alert is shown again (the network is most likely really down).
 */
export const FORCED_RECONNECT_GRACE_MS = 10_000

export interface UseConnectionStateOptions {
  /** Called on every false→true transition of `.info/connected`; `isReconnect` is false on the first connect. */
  onConnected: (isReconnect: boolean) => void
}

export function useConnectionState (options: UseConnectionStateOptions) {
  const roomStore = useRoomStore()

  const isConnected = ref(false)
  const hasConnectedOnce = ref(false)
  const forcingReconnect = ref(false)
  const showReconnected = ref(false)
  const serverTimeOffset = ref(0)

  const showOfflineAlert = computed(() =>
    hasConnectedOnce.value && !isConnected.value && !forcingReconnect.value,
  )

  let hiddenAt: number | null = null
  let forcingTimeout: ReturnType<typeof setTimeout> | null = null
  let unsubscribeConnection: (() => void) | null = null
  let unsubscribeOffset: (() => void) | null = null

  function clearForcing () {
    forcingReconnect.value = false
    if (forcingTimeout !== null) {
      clearTimeout(forcingTimeout)
      forcingTimeout = null
    }
  }

  function handleConnection (connected: boolean) {
    if (!connected) {
      isConnected.value = false
      showReconnected.value = false
      return
    }
    if (isConnected.value) {
      return
    }

    const isReconnect = hasConnectedOnce.value
    const wasForced = forcingReconnect.value
    isConnected.value = true
    hasConnectedOnce.value = true
    clearForcing()
    if (isReconnect && !wasForced) {
      showReconnected.value = true
    }
    options.onConnected(isReconnect)
  }

  function handleVisibilityChange () {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }

    const hiddenSince = hiddenAt
    hiddenAt = null
    if (hiddenSince === null || Date.now() - hiddenSince < FORCE_RECONNECT_AFTER_HIDDEN_MS) {
      return
    }

    // Only hide the connection UI when the cycle is ours; a connection that was already down stays visible.
    if (isConnected.value) {
      // A previous forced cycle may still be in its grace window: restart it instead of leaking its timer.
      clearForcing()
      forcingReconnect.value = true
      forcingTimeout = setTimeout(clearForcing, FORCED_RECONNECT_GRACE_MS)
    }
    roomStore.forceReconnect()
  }

  function serverNow (): number {
    return Date.now() + serverTimeOffset.value
  }

  onMounted(() => {
    unsubscribeOffset = roomStore.watchServerTimeOffset(offset => {
      serverTimeOffset.value = offset
    })
    unsubscribeConnection = roomStore.watchConnection(handleConnection)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    unsubscribeConnection?.()
    unsubscribeOffset?.()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    clearForcing()
  })

  return { isConnected, hasConnectedOnce, showOfflineAlert, showReconnected, serverNow }
}
