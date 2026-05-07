import { getApp, getApps, initializeApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
import { defineStore } from 'pinia'
import { ref } from 'vue'

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

let _db: Database | null = null

export const useConfigStore = defineStore('config', () => {
  const configFound = ref(false)
  const firebaseConfig = ref<FirebaseConfig | null>(null)
  const userId = ref<string | null>(null)
  const userName = ref('')
  const activeRoomId = ref<string | null>(null)
  const activeRoomName = ref<string | null>(null)

  function setActiveRoom (id: string | null, name: string | null) {
    activeRoomId.value = id
    activeRoomName.value = name
  }

  function initializeConfig () {
    let potentialUserId = localStorage.getItem(USER_ID_KEY)
    if (!potentialUserId) {
      potentialUserId = crypto.randomUUID()
      localStorage.setItem(USER_ID_KEY, potentialUserId)
    }
    userId.value = potentialUserId
    userName.value = localStorage.getItem(USER_NAME_KEY) || ''

    const urlParams = new URLSearchParams(window.location.search)
    const configFromUrl = urlParams.get('config')

    if (configFromUrl) {
      localStorage.setItem(CONFIG_KEY, configFromUrl)
    }

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
      localStorage.setItem(CONFIG_KEY, btoa(JSON.stringify(config)))
      firebaseConfig.value = config
      configFound.value = true
      activeRoomId.value = null
      activeRoomName.value = null
      _db = null
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  function setUserName (name: string) {
    userName.value = name
    localStorage.setItem(USER_NAME_KEY, name)
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
    setUserName,
    setActiveRoom,
    getDb,
    configFound,
    firebaseConfig,
    userId,
    userName,
    activeRoomId,
    activeRoomName,
  }
})
