import type { EditableRoomSettings } from '@/stores/room'
import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRESET_DEFINITIONS } from '@/config/cardDecks'
import RoomSettingsDialog from '../RoomSettingsDialog.vue'

vi.mock('vuedraggable', () => ({
  default: { template: '<div><slot name="item" v-for="(el, i) in modelValue" :element="el" :index="i" /></div>', props: ['modelValue', 'itemKey', 'animation', 'tag'] },
}))

type Wrapper = ReturnType<typeof mountDialog>

const DECK_WARNING = 'Changing the card deck clears all current votes.'
const CONFLICT_MESSAGE = 'Someone else changed the room settings'
const OFFLINE_MESSAGE = 'You are offline. Reconnect to save the room settings.'

function mountDialog (settings: EditableRoomSettings, props: { saving?: boolean, conflict?: boolean, online?: boolean } = {}) {
  return mount(RoomSettingsDialog, {
    props: { modelValue: true, settings, saving: false, conflict: false, online: true, ...props },
    global: {
      stubs: {
        VDialog: { template: '<div v-if="modelValue" class="dialog-stub" :data-persistent="String(persistent)"><slot /></div>', props: ['modelValue', 'persistent'] },
      },
    },
  })
}

function inputs (wrapper: Wrapper) {
  const [roomName, , target, ceiling] = wrapper.findAll('input')
  return { roomName, target, ceiling }
}

function saveButton (wrapper: Wrapper) {
  return wrapper.findAll('button').find(button => button.text() === 'Save')!
}

function cancelButton (wrapper: Wrapper) {
  return wrapper.findAll('button').find(button => button.text() === 'Cancel')!
}

function emittedSaves (wrapper: Wrapper) {
  return wrapper.emitted<[{ baseline: EditableRoomSettings, next: EditableRoomSettings }]>('save') ?? []
}

describe('RoomSettingsDialog', () => {
  let settings: EditableRoomSettings

  beforeEach(() => {
    settings = {
      name: faker.word.noun(),
      cards: [...PRESET_DEFINITIONS[2].cards],
      targetDuration: 300,
      ceilingDuration: 90,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('pre-fills the form from settings converting seconds to minutes', () => {
    // Act
    const wrapper = mountDialog(settings)

    // Assert
    const { roomName, target, ceiling } = inputs(wrapper)
    expect((roomName.element as HTMLInputElement).value).toBe(settings.name)
    expect((target.element as HTMLInputElement).value).toBe('5')
    expect((ceiling.element as HTMLInputElement).value).toBe('1.5')
    expect(wrapper.findAll('.v-chip').map(chip => chip.text())).toEqual(settings.cards.map(String))
  })

  it('emits save with the opening baseline and the edited values in seconds', async () => {
    // Arrange
    const openingSettings = structuredClone(settings)
    const wrapper = mountDialog(settings)
    const newName = faker.word.noun()
    const { roomName, target, ceiling } = inputs(wrapper)
    await roomName.setValue(`  ${newName}  `)
    await target.setValue('2')
    await ceiling.setValue('')
    await wrapper.setProps({ settings: { ...settings, targetDuration: 900 } })

    // Act
    await wrapper.find('form').trigger('submit')

    // Assert
    expect(emittedSaves(wrapper)).toEqual([[{
      baseline: openingSettings,
      next: { name: newName, cards: settings.cards, targetDuration: 120, ceilingDuration: undefined },
    }]])
  })

  it.each([
    ['blank name', (s: EditableRoomSettings) => ({ ...s, name: ' '.repeat(3) })],
    ['empty deck', (s: EditableRoomSettings) => ({ ...s, cards: [] })],
  ])('disables save with a %s', async (_label, buildSettings) => {
    // Arrange
    const wrapper = mountDialog(buildSettings(settings))

    // Act
    await wrapper.find('form').trigger('submit')

    // Assert
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    expect(emittedSaves(wrapper)).toHaveLength(0)
  })

  it('shows the deck change warning only when the deck differs from the baseline', async () => {
    // Arrange
    const wrapper = mountDialog(settings)
    const warningBefore = wrapper.text().includes(DECK_WARNING)

    // Act
    await wrapper.findAll('.v-btn-toggle .v-btn')[0].trigger('click')

    // Assert
    expect(warningBefore).toBe(false)
    expect(wrapper.text()).toContain(DECK_WARNING)
  })

  it.each([
    [false, true, true],
    [true, true, false],
    [false, false, true],
    [true, false, true],
  ])('locks the dialog only while saving online (saving=%s, online=%s, dismissible=%s)', async (saving, online, dismissible) => {
    // Arrange
    const wrapper = mountDialog(settings, { saving, online })
    const persistent = wrapper.find('.dialog-stub').attributes('data-persistent')
    const cancelDisabled = cancelButton(wrapper).attributes('disabled') !== undefined

    // Act
    await cancelButton(wrapper).trigger('click')

    // Assert
    expect(persistent).toBe(String(!dismissible))
    expect(cancelDisabled).toBe(!dismissible)
    expect(wrapper.emitted('update:modelValue') ?? []).toEqual(dismissible ? [[false]] : [])
  })

  it.each([
    [true, false],
    [false, true],
  ])('shows the offline hint and blocks save only when offline (online=%s)', async (online, blocked) => {
    // Arrange
    const wrapper = mountDialog(settings, { online })

    // Act
    await wrapper.find('form').trigger('submit')

    // Assert
    expect(wrapper.text().includes(OFFLINE_MESSAGE)).toBe(blocked)
    expect(saveButton(wrapper).attributes('disabled') !== undefined).toBe(blocked)
    expect(emittedSaves(wrapper)).toHaveLength(blocked ? 0 : 1)
  })

  it('reloads the latest settings and shows the conflict alert when conflict becomes true', async () => {
    // Arrange
    const wrapper = mountDialog(settings)
    await inputs(wrapper).roomName.setValue(faker.word.noun())
    const latest: EditableRoomSettings = { name: faker.word.noun(), cards: [...PRESET_DEFINITIONS[0].cards], targetDuration: 600 }
    const alertBefore = wrapper.text().includes(CONFLICT_MESSAGE)

    // Act
    await wrapper.setProps({ settings: latest, conflict: true })
    await wrapper.find('form').trigger('submit')

    // Assert
    expect(alertBefore).toBe(false)
    expect(wrapper.text()).toContain(CONFLICT_MESSAGE)
    expect((inputs(wrapper).roomName.element as HTMLInputElement).value).toBe(latest.name)
    expect(emittedSaves(wrapper)).toEqual([[{
      baseline: latest,
      next: { name: latest.name, cards: latest.cards, targetDuration: 600, ceilingDuration: undefined },
    }]])
  })
})
