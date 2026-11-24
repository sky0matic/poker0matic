import type { VoteBucket } from '@/utils/roomStats'
import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/i18n'
import VoteDistribution from '../VoteDistribution.vue'

describe('VoteDistribution', () => {
  let distribution: VoteBucket[]

  function mountDistribution (
    suggestion: VoteBucket['vote'] | null,
    extra: { average?: number | null, median?: number | null, hideTitle?: boolean, label?: string } = {},
  ) {
    return mount(VoteDistribution, { props: { distribution, suggestion, ...extra } })
  }

  beforeEach(() => {
    const top = faker.number.int({ min: 2, max: 6 })
    distribution = [
      { vote: 3, count: 1 },
      { vote: 5, count: top },
      { vote: '?', count: 1 },
    ]
  })

  afterEach(() => {
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

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

  it.each([
    ['shows the average and median chips when both are known', 4.33, 5, 'Average 4.33', 'Median 5'],
    ['hides the average and median chips when they are null', null, null, null, null],
    ['hides the average and median chips when they are not given', undefined, undefined, null, null],
  ])('%s', (_label, average, median, averageText, medianText) => {
    // Act
    const wrapper = mountDistribution(5, { average, median })

    // Assert
    const averageChip = wrapper.find('.stat-average')
    const medianChip = wrapper.find('.stat-median')
    expect(averageChip.exists() ? averageChip.text() : null).toBe(averageText)
    expect(medianChip.exists() ? medianChip.text() : null).toBe(medianText)
    expect(wrapper.find('.suggested-estimate').text()).toBe('Suggested estimate: 5')
  })

  it.each([
    ['en', 'Average 4.33', 'Median 5.5'],
    ['fr', 'Moyenne 4,33', 'Médiane 5,5'],
    ['es', 'Promedio 4,33', 'Mediana 5,5'],
  ])('formats the average and median for the %s locale', (locale, averageText, medianText) => {
    // Arrange
    i18n.global.locale.value = locale

    // Act
    const wrapper = mountDistribution(null, { average: 4.33, median: 5.5 })

    // Assert
    expect(wrapper.find('.stat-average').text()).toBe(averageText)
    expect(wrapper.find('.stat-median').text()).toBe(medianText)
  })

  const customLabel = faker.lorem.words()

  it.each([
    ['shows the title and labels the section with it by default', {}, 'Vote distribution', 'Vote distribution'],
    ['hides the title and uses the given label when asked', { hideTitle: true, label: customLabel }, null, customLabel],
  ])('%s', (_label, options, titleText, sectionLabel) => {
    // Act
    const wrapper = mountDistribution(5, options)

    // Assert
    const title = wrapper.find('.text-subtitle-2')
    expect(title.exists() ? title.text() : null).toBe(titleText)
    expect(wrapper.get('section').attributes('aria-label')).toBe(sectionLabel)
    expect(wrapper.find('.suggested-estimate').text()).toBe('Suggested estimate: 5')
  })

  it('omits the header row when the title is hidden and there are no stats', () => {
    // Act
    const wrapper = mountDistribution(null, { hideTitle: true })

    // Assert
    expect(wrapper.find('.distribution-header').exists()).toBe(false)
    expect(wrapper.find('.v-chip').exists()).toBe(false)
    expect(wrapper.findAll('.distribution-row')).toHaveLength(3)
  })
})
