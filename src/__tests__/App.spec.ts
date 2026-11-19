import { faker } from '@faker-js/faker'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'

const route = vi.hoisted(() => ({ meta: {} as Record<string, unknown> }))
vi.mock('vue-router', () => ({ useRoute: () => route }))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn().mockReturnValue({}),
}))

describe('App', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  function mountApp () {
    return mount(App, {
      global: {
        stubs: {
          LocaleSwitcher: { template: '<div class="locale-switcher-stub" />' },
          UserMenu: { template: '<div class="user-menu-stub" />' },
          RouterView: { template: '<div class="router-view-stub" />' },
        },
      },
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    route.meta = {}
    fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ stargazers_count: faker.number.int({ max: 500 }) }) })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it.each([
    ['hides', true, false],
    ['shows', false, true],
    ['shows', undefined, true],
  ])('%s the toolbar when route meta presenter is %s', async (_label, presenter, visible) => {
    // Arrange
    route.meta = presenter === undefined ? {} : { presenter }

    // Act
    const wrapper = mountApp()
    await flushPromises()

    // Assert
    expect(wrapper.find('.v-toolbar').exists()).toBe(visible)
    expect(wrapper.find('.user-menu-stub').exists()).toBe(visible)
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })
})
