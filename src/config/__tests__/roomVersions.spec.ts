import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_ROOM_VERSION, ROOM_CHANGELOG } from '../roomVersions'

describe('roomVersions', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exports CURRENT_ROOM_VERSION as a positive integer', () => {
    expect(Number.isInteger(CURRENT_ROOM_VERSION)).toBe(true)
    expect(CURRENT_ROOM_VERSION).toBeGreaterThan(0)
  })

  it('exports ROOM_CHANGELOG as a plain object (not an array)', () => {
    expect(typeof ROOM_CHANGELOG).toBe('object')
    expect(Array.isArray(ROOM_CHANGELOG)).toBe(false)
  })

  it('contains only versions at or below CURRENT_ROOM_VERSION with non-empty string entries', () => {
    for (const [version, entries] of Object.entries(ROOM_CHANGELOG)) {
      expect(Number(version)).toBeLessThanOrEqual(CURRENT_ROOM_VERSION)
      expect(entries.length).toBeGreaterThan(0)
      for (const e of entries) {
        expect(typeof e).toBe('string')
      }
    }
  })
})
