import { afterEach, describe, expect, it, vi } from 'vitest'
import vuetify from '../vuetify'

describe('vuetify plugin', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exports a valid Vuetify instance with an install function', () => {
    expect(vuetify).toBeDefined()
    expect(typeof vuetify.install).toBe('function')
  })

  it('provides both light and dark theme variants', () => {
    expect(vuetify.theme.themes.value).toHaveProperty('light')
    expect(vuetify.theme.themes.value).toHaveProperty('dark')
  })

  it('resolves the initial theme to a known variant', () => {
    // jsdom has no matchMedia, so "system" resolves to "light" at runtime
    expect(['light', 'dark', 'system']).toContain(vuetify.theme.global.name.value)
  })
})
