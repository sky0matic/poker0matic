import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OPENER_POLL_INTERVAL_MS } from '@/composables/useCloseWithOpener'
import { CURRENT_ROOM_VERSION } from '@/config/roomVersions'
import { useConfigStore } from '@/stores/config'
import PresenterPage from '../presenter.vue'

// --- Firebase mocks ---
const firebase = vi.hoisted(() => ({
  ref: vi.fn(),
  onValue: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  runTransaction: vi.fn(),
  onDisconnect: vi.fn(),
}))
vi.mock('firebase/database', () => ({ ...firebase, getDatabase: vi.fn().mockReturnValue({}) }))
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))

// --- Room store mock: the presenter page must never use it ---
const mockUseRoomStore = vi.hoisted(() => vi.fn())
vi.mock('@/stores/room', () => ({ useRoomStore: mockUseRoomStore }))

// --- Router mock ---
const router = vi.hoisted(() => ({ roomId: '', replace: vi.fn(), push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { roomId: router.roomId }, meta: { presenter: true } }),
  useRouter: () => ({ replace: router.replace, push: router.push }),
}))

const FAKE_FIREBASE_CONFIG = {
  apiKey: 'test-key', authDomain: 'test.firebaseapp.com', databaseUrl: 'https://test.firebaseio.com',
  projectId: 'test', storageBucket: 'test.appspot.com', messagingSenderId: '1', appId: '1:1:web:abc',
}

type UserEntry = { name: string, joinedAt: number, vote?: number | string, connected?: boolean }
type SnapshotCallback = (snapshot: { val: () => unknown }) => void

