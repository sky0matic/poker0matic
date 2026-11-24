<template>
  <v-expansion-panels v-if="rounds.length > 0" class="round-history mt-4">
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon class="me-2" icon="mdi-history" size="small" />
        {{ t('room.history.title', { count: rounds.length }) }}
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <v-list density="compact">
          <div v-for="row in rows" :key="row.round.key" class="round-entry" role="listitem">
            <v-list-item class="round-item px-0" role="none">
              <v-list-item-title>
                {{ t('room.history.round', { n: row.round.number }) }}
                <span class="text-medium-emphasis text-caption ms-1">{{ formatElapsed(row.stats.durationSeconds) }}</span>
              </v-list-item-title>

              <v-list-item-subtitle class="round-details">{{ row.details }}</v-list-item-subtitle>

              <template #append>
                <v-btn
                  v-if="hasChart(row)"
                  :aria-controls="chartId(row)"
                  :aria-expanded="isExpanded(row)"
                  :aria-label="t(isExpanded(row) ? 'room.history.hideChart' : 'room.history.showChart')"
                  class="toggle-round-chart"
                  :icon="isExpanded(row) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  size="small"
                  :title="t(isExpanded(row) ? 'room.history.hideChart' : 'room.history.showChart')"
                  variant="text"
                  @click="toggleChart(row)"
                />

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

            <v-expand-transition>
              <div
                v-if="hasChart(row) && isExpanded(row)"
                :id="chartId(row)"
                class="round-chart pb-2"
              >
                <VoteDistribution
                  :average="row.stats.average"
                  :distribution="row.stats.distribution"
                  hide-title
                  :label="t('room.history.chartLabel', { n: row.round.number })"
                  :median="row.stats.median"
                  :suggestion="row.stats.suggestion"
                />
              </div>
            </v-expand-transition>
          </div>
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
  import { computed, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import VoteDistribution from '@/components/VoteDistribution.vue'
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

  /** Keys of the rounds whose chart is shown; keyed by round so it survives new rounds. */
  const expanded = ref(new Set<string>())

  /** Whether the round has votes to chart; gates both the toggle and the chart so they can't diverge. */
  function hasChart (row: Row) {
    return row.stats.distribution.length > 0
  }

  function isExpanded (row: Row) {
    return expanded.value.has(row.round.key)
  }

  function toggleChart (row: Row) {
    const next = new Set(expanded.value)
    if (next.has(row.round.key)) {
      next.delete(row.round.key)
    } else {
      next.add(row.round.key)
    }
    expanded.value = next
  }

  function chartId (row: Row) {
    return `round-chart-${row.round.key}`
  }

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
