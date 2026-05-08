import { defineStore } from 'pinia'
import { ref } from 'vue'

const THEME_KEY = 'poker_theme'
const THEMES = ['midnight', 'slate', 'forest', 'amber', 'rose', 'violet', 'ocean', 'neon', 'candy'] as const
type Theme = typeof THEMES[number]

export const useAppStore = defineStore('app', () => {
  const roomName = ref('')
  const playerCount = ref(0)
  const currentRoomId = ref<string | null>(null)

  // Load persisted theme, fall back to midnight
  const saved = localStorage.getItem(THEME_KEY) as Theme | null
  const initial: Theme = saved && (THEMES as readonly string[]).includes(saved) ? saved : 'midnight'
  const currentTheme = ref<Theme>(initial)
  if (initial !== 'midnight') document.documentElement.dataset.theme = initial

  // -- toast --------------------------------------------------------------
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error'>('success')
  const toastVisible = ref(false)
  let _toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast (message: string, type: 'success' | 'error' = 'success', duration = 3500) {
    if (_toastTimer) clearTimeout(_toastTimer)
    toastMessage.value = message
    toastType.value = type
    toastVisible.value = true
    _toastTimer = setTimeout(() => { toastVisible.value = false }, duration)
  }

  // -- room ---------------------------------------------------------------
  function setRoomInfo (id: string | null, name: string, count: number) {
    currentRoomId.value = id
    roomName.value = name
    playerCount.value = count
  }

  // -- theme --------------------------------------------------------------
  function setTheme (theme: Theme) {
    currentTheme.value = theme
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }

  /** @deprecated use setTheme directly */
  function cycleTheme () {
    const idx = THEMES.indexOf(currentTheme.value)
    setTheme(THEMES[(idx + 1) % THEMES.length])
  }

  return {
    roomName, playerCount, currentRoomId,
    currentTheme, THEMES,
    toastMessage, toastType, toastVisible,
    showToast, setRoomInfo, setTheme, cycleTheme,
  }
})
