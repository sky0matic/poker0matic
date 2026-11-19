import type { RoomUser } from '../presence'
import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CARDS } from '@/config/cardDecks'
import { averageVote, countVotes, medianVote, sortRoomUsers } from '../roomStats'

function makeUser (overrides: Partial<RoomUser> = {}): RoomUser {
  return { name: faker.person.firstName(), joinedAt: faker.number.int({ min: 1, max: 1_000_000 }), ...overrides }
}

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
})
