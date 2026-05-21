import { faker } from '@faker-js/faker'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfigStore } from '../config'

const mockInitializeApp = vi.hoisted(() => vi.fn().mockReturnValue({}))
const mockGetApps = vi.hoisted(() => vi.fn().mockReturnValue([]))
const mockGetApp = vi.hoisted(() => vi.fn().mockReturnValue({}))
vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
  getApp: mockGetApp,
}))

const mockGetDatabase = vi.hoisted(() => vi.fn().mockReturnValue({ _tag: 'db' }))
vi.mock('firebase/database', () => ({
  getDatabase: mockGetDatabase,
}))

function fakeConfig () {
  return {
    apiKey: faker.string.alphanumeric(20),
    authDomain: faker.internet.domainName(),
    databaseUrl: faker.internet.url(),
    projectId: faker.string.alphanumeric(10),
    storageBucket: faker.internet.domainName(),
    messagingSenderId: faker.string.numeric(12),
    appId: faker.string.alphanumeric(30),
  }
}

describe('useConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mockGetApps.mockReturnValue([])
    mockInitializeApp.mockReturnValue({})
    mockGetDatabase.mockReturnValue({ _tag: 'db' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initializeConfig', () => {
    it('sets configFound to false when no config is stored', () => {
      const store = useConfigStore()
      store.initializeConfig()
      expect(store.configFound).toBe(false)
    })

    it('generates a userId and persists it to localStorage', () => {
      // Act
      const store = useConfigStore()
      store.initializeConfig()

      // Assert
      expect(store.userId).toBeTruthy()
      expect(localStorage.getItem('poker_user_id')).toBe(store.userId)
    })

    it('reuses an existing userId from localStorage', () => {
      // Arrange
      const existingId = faker.string.uuid()
      localStorage.setItem('poker_user_id', existingId)

      // Act
      const store = useConfigStore()
      store.initializeConfig()

      // Assert
      expect(store.userId).toBe(existingId)
    })

    it('reads userName from localStorage', () => {
      // Arrange
      const name = faker.person.firstName()
      localStorage.setItem('poker_user_name', name)

      // Act
      const store = useConfigStore()
      store.initializeConfig()

      // Assert
      expect(store.userName).toBe(name)
    })

    it('parses a valid base64 config from localStorage and marks it as found', () => {
      // Arrange
      const config = fakeConfig()
      localStorage.setItem('poker_config', btoa(JSON.stringify(config)))

      // Act
      const store = useConfigStore()
      store.initializeConfig()

      // Assert
      expect(store.configFound).toBe(true)
      expect(store.firebaseConfig).toEqual(config)
    })

    it('sets configFound to false when the stored config is invalid base64', () => {
      // Arrange
      vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorage.setItem('poker_config', '!!!not-base64!!!')

      // Act
      const store = useConfigStore()
      store.initializeConfig()

      // Assert
      expect(store.configFound).toBe(false)
    })

    it('loads config from the ?config URL param and persists it to localStorage', () => {
      // Arrange
      const encoded = btoa(JSON.stringify(fakeConfig()))
      Object.defineProperty(window, 'location', { value: { search: `?config=${encoded}` }, writable: true, configurable: true })

      // Act
      const store = useConfigStore()
      store.initializeConfig()

      // Assert
      expect(localStorage.getItem('poker_config')).toBe(encoded)
      Object.defineProperty(window, 'location', { value: { search: '' }, writable: true, configurable: true })
    })
  })

  describe('saveFirebaseConfig', () => {
    it('persists config as base64 JSON, sets configFound to true and updates firebaseConfig', () => {
      // Arrange
      const store = useConfigStore()
      const config = fakeConfig()

      // Act
      store.saveFirebaseConfig(config)

      // Assert
      expect(JSON.parse(atob(localStorage.getItem('poker_config')!))).toEqual(config)
      expect(store.configFound).toBe(true)
      expect(store.firebaseConfig).toEqual(config)
    })

    it('clears activeRoomId and activeRoomName', () => {
      // Arrange
      const store = useConfigStore()
      store.setActiveRoom('room-1', 'Sprint Planning')

      // Act
      store.saveFirebaseConfig(fakeConfig())

      // Assert
      expect(store.activeRoomId).toBeNull()
      expect(store.activeRoomName).toBeNull()
    })
  })

  describe('setUserName', () => {
    it('updates userName in the store and persists it to localStorage', () => {
      // Arrange
      const store = useConfigStore()
      const name = faker.person.firstName()

      // Act
      store.setUserName(name)

      // Assert
      expect(store.userName).toBe(name)
      expect(localStorage.getItem('poker_user_name')).toBe(name)
    })
  })

  describe('setActiveRoom', () => {
    it('updates activeRoomId and activeRoomName', () => {
      const store = useConfigStore()
      store.setActiveRoom('abc123', 'My Room')
      expect(store.activeRoomId).toBe('abc123')
      expect(store.activeRoomName).toBe('My Room')
    })

    it('clears active room when called with null values', () => {
      // Arrange
      const store = useConfigStore()
      store.setActiveRoom('abc', 'Room')

      // Act
      store.setActiveRoom(null, null)

      // Assert
      expect(store.activeRoomId).toBeNull()
      expect(store.activeRoomName).toBeNull()
    })
  })

  describe('getDb', () => {
    it('returns null when firebaseConfig is null', () => {
      const store = useConfigStore()
      store.saveFirebaseConfig(fakeConfig()) // resets module-level _db cache
      store.firebaseConfig = null
      expect(store.getDb()).toBeNull()
    })

    it('initializes a new firebase app and returns a db when no app exists yet', () => {
      // Arrange
      mockGetApps.mockReturnValue([])
      const store = useConfigStore()
      store.saveFirebaseConfig(fakeConfig())

      // Act
      store.getDb()

      // Assert
      expect(mockInitializeApp).toHaveBeenCalledOnce()
      expect(mockGetDatabase).toHaveBeenCalled()
    })

    it('reuses an existing firebase app when one is already initialised', () => {
      // Arrange
      mockGetApps.mockReturnValue([{}])
      mockGetApp.mockReturnValue({})
      const store = useConfigStore()
      store.saveFirebaseConfig(fakeConfig())

      // Act
      store.getDb()

      // Assert
      expect(mockGetApp).toHaveBeenCalled()
      expect(mockInitializeApp).not.toHaveBeenCalled()
    })

    it('returns a cached db without reinitialising firebase on repeated calls', () => {
      const store = useConfigStore()
      store.saveFirebaseConfig(fakeConfig())
      store.getDb()
      store.getDb()
      expect(mockGetDatabase).toHaveBeenCalledOnce()
    })
  })
})
