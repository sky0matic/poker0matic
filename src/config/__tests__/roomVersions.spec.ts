import { faker } from '@faker-js/faker'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CARDS } from '../cardDecks'
import { CURRENT_ROOM_VERSION, migrateRoomSettings, ROOM_CHANGELOG, ROOM_MIGRATIONS } from '../roomVersions'

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

  describe('migrateRoomSettings', () => {
    it('defines a migration for every version from 2 to CURRENT_ROOM_VERSION', () => {
      // Assert
      for (let version = 2; version <= CURRENT_ROOM_VERSION; version++) {
        expect(ROOM_MIGRATIONS[version], `missing migration for v${version}`).toBeTypeOf('function')
      }
    })

    it.each([[undefined], [0], [1]])('fills the default deck and stamps the current version when migrating from v%s', v => {
      // Arrange
      const settings = { showVotes: faker.datatype.boolean(), v }

      // Act
      const result = migrateRoomSettings(settings)

      // Assert
      expect(result).toEqual({ showVotes: settings.showVotes, v: CURRENT_ROOM_VERSION, cards: [...DEFAULT_CARDS] })
      expect(result.cards).not.toBe(DEFAULT_CARDS)
    })

    it('keeps an existing custom deck and unknown fields when migrating', () => {
      // Arrange
      const cards = [faker.word.noun(), faker.number.int({ max: 100 })]
      const unknownField = faker.lorem.word()
      const settings = { v: 2, cards, targetDuration: 300, futureField: unknownField }

      // Act
      const result = migrateRoomSettings(settings)

      // Assert
      expect(result).toEqual({ v: CURRENT_ROOM_VERSION, cards, targetDuration: 300, futureField: unknownField })
      expect(settings.v).toBe(2)
    })

    it('returns the settings untouched when already at or above the current version', () => {
      // Arrange
      const current = { v: CURRENT_ROOM_VERSION, showVotes: false }
      const newer = { v: CURRENT_ROOM_VERSION + 1, futureField: faker.lorem.word() }

      // Act
      const fromCurrent = migrateRoomSettings(current)
      const fromNewer = migrateRoomSettings(newer)

      // Assert
      expect(fromCurrent).toBe(current)
      expect(fromNewer).toBe(newer)
      expect(fromNewer.v).toBe(CURRENT_ROOM_VERSION + 1)
    })

    it('produces the same result when applied twice', () => {
      // Arrange
      const settings = { showVotes: true, revealedAt: faker.date.recent().getTime() }

      // Act
      const once = migrateRoomSettings(settings)
      const twice = migrateRoomSettings(migrateRoomSettings(settings))

      // Assert
      expect(twice).toEqual(once)
    })
  })
})
