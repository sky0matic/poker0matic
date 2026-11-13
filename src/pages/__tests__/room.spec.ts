import { faker } from '@faker-js/faker'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CARDS, PRESET_DEFINITIONS } from '@/config/cardDecks'
import { CURRENT_ROOM_VERSION } from '@/config/roomVersions'
import { useConfigStore } from '@/stores/config'
import { OFFLINE_USER_GC_INTERVAL_MS, OFFLINE_USER_TTL_MS } from '@/utils/presence'
import RoomPage from '../room.vue'

// --- Firebase mocks ---
const mockDbRef = vi.hoisted(() => vi.fn())
const mockOnValue = vi.hoisted(() => vi.fn())
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))
vi.mock('firebase/database', () => ({
  ref: mockDbRef,
  onValue: mockOnValue,
  getDatabase: vi.fn().mockReturnValue({}),
  set: vi.fn(),
  update: vi.fn(),
  onDisconnect: vi.fn().mockReturnValue({ remove: vi.fn() }),
}))

// --- Room store mock ---
const mockCastVote = vi.hoisted(() => vi.fn())
const mockRevealVotes = vi.hoisted(() => vi.fn())
const mockResetVotes = vi.hoisted(() => vi.fn())
const mockJoinRoom = vi.hoisted(() => vi.fn())
const mockResetTimer = vi.hoisted(() => vi.fn())
const mockUpdateUsername = vi.hoisted(() => vi.fn())
const mockLeaveRoom = vi.hoisted(() => vi.fn())
const mockPruneOfflineUsers = vi.hoisted(() => vi.fn())
const mockForceReconnect = vi.hoisted(() => vi.fn())
const mockWatchConnection = vi.hoisted(() => vi.fn())
const mockWatchServerTimeOffset = vi.hoisted(() => vi.fn())
const mockUpdateRoomSettings = vi.hoisted(() => vi.fn())
vi.mock('@/stores/room', () => ({
  useRoomStore: () => ({
    castVote: mockCastVote,
    revealVotes: mockRevealVotes,
    resetVotes: mockResetVotes,
    joinRoom: mockJoinRoom,
    leaveRoom: mockLeaveRoom,
    resetTimer: mockResetTimer,
    updateUsername: mockUpdateUsername,
    pruneOfflineUsers: mockPruneOfflineUsers,
    forceReconnect: mockForceReconnect,
    watchConnection: mockWatchConnection,
    watchServerTimeOffset: mockWatchServerTimeOffset,
    updateRoomSettings: mockUpdateRoomSettings,
  }),
}))

// --- Router mock ---
const mockReplace = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { roomId: 'test-room' } }),
  useRouter: () => ({ replace: mockReplace }),
}))

// --- Test constants ---
const ROOM_ID = 'test-room'
const USER_ID = 'current-user'
const FAKE_FIREBASE_CONFIG = {
  apiKey: 'test-key', authDomain: 'test.firebaseapp.com', databaseUrl: 'https://test.firebaseio.com',
  projectId: 'test', storageBucket: 'test.appspot.com', messagingSenderId: '1', appId: '1:1:web:abc',
}
const DEFAULT_ROOM = {
  name: 'Sprint Planning',
  createdAt: 1_000_000,
  createdBy: USER_ID,
  settings: { showVotes: false, v: CURRENT_ROOM_VERSION },
}

type UserEntry = { name: string, joinedAt: number, vote?: number | string, connected?: boolean, lastSeen?: number }

// Captured Firebase callbacks
let roomCallback: ((snapshot: { val: () => unknown }) => void) | null = null
let usersCallback: ((snapshot: { val: () => unknown }) => void) | null = null
let connectionCallback: ((connected: boolean) => void) | null = null

