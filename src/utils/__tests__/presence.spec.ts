import type { RoomUser } from '../presence'
import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findPrunableUsers, isUserOnline, OFFLINE_USER_TTL_MS } from '../presence'

const SELF_ID = 'self'

describe('utils/presence', () => {
  let serverNow: number

  beforeEach(() => {
    serverNow = faker.date.recent().getTime()
  })

  afterEach(() => vi.clearAllMocks())

  describe('isUserOnline', () => {
    it.each([
      [{ connected: true }, true],
      [{ connected: false }, false],
      [{}, true],
    ])('reports user %o as online=%s', (user, expected) => {
      // Act
      const result = isUserOnline(user)

      // Assert
      expect(result).toBe(expected)
    })
  })

  describe('findPrunableUsers', () => {
    function user (overrides: Partial<RoomUser> = {}): RoomUser {
      return { name: faker.person.firstName(), joinedAt: faker.number.int({ max: serverNow }), ...overrides }
    }

    it('returns other offline users whose lastSeen is older than the threshold', () => {
      // Arrange
      const staleLastSeen = serverNow - OFFLINE_USER_TTL_MS - 1
      const exactLastSeen = serverNow - OFFLINE_USER_TTL_MS
      const users = {
        stale: user({ connected: false, lastSeen: staleLastSeen }),
        exact: user({ connected: false, lastSeen: exactLastSeen }),
        online: user({ connected: true }),
      }

      // Act
      const result = findPrunableUsers(users, serverNow, OFFLINE_USER_TTL_MS, SELF_ID)

      // Assert
      expect(result).toEqual([
        { userId: 'stale', lastSeen: staleLastSeen },
        { userId: 'exact', lastSeen: exactLastSeen },
      ])
    })

    it.each([
      ['offline but recent', 'other', { connected: false, lastSeenAgo: OFFLINE_USER_TTL_MS - 1 }],
      ['online', 'other', { connected: true, lastSeenAgo: OFFLINE_USER_TTL_MS * 2 }],
      ['legacy without connected', 'other', { lastSeenAgo: OFFLINE_USER_TTL_MS * 2 }],
      ['it is the current user', SELF_ID, { connected: false, lastSeenAgo: OFFLINE_USER_TTL_MS * 2 }],
      ['offline without a numeric lastSeen but with a name', 'other', { connected: false }],
    ])('excludes the user when %s', (_label, userId, { connected, lastSeenAgo }: { connected?: boolean, lastSeenAgo?: number }) => {
      // Arrange
      const lastSeen = lastSeenAgo == null ? undefined : serverNow - lastSeenAgo
      const users = { [userId]: user({ connected, lastSeen }) }

      // Act
      const result = findPrunableUsers(users, serverNow, OFFLINE_USER_TTL_MS, SELF_ID)

      // Assert
      expect(result).toEqual([])
    })

    it('includes nameless partial nodes that are not connected', () => {
      // Arrange
      const lastSeen = serverNow - 1
      const users: Record<string, Partial<RoomUser>> = {
        voteOnly: { vote: faker.number.int({ max: 13 }) },
        disconnectOnly: { connected: false, lastSeen },
        connectedNameless: { connected: true },
        [SELF_ID]: { vote: 3 },
      }

      // Act
      const result = findPrunableUsers(users, serverNow, OFFLINE_USER_TTL_MS, SELF_ID)

      // Assert
      expect(result).toEqual([
        { userId: 'voteOnly', lastSeen: undefined },
        { userId: 'disconnectOnly', lastSeen },
      ])
    })
  })
})
