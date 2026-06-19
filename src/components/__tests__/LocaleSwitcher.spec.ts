import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LocaleSwitcher from '../LocaleSwitcher.vue'

const mockSetLocale = vi.hoisted(() => vi.fn())
vi.mock('@/plugins/i18n', () => ({
  setLocale: mockSetLocale,
  availableLocales: [
    { code: 'en', flagSvg: '/us.svg', nativeName: 'English' },
    { code: 'fr-CA', flagSvg: '/ca.svg', nativeName: 'Français' },
    { code: 'es', flagSvg: '/es.svg', nativeName: 'Español' },
  ],
}))

describe('LocaleSwitcher', () => {
  function mountLocaleSwitcher () {
    return mount(LocaleSwitcher, {
      attachTo: document.body,
      global: {
        stubs: {
          VMenu: { template: '<div><slot name="activator" v-bind="{ props: {} }" /><slot /></div>' },
        },
      },
    })
  }

  beforeEach(() => {
    mockSetLocale.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the current locale flag img in the activator button', () => {
    // Act
    const wrapper = mountLocaleSwitcher()

    // Assert — default locale in tests is 'en', flagSvg '/us.svg'
    const img = wrapper.find('button img.locale-flag')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/us.svg')
  })

  it('renders a list item for each available locale', () => {
    // Act
    const wrapper = mountLocaleSwitcher()
    const items = wrapper.findAll('.v-list-item')

    // Assert
    expect(items).toHaveLength(3)
    expect(wrapper.text()).toContain('English')
    expect(wrapper.text()).toContain('Français')
    expect(wrapper.text()).toContain('Español')
  })

  it('calls setLocale with the chosen locale code when a list item is clicked', async () => {
    // Arrange
    const wrapper = mountLocaleSwitcher()
    const frItem = wrapper.findAll('.v-list-item').find(item => item.text().includes('Français'))

    // Act
    await frItem!.trigger('click')

    // Assert
    expect(mockSetLocale).toHaveBeenCalledWith('fr-CA')
  })
})
