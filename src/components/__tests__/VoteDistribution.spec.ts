import type { VoteBucket } from '@/utils/roomStats'
import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VoteDistribution from '../VoteDistribution.vue'

describe('VoteDistribution', () => {
  let distribution: VoteBucket[]

  function mountDistribution (suggestion: VoteBucket['vote'] | null) {
    return mount(VoteDistribution, { props: { distribution, suggestion } })
  }

  beforeEach(() => {
    const top = faker.number.int({ min: 2, max: 6 })
    distribution = [
      { vote: 3, count: 1 },
      { vote: 5, count: top },
      { vote: '?', count: 1 },
    ]
  })

  afterEach(() => vi.clearAllMocks())

  it('renders one bar per card in order, with counts and widths relative to the most voted card', () => {
    // Act
    const wrapper = mountDistribution(null)

    // Assert
    const rows = wrapper.findAll('.distribution-row')
    expect(rows.map(row => row.find('.bar-label').text())).toEqual(['3', '5', '?'])
    expect(rows.map(row => row.find('.bar-count').text())).toEqual(['1', String(distribution[1].count), '1'])
    const widths = rows.map(row => Number.parseFloat((row.find('.bar-fill').element as HTMLElement).style.width))
    expect(widths[0]).toBeCloseTo(100 / distribution[1].count, 3)
    expect(widths[1]).toBe(100)
    expect(widths[2]).toBeCloseTo(100 / distribution[1].count, 3)
    expect(rows[0].attributes('aria-label')).toBe('1 vote for 3')
    expect(rows[1].attributes('aria-label')).toBe(`${distribution[1].count} votes for 5`)
  })

  it.each([
    ['shows and highlights the suggested card', 5, 'Suggested estimate: 5', [false, true, false]],
    ['hides the suggestion when there is none', null, null, [false, false, false]],
  ])('%s', (_label, suggestion, chipText, highlighted) => {
    // Act
    const wrapper = mountDistribution(suggestion)

    // Assert
    const chip = wrapper.find('.suggested-estimate')
    expect(chip.exists() ? chip.text() : null).toBe(chipText)
    expect(wrapper.findAll('.distribution-row').map(row => row.classes('is-suggested'))).toEqual(highlighted)
  })
})
