import type { RoomUser } from '../presence'
import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type CardValue, DEFAULT_CARDS, PRESET_DEFINITIONS } from '@/config/cardDecks'
import { averageVote, consensusVote, countVotes, medianVote, sortRoomUsers, voteOutliers } from '../roomStats'

function makeUser (overrides: Partial<RoomUser> = {}): RoomUser {
  return { name: faker.person.firstName(), joinedAt: faker.number.int({ min: 1, max: 1_000_000 }), ...overrides }
}

const TSHIRT_CARDS = [...PRESET_DEFINITIONS.find(preset => preset.key === 'tshirt')!.cards]

function usersFrom (list: Partial<RoomUser>[]): Record<string, RoomUser> {
  return Object.fromEntries(list.map(overrides => [faker.string.uuid(), makeUser(overrides)]))
}

describe('utils/roomStats', () => {
  let vote: number

  beforeEach(() => {
    vote = faker.helpers.arrayElement([1, 2, 3, 5, 8, 13])
  })

  afterEach(() => vi.clearAllMocks())

  describe('countVotes', () => {
    it.each([
      ['an empty room', [], { voted: 0, total: 0 }],
      ['a room of online voters', [{ connected: true, vote: 1 }, { connected: true }], { voted: 1, total: 2 }],
      ['a room with offline voters', [{ connected: false, vote: 3 }, { connected: true, vote: 5 }], { voted: 1, total: 1 }],
      ['a room with legacy users', [{ vote: 8 }, {}, { connected: false }], { voted: 1, total: 2 }],
    ])('counts only online users in %s', (_label, list: Partial<RoomUser>[], expected) => {
      // Arrange
      const users = usersFrom(list)

      // Act
      const result = countVotes(users)

      // Assert
      expect(result).toEqual(expected)
    })
  })

  describe('averageVote', () => {
    it.each([
      ['of numeric votes', [{ vote: 5 }, { vote: 13 }], 9],
      ['ignoring non-numeric cards', [{ vote: 3 }, { vote: '?' }, { vote: '☕' }], 3],
      ['ignoring offline users', [{ vote: 2 }, { vote: 21, connected: false }], 2],
      ['as null when nobody voted', [{}, {}], null],
      ['rounded to 2 decimals', [{ vote: 13 }, { vote: 21 }, { vote: 34 }], 22.67],
    ])('computes the average %s', (_label, list: Partial<RoomUser>[], expected) => {
      // Arrange
      const users = usersFrom(list)

      // Act
      const result = averageVote(users)

      // Assert
      expect(result).toBe(expected)
    })
  })

  describe('medianVote', () => {
    it.each([
      ['of an odd count', [{ vote: 13 }, { vote: 5 }, { vote: 8 }], 8],
      ['of an even count', [{ vote: 8 }, { vote: 1 }, { vote: 5 }, { vote: 2 }], 3.5],
      ['as null when no vote is numeric', [{ vote: '?' }, {}], null],
    ])('computes the median %s', (_label, list: Partial<RoomUser>[], expected) => {
      // Arrange
      const users = usersFrom(list)

      // Act
      const result = medianVote(users)

      // Assert
      expect(result).toBe(expected)
    })
  })

  describe('sortRoomUsers', () => {
    it('sorts users by deck order when votes are revealed and puts non-voters last', () => {
      // Arrange
      const users = {
        nonVoter: makeUser({ joinedAt: 1 }),
        coffee: makeUser({ joinedAt: 2, vote: '☕' }),
        low: makeUser({ joinedAt: 3, vote }),
        unknown: makeUser({ joinedAt: 4, vote: 'not-in-deck' }),
        zero: makeUser({ joinedAt: 5, vote: 0 }),
      }

      // Act
      const result = sortRoomUsers(users, true, [...DEFAULT_CARDS])

      // Assert
      expect(result.map(user => user.userId).slice(0, 3)).toEqual(['zero', 'low', 'coffee'])
      expect(result.map(user => user.userId).slice(3).toSorted()).toEqual(['nonVoter', 'unknown'])
      expect(result[0]).toMatchObject({ ...users.zero, userId: 'zero' })
    })

    it('sorts users by joinedAt when votes are hidden', () => {
      // Arrange
      const users = {
        third: makeUser({ joinedAt: 30, vote: 0 }),
        first: makeUser({ joinedAt: 10 }),
        second: makeUser({ joinedAt: 20, vote }),
      }

      // Act
      const result = sortRoomUsers(users, false, [...DEFAULT_CARDS])

      // Assert
      expect(result.map(user => user.userId)).toEqual(['first', 'second', 'third'])
    })
  })

  describe('consensusVote', () => {
    it.each<[CardValue | null, string, Partial<RoomUser>[], CardValue[]]>([
      [5, 'the same numeric vote', [{ vote: 5 }, { vote: 5 }], [...DEFAULT_CARDS]],
      ['M', 'the same t-shirt vote', [{ vote: 'M' }, { vote: 'M' }, { vote: 'M' }], TSHIRT_CARDS],
      [8, 'agreeing votes next to ? and ☕ voters', [{ vote: 8 }, { vote: 8 }, { vote: '?' }, { vote: '☕' }], [...DEFAULT_CARDS]],
      [3, 'agreeing online votes next to an offline voter', [{ vote: 3 }, { vote: 3 }, { vote: 13, connected: false }], [...DEFAULT_CARDS]],
      [null, 'different votes', [{ vote: 3 }, { vote: 5 }], [...DEFAULT_CARDS]],
      [null, 'a single voter', [{ vote: 3 }, {}], [...DEFAULT_CARDS]],
      [null, 'only ? votes', [{ vote: '?' }, { vote: '?' }], [...DEFAULT_CARDS]],
      [null, 'votes not in the deck', [{ vote: 'XL' }, { vote: 'XL' }], [...DEFAULT_CARDS]],
    ])('returns %j for %s', (expected, _label, list, voteOptions) => {
      // Arrange
      const users = usersFrom(list)

      // Act
      const result = consensusVote(users, voteOptions)

      // Assert
      expect(result).toBe(expected)
    })
  })

  describe('voteOutliers', () => {
    it.each<[string, Record<string, Partial<RoomUser>>, CardValue[], string[], string[]]>([
      ['distinct votes', { a: { vote: 1 }, b: { vote: 5 }, c: { vote: 13 } }, [...DEFAULT_CARDS], ['a'], ['c']],
      ['tied extremes', { a: { vote: 2 }, b: { vote: 2 }, c: { vote: 8 }, d: { vote: 8 }, e: { vote: 5 } }, [...DEFAULT_CARDS], ['a', 'b'], ['c', 'd']],
      ['t-shirt votes in deck order', { a: { vote: 'XL' }, b: { vote: 'S' } }, TSHIRT_CARDS, ['b'], ['a']],
      ['special cards and offline users', { a: { vote: 3 }, b: { vote: 5 }, c: { vote: '?' }, d: { vote: '☕' }, e: { vote: 55, connected: false } }, [...DEFAULT_CARDS], ['a'], ['b']],
      ['identical votes', { a: { vote: 5 }, b: { vote: 5 } }, [...DEFAULT_CARDS], [], []],
      ['a single voter', { a: { vote: 5 }, b: {} }, [...DEFAULT_CARDS], [], []],
    ])('returns the lowest and highest voters for %s', (_label, list, voteOptions, lowest, highest) => {
      // Arrange
      const users = Object.fromEntries(Object.entries(list).map(([id, overrides]) => [id, makeUser(overrides)]))

      // Act
      const result = voteOutliers(users, voteOptions)

      // Assert
      expect([...result.lowest].toSorted()).toEqual(lowest)
      expect([...result.highest].toSorted()).toEqual(highest)
    })
  })
})