describe('pages/room', () => {
  let configStore: ReturnType<typeof useConfigStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    configStore = useConfigStore()
    configStore.saveFirebaseConfig(FAKE_FIREBASE_CONFIG)
    configStore.setUsername('Alice')
    configStore.userId = USER_ID
    roomCallback = null
    usersCallback = null
    connectionCallback = null

    mockWatchConnection.mockImplementation((cb: (connected: boolean) => void) => {
      connectionCallback = cb
      return vi.fn()
    })
    mockWatchServerTimeOffset.mockImplementation(() => vi.fn())

    mockDbRef.mockImplementation((_db: unknown, path: string) => ({ _path: path }))
    mockOnValue.mockImplementation((ref: { _path: string }, cb: (s: unknown) => void) => {
      if (ref._path.endsWith('/users')) {
        usersCallback = cb
      } else {
        roomCallback = cb
      }
      return vi.fn()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function mountRoom () {
    return mount(RoomPage, {
      global: {
        stubs: {
          VDialog: {
            template: '<div data-testid="dialog" v-if="modelValue"><slot /></div>',
            props: ['modelValue'],
          },
          VSnackbar: {
            template: '<div data-testid="snackbar" v-if="modelValue"><slot /></div>',
            props: ['modelValue', 'color', 'timeout'],
          },
          VTooltip: {
            template: '<div><slot name="activator" v-bind="{ props: {} }" /><slot /></div>',
          },
          VAlert: {
            template: '<div class="v-alert-stub"><slot /><button v-if="closable" class="alert-close" @click="$emit(\'click:close\')" /></div>',
            props: { closable: Boolean, color: String, density: String, icon: String, variant: String },
            emits: ['click:close'],
          },
          VoteCard: {
            template: '<button class="vote-card-stub" :class="{ small }" :data-option="String(option)" :data-selected="String(selected)" :disabled="disabled" @click="$emit(\'click\')" />',
            props: { option: [Number, String], voteOptions: Array, selected: Boolean, small: Boolean, readonly: Boolean, disabled: Boolean },
            emits: ['click'],
          },
          CardBack: {
            template: '<div class="card-back-stub" />',
          },
          RoomSettingsDialog: {
            name: 'RoomSettingsDialog',
            template: '<div v-if="modelValue" class="settings-dialog-stub" :data-conflict="String(conflict)" :data-saving="String(saving)" />',
            props: { modelValue: Boolean, settings: Object, saving: Boolean, conflict: Boolean },
            emits: ['save', 'update:modelValue'],
          },
          VDataTable: {
            template: `
              <table>
                <thead><tr>
                  <th v-for="h in headers" :key="h.value">
                    <slot :name="'header.' + h.value" :column="h">{{ h.title }}</slot>
                  </th>
                </tr></thead>
                <tbody>
                  <tr v-for="item in items" :key="item.userId" class="data-row" v-bind="rowProps ? rowProps({ item }) : {}">
                    <td class="name-col"><slot name="item.name" :item="item">{{ item.name }}</slot></td>
                    <td class="vote-col"><slot name="item.vote" :item="item" /></td>
                  </tr>
                  <slot name="body.append" />
                </tbody>
              </table>
            `,
            props: ['items', 'headers', 'itemsPerPage', 'hideDefaultFooter', 'rowProps'],
          },
        },
      },
    })
  }

  async function loadRoom (
    roomData: Record<string, unknown> = DEFAULT_ROOM,
    usersData: Record<string, UserEntry> = {},
  ) {
    roomCallback?.({ val: () => ({ ...roomData, users: usersData }) })
    usersCallback?.({ val: () => usersData })
  }

  function connect (connected = true) {
    connectionCallback?.(connected)
  }

  /** Mounts the room, connects and loads it with the current user present, ready to act. */
  async function mountJoinedRoom (
    roomData: Record<string, unknown> = DEFAULT_ROOM,
    usersData?: Record<string, UserEntry>,
  ) {
    const wrapper = mountRoom()
    connect()
    await loadRoom(roomData, usersData ?? { [USER_ID]: { name: 'Alice', joinedAt: 1 } })
    await wrapper.vm.$nextTick()
    return wrapper
  }

  function findButton (wrapper: ReturnType<typeof mountRoom>, label: string) {
    return wrapper.findAll('button').find(b => b.text().includes(label))
  }

  function findSettingsButton (wrapper: ReturnType<typeof mountRoom>) {
    return wrapper.find('button[aria-label="Room settings"]')
  }

  function findSettingsDialog (wrapper: ReturnType<typeof mountRoom>) {
    return wrapper.find('.settings-dialog-stub')
  }

  // ─── Name prompt ──────────────────────────────────────────────────────────

  describe('name prompt', () => {
    it('shows the join dialog when username is empty', () => {
      // Arrange
      configStore.setUsername('')

      // Act
      const wrapper = mountRoom()

      // Assert
      expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(true)
    })

    it('hides the join dialog when username is already set', async () => {
      // Arrange
      const wrapper = mountRoom()

      // Act
      await loadRoom()
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(false)
      expect(wrapper.html()).toContain('Sprint Planning')
    })
  })

  // ─── submitName ──────────────────────────────────────────────────────────

  describe('submitName', () => {
    it('calls setUsername with the trimmed name and hides the dialog', async () => {
      // Arrange
      configStore.setUsername('')
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()
      const setUsernameSpy = vi.spyOn(configStore, 'setUsername')

      // Act
      await wrapper.find('input').setValue('  Bob  ')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      // Assert
      expect(setUsernameSpy).toHaveBeenCalledWith('Bob')
      expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(false)
    })

    it('does not submit when the name is blank', async () => {
      // Arrange
      configStore.setUsername('')
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()
      const setUsernameSpy = vi.spyOn(configStore, 'setUsername')

      // Act
      await wrapper.find('input').setValue(' '.repeat(3))
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      // Assert
      expect(setUsernameSpy).not.toHaveBeenCalled()
      expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(true)
    })

    it('truncates the name to 20 characters', async () => {
      // Arrange
      configStore.setUsername('')
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()
      const setUsernameSpy = vi.spyOn(configStore, 'setUsername')

      // Act
      await wrapper.find('input').setValue('A'.repeat(30))
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      // Assert
      expect(setUsernameSpy).toHaveBeenCalledWith('A'.repeat(20))
    })
  })

  // ─── Vote cards ───────────────────────────────────────────────────────────

  describe('vote cards', () => {
    it('renders a VoteCard for each option in the default deck', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()

      // Assert — default deck has 12 options, small cards are in the table
      const castingCards = wrapper.findAll('.vote-card-stub:not(.small)')
      expect(castingCards).toHaveLength(12)
    })

    it.each([
      ['an array deck', [...PRESET_DEFINITIONS[2].cards], PRESET_DEFINITIONS[2].cards.map(String)],
      ['an index-keyed object deck', { 0: 1, 1: '?' }, ['1', '?']],
      ['an empty deck', [], DEFAULT_CARDS.map(String)],
    ])('renders the deck from settings cards with %s', async (_label, cards, expected) => {
      // Arrange
      const wrapper = mountRoom()

      // Act
      await loadRoom({ ...DEFAULT_ROOM, settings: { ...DEFAULT_ROOM.settings, cards } })
      await wrapper.vm.$nextTick()

      // Assert
      const options = wrapper.findAll('.vote-card-stub:not(.small)').map(card => card.attributes('data-option'))
      expect(options).toEqual(expected)
    })

    it('marks the current user vote as selected', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(DEFAULT_ROOM, {
        [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 },
      })
      await wrapper.vm.$nextTick()

      // Assert
      const selected = wrapper.findAll('.vote-card-stub:not(.small)')
        .find(c => c.attributes('data-selected') === 'true')
      expect(selected?.attributes('data-option')).toBe('5')
    })

    it('calls castVote with the room id and the clicked option', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom()

      // Act — click the card for option "2" (index 2 in default deck)
      const cards = wrapper.findAll('.vote-card-stub:not(.small)')
      await cards[2].trigger('click')

      // Assert
      expect(mockCastVote).toHaveBeenCalledWith(ROOM_ID, 2)
    })
  })

  // ─── Reveal votes button ─────────────────────────────────────────────────

  describe('reveal votes button', () => {
    it('is disabled when no votes have been cast', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(DEFAULT_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1 } })
      await wrapper.vm.$nextTick()

      // Act
      const revealBtn = wrapper.findAll('button').find(b => b.text().includes('Reveal votes'))

      // Assert
      expect(revealBtn?.attributes('disabled')).toBeDefined()
    })

    it('is disabled when votes are already revealed', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(
        { ...DEFAULT_ROOM, settings: { showVotes: true, v: CURRENT_ROOM_VERSION } },
        { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 } },
      )
      await wrapper.vm.$nextTick()

      // Act
      const revealBtn = wrapper.findAll('button').find(b => b.text().includes('Reveal votes'))

      // Assert
      expect(revealBtn?.attributes('disabled')).toBeDefined()
    })

    it('calls revealVotes with the room id when clicked', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom(DEFAULT_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 } })

      // Act
      const revealBtn = wrapper.findAll('button').find(b => b.text().includes('Reveal votes'))
      await revealBtn!.trigger('click')

      // Assert
      expect(mockRevealVotes).toHaveBeenCalledWith(ROOM_ID)
    })

    it('adds the all-voted class when every player has voted', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(DEFAULT_ROOM, {
        [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 },
        'user-2': { name: 'Bob', joinedAt: 2, vote: 8 },
      })
      await wrapper.vm.$nextTick()

      // Act
      const revealBtn = wrapper.findAll('button').find(b => b.text().includes('Reveal votes'))

      // Assert
      expect(revealBtn?.classes()).toContain('all-voted')
    })
  })

  // ─── Reset votes button ───────────────────────────────────────────────────

  describe('reset votes button', () => {
    it('calls resetVotes with the room id and the users record', async () => {
      // Arrange
      const users: Record<string, UserEntry> = {
        [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 },
        'user-2': { name: 'Bob', joinedAt: 2, vote: 8, connected: false, lastSeen: 3 },
      }
      const wrapper = await mountJoinedRoom(DEFAULT_ROOM, users)

      // Act
      await findButton(wrapper, 'Reset votes')!.trigger('click')

      // Assert
      expect(mockResetVotes).toHaveBeenCalledWith(ROOM_ID, users)
    })
  })

  // ─── Joining & presence ───────────────────────────────────────────────────

  describe('joining', () => {
    it.each([
      ['room then connection'],
      ['connection then room'],
    ])('joins once when %s arrive', async order => {
      // Arrange
      const wrapper = mountRoom()

      // Act
      if (order === 'room then connection') {
        await loadRoom()
        connect()
      } else {
        connect()
        await loadRoom()
      }
      await loadRoom()
      await wrapper.vm.$nextTick()

      // Assert
      expect(mockJoinRoom).toHaveBeenCalledOnce()
      expect(mockJoinRoom).toHaveBeenCalledWith(ROOM_ID)
    })

    it('does not join before the name is submitted, then joins on submit', async () => {
      // Arrange
      configStore.setUsername('')
      const wrapper = mountRoom()
      connect()
      await loadRoom()
      await wrapper.vm.$nextTick()
      const joinedBeforeSubmit = mockJoinRoom.mock.calls.length

      // Act
      await wrapper.find('input').setValue(faker.person.firstName())
      await wrapper.find('form').trigger('submit')

      // Assert
      expect(joinedBeforeSubmit).toBe(0)
      expect(mockJoinRoom).toHaveBeenCalledOnce()
    })

    it('prunes stale offline users before joining and ignores them for the empty-room timer reset', async () => {
      // Arrange
      const staleLastSeen = Date.now() - OFFLINE_USER_TTL_MS - 60_000
      const users: Record<string, UserEntry> = {
        stale: { name: 'Bob', joinedAt: 1, connected: false, lastSeen: staleLastSeen },
        recent: { name: 'Carol', joinedAt: 2, connected: false, lastSeen: Date.now() },
      }
      const wrapper = mountRoom()

      // Act
      connect()
      await loadRoom(DEFAULT_ROOM, users)
      await wrapper.vm.$nextTick()

      // Assert
      expect(mockPruneOfflineUsers).toHaveBeenCalledWith(ROOM_ID, [{ userId: 'stale', lastSeen: staleLastSeen }])
      expect(mockResetTimer).toHaveBeenCalledWith(ROOM_ID)
      expect(mockPruneOfflineUsers.mock.invocationCallOrder[0]).toBeLessThan(mockJoinRoom.mock.invocationCallOrder[0])
    })

    it('does not reset the timer when another online user is present', async () => {
      // Arrange
      const wrapper = mountRoom()

      // Act
      connect()
      await loadRoom(DEFAULT_ROOM, { 'user-2': { name: 'Bob', joinedAt: 1 } })
      await wrapper.vm.$nextTick()

      // Assert
      expect(mockResetTimer).not.toHaveBeenCalled()
      expect(mockPruneOfflineUsers).not.toHaveBeenCalled()
      expect(mockJoinRoom).toHaveBeenCalledOnce()
    })

    it('re-joins when the connection comes back', async () => {
      // Arrange
      await mountJoinedRoom()

      // Act
      connect(false)
      connect(true)

      // Assert
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
    })

    it('re-joins when its own node disappears while connected', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom()

      // Act
      usersCallback?.({ val: () => ({ 'user-2': { name: 'Bob', joinedAt: 2 } }) })
      usersCallback?.({ val: () => ({ 'user-2': { name: 'Bob', joinedAt: 2 } }) })
      await wrapper.vm.$nextTick()

      // Assert
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
    })

    describe('when another tab of the same user marks its node offline', () => {
      const selfNode = (overrides: Partial<UserEntry> = {}): UserEntry => ({
        name: 'Alice',
        joinedAt: 1,
        vote: faker.helpers.arrayElement([1, 2, 3, 5, 8]),
        ...overrides,
      })
      const offlineSelf = (lastSeen: number) => selfNode({ connected: false, lastSeen })
      const emitSelf = (node: UserEntry) => usersCallback?.({ val: () => ({ [USER_ID]: node }) })

      let lastSeen: number

      beforeEach(() => {
        lastSeen = faker.date.recent().getTime()
      })

      it('rejoins when its own node is marked offline by another tab while connected', async () => {
        // Arrange
        const wrapper = await mountJoinedRoom()

        // Act
        emitSelf(offlineSelf(lastSeen))
        await wrapper.vm.$nextTick()

        // Assert
        expect(mockJoinRoom).toHaveBeenCalledTimes(2)
        expect(mockJoinRoom).toHaveBeenLastCalledWith(ROOM_ID)
      })

      it.each([
        ['its own node is connected', async () => {
          await mountJoinedRoom()
          return selfNode({ connected: true })
        }],
        ['its own node has no connected field', async () => {
          await mountJoinedRoom()
          return selfNode()
        }],
        ['the tab is disconnected', async () => {
          await mountJoinedRoom()
          connect(false)
          return offlineSelf(lastSeen)
        }],
        ['the tab has not joined yet', async () => {
          configStore.setUsername('')
          mountRoom()
          connect()
          await loadRoom()
          return offlineSelf(lastSeen)
        }],
      ])('does not rejoin when %s', async (_label, arrange) => {
        // Arrange
        const node = await arrange()
        const joinCallsBefore = mockJoinRoom.mock.calls.length

        // Act
        emitSelf(node)

        // Assert
        expect(mockJoinRoom).toHaveBeenCalledTimes(joinCallsBefore)
      })

      it.each([
        ['two consecutive offline snapshots', (seen: number) => [offlineSelf(seen), offlineSelf(seen)]],
        ['a rejected rejoin reverting to the same marking', (seen: number) => [offlineSelf(seen), selfNode({ connected: true }), offlineSelf(seen)]],
      ])('does not issue a second rejoin for the same offline observation on %s', async (_label, buildSnapshots) => {
        // Arrange
        await mountJoinedRoom()

        // Act
        for (const node of buildSnapshots(lastSeen)) {
          emitSelf(node)
        }

        // Assert
        expect(mockJoinRoom).toHaveBeenCalledTimes(2)
      })

      it('rejoins again when a later offline marking arrives', async () => {
        // Arrange
        await mountJoinedRoom()
        emitSelf(offlineSelf(lastSeen))
        emitSelf(selfNode({ connected: true }))

        // Act
        emitSelf(offlineSelf(lastSeen + faker.number.int({ min: 1, max: 60_000 })))

        // Assert
        expect(mockJoinRoom).toHaveBeenCalledTimes(3)
      })

      it('does not rejoin when its own leave on unmount echoes an offline snapshot', async () => {
        // Arrange
        const wrapper = await mountJoinedRoom()
        mockLeaveRoom.mockImplementationOnce(() => emitSelf(offlineSelf(lastSeen)))

        // Act
        wrapper.unmount()

        // Assert
        expect(mockLeaveRoom).toHaveBeenCalledWith(ROOM_ID)
        expect(mockJoinRoom).toHaveBeenCalledOnce()
      })
    })

    it('updates the username only when its own node exists', async () => {
      // Arrange
      const wrapper = mountRoom()
      connect()
      await loadRoom(DEFAULT_ROOM, {})
      await wrapper.vm.$nextTick()
      const newName = faker.person.firstName()

      // Act
      configStore.setUsername(faker.person.firstName())
      await wrapper.vm.$nextTick()
      usersCallback?.({ val: () => ({ [USER_ID]: { name: 'Alice', joinedAt: 1 } }) })
      configStore.setUsername(newName)
      await wrapper.vm.$nextTick()

      // Assert
      expect(mockUpdateUsername).toHaveBeenCalledOnce()
      expect(mockUpdateUsername).toHaveBeenCalledWith(ROOM_ID, newName)
    })

    it('leaves the room on unmount before removing the room and users listeners', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom()
      const unsubscribes = mockOnValue.mock.results.map(result => result.value as ReturnType<typeof vi.fn>)
      const leaveOrder = () => mockLeaveRoom.mock.invocationCallOrder[0]

      // Act
      wrapper.unmount()

      // Assert
      expect(mockLeaveRoom).toHaveBeenCalledWith(ROOM_ID)
      expect(unsubscribes).toHaveLength(2)
      for (const unsubscribe of unsubscribes) {
        expect(unsubscribe).toHaveBeenCalledOnce()
        expect(leaveOrder()).toBeLessThan(unsubscribe.mock.invocationCallOrder[0])
      }
    })

    it('runs the offline GC on the interval while connected', async () => {
      // Arrange
      vi.useFakeTimers()
      const wrapper = await mountJoinedRoom()
      const lastSeen = Date.now()
      usersCallback?.({ val: () => ({
        [USER_ID]: { name: 'Alice', joinedAt: 1 },
        'user-2': { name: 'Bob', joinedAt: 2, connected: false, lastSeen },
      }) })

      // Act
      vi.advanceTimersByTime(OFFLINE_USER_GC_INTERVAL_MS)
      const callsBeforeTtl = mockPruneOfflineUsers.mock.calls.length
      vi.advanceTimersByTime(OFFLINE_USER_TTL_MS)

      // Assert
      expect(callsBeforeTtl).toBe(0)
      expect(mockPruneOfflineUsers).toHaveBeenCalledWith(ROOM_ID, [{ userId: 'user-2', lastSeen }])
      wrapper.unmount()
    })
  })

  describe('offline users', () => {
    const onlineVoted = (vote: number): UserEntry => ({ name: faker.person.firstName(), joinedAt: 1, vote, connected: true })
    const offline = (vote?: number): UserEntry => ({ name: faker.person.firstName(), joinedAt: 2, vote, connected: false, lastSeen: Date.now() })

    it.each([
      ['the voted counter', DEFAULT_ROOM, (w: ReturnType<typeof mountRoom>) => expect(w.find('thead').text()).toContain('1/1')],
      ['the all-voted class', DEFAULT_ROOM, (w: ReturnType<typeof mountRoom>) => expect(findButton(w, 'Reveal votes')?.classes()).toContain('all-voted')],
      ['the average', { ...DEFAULT_ROOM, settings: { showVotes: true, v: CURRENT_ROOM_VERSION } }, (w: ReturnType<typeof mountRoom>) => expect(w.findAll('tbody tr').at(-2)?.text()).toContain('5')],
      ['the median', { ...DEFAULT_ROOM, settings: { showVotes: true, v: CURRENT_ROOM_VERSION } }, (w: ReturnType<typeof mountRoom>) => expect(w.findAll('tbody tr').at(-1)?.text()).toContain('5')],
    ])('excludes offline users from %s', async (_label, room, check) => {
      // Arrange
      const users = { [USER_ID]: onlineVoted(5), 'user-2': offline(55), 'user-3': offline() }

      // Act
      const wrapper = await mountJoinedRoom(room, users)

      // Assert
      check(wrapper)
    })

    it('treats users without a connected field as online', async () => {
      // Act
      const wrapper = await mountJoinedRoom(DEFAULT_ROOM, {
        [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 },
        'user-2': { name: 'Bob', joinedAt: 2 },
      })

      // Assert
      expect(wrapper.find('thead').text()).toContain('1/2')
      expect(wrapper.findAll('.user-offline')).toHaveLength(0)
    })

    it('dims offline rows and keeps their vote visible', async () => {
      // Act
      const wrapper = await mountJoinedRoom(DEFAULT_ROOM, {
        [USER_ID]: { name: 'Alice', joinedAt: 1 },
        'user-2': { name: 'Bob', joinedAt: 2, vote: 8, connected: false, lastSeen: 1 },
      })

      // Assert
      const offlineRows = wrapper.findAll('tr.user-offline')
      expect(offlineRows).toHaveLength(1)
      expect(offlineRows[0].text()).toContain('Bob')
      expect(offlineRows[0].find('.card-back-stub').exists()).toBe(true)
      expect(offlineRows[0].find('[aria-label="Offline"]').exists()).toBe(true)
    })

    it('disables vote cards, reveal and reset while offline', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom(DEFAULT_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 } })

      // Act
      connect(false)
      await wrapper.vm.$nextTick()

      // Assert
      const cards = wrapper.findAll('.vote-card-stub:not(.small)')
      expect(cards.every(card => card.attributes('disabled') !== undefined)).toBe(true)
      expect(findButton(wrapper, 'Reveal votes')?.attributes('disabled')).toBeDefined()
      expect(findButton(wrapper, 'Reset votes')?.attributes('disabled')).toBeDefined()
    })

    it.each([
      ['lost', false, 'Connection lost'],
      ['restored', true, 'Reconnected'],
    ])('shows the %s connection message', async (_label, finallyConnected, text) => {
      // Arrange
      const wrapper = await mountJoinedRoom()

      // Act
      connect(false)
      if (finallyConnected) {
        connect(true)
      }
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.text()).toContain(text)
    })
  })

  // ─── Vote column ──────────────────────────────────────────────────────────

  describe('vote column', () => {
    it('shows a card back when votes are hidden and the player has voted', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(DEFAULT_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 } })
      await wrapper.vm.$nextTick()

      // Assert
      const voteCol = wrapper.find('.vote-col')
      expect(voteCol.find('.card-back-stub').exists()).toBe(true)
      expect(voteCol.find('.vote-card-stub').exists()).toBe(false)
    })

    it('shows nothing when votes are hidden and the player has not voted', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(DEFAULT_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1 } })
      await wrapper.vm.$nextTick()

      // Assert
      const voteCol = wrapper.find('.vote-col')
      expect(voteCol.find('.card-back-stub').exists()).toBe(false)
      expect(voteCol.find('.vote-card-stub').exists()).toBe(false)
    })

    it('shows a small VoteCard with the vote value when votes are revealed', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(
        { ...DEFAULT_ROOM, settings: { showVotes: true, v: CURRENT_ROOM_VERSION } },
        { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 8 } },
      )
      await wrapper.vm.$nextTick()

      // Assert
      const card = wrapper.find('.vote-col .vote-card-stub.small')
      expect(card.exists()).toBe(true)
      expect(card.attributes('data-option')).toBe('8')
    })

    it('shows a dash when votes are revealed and the player has not voted', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(
        { ...DEFAULT_ROOM, settings: { showVotes: true, v: CURRENT_ROOM_VERSION } },
        { [USER_ID]: { name: 'Alice', joinedAt: 1 } },
      )
      await wrapper.vm.$nextTick()

      // Assert
      const voteCol = wrapper.find('.vote-col')
      expect(voteCol.text()).toContain('—')
      expect(voteCol.find('.vote-card-stub').exists()).toBe(false)
    })
  })

  // ─── Average & median ─────────────────────────────────────────────────────

  describe('average and median', () => {
    it.each([
      [[5, 13], 9],
      [[13, 21, 34], 22.67],
    ])('computes the average correctly for votes %j', async (votes, expectedAverage) => {
      // Arrange
      const users: Record<string, UserEntry> = {}
      for (const [i, v] of votes.entries()) {
        users[`u${i}`] = { name: `User ${i}`, joinedAt: i, vote: v }
      }
      const wrapper = mountRoom()
      await loadRoom({ ...DEFAULT_ROOM, settings: { showVotes: true, v: CURRENT_ROOM_VERSION } }, users)
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.text()).toContain(String(expectedAverage))
    })

    it.each([
      [[5, 8, 13], 8],
      [[1, 2, 5, 8], 3.5],
    ])('computes the median correctly for votes %j', async (votes, expectedMedian) => {
      // Arrange
      const users: Record<string, UserEntry> = {}
      for (const [i, v] of votes.entries()) {
        users[`u${i}`] = { name: `User ${i}`, joinedAt: i, vote: v }
      }
      const wrapper = mountRoom()
      await loadRoom({ ...DEFAULT_ROOM, settings: { showVotes: true, v: CURRENT_ROOM_VERSION } }, users)
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.text()).toContain(String(expectedMedian))
    })
  })

  // ─── Update banner ────────────────────────────────────────────────────────

  describe('update banner', () => {
    it('shows the banner when the room version is below the current version', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom({ ...DEFAULT_ROOM, settings: { showVotes: false, v: 1 } })
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.html()).toContain('This room is missing newer features')
    })

    it('does not show the banner when the room is up to date', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.html()).not.toContain('This room is missing newer features')
    })

    it('hides the banner and persists the dismissal version in localStorage', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom({ ...DEFAULT_ROOM, settings: { showVotes: false, v: 1 } })
      await wrapper.vm.$nextTick()

      // Act
      await wrapper.find('.alert-close').trigger('click')
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.html()).not.toContain('This room is missing newer features')
      expect(localStorage.getItem(`room_dismissed_v_${ROOM_ID}`)).toBe(String(CURRENT_ROOM_VERSION))
    })

    it('shows an upgrade room button in the update banner that opens the settings dialog', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom({ ...DEFAULT_ROOM, settings: { showVotes: false, v: 1 } })
      const upgradeButton = findButton(wrapper, 'Upgrade room')

      // Act
      await upgradeButton!.trigger('click')

      // Assert
      expect(wrapper.text()).toContain('the link stays the same')
      expect(wrapper.text()).not.toContain('create a new room')
      expect(findSettingsDialog(wrapper).exists()).toBe(true)
    })

    it('hides the update banner once the room is upgraded', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom({ ...DEFAULT_ROOM, settings: { showVotes: false, v: 1 } })

      // Act
      await loadRoom(DEFAULT_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1 } })
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.html()).not.toContain('This room is missing newer features')
    })
  })

  // ─── Room settings ────────────────────────────────────────────────────────

  describe('room settings', () => {
    const SETTINGS_ROOM = {
      ...DEFAULT_ROOM,
      settings: { showVotes: false, v: CURRENT_ROOM_VERSION, cards: [1, 2, 3], targetDuration: 300 },
    }

    it.each([
      [true, false],
      [false, true],
    ])('enables the settings button when canAct is %s (disabled=%s)', async (canAct, disabled) => {
      // Arrange
      const wrapper = await mountJoinedRoom(SETTINGS_ROOM)

      // Act
      if (!canAct) {
        connect(false)
      }
      await wrapper.vm.$nextTick()
      await findSettingsButton(wrapper).trigger('click')

      // Assert
      expect(findSettingsButton(wrapper).attributes('disabled') !== undefined).toBe(disabled)
      expect(findSettingsDialog(wrapper).exists()).toBe(canAct)
    })

    it('passes the current room settings to the dialog', async () => {
      // Arrange
      const wrapper = await mountJoinedRoom(SETTINGS_ROOM)

      // Act
      await findSettingsButton(wrapper).trigger('click')

      // Assert
      expect(wrapper.findComponent({ name: 'RoomSettingsDialog' }).props('settings')).toEqual({
        name: SETTINGS_ROOM.name,
        cards: [1, 2, 3],
        targetDuration: 300,
        ceilingDuration: undefined,
      })
    })

    it('shows the reload alert and disables settings when the room version is newer than the client', async () => {
      // Arrange
      const reload = vi.fn()
      vi.stubGlobal('location', { ...window.location, reload })
      const wrapper = await mountJoinedRoom({ ...DEFAULT_ROOM, settings: { showVotes: false, v: CURRENT_ROOM_VERSION + 1 } })

      // Act
      await findButton(wrapper, 'Reload')!.trigger('click')

      // Assert
      expect(wrapper.text()).toContain('updated by a newer version of Poker0matic')
      expect(findSettingsButton(wrapper).attributes('disabled')).toBeDefined()
      expect(reload).toHaveBeenCalledOnce()
    })

    it('does not show the reload alert when the room is up to date', async () => {
      // Act
      const wrapper = await mountJoinedRoom(SETTINGS_ROOM)

      // Assert
      expect(wrapper.text()).not.toContain('updated by a newer version of Poker0matic')
    })

    it.each([
      ['updated', 'closes the dialog and shows the saved snackbar', false, false, 'Room settings saved'],
      ['unchanged', 'closes the dialog without a snackbar', false, false, null],
      ['conflict', 'keeps the dialog open in conflict mode', true, true, null],
      ['unsupported', 'shows the error snackbar', true, false, 'Could not save the room settings'],
      ['error', 'shows the error snackbar', true, false, 'Could not save the room settings'],
    ])('handles a %s result: %s', async (result, _label, staysOpen, conflict, snackbar) => {
      // Arrange
      const users = { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 2 } }
      const wrapper = await mountJoinedRoom(SETTINGS_ROOM, users)
      await findSettingsButton(wrapper).trigger('click')
      const baseline = { name: SETTINGS_ROOM.name, cards: [1, 2, 3], targetDuration: 300 }
      const next = { ...baseline, name: faker.word.noun() }
      mockUpdateRoomSettings.mockResolvedValueOnce(result)

      // Act
      wrapper.findComponent({ name: 'RoomSettingsDialog' }).vm.$emit('save', { baseline, next })
      await flushPromises()

      // Assert
      expect(mockUpdateRoomSettings).toHaveBeenCalledWith(ROOM_ID, baseline, next, users)
      expect(findSettingsDialog(wrapper).exists()).toBe(staysOpen)
      if (staysOpen) {
        expect(findSettingsDialog(wrapper).attributes('data-conflict')).toBe(String(conflict))
        expect(findSettingsDialog(wrapper).attributes('data-saving')).toBe('false')
      }
      const snackbarTexts = wrapper.findAll('[data-testid="snackbar"]').map(node => node.text())
      expect(snackbarTexts).toEqual(snackbar ? [expect.stringContaining(snackbar)] : [])
    })

    it('shows the updated-by-other snackbar when the room settings change remotely but not on initial load', async () => {
      // Arrange
      const users = { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 2 } }
      const wrapper = await mountJoinedRoom(SETTINGS_ROOM, users)
      const shownOnLoad = wrapper.text().includes('Room settings were updated')
      await loadRoom(SETTINGS_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 3 } })
      await wrapper.vm.$nextTick()
      const shownOnVote = wrapper.text().includes('Room settings were updated')

      // Act
      await loadRoom({ ...SETTINGS_ROOM, name: faker.word.noun() }, users)
      await wrapper.vm.$nextTick()

      // Assert
      expect(shownOnLoad).toBe(false)
      expect(shownOnVote).toBe(false)
      expect(wrapper.text()).toContain('Room settings were updated')
    })

    it('resets the elapsed timer when the deck changes remotely', async () => {
      // Arrange
      vi.useFakeTimers()
      const wrapper = await mountJoinedRoom(SETTINGS_ROOM)
      vi.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      const timerBefore = wrapper.text().includes('Time since reset: 00:00')

      // Act
      await loadRoom({ ...SETTINGS_ROOM, settings: { ...SETTINGS_ROOM.settings, cards: [5, 8] } })
      await wrapper.vm.$nextTick()

      // Assert
      expect(timerBefore).toBe(false)
      expect(wrapper.text()).toContain('Time since reset: 00:00')
      wrapper.unmount()
    })
  })

  // ─── Room not found ───────────────────────────────────────────────────────

  describe('room not found', () => {
    it('shows the not-found snackbar when Firebase returns null', async () => {
      // Arrange
      const wrapper = mountRoom()

      // Act
      roomCallback?.({ val: () => null })
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.find('[data-testid="snackbar"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Room not found')
    })
  })
})
