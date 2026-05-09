import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app'
import { type Database, getDatabase } from 'firebase/database'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_AVATAR_STYLE } from '@/utils/avatarStyles'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  databaseUrl: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const CONFIG_KEY = 'poker_config'
const USER_ID_KEY = 'poker_user_id'
const USER_NAME_KEY = 'poker_user_name'
const RECENT_ROOMS_KEY = 'poker_recent_rooms'
const AVATAR_STYLE_KEY = 'poker_avatar_style'
const VIEW_MODE_KEY = 'poker_view_mode'
const HISTORY_PANEL_KEY = 'poker_history_panel'
const MAX_RECENT_ROOMS = 5

export type ViewMode = 'table' | 'grid'
export type ConfigValidationStatus = 'unknown' | 'valid' | 'unreachable'

export interface RecentRoom {
  id: string
  name: string
  joinedAt: number
  /** Base64-encoded FirebaseConfig used when this room was joined. */
  configBase64?: string
}

let _db: Database | null = null

export const useConfigStore = defineStore('config', () => {
  const configFound = ref(false)
  const firebaseConfig = ref<FirebaseConfig | null>(null)
  const userId = ref<string | null>(null)
  const userName = ref('')
  const activeRoomId = ref<string | null>(null)
  const activeRoomName = ref<string | null>(null)
  const recentRooms = ref<RecentRoom[]>([])
  const avatarStyle = ref(localStorage.getItem(AVATAR_STYLE_KEY) ?? DEFAULT_AVATAR_STYLE)
  const viewMode = ref<ViewMode>((localStorage.getItem(VIEW_MODE_KEY) as ViewMode) ?? 'table')
  const historyPanelOpen = ref(localStorage.getItem(HISTORY_PANEL_KEY) === 'true')

  // Cached validation result — reset to 'unknown' when config changes so the
  // lobby re-checks; stays valid across page navigations for the same config.
  const configValidationStatus = ref<ConfigValidationStatus>('unknown')

  function setActiveRoom (id: string | null, name: string | null) {
    activeRoomId.value = id
    activeRoomName.value = name
  }

  function saveRecentRoom (id: string, name: string) {
    const configBase64 = localStorage.getItem(CONFIG_KEY) ?? undefined
    const filtered = recentRooms.value.filter(r => r.id !== id)
    recentRooms.value = [{ id, name, joinedAt: Date.now(), configBase64 }, ...filtered].slice(0, MAX_RECENT_ROOMS)
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(recentRooms.value))
  }

  function removeRecentRoom (id: string) {
    recentRooms.value = recentRooms.value.filter(r => r.id !== id)
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(recentRooms.value))
  }

  function updateRecentRoomName (id: string, name: string) {
    const room = recentRooms.value.find(r => r.id === id)
    if (room && room.name !== name) {
      room.name = name
      localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(recentRooms.value))
    }
  }

  function initializeConfig () {
    try {
      const raw = localStorage.getItem(RECENT_ROOMS_KEY)
      recentRooms.value = raw ? JSON.parse(raw) : []
    } catch {
      recentRooms.value = []
    }

    let potentialUserId = localStorage.getItem(USER_ID_KEY)
    if (!potentialUserId) {
      potentialUserId = crypto.randomUUID()
      localStorage.setItem(USER_ID_KEY, potentialUserId)
    }
    userId.value = potentialUserId
    userName.value = localStorage.getItem(USER_NAME_KEY) || ''

    const config = localStorage.getItem(CONFIG_KEY)
    if (!config) {
      configFound.value = false
      return
    }

    try {
      const rawConfig = atob(config)
      const parsedConfig = JSON.parse(rawConfig)
      configFound.value = !!parsedConfig
      firebaseConfig.value = parsedConfig || null
    } catch (error) {
      console.error('Error parsing config:', error)
      configFound.value = false
    }
  }

  function saveFirebaseConfig (config: FirebaseConfig) {
    try {
      const staleApps = [...getApps()]
      const configChanged = JSON.stringify(config) !== JSON.stringify(firebaseConfig.value)

      localStorage.setItem(CONFIG_KEY, btoa(JSON.stringify(config)))
      firebaseConfig.value = config
      configFound.value = true
      activeRoomId.value = null
      activeRoomName.value = null
      _db = null

      if (configChanged) {
        configValidationStatus.value = 'unknown'
      }

      for (const app of staleApps) {
        deleteApp(app).catch(() => {})
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  /**
   * Apply a config from a base64 string (e.g. from a URL query param).
   * Reuses saveFirebaseConfig so old apps are torn down and validation is reset.
   */
  function applyConfigFromBase64 (base64: string) {
    try {
      const parsed: FirebaseConfig = JSON.parse(atob(base64))
      if (parsed) saveFirebaseConfig(parsed)
    } catch {
      // malformed base64 — silently ignore
    }
  }

  function setConfigValidationStatus (status: ConfigValidationStatus) {
    configValidationStatus.value = status
  }

  function setUserName (name: string) {
    userName.value = name
    localStorage.setItem(USER_NAME_KEY, name)
  }

  function setAvatarStyle (style: string) {
    avatarStyle.value = style
    localStorage.setItem(AVATAR_STYLE_KEY, style)
  }

  function setViewMode (mode: ViewMode) {
    viewMode.value = mode
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  function setHistoryPanelOpen (open: boolean) {
    historyPanelOpen.value = open
    localStorage.setItem(HISTORY_PANEL_KEY, open ? 'true' : 'false')
  }

  function getDb (): Database | null {
    if (_db) return _db
    if (!firebaseConfig.value) return null
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig.value)
    _db = getDatabase(app)
    return _db
  }

  return {
    initializeConfig,
    saveFirebaseConfig,
    applyConfigFromBase64,
    saveRecentRoom,
    setUserName,
    setActiveRoom,
    getDb,
    configFound,
    configValidationStatus,
    setConfigValidationStatus,
    firebaseConfig,
    userId,
    userName,
    activeRoomId,
    activeRoomName,
    recentRooms,
    removeRecentRoom,
    updateRecentRoomName,
    avatarStyle,
    setAvatarStyle,
    viewMode,
    setViewMode,
    historyPanelOpen,
    setHistoryPanelOpen,
  }
})
