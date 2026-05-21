import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IndexPage from '../index.vue'

const mockPush = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' },
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn().mockReturnValue({}),
}))

describe('pages/index', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the create room button and the join room form', () => {
    const wrapper = mount(IndexPage)
    expect(wrapper.html()).toContain('Create a room')
    expect(wrapper.html()).toContain('Join room')
  })

  it('navigates to the room route with the trimmed code on form submit', async () => {
    // Arrange
    const wrapper = mount(IndexPage)

    // Act
    await wrapper.find('input').setValue('  abc123  ')
    await wrapper.find('form').trigger('submit')

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/rooms/abc123')
  })

  it('does not navigate when the room code is blank', async () => {
    // Arrange
    const wrapper = mount(IndexPage)

    // Act
    await wrapper.find('input').setValue('   ')
    await wrapper.find('form').trigger('submit')

    // Assert
    expect(mockPush).not.toHaveBeenCalled()
  })
})
