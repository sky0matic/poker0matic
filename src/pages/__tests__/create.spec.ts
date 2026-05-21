import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfigStore } from '@/stores/config'
import CreatePage from '../create.vue'

const mockPush = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  RouterLink: { template: '<a><slot /></a>' },
}))

const mockCreateRoom = vi.hoisted(() => vi.fn().mockReturnValue('new-room-id'))
const mockJoinRoom = vi.hoisted(() => vi.fn())
vi.mock('@/stores/room', () => ({
  useRoomStore: () => ({ createRoom: mockCreateRoom, joinRoom: mockJoinRoom }),
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn().mockReturnValue({}),
}))

vi.mock('vuedraggable', () => ({
  default: { template: '<div><slot name="item" v-for="(el, i) in modelValue" :element="el" :index="i" /></div>', props: ['modelValue', 'itemKey', 'animation', 'tag'] },
}))

describe('pages/create', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the room name and user name inputs', () => {
    const wrapper = mount(CreatePage)
    expect(wrapper.html()).toContain('Room name')
    expect(wrapper.html()).toContain('Your name')
  })

  it('pre-fills the name field with the stored userName', () => {
    // Arrange
    useConfigStore().setUserName('Alice')

    // Act
    const wrapper = mount(CreatePage)

    // Assert
    expect(wrapper.findAll('input')[0].element.value).toBe('Alice')
  })

  describe('createRoom', () => {
    it('does not navigate when required fields are blank', async () => {
      const wrapper = mount(CreatePage)
      await wrapper.find('form').trigger('submit')
      expect(mockCreateRoom).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('calls createRoom, joinRoom and navigates when all required fields are filled', async () => {
      // Arrange
      const wrapper = mount(CreatePage)
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue(faker.person.firstName())
      await inputs[1].setValue(faker.word.noun())

      // Act
      await wrapper.find('form').trigger('submit')

      // Assert
      expect(mockCreateRoom).toHaveBeenCalledOnce()
      expect(mockJoinRoom).toHaveBeenCalledWith('new-room-id')
      expect(mockPush).toHaveBeenCalledWith('/rooms/new-room-id')
    })

    it.each([
      ['5', '', 300, undefined],
      ['', '10', undefined, 600],
    ])('converts targetMinutes=%s ceilingMinutes=%s to seconds correctly', async (targetMin, ceilingMin, expectedTarget, expectedCeiling) => {
      // Arrange
      const wrapper = mount(CreatePage)
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue(faker.person.firstName())
      await inputs[1].setValue(faker.word.noun())
      // inputs[2] is "Add card" — skip it; inputs[3] = target, inputs[4] = ceiling
      await inputs[3].setValue(targetMin)
      await inputs[4].setValue(ceilingMin)

      // Act
      await wrapper.find('form').trigger('submit')

      // Assert
      expect(mockCreateRoom).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expectedTarget,
        expectedCeiling,
      )
    })
  })
})
