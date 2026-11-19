import type { RoomUser } from '../presence'
import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type CardValue, DEFAULT_CARDS } from '@/config/cardDecks'
import {
  MAX_ROUNDS,
  type Round,
  ROUND_SESSION_GAP_MS,
  roundKeysToDelete,
  roundsInSession,
  roundStats,
  roundVotes,
  sortVotes,
  type StoredRounds,
} from '../roundHistory'

function storedRounds (revealedAts: number[]): StoredRounds {
  return Object.fromEntries(revealedAts.map(revealedAt => [String(revealedAt), { startedAt: revealedAt - 60_000, revealedAt, votes: [3] }]))
}

describe('utils/roundHistory', () => {
  let now: number

  beforeEach(() => {
    now = faker.number.int({ min: 100_000_000, max: 2_000_000_000 })
  })

  afterEach(() => vi.clearAllMocks())

  describe('roundsInSession', () => {
    it('returns the rounds oldest first, numbered from 1, with votes from arrays or index-keyed objects', () => {
      // Arrange
      const raw: StoredRounds = {
        b: { startedAt: now - 2000, revealedAt: now - 1000, votes: { 0: 5, 1: '?' } },
        a: { startedAt: now - 9000, revealedAt: now - 8000, votes: [3, 8] },
        c: { startedAt: now - 500, revealedAt: now - 100 },
        broken: null,
      }

      // Act
      const result = roundsInSession(raw, now)

      // Assert
      expect(result).toEqual([
        { key: 'a', number: 1, startedAt: now - 9000, revealedAt: now - 8000, votes: [3, 8] },
        { key: 'b', number: 2, startedAt: now - 2000, revealedAt: now - 1000, votes: [5, '?'] },
        { key: 'c', number: 3, startedAt: now - 500, revealedAt: now - 100, votes: [] },
      ])
    })

    it.each([
      ['no rounds', null],
      ['a latest round from a previous session', storedRounds([0, ROUND_SESSION_GAP_MS])],
    ])('returns no rounds for %s', (_label, raw) => {
      // Act
      const result = roundsInSession(raw, ROUND_SESSION_GAP_MS * 2)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('roundKeysToDelete', () => {
    it.each([
      ['nothing for an empty history', [], []],
      ['nothing within the session and under the cap', [2000, 1000], []],
      ['every round when the latest is from a previous session', [ROUND_SESSION_GAP_MS + 10, ROUND_SESSION_GAP_MS], [ROUND_SESSION_GAP_MS + 10, ROUND_SESSION_GAP_MS]],
    ])('returns %s', (_label, ageMs: number[], expectedAgeMs: number[]) => {
      // Arrange
      const raw = storedRounds(ageMs.map(age => now - age))

      // Act
      const result = roundKeysToDelete(raw, now)

      // Assert
      expect(result).toEqual(expectedAgeMs.map(age => String(now - age)))
    })

    it('returns malformed entries along with the stale rounds', () => {
      // Arrange
      const raw = { ...storedRounds([now - 1000]), orphan: { votes: [5] } } as unknown as StoredRounds

      // Act
      const result = roundKeysToDelete(raw, now)

      // Assert
      expect(result).toEqual(['orphan'])
    })

    it('returns the oldest rounds so that the new one fits under the cap', () => {
      // Arrange
      const revealedAts = Array.from({ length: MAX_ROUNDS + 1 }, (_, i) => now - (MAX_ROUNDS + 1 - i) * 1000)

      // Act
      const result = roundKeysToDelete(storedRounds(revealedAts), now)

      // Assert
      expect(result).toEqual(revealedAts.slice(0, 2).map(String))
    })
  })

  describe('roundVotes', () => {
    it('returns the online users\' vote values only', () => {
      // Arrange
      const users: Record<string, Partial<RoomUser>> = {
        a: { name: faker.person.firstName(), vote: 5 },
        b: { name: faker.person.firstName(), vote: '☕', connected: true },
        c: { name: faker.person.firstName() },
        d: { name: faker.person.firstName(), vote: 13, connected: false },
      }

      // Act
      const result = roundVotes(users)

      // Assert
      expect(result).toEqual([5, '☕'])
    })
  })

  describe('sortVotes', () => {
    it('sorts votes in deck order and puts unknown cards last', () => {
      // Act
      const result = sortVotes(['XL', 8, '?', 1, 8], [...DEFAULT_CARDS])

      // Assert
      expect(result).toEqual([1, 8, 8, '?', 'XL'])
    })
  })

  describe('roundStats', () => {
    it.each<[string, CardValue[], number | null, number | null]>([
      ['numeric votes', [3, 5, 8, '?'], 5.33, 5],
      ['no numeric vote', ['M', 'L'], null, null],
    ])('computes the average, median and duration for %s', (_label, votes, average, median) => {
      // Arrange
      const round: Round = { key: 'k', number: 1, startedAt: now - 134_500, revealedAt: now, votes }

      // Act
      const result = roundStats(round)

      // Assert
      expect(result).toEqual({ average, median, durationSeconds: 134 })
    })
  })
})
