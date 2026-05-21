import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import router from '../index'

const mockInitializeConfig = vi.hoisted(() => vi.fn())
const mockConfigStore = vi.hoisted(() => ({
  initializeConfig: mockInitializeConfig,
  configFound: true,
  getDb: vi.fn().mockReturnValue(null),
  userId: 'u1',
  userName: '',
}))
vi.mock('@/stores/config', () => ({
  useConfigStore: () => mockConfigStore,
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn().mockReturnValue({}),
  ref: vi.fn().mockReturnValue({}),
  onValue: vi.fn().mockReturnValue(vi.fn()),
  set: vi.fn(),
  update: vi.fn(),
  onDisconnect: vi.fn().mockReturnValue({ remove: vi.fn() }),
}))

describe('router guards', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    mockConfigStore.configFound = true
    mockInitializeConfig.mockReset()
    // Start from /config so beforeEnter always fires when we push to /
    await router.push('/config')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /config?e and calls initializeConfig when configFound is false', async () => {
    // Arrange
    mockConfigStore.configFound = false

    // Act
    await router.push('/')

    // Assert
    expect(router.currentRoute.value.fullPath).toBe('/config?e')
    expect(mockInitializeConfig).toHaveBeenCalled()
  })

  it('allows navigation to / and calls initializeConfig when configFound is true', async () => {
    // Arrange
    mockConfigStore.configFound = true

    // Act
    await router.push('/')

    // Assert
    expect(router.currentRoute.value.path).toBe('/')
    expect(mockInitializeConfig).toHaveBeenCalled()
  })

  it('redirects a ?roomId query param to the room route', async () => {
    // Arrange
    mockConfigStore.configFound = true

    // Act
    await router.push('/?roomId=abc123')

    // Assert
    expect(router.currentRoute.value.path).toBe('/rooms/abc123')
  })

  it('allows navigation to /config without any guard', async () => {
    await router.push('/config')
    expect(router.currentRoute.value.path).toBe('/config')
  })

  it('exposes the ?e query param on the /config route when present', async () => {
    await router.push('/config?e')
    expect(router.currentRoute.value.query).toHaveProperty('e')
  })
})
