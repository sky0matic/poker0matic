import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const roomName = ref('')
  const playerCount = ref(0)
  const currentRoomId = ref<string | null>(null)
  const currentTheme = ref<'midnight' | 'slate' | 'forest' | 'amber'>('midnight')

  const THEMES = ['midnight', 'slate', 'forest', 'amber'] as const

  // -- toast --------------------------------------------------------------
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error'>('success')
  const toastVisible = ref(false)
  let _toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast (message: string, type: 'success' | 'error' = 'success', duration = 3500) {
    if (_toastTimer) {
      clearTimeout(_toastTimer)
    }
    toastMessage.value = message
    toastType.value = type
    toastVisible.value = true
    _toastTimer = setTimeout(() => {
      toastVisible.value = false
    }, duration)
  }

  // -- room ---------------------------------------------------------------
  function setRoomInfo (id: string | null, name: string, count: number) {
    currentRoomId.value = id
    roomName.value = name
    playerCount.value = count
  }

  // -- theme --------------------------------------------------------------
  function cycleTheme () {
    const idx = THEMES.indexOf(currentTheme.value)
    currentTheme.value = THEMES[(idx + 1) % THEMES.length]
    document.documentElement.dataset.theme = currentTheme.value
  }

  return { roomName, playerCount, currentRoomId, currentTheme, toastMessage, toastType, toastVisible, showToast, setRoomInfo, cycleTheme, THEMES }
})
