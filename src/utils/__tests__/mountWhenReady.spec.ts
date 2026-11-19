import type { App } from 'vue'
import type { Router } from 'vue-router'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountWhenReady } from '../mountWhenReady'

describe('mountWhenReady', () => {
  let app: { mount: ReturnType<typeof vi.fn> }
  let resolveReady: () => void
  let rejectReady: (error: Error) => void
  let router: { isReady: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    app = { mount: vi.fn() }
    router = {
      isReady: vi.fn().mockReturnValue(new Promise<void>((resolve, reject) => {
        resolveReady = resolve
        rejectReady = reject
      })),
    }
  })

  afterEach(() => vi.clearAllMocks())

  it('mounts the app only after the initial navigation resolves', async () => {
    // Arrange
    const mounting = mountWhenReady(app as unknown as App, router as unknown as Router, '#app')
    await flushPromises()
    const mountCallsBeforeReady = app.mount.mock.calls.length

    // Act
    resolveReady()
    await mounting

    // Assert
    expect(mountCallsBeforeReady).toBe(0)
    expect(app.mount).toHaveBeenCalledExactlyOnceWith('#app')
  })

  it('logs the error and still mounts the app when the initial navigation fails', async () => {
    // Arrange
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('navigation failed')
    const mounting = mountWhenReady(app as unknown as App, router as unknown as Router, '#app')

    // Act
    rejectReady(error)
    await mounting

    // Assert
    expect(consoleError).toHaveBeenCalledWith(error)
    expect(app.mount).toHaveBeenCalledExactlyOnceWith('#app')
    consoleError.mockRestore()
  })
})
