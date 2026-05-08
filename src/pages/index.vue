<template>
  <v-container class="setup-screen" fluid>
    <v-card class="setup-card" flat>
      <div>
        <div class="kicker">Planning poker</div>
        <h1 class="setup-title">Start or join a room</h1>

        <p class="setup-desc">
          Create a voting room for your team, or enter an existing room code to jump back in.
        </p>
      </div>

      <v-btn
        class="p0-btn p0-btn-primary"
        prepend-icon="mdi-arrow-right"
        to="/create"
        variant="flat"
      >
        Create room
      </v-btn>

      <v-form class="setup-form" @submit.prevent="joinRoom">
        <v-text-field
          v-model="roomCode"
          autofocus
          class="p0-field"
          hide-details="auto"
          label="Room code"
          placeholder="e.g. ab12cd34"
          required
          variant="outlined"
        />

        <v-btn
          class="p0-btn p0-btn-ghost"
          :disabled="!roomCode.trim()"
          type="submit"
          variant="flat"
        >
          Join room
        </v-btn>
      </v-form>

      <div v-if="configStore.recentRooms.length > 0" class="recent-rooms">
        <div class="kicker">Recent rooms</div>

        <div class="recent-list">
          <div
            v-for="room in configStore.recentRooms"
            :key="room.id"
            class="recent-room-row"
          >
            <router-link class="recent-room-item" :to="`/rooms/${room.id}`">
              <div class="recent-room-info">
                <span class="recent-room-name">{{ room.name }}</span>
                <span class="recent-room-id">{{ room.id }}</span>
              </div>

              <v-icon icon="mdi-arrow-right" size="16" />
            </router-link>

            <button
              class="recent-room-dismiss"
              title="Remove from recents"
              type="button"
              @click.prevent="configStore.removeRecentRoom(room.id)"
            >
              <v-icon icon="mdi-close" size="13" />
            </button>
          </div>
        </div>
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useConfigStore } from '@/stores/config'

  const router = useRouter()
  const configStore = useConfigStore()
  const roomCode = ref('')

  function joinRoom () {
    if (!roomCode.value.trim()) return
    router.push(`/rooms/${roomCode.value.trim()}`)
  }
</script>
