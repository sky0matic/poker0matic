<script setup lang="ts">
  import { computed, ref, watch } from 'vue'

  type VoteValue = number | string

  interface RoundStats {
    avg: number
    median: number
    closest: number
    min: number
    max: number
    counts: Record<number, number>
    maxCount: number
    total: number
    consensus: 'consensus' | 'close' | 'split'
  }

  const props = defineProps<{
    collapsed: boolean
    selectedVote: VoteValue | null
    userName: string
    voteOptions: readonly VoteValue[]
    showVotes: boolean
    stats: RoundStats | null
    displayVoteCounts: Record<string, number> | null
    historyEnabled: boolean
    committedVote: string | null
  }>()

  const emit = defineEmits<{
    'update:collapsed': [value: boolean]
    'cast-vote': [value: VoteValue]
    'commit-vote': [value: string]
  }>()

  const customVoteInput = ref('')

  watch(() => props.showVotes, showing => {
    if (!showing) customVoteInput.value = ''
  })

  const consensusLabel = computed(() => {
    if (!props.stats) return ''
    if (props.stats.consensus === 'consensus') return 'Consensus'
    if (props.stats.consensus === 'close') return 'Near match'
    return 'Split vote'
  })

  const consensusClass = computed(() => {
    if (!props.stats) return 'wait'
    return props.stats.consensus === 'split' ? 'no' : 'yes'
  })

  const maxVoteCount = computed(() => {
    if (!props.displayVoteCounts) return 0
    return Math.max(...Object.values(props.displayVoteCounts))
  })

  function formatNum (num: number | null | undefined): string {
    if (num == null) return '-'
    return Number.isInteger(num) ? String(num) : String(Number.parseFloat(num.toFixed(2)))
  }

  function commitValue (value: string) {
    if (!props.historyEnabled) return
    emit('commit-vote', value)
    // Do NOT update customVoteInput — the text box is independent
  }

  function commitCustom () {
    const val = customVoteInput.value.trim()
    if (!val) return
    emit('commit-vote', val)
  }
</script>

<template>
  <aside class="dock" :class="{ 'dock-collapsed': collapsed }">

    <!-- ── Voting state ───────────────────────────────────────────────── -->
    <template v-if="!showVotes && !collapsed">
      <div class="dock-cards">
        <button
          v-for="option in voteOptions"
          :key="option"
          class="vote-card"
          :class="{ selected: selectedVote === option }"
          :data-val="option"
          type="button"
          @click="$emit('cast-vote', option)"
        >
          <span class="corner tl">{{ option }}</span>
          {{ option }}
          <span class="corner br">{{ option }}</span>
        </button>
      </div>

      <div class="dock-hint">
        Playing as <strong>{{ userName }}</strong> · tap a card to vote
      </div>
    </template>

    <!-- ── Insights state ────────────────────────────────────────────── -->
    <template v-if="showVotes && !collapsed">
      <!-- Header at top -->
      <div class="dock-insights-header">
        <span class="dock-insights-label">Round insights</span>
        <span v-if="stats" class="consensus-pill" :class="consensusClass">{{ consensusLabel }}</span>
        <span class="dock-insights-spacer" />

        <span v-if="committedVote" class="dock-committed-badge">
          <v-icon icon="mdi-check-circle" size="13" />
          {{ committedVote }}
        </span>

        <span v-else-if="historyEnabled" class="dock-committed-hint">click a card to set final estimate</span>
      </div>

      <!-- Distribution as cards -->
      <div class="dock-cards">
        <template v-if="displayVoteCounts">
          <div
            v-for="(count, value) in displayVoteCounts"
            :key="value"
            class="dist-card-wrap"
          >
            <div
              class="vote-card dist-card"
              :class="{
                'dist-mode': count === maxVoteCount,
                'dist-committed': String(value) === committedVote,
                'dist-clickable': historyEnabled,
              }"
              :data-val="value"
              @click="commitValue(String(value))"
            >
              <span class="corner tl">{{ value }}</span>
              {{ value }}
              <span class="corner br">{{ value }}</span>
            </div>

            <span class="dist-count">× {{ count }}</span>
          </div>
        </template>

        <div v-else class="dock-no-data">
          No votes to display
        </div>
      </div>

      <!-- Stats line -->
      <div class="dock-hint dock-stats-hint">
        <template v-if="stats">
          <template v-if="historyEnabled">
            <button class="dock-stat-btn" @click="commitValue(formatNum(stats.avg))">
              Avg <strong>{{ formatNum(stats.avg) }}</strong>
            </button>

            <span class="dock-hint-sep">·</span>

            <button class="dock-stat-btn" @click="commitValue(formatNum(stats.median))">
              Median <strong>{{ formatNum(stats.median) }}</strong>
            </button>

            <span class="dock-hint-sep">·</span>

            <button class="dock-stat-btn" @click="commitValue(String(stats.closest))">
              Closest <strong>{{ stats.closest }}</strong>
            </button>

            <span class="dock-hint-sep">·</span>
            Spread <strong>{{ stats.min }}–{{ stats.max }}</strong>
          </template>

          <template v-else>
            Avg <strong>{{ formatNum(stats.avg) }}</strong>
            <span class="dock-hint-sep">·</span>
            Median <strong>{{ formatNum(stats.median) }}</strong>
            <span class="dock-hint-sep">·</span>
            Closest <strong>{{ stats.closest }}</strong>
            <span class="dock-hint-sep">·</span>
            Spread <strong>{{ stats.min }}–{{ stats.max }}</strong>
          </template>
        </template>

        <template v-else>
          No numeric votes this round
        </template>
      </div>

      <!-- Custom vote input (only when historyEnabled) -->
      <div v-if="historyEnabled" class="dock-custom-row">
        <input
          v-model="customVoteInput"
          class="dock-custom-input"
          placeholder="Custom estimate…"
          @keydown.enter="commitCustom"
        >

        <button
          v-if="customVoteInput.trim()"
          class="dock-custom-confirm"
          type="button"
          @click="commitCustom"
        >
          Set
        </button>
      </div>
    </template>

    <!-- ── Toggle (always at bottom) ─────────────────────────────────── -->
    <div class="dock-toggle" @click="$emit('update:collapsed', !collapsed)">
      <template v-if="collapsed">
        <span v-if="showVotes && committedVote" class="dock-mini-vote">{{ committedVote }}</span>
        <span v-else-if="showVotes && stats" class="dock-mini-vote">avg {{ formatNum(stats.avg) }}</span>
        <span v-else-if="selectedVote != null" class="dock-mini-vote">{{ selectedVote }}</span>
      </template>

      <span class="dock-toggle-label">
        <template v-if="collapsed">
          {{ showVotes ? 'Expand insights' : (selectedVote != null ? 'Your vote · expand deck' : 'Expand deck') }}
        </template>

        <template v-else>
          {{ showVotes ? 'Collapse insights' : 'Collapse deck' }}
        </template>
      </span>

      <v-icon :icon="collapsed ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
    </div>
  </aside>
</template>
