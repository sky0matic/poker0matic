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

          <v-btn
            :aria-label="t('room.settings.open')"
            class="ms-2"
            density="compact"
            :disabled="!canAct || isRoomFromNewerClient"
            icon="mdi-cog"
            :title="t('room.settings.open')"
            variant="tonal"
            @click="openSettings"
          />
        </v-card-title>

        <template #append>
          <div class="d-flex align-center">
            <v-btn
              :class="{ 'all-voted': allVoted && !preferencesStore.reducedMotion }"
              color="primary"
              :disabled="!canAct || showVotes || votedCount === 0"
              @click="revealVotes"
            >
              {{ t('room.revealVotes') }}
            </v-btn>

            <v-btn
              class="ms-2"
              color="error"
              :disabled="!canAct"
              @click="resetVotes"
            >
              {{ t('room.resetVotes') }}
            </v-btn>
          </div>
        </template>
      </v-card-item>

      <v-alert
        v-if="showOfflineAlert"
        class="mx-4 mt-4"
        density="compact"
        icon="mdi-wifi-off"
        type="warning"
        variant="tonal"
      >
        {{ t('room.connection.lost') }}
      </v-alert>

      <v-alert
        v-if="isRoomFromNewerClient"
        class="mx-4 mt-4"
        density="compact"
        icon="mdi-update"
        type="warning"
        variant="tonal"
      >
        <div class="d-flex align-center flex-wrap ga-2">
          <span class="flex-grow-1">{{ t('room.outdatedClient') }}</span>

          <v-btn size="small" variant="tonal" @click="reloadPage">{{ t('room.reload') }}</v-btn>
        </div>
      </v-alert>

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

        <div class="d-flex align-center flex-wrap ga-2 mt-2">
          <span class="text-caption flex-grow-1">{{ t('room.upgradeHint') }}</span>

          <v-btn
            color="primary"
            :disabled="!canAct"
            size="small"
            variant="tonal"
            @click="openSettings"
          >
            {{ t('room.upgradeRoom') }}
          </v-btn>
        </div>
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
            :disabled="!canAct"
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
          :row-props="rowProps"
        >
          <template #item.name="{ item }">
            {{ item.name }} <span v-if="item.userId === configStore.userId" class="text-medium-emphasis text-caption">{{ t('room.table.you') }}</span>

            <v-icon
              v-if="!isUserOnline(item)"
              :aria-label="t('room.table.offline')"
              class="ms-1"
              icon="mdi-wifi-off"
              size="x-small"
              :title="t('room.table.offline')"
            />
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

    <v-snackbar v-model="showSettingsSnackbar" :color="settingsSnackbarColor">
      {{ settingsSnackbarText }}
    </v-snackbar>

    <RoomSettingsDialog
      v-if="currentRoom"
      v-model="isSettingsDialogOpen"
      :conflict="settingsConflict"
      :online="canAct"
      :saving="isSavingSettings"
      :settings="editableSettings"
      @save="saveSettings"
    />

    <v-snackbar v-model="showReconnected" color="success" :timeout="RECONNECTED_SNACKBAR_TIMEOUT_MS">
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
  import RoomSettingsDialog from '@/components/RoomSettingsDialog.vue'
  import VoteCard from '@/components/VoteCard.vue'
  import { useConnectionState } from '@/composables/useConnectionState'
  import { type CardValue, normalizeCards, sameCards } from '@/config/cardDecks'
  import { CURRENT_ROOM_VERSION, ROOM_CHANGELOG, type RoomSettings } from '@/config/roomVersions'
  import { useConfigStore } from '@/stores/config'
  import { usePreferencesStore } from '@/stores/preferences'
  import { type EditableRoomSettings, useRoomStore } from '@/stores/room'
  import {
    findPrunableUsers,
    isUserOnline,
    OFFLINE_USER_GC_INTERVAL_MS,
    OFFLINE_USER_TTL_MS,
    RECONNECTED_SNACKBAR_TIMEOUT_MS,
    type RoomUser,
  } from '@/utils/presence'

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
  const { username, firebaseConfig } = storeToRefs(configStore)

  const headers = computed<DataTableHeader[]>(() => [
    { title: t('room.table.name'), value: 'name' },
    { title: t('room.table.vote'), value: 'vote', width: '20%', align: 'center' },
  ])

  const currentRoom = ref<{ name: string, createdAt: number, createdBy: string, settings?: RoomSettings, lastActivity?: number, resetAt?: number, users?: Record<string, RoomUser> } | null>(null)
  const roomUsers = ref<Record<string, RoomUser>>({})

  const db = configStore.getDb()

  const name = ref(username.value || '')
  const showNamePrompt = ref(!username.value)
  const roomNotFound = ref(false)
  let hasJoined = false
  let hasLeft = false
  let selfWasPresent = false
  /**
   * The offline marking (identified by its `lastSeen`) we last re-joined for. A rejected re-join reverts to
   * the same marking, so remembering it keeps one observation from triggering more than one re-join.
   */
  let rejoinedForOffline: { lastSeen?: number } | null = null
  let gcInterval: ReturnType<typeof setInterval> | null = null
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

  const voteOptions = computed<CardValue[]>(() => normalizeCards(currentRoom.value?.settings?.cards))

  const editableSettings = computed<EditableRoomSettings>(() => ({
    name: currentRoom.value?.name ?? '',
    cards: voteOptions.value,
    targetDuration: currentRoom.value?.settings?.targetDuration,
    ceilingDuration: currentRoom.value?.settings?.ceilingDuration,
  }))

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

  const { isConnected, showOfflineAlert, showReconnected, serverNow } = useConnectionState({ onConnected })

  const onlineUsers = computed(() => Object.values(roomUsers.value).filter(user => isUserOnline(user)))
  const selfUser = computed(() => configStore.userId ? roomUsers.value[configStore.userId] ?? null : null)
  const canAct = computed(() => isConnected.value && selfUser.value != null)

  const votedCount = computed(() =>
    onlineUsers.value.filter(user => user.vote != null).length,
  )
  const totalPlayers = computed(() => onlineUsers.value.length)
  const allVoted = computed(() =>
    totalPlayers.value > 0 && votedCount.value === totalPlayers.value && !showVotes.value,
  )
  const selectedVote = computed(() => {
    if (!configStore.userId || !roomUsers.value[configStore.userId]) return null
    return roomUsers.value[configStore.userId].vote ?? null
  })

  const averageVote = computed(() => {
    const votes = onlineUsers.value
      .map(user => user.vote)
      .filter(vote => typeof vote === 'number') as number[]

    if (votes.length === 0) return null

    const sum = votes.reduce((acc, val) => acc + val, 0)
    return Number.parseFloat((sum / votes.length).toFixed(2))
  })

  const medianVote = computed(() => {
    const votes = onlineUsers.value
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

  function rowProps ({ item }: { item: RoomUser & { userId: string } }) {
    const classes: string[] = []
    if (item.userId === configStore.userId) classes.push('font-weight-bold')
    if (!isUserOnline(item)) classes.push('user-offline')
    return classes.length > 0 ? { class: classes.join(' ') } : {}
  }

  const dialogDescription = computed(() =>
    currentRoom.value
      ? t('room.joinDialog.description', { name: currentRoom.value.name })
      : t('room.joinDialog.descriptionDefault'),
  )

  const roomVersion = computed(() => {
    const v = currentRoom.value?.settings?.v
    return typeof v === 'number' ? v : 0
  })

  /** The room was upgraded by a newer bundle: this client may not understand its data and must reload. */
  const isRoomFromNewerClient = computed(() => roomVersion.value > CURRENT_ROOM_VERSION)

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
    if (!selfUser.value) return
    roomStore.updateUsername(roomId, newName)
  })

  let unsubscribeRoom: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null

  onMounted(() => {
    if (!db) return

    timerInterval = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - timerOrigin.value) / 1000)
    }, 1000)

    gcInterval = setInterval(collectOfflineUsers, OFFLINE_USER_GC_INTERVAL_MS)

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

      tryFirstJoin()
    })

    const usersRef = dbRef(db, `rooms/${roomId}/users`)
    unsubscribeUsers = onValue(usersRef, snapshot => {
      const users: Record<string, RoomUser> = snapshot.val() || {}
      const selfNode = configStore.userId == null ? undefined : users[configStore.userId]
      const selfPresent = selfNode != null
      const canRejoin = hasJoined && !hasLeft && isConnected.value

      if (canRejoin && selfWasPresent && !selfPresent) {
        // Our node vanished while we are online (pruned, or a stale write raced us): join again.
        roomStore.joinRoom(roomId)
      } else if (canRejoin && selfNode != null && !isUserOnline(selfNode) && !isSameOfflineMarking(selfNode)) {
        // Another tab of the same user left or disconnected and marked our shared node offline.
        rejoinedForOffline = { lastSeen: selfNode.lastSeen }
        roomStore.joinRoom(roomId)
      }
      selfWasPresent = selfPresent
      roomUsers.value = users
    })
  })

  onUnmounted(() => {
    // Leave before unsubscribing: the transaction needs the cached user node to not abort on null.
    // Flag first: the leave transaction echoes an offline snapshot synchronously, which must not re-join.
    if (hasJoined) {
      hasLeft = true
      roomStore.leaveRoom(roomId)
    }
    unsubscribeRoom?.()
    unsubscribeUsers?.()
    if (redirectTimeout !== null) clearTimeout(redirectTimeout)
    if (timerInterval !== null) clearInterval(timerInterval)
    if (gcInterval !== null) clearInterval(gcInterval)
  })

  function isSameOfflineMarking (selfNode: RoomUser): boolean {
    return rejoinedForOffline !== null && rejoinedForOffline.lastSeen === selfNode.lastSeen
  }

  /** Called on every connect; re-arms presence after a reconnect (onDisconnect is one-shot). */
  function onConnected () {
    if (hasJoined) {
      roomStore.joinRoom(roomId)
    } else {
      tryFirstJoin()
    }
  }

  /** Joins once the room data, the username and the connection are all available, in any order. */
  function tryFirstJoin () {
    if (hasJoined || !currentRoom.value || !username.value || !isConnected.value) return
    hasJoined = true

    const users = currentRoom.value.users ?? {}
    const stale = findPrunableUsers(users, serverNow(), OFFLINE_USER_TTL_MS, configStore.userId)
    if (stale.length > 0) {
      roomStore.pruneOfflineUsers(roomId, stale)
    }

    const staleIds = new Set(stale.map(candidate => candidate.userId))
    const hasOtherOnlineUser = Object.entries(users)
      .some(([userId, user]) => userId !== configStore.userId && !staleIds.has(userId) && isUserOnline(user))
    if (!hasOtherOnlineUser) {
      roomStore.resetTimer(roomId)
    }

    roomStore.joinRoom(roomId)
  }

  function collectOfflineUsers () {
    if (!hasJoined || !isConnected.value) return
    const stale = findPrunableUsers(roomUsers.value, serverNow(), OFFLINE_USER_TTL_MS, configStore.userId)
    if (stale.length > 0) {
      roomStore.pruneOfflineUsers(roomId, stale)
    }
  }

  function submitName () {
    const usernameValue = name.value.trim().slice(0, MAX_NAME_LENGTH)
    if (!usernameValue) return

    name.value = usernameValue
    configStore.setUsername(usernameValue)
    showNamePrompt.value = false
    tryFirstJoin()
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
    roomStore.castVote(roomId, value)
  }

  function revealVotes () {
    roomStore.revealVotes(roomId)
  }

  function resetVotes () {
    roomStore.resetVotes(roomId, roomUsers.value)
    elapsedSeconds.value = 0
  }

  function reloadPage () {
    window.location.reload()
  }

  const isSettingsDialogOpen = ref(false)
  const isSavingSettings = ref(false)
  const settingsConflict = ref(false)
  const showSettingsSnackbar = ref(false)
  const settingsSnackbarText = ref('')
  const settingsSnackbarColor = ref<'success' | 'info' | 'error'>('success')

  function notifySettings (text: string, color: 'success' | 'info' | 'error') {
    settingsSnackbarText.value = text
    settingsSnackbarColor.value = color
    showSettingsSnackbar.value = true
  }

  function openSettings () {
    settingsConflict.value = false
    isSettingsDialogOpen.value = true
  }

  async function saveSettings ({ baseline, next }: { baseline: EditableRoomSettings, next: EditableRoomSettings }) {
    isSavingSettings.value = true
    settingsConflict.value = false
    try {
      const result = await roomStore.updateRoomSettings(roomId, baseline, next, roomUsers.value)
      switch (result) {
        case 'updated': {
          isSettingsDialogOpen.value = false
          notifySettings(t('room.settings.saved'), 'success')
          break
        }
        case 'unchanged': {
          isSettingsDialogOpen.value = false
          break
        }
        case 'conflict': {
          settingsConflict.value = true
          break
        }
        default: {
          notifySettings(t('room.settings.error'), 'error')
        }
      }
    } finally {
      isSavingSettings.value = false
    }
  }

  // Tells the other participants when someone edits the room settings. The first load is not an edit.
  watch(() => currentRoom.value ? JSON.stringify(editableSettings.value) : null, (signature, previousSignature) => {
    if (signature == null || previousSignature == null) return

    const previousCards = (JSON.parse(previousSignature) as EditableRoomSettings).cards
    if (!sameCards(previousCards, editableSettings.value.cards)) {
      elapsedSeconds.value = 0
    }
    if (!isSavingSettings.value) {
      notifySettings(t('room.settings.updatedByOther'), 'info')
    }
  })
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

:deep(tr.user-offline) {
  opacity: 0.5;
}

</style>
