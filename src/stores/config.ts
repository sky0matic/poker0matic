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

export const useConfigStore = defineStore('config', () => {
  const configFound = ref(false)
  const firebaseConfig = ref<FirebaseConfig | null>(null)
  const userId = ref<string | null>(null)
  const userName = ref('')

  function initializeConfig () {
    const urlParams = new URLSearchParams(window.location.search)
    const configFromUrl = urlParams.get('config')

    if (configFromUrl) {
      localStorage.setItem(CONFIG_KEY, configFromUrl)
      history.replaceState({}, '', location.pathname + location.search.replace(/([?&])config=[^&]+(&|$)/, '$1').replace(/&$/, ''))
    }

    const config = localStorage.getItem(CONFIG_KEY)
    if (!config) {
      configFound.value = false
      return
    }

    let potentialUserId = localStorage.getItem(USER_ID_KEY)
    if (!potentialUserId) {
      potentialUserId = crypto.randomUUID()
      localStorage.setItem(USER_ID_KEY, potentialUserId)
    }

    userId.value = potentialUserId
    const storedUserName = localStorage.getItem(USER_NAME_KEY)
    userName.value = storedUserName || ''

    try {
      const rawConfig = atob(config)
      const parsedConfig = JSON.parse(rawConfig)
      configFound.value = parsedConfig ? true : false
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
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  function setUserName (name: string) {
    userName.value = name
    localStorage.setItem(USER_NAME_KEY, name)
  }

  return {
    initializeConfig,
    saveFirebaseConfig,
    setUserName,
    configFound,
    firebaseConfig,
    userId,
    userName,
  }
})
