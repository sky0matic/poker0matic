import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
const mockUpdateUserName = vi.hoisted(() => vi.fn())
vi.mock('@/stores/room', () => ({
  useRoomStore: () => ({
    castVote: mockCastVote,
    revealVotes: mockRevealVotes,
    resetVotes: mockResetVotes,
    joinRoom: mockJoinRoom,
    resetTimer: mockResetTimer,
    updateUserName: mockUpdateUserName,
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

describe('pages/room', () => {
  let configStore: ReturnType<typeof useConfigStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    configStore = useConfigStore()
    configStore.saveFirebaseConfig(FAKE_FIREBASE_CONFIG)
    configStore.setUserName('Alice')
    configStore.userId = USER_ID
    roomCallback = null
    usersCallback = null

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

  // ─── Name prompt ──────────────────────────────────────────────────────────

  describe('name prompt', () => {
    it('shows the join dialog when userName is empty', () => {
      // Arrange
      configStore.setUserName('')

      // Act
      const wrapper = mountRoom()

      // Assert
      expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(true)
    })

    it('hides the join dialog when userName is already set', async () => {
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
    it('calls setUserName with the trimmed name and hides the dialog', async () => {
      // Arrange
      configStore.setUserName('')
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()
      const setUserNameSpy = vi.spyOn(configStore, 'setUserName')

      // Act
      await wrapper.find('input').setValue('  Bob  ')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      // Assert
      expect(setUserNameSpy).toHaveBeenCalledWith('Bob')
      expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(false)
    })

    it('does not submit when the name is blank', async () => {
      // Arrange
      configStore.setUserName('')
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()
      const setUserNameSpy = vi.spyOn(configStore, 'setUserName')

      // Act
      await wrapper.find('input').setValue('   ')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      // Assert
      expect(setUserNameSpy).not.toHaveBeenCalled()
      expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(true)
    })

    it('truncates the name to 20 characters', async () => {
      // Arrange
      configStore.setUserName('')
      const wrapper = mountRoom()
      await loadRoom()
      await wrapper.vm.$nextTick()
      const setUserNameSpy = vi.spyOn(configStore, 'setUserName')

      // Act
      await wrapper.find('input').setValue('A'.repeat(30))
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      // Assert
      expect(setUserNameSpy).toHaveBeenCalledWith('A'.repeat(20))
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
})
