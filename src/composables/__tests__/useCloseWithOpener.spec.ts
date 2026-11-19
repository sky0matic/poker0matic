import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { OPENER_POLL_INTERVAL_MS, useCloseWithOpener } from '../useCloseWithOpener'

describe('composables/useCloseWithOpener', () => {
  let closeSpy: MockInstance<typeof window.close>
  let opener: { closed: boolean } | null

  function mountHost () {
    const Host = defineComponent({
      setup () {
        useCloseWithOpener()
        return () => h('div')
      },
    })
    return mount(Host)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    opener = { closed: false }
    Object.defineProperty(window, 'opener', { configurable: true, get: () => opener })
    closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Object.defineProperty(window, 'opener', { configurable: true, writable: true, value: null })
    vi.clearAllMocks()
  })

  it.each([
    ['closed', () => ({ closed: true })],
    ['gone', () => null],
  ])('closes the window when the opener is %s', (_label, nextOpener) => {
    // Arrange
    const wrapper = mountHost()

    // Act
    opener = nextOpener()
    vi.advanceTimersByTime(OPENER_POLL_INTERVAL_MS * 3)

    // Assert
    expect(closeSpy).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    wrapper.unmount()
  })

  it('keeps the window open while the opener is alive', () => {
    // Arrange
    const wrapper = mountHost()

    // Act
    vi.advanceTimersByTime(OPENER_POLL_INTERVAL_MS * 5)

    // Assert
    expect(closeSpy).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
  })

  it('does not poll when the window has no opener', () => {
    // Arrange
    opener = null

    // Act
    const wrapper = mountHost()
    vi.advanceTimersByTime(OPENER_POLL_INTERVAL_MS * 5)

    // Assert
    expect(vi.getTimerCount()).toBe(0)
    expect(closeSpy).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('stops polling on unmount', () => {
    // Arrange
    const wrapper = mountHost()

    // Act
    wrapper.unmount()
    opener = { closed: true }
    vi.advanceTimersByTime(OPENER_POLL_INTERVAL_MS * 5)

    // Assert
    expect(vi.getTimerCount()).toBe(0)
    expect(closeSpy).not.toHaveBeenCalled()
  })
})
