import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { PRESENTER_WINDOW_FEATURES, presenterWindowName, usePresenterWindow } from '../usePresenterWindow'

type PresenterWindow = ReturnType<typeof usePresenterWindow>

interface FakeWindow {
  closed: boolean
  close: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
}

describe('composables/usePresenterWindow', () => {
  let roomId: string
  let openSpy: MockInstance<typeof window.open>
  let opened: FakeWindow[]
  let originalUrl: string

  function makeFakeWindow (): FakeWindow {
    const fake: FakeWindow = {
      closed: false,
      close: vi.fn(() => {
        fake.closed = true
      }),
      focus: vi.fn(),
    }
    return fake
  }

  function mountHost () {
    let state!: PresenterWindow
    const Host = defineComponent({
      setup () {
        state = usePresenterWindow(roomId)
        return () => h('div')
      },
    })
    const wrapper = mount(Host)
    return { wrapper, state }
  }

  beforeEach(() => {
    roomId = faker.string.alphanumeric(10)
    opened = []
    originalUrl = window.location.href
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => {
      const fake = makeFakeWindow()
      opened.push(fake)
      return fake as unknown as Window
    })
  })

  afterEach(() => {
    window.history.replaceState(null, '', originalUrl)
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('opens the presenter route in a named popup window', () => {
    // Arrange
    const { state, wrapper } = mountHost()

    // Act
    const result = state.open()

    // Assert
    expect(result).toBe(true)
    expect(openSpy).toHaveBeenCalledOnce()
    const [url, name, features] = openSpy.mock.calls[0]
    expect(String(url)).toMatch(new RegExp(`rooms/${roomId}/presenter$`))
    expect(name).toBe(presenterWindowName(roomId))
    expect(name).toBe(`poker0matic-presenter-${roomId}`)
    expect(features).toBe(PRESENTER_WINDOW_FEATURES)
    expect(features).not.toContain('noopener')
    wrapper.unmount()
  })

  it('never carries the config query param in the presenter URL even when the room URL has one', () => {
    // Arrange
    window.history.replaceState(null, '', `/rooms/${roomId}?config=${faker.string.alphanumeric(40)}`)
    const { state, wrapper } = mountHost()

    // Act
    state.open()

    // Assert
    const url = String(openSpy.mock.calls[0][0])
    expect(url).not.toContain('config')
    expect(url).not.toContain('?')
    wrapper.unmount()
  })

  it('focuses the existing window instead of opening a new one while it is open', () => {
    // Arrange
    const { state, wrapper } = mountHost()
    state.open()

    // Act
    const result = state.open()

    // Assert
    expect(result).toBe(true)
    expect(openSpy).toHaveBeenCalledOnce()
    expect(opened[0].focus).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('opens a new window when the previous one was closed', () => {
    // Arrange
    const { state, wrapper } = mountHost()
    state.open()
    opened[0].closed = true

    // Act
    state.open()

    // Assert
    expect(openSpy).toHaveBeenCalledTimes(2)
    expect(opened[0].focus).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('returns false when the popup is blocked', () => {
    // Arrange
    openSpy.mockReturnValue(null)
    const { state, wrapper } = mountHost()

    // Act
    const result = state.open()

    // Assert
    expect(result).toBe(false)
    wrapper.unmount()
  })

  it('closes the child window when the opener fires pagehide', () => {
    // Arrange
    const { state, wrapper } = mountHost()
    state.open()

    // Act
    window.dispatchEvent(new Event('pagehide'))

    // Assert
    expect(opened[0].close).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('closes the child window and removes the pagehide listener on unmount', () => {
    // Arrange
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { state, wrapper } = mountHost()
    state.open()

    // Act
    wrapper.unmount()
    window.dispatchEvent(new Event('pagehide'))

    // Assert
    expect(opened[0].close).toHaveBeenCalledOnce()
    expect(removeSpy).toHaveBeenCalledWith('pagehide', expect.any(Function))
  })
})
