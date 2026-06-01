import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreferencesStore } from '../preferences'

type ChangeListener = (e: { matches: boolean }) => void

function setupMatchMedia (matches: boolean): { fireChange: (val: boolean) => void } {
  let listener: ChangeListener | null = null
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn((_: string, cb: ChangeListener) => {
        listener = cb
      }),
    }),
  })
  return { fireChange: (val: boolean) => listener?.({ matches: val }) }
}

describe('usePreferencesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setupMatchMedia(false)
    setActivePinia(createPinia())
  })

  afterEach(() => vi.clearAllMocks())

  // ─── reducedMotion computed ────────────────────────────────────────────────

  describe('reducedMotion', () => {
    it.each([
      { systemMatches: false, stored: null, expected: false },
      { systemMatches: true, stored: null, expected: true },
      { systemMatches: false, stored: 'true', expected: true },
      { systemMatches: true, stored: 'false', expected: false },
    ])('returns $expected when systemPrefers is $systemMatches and stored override is $stored', ({ systemMatches, stored, expected }) => {
      // Arrange
      setupMatchMedia(systemMatches)
      if (stored !== null) {
        localStorage.setItem('poker_reduced_motion', stored)
      }

      // Act
      const store = usePreferencesStore()

      // Assert
      expect(store.reducedMotion).toBe(expected)
    })

    it('updates systemPrefers and reducedMotion when the OS media query fires a change event', () => {
      // Arrange
      const { fireChange } = setupMatchMedia(false)
      const store = usePreferencesStore()

      // Act
      fireChange(true)

      // Assert
      expect(store.systemPrefers).toBe(true)
      expect(store.reducedMotion).toBe(true)
    })
  })

  // ─── toggleReducedMotion ──────────────────────────────────────────────────

  describe('toggleReducedMotion', () => {
    it('sets reducedMotion to true and stores the override when animations are currently on', () => {
      // Arrange
      const store = usePreferencesStore()

      // Act
      store.toggleReducedMotion()

      // Assert
      expect(store.reducedMotion).toBe(true)
      expect(localStorage.getItem('poker_reduced_motion')).toBe('true')
    })

    it('clears the override and sets reducedMotion to false when user had forced reduce and system does not prefer it', () => {
      // Arrange
      localStorage.setItem('poker_reduced_motion', 'true')
      const store = usePreferencesStore()

      // Act
      store.toggleReducedMotion()

      // Assert
      expect(store.reducedMotion).toBe(false)
      expect(localStorage.getItem('poker_reduced_motion')).toBeNull()
    })

    it('stores a false override and enables animations when system prefers reduce', () => {
      // Arrange
      setupMatchMedia(true)
      const store = usePreferencesStore()

      // Act
      store.toggleReducedMotion()

      // Assert
      expect(store.reducedMotion).toBe(false)
      expect(localStorage.getItem('poker_reduced_motion')).toBe('false')
    })

    it('clears the false override and restores system reduce when user re-enables reduce', () => {
      // Arrange
      setupMatchMedia(true)
      localStorage.setItem('poker_reduced_motion', 'false')
      const store = usePreferencesStore()

      // Act
      store.toggleReducedMotion()

      // Assert
      expect(store.reducedMotion).toBe(true)
      expect(localStorage.getItem('poker_reduced_motion')).toBeNull()
    })
  })
})
