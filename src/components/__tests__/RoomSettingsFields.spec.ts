import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type CardValue, PRESET_DEFINITIONS } from '@/config/cardDecks'
import RoomSettingsFields from '../RoomSettingsFields.vue'

vi.mock('vuedraggable', () => ({
  default: { template: '<div><slot name="item" v-for="(el, i) in modelValue" :element="el" :index="i" /></div>', props: ['modelValue', 'itemKey', 'animation', 'tag'] },
}))

type Wrapper = ReturnType<typeof mountFields>

function mountFields (cards: CardValue[]) {
  return mount(RoomSettingsFields, {
    props: { roomName: faker.word.noun(), cards },
  })
}

function presetButtons (wrapper: Wrapper) {
  return wrapper.findAll('.v-btn-toggle .v-btn')
}

function activePresetIndex (wrapper: Wrapper): number {
  return presetButtons(wrapper).findIndex(button => button.classes().includes('v-btn--active'))
}

function lastEmittedCards (wrapper: Wrapper): CardValue[] | undefined {
  return wrapper.emitted<[CardValue[]]>('update:cards')?.at(-1)?.[0]
}

async function addCard (wrapper: Wrapper, value: string) {
  await wrapper.findAll('input')[1].setValue(value)
  await wrapper.findAll('button').find(button => button.text() === 'Add')!.trigger('click')
}

describe('RoomSettingsFields', () => {
  let customCards: CardValue[]

  beforeEach(() => {
    customCards = [faker.word.noun(), faker.number.int({ min: 100, max: 999 }), faker.word.verb()]
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ...PRESET_DEFINITIONS.map((preset, index) => [preset.key, () => [...preset.cards], index] as const),
    ['custom deck', () => customCards, -1] as const,
  ])('highlights the preset matching the initial deck (%s)', (_label, buildCards, expectedIndex) => {
    // Act
    const wrapper = mountFields(buildCards())

    // Assert
    expect(activePresetIndex(wrapper)).toBe(expectedIndex)
  })

  it.each([
    ['a preset is selected', async (wrapper: Wrapper) => presetButtons(wrapper)[2].trigger('click'), () => [...PRESET_DEFINITIONS[2].cards]],
    ['a card is added', async (wrapper: Wrapper) => addCard(wrapper, 'XXL'), () => [...customCards, 'XXL']],
    ['a card is removed', async (wrapper: Wrapper) => wrapper.findAll('.v-chip__close')[1].trigger('click'), () => customCards.filter((_, i) => i !== 1)],
  ])('updates the cards model when %s', async (_label, act, buildExpected) => {
    // Arrange
    const wrapper = mountFields(customCards)

    // Act
    await act(wrapper)

    // Assert
    expect(lastEmittedCards(wrapper)).toEqual(buildExpected())
  })

  it.each([
    ['13', 13],
    ['XL', 'XL'],
    ['½', '½'],
  ])('adds "%s" as %j', async (input, expected) => {
    // Arrange
    const wrapper = mountFields(customCards)

    // Act
    await addCard(wrapper, input)

    // Assert
    expect(lastEmittedCards(wrapper)?.at(-1)).toStrictEqual(expected)
  })

  it('updates the highlighted preset when the parent replaces the deck', async () => {
    // Arrange
    const wrapper = mountFields(customCards)

    // Act
    await wrapper.setProps({ cards: [...PRESET_DEFINITIONS[3].cards] })

    // Assert
    expect(activePresetIndex(wrapper)).toBe(3)
  })
})
