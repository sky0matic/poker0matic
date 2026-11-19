<template>
  <v-expansion-panels v-if="rounds.length > 0" class="round-history mt-4">
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon class="me-2" icon="mdi-history" size="small" />
        {{ t('room.history.title', { count: rounds.length }) }}
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <v-list density="compact">
          <v-list-item
            v-for="row in rows"
            :key="row.round.key"
            class="round-item px-0"
          >
            <v-list-item-title>
              {{ t('room.history.round', { n: row.round.number }) }}
              <span class="text-medium-emphasis text-caption ms-1">{{ formatElapsed(row.stats.durationSeconds) }}</span>
            </v-list-item-title>

            <v-list-item-subtitle class="round-details">{{ row.details }}</v-list-item-subtitle>

            <template #append>
              <v-btn
                :aria-label="t('room.history.copy')"
                class="copy-round"
                icon="mdi-content-copy"
                size="small"
                :title="t('room.history.copy')"
                variant="text"
                @click="emit('copy', row.summary)"
              />
            </template>
          </v-list-item>
        </v-list>

        <div class="d-flex justify-end mt-2">
          <v-btn
            class="clear-history"
            :disabled="!canClear"
            prepend-icon="mdi-delete-sweep"
            size="small"
            variant="text"
            @click="emit('clear')"
          >
            {{ t('room.history.clear') }}
          </v-btn>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
  import type { CardValue } from '@/config/cardDecks'
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { formatElapsed } from '@/composables/useRoomTimer'
  import { type Round, roundStats, sortVotes } from '@/utils/roundHistory'

  const props = defineProps<{
    /** Rounds of the current session, oldest first. */
    rounds: Round[]
    voteOptions: CardValue[]
    canClear: boolean
  }>()

  const emit = defineEmits<{
    /** Plain-text summary of a round, to put in the clipboard. */
    copy: [summary: string]
    clear: []
  }>()

  const { t } = useI18n()

  const rows = computed(() => props.rounds.toReversed().map(round => {
    const stats = roundStats(round)
    const votes = sortVotes(round.votes, props.voteOptions)
    const parts = [t('room.history.votes', { votes: votes.length > 0 ? votes.join(', ') : '—' })]
    if (stats.average != null) {
      parts.push(t('room.history.average', { value: stats.average }))
    }
    if (stats.median != null) {
      parts.push(t('room.history.median', { value: stats.median }))
    }
    const details = parts.join(' · ')
    const summary = `${t('room.history.round', { n: round.number })} — ${parts.join(' — ')} — ${formatElapsed(stats.durationSeconds)}`
    return { round, stats, details, summary }
  }))
</script>
