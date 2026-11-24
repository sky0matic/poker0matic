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
                @click="copyRound(row)"
              />

              <v-btn
                :aria-label="t('room.history.copyImage')"
                class="copy-round-image"
                icon="mdi-image-outline"
                size="small"
                :title="t('room.history.copyImage')"
                variant="text"
                @click="copyRoundImage(row)"
              />
            </template>
          </v-list-item>
        </v-list>

        <div class="d-flex flex-wrap justify-end ga-2 mt-2">
          <v-btn
            class="copy-history"
            prepend-icon="mdi-content-copy"
            size="small"
            variant="text"
            @click="copyHistory"
          >
            {{ t('room.history.copyAll') }}
          </v-btn>

          <v-btn
            class="copy-history-image"
            prepend-icon="mdi-image-outline"
            size="small"
            variant="text"
            @click="copyHistoryImage"
          >
            {{ t('room.history.copyAllImage') }}
          </v-btn>

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
  import { svgToPngBlob } from '@/utils/rasterize'
  import { type Round, roundStats, type RoundStats, sortVotes } from '@/utils/roundHistory'
  import {
    historyChartSvg,
    type HistoryCopyRequest,
    historyText,
    type RoundChartInput,
    roundChartSvg,
  } from '@/utils/roundHistoryExport'

  const props = defineProps<{
    /** Rounds of the current session, oldest first. */
    rounds: Round[]
    voteOptions: CardValue[]
    canClear: boolean
  }>()

  const emit = defineEmits<{
    /** A round or the whole history to put in the clipboard, as text or as an image. */
    copy: [request: HistoryCopyRequest]
    clear: []
  }>()

  const { t, n } = useI18n()

  interface Row {
    round: Round
    stats: RoundStats
    details: string
    summary: string
    chart: RoundChartInput
  }

  /** Rounds oldest first, with their texts and chart. */
  const chronologicalRows = computed<Row[]>(() => props.rounds.map(round => {
    const stats = roundStats(round, props.voteOptions)
    const votes = sortVotes(round.votes, props.voteOptions)
    const average = stats.average == null ? null : n(stats.average, { useGrouping: false })
    const median = stats.median == null ? null : n(stats.median, { useGrouping: false })
    const parts = [t('room.history.votes', { votes: votes.length > 0 ? votes.join(', ') : '—' })]
    if (average != null) {
      parts.push(t('room.history.average', { value: average }))
    }
    if (median != null) {
      parts.push(t('room.history.median', { value: median }))
    }
    const details = parts.join(' · ')
    const roundTitle = t('room.history.round', { n: round.number })
    const summary = `${roundTitle} — ${parts.join(' — ')} — ${formatElapsed(stats.durationSeconds)}`
    const chart: RoundChartInput = {
      title: `${roundTitle} · ${formatElapsed(stats.durationSeconds)}`,
      stats: [
        ...(average == null ? [] : [t('room.distribution.average', { value: average })]),
        ...(median == null ? [] : [t('room.distribution.median', { value: median })]),
      ],
      suggestionLabel: stats.suggestion == null ? null : t('room.distribution.suggested', { vote: stats.suggestion }),
      buckets: stats.distribution,
      suggestion: stats.suggestion,
    }
    return { round, stats, details, summary, chart }
  }))

  /** Newest first, as displayed. */
  const rows = computed(() => chronologicalRows.value.toReversed())

  function copyRound (row: Row) {
    emit('copy', { kind: 'round', content: { text: row.summary } })
  }

  function copyRoundImage (row: Row) {
    emit('copy', { kind: 'roundImage', content: { text: row.summary, png: () => svgToPngBlob(roundChartSvg(row.chart)) } })
  }

  function historyContent () {
    const title = t('room.history.title', { count: props.rounds.length })
    const text = historyText(title, chronologicalRows.value.map(row => row.summary))
    const charts = chronologicalRows.value.map(row => row.chart)
    return { title, text, charts }
  }

  function copyHistory () {
    emit('copy', { kind: 'history', content: { text: historyContent().text } })
  }

  function copyHistoryImage () {
    const { title, text, charts } = historyContent()
    emit('copy', { kind: 'historyImage', content: { text, png: () => svgToPngBlob(historyChartSvg(title, charts)) } })
  }
</script>
