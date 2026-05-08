<script setup lang="ts">
  type VoteValue = number | string

  interface RoundStats {
    avg: number
    consensus: 'consensus' | 'close' | 'split'
  }

  defineProps<{
    collapsed: boolean
    showVotes: boolean
    selectedVote: VoteValue | null
    userName: string
    voteOptions: readonly VoteValue[]
    stats: RoundStats | null
  }>()

  defineEmits<{
    'update:collapsed': [value: boolean]
    'cast-vote': [value: VoteValue]
    'reset-votes': []
  }>()

  function formatNum (num: number | null | undefined): string {
    if (num == null) return '-'
    return Number.isInteger(num) ? String(num) : String(Number.parseFloat(num.toFixed(2)))
  }
</script>

<template>
  <aside
    class="dock"
    :class="{ revealed: showVotes, 'dock-collapsed': collapsed }"
  >
    <v-btn
      :aria-label="collapsed ? 'Expand voting cards' : 'Collapse voting cards'"
      class="dock-collapse-btn"
      density="compact"
      icon
      variant="text"
      @click="$emit('update:collapsed', !collapsed)"
    >
      <v-icon :icon="collapsed ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="18" />
    </v-btn>

    <template v-if="collapsed">
      <div class="dock-mini-bar">
        <span class="dock-mini-label">
          {{ showVotes ? 'Votes revealed' : `Playing as ${userName}` }}
        </span>

        <span v-if="selectedVote != null && !showVotes" class="dock-mini-vote">
          {{ selectedVote }}
        </span>
      </div>
    </template>

    <template v-else>
      <template v-if="!showVotes">
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

        <div class="dock-actions">
          <span>Playing as</span>
          <span class="dock-user">{{ userName }}</span>
          <span class="sep">-</span>
          <span>tap a card to vote</span>
        </div>
      </template>

      <template v-else>
        <div class="dock-reveal-head">
          <span class="dock-reveal-label">Votes revealed</span>

          <span class="dock-reveal-hint">
            Review the stats and start a new round when ready.
          </span>
        </div>

        <div class="dock-reveal-confirm">
          <span class="dock-reveal-final">
            Average:
            <strong>{{ stats ? formatNum(stats.avg) : '-' }}</strong>

            <span v-if="stats?.consensus === 'consensus'" class="consensus-inline">
              Consensus
            </span>
          </span>

          <v-btn
            class="p0-btn p0-btn-ghost"
            prepend-icon="mdi-refresh"
            variant="flat"
            @click="$emit('reset-votes')"
          >
            New round
          </v-btn>
        </div>
      </template>
    </template>
  </aside>
</template>
