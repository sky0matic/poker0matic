import { faker } from '@faker-js/faker'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoomStore } from '../room'

type Updater = (current: Record<string, unknown> | null) => unknown

const SERVER_TIMESTAMP = vi.hoisted(() => ({ '.sv': 'timestamp' }))
const mockSet = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockDbRef = vi.hoisted(() => vi.fn((_db: unknown, path: string) => ({ _path: path })))
const mockDisconnectUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockDisconnectCancel = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockOnDisconnect = vi.hoisted(() => vi.fn(() => ({ update: mockDisconnectUpdate, cancel: mockDisconnectCancel })))
const mockRunTransaction = vi.hoisted(() => vi.fn().mockResolvedValue({ committed: true }))
const mockServerTimestamp = vi.hoisted(() => vi.fn(() => SERVER_TIMESTAMP))
const mockOnValue = vi.hoisted(() => vi.fn())
const mockGoOffline = vi.hoisted(() => vi.fn())
const mockGoOnline = vi.hoisted(() => vi.fn())
vi.mock('firebase/database', () => ({
  ref: mockDbRef,
  set: mockSet,
  update: mockUpdate,
  onDisconnect: mockOnDisconnect,
  runTransaction: mockRunTransaction,
  serverTimestamp: mockServerTimestamp,
  onValue: mockOnValue,
  goOffline: mockGoOffline,
  goOnline: mockGoOnline,
}))

const mockGetDb = vi.hoisted(() => vi.fn())
vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    getDb: mockGetDb,
    get userId () {
      return 'test-user-id'
    },
    get username () {
      return 'Test User'
    },
  }),
}))

const fakeDb = { _tag: 'db' }

function transactionUpdater (callIndex = 0): Updater {
  return mockRunTransaction.mock.calls[callIndex][1] as Updater
}

function deferTransaction () {
  let resolve: (result: { committed: boolean }) => void = () => undefined
  const promise = new Promise<{ committed: boolean }>(done => {
    resolve = done
  })
  return { promise, resolve }
}

