<template>
  <template v-if="currentRoom && !!userName">
    <div class="shell">
      <RoomSidePanel
        v-model:open="historyPanelOpen"
        :history="sessionHistory"
        :history-enabled="currentRoom?.settings?.historyEnabled !== false"
        :description="description"
        @update:description="onDescriptionChange"
      />

      <main class="main">
        <div class="main-head">
          <div class="main-head-left">
            <v-btn
              aria-label="Back to lobby"
              class="icon-btn"
              density="compact"
              icon
              title="Back to lobby"
              to="/"
              variant="text"
            >
              <v-icon icon="mdi-home-outline" size="16" />
            </v-btn>

            <h2>
              {{ currentRoom.name }}
              <span class="round-counter">round {{ currentRound }}</span>
            </h2>
          </div>

          <div class="main-head-right">
            <div class="progress-pill">
              <span class="progress-dots">
                <span
                  v-for="player in sortedRoomUsers"
                  :key="player.userId"
                  class="pdot"
                  :class="{ done: player.vote != null }"
                  :title="player.name"
                />
              </span>

              <span class="vote-count">{{ votedCount }}/{{ totalPlayers }} voted</span>
            </div>

            <v-btn
              :aria-label="configStore.viewMode === 'table' ? 'Switch to grid view' : 'Switch to table view'"
              class="icon-btn"
              density="compact"
              icon
              :title="configStore.viewMode === 'table' ? 'Switch to grid view' : 'Switch to table view'"
              variant="text"
              @click="configStore.setViewMode(configStore.viewMode === 'table' ? 'grid' : 'table')"
            >
              <v-icon :icon="configStore.viewMode === 'table' ? 'mdi-table' : 'mdi-cards-playing'" size="16" />
            </v-btn>

            <v-btn
              aria-label="Room settings"
              class="icon-btn"
              density="compact"
              icon
              title="Room settings"
              variant="text"
              @click="roomConfigOpen = true"
            >
              <v-icon icon="mdi-tune" size="16" />
            </v-btn>

            <v-btn
              :aria-label="shareCopied ? 'Copied!' : 'Share room link'"
              class="icon-btn"
              density="compact"
              :disabled="!firebaseConfig"
              icon
              :title="shareCopied ? 'Copied!' : 'Copy room + config link'"
              variant="text"
              @click="shareRoomConfig"
            >
              <v-icon :icon="shareCopied ? 'mdi-check' : 'mdi-share-variant'" size="16" />
            </v-btn>
          </div>
        </div>

        <RoomConfigModal
          v-if="currentRoom"
          v-model="roomConfigOpen"
          :current-settings="{
            name: currentRoom.name,
            deck: currentRoom.settings?.deck ?? 'fibonacci',
            customDeck: currentRoom.settings?.customDeck ?? '',
            specialQuestion: currentRoom.settings?.specialQuestion !== false,
            specialCoffee: currentRoom.settings?.specialCoffee !== false,
            historyEnabled: currentRoom.settings?.historyEnabled !== false,
          }"
          @save="applyRoomConfig"
        />

        <SimpleResultsGrid
          v-if="configStore.viewMode === 'grid'"
          :current-user-id="configStore.userId"
          :players="sortedRoomUsers"
          :show-votes="showVotes"
        />

        <PokerTable
          v-else
          :current-user-id="configStore.userId"
          :players="sortedRoomUsers"
          :shaking-user-ids="shakingUserIds"
          :show-votes="showVotes"
        />

        <div class="action-row room-action-row">
          <template v-if="!showVotes">
            <v-btn
              class="p0-btn p0-btn-primary"
              :disabled="votedCount === 0"
              prepend-icon="mdi-eye"
              variant="flat"
              @click="revealVotes"
            >
              Reveal votes
              <span v-if="!allVoted" class="button-meta">
                {{ votedCount }}/{{ totalPlayers }}
              </span>
            </v-btn>

            <v-btn
              class="p0-btn p0-btn-ghost"
              variant="flat"
              @click="resetVotes"
            >
              Reset round
            </v-btn>
          </template>

          <template v-else>
            <v-btn
              class="p0-btn p0-btn-ghost"
              prepend-icon="mdi-eye-off"
              variant="flat"
              @click="hideVotes"
            >
              Hide votes
            </v-btn>

            <v-btn
              class="p0-btn p0-btn-primary"
              :prepend-icon="historyEnabled ? 'mdi-arrow-right' : 'mdi-refresh'"
              variant="flat"
              @click="resetVotes"
            >
              {{ historyEnabled ? 'Next round' : 'New round' }}
            </v-btn>
          </template>
        </div>

        <div v-if="showVotes && committedVote" class="committed-vote-center">
          <div class="committed-vote-badge">
            <v-icon icon="mdi-check-circle" size="14" />
            Final: <strong>{{ committedVote }}</strong>
          </div>
        </div>

        <VoteDock
          v-model:collapsed="dockCollapsed"
          :committed-vote="committedVote"
          :display-vote-counts="displayVoteCounts"
          :history-enabled="currentRoom?.settings?.historyEnabled !== false"
          :selected-vote="selectedVote"
          :show-votes="showVotes"
          :stats="stats"
          :user-name="userName"
          :vote-options="voteOptions"
          @cast-vote="castVote"
          @commit-vote="onCommitVote"
        />
      </main>
    </div>

    <ConfettiBurst
      v-if="showConfetti"
      :pieces="confettiPieces"
    />
  </template>

  <v-container v-else class="setup-screen" fluid>
    <v-card class="setup-card" flat>
      <div class="kicker">Room</div>
      <h1 class="setup-title">{{ roomNotFound ? 'Room not found' : 'Loading room' }}</h1>

      <p class="setup-desc">
        {{ roomNotFound ? 'This room could not be found. You will be redirected shortly.' : 'Connecting to the room.' }}
      </p>
    </v-card>
  </v-container>

  <v-snackbar v-model="roomNotFound" color="error" :timeout="-1">
    Room not found. Redirecting...
  </v-snackbar>

