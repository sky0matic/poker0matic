<template>
  <v-container>
    <v-card v-if="currentRoom && !showNamePrompt" class="mt-4">
      <v-card-item>
        <v-card-title class="d-flex align-center text-h5">
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

        <template #append>
          <div class="d-flex align-center">
            <v-btn
              :class="{ 'all-voted': allVoted && !preferencesStore.reducedMotion }"
              color="primary"
              :disabled="showVotes || votedCount === 0"
              @click="revealVotes"
            >
              {{ t('room.revealVotes') }}
            </v-btn>

            <v-btn
              class="ms-2"
              color="error"
              @click="resetVotes"
            >
              {{ t('room.resetVotes') }}
            </v-btn>
          </div>
        </template>
      </v-card-item>

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
        <div class="text-subtitle-2 mb-1">{{ t('room.missingFeatures') }}</div>

        <ul class="ps-4">
          <li v-for="entry in newPendingChangelog" :key="entry">{{ entry }}</li>
        </ul>

        <details v-if="acknowledgedPendingChangelog.length > 0" class="mt-2">
          <summary class="text-caption text-medium-emphasis" style="cursor: pointer">{{ t('room.previouslyAcknowledged') }}</summary>

          <ul class="ps-4 mt-1">
            <li
              v-for="entry in acknowledgedPendingChangelog"
              :key="entry"
              class="text-caption text-medium-emphasis"
            >{{ entry }}</li>
          </ul>
        </details>

        <div class="text-caption mt-2">{{ t('room.wantFeatures') }}</div>
      </v-alert>

      <v-alert
        v-if="hasConnectedOnce && !isConnected"
        class="mx-4 mt-4"
        density="compact"
        icon="mdi-wifi-off"
        type="warning"
        variant="tonal"
      >
        {{ t('room.connection.lost') }}
      </v-alert>

      <v-card-text>
        <div
          class="text-caption mb-4 d-flex align-center gap-1"
          :class="{
            'text-medium-emphasis': timerStatus === 'normal',
            'text-warning': timerStatus === 'target',
            'text-error': timerStatus === 'ceiling',
          }"
        >
          <span>{{ t('room.timeSinceReset', { time: formatElapsed(elapsedSeconds) }) }}</span>

          <v-tooltip v-if="timerStatus !== 'normal'" location="end">
            <template #activator="{ props }">
              <v-icon
                v-bind="props"
                :icon="timerStatus === 'ceiling' ? 'mdi-clock-alert' : 'mdi-clock-alert-outline'"
                size="x-small"
              />
            </template>

            <span v-if="timerStatus === 'target'">{{ t('room.pastTarget') }}</span>
            <span v-else>{{ t('room.pastCeiling') }}</span>
          </v-tooltip>

          <span v-if="revealedAt != null" class="ml-1 text-medium-emphasis">
            {{ t('room.revealedAt', { time: formatElapsed(revealedAt) }) }}
          </span>
        </div>

        <div class="text-subtitle-1 mb-2">{{ t('room.yourVote') }}</div>

        <div class="vote-cards mb-4">
          <VoteCard
            v-for="option in voteOptions"
            :key="option"
            class="ma-1"
            :option="option"
            :selected="selectedVote === option"
            :vote-options="voteOptions"
            @click="castVote(option)"
          />
        </div>

        <v-data-table
          class="elevation-1"
          :headers="headers"
          hide-default-footer
          :items="sortedRoomUsers"
          items-per-page="-1"
          :row-props="({ item }) => item.userId === configStore.userId ? { class: 'font-weight-bold' } : {}"
        >
          <template #item.name="{ item }">
            {{ item.name }} <span v-if="item.userId === configStore.userId" class="text-medium-emphasis text-caption">{{ t('room.table.you') }}</span>
          </template>

          <template #header.vote="{ column }">
            <div>
              {{ column.title }}
              <div v-if="totalPlayers > 0" class="text-caption">
                {{ votedCount }}/{{ totalPlayers }}
              </div>
            </div>
          </template>

          <template #item.vote="{ item }">
            <div class="vote-cell">
              <VoteCard
                v-if="showVotes && item.vote != null"
                :option="item.vote"
                readonly
                :selected="false"
                small
                :vote-options="voteOptions"
              />

              <span v-else-if="showVotes" class="text-medium-emphasis">—</span>

              <CardBack v-else-if="item.vote != null" />
            </div>
          </template>

          <template #body.append>
            <tr v-if="hasNumericCards">
              <td class="text-right"><strong>{{ t('room.table.average') }}</strong></td>

              <td class="text-center">
                <span v-if="showVotes && averageVote != null">{{ averageVote }}</span>
                <span v-else>-</span>
              </td>
            </tr>

            <tr v-if="hasNumericCards">
              <td class="text-right"><strong>{{ t('room.table.median') }}</strong></td>

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
      {{ t('room.notFound') }}
    </v-snackbar>

    <v-snackbar v-model="showReconnected" color="success" :timeout="3000">
      {{ t('room.connection.restored') }}
    </v-snackbar>

    <v-dialog v-model="showNamePrompt" max-width="500" persistent>
      <v-card>
        <v-card-title>{{ t('room.joinDialog.title') }}</v-card-title>

        <v-card-text>
          <p>{{ dialogDescription }}</p>

          <v-form @submit.prevent="submitName">
            <v-text-field
              v-model="name"
              autofocus
              :counter="MAX_NAME_LENGTH"
              :label="t('room.joinDialog.yourName')"
              :maxlength="MAX_NAME_LENGTH"
              required
            />

            <v-card-actions class="justify-end">
              <v-btn color="primary" :disabled="!name" type="submit">
                {{ t('room.joinDialog.button') }}
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
  import { useI18n } from 'vue-i18n'
  import { useRoute, useRouter } from 'vue-router'

  import CardBack from '@/components/CardBack.vue'
  import VoteCard from '@/components/VoteCard.vue'
  import { CURRENT_ROOM_VERSION, ROOM_CHANGELOG } from '@/config/roomVersions'
  import { useConfigStore } from '@/stores/config'
  import { usePreferencesStore } from '@/stores/preferences'
  import { useRoomStore } from '@/stores/room'

  const { t } = useI18n()

  function formatElapsed (seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const route = useRoute()
  const router = useRouter()
  const configStore = useConfigStore()
  const preferencesStore = usePreferencesStore()
  const roomStore = useRoomStore()
  const roomId = route.params.roomId as string

  const MAX_NAME_LENGTH = 20
  const FORCE_RECONNECT_AFTER_HIDDEN_MS = 30_000
  const VOTE_OPTIONS_DEFAULT: Array<number | string> = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?', '☕']
  const { username, firebaseConfig } = storeToRefs(configStore)

  const headers = computed<DataTableHeader[]>(() => [
    { title: t('room.table.name'), value: 'name' },
    { title: t('room.table.vote'), value: 'vote', width: '20%', align: 'center' },
  ])

  const currentRoom = ref<{ name: string, createdAt: number, createdBy: string, settings?: { showVotes?: boolean, v?: number, cards?: Array<number | string> | Record<string, number | string>, targetDuration?: number, ceilingDuration?: number, revealedAt?: number }, lastActivity?: number, resetAt?: number } | null>(null)
  const roomUsers = ref<Record<string, { name: string, joinedAt: number, vote?: number | string }>>({})

  const db = configStore.getDb()

  const name = ref(username.value || '')
  const showNamePrompt = ref(!username.value)
  const roomNotFound = ref(false)
  let hasAutoJoined = false
  let hasJoined = false
  let joinedAt: number | undefined
  let lastVote: { value: number | string, round: number | undefined } | null = null
  let needsRejoin = false
  let hiddenAt: number | null = null
  let redirectTimeout: ReturnType<typeof setTimeout> | null = null

  const elapsedSeconds = ref(0)
  const timerOrigin = ref(Date.now())
  let timerInterval: ReturnType<typeof setInterval> | null = null

  const isConnected = ref(false)
  const hasConnectedOnce = ref(false)
  const showReconnected = ref(false)

  function currentRound (): number | undefined {
    return currentRoom.value?.resetAt ?? currentRoom.value?.createdAt
  }

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

  const revealedAt = ref<number | null>(null)

  watch(
    () => currentRoom.value?.settings?.revealedAt,
    ts => {
      revealedAt.value = ts == null ? null : Math.floor((ts - timerOrigin.value) / 1000)
    },
    { immediate: true },
  )

  watch(showVotes, revealed => {
    if (!revealed) revealedAt.value = null
    else if (revealedAt.value == null) revealedAt.value = elapsedSeconds.value
  })

  const votedCount = computed(() =>
    Object.values(roomUsers.value).filter(user => user.vote != null).length,
  )
  const totalPlayers = computed(() => Object.keys(roomUsers.value).length)
  const allVoted = computed(() =>
    totalPlayers.value > 0 && votedCount.value === totalPlayers.value && !showVotes.value,
  )
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
    currentRoom.value
      ? t('room.joinDialog.description', { name: currentRoom.value.name })
      : t('room.joinDialog.descriptionDefault'),
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
    const parsed = stored === null ? 0 : Number.parseInt(stored)
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

  watch(username, newName => {
    if (!currentRoom.value) return
    roomStore.updateUsername(roomId, newName)
  })

  let unsubscribeRoom: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null
  let unsubscribeConnection: (() => void) | null = null

  function onConnectionChange (connected: boolean) {
    const wasConnected = isConnected.value
    isConnected.value = connected
    if (!connected) return

    if (hasConnectedOnce.value && !wasConnected) {
      showReconnected.value = true
      // The cached room may be stale here: re-join from the next server snapshot instead.
      if (hasJoined) needsRejoin = true
    }
    hasConnectedOnce.value = true
  }

  function onVisibilityChange () {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }

    const hiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt
    hiddenAt = null
    if (hasJoined && isConnected.value && hiddenFor >= FORCE_RECONNECT_AFTER_HIDDEN_MS) {
      roomStore.forceReconnect()
    }
  }

  onMounted(() => {
    if (!db) return

    timerInterval = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - timerOrigin.value) / 1000)
    }, 1000)

    unsubscribeConnection = roomStore.watchConnection(onConnectionChange)
    document.addEventListener('visibilitychange', onVisibilityChange)

    const roomRef = dbRef(db, `rooms/${roomId}`)
    unsubscribeRoom = onValue(roomRef, snapshot => {
      const data = snapshot.val()

      if (!data) {
        currentRoom.value = null
        roomNotFound.value = true
        configStore.setActiveRoom(null, null)
        redirectTimeout = setTimeout(() => router.replace('/'), 3000)
        return
      }

      currentRoom.value = data
      configStore.setActiveRoom(roomId, data.name)

      const self: { vote?: number | string } | undefined = configStore.userId ? data.users?.[configStore.userId] : undefined
      if (self) {
        lastVote = self.vote == null ? null : { value: self.vote, round: currentRound() }
      }

      if (!hasAutoJoined && username.value) {
        hasAutoJoined = true
        if (!data.users || Object.keys(data.users).length === 0) {
          roomStore.resetTimer(roomId)
        }
        joinRoom()
      } else if (hasJoined && isConnected.value && (needsRejoin || (configStore.userId && !self))) {
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
    unsubscribeConnection?.()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (redirectTimeout !== null) clearTimeout(redirectTimeout)
    if (timerInterval !== null) clearInterval(timerInterval)
  })

  function restorableVote (): number | string | undefined {
    if (lastVote && lastVote.round === currentRound()) return lastVote.value
    return undefined
  }

  function joinRoom () {
    joinedAt = roomStore.joinRoom(roomId, { joinedAt, vote: restorableVote() }) || undefined
    hasJoined = true
    needsRejoin = false
  }

  function submitName () {
    const usernameValue = name.value.trim().slice(0, MAX_NAME_LENGTH)
    if (!usernameValue) return

    name.value = usernameValue
    configStore.setUsername(usernameValue)
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
        .then(() => window.alert(t('room.shareConfigCopied')))
        .catch(() => window.prompt(t('room.copyRoomUrl'), url))
    } else {
      window.prompt(t('room.copyRoomUrl'), url)
    }
  }

  function castVote (value: number | string) {
    lastVote = { value, round: currentRound() }
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
.vote-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 68px; /* 56px card + 6px padding top and bottom */
}

.vote-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@keyframes all-voted {
  0%, 100% {
    transform: translateY(0);
    filter: drop-shadow(0 0 4px rgba(25, 118, 210, 0.6));
  }
  50% {
    transform: translateY(-4px);
    filter: drop-shadow(0 0 12px rgba(25, 118, 210, 0.9));
  }
}

.all-voted {
  animation: all-voted 1.4s ease-in-out infinite;
}

</style>
