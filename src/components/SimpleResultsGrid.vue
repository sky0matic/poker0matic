<script setup lang="ts">
  import { computed } from 'vue'
  import PlayerAvatar from './PlayerAvatar.vue'

  type VoteValue = number | string

  interface GridPlayer {
    userId: string
    name: string
    joinedAt: number
    vote?: VoteValue
  }

  const props = defineProps<{
    players: GridPlayer[]
    currentUserId: string | null
    showVotes: boolean
  }>()

  const sortedPlayers = computed(() => {
    if (!props.showVotes) {
      return props.players.toSorted((a, b) => a.joinedAt - b.joinedAt)
    }
    // Post-reveal: sort by vote descending
    return props.players.toSorted((a, b) => {
      const rank = (v?: VoteValue) =>
        v == null ? -2 : (typeof v === 'number' ? v : -1)
      return rank(b.vote) - rank(a.vote)
    })
  })
</script>

<template>
  <div class="results-grid">
    <div class="rg-header">
      <span>Player</span>
      <span>{{ showVotes ? 'Vote' : 'Status' }}</span>
    </div>

    <div
      v-for="player in sortedPlayers"
      :key="player.userId"
      class="rg-row"
      :class="{ 'rg-row-you': player.userId === currentUserId }"
    >
      <div class="rg-name-cell">
        <PlayerAvatar :name="player.name" :size="28" />
        <span class="rg-name">{{ player.name }}</span>
        <span v-if="player.userId === currentUserId" class="rg-you-badge">you</span>
      </div>

      <span
        v-if="showVotes"
        class="rg-vote"
        :class="{ 'rg-vote-empty': player.vote == null }"
      >
        {{ player.vote != null ? player.vote : '—' }}
      </span>

      <span v-else class="rg-status" :class="player.vote != null ? 'rg-status-voted' : 'rg-status-waiting'">
        {{ player.vote != null ? 'voted' : 'waiting' }}
      </span>
    </div>

    <div v-if="players.length === 0" class="rg-empty">No players</div>
  </div>
</template>
