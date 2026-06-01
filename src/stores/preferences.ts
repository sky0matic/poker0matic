import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const REDUCED_MOTION_KEY = 'poker_reduced_motion'

function getSystemPrefers (): boolean {
  return typeof window === 'undefined'
    ? false
    : (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}

function readStoredOverride (): boolean | null {
  if (typeof window === 'undefined') {
    return null
  }
  const stored = localStorage.getItem(REDUCED_MOTION_KEY)
  if (stored === 'true') {
    return true
  }
  if (stored === 'false') {
    return false
  }
  return null
}

export const usePreferencesStore = defineStore('preferences', () => {
  const systemPrefers = ref(getSystemPrefers())
  // null = follow system, true = force reduce, false = force animations on
  const userOverride = ref<boolean | null>(readStoredOverride())

  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
      systemPrefers.value = e.matches
    })
  }

  const reducedMotion = computed(() => userOverride.value ?? systemPrefers.value)

  function toggleReducedMotion () {
    const next = !reducedMotion.value
    if (next === systemPrefers.value) {
      // back in sync with system — no need to keep an override
      userOverride.value = null
      localStorage.removeItem(REDUCED_MOTION_KEY)
    } else {
      userOverride.value = next
      localStorage.setItem(REDUCED_MOTION_KEY, String(next))
    }
  }

  return { systemPrefers, reducedMotion, toggleReducedMotion }
})
