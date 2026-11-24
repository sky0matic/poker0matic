import type { RoundChartInput } from '../roundHistoryExport'
import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHART_PALETTE, CHART_WIDTH, historyChartSvg, historyText, roundChartSvg } from '../roundHistoryExport'

function parse (svg: string): Document {
  return new DOMParser().parseFromString(svg, 'image/svg+xml')
}

function texts (document: Document, selector: string): string[] {
  return [...document.querySelectorAll(selector)].map(element => element.textContent ?? '')
}

describe('utils/roundHistoryExport', () => {
  let input: RoundChartInput

  beforeEach(() => {
    input = {
      title: `Round ${faker.number.int({ min: 1, max: 30 })} · 01:15`,
      stats: ['Average 5.5', 'Median 5'],
      suggestionLabel: 'Suggested estimate: 5',
      buckets: [{ vote: 3, count: 1 }, { vote: 5, count: 4 }, { vote: 8, count: 2 }, { vote: '?', count: 1 }],
      suggestion: 5,
    }
  })

  afterEach(() => vi.clearAllMocks())

  describe('roundChartSvg', () => {
    it('renders the title, stats, suggestion and one bar per bucket', () => {
      // Act
      const image = roundChartSvg(input)

      // Assert
      const document = parse(image.svg)
      const root = document.documentElement
      expect(document.querySelector('parsererror')).toBeNull()
      expect(root.getAttribute('width')).toBe(String(CHART_WIDTH))
      expect(root.getAttribute('height')).toBe(String(image.height))
      expect(image.width).toBe(CHART_WIDTH)
      expect(texts(document, '.title')).toEqual([input.title])
      expect(texts(document, '.stats')).toEqual(['Average 5.5 · Median 5'])
      expect(texts(document, '.suggestion')).toEqual(['Suggested estimate: 5'])
      expect(texts(document, '.bar-label')).toEqual(['3', '5', '8', '?'])
      expect(texts(document, '.bar-count')).toEqual(['1', '4', '2', '1'])
      expect(root.querySelector('rect')!.getAttribute('fill')).toBe(CHART_PALETTE.background)
    })

    it('scales bar widths to the highest count and bolds the suggested row', () => {
      // Act
      const document = parse(roundChartSvg(input).svg)

      // Assert
      const trackWidth = Number(document.querySelector('.bar-track')!.getAttribute('width'))
      const widths = [...document.querySelectorAll('.bar-fill')].map(bar => Number(bar.getAttribute('width')))
      expect(widths).toEqual([trackWidth / 4, trackWidth, trackWidth / 2, trackWidth / 4].map(width => Math.round(width)))
      const rows = [...document.querySelectorAll('.bar-row')]
      expect(rows.map(row => row.getAttribute('font-weight'))).toEqual([null, 'bold', null, null])
    })

    it.each<[string, Partial<RoundChartInput>, string]>([
      ['stats', { stats: [] }, '.stats'],
      ['suggestion', { suggestionLabel: null, suggestion: null }, '.suggestion'],
    ])('omits the %s line when it is not provided', (_label, overrides, selector) => {
      // Arrange
      const full = roundChartSvg(input)

      // Act
      const image = roundChartSvg({ ...input, ...overrides })

      // Assert
      expect(parse(image.svg).querySelector(selector)).toBeNull()
      expect(image.height).toBeLessThan(full.height)
    })

    it('escapes markup in card values and labels', () => {
      // Arrange
      const card = '<b>&"\''

      // Act
      const image = roundChartSvg({ ...input, title: `${card} title`, buckets: [{ vote: card, count: 2 }], suggestion: card })

      // Assert
      const document = parse(image.svg)
      expect(document.querySelector('parsererror')).toBeNull()
      expect(document.querySelector('b')).toBeNull()
      expect(texts(document, '.title')).toEqual([`${card} title`])
      expect(texts(document, '.bar-label')).toEqual([card])
    })
  })

  describe('historyChartSvg', () => {
    it('stacks every round under the title in input order', () => {
      // Arrange
      const second: RoundChartInput = { ...input, title: 'Round 2 · 00:05', stats: [], suggestionLabel: null, buckets: [{ vote: 'M', count: 2 }] }
      const heights = [roundChartSvg(input).height, roundChartSvg(second).height]

      // Act
      const image = historyChartSvg('Round history (2)', [input, second])

      // Assert
      const document = parse(image.svg)
      expect(document.querySelector('parsererror')).toBeNull()
      expect(texts(document, '.history-title')).toEqual(['Round history (2)'])
      const groups = [...document.querySelectorAll('.round-chart')]
      expect(groups.map(group => group.querySelector('.title')!.textContent)).toEqual([input.title, 'Round 2 · 00:05'])
      const offsets = groups.map(group => Number(/translate\(0,(\d+)\)/.exec(group.getAttribute('transform')!)![1]))
      expect(offsets[1] - offsets[0]).toBe(heights[0])
      expect(image.height).toBe(offsets[0] + heights[0] + heights[1])
      expect(document.documentElement.getAttribute('height')).toBe(String(image.height))
    })
  })

  describe('historyText', () => {
    it('builds a header and one line per round', () => {
      // Arrange
      const summaries = [faker.lorem.sentence(), faker.lorem.sentence()]

      // Act
      const result = historyText('Round history (2)', summaries)

      // Assert
      expect(result).toBe(`Round history (2)\n${summaries[0]}\n${summaries[1]}`)
    })
  })
})
