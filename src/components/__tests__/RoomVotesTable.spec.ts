import type { CardValue } from '@/config/cardDecks'
import type { RoomUser } from '@/utils/presence'
import { faker } from '@faker-js/faker'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CARDS } from '@/config/cardDecks'
import RoomVotesTable from '../RoomVotesTable.vue'

const VDataTableStub = {
  template: `
    <table>
      <thead><tr>
        <th v-for="h in headers" :key="h.value">
          <slot :name="'header.' + h.value" :column="h">{{ h.title }}</slot>
        </th>
      </tr></thead>
      <tbody>
        <tr v-for="item in items" :key="item.userId" class="data-row" v-bind="rowProps ? rowProps({ item }) : {}">
          <td class="name-col"><slot name="item.name" :item="item">{{ item.name }}</slot></td>
          <td class="vote-col"><slot name="item.vote" :item="item" /></td>
        </tr>
        <slot name="body.append" />
      </tbody>
    </table>
  `,
  props: ['items', 'headers', 'itemsPerPage', 'hideDefaultFooter', 'rowProps'],
}

describe('RoomVotesTable', () => {
  let userId: string
  let username: string
  let vote: number

  function mountTable (props: {
    users: Record<string, RoomUser>
    showVotes?: boolean
    voteOptions?: CardValue[]
    selfUserId?: string | null
  }) {
    return mount(RoomVotesTable, {
      props: { showVotes: false, voteOptions: [...DEFAULT_CARDS], selfUserId: null, ...props },
      global: {
        stubs: {
          VDataTable: VDataTableStub,
          VoteCard: {
            template: '<div class="vote-card-stub" :class="{ small }" :data-option="String(option)" />',
            props: { option: [Number, String], voteOptions: Array, selected: Boolean, small: Boolean, readonly: Boolean },
          },
          CardBack: { template: '<div class="card-back-stub" />' },
        },
      },
    })
  }

  beforeEach(() => {
    userId = faker.string.uuid()
    username = faker.person.firstName()
    vote = faker.helpers.arrayElement([1, 2, 3, 5, 8, 13, 21])
  })

  afterEach(() => vi.clearAllMocks())

  it('shows a card back when votes are hidden and the player has voted', () => {
    // Act
    const wrapper = mountTable({ users: { [userId]: { name: username, joinedAt: 1, vote } } })

    // Assert
    const voteCol = wrapper.find('.vote-col')
    expect(voteCol.find('.card-back-stub').exists()).toBe(true)
    expect(voteCol.find('.vote-card-stub').exists()).toBe(false)
  })

  const revealedVote = faker.helpers.arrayElement([1, 2, 3, 5, 8, 13, 21])

  it.each([
    ['a small VoteCard with the value', revealedVote, [String(revealedVote)], false],
    ['a dash for a non-voter', undefined, [], true],
  ])('shows %s when votes are revealed', (_label, userVote, expectedOptions, showsDash) => {
    // Arrange
    const user: RoomUser = { name: username, joinedAt: 1, vote: userVote }

    // Act
    const wrapper = mountTable({ users: { [userId]: user }, showVotes: true })

    // Assert
    const voteCol = wrapper.find('.vote-col')
    expect(voteCol.findAll('.vote-card-stub.small').map(card => card.attributes('data-option'))).toEqual(expectedOptions)
    expect(voteCol.text().includes('—')).toBe(showsDash)
    expect(voteCol.find('.card-back-stub').exists()).toBe(false)
  })

  it('shows the voted over total count in the vote header', () => {
    // Arrange
    const users: Record<string, RoomUser> = {
      [faker.string.uuid()]: { name: faker.person.firstName(), joinedAt: 1, vote },
      [faker.string.uuid()]: { name: faker.person.firstName(), joinedAt: 2 },
      [faker.string.uuid()]: { name: faker.person.firstName(), joinedAt: 3, connected: false, vote },
    }

    // Act
    const wrapper = mountTable({ users })

    // Assert
    expect(wrapper.find('thead').text()).toContain('1/2')
  })

  it.each([
    ['as dashes when votes are hidden', false, ['-', '-']],
    ['as values when votes are revealed', true, ['9', '9']],
  ])('shows the average and median %s', (_label, showVotes, [expectedAverage, expectedMedian]) => {
    // Arrange
    const users: Record<string, RoomUser> = {
      a: { name: faker.person.firstName(), joinedAt: 1, vote: 5 },
      b: { name: faker.person.firstName(), joinedAt: 2, vote: 13 },
    }

    // Act
    const wrapper = mountTable({ users, showVotes })

    // Assert
    const rows = wrapper.findAll('tbody tr')
    expect(rows.at(-2)?.text()).toBe(`Average${expectedAverage}`)
    expect(rows.at(-1)?.text()).toBe(`Median${expectedMedian}`)
  })

  it('hides the average and median rows when the deck has no numeric cards', () => {
    // Act
    const wrapper = mountTable({
      users: { [userId]: { name: username, joinedAt: 1, vote: 'M' } },
      showVotes: true,
      voteOptions: ['S', 'M', 'L'],
    })

    // Assert
    expect(wrapper.text()).not.toContain('Average')
    expect(wrapper.text()).not.toContain('Median')
  })

  it.each([
    ['when selfUserId matches the row', true],
    ['not when selfUserId is null', false],
  ])('marks the self row as you %s', (_label, isSelf) => {
    // Arrange
    const users = { [userId]: { name: username, joinedAt: 1 } }

    // Act
    const wrapper = mountTable({ users, selfUserId: isSelf ? userId : null })

    // Assert
    const row = wrapper.find('tr.data-row')
    expect(row.classes().includes('font-weight-bold')).toBe(isSelf)
    expect(row.text().includes('(You)')).toBe(isSelf)
  })

  it('dims offline rows and shows the offline icon', () => {
    // Arrange
    const users: Record<string, RoomUser> = {
      online: { name: faker.person.firstName(), joinedAt: 1 },
      offline: { name: faker.person.firstName(), joinedAt: 2, connected: false, vote },
    }

    // Act
    const wrapper = mountTable({ users })

    // Assert
    const offlineRows = wrapper.findAll('tr.user-offline')
    expect(offlineRows).toHaveLength(1)
    expect(offlineRows[0].text()).toContain(users.offline.name)
    expect(offlineRows[0].find('[aria-label="Offline"]').exists()).toBe(true)
    expect(offlineRows[0].find('.card-back-stub').exists()).toBe(true)
  })

  it.each([true, false])('marks spectators and shows no vote content for them (revealed: %s)', showVotes => {
    // Arrange
    const users: Record<string, RoomUser> = {
      [userId]: { name: username, joinedAt: 1, spectator: true },
    }

    // Act
    const wrapper = mountTable({ users, showVotes })

    // Assert
    const row = wrapper.find('tr.data-row')
    expect(row.find('.spectator-label').text()).toBe('Spectator')
    expect(row.find('.vote-col').text()).toBe('')
    expect(row.find('.vote-card-stub').exists()).toBe(false)
    expect(row.find('.card-back-stub').exists()).toBe(false)
    expect(wrapper.find('thead').text()).not.toContain('/1')
  })
})
