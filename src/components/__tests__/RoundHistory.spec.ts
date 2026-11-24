import type { Round } from '@/utils/roundHistory'
import type { HistoryCopyRequest, SvgImage } from '@/utils/roundHistoryExport'
import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type CardValue, DEFAULT_CARDS } from '@/config/cardDecks'
import i18n from '@/plugins/i18n'
import RoundHistory from '../RoundHistory.vue'
import VoteDistribution from '../VoteDistribution.vue'

const mockSvgToPngBlob = vi.hoisted(() => vi.fn())
vi.mock('@/utils/rasterize', () => ({ svgToPngBlob: mockSvgToPngBlob }))

function makeRound (number: number, votes: CardValue[], durationSeconds: number): Round {
  const revealedAt = faker.number.int({ min: 10_000_000, max: 20_000_000 })
  return { key: String(revealedAt), number, startedAt: revealedAt - durationSeconds * 1000, revealedAt, votes }
}

describe('RoundHistory', () => {
  let rounds: Round[]
  let png: Blob

  function mountHistory (props: { rounds: Round[], canClear?: boolean, voteOptions?: CardValue[] }) {
    return mount(RoundHistory, {
      props: { canClear: true, voteOptions: [...DEFAULT_CARDS], ...props },
      global: {
        stubs: {
          VExpansionPanels: { template: '<div class="round-history"><slot /></div>' },
          VExpansionPanel: { template: '<div><slot /></div>' },
          VExpansionPanelTitle: { template: '<div class="panel-title"><slot /></div>' },
          VExpansionPanelText: { template: '<div><slot /></div>' },
          VExpandTransition: { template: '<div><slot /></div>' },
        },
      },
    })
  }

  beforeEach(() => {
    rounds = [makeRound(1, [8, 3, '?'], 75), makeRound(2, ['M', 'S'], 5)]
    png = new Blob([faker.string.alphanumeric(8)], { type: 'image/png' })
    mockSvgToPngBlob.mockResolvedValue(png)
  })

  afterEach(() => {
    i18n.global.locale.value = 'en'
    vi.clearAllMocks()
  })

  it('renders nothing without rounds', () => {
    // Act
    const wrapper = mountHistory({ rounds: [] })

    // Assert
    expect(wrapper.find('.round-history').exists()).toBe(false)
  })

  it('lists the rounds newest first with sorted votes, stats and duration', () => {
    // Act
    const wrapper = mountHistory({ rounds })

    // Assert
    expect(wrapper.find('.panel-title').text()).toBe('Round history (2)')
    const items = wrapper.findAll('.round-item')
    expect(items.map(item => item.find('.v-list-item-title').text())).toEqual(['Round 2 00:05', 'Round 1 01:15'])
    expect(items.map(item => item.find('.round-details').text())).toEqual([
      'Votes: M, S',
      'Votes: 3, 8, ? · Average 5.5 · Median 5.5',
    ])
  })

  it('emits copy with a plain-text summary of the round', async () => {
    // Arrange
    const wrapper = mountHistory({ rounds })

    // Act
    await wrapper.findAll('.copy-round')[1].trigger('click')

    // Assert
    expect(wrapper.emitted('copy')).toEqual([[{ kind: 'round', content: { text: 'Round 1 — Votes: 3, 8, ? — Average 5.5 — Median 5.5 — 01:15' } }]])
  })

  it.each([
    ['en', 'Round 1 — Votes: 3, 8, ? — Average 5.5 — Median 5.5 — 01:15', ['Round 1 · 01:15', 'Average 5.5 · Median 5.5', 'Suggested estimate: 5']],
    ['fr', 'Tour 1 — Votes : 3, 8, ? — Moyenne 5,5 — Médiane 5,5 — 01:15', ['Tour 1 · 01:15', 'Moyenne 5,5 · Médiane 5,5', 'Estimation suggérée : 5']],
    ['es', 'Ronda 1 — Votos: 3, 8, ? — Promedio 5,5 — Mediana 5,5 — 01:15', ['Ronda 1 · 01:15', 'Promedio 5,5 · Mediana 5,5', 'Estimación sugerida: 5']],
  ])('emits copy with an image of the round chart in %s and its summary as the text fallback', async (locale, summary, labels) => {
    // Arrange
    i18n.global.locale.value = locale
    const wrapper = mountHistory({ rounds })

    // Act
    await wrapper.findAll('.copy-round-image')[1].trigger('click')
    const [[request]] = wrapper.emitted('copy') as [[HistoryCopyRequest]]
    const blob = await request.content.png!()

    // Assert
    expect(request.kind).toBe('roundImage')
    expect(request.content.text).toBe(summary)
    expect(blob).toBe(png)
    const [[image]] = mockSvgToPngBlob.mock.calls as [[SvgImage]]
    for (const label of labels) {
      expect(image.svg).toContain(label)
    }
  })

  it.each([
    ['.copy-history', 'history', false],
    ['.copy-history-image', 'historyImage', true],
  ])('emits copy with the %s request covering every round oldest first', async (selector, kind, hasImage) => {
    // Arrange
    const wrapper = mountHistory({ rounds })

    // Act
    await wrapper.get(selector).trigger('click')
    const [[request]] = wrapper.emitted('copy') as [[HistoryCopyRequest]]

    // Assert
    expect(request.kind).toBe(kind)
    expect(request.content.text).toBe([
      'Round history (2)',
      'Round 1 — Votes: 3, 8, ? — Average 5.5 — Median 5.5 — 01:15',
      'Round 2 — Votes: M, S — 00:05',
    ].join('\n'))
    expect(request.content.png != null).toBe(hasImage)
  })

  it('builds the history image with every round chart oldest first under the title', async () => {
    // Arrange
    const wrapper = mountHistory({ rounds })
    await wrapper.find('.copy-history-image').trigger('click')
    const [[request]] = wrapper.emitted('copy') as [[HistoryCopyRequest]]

    // Act
    const blob = await request.content.png!()

    // Assert
    expect(blob).toBe(png)
    const [[image]] = mockSvgToPngBlob.mock.calls as [[SvgImage]]
    const titles = ['Round history (2)', 'Round 1 · 01:15', 'Round 2 · 00:05'].map(title => image.svg.indexOf(title))
    expect(titles.every(index => index !== -1)).toBe(true)
    expect(titles).toEqual(titles.toSorted((a, b) => a - b))
  })

  it('enables the copy history buttons even when clearing is not allowed', () => {
    // Act
    const wrapper = mountHistory({ rounds, canClear: false })

    // Assert
    expect(wrapper.find('.clear-history').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.copy-history').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.copy-history-image').attributes('disabled')).toBeUndefined()
  })

  it.each([
    ['en', 'Copy text', 'Copy image', 'Copy history as text', 'Copy history as image'],
    ['fr', 'Copier le texte', 'Copier l\'image', 'Copier l\'historique en texte', 'Copier l\'historique en image'],
    ['es', 'Copiar texto', 'Copiar imagen', 'Copiar el historial como texto', 'Copiar el historial como imagen'],
  ])('localizes the copy button labels for %s', (locale, copy, copyImage, copyAll, copyAllImage) => {
    // Arrange
    i18n.global.locale.value = locale

    // Act
    const wrapper = mountHistory({ rounds })

    // Assert
    expect(wrapper.find('.copy-round').attributes('aria-label')).toBe(copy)
    expect(wrapper.find('.copy-round-image').attributes('aria-label')).toBe(copyImage)
    expect(wrapper.find('.copy-history').text()).toBe(copyAll)
    expect(wrapper.find('.copy-history-image').text()).toBe(copyAllImage)
  })

  it.each([
    ['en', 'Votes: 3, 8, ? · Average 5.5 · Median 5.5', 'Round 1 — Votes: 3, 8, ? — Average 5.5 — Median 5.5 — 01:15'],
    ['fr', 'Votes : 3, 8, ? · Moyenne 5,5 · Médiane 5,5', 'Tour 1 — Votes : 3, 8, ? — Moyenne 5,5 — Médiane 5,5 — 01:15'],
    ['es', 'Votos: 3, 8, ? · Promedio 5,5 · Mediana 5,5', 'Ronda 1 — Votos: 3, 8, ? — Promedio 5,5 — Mediana 5,5 — 01:15'],
  ])('formats the average and median for the %s locale in the details and copied summary', async (locale, details, summary) => {
    // Arrange
    i18n.global.locale.value = locale
    const wrapper = mountHistory({ rounds })

    // Act
    await wrapper.findAll('.copy-round')[1].trigger('click')

    // Assert
    expect(wrapper.findAll('.round-details')[1].text()).toBe(details)
    expect(wrapper.emitted('copy')).toEqual([[{ kind: 'round', content: { text: summary } }]])
  })

  it('formats large averages without digit grouping', () => {
    // Act
    const wrapper = mountHistory({ rounds: [makeRound(1, [1000, 2000], 5)], voteOptions: [1000, 2000] })

    // Assert
    expect(wrapper.find('.round-details').text()).toBe('Votes: 1000, 2000 · Average 1500 · Median 1500')
  })

  it.each([
    ['emits clear when allowed', true, [[]]],
    ['does not emit clear when disabled', false, undefined],
  ])('%s', async (_label, canClear, expected) => {
    // Arrange
    const wrapper = mountHistory({ rounds, canClear })

    // Act
    await wrapper.find('.clear-history').trigger('click')

    // Assert
    expect(wrapper.emitted('clear')).toEqual(expected)
  })

  it('collapses every round chart by default and offers a toggle only for rounds with votes', () => {
    // Act
    const wrapper = mountHistory({ rounds: [...rounds, makeRound(3, [], 10)] })

    // Assert
    expect(wrapper.find('.round-chart').exists()).toBe(false)
    const toggles = wrapper.findAll('.toggle-round-chart')
    expect(toggles).toHaveLength(2)
    expect(toggles.map(toggle => toggle.attributes('aria-expanded'))).toEqual(['false', 'false'])
    expect(toggles.map(toggle => toggle.attributes('aria-label'))).toEqual(['Show chart', 'Show chart'])
    expect(wrapper.findAll('.round-item')[0].find('.toggle-round-chart').exists()).toBe(false)
  })

  it('shows the round chart under its row when the toggle is clicked and hides it on a second click', async () => {
    // Arrange
    const wrapper = mountHistory({ rounds })
    const toggle = wrapper.findAll('.toggle-round-chart')[1]

    // Act
    await toggle.trigger('click')

    // Assert
    const charts = wrapper.findAll('.round-chart')
    expect(charts).toHaveLength(1)
    expect(charts[0].findComponent(VoteDistribution).props()).toEqual({
      distribution: [{ vote: 3, count: 1 }, { vote: 8, count: 1 }, { vote: '?', count: 1 }],
      suggestion: 5,
      average: 5.5,
      median: 5.5,
      hideTitle: true,
      label: 'Vote distribution, round 1',
    })
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-label')).toBe('Hide chart')
    expect(toggle.attributes('aria-controls')).toBe(charts[0].attributes('id'))
    expect(charts[0].attributes('id')).toBe(`round-chart-${rounds[0].key}`)

    // Act
    await toggle.trigger('click')

    // Assert
    expect(wrapper.find('.round-chart').exists()).toBe(false)
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('keeps several charts expanded at once', async () => {
    // Arrange
    const wrapper = mountHistory({ rounds })

    // Act
    for (const toggle of wrapper.findAll('.toggle-round-chart')) {
      await toggle.trigger('click')
    }

    // Assert
    const labels = wrapper.findAll('.round-chart').map(chart => chart.get('section').attributes('aria-label'))
    expect(labels).toEqual(['Vote distribution, round 2', 'Vote distribution, round 1'])
  })

  it('keeps a round chart expanded when a new round is added', async () => {
    // Arrange
    const wrapper = mountHistory({ rounds })
    await wrapper.findAll('.toggle-round-chart')[1].trigger('click')

    // Act
    await wrapper.setProps({ rounds: [...rounds, makeRound(3, [5], 10)] })

    // Assert
    const charts = wrapper.findAll('.round-chart')
    expect(charts).toHaveLength(1)
    expect(charts[0].get('section').attributes('aria-label')).toBe('Vote distribution, round 1')
    expect(wrapper.findAll('.toggle-round-chart')[2].attributes('aria-expanded')).toBe('true')
  })

  it('hides an open chart and its toggle when the round loses all its votes', async () => {
    // Arrange
    const wrapper = mountHistory({ rounds })
    await wrapper.findAll('.toggle-round-chart')[1].trigger('click')

    // Act
    await wrapper.setProps({ rounds: [{ ...rounds[0], votes: [] }, rounds[1]] })

    // Assert
    expect(wrapper.find('.round-chart').exists()).toBe(false)
    expect(wrapper.findAll('.toggle-round-chart')).toHaveLength(1)
    expect(wrapper.findAll('.round-item')[1].find('.toggle-round-chart').exists()).toBe(false)
  })

  it('wraps each round row and its chart in a single list item of the list', async () => {
    // Arrange
    const wrapper = mountHistory({ rounds })

    // Act
    for (const toggle of wrapper.findAll('.toggle-round-chart')) {
      await toggle.trigger('click')
    }

    // Assert
    const list = wrapper.get('[role="list"]')
    const children = [...list.element.children]
    expect(children).toHaveLength(2)
    expect(children.map(child => child.getAttribute('role'))).toEqual(['listitem', 'listitem'])
    for (const child of children) {
      const [item, chart] = [...child.children]
      expect(item.classList.contains('round-item')).toBe(true)
      expect(item.getAttribute('role')).toBe('none')
      expect(chart.querySelector('.round-chart')).not.toBeNull()
    }
    const [newest] = wrapper.findAll('.round-chart')
    expect(newest.get('section').attributes('aria-label')).toBe('Vote distribution, round 2')
    expect(newest.find('.stat-average').exists()).toBe(false)
    expect(newest.find('.stat-median').exists()).toBe(false)
  })

  it.each([
    ['en', 'Show chart', 'Hide chart', 'Vote distribution, round 1', 'Average 5.5'],
    ['fr', 'Afficher le graphique', 'Masquer le graphique', 'Répartition des votes, tour 1', 'Moyenne 5,5'],
    ['es', 'Mostrar el gráfico', 'Ocultar el gráfico', 'Distribución de votos, ronda 1', 'Promedio 5,5'],
  ])('localizes the chart toggle and label for %s', async (locale, show, hide, chartLabel, averageText) => {
    // Arrange
    i18n.global.locale.value = locale
    const wrapper = mountHistory({ rounds })
    const toggle = wrapper.findAll('.toggle-round-chart')[1]
    const showLabels = [toggle.attributes('aria-label'), toggle.attributes('title')]

    // Act
    await toggle.trigger('click')

    // Assert
    expect(showLabels).toEqual([show, show])
    expect([toggle.attributes('aria-label'), toggle.attributes('title')]).toEqual([hide, hide])
    const chart = wrapper.get('.round-chart')
    expect(chart.get('section').attributes('aria-label')).toBe(chartLabel)
    expect(chart.get('.stat-average').text()).toBe(averageText)
  })
})
