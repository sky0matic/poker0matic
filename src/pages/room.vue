<template>
  <v-container>
    <v-card v-if="currentRoom && !showNamePrompt" class="mt-4">
      <v-card-title class="d-flex align-center">
        {{ currentRoom.name }}
        <v-btn
          class="ms-2"
          density="compact"
          :disabled="!firebaseConfig"
          icon="mdi-link-variant"
          variant="tonal"
          @click="shareRoomConfig"
        />
      </v-card-title>

      <v-alert
        v-if="showUpdateBanner"
        class="mx-4 mt-4"
        closable
        color="info"
        density="compact"
        icon="mdi-information-outline"
        variant="tonal"
        @click:close="dismissBanner"
      >
        <div class="text-subtitle-2 mb-1">This room is missing newer features:</div>

        <ul class="ps-4">
          <li v-for="entry in newPendingChangelog" :key="entry">{{ entry }}</li>
        </ul>

        <details v-if="acknowledgedPendingChangelog.length > 0" class="mt-2">
          <summary class="text-caption text-medium-emphasis" style="cursor: pointer">Previously acknowledged features</summary>

          <ul class="ps-4 mt-1">
            <li
              v-for="entry in acknowledgedPendingChangelog"
              :key="entry"
              class="text-caption text-medium-emphasis"
            >{{ entry }}</li>
          </ul>
        </details>

        <div class="text-caption mt-2">Want these features? Have someone create a new room.</div>
      </v-alert>

      <v-card-text>
        <div class="text-body-2 mb-2">Playing as: {{ userName }}</div>

        <div class="text-subtitle-1 mb-2">Vote cards</div>

        <v-row align="center" class="mb-4">
          <v-col cols="12" sm="10">
            <div class="vote-cards">
              <v-chip
                v-for="option in voteOptions"
                :key="option"
                class="vote-card ma-1"
                :class="{ 'selected': selectedVote === option }"
                @click="castVote(option)"
              >
                {{ option }}
              </v-chip>
            </div>
          </v-col>
        </v-row>

        <v-row class="mb-4">
          <v-col cols="12" sm="6">
            <v-btn block color="primary" :disabled="showVotes || votedCount === 0" @click="revealVotes">
              Reveal votes
            </v-btn>
          </v-col>

          <v-col cols="12" sm="6">
            <v-btn block color="error" @click="resetVotes">
              Reset votes
            </v-btn>
          </v-col>
        </v-row>

        <div
          class="text-caption mb-2 d-flex align-center gap-1"
          :class="{
            'text-medium-emphasis': timerStatus === 'normal',
            'text-warning': timerStatus === 'target',
            'text-error': timerStatus === 'ceiling',
          }"
        >
          Time since reset: {{ formatElapsed(elapsedSeconds) }}

          <v-tooltip v-if="timerStatus !== 'normal'" location="end">
            <template #activator="{ props }">
              <v-icon
                v-bind="props"
                :icon="timerStatus === 'ceiling' ? 'mdi-clock-alert' : 'mdi-clock-alert-outline'"
                size="x-small"
              />
            </template>

            <span v-if="timerStatus === 'target'">Past the target duration set for this room</span>
            <span v-else>Past the ceiling duration — consider a team discussion before re-estimating</span>
          </v-tooltip>
        </div>

        <v-data-table
          class="elevation-1"
          :headers="headers"
          hide-default-footer
          :items="sortedRoomUsers"
          items-per-page="-1"
          :row-props="({ item }) => item.userId === configStore.userId ? { class: 'font-weight-bold' } : {}"
        >
          <template #header.vote="{ column }">
            <div>
              {{ column.title }}
              <div v-if="totalPlayers > 0" class="text-caption">
                {{ votedCount }}/{{ totalPlayers }}
              </div>
            </div>
          </template>

          <template #item.vote="{ item }">
            <span v-if="showVotes">
              {{ item.vote != null ? item.vote : 'No vote' }}
            </span>

            <span v-else>
              <v-icon v-if="item.vote != null" color="success" icon="mdi-check-circle" />
              <v-icon v-else color="disabled" icon="mdi-circle-outline" />
            </span>
          </template>

          <template #body.append>
            <tr v-if="hasNumericCards">
              <td class="text-right"><strong>Average</strong></td>

              <td class="text-center">
                <span v-if="showVotes && averageVote != null">{{ averageVote }}</span>
                <span v-else>-</span>
              </td>
            </tr>

            <tr v-if="hasNumericCards">
              <td class="text-right"><strong>Median</strong></td>

              <td class="text-center">
                <span v-if="showVotes && medianVote != null">{{ medianVote }}</span>
                <span v-else>-</span>
              </td>
            </tr>
          </template>
        </v-data-table>

      </v-card-text>
    </v-card>

    <v-snackbar v-model="roomNotFound" color="error" :timeout="-1">
      Room not found. Redirecting...
    </v-snackbar>

    <v-dialog v-model="showNamePrompt" max-width="500" persistent>
      <v-card>
        <v-card-title>Join room</v-card-title>

        <v-card-text>
          <p>{{ dialogDescription }}</p>

          <v-form @submit.prevent="submitName">
            <v-text-field
              v-model="name"
              autofocus
              :counter="MAX_NAME_LENGTH"
              label="Your name"
              :maxlength="MAX_NAME_LENGTH"
              required
            />

            <v-card-actions class="justify-end">
              <v-btn color="primary" :disabled="!name" type="submit">
                Join room
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
  import type { DataTableHeader } from 'vuetify'
  import { ref as dbRef, onValue } from 'firebase/database'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { CURRENT_ROOM_VERSION, ROOM_CHANGELOG } from '@/config/roomVersions'
  import { useConfigStore } from '@/stores/config'
  import { useRoomStore } from '@/stores/room'

  function formatElapsed (seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const route = useRoute()
  const router = useRouter()
  const configStore = useConfigStore()
  const roomStore = useRoomStore()
  const roomId = route.params.roomId as string

  const MAX_NAME_LENGTH = 20
  const VOTE_OPTIONS_DEFAULT: Array<number | string> = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?', '☕']
  const { userName, firebaseConfig } = storeToRefs(configStore)

  const headers: DataTableHeader[] = [
    { title: 'Name', value: 'name' },
    { title: 'Vote', value: 'vote', width: '20%', align: 'center' },
  ]

  const currentRoom = ref<{ name: string, createdAt: number, createdBy: string, settings?: { showVotes?: boolean, v?: number, cards?: Array<number | string> | Record<string, number | string>, targetDuration?: number, ceilingDuration?: number }, lastActivity?: number, resetAt?: number } | null>(null)
  const roomUsers = ref<Record<string, { name: string, joinedAt: number, vote?: number | string }>>({})

  const db = configStore.getDb()

  const name = ref(userName.value || '')
  const showNamePrompt = ref(!userName.value)
  const roomNotFound = ref(false)
  let hasAutoJoined = false
  let redirectTimeout: ReturnType<typeof setTimeout> | null = null

  const elapsedSeconds = ref(0)
  const timerOrigin = ref(Date.now())
  let timerInterval: ReturnType<typeof setInterval> | null = null

  const showVotes = computed(() => currentRoom.value?.settings?.showVotes === true)

  const timerStatus = computed(() => {
    const ceiling = currentRoom.value?.settings?.ceilingDuration
    const target = currentRoom.value?.settings?.targetDuration
    if (ceiling != null && elapsedSeconds.value >= ceiling) {
      return 'ceiling'
    }
    if (target != null && elapsedSeconds.value >= target) {
      return 'target'
    }
    return 'normal'
  })

  const hasNumericCards = computed(() => voteOptions.value.some(v => typeof v === 'number'))

  const voteOptions = computed<Array<number | string>>(() => {
    const raw = currentRoom.value?.settings?.cards
    if (!raw) return VOTE_OPTIONS_DEFAULT
    const arr = Array.isArray(raw) ? raw : Object.values(raw)
    return arr.length > 0 ? arr : VOTE_OPTIONS_DEFAULT
  })

  watch(
    () => currentRoom.value?.resetAt ?? currentRoom.value?.createdAt,
    origin => {
      if (origin != null) timerOrigin.value = origin
    },
    { immediate: true },
  )
  const votedCount = computed(() =>
    Object.values(roomUsers.value).filter(user => user.vote != null).length,
  )
  const totalPlayers = computed(() => Object.keys(roomUsers.value).length)
  const selectedVote = computed(() => {
    if (!configStore.userId || !roomUsers.value[configStore.userId]) return null
    return roomUsers.value[configStore.userId].vote ?? null
  })

  const averageVote = computed(() => {
    const votes = Object.values(roomUsers.value)
      .map(user => user.vote)
      .filter(vote => typeof vote === 'number') as number[]

    if (votes.length === 0) return null

    const sum = votes.reduce((acc, val) => acc + val, 0)
    return Number.parseFloat((sum / votes.length).toFixed(2))
  })

  const medianVote = computed(() => {
    const votes = Object.values(roomUsers.value)
      .map(user => user.vote)
      .filter(vote => typeof vote === 'number') as number[]

    if (votes.length === 0) return null

    const sorted = votes.toSorted((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  })

  const sortedRoomUsers = computed(() => {
    const withId = Object.entries(roomUsers.value).map(([userId, user]) => ({ userId, ...user }))

    if (showVotes.value) {
      const order = (vote: number | string | undefined): number => {
        if (vote == null) return Infinity
        const idx = voteOptions.value.indexOf(vote)
        return idx === -1 ? Infinity : idx
      }

      return withId.toSorted((a, b) => order(a.vote) - order(b.vote))
    }

    return withId.toSorted((a, b) => a.joinedAt - b.joinedAt)
  })

  const dialogDescription = computed(() =>
    currentRoom.value ? `Joining room "${currentRoom.value.name}".` : 'Joining room.',
  )

  const roomVersion = computed(() => {
    const v = currentRoom.value?.settings?.v
    return typeof v === 'number' ? v : 0
  })

  const dismissedVersion = ref(0)
  const isBannerDismissed = ref(false)

  watch(currentRoom, room => {
    if (!room) return
    const stored = localStorage.getItem(`room_dismissed_v_${roomId}`)
    const parsed = stored !== null ? Number.parseInt(stored) : 0
    dismissedVersion.value = parsed
    isBannerDismissed.value = parsed >= CURRENT_ROOM_VERSION
  }, { immediate: true })

  const newPendingChangelog = computed(() => {
    const fromVersion = Math.max(roomVersion.value, dismissedVersion.value)
    const entries: string[] = []
    for (let v = fromVersion + 1; v <= CURRENT_ROOM_VERSION; v++) {
      if (ROOM_CHANGELOG[v]) {
        entries.push(...ROOM_CHANGELOG[v])
      }
    }
    return entries
  })

  const acknowledgedPendingChangelog = computed(() => {
    if (dismissedVersion.value > roomVersion.value) {
      const entries: string[] = []
      for (let v = roomVersion.value + 1; v <= dismissedVersion.value; v++) {
        if (ROOM_CHANGELOG[v]) {
          entries.push(...ROOM_CHANGELOG[v])
        }
      }
      return entries
    }
    return []
  })

  const showUpdateBanner = computed(() =>
    currentRoom.value != null && !isBannerDismissed.value && newPendingChangelog.value.length > 0,
  )

  function dismissBanner () {
    localStorage.setItem(`room_dismissed_v_${roomId}`, String(CURRENT_ROOM_VERSION))
    isBannerDismissed.value = true
  }

  watch(userName, newName => {
    if (!currentRoom.value) return
    roomStore.updateUserName(roomId, newName)
  })

  let unsubscribeRoom: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null

  onMounted(() => {
    if (!db) return

    timerInterval = setInterval(() => {
      if (showVotes.value) return
      elapsedSeconds.value = Math.floor((Date.now() - timerOrigin.value) / 1000)
    }, 1000)

    const roomRef = dbRef(db, `rooms/${roomId}`)
    unsubscribeRoom = onValue(roomRef, snapshot => {
      const data = snapshot.val()

      if (!data) {
        roomNotFound.value = true
        configStore.setActiveRoom(null, null)
        redirectTimeout = setTimeout(() => router.replace('/'), 3000)
        return
      }

      currentRoom.value = data
      configStore.setActiveRoom(roomId, data.name)

      if (!hasAutoJoined && userName.value) {
        hasAutoJoined = true
        if (!data.users || Object.keys(data.users).length === 0) {
          roomStore.resetTimer(roomId)
        }
        joinRoom()
      }
    })

    const usersRef = dbRef(db, `rooms/${roomId}/users`)
    unsubscribeUsers = onValue(usersRef, snapshot => {
      roomUsers.value = snapshot.val() || {}
    })
  })

  onUnmounted(() => {
    unsubscribeRoom?.()
    unsubscribeUsers?.()
    if (redirectTimeout !== null) clearTimeout(redirectTimeout)
    if (timerInterval !== null) clearInterval(timerInterval)
  })

  function joinRoom () {
    roomStore.joinRoom(roomId)
  }

  function submitName () {
    const userNameValue = name.value.trim().slice(0, MAX_NAME_LENGTH)
    if (!userNameValue) return

    name.value = userNameValue
    configStore.setUserName(userNameValue)
    hasAutoJoined = true
    joinRoom()
    showNamePrompt.value = false
  }

  function shareRoomConfig () {
    if (!firebaseConfig.value) return

    const encoded = btoa(JSON.stringify(firebaseConfig.value))
    const url = `${window.location.origin}${import.meta.env.BASE_URL}rooms/${encodeURIComponent(roomId)}?config=${encodeURIComponent(encoded)}`

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => window.alert('Room link with config copied to clipboard'))
        .catch(() => window.prompt('Copy this room URL', url))
    } else {
      window.prompt('Copy this room URL', url)
    }
  }

  function castVote (value: number | string) {
    roomStore.castVote(roomId, value)
  }

  function revealVotes () {
    roomStore.revealVotes(roomId)
  }

  function resetVotes () {
    roomStore.resetVotes(roomId, Object.keys(roomUsers.value))
    elapsedSeconds.value = 0
  }
</script>

<style scoped>
.vote-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vote-card {
  width: 60px;
  height: 80px;
  border-radius: 8px;
  background: white !important;
  color: black !important;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.vote-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.vote-card.selected {
  border-color: #1976d2;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  background: #1976d2 !important;
  color: white !important;
}
</style>
