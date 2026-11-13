import { faker } from '@faker-js/faker'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { FORCE_RECONNECT_AFTER_HIDDEN_MS } from '@/utils/presence'
import { FORCED_RECONNECT_GRACE_MS, useConnectionState } from '../useConnectionState'

const mocks = vi.hoisted(() => ({
  watchConnection: vi.fn(),
  watchServerTimeOffset: vi.fn(),
  forceReconnect: vi.fn(),
  unsubscribeConnection: vi.fn(),
  unsubscribeOffset: vi.fn(),
}))
vi.mock('@/stores/room', () => ({ useRoomStore: () => mocks }))

type ConnectionState = ReturnType<typeof useConnectionState>

enableAutoUnmount(afterEach)

describe('composables/useConnectionState', () => {
  let connectionCallback: (connected: boolean) => void
  let offsetCallback: (offset: number) => void
  let onConnected: Mock<(isReconnect: boolean) => void>

  function setVisibility (state: DocumentVisibilityState) {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }

  function mountHost () {
    let state!: ConnectionState
    const Host = defineComponent({
      setup () {
        state = useConnectionState({ onConnected })
        return () => h('div')
      },
    })
    const wrapper = mount(Host)
    return { wrapper, state: () => state }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    onConnected = vi.fn()
    mocks.watchConnection.mockImplementation((cb: (connected: boolean) => void) => {
      connectionCallback = cb
      return mocks.unsubscribeConnection
    })
    mocks.watchServerTimeOffset.mockImplementation((cb: (offset: number) => void) => {
      offsetCallback = cb
      return mocks.unsubscribeOffset
    })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('calls onConnected with false on first connect and true on reconnect', () => {
    // Arrange
    mountHost()

    // Act
    connectionCallback(false)
    connectionCallback(true)
    connectionCallback(true)
    connectionCallback(false)
    connectionCallback(true)

    // Assert
    expect(onConnected.mock.calls).toEqual([[false], [true]])
  })

  it('shows the offline alert only after the first connection', () => {
    // Arrange
    const { state } = mountHost()

    // Act
    connectionCallback(false)
    const beforeFirstConnect = state().showOfflineAlert.value
    connectionCallback(true)
    const whileConnected = state().showOfflineAlert.value
    connectionCallback(false)

    // Assert
    expect(beforeFirstConnect).toBe(false)
    expect(whileConnected).toBe(false)
    expect(state().showOfflineAlert.value).toBe(true)
    expect(state().isConnected.value).toBe(false)
    expect(state().hasConnectedOnce.value).toBe(true)
  })

  it('sets showReconnected on a real reconnect but not on the first connect', () => {
    // Arrange
    const { state } = mountHost()

    // Act
    connectionCallback(true)
    const afterFirstConnect = state().showReconnected.value
    connectionCallback(false)
    connectionCallback(true)

    // Assert
    expect(afterFirstConnect).toBe(false)
    expect(state().showReconnected.value).toBe(true)
  })

  it.each([
    [FORCE_RECONNECT_AFTER_HIDDEN_MS - 1000, false],
    [FORCE_RECONNECT_AFTER_HIDDEN_MS, true],
  ])('forces a reconnect after being hidden %sms: %s', (hiddenMs, expected) => {
    // Arrange
    mountHost()
    connectionCallback(true)

    // Act
    setVisibility('hidden')
    vi.advanceTimersByTime(hiddenMs)
    setVisibility('visible')

    // Assert
    expect(mocks.forceReconnect).toHaveBeenCalledTimes(expected ? 1 : 0)
  })

  it('suppresses the offline alert and reconnect snackbar during a forced reconnect', () => {
    // Arrange
    const { state } = mountHost()
    connectionCallback(true)
    setVisibility('hidden')
    vi.advanceTimersByTime(FORCE_RECONNECT_AFTER_HIDDEN_MS)

    // Act
    setVisibility('visible')
    connectionCallback(false)
    const alertDuringCycle = state().showOfflineAlert.value
    connectionCallback(true)

    // Assert
    expect(alertDuringCycle).toBe(false)
    expect(state().showReconnected.value).toBe(false)
    expect(onConnected).toHaveBeenLastCalledWith(true)
  })

  it('shows the offline alert again when a forced reconnect does not come back in time', () => {
    // Arrange
    const { state } = mountHost()
    connectionCallback(true)
    setVisibility('hidden')
    vi.advanceTimersByTime(FORCE_RECONNECT_AFTER_HIDDEN_MS)
    setVisibility('visible')
    connectionCallback(false)

    // Act
    vi.advanceTimersByTime(FORCED_RECONNECT_GRACE_MS)

    // Assert
    expect(state().showOfflineAlert.value).toBe(true)
  })

  it('restarts the grace window when a second forced reconnect happens within it', () => {
    // Arrange
    const { state } = mountHost()
    connectionCallback(true)
    setVisibility('hidden')
    vi.advanceTimersByTime(FORCE_RECONNECT_AFTER_HIDDEN_MS)
    setVisibility('visible')
    vi.advanceTimersByTime(FORCED_RECONNECT_GRACE_MS / 2)
    setVisibility('hidden')
    // Hidden tabs throttle timers: move the wall clock only so the first grace timer stays pending.
    vi.setSystemTime(Date.now() + FORCE_RECONNECT_AFTER_HIDDEN_MS)

    // Act
    setVisibility('visible')
    connectionCallback(false)
    vi.advanceTimersByTime(FORCED_RECONNECT_GRACE_MS / 2)
    const alertWhenFirstGraceEnds = state().showOfflineAlert.value
    vi.advanceTimersByTime(FORCED_RECONNECT_GRACE_MS / 2)

    // Assert
    expect(mocks.forceReconnect).toHaveBeenCalledTimes(2)
    expect(alertWhenFirstGraceEnds).toBe(false)
    expect(state().showOfflineAlert.value).toBe(true)
  })

  it('computes serverNow from the server time offset', () => {
    // Arrange
    const { state } = mountHost()
    const offset = faker.number.int({ min: -5000, max: 5000 })

    // Act
    offsetCallback(offset)

    // Assert
    expect(state().serverNow()).toBe(Date.now() + offset)
  })

  it('unsubscribes listeners and removes the visibility listener on unmount', async () => {
    // Arrange
    const { wrapper } = mountHost()
    connectionCallback(true)

    // Act
    wrapper.unmount()
    await nextTick()
    setVisibility('hidden')
    vi.advanceTimersByTime(FORCE_RECONNECT_AFTER_HIDDEN_MS)
    setVisibility('visible')

    // Assert
    expect(mocks.unsubscribeConnection).toHaveBeenCalledOnce()
    expect(mocks.unsubscribeOffset).toHaveBeenCalledOnce()
    expect(mocks.forceReconnect).not.toHaveBeenCalled()
  })
})
