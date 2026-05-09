<template>
  <v-container class="setup-screen" fluid>
    <!-- Config fields missing or empty -->
    <v-card v-if="configStatus === 'incomplete'" class="setup-card" flat>
      <div>
        <div class="kicker">Setup required</div>
        <h1 class="setup-title">Connect to Firebase</h1>
        <p class="setup-desc">
          To create and join planning rooms, connect this app to your Firebase Realtime Database project.
          You can update the configuration later from the
          <strong style="color: var(--text-1)">user menu</strong> in the top-right corner.
        </p>
      </div>

      <v-btn
        class="p0-btn p0-btn-primary"
        prepend-icon="mdi-cog"
        variant="flat"
        @click="configModalOpen = true"
      >
        Set up configuration
      </v-btn>
    </v-card>

    <!-- Config present but Firebase unreachable -->
    <v-card v-else-if="configStatus === 'unreachable'" class="setup-card" flat>
      <div>
        <div class="kicker">Connection failed</div>
        <h1 class="setup-title">Firebase unreachable</h1>
        <p class="setup-desc">
          A configuration was found but the Firebase database could not be reached.
          Check your credentials, database URL, and network connection.
          Configuration is also accessible from the
          <strong style="color: var(--text-1)">user menu</strong>.
        </p>
      </div>

      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <v-btn
          class="p0-btn p0-btn-ghost"
          prepend-icon="mdi-refresh"
          variant="flat"
          @click="runChecks"
        >
          Retry
        </v-btn>

        <v-btn
          class="p0-btn p0-btn-primary"
          prepend-icon="mdi-cog"
          variant="flat"
          @click="configModalOpen = true"
        >
          Review configuration
        </v-btn>
      </div>
    </v-card>

    <!-- Normal lobby -->
    <v-card v-else-if="configStatus === 'valid'" class="setup-card" flat>
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

  <ConfigModal v-model="configModalOpen" />
  <FullScreenLoader :model-value="configStatus === 'checking'" message="Checking…" />
</template>

<script lang="ts" setup>
  import { get, ref as dbRef } from 'firebase/database'
  import { onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import ConfigModal from '@/components/ConfigModal.vue'
  import FullScreenLoader from '@/components/FullScreenLoader.vue'
  import { useConfigStore } from '@/stores/config'

  type ConfigStatus = 'checking' | 'valid' | 'incomplete' | 'unreachable'

  const router = useRouter()
  const configStore = useConfigStore()
  const roomCode = ref('')
  const configModalOpen = ref(false)
  const configStatus = ref<ConfigStatus>('checking')

  // --- config validation ---------------------------------------------------

  async function checkConfig (): Promise<Exclude<ConfigStatus, 'checking'>> {
    if (!configStore.configFound || !configStore.firebaseConfig) return 'incomplete'

    const cfg = configStore.firebaseConfig
    if (Object.values(cfg).some(v => !String(v).trim())) return 'incomplete'

    // Validate by hitting the Firebase REST API directly — this always tests
    // the currently-saved databaseUrl regardless of any cached SDK state.
    const baseUrl = configStore.firebaseConfig.databaseUrl.replace(/\/$/, '')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    try {
      const res = await fetch(`${baseUrl}/.json?shallow=true&print=silent`, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      // 200/204 = readable, 401/403 = auth required but DB exists — URL is valid either way
      if (res.ok || res.status === 401 || res.status === 403) return 'valid'
      return 'unreachable'
    } catch {
      clearTimeout(timer)
      return 'unreachable'
    }
  }

  // --- stale room pruning --------------------------------------------------

  async function pruneRecentRooms () {
    const db = configStore.getDb()
    if (!db) return

    await Promise.all(
      configStore.recentRooms.map(async room => {
        try {
          const snap = await get(dbRef(db, `rooms/${room.id}/createdAt`))
          if (!snap.exists()) configStore.removeRecentRoom(room.id)
        } catch {
          // network error — keep room rather than wrongly removing it
        }
      }),
    )
  }

  // --- orchestration -------------------------------------------------------

  async function runChecks () {
    configStatus.value = 'checking'
    const status = await checkConfig()
    if (status === 'valid') await pruneRecentRooms()
    configStatus.value = status
  }

  onMounted(runChecks)

  // re-run whenever the config modal closes so new credentials take effect
  watch(configModalOpen, open => {
    if (!open && configStatus.value !== 'checking') runChecks()
  })

  // -------------------------------------------------------------------------

  function joinRoom () {
    if (!roomCode.value.trim()) return
    router.push(`/rooms/${roomCode.value.trim()}`)
  }
</script>
