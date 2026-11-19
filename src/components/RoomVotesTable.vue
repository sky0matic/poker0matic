<template>
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
          v-if="showVotes && item.vote != null"
          :option="item.vote"
          readonly
          :selected="false"
          small
          :vote-options="voteOptions"
        />

        <span v-else-if="showVotes" class="text-medium-emphasis">—</span>

        <CardBack v-else-if="item.vote != null" />
      </div>
    </template>

    <template #body.append>
      <tr v-if="hasNumericCards">
        <td class="text-right"><strong>{{ t('room.table.average') }}</strong></td>

        <td class="text-center">
          <span v-if="showVotes && average != null">{{ average }}</span>
          <span v-else>-</span>
        </td>
      </tr>

      <tr v-if="hasNumericCards">
        <td class="text-right"><strong>{{ t('room.table.median') }}</strong></td>

        <td class="text-center">
          <span v-if="showVotes && median != null">{{ median }}</span>
          <span v-else>-</span>
        </td>
      </tr>
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
  import { isUserOnline, type RoomUser } from '@/utils/presence'
  import { averageVote, countVotes, medianVote, type RoomUserWithId, sortRoomUsers } from '@/utils/roomStats'

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