describe('pages/presenter', () => {
  let configStore: ReturnType<typeof useConfigStore>
  let roomId: string
  let roomName: string
  let selfId: string
  let roomCallback: SnapshotCallback | null
  let usersCallback: SnapshotCallback | null
  let unsubscribeRoom: ReturnType<typeof vi.fn>
  let unsubscribeUsers: ReturnType<typeof vi.fn>

  function mountPresenter () {
    return mount(PresenterPage, {
      global: {
        stubs: {
          VDialog: { template: '<div data-testid="dialog" v-if="modelValue"><slot /></div>', props: ['modelValue'] },
          VTooltip: { template: '<div><slot name="activator" v-bind="{ props: {} }" /><slot /></div>' },
          VoteCard: {
            template: '<div class="vote-card-stub" :class="{ small }" :data-option="String(option)" />',
            props: { option: [Number, String], voteOptions: Array, selected: Boolean, small: Boolean, readonly: Boolean, disabled: Boolean },
          },
          CardBack: { template: '<div class="card-back-stub" />' },
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

  function makeRoom (showVotes = false, extra: Record<string, unknown> = {}) {
    return { name: roomName, createdAt: Date.now(), createdBy: selfId, settings: { showVotes, v: CURRENT_ROOM_VERSION }, ...extra }
  }

  async function loadRoom (
    wrapper: ReturnType<typeof mountPresenter>,
    roomData: Record<string, unknown> | null,
    usersData: Record<string, UserEntry> = {},
  ) {
    roomCallback?.({ val: () => (roomData ? { ...roomData, users: usersData } : null) })
    usersCallback?.({ val: () => usersData })
    await wrapper.vm.$nextTick()
  }

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    roomId = faker.string.alphanumeric(10)
    roomName = faker.word.words(2)
    selfId = faker.string.uuid()
    router.roomId = roomId
    configStore = useConfigStore()
    configStore.saveFirebaseConfig(FAKE_FIREBASE_CONFIG)
    configStore.setUsername(faker.person.firstName())
    configStore.userId = selfId
    roomCallback = null
    usersCallback = null
    unsubscribeRoom = vi.fn()
    unsubscribeUsers = vi.fn()

    firebase.ref.mockImplementation((_db: unknown, path: string) => ({ _path: path }))
    firebase.onValue.mockImplementation((ref: { _path: string }, cb: SnapshotCallback) => {
      if (ref._path.endsWith('/users')) {
        usersCallback = cb
        return unsubscribeUsers
      }
      roomCallback = cb
      return unsubscribeRoom
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Object.defineProperty(window, 'opener', { configurable: true, writable: true, value: null })
    vi.clearAllMocks()
  })

  it('subscribes read-only to the room and users nodes', () => {
    // Act
    mountPresenter()

    // Assert
    expect(firebase.ref.mock.calls.map(([, path]) => path)).toEqual([`rooms/${roomId}`, `rooms/${roomId}/users`])
    expect(firebase.onValue).toHaveBeenCalledTimes(2)
  })

  it('never writes to Firebase while rendering, revealing and resetting', async () => {
    // Arrange
    const voter = { name: faker.person.firstName(), joinedAt: 1, vote: 5 }
    const wrapper = mountPresenter()

    // Act
    await loadRoom(wrapper, makeRoom(false), { [selfId]: { name: faker.person.firstName(), joinedAt: 0 } })
    await loadRoom(wrapper, makeRoom(false), { [selfId]: voter })
    await loadRoom(wrapper, makeRoom(true, { settings: { showVotes: true, v: CURRENT_ROOM_VERSION, revealedAt: Date.now() } }), { [selfId]: voter })
    await loadRoom(wrapper, makeRoom(false, { resetAt: Date.now() }), { [selfId]: { name: voter.name, joinedAt: 1 } })
    wrapper.unmount()

    // Assert
    expect(firebase.set).not.toHaveBeenCalled()
    expect(firebase.update).not.toHaveBeenCalled()
    expect(firebase.runTransaction).not.toHaveBeenCalled()
    expect(firebase.onDisconnect).not.toHaveBeenCalled()
    expect(mockUseRoomStore).not.toHaveBeenCalled()
    expect(configStore.activeRoomId).toBeNull()
  })

  it('does not show the name dialog when the username is empty', async () => {
    // Arrange
    configStore.setUsername('')
    const wrapper = mountPresenter()

    // Act
    await loadRoom(wrapper, makeRoom())

    // Assert
    expect(wrapper.find('[data-testid="dialog"]').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain(roomName)
  })

  it('renders no voting cards and no reveal, reset or settings controls', async () => {
    // Arrange
    const wrapper = mountPresenter()

    // Act
    await loadRoom(wrapper, makeRoom(), { [selfId]: { name: faker.person.firstName(), joinedAt: 1 } })

    // Assert
    expect(wrapper.findAll('.vote-card-stub')).toHaveLength(0)
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Reveal votes')
    expect(wrapper.text()).not.toContain('Reset votes')
    expect(wrapper.find('[aria-label="Room settings"]').exists()).toBe(false)
  })

  it.each([
    ['Votes hidden', 'hidden', false],
    ['Votes revealed', 'revealed', true],
  ])('shows the %s chip when votes are %s', async (expected, _label, showVotes) => {
    // Arrange
    const wrapper = mountPresenter()

    // Act
    await loadRoom(wrapper, makeRoom(showVotes))

    // Assert
    expect(wrapper.find('.reveal-state').text()).toBe(expected)
    expect(wrapper.text()).toContain('Presenter view')
  })

  it('shows card backs before reveal and votes with average and median after reveal', async () => {
    // Arrange
    const users = {
      a: { name: faker.person.firstName(), joinedAt: 1, vote: 3 },
      b: { name: faker.person.firstName(), joinedAt: 2, vote: 8 },
    }
    const wrapper = mountPresenter()
    await loadRoom(wrapper, makeRoom(false), users)
    const backsBefore = wrapper.findAll('.card-back-stub').length
    const statsBefore = wrapper.findAll('tbody tr').slice(-2).map(row => row.text())

    // Act
    await loadRoom(wrapper, makeRoom(true), users)

    // Assert
    expect(backsBefore).toBe(2)
    expect(statsBefore).toEqual(['Average-', 'Median-'])
    expect(wrapper.findAll('.card-back-stub')).toHaveLength(0)
    expect(wrapper.findAll('.vote-card-stub.small').map(card => card.attributes('data-option'))).toEqual(['3', '8'])
    expect(wrapper.findAll('tbody tr').slice(-2).map(row => row.text())).toEqual(['Average5.5', 'Median5.5'])
    expect(wrapper.find('thead').text()).toContain('2/2')
  })

  it('does not mark the current user row', async () => {
    // Arrange
    const wrapper = mountPresenter()

    // Act
    await loadRoom(wrapper, makeRoom(), { [selfId]: { name: faker.person.firstName(), joinedAt: 1 } })

    // Assert
    const row = wrapper.find('tr.data-row')
    expect(row.classes()).not.toContain('font-weight-bold')
    expect(row.text()).not.toContain('(You)')
  })

  it('shows the not-found message without redirecting when the room is missing', async () => {
    // Arrange
    vi.useFakeTimers()
    const wrapper = mountPresenter()

    // Act
    await loadRoom(wrapper, null)
    vi.advanceTimersByTime(5000)

    // Assert
    expect(wrapper.text()).toContain('Room not found.')
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('closes the window when the opener closes', () => {
    // Arrange
    vi.useFakeTimers()
    let opener: { closed: boolean } | null = { closed: false }
    Object.defineProperty(window, 'opener', { configurable: true, get: () => opener })
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
    const wrapper = mountPresenter()
    vi.advanceTimersByTime(OPENER_POLL_INTERVAL_MS)
    const closedWhileOpen = closeSpy.mock.calls.length

    // Act
    opener = { closed: true }
    vi.advanceTimersByTime(OPENER_POLL_INTERVAL_MS)

    // Assert
    expect(closedWhileOpen).toBe(0)
    expect(closeSpy).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('unsubscribes both listeners on unmount', () => {
    // Arrange
    vi.useFakeTimers()
    Object.defineProperty(window, 'opener', { configurable: true, get: () => ({ closed: false }) })
    const setSpy = vi.spyOn(globalThis, 'setInterval')
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const wrapper = mountPresenter()
    const intervalIds = setSpy.mock.results.map(result => result.value)

    // Act
    wrapper.unmount()

    // Assert
    expect(intervalIds).toHaveLength(2)
    expect(clearSpy.mock.calls.map(([id]) => id)).toEqual(expect.arrayContaining(intervalIds))
    expect(unsubscribeRoom).toHaveBeenCalledOnce()
    expect(unsubscribeUsers).toHaveBeenCalledOnce()
  })
})