async function flushMicrotasks (): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('useRoomStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGetDb.mockReturnValue(fakeDb)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
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
    it('registers onDisconnect only after the join transaction commits', async () => {
      // Arrange
      const store = useRoomStore()
      const roomId = faker.string.alphanumeric(8)
      const userPath = `rooms/${roomId}/users/test-user-id`
      const { promise, resolve } = deferTransaction()
      mockRunTransaction.mockReturnValueOnce(promise)

      // Act
      store.joinRoom(roomId)
      await flushMicrotasks()
      const armedBeforeCommit = mockDisconnectUpdate.mock.calls.length
      resolve({ committed: true })
      await flushMicrotasks()

      // Assert
      expect(armedBeforeCommit).toBe(0)
      expect(mockRunTransaction).toHaveBeenCalledWith({ _path: userPath }, expect.any(Function))
      expect(mockOnDisconnect).toHaveBeenCalledWith({ _path: userPath })
      expect(mockDisconnectUpdate).toHaveBeenCalledExactlyOnceWith({ connected: false, lastSeen: SERVER_TIMESTAMP })
      expect(mockRunTransaction.mock.invocationCallOrder[0])
        .toBeLessThan(mockDisconnectUpdate.mock.invocationCallOrder[0])
    })

    it.each([
      ['does not commit', () => Promise.resolve({ committed: false }), false],
      ['rejects', () => Promise.reject(new Error(faker.lorem.sentence())), true],
    ])('does not register onDisconnect when the join transaction %s', async (_label, transaction, logsError) => {
      // Arrange
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const store = useRoomStore()
      mockRunTransaction.mockReturnValueOnce(transaction())

      // Act
      store.joinRoom(faker.string.alphanumeric(8))
      await flushMicrotasks()

      // Assert
      expect(mockOnDisconnect).not.toHaveBeenCalled()
      expect(mockDisconnectUpdate).not.toHaveBeenCalled()
      if (logsError) {
        expect(consoleError).toHaveBeenCalledWith(expect.any(Error))
      } else {
        expect(consoleError).not.toHaveBeenCalled()
      }
    })

    it('does not arm onDisconnect when leaveRoom is called before the join transaction resolves', async () => {
      // Arrange
      const store = useRoomStore()
      const roomId = faker.string.alphanumeric(8)
      const { promise, resolve } = deferTransaction()
      mockRunTransaction.mockReturnValueOnce(promise)

      // Act
      store.joinRoom(roomId)
      store.leaveRoom(roomId)
      resolve({ committed: true })
      await flushMicrotasks()

      // Assert
      expect(mockDisconnectCancel).toHaveBeenCalledOnce()
      expect(mockDisconnectUpdate).not.toHaveBeenCalled()
    })

    it('arms onDisconnect again when re-joining after leaving the room', async () => {
      // Arrange
      const store = useRoomStore()
      const roomId = faker.string.alphanumeric(8)
      store.joinRoom(roomId)
      store.leaveRoom(roomId)
      await flushMicrotasks()

      // Act
      store.joinRoom(roomId)
      await flushMicrotasks()

      // Assert
      expect(mockDisconnectUpdate).toHaveBeenCalledExactlyOnceWith({ connected: false, lastSeen: SERVER_TIMESTAMP })
      expect(mockDisconnectCancel.mock.invocationCallOrder[0])
        .toBeLessThan(mockDisconnectUpdate.mock.invocationCallOrder[0])
    })

    it.each([
      [{ name: 'Old Name', joinedAt: 42, vote: 8, connected: false, lastSeen: 100 }],
      [null],
    ])('builds the joined user node from current node %o', current => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.joinRoom('room-1')
      const result = transactionUpdater()(current) as Record<string, unknown>

      // Assert
      if (current) {
        expect(result).toEqual({ name: 'Test User', joinedAt: 42, vote: 8, connected: true, lastSeen: null })
      } else {
        expect(result).toEqual({ name: 'Test User', joinedAt: expect.any(Number), connected: true })
      }
    })

    it('adds a joinedAt to an existing partial node that lacks one', () => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.joinRoom('room-1')
      const result = transactionUpdater()({ vote: 3 }) as Record<string, unknown>

      // Assert
      expect(result).toMatchObject({ name: 'Test User', vote: 3, connected: true, joinedAt: expect.any(Number) })
    })

    it('does nothing when db is unavailable', () => {
      // Arrange
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()

      // Act
      store.joinRoom('room-1')

      // Assert
      expect(mockRunTransaction).not.toHaveBeenCalled()
      expect(mockOnDisconnect).not.toHaveBeenCalled()
    })
  })

  describe('leaveRoom', () => {
    it('cancels onDisconnect before marking an existing node offline', () => {
      // Arrange
      const store = useRoomStore()
      const current = { name: faker.person.firstName(), joinedAt: 1, vote: 5, connected: true }

      // Act
      store.leaveRoom('room-1')
      const result = transactionUpdater()(current)

      // Assert
      expect(mockOnDisconnect).toHaveBeenCalledWith({ _path: 'rooms/room-1/users/test-user-id' })
      expect(mockDisconnectCancel).toHaveBeenCalledOnce()
      expect(mockDisconnectCancel.mock.invocationCallOrder[0]).toBeLessThan(mockRunTransaction.mock.invocationCallOrder[0])
      expect(result).toEqual({ ...current, connected: false, lastSeen: SERVER_TIMESTAMP })
    })

    it('aborts the transaction when the node is absent', () => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.leaveRoom('room-1')

      // Assert
      expect(transactionUpdater()(null)).toBeUndefined()
    })

    it('does nothing when db is unavailable', () => {
      // Arrange
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()

      // Act
      store.leaveRoom('room-1')

      // Assert
      expect(mockRunTransaction).not.toHaveBeenCalled()
      expect(mockDisconnectCancel).not.toHaveBeenCalled()
    })
  })

  describe('updateUsername and castVote', () => {
    const name = faker.person.firstName()

    it.each([
      ['updateUsername', (store: ReturnType<typeof useRoomStore>) => store.updateUsername('room-1', name), { name }],
      ['castVote', (store: ReturnType<typeof useRoomStore>) => store.castVote('room-1', 13), { vote: 13 }],
    ] as const)('%s merges the field into an existing node and aborts when the node is absent', (_label, act, expected) => {
      // Arrange
      const store = useRoomStore()
      const current = { name: 'Old', joinedAt: 7, connected: true }

      // Act
      act(store)
      const updater = transactionUpdater()

      // Assert
      expect(mockRunTransaction.mock.calls[0][0]).toEqual({ _path: 'rooms/room-1/users/test-user-id' })
      expect(updater(current)).toEqual({ ...current, ...expected })
      expect(updater(null)).toBeUndefined()
    })

    it.each([5, '?', '☕'])('castVote writes vote "%s" and bumps lastActivity once committed', async vote => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.castVote('room-1', vote)
      await vi.waitFor(() => expect(mockUpdate).toHaveBeenCalled())

      // Assert
      expect(transactionUpdater()({ name: 'A', joinedAt: 1 })).toMatchObject({ vote })
      expect(mockUpdate).toHaveBeenCalledWith({ _path: 'rooms/room-1' }, { lastActivity: expect.any(Number) })
    })

    it('castVote does not bump lastActivity when the vote transaction aborts', async () => {
      // Arrange
      const store = useRoomStore()
      const transaction = Promise.resolve({ committed: false })
      mockRunTransaction.mockReturnValueOnce(transaction)

      // Act
      store.castVote('room-1', 5)
      await transaction
      await Promise.resolve()

      // Assert
      expect(mockRunTransaction).toHaveBeenCalledOnce()
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it.each([
      ['updateUsername', (store: ReturnType<typeof useRoomStore>) => store.updateUsername('room-1', 'Alice')],
      ['castVote', (store: ReturnType<typeof useRoomStore>) => store.castVote('room-1', 5)],
    ] as const)('%s does nothing when db is unavailable', (_label, act) => {
      // Arrange
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()

      // Act
      act(store)

      // Assert
      expect(mockRunTransaction).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('pruneOfflineUsers', () => {
    it('runs one transaction per candidate', () => {
      // Arrange
      const store = useRoomStore()
      const candidates = [
        { userId: faker.string.uuid(), lastSeen: faker.number.int() },
        { userId: faker.string.uuid(), lastSeen: faker.number.int() },
      ]

      // Act
      store.pruneOfflineUsers('room-1', candidates)

      // Assert
      expect(mockRunTransaction).toHaveBeenCalledTimes(2)
      expect(mockRunTransaction.mock.calls.map(([ref]) => ref)).toEqual([
        { _path: `rooms/room-1/users/${candidates[0].userId}` },
        { _path: `rooms/room-1/users/${candidates[1].userId}` },
      ])
    })

    it.each([
      ['null (delete)', 'an offline node with the same lastSeen', 100, { name: 'A', joinedAt: 1, connected: false, lastSeen: 100 }, null],
      ['null (delete)', 'a nameless partial node', undefined, { vote: 5 }, null],
      ['undefined (abort)', 'a reconnected node', 100, { name: 'A', joinedAt: 1, connected: true }, undefined],
      ['undefined (abort)', 'an offline node with a different lastSeen', 100, { name: 'A', joinedAt: 1, connected: false, lastSeen: 200 }, undefined],
      ['undefined (abort)', 'a named legacy node without connected', undefined, { name: 'A', joinedAt: 1 }, undefined],
      ['undefined (abort)', 'an absent node', 100, null, undefined],
    ])('returns %s for %s', (_result, _label, lastSeen, current, expected) => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.pruneOfflineUsers('room-1', [{ userId: 'u1', lastSeen }])

      // Assert
      expect(transactionUpdater()(current)).toBe(expected)
    })

    it('does nothing when db is unavailable', () => {
      // Arrange
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()

      // Act
      store.pruneOfflineUsers('room-1', [{ userId: 'u1', lastSeen: 1 }])

      // Assert
      expect(mockRunTransaction).not.toHaveBeenCalled()
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
      store.resetVotes('room-1', {
        user1: { name: 'A', joinedAt: 1, vote: 3 },
        user2: { name: 'B', joinedAt: 2 },
      })

      // Assert
      const payload = mockUpdate.mock.calls[0][1]
      expect(payload['settings/showVotes']).toBe(false)
      expect(payload['settings/revealedAt']).toBeNull()
      expect(payload['users/user1/vote']).toBeNull()
      expect(payload['users/user2/vote']).toBeNull()
      expect(mockRunTransaction).not.toHaveBeenCalled()
    })

    it('prunes every offline user without an age threshold after clearing votes', () => {
      // Arrange
      const store = useRoomStore()
      const lastSeen = Date.now()

      // Act
      store.resetVotes('room-1', {
        online: { name: 'A', joinedAt: 1, connected: true },
        offline: { name: 'B', joinedAt: 2, connected: false, lastSeen },
      })

      // Assert
      expect(mockRunTransaction).toHaveBeenCalledOnce()
      expect(mockRunTransaction.mock.calls[0][0]).toEqual({ _path: 'rooms/room-1/users/offline' })
      expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(mockRunTransaction.mock.invocationCallOrder[0])
      expect(transactionUpdater()({ name: 'B', joinedAt: 2, connected: false, lastSeen })).toBeNull()
    })

    it('does nothing when db is unavailable', () => {
      // Arrange
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()

      // Act
      store.resetVotes('room-1', { user1: { name: 'A', joinedAt: 1, connected: false, lastSeen: 1 } })

      // Assert
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockRunTransaction).not.toHaveBeenCalled()
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

  describe('connection helpers', () => {
    it.each([
      ['connected', '.info/connected', (store: ReturnType<typeof useRoomStore>, cb: (v: unknown) => void) => store.watchConnection(cb), true, true],
      ['disconnected', '.info/connected', (store: ReturnType<typeof useRoomStore>, cb: (v: unknown) => void) => store.watchConnection(cb), null, false],
      ['server time offset', '.info/serverTimeOffset', (store: ReturnType<typeof useRoomStore>, cb: (v: unknown) => void) => store.watchServerTimeOffset(cb), 1234, 1234],
      ['missing server time offset', '.info/serverTimeOffset', (store: ReturnType<typeof useRoomStore>, cb: (v: unknown) => void) => store.watchServerTimeOffset(cb), null, 0],
    ] as const)('forwards the %s value to the callback and returns the unsubscribe', (_label, path, watch, raw, expected) => {
      // Arrange
      const unsubscribe = vi.fn()
      let listener: ((snapshot: { val: () => unknown }) => void) | null = null
      mockOnValue.mockImplementation((_ref: unknown, cb: typeof listener) => {
        listener = cb
        return unsubscribe
      })
      const store = useRoomStore()
      const callback = vi.fn()

      // Act
      const result = watch(store, callback)
      listener!({ val: () => raw })

      // Assert
      expect(mockOnValue).toHaveBeenCalledWith({ _path: path }, expect.any(Function))
      expect(callback).toHaveBeenCalledWith(expected)
      expect(result).toBe(unsubscribe)
    })

    it('calls goOffline then goOnline', () => {
      // Arrange
      const store = useRoomStore()

      // Act
      store.forceReconnect()

      // Assert
      expect(mockGoOffline).toHaveBeenCalledWith(fakeDb)
      expect(mockGoOnline).toHaveBeenCalledWith(fakeDb)
      expect(mockGoOffline.mock.invocationCallOrder[0]).toBeLessThan(mockGoOnline.mock.invocationCallOrder[0])
    })

    it('returns a no-op when db is unavailable', () => {
      // Arrange
      mockGetDb.mockReturnValue(null)
      const store = useRoomStore()

      // Act
      const unsubscribeConnection = store.watchConnection(vi.fn())
      const unsubscribeOffset = store.watchServerTimeOffset(vi.fn())
      store.forceReconnect()

      // Assert
      expect(() => unsubscribeConnection()).not.toThrow()
      expect(() => unsubscribeOffset()).not.toThrow()
      expect(mockOnValue).not.toHaveBeenCalled()
      expect(mockGoOffline).not.toHaveBeenCalled()
      expect(mockGoOnline).not.toHaveBeenCalled()
    })
  })
})
