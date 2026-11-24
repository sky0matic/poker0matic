<template>
  <v-alert
    v-if="showVotes && consensus != null"
    class="consensus-banner mb-3"
    density="compact"
    icon="mdi-handshake"
    type="success"
    variant="tonal"
  >
    {{ t('room.table.consensus', { vote: consensus }) }}
  </v-alert>

  <VoteDistribution
    v-if="showVotes && distribution.length > 0"
    :average="hasNumericCards ? average : null"
    :distribution="distribution"
    :median="hasNumericCards ? median : null"
    :suggestion="consensus == null ? suggestion : null"
  />

  <v-data-table
    class="elevation-1"
    :headers="headers"
    hide-default-footer
    :items="sortedUsers"
    items-per-page="-1"
    :row-props="rowProps"
  >
    <template #item.name="{ item }">
      {{ item.name }} <span v-if="isSelf(item)" class="text-medium-emphasis text-caption">{{ t('room.table.you') }}</span>

      <v-icon
        v-if="!isUserOnline(item)"
        :aria-label="t('room.table.offline')"
        class="ms-1"
        icon="mdi-wifi-off"
        size="x-small"
        :title="t('room.table.offline')"
      />

      <span v-if="isSpectator(item)" class="spectator-label text-medium-emphasis text-caption ms-1">
        <v-icon icon="mdi-eye" size="x-small" />
        {{ t('room.table.spectator') }}
      </span>

      <v-chip
        v-if="outlierKey(item)"
        class="outlier-chip ms-2"
        :color="outlierKey(item) === 'lowest' ? 'info' : 'warning'"
        label
        size="x-small"
      >
        {{ t(`room.table.${outlierKey(item)}`) }}
      </v-chip>
    </template>

    <template #header.vote="{ column }">
      <div>
        {{ column.title }}
        <div v-if="voteCount.total > 0" class="text-caption">
          {{ voteCount.voted }}/{{ voteCount.total }}
        </div>
      </div>
    </template>

    <template #item.vote="{ item }">
      <div class="vote-cell">
        <VoteCard
          v-if="!isSpectator(item) && showVotes && item.vote != null"
          :option="item.vote"
          readonly
          :selected="false"
          small
          :vote-options="voteOptions"
        />

        <span v-else-if="!isSpectator(item) && showVotes" class="text-medium-emphasis">—</span>

        <CardBack v-else-if="!isSpectator(item) && item.vote != null" />
      </div>
    </template>

  </v-data-table>
</template>

<script lang="ts" setup>
  import type { CardValue } from '@/config/cardDecks'
  import type { DataTableHeader } from 'vuetify'
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import CardBack from '@/components/CardBack.vue'
  import VoteCard from '@/components/VoteCard.vue'
  import VoteDistribution from '@/components/VoteDistribution.vue'
  import { isSpectator, isUserOnline, type RoomUser } from '@/utils/presence'
  import {
    averageVote,
    consensusVote,
    countVotes,
    medianVote,
    type RoomUserWithId,
    sortRoomUsers,
    suggestedEstimate,
    voteDistribution,
    voteOutliers,
  } from '@/utils/roomStats'

  const props = defineProps<{
    users: Record<string, RoomUser>
    voteOptions: CardValue[]
    showVotes: boolean
    /** The row to mark as "(You)" and bold; `null` marks no row. */
    selfUserId: string | null
  }>()

  const { t } = useI18n()

  const headers = computed<DataTableHeader[]>(() => [
    { title: t('room.table.name'), value: 'name' },
    { title: t('room.table.vote'), value: 'vote', width: '20%', align: 'center' },
  ])

  const sortedUsers = computed(() => sortRoomUsers(props.users, props.showVotes, props.voteOptions))
  const voteCount = computed(() => countVotes(props.users))
  const average = computed(() => averageVote(props.users))
  const median = computed(() => medianVote(props.users))
  const hasNumericCards = computed(() => props.voteOptions.some(v => typeof v === 'number'))
  const consensus = computed(() => consensusVote(props.users, props.voteOptions))
  const outliers = computed(() => voteOutliers(props.users, props.voteOptions))
  const distribution = computed(() => voteDistribution(props.users, props.voteOptions))
  const suggestion = computed(() => suggestedEstimate(props.users, props.voteOptions))

  /** `lowest` / `highest` for outlier voters once votes are revealed, otherwise `null`. */
  function outlierKey (item: RoomUserWithId): 'lowest' | 'highest' | null {
    if (!props.showVotes) return null
    if (outliers.value.lowest.has(item.userId)) return 'lowest'
    if (outliers.value.highest.has(item.userId)) return 'highest'
    return null
  }

  function isSelf (item: RoomUserWithId): boolean {
    return props.selfUserId != null && item.userId === props.selfUserId
  }

  function rowProps ({ item }: { item: RoomUserWithId }) {
    const classes: string[] = []
    if (isSelf(item)) classes.push('font-weight-bold')
    if (!isUserOnline(item)) classes.push('user-offline')
    return classes.length > 0 ? { class: classes.join(' ') } : {}
  }
</script>

<style scoped>
.vote-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 68px; /* 56px card + 6px padding top and bottom */
}

:deep(tr.user-offline) {
  opacity: 0.5;
}
</style>
