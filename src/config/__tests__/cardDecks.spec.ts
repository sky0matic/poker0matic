import { faker } from '@faker-js/faker'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CARDS, findPresetIndex, normalizeCards, PRESET_DEFINITIONS, type RawCards, sameCards } from '../cardDecks'

describe('cardDecks', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeCards', () => {
    it.each<[RawCards, Array<number | string>]>([
      [undefined, [...DEFAULT_CARDS]],
      [[], [...DEFAULT_CARDS]],
      [{}, [...DEFAULT_CARDS]],
      [{ 0: 1, 1: '?' }, [1, '?']],
      [[3, 5], [3, 5]],
    ])('normalizes raw cards %j to %j', (raw, expected) => {
      // Act
      const result = normalizeCards(raw)

      // Assert
      expect(result).toEqual(expected)
    })

    it('returns a copy that does not share the default deck or the input array', () => {
      // Arrange
      const raw = [faker.number.int(), faker.word.noun()]

      // Act
      const fromDefault = normalizeCards(undefined)
      const fromArray = normalizeCards(raw)

      // Assert
      expect(fromDefault).not.toBe(DEFAULT_CARDS)
      expect(fromArray).not.toBe(raw)
      expect(fromArray).toEqual(raw)
    })
  })

  describe('sameCards', () => {
    it.each([
      [[1, 2, '?'], [1, 2, '?'], true],
      [[1, 2], [2, 1], false],
      [[1, 2], [1, 2, 3], false],
      [[1], ['1'], false],
    ])('compares %j and %j as %s', (a, b, expected) => {
      // Act + Assert
      expect(sameCards(a, b)).toBe(expected)
    })
  })

  describe('findPresetIndex', () => {
    it.each(PRESET_DEFINITIONS.map((preset, index) => [preset.key, [...preset.cards], index] as const))(
      'finds the %s preset at index %#',
      (_key, cards, index) => {
        // Act + Assert
        expect(findPresetIndex(cards)).toBe(index)
      },
    )

    it('returns null for a deck that matches no preset', () => {
      // Arrange
      const cards = faker.helpers.multiple(() => faker.word.noun(), { count: 3 })

      // Act + Assert
      expect(findPresetIndex(cards)).toBeNull()
    })
  })
})
