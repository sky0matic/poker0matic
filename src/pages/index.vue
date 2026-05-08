<template>
  <div class="setup-screen">
    <div class="setup-card">
      <div>
        <div class="kicker">Planning poker</div>
        <h1 class="setup-title">Start or join a room</h1>

        <p class="setup-desc">
          Create a voting room for your team, or enter an existing room code to jump back in.
        </p>
      </div>

      <router-link class="btn btn-primary" to="/create">
        <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.6"
          />
        </svg>
        Create room
      </router-link>

      <form class="setup-form" @submit.prevent="joinRoom">
        <div class="field-group">
          <label class="field-label">Room code</label>

          <input
            v-model="roomCode"
            autofocus
            class="field-input"
            placeholder="e.g. ab12cd34"
            required
          >
        </div>

        <button class="btn btn-ghost" :disabled="!roomCode.trim()" type="submit">
          Join room
        </button>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const roomCode = ref('')

  function joinRoom () {
    if (!roomCode.value.trim()) return
    router.push(`/rooms/${roomCode.value.trim()}`)
  }
</script>
