import { faker } from '@faker-js/faker'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoomStore } from '../room'

const mockSet = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockDbRef = vi.hoisted(() => vi.fn().mockReturnValue({}))
const mockOnDisconnect = vi.hoisted(() => vi.fn().mockReturnValue({ remove: vi.fn() }))
vi.mock('firebase/database', () => ({
  ref: mockDbRef,
  set: mockSet,
  update: mockUpdate,
  onDisconnect: mockOnDisconnect,
}))

const mockGetDb = vi.hoisted(() => vi.fn())
vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    getDb: mockGetDb,
    get userId () {
      return 'test-user-id'
    },
    get userName () {
      return 'Test User'
    },
  }),
}))

const fakeDb = { _tag: 'db' }

describe('useRoomStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGetDb.mockReturnValue(fakeDb)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createRoom', () => {
    it('returns an empty string when db is unavailable', () => {
      // Arrange
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()

      // Act + Assert
      expect(store.createRoom('Room', [1, 2, 3])).toBe('')
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('returns a non-empty room id and calls set with the correct room data', () => {
      // Arrange
      const store = useRoomStore()
      const roomName = faker.word.noun()
      const cards = [1, 2, 3, 5, 8]

      // Act
      const id = store.createRoom(roomName, cards)

      // Assert
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
      const payload = mockSet.mock.calls[0][1]
      expect(payload.name).toBe(roomName)
      expect(payload.settings.cards).toEqual(cards)
      expect(payload.settings.showVotes).toBe(false)
    })

    it.each([
      [300, 600],
      [undefined, undefined],
    ])('includes targetDuration=%s and ceilingDuration=%s only when provided', (target, ceiling) => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.createRoom('Room', [1], target, ceiling)

      // Assert
      const { settings } = mockSet.mock.calls[0][1]
      if (target === undefined) {
        expect(settings.targetDuration).toBeUndefined()
      } else {
        expect(settings.targetDuration).toBe(target)
      }
      if (ceiling === undefined) {
        expect(settings.ceilingDuration).toBeUndefined()
      } else {
        expect(settings.ceilingDuration).toBe(ceiling)
      }
    })
  })

  describe('joinRoom', () => {
    it('calls update with the user name and a joinedAt timestamp, and registers onDisconnect', () => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.joinRoom(faker.string.alphanumeric(8))

      // Assert
      const payload = mockUpdate.mock.calls[0][1]
      expect(payload.name).toBe('Test User')
      expect(typeof payload.joinedAt).toBe('number')
      expect(mockOnDisconnect).toHaveBeenCalled()
    })

    it('does nothing when db is unavailable', () => {
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()
      store.joinRoom('room-1')
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('updateUserName', () => {
    it('calls update with the new name', () => {
      // Arrange
      const store = useRoomStore()
      const name = faker.person.firstName()

      // Act
      store.updateUserName('room-1', name)

      // Assert
      expect(mockUpdate.mock.calls[0][1].name).toBe(name)
    })

    it('does nothing when db is unavailable', () => {
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()
      store.updateUserName('room-1', 'Alice')
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('castVote', () => {
    it.each([5, '?', '☕'])('calls update with vote value "%s"', vote => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.castVote('room-1', vote)

      // Assert
      const voteCall = mockUpdate.mock.calls.find(([, p]) => 'vote' in p)
      expect(voteCall![1].vote).toBe(vote)
    })

    it('does nothing when db is unavailable', () => {
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()
      store.castVote('room-1', 5)
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('revealVotes', () => {
    it('calls update with showVotes true and a numeric revealedAt timestamp', () => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.revealVotes('room-1')

      // Assert
      const payload = mockUpdate.mock.calls[0][1]
      expect(payload['settings/showVotes']).toBe(true)
      expect(typeof payload['settings/revealedAt']).toBe('number')
    })

    it('does nothing when db is unavailable', () => {
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()
      store.revealVotes('room-1')
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('resetVotes', () => {
    it('sets showVotes false, clears revealedAt and nullifies every provided user vote', () => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.resetVotes('room-1', ['user1', 'user2'])

      // Assert
      const payload = mockUpdate.mock.calls[0][1]
      expect(payload['settings/showVotes']).toBe(false)
      expect(payload['settings/revealedAt']).toBeNull()
      expect(payload['users/user1/vote']).toBeNull()
      expect(payload['users/user2/vote']).toBeNull()
    })

    it('does nothing when db is unavailable', () => {
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()
      store.resetVotes('room-1', ['user1'])
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('resetTimer', () => {
    it('sets showVotes false, clears revealedAt and includes a resetAt timestamp', () => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.resetTimer('room-1')

      // Assert
      const payload = mockUpdate.mock.calls[0][1]
      expect(payload['settings/showVotes']).toBe(false)
      expect(payload['settings/revealedAt']).toBeNull()
      expect(typeof payload['resetAt']).toBe('number')
    })

    it('does nothing when db is unavailable', () => {
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()
      store.resetTimer('room-1')
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })
})