</template>

<script lang="ts" setup>
  import { ref as dbRef, onDisconnect, onValue, update } from 'firebase/database'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ConfettiBurst from '@/components/ConfettiBurst.vue'
  import PokerTable from '@/components/PokerTable.vue'
  import RoomConfigModal from '@/components/RoomConfigModal.vue'
  import RoomSidePanel from '@/components/RoomSidePanel.vue'
  import SimpleResultsGrid from '@/components/SimpleResultsGrid.vue'
  import VoteDock from '@/components/VoteDock.vue'
  import { useAppStore } from '@/stores/app'
  import { useConfigStore } from '@/stores/config'
  import { copyText } from '@/utils/clipboard'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const configStore = useConfigStore()
  const roomId = route.params.roomId as string

  const MAX_NAME_LENGTH = 20
  type ConsensusState = 'consensus' | 'close' | 'split'

  const PRESET_DECKS: Record<string, (number | string)[]> = {
    fibonacci: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55],
    linear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15],
    tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  }

  function parseCustomDeck (raw: string): (number | string)[] {
    return raw.split(',').flatMap(s => {
      const t = s.trim()
      if (!t) return []
      const n = Number(t)
      return [Number.isNaN(n) ? t : n]
    })
  }

  const { userName, firebaseConfig } = storeToRefs(configStore)

  const currentRoom = ref<{
    name: string
    createdAt: number
    createdBy: string
    committedVote?: string | null
    settings?: {
      showVotes?: boolean
      v?: number
      deck?: 'fibonacci' | 'linear' | 'tshirt' | 'custom'
      customDeck?: string | null
      specialQuestion?: boolean
      specialCoffee?: boolean
      historyEnabled?: boolean
    }
    lastActivity?: number
  } | null>(null)
  const roomUsers = ref<Record<string, { name: string, joinedAt: number, vote?: number | string, avatarStyle?: string, avatarSeed?: string, avatarBg?: string }>>({})
  const description = ref('')

  const db = configStore.getDb()
  const roomNotFound = ref(false)
  const dockCollapsed = ref(false)
  const shareCopied = ref(false)
  const roomConfigOpen = ref(false)

  const committedVote = computed(() => currentRoom.value?.committedVote ?? null)
  const showConfetti = ref(false)
  const shakingUserIds = ref<string[]>([])
  const previousVotes = ref<Record<string, number | string | null>>({})
  const confettiPieces = ref<Array<{
    id: string
    left: number
    bg: string
    delay: number
    duration: number
    rotation: number
    shape: string
  }>>([])

  // Synced from config store so the panel toggle is persisted across sessions
  const historyPanelOpen = computed({
    get: () => configStore.historyPanelOpen,
    set: v => configStore.setHistoryPanelOpen(v),
  })

  let hasAutoJoined = false
  let hasSavedRoom = false
  let redirectTimeout: ReturnType<typeof setTimeout> | null = null
  let roundStartTime = Date.now()
  let unsubscribeRoom: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null
  let unsubscribeHistory: (() => void) | null = null
  let unsubscribeDescription: (() => void) | null = null
  let descriptionDebounce: ReturnType<typeof setTimeout> | null = null

  const showVotes = computed(() => currentRoom.value?.settings?.showVotes === true)
  const historyEnabled = computed(() => currentRoom.value?.settings?.historyEnabled !== false)

  const voteOptions = computed((): (number | string)[] => {
    const s = currentRoom.value?.settings
    let base: (number | string)[]
    if (s?.deck === 'custom') {
      base = parseCustomDeck(s.customDeck ?? '')
      if (base.length === 0) base = [...PRESET_DECKS.fibonacci]
    } else {
      base = [...(PRESET_DECKS[s?.deck ?? 'fibonacci'] ?? PRESET_DECKS.fibonacci)]
    }
    if (s?.specialQuestion !== false) base.push('?')
    if (s?.specialCoffee !== false) base.push('☕')
    return base
  })

  const deckNums = computed(() =>
    voteOptions.value.filter((v): v is number => typeof v === 'number'),
  )

  // All vote values (including ?, ☕) with their counts — used for insights deck display
  const displayVoteCounts = computed((): Record<string, number> | null => {
    if (!showVotes.value) return null
    const counts: Record<string, number> = {}
    for (const user of Object.values(roomUsers.value)) {
      if (user.vote != null) {
        const k = String(user.vote)
        counts[k] = (counts[k] ?? 0) + 1
      }
    }
    return Object.keys(counts).length > 0 ? counts : null
  })

  const votedCount = computed(() =>
    Object.values(roomUsers.value).filter(user => user.vote != null).length,
  )
  const totalPlayers = computed(() => Object.keys(roomUsers.value).length)
  const allVoted = computed(() => votedCount.value > 0 && votedCount.value === totalPlayers.value)
  const selectedVote = computed(() => {
    if (!configStore.userId || !roomUsers.value[configStore.userId]) return null
    return roomUsers.value[configStore.userId].vote ?? null
  })

  const sortedRoomUsers = computed(() =>
    Object.entries(roomUsers.value)
      .map(([userId, user]) => ({ userId, ...user }))
      .toSorted((a, b) => a.joinedAt - b.joinedAt),
  )

  const numericVotes = computed(() =>
    Object.values(roomUsers.value)
      .map(user => user.vote)
      .filter((vote): vote is number => typeof vote === 'number'),
  )

  const averageVote = computed(() => {
    if (numericVotes.value.length === 0) return null
    const sum = numericVotes.value.reduce((acc, val) => acc + val, 0)
    return Number.parseFloat((sum / numericVotes.value.length).toFixed(2))
  })

  const medianVote = computed(() => {
    if (numericVotes.value.length === 0) return null
    const sorted = numericVotes.value.toSorted((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  })

  const stats = computed(() => {
    if (!showVotes.value || averageVote.value == null || medianVote.value == null) return null

    const nums = numericVotes.value
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const spread = max - min
    const counts: Record<number, number> = {}
    for (const num of nums) {
      counts[num] = (counts[num] || 0) + 1
    }
    const maxCount = Math.max(...Object.values(counts))

    let closest = deckNums.value[0] ?? 0
    let bestDistance = Math.abs(averageVote.value - closest)
    for (const num of deckNums.value) {
      const distance = Math.abs(averageVote.value - num)
      if (distance < bestDistance - 1e-9) {
        closest = num
        bestDistance = distance
      } else if (Math.abs(distance - bestDistance) < 1e-9 && num > closest) {
        closest = num
      }
    }

    const consensus: ConsensusState = spread === 0
      ? 'consensus'
      : (spread <= 3 && Object.keys(counts).length <= 2 ? 'close' : 'split')

    return {
      avg: averageVote.value,
      median: medianVote.value,
      closest,
      min,
      max,
      spread,
      counts,
      maxCount,
      total: nums.length,
      consensus,
    }
  })


  const sessionHistory = ref<Array<{
    id: string
    description?: string | null
    finalVote: string | null
    avg?: string | null
    closest?: string | null
    round: number
    durationMs?: number
    duration?: string
    completedAt?: number
    participantCount: number
    consensus: 'yes' | 'split'
    votes?: Record<string, string>
  }>>([])

  const currentRound = computed(() => sessionHistory.value.length + 1)

  watch(userName, newName => {
    if (!currentRoom.value || !db || !configStore.userId) return
    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    update(userRef, {
      name: newName || 'Anonymous',
      avatarSeed: configStore.avatarSeed || newName || 'Guest',
    }).catch(console.error)
  })

  // When the global username modal (App.vue) sets a name after the room loaded,
  // auto-join so the user appears on the table without a page reload.
  watch(userName, newName => {
    if (newName && !hasAutoJoined && currentRoom.value) {
      hasAutoJoined = true
      joinRoom()
    }
  })

  // Sync avatar style/seed/bg to Firebase whenever the user changes them
  watch(
    [() => configStore.avatarStyle, () => configStore.avatarSeed, () => configStore.avatarBg],
    () => {
      if (!db || !configStore.userId || !currentRoom.value) return
      update(dbRef(db, `rooms/${roomId}/users/${configStore.userId}`), {
        avatarStyle: configStore.avatarStyle,
        avatarSeed:  configStore.avatarSeed || userName.value || 'Guest',
        avatarBg:    configStore.avatarBg,
      }).catch(console.error)
    },
  )

  watch(() => currentRoom.value?.name, newName => {
    if (newName && hasSavedRoom) configStore.updateRecentRoomName(roomId, newName)
  })

  watch([currentRoom, roomUsers], () => {
    if (!currentRoom.value) return
    appStore.setRoomInfo(roomId, currentRoom.value.name, totalPlayers.value)
  }, { deep: true })

  watch(showVotes, (revealed, wasRevealed) => {
    if (revealed && !wasRevealed) {
      setTimeout(() => {
        if (stats.value?.consensus === 'consensus' && stats.value.total >= 2) {
          triggerConfetti()
        }
      }, 900)
    }
  })

  watch(roomUsers, newUsers => {
    for (const [userId, user] of Object.entries(newUsers)) {
      const prev = previousVotes.value[userId]
      const curr = user.vote ?? null
      if (prev != null && curr != null && prev !== curr) {
        triggerShakeForUser(userId)
      }
    }
    const snapshot: Record<string, number | string | null> = {}
    for (const [userId, user] of Object.entries(newUsers)) {
      snapshot[userId] = user.vote ?? null
    }
    previousVotes.value = snapshot
  }, { deep: true })

  onMounted(() => {
    if (!db) return

    const roomRef = dbRef(db, `rooms/${roomId}`)
    unsubscribeRoom = onValue(roomRef, snapshot => {
      const data = snapshot.val()

      if (!data) {
        roomNotFound.value = true
        currentRoom.value = null
        configStore.setActiveRoom(null, null)
        appStore.setRoomInfo(null, '', 0)
        redirectTimeout = setTimeout(() => router.replace('/'), 3000)
        return
      }

      roomNotFound.value = false
      currentRoom.value = data
      configStore.setActiveRoom(roomId, data.name)
      appStore.setRoomInfo(roomId, data.name, totalPlayers.value)

      if (!hasSavedRoom) {
        hasSavedRoom = true
        configStore.saveRecentRoom(roomId, data.name)
      }

      if (!hasAutoJoined && userName.value) {
        hasAutoJoined = true
        joinRoom()
      }
    })

    const usersRef = dbRef(db, `rooms/${roomId}/users`)
    unsubscribeUsers = onValue(usersRef, snapshot => {
      roomUsers.value = snapshot.val() || {}
    })

    const historyRef = dbRef(db, `rooms/${roomId}/history`)
    unsubscribeHistory = onValue(historyRef, snapshot => {
      const data = snapshot.val()
      if (!data) {
        sessionHistory.value = []
        return
      }
      sessionHistory.value = (Object.values(data) as typeof sessionHistory.value)
        .toSorted((a, b) => a.round - b.round)
    })

    const descriptionRef = dbRef(db, `rooms/${roomId}/description`)
    unsubscribeDescription = onValue(descriptionRef, snapshot => {
      description.value = snapshot.val() ?? ''
    })
  })

  onUnmounted(() => {
    unsubscribeRoom?.()
    unsubscribeUsers?.()
    unsubscribeHistory?.()
    unsubscribeDescription?.()
    if (redirectTimeout !== null) clearTimeout(redirectTimeout)
    if (descriptionDebounce !== null) clearTimeout(descriptionDebounce)
  })

  function formatNum (num: number | null | undefined): string {
    if (num == null) return '-'
    return Number.isInteger(num) ? String(num) : String(Number.parseFloat(num.toFixed(2)))
  }

  function joinRoom () {
    if (!db || !configStore.userId) return
    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    update(userRef, {
      name:        userName.value || 'Anonymous',
      joinedAt:    Date.now(),
      avatarStyle: configStore.avatarStyle,
      avatarSeed:  configStore.avatarSeed || userName.value || 'Guest',
      avatarBg:    configStore.avatarBg,
    }).catch(console.error)
    onDisconnect(userRef).remove()
  }


  async function shareRoomConfig () {
    if (!firebaseConfig.value) return

    const encoded = btoa(JSON.stringify(firebaseConfig.value))
    const url = `${window.location.origin}${import.meta.env.BASE_URL}rooms/${encodeURIComponent(roomId)}?config=${encodeURIComponent(encoded)}`
    const ok = await copyText(url)

    if (ok) {
      shareCopied.value = true
      appStore.showToast('Room link with config copied.', 'success')
      setTimeout(() => {
        shareCopied.value = false
      }, 2000)
    } else {
      appStore.showToast('Copy failed. Your browser blocked clipboard access.', 'error')
    }
  }

  function onDescriptionChange (text: string) {
    description.value = text
    if (descriptionDebounce !== null) clearTimeout(descriptionDebounce)
    descriptionDebounce = setTimeout(() => {
      if (!db) return
      update(dbRef(db, `rooms/${roomId}`), { description: text }).catch(console.error)
    }, 600)
  }

  function triggerShakeForUser (userId: string) {
    shakingUserIds.value = shakingUserIds.value.filter(id => id !== userId)
    requestAnimationFrame(() => {
      shakingUserIds.value = [...shakingUserIds.value, userId]
      setTimeout(() => {
        shakingUserIds.value = shakingUserIds.value.filter(id => id !== userId)
      }, 500)
    })
  }

  function castVote (value: number | string) {
    if (!db || !configStore.userId || showVotes.value) return

    const isVoteChange = selectedVote.value !== null && value !== selectedVote.value

    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    const newVote = value === selectedVote.value ? null : value
    update(userRef, { vote: newVote }).catch(console.error)

    const roomRef = dbRef(db, `rooms/${roomId}`)
    update(roomRef, { lastActivity: Date.now() }).catch(console.error)

    if (isVoteChange && configStore.userId) {
      triggerShakeForUser(configStore.userId)
    }
  }

  function buildNewVoteOptions (settings: {
    deck: 'fibonacci' | 'linear' | 'tshirt' | 'custom'
    customDeck: string
    specialQuestion: boolean
    specialCoffee: boolean
  }): (number | string)[] {
    let base: (number | string)[]
    if (settings.deck === 'custom') {
      base = parseCustomDeck(settings.customDeck)
      if (base.length === 0) base = [...PRESET_DECKS.fibonacci]
    } else {
      base = [...(PRESET_DECKS[settings.deck] ?? PRESET_DECKS.fibonacci)]
    }
    if (settings.specialQuestion) base.push('?')
    if (settings.specialCoffee) base.push('☕')
    return base
  }

  function applyRoomConfig (settings: {
    name: string
    deck: 'fibonacci' | 'linear' | 'tshirt' | 'custom'
    customDeck: string
    specialQuestion: boolean
    specialCoffee: boolean
    historyEnabled: boolean
  }) {
    if (!db || !currentRoom.value) return

    const newOptions = buildNewVoteOptions(settings)

    const updates: Record<string, unknown> = {
      'name': settings.name,
      'settings/deck': settings.deck,
      'settings/customDeck': settings.deck === 'custom' ? settings.customDeck : null,
      'settings/specialQuestion': settings.specialQuestion,
      'settings/specialCoffee': settings.specialCoffee,
      'settings/historyEnabled': settings.historyEnabled,
      'lastActivity': Date.now(),
    }

    // Only reset votes that are no longer in the new deck
    const invalidUserIds = Object.entries(roomUsers.value)
      .filter(([, user]) => user.vote != null && !newOptions.includes(user.vote))
      .map(([userId]) => userId)

    if (invalidUserIds.length > 0) {
      for (const userId of invalidUserIds) {
        updates[`users/${userId}/vote`] = null
      }
      if (showVotes.value) {
        updates['settings/showVotes'] = false
      }
    }

    update(dbRef(db, `rooms/${roomId}`), updates).catch(console.error)
  }

  function onCommitVote (value: string) {
    if (!db) return
    update(dbRef(db, `rooms/${roomId}`), { committedVote: value, lastActivity: Date.now() }).catch(console.error)
  }

  function revealVotes () {
    if (!db) return
    const roomRef = dbRef(db, `rooms/${roomId}`)
    update(roomRef, {
      'settings/showVotes': true,
      'lastActivity': Date.now(),
    }).catch(console.error)
  }

  function hideVotes () {
    if (!db) return
    const roomRef = dbRef(db, `rooms/${roomId}`)
    update(roomRef, {
      'settings/showVotes': false,
      'committedVote': null,
      'lastActivity': Date.now(),
    }).catch(console.error)
  }

  function resetVotes () {
    if (!db) return

    const roomRef = dbRef(db, `rooms/${roomId}`)
    const updates: Record<string, unknown> = {
      'settings/showVotes': false,
      'committedVote': null,
      'lastActivity': Date.now(),
    }

    if (showVotes.value && currentRoom.value && historyEnabled.value) {
      const id = String(Date.now())
      const durationMs = Date.now() - roundStartTime
      const completedAt = Date.now()

      const votes: Record<string, string> = {}
      for (const user of Object.values(roomUsers.value)) {
        if (user.vote != null) votes[user.name] = String(user.vote)
      }

      updates[`history/${id}`] = {
        id,
        description: description.value || null,
        finalVote: committedVote.value ?? (stats.value ? formatNum(stats.value.avg) : null),
        avg: stats.value ? formatNum(stats.value.avg) : null,
        closest: stats.value ? formatNum(stats.value.closest) : null,
        round: currentRound.value,
        durationMs,
        completedAt,
        participantCount: totalPlayers.value,
        consensus: stats.value?.consensus === 'consensus' || stats.value?.consensus === 'close' ? 'yes' : 'split',
        votes,
      }

      updates['description'] = ''
      roundStartTime = Date.now()
    }

    for (const userId of Object.keys(roomUsers.value)) {
      updates[`users/${userId}/vote`] = null
    }

    update(roomRef, updates).catch(console.error)
  }

  function triggerConfetti () {
    const colors = ['#4f8cff', '#3ecf8e', '#f5b14d', '#f05a5a', '#a78bfa', '#ffffff']
    confettiPieces.value = Array.from({ length: 80 }, (_, index) => ({
      id: `c${index}`,
      left: Math.random() * 100,
      bg: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.4,
      duration: 1.8 + Math.random() * 1.4,
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? '50%' : '2px',
    }))
    showConfetti.value = true
    setTimeout(() => {
      showConfetti.value = false
    }, 3500)
  }
</script>
