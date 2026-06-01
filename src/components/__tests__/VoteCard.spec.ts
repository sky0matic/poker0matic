import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import VoteCard from '../VoteCard.vue'

const mockReducedMotion = vi.hoisted(() => vi.fn(() => false))
vi.mock('@/stores/preferences', () => ({
  usePreferencesStore: () => ({ reducedMotion: mockReducedMotion() }),
}))

const DEFAULT_OPTIONS: Array<number | string> = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?', '☕']

function mountCard (overrides: {
  option?: number | string
  voteOptions?: Array<number | string>
  selected?: boolean
  small?: boolean
  readonly?: boolean
} = {}) {
  return mount(VoteCard, {
    props: {
      option: 0,
      voteOptions: DEFAULT_OPTIONS,
      selected: false,
      ...overrides,
    },
  })
}

describe('VoteCard', () => {
  afterEach(() => vi.clearAllMocks())

  describe('center value', () => {
    it.each([
      [0, '0'],
      [13, '13'],
      ['?', '?'],
      ['☕', '☕'],
    ])('renders option %s in the center', (option, expectedText) => {
      // Act
      const wrapper = mountCard({ option })

      // Assert
      expect(wrapper.find('.card-center-pip').text()).toBe(expectedText)
    })
  })

  describe('suit symbol in corners', () => {
    it.each([
      ['♣', 0],
      ['♦', 3],
      ['♥', 8],
      ['♠', 34],
    ])('shows "%s" in both corners for numeric option %s', (expectedSymbol, option) => {
      // Act
      const wrapper = mountCard({ option })

      // Assert
      const corners = wrapper.findAll('.card-pip')
      expect(corners[0].text()).toBe(expectedSymbol)
      expect(corners[1].text()).toBe(expectedSymbol)
    })

    it('shows ★ in both corners for non-numeric options', () => {
      // Arrange / Act
      const wrapper = mountCard({ option: '?' })

      // Assert
      const corners = wrapper.findAll('.card-pip')
      expect(corners[0].text()).toBe('★')
      expect(corners[1].text()).toBe('★')
    })
  })

  describe('suit colour', () => {
    it.each([
      [0, '#1a1a1a'],
      [3, '#c0392b'],
      [8, '#c0392b'],
      [34, '#1a1a1a'],
      ['?', '#7c3aed'],
    ])('applies correct --c colour for option %s', (option, expectedColour) => {
      // Act
      const wrapper = mountCard({ option })

      // Assert
      expect(wrapper.find('button').attributes('style')).toContain(`--c: ${expectedColour}`)
    })
  })

  describe('class bindings', () => {
    it.each([
      ['selected', { selected: true }],
      ['small', { small: true }],
      ['readonly', { readonly: true }],
    ])('applies the "%s" class when the prop is true', (className, props) => {
      // Act
      const wrapper = mountCard(props)

      // Assert
      expect(wrapper.find('button').classes()).toContain(className)
    })

    it('does not apply the "selected" class when selected is false', () => {
      // Act
      const wrapper = mountCard({ selected: false })

      // Assert
      expect(wrapper.find('button').classes()).not.toContain('selected')
    })
  })

  describe('click event', () => {
    it('emits click when the button is clicked', async () => {
      // Arrange
      const wrapper = mountCard()

      // Act
      await wrapper.find('button').trigger('click')

      // Assert
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('suit assignment with custom card sets', () => {
    it('assigns ♣ to the first card and ♠ to the last for a custom numeric set', () => {
      // Arrange
      const customOptions = [1, 2, 3, 4, 5, 6, 7, 8]

      // Act
      const firstCard = mountCard({ option: 1, voteOptions: customOptions })
      const lastCard = mountCard({ option: 8, voteOptions: customOptions })

      // Assert
      expect(firstCard.findAll('.card-pip')[0].text()).toBe('♣')
      expect(lastCard.findAll('.card-pip')[0].text()).toBe('♠')
    })

    it('assigns ★ to all cards when the set contains only strings', () => {
      // Arrange
      const sizes = ['XS', 'S', 'M', 'L', 'XL']

      // Act
      const wrapper = mountCard({ option: 'M', voteOptions: sizes })

      // Assert
      expect(wrapper.findAll('.card-pip')[0].text()).toBe('★')
    })
  })
})
