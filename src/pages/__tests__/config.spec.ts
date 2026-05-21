import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfigStore } from '@/stores/config'
import ConfigPage from '../config.vue'

const mockPush = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  RouterLink: { template: '<a><slot /></a>' },
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn().mockReturnValue({}),
}))

describe('pages/config', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not show the error alert by default', () => {
    const wrapper = mount(ConfigPage)
    expect(wrapper.html()).not.toContain('No Firebase configuration found')
  })

  it('shows the error alert when showError prop is true', () => {
    const wrapper = mount(ConfigPage, { props: { showError: true } })
    expect(wrapper.html()).toContain('No Firebase configuration found')
  })

  it('pre-fills form fields when a firebase config is already stored', () => {
    // Arrange
    const store = useConfigStore()
    const domain = faker.internet.domainName()
    store.firebaseConfig = { apiKey: 'k', authDomain: domain, databaseUrl: 'u', projectId: 'p', storageBucket: 's', messagingSenderId: 'm', appId: 'a' }
    store.configFound = true

    // Act
    const wrapper = mount(ConfigPage)

    // Assert
    expect(wrapper.html()).toContain(domain)
  })

  it('calls saveFirebaseConfig and navigates to / on form submit', async () => {
    // Arrange
    const store = useConfigStore()
    const saveSpy = vi.spyOn(store, 'saveFirebaseConfig')
    const wrapper = mount(ConfigPage)
    const inputs = wrapper.findAll('input')
    for (const input of inputs) {
      await input.setValue(faker.string.alphanumeric(10))
    }

    // Act
    await wrapper.find('form').trigger('submit')

    // Assert
    expect(saveSpy).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
