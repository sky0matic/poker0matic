import type { Round } from '@/utils/roundHistory'
import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type CardValue, DEFAULT_CARDS } from '@/config/cardDecks'
import RoundHistory from '../RoundHistory.vue'

function makeRound (number: number, votes: CardValue[], durationSeconds: number): Round {
  const revealedAt = faker.number.int({ min: 10_000_000, max: 20_000_000 })
  return { key: String(revealedAt), number, startedAt: revealedAt - durationSeconds * 1000, revealedAt, votes }
}

describe('RoundHistory', () => {
  let rounds: Round[]

  function mountHistory (props: { rounds: Round[], canClear?: boolean, voteOptions?: CardValue[] }) {
    return mount(RoundHistory, {
      props: { canClear: true, voteOptions: [...DEFAULT_CARDS], ...props },
      global: {
        stubs: {
          VExpansionPanels: { template: '<div class="round-history"><slot /></div>' },
          VExpansionPanel: { template: '<div><slot /></div>' },
          VExpansionPanelTitle: { template: '<div class="panel-title"><slot /></div>' },
          VExpansionPanelText: { template: '<div><slot /></div>' },
        },
      },
    })
  }

  beforeEach(() => {
    rounds = [makeRound(1, [8, 3, '?'], 75), makeRound(2, ['M', 'S'], 5)]
  })

  afterEach(() => vi.clearAllMocks())

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
    expect(wrapper.emitted('copy')).toEqual([['Round 1 — Votes: 3, 8, ? — Average 5.5 — Median 5.5 — 01:15']])
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
})
