import { faker } from '@faker-js/faker'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { CURRENT_ROOM_VERSION } from '@/config/roomVersions'
import { useConfigStore } from '@/stores/config'
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
const mockWatchConnection = vi.hoisted(() => vi.fn())
const mockForceReconnect = vi.hoisted(() => vi.fn())
vi.mock('@/stores/room', () => ({
  useRoomStore: () => ({
    watchConnection: mockWatchConnection,
    forceReconnect: mockForceReconnect,
    castVote: mockCastVote,
    revealVotes: mockRevealVotes,
    resetVotes: mockResetVotes,
    joinRoom: mockJoinRoom,
    resetTimer: mockResetTimer,
    updateUsername: mockUpdateUsername,
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

type UserEntry = { name: string, joinedAt: number, vote?: number | string }

// Captured Firebase callbacks
let roomCallback: ((snapshot: { val: () => unknown }) => void) | null = null
let usersCallback: ((snapshot: { val: () => unknown }) => void) | null = null
let connectionCallback: ((connected: boolean) => void) | null = null
let connectionUnsubscribe: ReturnType<typeof vi.fn>
let firstJoinedAt: number

enableAutoUnmount(afterEach)

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
    connectionUnsubscribe = vi.fn()
    firstJoinedAt = faker.date.past().getTime()

    mockWatchConnection.mockImplementation((cb: (connected: boolean) => void) => {
      connectionCallback = cb
      return connectionUnsubscribe
    })
    mockJoinRoom.mockReturnValue(firstJoinedAt)

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

  afterEach(() => vi.clearAllMocks())

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
            template: '<button class="vote-card-stub" :class="{ small }" :data-option="String(option)" :data-selected="String(selected)" @click="$emit(\'click\')" />',
            props: { option: [Number, String], voteOptions: Array, selected: Boolean, small: Boolean, readonly: Boolean },
            emits: ['click'],
          },
          CardBack: {
            template: '<div class="card-back-stub" />',
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
                  <tr v-for="item in items" :key="item.userId" class="data-row">
                    <td class="name-col">{{ item.name }}</td>
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
    roomCallback?.({ val: () => roomData })
    usersCallback?.({ val: () => usersData })
  }

  async function setConnected (value: boolean) {
    connectionCallback?.(value)
    await nextTick()
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
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()

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
      const wrapper = mountRoom()
      await loadRoom(DEFAULT_ROOM, { [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 } })
      await wrapper.vm.$nextTick()

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
    it('calls resetVotes with the room id and all user ids', async () => {
      // Arrange
      const wrapper = mountRoom()
      await loadRoom(DEFAULT_ROOM, {
        [USER_ID]: { name: 'Alice', joinedAt: 1, vote: 5 },
        'user-2': { name: 'Bob', joinedAt: 2, vote: 8 },
      })
      await wrapper.vm.$nextTick()

      // Act
      const resetBtn = wrapper.findAll('button').find(b => b.text().includes('Reset votes'))
      await resetBtn!.trigger('click')

      // Assert
      expect(mockResetVotes).toHaveBeenCalledWith(
        ROOM_ID,
        expect.arrayContaining([USER_ID, 'user-2']),
      )
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
  // ─── Connection state ─────────────────────────────────────────────────────

  describe('connection state', () => {
    it('does not show the connection-lost alert before the first connection', async () => {
      // Arrange
      const wrapper = mountRoom()

      // Act
      await loadRoom()
      await setConnected(false)

      // Assert
      expect(wrapper.text()).not.toContain('Connection lost')
    })

    it('shows the connection-lost alert when the connection drops after being connected and hides it once restored', async () => {
      // Arrange
      const wrapper = mountRoom()
      await setConnected(true)
      await loadRoom()

      // Act
      await setConnected(false)
      const textWhileOffline = wrapper.text()
      await setConnected(true)

      // Assert
      expect(textWhileOffline).toContain('Connection lost')
      expect(wrapper.text()).not.toContain('Connection lost')
      expect(wrapper.text()).toContain('Reconnected')
    })

    it('unsubscribes from the connection listener on unmount', () => {
      // Arrange
      const wrapper = mountRoom()

      // Act
      wrapper.unmount()

      // Assert
      expect(mockWatchConnection).toHaveBeenCalledTimes(1)
      expect(connectionUnsubscribe).toHaveBeenCalledTimes(1)
    })
  })

  // ─── Presence restoration ─────────────────────────────────────────────────

  describe('presence restoration', () => {
    it('rejoins with the original joinedAt from the first room snapshot after the connection is restored', async () => {
      // Arrange
      const self = { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt } }
      mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: self })

      // Act
      await setConnected(false)
      await setConnected(true)
      const callsBeforeSnapshot = mockJoinRoom.mock.calls.length
      await loadRoom({ ...DEFAULT_ROOM, users: self })

      // Assert
      expect(callsBeforeSnapshot).toBe(1)
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
      expect(mockJoinRoom).toHaveBeenLastCalledWith(ROOM_ID, expect.objectContaining({ joinedAt: firstJoinedAt }))
    })

    it('does not re-send a vote from a reset round when the fresh snapshot arrives after reconnecting', async () => {
      // Arrange
      const wrapper = mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt } } })
      const card = wrapper.findAll('.vote-card-stub:not(.small)').find(c => c.attributes('data-option') === '5')
      await card!.trigger('click')

      // Act
      await setConnected(false)
      await setConnected(true)
      const callsBeforeSnapshot = mockJoinRoom.mock.calls.length
      await loadRoom({ ...DEFAULT_ROOM, resetAt: faker.number.int({ min: 2_000_000 }) })

      // Assert
      expect(callsBeforeSnapshot).toBe(1)
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
      expect(mockJoinRoom.mock.lastCall?.[1].vote).toBeUndefined()
    })

    it('restores a vote seen in a server snapshot without a click in this page instance', async () => {
      // Arrange
      mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt, vote: 5 } } })

      // Act
      await setConnected(false)
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: {} })

      // Assert
      expect(mockCastVote).not.toHaveBeenCalled()
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
      expect(mockJoinRoom.mock.lastCall?.[1].vote).toBe(5)
    })

    it('forgets the last vote once a server snapshot shows it was cleared', async () => {
      // Arrange
      mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt, vote: 5 } } })

      // Act
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt } } })
      await loadRoom({ ...DEFAULT_ROOM, users: {} })

      // Assert
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
      expect(mockJoinRoom.mock.lastCall?.[1].vote).toBeUndefined()
    })

    it('does not rejoin after the room is deleted, even when the connection flaps', async () => {
      // Arrange
      const wrapper = mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt } } })

      // Act
      roomCallback?.({ val: () => null })
      await setConnected(false)
      await setConnected(true)

      // Assert
      expect(mockJoinRoom).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.vote-card-stub').exists()).toBe(false)
    })

    it('rejoins when a room snapshot no longer contains the current user while connected', async () => {
      // Arrange
      mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt } } })

      // Act
      await loadRoom({ ...DEFAULT_ROOM, users: { [faker.string.uuid()]: { name: faker.person.firstName(), joinedAt: 1 } } })

      // Assert
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
      expect(mockJoinRoom).toHaveBeenLastCalledWith(ROOM_ID, expect.objectContaining({ joinedAt: firstJoinedAt }))
    })

    it.each([
      ['same round', 1_000_000, 5],
      ['after a reset', 2_000_000, undefined],
    ])('restores the last vote on rejoin only within the same round (%s)', async (_label, resetAt, expectedVote) => {
      // Arrange
      const wrapper = mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt } } })
      await nextTick()
      const card = wrapper.findAll('.vote-card-stub:not(.small)').find(c => c.attributes('data-option') === '5')
      await card!.trigger('click')

      // Act
      await loadRoom({ ...DEFAULT_ROOM, resetAt })

      // Assert
      expect(mockCastVote).toHaveBeenCalledWith(ROOM_ID, 5)
      expect(mockJoinRoom).toHaveBeenCalledTimes(2)
      expect(mockJoinRoom.mock.lastCall?.[1].vote).toBe(expectedVote)
    })

    it.each([
      ['the room is not found', null],
      ['the user has not joined yet', DEFAULT_ROOM],
    ])('does not rejoin when %s', async (_label, roomData) => {
      // Arrange
      if (roomData) {
        configStore.setUsername('')
      }
      mountRoom()
      await setConnected(true)

      // Act
      roomCallback?.({ val: () => roomData })
      await setConnected(false)
      await setConnected(true)
      roomCallback?.({ val: () => roomData })

      // Assert
      expect(mockJoinRoom).not.toHaveBeenCalled()
    })

    it('does not rejoin while disconnected', async () => {
      // Arrange
      mountRoom()
      await setConnected(true)
      await loadRoom({ ...DEFAULT_ROOM, users: { [USER_ID]: { name: 'Alice', joinedAt: firstJoinedAt } } })

      // Act
      await setConnected(false)
      await loadRoom()

      // Assert
      expect(mockJoinRoom).toHaveBeenCalledTimes(1)
    })
  })

  // ─── Fast reconnect on tab return ─────────────────────────────────────────

  describe('fast reconnect on tab return', () => {
    const HIDDEN_THRESHOLD_MS = 30_000
    let visibilityState: DocumentVisibilityState

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      visibilityState = 'visible'
      vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    function changeVisibility (state: DocumentVisibilityState) {
      visibilityState = state
      document.dispatchEvent(new Event('visibilitychange'))
    }

    function hideFor (ms: number) {
      changeVisibility('hidden')
      vi.setSystemTime(Date.now() + ms)
      changeVisibility('visible')
    }

    it('calls forceReconnect when the tab becomes visible after being hidden past the threshold', async () => {
      // Arrange
      mountRoom()
      await setConnected(true)
      await loadRoom()

      // Act
      hideFor(HIDDEN_THRESHOLD_MS)

      // Assert
      expect(mockForceReconnect).toHaveBeenCalledTimes(1)
    })

    it.each<[string, number, boolean, boolean]>([
      ['the tab was hidden for less than the threshold', HIDDEN_THRESHOLD_MS - 1, true, true],
      ['the connection is already lost', HIDDEN_THRESHOLD_MS, true, false],
      ['the user has not joined', HIDDEN_THRESHOLD_MS, false, true],
    ])('does not call forceReconnect when %s', async (_label, hiddenMs, hasUsername, connected) => {
      // Arrange
      if (!hasUsername) {
        configStore.setUsername('')
      }
      mountRoom()
      await setConnected(true)
      await loadRoom()
      await setConnected(connected)

      // Act
      hideFor(hiddenMs)

      // Assert
      expect(mockForceReconnect).not.toHaveBeenCalled()
    })

    it('does not call forceReconnect when the tab only becomes hidden', async () => {
      // Arrange
      mountRoom()
      await setConnected(true)
      await loadRoom()

      // Act
      changeVisibility('hidden')

      // Assert
      expect(mockForceReconnect).not.toHaveBeenCalled()
    })

    it('removes the visibilitychange listener on unmount', async () => {
      // Arrange
      const wrapper = mountRoom()
      await setConnected(true)
      await loadRoom()

      // Act
      wrapper.unmount()
      hideFor(HIDDEN_THRESHOLD_MS)

      // Assert
      expect(mockForceReconnect).not.toHaveBeenCalled()
    })
  })
})
