import type { RoomSettings } from '@/config/roomVersions'
import { computed, onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

export type TimerStatus = 'normal' | 'target' | 'ceiling'

export interface TimedRoom {
  createdAt: number
  resetAt?: number
  settings?: RoomSettings
}

export function formatElapsed (seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Elapsed time since the last reset (or the room creation), its threshold status and the
 * elapsed time at which votes were revealed. Ticks every second while the component is mounted.
 */
export function useRoomTimer (room: Ref<TimedRoom | null>) {
  const elapsedSeconds = ref(0)
  const timerOrigin = ref(Date.now())
  const revealedAt = ref<number | null>(null)
  let timerInterval: ReturnType<typeof setInterval> | null = null

  const showVotes = computed(() => room.value?.settings?.showVotes === true)

  const timerStatus = computed<TimerStatus>(() => {
    const ceiling = room.value?.settings?.ceilingDuration
    const target = room.value?.settings?.targetDuration
    if (ceiling != null && elapsedSeconds.value >= ceiling) {
      return 'ceiling'
    }
    if (target != null && elapsedSeconds.value >= target) {
      return 'target'
    }
    return 'normal'
  })

  watch(
    () => room.value?.resetAt ?? room.value?.createdAt,
    origin => {
      if (origin != null) {
        timerOrigin.value = origin
      }
    },
    { immediate: true },
  )

  watch(
    () => room.value?.settings?.revealedAt,
    ts => {
      revealedAt.value = ts == null ? null : Math.floor((ts - timerOrigin.value) / 1000)
    },
    { immediate: true },
  )

  watch(showVotes, revealed => {
    if (!revealed) {
      revealedAt.value = null
    } else if (revealedAt.value == null) {
      revealedAt.value = elapsedSeconds.value
    }
  })

  function restart () {
    elapsedSeconds.value = 0
  }

  onMounted(() => {
    timerInterval = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - timerOrigin.value) / 1000)
    }, 1000)
  })

  onUnmounted(() => {
    if (timerInterval !== null) {
      clearInterval(timerInterval)
    }
    timerInterval = null
  })

  return { elapsedSeconds, timerStatus, revealedAt, restart }
}
