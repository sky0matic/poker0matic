import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfigStore } from '@/stores/config'
import UserMenu from '../UserMenu.vue'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({}),
}))
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn().mockReturnValue({}),
}))

describe('UserMenu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function mountUserMenu () {
    return mount(UserMenu, {
      attachTo: document.body,
      global: {
        stubs: {
          VMenu: { template: '<div><slot name="activator" v-bind="{ props: {} }" /><slot /></div>' },
          VDialog: { template: '<div v-if="modelValue"><slot /></div>', props: ['modelValue'] },
        },
      },
    })
  }

  describe('initials', () => {
    it.each([
      ['Alice', 'A'],
      ['John Doe', 'JD'],
      ['Jean-Pierre Martin', 'JM'],
    ])('derives initials "%s" → "%s"', (name, expected) => {
      // Arrange
      useConfigStore().setUserName(name)

      // Act
      const wrapper = mountUserMenu()

      // Assert
      expect(wrapper.find('.v-avatar span').text()).toBe(expected)
    })

    it('truncates initials to 2 characters', () => {
      // Arrange
      useConfigStore().setUserName('Alice Bob Charlie')

      // Act
      const wrapper = mountUserMenu()

      // Assert
      expect(wrapper.find('.v-avatar span').text().length).toBeLessThanOrEqual(2)
    })
  })

  describe('saveName', () => {
    it('calls setUserName with the trimmed value and closes the dialog', async () => {
      // Arrange
      const store = useConfigStore()
      store.setUserName('OldName')
      const setUserNameSpy = vi.spyOn(store, 'setUserName')
      const wrapper = mountUserMenu()
      const newName = faker.person.firstName()

      // Act – click "Change name" to open dialog, fill input, save
      const changeNameItem = wrapper.findAll('.v-list-item').find(item => item.text().includes('Change name'))
      await changeNameItem!.trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('input').setValue(newName)
      const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
      await saveBtn!.trigger('click')

      // Assert
      expect(setUserNameSpy).toHaveBeenCalledWith(newName)
    })

    it('does not call setUserName when the trimmed name is blank', async () => {
      // Arrange
      const store = useConfigStore()
      store.setUserName('Alice')
      const setUserNameSpy = vi.spyOn(store, 'setUserName')
      const wrapper = mountUserMenu()

      // Act – open dialog, set blank name, try to save
      const changeNameItem = wrapper.findAll('.v-list-item').find(item => item.text().includes('Change name'))
      await changeNameItem!.trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('input').setValue('   ')
      const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
      await saveBtn!.trigger('click')

      // Assert
      expect(setUserNameSpy).not.toHaveBeenCalled()
    })
  })
})
