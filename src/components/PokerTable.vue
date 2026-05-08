<script setup lang="ts">
  import PlayerAvatar from './PlayerAvatar.vue'

  type VoteValue = number | string

  interface TablePlayer {
    userId: string
    name: string
    joinedAt: number
    vote?: VoteValue
  }

  const props = defineProps<{
    players: TablePlayer[]
    showVotes: boolean
    currentUserId: string | null
    shakingUserIds?: string[]
  }>()

  const getPlayerIndex = (userId: string) => props.players.findIndex(player => player.userId === userId)
</script>

<template>
  <div class="table" data-cstyle="real">
    <div class="players">
      <div
        v-for="player in players"
        :key="player.userId"
        class="player"
        :class="{ 'is-you': player.userId === currentUserId }"
      >
        <div class="avatar" :class="{ 'has-voted': player.vote != null }">
          <PlayerAvatar :name="player.name" :size="64" />
        </div>

        <div
          class="pcard"
          :class="{
            flipped: showVotes && player.vote != null,
            'has-vote': player.vote != null,
            'no-vote': player.vote == null,
            shaking: shakingUserIds?.includes(player.userId),
          }"
          :style="{ '--flip-delay': showVotes && player.vote != null ? `${getPlayerIndex(player.userId) * 90}ms` : '0ms' }"
        >
          <div class="pcard-back">
            <span class="logo">P0</span>
          </div>

          <div class="pcard-face">
            <span class="corner tl">{{ player.vote }}</span>
            {{ player.vote }}
            <span class="corner br">{{ player.vote }}</span>
          </div>
        </div>

        <div
          class="pname"
          :class="{
            voted: player.vote != null,
            you: player.userId === currentUserId,
          }"
        >
          <span v-if="player.vote != null" class="check-mini">
            <svg fill="none" height="8" viewBox="0 0 11 11" width="8">
              <path
                d="M2 5.5L4.5 8L9 3"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </span>

          <span>{{ player.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
